const securityConfig =
  require('../config/security');

const {
  fail
} = require('../utils/response');


/* ============================================================
   IN-MEMORY RATE LIMIT STORE
============================================================ */

const ipCache =
  new Map();


/* ============================================================
   HELPERS
============================================================ */

function getSafePath(req) {
  return String(
    req?.originalUrl ||
    req?.url ||
    ''
  ).split('?')[0];
}


function getClientIp(req) {

  /*
   * app.js configures:
   *
   * app.set('trust proxy', 1)
   *
   * Therefore Express resolves req.ip through the configured
   * trusted proxy chain. Avoid manually trusting arbitrary
   * X-Forwarded-For values here.
   */
  const rawIp =
    req?.ip ||
    req?.socket?.remoteAddress ||
    'unknown';

  return String(rawIp)
    .trim()
    .replace(
      /^::ffff:/,
      ''
    );
}


function getRateLimitConfig() {

  const configured =
    securityConfig?.rateLimiting ||
    {};

  const windowMs =
    Number(configured.windowMs);

  const max =
    Number(configured.max);

  return {

    windowMs:
      Number.isFinite(windowMs) &&
      windowMs > 0
        ? windowMs
        : 15 * 60 * 1000,

    max:
      Number.isFinite(max) &&
      max > 0
        ? max
        : 300,

    message:
      configured?.message?.message ||
      configured?.message ||
      'Too many requests. Please try again later.'
  };
}


function shouldSkipRateLimit(req) {

  const method =
    String(
      req?.method ||
      ''
    ).toUpperCase();

  /*
   * Do not charge browser CORS preflight requests.
   */
  if (
    method === 'OPTIONS'
  ) {
    return true;
  }


  const path =
    getSafePath(req);


  /*
   * Static file delivery is intentionally excluded.
   */
  if (
    path === '/uploads' ||
    path.startsWith('/uploads/')
  ) {
    return true;
  }


  /*
   * Exact health checks only.
   * Avoid broad substring matching such as "/health-anything".
   */
  const healthPaths =
    new Set([
      '/api/health',
      '/api/v1/health'
    ]);

  if (
    healthPaths.has(path)
  ) {
    return true;
  }


  return false;
}


function setRateLimitHeaders(
  res,
  limit,
  remaining,
  resetAt
) {

  if (
    !res ||
    res.headersSent
  ) {
    return;
  }


  const resetSeconds =
    Math.max(
      0,
      Math.ceil(
        (
          resetAt -
          Date.now()
        ) / 1000
      )
    );


  res.setHeader(
    'RateLimit-Limit',
    String(limit)
  );

  res.setHeader(
    'RateLimit-Remaining',
    String(
      Math.max(
        0,
        remaining
      )
    )
  );

  res.setHeader(
    'RateLimit-Reset',
    String(resetSeconds)
  );
}


/* ============================================================
   CLEANUP
============================================================ */

const cleanupInterval =
  setInterval(
    () => {

      const now =
        Date.now();

      for (
        const [
          ip,
          record
        ] of ipCache.entries()
      ) {

        if (
          !record ||
          now >= record.expiresAt
        ) {
          ipCache.delete(ip);
        }
      }

    },
    5 * 60 * 1000
  );


/*
 * Do not keep Node/test processes alive only because this timer exists.
 */
if (
  typeof cleanupInterval.unref ===
  'function'
) {
  cleanupInterval.unref();
}


/* ============================================================
   RATE LIMITER
============================================================ */

function rateLimiter(
  req,
  res,
  next
) {

  if (
    shouldSkipRateLimit(req)
  ) {
    return next();
  }


  const {
    windowMs,
    max,
    message
  } =
    getRateLimitConfig();


  const clientIp =
    getClientIp(req);

  const now =
    Date.now();


  let record =
    ipCache.get(clientIp);


  if (
    !record ||
    now >= record.expiresAt
  ) {

    record = {
      hits: 0,
      expiresAt:
        now + windowMs
    };

    ipCache.set(
      clientIp,
      record
    );
  }


  record.hits += 1;


  const remaining =
    max -
    record.hits;


  setRateLimitHeaders(
    res,
    max,
    remaining,
    record.expiresAt
  );


  if (
    record.hits > max
  ) {

    const retryAfterSeconds =
      Math.max(
        1,
        Math.ceil(
          (
            record.expiresAt -
            now
          ) / 1000
        )
      );


    res.setHeader(
      'Retry-After',
      String(
        retryAfterSeconds
      )
    );


    /*
     * Privacy-safe operational warning.
     *
     * Do not log query strings or request bodies.
     */
    console.warn(
      '[rateLimiter] BLOCKED',
      {
        requestId:
          req?.id || null,

        ip:
          clientIp,

        hits:
          record.hits,

        max,

        method:
          req?.method || null,

        path:
          getSafePath(req)
      }
    );


    return fail(
      res,
      429,
      'RATE_LIMIT_EXCEEDED',
      String(message),
      [],
      req
    );
  }


  return next();
}


module.exports = {
  rateLimiter
};