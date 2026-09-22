const mongoose = require('mongoose');

const ControlledCampaign =
  require('./controlledCampaign.model');

const {
  DELIVERY_CAPABILITIES,
  MARKET_PRIORITIES,
  ACQUISITION_PATHS,
  CREATIVE_ANGLES,
  CONTROLLED_TEST_GUARDRAILS,
  META_UTM_STANDARD,
  PHASE_4_EXIT_CRITERION
} = require('./controlledCampaign.constants');


/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.3: Controlled Stone campaign service
 *
 * What this service does:
 * - persists one-product / one-market controlled campaign configuration;
 * - enforces the DPR's 3–5 distinct creative guardrail;
 * - enforces governed Meta UTM naming;
 * - records Operations confirmation and Management approval separately;
 * - evaluates campaign readiness without inventing commercial values;
 * - blocks clearly prohibited configurations such as:
 *   * delivery = NOT_SUPPORTED
 *   * priority = D / Do Not Advertise
 *
 * What this service does NOT do:
 * - launch Meta ads;
 * - choose a market or product for the business;
 * - invent MOQ, price, freight, margin, budget or delivery promises;
 * - declare the Phase 4 exit criterion achieved from clicks alone;
 * - fabricate qualified-lead or revenue results.
 */


function cleanText(value, maxLength = 1000) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}


function hasOwn(object, key) {
  return Boolean(
    object &&
    Object.prototype.hasOwnProperty.call(
      object,
      key
    )
  );
}


function createValidationError(
  message,
  code = 'CONTROLLED_CAMPAIGN_VALIDATION_FAILED'
) {
  const error = new Error(message);
  error.code = code;
  error.status = 400;
  return error;
}


function createNotFoundError() {
  const error =
    new Error(
      'Controlled campaign was not found.'
    );

  error.code =
    'CONTROLLED_CAMPAIGN_NOT_FOUND';

  error.status = 404;

  return error;
}


function normalizeLowercaseKey(
  value,
  fieldName
) {
  const normalized =
    cleanText(value, 160)
      .toLowerCase();

  if (!normalized) {
    throw createValidationError(
      `${fieldName} is required.`
    );
  }

  if (
    !/^[a-z0-9][a-z0-9_-]*$/.test(
      normalized
    )
  ) {
    throw createValidationError(
      `${fieldName} must use lowercase letters, numbers, underscores or hyphens.`
    );
  }

  return normalized;
}


function requireFiniteNumber(
  value,
  fieldName
) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    throw createValidationError(
      `${fieldName} is required.`
    );
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw createValidationError(
      `${fieldName} must be a valid number.`
    );
  }

  return number;
}


function normalizeManagementBudget(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw createValidationError(
      'managementBudget is required for Management approval.',
      'CONTROLLED_CAMPAIGN_BUDGET_REQUIRED'
    );
  }

  const currency = cleanText(
    value.currency,
    10
  ).toUpperCase();

  const amount = requireFiniteNumber(
    value.amount,
    'managementBudget.amount'
  );

  const basis = cleanText(
    value.basis,
    120
  );

  if (!currency) {
    throw createValidationError(
      'managementBudget.currency is required.',
      'CONTROLLED_CAMPAIGN_BUDGET_REQUIRED'
    );
  }

  if (amount <= 0) {
    throw createValidationError(
      'managementBudget.amount must be greater than zero.',
      'CONTROLLED_CAMPAIGN_BUDGET_REQUIRED'
    );
  }

  if (!basis) {
    throw createValidationError(
      'managementBudget.basis is required.',
      'CONTROLLED_CAMPAIGN_BUDGET_REQUIRED'
    );
  }

  return {
    currency,
    amount,
    basis
  };
}


function normalizeAudienceExclusionDecision(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw createValidationError(
      'Audience exclusion decision is required.'
    );
  }

  const scope =
    cleanText(
      value.scope,
      240
    );

  const rationale =
    cleanText(
      value.rationale,
      1000
    );

  const evidenceReference =
    cleanText(
      value.evidenceReference,
      1000
    );

  if (!scope) {
    throw createValidationError(
      'audienceExclusion.scope is required.'
    );
  }

  if (!rationale) {
    throw createValidationError(
      'audienceExclusion.rationale is required.'
    );
  }

  if (
    typeof value.requiredForGenericAcquisition !==
    'boolean'
  ) {
    throw createValidationError(
      'audienceExclusion.requiredForGenericAcquisition must be explicitly true or false.'
    );
  }

  if (
    typeof value.applied !==
    'boolean'
  ) {
    throw createValidationError(
      'audienceExclusion.applied must be explicitly true or false.'
    );
  }

  if (
    value.applied &&
    !evidenceReference
  ) {
    throw createValidationError(
      'audienceExclusion.evidenceReference is required when an exclusion is marked applied.',
      'CONTROLLED_CAMPAIGN_AUDIENCE_EXCLUSION_EVIDENCE_REQUIRED'
    );
  }

  return {
    scope,
    rationale,

    requiredForGenericAcquisition:
      value.requiredForGenericAcquisition,

    applied:
      value.applied,

    evidenceReference:
      value.applied
        ? evidenceReference
        : ''
  };
}


