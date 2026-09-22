const crypto = require('crypto');
const mongoose = require('mongoose');

const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');
const ControlledCampaign = require('../marketing/controlledCampaign.model');

const {
  META_UTM_STANDARD,
  ACQUISITION_PATHS,
  DELIVERY_CAPABILITIES,
} = require('../marketing/controlledCampaign.constants');

const {
  encryptText,
  hashText,
  hashCompanyName,
  maskPhone,
  maskEmail,
} = require('../../utils/crypto');

const {
  scoreAndClassifyLead,
} = require('./ai-agent/leadScoring.service');

const {
  parseFlexibleDate,
} = require('./ai-agent/aiLead.service');

const {
  resolveOrCreateContact,
  markContactOpportunityCreated,
  normalizeContactEmail,
} = require('./contactResolution.service');

const {
  autoRouteLead,
} = require('./leadAssignment.service');

const {
  recordAudit,
} = require('../security-audit/auditLog.service');

const {
  logDatabaseWrite,
} = require('../operations/operationalLog.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.10: Meta Instant Form -> persistent CRM Lead ingestion service
 *
 * Scope:
 * - normalize a trusted Meta Instant Form lead payload;
 * - preserve source/path attribution separately from Website leads;
 * - resolve Contact identity without suppressing a new opportunity;
 * - persist the Lead before downstream CRM/notification processing;
 * - use real Controlled Campaign data only when supplied attribution can be
 *   reconciled without conflict;
 * - never invent market, price, freight, MOQ, serviceability, UTM values or
 *   Meta IDs that were not observed in the trusted ingestion payload.
 *
 * Important:
 * This is the persistence/service layer only. It does NOT implement Meta
 * webhook verification or Graph API lead retrieval. Those adapter concerns
 * belong to separate integration files. Campaign/creative enrichment is
 * allowed only as an internal association; observed attribution fields remain
 * observed values rather than back-filled campaign guesses.
 */

const SOURCE = 'META_INSTANT_FORM';
const PRODUCT_CATEGORY = 'STONE';
const INGESTION_SCHEMA_VERSION =
  'MASTER_DPR_V4_META_INSTANT_FORM_V1';

function validationError(message, code = 'VALIDATION_FAILED') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cleanText(value, maxLength = 250) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizePhone(value) {
  const raw = cleanText(value, 40);

  if (!raw) {
    throw validationError(
      'Phone / WhatsApp number is required for a Meta Instant Form lead.',
      'META_INSTANT_FORM_PHONE_REQUIRED'
    );
  }

  const digits = raw.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 15) {
    throw validationError(
      'Please provide a valid phone number including country code.',
      'META_INSTANT_FORM_PHONE_INVALID'
    );
  }

  return `+${digits}`;
}

function normalizeOptionalNumber(
  value,
  fieldLabel,
  options = {}
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    throw validationError(
      `${fieldLabel} must be a valid non-negative number.`,
      'META_INSTANT_FORM_NUMERIC_FIELD_INVALID'
    );
  }

  if (
    options.positive === true &&
    parsed <= 0
  ) {
    throw validationError(
      `${fieldLabel} must be greater than zero.`,
      'META_INSTANT_FORM_NUMERIC_FIELD_INVALID'
    );
  }

  if (
    options.integer === true &&
    !Number.isInteger(parsed)
  ) {
    throw validationError(
      `${fieldLabel} must be a whole number.`,
      'META_INSTANT_FORM_NUMERIC_FIELD_INVALID'
    );
  }

  return parsed;
}

function parseOptionalDate(
  value,
  fieldLabel
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw validationError(
      `${fieldLabel} must be a valid date/time value.`,
      'META_INSTANT_FORM_DATE_FIELD_INVALID'
    );
  }

  return parsed;
}

function normalizeLowercaseKey(value, maxLength = 160) {
  const normalized = cleanText(value, maxLength).toLowerCase();

  if (!normalized) {
    return '';
  }

  return /^[a-z0-9][a-z0-9_-]*$/.test(normalized)
    ? normalized
    : '';
}

