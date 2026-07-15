const Payment = require('./payment.model');
const Lead = require('../leads/lead.model');
const { recordAudit } = require('../security-audit/auditLog.service');


async function createPayment({ leadId, dispatchId, totalAmount, advanceAmount, dueDate, paymentStatus, actorId }) {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  const parsedTotalAmount = Number(totalAmount);
  const parsedAdvanceAmount = Number(advanceAmount || 0);
  const balanceAmount = parsedTotalAmount - parsedAdvanceAmount;

  const payment = await Payment.create({
    leadId,
    dispatchId,
    totalAmount: parsedTotalAmount,
    advanceAmount: parsedAdvanceAmount,
    balanceAmount,
    dueDate,
    paymentStatus: paymentStatus || 'Not Started'
  });

  return payment;
}

async function listPayments(user) {
  const filter = {};
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'ACCOUNTS') {
    const myLeads = await Lead.find({ assignedTo: user._id }).select('_id');
    const myLeadIds = myLeads.map(l => l._id);
    filter.leadId = { $in: myLeadIds };
  }
  return Payment.find(filter).populate('leadId').sort({ createdAt: -1 });
}

async function listOutstandingPayments(user) {
  const filter = {
    paymentStatus: { $in: ['Due', 'Overdue', 'Partial'] }
  };

  if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'ACCOUNTS') {
    const myLeads = await Lead.find({ assignedTo: user._id }).select('_id');
    const myLeadIds = myLeads.map(l => l._id);
    filter.leadId = { $in: myLeadIds };
  }

  return Payment.find(filter).populate('leadId').sort({ dueDate: 1 });
}

async function updatePaymentStatus({ id, paymentStatus, advanceAmount, balanceAmount, invoiceDocumentId, paymentProofDocumentId, actorId }) {
  const payment = await Payment.findById(id);
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');

  if (paymentStatus) payment.paymentStatus = paymentStatus;
  if (advanceAmount !== undefined) {
    payment.advanceAmount = advanceAmount;
    payment.balanceAmount = payment.totalAmount - advanceAmount;
  }
  if (balanceAmount !== undefined) payment.balanceAmount = balanceAmount;
  if (invoiceDocumentId) payment.invoiceDocumentId = invoiceDocumentId;
  if (paymentProofDocumentId) payment.paymentProofDocumentId = paymentProofDocumentId;

  await payment.save();

  if (paymentStatus === 'Paid') {
    
    const lead = await Lead.findById(payment.leadId);
    if (lead) {
      lead.stage = 'CLOSED_WON';
      await lead.save();
    }
  }

  await recordAudit({
    actorId,
    actionType: 'LEAD_STAGE_CHANGED',
    entityType: 'PAYMENT',
    entityId: payment._id.toString(),
    severity: 'LOW',
    metadata: { paymentStatus, balanceAmount: payment.balanceAmount }
  });

  return payment;
}

async function triggerPaymentReminder(id, actorId) {
  const payment = await Payment.findById(id).populate('leadId');
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');

  payment.reminderCount += 1;
  payment.lastReminderAt = new Date();
  await payment.save();

  
  console.log(`[MOCK WHATSAPP REMINDER SENT] Client: ${payment.leadId.customerName}, Outstanding Amount: ${payment.balanceAmount}`);

  await recordAudit({
    actorId,
    actionType: 'LEAD_STAGE_CHANGED',
    entityType: 'PAYMENT',
    entityId: payment._id.toString(),
    severity: 'LOW',
    metadata: { action: 'payment_reminder_triggered', reminderCount: payment.reminderCount }
  });

  return payment;
}


module.exports = {
  createPayment,
  listPayments,
  listOutstandingPayments,
  updatePaymentStatus,
  triggerPaymentReminder
};

