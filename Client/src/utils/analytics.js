// Thin wrapper around window.dataLayer so GTM (GTM-MZKBG5Z5, loaded in index.html)
// receives events. GTM reads dataLayer.push(), not window.gtag() — this project has
// no separate gtag.js include, so any tag that only calls window.gtag() is a no-op.

const ATTRIBUTION_STORAGE_KEY = 'ito_first_party_attribution';
const ANALYTICS_SESSION_KEY = 'ito_analytics_session_id';

const ATTRIBUTION_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
];

function safeLocalStorageGet(key) {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function readStoredAttribution() {
  const stored = safeLocalStorageGet(ATTRIBUTION_STORAGE_KEY);

  if (!stored) return {};

  try {
    const parsed = JSON.parse(stored);

    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

export function getStoredAttribution() {
  return readStoredAttribution();
}

export function getOrCreateAnalyticsSessionId() {
  if (typeof window === 'undefined') return null;

  const existing = safeLocalStorageGet(ANALYTICS_SESSION_KEY);

  if (existing) {
    return existing;
  }

  let sessionId;

  if (
    typeof crypto !== 'undefined' &&
    crypto.randomUUID
  ) {
    sessionId = crypto.randomUUID();
  } else {
    sessionId = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 12)}`;
  }

  safeLocalStorageSet(
    ANALYTICS_SESSION_KEY,
    sessionId
  );

  return sessionId;
}

export function captureFirstPartyAttribution() {
  if (typeof window === 'undefined') return {};

  const urlParams = new URLSearchParams(
    window.location.search
  );

  const existing = readStoredAttribution();

  const incoming = {};

  ATTRIBUTION_PARAMS.forEach((key) => {
    const value = urlParams.get(key);

    if (value) {
      incoming[key] = value.slice(0, 500);
    }
  });

  // First-touch attribution:
  // Once an attribution value has been captured, don't overwrite it
  // with values from later pages/sessions.
  const merged = {
    ...incoming,
    ...existing,
  };

  if (Object.keys(merged).length > 0) {
    safeLocalStorageSet(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(merged)
    );
  }

  return merged;
}

export function getFirstPartyAttribution() {
  return readStoredAttribution();
}

export function getAnalyticsContext() {
  return {
    ...getFirstPartyAttribution(),
    analytics_session_id:
      getOrCreateAnalyticsSessionId(),
  };
}

export function pushDataLayerEvent(
  event,
  payload = {}
) {
  if (typeof window === 'undefined') return;

  captureFirstPartyAttribution();

  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    event,
    ...getAnalyticsContext(),
    ...payload,
  });
}

// -----------------------------------------------------------------------------
// GENERIC SITE ACTIVITY TRACKING
// -----------------------------------------------------------------------------
//
// Site-wide delegated click + form-submit + input-change capture.
//
// These generic events are diagnostic / activity events:
//
// - site_click
// - site_form_submit
// - site_input_change
//
// DPR-specific conversion/business events such as:
//
// - start_requirement
// - select_product
// - select_quantity
// - submit_phone
// - lead_created
//
// must be pushed separately at their actual business-success points.
//
// Generic activity tracking must NOT be interpreted as proof that a lead,
// quotation, order or other business conversion succeeded.
//
// `[class*="cursor-pointer"]` is included because this codebase consistently
// marks custom clickable <div>/<label> elements (expandable cards,
// file-upload dropzones) with that class.

const CLICKABLE_SELECTOR =
  'button, a, [role="button"], input[type="submit"], input[type="button"], summary, [class*="cursor-pointer"]';

// -----------------------------------------------------------------------------
// PRIVACY-SAFE LINK TRACKING
// -----------------------------------------------------------------------------
//
// Never place full URLs into analytics automatically.
//
// Full URLs can contain:
// - email addresses
// - phone numbers
// - WhatsApp text
// - tokens
// - user identifiers
// - query parameters carrying PII
//
// Internal links:
//   Store pathname only.
//
// External http/https links:
//   Store origin only.
//
// mailto:, tel:, sms:, whatsapp-specific protocols, etc.:
//   Do not store their destination/value.

function getSafeClickUrl(target) {
  if (
    typeof window === 'undefined' ||
    target.tagName !== 'A'
  ) {
    return undefined;
  }

  const href = target.getAttribute('href');

  if (!href) return undefined;

  try {
    const url = new URL(
      href,
      window.location.origin
    );

    // Internal website link.
    // Keep pathname only — no query string and no hash.
    if (
      (url.protocol === 'http:' ||
        url.protocol === 'https:') &&
      url.origin === window.location.origin
    ) {
      return url.pathname;
    }

    // External http/https link.
    // Keep origin only.
    if (
      url.protocol === 'http:' ||
      url.protocol === 'https:'
    ) {
      return url.origin;
    }

    // Do not expose mailto:, tel:, sms: or similar URI content.
    return undefined;
  } catch {
    return undefined;
  }
}

function describeClickTarget(el) {
  const target = el.closest
    ? el.closest(CLICKABLE_SELECTOR)
    : null;

  if (!target) return null;

  // Do not automatically send visible innerText.
  //
  // Developers can deliberately provide a safe analytics label:
  //
  // data-analytics-label="request_quote"
  //
  // This avoids accidentally transmitting user names,
  // email addresses, phone numbers or dynamically generated text.
  const analyticsLabel =
    target.getAttribute(
      'data-analytics-label'
    );

  return {
    click_text:
      analyticsLabel || undefined,

    click_id:
      target.id || undefined,

    click_tag:
      target.tagName.toLowerCase(),

    click_url:
      getSafeClickUrl(target),
  };
}

let activityTrackingBound = false;

// Idempotent:
// Safe to call more than once, including React StrictMode behavior.
// Event listeners are attached only once per page load.

export function initActivityTracking() {
  if (
    typeof document === 'undefined' ||
    activityTrackingBound
  ) {
    return;
  }

  activityTrackingBound = true;

  captureFirstPartyAttribution();
  getOrCreateAnalyticsSessionId();

  // ---------------------------------------------------------------------------
  // CLICK TRACKING
  // ---------------------------------------------------------------------------

  document.addEventListener(
    'click',
    (e) => {
      // <label><input type="file"/></label> forwards a second synthetic click
      // to the hidden file input after the actual click occurs on the label.
      //
      // Skip that synthetic input click so one user action does not generate
      // two site_click events.

      if (
        e.target.tagName === 'INPUT' &&
        e.target.closest('label')
      ) {
        return;
      }

      const meta =
        describeClickTarget(e.target);

      if (!meta) return;

      pushDataLayerEvent(
        'site_click',
        {
          ...meta,

          page_path:
            window.location.pathname,
        }
      );
    },
    true
  );

  // ---------------------------------------------------------------------------
  // FORM SUBMISSION ATTEMPT TRACKING
  // ---------------------------------------------------------------------------
  //
  // IMPORTANT:
  // site_form_submit means a form submit event occurred.
  //
  // It does NOT mean:
  // - lead persisted
  // - enquiry created
  // - quotation created
  // - backend request succeeded
  //
  // DPR-specific success events must be generated separately after their
  // corresponding success conditions are actually confirmed.

  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target;

      if (
        !(form instanceof HTMLFormElement)
      ) {
        return;
      }

      // Field names only.
      //
      // Never transmit field values.
      //
      // Password and file fields are excluded entirely.

      const fieldNames = Array.from(
        form.elements
      )
        .filter(
          (el) =>
            el.name &&
            el.type !== 'password' &&
            el.type !== 'file'
        )
        .map((el) => el.name);

      pushDataLayerEvent(
        'site_form_submit',
        {
          form_id:
            form.id || undefined,

          form_name:
            form.getAttribute('name') ||
            undefined,

          form_fields:
            fieldNames.join(','),

          page_path:
            window.location.pathname,
        }
      );
    },
    true
  );

  // ---------------------------------------------------------------------------
  // INPUT CHANGE TRACKING
  // ---------------------------------------------------------------------------
  //
  // Generic activity tracking intentionally does NOT capture user-entered
  // values.
  //
  // Business values such as product, quantity and timeline belong in
  // explicitly defined DPR events rather than this generic listener.

  document.addEventListener(
    'change',
    (e) => {
      const el = e.target;

      if (!(el instanceof HTMLElement)) {
        return;
      }

      const tag =
        el.tagName.toLowerCase();

      // -----------------------------------------------------------------------
      // SELECT
      // -----------------------------------------------------------------------
      //
      // Record only that the field changed.
      // Never send selected option text/value automatically.

      if (tag === 'select') {
        pushDataLayerEvent(
          'site_input_change',
          {
            input_type: 'select',

            input_id:
              el.id || undefined,

            input_name:
              el.name || undefined,

            page_path:
              window.location.pathname,
          }
        );

        return;
      }

      // -----------------------------------------------------------------------
      // CHECKBOX / RADIO
      // -----------------------------------------------------------------------
      //
      // Checked state is safe diagnostic metadata.
      // Do not transmit the field's value.

      if (
        tag === 'input' &&
        (
          el.type === 'checkbox' ||
          el.type === 'radio'
        )
      ) {
        pushDataLayerEvent(
          'site_input_change',
          {
            input_type: el.type,

            input_id:
              el.id || undefined,

            input_name:
              el.name || undefined,

            input_checked:
              el.checked,

            page_path:
              window.location.pathname,
          }
        );

        return;
      }

      // -----------------------------------------------------------------------
      // FILE INPUT
      // -----------------------------------------------------------------------
      //
      // File count only.
      //
      // Never send:
      // - filename
      // - file path
      // - file contents
      // - resume name
      // - document name

      if (
        tag === 'input' &&
        el.type === 'file'
      ) {
        pushDataLayerEvent(
          'site_input_change',
          {
            input_type: 'file',

            input_id:
              el.id || undefined,

            input_name:
              el.name || undefined,

            file_count:
              el.files
                ? el.files.length
                : 0,

            page_path:
              window.location.pathname,
          }
        );
      }
    },
    true
  );
}

// -----------------------------------------------------------------------------
// APPLICATION INITIALIZER
// -----------------------------------------------------------------------------
//
// Single public initializer for application startup.
//
// main.jsx should call:
//
// initAnalytics();
//
// rather than separately initializing attribution/session/activity internals.

export function initAnalytics() {
  captureFirstPartyAttribution();
  getOrCreateAnalyticsSessionId();
  initActivityTracking();
}