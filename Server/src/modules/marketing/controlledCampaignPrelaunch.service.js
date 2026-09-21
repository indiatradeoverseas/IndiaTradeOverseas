const mongoose = require('mongoose');

const ControlledCampaign =
  require('./controlledCampaign.model');

const {
  evaluateCampaignReadiness,
} = require('./controlledCampaign.service');

const {
  getMetaLeadAdsStatus,
} = require('../leads/metaLeadAds.service');

const {
  getMetaLeadFormMappingStatus,
} = require('../leads/metaLeadFormMapping.service');

const {
  getControlledCampaignAudienceReview,
} = require('./controlledCampaignAudience.service');

const {
  ACQUISITION_PATHS,
  PHASE_4_EXIT_CRITERION,
} = require('./controlledCampaign.constants');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.23: Controlled campaign pre-launch review
 *
 * Purpose:
 * Combine the already-implemented Phase 4 controls into one read-only
 * pre-launch review without inventing commercial or Meta data.
 *
 * This service does NOT:
 * - launch an ad;
 * - mark Phase 4 complete;
 * - invent Meta IDs/credentials;
 * - invent market, MOQ, price, freight, margin or serviceability;
 * - automatically decide the final audience-exclusion scope;
 * - treat a timestamp/button click as sufficient proof of verification.
 *
 * It only reports what the system can prove from existing persisted/configured
 * data. Manual pre-launch checks are considered evidenced only when both the
 * verification timestamp and a real stored evidence reference are present.
 */

function serviceError(
  message,
  code,
  statusCode = 400
) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function cleanText(value, maxLength = 1000) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

async function getCampaign(campaignId) {
  if (
    !mongoose.Types.ObjectId.isValid(
      campaignId
    )
  ) {
    throw serviceError(
      'Controlled campaign not found.',
      'CONTROLLED_CAMPAIGN_NOT_FOUND',
      404
    );
  }

  const campaign =
    await ControlledCampaign
      .findById(campaignId)
      .lean();

  if (!campaign) {
    throw serviceError(
      'Controlled campaign not found.',
      'CONTROLLED_CAMPAIGN_NOT_FOUND',
      404
    );
  }

  return campaign;
}

function getVerificationEvidence(
  campaign,
  key
) {
  const evidence =
    campaign?.prelaunchVerificationEvidence?.[
      key
    ];

  const reference =
    cleanText(
      evidence?.reference,
      1000
    );

  const notes =
    cleanText(
      evidence?.notes,
      2000
    );

  return {
    reference:
      reference || null,

    notes:
      notes || null,

    present:
      Boolean(reference && notes)
  };
}

function verificationIsEvidenced(
  campaign,
  timestampField,
  evidenceKey
) {
  const evidence =
    getVerificationEvidence(
      campaign,
      evidenceKey
    );

  return Boolean(
    campaign?.[timestampField] &&
    campaign?.[timestampField.replace('VerifiedAt','VerifiedBy')] &&
    evidence.present
  );
}

function hasAcquisitionPath(
  campaign,
  path
) {
  return (
    Array.isArray(
      campaign?.acquisitionPaths
    ) &&
    campaign.acquisitionPaths.includes(
      path
    )
  );
}

