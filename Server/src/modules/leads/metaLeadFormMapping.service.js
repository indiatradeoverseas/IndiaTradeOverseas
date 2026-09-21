/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.12: Meta Instant Form field-mapping service
 *
 * Why this exists:
 * Meta Instant Form custom/internal field names are deployment data, not
 * business rules defined by the DPR. This adapter therefore refuses to guess
 * field names or consent semantics.
 *
 * It converts the neutral `fields` object returned by metaLeadAds.service.js
 * into the canonical input expected by metaInstantFormLead.service.js only
 * when an explicit mapping is supplied through environment configuration.
 *
 * No Page/Form/Campaign IDs, market, MOQ, price, freight, delivery capability
 * or consent values are invented here.
 *
 * Additional integrity rules:
 * - one Meta field name cannot silently populate multiple canonical fields;
 * - required phone data must actually exist in the fetched record;
 * - optional consent rules are either fully configured (field + exact value)
 *   or treated as a visible configuration problem;
 * - multi-value consent fields may contain the configured exact value, while
 *   ordinary canonical fields must resolve to one unambiguous value;
 * - if utmCampaign is explicitly mapped, utmSource and utmMedium must also be
 *   explicitly mapped so downstream governed-UTM validation is possible.
 */

const SUPPORTED_CANONICAL_FIELDS = Object.freeze([
  'customerName',
  'companyName',
  'phone',
  'email',
  'country',
  'gst',
  'product',
  'productVariant',
  'grade',
  'specification',
  'quantity',
  'quantityValue',
  'quantityUnit',
  'quantityBand',
  'destination',
  'timeline',
  'completedPriceCheck',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'utmTerm',
  'fbclid',
]);

const REQUIRED_CANONICAL_FIELDS = Object.freeze([
  'phone',
]);

function configurationError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function cleanText(value, maxLength = 2000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeFieldName(value) {
  return cleanText(value, 250).toLowerCase();
}

function parseFieldMap(rawValue) {
  const raw = cleanText(rawValue, 20000);

  if (!raw) {
    return {
      mapping: {},
      error: null,
    };
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      mapping: {},
      error: 'META_LEAD_ADS_FIELD_MAP_JSON must be valid JSON.',
    };
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    return {
      mapping: {},
      error: 'META_LEAD_ADS_FIELD_MAP_JSON must be a JSON object.',
    };
  }

  const mapping = {};
  const sourceOwners = new Map();

  for (
    const [
      canonicalKey,
      metaFieldName
    ] of Object.entries(parsed)
  ) {
    if (
      !SUPPORTED_CANONICAL_FIELDS.includes(
        canonicalKey
      )
    ) {
      return {
        mapping: {},
        error:
          `Unsupported canonical Meta Lead Ads field mapping key: ${canonicalKey}`,
      };
    }

    const normalizedMetaFieldName =
      normalizeFieldName(
        metaFieldName
      );

    if (!normalizedMetaFieldName) {
      return {
        mapping: {},
        error:
          `Meta Lead Ads mapping for ${canonicalKey} must contain a real field name.`,
      };
    }

    const existingOwner =
      sourceOwners.get(
        normalizedMetaFieldName
      );

    if (
      existingOwner &&
      existingOwner !==
        canonicalKey
    ) {
      return {
        mapping: {},
        error:
          `Meta Lead Ads field "${normalizedMetaFieldName}" cannot map to both ${existingOwner} and ${canonicalKey}.`,
      };
    }

    sourceOwners.set(
      normalizedMetaFieldName,
      canonicalKey
    );

    mapping[
      canonicalKey
    ] =
      normalizedMetaFieldName;
  }

  if (
    mapping.utmCampaign &&
    (
      !mapping.utmSource ||
      !mapping.utmMedium
    )
  ) {
    return {
      mapping: {},
      error:
        'Mapping utmCampaign requires explicit utmSource and utmMedium mappings.',
    };
  }

  return {
    mapping,
    error: null,
  };
}

