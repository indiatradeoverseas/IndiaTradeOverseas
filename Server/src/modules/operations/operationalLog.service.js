const mongoose = require('mongoose');

const OperationalLog = require('./operationalLog.model');
const logger = require('../../utils/logger');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.26B: Privacy-safe operational logging service
 *
 * Responsibilities:
 * - provide one append-only write path for DPR operational outcomes;
 * - sanitize metadata recursively before persistence;
 * - redact buyer PII, credentials, tokens, auth headers and payment data;
 * - keep log failures non-blocking for business workflows through safe helpers;
 * - provide category-specific helpers used by Lead, CRM, notifications,
 *   quotations and analytics/tracking integrations.
 */

const CATEGORY_SET = new Set(
  OperationalLog.CATEGORIES || [
    'LEAD_API',
    'DATABASE_WRITE',
    'CRM_SYNC',
    'RETRY',
    'NOTIFICATION',
    'QUOTATION',
    'TRACKING',
  ]
);

const OUTCOME_SET = new Set(
  OperationalLog.OUTCOMES || [
    'SUCCESS',
    'FAILURE',
    'PENDING',
    'RETRY_SCHEDULED',
    'MANUAL_RECOVERY',
    'SKIPPED',
  ]
);

const SEVERITY_SET = new Set(
  OperationalLog.SEVERITIES || [
    'INFO',
    'WARN',
    'ERROR',
    'CRITICAL',
  ]
);

const MAX_METADATA_DEPTH = 5;
const MAX_METADATA_KEYS = 80;
const MAX_ARRAY_ITEMS = 30;
const MAX_STRING_LENGTH = 1000;

const SENSITIVE_EXACT_KEYS = new Set([
  'phone',
  'phonenumber',
  'mobile',
  'mobilenumber',
  'whatsapp',
  'whatsappnumber',
  'email',
  'emailaddress',
  'gst',
  'gstin',
  'customername',
  'buyername',
  'contactname',
  'contactperson',
  'fullname',
  'firstname',
  'lastname',
  'address',
  'streetaddress',
  'billingaddress',
  'shippingaddress',
  'password',
  'passcode',
  'pin',
  'otp',
  'authorization',
  'proxyauthorization',
  'cookie',
  'setcookie',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'bearertoken',
  'apikey',
  'secret',
  'clientsecret',
  'webhooksecret',
  'encryptionkey',
  'privatekey',
  'cardnumber',
  'cardno',
  'cvv',
  'cvc',
  'upi',
  'upiid',
  'bankaccount',
  'accountnumber',
  'ifsc',
  'paymentcredential',
  'paymentcredentials',
  'rawpayload',
  'requestbody',
  'responsebody',
]);

const SENSITIVE_KEY_FRAGMENTS = Object.freeze([
  'password',
  'passwd',
  'secret',
  'authorization',
  'cookie',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'bearertoken',
  'apikey',
  'privatekey',
  'encryptionkey',
  'clientsecret',
  'webhooksecret',
  'cardnumber',
  'paymentcredential',
]);

function cleanText(value, maxLength = MAX_STRING_LENGTH) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeToken(value, maxLength = 120) {
  return cleanText(value, maxLength)
    .toUpperCase()
    .replace(/[^A-Z0-9_\-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key) {
  const normalized = normalizeKey(key);

  if (!normalized) {
    return false;
  }

  if (SENSITIVE_EXACT_KEYS.has(normalized)) {
    return true;
  }

  return SENSITIVE_KEY_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment)
  );
}

function redactSensitiveText(value, maxLength = MAX_STRING_LENGTH) {
  let text = cleanText(value, maxLength * 2);

  if (!text) {
    return '';
  }

  text = text.replace(
    /\bBearer\s+[A-Za-z0-9._~+\/-]+=*\b/gi,
    'Bearer [REDACTED]'
  );

  text = text.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    '[REDACTED_EMAIL]'
  );

  text = text.replace(
    /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/gi,
    '[REDACTED_GST]'
  );

  text = text.replace(
    /(?<![A-Za-z0-9])\+?\d(?:[\s().-]*\d){9,15}(?![A-Za-z0-9])/g,
    '[REDACTED_NUMBER]'
  );

  text = text.replace(
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    '[REDACTED_TOKEN]'
  );

  return text.slice(0, maxLength);
}

