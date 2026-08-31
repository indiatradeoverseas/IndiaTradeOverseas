const Lead = require('../lead.model');
const LeadActivity = require('../leadActivity.model');

const {
  encryptText,
  hashText,
  hashCompanyName,
  maskPhone,
  maskEmail
} = require('../../../utils/crypto');

const {
  scoreAndClassifyLead
} = require('./leadScoring.service');

const {
  autoRouteLead
} = require('../leadAssignment.service');

const {
  recordAudit
} = require('../../security-audit/auditLog.service');


/**
 * Create a lead from:
 * 1. Public Contact Form
 * 2. AI Agent / Chat
 *
 * DPR-aligned lead intake service.
 */
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
  const companyName = payload.companyName || payload.company || '';
  const chatSummary = payload.chatSummary || payload.message || payload.subject || '';
  const paymentTerms = payload.paymentTerms || '';
  const leadSource = payload.source || 'WEBSITE';

  if (!contactPerson) {
    throw new Error('VALIDATION_FAILED: customerName is required');
  }

  const phoneHash = hashText(mobile);

  const emailHash = email
    ? hashText(email)
    : '';

  const companyNameHash = companyName
    ? hashCompanyName(companyName)
    : '';


  /* =========================================================
     7. DUPLICATE LEAD DETECTION
  ========================================================= */

  const duplicateQueries = [
    {
      phoneHash
    }
  ];

  if (emailHash) {
    duplicateQueries.push({
      emailHash
    });
  }

  if (companyNameHash && productCategory) {
    duplicateQueries.push({
      companyNameHash,
      productCategory
    });
  }

  const duplicate = await Lead.findOne({
    $or: duplicateQueries
  });


  const { priority } = scoreAndClassifyLead({
    quantity,
    hasLOI: payload.hasLOI,
    paymentTerms,
    contactPerson,
    mobile,
    email,
    chatSummary
  });

  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  const leadCode = `LD-${timestamp}-${random}`;


  /* =========================================================
     10. BUILD ORIGINAL PAYLOAD
  ========================================================= */

  const originalPayload = {
    ...payload,

    /*
     * Normalised DPR fields.
     * Keeping these makes the original intake useful for
     * CRM/debugging/audit purposes.
     */
    contactPerson,
    mobile,
    email,
    companyName,
    country,
    whatsAppNumber,

    leadType,

    productCategory,
    quantity,
    destination,
    specification,
    requiredDate,
    paymentTerms,

    chatSummary,
    remarks,

    source
  };


  /* =========================================================
     11. CREATE LEAD
  ========================================================= */

  const leadData = {
    leadCode,
    source: leadSource,
    customerName: contactPerson,

    companyName,
    companyNameHash,

    phoneEncrypted: encryptText(mobile),
    phoneMasked: maskPhone(mobile),
    phoneHash,

    emailEncrypted: email
      ? encryptText(email)
      : '',

    emailMasked: email
      ? maskEmail(email)
      : '',

    emailHash,

    productCategory,
    quantity,
    destination,

    priority,
    score,

    stage: 'NEW_LEAD',

    duplicateOf: duplicate
      ? duplicate._id
      : null,

    contactPerson,

    country,

    whatsAppNumber,

    chatSummary,

    originalPayload,

    remarks,

    createdBy: actorId
  };


  /*
   * Keep DPR-specific optional commercial information
   * inside originalPayload as well, so the service remains
   * compatible even if these are not separate Lead schema fields.
   */
  const lead = await Lead.create(leadData);


  /* =========================================================
     12. LEAD ACTIVITY
  ========================================================= */

  await LeadActivity.create({
    leadId: lead._id,

    actionType: 'LEAD_CREATED',

    note: isContactForm
      ? 'Lead created via website Contact Form'
      : 'Lead created via AI Agent chat integration',

    actorId
  });


  /* =========================================================
     13. SECURITY / AUDIT LOG
  ========================================================= */

  await recordAudit({
    actorId,

    actionType: isContactForm
      ? 'CONTACT_FORM_LEAD_CREATED'
      : 'AI_LEAD_CREATED',

    entityType: 'LEAD',

    entityId: lead._id.toString(),

    severity: duplicate
      ? 'MEDIUM'
      : 'LOW',

    metadata: {
      leadCode,
      source,
      leadType,
      duplicateDetected: !!duplicate
    }
  });


  /* =========================================================
     14. AUTO ROUTING
  ========================================================= */

  const routing = await autoRouteLead(lead);


  /* =========================================================
     15. RETURN CRM RESULT
  ========================================================= */

  return {
    leadId: lead._id.toString(),

    leadCode: lead.leadCode,

    source: lead.source,

    leadType: lead.leadType,

    priority: lead.priority,

    score: lead.score,

    stage: lead.stage,

    assignedDepartment:
      routing?.assignedDepartment || null,

    assignedEmployee:
      routing?.assignedTo
        ? routing.assignedTo.toString()
        : null,

    adminReviewRequired:
      routing?.adminReviewRequired || false,

    duplicateDetected:
      !!duplicate
  };
}


module.exports = {
  processAiLead
};