const crypto = require('crypto');

const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');

const {
  encryptText,
  decryptText,
  hashText,
  hashCompanyName,
  maskPhone,
  maskEmail
} = require('../../utils/crypto');

const {
  scoreAndClassifyLead
} = require('./ai-agent/leadScoring.service');

const {
  autoRouteLead
} = require('./leadAssignment.service');

const {
  recordAudit
} = require('../security-audit/auditLog.service');

const {
  parseFlexibleDate
} = require('./ai-agent/aiLead.service');

const {
  recordAnalyticsEvent,
  linkAnalyticsEventsToLead
} = require('../analytics/analyticsEvent.service');

const {
  resolveOrCreateContact,
  markContactOpportunityCreated,
  normalizeContactEmail
} = require('./contactResolution.service');

const {
  logDatabaseWrite,
  logRetry,
  logTracking
} = require('../operations/operationalLog.service');


/* ============================================================
   BASIC HELPERS
============================================================ */

function validationError(message) {
  const error = new Error(message);
  error.code = 'VALIDATION_FAILED';
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


function parseOptionalDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}


function normalizePhone(value) {
  const raw = cleanText(value, 40);

  if (!raw) {
    throw validationError(
      'Phone / WhatsApp number is required.'
    );
  }

  const digits = raw.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 15) {
    throw validationError(
      'Please provide a valid phone number including country code.'
    );
  }

  return `+${digits}`;
}


function normalizeOptionalPhone(value) {
  const raw = cleanText(value, 40);

  if (!raw) {
    return '';
  }

  return normalizePhone(raw);
}


function normalizeCaptureMode(value) {
  const mode = cleanText(value, 50).toUpperCase();

  const allowed = new Set([
    'QUICK',
    'REQUIREMENT_BUILDER',
    'COMMERCIAL_ENQUIRY',
    'QUOTE_REQUEST',
    'REPEAT_ORDER'
  ]);

  return allowed.has(mode)
    ? mode
    : 'REQUIREMENT_BUILDER';
}


function resolveLeadOrigin(captureMode) {
  const origins = {
    QUICK: 'QUICK_ENQUIRY',
    REQUIREMENT_BUILDER: 'REQUIREMENT_BUILDER',
    COMMERCIAL_ENQUIRY: 'COMMERCIAL_ENQUIRY',
    QUOTE_REQUEST: 'QUOTE_REQUEST',
    REPEAT_ORDER: 'REPEAT_ORDER'
  };

  return origins[captureMode] || 'REQUIREMENT_BUILDER';
}


/* ============================================================
   MASTER DPR — REQUIREMENT CLASSIFICATION
============================================================ */

const STONE_TRUCK_QUANTITY_BANDS = Object.freeze({
  ONE_TRUCK: {
    label: '1 truck',
    scoringTruckCount: 1
  },
  TRUCKS_2_5: {
    label: '2–5 trucks',
    scoringTruckCount: 2
  },
  TRUCKS_6_10: {
    label: '6–10 trucks',
    scoringTruckCount: 6
  },
  TRUCKS_10_PLUS: {
    label: '10+ trucks',
    scoringTruckCount: 10
  },
  CUSTOM: {
    label: 'Custom quantity',
    scoringTruckCount: null
  }
});


function normalizeStoneTruckQuantityBand(value) {
  const raw = cleanText(value, 80)
    .toUpperCase()
    .replace(/[–—-]+/g, '_')
    .replace(/\s+/g, '_');

  const aliases = {
    '1_TRUCK': 'ONE_TRUCK',
    'ONE_TRUCK': 'ONE_TRUCK',
    '2_5': 'TRUCKS_2_5',
    '2_5_TRUCKS': 'TRUCKS_2_5',
    'TRUCKS_2_5': 'TRUCKS_2_5',
    '6_10': 'TRUCKS_6_10',
    '6_10_TRUCKS': 'TRUCKS_6_10',
    'TRUCKS_6_10': 'TRUCKS_6_10',
    '10+': 'TRUCKS_10_PLUS',
    '10_PLUS': 'TRUCKS_10_PLUS',
    '10_PLUS_TRUCKS': 'TRUCKS_10_PLUS',
    'TRUCKS_10_PLUS': 'TRUCKS_10_PLUS',
    'CUSTOM': 'CUSTOM'
  };

  return aliases[raw] || '';
}


function getLegacyMtQuantityBand(quantity) {
  if (quantity < 40) {
    return 'BELOW_40_MT';
  }

  if (quantity < 100) {
    return '40_99_MT';
  }

  if (quantity < 500) {
    return '100_499_MT';
  }

  return '500_PLUS_MT';
}


