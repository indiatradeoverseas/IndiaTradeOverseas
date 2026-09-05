const mongoose = require('mongoose');
const Lead = require('../leads/lead.model');
const LeadActivity = require('../leads/leadActivity.model');
const Payment = require('../payments/payment.model');
const SalesTarget = require('./salesTarget.model');
const { WON_STAGES, LOST_STAGES } = require('../leads/lead.constants');
const Task = require('../task/task.model');
const CoachingMessage = require('./coachingMessage.model');

const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'EMAIL_SENT', 'WHATSAPP_SENT'];

function toObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
}

function monthRange(month, year) {
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end, month: m, year: y };
}

function periodRange(period, referenceDate) {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  if (period === 'daily') {
    const start = new Date(ref);
    start.setHours(0, 0, 0, 0);
    const end = new Date(ref);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'weekly') {
    const day = ref.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(ref);
    start.setDate(ref.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  // monthly (default)
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

async function setTarget({ employeeId, month, year, targetValue, targetDeals, setBy }) {
  let targetUserId = employeeId;
  try {
    const Employee = require('../employee/employee.model');
    const User = require('../users/user.model');
    
    let emp = null;
    if (mongoose.isValidObjectId(employeeId)) {
      emp = await Employee.findById(employeeId);
    } else {
      emp = await Employee.findOne({ $or: [{ employeeId: employeeId }, { email: employeeId }] });
    }

    if (emp) {
      let user = await User.findOne({ email: emp.email.toLowerCase() });
      if (!user) {
        try {
          const { syncEmployeeToUser } = require('../employee/employee.controller');
          if (typeof syncEmployeeToUser === 'function') {
            await syncEmployeeToUser(emp);
            user = await User.findOne({ email: emp.email.toLowerCase() });
          }
        } catch (syncErr) {
          console.error('Error syncing employee to user during setTarget:', syncErr);
        }
      }
      if (user) {
        targetUserId = user._id;
      } else {
        targetUserId = emp._id;
      }
    } else if (typeof employeeId === 'string' && !mongoose.isValidObjectId(employeeId)) {
      const user = await User.findOne({ $or: [{ employeeId: employeeId }, { email: employeeId }] });
      if (user) targetUserId = user._id;
    }
  } catch (err) {
    console.error('Error resolving User ID from Employee ID in setTarget:', err);
  }

  let validSetBy = setBy;
  if (!mongoose.isValidObjectId(validSetBy)) {
    validSetBy = undefined;
  }

  return SalesTarget.findOneAndUpdate(
    { employeeId: targetUserId, month: Number(month), year: Number(year) },
    { 
      targetValue: Number(targetValue), 
      targetDeals: targetDeals !== undefined && targetDeals !== null && targetDeals !== '' ? Number(targetDeals) : null, 
      setBy: validSetBy 
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function getTargets({ employeeId, month, year } = {}) {
  const filter = {};
  if (employeeId) {
    let targetUserId = employeeId;
    try {
      const Employee = require('../employee/employee.model');
      const User = require('../users/user.model');
      
      let emp = null;
      if (mongoose.isValidObjectId(employeeId)) {
        emp = await Employee.findById(employeeId);
      } else {
        emp = await Employee.findOne({ $or: [{ employeeId: employeeId }, { email: employeeId }] });
      }

      if (emp) {
        const user = await User.findOne({ email: emp.email.toLowerCase() });
        if (user) {
          targetUserId = user._id;
        } else {
          targetUserId = emp._id;
        }
      }
    } catch (err) {
      console.error('Error resolving User ID from Employee ID in getTargets:', err);
    }
    filter.employeeId = targetUserId;
  }
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  return SalesTarget.find(filter).populate('employeeId', 'fullName name employeeId department').sort({ year: -1, month: -1 });
}

async function getMyPerformance(user, { month, year } = {}) {
  const range = monthRange(month, year);
  
  // Resolve both User ID and Employee ID for performance aggregates
  let actorIds = [user._id];
  try {
    const Employee = require('../employee/employee.model');
    const User = require('../users/user.model');
    if (user.email) {
      const emp = await Employee.findOne({ email: user.email });
      if (emp) actorIds.push(emp._id);
      const usr = await User.findOne({ email: user.email });
      if (usr) actorIds.push(usr._id);
    }
  } catch (err) {
    console.error('Error resolving Actor IDs in getMyPerformance:', err);
  }

  const assignedToFilter = { 
    $in: actorIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) 
  };

  const leadAgg = await Lead.aggregate([
    { $match: { assignedTo: assignedToFilter, updatedAt: { $gte: range.start, $lte: range.end } } },
    {
      $group: {
        _id: null,
        totalLeads: { $sum: 1 },
        won: { $sum: { $cond: [{ $in: ['$stage', WON_STAGES] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $in: ['$stage', LOST_STAGES] }, 1, 0] } }
      }
    }
  ]);

  const revenueAgg = await Lead.aggregate([
    { $match: { assignedTo: assignedToFilter, stage: { $in: WON_STAGES }, updatedAt: { $gte: range.start, $lte: range.end } } },
    { $lookup: { from: 'payments', localField: '_id', foreignField: 'leadId', as: 'payments' } },
    {
      $addFields: {
        dealRevenue: {
          $cond: {
            if: { $gt: [{ $size: '$payments' }, 0] },
            then: { $sum: '$payments.totalAmount' },
            else: { $ifNull: ['$leadValue', 0] }
          }
        }
      }
    },
    { $group: { _id: null, revenue: { $sum: '$dealRevenue' } } }
  ]);

  const activityAgg = await LeadActivity.aggregate([
    { $match: { actorId: assignedToFilter, createdAt: { $gte: range.start, $lte: range.end }, actionType: { $in: ACTIVITY_TYPES } } },
    { $group: { _id: '$actionType', count: { $sum: 1 } } }
  ]);

  const activityCounts = activityAgg.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  const target = await SalesTarget.findOne({ 
    employeeId: { $in: actorIds }, 
    month: range.month, 
    year: range.year 
  });

  return {
    month: range.month,
    year: range.year,
    totalLeads: leadAgg[0]?.totalLeads || 0,
    dealsWon: leadAgg[0]?.won || 0,
    dealsLost: leadAgg[0]?.lost || 0,
    revenue: revenueAgg[0]?.revenue || 0,
    callsLogged: activityCounts.CALL || 0,
    emailsLogged: (activityCounts.EMAIL || 0) + (activityCounts.EMAIL_SENT || 0),
    whatsAppLogged: activityCounts.WHATSAPP_SENT || 0,
    target: target || null
  };
}

async function getLeaderboard({ period = 'monthly', department, referenceDate } = {}) {
  const range = periodRange(period, referenceDate);

  const leadMatch = {
    assignedTo: { $ne: null },
    updatedAt: { $gte: range.start, $lte: range.end }
  };
  if (department) leadMatch.assignedDepartment = department;

  const leadsAgg = await Lead.aggregate([
    { $match: leadMatch },
    { $lookup: { from: 'payments', localField: '_id', foreignField: 'leadId', as: 'payments' } },
    {
      $addFields: {
        dealRevenue: {
          $cond: {
            if: { $gt: [{ $size: '$payments' }, 0] },
            then: { $sum: '$payments.totalAmount' },
            else: { $ifNull: ['$leadValue', 0] }
          }
        }
      }
    },
    {
      $group: {
        _id: '$assignedTo',
        totalLeads: { $sum: 1 },
        dealsWon: { $sum: { $cond: [{ $in: ['$stage', WON_STAGES] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $in: ['$stage', WON_STAGES] }, '$dealRevenue', 0] } }
      }
    }
  ]);

  const activityAgg = await LeadActivity.aggregate([
    { $match: { actorId: { $ne: null }, createdAt: { $gte: range.start, $lte: range.end }, actionType: { $in: ACTIVITY_TYPES } } },
    { $group: { _id: '$actorId', activityCount: { $sum: 1 } } }
  ]);

  const activityByEmployee = activityAgg.reduce((acc, row) => {
    if (row._id) {
      acc[row._id.toString()] = row.activityCount;
    }
    return acc;
  }, {});

  // Aggregate completed tasks
  const tasksAgg = await Task.aggregate([
    {
      $match: {
        assignedTo: { $ne: null },
        status: 'COMPLETED',
        completedAt: { $gte: range.start, $lte: range.end }
      }
    },
    {
      $lookup: {
        from: 'employees',
        localField: 'assignedTo',
        foreignField: '_id',
        as: 'employee'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'assignedTo',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $addFields: {
        empCode: {
          $cond: {
            if: { $gt: [{ $size: '$employee' }, 0] },
            then: { $arrayElemAt: ['$employee.employeeId', 0] },
            else: {
              $cond: {
                if: { $gt: [{ $size: '$user' }, 0] },
                then: { $arrayElemAt: ['$user.employeeId', 0] },
                else: '$assignedTo'
              }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: '$empCode',
        completedTasksCount: { $sum: 1 }
      }
    }
  ]);

  const tasksByEmployeeCode = tasksAgg.reduce((acc, row) => {
    if (row._id) {
      acc[row._id.toString()] = row.completedTasksCount;
    }
    return acc;
  }, {});

  const leadsByEmployee = leadsAgg.reduce((acc, row) => {
    if (row._id) {
      acc[row._id.toString()] = row;
    }
    return acc;
  }, {});

  const employeeIds = new Set([
    ...leadsAgg.map((row) => row._id.toString()),
    ...Object.keys(activityByEmployee)
  ]);

  const Employee = require('../employee/employee.model');
  const User = require('../users/user.model');

  const employees = await Employee.find({ status: 'ACTIVE', department: 'SALES' });
  const users = await User.find({ isActive: true, department: 'SALES' });

  const repMap = new Map();

  // Add users first
  users.forEach(u => {
    if (u.email) {
      repMap.set(u.email.toLowerCase(), {
        employeeId: u._id.toString(),
        fullName: u.fullName,
        employeeCode: u.employeeId,
        department: u.department,
        email: u.email.toLowerCase(),
        userIds: [u._id.toString()]
      });
    }
  });

  // Add/merge employees
  employees.forEach(e => {
    if (e.email) {
      const emailKey = e.email.toLowerCase();
      const existing = repMap.get(emailKey);
      if (existing) {
        if (!existing.userIds.includes(e._id.toString())) {
          existing.userIds.push(e._id.toString());
        }
      } else {
        repMap.set(emailKey, {
          employeeId: e._id.toString(),
          fullName: e.name,
          employeeCode: e.employeeId,
          department: e.department,
          email: emailKey,
          userIds: [e._id.toString()]
        });
      }
    }
  });

  const repsList = Array.from(repMap.values());

  const targetMonth = range.start.getMonth() + 1;
  const targetYear = range.start.getFullYear();
  const targets = await SalesTarget.find({ month: targetMonth, year: targetYear }).lean();
  const targetsByEmployee = targets.reduce((acc, t) => {
    if (t.employeeId) {
      acc[t.employeeId.toString()] = t;
    }
    return acc;
  }, {});

  const rows = repsList
    .map((rep) => {
      let totalLeads = 0;
      let dealsWon = 0;
      let revenue = 0;
      let activityCount = 0;
      let completedTasksCount = 0;

      rep.userIds.forEach(id => {
        const leadInfo = leadsByEmployee[id] || { totalLeads: 0, dealsWon: 0, revenue: 0 };
        totalLeads += leadInfo.totalLeads;
        dealsWon += leadInfo.dealsWon;
        revenue += leadInfo.revenue;

        activityCount += activityByEmployee[id] || 0;
      });

      completedTasksCount = tasksByEmployeeCode[rep.employeeCode] || 0;

      let targetValue = 0;
      let targetDeals = null;
      rep.userIds.forEach(id => {
        const tgt = targetsByEmployee[id];
        if (tgt) {
          targetValue = tgt.targetValue;
          targetDeals = tgt.targetDeals;
        }
      });

      return {
        employeeId: rep.employeeId,
        fullName: rep.fullName,
        employeeCode: rep.employeeCode,
        department: rep.department,
        totalLeads,
        dealsWon,
        revenue,
        activityCount,
        completedTasksCount,
        targetValue,
        targetDeals,
        isTargetAchieved: targetValue > 0 ? revenue >= targetValue : false
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.dealsWon - a.dealsWon || b.completedTasksCount - a.completedTasksCount || b.activityCount - a.activityCount)
    .slice(0, 20);

  const deptMatch = {
    productCategory: { $in: ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT'] },
    stage: { $in: WON_STAGES },
    updatedAt: { $gte: range.start, $lte: range.end }
  };
  
  const deptAgg = await Lead.aggregate([
    { $match: deptMatch },
    { $lookup: { from: 'payments', localField: '_id', foreignField: 'leadId', as: 'payments' } },
    {
      $addFields: {
        dealRevenue: {
          $cond: {
            if: { $gt: [{ $size: '$payments' }, 0] },
            then: { $sum: '$payments.totalAmount' },
            else: { $ifNull: ['$leadValue', 0] }
          }
        }
      }
    },
    {
      $group: {
        _id: '$productCategory',
        totalRevenue: { $sum: '$dealRevenue' },
        avgRevenue: { $avg: '$dealRevenue' }
      }
    }
  ]);

  const deptMap = new Map(deptAgg.map(d => [d._id, d]));
  const categories = ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT'];
  const colors = ['#0f766e', '#0284c7', '#f59e0b', '#10b981', '#6366f1'];
  const departmentRankings = categories.map((cat, index) => {
    const data = deptMap.get(cat) || { totalRevenue: 0, avgRevenue: 0 };
    return {
      name: cat.charAt(0) + cat.slice(1).toLowerCase(),
      avgRevenue: data.avgRevenue || 0,
      totalRevenue: data.totalRevenue || 0,
      color: colors[index % colors.length]
    };
  });

  return { period, startDate: range.start, endDate: range.end, leaderboard: rows, departmentRankings };
}

async function getStrategicInsights() {
  const now = new Date();
  
  // 1. Calculate Forecast Accuracy (Past 6 Months)
  const forecastHistory = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const monthName = monthNames[d.getMonth()];
    
    // Sum targets for this month
    const targets = await SalesTarget.find({ month, year });
    let forecasted = targets.reduce((sum, t) => sum + (t.targetValue || 0), 0);
    if (forecasted === 0) forecasted = 35000000; // default fallback if none
    
    // Sum successful payments for this month
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    const payments = await Payment.find({
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const actual = payments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    
    const variancePct = forecasted > 0 ? ((actual - forecasted) / forecasted) * 100 : 0;
    const sign = variancePct >= 0 ? '+' : '';
    const Variance = `${sign}${variancePct.toFixed(1)}%`;
    
    forecastHistory.push({
      month: monthName,
      Forecasted: Math.round(forecasted),
      Actual: Math.round(actual),
      Variance
    });
  }
  
  // 2. Fetch Leaderboard rows to calculate real Performance Gap Analysis
  const leaderboardResult = await getLeaderboard({ period: 'monthly' });
  const sortedReps = [...(leaderboardResult.leaderboard || [])].sort((a, b) => b.revenue - a.revenue);
  const count = sortedReps.length;
  
  let top3 = [];
  let bottom3 = [];
  if (count >= 2) {
    const half = Math.ceil(count / 2);
    top3 = sortedReps.slice(0, Math.min(3, half));
    bottom3 = sortedReps.slice(-Math.min(3, count - half));
  } else {
    top3 = sortedReps;
    bottom3 = sortedReps;
  }
  
  const getAvg = (arr, selector) => arr.length ? arr.reduce((sum, item) => sum + selector(item), 0) / arr.length : 0;
  
  const topAvgActivity = getAvg(top3, r => r.activityCount);
  const bottomAvgActivity = getAvg(bottom3, r => r.activityCount);
  
  const topAvgRevenue = getAvg(top3, r => r.revenue);
  const bottomAvgRevenue = getAvg(bottom3, r => r.revenue);
  
  const topAvgDeals = getAvg(top3, r => r.dealsWon);
  const bottomAvgDeals = getAvg(bottom3, r => r.dealsWon);
  
  const topConversion = getAvg(top3, r => r.totalLeads > 0 ? (r.dealsWon / r.totalLeads) * 100 : 0);
  const bottomConversion = getAvg(bottom3, r => r.totalLeads > 0 ? (r.dealsWon / r.totalLeads) * 100 : 0);
  
  const performanceGap = {
    activity: {
      top: `${Math.round(topAvgActivity)} activities`,
      bottom: `${Math.round(bottomAvgActivity)} activities`,
      ratio: topAvgActivity > 0 ? `${Math.round(((topAvgActivity - bottomAvgActivity) / topAvgActivity) * 100)}% lower` : '0%'
    },
    dealSize: {
      top: `₹${Math.round(topAvgRevenue / (topAvgDeals || 1) / 100000)} Lakhs`,
      bottom: `₹${Math.round(bottomAvgRevenue / (bottomAvgDeals || 1) / 100000)} Lakhs`,
      ratio: topAvgRevenue > 0 ? `${Math.round(((topAvgRevenue - bottomAvgRevenue) / topAvgRevenue) * 100)}% lower` : '0%'
    },
    conversion: {
      top: `${Math.round(topConversion)}%`,
      bottom: `${Math.round(bottomConversion)}%`,
      ratio: topConversion > 0 ? `${Math.round(((topConversion - bottomConversion) / topConversion) * 100)}% lower` : '0%'
    }
  };
  
  // 3. Team Activity Heatmap for the last 28 days
  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
  twentyEightDaysAgo.setHours(0, 0, 0, 0);
  
  const activities = await LeadActivity.aggregate([
    { $match: { createdAt: { $gte: twentyEightDaysAgo } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' }
        },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const activityMap = new Map(activities.map(a => [a._id, a.count]));
  const heatmapData = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const val = activityMap.get(dateStr) || 0;
    
    let fill = 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] border border-[var(--crm-line)]';
    if (val > 0 && val <= 5) fill = 'bg-teal-950/60 text-teal-400 border border-teal-900/20';
    else if (val > 5 && val <= 15) fill = 'bg-teal-900 text-teal-200 border border-teal-800/30';
    else if (val > 15 && val <= 30) fill = 'bg-teal-600 text-white border border-teal-500/30';
    else if (val > 30 && val <= 50) fill = 'bg-teal-700 text-white border border-teal-600/30';
    else if (val > 50) fill = 'bg-teal-800 text-white border border-teal-700/30';
    
    heatmapData.push({
      day: d.getDate(),
      val,
      fill
    });
  }
  
  // 4. Latest broadcast message from Admin, HR, Manager, or Sales Manager
  const broadcastMessageDoc = await CoachingMessage.findOne({
    senderRole: { $in: ['ADMIN', 'MANAGER', 'SALES_MANAGER', 'HR'] }
  }).sort({ createdAt: -1 });

  const founderMessage = broadcastMessageDoc ? {
    content: broadcastMessageDoc.content,
    senderName: broadcastMessageDoc.senderName,
    senderRole: broadcastMessageDoc.senderRole,
    createdAt: broadcastMessageDoc.createdAt
  } : {
    content: "Team, this month we are targeting a 20% increase in lead response times. Please ensure all quotations are shared within 2 hours of qualification. - Founder",
    senderName: "Sanjana Reddy (Founder)",
    senderRole: "ADMIN",
    createdAt: new Date()
  };
  
  const totalActualRevenue = forecastHistory.reduce((sum, item) => sum + item.Actual, 0);
  const totalForecastedRevenue = forecastHistory.reduce((sum, item) => sum + item.Forecasted, 0);
  
  return {
    forecastHistory,
    totalActualRevenue,
    totalForecastedRevenue,
    performanceGap,
    heatmapData,
    founderMessage
  };
}

async function getCoachingMessages() {
  return CoachingMessage.find().sort({ createdAt: 1 }).limit(100);
}

async function sendCoachingMessage(user, content) {
  return CoachingMessage.create({
    senderId: user._id,
    senderName: user.fullName || user.name || 'Anonymous',
    senderRole: user.role,
    content
  });
}

module.exports = {
  setTarget,
  getTargets,
  getMyPerformance,
  getLeaderboard,
  getStrategicInsights,
  getCoachingMessages,
  sendCoachingMessage
};
