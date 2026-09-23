import { API_URL } from '../config/env';

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 1.6F-A: First-party analytics transport + retry outbox
 *
 * This module deliberately does NOT use axiosInstance because the public
 * analytics endpoint is anonymous and must not inherit employee/customer
 * Authorization headers or portal-session behavior.
 *
 * Privacy / reliability rules:
 * - Only already-sanitized event envelopes should be passed here.
 * - Nothing is queued until the caller confirms analytics consent.
 * - Temporary API/network failures keep the event in a first-party outbox.
 * - Backend event_id uniqueness makes retries idempotent.
 * - No event is deleted from the outbox until the backend confirms success.
 */

const OUTBOX_STORAGE_KEY =
  'ito_analytics_event_outbox_v1';

const MAX_OUTBOX_ITEMS = 200;

const OUTBOX_TTL_MS =
  7 * 24 * 60 * 60 * 1000;

const BASE_RETRY_MS =
  5 * 1000;

const MAX_RETRY_MS =
  5 * 60 * 1000;

const MAX_EXPONENTIAL_STEP = 8;

let flushInFlight = false;


/* =========================================================
   BASIC HELPERS
========================================================= */

function isBrowser() {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}


function cleanString(
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
    .slice(0, maxLength);
}


function safeJsonParse(
  value,
  fallback
) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


function safeStorageGet(key) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}


function safeStorageSet(
  key,
  value
) {
  if (!isBrowser()) {
    return false;
  }

  try {
    window.localStorage.setItem(
      key,
      value
    );

    return true;
  } catch {
    return false;
  }
}


/* =========================================================
   OUTBOX STORAGE
========================================================= */

function readOutbox() {
  const parsed =
    safeJsonParse(
      safeStorageGet(
        OUTBOX_STORAGE_KEY
      ),
      []
    );


  if (!Array.isArray(parsed)) {
    return [];
  }


  const now =
    Date.now();


  return parsed
    .filter((item) => {

      if (
        !item ||
        typeof item !== 'object'
      ) {
        return false;
      }


      if (
        !item.event ||
        typeof item.event !== 'object'
      ) {
        return false;
      }


      if (
        !cleanString(
          item.event.event_id,
          160
        )
      ) {
        return false;
      }


      const createdAt =
        Number(
          item.createdAt || 0
        );


      if (!createdAt) {
        return false;
      }


      return (
        now - createdAt <=
        OUTBOX_TTL_MS
      );
    })
    .slice(
      -MAX_OUTBOX_ITEMS
    );
}


function writeOutbox(items) {

  const safeItems =
    Array.isArray(items)
      ? items.slice(
          -MAX_OUTBOX_ITEMS
        )
      : [];


  return safeStorageSet(
    OUTBOX_STORAGE_KEY,
    JSON.stringify(
      safeItems
    )
  );
}


/* =========================================================
   RETRY TIMING
========================================================= */

function retryDelayFor(
  attempts
) {

  const safeAttempts =
    Math.max(
      0,
      Math.min(
        Number(
          attempts || 0
        ),
        20
      )
    );


  const exponent =
    Math.min(
      safeAttempts,
      MAX_EXPONENTIAL_STEP
    );


  return Math.min(
    BASE_RETRY_MS *
      2 ** exponent,

    MAX_RETRY_MS
  );
}


/* =========================================================
   CLIENT-SIDE PERSISTENCE STATUS
========================================================= */

function getStatusObject() {

  if (!isBrowser()) {
    return null;
  }


  if (
    !window
      .__ITO_ANALYTICS_PERSISTENCE_STATUS__
  ) {

    window
      .__ITO_ANALYTICS_PERSISTENCE_STATUS__ =
      {

        lastSuccessAt:
          null,

        lastFailureAt:
          null,

        lastError:
          null,

        pendingCount:
          0
      };
  }


  return window
    .__ITO_ANALYTICS_PERSISTENCE_STATUS__;
}


function updateStatus(
  patch
) {

  const status =
    getStatusObject();


  if (!status) {
    return;
  }


  Object.assign(
    status,
    patch
  );
}


export function getAnalyticsPersistenceStatus() {

  const status =
    getStatusObject();


  if (!status) {
    return null;
  }


  return {

    ...status,

    pendingCount:
      readOutbox().length
  };
}


/* =========================================================
   RESPONSE VALIDATION
========================================================= */

function isSuccessfulResponse(
  response,
  body
) {

  if (!response.ok) {
    return false;
  }


  if (
    !body ||
    typeof body !== 'object'
  ) {
    return true;
  }


  if (
    body.success === false
  ) {
    return false;
  }


  const persisted =
    body.persisted ??
    body.data?.persisted;


  return (
    persisted !== false
  );
}


/* =========================================================
   BACKEND PERSISTENCE
========================================================= */

async function persistEvent(
  event
) {

  const response =
    await fetch(
      `${API_URL}/analytics/events`,
      {

        method:
          'POST',


        headers: {

          'Content-Type':
            'application/json'
        },


        /**
         * Anonymous analytics endpoint.
         *
         * Do not attach:
         *
         * employee token
         * customer token
         * cookies
         */
        credentials:
          'omit',


        /**
         * Gives the browser a better chance
         * to finish the small request during
         * navigation.
         */
        keepalive:
          true,


        body:
          JSON.stringify(
            event
          )
      }
    );


  let body =
    null;


  try {

    body =
      await response.json();

  } catch {

    body =
      null;
  }


  if (
    !isSuccessfulResponse(
      response,
      body
    )
  ) {

    const error =
      new Error(

        body?.message ||

        `Analytics persistence failed with HTTP ${response.status}.`
      );


    error.status =
      response.status;


    throw error;
  }


  return body;
}


