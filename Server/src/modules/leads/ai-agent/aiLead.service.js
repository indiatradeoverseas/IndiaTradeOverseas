const Lead = require('../lead.model');
const LeadActivity = require('../leadActivity.model');
const { encryptText, hashText, hashCompanyName, maskPhone, maskEmail } = require('../../../utils/crypto');
const { scoreAndClassifyLead } = require('./leadScoring.service');
const { autoRouteLead } = require('../leadAssignment.service');
const { recordAudit } = require('../../security-audit/auditLog.service');

async function processAiLead(payload, actorId = null) {
  const contactPerson = payload.contactPerson || payload.customerName || payload.name || '';
  const mobile = payload.mobile || payload.phone || payload.whatsapp || '9999999999';
  const email = payload.email || '';
  let productCategory = payload.productCategory || payload.productRequired || payload.division || payload.category || 'TEA';
  if (productCategory.toLowerCase().includes('tea')) productCategory = 'TEA';
  else if (productCategory.toLowerCase().includes('rice')) productCategory = 'RICE';
  else if (productCategory.toLowerCase().includes('stone')) productCategory = 'STONE';

  const quantity = String(payload.quantity || '');
  const destination = payload.destination || payload.city || '';
  const targetDateRaw = payload.targetDate || payload.requiredDate || payload.timeline || null;
  const targetDate = targetDateRaw ? new Date(targetDateRaw) : null;
  const companyName = payload.companyName || payload.company || '';
  const chatSummary = payload.chatSummary || payload.message || payload.subject || '';
  const paymentTerms = payload.paymentTerms || '';
  const leadSource = payload.source || 'WEBSITE';

  if (!contactPerson) {
    throw new Error('VALIDATION_FAILED: customerName is required');
  }

  const phoneHash = hashText(mobile);
  const emailHash = email ? hashText(email) : '';
  const companyNameHash = companyName ? hashCompanyName(companyName) : '';

  const duplicateQueries = [{ phoneHash }];
  if (emailHash) duplicateQueries.push({ emailHash });
  if (companyNameHash && productCategory) {
    duplicateQueries.push({ companyNameHash, productCategory });
  }

  const duplicate = await Lead.findOne({ $or: duplicateQueries });

  const rawValuation = payload.leadValue || payload.estimatedValue || payload.valuation || payload.budget || '';
  const numericValue = typeof rawValuation === 'number'
    ? rawValuation
    : (Number(String(rawValuation).replace(/[^0-9.]/g, '')) || 0);

  const whatsAppNumber = payload.whatsAppNumber || payload.whatsapp || payload.whatsApp || mobile;
  const estimatedValueStr = String(payload.estimatedValue || payload.valuation || payload.budget || (numericValue ? `₹${numericValue.toLocaleString('en-IN')}` : '')).trim();

  const { score, priority } = scoreAndClassifyLead({
    quantity,
    hasLOI: payload.hasLOI,
    paymentTerms,
    contactPerson,
    mobile,
    email,
    chatSummary,
    leadValue: numericValue,
    targetDate: (targetDate && !isNaN(targetDate.getTime())) ? targetDate : null
  });

  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const leadCode = `LD-${timestamp}-${random}`;

  const lead = await Lead.create({
    leadCode,
    source: leadSource,
    customerName: contactPerson,
    companyName,
    companyNameHash,
    phoneEncrypted: encryptText(mobile),
    phoneMasked: maskPhone(mobile),
    phoneHash,
    whatsAppNumber,
    emailEncrypted: email ? encryptText(email) : '',
    emailMasked: email ? maskEmail(email) : '',
    emailHash,
    productCategory,
    quantity,
    destination,
    targetDate: (targetDate && !isNaN(targetDate.getTime())) ? targetDate : null,
    leadValue: numericValue,
    estimatedValue: estimatedValueStr,
    score,
    priority,
    stage: 'NEW_LEAD',
    duplicateOf: duplicate ? duplicate._id : null,
    chatSummary,
    originalPayload: payload,
    createdBy: actorId
  });

  
  await LeadActivity.create({
    leadId: lead._id,
    actionType: 'LEAD_CREATED',
    note: 'Lead created via AI Agent chat integration',
    actorId
  });

  
  await recordAudit({
    actorId,
    actionType: 'AI_LEAD_CREATED',
    entityType: 'LEAD',
    entityId: lead._id.toString(),
    severity: duplicate ? 'MEDIUM' : 'LOW',
    metadata: { leadCode, duplicateDetected: !!duplicate }
  });

  
  const routing = await autoRouteLead(lead);

  return {
    leadId: lead._id.toString(),
    priority: lead.priority,
    assignedDepartment: routing.assignedDepartment,
    assignedEmployee: routing.assignedTo ? routing.assignedTo.toString() : null,
    adminReviewRequired: routing.adminReviewRequired
  };
}

module.exports = { processAiLead };