function normalizeVerificationType(value) {
  const type = cleanText(value, 80).toUpperCase();
  const allowed = new Set([
    'LANDING_EXPERIENCE',
    'CREATIVE_CLAIMS',
    'WEBSITE_ATTRIBUTION',
    'META_INSTANT_FORM_ATTRIBUTION'
  ]);

  if (!allowed.has(type)) {
    throw createValidationError(
      'verificationType is invalid.'
    );
  }

  return type;
}


function normalizeVerificationEvidence(
  value
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw createValidationError(
      'verificationEvidence is required when a pre-launch check is marked verified.',
      'CONTROLLED_CAMPAIGN_VERIFICATION_EVIDENCE_REQUIRED'
    );
  }

  const reference =
    cleanText(
      value.reference,
      1000
    );

  const notes =
    cleanText(
      value.notes,
      2000
    );

  if (!reference) {
    throw createValidationError(
      'verificationEvidence.reference is required when a pre-launch check is marked verified.',
      'CONTROLLED_CAMPAIGN_VERIFICATION_EVIDENCE_REQUIRED'
    );
  }

  return {
    reference,
    notes
  };
}


function normalizeMoneyRange(
  value,
  fieldName
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw createValidationError(
      `${fieldName} is required.`
    );
  }

  const currency =
    cleanText(
      value.currency,
      10
    ).toUpperCase();

  const unit =
    cleanText(
      value.unit,
      60
    );

  const min =
    requireFiniteNumber(
      value.min,
      `${fieldName}.min`
    );

  const max =
    requireFiniteNumber(
      value.max,
      `${fieldName}.max`
    );

  if (!currency) {
    throw createValidationError(
      `${fieldName}.currency is required.`
    );
  }

  if (!unit) {
    throw createValidationError(
      `${fieldName}.unit is required.`
    );
  }

  if (
    !Number.isFinite(min) ||
    min < 0
  ) {
    throw createValidationError(
      `${fieldName}.min must be a non-negative number.`
    );
  }

  if (
    !Number.isFinite(max) ||
    max < min
  ) {
    throw createValidationError(
      `${fieldName}.max must be greater than or equal to min.`
    );
  }

  return {
    currency,
    min,
    max,
    unit
  };
}


function normalizeMinimumCommercialQuantity(
  value
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw createValidationError(
      'minimumCommercialQuantity is required.'
    );
  }

  const quantity =
    requireFiniteNumber(
      value.value,
      'minimumCommercialQuantity.value'
    );

  const unit =
    cleanText(
      value.unit,
      40
    );

  if (
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    throw createValidationError(
      'minimumCommercialQuantity.value must be a non-negative number.'
    );
  }

  if (!unit) {
    throw createValidationError(
      'minimumCommercialQuantity.unit is required.'
    );
  }

  return {
    value: quantity,
    unit
  };
}


function normalizeTargetMarket(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw createValidationError(
      'targetMarket is required.'
    );
  }

  const type =
    cleanText(
      value.type,
      40
    ).toUpperCase();

  const name =
    cleanText(
      value.name,
      160
    );

  if (
    ![
      'CITY',
      'DISTRICT',
      'CORRIDOR'
    ].includes(type)
  ) {
    throw createValidationError(
      'targetMarket.type must be CITY, DISTRICT or CORRIDOR.'
    );
  }

  if (!name) {
    throw createValidationError(
      'targetMarket.name is required.'
    );
  }

  return {
    type,
    name
  };
}


function normalizeCreative(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw createValidationError(
      'Each creative must be an object.'
    );
  }

  const angle =
    cleanText(
      value.angle,
      80
    ).toUpperCase();

  if (
    !Object.values(
      CREATIVE_ANGLES
    ).includes(angle)
  ) {
    throw createValidationError(
      'Creative angle is not part of the Master DPR controlled-test matrix.'
    );
  }

  const name =
    cleanText(
      value.name,
      160
    );

  const message =
    cleanText(
      value.message,
      2000
    );

  const assetReference =
    cleanText(
      value.assetReference,
      1000
    );

  const utmContent =
    normalizeLowercaseKey(
      value.utmContent,
      'utmContent'
    );

  if (!name) {
    throw createValidationError(
      'Creative name is required.'
    );
  }


  if (!assetReference) {
    throw createValidationError(
      'Creative assetReference is required.'
    );
  }

  return {
    ...(mongoose.isValidObjectId(value._id) ? { _id: value._id } : {}),
    angle,
    name,
    message,
    assetReference,
    utmContent,

    metaAdId:
      cleanText(
        value.metaAdId,
        160
      ),

    metaCreativeId:
      cleanText(
        value.metaCreativeId,
        160
      )
  };
}


