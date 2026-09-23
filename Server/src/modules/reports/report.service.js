const mongoose = require('mongoose');
const Lead = require('../leads/lead.model');
const User = require('../users/user.model');
const Quotation = require('../quotations/quotation.model');
const Payment = require('../payments/payment.model');
const Dispatch = require('../dispatch/dispatch.model');
const Attendance = require('../attendance/attendance.model');
const Ticket = require('../tickets/ticket.model');
const Leave = require('../leave/leave.model');
const SecurityAlert = require('../security-audit/securityAlert.model');
const AuditLog = require('../security-audit/auditLog.model');
const { WON_STAGES, LOST_STAGES } = require('../leads/lead.constants');

const CLOSED_STAGES = ['CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'];
const ORDER_PIPELINE_STAGES = ['QUOTATION_SHARED', 'QUOTATION_SENT', 'NEGOTIATION', 'LOI_PO_PENDING', 'PO_RECEIVED', 'QUOTATION_REQUESTED'];

const Employee = require('../employee/employee.model');
const SalesTrialUser = require('../sales-trial/salesTrialUser.model');

async function getAdminCommandCenterMetrics({ startDate, endDate } = {}) {
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const revenueRangeStart = startDate ? new Date(startDate) : sixMonthsAgo;
  const revenueRangeEnd = endDate ? new Date(endDate) : now;

  // Date range filter for metrics queries (when startDate & endDate are supplied)
  const dateFilter = (startDate && endDate)
    ? {
        $or: [
          { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
          { updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
        ]
      }
    : {};

  const createdDateFilter = (startDate && endDate)
    ? { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    : {};

  const [users, emps, trials] = await Promise.all([
    User.find({ role: { $nin: ['SYSTEM', 'AI'] } }, 'email isActive status role').lean(),
    Employee.find({ status: { $ne: 'TERMINATED' } }, 'email status role').lean(),
    SalesTrialUser.find({ status: { $ne: 'REJECTED' } }, 'email status role').lean()
  ]);

  const allEmails = new Set();
  const activeEmails = new Set();

  users.forEach((u) => {
    if (u.email) {
      const email = u.email.toLowerCase();
      allEmails.add(email);
      if (u.isActive !== false && u.status !== 'INACTIVE') {
        activeEmails.add(email);
      }
    }
  });

  emps.forEach((e) => {
    if (e.email) {
      const email = e.email.toLowerCase();
      allEmails.add(email);
      if (['ACTIVE', 'Active', 'active'].includes(e.status)) {
        activeEmails.add(email);
      }
    }
  });

  trials.forEach((t) => {
    if (t.email) {
      const email = t.email.toLowerCase();
      allEmails.add(email);
      if (['ACTIVE', 'Active', 'active', 'PENDING_APPROVAL'].includes(t.status)) {
        activeEmails.add(email);
      }
    }
  });

  const totalEmployees = Math.max(allEmails.size, users.length, emps.length, trials.length);
  const activeEmployees = Math.max(activeEmails.size, 1);

  const presentToday = await Attendance.countDocuments({
    $or: [
      { date: { $gte: todayStart, $lte: todayEnd } },
      { checkInAt: { $gte: todayStart, $lte: todayEnd } }
    ],
    checkInAt: { $ne: null }
  });
  const openTickets = await Ticket.countDocuments({ status: { $nin: ['RESOLVED', 'CLOSED'] } });
  const pendingLeaveRequests = await Leave.countDocuments({ status: 'PENDING' });


  const totalLeads = await Lead.countDocuments(createdDateFilter);
  const activeLeads = await Lead.countDocuments({ stage: { $nin: CLOSED_STAGES }, ...dateFilter });
  const completedLeads = await Lead.countDocuments({ stage: { $in: ['CLOSED_WON', 'DEAL_WON', 'DELIVERED', 'COMPLETED'] }, ...dateFilter });
  const deliveredLeads = await Lead.countDocuments({ stage: { $in: ['DELIVERED', 'COMPLETED'] }, ...dateFilter });
  const paidLeadsQuery = {
    $or: [
      { stage: { $in: ['CLOSED_WON', 'DEAL_WON', 'COMPLETED'] } },
      { paymentProofUrl: { $exists: true, $ne: '' } },
      { 'paymentProof.proofImageUrl': { $exists: true, $ne: '' } }
    ]
  };
  if (startDate && endDate) {
    paidLeadsQuery.$or = [
      { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
      { updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    ];
  }
  const paidLeads = await Lead.countDocuments(paidLeadsQuery);

  const conversionRate = totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;
  const newLeads = await Lead.countDocuments({ stage: 'NEW_LEAD', ...dateFilter });
  const assignedLeads = await Lead.countDocuments({ assignedTo: { $ne: null }, ...dateFilter });
  const pendingLeads = await Lead.countDocuments({ stage: 'NEW_LEAD', ...dateFilter });
  const todayLeads = await Lead.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } });
  const aiGeneratedLeads = await Lead.countDocuments({ source: 'AI_AGENT', ...dateFilter });
  const hotLeads = await Lead.countDocuments({ priority: 'HOT', stage: { $nin: CLOSED_STAGES }, ...dateFilter });

  const followUpsDueToday = await Lead.countDocuments({
    nextFollowupAt: { $gte: todayStart, $lte: todayEnd },
    stage: { $nin: CLOSED_STAGES }
  });
  const missedFollowUps = await Lead.countDocuments({
    nextFollowupAt: { $lt: now },
    stage: { $nin: CLOSED_STAGES }
  });

  const totalQuotations = await Quotation.countDocuments(createdDateFilter);
  const pendingQuotesMatch = { status: 'PENDING', ...createdDateFilter };
  const pendingQuotes = await Quotation.aggregate([
    { $match: pendingQuotesMatch },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalValue: { $sum: '$employeeRequestedPrice' }
      }
    }
  ]);
  const sentQuotations = await Quotation.countDocuments({ status: { $in: ['SENT_TO_CUSTOMER', 'APPROVED', 'SENT', 'QUOTATION_SENT'] }, ...createdDateFilter });
  const approvedQuotations = await Quotation.countDocuments({ status: 'APPROVED', ...createdDateFilter });

  const ordersConfirmed = await Lead.countDocuments({ stage: { $in: ['ORDER_CONFIRMED', 'PO_RECEIVED', 'CLOSED_WON', 'DEAL_WON', 'DISPATCH_PENDING', 'DELIVERED', 'COMPLETED'] }, ...dateFilter });
  const pendingOrders = await Lead.countDocuments({ stage: { $in: ORDER_PIPELINE_STAGES }, ...dateFilter });


  const pendingPaymentsMatch = { paymentStatus: { $in: ['Due', 'Overdue', 'Partial'] } };
  if (startDate && endDate) {
    pendingPaymentsMatch.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  const pendingPayments = await Payment.aggregate([
    { $match: pendingPaymentsMatch },
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

  // Pending Orders Value: sum of leadValue for orders confirmed but not yet delivered
  const pendingOrdersMatch = { stage: { $in: ['ORDER_CONFIRMED', 'PO_RECEIVED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING'] } };
  if (startDate && endDate) {
    pendingOrdersMatch.$or = [
      { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
      { updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    ];
  }
  const pendingOrdersAgg = await Lead.aggregate([
    { $match: pendingOrdersMatch },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalValue: { $sum: { $ifNull: ['$leadValue', 0] } }
      }
    }
  ]);
  const pendingOrdersCount = pendingOrdersAgg[0] ? pendingOrdersAgg[0].count : 0;
  const pendingOrdersValue = pendingOrdersAgg[0] ? pendingOrdersAgg[0].totalValue : 0;

  const paymentCollectionMatch = {};
  if (startDate && endDate) {
    paymentCollectionMatch.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  const paymentCollectionAgg = await Payment.aggregate([
    { $match: paymentCollectionMatch },
    { $group: { _id: null, collected: { $sum: { $subtract: ['$totalAmount', '$balanceAmount'] } } } }
  ]);

  const deliveredRevenueMatch = { stage: { $in: ['DELIVERED', 'COMPLETED', 'CLOSED_WON', 'DEAL_WON'] } };
  if (startDate && endDate) {
    deliveredRevenueMatch.$or = [
      { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
      { updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    ];
  }
  const deliveredRevenueAgg = await Lead.aggregate([
    { $match: deliveredRevenueMatch },
    { $lookup: { from: 'payments', localField: '_id', foreignField: 'leadId', as: 'payments' } },
    {
      $addFields: {
        collectedAmt: {
          $cond: {
            if: { $gt: [{ $size: '$payments' }, 0] },
            then: {
              $reduce: {
                input: '$payments',
                initialValue: 0,
                in: { $add: ['$$value', { $subtract: ['$$this.totalAmount', '$$this.balanceAmount'] }] }
              }
            },
            else: { $ifNull: ['$leadValue', 0] }
          }
        }
      }
    },
    { $group: { _id: null, collected: { $sum: '$collectedAmt' } } }
  ]);

  const val1 = (deliveredRevenueAgg && deliveredRevenueAgg[0] && typeof deliveredRevenueAgg[0].collected === 'number' && !isNaN(deliveredRevenueAgg[0].collected)) ? deliveredRevenueAgg[0].collected : 0;
  const val2 = (paymentCollectionAgg && paymentCollectionAgg[0] && typeof paymentCollectionAgg[0].collected === 'number' && !isNaN(paymentCollectionAgg[0].collected)) ? paymentCollectionAgg[0].collected : 0;
  const totalCollectedValue = Math.max(val1, val2, 0);

  const monthlyRevenueAgg = await Lead.aggregate([
    { $match: { stage: { $in: ['DELIVERED', 'COMPLETED', 'CLOSED_WON', 'DEAL_WON'] }, updatedAt: { $gte: revenueRangeStart, $lte: revenueRangeEnd } } },
    { $lookup: { from: 'payments', localField: '_id', foreignField: 'leadId', as: 'payments' } },
    {
      $addFields: {
        collectedAmt: {
          $cond: {
            if: { $gt: [{ $size: '$payments' }, 0] },
            then: {
              $reduce: {
                input: '$payments',
                initialValue: 0,
                in: { $add: ['$$value', { $subtract: ['$$this.totalAmount', '$$this.balanceAmount'] }] }
              }
            },
            else: { $ifNull: ['$leadValue', 0] }
          }
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } },
        collected: { $sum: '$collectedAmt' }
      }
    },
    { $sort: { _id: 1 } }
  ]);


  const [dispatchDocs, leadTransportDocs] = await Promise.all([
    Dispatch.aggregate([
      { $group: { _id: '$dispatchStatus', count: { $sum: 1 } } }
    ]),
    Lead.aggregate([
      { $match: { stage: { $in: ['IN_TRANSIT', 'DISPATCH_IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'ISSUE_RAISED'] } } },
      { $group: { _id: '$stage', count: { $sum: 1 } } }
    ])
  ]);

  let inTransitVal = 0;
  let deliveredVal = 0;
  let pendingVal = 0;
  let issueVal = 0;

  dispatchDocs.forEach(row => {
    const s = String(row._id || '').toLowerCase();
    if (s.includes('transit')) inTransitVal += row.count;
    else if (s.includes('deliver')) deliveredVal += row.count;
    else if (s.includes('issue') || s.includes('delay') || s.includes('break')) issueVal += row.count;
    else pendingVal += row.count;
  });

  leadTransportDocs.forEach(row => {
    const s = String(row._id || '').toUpperCase();
    if (s === 'IN_TRANSIT' || s === 'DISPATCH_IN_TRANSIT') inTransitVal += row.count;
    else if (s === 'DELIVERED' || s === 'COMPLETED') deliveredVal += row.count;
    else if (s === 'DISPATCH_PENDING' || s === 'DISPATCH_PLANNED') pendingVal += row.count;
    else if (s === 'ISSUE_RAISED') issueVal += row.count;
  });

  const totalTransportVal = inTransitVal + deliveredVal + pendingVal + issueVal;


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
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'emp' } },
    { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'salestrialusers', localField: '_id', foreignField: '_id', as: 'trial' } },
    { $unwind: { path: '$trial', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        fullName: {
          $trim: {
            input: {
              $ifNull: [
                '$user.fullName',
                '$user.name',
                '$emp.name',
                '$emp.fullName',
                '$trial.fullName',
                '$trial.name',
                ''
              ]
            }
          }
        },
        employeeId: { $ifNull: ['$user.employeeId', '$emp.employeeId', '$trial.trialId', 'N/A'] }
      }
    },
    {
      $match: {
        $and: [
          { fullName: { $ne: '' } },
          { fullName: { $ne: null } },
          { fullName: { $nin: ['', 'Sales Staff', 'Employee', 'EMPLOYEE', 'employee', 'Unassigned', 'N/A', null] } },
          { fullName: { $not: /^(employee|sales staff|unassigned|n\/a)$/i } }
        ]
      }
    },
    { $sort: { conversions: -1, totalLeads: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 1,
        fullName: 1,
        employeeId: 1,
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

  // Real 6-month business trend telemetry aggregation
  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const businessTrend = [];
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);
    const mEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const mName = monthsList[targetDate.getMonth()];

    const [mLeads, mCompleted, mQuotes, mOrders, mRev] = await Promise.all([
      Lead.countDocuments({ createdAt: { $gte: mStart, $lte: mEnd } }),
      Lead.countDocuments({ createdAt: { $gte: mStart, $lte: mEnd }, stage: { $in: ['CLOSED_WON', 'DEAL_WON', 'DELIVERED', 'COMPLETED'] } }),
      Quotation.countDocuments({ createdAt: { $gte: mStart, $lte: mEnd } }),
      Lead.countDocuments({ createdAt: { $gte: mStart, $lte: mEnd }, stage: { $in: ['ORDER_CONFIRMED', 'PO_RECEIVED', 'CLOSED_WON', 'DEAL_WON', 'DISPATCH_PENDING', 'DELIVERED', 'COMPLETED'] } }),
      Payment.aggregate([
        { $match: { createdAt: { $gte: mStart, $lte: mEnd } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$balanceAmount'] } } } }
      ])
    ]);

    const revVal = mRev[0] ? mRev[0].total : 0;
    const conv = mQuotes > 0 ? Math.round((mOrders / mQuotes) * 100) : (mLeads > 0 ? Math.round((mCompleted / mLeads) * 100) : 0);

    businessTrend.push({
      period: mName,
      'Total Employees': totalEmployees,
      'Active Leads': mLeads,
      'Completed & Delivered': mCompleted,
      'Payment Received (₹)': revVal,
      'Quotations Sent': mQuotes,
      'Orders Confirmed': mOrders,
      'Conversion %': conv
    });
  }

  return {
    summary: {
      totalEmployees,
      activeEmployees,
      presentToday,
      newLeads,
      assignedLeads,
      openTickets,
      pendingLeaveRequests,
      totalLeads,
      activeLeads,
      completedLeads,
      deliveredLeads,
      paidLeads,
      conversionRate,
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
        totalCollected: totalCollectedValue,
        currency: 'INR',
        monthlyTrend: monthlyRevenueAgg.map((row) => ({ month: row._id, collected: row.collected }))
      },
      payments: {
        pendingCount: paymentPendingCount,
        pendingValue: paymentPendingValue,
        pendingOrdersCount,
        pendingOrdersValue
      },
      transport: {
        total: totalTransportVal,
        inTransit: inTransitVal,
        delivered: deliveredVal,
        pending: pendingVal,
        issueRaised: issueVal
      },
      departmentPerformance: departmentPerformanceRaw.map((row) => ({
        department: row._id,
        totalLeads: row.totalLeads,
        won: row.won
      })),
      topEmployees,
      stageCounts,
      securityAlerts,
      businessTrend
    },
    exportAttempts,
    generatedAt: now.toISOString()
  };
}

async function getPipelineStats() {
  const pipeline = await Lead.aggregate([
    { $group: { _id: '$stage', total: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const now = new Date();
  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthly = [];

  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);
    const mEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    const mName = monthsList[targetDate.getMonth()];

    const [leads, won, lost] = await Promise.all([
      Lead.countDocuments({ createdAt: { $gte: mStart, $lte: mEnd } }),
      Lead.countDocuments({ createdAt: { $gte: mStart, $lte: mEnd }, stage: { $in: WON_STAGES } }),
      Lead.countDocuments({ createdAt: { $gte: mStart, $lte: mEnd }, stage: { $in: LOST_STAGES } })
    ]);

    monthly.push({
      month: mName,
      leads,
      won,
      lost
    });
  }

  return { pipeline, monthly };
}

async function getEmployeePerformance(employeeId) {
  const matchStage = { assignedTo: { $exists: true, $ne: null } };
  if (employeeId) {
    matchStage.assignedTo = mongoose.Types.ObjectId.isValid(employeeId)
      ? new mongoose.Types.ObjectId(employeeId)
      : employeeId;
  }
  const results = await Lead.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$assignedTo',
        totalLeads: { $sum: 1 },
        leads: { $sum: 1 },
        won: { $sum: { $cond: [{ $in: ['$stage', WON_STAGES] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $in: ['$stage', LOST_STAGES] }, 1, 0] } }
      }
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'emp' } },
    { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'salestrialusers', localField: '_id', foreignField: '_id', as: 'trial' } },
    { $unwind: { path: '$trial', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        name: {
          $trim: {
            input: {
              $ifNull: [
                '$user.fullName',
                '$user.name',
                '$emp.name',
                '$emp.fullName',
                '$trial.fullName',
                '$trial.name',
                ''
              ]
            }
          }
        },
        employeeId: { $ifNull: ['$user.employeeId', '$emp.employeeId', '$trial.trialId', 'N/A'] }
      }
    },
    {
      $match: {
        $and: [
          { name: { $ne: '' } },
          { name: { $ne: null } },
          { name: { $nin: ['', 'Sales Staff', 'Employee', 'EMPLOYEE', 'employee', 'Unassigned', 'N/A', null] } },
          { name: { $not: /^(employee|sales staff|unassigned|n\/a)$/i } }
        ]
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        employeeId: 1,
        totalLeads: 1,
        leads: 1,
        won: 1,
        lost: 1
      }
    },
    { $sort: { won: -1, totalLeads: -1 } }
  ]);

  return results;
}

module.exports = {
  getAdminCommandCenterMetrics,
  getPipelineStats,
  getEmployeePerformance
};
