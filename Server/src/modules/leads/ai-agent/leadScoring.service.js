/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.6: Rule-based lead scoring
 *
 * Master DPR scoring table:
 * - 10+ trucks                              +30
 * - 6–10 trucks                             +25
 * - 2–5 trucks                              +15
 * - Immediate requirement                   +20
 * - Within 7 days                           +15
 * - Priority-A serviceable market           +20
 * - Company provided                        +5
 * - GST/business verification provided      +5
 * - Completed price check                   +10
 * - Return visit                            +5
 *
 * Classification:
 * - 80+     HOT
 * - 60–79   WARM
 * - 40–59   NURTURE
 * - <40     LOW
 *
 * Important:
 * The DPR explicitly says these first weights are illustrative and should
 * later be recalibrated using actual won/lost data. This service therefore
 * keeps the scoring rule-set versioned and isolated from the rest of CRM.
 */

const DPR_SCORING_VERSION =
  'MASTER_DPR_V4_RULES_V1';

const DPR_SCORE_WEIGHTS = Object.freeze({
  TRUCKS_10_PLUS: 30,
  TRUCKS_6_TO_9: 25,
  TRUCKS_2_TO_5: 15,

  IMMEDIATE_REQUIREMENT: 20,
  WITHIN_7_DAYS: 15,

  PRIORITY_A_SERVICEABLE_MARKET: 20,

  COMPANY_PROVIDED: 5,
  GST_OR_BUSINESS_VERIFICATION_PROVIDED: 5,

  COMPLETED_PRICE_CHECK: 10,
  RETURN_VISIT: 5,
});

const CLASSIFICATION_ACTION = Object.freeze({
  HOT: 'Immediate priority',

  WARM:
    'Fast sales follow-up',

  NURTURE:
    'Automated + scheduled follow-up',

  LOW:
    'Low-priority review / nurture',
});


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


function toFiniteNumber(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value ===
    'number'
  ) {
    return Number.isFinite(
      value
    )
      ? value
      : null;
  }

  const parsed =
    Number(
      String(value)
        .replace(
          /,/g,
          ''
        )
        .replace(
          /[^0-9.-]/g,
          ''
        )
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}


function toValidDate(
  value
) {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value;
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}


/* ============================================================
   TRUCK QUANTITY
============================================================ */

function resolveTruckCount(
  leadData = {}
) {
  const candidates = [
    leadData.truckCount,
    leadData.trucks,
    leadData.quantityTrucks,
    leadData.requiredTrucks,
  ];

  for (
    const candidate
    of candidates
  ) {
    const numeric =
      toFiniteNumber(
        candidate
      );

    if (
      numeric !== null &&
      numeric >= 0
    ) {
      return numeric;
    }
  }

  /**
   * IMPORTANT:
   *
   * We deliberately do NOT convert MT/tonnage into trucks here.
   *
   * Master DPR does not define a universal MT-per-truck conversion.
   * Product/logistics-specific conversion must therefore be supplied
   * explicitly by the relevant business rules when available.
   */
  return null;
}


/* ============================================================
   TIMELINE
============================================================ */

function resolveImmediateRequirement(
  leadData = {}
) {
  if (
    leadData.isImmediateRequirement ===
      true ||
    leadData.immediateRequirement ===
      true
  ) {
    return true;
  }

  const timeline =
    cleanText(
      leadData.timeline ||
      leadData.purchaseTimeline,
      120
    ).toLowerCase();

  return (
    timeline.includes(
      'immediate'
    ) ||
    timeline.includes(
      'urgent'
    ) ||
    timeline.includes(
      'asap'
    ) ||
    timeline.includes(
      'today'
    )
  );
}


function resolveWithinSevenDays(
  leadData = {}
) {
  if (
    leadData.withinSevenDays ===
      true ||
    leadData.within7Days ===
      true
  ) {
    return true;
  }

  const timeline =
    cleanText(
      leadData.timeline ||
      leadData.purchaseTimeline,
      120
    ).toLowerCase();

  if (
    /within\s*7\s*days?/.test(
      timeline
    ) ||
    /within\s*one\s*week/.test(
      timeline
    ) ||
    /1\s*week/.test(
      timeline
    )
  ) {
    return true;
  }

  const targetDate =
    toValidDate(
      leadData.targetDate
    );

  if (!targetDate) {
    return false;
  }

  const now =
    new Date();

  const diffMs =
    targetDate.getTime() -
    now.getTime();

  if (diffMs < 0) {
    return false;
  }

  const diffDays =
    diffMs /
    (
      1000 *
      60 *
      60 *
      24
    );

  return diffDays <= 7;
}