function buildMetaSubmissionId(metaLeadId) {
  const normalized = cleanText(metaLeadId, 500);

  if (!normalized) {
    throw validationError(
      'Meta lead identifier is required for idempotent ingestion.',
      'META_INSTANT_FORM_LEAD_ID_REQUIRED'
    );
  }

  const digest = crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .slice(0, 48);

  return `meta_${digest}`;
}

function buildConsent(input = {}) {
  const contactAllowed =
    input.contactAllowed === true;

  const privacyVersion = cleanText(
    input.privacyVersion,
    100
  );

  if (!contactAllowed) {
    throw validationError(
      'Enquiry-contact permission is required before a Meta Instant Form lead can enter the sales workflow.',
      'META_INSTANT_FORM_CONTACT_PERMISSION_REQUIRED'
    );
  }

  if (!privacyVersion) {
    throw validationError(
      'The applicable privacy notice/version reference is required.',
      'META_INSTANT_FORM_PRIVACY_REFERENCE_REQUIRED'
    );
  }

  return {
    contactAllowed: true,
    marketingAllowed:
      input.marketingAllowed === true,
    analyticsAllowed:
      input.analyticsAllowed === true,
    advertisingAllowed:
      input.advertisingAllowed === true,
    privacyVersion,
    trackingConsentCapturedAt:
      parseOptionalDate(
        input.trackingConsentCapturedAt,
        'trackingConsentCapturedAt'
      ),
    capturedAt: new Date(),
  };
}

function normalizeObservedAttribution(
  input = {}
) {
  return {
    controlledCampaignId:
      cleanText(
        input.controlledCampaignId,
        100
      ),

    metaCampaignId:
      cleanText(
        input.metaCampaignId ||
          input.campaignId,
        160
      ),

    metaAdSetId:
      cleanText(
        input.metaAdSetId ||
          input.adSetId,
        160
      ),

    metaAdId:
      cleanText(
        input.metaAdId ||
          input.adId,
        160
      ),

    metaCreativeId:
      cleanText(
        input.metaCreativeId ||
          input.creativeId,
        160
      ),

    utmSource:
      cleanText(
        input.utmSource ||
          input.utm_source,
        150
      ).toLowerCase(),

    utmMedium:
      cleanText(
        input.utmMedium ||
          input.utm_medium,
        150
      ).toLowerCase(),

    utmCampaign:
      normalizeLowercaseKey(
        input.utmCampaign ||
          input.utm_campaign
      ),

    utmContent:
      normalizeLowercaseKey(
        input.utmContent ||
          input.utm_content
      ),
  };
}

