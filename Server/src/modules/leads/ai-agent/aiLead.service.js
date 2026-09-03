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
  const targetDateRaw = payload.targetDate || payload.requiredDate || payload.timeline || null;
  const targetDate = targetDateRaw ? new Date(targetDateRaw) : null;
  const companyName = payload.companyName || payload.company || '';
  const chatSummary = payload.chatSummary || payload.message || payload.subject || '';
  const paymentTerms = payload.paymentTerms || '';
  const leadSource = payload.source || 'WEBSITE';

  if (!contactPerson) {
    throw new Error('VALIDATION_FAILED: customerName is required');
  }

  if (!mobile.trim()) {
    throw new Error(
      'VALIDATION_FAILED: mobile/phone/whatsapp is required'
    );
  }

  if (!productCategory.trim()) {
    throw new Error(
      'VALIDATION_FAILED: productCategory/productRequired is required'
    );
  }

  if (!quantity.trim()) {
    throw new Error(
      'VALIDATION_FAILED: quantity is required'
    );
  }

  if (!destination.trim()) {
    throw new Error(
      'VALIDATION_FAILED: destination is required'
    );
  }


  /* =========================================================
     6. HASH + ENCRYPT SENSITIVE DATA
  ========================================================= */

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


  /* =========================================================
     9. LEAD CODE
  ========================================================= */

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

    /*
     * IMPORTANT:
     *
     * Contact form -> CONTACT_FORM
     * AI Agent     -> AI_AGENT
     */
    source,

    /*
     * DPR lead classification.
     */
    leadType,

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
    score,

    stage: 'NEW_LEAD',

    duplicateOf: duplicate
      ? duplicate._id
      : null,

    contactPerson,

    country,

    whatsAppNumber,

    chatSummary,
    originalPayload: payload,
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