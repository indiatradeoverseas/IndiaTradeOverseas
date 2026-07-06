const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');
const Quotation = require('../quotations/quotation.model');
const { recordAudit, raiseAlert } = require('../security-audit/auditLog.service');
const { maskPhone, maskEmail } = require('../../utils/crypto');

const allowedStageTransitions = {
  NEW_LEAD: ['ASSIGNED', 'LEAD_QUALIFICATION', 'CLOSED_LOST', 'CONTACTED', 'DEAL_LOST'],
  ASSIGNED: ['CONTACTED', 'QUOTATION_REQUIRED', 'CLOSED_LOST', 'DEAL_LOST'],
  CONTACTED: ['QUOTATION_REQUIRED', 'CLOSED_LOST', 'FOLLOW_UP', 'DEAL_LOST'],
  LEAD_QUALIFICATION: ['FOLLOW_UP', 'CLOSED_LOST', 'DEAL_LOST'],
  FOLLOW_UP: ['REQUIREMENT_CAPTURED', 'CLOSED_LOST', 'REQUIREMENT_RECEIVED', 'DEAL_LOST'],
  REQUIREMENT_CAPTURED: ['QUOTATION_REQUIRED', 'CLOSED_LOST', 'DEAL_LOST'],
  QUOTATION_REQUIRED: ['QUOTATION_PENDING_APPROVAL', 'QUOTATION_REQUESTED', 'CLOSED_LOST', 'DEAL_LOST'],
  QUOTATION_PENDING_APPROVAL: ['QUOTATION_APPROVED', 'CLOSED_LOST', 'DEAL_LOST'],
  QUOTATION_APPROVED: ['NEGOTIATION', 'CLOSED_LOST', 'DEAL_LOST'],
  QUOTATION_REQUESTED: ['QUOTATION_SHARED', 'CLOSED_LOST', 'DEAL_LOST'],
  QUOTATION_SHARED: ['DISPATCH_PLANNED', 'CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
  NEGOTIATION: ['LOI_PO_PENDING', 'CLOSED_LOST', 'SAMPLE_SENT', 'DEAL_WON', 'DEAL_LOST'],
  LOI_PO_PENDING: ['ORDER_CONFIRMED', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
  ORDER_CONFIRMED: ['DISPATCH_PENDING', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
  DISPATCH_PENDING: ['PAYMENT_PENDING', 'CLOSED_LOST', 'DEAL_LOST'],
  DISPATCH_PLANNED: ['PAYMENT_PENDING', 'CLOSED_LOST', 'DEAL_LOST'],
  PAYMENT_PENDING: ['DOCUMENT_PENDING', 'CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
  DOCUMENT_PENDING: ['CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
  CLOSED_WON: [],
  CLOSED_LOST: [],
  
  // New pipeline transition mappings
  REQUIREMENT_RECEIVED: ['QUOTATION_SENT', 'DEAL_WON', 'DEAL_LOST'],
  QUOTATION_SENT: ['NEGOTIATION', 'DEAL_WON', 'DEAL_LOST'],
  SAMPLE_SENT: ['PRICE_DISCUSSION', 'DEAL_WON', 'DEAL_LOST'],
  PRICE_DISCUSSION: ['PAYMENT_DISCUSSION', 'DEAL_WON', 'DEAL_LOST'],
  PAYMENT_DISCUSSION: ['PO_RECEIVED', 'DEAL_WON', 'DEAL_LOST'],
  PO_RECEIVED: ['ORDER_CONFIRMED', 'DEAL_WON', 'DEAL_LOST'],
  ORDER_CONFIRMED: ['DEAL_WON', 'DEAL_LOST'],
  DEAL_WON: [],
  DEAL_LOST: []
};

function canAccessLead(user, lead) {
  if (!user) return false;
  if (
    user.role === 'ADMIN' ||
    user.role === 'MANAGER' ||
    user.role === 'HR' ||
    user.role === 'ACCOUNTS' ||
    user.role === 'FINANCE' ||
    user.paymentPermission === true ||
    user.dispatchPermission === true ||
    user.quotationPermission === true
  ) {
    return true;
  }
  if (lead.assignedTo && lead.assignedTo.toString() === user._id.toString()) return true;
  return false;
}

function getLeadDisplay(lead, user) {
  const leadObj = lead.toObject ? lead.toObject() : lead;
  const { decryptText } = require('../../utils/crypto');


  if (user && (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'HR')) {

    const decryptedPhone = decryptText(leadObj.phoneEncrypted);
    const decryptedEmail = leadObj.emailEncrypted ? decryptText(leadObj.emailEncrypted) : '';
    return {
      ...leadObj,
      phone: decryptedPhone,
      email: decryptedEmail,
      phoneMasked: decryptedPhone,
      emailMasked: decryptedEmail
    };
  }

  return {
    ...leadObj,
    phone: leadObj.phoneMasked,
    email: leadObj.emailMasked
  };
}

async function listLeads(user, query = {}) {
  const filter = {};
  if (query.stage) filter.stage = query.stage;

  if (
    user.role !== 'ADMIN' &&
    user.role !== 'MANAGER' &&
    user.role !== 'HR' &&
    user.role !== 'ACCOUNTS' &&
    user.role !== 'FINANCE' &&
    user.paymentPermission !== true &&
    user.dispatchPermission !== true &&
    user.quotationPermission !== true
  ) {
    filter.assignedTo = user._id;
  }

  const leads = await Lead.find(filter).sort({ createdAt: -1 });
  return leads.map(l => getLeadDisplay(l, user));
}

async function getLeadById(id, user) {
  const lead = await Lead.findById(id);
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  if (!canAccessLead(user, lead)) {
    throw new Error('OWNERSHIP_FORBIDDEN');
  }

  const activities = await LeadActivity.find({ leadId: lead._id }).sort({ createdAt: -1 });
  return {
    lead: getLeadDisplay(lead, user),
    activities
  };
}

async function updateStage({ leadId, newStage, remark = '', nextFollowupAt = null, user, ipAddress, deviceHash }) {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('LEAD_NOT_FOUND');


  if (!canAccessLead(user, lead)) {
    await recordAudit({
      actorId: user._id,
      actionType: 'UNAUTHORIZED_VIEW',
      entityType: 'LEAD',
      entityId: leadId,
      severity: 'HIGH',
      ipAddress,
      deviceHash,
      metadata: { action: 'change_stage' }
    });
    throw new Error('OWNERSHIP_FORBIDDEN');
  }


  const previousStage = lead.stage;
  const isAllowed = allowedStageTransitions[previousStage]?.includes(newStage);
  if (!isAllowed) {
    throw new Error(`INVALID_STAGE_TRANSITION: Cannot transition from ${previousStage} to ${newStage}`);
  }


  lead.stage = newStage;
  if (remark) lead.remarks = remark;
  if (nextFollowupAt) lead.nextFollowupAt = nextFollowupAt;
  await lead.save();


  const activity = await LeadActivity.create({
    leadId: lead._id,
    actionType: 'LEAD_STAGE_CHANGED',
    note: remark || `Stage transitioned from ${previousStage} to ${newStage}`,
    nextFollowupAt,
    actorId: user._id,
    metadata: { fromStage: previousStage, toStage: newStage }
  });


  if (newStage === 'QUOTATION_REQUIRED') {
    const existingQuotation = await Quotation.findOne({ leadId: lead._id, status: 'PENDING' });
    if (!existingQuotation) {
      await Quotation.create({
        leadId: lead._id,
        requestedBy: user._id,
        employeeRequestedPrice: null,
        status: 'PENDING',
        paymentTerms: 'Pending Negotiation'
      });
    }
  }


  await recordAudit({
    actorId: user._id,
    actionType: 'LEAD_STAGE_CHANGED',
    entityType: 'LEAD',
    entityId: lead._id.toString(),
    severity: 'LOW',
    ipAddress,
    deviceHash,
    metadata: { previousStage, newStage, activityId: activity._id }
  });

  return getLeadDisplay(lead, user);
}

async function assignLead({ leadId, assignedTo, assignedDepartment, user }) {
  const Lead = require('./lead.model');
  const LeadActivity = require('./leadActivity.model');
  const Notification = require('../notifications/notification.model');
  const { recordAudit } = require('../security-audit/auditLog.service');

  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  const oldAssignedTo = lead.assignedTo;
  const oldAssignedDept = lead.assignedDepartment;


  lead.assignedTo = assignedTo || null;
  lead.assignedDepartment = assignedDepartment || null;




  if (lead.stage === 'NEW_LEAD' && (assignedTo || assignedDepartment)) {
    lead.stage = 'ASSIGNED';
  }

  await lead.save();


  await LeadActivity.create({
    leadId: lead._id,
    actionType: 'LEAD_ASSIGNED',
    note: `Lead assignment updated. Employee: ${assignedTo ? 'assigned' : 'unassigned'}, Department: ${assignedDepartment || 'none'}`,
    actorId: user._id
  });


  if (assignedTo && String(assignedTo) !== String(oldAssignedTo)) {
    await Notification.create({
      targetUserId: assignedTo,
      message: `Lead ${lead.leadCode} has been assigned to you by ${user.fullName}.`,
      type: 'TASK_ASSIGNMENT',
      metadata: { leadId: lead._id }
    });
  } else if (assignedDepartment && assignedDepartment !== oldAssignedDept) {
    await Notification.create({
      targetDepartment: assignedDepartment,
      message: `Lead ${lead.leadCode} has been routed to your department (${assignedDepartment}) by ${user.fullName}.`,
      type: 'TASK_ASSIGNMENT',
      metadata: { leadId: lead._id }
    });
  }


  await recordAudit({
    actorId: user._id,
    actionType: 'LEAD_ASSIGNED',
    entityType: 'LEAD',
    entityId: lead._id.toString(),
    severity: 'LOW',
    metadata: { assignedTo, assignedDepartment }
  });

  return getLeadDisplay(lead, user);
}

async function deleteLead(leadId, user) {
  const Lead = require('./lead.model');
  const LeadActivity = require('./leadActivity.model');
  const { recordAudit } = require('../security-audit/auditLog.service');

  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  await Lead.findByIdAndDelete(leadId);
  await LeadActivity.deleteMany({ leadId });

  await recordAudit({
    actorId: user._id,
    actionType: 'LEAD_DELETED',
    entityType: 'LEAD',
    entityId: leadId,
    severity: 'HIGH',
    metadata: { leadCode: lead.leadCode }
  });

  return { success: true };
}

module.exports = {
  listLeads,
  getLeadById,
  updateStage,
  canAccessLead,
  getLeadDisplay,
  assignLead,
  deleteLead
};