async function findControlledCampaign(
  input = {}
) {
  const observed =
    normalizeObservedAttribution(
      input
    );

  const candidates =
    [];

  async function addCandidate(
    basis,
    query
  ) {
    const matches = await ControlledCampaign.find(query).limit(2);
    if (matches.length > 1) {
      throw validationError('Attribution identifier matches multiple campaigns.', 'META_INSTANT_FORM_CAMPAIGN_ATTRIBUTION_CONFLICT');
    }
    for (const campaign of matches) candidates.push({ basis, campaign });
  }

  if (
    observed.controlledCampaignId
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(
        observed.controlledCampaignId
      )
    ) {
      throw validationError(
        'controlledCampaignId is invalid.',
        'META_INSTANT_FORM_CONTROLLED_CAMPAIGN_ID_INVALID'
      );
    }

    const campaign =
      await ControlledCampaign.findById(
        observed.controlledCampaignId
      );

    if (campaign) {
      candidates.push({
        basis:
          'CONTROLLED_CAMPAIGN_ID',
        campaign,
      });
    }
  }

  if (
    observed.metaCampaignId
  ) {
    await addCandidate(
      'META_CAMPAIGN_ID',
      {
        metaCampaignId:
          observed.metaCampaignId,
      }
    );
  }

  if (
    observed.metaAdSetId
  ) {
    await addCandidate(
      'META_ADSET_ID',
      {
        metaAdSetId:
          observed.metaAdSetId,
      }
    );
  }

  if (
    observed.metaAdId
  ) {
    await addCandidate(
      'META_AD_ID',
      {
        'creatives.metaAdId':
          observed.metaAdId,
      }
    );
  }

  if (
    observed.metaCreativeId
  ) {
    await addCandidate(
      'META_CREATIVE_ID',
      {
        'creatives.metaCreativeId':
          observed.metaCreativeId,
      }
    );
  }

  const governedUtmSupplied =
    Boolean(
      observed.utmCampaign &&
      observed.utmSource &&
      observed.utmMedium
    );

  if (
    governedUtmSupplied
  ) {
    if (
      observed.utmSource !==
        META_UTM_STANDARD.source ||
      observed.utmMedium !==
        META_UTM_STANDARD.medium
    ) {
      throw validationError(
        'Meta Instant Form UTM source/medium does not match the governed Meta paid-social standard.',
        'META_INSTANT_FORM_UTM_STANDARD_MISMATCH'
      );
    }

    await addCandidate(
      'GOVERNED_UTM',
      {
        'utm.campaign':
          observed.utmCampaign,
      }
    );
  }

  const campaignIds =
    new Set(
      candidates.map(
        (item) =>
          String(
            item.campaign._id
          )
      )
    );

  if (
    campaignIds.size > 1
  ) {
    throw validationError(
      'Supplied Meta attribution identifiers resolve to different controlled campaigns.',
      'META_INSTANT_FORM_CAMPAIGN_ATTRIBUTION_CONFLICT'
    );
  }

  if (
    candidates.length === 0
  ) {
    return {
      campaign:
        null,

      matchBasis:
        [],

      observed,
    };
  }

  const campaign =
    candidates[0].campaign;

  const matchBasis =
    [
      ...new Set(
        candidates.map(
          (item) =>
            item.basis
        )
      ),
    ];

  const campaignId =
    String(
      campaign._id
    );

  if (
    observed.controlledCampaignId &&
    observed.controlledCampaignId !==
      campaignId
  ) {
    throw validationError(
      'controlledCampaignId conflicts with the resolved controlled campaign.',
      'META_INSTANT_FORM_CAMPAIGN_ATTRIBUTION_CONFLICT'
    );
  }

  const configuredMetaCampaignId =
    cleanText(
      campaign.metaCampaignId,
      160
    );

  if (
    observed.metaCampaignId &&
    configuredMetaCampaignId &&
    observed.metaCampaignId !==
      configuredMetaCampaignId
  ) {
    throw validationError(
      'Observed Meta campaign ID conflicts with the resolved controlled campaign.',
      'META_INSTANT_FORM_CAMPAIGN_ATTRIBUTION_CONFLICT'
    );
  }

  const configuredMetaAdSetId =
    cleanText(
      campaign.metaAdSetId,
      160
    );

  if (
    observed.metaAdSetId &&
    configuredMetaAdSetId &&
    observed.metaAdSetId !==
      configuredMetaAdSetId
  ) {
    throw validationError(
      'Observed Meta ad-set ID conflicts with the resolved controlled campaign.',
      'META_INSTANT_FORM_CAMPAIGN_ATTRIBUTION_CONFLICT'
    );
  }

  if (
    observed.utmCampaign &&
    campaign?.utm?.campaign &&
    observed.utmCampaign !==
      campaign.utm.campaign
  ) {
    throw validationError(
      'Observed UTM campaign conflicts with the resolved controlled campaign.',
      'META_INSTANT_FORM_CAMPAIGN_ATTRIBUTION_CONFLICT'
    );
  }

  return {
    campaign,
    matchBasis,
    observed,
  };
}