function normalizeCreatives(values) {
  if (!Array.isArray(values)) {
    throw createValidationError(
      'creatives must be an array.'
    );
  }

  if (
    values.length <
      CONTROLLED_TEST_GUARDRAILS.minCreativeCount ||
    values.length >
      CONTROLLED_TEST_GUARDRAILS.maxCreativeCount
  ) {
    throw createValidationError(
      'Controlled campaign must contain 3–5 creatives.'
    );
  }

  const creatives =
    values.map(
      normalizeCreative
    );

  const angles =
    creatives.map(
      (item) => item.angle
    );

  if (
    new Set(angles).size !==
    angles.length
  ) {
    throw createValidationError(
      'Controlled campaign creatives must use distinct DPR creative angles.'
    );
  }

  const utmContents =
    creatives.map(
      (item) =>
        item.utmContent
    );

  if (
    new Set(utmContents).size !==
    utmContents.length
  ) {
    throw createValidationError(
      'Each creative must have a unique utmContent value.'
    );
  }

  return creatives;
}


function normalizeAcquisitionPaths(values) {
  if(values===undefined)return [ACQUISITION_PATHS.WEBSITE,ACQUISITION_PATHS.META_INSTANT_FORM];
  if(!Array.isArray(values)||!values.length||values.length>2)throw createValidationError('Select one or both controlled acquisition alternatives.');
  const normalized=values.map(v=>cleanText(v,80).toUpperCase());
  if(new Set(normalized).size!==normalized.length||normalized.some(v=>!Object.values(ACQUISITION_PATHS).includes(v)))throw createValidationError('Invalid acquisition path.');
  return normalized;
}


function normalizeMarketSelection(
  value
) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw createValidationError(
      'marketSelection is required.'
    );
  }

  const product =
    cleanText(
      value.product,
      160
    );

  const source =
    cleanText(
      value.source,
      160
    );

  const marginBand =
    cleanText(
      value.marginBand,
      120
    );

  const deliveryCapability =
    cleanText(
      value.deliveryCapability,
      80
    ).toUpperCase();

  const priority =
    cleanText(
      value.priority,
      10
    ).toUpperCase();

  if (!product) {
    throw createValidationError(
      'marketSelection.product is required.'
    );
  }

  if (!source) {
    throw createValidationError(
      'marketSelection.source is required.'
    );
  }

  if (!marginBand) {
    throw createValidationError(
      'marketSelection.marginBand is required.'
    );
  }

  if (
    !Object.values(
      DELIVERY_CAPABILITIES
    ).includes(
      deliveryCapability
    )
  ) {
    throw createValidationError(
      'marketSelection.deliveryCapability is invalid.'
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      MARKET_PRIORITIES,
      priority
    )
  ) {
    throw createValidationError(
      'marketSelection.priority must be A, B, C or D.'
    );
  }

  return {
    product,
    source,

    targetMarket:
      normalizeTargetMarket(
        value.targetMarket
      ),

    minimumCommercialQuantity:
      normalizeMinimumCommercialQuantity(
        value.minimumCommercialQuantity
      ),

    materialEconomics:
      normalizeMoneyRange(
        value.materialEconomics,
        'materialEconomics'
      ),

    freightEconomics:
      normalizeMoneyRange(
        value.freightEconomics,
        'freightEconomics'
      ),

    expectedSellingRange:
      normalizeMoneyRange(
        value.expectedSellingRange,
        'expectedSellingRange'
      ),

    marginBand,
    deliveryCapability,
    priority
  };
}


function buildCampaignPayload(
  input,
  actorId,
  isUpdate = false
) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw createValidationError(
      'Controlled campaign payload is required.'
    );
  }

  const landingPage =
    cleanText(
      input.landingPage,
      1000
    );

  const campaignPromise =
    cleanText(
      input.campaignPromise,
      1000
    );

  const buyerContext =
    cleanText(
      input.buyerContext,
      300
    );

  if (!landingPage) {
    throw createValidationError(
      'landingPage is required.'
    );
  }

  if (!campaignPromise && !isUpdate) {
    throw createValidationError(
      'campaignPromise is required.'
    );
  }

  if (!buyerContext) {
    throw createValidationError(
      'buyerContext is required.'
    );
  }

  const payload = {
    acquisitionPaths:
      normalizeAcquisitionPaths(
        input.acquisitionPaths
      ),

    marketSelection:
      normalizeMarketSelection(
        input.marketSelection
      ),

    landingPage,
    campaignPromise,
    buyerContext,

    utm: {
      source:
        META_UTM_STANDARD.source,

      medium:
        META_UTM_STANDARD.medium,

      campaign:
        normalizeLowercaseKey(
          input?.utm?.campaign ||
          input.utmCampaign,
          'utmCampaign'
        )
    },

    creatives:
      normalizeCreatives(
        input.creatives
      ),

    metaCampaignId:
      cleanText(
        input.metaCampaignId,
        160
      ),

    metaAdSetId:
      cleanText(
        input.metaAdSetId,
        160
      )
  };

  if (actorId) {
    payload.updatedBy =
      actorId;

    if (!isUpdate) {
      payload.createdBy =
        actorId;
    }
  }

  /**
   * Generic create/update calls are deliberately unable to set:
   * - Operations confirmation timestamp/actor
   * - Management approval timestamp/actor/budget
   * - audience-exclusion decision/evidence
   * - pre-launch verification timestamps/actors/evidence
   *
   * Those governance actions use dedicated service methods so a normal
   * campaign edit cannot silently self-confirm, self-approve or self-verify.
   */

  return payload;
}