function getExactConsentRule(prefix) {
  return {
    field: normalizeFieldName(
      process.env[`${prefix}_FIELD`]
    ),
    value: cleanText(
      process.env[`${prefix}_VALUE`],
      500
    ),
  };
}

function getMetaLeadFormMappingConfig() {
  const parsedFieldMap = parseFieldMap(
    process.env.META_LEAD_ADS_FIELD_MAP_JSON
  );

  const privacyVersion = cleanText(
    process.env.META_LEAD_ADS_PRIVACY_VERSION,
    120
  );

  const contactConsent = getExactConsentRule(
    'META_LEAD_ADS_CONTACT_CONSENT'
  );

  const marketingConsent = getExactConsentRule(
    'META_LEAD_ADS_MARKETING_CONSENT'
  );

  const analyticsConsent = getExactConsentRule(
    'META_LEAD_ADS_ANALYTICS_CONSENT'
  );

  const advertisingConsent = getExactConsentRule(
    'META_LEAD_ADS_ADVERTISING_CONSENT'
  );

  const missing = [];
  const formIds = cleanText(process.env.META_LEAD_ADS_FORM_IDS, 4000).split(',').map(value => value.trim()).filter(Boolean);
  if (!formIds.length) missing.push('META_LEAD_ADS_FORM_IDS');
  const consentFields = [contactConsent, marketingConsent, analyticsConsent, advertisingConsent].map(rule => rule.field).filter(Boolean);
  if (new Set(consentFields).size !== consentFields.length || consentFields.some(field => Object.values(parsedFieldMap.mapping).includes(field))) {
    missing.push('META_LEAD_ADS_CONSENT_FIELD_COLLISION');
  }

  if (parsedFieldMap.error) {
    missing.push('META_LEAD_ADS_FIELD_MAP_JSON_INVALID');
  }

  for (const requiredKey of REQUIRED_CANONICAL_FIELDS) {
    if (!parsedFieldMap.mapping[requiredKey]) {
      missing.push(
        `META_LEAD_ADS_FIELD_MAP_JSON.${requiredKey}`
      );
    }
  }

  if (!privacyVersion) {
    missing.push('META_LEAD_ADS_PRIVACY_VERSION');
  }

  if (!contactConsent.field) {
    missing.push('META_LEAD_ADS_CONTACT_CONSENT_FIELD');
  }

  if (!contactConsent.value) {
    missing.push('META_LEAD_ADS_CONTACT_CONSENT_VALUE');
  }

  const optionalConsentRules = [
    [
      'META_LEAD_ADS_MARKETING_CONSENT',
      marketingConsent,
    ],
    [
      'META_LEAD_ADS_ANALYTICS_CONSENT',
      analyticsConsent,
    ],
    [
      'META_LEAD_ADS_ADVERTISING_CONSENT',
      advertisingConsent,
    ],
  ];

  optionalConsentRules.forEach(
    ([prefix, rule]) => {
      const partiallyConfigured =
        Boolean(
          rule.field ||
          rule.value
        );

      const fullyConfigured =
        Boolean(
          rule.field &&
          rule.value
        );

      if (
        partiallyConfigured &&
        !fullyConfigured
      ) {
        if (!rule.field) {
          missing.push(
            `${prefix}_FIELD`
          );
        }

        if (!rule.value) {
          missing.push(
            `${prefix}_VALUE`
          );
        }
      }
    }
  );

  return {
    configured: missing.length === 0,
    missing,
    fieldMap: parsedFieldMap.mapping,
    formIds,
    fieldMapError: parsedFieldMap.error,
    privacyVersion,
    consentRules: {
      contact: contactConsent,
      marketing: marketingConsent,
      analytics: analyticsConsent,
      advertising: advertisingConsent,
    },
  };
}