function resolveMatchedCreative(
  campaign,
  observed = {}
) {
  const creatives =
    Array.isArray(
      campaign?.creatives
    )
      ? campaign.creatives
      : [];

  if (
    !campaign ||
    creatives.length === 0
  ) {
    return {
      creative:
        null,

      matchBasis:
        [],
    };
  }

  const candidates =
    [];

  function addMatches(
    basis,
    predicate
  ) {
    creatives.forEach(
      (creative) => {
        if (
          predicate(
            creative
          )
        ) {
          candidates.push({
            basis,
            creative,
          });
        }
      }
    );
  }

  if (
    observed.metaAdId
  ) {
    addMatches(
      'META_AD_ID',
      (creative) =>
        cleanText(
          creative?.metaAdId,
          160
        ) ===
        observed.metaAdId
    );
  }

  if (
    observed.metaCreativeId
  ) {
    addMatches(
      'META_CREATIVE_ID',
      (creative) =>
        cleanText(
          creative?.metaCreativeId,
          160
        ) ===
        observed.metaCreativeId
    );
  }

  if (
    observed.utmContent
  ) {
    addMatches(
      'UTM_CONTENT',
      (creative) =>
        normalizeLowercaseKey(
          creative?.utmContent
        ) ===
        observed.utmContent
    );
  }

  const creativeKeys =
    new Set(
      candidates.map(
        (item) =>
          normalizeLowercaseKey(
            item.creative?.utmContent
          )
      )
    );

  if (
    creativeKeys.size > 1
  ) {
    throw validationError(
      'Supplied Meta creative attribution signals resolve to different controlled creatives.',
      'META_INSTANT_FORM_CREATIVE_ATTRIBUTION_CONFLICT'
    );
  }

  if (
    candidates.length === 0
  ) {
    return {
      creative:
        null,

      matchBasis:
        [],
    };
  }

  return {
    creative:
      candidates[0].creative,

    matchBasis:
      [
        ...new Set(
          candidates.map(
            (item) =>
              item.basis
          )
        ),
      ],
  };
}

function deriveEligibility() {
  return { status: 'REVIEW_REQUIRED', reason: 'ACTUAL_BUYER_DESTINATION_AND_QUANTITY_REQUIRE_OPERATIONS_REVIEW' };
}

function buildAttribution(
  input,
  matchedCreative
) {
  const observed =
    normalizeObservedAttribution(
      input
    );

  if (
    observed.utmCampaign &&
    (
      observed.utmSource !==
        META_UTM_STANDARD.source ||
      observed.utmMedium !==
        META_UTM_STANDARD.medium
    )
  ) {
    throw validationError(
      'Meta Instant Form UTM campaign can be stored only with the governed facebook/paid_social source-medium pair.',
      'META_INSTANT_FORM_UTM_STANDARD_MISMATCH'
    );
  }

  return {
    utmSource:
      observed.utmSource,

    utmMedium:
      observed.utmMedium,

    utmCampaign:
      observed.utmCampaign,

    utmContent:
      observed.utmContent,

    utmTerm:
      cleanText(
        input.utmTerm ||
          input.utm_term,
        200
      ),

    gclid:
      '',

    fbclid:
      cleanText(
        input.fbclid,
        250
      ),

    campaignId:
      observed.metaCampaignId,

    adSetId:
      observed.metaAdSetId,

    adId:
      observed.metaAdId,

    creativeId:
      observed.metaCreativeId,

    creative:
      cleanText(
        matchedCreative?.name ||
          input.creative,
        200
      ),

    landingPage:
      '',

    landingPageType:
      SOURCE,

    analyticsSessionId:
      '',
  };
}

