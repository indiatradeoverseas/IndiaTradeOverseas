const env = require('./env');


/* ============================================================
   HELPERS
============================================================ */

function parsePositiveInteger(
  value,
  fallback
) {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  return (
    Number.isFinite(parsed) &&
    parsed > 0
  )
    ? parsed
    : fallback;
}


/* ============================================================
   ENVIRONMENT
============================================================ */

const isDevelopment =
  env.NODE_ENV === 'development';


/* ============================================================
   RATE LIMIT DEFAULTS
============================================================ */

const GLOBAL_RATE_LIMIT_WINDOW_MS =
  parsePositiveInteger(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );


const GLOBAL_RATE_LIMIT_MAX =
  parsePositiveInteger(
    process.env.RATE_LIMIT_MAX,
    isDevelopment
      ? 50000
      : 10000
  );


const REVEAL_RATE_LIMIT_WINDOW_MS =
  parsePositiveInteger(
    process.env.REVEAL_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  );


const REVEAL_RATE_LIMIT_MAX =
  parsePositiveInteger(
    process.env.REVEAL_RATE_LIMIT_MAX,
    5
  );


/* ============================================================
   ACCOUNT SECURITY
============================================================ */

const ACCOUNT_LOCK_THRESHOLD =
  parsePositiveInteger(
    process.env.ACCOUNT_LOCK_THRESHOLD,
    5
  );


/* ============================================================
   SECURITY CONFIGURATION
============================================================ */

const securityConfig = {

  /*
   * Global API limiter.
   *
   * Keep this reasonably permissive because multiple CRM users may
   * share one NAT/public IP and some dashboards can poll APIs.
   *
   * Sensitive endpoints such as login, OTP, reveal/export and public
   * lead submission should additionally use their own stricter
   * route-level controls where applicable.
   */
  rateLimiting: {

    windowMs:
      GLOBAL_RATE_LIMIT_WINDOW_MS,

    max:
      GLOBAL_RATE_LIMIT_MAX,

    message: {

      success: false,

      errorCode:
        'RATE_LIMIT_EXCEEDED',

      message:
        'Too many requests from this connection. Please try again later.',

      details: []
    }
  },


  /*
   * Highly sensitive data-reveal operations need a much smaller
   * allowance than normal CRM/API traffic.
   */
  revealRateLimiting: {

    windowMs:
      REVEAL_RATE_LIMIT_WINDOW_MS,

    max:
      REVEAL_RATE_LIMIT_MAX,

    message: {

      success: false,

      errorCode:
        'RATE_LIMIT_EXCEEDED',

      message:
        'Too many data reveal requests. Please try again later.',

      details: []
    }
  },


  /*
   * Existing authentication services use this value to lock an
   * account after repeated failed password attempts.
   */
  accountLockThreshold:
    ACCOUNT_LOCK_THRESHOLD,


  /*
   * IMPORTANT:
   *
   * Do not change this algorithm independently.
   *
   * Existing src/utils/crypto.js and already-encrypted application
   * data use AES-256-CBC. Changing the algorithm here without a
   * migration strategy could make existing encrypted values
   * unreadable.
   */
  encryption: {

    algorithm:
      'aes-256-cbc',

    key:
      env.ENCRYPTION_KEY,

    ivLength:
      16
  }
};


module.exports =
  securityConfig;