function sanitizeMetadata(value, depth = 0, seen = new WeakSet()) {
  if (value === undefined || value === null) {
    return value ?? null;
  }

  if (depth > MAX_METADATA_DEPTH) {
    return '[TRUNCATED_DEPTH]';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    if (typeof value === 'string') {
      return redactSensitiveText(value);
    }

    return value;
  }

  if (typeof value === 'bigint') {
    return String(value);
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString();
  }

  if (mongoose.isValidObjectId(value)) {
    return String(value);
  }

  if (Buffer.isBuffer(value)) {
    return '[BINARY_REDACTED]';
  }

  if (value instanceof Error) {
    return {
      name: cleanText(value.name, 120),
      code: normalizeToken(value.code || '', 160),
      message: redactSensitiveText(value.message, 1000),
    };
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) =>
        sanitizeMetadata(item, depth + 1, seen)
      );
  }

  if (typeof value !== 'object') {
    return redactSensitiveText(String(value));
  }

  if (seen.has(value)) {
    return '[CIRCULAR]';
  }

  seen.add(value);

  const output = {};

  const entries = Object.entries(value).slice(
    0,
    MAX_METADATA_KEYS
  );

  for (const [key, item] of entries) {
    const safeKey = cleanText(key, 120);

    if (!safeKey) {
      continue;
    }

    if (isSensitiveKey(safeKey)) {
      output[safeKey] = '[REDACTED]';
      continue;
    }

    output[safeKey] = sanitizeMetadata(
      item,
      depth + 1,
      seen
    );
  }

  seen.delete(value);

  return output;
}

function normalizeObjectId(value) {
  if (!value) {
    return null;
  }

  const candidate =
    typeof value === 'object' && value !== null
      ? value._id || value.id || value
      : value;

  if (!mongoose.isValidObjectId(candidate)) {
    return null;
  }

  return candidate;
}

function normalizeRetryCount(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }

  return Math.floor(numeric);
}

function normalizeHttpStatus(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const numeric = Number(value);

  if (
    !Number.isInteger(numeric) ||
    numeric < 100 ||
    numeric > 599
  ) {
    return null;
  }

  return numeric;
}

function normalizeDuration(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const numeric = Number(value);

  if (
    !Number.isFinite(numeric) ||
    numeric < 0
  ) {
    return null;
  }

  return Math.round(numeric);
}

function normalizeOccurredAt(value) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? new Date()
    : date;
}

function validateEnum(value, set, fieldName) {
  const normalized =
    normalizeToken(value);

  if (!set.has(normalized)) {
    const error = new Error(
      `Invalid operational log ${fieldName}: ${
        normalized || '(empty)'
      }`
    );

    error.code =
      'OPERATIONAL_LOG_VALIDATION_FAILED';

    throw error;
  }

  return normalized;
}

function buildErrorFields(error) {
  if (!error) {
    return {
      errorCode: '',
      errorMessage: '',
    };
  }

  return {
    errorCode: normalizeToken(
      error.code ||
        error.name ||
        'ERROR',
      160
    ),

    errorMessage: redactSensitiveText(
      error.message ||
        String(error),
      1000
    ),
  };
}

function buildRequestContext(req) {
  if (!req) {
    return {};
  }

  const requestId =
    cleanText(
      req.id ||
        req.requestId ||
        req.headers?.['x-request-id'] ||
        '',
      160
    );

  const correlationId =
    cleanText(
      req.correlationId ||
        req.headers?.['x-correlation-id'] ||
        requestId,
      160
    );

  const actorId =
    normalizeObjectId(
      req.user?.employeeDbId ||
        req.user?._id ||
        null
    );

  return {
    requestId,
    correlationId,
    actorId,
  };
}

