const crypto = require('crypto');

const Lead = require('../lead.model');
const LeadActivity = require('../leadActivity.model');

const {
  encryptText,
  hashText,
  hashCompanyName,
  maskPhone,
  maskEmail,
} = require('../../../utils/crypto');

const {
  scoreAndClassifyLead,
} = require('./leadScoring.service');

const {
  autoRouteLead,
} = require('../leadAssignment.service');

const {
  recordAudit,
} = require('../../security-audit/auditLog.service');

const {
  resolveOrCreateContact,
  markContactOpportunityCreated,
} = require('../contactResolution.service');


const ALLOWED_LEAD_SOURCES = new Set([
  'WEBSITE',
  'AI_AGENT',
  'WHATSAPP',
  'INDIAMART',
  'MANUAL',
  'IMPORT',
]);


/* ============================================================
   BASIC HELPERS
============================================================ */

function cleanText(
  value,
  maxLength = 250
) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .slice(
      0,
      maxLength
    );
}


function validationError(
  message
) {
  const error =
    new Error(message);

  error.code =
    'VALIDATION_FAILED';

  return error;
}


function normalizePhone(
  value
) {
  const raw =
    cleanText(
      value,
      40
    );

  if (!raw) {
    throw validationError(
      'A valid phone number is required for AI lead creation.'
    );
  }

  const digits =
    raw.replace(
      /\D/g,
      ''
    );

  if (
    digits.length < 10 ||
    digits.length > 15
  ) {
    throw validationError(
      'Please provide a valid phone number including country code.'
    );
  }

  return `+${digits}`;
}


function normalizeLeadSource(
  value
) {
  const source =
    cleanText(
      value,
      40
    ).toUpperCase();

  return ALLOWED_LEAD_SOURCES.has(
    source
  )
    ? source
    : 'AI_AGENT';
}


function normalizeProductCategory(
  value
) {
  const raw =
    cleanText(
      value,
      100
    );

  const lower =
    raw.toLowerCase();

  if (
    lower.includes(
      'stone'
    )
  ) {
    return 'STONE';
  }

  if (
    lower.includes(
      'rice'
    )
  ) {
    return 'RICE';
  }

  if (
    lower.includes(
      'tea'
    )
  ) {
    return 'TEA';
  }

  if (
    lower.includes(
      'coal'
    )
  ) {
    return 'COAL';
  }

  if (
    lower.includes(
      'transport'
    ) ||
    lower.includes(
      'logistics'
    )
  ) {
    return 'TRANSPORT';
  }

  return raw
    ? raw.toUpperCase()
    : 'TEA';
}


function normalizeGst(
  value
) {
  return cleanText(
    value,
    40
  )
    .toUpperCase()
    .replace(
      /[^A-Z0-9]/g,
      ''
    )
    .slice(
      0,
      32
    );
}


function maskIdentifier(
  value
) {
  const text =
    cleanText(
      value,
      80
    );

  if (!text) {
    return '';
  }

  if (
    text.length <= 4
  ) {
    return '*'.repeat(
      text.length
    );
  }

  return `${text.slice(0, 2)}${'*'.repeat(
    Math.max(
      4,
      text.length - 4
    )
  )}${text.slice(-2)}`;
}


/* ============================================================
   FLEXIBLE TARGET DATE
============================================================ */

