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
  payload = payload || {};

  /* =========================================================
     1. SOURCE IDENTIFICATION
  ========================================================= */

  const requestedSource = String(
    payload.source ||
    payload.leadSource ||
    ''
  ).toUpperCase();

  const isContactForm =
    requestedSource === 'CONTACT_FORM' ||
    payload.formSource === 'contact_form' ||
    payload.formSource === 'CONTACT_FORM';

  /*
   * Contact Form:
   *     CONTACT_FORM
   *
   * AI Agent:
   *     AI_AGENT
   *
   * This is important because CRM should clearly identify
   * where the lead originated.
   */
  const source = isContactForm
    ? 'CONTACT_FORM'
    : 'AI_AGENT';


  /* =========================================================
     2. BASIC CUSTOMER INFORMATION
  ========================================================= */

  const contactPerson =
    payload.contactPerson ||
    payload.customerName ||
    payload.name ||
    '';

  const mobile =
    payload.mobile ||
    payload.phone ||
    payload.whatsapp ||
    payload.whatsAppNumber ||
    '';

  const email =
    payload.email ||
    '';

  const companyName =
    payload.companyName ||
    payload.company ||
    '';

  const country =
    payload.country ||
    '';

  const whatsAppNumber =
    payload.whatsAppNumber ||
    payload.whatsapp ||
    payload.mobile ||
    payload.phone ||
    '';


  /* =========================================================
     3. DPR LEAD TYPE
     
     BUYER
     SUPPLIER
     LOGISTICS
     ========================================================= */

  let leadType = String(
    payload.leadType ||
    payload.inquiryType ||
    payload.enquiryType ||
    ''
  ).toUpperCase();

  const allowedLeadTypes = [
    'BUYER',
    'SUPPLIER',
    'LOGISTICS'
  ];

  if (!allowedLeadTypes.includes(leadType)) {
    leadType = 'BUYER';
  }


  /* =========================================================
     4. COMMERCIAL REQUIREMENT
  ========================================================= */

  const productCategory =
    payload.productCategory ||
    payload.productRequired ||
    payload.product ||
    '';

  const quantity =
    payload.quantity !== undefined &&
    payload.quantity !== null
      ? String(payload.quantity)
      : '';

  const destination =
    payload.destination ||
    payload.destinationCity ||
    payload.destinationPort ||
    '';

  const specification =
    payload.specification ||
    payload.grade ||
    payload.productSpecification ||
    '';

  const requiredDate =
    payload.requiredDate ||
    payload.deliveryDate ||
    '';

  const paymentTerms =
    payload.paymentTerms ||
    '';

  const chatSummary =
    payload.chatSummary ||
    payload.message ||
    payload.requirement ||
    '';

  const remarks =
    payload.remarks ||
    '';


  /* =========================================================
     5. VALIDATION
  ========================================================= */

  /*
   * DPR:
   *
   * Contact person      -> required
   * Phone / WhatsApp   -> required
   * Product            -> required
   * Quantity           -> required
   * Destination        -> required
   *
   * Email/company are useful but not mandatory.
   */

  if (!contactPerson.trim()) {
    throw new Error(
      'VALIDATION_FAILED: contactPerson/customerName/name is required'
    );
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


  /* =========================================================
     8. LEAD SCORING
  ========================================================= */

  const {
    score = 0,
    priority
  } = scoreAndClassifyLead({
    quantity,
    hasLOI: payload.hasLOI,
    paymentTerms,
    contactPerson,
    mobile,
    email,
    chatSummary
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