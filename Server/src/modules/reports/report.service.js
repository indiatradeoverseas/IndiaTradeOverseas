const Lead = require('../leads/lead.model');
const User = require('../users/user.model');
const Quotation = require('../quotations/quotation.model');
const Payment = require('../payments/payment.model');
const Dispatch = require('../dispatch/dispatch.model');
const Attendance = require('../attendance/attendance.model');
const Ticket = require('../tickets/ticket.model');
const SecurityAlert = require('../security-audit/securityAlert.model');
const AuditLog = require('../security-audit/auditLog.model');

const CLOSED_STAGES = ['CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'];
const WON_STAGES = ['CLOSED_WON', 'DEAL_WON'];
const ORDER_PIPELINE_STAGES = ['QUOTATION_SHARED', 'QUOTATION_SENT', 'NEGOTIATION', 'LOI_PO_PENDING', 'PO_RECEIVED', 'QUOTATION_REQUESTED'];

async function getAdminCommandCenterMetrics() {
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);


  const totalEmployees = await User.countDocuments({ role: { $nin: ['SYSTEM', 'AI'] } });
  const activeEmployees = await User.countDocuments({ role: { $nin: ['SYSTEM', 'AI'] }, isActive: true });
  const presentToday = await Attendance.countDocuments({ date: todayStart, checkInAt: { $ne: null } });
  const openTickets = await Ticket.countDocuments({ status: { $nin: ['RESOLVED', 'CLOSED'] } });


  const totalLeads = await Lead.countDocuments();
  const activeLeads = await Lead.countDocuments({ stage: { $nin: CLOSED_STAGES } });
  const pendingLeads = await Lead.countDocuments({ stage: 'NEW_LEAD' });
  const todayLeads = await Lead.countDocuments({ createdAt: { $gte: todayStart } });
  const aiGeneratedLeads = await Lead.countDocuments({ source: 'AI_AGENT' });
  const hotLeads = await Lead.countDocuments({ priority: 'HOT', stage: { $nin: CLOSED_STAGES } });


  const followUpsDueToday = await Lead.countDocuments({
    nextFollowupAt: { $gte: todayStart, $lte: todayEnd },
    stage: { $nin: CLOSED_STAGES }
  });
  const missedFollowUps = await Lead.countDocuments({
    nextFollowupAt: { $lt: now },
    stage: { $nin: CLOSED_STAGES }
  });


  const totalQuotations = await Quotation.countDocuments();
  const pendingQuotes = await Quotation.aggregate([
    { $match: { status: 'PENDING' } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalValue: { $sum: '$employeeRequestedPrice' }
      }
    }
  ]);
  const sentQuotations = await Quotation.countDocuments({ status: 'SENT_TO_CUSTOMER' });
  const approvedQuotations = await Quotation.countDocuments({ status: 'APPROVED' });


  const ordersConfirmed = await Lead.countDocuments({ stage: 'ORDER_CONFIRMED' });
  const pendingOrders = await Lead.countDocuments({ stage: { $in: ORDER_PIPELINE_STAGES } });


  const pendingPayments = await Payment.aggregate([
    { $match: { paymentStatus: { $in: ['Due', 'Overdue', 'Partial'] } } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalOutstanding: { $sum: '$balanceAmount' }
      }
    }
  ]);
  const paymentPendingCount = pendingPayments[0] ? pendingPayments[0].count : 0;
  const paymentPendingValue = pendingPayments[0] ? pendingPayments[0].totalOutstanding : 0;

  const revenueAgg = await Payment.aggregate([
    { $group: { _id: null, collected: { $sum: { $subtract: ['$totalAmount', '$balanceAmount'] } } } }
  ]);
  const monthlyRevenueAgg = await Payment.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        collected: { $sum: { $subtract: ['$totalAmount', '$balanceAmount'] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);


  const transportAgg = await Dispatch.aggregate([
    { $group: { _id: '$dispatchStatus', count: { $sum: 1 } } }
  ]);
  const transportBreakdown = transportAgg.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});
  const transportTotal = transportAgg.reduce((sum, row) => sum + row.count, 0);


  const departmentPerformanceRaw = await Lead.aggregate([
    { $match: { assignedDepartment: { $ne: null } } },
    {
      $group: {
        _id: '$assignedDepartment',
        totalLeads: { $sum: 1 },
        won: { $sum: { $cond: [{ $in: ['$stage', WON_STAGES] }, 1, 0] } }
      }
    },
    { $sort: { totalLeads: -1 } }
  ]);


  const topEmployees = await Lead.aggregate([
    { $match: { assignedTo: { $ne: null } } },
    {
      $group: {
        _id: '$assignedTo',
        totalLeads: { $sum: 1 },
        conversions: { $sum: { $cond: [{ $in: ['$stage', WON_STAGES] }, 1, 0] } }
      }
    },
    { $sort: { conversions: -1, totalLeads: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'employee' } },
    { $unwind: '$employee' },
    {
      $project: {
        _id: 1,
        fullName: '$employee.fullName',
        employeeId: '$employee.employeeId',
        totalLeads: 1,
        conversions: 1
      }
    }
  ]);


  const stageCountsRaw = await Lead.aggregate([
    { $group: { _id: '$stage', total: { $sum: 1 } } }
  ]);
  const stageCounts = stageCountsRaw.reduce((acc, row) => {
    acc[row._id] = row.total;
    return acc;
  }, {});


  const securityAlerts = await SecurityAlert.countDocuments({ status: { $ne: 'RESOLVED' } });

  const exportAttempts = await AuditLog.find({ actionType: 'EXPORT_ATTEMPT' })
    .populate('actorId', 'fullName email employeeId')
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    summary: {
      totalEmployees,
      activeEmployees,
      presentToday,
      openTickets,
      totalLeads,
      activeLeads,
      pendingLeads,
      todayLeads,
      aiGeneratedLeads,
      hotLeads,
      followUpsDueToday,
      missedFollowUps,
      quotations: {
        total: totalQuotations,
        pending: pendingQuotes[0] ? pendingQuotes[0].count : 0,
        pendingValue: pendingQuotes[0] ? pendingQuotes[0].totalValue : 0,
        sent: sentQuotations,
        approved: approvedQuotations
      },
      ordersConfirmed,
      pendingOrders,
      revenue: {
        totalCollected: revenueAgg[0] ? revenueAgg[0].collected : 0,
        monthlyTrend: monthlyRevenueAgg.map((row) => ({ month: row._id, collected: row.collected }))
      },
      payments: {
        pendingCount: paymentPendingCount,
        pendingValue: paymentPendingValue
      },
      transport: {
        total: transportTotal,
        inTransit: transportBreakdown['In Transit'] || 0,
        delivered: transportBreakdown['Delivered'] || 0,
        pending: (transportBreakdown['Pending'] || 0) + (transportBreakdown['Truck Assigned'] || 0) + (transportBreakdown['Loading'] || 0),
        issueRaised: transportBreakdown['Issue Raised'] || 0
      },
      departmentPerformance: departmentPerformanceRaw.map((row) => ({
        department: row._id,
        totalLeads: row.totalLeads,
        won: row.won
      })),
      topEmployees,
      stageCounts,
      securityAlerts
    },
    exportAttempts,
    generatedAt: now.toISOString()
  };
}

async function getPipelineStats() {
  return Lead.aggregate([
    { $group: { _id: '$stage', total: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
}

async function getEmployeePerformance(employeeId) {
  const query = employeeId ? { assignedTo: employeeId } : {};
  return Lead.aggregate([
    { $match: { assignedTo: { $ne: null } } },
    {
      $group: {
        _id: '$assignedTo',
        totalLeads: { $sum: 1 },
        won: { $sum: { $cond: [{ $eq: ['$stage', 'CLOSED_WON'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$stage', 'CLOSED_LOST'] }, 1, 0] } }
      }
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        _id: 1,
        fullName: '$user.fullName',
        employeeId: '$user.employeeId',
        totalLeads: 1,
        won: 1,
        lost: 1
      }
    }
  ]);
}

module.exports = {
  getAdminCommandCenterMetrics,
  getPipelineStats,
  getEmployeePerformance
};