function resolveStoneQuantityRequirement(payload = {}) {
  const requestedBand = normalizeStoneTruckQuantityBand(
    payload.quantityBand ||
    payload.truckRange ||
    payload.quantityRange
  );

  const explicitTruckCount = Number(
    payload.truckCount ??
    payload.trucks ??
    payload.quantityTrucks
  );

  const hasExplicitTruckCount =
    Number.isFinite(explicitTruckCount) &&
    explicitTruckCount > 0;

  const numericQuantityValue = Number(
    payload.quantityValue ??
    payload.quantity
  );

  const hasNumericQuantityValue =
    Number.isFinite(numericQuantityValue) &&
    numericQuantityValue > 0;

  if (requestedBand && requestedBand !== 'CUSTOM') {
    const definition =
      STONE_TRUCK_QUANTITY_BANDS[requestedBand];

    return {
      display: definition.label,
      quantityValue: 0,
      quantityUnit: 'TRUCK',
      quantityBand: requestedBand,
      scoringTruckCount: definition.scoringTruckCount,
      mode: 'TRUCK_RANGE'
    };
  }

  if (requestedBand === 'CUSTOM') {
    if (hasExplicitTruckCount) {
      return {
        display: `${explicitTruckCount} ${explicitTruckCount === 1 ? 'truck' : 'trucks'}`,
        quantityValue: 0,
        quantityUnit: 'TRUCK',
        quantityBand: 'CUSTOM',
        scoringTruckCount: explicitTruckCount,
        mode: 'CUSTOM_TRUCKS'
      };
    }

    if (hasNumericQuantityValue) {
      const unit = cleanText(
        payload.quantityUnit,
        20
      ).toUpperCase() || 'MT';

      return {
        display: `${numericQuantityValue} ${unit}`,
        quantityValue: numericQuantityValue,
        quantityUnit: unit,
        quantityBand:
          unit === 'MT'
            ? getLegacyMtQuantityBand(numericQuantityValue)
            : 'CUSTOM',
        scoringTruckCount: null,
        mode: 'CUSTOM_QUANTITY'
      };
    }

    throw validationError(
      'Custom quantity requires a truck count or numeric quantity.'
    );
  }

  /*
   * Backward compatibility for the existing website flows that submit MT.
   * We deliberately do not convert MT into trucks because Master DPR v4.0
   * does not define a universal MT-per-truck conversion.
   */
  if (hasNumericQuantityValue) {
    const unit = cleanText(
      payload.quantityUnit,
      20
    ).toUpperCase() || 'MT';

    return {
      display: `${numericQuantityValue} ${unit}`,
      quantityValue: numericQuantityValue,
      quantityUnit: unit,
      quantityBand:
        unit === 'MT'
          ? getLegacyMtQuantityBand(numericQuantityValue)
          : 'CUSTOM',
      scoringTruckCount:
        unit === 'TRUCK'
          ? numericQuantityValue
          : null,
      mode: 'LEGACY_NUMERIC'
    };
  }

  if (hasExplicitTruckCount) {
    return {
      display: `${explicitTruckCount} ${explicitTruckCount === 1 ? 'truck' : 'trucks'}`,
      quantityValue: 0,
      quantityUnit: 'TRUCK',
      quantityBand: 'CUSTOM',
      scoringTruckCount: explicitTruckCount,
      mode: 'EXPLICIT_TRUCK_COUNT'
    };
  }

  throw validationError(
    'Please select the required Stone quantity.'
  );
}


function evaluateStoneEligibility() {
  return {
    status: 'REVIEW_REQUIRED',
    reason: 'OPERATIONS_SERVICEABILITY_CONFIRMATION_REQUIRED'
  };
}


function buildAttribution(input = {}) {
  return {
    utmSource: cleanText(
      input.utmSource || input.utm_source,
      150
    ).toLowerCase(),

    utmMedium: cleanText(
      input.utmMedium || input.utm_medium,
      150
    ).toLowerCase(),

    utmCampaign: cleanText(
      input.utmCampaign || input.utm_campaign,
      200
    ).toLowerCase(),

    utmContent: cleanText(
      input.utmContent || input.utm_content,
      200
    ).toLowerCase(),

    utmTerm: cleanText(
      input.utmTerm || input.utm_term,
      200
    ).toLowerCase(),

    gclid: cleanText(input.gclid, 250),
    fbclid: cleanText(input.fbclid, 250),

    campaignId: cleanText(
      input.campaignId || input.campaign_id,
      150
    ),

    adSetId: cleanText(
      input.adSetId || input.adset_id,
      150
    ),

    adId: cleanText(
      input.adId || input.ad_id,
      150
    ),

    creativeId: cleanText(
      input.creativeId || input.creative_id,
      150
    ),

    creative: cleanText(
      input.creative,
      200
    ),

    landingPage: cleanText(
      input.landingPage || input.landing_page,
      250
    ),

    landingPageType: cleanText(
      input.landingPageType || input.landing_page_type,
      100
    ),

    analyticsSessionId: cleanText(
      input.analyticsSessionId || input.analytics_session_id,
      160
    )
  };
}


/* ============================================================
   CONSENT
============================================================ */

function buildLeadConsent(input = {}) {
  return {
    contactAllowed: input.contactAllowed === true,
    marketingAllowed: input.marketingAllowed === true,
    analyticsAllowed: input.analyticsAllowed === true,
    advertisingAllowed: input.advertisingAllowed === true,

    privacyVersion: cleanText(
      input.privacyVersion,
      50
    ),

    trackingConsentCapturedAt: parseOptionalDate(
      input.trackingConsentCapturedAt ||
      input.tracking_consent_captured_at ||
      input.trackingConsentUpdatedAt ||
      input.tracking_consent_updated_at
    ),

    capturedAt: new Date()
  };
}


/* ============================================================
   TRUSTED CONVERSION ID
============================================================ */

function getLeadCreatedAnalyticsEventId(submissionId) {
  return `lead_created_${cleanText(submissionId, 128)}`;
}


/* ============================================================
   MASTER DPR — PERSISTED LEAD ANALYTICS
============================================================ */