/* ============================================================
   SERVICEABILITY
============================================================ */

function resolvePriorityAMarket(
  leadData = {}
) {
  if (
    leadData.isPriorityAServiceableMarket ===
      true ||
    leadData.priorityAServiceableMarket ===
      true
  ) {
    return true;
  }

  const tier =
    cleanText(
      leadData.serviceabilityTier ||
      leadData.marketTier ||
      leadData.destinationTier,
      80
    )
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        '_'
      );

  return [
    'PRIORITY_A',
    'PRIORITY_A_SERVICEABLE',
    'A',
  ].includes(tier);
}


/* ============================================================
   COMPANY
============================================================ */

function resolveCompanyProvided(
  leadData = {}
) {
  return Boolean(
    cleanText(
      leadData.companyName ||
      leadData.company,
      200
    )
  );
}


/* ============================================================
   GST / BUSINESS VERIFICATION
============================================================ */

function resolveBusinessVerificationProvided(
  leadData = {}
) {
  if (
    leadData.gstProvided ===
      true ||
    leadData.gstVerified ===
      true ||
    leadData.businessVerificationProvided ===
      true ||
    leadData.businessVerified ===
      true
  ) {
    return true;
  }

  return Boolean(
    cleanText(
      leadData.gst ||
      leadData.gstin ||
      leadData.gstNumber,
      80
    )
  );
}


/* ============================================================
   PRICE CHECK
============================================================ */

function resolveCompletedPriceCheck(
  leadData = {}
) {
  return (
    leadData.completedPriceCheck ===
      true ||
    leadData.priceCheckCompleted ===
      true
  );
}


/* ============================================================
   RETURN VISIT
============================================================ */

function resolveReturnVisit(
  leadData = {}
) {
  if (
    leadData.returnVisit ===
      true ||
    leadData.isReturnVisit ===
      true
  ) {
    return true;
  }

  const visitCount =
    toFiniteNumber(
      leadData.visitCount ||
      leadData.sessionVisitCount
    );

  if (
    visitCount !== null &&
    visitCount > 1
  ) {
    return true;
  }

  const repeatVisitCount =
    toFiniteNumber(
      leadData.repeatVisitCount
    );

  return (
    repeatVisitCount !== null &&
    repeatVisitCount > 0
  );
}


/* ============================================================
   CLASSIFICATION
============================================================ */

function classifyScore(
  score
) {
  if (score >= 80) {
    return 'HOT';
  }

  if (score >= 60) {
    return 'WARM';
  }

  if (score >= 40) {
    return 'NURTURE';
  }

  return 'LOW';
}


function addBreakdown(
  breakdown,
  factor,
  points,
  matched,
  details = {}
) {
  breakdown.push({
    factor,

    points:
      matched
        ? points
        : 0,

    matched:
      matched === true,

    ...details,
  });
}


/* ============================================================
   MASTER DPR SCORE ENGINE
============================================================ */