function evaluateCampaignReadiness(
  campaign
) {
  const reasons = [];
  try { normalizeMarketSelection(campaign?.marketSelection); } catch { reasons.push('OPERATIONS_INPUTS_INCOMPLETE'); }
  try { normalizeCreatives(campaign?.creatives); } catch { reasons.push('CREATIVE_CONFIGURATION_INCOMPLETE'); }
  try { normalizeLowercaseKey(campaign?.utm?.campaign, 'utmCampaign'); } catch { reasons.push('UTM_CAMPAIGN_MISSING'); }
  const warnings = [];

  const market =
    campaign?.marketSelection ||
    {};

  const creatives =
    Array.isArray(
      campaign?.creatives
    )
      ? campaign.creatives
      : [];

  const acquisitionPaths =
    Array.isArray(
      campaign?.acquisitionPaths
    )
      ? campaign.acquisitionPaths
      : [];

  if (
    !campaign?.operationsInputsConfirmedAt
  ) {
    reasons.push(
      'OPERATIONS_INPUTS_NOT_CONFIRMED'
    );
  }

  if (
    !campaign?.managementApprovalAt
  ) {
    reasons.push(
      'MANAGEMENT_APPROVAL_NOT_RECORDED'
    );
  }

  if (
    !campaign?.managementBudget ||
    !cleanText(campaign?.managementBudget?.currency, 10) ||
    !Number.isFinite(Number(campaign?.managementBudget?.amount)) ||
    Number(campaign?.managementBudget?.amount) <= 0 ||
    !cleanText(campaign?.managementBudget?.basis, 120)
  ) {
    reasons.push(
      'MANAGEMENT_BUDGET_NOT_RECORDED'
    );
  }

  if (
    market.deliveryCapability ===
    DELIVERY_CAPABILITIES.NOT_SUPPORTED
  ) {
    reasons.push(
      'DELIVERY_NOT_SUPPORTED'
    );
  }

  if (
    market.priority === 'D'
  ) {
    reasons.push(
      'MARKET_PRIORITY_DO_NOT_ADVERTISE'
    );
  }

  if (
    creatives.length <
      CONTROLLED_TEST_GUARDRAILS.minCreativeCount ||
    creatives.length >
      CONTROLLED_TEST_GUARDRAILS.maxCreativeCount
  ) {
    reasons.push(
      'CREATIVE_COUNT_OUTSIDE_DPR_RANGE'
    );
  }

  if (
    new Set(
      creatives.map(
        (item) => item.angle
      )
    ).size !==
    creatives.length
  ) {
    reasons.push(
      'CREATIVE_ANGLES_NOT_DISTINCT'
    );
  }

  if (
    creatives.some(
      (item) =>
        !cleanText(
          item?.message,
          2000
        )
    )
  ) {
    reasons.push(
      'CREATIVE_MESSAGE_MISSING'
    );
  }

  const pathSet =
    new Set(
      acquisitionPaths
    );

  if(!pathSet.size || [...pathSet].some(path=>!Object.values(ACQUISITION_PATHS).includes(path))) reasons.push('CONTROLLED_ACQUISITION_PATH_MISSING');

  if (
    campaign?.utm?.source !==
      META_UTM_STANDARD.source ||
    campaign?.utm?.medium !==
      META_UTM_STANDARD.medium
  ) {
    reasons.push(
      'UTM_STANDARD_MISMATCH'
    );
  }

  if (
    !cleanText(
      campaign?.landingPage,
      1000
    )
  ) {
    reasons.push(
      'MATCHED_LANDING_PAGE_MISSING'
    );
  }

  if (
    !cleanText(
      campaign?.campaignPromise,
      1000
    )
  ) {
    reasons.push(
      'CAMPAIGN_PROMISE_MISSING'
    );
  }

  if (
    !cleanText(
      campaign?.audienceExclusion?.scope,
      240
    ) ||
    !cleanText(
      campaign?.audienceExclusion?.rationale,
      1000
    )
  ) {
    reasons.push(
      'AUDIENCE_EXCLUSION_DECISION_NOT_RECORDED'
    );
  }

  if (
    campaign?.audienceExclusion
      ?.requiredForGenericAcquisition ===
      true &&
    campaign?.audienceExclusion
      ?.applied !==
      true
  ) {
    reasons.push(
      'AUDIENCE_EXCLUSION_REQUIRED_NOT_APPLIED'
    );
  }

  if (
    campaign?.audienceExclusion
      ?.applied ===
      true &&
    !cleanText(
      campaign?.audienceExclusion
        ?.evidenceReference,
      1000
    )
  ) {
    reasons.push(
      'AUDIENCE_EXCLUSION_EVIDENCE_MISSING'
    );
  }

  /**
   * The DPR defines A/B/C/D priority meanings, but does not say that
   * B or C must always be blocked from a controlled test.
   * Therefore they are warnings, not invented hard-stop rules.
   */
  if (
    market.priority === 'B'
  ) {
    warnings.push(
      'MARKET_PRIORITY_TEST'
    );
  }

  if (
    market.priority === 'C'
  ) {
    warnings.push(
      'MARKET_PRIORITY_LIMITED'
    );
  }

  if (
    market.deliveryCapability ===
    DELIVERY_CAPABILITIES.CONSTRAINED
  ) {
    warnings.push(
      'DELIVERY_CAPABILITY_CONSTRAINED'
    );
  }

  return {
    ready:
      reasons.length === 0,

    reasons,
    warnings,

    phase4ExitCriterion:
      PHASE_4_EXIT_CRITERION,

    /**
     * Important:
     * readiness means "configuration may proceed to the controlled test".
     * It does NOT mean Phase 4 has passed. The DPR exit criterion remains
     * real qualified leads observed.
     */
    exitCriterionAchieved:
      false
  };
}