async function syncPersistedWebsiteLeadAnalytics(lead) {
  if (!lead?._id || !lead?.submissionId) {
    throw new Error(
      'Persisted website Lead is missing analytics reconciliation identifiers.'
    );
  }

  const analyticsAllowed =
    lead.consent?.analyticsAllowed === true;

  const advertisingAllowed =
    lead.consent?.advertisingAllowed === true;

  const analyticsSessionId = cleanText(
    lead.attribution?.analyticsSessionId,
    160
  );

  if (!analyticsAllowed && !advertisingAllowed) {
    await logTracking(
      'LEAD_CREATED_DISPATCH',
      'SKIPPED',
      {
        leadId: lead._id,
        entityType: 'LEAD',
        entityId: lead.leadCode || String(lead._id),
        idempotencyKey: getLeadCreatedAnalyticsEventId(lead.submissionId),
        provider: 'FIRST_PARTY_ANALYTICS',
        metadata: {
          reason: 'OPTIONAL_TRACKING_NOT_CONSENTED',
          analyticsAllowed: false,
          advertisingAllowed: false
        }
      }
    );

    return {
      skipped: true,
      reason: 'OPTIONAL_TRACKING_NOT_CONSENTED',
      eventId: null,
      reused: false
    };
  }

  if (analyticsAllowed) {
    await linkAnalyticsEventsToLead({
      leadId: lead._id,
      leadCode: lead.leadCode,
      submissionId: lead.submissionId,
      analyticsSessionId
    });
  }

  const eventId =
    getLeadCreatedAnalyticsEventId(
      lead.submissionId
    );

  let result;

  try {
    result = await recordAnalyticsEvent(
      {
        eventId,
        eventName: 'lead_created',
        eventSource: 'SERVER',
        occurredAt: lead.createdAt || new Date(),

        analyticsSessionId,
        submissionId: lead.submissionId,

        leadId: lead._id,
        leadCode: lead.leadCode,

        attribution: {
          utmSource: lead.attribution?.utmSource,
          utmMedium: lead.attribution?.utmMedium,
          utmCampaign: lead.attribution?.utmCampaign,
          utmContent: lead.attribution?.utmContent,
          utmTerm: lead.attribution?.utmTerm,
          gclid: lead.attribution?.gclid,
          fbclid: lead.attribution?.fbclid,
          campaignId: lead.attribution?.campaignId,
          adSetId: lead.attribution?.adSetId,
          adId: lead.attribution?.adId
        },

        page: {
          pagePath: lead.attribution?.landingPage,
          landingPageType: lead.attribution?.landingPageType
        },

        business: {
          vertical: lead.productCategory,
          productCategory: lead.productCategory,
          productCode: lead.grade || lead.product,
          quantityBand: lead.quantityBand,
          timelineBand: lead.timeline,
          eligibilityStatus: lead.eligibilityStatus,
          leadPriority: lead.priority
        },

        properties: {
          tracking_version: 'master_dpr_v4_phase_2',
          builder_version:
            lead.originalPayload?.builderVersion || 'STONE_V1',
          eligibility_rule_version:
            lead.originalPayload?.eligibilityRuleVersion ||
            'STONE_ELIGIBILITY_V1',
          lead_source: 'WEBSITE',
          contact_resolution_status:
            lead.contactResolution?.status || 'UNRESOLVED'
        }
      },
      {
        queueMetaCapi: advertisingAllowed
      }
    );

    await logTracking(
      'LEAD_CREATED_DISPATCH',
      'SUCCESS',
      {
        leadId: lead._id,
        analyticsEventId: result?.event?._id || null,
        entityType: 'LEAD',
        entityId: lead.leadCode || String(lead._id),
        idempotencyKey: eventId,
        provider: 'FIRST_PARTY_ANALYTICS',
        metadata: {
          eventName: 'lead_created',
          reused: result?.reused === true,
          analyticsAllowed,
          advertisingAllowed,
          metaCapiQueued: advertisingAllowed
        }
      }
    );
  } catch (error) {
    await logTracking(
      'LEAD_CREATED_DISPATCH',
      'FAILURE',
      {
        leadId: lead._id,
        entityType: 'LEAD',
        entityId: lead.leadCode || String(lead._id),
        idempotencyKey: eventId,
        provider: 'FIRST_PARTY_ANALYTICS',
        error,
        metadata: {
          eventName: 'lead_created',
          analyticsAllowed,
          advertisingAllowed
        }
      }
    );

    throw error;
  }

  return {
    skipped: false,
    event: result.event,
    reused: result.reused,
    eventId
  };
}


/* ============================================================
   MASTER DPR — CREATE WEBSITE LEAD OPPORTUNITY
============================================================ */