function requireMappingConfig() {
  const config = getMetaLeadFormMappingConfig();

  if (!config.configured) {
    throw configurationError(
      `Meta Lead Ads form mapping is incomplete: ${config.missing.join(', ')}`,
      'META_LEAD_ADS_FORM_MAPPING_NOT_CONFIGURED'
    );
  }

  if (config.fieldMapError) {
    throw configurationError(
      config.fieldMapError,
      'META_LEAD_ADS_FIELD_MAP_INVALID'
    );
  }

  return config;
}

function getNeutralFieldValues(
  fields,
  configuredFieldName
) {
  if (
    !fields ||
    typeof fields !== 'object' ||
    Array.isArray(fields)
  ) {
    return [];
  }

  const key =
    normalizeFieldName(
      configuredFieldName
    );

  if (!key) {
    return [];
  }

  const value =
    fields[key];

  const values =
    Array.isArray(value)
      ? value
      : [value];

  return [
    ...new Set(
      values
        .map(
          (item) =>
            cleanText(
              item
            )
        )
        .filter(Boolean)
    ),
  ];
}

function getSingleNeutralFieldValue(
  fields,
  configuredFieldName,
  canonicalKey
) {
  const values =
    getNeutralFieldValues(
      fields,
      configuredFieldName
    );

  if (
    values.length > 1
  ) {
    throw configurationError(
      `Meta field mapped to ${canonicalKey} returned multiple distinct values.`,
      'META_LEAD_ADS_FIELD_VALUE_AMBIGUOUS'
    );
  }

  return (
    values[0] ||
    ''
  );
}

function exactConsentGranted(
  fields,
  rule
) {
  if (
    !rule?.field ||
    !rule?.value
  ) {
    return false;
  }

  const actualValues =
    getNeutralFieldValues(
      fields,
      rule.field
    );

  if (
    actualValues.length === 0
  ) {
    return false;
  }

  return actualValues.length === 1 && actualValues[0] === rule.value;
}

function coerceMappedBoolean(value) {
  if (value === true || value === false) {
    return value;
  }

  const normalized = cleanText(value, 20).toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
}

function mapConfiguredFields(
  fields,
  fieldMap
) {
  const mapped = {};

  for (
    const [
      canonicalKey,
      metaFieldName
    ] of Object.entries(
      fieldMap
    )
  ) {
    const value =
      getSingleNeutralFieldValue(
        fields,
        metaFieldName,
        canonicalKey
      );

    if (value === '') {
      continue;
    }

    if (
      canonicalKey ===
      'completedPriceCheck'
    ) {
      const booleanValue =
        coerceMappedBoolean(
          value
        );

      if (
        booleanValue !==
        undefined
      ) {
        mapped[
          canonicalKey
        ] =
          booleanValue;
      }

      continue;
    }

    if (
      [
        'utmSource',
        'utmMedium',
        'utmCampaign',
        'utmContent',
      ].includes(
        canonicalKey
      )
    ) {
      mapped[
        canonicalKey
      ] =
        value.toLowerCase();

      continue;
    }

    mapped[
      canonicalKey
    ] =
      value;
  }

  REQUIRED_CANONICAL_FIELDS.forEach(
    (requiredKey) => {
      if (
        !cleanText(
          mapped[
            requiredKey
          ]
        )
      ) {
        throw configurationError(
          `Required mapped Meta Lead Ads field is missing from the fetched record: ${requiredKey}`,
          'META_LEAD_ADS_REQUIRED_FIELD_MISSING'
        );
      }
    }
  );

  return mapped;
}

/**
 * Converts one verified/fetched Meta Lead Ads record into the neutral,
 * canonical payload accepted by createMetaInstantFormLeadRecord().
 *
 * `metaRecord` is expected to come from metaLeadAds.service.js.
 * Webhook identifiers are trusted only after the webhook signature has been
 * verified by the caller.
 */
