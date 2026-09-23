const dotenv = require('dotenv');
const path = require('path');


/* ============================================================
   LOAD ENVIRONMENT
============================================================ */

dotenv.config({
  path: path.join(
    __dirname,
    '../../.env'
  )
});


/* ============================================================
   HELPERS
============================================================ */

function cleanString(
  value,
  fallback = ''
) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  const cleaned =
    String(value).trim();

  return cleaned || fallback;
}


function parseInteger(
  value,
  fallback
) {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}


function parseBoolean(
  value,
  fallback = false
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  if (
    [
      'true',
      '1',
      'yes',
      'on'
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    [
      'false',
      '0',
      'no',
      'off'
    ].includes(normalized)
  ) {
    return false;
  }

  return fallback;
}


function parseList(
  value,
  fallback = []
) {
  const source =
    cleanString(value);

  const values =
    source
      ? source.split(',')
      : fallback;

  return [
    ...new Set(
      values
        .map(item =>
          cleanString(item)
            .replace(/\/+$/, '')
        )
        .filter(Boolean)
    )
  ];
}


/* ============================================================
   BASE URLS
============================================================ */

const FRONTEND_URL =
  cleanString(
    process.env.FRONTEND_URL,
    'https://www.indiatradeoverseas.com'
  )
    .replace(/\/+$/, '');


const BACKEND_URL =
  cleanString(
    process.env.BACKEND_URL,
    'https://indiatradeoverseas-ito.onrender.com'
  )
    .replace(/\/+$/, '');


/* ============================================================
   DEFAULT CORS ORIGINS
============================================================ */

/*
 * These are fallback origins only.
 *
 * Production should preferably define CORS_WHITELIST explicitly
 * in the deployment environment.
 */
const DEFAULT_CORS_WHITELIST = [
  FRONTEND_URL,

  'https://indiatradeoverseas.com',

  'https://india-trade-overseas.vercel.app',

  'https://ito-7u4q.vercel.app',

  'http://localhost:3000',

  'http://localhost:5173',

  'http://localhost:5174',

  'http://127.0.0.1:3000',

  'http://127.0.0.1:5173',

  'http://127.0.0.1:5174'
];


/* ============================================================
   ENV CONFIGURATION
============================================================ */

const env = {

  NODE_ENV:
    cleanString(
      process.env.NODE_ENV,
      'development'
    )
      .toLowerCase(),


  PORT:
    parseInteger(
      process.env.PORT,
      5000
    ),


  /* =========================
     DATABASE
  ========================= */

  MONGO_URI:
    cleanString(
      process.env.MONGO_URI
    ),


  /* =========================
     AUTH / SECURITY
  ========================= */

  JWT_SECRET:
    cleanString(
      process.env.JWT_SECRET
    ),


  ENCRYPTION_KEY:
    cleanString(
      process.env.ENCRYPTION_KEY
    ),


  JWT_EXPIRY:
    cleanString(
      process.env.JWT_EXPIRY,
      '7d'
    ),


  REFRESH_TOKEN_EXPIRY:
    cleanString(
      process.env.REFRESH_TOKEN_EXPIRY,
      '7d'
    ),


  BCRYPT_ROUNDS:
    parseInteger(
      process.env.BCRYPT_ROUNDS,
      10
    ),


  DEVICE_VERIFICATION_ENABLED:
    parseBoolean(
      process.env.DEVICE_VERIFICATION_ENABLED,
      false
    ),


  /* =========================
     CORS / APPLICATION URLS
  ========================= */

  CORS_WHITELIST:
    parseList(
      process.env.CORS_WHITELIST,
      DEFAULT_CORS_WHITELIST
    ),


  FRONTEND_URL,


  BACKEND_URL,


  /* =========================
     GOOGLE
  ========================= */

  GOOGLE_CLIENT_ID:
    cleanString(
      process.env.GOOGLE_CLIENT_ID
    ),


  /* =========================
     CHAT / NVIDIA
  ========================= */

  CHAT_API_KEY_NVIDIA:
    cleanString(
      process.env.CHAT_API_KEY_NVIDIA
    )
};


/* ============================================================
   BASIC CONFIGURATION VALIDATION
============================================================ */

/*
 * Do not print secret values.
 *
 * These warnings help local development while allowing modules
 * such as crypto/auth to retain their own strict validation.
 */
if (!env.MONGO_URI) {
  console.warn(
    '[Environment] MONGO_URI is not configured.'
  );
}


if (!env.JWT_SECRET) {
  console.warn(
    '[Environment] JWT_SECRET is not configured.'
  );
}


if (!env.ENCRYPTION_KEY) {
  console.warn(
    '[Environment] ENCRYPTION_KEY is not configured.'
  );
}


if (
  env.BCRYPT_ROUNDS < 8 ||
  env.BCRYPT_ROUNDS > 15
) {
  console.warn(
    `[Environment] BCRYPT_ROUNDS=${env.BCRYPT_ROUNDS} is outside the recommended application range.`
  );
}


module.exports = env;