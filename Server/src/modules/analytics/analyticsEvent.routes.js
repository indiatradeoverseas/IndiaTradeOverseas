const router = require('express').Router();

const {
  ingestBrowserEvent,
} = require('./analyticsEvent.controller');

const { fail } = require('../../utils/response');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 1.6D: Public analytics ingestion routes
 *
 * Purpose:
 * - Expose only the browser-safe analytics ingestion endpoint.
 * - Add an endpoint-specific abuse guard on top of the application's
 *   existing global rate limiter.
 * - Keep this endpoint unauthenticated because it must work for anonymous
 *   landing-page visitors before a Lead/account exists.
 *
 * Security / privacy rules:
 * - No authentication token is required or accepted as a trust signal.
 * - The controller decides which event names are allowed from the browser.
 * - Trusted events such as lead_created / purchase are NOT exposed here.
 * - IP addresses are used only in this in-memory rate limiter and are not
 *   persisted by this module.
 */

const ANALYTICS_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const ANALYTICS_RATE_LIMIT_MAX = 120;

const analyticsRateLimitCache = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).trim();
  }

  return String(
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function analyticsIngestionRateLimiter(req, res, next) {
  const clientIp = getClientIp(req);
  const now = Date.now();

  let record = analyticsRateLimitCache.get(clientIp);

  if (
    !record ||
    now - record.windowStartedAt >= ANALYTICS_RATE_LIMIT_WINDOW_MS
  ) {
    record = {
      hits: 0,
      windowStartedAt: now,
    };

    analyticsRateLimitCache.set(clientIp, record);
  }

  record.hits += 1;

  const remaining = Math.max(
    0,
    ANALYTICS_RATE_LIMIT_MAX - record.hits
  );

  const resetSeconds = Math.max(
    1,
    Math.ceil(
      (
        ANALYTICS_RATE_LIMIT_WINDOW_MS -
        (now - record.windowStartedAt)
      ) / 1000
    )
  );

  res.setHeader(
    'X-RateLimit-Limit',
    String(ANALYTICS_RATE_LIMIT_MAX)
  );

  res.setHeader(
    'X-RateLimit-Remaining',
    String(remaining)
  );

  res.setHeader(
    'X-RateLimit-Reset',
    String(resetSeconds)
  );

  if (record.hits > ANALYTICS_RATE_LIMIT_MAX) {
    res.setHeader(
      'Retry-After',
      String(resetSeconds)
    );

    return fail(
      res,
      429,
      'ANALYTICS_RATE_LIMITED',
      'Too many analytics events. Please retry later.',
      [],
      req
    );
  }

  return next();
}

/**
 * Periodic cleanup prevents the in-memory cache from growing forever.
 * unref() ensures this timer does not keep the Node process alive by itself.
 */
const cleanupTimer = setInterval(() => {
  const now = Date.now();

  for (const [clientIp, record] of analyticsRateLimitCache.entries()) {
    if (
      now - record.windowStartedAt >=
      ANALYTICS_RATE_LIMIT_WINDOW_MS * 2
    ) {
      analyticsRateLimitCache.delete(clientIp);
    }
  }
}, 5 * 60 * 1000);

if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

/**
 * Public browser event ingestion.
 *
 * Mounted later as:
 *   POST /api/analytics/events
 *   POST /api/v1/analytics/events
 *
 * The controller performs the final event allowlist and persistence rules.
 */
router.post(
  '/events',
  analyticsIngestionRateLimiter,
  ingestBrowserEvent
);

module.exports = router;