// Thin wrapper around window.dataLayer so GTM (GTM-MZKBG5Z5, loaded in index.html)
// receives events. GTM reads dataLayer.push(), not window.gtag() — this project has
// no separate gtag.js include, so any tag that only calls window.gtag() is a no-op.
export function pushDataLayerEvent(event, payload = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}
