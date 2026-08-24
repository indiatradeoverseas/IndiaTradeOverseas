const mongoose = require('mongoose');
const Lead = require('../leads/lead.model');
const LeadActivity = require('../leads/leadActivity.model');
const Payment = require('../payments/payment.model');
const SalesTarget = require('./salesTarget.model');
const { WON_STAGES, LOST_STAGES } = require('../leads/lead.constants');
const Task = require('../task/task.model');

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
    
    const emp = await Employee.findById(employeeId);
    if (emp) {
      const user = await User.findOne({ email: emp.email });
      if (user) {
        targetUserId = user._id;
      }
    }
  } catch (err) {
    console.error('Error resolving User ID from Employee ID in setTarget:', err);
  }

  return SalesTarget.findOneAndUpdate(
    { employeeId: targetUserId, month, year },
    { targetValue, targetDeals, setBy },
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
      const emp = await Employee.findById(employeeId);
      if (emp) {
        const user = await User.findOne({ email: emp.email });
        if (user) {
          targetUserId = user._id;
        }
      }
    } catch (err) {
      console.error('Error resolving User ID from Employee ID in getTargets:', err);
    }
    filter.employeeId = targetUserId;
  }
  if (month) filter.month = month;
  if (year) filter.year = year;
  return SalesTarget.find(filter).populate('employeeId', 'fullName employeeId department').sort({ year: -1, month: -1 });
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
    { $unwind: '$payments' },
    { $group: { _id: null, revenue: { $sum: '$payments.totalAmount' } } }
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
    { $addFields: { dealRevenue: { $sum: '$payments.totalAmount' } } },
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

      return {
        employeeId: rep.employeeId,
        fullName: rep.fullName,
        employeeCode: rep.employeeCode,
        department: rep.department,
        totalLeads,
        dealsWon,
        revenue,
        activityCount,
        completedTasksCount
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.dealsWon - a.dealsWon || b.completedTasksCount - a.completedTasksCount || b.activityCount - a.activityCount)
    .slice(0, 20);

  return { period, startDate: range.start, endDate: range.end, leaderboard: rows };
}

module.exports = {
  setTarget,
  getTargets,
  getMyPerformance,
  getLeaderboard
};
