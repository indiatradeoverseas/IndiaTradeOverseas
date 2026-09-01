const mongoose = require('mongoose');
const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');
const Quotation = require('../quotations/quotation.model');
const { recordAudit, raiseAlert } = require('../security-audit/auditLog.service');
const { maskPhone, maskEmail } = require('../../utils/crypto');

const allowedStageTransitions = {
 // Example from your lead.service.js:
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
  ORDER_CONFIRMED: ['DISPATCH_PENDING', 'DELIVERED', 'COMPLETED', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
  DISPATCH_PENDING: ['PAYMENT_PENDING', 'DELIVERED', 'COMPLETED', 'CLOSED_LOST', 'DEAL_LOST'],
  DISPATCH_PLANNED: ['PAYMENT_PENDING', 'DELIVERED', 'COMPLETED', 'CLOSED_LOST', 'DEAL_LOST'],
  PAYMENT_PENDING: ['DOCUMENT_PENDING', 'DELIVERED', 'COMPLETED', 'CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
  DOCUMENT_PENDING: ['CLOSED_WON', 'DELIVERED', 'COMPLETED', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'],
  DELIVERED: ['CLOSED_WON', 'COMPLETED', 'DEAL_WON'],
  COMPLETED: ['DEAL_WON'],
  CLOSED_WON: ['DEAL_WON'],
  CLOSED_LOST: [],
  
  // New pipeline transition mappings
  REQUIREMENT_RECEIVED: ['QUOTATION_SENT', 'DEAL_WON', 'DEAL_LOST'],
  QUOTATION_SENT: ['NEGOTIATION', 'DEAL_WON', 'DEAL_LOST'],
  SAMPLE_SENT: ['PRICE_DISCUSSION', 'DEAL_WON', 'DEAL_LOST'],
  PRICE_DISCUSSION: ['PAYMENT_DISCUSSION', 'DEAL_WON', 'DEAL_LOST'],
  PAYMENT_DISCUSSION: ['PO_RECEIVED', 'DEAL_WON', 'DEAL_LOST'],
  PO_RECEIVED: ['ORDER_CONFIRMED', 'DEAL_WON', 'DEAL_LOST'],
  DEAL_WON: [],
  DEAL_LOST: []
};

function canAccessLead(user, lead) {
  if (!user) return false;
  const role = user.role || '';
  const dept = user.department || '';
  const isManagerOrAdmin =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    role.endsWith('_MANAGER') ||
    role.toLowerCase().includes('manager') ||
    role === 'TRANSPORT' ||
    role === 'LOGISTICS' ||
    role === 'DRIVER' ||
    role.toLowerCase().includes('driver') ||
    dept === 'ADMIN' ||
    dept === 'TRANSPORT' ||
    dept === 'LOGISTICS' ||
    (user.position && user.position.toLowerCase().includes('admin'));

  let result = false;
  if (
    isManagerOrAdmin ||
    role === 'HR' ||
    role === 'ACCOUNTS' ||
    role === 'FINANCE' ||
    user.paymentPermission === true ||
    user.dispatchPermission === true ||
    user.quotationPermission === true
  ) {
    result = true;
  } else {
    const assigned = lead.assignedTo;
    if (assigned) {
      if (assigned.email && user.email && assigned.email.toLowerCase() === user.email.toLowerCase()) {
        result = true;
      } else {
        const assignedIdStr = (assigned._id || assigned).toString();
        if (assignedIdStr === user._id.toString()) result = true;
        else if (user.employeeDbId && assignedIdStr === user.employeeDbId.toString()) result = true;
      }
    } else {
      // Lead is not assigned to a specific person
      if (lead.assignedDepartment) {
        if (user.department && lead.assignedDepartment.toUpperCase() === user.department.toUpperCase()) {
          result = true;
        }
      } else {
        // Completely unassigned lead
        result = true;
      }
    }
  }
  return result;
}

function getLeadDisplay(lead, user) {
  const leadObj = lead.toObject ? lead.toObject() : lead;
  const { decryptText } = require('../../utils/crypto');


  const role = user ? (user.role || '') : '';
  const isManagerOrAdminUser =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    role.endsWith('_MANAGER') ||
    role.toLowerCase().includes('manager') ||
    (user && (user.department === 'ADMIN' || (user.position && user.position.toLowerCase().includes('admin'))));

  if (user && (isManagerOrAdminUser || role === 'HR')) {

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
  if (query.priority) filter.priority = String(query.priority).toUpperCase();

  const role = user.role || '';
  const dept = user.department || '';
  const isManagerOrAdminUser =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    role.endsWith('_MANAGER') ||
    role.toLowerCase().includes('manager') ||
    role === 'TRANSPORT' ||
    role === 'LOGISTICS' ||
    role === 'TRANSPORT_MANAGER' ||
    role === 'LOGISTICS_MANAGER' ||
    dept === 'ADMIN' ||
    dept === 'TRANSPORT' ||
    dept === 'LOGISTICS' ||
    user.dispatchPermission === true ||
    user.permissions?.dispatch === true ||
    (user.position && user.position.toLowerCase().includes('admin'));

  const shouldFilterMyLeadsOnly = query.myLeadsOnly === 'true' || (
    !isManagerOrAdminUser &&
    role !== 'HR' &&
    role !== 'ACCOUNTS' &&
    role !== 'FINANCE' &&
    query.dispatchQueue !== 'true'
  );

  if (shouldFilterMyLeadsOnly) {
    const actorIds = [user._id];
    if (user.employeeDbId) {
      actorIds.push(user.employeeDbId);
    }
    try {
      const Employee = require('../employee/employee.model');
      if (user.email) {
        const emailRegex = { $regex: new RegExp('^' + user.email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') };
        const emp = await Employee.findOne({ email: emailRegex });
        if (emp && !actorIds.map(String).includes(emp._id.toString())) {
          actorIds.push(emp._id);
        }
      }
    } catch (err) {
      console.error('Error resolving Employee ID in listLeads:', err);
    }
    filter.assignedTo = { $in: actorIds };
  }

  const leads = await Lead.find(filter)
    .populate('assignedTo', 'fullName name email role profileImage')
    .populate('createdBy', 'fullName name email role profileImage')
    .sort({ createdAt: -1 })
    .lean();

  return leads.map(l => getLeadDisplay(l, user));
}

async function getLeadById(id, user) {
  const lead = await Lead.findById(id).populate('assignedTo', 'fullName name email role profileImage');
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  if (!canAccessLead(user, lead)) {
    throw new Error('OWNERSHIP_FORBIDDEN');
  }

  // Resolve mixed User/Employee populated assignee
  const leadObj = lead.toObject ? lead.toObject() : lead;
  const rawAssignedId = (typeof lead.populated === 'function' && lead.populated('assignedTo')) || lead.assignedTo;
  if (rawAssignedId && !lead.assignedTo) {
    const Employee = require('../employee/employee.model');
    const employee = await Employee.findById(rawAssignedId).select('fullName name email role profileImage');
    if (employee) {
      leadObj.assignedTo = {
        _id: employee._id,
        fullName: employee.fullName || employee.name,
        name: employee.name || employee.fullName,
        email: employee.email,
        role: employee.role,
        profileImage: employee.profileImage
      };
    }
  }

  const activities = await LeadActivity.find({ leadId: lead._id }).sort({ createdAt: -1 });
  return {
    lead: getLeadDisplay(leadObj, user),
    activities
  };
}

async function updateStage({ leadId, newStage, remark = '', nextFollowupAt = null, podFileUrl, paymentProofUrl, driverProofUrl, photoUrl, paymentProof, deliveryImages, user, ipAddress, deviceHash }) {
  console.log('[updateStage] Called with leadId:', leadId, 'newStage:', newStage);
  console.log('[updateStage] Proof fields received:', { hasPodFileUrl: !!podFileUrl, hasPaymentProofUrl: !!paymentProofUrl, hasDriverProofUrl: !!driverProofUrl, hasPhotoUrl: !!photoUrl, hasPaymentProof: !!paymentProof, hasDeliveryImages: !!deliveryImages });
  console.log('[updateStage] User role:', user?.role, 'department:', user?.department);

  // 1. Fetch the lead record first so `lead` exists in memory
  let lead = null;
  if (mongoose.isValidObjectId(leadId)) {
    lead = await Lead.findById(leadId);
  }
  if (!lead) {
    lead = await Lead.findOne({ $or: [{ leadCode: leadId }, { leadId: leadId }, { orderNumber: leadId }] });
  }
  if (!lead) {
    console.log('[updateStage] LEAD_NOT_FOUND for leadId:', leadId);
    throw new Error('LEAD_NOT_FOUND');
  }
  console.log('[updateStage] Found lead:', lead.leadCode, 'current stage:', lead.stage);

  // 2. Access control check
  if (!canAccessLead(user, lead)) {
    await recordAudit({
      actorId: user._id,
      actionType: 'UNAUTHORIZED_VIEW',
      entityType: 'LEAD',
      entityId: lead._id,
      severity: 'HIGH',
      ipAddress,
      deviceHash,
      metadata: { action: 'change_stage' }
    });
    throw new Error('OWNERSHIP_FORBIDDEN');
  }

  // 3. Stage transition check with Management Override
  const previousStage = lead.stage;
  const isAllowed = allowedStageTransitions[previousStage]?.includes(newStage);
  
  // Allow ADMIN, MANAGER, and DRIVER roles to override pipeline rules
  const role = user.role || '';
  const isManagerOrAdminUser =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    role.endsWith('_MANAGER') ||
    role.toLowerCase().includes('manager') ||
    role === 'DRIVER' ||
    role.toLowerCase().includes('driver') ||
    role === 'TRANSPORT' ||
    user.department === 'ADMIN' ||
    user.department === 'TRANSPORT' ||
    (user.position && user.position.toLowerCase().includes('admin'));

  const canOverride = isManagerOrAdminUser;

  if (!isAllowed && !canOverride) {
    throw new Error(`INVALID_STAGE_TRANSITION: Cannot transition from ${previousStage} to ${newStage}`);
  }

  // 4. Persist the updated stage and optional fields
  lead.stage = newStage;
  if (remark) lead.remarks = remark;
  if (nextFollowupAt) lead.nextFollowupAt = nextFollowupAt;
  
  const activePodUrl = podFileUrl || paymentProofUrl || (paymentProof && paymentProof.proofImageUrl) || '';
  const activeDriverUrl = driverProofUrl || photoUrl || (deliveryImages && deliveryImages.driverSelfieUrl) || '';

  if (activePodUrl) {
    lead.podFileUrl = activePodUrl;
    lead.paymentProofUrl = activePodUrl;
  }
  if (activeDriverUrl) {
    lead.driverProofUrl = activeDriverUrl;
    lead.photoUrl = activeDriverUrl;
  }
  if (paymentProof) lead.paymentProof = paymentProof;
  if (deliveryImages) lead.deliveryImages = deliveryImages;

  console.log('[updateStage] About to save lead with proof data:', {
    stage: lead.stage,
    hasPodFileUrl: !!(lead.podFileUrl && lead.podFileUrl.length > 5),
    hasPaymentProofUrl: !!(lead.paymentProofUrl && lead.paymentProofUrl.length > 5),
    hasDriverProofUrl: !!(lead.driverProofUrl && lead.driverProofUrl.length > 5),
    hasPhotoUrl: !!(lead.photoUrl && lead.photoUrl.length > 5),
    podFileUrlLength: (lead.podFileUrl || '').length,
    paymentProofUrlLength: (lead.paymentProofUrl || '').length,
    driverProofUrlLength: (lead.driverProofUrl || '').length
  });

  // Auto-recalculate lead score & priority on stage progression
  try {
    const { scoreAndClassifyLead } = require('./ai-agent/leadScoring.service');
    const { score, priority: calculatedPriority } = scoreAndClassifyLead({
      quantity: lead.quantity,
      leadValue: lead.leadValue,
      stage: newStage,
      source: lead.source,
      contactPerson: lead.customerName,
      mobile: lead.phoneMasked,
      chatSummary: lead.remarks || ''
    });
    lead.score = score;
    if (calculatedPriority === 'HOT' || (calculatedPriority === 'WARM' && lead.priority === 'COLD')) {
      lead.priority = calculatedPriority;
    }
  } catch (calcErr) {
    console.warn('Lead score recalculation notice:', calcErr.message);
  }

  await lead.save();
  console.log('[updateStage] Lead saved successfully! Stage:', lead.stage, 'leadCode:', lead.leadCode);

  // 5. Record activity log
  const activity = await LeadActivity.create({
    leadId: lead._id,
    actionType: 'LEAD_STAGE_CHANGED',
    note: remark || `Stage transitioned from ${previousStage} to ${newStage}`,
    nextFollowupAt,
    actorId: user._id,
    metadata: { fromStage: previousStage, toStage: newStage }
  });

  // 6. Automation trigger: Create Quotation request when moving to QUOTATION_REQUIRED
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

  // 7. Record security audit log
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

  // 8. Return formatted lead payload
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

async function assignLeadsBulk({ leadIds, assignedTo, user }) {
  const Lead = require('./lead.model');
  const LeadActivity = require('./leadActivity.model');
  const Notification = require('../notifications/notification.model');
  const { recordAudit } = require('../security-audit/auditLog.service');

  if (!Array.isArray(leadIds) || !leadIds.length) {
    throw new Error('LEAD_IDS_REQUIRED');
  }

  const results = await Lead.updateMany(
    { _id: { $in: leadIds } },
    { 
      $set: { 
        assignedTo: assignedTo || null,
        stage: 'ASSIGNED'
      } 
    }
  );

  for (const leadId of leadIds) {
    await LeadActivity.create({
      leadId,
      actionType: 'LEAD_ASSIGNED',
      note: `Bulk Lead assignment updated. Employee: ${assignedTo ? 'assigned' : 'unassigned'}.`,
      actorId: user._id
    });

    if (assignedTo) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        await Notification.create({
          targetUserId: assignedTo,
          message: `Lead ${lead.leadCode || lead.customerName} has been assigned to you by ${user.fullName}.`,
          type: 'TASK_ASSIGNMENT',
          metadata: { leadId: lead._id }
        });
      }
    }
  }

  await recordAudit({
    actorId: user._id,
    actionType: 'LEADS_BULK_ASSIGNED',
    entityType: 'LEAD',
    severity: 'MEDIUM',
    metadata: { leadIds, assignedTo }
  });

  return { success: true, modifiedCount: results.modifiedCount };
}

async function bulkImportLeads(leadsArray, user) {
  const Lead = require('./lead.model');
  const LeadActivity = require('./leadActivity.model');
  const { encryptText, hashText, hashCompanyName, maskPhone, maskEmail } = require('../../utils/crypto');
  const { scoreAndClassifyLead } = require('./ai-agent/leadScoring.service');

  if (!Array.isArray(leadsArray) || !leadsArray.length) {
    throw new Error('LEADS_ARRAY_REQUIRED');
  }

  const importedLeads = [];
  const errors = [];

  for (let i = 0; i < leadsArray.length; i++) {
    const row = leadsArray[i];
    try {
      const {
        customerName,
        companyName,
        phone,
        email,
        productCategory,
        quantity,
        destination,
        leadValue,
        country
      } = row;

      if (!customerName || !phone || !productCategory) {
        errors.push(`Row ${i + 1}: Missing required fields (customerName, phone, productCategory)`);
        continue;
      }

      const cleanPhone = String(phone).replace(/\s/g, '');
      const phoneHash = hashText(cleanPhone);
      const emailHash = email ? hashText(email.trim()) : '';
      const companyNameHash = companyName ? hashCompanyName(companyName) : '';

      // Check duplicates
      const duplicateQueries = [{ phoneHash }];
      if (emailHash) duplicateQueries.push({ emailHash });
      const duplicate = await Lead.findOne({ $or: duplicateQueries });

      // Run AI scoring
      const qtyText = String(quantity || '');
      const { score, priority: aiPriority } = scoreAndClassifyLead({
        quantity: qtyText,
        hasLOI: false,
        paymentTerms: 'Pending',
        contactPerson: customerName,
        mobile: cleanPhone,
        email: email || '',
        chatSummary: 'Bulk imported lead.'
      });

      // Priority resolution: Explicit choice from row/import > AI priority
      const rowPriority = String(row.priority || row.temperature || row.quality || '').trim().toUpperCase();
      const finalPriority = ['HOT', 'WARM', 'COLD', 'FAKE', 'INCOMPLETE'].includes(rowPriority)
        ? rowPriority
        : aiPriority;

      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const leadCode = `LD-${timestamp}-${random}`;

      const lead = await Lead.create({
        leadCode,
        source: 'IMPORT',
        customerName,
        companyName: companyName || '',
        companyNameHash,
        phoneEncrypted: encryptText(cleanPhone),
        phoneMasked: maskPhone(cleanPhone),
        phoneHash,
        emailEncrypted: email ? encryptText(email.trim()) : '',
        emailMasked: email ? maskEmail(email.trim()) : '',
        emailHash,
        whatsAppNumber: cleanPhone,
        country: country || 'India',
        productCategory,
        quantity: qtyText,
        destination: destination || '',
        leadValue: Number(leadValue || 0),
        score,
        priority: finalPriority,
        stage: 'NEW_LEAD',
        assignedTo: null,
        duplicateOf: duplicate ? duplicate._id : null,
        createdBy: user._id
      });

      // Log Activity
      await LeadActivity.create({
        leadId: lead._id,
        actionType: 'LEAD_CREATED',
        note: `Lead imported by ${user.fullName}. Initial Score: ${score}.`,
        actorId: user._id
      });

      importedLeads.push(lead._id);
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return {
    successCount: importedLeads.length,
    errors
  };
}

async function updatePriority({ leadId, priority, user }) {
  const validPriorities = ['HOT', 'WARM', 'COLD', 'FAKE', 'INCOMPLETE'];
  const upperPriority = String(priority || '').toUpperCase();
  if (!validPriorities.includes(upperPriority)) {
    throw new Error('INVALID_PRIORITY');
  }

  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  if (!canAccessLead(user, lead)) {
    throw new Error('OWNERSHIP_FORBIDDEN');
  }

  const oldPriority = lead.priority;
  lead.priority = upperPriority;
  await lead.save();

  await LeadActivity.create({
    leadId: lead._id,
    actionType: 'PRIORITY_UPDATED',
    note: `Lead priority manually updated from ${oldPriority} to ${upperPriority} by ${user.fullName || user.name}`,
    actorId: user._id
  });

  return getLeadDisplay(lead, user);
}

module.exports = {
  listLeads,
  getLeadById,
  updateStage,
  canAccessLead,
  getLeadDisplay,
  assignLead,
  deleteLead,
  assignLeadsBulk,
  bulkImportLeads,
  updatePriority
};