function buildWebsitePathReview(
  campaign,
  campaignReadiness
) {
  const enabled =
    hasAcquisitionPath(
      campaign,
      ACQUISITION_PATHS.WEBSITE
    );

  const landingPagePresent =
    Boolean(
      cleanText(
        campaign?.landingPage,
        1000
      )
    );

  const blockers = [];

  if (!enabled) {
    blockers.push(
      'WEBSITE_PATH_NOT_CONFIGURED'
    );
  }

  if (!landingPagePresent) {
    blockers.push(
      'MATCHED_LANDING_PAGE_MISSING'
    );
  }

  if (!campaignReadiness.ready) {
    blockers.push(
      'CAMPAIGN_CONFIGURATION_NOT_READY'
    );
  }

  const landingEvidence =
    getVerificationEvidence(
      campaign,
      'landingExperience'
    );

  const websiteAttributionEvidence =
    getVerificationEvidence(
      campaign,
      'websiteAttribution'
    );

  const landingExperienceVerified =
    verificationIsEvidenced(
      campaign,
      'landingExperienceVerifiedAt',
      'landingExperience'
    );

  const websiteAttributionVerified =
    verificationIsEvidenced(
      campaign,
      'websiteAttributionVerifiedAt',
      'websiteAttribution'
    );

  if (!landingExperienceVerified) {
    globalBlockers.push('LANDING_EXPERIENCE_NOT_VERIFIED');
    blockers.push(
      campaign?.landingExperienceVerifiedAt
        ? 'LANDING_EXPERIENCE_EVIDENCE_MISSING'
        : 'LANDING_EXPERIENCE_NOT_VERIFIED'
    );
  }

  if (!websiteAttributionVerified) {
    blockers.push(
      campaign?.websiteAttributionVerifiedAt
        ? 'WEBSITE_ATTRIBUTION_EVIDENCE_MISSING'
        : 'WEBSITE_ATTRIBUTION_NOT_VERIFIED'
    );
  }

  return {
    enabled,

    technicallyPrepared:
      blockers.length === 0,

    blockers,

    landingPage:
      landingPagePresent
        ? campaign.landingPage
        : null,

    campaignPromise:
      cleanText(
        campaign?.campaignPromise,
        1000
      ) || null,

    landingExperience: {
      verified:
        landingExperienceVerified,

      verifiedAt:
        campaign?.landingExperienceVerifiedAt ||
        null,

      evidence:
        landingEvidence,
    },

    attribution: {
      verified:
        websiteAttributionVerified,

      verifiedAt:
        campaign?.websiteAttributionVerifiedAt ||
        null,

      evidence:
        websiteAttributionEvidence,
    },
  };
}

function buildMetaInstantFormPathReview(
  campaign,
  campaignReadiness
) {
  const enabled =
    hasAcquisitionPath(
      campaign,
      ACQUISITION_PATHS.META_INSTANT_FORM
    );

  const integrationStatus =
    getMetaLeadAdsStatus();

  const mappingStatus =
    getMetaLeadFormMappingStatus();

  const blockers = [];

  if (!enabled) {
    blockers.push(
      'META_INSTANT_FORM_PATH_NOT_CONFIGURED'
    );
  }

  if (!campaignReadiness.ready) {
    blockers.push(
      'CAMPAIGN_CONFIGURATION_NOT_READY'
    );
  }

  if (!integrationStatus.enabled) {
    blockers.push(
      'META_LEAD_ADS_INTEGRATION_DISABLED'
    );
  }

  if (!integrationStatus.configured) {
    blockers.push(
      'META_LEAD_ADS_CONFIGURATION_INCOMPLETE'
    );
  }

  if (!mappingStatus.configured) {
    blockers.push(
      'META_LEAD_ADS_FORM_MAPPING_INCOMPLETE'
    );
  }

  const metaAttributionEvidence =
    getVerificationEvidence(
      campaign,
      'metaInstantFormAttribution'
    );

  const metaAttributionVerified =
    verificationIsEvidenced(
      campaign,
      'metaInstantFormAttributionVerifiedAt',
      'metaInstantFormAttribution'
    );

  if (!metaAttributionVerified) {
    blockers.push(
      campaign?.metaInstantFormAttributionVerifiedAt
        ? 'META_INSTANT_FORM_ATTRIBUTION_EVIDENCE_MISSING'
        : 'META_INSTANT_FORM_ATTRIBUTION_NOT_VERIFIED'
    );
  }

  return {
    enabled,

    technicallyPrepared:
      blockers.length === 0,

    blockers,

    attribution: {
      verified:
        metaAttributionVerified,

      verifiedAt:
        campaign?.metaInstantFormAttributionVerifiedAt ||
        null,

      evidence:
        metaAttributionEvidence,
    },

    integration: {
      enabled:
        integrationStatus.enabled,
      configured:
        integrationStatus.configured,
      missing:
        integrationStatus.missing,
      pageRestricted:
        integrationStatus.pageRestricted,
    },

    formMapping: {
      configured:
        mappingStatus.configured,
      missing:
        mappingStatus.missing,
      mappedCanonicalFields:
        mappingStatus.mappedCanonicalFields,
      contactConsentConfigured:
        mappingStatus.contactConsentConfigured,
      optionalConsentConfigured:
        mappingStatus.optionalConsentConfigured,
    },
  };
}

