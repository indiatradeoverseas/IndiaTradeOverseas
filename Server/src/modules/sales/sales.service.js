const mongoose = require('mongoose');
const Lead = require('../leads/lead.model');
const LeadActivity = require('../leads/leadActivity.model');
const Payment = require('../payments/payment.model');
const SalesTarget = require('./salesTarget.model');
const { WON_STAGES, LOST_STAGES } = require('../leads/lead.constants');

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
  return SalesTarget.findOneAndUpdate(
    { employeeId, month, year },
    { targetValue, targetDeals, setBy },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function getTargets({ employeeId, month, year } = {}) {
  const filter = {};
  if (employeeId) filter.employeeId = employeeId;
  if (month) filter.month = month;
  if (year) filter.year = year;
  return SalesTarget.find(filter).populate('employeeId', 'fullName employeeId department').sort({ year: -1, month: -1 });
}

async function getMyPerformance(user, { month, year } = {}) {
  const range = monthRange(month, year);
  const employeeObjectId = toObjectId(user._id);

  const leadAgg = await Lead.aggregate([
    { $match: { assignedTo: employeeObjectId, updatedAt: { $gte: range.start, $lte: range.end } } },
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
    { $match: { assignedTo: employeeObjectId, stage: { $in: WON_STAGES }, updatedAt: { $gte: range.start, $lte: range.end } } },
    { $lookup: { from: 'payments', localField: '_id', foreignField: 'leadId', as: 'payments' } },
    { $unwind: '$payments' },
    { $group: { _id: null, revenue: { $sum: '$payments.totalAmount' } } }
  ]);

  const activityAgg = await LeadActivity.aggregate([
    { $match: { actorId: employeeObjectId, createdAt: { $gte: range.start, $lte: range.end }, actionType: { $in: ACTIVITY_TYPES } } },
    { $group: { _id: '$actionType', count: { $sum: 1 } } }
  ]);

  const activityCounts = activityAgg.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});

  const target = await SalesTarget.findOne({ employeeId: user._id, month: range.month, year: range.year });

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
    stage: { $in: WON_STAGES },
    updatedAt: { $gte: range.start, $lte: range.end }
  };
  if (department) leadMatch.assignedDepartment = department;

  const dealsAgg = await Lead.aggregate([
    { $match: leadMatch },
    { $lookup: { from: 'payments', localField: '_id', foreignField: 'leadId', as: 'payments' } },
    { $addFields: { dealRevenue: { $sum: '$payments.totalAmount' } } },
    { $group: { _id: '$assignedTo', dealsWon: { $sum: 1 }, revenue: { $sum: '$dealRevenue' } } }
  ]);

  const activityAgg = await LeadActivity.aggregate([
    { $match: { actorId: { $ne: null }, createdAt: { $gte: range.start, $lte: range.end }, actionType: { $in: ACTIVITY_TYPES } } },
    { $group: { _id: '$actorId', activityCount: { $sum: 1 } } }
  ]);

  const activityByEmployee = activityAgg.reduce((acc, row) => {
    acc[row._id.toString()] = row.activityCount;
    return acc;
  }, {});

  const employeeIds = new Set([
    ...dealsAgg.map((row) => row._id.toString()),
    ...Object.keys(activityByEmployee)
  ]);

  const User = require('../users/user.model');
  const users = await User.find({ _id: { $in: [...employeeIds] } }).select('fullName employeeId department role');
  const userById = users.reduce((acc, u) => {
    acc[u._id.toString()] = u;
    return acc;
  }, {});

  const dealsByEmployee = dealsAgg.reduce((acc, row) => {
    acc[row._id.toString()] = row;
    return acc;
  }, {});

  const rows = [...employeeIds]
    .filter((id) => userById[id])
    .map((id) => {
      const deal = dealsByEmployee[id] || { dealsWon: 0, revenue: 0 };
      const activityCount = activityByEmployee[id] || 0;
      const u = userById[id];
      return {
        employeeId: id,
        fullName: u.fullName,
        employeeCode: u.employeeId,
        department: u.department,
        dealsWon: deal.dealsWon,
        revenue: deal.revenue,
        activityCount
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.dealsWon - a.dealsWon || b.activityCount - a.activityCount)
    .slice(0, 20);

  return { period, startDate: range.start, endDate: range.end, leaderboard: rows };
}

module.exports = {
  setTarget,
  getTargets,
  getMyPerformance,
  getLeaderboard
};