function buildRequirementSummary({
  product,
  productVariant,
  grade,
  specification,
  quantity,
  destination,
  timeline,
}) {
  return [
    'Meta Instant Form Stone enquiry',
    product ? `Product: ${product}` : '',
    productVariant ? `Variant: ${productVariant}` : '',
    grade ? `Grade: ${grade}` : '',
    specification ? `Specification: ${specification}` : '',
    quantity ? `Quantity: ${quantity}` : '',
    destination ? `Destination: ${destination}` : '',
    timeline ? `Timeline: ${timeline}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

async function createMetaInstantFormLeadRecord(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError(
      'A normalized Meta Instant Form lead payload is required.',
      'META_INSTANT_FORM_PAYLOAD_REQUIRED'
    );
  }

  const metaLeadId = cleanText(
    input.metaLeadId || input.leadgenId || input.leadgen_id,
    500
  );

  const submissionId = buildMetaSubmissionId(metaLeadId);

  const existing = await Lead.findOne({ submissionId });

  if (existing) {
    const observed=normalizeObservedAttribution(input);
    for(const [key,stored] of [['metaCampaignId','campaignId'],['metaAdSetId','adSetId'],['metaAdId','adId'],['metaCreativeId','creativeId'],['utmCampaign','utmCampaign'],['utmContent','utmContent']]) {
      if(observed[key] && existing.attribution?.[stored] && observed[key]!==existing.attribution[stored]) throw validationError('Repeated Meta lead identifiers conflict with the persisted record.','META_INSTANT_FORM_IDENTIFIER_CONFLICT');
    }
    for(const [key,alias] of [['metaPageId','pageId'],['metaFormId','formId']]) if(input[key]||input[alias]) {
      if(existing.originalPayload?.[key] && String(input[key]||input[alias])!==existing.originalPayload[key]) throw validationError('Repeated Meta lead Page/Form conflicts with the persisted record.','META_INSTANT_FORM_IDENTIFIER_CONFLICT');
    }
    await logDatabaseWrite(
      'META_INSTANT_FORM_LEAD_PERSIST',
      'SUCCESS',
      {
        leadId: existing._id,
        entityType: 'LEAD',
        entityId:
          existing.leadCode || String(existing._id),
        provider: 'MONGODB',
        idempotencyKey: submissionId,
        metadata: {
          persisted: true,
          reused: true,
          source: SOURCE,
        },
      }
    );

    return {
      lead: existing,
      reused: true,
    };
  }

  const consent = buildConsent(input.consent || {});
  const phone = normalizePhone(
    input.phone || input.mobile || input.whatsapp
  );
  const email = normalizeContactEmail(input.email);

  const customerName = cleanText(
    input.customerName || input.name,
    150
  );

  const companyName = cleanText(
    input.companyName || input.company,
    200
  );

  const country = cleanText(input.country, 100);
  const gst = cleanText(input.gst || input.gstin, 40)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const campaignResolution =
    await findControlledCampaign(
      input
    );

  const campaign =
    campaignResolution.campaign;

  const creativeResolution =
    resolveMatchedCreative(
      campaign,
      campaignResolution.observed
    );

  const allCampaigns = await ControlledCampaign.find({}).lean();
  const observed = campaignResolution.observed;
  const integrity = require('../marketing/campaignAttribution').assessAttribution({ ...observed, campaignId: observed.metaCampaignId, adSetId: observed.metaAdSetId, adId: observed.metaAdId, creativeId: observed.metaCreativeId }, allCampaigns);
  if (integrity.conflicts.some(reason => reason !== 'UNMATCHED_CAMPAIGN')) throw validationError('Observed attribution conflicts with campaign configuration.', 'META_INSTANT_FORM_CAMPAIGN_ATTRIBUTION_CONFLICT');
  const matchedCreative =
    creativeResolution.creative;

  const product = cleanText(
    input.product || campaign?.marketSelection?.product,
    160
  );

  const productVariant = cleanText(
    input.productVariant,
    160
  );

  const grade = cleanText(input.grade, 160);
  const specification = cleanText(
    input.specification,
    1000
  );

  const quantity = cleanText(
    input.quantity || input.quantityDisplay,
    160
  );

  const quantityValue =
    normalizeOptionalNumber(
      input.quantityValue,
      'quantityValue'
    );

  const quantityUnit = cleanText(
    input.quantityUnit,
    40
  ).toUpperCase();

  const quantityBand = cleanText(
    input.quantityBand,
    100
  );

  const explicitTruckCount =
    normalizeOptionalNumber(
      input.truckCount ??
        input.trucks ??
        input.quantityTrucks,
      'truckCount',
      {
        positive: true,
        integer: true,
      }
    );

  const destination = cleanText(input.destination, 200);
  const timeline = cleanText(input.timeline, 100);

  let targetDate = null;

  if (timeline) {
    try {
      targetDate = parseFlexibleDate(
        timeline.replace(/_/g, ' ')
      );
    } catch {
      targetDate = null;
    }
  }

  const contactResolution =
    await resolveOrCreateContact({
      source: SOURCE,
      name: customerName,
      companyName,
      country,
      phone,
      phoneVerified: false,
      email,
      emailVerified: false,
      gst,
      gstVerified: input.gstVerified === true,
      consent,
      actorId: null,
    });

  const resolvedContact =
    contactResolution.contact || null;

  const eligibility = deriveEligibility(campaign);

  const isPriorityAServiceableMarket = false;

  const requirementSummary = buildRequirementSummary({
    product,
    productVariant,
    grade,
    specification,
    quantity,
    destination,
    timeline,
  });

  const scoringResult = scoreAndClassifyLead({
    truckCount: explicitTruckCount,
    timeline,
    targetDate,
    isPriorityAServiceableMarket,
    companyName,
    gst,
    gstVerified: input.gstVerified === true,
    completedPriceCheck:
      input.completedPriceCheck === true,
    returnVisit: false,
  });

  const attribution =
    buildAttribution(
      input,
      matchedCreative
    );

  const leadCode =
    `LD-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const phoneHash = hashText(phone);
  const emailHash = email ? hashText(email) : '';
  const companyNameHash = companyName
    ? hashCompanyName(companyName)
    : '';
  const gstHash = gst ? hashText(gst) : '';

  let lead;

  try {
    lead = await Lead.create({
      leadCode,
      submissionId,

      contactId: resolvedContact?._id || null,
      contactResolution: {
        status:
          contactResolution.status || 'UNRESOLVED',
        method:
          contactResolution.method || 'NONE',
        resolvedAt: resolvedContact ? new Date() : null,
      },

      source: SOURCE,
      leadOrigin: SOURCE,

      customerName,
      companyName,
      companyNameHash,

      phoneEncrypted: encryptText(phone),
      phoneMasked: maskPhone(phone),
      phoneHash,

      emailEncrypted: email ? encryptText(email) : '',
      emailMasked: email ? maskEmail(email) : '',
      emailHash,

      gstEncrypted: gst ? encryptText(gst) : '',
      gstMasked: gst
        ? `${gst.slice(0, 2)}${'*'.repeat(
            Math.max(4, gst.length - 4)
          )}${gst.slice(-2)}`
        : '',
      gstHash,

      whatsAppNumber: '',
      contactPerson: customerName,
      country,

      productCategory: PRODUCT_CATEGORY,
      product,
      productVariant,
      grade,
      specification,

      quantity,
      quantityValue:
        quantityValue !== null ? quantityValue : 0,
      quantityUnit,
      quantityBand,

      destination,
      timeline,
      targetDate,

      eligibilityStatus: eligibility.status,
      eligibilityReason: eligibility.reason,

      priority: scoringResult.priority,
      score: scoringResult.score,
      crmStatus: 'NEW',
      stage: 'NEW_LEAD',

      consent,
      attribution,

      chatSummary: requirementSummary,
      leadValue: 0,

      /*
       * Website-specific automation must not process Meta Instant Form leads.
       * CRM sync, ownership recovery and notification recovery are already
       * durable source-agnostic workers in the Phase 2 architecture.
       */
      automationStatus: 'COMPLETED',
      automationAttempts: 0,

      crmSync: {
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: null,
        manualRecoveryRequired: false,
      },

      originalPayload: {
        ingestionSchemaVersion: INGESTION_SCHEMA_VERSION,
        acquisitionPath:
          ACQUISITION_PATHS.META_INSTANT_FORM,
        metaLeadId,
        metaFormId: cleanText(
          input.metaFormId || input.formId,
          160
        ),
        metaPageId: cleanText(
          input.metaPageId || input.pageId,
          160
        ),
        controlledCampaignId: campaign?._id
          ? String(campaign._id)
          : '',
        controlledCampaignMatched:
          Boolean(campaign),

        controlledCampaignMatchBasis:
          campaignResolution.matchBasis,

        creativeMatched:
          Boolean(matchedCreative),

        creativeMatchBasis:
          creativeResolution.matchBasis,

        campaignOperationsConfirmed:
          Boolean(
            campaign?.operationsInputsConfirmedAt
          ),

        campaignManagementApproved:
          Boolean(
            campaign?.managementApprovalAt
          ),

        matchedLandingPage:
          cleanText(
            campaign?.landingPage,
            1000
          ),
        contactResolutionReason: cleanText(
          contactResolution.reason,
          200
        ),
        contactConflictIds: Array.isArray(
          contactResolution.conflictContactIds
        )
          ? contactResolution.conflictContactIds
              .map((value) => cleanText(value, 64))
              .filter(Boolean)
          : [],
      },

      createdBy: null,
    });

    await logDatabaseWrite(
      'META_INSTANT_FORM_LEAD_PERSIST',
      'SUCCESS',
      {
        leadId: lead._id,
        entityType: 'LEAD',
        entityId: lead.leadCode || String(lead._id),
        provider: 'MONGODB',
        idempotencyKey: submissionId,
        metadata: {
          persisted: true,
          reused: false,
          source: SOURCE,
          productCategory: PRODUCT_CATEGORY,
          priority: lead.priority,
          eligibilityStatus: lead.eligibilityStatus,
          controlledCampaignMatched: Boolean(campaign),
        },
      }
    );
  } catch (error) {
    if (error?.code === 11000) {
      const alreadyCreated = await Lead.findOne({
        submissionId,
      });

      if (alreadyCreated) {
        return {
          lead: alreadyCreated,
          reused: true,
        };
      }
    }

    await logDatabaseWrite(
      'META_INSTANT_FORM_LEAD_PERSIST',
      'FAILURE',
      {
        entityType: 'LEAD',
        entityId: submissionId,
        provider: 'MONGODB',
        idempotencyKey: submissionId,
        error,
        metadata: {
          persisted: false,
          source: SOURCE,
          productCategory: PRODUCT_CATEGORY,
        },
      }
    );

    throw error;
  }

  if (lead.contactId) {
    try {
      await markContactOpportunityCreated(lead.contactId, {
        source: SOURCE,
        occurredAt: lead.createdAt || new Date(),
      });
    } catch (error) {
      // Contact summary failure must never roll back the persisted Lead.
      console.error(
        '[Meta Instant Form Contact Summary]',
        lead._id.toString(),
        (error.code || error.name)
      );
    }
  }

  try {
    const existingActivity = await LeadActivity.findOne({
      leadId: lead._id,
      actionType: 'LEAD_CREATED',
    });

    if (!existingActivity) {
      await LeadActivity.create({
        leadId: lead._id,
        actionType: 'LEAD_CREATED',
        note: 'Lead persisted via Meta Instant Form',
        actorId: null,
        metadata: {
          source: SOURCE,
          controlledCampaignMatched: Boolean(campaign),
        },
      });
    }
  } catch (error) {
    console.error(
      '[Meta Instant Form Activity]',
      lead._id.toString(),
      (error.code || error.name)
    );
  }

  await recordAudit({
    actorId: null,
    actionType: 'META_INSTANT_FORM_LEAD_CREATED',
    entityType: 'LEAD',
    entityId: lead._id.toString(),
    severity:
      lead.contactResolution?.status === 'AMBIGUOUS'
        ? 'MEDIUM'
        : 'LOW',
    metadata: {
      leadCode: lead.leadCode,
      source: SOURCE,
      contactResolutionStatus:
        lead.contactResolution?.status || 'UNRESOLVED',
      controlledCampaignMatched: Boolean(campaign),
    },
  });

  if (!lead.assignedTo) {
    try {
      await autoRouteLead(lead);
    } catch (error) {
      // Ownership recovery worker can safely retry an unassigned Lead later.
      console.error(
        '[Meta Instant Form Assignment]',
        lead._id.toString(),
        (error.code || error.name)
      );
    }
  }

  return {
    lead,
    reused:
      false,

    controlledCampaignMatched:
      Boolean(campaign),

    controlledCampaignId:
      campaign?._id
        ? String(
            campaign._id
          )
        : null,

    controlledCampaignMatchBasis:
      campaignResolution.matchBasis,

    creativeMatched:
      Boolean(matchedCreative),

    creativeMatchBasis:
      creativeResolution.matchBasis,
  };
}

module.exports = {
  createMetaInstantFormLeadRecord,
  buildMetaSubmissionId,
};
