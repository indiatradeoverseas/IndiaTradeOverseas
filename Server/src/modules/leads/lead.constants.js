/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2: CRM / Lead lifecycle constants
 *
 * Canonical DPR CRM lifecycle:
 *
 * NEW
 * → CONTACT_ATTEMPTED
 * → CONTACTED
 * → QUALIFIED
 * → QUOTATION_SENT
 * → NEGOTIATION
 * → WON / LOST
 *
 * IMPORTANT:
 * The existing application contains a richer operational `stage`
 * workflow. We do NOT delete it because existing CRM screens and
 * operational workflows depend on it.
 *
 * Instead, Phase 2 introduces the canonical `crmStatus` lifecycle
 * and maps the richer operational stages into it.
 */


/* ============================================================
   CANONICAL MASTER DPR CRM STATUS
============================================================ */

const CRM_STATUS = Object.freeze({
  NEW: 'NEW',

  CONTACT_ATTEMPTED:
    'CONTACT_ATTEMPTED',

  CONTACTED:
    'CONTACTED',

  QUALIFIED:
    'QUALIFIED',

  QUOTATION_SENT:
    'QUOTATION_SENT',

  NEGOTIATION:
    'NEGOTIATION',

  WON:
    'WON',

  LOST:
    'LOST',
});


const CRM_STATUSES = Object.freeze(
  Object.values(
    CRM_STATUS
  )
);


/* ============================================================
   MASTER DPR MANDATORY LOST REASONS
============================================================ */

const LOST_REASON = Object.freeze({
  PRICE:
    'PRICE',

  FREIGHT:
    'FREIGHT',

  COMPETITOR:
    'COMPETITOR',

  UNSUPPORTED_DESTINATION:
    'UNSUPPORTED_DESTINATION',

  QUANTITY_TOO_LOW:
    'QUANTITY_TOO_LOW',

  PRODUCT_UNAVAILABLE:
    'PRODUCT_UNAVAILABLE',

  NO_RESPONSE:
    'NO_RESPONSE',

  INVALID_CONTACT:
    'INVALID_CONTACT',

  TIMING:
    'TIMING',

  PAYMENT_TERMS:
    'PAYMENT_TERMS',

  TRUST_CONCERN:
    'TRUST_CONCERN',

  OTHER:
    'OTHER',
});


const LOST_REASONS = Object.freeze(
  Object.values(
    LOST_REASON
  )
);


const LOST_REASON_LABELS =
  Object.freeze({
    [LOST_REASON.PRICE]:
      'Price',

    [LOST_REASON.FREIGHT]:
      'Freight',

    [LOST_REASON.COMPETITOR]:
      'Competitor',

    [LOST_REASON.UNSUPPORTED_DESTINATION]:
      'Unsupported destination',

    [LOST_REASON.QUANTITY_TOO_LOW]:
      'Quantity too low',

    [LOST_REASON.PRODUCT_UNAVAILABLE]:
      'Product unavailable',

    [LOST_REASON.NO_RESPONSE]:
      'No response',

    [LOST_REASON.INVALID_CONTACT]:
      'Invalid contact',

    [LOST_REASON.TIMING]:
      'Timing',

    [LOST_REASON.PAYMENT_TERMS]:
      'Payment terms',

    [LOST_REASON.TRUST_CONCERN]:
      'Trust concern',

    [LOST_REASON.OTHER]:
      'Other',
  });


/* ============================================================
   EXISTING APPLICATION COMPATIBILITY
============================================================ */

/**
 * Legacy/operational "won" stages used by the working application.
 *
 * Keep the latest-main values because existing dashboards,
 * reporting and downstream operational logic can depend on them.
 *
 * This list is intentionally separate from the canonical
 * Master DPR `crmStatus` lifecycle.
 */
const WON_STAGES =
  Object.freeze([
    'ORDER_CONFIRMED',
    'DISPATCH_PENDING',
    'DISPATCH_PLANNED',
    'PAYMENT_PENDING',
    'DOCUMENT_PENDING',

    'CLOSED_WON',
    'DEAL_WON',

    // Canonical DPR compatibility.
    'WON',
  ]);


const LOST_STAGES =
  Object.freeze([
    'CLOSED_LOST',
    'DEAL_LOST',

    // Canonical DPR compatibility.
    'LOST',
  ]);


/* ============================================================
   OPERATIONAL STAGE → DPR CRM STATUS
============================================================ */

/**
 * Existing operational workflow is more detailed than the
 * Master DPR management lifecycle.
 *
 * This mapping is deliberately independent of WON_STAGES /
 * LOST_STAGES. Those arrays preserve legacy application
 * compatibility while crmStatus remains the canonical DPR
 * management lifecycle.
 */
