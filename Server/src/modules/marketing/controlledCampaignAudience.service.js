const mongoose = require('mongoose');

const ControlledCampaign =
  require('./controlledCampaign.model');

const Contact =
  require('../leads/contact.model');

const Lead =
  require('../leads/lead.model');

const LeadActivity =
  require('../leads/leadActivity.model');

const {
  CRM_STATUS,
} = require('../leads/lead.constants');

const {
  CONTROLLED_TEST_GUARDRAILS,
} = require('./controlledCampaign.constants');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.20: Controlled campaign audience-exclusion review
 *
 * Master DPR rule:
 * Existing leads/customers should be excluded from generic acquisition where
 * appropriate, while audience creation/advertising must still follow consent,
 * privacy and platform requirements.
 *
 * This service deliberately does NOT:
 * - upload a Custom Audience to Meta;
 * - expose phone/email/GST or internal identity hashes;
 * - assume every existing Contact must be excluded from every campaign;
 * - assume advertising consent from contact existence;
 * - fabricate Meta audience IDs or sync status.
 *
 * Instead, it derives privacy-safe counts that Marketing / Operations /
 * Management can use to decide the appropriate exclusion scope before launch,
 * and it reports the recorded exclusion decision/evidence without asserting
 * that Meta accepted or synced any audience.
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

