const {
  recordAnalyticsEvent
} = require('./analyticsEvent.service');

const { ok, fail } = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 1: Public browser analytics ingestion controller
 *
 * Purpose:
 * - Accept only browser-safe, pre-persistence funnel events.
 * - Persist them into the first-party AnalyticsEvent ledger.
 * - Reject browser attempts to manufacture trusted commercial outcomes.
 * - Never accept a browser-supplied Lead ID or enable Meta CAPI queueing.
 * - Keep analytics failures isolated from the main lead-persistence flow.
 *
 * IMPORTANT:
 * The canonical event `lead_created` is intentionally NOT accepted here.
 * It must be emitted by trusted backend code only after a Lead has been
 * durably persisted in MongoDB.
 */

const PUBLIC_BROWSER_EVENTS = Object.freeze(
  new Set([
    'landing_page_view',
    'view_product',
    'start_requirement',
    'select_product',
    'select_quantity',
    'enter_destination',
    'select_timeline',
    'eligibility_checked',
    'view_soft_gate',
    'submit_phone'
  ])
);

const MAX_REQUEST_BYTES = 32 * 1024;


/* ============================================================
   BASIC HELPERS
============================================================ */

function cleanText(value, maxLength = 250) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}


function getApproximateBodySize(body) {
  try {
    return Buffer.byteLength(
      JSON.stringify(body || {}),
      'utf8'
    );
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}


/* ============================================================
   EVENT NAME NORMALIZATION
============================================================ */

function normalizePublicEventName(body = {}) {
  const eventName = cleanText(
    body.eventName ||
      body.event_name ||
      body.event,
    100
  );

  /**
   * Temporary migration compatibility.
   *
   * Earlier Phase 1 frontend builds used:
   *
   * landing_page_viewed
   *
   * The exact Master DPR v4.0 canonical event name is:
   *
   * landing_page_view
   *
   * This normalization prevents already-queued browser events from
   * being lost during deployment while ensuring MongoDB stores only
   * the canonical DPR event name.
   */
  if (
    eventName ===
    'landing_page_viewed'
  ) {
    return 'landing_page_view';
  }

  return eventName;
}


/* ============================================================
   SAFE PUBLIC EVENT CONSTRUCTION
============================================================ */

function buildPublicEventInput(
  body = {},
  normalizedEventName = ''
) {
  /**
   * Deliberately construct a fresh object instead of forwarding req.body.
   *
   * This prevents unexpected browser-controlled fields such as:
   *
   * - leadId
   * - leadCode
   * - eventSource = SERVER / CRM
   * - delivery status
   * - Meta CAPI flags
   * - arbitrary database fields
   *
   * from reaching the persistence service.
   */
  return {
    eventId:
      body.eventId ||
      body.event_id,

    eventName:
      normalizedEventName ||
      body.eventName ||
      body.event_name ||
      body.event,

    eventSource:
      'WEB',

    occurredAt:
      body.occurredAt ||
      body.occurred_at ||
      body.eventTimestamp ||
      body.event_timestamp,

    analyticsSessionId:
      body.analyticsSessionId ||
      body.analytics_session_id,

    submissionId:
      body.submissionId ||
      body.submission_id,


    /* ========================================================
       ATTRIBUTION
    ======================================================== */

    attribution:
      body.attribution &&
      typeof body.attribution ===
        'object' &&
      !Array.isArray(
        body.attribution
      )
        ? body.attribution

        : {
            utm_source:
              body.utm_source,

            utm_medium:
              body.utm_medium,

            utm_campaign:
              body.utm_campaign,

            utm_content:
              body.utm_content,

            utm_term:
              body.utm_term,

            gclid:
              body.gclid,

            fbclid:
              body.fbclid,

            campaign_id:
              body.campaign_id,

            adset_id:
              body.adset_id,

            creative_id: body.creative_id,
            ad_id:
              body.ad_id
          },


    /* ========================================================
       PAGE CONTEXT
    ======================================================== */

    page:
      body.page &&
      typeof body.page ===
        'object' &&
      !Array.isArray(
        body.page
      )
        ? body.page

        : {
            page_path:
              body.page_path,

            page_type:
              body.page_type,

            landing_page_type:
              body.landing_page_type
          },


    /* ========================================================
       BUSINESS / FUNNEL CONTEXT
    ======================================================== */

    business:
      body.business &&
      typeof body.business ===
        'object' &&
      !Array.isArray(
        body.business
      )
        ? body.business

        : {
            vertical:
              body.vertical,

            product_category:
              body.product_category,

            product_code:
              body.product_code,

            quantity_band:
              body.quantity_band,

            timeline_band:
              body.timeline_band,

            eligibility_status:
              body.eligibility_status,

            lead_priority:
              body.lead_priority
          },


    /* ========================================================
       SAFE EXTENSION PROPERTIES
    ======================================================== */

    properties:
      body.properties &&
      typeof body.properties ===
        'object' &&
      !Array.isArray(
        body.properties
      )
        ? body.properties
        : {}
  };
}


/* ============================================================
   PUBLIC BROWSER INGESTION
============================================================ */

/**
 * POST /api/analytics/events
 *
 * Public endpoint for privacy-safe browser funnel events only.
 */
async function ingestBrowserEvent(
  req,
  res,
  next
) {
  try {
    const bodySize =
      getApproximateBodySize(
        req.body
      );


    /* ========================================================
       PAYLOAD SIZE PROTECTION
    ======================================================== */

    if (
      bodySize >
      MAX_REQUEST_BYTES
    ) {
      return fail(
        res,
        413,
        'ANALYTICS_PAYLOAD_TOO_LARGE',
        'Analytics event payload is too large.'
      );
    }


    /* ========================================================
       CANONICAL EVENT NAME
    ======================================================== */

    const eventName =
      normalizePublicEventName(
        req.body
      );


    if (!eventName) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'eventName is required.'
      );
    }


    /* ========================================================
       TRUST BOUNDARY
    ======================================================== */

    if (
      !PUBLIC_BROWSER_EVENTS.has(
        eventName
      )
    ) {
      /**
       * Browser attempts to manufacture commercial outcomes are
       * intentionally rejected.
       *
       * Browser must never be trusted to claim:
       *
       * lead_created
       * qualification_completed
       * qualified_lead
       * quote_created
       * quote_sent
       * order_won
       * purchase
       * repeat_order
       */
      logger.warn(
        '[Analytics] Browser attempted restricted commercial event',
        {
          eventName,

          analyticsSessionId:
            cleanText(
              req.body
                ?.analytics_session_id ||
              req.body
                ?.analyticsSessionId,
              160
            )
        }
      );


      return fail(
        res,
        403,
        'ANALYTICS_EVENT_NOT_ALLOWED',
        'This event can only be created by a trusted server workflow.'
      );
    }


    /* ========================================================
       SAFE EVENT INPUT
    ======================================================== */

    const input =
      buildPublicEventInput(
        req.body,
        eventName
      );


    /* ========================================================
       FIRST-PARTY EVENT PERSISTENCE
    ======================================================== */

    const {
      event,
      reused
    } =
      await recordAnalyticsEvent(
        input,
        {
          /**
           * Public browser ingestion can NEVER queue trusted
           * server-side conversion destinations such as Meta CAPI.
           */
          queueMetaCapi:
            false
        }
      );


    /* ========================================================
       SUCCESS RESPONSE
    ======================================================== */

    return ok(
      res,
      {
        eventId:
          event.eventId,

        eventName:
          event.eventName,

        persisted:
          true,

        reused:
          !!reused,

        occurredAt:
          event.occurredAt
      },

      reused
        ? 'Analytics event already persisted.'
        : 'Analytics event persisted.',

      reused
        ? 200
        : 201,

      req
    );

  } catch (error) {
    /* ========================================================
       KNOWN VALIDATION ERRORS
    ======================================================== */

    if (
      error?.code ===
        'ANALYTICS_VALIDATION_FAILED' ||

      error?.code ===
        'ANALYTICS_EVENT_NOT_CANONICAL'
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        error.message
      );
    }


    /**
     * Duplicate-key races are resolved inside analyticsEvent.service.
     *
     * Anything reaching this point is an actual persistence/runtime
     * failure and must remain visible to the normal server error
     * pipeline rather than being silently swallowed.
     */
    return next(error);
  }
}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  ingestBrowserEvent,
  PUBLIC_BROWSER_EVENTS
};