async function getCampaignById(
  campaignId
) {
  if (
    !mongoose.Types.ObjectId.isValid(
      campaignId
    )
  ) {
    throw createNotFoundError();
  }

  const campaign =
    await ControlledCampaign.findById(
      campaignId
    );

  if (!campaign) {
    throw createNotFoundError();
  }

  return campaign;
}


async function createControlledCampaign(
  input,
  actorId = null
) {
  const payload =
    buildCampaignPayload(
      input,
      actorId,
      false
    );

  try {
    const campaign =
      await ControlledCampaign.create(
        payload
      );

    return {
      campaign,
      readiness:
        evaluateCampaignReadiness(
          campaign
        )
    };
  } catch (error) {
    if (
      error?.code === 11000
    ) {
      throw createValidationError(
        'A controlled campaign with this UTM campaign key already exists.',
        'CONTROLLED_CAMPAIGN_UTM_DUPLICATE'
      );
    }

    throw error;
  }
}


async function updateControlledCampaign(
  campaignId,
  input,
  actorId = null
) {
  const existing =
    await getCampaignById(
      campaignId
    );

  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw createValidationError(
      'Controlled campaign update payload is required.'
    );
  }

  const plainExisting =
    existing.toObject({
      depopulate: true,
      versionKey: false,
    });

  const mergeObject = (
    existingValue,
    incomingValue
  ) => {
    if (
      !incomingValue ||
      typeof incomingValue !== 'object' ||
      Array.isArray(incomingValue)
    ) {
      return existingValue || {};
    }

    return {
      ...(existingValue || {}),
      ...incomingValue,
    };
  };

  const existingMarket =
    plainExisting.marketSelection || {};

  const incomingMarket =
    input.marketSelection &&
    typeof input.marketSelection === 'object' &&
    !Array.isArray(input.marketSelection)
      ? input.marketSelection
      : null;

  const mergedMarketSelection =
    incomingMarket
      ? {
          ...existingMarket,
          ...incomingMarket,

          targetMarket:
            mergeObject(
              existingMarket.targetMarket,
              incomingMarket.targetMarket
            ),

          minimumCommercialQuantity:
            mergeObject(
              existingMarket.minimumCommercialQuantity,
              incomingMarket.minimumCommercialQuantity
            ),

          materialEconomics:
            mergeObject(
              existingMarket.materialEconomics,
              incomingMarket.materialEconomics
            ),

          freightEconomics:
            mergeObject(
              existingMarket.freightEconomics,
              incomingMarket.freightEconomics
            ),

          expectedSellingRange:
            mergeObject(
              existingMarket.expectedSellingRange,
              incomingMarket.expectedSellingRange
            ),
        }
      : existingMarket;

  const existingUtm =
    plainExisting.utm || {};

  const incomingUtm =
    input.utm &&
    typeof input.utm === 'object' &&
    !Array.isArray(input.utm)
      ? input.utm
      : {};

  const effectiveInput = {
    acquisitionPaths:
      hasOwn(input, 'acquisitionPaths')
        ? input.acquisitionPaths
        : plainExisting.acquisitionPaths,

    marketSelection:
      mergedMarketSelection,

    landingPage:
      hasOwn(input, 'landingPage')
        ? input.landingPage
        : plainExisting.landingPage,

    campaignPromise:
      hasOwn(input, 'campaignPromise')
        ? input.campaignPromise
        : plainExisting.campaignPromise,

    buyerContext:
      hasOwn(input, 'buyerContext')
        ? input.buyerContext
        : plainExisting.buyerContext,

    utm: {
      ...existingUtm,
      ...incomingUtm,

      campaign:
        hasOwn(input, 'utmCampaign')
          ? input.utmCampaign
          : hasOwn(incomingUtm, 'campaign')
          ? incomingUtm.campaign
          : existingUtm.campaign,
    },

    creatives:
      hasOwn(input, 'creatives')
        ? input.creatives
        : plainExisting.creatives,

    metaCampaignId:
      hasOwn(input, 'metaCampaignId')
        ? input.metaCampaignId
        : plainExisting.metaCampaignId,

    metaAdSetId:
      hasOwn(input, 'metaAdSetId')
        ? input.metaAdSetId
        : plainExisting.metaAdSetId,
  };

  const payload =
    buildCampaignPayload(
      effectiveInput,
      actorId,
      true
    );

  const businessSnapshot = (value) => ({
    acquisitionPaths:
      value?.acquisitionPaths || [],
    marketSelection:
      value?.marketSelection || {},
    landingPage:
      cleanText(value?.landingPage, 1000),
    campaignPromise:
      cleanText(value?.campaignPromise, 1000),
    buyerContext:
      cleanText(value?.buyerContext, 300),
    utmCampaign:
      cleanText(value?.utm?.campaign, 160),
    creatives:
      (value?.creatives || []).map(
        (creative) => ({
          angle: creative?.angle || '',
          name: cleanText(creative?.name, 160),
          message: cleanText(creative?.message, 2000),
          assetReference:
            cleanText(creative?.assetReference, 1000),
          utmContent:
            cleanText(creative?.utmContent, 160),
        })
      ),
  });

  const metaIdentitySnapshot = (value) => ({
    metaCampaignId:
      cleanText(value?.metaCampaignId, 160),
    metaAdSetId:
      cleanText(value?.metaAdSetId, 160),
    creatives:
      (value?.creatives || []).map(
        (creative) => ({
          utmContent:
            cleanText(creative?.utmContent, 160),
          metaAdId:
            cleanText(creative?.metaAdId, 160),
          metaCreativeId:
            cleanText(creative?.metaCreativeId, 160),
        })
      ),
  });

  const businessChanged =
    JSON.stringify(
      businessSnapshot(plainExisting)
    ) !==
    JSON.stringify(
      businessSnapshot(payload)
    );

  const metaIdentityChanged =
    JSON.stringify(
      metaIdentitySnapshot(plainExisting)
    ) !==
    JSON.stringify(
      metaIdentitySnapshot(payload)
    );

  const commercialChanged = JSON.stringify(plainExisting.marketSelection) !== JSON.stringify(payload.marketSelection);
  const creativeChanged = JSON.stringify(businessSnapshot(plainExisting).creatives) !== JSON.stringify(businessSnapshot(payload).creatives);
  const landingChanged = ['landingPage', 'campaignPromise', 'buyerContext'].some(key => plainExisting[key] !== payload[key]);
  const pathsChanged = JSON.stringify(plainExisting.acquisitionPaths) !== JSON.stringify(payload.acquisitionPaths);
  const utmChanged = plainExisting.utm?.campaign !== payload.utm?.campaign;
  if (commercialChanged) {
    existing.operationsInputsConfirmedAt = null;
    existing.operationsInputsConfirmedBy = null;
  }
  if (businessChanged) {
    existing.managementApprovalAt = null;
    existing.managementApprovedBy = null;
  }
  const resetVerification = (prefix, key) => {
    existing[prefix + 'VerifiedAt'] = null;
    existing[prefix + 'VerifiedBy'] = null;
    if (!existing.prelaunchVerificationEvidence) existing.prelaunchVerificationEvidence = {};
    existing.prelaunchVerificationEvidence[key] = null;
  };
  if (commercialChanged || landingChanged || creativeChanged) {
    resetVerification('landingExperience', 'landingExperience');
    resetVerification('creativeClaims', 'creativeClaims');
  }
  if (businessChanged || metaIdentityChanged) {
    resetVerification('websiteAttribution', 'websiteAttribution');
    resetVerification('metaInstantFormAttribution', 'metaInstantFormAttribution');
    const affected = new Set(['DASHBOARD_ATTRIBUTION','UTM_PERSISTENCE','META_PIXEL_EVENTS','META_CAPI_EVENTS','PIXEL_CAPI_DEDUPLICATION']);
    if(businessChanged) for(const key of ['REAL_LANDING_URL','PUBLIC_PRODUCT_CONTENT','REQUIREMENT_BUILDER','PRODUCT_EVENT','QUANTITY_EVENT','DESTINATION_VALIDATION','TIMELINE_SELECTION','ELIGIBILITY','SOFT_GATE_TIMING','LEAD_SCORING','QUALIFIED_STATUS','QUOTATION_FLOW']) affected.add(key);
    existing.releaseChecks = (existing.releaseChecks || []).filter(check => !affected.has(check.key));
  }
  if (commercialChanged || pathsChanged || utmChanged || metaIdentityChanged) {
    existing.audienceExclusion = { scope: '', rationale: '', requiredForGenericAcquisition: false, applied: false, evidenceReference: '', recordedAt: null, recordedBy: null };
  }

  try {
    Object.assign(
      existing,
      payload
    );

    const campaign =
      await existing.save();

    return {
      campaign,
      readiness:
        evaluateCampaignReadiness(
          campaign
        ),
      invalidated: {
        businessApprovals:
          businessChanged,
        attributionVerification:
          businessChanged ||
          metaIdentityChanged,
      },
    };
  } catch (error) {
    if (
      error?.code === 11000
    ) {
      throw createValidationError(
        'A controlled campaign with this UTM campaign key already exists.',
        'CONTROLLED_CAMPAIGN_UTM_DUPLICATE'
      );
    }

    throw error;
  }
}