function parseFlexibleDate(
  dateInput
) {
  if (!dateInput) {
    return null;
  }

  if (
    dateInput instanceof Date &&
    !Number.isNaN(
      dateInput.getTime()
    )
  ) {
    return dateInput;
  }

  const str =
    String(
      dateInput
    ).trim();

  if (!str) {
    return null;
  }

  const lower =
    str.toLowerCase();

  if (
    lower.includes(
      'immed'
    ) ||
    lower.includes(
      'urgent'
    ) ||
    lower.includes(
      'today'
    ) ||
    lower.includes(
      'asap'
    )
  ) {
    return new Date();
  }

  if (
    lower.includes(
      'tomorrow'
    )
  ) {
    const d =
      new Date();

    d.setDate(
      d.getDate() + 1
    );

    return d;
  }

  const matchDays =
    lower.match(
      /(?:within|in|under)?\s*(\d+)\s*day/i
    );

  if (
    matchDays &&
    matchDays[1]
  ) {
    const days =
      parseInt(
        matchDays[1],
        10
      );

    const d =
      new Date();

    d.setDate(
      d.getDate() +
      days
    );

    return d;
  }

  const matchWeeks =
    lower.match(
      /(?:within|in|under)?\s*(\d+)\s*week/i
    );

  if (
    matchWeeks &&
    matchWeeks[1]
  ) {
    const weeks =
      parseInt(
        matchWeeks[1],
        10
      );

    const d =
      new Date();

    d.setDate(
      d.getDate() +
      (
        weeks * 7
      )
    );

    return d;
  }

  const ddmmyyyy =
    str.match(
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/
    );

  if (ddmmyyyy) {
    const day =
      parseInt(
        ddmmyyyy[1],
        10
      );

    const month =
      parseInt(
        ddmmyyyy[2],
        10
      ) - 1;

    const year =
      parseInt(
        ddmmyyyy[3],
        10
      );

    const d =
      new Date(
        year,
        month,
        day
      );

    if (
      !Number.isNaN(
        d.getTime()
      )
    ) {
      return d;
    }
  }

  const parsed =
    new Date(str);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}


/* ============================================================
   SAFE INTERNAL METADATA
============================================================ */