async function getControlledCampaignPrelaunchReview(
  campaignId
) {
  const campaign =
    await getCampaign(campaignId);

  const campaignReadiness =
    evaluateCampaignReadiness(
      campaign
    );

  const [
    audienceReview,
  ] = await Promise.all([
    getControlledCampaignAudienceReview(
      campaignId
    ),
  ]);

  const websitePath =
    buildWebsitePathReview(
      campaign,
      campaignReadiness
    );

  const metaInstantFormPath =
    buildMetaInstantFormPathReview(
      campaign,
      campaignReadiness
    );

  const manualDecisionsRequired = [];
  const globalBlockers = [];
  const { releaseBlockers } = require('./campaignGovernance');
  globalBlockers.push(...releaseBlockers(campaign).map(key => `QA_${key}_NOT_VERIFIED`));
  const capi = require('../analytics/metaCapi.service').getMetaCapiStatus();
  if (!capi.enabled || !capi.configured) globalBlockers.push('META_PIXEL_CAPI_CONFIGURATION_PENDING');

  const landingExperienceVerified =
    verificationIsEvidenced(
      campaign,
      'landingExperienceVerifiedAt',
      'landingExperience'
    );

  const creativeClaimsEvidence =
    getVerificationEvidence(
      campaign,
      'creativeClaims'
    );

  const creativeClaimsVerified =
    verificationIsEvidenced(
      campaign,
      'creativeClaimsVerifiedAt',
      'creativeClaims'
    );

  if (!landingExperienceVerified) {
    manualDecisionsRequired.push(
      campaign?.landingExperienceVerifiedAt
        ? 'ADD_REAL_LANDING_EXPERIENCE_VERIFICATION_EVIDENCE'
        : 'CONFIRM_LANDING_PAGE_MATCHES_PRODUCT_GEOGRAPHY_AND_PROMISE'
    );
  }

  if (!creativeClaimsVerified) {
    manualDecisionsRequired.push(
      campaign?.creativeClaimsVerifiedAt
        ? 'ADD_REAL_CREATIVE_CLAIMS_VERIFICATION_EVIDENCE'
        : 'CONFIRM_CREATIVE_CLAIMS_ARE_VERIFIED'
    );

    globalBlockers.push(
      campaign?.creativeClaimsVerifiedAt
        ? 'CREATIVE_CLAIMS_EVIDENCE_MISSING'
        : 'CREATIVE_CLAIMS_NOT_VERIFIED'
    );
  }

  if (
    audienceReview?.recordedDecision?.recorded !== true
  ) {
    manualDecisionsRequired.push(
      'SELECT_APPROPRIATE_EXISTING_LEAD_CUSTOMER_EXCLUSION_SCOPE'
    );
    globalBlockers.push(
      'AUDIENCE_EXCLUSION_DECISION_NOT_RECORDED'
    );
  } else if (
    audienceReview?.recordedDecision
      ?.requiredForGenericAcquisition === true &&
    audienceReview?.recordedDecision
      ?.applied !== true
  ) {
    manualDecisionsRequired.push(
      'APPLY_APPROVED_EXISTING_LEAD_CUSTOMER_EXCLUSION'
    );

    globalBlockers.push(
      'AUDIENCE_EXCLUSION_NOT_APPLIED'
    );
  } else if (
    audienceReview?.recordedDecision
      ?.applied === true &&
    audienceReview?.recordedDecision
      ?.appliedWithEvidence !== true
  ) {
    manualDecisionsRequired.push(
      'ADD_REAL_AUDIENCE_EXCLUSION_APPLICATION_EVIDENCE'
    );

    globalBlockers.push(
      'AUDIENCE_EXCLUSION_EVIDENCE_MISSING'
    );
  }

  if (
    audienceReview?.externalAudienceSync
      ?.performed !== true
  ) {
    manualDecisionsRequired.push(
      'DO_NOT_ASSUME_META_AUDIENCE_SYNC_OCCURRED'
    );
  }

  const readyForControlledLaunch =
    campaignReadiness.ready &&
    (!websitePath.enabled || websitePath.technicallyPrepared) &&
    (!metaInstantFormPath.enabled || metaInstantFormPath.technicallyPrepared) &&
    globalBlockers.length === 0;


  return {
    campaign: {
      id:
        String(
          campaign._id
        ),

      vertical:
        cleanText(
          campaign.vertical,
          80
        ),

      platform:
        cleanText(
          campaign.platform,
          80
        ),

      product:
        cleanText(
          campaign?.marketSelection
            ?.product,
          160
        ),

      targetMarket: {
        type:
          cleanText(
            campaign?.marketSelection
              ?.targetMarket
              ?.type,
            80
          ),

        name:
          cleanText(
            campaign?.marketSelection
              ?.targetMarket
              ?.name,
            160
          ),
      },

      utmCampaign:
        cleanText(
          campaign?.utm?.campaign,
          160
        ),

      campaignPromise:
        cleanText(
          campaign?.campaignPromise,
          1000
        ) || null,

      managementBudget:
        campaign?.managementBudget || null,
    },

    readyForControlledLaunch,
    globalBlockers,

    verificationEvidence: {
      landingExperience: {
        verified:
          landingExperienceVerified,

        verifiedAt:
          campaign?.landingExperienceVerifiedAt ||
          null,

        evidence:
          getVerificationEvidence(
            campaign,
            'landingExperience'
          ),
      },

      creativeClaims: {
        verified:
          creativeClaimsVerified,

        verifiedAt:
          campaign?.creativeClaimsVerifiedAt ||
          null,

        evidence:
          creativeClaimsEvidence,
      },

      websiteAttribution: {
        verified:
          verificationIsEvidenced(
            campaign,
            'websiteAttributionVerifiedAt',
            'websiteAttribution'
          ),

        verifiedAt:
          campaign?.websiteAttributionVerifiedAt ||
          null,

        evidence:
          getVerificationEvidence(
            campaign,
            'websiteAttribution'
          ),
      },

      metaInstantFormAttribution: {
        verified:
          verificationIsEvidenced(
            campaign,
            'metaInstantFormAttributionVerifiedAt',
            'metaInstantFormAttribution'
          ),

        verifiedAt:
          campaign?.metaInstantFormAttributionVerifiedAt ||
          null,

        evidence:
          getVerificationEvidence(
            campaign,
            'metaInstantFormAttribution'
          ),
      },
    },

    governedConfiguration:
      campaignReadiness,

    acquisitionPaths: {
      website:
        websitePath,

      metaInstantForm:
        metaInstantFormPath,
    },

    audienceExclusionReview: {
      dprGuardrail:
        audienceReview.dprGuardrail,

      recordedDecision:
        audienceReview.recordedDecision,

      reviewScopes:
        audienceReview.reviewScopes,

      externalAudienceSync:
        audienceReview.externalAudienceSync,

      privacy:
        audienceReview.privacy,
    },

    manualDecisionsRequired,

    phase4: {
      exitCriterion:
        PHASE_4_EXIT_CRITERION,

      exitCriterionAchieved:
        false,

      note:
        'Pre-launch readiness is not Phase 4 completion. The DPR exit criterion remains real qualified leads observed.',
    },
  };
}

module.exports = {
  getControlledCampaignPrelaunchReview,
};