function cleanText(value, maxLength = 500) {
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

function uniqueObjectIds(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    const key = String(value);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

function countIntersection(
  primarySet,
  secondarySet
) {
  let count = 0;

  for (const value of primarySet) {
    if (secondarySet.has(value)) {
      count += 1;
    }
  }

  return count;
}

async function getCampaignById(
  campaignId
) {
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
      .select({
        _id: 1,
        vertical: 1,
        'marketSelection.product': 1,
        'marketSelection.targetMarket': 1,
        'marketSelection.priority': 1,
        operationsInputsConfirmedAt: 1,
        managementApprovalAt: 1,
        audienceExclusion: 1,
        createdAt: 1,
      })
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

/**
 * Builds a privacy-safe internal summary.
 *
 * Important:
 * "where appropriate" is preserved as a business decision. The service shows
 * both company-wide known contacts and Stone-specific known contacts instead
 * of silently choosing one exclusion scope.
 */
async function getControlledCampaignAudienceReview(
  campaignId
) {
  const campaign =
    await getCampaignById(
      campaignId
    );

  const allKnownLeadRows =
    await Lead.find({
      contactId: {
        $ne: null,
      },
    })
      .select({
        _id: 1,
        contactId: 1,
        productCategory: 1,
        crmStatus: 1,
        'consent.advertisingAllowed': 1,
      })
      .lean();

  const knownLeadIds =
    allKnownLeadRows.map(
      (lead) => lead._id
    );

  const historicalWonActivities =
    knownLeadIds.length > 0
      ? await LeadActivity.find({
          leadId: {
            $in: knownLeadIds,
          },
          actionType:
            'CRM_STATUS_CHANGED',
          'metadata.toStatus':
            CRM_STATUS.WON,
        })
          .select({
            leadId: 1,
          })
          .lean()
      : [];

  const historicalWonLeadIds =
    new Set(
      historicalWonActivities.map(
        (activity) =>
          String(activity.leadId)
      )
    );

  const allContactIds =
    uniqueObjectIds(
      allKnownLeadRows.map(
        (lead) =>
          lead.contactId
      )
    );

  const activeContacts =
    allContactIds.length > 0
      ? await Contact.find({
          _id: {
            $in: allContactIds,
          },

          status: 'ACTIVE',
        })
          .select({
            _id: 1,
          })
          .lean()
      : [];

  const activeContactIdSet =
    new Set(
      activeContacts.map(
        (contact) =>
          String(
            contact._id
          )
      )
    );

  const companyWideKnown =
    new Set();

  const stoneKnown =
    new Set();

  const customers =
    new Set();

  const stoneCustomers =
    new Set();

  const advertisingConsentObserved =
    new Set();

  for (
    const lead of allKnownLeadRows
  ) {
    const contactId =
      String(
        lead?.contactId ||
        ''
      );

    if (
      !contactId ||
      !activeContactIdSet.has(
        contactId
      )
    ) {
      continue;
    }

    companyWideKnown.add(
      contactId
    );

    const isStone =
      cleanText(
        lead?.productCategory,
        80
      ).toUpperCase() ===
      'STONE';

    if (isStone) {
      stoneKnown.add(
        contactId
      );
    }

    const isCustomer =
      cleanText(
        lead?.crmStatus,
        80
      ).toUpperCase() ===
        CRM_STATUS.WON ||
      historicalWonLeadIds.has(
        String(lead?._id || '')
      );

    if (isCustomer) {
      customers.add(
        contactId
      );

      if (isStone) {
        stoneCustomers.add(
          contactId
        );
      }
    }

    if (
      lead?.consent
        ?.advertisingAllowed ===
      true
    ) {
      advertisingConsentObserved.add(
        contactId
      );
    }
  }

  const companyWideLeadsOnly =
    companyWideKnown.size -
    customers.size;

  const stoneLeadsOnly =
    stoneKnown.size -
    stoneCustomers.size;

  const companyWideWithAdvertisingConsent =
    countIntersection(
      companyWideKnown,
      advertisingConsentObserved
    );

  const stoneWithAdvertisingConsent =
    countIntersection(
      stoneKnown,
      advertisingConsentObserved
    );

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

      operationsInputsConfirmed:
        Boolean(
          campaign
            .operationsInputsConfirmedAt
        ),

      managementApproved:
        Boolean(
          campaign
            .managementApprovalAt
        ),
    },

    dprGuardrail: {
      excludeExistingLeadsWhereAppropriate:
        CONTROLLED_TEST_GUARDRAILS
          .excludeExistingLeadsWhereAppropriate,
    },

    recordedDecision: {
      scope:
        cleanText(
          campaign?.audienceExclusion?.scope,
          240
        ) || null,
      rationale:
        cleanText(
          campaign?.audienceExclusion?.rationale,
          1000
        ) || null,
      requiredForGenericAcquisition:
        campaign?.audienceExclusion?.requiredForGenericAcquisition === true,
      applied:
        campaign?.audienceExclusion?.applied === true,

      evidenceReference:
        cleanText(
          campaign?.audienceExclusion
            ?.evidenceReference,
          1000
        ) || null,

      appliedWithEvidence:
        Boolean(
          campaign?.audienceExclusion
            ?.applied === true &&
          cleanText(
            campaign?.audienceExclusion
              ?.evidenceReference,
            1000
          )
        ),

      recordedAt:
        campaign?.audienceExclusion?.recordedAt || null,

      recorded:
        Boolean(
          cleanText(
            campaign?.audienceExclusion?.scope,
            240
          ) &&
          cleanText(
            campaign?.audienceExclusion?.rationale,
            1000
          )
        ),
    },

    reviewScopes: {
      companyWideKnownContacts: {
        total:
          companyWideKnown.size,

        leadsOnly:
          Math.max(
            companyWideLeadsOnly,
            0
          ),

        customers:
          customers.size,

        advertisingConsentObserved:
          companyWideWithAdvertisingConsent,

        advertisingConsentNotObserved:
          Math.max(
            companyWideKnown.size -
              companyWideWithAdvertisingConsent,
            0
          ),
      },

      stoneKnownContacts: {
        total:
          stoneKnown.size,

        leadsOnly:
          Math.max(
            stoneLeadsOnly,
            0
          ),

        customers:
          stoneCustomers.size,

        advertisingConsentObserved:
          stoneWithAdvertisingConsent,

        advertisingConsentNotObserved:
          Math.max(
            stoneKnown.size -
              stoneWithAdvertisingConsent,
            0
          ),
      },
    },

    externalAudienceSync: {
      performed:
        false,

      metaAudienceId:
        null,

      reason:
        'NO_APPROVED_META_AUDIENCE_SYNC_EXECUTED',

      note:
        'An internal applied/evidence decision does not prove that a Meta Custom Audience was uploaded, accepted or attached to an ad set.',
    },

    privacy: {
      personalDataReturned:
        false,

      identityHashesReturned:
        false,

      consentObservation:
        'Advertising-consent counts are derived from immutable Lead submission snapshots where advertisingAllowed was explicitly true.',

      consentRule:
        'Existing-contact status or a historical consent observation does not by itself authorize a new advertising-platform data upload. Current applicable consent/privacy requirements must still be checked.',
    },

    decisionRequired: {
      exclusionScope:
        'Marketing/Management must choose the appropriate exclusion scope using real campaign context.',

      applicationEvidence:
        'If an exclusion is marked applied, a real internal evidence reference must be recorded; this service does not infer one.',

      platformUpload:
        'Any Meta audience upload requires real platform configuration and applicable consent/privacy approval.',
    },
  };
}

module.exports = {
  getControlledCampaignAudienceReview,
};