async function createWebsiteLeadRecord(payload = {}) {
  const submissionId = cleanText(
    payload.submissionId,
    128
  );

  if (
    !submissionId ||
    !/^[a-zA-Z0-9_-]{8,128}$/.test(submissionId)
  ) {
    throw validationError(
      'A valid submissionId is required.'
    );
  }

  /* ----------------------------------------------------------
     IDEMPOTENCY
  ---------------------------------------------------------- */

  const existing = await Lead.findOne({
    submissionId
  });

  if (existing) {
    await logDatabaseWrite(
      'WEBSITE_LEAD_PERSIST',
      'SUCCESS',
      {
        leadId: existing._id,
        entityType: 'LEAD',
        entityId: existing.leadCode || String(existing._id),
        provider: 'MONGODB',
        idempotencyKey: submissionId,
        metadata: {
          persisted: true,
          reused: true,
          source: 'WEBSITE'
        }
      }
    );

    return {
      lead: existing,
      reused: true,
      leadCreatedEventId:
        getLeadCreatedAnalyticsEventId(
          existing.submissionId
        )
    };
  }


  /* ----------------------------------------------------------
     CONSENT
  ---------------------------------------------------------- */

  const consent = buildLeadConsent(
    payload.consent || {}
  );

  if (!consent.contactAllowed) {
    throw validationError(
      'Contact consent is required to submit this enquiry.'
    );
  }

  if (!consent.privacyVersion) {
    throw validationError(
      'Privacy notice version is required.'
    );
  }


  /* ----------------------------------------------------------
     CONTACT / REQUIREMENT INPUTS
  ---------------------------------------------------------- */

  const phone = normalizePhone(
    payload.phone ||
    payload.mobile ||
    payload.whatsapp ||
    payload.whatsApp ||
    payload.whatsappNumber
  );

  const suppliedWhatsApp = normalizeOptionalPhone(
    payload.whatsapp ||
    payload.whatsApp ||
    payload.whatsappNumber
  );

  /*
   * The Master DPR soft-gate field is explicitly Phone / WhatsApp. When the
   * buyer does not provide a second WhatsApp number, the submitted contact
   * number remains the WhatsApp-capable contact snapshot for CRM display.
   */
  const whatsApp = suppliedWhatsApp || phone;

  const captureMode = normalizeCaptureMode(
    payload.captureMode
  );

  const quickCapture =
    captureMode === 'QUICK';

  const { category, details } =
    require('./productRequirement')
      .normalizeProductRequirement({
        ...payload,
        captureMode
      });

  let quantityRequirement;

  if (!quickCapture && category === 'STONE') {
    quantityRequirement =
      resolveStoneQuantityRequirement(payload);
  } else {
    const display = cleanText(
      payload.quantity,
      160
    );

    const numericQuantity = Number(
      payload.quantityValue ??
      payload.quantity
    );

    quantityRequirement = {
      display,
      quantityValue:
        Number.isFinite(numericQuantity) &&
        numericQuantity > 0
          ? numericQuantity
          : 0,
      quantityUnit: cleanText(
        payload.quantityUnit,
        40
      ).toUpperCase(),
      quantityBand: cleanText(
        payload.quantityBand,
        100
      ),
      scoringTruckCount: null,
      mode: quickCapture
        ? 'QUICK_ENQUIRY'
        : 'PRODUCT_REQUIREMENT'
    };
  }

  if (
    !quickCapture &&
    category !== 'ITO_ADS' &&
    !quantityRequirement.display
  ) {
    throw validationError(
      'Quantity is required.'
    );
  }

  const destination = cleanText(
    payload.destination,
    200
  );

  if (!destination) {
    throw validationError(
      'Delivery destination is required.'
    );
  }

  const timeline = cleanText(
    payload.timeline,
    100
  );

  /*
   * Master DPR requires timeline as part of the product Requirement Builder,
   * but the separate detailed Commercial Enquiry form may legitimately leave
   * its optional Required By date empty. Do not manufacture a timeline or
   * reject that form solely because no date was supplied.
   */
  const timelineRequired =
    captureMode === 'REQUIREMENT_BUILDER' &&
    category !== 'ITO_ADS';

  if (!timeline && timelineRequired) {
    throw validationError(
      'Purchase timeline is required.'
    );
  }

  const product = cleanText(
    payload.product,
    150
  );

  if (!product) {
    throw validationError(
      'Product / service is required.'
    );
  }

  const productVariant = cleanText(
    payload.productVariant,
    150
  );

  const grade = cleanText(
    payload.grade,
    150
  );

  const specification = cleanText(
    payload.specification,
    1000
  );

  const customerName = cleanText(
    payload.customerName ||
    payload.name,
    150
  );

  const companyName = cleanText(
    payload.companyName ||
    payload.company,
    200
  );

  const email = cleanText(
    payload.email,
    250
  ).toLowerCase();

  const country = cleanText(
    payload.country,
    100
  );

  const gst = cleanText(
    payload.gst || payload.gstin,
    40
  )
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');


  /* ----------------------------------------------------------
     CONTACT SNAPSHOT HASHES
  ---------------------------------------------------------- */

  const phoneHash = hashText(phone);

  const emailHash = email
    ? hashText(email)
    : '';

  const companyNameHash = companyName
    ? hashCompanyName(companyName)
    : '';

  const gstHash = gst
    ? hashText(gst)
    : '';


  /* ----------------------------------------------------------
     MASTER DPR CONTACT RESOLUTION

     IMPORTANT:
     Same Contact != duplicate opportunity.

     A matched Contact can still create a brand-new Lead.
  ---------------------------------------------------------- */

  const contactResolution =
    await resolveOrCreateContact({
      source: 'WEBSITE',

      name: customerName,
      companyName,
      country,

      phone,

      /*
       * Website soft-gate phone is currently captured but not treated
       * as independently OTP-verified by this service unless the caller
       * explicitly provides that trusted state later.
       */
      phoneVerified: false,

      email,

      /*
       * Email only participates as a strong identity key if it was
       * actually verified by a trusted flow.
       */
      emailVerified: false,

      gst,
      gstVerified: false,

      consent,
      actorId: null
    });

  const resolvedContact =
    contactResolution.contact || null;

  const contactResolutionStatus =
    contactResolution.status ||
    'UNRESOLVED';

  const contactResolutionMethod =
    contactResolution.method ||
    'NONE';


  /* ----------------------------------------------------------
     COMMERCIAL QUALIFICATION
  ---------------------------------------------------------- */

  const targetDate = timeline
    ? parseFlexibleDate(
        timeline.replace(/_/g, ' ')
      )
    : null;

  /*
   * The DPR defines an explicit commercial eligibility step for the Stone
   * builder. Other product flows are stored without inventing serviceability
   * or approval rules that Operations has not supplied.
   */
  const eligibility =
    category === 'STONE' && !quickCapture
      ? evaluateStoneEligibility(
          quantityRequirement
        )
      : {
          status: 'NOT_CHECKED',
          reason: ''
        };

  const quantityBand =
    quantityRequirement.quantityBand;

  const requirementSummary = [
    quickCapture
      ? 'Website quick enquiry'
      : `Website ${category} requirement`,
    `Product: ${product}`,
    productVariant
      ? `Variant: ${productVariant}`
      : '',
    grade
      ? `Grade: ${grade}`
      : '',
    specification
      ? `Specification: ${specification}`
      : '',
    quantityRequirement.display
      ? `Quantity: ${quantityRequirement.display}`
      : '',
    `Destination: ${destination}`,
    timeline
      ? `Timeline: ${timeline}`
      : ''
  ]
    .filter(Boolean)
    .join(' | ');

  const {
    score,
    priority
  } = scoreAndClassifyLead({
    quantity: quantityRequirement.display,
    truckCount: quantityRequirement.scoringTruckCount,
    hasLOI: false,
    paymentTerms: '',
    contactPerson: customerName,
    mobile: phone,
    email,
    chatSummary: requirementSummary,
    leadValue: 0,
    targetDate,
    timeline,
    companyName,
    gst,
    completedPriceCheck: !quickCapture
  });


  /* ----------------------------------------------------------
     OPPORTUNITY ID / ATTRIBUTION
  ---------------------------------------------------------- */

  const leadCode =
    `LD-${Date.now()}-${crypto
      .randomUUID()
      .slice(0, 8)}`;

  const attribution = buildAttribution(
    payload.attribution || {}
  );

  const requirementDetails = {
    captureMode,

    sourcePreference: cleanText(
      payload.sourcePreference,
      250
    ),

    packaging: cleanText(
      details.packaging ||
      payload.packaging,
      500
    ),

    tradeType: cleanText(
      details.tradeType ||
      payload.tradeType,
      20
    ).toUpperCase(),

    incoterm: cleanText(
      details.incoterm ||
      payload.incoterm,
      100
    ),

    qualityRequirement: cleanText(
      details.qualityRequirement ||
      payload.qualityRequirement,
      1000
    ),

    privateLabelRequirement: cleanText(
      details.privateLabelRequirement ||
      payload.privateLabelRequirement,
      1000
    ),

    businessCategory: cleanText(
      details.businessCategory ||
      payload.businessCategory,
      250
    ),

    objective: cleanText(
      details.objective ||
      payload.objective,
      250
    ),

    monthlyAdBudget: cleanText(
      details.monthlyAdBudget ||
      payload.monthlyAdBudget,
      250
    ),

    budgetCurrency: cleanText(
      details.budgetCurrency ||
      payload.budgetCurrency,
      20
    ).toUpperCase(),

    marketingStatus: cleanText(
      details.marketingStatus ||
      payload.marketingStatus,
      500
    ),

    paymentTerms: cleanText(
      payload.paymentTerms,
      500
    ),

    documentationRequirement: cleanText(
      payload.documentationRequirement,
      1000
    ),

    buyerType: cleanText(
      payload.buyerType,
      100
    )
  };

  let lead;


  try {
    /* ========================================================
       DURABLE OPPORTUNITY PERSISTENCE
    ======================================================== */

    lead = await Lead.create({
      leadCode,
      submissionId,

      contactId:
        resolvedContact?._id ||
        null,

      contactResolution: {
        status:
          contactResolutionStatus,

        method:
          contactResolutionMethod,

        resolvedAt:
          resolvedContact
            ? new Date()
            : null
      },

      source: 'WEBSITE',

      leadOrigin:
        resolveLeadOrigin(
          captureMode
        ),

      customerName,
      companyName,
      companyNameHash,

      phoneEncrypted:
        encryptText(
          phone
        ),

      phoneMasked:
        maskPhone(
          phone
        ),

      phoneHash,

      emailEncrypted:
        email
          ? encryptText(
              email
            )
          : '',

      emailMasked:
        email
          ? maskEmail(
              email
            )
          : '',

      emailHash,

      gstEncrypted:
        gst
          ? encryptText(
              gst
            )
          : '',

      gstMasked:
        gst
          ? `${gst.slice(0, 2)}${'*'.repeat(
              Math.max(
                4,
                gst.length - 4
              )
            )}${gst.slice(-2)}`
          : '',

      gstHash,

      whatsAppEncrypted:
        encryptText(
          whatsApp
        ),

      whatsAppMasked:
        maskPhone(
          whatsApp
        ),

      whatsAppHash:
        hashText(
          whatsApp
        ),

      productCategory:
        category,

      product,

      productVariant,

      grade,

      specification,

      quantity:
        quantityRequirement.display,

      quantityValue:
        quantityRequirement.quantityValue,

      quantityUnit:
        quantityRequirement.quantityUnit,

      quantityBand,

      destination,

      timeline,

      targetDate,

      requirementDetails,

      eligibilityStatus:
        eligibility.status,

      eligibilityReason:
        eligibility.reason,

      priority,

      score,

      crmStatus:
        'NEW',

      crmStatusChangedAt:
        new Date(),

      crmStatusChangedBy:
        null,

      stage:
        'NEW_LEAD',

      stageChangedAt:
        new Date(),

      stageChangedBy:
        null,

      /*
       * Phase 2 contact resolution replaces opportunity-level duplicate
       * suppression. Same Contact may create multiple Lead records.
       */
      duplicateOf:
        null,

      chatSummary:
        requirementSummary,

      contactPerson:
        customerName,

      country,

      /*
       * Do not duplicate raw phone in plaintext.
       */
      whatsAppNumber:
        '',

      leadValue:
        0,

      consent: {
        contactAllowed:
          consent.contactAllowed,

        marketingAllowed:
          consent.marketingAllowed,

        analyticsAllowed:
          consent.analyticsAllowed,

        advertisingAllowed:
          consent.advertisingAllowed,

        privacyVersion:
          consent.privacyVersion,

        trackingConsentCapturedAt:
          consent.trackingConsentCapturedAt,

        capturedAt:
          consent.capturedAt
      },

      attribution,

      automationStatus:
        'PENDING',

      automationAttempts:
        0,

      crmSync: {
        status:
          'PENDING',

        attempts:
          0,

        nextAttemptAt:
          null,

        manualRecoveryRequired:
          false
      },

      originalPayload: {
        requirementDetails:
          details,

        builderVersion:
          cleanText(
            payload.metadata?.builderVersion,
            50
          ) ||
          `${category}_V1`,

        eligibilityRuleVersion:
          category === 'STONE' &&
          !quickCapture
            ? 'STONE_ELIGIBILITY_V2'
            : '',

        quantityMode:
          quantityRequirement.mode,

        landingPageType:
          attribution.landingPageType ||
          (
            category === 'ITO_ADS'
              ? 'ITO_ADS_SERVICE'
              : `${category}_PRODUCT`
          ),

        contactResolutionReason:
          cleanText(
            contactResolution.reason,
            200
          ),

        contactConflictIds:
          Array.isArray(
            contactResolution.conflictContactIds
          )
            ? contactResolution
                .conflictContactIds
                .map(
                  (value) =>
                    cleanText(
                      value,
                      64
                    )
                )
                .filter(Boolean)
            : []
      },

      createdBy:
        null
    });

    await logDatabaseWrite(
      'WEBSITE_LEAD_PERSIST',
      'SUCCESS',
      {
        leadId:
          lead._id,

        entityType:
          'LEAD',

        entityId:
          lead.leadCode ||
          String(
            lead._id
          ),

        provider:
          'MONGODB',

        idempotencyKey:
          submissionId,

        metadata: {
          persisted:
            true,

          reused:
            false,

          source:
            'WEBSITE',

          productCategory:
            lead.productCategory,

          priority:
            lead.priority,

          eligibilityStatus:
            lead.eligibilityStatus,

          contactResolutionStatus:
            lead.contactResolution?.status ||
            'UNRESOLVED'
        }
      }
    );

  } catch (error) {
    /* --------------------------------------------------------
       IDEMPOTENCY RACE RECOVERY
    -------------------------------------------------------- */

    if (
      error?.code ===
      11000
    ) {
      const alreadyCreated =
        await Lead.findOne({
          submissionId
        });

      if (
        alreadyCreated
      ) {
        await logDatabaseWrite(
          'WEBSITE_LEAD_PERSIST',
          'SUCCESS',
          {
            leadId:
              alreadyCreated._id,

            entityType:
              'LEAD',

            entityId:
              alreadyCreated.leadCode ||
              String(
                alreadyCreated._id
              ),

            provider:
              'MONGODB',

            idempotencyKey:
              submissionId,

            metadata: {
              persisted:
                true,

              reused:
                true,

              raceRecovered:
                true,

              source:
                'WEBSITE'
            }
          }
        );

        return {
          lead:
            alreadyCreated,

          reused:
            true,

          leadCreatedEventId:
            getLeadCreatedAnalyticsEventId(
              alreadyCreated.submissionId
            )
        };
      }
    }

    await logDatabaseWrite(
      'WEBSITE_LEAD_PERSIST',
      'FAILURE',
      {
        entityType:
          'LEAD',

        entityId:
          submissionId,

        provider:
          'MONGODB',

        idempotencyKey:
          submissionId,

        error,

        metadata: {
          persisted:
            false,

          source:
            'WEBSITE',

          productCategory:
            category
        }
      }
    );

    throw error;
  }


  /* ----------------------------------------------------------
     CONTACT OPPORTUNITY SUMMARY

     Lead is already safe in MongoDB at this point.
     Failure here must not invalidate the opportunity.
  ---------------------------------------------------------- */

  if (
    lead.contactId
  ) {
    try {
      await markContactOpportunityCreated(
        lead.contactId,
        {
          source:
            'WEBSITE',

          occurredAt:
            lead.createdAt ||
            new Date()
        }
      );

    } catch (error) {
      console.error(
        '[Contact Opportunity Summary]',
        lead._id.toString(),
        error.message
      );
    }
  }


  return {
    lead,

    reused:
      false,

    leadCreatedEventId:
      getLeadCreatedAnalyticsEventId(
        lead.submissionId
      )
  };
}


