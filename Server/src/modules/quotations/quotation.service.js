const Quotation = require('./quotation.model');
const Lead = require('../leads/lead.model');
const { recordAudit } = require('../security-audit/auditLog.service');

async function createQuotationRequest({ leadId, employeeRequestedPrice, marginNote, paymentTerms, validityDays, actorId }) {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  const quotation = await Quotation.create({
    leadId,
    requestedBy: actorId,
    employeeRequestedPrice,
    marginNote,
    paymentTerms,
    validityDays: validityDays || 7,
    status: 'PENDING'
  });

  await recordAudit({
    actorId,
    actionType: 'QUOTATION_REQUESTED',
    entityType: 'QUOTATION',
    entityId: quotation._id.toString(),
    severity: 'LOW',
    metadata: { leadId }
  });

  return quotation;
}

async function approveQuotation({ id, approvedPrice, actorId }) {
  const quotation = await Quotation.findById(id);
  if (!quotation) throw new Error('QUOTATION_NOT_FOUND');

  quotation.status = 'APPROVED';
  quotation.approvedPrice = approvedPrice || quotation.employeeRequestedPrice;
  quotation.approvedBy = actorId;
  quotation.approvedAt = new Date();
  await quotation.save();

  const lead = await Lead.findByIdAndUpdate(quotation.leadId, { stage: 'QUOTATION_APPROVED' }, { new: true });
  const leadName = lead ? (lead.customerName || lead.leadCode) : 'Client';

  try {
    const Notification = require('../notifications/notification.model');
    const targetUserId = quotation.requestedBy || (lead && lead.assignedTo) || null;
    const finalPriceStr = (quotation.approvedPrice || 0).toLocaleString('en-IN');

    await Notification.create({
      targetUserId,
      targetDepartment: 'SALES',
      message: `🎉 Quotation Approved! Price for ${leadName} set to ₹${finalPriceStr}. Stage promoted to QUOTATION_APPROVED.`,
      type: 'QUOTATION_APPROVED',
      metadata: { quotationId: quotation._id, leadId: quotation.leadId, approvedPrice: quotation.approvedPrice }
    });
  } catch (notifErr) {
    console.warn('Quotation approval notification notice:', notifErr.message);
  }

  await recordAudit({
    actorId,
    actionType: 'QUOTATION_APPROVED',
    entityType: 'QUOTATION',
    entityId: quotation._id.toString(),
    severity: 'MEDIUM',
    metadata: { approvedPrice }
  });

  return quotation;
}

async function rejectQuotation({ id, marginNote, actorId }) {
  const quotation = await Quotation.findById(id);
  if (!quotation) throw new Error('QUOTATION_NOT_FOUND');

  quotation.status = 'REJECTED';
  if (marginNote) quotation.marginNote = marginNote;
  await quotation.save();

  try {
    const Notification = require('../notifications/notification.model');
    const lead = await Lead.findById(quotation.leadId);
    const leadName = lead ? (lead.customerName || lead.leadCode) : 'Client';
    const targetUserId = quotation.requestedBy || (lead && lead.assignedTo) || null;

    await Notification.create({
      targetUserId,
      targetDepartment: 'SALES',
      message: `⚠️ Quotation Rejected for ${leadName}. Reason: ${marginNote || 'Price proposal revised by management'}.`,
      type: 'QUOTATION_REJECTED',
      metadata: { quotationId: quotation._id, leadId: quotation.leadId, marginNote }
    });
  } catch (notifErr) {
    console.warn('Quotation rejection notification notice:', notifErr.message);
  }

  await recordAudit({
    actorId,
    actionType: 'QUOTATION_REJECTED',
    entityType: 'QUOTATION',
    entityId: quotation._id.toString(),
    severity: 'LOW',
    metadata: { marginNote }
  });

  return quotation;
}

async function sendToCustomer(id, actorId) {
  const quotation = await Quotation.findById(id);
  if (!quotation) throw new Error('QUOTATION_NOT_FOUND');

  quotation.status = 'SENT_TO_CUSTOMER';
  await quotation.save();

  await Lead.findByIdAndUpdate(quotation.leadId, { stage: 'NEGOTIATION' });

  await recordAudit({
    actorId,
    actionType: 'LEAD_STAGE_CHANGED',
    entityType: 'QUOTATION',
    entityId: quotation._id.toString(),
    severity: 'LOW',
    metadata: { action: 'sent_to_customer' }
  });

  return quotation;
}

async function getQuotationSummary() {
  const stats = await Quotation.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$employeeRequestedPrice' }
      }
    }
  ]);
  
  return {
    stats: stats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        value: curr.totalValue
      };
      return acc;
    }, {}),
    generatedAt: new Date().toISOString()
  };
}

async function bulkApproveQuotations({ quotationIds, approvedPrice, actorId }) {
  if (!Array.isArray(quotationIds) || quotationIds.length === 0) {
    throw new Error('QUOTATION_IDS_REQUIRED');
  }

  const results = [];
  for (const id of quotationIds) {
    try {
      const q = await Quotation.findById(id);
      if (q && q.status === 'PENDING') {
        const finalPrice = approvedPrice ? parseFloat(approvedPrice) : q.employeeRequestedPrice;
        const res = await approveQuotation({ id, approvedPrice: finalPrice, actorId });
        results.push(res);
      }
    } catch (err) {
      console.error(`[bulkApproveQuotations] Failed for quotation ${id}:`, err.message);
    }
  }
  return { approvedCount: results.length, quotations: results };
}

async function bulkRejectQuotations({ quotationIds, marginNote, actorId }) {
  if (!Array.isArray(quotationIds) || quotationIds.length === 0) {
    throw new Error('QUOTATION_IDS_REQUIRED');
  }

  const results = [];
  for (const id of quotationIds) {
    try {
      const q = await Quotation.findById(id);
      if (q && q.status === 'PENDING') {
        const res = await rejectQuotation({ id, marginNote, actorId });
        results.push(res);
      }
    } catch (err) {
      console.error(`[bulkRejectQuotations] Failed for quotation ${id}:`, err.message);
    }
  }
  return { rejectedCount: results.length, quotations: results };
}

module.exports = {
  createQuotationRequest,
  approveQuotation,
  rejectQuotation,
  bulkApproveQuotations,
  bulkRejectQuotations,
  sendToCustomer,
  getQuotationSummary
};
