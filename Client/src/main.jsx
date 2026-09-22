import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';

import './index.css';
import App from './App.jsx';
import { initAnalytics } from './utils/analytics.js';

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 1: Audit & Tracking bootstrap
 *
 * Responsibilities of this file:
 * - Start the privacy-safe first-party analytics layer before React renders.
 * - Keep analytics failure isolated from the customer-facing application.
 * - Preserve the existing Google OAuth client configuration exactly.
 * - Keep React StrictMode enabled.
 */

/* =========================================================
   GOOGLE IDENTITY SERVICES CONSOLE FILTER

   React StrictMode intentionally mounts components more than once in
   development. Google Identity Services can print harmless GSI warnings
   during those development remounts. We filter only those known messages
   and leave all other warnings/errors visible.
========================================================= */

const shouldIgnoreGSIMessage = (args) =>
  args.some(
    (arg) =>
      typeof arg === 'string' &&
      (arg.includes('[GSI_LOGGER]') || arg.includes('GSI_LOGGER'))
  );

const wrapConsoleMethod = (method) => {
  const original = method.bind(console);

  return (...args) => {
    if (shouldIgnoreGSIMessage(args)) {
      return;
    }

    original(...args);
  };
};

console.warn = wrapConsoleMethod(console.warn);
console.error = wrapConsoleMethod(console.error);

/* =========================================================
   MASTER DPR PHASE 1 ANALYTICS INITIALIZATION

   Analytics must initialize before React renders so attribution from the
   first landing URL is captured before application navigation changes it.

   Tracking must never be able to take the website down. If initialization
   fails, we keep the application operational and leave a visible diagnostic
   marker for QA/debugging instead of silently hiding the failure.
========================================================= */

try {
  initAnalytics();

  window.__ITO_ANALYTICS_STATUS__ = Object.freeze({
    initialized: true,
    version: 'master_dpr_v4_phase_1',
  });
} catch (error) {
  window.__ITO_ANALYTICS_STATUS__ = Object.freeze({
    initialized: false,
    version: 'master_dpr_v4_phase_1',
    errorName: error?.name || 'AnalyticsInitializationError',
  });

  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    event: 'analytics_initialization_failed',
    tracking_version: 'master_dpr_v4_phase_1',
    error_name: error?.name || 'AnalyticsInitializationError',
  });

  console.error(
    '[ITO Analytics] Phase 1 initialization failed. Application rendering will continue.',
    error
  );
}

/* =========================================================
   PRERENDER / CLIENT RENDERING

   Prerendered pages (scripts/prerender.mjs) already ship real static markup
   inside #root. The existing project intentionally uses createRoot instead
   of hydrateRoot because framer-motion entrance states can differ from the
   prerendered DOM and cause hydration mismatch warnings.
========================================================= */

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('React root element #root was not found.');
}

/* =========================================================
   GOOGLE OAUTH CONFIGURATION

   CRITICAL PRESERVATION RULE:
   The existing client ID fallback from the repository is preserved exactly.
   Environment configuration still takes priority when VITE_GOOGLE_CLIENT_ID
   is provided by the deployment environment.
========================================================= */

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '118804696306-5sa5n9j6qud4mk4f036qr6epmr049th7.apps.googleusercontent.com';

createRoot(rootElement).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);