async function confirmOperationsInputs(
  campaignId,
  actorId = null
) {
  const campaign =
    await getCampaignById(
      campaignId
    );

  if (
    campaign.operationsInputsConfirmedAt &&
    campaign.operationsInputsConfirmedBy
  ) {
    return {
      campaign,
      readiness:
        evaluateCampaignReadiness(
          campaign
        ),
      reused: true,
    };
  }

  if (actorId) {
    campaign.updatedBy =
      actorId;
  }

  normalizeMarketSelection(campaign.marketSelection);
  campaign.operationsInputsConfirmedAt =
    new Date();

  campaign.operationsInputsConfirmedBy =
    actorId || null;

  campaign.managementApprovalAt =
    null;

  campaign.managementApprovedBy =
    null;


  await campaign.save();

  return {
    campaign,
    readiness:
      evaluateCampaignReadiness(
        campaign
      ),
    reused: false,
  };
}


async function recordManagementApproval(
  campaignId,
  approvalInput = {},
  actorId = null
) {
  const campaign =
    await getCampaignById(
      campaignId
    );

  if (
    !campaign.operationsInputsConfirmedAt
  ) {
    throw createValidationError(
      'Operations inputs must be confirmed before Management approval.',
      'CONTROLLED_CAMPAIGN_OPERATIONS_CONFIRMATION_REQUIRED'
    );
  }

  if (
    campaign.marketSelection
      ?.deliveryCapability ===
      DELIVERY_CAPABILITIES.NOT_SUPPORTED
  ) {
    throw createValidationError(
      'A market marked not supported cannot be approved for advertising.',
      'CONTROLLED_CAMPAIGN_DELIVERY_NOT_SUPPORTED'
    );
  }

  if (
    campaign.marketSelection
      ?.priority === 'D'
  ) {
    throw createValidationError(
      'A Priority D market is marked Do Not Advertise in the Master DPR.',
      'CONTROLLED_CAMPAIGN_DO_NOT_ADVERTISE'
    );
  }

  const nextBudget =
    normalizeManagementBudget(
      approvalInput?.managementBudget
    );

  const currentBudget =
    campaign.managementBudget
      ? {
          currency:
            cleanText(
              campaign.managementBudget.currency,
              10
            ).toUpperCase(),
          amount:
            Number(
              campaign.managementBudget.amount
            ),
          basis:
            cleanText(
              campaign.managementBudget.basis,
              120
            ),
        }
      : null;

  const budgetUnchanged =
    currentBudget &&
    currentBudget.currency === nextBudget.currency &&
    currentBudget.amount === nextBudget.amount &&
    currentBudget.basis === nextBudget.basis;

  if (
    campaign.managementApprovalAt &&
    campaign.managementApprovedBy &&
    budgetUnchanged
  ) {
    return {
      campaign,
      readiness:
        evaluateCampaignReadiness(
          campaign
        ),
      reused: true,
    };
  }

  campaign.managementBudget =
    nextBudget;

  if (actorId) {
    campaign.updatedBy =
      actorId;
  }

  campaign.managementApprovalAt =
    new Date();

  campaign.managementApprovedBy =
    actorId || null;

  await campaign.save();

  return {
    campaign,
    readiness:
      evaluateCampaignReadiness(
        campaign
      ),
    reused: false,
  };
}