function buildSafeOriginalPayload(
  payload,
  scoringResult,
  contactResolution
) {
  return {
    ingestionVersion:
      'MASTER_DPR_V4_PHASE_2_AI_V1',

    scoringVersion:
      scoringResult
        .scoringVersion,

    scoreBreakdown:
      scoringResult
        .breakdown,

    serviceabilityTier:
      cleanText(
        payload
          .serviceabilityTier ||
        payload
          .marketTier ||
        payload
          .destinationTier,
        80
      ),

    completedPriceCheck:
      payload
        .completedPriceCheck ===
          true ||
      payload
        .priceCheckCompleted ===
          true,

    returnVisit:
      payload
        .returnVisit ===
          true ||
      payload
        .isReturnVisit ===
          true,

    contactResolutionReason:
      cleanText(
        contactResolution
          .reason,
        200
      ),

    contactConflictIds:
      Array.isArray(
        contactResolution
          .conflictContactIds
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
        : [],
  };
}


/* ============================================================
   PROCESS AI LEAD
============================================================ */

async function processAiLead(
  payload = {},
  actorId = null
) {
  const contactPerson =
    cleanText(
      payload
        .contactPerson ||
      payload
        .customerName ||
      payload
        .name,
      150
    );

  if (!contactPerson) {
    throw validationError(
      'customerName is required'
    );
  }


  /*
   * Do NOT manufacture a fallback such as:
   *
   * 9999999999
   *
   * A fake contact number would corrupt:
   *
   * - Contact resolution
   * - duplicate management
   * - CRM ownership
   * - sales follow-up
   * - analytics
   */
  const mobile =
    normalizePhone(
      payload.mobile ||
      payload.phone ||
      payload.whatsapp
    );


  const email =
    cleanText(
      payload.email,
      320
    ).toLowerCase();


  const productCategory =
    normalizeProductCategory(
      payload
        .productCategory ||
      payload
        .productRequired ||
      payload
        .division ||
      payload
        .category
    );


  const product =
    cleanText(
      payload.product ||
      payload.productName ||
      payload.productRequired,
      150
    );


  const productVariant =
    cleanText(
      payload.productVariant ||
      payload.variant,
      150
    );


  const grade =
    cleanText(
      payload.grade ||
      payload.size,
      150
    );


  const specification =
    cleanText(
      payload.specification ||
      payload.specifications,
      1000
    );


  const quantity =
    cleanText(
      payload.quantity,
      120
    );


  const quantityValue =
    Number(
      payload.quantityValue
    );


  const destination =
    cleanText(
      payload.destination ||
      payload.city,
      200
    );


  const timeline =
    cleanText(
      payload.timeline ||
      payload.purchaseTimeline ||
      payload.requiredDate,
      120
    );


  const targetDateRaw =
    payload.targetDate ||
    payload.requiredDate ||
    payload.timeline ||
    null;


  const targetDate =
    parseFlexibleDate(
      targetDateRaw
    );


  const companyName =
    cleanText(
      payload.companyName ||
      payload.company,
      200
    );


  const country =
    cleanText(
      payload.country,
      100
    );


  const gst =
    normalizeGst(
      payload.gst ||
      payload.gstin
    );


  const chatSummary =
    cleanText(
      payload.chatSummary ||
      payload.message ||
      payload.subject,
      2000
    );


  const leadSource =
    normalizeLeadSource(
      payload.source ||
      'AI_AGENT'
    );


  const rawValuation =
    payload.estimatedValue ||
    payload.valuation ||
    payload.leadValue ||
    payload.budget ||
    '';


  const numericValue =
    typeof rawValuation ===
      'number'
      ? rawValuation
      : (
          Number(
            String(
              rawValuation
            ).replace(
              /[^0-9.]/g,
              ''
            )
          ) ||
          0
        );


  /* ==========================================================
     CONTACT SNAPSHOT
  ========================================================== */

  const phoneHash =
    hashText(
      mobile
    );


  const emailHash =
    email
      ? hashText(
          email
        )
      : '';


  const companyNameHash =
    companyName
      ? hashCompanyName(
          companyName
        )
      : '';


  const gstHash =
    gst
      ? hashText(
          gst
        )
      : '';


  /* ==========================================================
     MASTER DPR CONTACT RESOLUTION

     Same Contact may have multiple Lead opportunities.
  ========================================================== */

  const contactResolution =
    await resolveOrCreateContact({
      source:
        leadSource,

      name:
        contactPerson,

      companyName,

      country,

      phone:
        mobile,

      phoneVerified:
        payload
          .phoneVerified ===
          true,

      email,

      emailVerified:
        payload
          .emailVerified ===
          true,

      gst,

      gstVerified:
        payload
          .gstVerified ===
          true,

      consent:
        payload.consent ||
        {},

      actorId,
    });


  const resolvedContact =
    contactResolution
      .contact ||
    null;


  /* ==========================================================
     EXACT MASTER DPR RULE-BASED SCORING
  ========================================================== */

  const scoringResult =
    scoreAndClassifyLead({
      truckCount:
        payload.truckCount ??
        payload.trucks ??
        payload.quantityTrucks ??
        payload.requiredTrucks,

      timeline,

      targetDate,

      isImmediateRequirement:
        payload
          .isImmediateRequirement ===
          true,

      withinSevenDays:
        payload
          .withinSevenDays ===
          true ||
        payload
          .within7Days ===
          true,

      isPriorityAServiceableMarket:
        payload
          .isPriorityAServiceableMarket ===
          true ||
        payload
          .priorityAServiceableMarket ===
          true,

      serviceabilityTier:
        payload
          .serviceabilityTier ||
        payload
          .marketTier ||
        payload
          .destinationTier,

      companyName,

      gst,

      gstVerified:
        payload
          .gstVerified ===
          true,

      businessVerificationProvided:
        payload
          .businessVerificationProvided ===
          true ||
        payload
          .businessVerified ===
          true,

      completedPriceCheck:
        payload
          .completedPriceCheck ===
          true ||
        payload
          .priceCheckCompleted ===
          true,

      returnVisit:
        payload
          .returnVisit ===
          true ||
        payload
          .isReturnVisit ===
          true,

      visitCount:
        payload.visitCount ||
        payload
          .sessionVisitCount,

      repeatVisitCount:
        payload
          .repeatVisitCount,
    });


  const {
    score,
    priority,
  } =
    scoringResult;


  /* ==========================================================
     IMMUTABLE LEAD / OPPORTUNITY ID
  ========================================================== */

  const leadCode =
    `LD-${Date.now()}-${crypto
      .randomUUID()
      .slice(
        0,
        8
      )}`;


  /* ==========================================================
     DURABLE LEAD / OPPORTUNITY PERSISTENCE
  ========================================================== */

  const lead =
    await Lead.create({
      leadCode,


      /* ------------------------------------------------------
         CONTACT
      ------------------------------------------------------ */

      contactId:
        resolvedContact
          ?._id ||
        null,


      contactResolution: {
        status:
          contactResolution
            .status ||
          'UNRESOLVED',

        method:
          contactResolution
            .method ||
          'NONE',

        resolvedAt:
          resolvedContact
            ? new Date()
            : null,
      },


      /* ------------------------------------------------------
         SOURCE
      ------------------------------------------------------ */

      source:
        leadSource,

      leadOrigin:
        'AI_AGENT',


      /* ------------------------------------------------------
         CUSTOMER SNAPSHOT
      ------------------------------------------------------ */

      customerName:
        contactPerson,

      companyName,

      companyNameHash,

      phoneEncrypted:
        encryptText(
          mobile
        ),

      phoneMasked:
        maskPhone(
          mobile
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
          ? maskIdentifier(
              gst
            )
          : '',

      gstHash,


      /*
       * Do not duplicate raw contact data in plaintext.
       */
      whatsAppNumber:
        '',

      contactPerson,

      country,


      /* ------------------------------------------------------
         REQUIREMENT
      ------------------------------------------------------ */

      productCategory,

      product,

      productVariant,

      grade,

      specification,

      quantity,

      quantityValue:
        Number.isFinite(
          quantityValue
        )
          ? quantityValue
          : 0,

      quantityUnit:
        cleanText(
          payload.quantityUnit,
          30
        ) ||
        'MT',

      quantityBand:
        cleanText(
          payload.quantityBand,
          100
        ),

      destination,

      timeline,

      targetDate,


      /* ------------------------------------------------------
         ELIGIBILITY
      ------------------------------------------------------ */

      eligibilityStatus:
        cleanText(
          payload
            .eligibilityStatus,
          100
        ) ||
        'NOT_CHECKED',

      eligibilityReason:
        cleanText(
          payload
            .eligibilityReason,
          250
        ),


      /* ------------------------------------------------------
         COMMERCIAL
      ------------------------------------------------------ */

      leadValue:
        numericValue,


      /* ------------------------------------------------------
         DPR SCORING
      ------------------------------------------------------ */

      score,

      priority,


      /* ------------------------------------------------------
         CANONICAL CRM LIFECYCLE
      ------------------------------------------------------ */

      crmStatus:
        'NEW',

      crmStatusChangedAt:
        new Date(),

      crmStatusChangedBy:
        actorId ||
        null,


      /* ------------------------------------------------------
         EXISTING OPERATIONAL PIPELINE
      ------------------------------------------------------ */

      stage:
        'NEW_LEAD',

      stageChangedAt:
        new Date(),

      stageChangedBy:
        actorId ||
        null,


      /*
       * Same Contact may create multiple opportunities.
       *
       * Opportunity-level duplicate suppression is deliberately
       * disabled.
       */
      duplicateOf:
        null,


      chatSummary,


      /* ------------------------------------------------------
         CONSENT SNAPSHOT
      ------------------------------------------------------ */

      consent: {
        contactAllowed:
          payload
            .consent
            ?.contactAllowed ===
          true,

        marketingAllowed:
          payload
            .consent
            ?.marketingAllowed ===
          true,

        privacyVersion:
          cleanText(
            payload
              .consent
              ?.privacyVersion,
            80
          ),

        analyticsAllowed:
          payload
            .consent
            ?.analyticsAllowed ===
          true,

        advertisingAllowed:
          payload
            .consent
            ?.advertisingAllowed ===
          true,

        trackingConsentCapturedAt:
          payload
            .consent
            ?.trackingConsentCapturedAt ||
          null,

        capturedAt:
          payload.consent
            ? new Date()
            : null,
      },


      /* ------------------------------------------------------
         ATTRIBUTION
      ------------------------------------------------------ */

      attribution: {
        utmSource:
          cleanText(
            payload
              .attribution
              ?.utmSource ||
            payload
              .utm_source,
            150
          ),

        utmMedium:
          cleanText(
            payload
              .attribution
              ?.utmMedium ||
            payload
              .utm_medium,
            150
          ),

        utmCampaign:
          cleanText(
            payload
              .attribution
              ?.utmCampaign ||
            payload
              .utm_campaign,
            200
          ),

        utmContent:
          cleanText(
            payload
              .attribution
              ?.utmContent ||
            payload
              .utm_content,
            200
          ),

        utmTerm:
          cleanText(
            payload
              .attribution
              ?.utmTerm ||
            payload
              .utm_term,
            200
          ),

        gclid:
          cleanText(
            payload
              .attribution
              ?.gclid ||
            payload.gclid,
            250
          ),

        fbclid:
          cleanText(
            payload
              .attribution
              ?.fbclid ||
            payload.fbclid,
            250
          ),

        campaignId:
          cleanText(
            payload
              .attribution
              ?.campaignId ||
            payload
              .campaign_id,
            150
          ),

        adSetId:
          cleanText(
            payload
              .attribution
              ?.adSetId ||
            payload
              .adset_id,
            150
          ),

        adId:
          cleanText(
            payload
              .attribution
              ?.adId ||
            payload.ad_id,
            150
          ),

        creativeId:
          cleanText(
            payload
              .attribution
              ?.creativeId ||
            payload
              .creative_id,
            150
          ),

        creative:
          cleanText(
            payload
              .attribution
              ?.creative ||
            payload
              .creative,
            200
          ),

        landingPage:
          cleanText(
            payload
              .attribution
              ?.landingPage ||
            payload
              .landing_page,
            250
          ),

        landingPageType:
          cleanText(
            payload
              .attribution
              ?.landingPageType ||
            payload
              .landing_page_type,
            100
          ),

        analyticsSessionId:
          cleanText(
            payload
              .attribution
              ?.analyticsSessionId ||
            payload
              .analytics_session_id,
            160
          ),
      },


      /*
       * AI-created leads are not website Requirement Builder records.
       *
       * Mark website automation as already complete so the website-specific
       * recovery worker does not accidentally process this Lead.
       */
      automationStatus:
        'COMPLETED',

      automationAttempts:
        0,


      /* ------------------------------------------------------
         CRM SYNC QUEUE
      ------------------------------------------------------ */

      crmSync: {
        status:
          'PENDING',

        attempts:
          0,

        nextAttemptAt:
          null,

        manualRecoveryRequired:
          false,
      },


      /* ------------------------------------------------------
         PRIVACY-SAFE INTERNAL METADATA
      ------------------------------------------------------ */

      originalPayload:
        buildSafeOriginalPayload(
          payload,
          scoringResult,
          contactResolution
        ),


      createdBy:
        actorId,
    });


  /* ==========================================================
     CONTACT OPPORTUNITY SUMMARY
  ========================================================== */

  /*
   * The Lead is already durably persisted.
   *
   * Failure in the summary update must never destroy or invalidate
   * the commercial opportunity.
   */
  if (
    lead.contactId
  ) {
    try {
      await markContactOpportunityCreated(
        lead.contactId,

        {
          source:
            leadSource,

          occurredAt:
            lead.createdAt ||
            new Date(),
        }
      );

    } catch (error) {
      console.warn(
        '[AI Lead] Contact opportunity summary update failed',

        {
          leadId:
            lead._id.toString(),

          error:
            error.message,
        }
      );
    }
  }


  /* ==========================================================
     ACTIVITY LOG
  ========================================================== */

  await LeadActivity.create({
    leadId:
      lead._id,

    actionType:
      'LEAD_CREATED',

    note:
      'Lead created via AI Agent integration',

    actorId,
  });


  /* ==========================================================
     AUDIT LOG
  ========================================================== */

  await recordAudit({
    actorId,

    actionType:
      'AI_LEAD_CREATED',

    entityType:
      'LEAD',

    entityId:
      lead._id.toString(),

    severity:
      contactResolution
        .status ===
      'AMBIGUOUS'
        ? 'MEDIUM'
        : 'LOW',

    metadata: {
      leadCode,

      contactId:
        lead.contactId
          ? lead
              .contactId
              .toString()
          : '',

      contactResolutionStatus:
        contactResolution
          .status ||
        'UNRESOLVED',

      scoringVersion:
        scoringResult
          .scoringVersion,

      score,

      priority,
    },
  });


  /* ==========================================================
     OWNERSHIP / ROUTING
  ========================================================== */

  const routing =
    await autoRouteLead(
      lead
    );


  return {
    leadId:
      lead._id.toString(),

    leadCode:
      lead.leadCode,

    contactId:
      lead.contactId
        ? lead
            .contactId
            .toString()
        : null,

    score:
      lead.score,

    priority:
      lead.priority,

    scoringVersion:
      scoringResult
        .scoringVersion,

    assignedDepartment:
      routing
        .assignedDepartment,

    assignedEmployee:
      routing.assignedTo
        ? routing
            .assignedTo
            .toString()
        : null,

    adminReviewRequired:
      routing
        .adminReviewRequired,
  };
}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  processAiLead,
  parseFlexibleDate,
};