async function recordOperationalLog(
  payload = {}
) {
  const category =
    validateEnum(
      payload.category,
      CATEGORY_SET,
      'category'
    );

  const outcome =
    validateEnum(
      payload.outcome,
      OUTCOME_SET,
      'outcome'
    );

  const severity =
    validateEnum(
      payload.severity ||
        (
          outcome === 'FAILURE' ||
          outcome === 'MANUAL_RECOVERY'
            ? 'ERROR'
            : outcome ===
              'RETRY_SCHEDULED'
              ? 'WARN'
              : 'INFO'
        ),
      SEVERITY_SET,
      'severity'
    );

  const operation =
    normalizeToken(
      payload.operation,
      120
    );

  if (!operation) {
    const error = new Error(
      'Operational log operation is required.'
    );

    error.code =
      'OPERATIONAL_LOG_VALIDATION_FAILED';

    throw error;
  }

  const errorFields =
    payload.error
      ? buildErrorFields(
          payload.error
        )
      : {
          errorCode:
            normalizeToken(
              payload.errorCode ||
                '',
              160
            ),

          errorMessage:
            redactSensitiveText(
              payload.errorMessage ||
                '',
              1000
            ),
        };

  const document = {
    category,
    operation,
    outcome,
    severity,

    leadId:
      normalizeObjectId(
        payload.leadId
      ),

    quotationId:
      normalizeObjectId(
        payload.quotationId
      ),

    analyticsEventId:
      normalizeObjectId(
        payload.analyticsEventId
      ),

    entityType:
      normalizeToken(
        payload.entityType ||
          '',
        80
      ),

    entityId:
      redactSensitiveText(
        payload.entityId ||
          '',
        160
      ),

    actorId:
      normalizeObjectId(
        payload.actorId
      ),

    provider:
      normalizeToken(
        payload.provider ||
          '',
        120
      ),

    requestId:
      redactSensitiveText(
        payload.requestId ||
          '',
        160
      ),

    correlationId:
      redactSensitiveText(
        payload.correlationId ||
          '',
        160
      ),

    idempotencyKey:
      redactSensitiveText(
        payload.idempotencyKey ||
          '',
        220
      ),

    retryCount:
      normalizeRetryCount(
        payload.retryCount
      ),

    httpStatus:
      normalizeHttpStatus(
        payload.httpStatus
      ),

    durationMs:
      normalizeDuration(
        payload.durationMs
      ),

    errorCode:
      errorFields.errorCode,

    errorMessage:
      errorFields.errorMessage,

    metadata:
      sanitizeMetadata(
        payload.metadata ||
          {}
      ),

    occurredAt:
      normalizeOccurredAt(
        payload.occurredAt
      ),
  };

  return OperationalLog.create(
    document
  );
}

async function safeRecordOperationalLog(
  payload = {}
) {
  try {
    return await recordOperationalLog(
      payload
    );

  } catch (error) {
    logger.warn(
      '[Operational Log] Persistence failed',
      {
        category:
          normalizeToken(
            payload.category ||
              '',
            80
          ),

        operation:
          normalizeToken(
            payload.operation ||
              '',
            120
          ),

        outcome:
          normalizeToken(
            payload.outcome ||
              '',
            80
          ),

        error:
          redactSensitiveText(
            error.message,
            300
          ),
      }
    );

    return null;
  }
}

function createCategoryLogger(
  category
) {
  return async function categoryLogger(
    operation,
    outcome,
    details = {}
  ) {
    return safeRecordOperationalLog({
      ...details,
      category,
      operation,
      outcome,
    });
  };
}

const logLeadApi =
  createCategoryLogger(
    'LEAD_API'
  );

const logDatabaseWrite =
  createCategoryLogger(
    'DATABASE_WRITE'
  );

const logCrmSync =
  createCategoryLogger(
    'CRM_SYNC'
  );

const logRetry =
  createCategoryLogger(
    'RETRY'
  );

const logNotification =
  createCategoryLogger(
    'NOTIFICATION'
  );

const logQuotation =
  createCategoryLogger(
    'QUOTATION'
  );

const logTracking =
  createCategoryLogger(
    'TRACKING'
  );

module.exports = {
  MAX_METADATA_DEPTH,
  MAX_METADATA_KEYS,
  MAX_ARRAY_ITEMS,

  redactSensitiveText,
  sanitizeMetadata,
  buildErrorFields,
  buildRequestContext,

  recordOperationalLog,
  safeRecordOperationalLog,

  logLeadApi,
  logDatabaseWrite,
  logCrmSync,
  logRetry,
  logNotification,
  logQuotation,
  logTracking,
};