async function recordAudienceExclusionDecision(
  campaignId,
  input = {},
  actorId = null
) {
  const campaign =
    await getCampaignById(campaignId);

  const decision =
    normalizeAudienceExclusionDecision(input);

  campaign.audienceExclusion = {
    ...decision,
    recordedAt: new Date(),
    recordedBy: actorId || null,
  };

  if (actorId) {
    campaign.updatedBy = actorId;
  }

  await campaign.save();

  return {
    campaign,
    readiness:
      evaluateCampaignReadiness(campaign),
  };
}


async function recordPrelaunchVerification(
  campaignId,
  input = {},
  actorId = null
) {
  const campaign =
    await getCampaignById(campaignId);

  const verificationType =
    normalizeVerificationType(
      input.verificationType
    );

  if (
    typeof input.verified !==
    'boolean'
  ) {
    throw createValidationError(
      'verified must be explicitly true or false.'
    );
  }

  const verified =
    input.verified;

  const verificationEvidence =
    verified
      ? normalizeVerificationEvidence(
          input.verificationEvidence
        )
      : null;

  const at =
    verified
      ? new Date()
      : null;

  const by =
    verified
      ? actorId || null
      : null;

  const fieldMap = {
    LANDING_EXPERIENCE: {
      atField:
        'landingExperienceVerifiedAt',
      byField:
        'landingExperienceVerifiedBy',
      evidenceField:
        'landingExperience',
    },

    CREATIVE_CLAIMS: {
      atField:
        'creativeClaimsVerifiedAt',
      byField:
        'creativeClaimsVerifiedBy',
      evidenceField:
        'creativeClaims',
    },

    WEBSITE_ATTRIBUTION: {
      atField:
        'websiteAttributionVerifiedAt',
      byField:
        'websiteAttributionVerifiedBy',
      evidenceField:
        'websiteAttribution',
    },

    META_INSTANT_FORM_ATTRIBUTION: {
      atField:
        'metaInstantFormAttributionVerifiedAt',
      byField:
        'metaInstantFormAttributionVerifiedBy',
      evidenceField:
        'metaInstantFormAttribution',
    },
  };

  const {
    atField,
    byField,
    evidenceField,
  } = fieldMap[
    verificationType
  ];

  campaign[atField] =
    at;

  campaign[byField] =
    by;

  if (
    !campaign.prelaunchVerificationEvidence
  ) {
    campaign.prelaunchVerificationEvidence = {};
  }

  campaign.prelaunchVerificationEvidence[
    evidenceField
  ] = verificationEvidence;

  if (actorId) {
    campaign.updatedBy =
      actorId;
  }

  await campaign.save();

  return {
    campaign,

    readiness:
      evaluateCampaignReadiness(
        campaign
      ),

    verificationType,
    verified,

    verificationEvidence:
      verified
        ? verificationEvidence
        : null
  };
}