const STAGE_TO_CRM_STATUS =
  Object.freeze({

    /* --------------------------------------------------------
       NEW
    -------------------------------------------------------- */

    NEW_LEAD:
      CRM_STATUS.NEW,

    ASSIGNED:
      CRM_STATUS.NEW,


    /* --------------------------------------------------------
       CONTACT ATTEMPTED
    -------------------------------------------------------- */

    CONTACT_ATTEMPTED:
      CRM_STATUS.CONTACT_ATTEMPTED,

    FOLLOW_UP:
      CRM_STATUS.CONTACT_ATTEMPTED,


    /* --------------------------------------------------------
       CONTACTED
    -------------------------------------------------------- */

    CONTACTED:
      CRM_STATUS.CONTACTED,


    /* --------------------------------------------------------
       QUALIFIED
    -------------------------------------------------------- */

    LEAD_QUALIFICATION:
      CRM_STATUS.QUALIFIED,

    REQUIREMENT_CAPTURED:
      CRM_STATUS.QUALIFIED,

    REQUIREMENT_RECEIVED:
      CRM_STATUS.QUALIFIED,

    QUOTATION_REQUIRED:
      CRM_STATUS.QUALIFIED,

    QUOTATION_PENDING_APPROVAL:
      CRM_STATUS.QUALIFIED,

    QUOTATION_APPROVED:
      CRM_STATUS.QUALIFIED,

    QUOTATION_REQUESTED:
      CRM_STATUS.QUALIFIED,

    SAMPLE_SENT:
      CRM_STATUS.QUALIFIED,


    /* --------------------------------------------------------
       QUOTATION SENT
    -------------------------------------------------------- */

    QUOTATION_SHARED:
      CRM_STATUS.QUOTATION_SENT,

    QUOTATION_SENT:
      CRM_STATUS.QUOTATION_SENT,


    /* --------------------------------------------------------
       NEGOTIATION / POST-QUOTE OPERATIONAL PIPELINE
    -------------------------------------------------------- */

    NEGOTIATION:
      CRM_STATUS.NEGOTIATION,

    PRICE_DISCUSSION:
      CRM_STATUS.NEGOTIATION,

    PAYMENT_DISCUSSION:
      CRM_STATUS.NEGOTIATION,

    LOI_PO_PENDING:
      CRM_STATUS.NEGOTIATION,

    PO_RECEIVED:
      CRM_STATUS.NEGOTIATION,

    ORDER_CONFIRMED:
      CRM_STATUS.NEGOTIATION,

    DISPATCH_PENDING:
      CRM_STATUS.NEGOTIATION,

    DISPATCH_PLANNED:
      CRM_STATUS.NEGOTIATION,

    PAYMENT_PENDING:
      CRM_STATUS.NEGOTIATION,

    DOCUMENT_PENDING:
      CRM_STATUS.NEGOTIATION,

    DELIVERED:
      CRM_STATUS.NEGOTIATION,

    COMPLETED:
      CRM_STATUS.NEGOTIATION,


    /* --------------------------------------------------------
       WON
    -------------------------------------------------------- */

    CLOSED_WON:
      CRM_STATUS.WON,

    DEAL_WON:
      CRM_STATUS.WON,

    WON:
      CRM_STATUS.WON,


    /* --------------------------------------------------------
       LOST
    -------------------------------------------------------- */

    CLOSED_LOST:
      CRM_STATUS.LOST,

    DEAL_LOST:
      CRM_STATUS.LOST,

    LOST:
      CRM_STATUS.LOST,
  });


/* ============================================================
   STATUS NORMALIZATION
============================================================ */

function normalizeCrmStatus(
  value
) {
  const normalized =
    String(
      value || ''
    )
      .trim()
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        '_'
      );


  if (
    CRM_STATUSES.includes(
      normalized
    )
  ) {
    return normalized;
  }


  return (
    STAGE_TO_CRM_STATUS[
      normalized
    ] ||
    null
  );
}


/**
 * Convert existing operational stage into the canonical DPR
 * CRM lifecycle status.
 */
function crmStatusFromStage(
  stage
) {
  return (
    normalizeCrmStatus(
      stage
    ) ||
    CRM_STATUS.NEW
  );
}


/* ============================================================
   LOST-REASON NORMALIZATION
============================================================ */

function normalizeLostReason(
  value
) {
  const normalized =
    String(
      value || ''
    )
      .trim()
      .toUpperCase()

      .replace(
        /&/g,
        'AND'
      )

      .replace(
        /[^A-Z0-9]+/g,
        '_'
      )

      .replace(
        /^_+|_+$/g,
        ''
      );


  if (
    LOST_REASONS.includes(
      normalized
    )
  ) {
    return normalized;
  }


  return null;
}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  CRM_STATUS,

  CRM_STATUSES,

  LOST_REASON,

  LOST_REASONS,

  LOST_REASON_LABELS,

  WON_STAGES,

  LOST_STAGES,

  STAGE_TO_CRM_STATUS,

  normalizeCrmStatus,

  crmStatusFromStage,

  normalizeLostReason,
};