/* ============================================================
   MASTER DPR — POST-PERSISTENCE AUTOMATION
============================================================ */

async function processWebsiteLeadAutomation(leadId) {
  const lead =
    await Lead.findOneAndUpdate(
      {
        _id:
          leadId,

        automationStatus: {
          $in: [
            'PENDING',
            'FAILED'
          ]
        },

        automationAttempts: {
          $lt:
            5
        }
      },

      {
        $set: {
          automationStatus:
            'PROCESSING',

          automationLastAttemptAt:
            new Date()
        },

        $inc: {
          automationAttempts:
            1
        }
      },

      {
        new:
          true
      }
    );

  if (!lead) {
    return;
  }

  await logRetry(
    'WEBSITE_LEAD_AUTOMATION',

    lead.automationAttempts >
      1
      ? 'RETRY_SCHEDULED'
      : 'PENDING',

    {
      leadId:
        lead._id,

      entityType:
        'LEAD',

      entityId:
        lead.leadCode ||
        String(
          lead._id
        ),

      provider:
        'INTERNAL_WORKER',

      retryCount:
        Math.max(
          0,
          Number(
            lead.automationAttempts
          ) - 1
        ),

      metadata: {
        automationAttempt:
          lead.automationAttempts,

        source:
          'WEBSITE'
      }
    }
  );

  try {
    const existingActivity =
      await LeadActivity.findOne({
        leadId:
          lead._id,

        actionType:
          'LEAD_CREATED'
      });

    if (
      !existingActivity
    ) {
      await LeadActivity.create({
        leadId:
          lead._id,

        actionType:
          'LEAD_CREATED',

        note:
          'Lead persisted via website enquiry',

        actorId:
          null
      });
    }


    /*
     * Audit is best-effort.
     *
     * A temporary audit subsystem failure must not fail
     * website-lead ownership, analytics or retry automation.
     */
    try {
      const auditFn =
        typeof recordAudit ===
          'function'
          ? recordAudit
          : require(
              '../security-audit/auditLog.service'
            ).recordAudit;

      if (
        typeof auditFn ===
        'function'
      ) {
        await auditFn({
          actorId:
            null,

          actionType:
            'WEBSITE_LEAD_CREATED',

          entityType:
            'LEAD',

          entityId:
            lead._id.toString(),

          severity:
            lead.contactResolution?.status ===
              'AMBIGUOUS'
              ? 'MEDIUM'
              : 'LOW',

          metadata: {
            leadCode:
              lead.leadCode,

            contactId:
              lead.contactId
                ? lead.contactId.toString()
                : '',

            contactResolutionStatus:
              lead.contactResolution?.status ||
              'UNRESOLVED',

            /*
             * Retained for compatibility with earlier audit
             * consumers. Contact matching itself is NOT treated
             * as duplicate-opportunity suppression.
             */
            duplicateDetected:
              Boolean(
                lead.duplicateOf
              ),

            productCategory:
              lead.productCategory ||
              'STONE'
          }
        });
      }

    } catch (auditErr) {
      console.warn(
        '[WebsiteLead Audit Notice]:',
        auditErr.message
      );
    }


    if (
      !lead.assignedTo
    ) {
      await autoRouteLead(
        lead
      );
    }


    await syncPersistedWebsiteLeadAnalytics(
      lead
    );


    await Lead.findByIdAndUpdate(
      lead._id,

      {
        $set: {
          automationStatus:
            'COMPLETED',

          automationLastError:
            ''
        }
      }
    );

    await logRetry(
      'WEBSITE_LEAD_AUTOMATION',
      'SUCCESS',

      {
        leadId:
          lead._id,

        entityType:
          'LEAD',

        entityId:
          lead.leadCode ||
          String(
            lead._id
          ),

        provider:
          'INTERNAL_WORKER',

        retryCount:
          Math.max(
            0,
            Number(
              lead.automationAttempts
            ) - 1
          ),

        metadata: {
          automationAttempt:
            lead.automationAttempts,

          finalStatus:
            'COMPLETED'
        }
      }
    );

  } catch (error) {
    await Lead.findByIdAndUpdate(
      lead._id,

      {
        $set: {
          automationStatus:
            'FAILED',

          automationLastError:
            cleanText(
              error.message ||
              'Unknown automation error',
              500
            )
        }
      }
    );

    await logRetry(
      'WEBSITE_LEAD_AUTOMATION',

      Number(
        lead.automationAttempts
      ) >= 5
        ? 'MANUAL_RECOVERY'
        : 'RETRY_SCHEDULED',

      {
        leadId:
          lead._id,

        entityType:
          'LEAD',

        entityId:
          lead.leadCode ||
          String(
            lead._id
          ),

        provider:
          'INTERNAL_WORKER',

        retryCount:
          Number(
            lead.automationAttempts
          ) ||
          0,

        error,

        metadata: {
          automationAttempt:
            lead.automationAttempts,

          finalStatus:
            'FAILED'
        }
      }
    );

    throw error;
  }
}



