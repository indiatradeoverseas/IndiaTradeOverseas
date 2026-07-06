const Lead = require('../leads/lead.model');
const User = require('../users/user.model');
const Quotation = require('../quotations/quotation.model');
const Payment = require('../payments/payment.model');
const SecurityAlert = require('../security-audit/securityAlert.model');
const AuditLog = require('../security-audit/auditLog.model');

async function getAdminCommandCenterMetrics() {
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);


  const totalLeads = await Lead.countDocuments();


  const todayLeads = await Lead.countDocuments({ createdAt: { $gte: todayStart } });


  const aiGeneratedLeads = await Lead.countDocuments({ source: 'AI_AGENT' });


  const hotLeads = await Lead.countDocuments({
    priority: 'HOT',
    stage: { $nin: ['CLOSED_WON', 'CLOSED_LOST'] }
  });


  const missedFollowUps = await Lead.countDocuments({
    nextFollowupAt: { $lt: now },
    stage: { $nin: ['CLOSED_WON', 'CLOSED_LOST'] }
  });


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
  const quotationPendingCount = pendingQuotes[0] ? pendingQuotes[0].count : 0;
  const quotationPendingValue = pendingQuotes[0] ? pendingQuotes[0].totalValue : 0;


  const ordersConfirmed = await Lead.countDocuments({ stage: 'ORDER_CONFIRMED' });


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


  const employeeRanking = await Lead.aggregate([
    { $match: { assignedTo: { $ne: null } } },
    {
      $group: {
        _id: '$assignedTo',
        totalLeads: { $sum: 1 },
        conversions: { $sum: { $cond: [{ $eq: ['$stage', 'CLOSED_WON'] }, 1, 0] } }
      }
    },
    { $sort: { conversions: -1, totalLeads: -1 } },
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


  const securityAlerts = await SecurityAlert.countDocuments({ status: { $ne: 'RESOLVED' } });


  const exportAttempts = await AuditLog.find({ actionType: 'EXPORT_ATTEMPT' })
    .populate('actorId', 'fullName email employeeId')
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    metrics: {
      totalLeads,
      todayLeads,
      aiGeneratedLeads,
      hotLeads,
      missedFollowUps,
      quotationPending: {
        count: quotationPendingCount,
        value: quotationPendingValue
      },
      ordersConfirmed,
      paymentPending: {
        count: paymentPendingCount,
        value: paymentPendingValue
      },
      securityAlerts,
      employeeRanking
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
