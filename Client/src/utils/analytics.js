// Thin wrapper around window.dataLayer so GTM (GTM-MZKBG5Z5, loaded in index.html)
// receives events. GTM reads dataLayer.push(), not window.gtag() — this project has
// no separate gtag.js include, so any tag that only calls window.gtag() is a no-op.
export function pushDataLayerEvent(event, payload = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

// Site-wide delegated click + form-submit + input-change capture, so every
// interactive click, form submission, and dropdown/checkbox selection reaches
// GTM/GA4 as a generic event without instrumenting each element individually.
// Named conversion events (leads, signups, payments, etc.) are pushed separately
// at their success points — these generic events are the safety net that
// guarantees nothing goes untracked. `[class*="cursor-pointer"]` is included
// because this codebase consistently marks custom clickable <div>/<label>
// elements (expandable cards, file-upload dropzones) with that class.
const CLICKABLE_SELECTOR = 'button, a, [role="button"], input[type="submit"], input[type="button"], summary, [class*="cursor-pointer"]';

function describeClickTarget(el) {
  const target = el.closest ? el.closest(CLICKABLE_SELECTOR) : null;
  if (!target) return null;
  const rawText = target.innerText || target.value || target.getAttribute('aria-label') || '';
  const text = rawText.replace(/\s+/g, ' ').trim().slice(0, 120);
  return {
    click_text: text || undefined,
    click_id: target.id || undefined,
    click_tag: target.tagName.toLowerCase(),
    click_url: target.tagName === 'A' ? target.href : undefined
  };
}

let activityTrackingBound = false;

// Idempotent: safe to call from every render/mount (e.g. React StrictMode's
// double-invoked effects) — the listeners are only ever attached once per page load.
export function initActivityTracking() {
  if (typeof document === 'undefined' || activityTrackingBound) return;
  activityTrackingBound = true;

  document.addEventListener('click', (e) => {
    // <label><input type="file"/></label> (used for every document/resume
    // upload dropzone) forwards a second, synthetic click to the hidden input
    // after the real click lands on the label — skip it so one user click
    // doesn't produce two site_click events for the same interaction.
    if (e.target.tagName === 'INPUT' && e.target.closest('label')) return;

    const meta = describeClickTarget(e.target);
    if (!meta) return;
    pushDataLayerEvent('site_click', {
      ...meta,
      page_path: window.location.pathname
    });
  }, true);

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    // Field names only — never values, so passwords/OTPs/PII never reach dataLayer.
    const fieldNames = Array.from(form.elements)
      .filter((el) => el.name && el.type !== 'password' && el.type !== 'file')
      .map((el) => el.name);
    pushDataLayerEvent('site_form_submit', {
      form_id: form.id || undefined,
      form_name: form.getAttribute('name') || undefined,
      form_fields: fieldNames.join(','),
      page_path: window.location.pathname
    });
  }, true);

  // Dropdowns (division/variety/grade rate-card pickers, business-type selects),
  // checkboxes/radios (consent, filters), and file inputs (GST/resume uploads)
  // don't fire meaningful 'click' events on their own — 'change' is what
  // reliably fires once a selection is actually made.
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    const tag = el.tagName.toLowerCase();

    if (tag === 'select') {
      pushDataLayerEvent('site_input_change', {
        input_type: 'select',
        input_id: el.id || undefined,
        input_name: el.name || undefined,
        input_value: (el.options[el.selectedIndex]?.text || el.value || '').slice(0, 120),
        page_path: window.location.pathname
      });
      return;
    }

    if (tag === 'input' && (el.type === 'checkbox' || el.type === 'radio')) {
      pushDataLayerEvent('site_input_change', {
        input_type: el.type,
        input_id: el.id || undefined,
        input_name: el.name || undefined,
        input_checked: el.checked,
        page_path: window.location.pathname
      });
      return;
    }

    if (tag === 'input' && el.type === 'file') {
      // File count only — never the filename, which can carry the applicant's
      // own name (resumes) or other identifying details.
      pushDataLayerEvent('site_input_change', {
        input_type: 'file',
        input_id: el.id || undefined,
        input_name: el.name || undefined,
        file_count: el.files ? el.files.length : 0,
        page_path: window.location.pathname
      });
    }
  }, true);
}