/* ============================================================
   MASTER DPR v4.0 — PROGRESSIVE PROFILE AFTER PHONE

   Source-of-truth behavior:
   - the Lead already exists before this function is called;
   - Name / Company / Email are optional progressive fields;
   - this function NEVER creates a new Lead;
   - submissionId + immutable Lead ID must match the persisted Lead;
   - unverified email is stored as a profile snapshot but is NOT used as a
     verified identity key for Contact merging;
   - blank optional fields never erase previously captured values.
============================================================ */

async function updateWebsiteLeadProgressiveProfile(input = {}) {
  const submissionId = cleanText(
    input.submissionId,
    128
  );

  const leadId = cleanText(
    input.leadId,
    100
  );

  if (
    !submissionId ||
    !/^[a-zA-Z0-9_-]{8,128}$/.test(submissionId)
  ) {
    throw validationError(
      'A valid submissionId is required.'
    );
  }

  if (!leadId) {
    throw validationError(
      'Lead ID is required.'
    );
  }

  const lead = await Lead.findOne({
    submissionId,
    source: 'WEBSITE'
  });

  if (
    !lead ||
    String(lead._id) !== leadId
  ) {
    const error = new Error(
      'The persisted website Lead could not be matched.'
    );

    error.code =
      'WEBSITE_LEAD_NOT_FOUND';

    throw error;
  }

  const customerName = cleanText(
    input.customerName ||
    input.name,
    150
  );

  const companyName = cleanText(
    input.companyName ||
    input.company,
    200
  );

  const email = normalizeContactEmail(
    input.email
  );

  if (
    !customerName &&
    !companyName &&
    !email
  ) {
    throw validationError(
      'Provide at least one progressive profile field.'
    );
  }

  let phone = '';

  try {
    phone = decryptText(
      lead.phoneEncrypted
    );

  } catch (error) {
    const decryptError = new Error(
      'The persisted Lead contact could not be safely resolved.'
    );

    decryptError.code =
      'WEBSITE_LEAD_CONTACT_RESOLUTION_FAILED';

    throw decryptError;
  }

  if (!phone) {
    const error = new Error(
      'The persisted Lead does not contain a usable contact number.'
    );

    error.code =
      'WEBSITE_LEAD_CONTACT_RESOLUTION_FAILED';

    throw error;
  }

  /*
   * Re-resolve the already persisted Contact by the Lead's normalized phone.
   * Email remains deliberately unverified here, matching Master DPR's
   * progressive-capture principle and avoiding unsafe email-based merges.
   */
  const contactResolution =
    await resolveOrCreateContact({
      source:
        'WEBSITE',

      name:
        customerName ||
        lead.customerName ||
        '',

      companyName:
        companyName ||
        lead.companyName ||
        '',

      country:
        lead.country ||
        '',

      phone,

      phoneVerified:
        false,

      email,

      emailVerified:
        false,

      consent:
        lead.consent ||
        {},

      actorId:
        null
    });

  const resolvedContact =
    contactResolution?.contact ||
    null;

  const set = {};

  if (customerName) {
    set.customerName =
      customerName;

    set.contactPerson =
      customerName;
  }

  if (companyName) {
    set.companyName =
      companyName;

    set.companyNameHash =
      hashCompanyName(
        companyName
      );
  }

  if (email) {
    set.emailEncrypted =
      encryptText(
        email
      );

    set.emailMasked =
      maskEmail(
        email
      );

    set.emailHash =
      hashText(
        email
      );
  }

  if (
    resolvedContact?._id
  ) {
    set.contactId =
      resolvedContact._id;

    set[
      'contactResolution.status'
    ] =
      contactResolution.status ||
      'MATCHED';

    set[
      'contactResolution.method'
    ] =
      contactResolution.method ||
      'PHONE';

    set[
      'contactResolution.resolvedAt'
    ] =
      new Date();
  }

  let updatedLead;

  try {
    updatedLead =
      await Lead.findOneAndUpdate(
        {
          _id:
            lead._id,

          submissionId
        },

        {
          $set:
            set
        },

        {
          new:
            true,

          runValidators:
            true
        }
      );

    if (!updatedLead) {
      const error = new Error(
        'The persisted website Lead could not be updated.'
      );

      error.code =
        'WEBSITE_LEAD_PROFILE_UPDATE_FAILED';

      throw error;
    }

    await logDatabaseWrite(
      'WEBSITE_LEAD_PROGRESSIVE_PROFILE',
      'SUCCESS',

      {
        leadId:
          updatedLead._id,

        entityType:
          'LEAD',

        entityId:
          updatedLead.leadCode ||
          String(
            updatedLead._id
          ),

        provider:
          'MONGODB',

        idempotencyKey:
          submissionId,

        metadata: {
          persisted:
            true,

          profileUpdated:
            true,

          nameProvided:
            Boolean(
              customerName
            ),

          companyProvided:
            Boolean(
              companyName
            ),

          emailProvided:
            Boolean(
              email
            )
        }
      }
    );

    try {
      await recordAudit({
        actorId:
          null,

        actionType:
          'LEAD_EDITED',

        entityType:
          'LEAD',

        entityId:
          updatedLead._id.toString(),

        severity:
          'LOW',

        metadata: {
          source:
            'WEBSITE_PROGRESSIVE_PROFILE',

          leadCode:
            updatedLead.leadCode,

          nameUpdated:
            Boolean(
              customerName
            ),

          companyUpdated:
            Boolean(
              companyName
            ),

          emailUpdated:
            Boolean(
              email
            )
        }
      });

    } catch (auditError) {
      console.warn(
        '[Website Lead Progressive Profile] Audit logging failed:',
        cleanText(
          auditError.message,
          300
        )
      );
    }

    return {
      lead:
        updatedLead,

      profileUpdated:
        true,

      updatedFields: {
        name:
          Boolean(
            customerName
          ),

        company:
          Boolean(
            companyName
          ),

        email:
          Boolean(
            email
          )
      }
    };

  } catch (error) {
    await logDatabaseWrite(
      'WEBSITE_LEAD_PROGRESSIVE_PROFILE',
      'FAILURE',

      {
        leadId:
          lead._id,

        entityType:
          'LEAD',

        entityId:
          lead.leadCode ||
          String(
            lead._id
          ),

        provider:
          'MONGODB',

        idempotencyKey:
          submissionId,

        error,

        metadata: {
          persistedLeadPreserved:
            true
        }
      }
    );

    throw error;
  }
}


