const {
  fail
} = require('../utils/response');

const logger =
  require('../utils/logger');


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


function getRequestId(req) {
  return (
    req?.id ||
    null
  );
}


function normalizeValidationDetails(err) {

  if (
    !err ||
    !err.errors ||
    typeof err.errors !== 'object'
  ) {
    return [];
  }

  return Object
    .values(err.errors)
    .map(validationError => {

      const field =
        validationError?.path ||
        validationError?.properties?.path ||
        'unknown';

      const message =
        validationError?.message ||
        'Invalid value';

      return {
        field,
        message
      };
    });
}


function getDuplicateFieldDetails(err) {

  if (
    !err ||
    err.code !== 11000
  ) {
    return [];
  }

  const keyPattern =
    err.keyPattern &&
    typeof err.keyPattern === 'object'
      ? err.keyPattern
      : {};

  const keyValue =
    err.keyValue &&
    typeof err.keyValue === 'object'
      ? err.keyValue
      : {};

  const fields =
    Object.keys(keyPattern).length
      ? Object.keys(keyPattern)
      : Object.keys(keyValue);

  return fields.map(field => ({
    field,
    message:
      'A record with this value already exists'
  }));
}


/* ============================================================
   ERROR NORMALIZATION
============================================================ */

function normalizeError(err) {

  let statusCode =
    Number(
      err?.status ||
      err?.statusCode
    ) || 500;

  let errorCode =
    err?.errorCode ||
    'SERVER_ERROR';

  let message =
    err?.message ||
    'Request failed';

  let details =
    Array.isArray(err?.details)
      ? err.details
      : [];


  /* =========================
     CORS
  ========================= */

  if (
    err?.errorCode ===
      'CORS_ORIGIN_FORBIDDEN' ||
    err?.message ===
      'Not allowed by CORS'
  ) {
    statusCode = 403;

    errorCode =
      'CORS_ORIGIN_FORBIDDEN';

    message =
      'Origin is not allowed';

    details = [];
  }


  /* =========================
     MONGOOSE VALIDATION
  ========================= */

  else if (
    err?.name ===
    'ValidationError'
  ) {
    statusCode = 400;

    errorCode =
      'VALIDATION_ERROR';

    message =
      'Validation failed';

    details =
      normalizeValidationDetails(
        err
      );
  }


  /* =========================
     INVALID MONGOOSE ID / CAST
  ========================= */

  else if (
    err?.name ===
    'CastError'
  ) {
    statusCode = 400;

    errorCode =
      'INVALID_IDENTIFIER';

    message =
      'Invalid identifier';

    details = err?.path
      ? [
          {
            field: err.path,
            message:
              'Invalid value'
          }
        ]
      : [];
  }


  /* =========================
     DUPLICATE DATABASE VALUE
  ========================= */

  else if (
    err?.code === 11000
  ) {
    statusCode = 409;

    errorCode =
      'DUPLICATE_RESOURCE';

    message =
      'A matching record already exists';

    details =
      getDuplicateFieldDetails(
        err
      );
  }


  /* =========================
     JWT
  ========================= */

  else if (
    err?.name ===
    'JsonWebTokenError'
  ) {
    statusCode = 401;

    errorCode =
      'INVALID_TOKEN';

    message =
      'Authentication token is invalid';

    details = [];
  }


  else if (
    err?.name ===
    'TokenExpiredError'
  ) {
    statusCode = 401;

    errorCode =
      'TOKEN_EXPIRED';

    message =
      'Authentication token has expired';

    details = [];
  }


  /* =========================
     REQUEST BODY TOO LARGE
  ========================= */

  else if (
    err?.type ===
      'entity.too.large' ||
    statusCode === 413
  ) {
    statusCode = 413;

    errorCode =
      'PAYLOAD_TOO_LARGE';

    message =
      'Request payload is too large';

    details = [];
  }


  /* =========================
     INVALID JSON BODY
  ========================= */

  else if (
    err instanceof SyntaxError &&
    err?.status === 400 &&
    'body' in err
  ) {
    statusCode = 400;

    errorCode =
      'INVALID_JSON';

    message =
      'Request body contains invalid JSON';

    details = [];
  }


  /* =========================
     RATE LIMIT
  ========================= */

  else if (
    statusCode === 429
  ) {
    errorCode =
      err?.errorCode ||
      'RATE_LIMIT_EXCEEDED';

    message =
      err?.message ||
      'Too many requests';

    details = [];
  }


  return {
    statusCode,
    errorCode,
    message,
    details
  };
}


/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

function errorHandler(
  err,
  req,
  res,
  next
) {

  /*
   * Required four-argument Express middleware signature.
   * `next` remains intentionally unused.
   */
  void next;


  const normalized =
    normalizeError(err);


  const {
    statusCode,
    errorCode,
    details
  } = normalized;


  /*
   * Never expose internal 5xx exception messages to the client.
   */
  const clientMessage =
    statusCode >= 500
      ? 'An unexpected error occurred'
      : normalized.message;


  /*
   * Privacy-safe operational log.
   *
   * Do not log req.body, raw authorization headers, cookies,
   * phone numbers, emails, passwords, access tokens or secrets.
   */
  const logContext = {

    requestId:
      getRequestId(req),

    method:
      req?.method || null,

    path:
      getSafePath(req),

    statusCode,

    errorCode,

    errorName:
      err?.name ||
      'Error'
  };


  if (
    statusCode >= 500
  ) {

    logger.error(
      'Request failed',
      {
        ...logContext,

        /*
         * Stack remains server-side only.
         */
        stack:
          err?.stack ||
          undefined
      }
    );

  } else {

    logger.warn(
      'Request rejected',
      logContext
    );
  }


  /*
   * Prevent attempting to write another response if a downstream
   * handler already sent headers.
   */
  if (
    res.headersSent
  ) {
    return;
  }


  return fail(
    res,
    statusCode,
    errorCode,
    clientMessage,
    details,
    req
  );
}


module.exports = {
  errorHandler
};