function mapMetaLeadRecordToCanonicalInput({
  metaRecord,
  webhookChange = {},
}) {
  if (
    !metaRecord ||
    typeof metaRecord !== 'object' ||
    Array.isArray(metaRecord)
  ) {
    throw configurationError(
      'Fetched Meta lead record is required.',
      'META_LEAD_ADS_RECORD_REQUIRED'
    );
  }

  const config = requireMappingConfig();
  const formId = cleanText(metaRecord.metaFormId || webhookChange.formId, 160);
  if (!config.formIds.includes(formId)) {
    throw configurationError('Meta form is not configured for this explicit mapping.', 'META_INSTANT_FORM_FORM_NOT_ALLOWED');
  }

  const fields =
    metaRecord.fields &&
    typeof metaRecord.fields === 'object' &&
    !Array.isArray(metaRecord.fields)
      ? metaRecord.fields
      : {};

  const contactConsentField =
    config.consentRules
      .contact.field;

  const canonicalOwnerOfContactConsent =
    Object.entries(
      config.fieldMap
    ).find(
      ([, metaFieldName]) =>
        metaFieldName ===
        contactConsentField
    );

  if (
    canonicalOwnerOfContactConsent
  ) {
    throw configurationError(
      `Contact-consent field cannot also be mapped as canonical field ${canonicalOwnerOfContactConsent[0]}.`,
      'META_LEAD_ADS_CONSENT_FIELD_COLLISION'
    );
  }

  const mapped = mapConfiguredFields(
    fields,
    config.fieldMap
  );

  const contactAllowed = exactConsentGranted(
    fields,
    config.consentRules.contact
  );

  const marketingAllowed = exactConsentGranted(
    fields,
    config.consentRules.marketing
  );

  const analyticsAllowed = exactConsentGranted(
    fields,
    config.consentRules.analytics
  );

  const advertisingAllowed = exactConsentGranted(
    fields,
    config.consentRules.advertising
  );

  /*
   * Contact permission is intentionally NOT defaulted to true.
   * If the configured field/value is absent or does not match exactly,
   * metaInstantFormLead.service.js will reject sales-workflow persistence.
   */
  return {
    ...mapped,

    metaLeadId: cleanText(
      metaRecord.metaLeadId ||
        webhookChange.leadgenId,
      500
    ),

    metaFormId: cleanText(
      metaRecord.metaFormId ||
        webhookChange.formId,
      160
    ),

    metaPageId: cleanText(
      webhookChange.pageId,
      160
    ),

    metaAdId: cleanText(
      metaRecord.metaAdId ||
        webhookChange.adId,
      160
    ),

    consent: {
      contactAllowed,
      marketingAllowed,
      analyticsAllowed,
      advertisingAllowed,
      privacyVersion: config.privacyVersion,
      trackingConsentCapturedAt: null,
    },
  };
}

function getMetaLeadFormMappingStatus() {
  const config = getMetaLeadFormMappingConfig();

  return {
    configured: config.configured,
    missing: [...config.missing],
    mappedCanonicalFields:
      Object.keys(
        config.fieldMap
      ),

    governedUtmMappingConfigured:
      Boolean(
        config.fieldMap.utmCampaign &&
        config.fieldMap.utmSource &&
        config.fieldMap.utmMedium
      ),

    contactConsentConfigured: Boolean(
      config.consentRules.contact.field &&
        config.consentRules.contact.value
    ),
    optionalConsentConfigured: {
      marketing: Boolean(
        config.consentRules.marketing.field &&
          config.consentRules.marketing.value
      ),
      analytics: Boolean(
        config.consentRules.analytics.field &&
          config.consentRules.analytics.value
      ),
      advertising: Boolean(
        config.consentRules.advertising.field &&
          config.consentRules.advertising.value
      ),
    },
  };
}

module.exports = {
  SUPPORTED_CANONICAL_FIELDS,
  REQUIRED_CANONICAL_FIELDS,
  getMetaLeadFormMappingConfig,
  getMetaLeadFormMappingStatus,
  mapMetaLeadRecordToCanonicalInput,
};
