/**
 * India Trade Overseas — Master DPR v4.0
 * Product-specific requirement validation.
 *
 * DPR rules implemented here:
 * - Requirement builders stay product-specific.
 * - Quick enquiry remains lightweight.
 * - Detailed Commercial Enquiry / Quote Request forms remain valid high-intent
 *   entry paths and are not forced through Rice/Tea/ITO Ads builder fields.
 * - Do not invent commercial values; store only buyer-supplied inputs.
 */

const DYNAMIC_FIELDS = Object.freeze({
  RICE: [
    'grade',
    'packaging',
    'tradeType',
    'incoterm',
    'qualityRequirement',
  ],

  TEA: [
    'grade',
    'packaging',
    'tradeType',
    'privateLabelRequirement',
  ],

  ITO_ADS: [
    'businessCategory',
    'objective',
    'monthlyAdBudget',
    'budgetCurrency',
    'marketingStatus',
  ],
});

const GENERIC_CAPTURE_MODES = new Set([
  'QUICK',
  'COMMERCIAL_ENQUIRY',
  'QUOTE_REQUEST',
  'REPEAT_ORDER',
]);

function cleanText(value, maxLength = 500) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function validationError(message) {
  const error = new Error(message);
  error.code = 'VALIDATION_FAILED';
  return error;
}

function normalizeCategory(value) {
  const category = cleanText(value, 100)
    .toUpperCase()
    .replace(/\s+/g, '_');

  if (!category) {
    throw validationError('Product category is required.');
  }

  if (!/^[A-Z0-9_-]{2,100}$/.test(category)) {
    throw validationError('Invalid product category.');
  }

  return category;
}

function normalizeTradeType(value) {
  const tradeType = cleanText(value, 20).toUpperCase();

  if (!tradeType) {
    return '';
  }

  if (!['DOMESTIC', 'EXPORT'].includes(tradeType)) {
    throw validationError('Select domestic or export.');
  }

  return tradeType;
}

function buildOptionalDetails(payload = {}) {
  return {
    grade: cleanText(payload.grade, 250),
    packaging: cleanText(payload.packaging, 500),
    tradeType: normalizeTradeType(payload.tradeType),
    incoterm: cleanText(payload.incoterm, 100),
    qualityRequirement: cleanText(payload.qualityRequirement, 500),
    privateLabelRequirement: cleanText(
      payload.privateLabelRequirement,
      500
    ),
    businessCategory: cleanText(payload.businessCategory, 250),
    objective: cleanText(payload.objective, 250),
    monthlyAdBudget: cleanText(payload.monthlyAdBudget, 250),
    budgetCurrency: cleanText(payload.budgetCurrency, 20).toUpperCase(),
    marketingStatus: cleanText(payload.marketingStatus, 500),
  };
}

function normalizeProductRequirement(payload = {}) {
  const category = normalizeCategory(
    payload.productCategory || 'STONE'
  );

  const captureMode = cleanText(
    payload.captureMode || 'REQUIREMENT_BUILDER',
    50
  ).toUpperCase();

  /**
   * Master DPR section 17 keeps Quick Enquiry, Commercial Enquiry,
   * Export Quote and Customer Portal/reorder as distinct entry paths.
   * These must be persisted without being incorrectly forced through the
   * product-builder-only qualification fields.
   */
  if (GENERIC_CAPTURE_MODES.has(captureMode)) {
    return {
      category,
      details: {
        captureMode,
        ...buildOptionalDetails(payload),
      },
    };
  }

  /**
   * Dynamic product qualification flows from Master DPR section 7.
   */
  if (category === 'STONE') {
    return {
      category,
      details: {
        captureMode: 'REQUIREMENT_BUILDER',
      },
    };
  }

  const allowedFields = DYNAMIC_FIELDS[category];

  if (!allowedFields) {
    throw validationError(
      'This product category does not have a configured dynamic requirement builder.'
    );
  }

  const details = {
    captureMode: 'REQUIREMENT_BUILDER',
  };

  for (const field of allowedFields) {
    details[field] = cleanText(
      payload[field],
      field === 'budgetCurrency' ? 20 : 500
    );
  }

  if (details.tradeType) {
    details.tradeType = normalizeTradeType(details.tradeType);
  }

  const requiredFields =
    category === 'ITO_ADS'
      ? [
          'businessCategory',
          'objective',
          'monthlyAdBudget',
          'budgetCurrency',
          'marketingStatus',
        ]
      : ['grade', 'packaging', 'tradeType'];

  if (requiredFields.some((field) => !details[field])) {
    throw validationError(
      'Complete the product-specific requirement fields.'
    );
  }

  return {
    category,
    details,
  };
}

module.exports = {
  normalizeProductRequirement,
};
