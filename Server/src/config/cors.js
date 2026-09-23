const env = require('./env');


/* ============================================================
   ORIGIN NORMALIZATION
============================================================ */

function normalizeOrigin(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return '';
  }

  return value
    .trim()
    .replace(/\/+$/, '');
}


/* ============================================================
   CONFIGURED ORIGINS
============================================================ */

const configuredOrigins = Array.isArray(
  env.CORS_WHITELIST
)
  ? env.CORS_WHITELIST
      .map(normalizeOrigin)
      .filter(Boolean)
  : [];


/* ============================================================
   LOCAL DEVELOPMENT ORIGINS
============================================================ */

function isLocalDevelopmentOrigin(origin) {
  if (
    env.NODE_ENV !== 'development' ||
    !origin
  ) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);

    const allowedProtocols = [
      'http:',
      'https:'
    ];

    const allowedHosts = [
      'localhost',
      '127.0.0.1',
      '::1'
    ];

    return (
      allowedProtocols.includes(
        parsedOrigin.protocol
      ) &&
      allowedHosts.includes(
        parsedOrigin.hostname
      )
    );

  } catch (error) {
    return false;
  }
}


/* ============================================================
   CORS OPTIONS
============================================================ */

const corsOptions = {

  origin: (origin, callback) => {

    /*
     * Requests without an Origin header include:
     *
     * - server-to-server requests
     * - curl/Postman
     * - backend health checks
     * - Meta webhooks
     *
     * CORS is a browser-origin protection mechanism, therefore
     * these requests must not be rejected only because Origin
     * is absent.
     */
    if (!origin) {
      return callback(
        null,
        true
      );
    }

    const cleanOrigin =
      normalizeOrigin(origin);


    if (
      configuredOrigins.includes(
        cleanOrigin
      )
    ) {
      return callback(
        null,
        true
      );
    }


    /*
     * Development convenience without opening CORS to arbitrary
     * external websites.
     *
     * Allows localhost / 127.0.0.1 on any development port,
     * including Vite's default port 5173.
     */
    if (
      isLocalDevelopmentOrigin(
        cleanOrigin
      )
    ) {
      return callback(
        null,
        true
      );
    }


    return callback(
      new Error(
        'Not allowed by CORS'
      )
    );
  },


  /*
   * Retained because parts of the existing CRM may use
   * authenticated browser requests.
   *
   * Never combine credentials with Access-Control-Allow-Origin: *.
   * This configuration always resolves an explicit accepted origin.
   */
  credentials: true,


  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],


  allowedHeaders: [
    'Accept',
    'Content-Type',
    'Authorization',
    'X-Device-Hash',
    'X-Requested-With',
    'X-Request-Id'
  ],


  /*
   * app.js adds X-Request-Id to every response.
   * Exposing it allows the frontend to read that ID when debugging
   * a failed CRM/API request.
   */
  exposedHeaders: [
    'X-Request-Id'
  ],


  /*
   * Cache successful browser pre-flight checks for 10 minutes.
   */
  maxAge: 600,


  optionsSuccessStatus: 204
};


module.exports = corsOptions;