async function getControlledCampaign(
  campaignId
) {
  const campaign =
    await getCampaignById(
      campaignId
    );

  return {
    campaign,
    readiness:
      evaluateCampaignReadiness(
        campaign
      )
  };
}


async function listControlledCampaigns(
  query = {}
) {
  const filter = {};

  const priority =
    cleanText(
      query.priority,
      10
    ).toUpperCase();

  const deliveryCapability =
    cleanText(
      query.deliveryCapability,
      80
    ).toUpperCase();

  if (priority) {
    if (
      !Object.prototype.hasOwnProperty.call(
        MARKET_PRIORITIES,
        priority
      )
    ) {
      throw createValidationError(
        'priority must be A, B, C or D.'
      );
    }

    filter[
      'marketSelection.priority'
    ] = priority;
  }

  if (deliveryCapability) {
    if (
      !Object.values(
        DELIVERY_CAPABILITIES
      ).includes(
        deliveryCapability
      )
    ) {
      throw createValidationError(
        'deliveryCapability is invalid.'
      );
    }

    filter[
      'marketSelection.deliveryCapability'
    ] =
      deliveryCapability;
  }

  const campaigns =
    await ControlledCampaign.find(
      filter
    )
      .sort({
        createdAt: -1
      })
      .lean();

  return campaigns.map(
    (campaign) => ({
      campaign,
      readiness:
        evaluateCampaignReadiness(
          campaign
        )
    })
  );
}


module.exports = {
  createControlledCampaign,
  updateControlledCampaign,
  getControlledCampaign,
  listControlledCampaigns,
  confirmOperationsInputs,
  recordManagementApproval,
  recordAudienceExclusionDecision,
  recordPrelaunchVerification,
  evaluateCampaignReadiness
};