/* ============================================================
   ASYNC SCHEDULING
============================================================ */

function scheduleWebsiteLeadAutomation(leadId) {
  setImmediate(
    () => {
      processWebsiteLeadAutomation(
        leadId
      ).catch(
        (error) => {
          console.error(
            '[Website Lead Automation]',
            leadId,
            error.message
          );
        }
      );
    }
  );
}


/* ============================================================
   RECOVERY WORKER
============================================================ */

async function retryPendingWebsiteLeadAutomations(
  limit = 50
) {
  const staleBefore =
    new Date(
      Date.now() -
      10 *
      60 *
      1000
    );

  const staleRecoveryResult =
    await Lead.updateMany(
      {
        automationStatus:
          'PROCESSING',

        automationLastAttemptAt: {
          $lt:
            staleBefore
        }
      },

      {
        $set: {
          automationStatus:
            'FAILED',

          automationLastError:
            'Recovered stale processing state'
        }
      }
    );

  if (
    staleRecoveryResult.modifiedCount >
    0
  ) {
    await logRetry(
      'WEBSITE_LEAD_AUTOMATION_STALE_RECOVERY',
      'RETRY_SCHEDULED',

      {
        entityType:
          'WORKER',

        entityId:
          'WEBSITE_LEAD_AUTOMATION',

        provider:
          'INTERNAL_WORKER',

        retryCount:
          0,

        metadata: {
          recoveredCount:
            staleRecoveryResult.modifiedCount
        }
      }
    );
  }

  const leads =
    await Lead.find({
      automationStatus: {
        $in: [
          'PENDING',
          'FAILED'
        ]
      },

      automationAttempts: {
        $lt:
          5
      }
    })
      .sort({
        createdAt:
          1
      })
      .limit(
        limit
      )
      .select(
        '_id'
      );


  for (
    const lead of
    leads
  ) {
    try {
      await processWebsiteLeadAutomation(
        lead._id
      );

    } catch (error) {
      console.error(
        '[Website Lead Retry]',
        lead._id.toString(),
        error.message
      );
    }
  }

  return leads.length;
}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  createWebsiteLeadRecord,
  updateWebsiteLeadProgressiveProfile,
  processWebsiteLeadAutomation,
  scheduleWebsiteLeadAutomation,
  retryPendingWebsiteLeadAutomations,
  syncPersistedWebsiteLeadAnalytics,
  getLeadCreatedAnalyticsEventId
};