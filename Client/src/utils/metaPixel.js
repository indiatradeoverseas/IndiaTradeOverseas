import { META_PIXEL_ID } from '../config/business';

const sent = new Set();
let initialized = false;
let allowed = false;

// Events are dispatched only by the canonical DPR stream, never by a second
// page-load listener. The event ID is the same ID persisted by the ITO API.
export function updateMetaConsent(advertising) {
  allowed = advertising === true;
  if (typeof window === 'undefined') return;
  if (!allowed) {
    window.fbq?.('consent', 'revoke');
    return;
  }
  if (!/^\d+$/.test(META_PIXEL_ID)) return;
  if (!window.fbq) {
    const fbq = function (...args) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
    window.fbq = fbq;
    window._fbq = window._fbq || fbq;
  }
  if (!initialized) {
    window.fbq('set', 'autoConfig', false, META_PIXEL_ID);
    window.fbq('init', META_PIXEL_ID);
    initialized = true;
  }
  window.fbq('consent', 'grant');
  if (!document.querySelector('script[data-ito-meta-pixel]')) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.dataset.itoMetaPixel = 'true';
    document.head.appendChild(script);
  }
}

export function dispatchMetaEvent(event, eventId, advertising) {
  updateMetaConsent(advertising);
  if (!allowed || !initialized || !eventId) return;
  const key = `${event}:${eventId}`;
  if (sent.has(key)) return;
  const standard = { landing_page_view: 'PageView', view_product: 'ViewContent', lead_created: 'Lead' };
  window.fbq(standard[event] ? 'trackSingle' : 'trackSingleCustom', META_PIXEL_ID,
    standard[event] || ({qualified_lead:'QualifiedLead',quote_created:'QuoteCreated',quote_sent:'QuoteSent',order_won:'OrderWon',purchase:'Purchase',repeat_order:'RepeatOrder'}[event]) || event, {}, { eventID: eventId });
  sent.add(key);
  if (sent.size > 2000) sent.delete(sent.values().next().value);
}