/* =========================================================
   QUEUE EVENT
========================================================= */

/**
 * Queue one sanitized browser analytics event.
 *
 * IMPORTANT:
 *
 * consentGranted=true must only be passed
 * after analytics consent has been granted.
 *
 * This prevents creating analytics storage
 * before consent.
 */
export function queueAnalyticsEvent(
  event,
  {
    consentGranted = false
  } = {}
) {

  if (
    !isBrowser() ||
    !consentGranted
  ) {

    return {

      queued:
        false,

      reason:
        consentGranted
          ? 'BROWSER_UNAVAILABLE'
          : 'CONSENT_NOT_GRANTED'
    };
  }


  const eventId =
    cleanString(
      event?.event_id,
      160
    );


  if (!eventId) {

    return {

      queued:
        false,

      reason:
        'EVENT_ID_REQUIRED'
    };
  }


  const items =
    readOutbox();


  const alreadyQueued =
    items.some(
      (item) =>
        item.event?.event_id ===
        eventId
    );


  if (alreadyQueued) {

    return {

      queued:
        true,

      reused:
        true
    };
  }


  items.push({

    event,

    createdAt:
      Date.now(),

    attempts:
      0,

    nextAttemptAt:
      0,

    lastError:
      null
  });


  const stored =
    writeOutbox(
      items
    );


  updateStatus({

    pendingCount:
      items.length
  });


  return {

    queued:
      stored,

    reused:
      false,

    reason:
      stored
        ? null
        : 'LOCAL_STORAGE_UNAVAILABLE'
  };
}


/* =========================================================
   DIRECT FALLBACK
========================================================= */

/**
 * Immediate fallback used only when
 * localStorage is unavailable.
 *
 * Analytics consent is still mandatory.
 */
export async function persistAnalyticsEventDirect(
  event,
  {
    consentGranted = false
  } = {}
) {

  if (!consentGranted) {

    return {

      persisted:
        false,

      reason:
        'CONSENT_NOT_GRANTED'
    };
  }


  try {

    const body =
      await persistEvent(
        event
      );


    updateStatus({

      lastSuccessAt:
        new Date()
          .toISOString(),

      lastError:
        null
    });


    return {

      persisted:
        true,

      body
    };

  } catch (error) {

    updateStatus({

      lastFailureAt:
        new Date()
          .toISOString(),

      lastError:

        cleanString(
          error?.message,
          250
        ) ||

        'Unknown analytics persistence error'
    });


    throw error;
  }
}


/* =========================================================
   RETRY / OUTBOX FLUSH
========================================================= */

/**
 * Retry queued events.
 *
 * Backend event_id uniqueness makes repeat
 * submissions safe.
 *
 * Example:
 *
 * Browser sends event
 *        ↓
 * MongoDB saves event
 *        ↓
 * HTTP response is lost
 *        ↓
 * Browser retries same event_id
 *        ↓
 * Backend returns existing record
 *
 * No duplicate business event is created.
 */
export async function flushAnalyticsOutbox({
  consentGranted = false,
  force = false
} = {}) {

  if (
    !isBrowser() ||
    !consentGranted ||
    flushInFlight
  ) {

    return (
      getAnalyticsPersistenceStatus()
    );
  }


  if (
    !window.navigator.onLine &&
    !force
  ) {

    return (
      getAnalyticsPersistenceStatus()
    );
  }


  flushInFlight =
    true;


  try {

    const items =
      readOutbox();


    const remaining =
      [];


    const now =
      Date.now();


    for (
      const item
      of items
    ) {

      const nextAttemptAt =
        Number(
          item.nextAttemptAt ||
          0
        );


      if (
        !force &&
        nextAttemptAt > now
      ) {

        remaining.push(
          item
        );

        continue;
      }


      try {

        await persistEvent(
          item.event
        );


        updateStatus({

          lastSuccessAt:
            new Date()
              .toISOString(),

          lastError:
            null
        });

      } catch (error) {

        const attempts =
          Number(
            item.attempts ||
            0
          ) + 1;


        remaining.push({

          ...item,

          attempts,

          nextAttemptAt:

            Date.now() +
            retryDelayFor(
              attempts
            ),

          lastError:

            cleanString(
              error?.message,
              250
            ) ||

            'Unknown analytics persistence error'
        });


        updateStatus({

          lastFailureAt:
            new Date()
              .toISOString(),

          lastError:

            cleanString(
              error?.message,
              250
            ) ||

            'Unknown analytics persistence error'
        });
      }
    }


    writeOutbox(
      remaining
    );


    updateStatus({

      pendingCount:
        remaining.length
    });


    return (
      getAnalyticsPersistenceStatus()
    );

  } finally {

    flushInFlight =
      false;
  }
}


/* =========================================================
   QA / DIAGNOSTICS
========================================================= */

export function getAnalyticsOutboxSize() {

  return (
    readOutbox()
      .length
  );
}