function scoreAndClassifyLead(
  leadData = {}
) {
  let score = 0;

  const breakdown = [];


  /* ========================================================
     1. TRUCK QUANTITY
  ======================================================== */

  const truckCount =
    resolveTruckCount(
      leadData
    );

  let truckPoints = 0;

  let truckFactor =
    'Truck quantity below scored DPR band / not supplied';


  if (
    truckCount !== null &&
    truckCount >= 10
  ) {
    truckPoints =
      DPR_SCORE_WEIGHTS
        .TRUCKS_10_PLUS;

    truckFactor =
      '10+ trucks';

  } else if (
    truckCount !== null &&
    truckCount >= 6
  ) {
    truckPoints =
      DPR_SCORE_WEIGHTS
        .TRUCKS_6_TO_9;

    truckFactor =
      '6–10 trucks';

  } else if (
    truckCount !== null &&
    truckCount >= 2
  ) {
    truckPoints =
      DPR_SCORE_WEIGHTS
        .TRUCKS_2_TO_5;

    truckFactor =
      '2–5 trucks';
  }


  score += truckPoints;


  addBreakdown(
    breakdown,
    truckFactor,
    truckPoints,
    truckPoints > 0,
    {
      truckCount,
    }
  );


  /* ========================================================
     2. PURCHASE TIMELINE

     Immediate and Within 7 days are mutually exclusive.
     Immediate receives the higher DPR score.
  ======================================================== */

  const immediateRequirement =
    resolveImmediateRequirement(
      leadData
    );


  const withinSevenDays =
    !immediateRequirement &&
    resolveWithinSevenDays(
      leadData
    );


  if (
    immediateRequirement
  ) {
    score +=
      DPR_SCORE_WEIGHTS
        .IMMEDIATE_REQUIREMENT;
  }


  addBreakdown(
    breakdown,

    'Immediate requirement',

    DPR_SCORE_WEIGHTS
      .IMMEDIATE_REQUIREMENT,

    immediateRequirement
  );


  if (
    withinSevenDays
  ) {
    score +=
      DPR_SCORE_WEIGHTS
        .WITHIN_7_DAYS;
  }


  addBreakdown(
    breakdown,

    'Within 7 days',

    DPR_SCORE_WEIGHTS
      .WITHIN_7_DAYS,

    withinSevenDays
  );


  /* ========================================================
     3. PRIORITY-A SERVICEABLE MARKET
  ======================================================== */

  const priorityAMarket =
    resolvePriorityAMarket(
      leadData
    );


  if (
    priorityAMarket
  ) {
    score +=
      DPR_SCORE_WEIGHTS
        .PRIORITY_A_SERVICEABLE_MARKET;
  }


  addBreakdown(
    breakdown,

    'Priority-A serviceable market',

    DPR_SCORE_WEIGHTS
      .PRIORITY_A_SERVICEABLE_MARKET,

    priorityAMarket
  );


  /* ========================================================
     4. COMPANY PROVIDED
  ======================================================== */

  const companyProvided =
    resolveCompanyProvided(
      leadData
    );


  if (
    companyProvided
  ) {
    score +=
      DPR_SCORE_WEIGHTS
        .COMPANY_PROVIDED;
  }


  addBreakdown(
    breakdown,

    'Company provided',

    DPR_SCORE_WEIGHTS
      .COMPANY_PROVIDED,

    companyProvided
  );


  /* ========================================================
     5. GST / BUSINESS VERIFICATION
  ======================================================== */

  const businessVerificationProvided =
    resolveBusinessVerificationProvided(
      leadData
    );


  if (
    businessVerificationProvided
  ) {
    score +=
      DPR_SCORE_WEIGHTS
        .GST_OR_BUSINESS_VERIFICATION_PROVIDED;
  }


  addBreakdown(
    breakdown,

    'GST/business verification provided',

    DPR_SCORE_WEIGHTS
      .GST_OR_BUSINESS_VERIFICATION_PROVIDED,

    businessVerificationProvided
  );


  /* ========================================================
     6. COMPLETED PRICE CHECK
  ======================================================== */

  const completedPriceCheck =
    resolveCompletedPriceCheck(
      leadData
    );


  if (
    completedPriceCheck
  ) {
    score +=
      DPR_SCORE_WEIGHTS
        .COMPLETED_PRICE_CHECK;
  }


  addBreakdown(
    breakdown,

    'Completed price check',

    DPR_SCORE_WEIGHTS
      .COMPLETED_PRICE_CHECK,

    completedPriceCheck
  );


  /* ========================================================
     7. RETURN VISIT
  ======================================================== */

  const returnVisit =
    resolveReturnVisit(
      leadData
    );


  if (
    returnVisit
  ) {
    score +=
      DPR_SCORE_WEIGHTS
        .RETURN_VISIT;
  }


  addBreakdown(
    breakdown,

    'Return visit',

    DPR_SCORE_WEIGHTS
      .RETURN_VISIT,

    returnVisit
  );


  /* ========================================================
     FINAL SCORE
  ======================================================== */

  score =
    Math.max(
      0,
      Math.min(
        100,
        score
      )
    );


  const priority =
    classifyScore(
      score
    );


  return {
    score,

    priority,

    classification:
      priority,

    action:
      CLASSIFICATION_ACTION[
        priority
      ],

    breakdown,

    scoringVersion:
      DPR_SCORING_VERSION,
  };
}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  scoreAndClassifyLead,

  classifyScore,

  DPR_SCORE_WEIGHTS,

  DPR_SCORING_VERSION,

  CLASSIFICATION_ACTION,
};