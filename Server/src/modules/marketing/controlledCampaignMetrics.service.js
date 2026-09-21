const { assessAttribution } = require('./campaignAttribution');
const mongoose = require('mongoose');

const ControlledCampaign =
  require('./controlledCampaign.model');

const Lead =
  require('../leads/lead.model');

const LeadActivity =
  require('../leads/leadActivity.model');

const {
  CRM_STATUS,
} = require('../leads/lead.constants');

const {
  ACQUISITION_PATHS,
  CAMPAIGN_DECISION_METRICS,
  META_UTM_STANDARD,
  PHASE_4_EXIT_CRITERION,
} = require('./controlledCampaign.constants');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.17: Controlled campaign outcome measurement
 *
 * Purpose:
 * Derive Phase 4 business-quality outcomes from persistent CRM data for one
 * controlled Stone campaign.
 *
 * DPR rules preserved here:
 * - Website and Meta Instant Form remain separate comparison paths.
 * - CPC/CTR are not treated as final success metrics.
 * - qualified-lead, quote and order outcomes come from the canonical CRM
 *   lifecycle, including historical lifecycle transitions when a Lead later
 *   becomes LOST.
 * - CPL / CPQL are NOT fabricated because ad spend is not stored in the
 *   controlled-campaign model.
 * - gross-profit contribution is NOT fabricated because actual gross profit
 *   is not currently stored on the Lead opportunity.
 * - governed UTM matching requires the configured facebook/paid_social
 *   source-medium pair, not merely a campaign-name collision.
 * - conflicting campaign/ad attribution is excluded from decision metrics and
 *   reported separately instead of being silently assigned.
 * - creative outcomes can resolve through utmContent, Meta ad ID or Meta
 *   creative ID; conflicting creative signals remain unattributed.
 * - Phase 4 exits only when real qualified leads with trusted campaign
 *   attribution are observed.
 */

const REACHED_CONTACT_STATUS = new Set([
  CRM_STATUS.CONTACTED,
  CRM_STATUS.QUALIFIED,
  CRM_STATUS.QUOTATION_SENT,
  CRM_STATUS.NEGOTIATION,
  CRM_STATUS.WON,
]);

const REACHED_QUALIFIED_STATUS = new Set([
  CRM_STATUS.QUALIFIED,
  CRM_STATUS.QUOTATION_SENT,
  CRM_STATUS.NEGOTIATION,
  CRM_STATUS.WON,
]);

const REACHED_QUOTE_STATUS = new Set([
  CRM_STATUS.QUOTATION_SENT,
  CRM_STATUS.NEGOTIATION,
  CRM_STATUS.WON,
]);

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

function safeRate(numerator, denominator) {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0;
  }

  return Number(
    (
      (numerator / denominator) *
      100
    ).toFixed(2)
  );
}

function buildCampaignLeadFilter(
  campaign
) {
  const matchers = [];

  const utmCampaign =
    cleanText(
      campaign?.utm?.campaign,
      160
    ).toLowerCase();

  if (utmCampaign) {
    matchers.push({
      'attribution.utmSource':
        META_UTM_STANDARD.source,

      'attribution.utmMedium':
        META_UTM_STANDARD.medium,

      'attribution.utmCampaign':
        utmCampaign,
    });
  }

  const metaCampaignId =
    cleanText(
      campaign?.metaCampaignId,
      160
    );

  if (metaCampaignId) {
    matchers.push({
      'attribution.campaignId':
        metaCampaignId,
    });
  }

  const metaAdSetId =
    cleanText(
      campaign?.metaAdSetId,
      160
    );

  if (metaAdSetId) {
    matchers.push({
      'attribution.adSetId':
        metaAdSetId,
    });
  }

  const creatives =
    Array.isArray(
      campaign?.creatives
    )
      ? campaign.creatives
      : [];

  const metaAdIds =
    creatives
      .map(
        (creative) =>
          cleanText(
            creative?.metaAdId,
            160
          )
      )
      .filter(Boolean);

  if (metaAdIds.length > 0) {
    matchers.push({
      'attribution.adId': {
        $in:
          metaAdIds,
      },
    });
  }

  const metaCreativeIds =
    creatives
      .map(
        (creative) =>
          cleanText(
            creative?.metaCreativeId,
            160
          )
      )
      .filter(Boolean);

  if (
    metaCreativeIds.length > 0
  ) {
    matchers.push({
      'attribution.creativeId': {
        $in:
          metaCreativeIds,
      },
    });
  }

  if (matchers.length === 0) {
    throw serviceError(
      'Controlled campaign has no usable attribution key.',
      'CONTROLLED_CAMPAIGN_ATTRIBUTION_KEY_MISSING',
      409
    );
  }

  return {
    productCategory:
      'STONE',

    source: {
      $in: [
        'WEBSITE',
        'META_INSTANT_FORM',
      ],
    },

    $or:
      matchers,
  };
}


function buildCampaignIdentity(
  campaign
) {
  const creatives =
    Array.isArray(
      campaign?.creatives
    )
      ? campaign.creatives
      : [];

  return {
    utmCampaign:
      cleanText(
        campaign?.utm?.campaign,
        160
      ).toLowerCase(),

    metaCampaignId:
      cleanText(
        campaign?.metaCampaignId,
        160
      ),

    metaAdSetId:
      cleanText(
        campaign?.metaAdSetId,
        160
      ),

    metaAdIds:
      new Set(
        creatives
          .map(
            (creative) =>
              cleanText(
                creative?.metaAdId,
                160
              )
          )
          .filter(Boolean)
      ),

    metaCreativeIds:
      new Set(
        creatives
          .map(
            (creative) =>
              cleanText(
                creative?.metaCreativeId,
                160
              )
          )
          .filter(Boolean)
      ),
  };
}


function assessCampaignAttribution(
  lead,
  campaignIdentity
) {
  const attribution =
    lead?.attribution ||
    {};

  const positiveSignals =
    [];

  const conflicts =
    [];

  const utmCampaign =
    cleanText(
      attribution.utmCampaign,
      160
    ).toLowerCase();

  const utmSource =
    cleanText(
      attribution.utmSource,
      150
    ).toLowerCase();

  const utmMedium =
    cleanText(
      attribution.utmMedium,
      150
    ).toLowerCase();

  if (
    utmCampaign
  ) {
    if (
      campaignIdentity.utmCampaign &&
      utmCampaign ===
        campaignIdentity.utmCampaign &&
      utmSource ===
        META_UTM_STANDARD.source &&
      utmMedium ===
        META_UTM_STANDARD.medium
    ) {
      positiveSignals.push(
        'GOVERNED_UTM'
      );
    } else if (
      campaignIdentity.utmCampaign &&
      utmCampaign ===
        campaignIdentity.utmCampaign
    ) {
      conflicts.push(
        'UTM_SOURCE_MEDIUM_MISMATCH'
      );
    } else if (
      campaignIdentity.utmCampaign
    ) {
      conflicts.push(
        'UTM_CAMPAIGN_MISMATCH'
      );
    }
  }

  const campaignId =
    cleanText(
      attribution.campaignId,
      160
    );

  if (
    campaignId &&
    campaignIdentity.metaCampaignId
  ) {
    if (
      campaignId ===
      campaignIdentity.metaCampaignId
    ) {
      positiveSignals.push(
        'META_CAMPAIGN_ID'
      );
    } else {
      conflicts.push(
        'META_CAMPAIGN_ID_MISMATCH'
      );
    }
  }

  const adSetId =
    cleanText(
      attribution.adSetId,
      160
    );

  if (
    adSetId &&
    campaignIdentity.metaAdSetId
  ) {
    if (
      adSetId ===
      campaignIdentity.metaAdSetId
    ) {
      positiveSignals.push(
        'META_ADSET_ID'
      );
    } else {
      conflicts.push(
        'META_ADSET_ID_MISMATCH'
      );
    }
  }

  const adId =
    cleanText(
      attribution.adId,
      160
    );

  if (
    adId &&
    campaignIdentity.metaAdIds.size > 0
  ) {
    if (
      campaignIdentity.metaAdIds.has(
        adId
      )
    ) {
      positiveSignals.push(
        'META_AD_ID'
      );
    } else {
      conflicts.push(
        'META_AD_ID_MISMATCH'
      );
    }
  }

  const creativeId =
    cleanText(
      attribution.creativeId,
      160
    );

  if (
    creativeId &&
    campaignIdentity
      .metaCreativeIds
      .size > 0
  ) {
    if (
      campaignIdentity
        .metaCreativeIds
        .has(
          creativeId
        )
    ) {
      positiveSignals.push(
        'META_CREATIVE_ID'
      );
    } else {
      conflicts.push(
        'META_CREATIVE_ID_MISMATCH'
      );
    }
  }

  return {
    trusted:
      positiveSignals.length > 0 &&
      conflicts.length === 0,

    positiveSignals,
    conflicts,
  };
}


function getReachedStatuses(
  lead,
  statusHistory
) {
  const reached = new Set();

  const currentStatus =
    cleanText(
      lead?.crmStatus,
      80
    ).toUpperCase();

  if (currentStatus) {
    reached.add(
      currentStatus
    );
  }

  for (const entry of lead.crmHistory || []) reached.add(entry.toStatus);
  const historicalStatuses =
    statusHistory.get(
      String(lead?._id)
    ) || [];

  historicalStatuses.forEach(
    (status) => {
      const normalized =
        cleanText(
          status,
          80
        ).toUpperCase();

      if (normalized) {
        reached.add(
          normalized
        );
      }
    }
  );

  return reached;
}

function reachedAny(
  reachedStatuses,
  targetSet
) {
  for (
    const status of targetSet
  ) {
    if (
      reachedStatuses.has(
        status
      )
    ) {
      return true;
    }
  }

  return false;
}

function classifyLeadOutcome(
  lead,
  statusHistory
) {
  const reached =
    getReachedStatuses(
      lead,
      statusHistory
    );

  return {
    validContactObserved:
      reachedAny(
        reached,
        REACHED_CONTACT_STATUS
      ),

    qualifiedObserved:
      reachedAny(
        reached,
        REACHED_QUALIFIED_STATUS
      ),

    quoteObserved:
      reachedAny(
        reached,
        REACHED_QUOTE_STATUS
      ),

    orderObserved:
      reached.has(
        CRM_STATUS.WON
      ),
  };
}

function getPathKey(lead) {
  if (
    lead?.source ===
    'META_INSTANT_FORM'
  ) {
    return (
      ACQUISITION_PATHS
        .META_INSTANT_FORM
    );
  }

  return (
    ACQUISITION_PATHS
      .WEBSITE
  );
}

function createMetricBucket() {
  return {
    leads: 0,
    validContacts: 0,
    qualifiedLeads: 0,
    quotes: 0,
    orders: 0,
  };
}

function addLeadToBucket(
  bucket,
  lead,
  outcome
) {
  bucket.leads += 1;

  if (
    outcome.validContactObserved
  ) {
    bucket.validContacts += 1;
  }

  if (
    outcome.qualifiedObserved
  ) {
    bucket.qualifiedLeads += 1;
  }

  if (
    outcome.quoteObserved
  ) {
    bucket.quotes += 1;
  }

  if (
    outcome.orderObserved
  ) {
    bucket.orders += 1;
  }
}

function finalizeBucket(
  bucket
) {
  return {
    leads:
      bucket.leads,

    validContacts:
      bucket.validContacts,

    qualifiedLeads:
      bucket.qualifiedLeads,

    quotes:
      bucket.quotes,

    orders:
      bucket.orders,

    validContactRate:
      safeRate(
        bucket.validContacts,
        bucket.leads
      ),

    qualifiedLeadRate:
      safeRate(
        bucket.qualifiedLeads,
        bucket.leads
      ),

    quoteRate:
      safeRate(
        bucket.quotes,
        bucket.leads
      ),

    orderRate:
      safeRate(
        bucket.orders,
        bucket.leads
      ),
  };
}

function buildStatusHistory(
  activities
) {
  const map = new Map();

  for (
    const activity of activities
  ) {
    const leadId =
      String(
        activity?.leadId ||
        ''
      );

    const toStatus =
      cleanText(
        activity?.metadata?.toStatus,
        80
      ).toUpperCase();

    if (
      !leadId ||
      !toStatus
    ) {
      continue;
    }

    if (
      !map.has(
        leadId
      )
    ) {
      map.set(
        leadId,
        []
      );
    }

    map.get(
      leadId
    ).push(
      toStatus
    );
  }

  return map;
}

function buildCreativeAttributionIndex(
  campaign
) {
  const buckets =
    new Map();

  const byUtmContent =
    new Map();

  const byAdId =
    new Map();

  const byCreativeId =
    new Map();

  const creatives =
    Array.isArray(
      campaign?.creatives
    )
      ? campaign.creatives
      : [];

  creatives.forEach(
    (creative) => {
      const key =
        cleanText(
          creative?.utmContent,
          160
        ).toLowerCase();

      if (!key) {
        return;
      }

      buckets.set(
        key,
        {
          utmContent:
            key,

          angle:
            cleanText(
              creative?.angle,
              100
            ),

          name:
            cleanText(
              creative?.name,
              160
            ),

          metrics:
            createMetricBucket(),
        }
      );

      byUtmContent.set(
        key,
        key
      );

      const metaAdId =
        cleanText(
          creative?.metaAdId,
          160
        );

      if (metaAdId) {
        byAdId.set(
          metaAdId,
          key
        );
      }

      const metaCreativeId =
        cleanText(
          creative?.metaCreativeId,
          160
        );

      if (metaCreativeId) {
        byCreativeId.set(
          metaCreativeId,
          key
        );
      }
    }
  );

  return {
    buckets,
    byUtmContent,
    byAdId,
    byCreativeId,
  };
}


function resolveCreativeAttribution(
  lead,
  creativeIndex
) {
  const candidates =
    [];

  const utmContent =
    cleanText(
      lead?.attribution?.utmContent,
      160
    ).toLowerCase();

  if (
    utmContent &&
    creativeIndex
      .byUtmContent
      .has(
        utmContent
      )
  ) {
    candidates.push({
      key:
        creativeIndex
          .byUtmContent
          .get(
            utmContent
          ),

      basis:
        'UTM_CONTENT',
    });
  }

  const adId =
    cleanText(
      lead?.attribution?.adId,
      160
    );

  if (
    adId &&
    creativeIndex
      .byAdId
      .has(
        adId
      )
  ) {
    candidates.push({
      key:
        creativeIndex
          .byAdId
          .get(
            adId
          ),

      basis:
        'META_AD_ID',
    });
  }

  const creativeId =
    cleanText(
      lead?.attribution?.creativeId,
      160
    );

  if (
    creativeId &&
    creativeIndex
      .byCreativeId
      .has(
        creativeId
      )
  ) {
    candidates.push({
      key:
        creativeIndex
          .byCreativeId
          .get(
            creativeId
          ),

      basis:
        'META_CREATIVE_ID',
    });
  }

  const distinctKeys =
    new Set(
      candidates.map(
        (candidate) =>
          candidate.key
      )
    );

  if (
    distinctKeys.size > 1
  ) {
    return {
      key:
        null,

      basis:
        'CONFLICT',

      conflict:
        true,
    };
  }

  if (
    distinctKeys.size === 0
  ) {
    return {
      key:
        null,

      basis:
        'UNATTRIBUTED',

      conflict:
        false,
    };
  }

  const key =
    [...distinctKeys][0];

  const preferred =
    candidates.find(
      (candidate) =>
        candidate.key === key &&
        candidate.basis ===
          'UTM_CONTENT'
    ) ||
    candidates.find(
      (candidate) =>
        candidate.key === key &&
        candidate.basis ===
          'META_AD_ID'
    ) ||
    candidates[0];

  return {
    key,

    basis:
      preferred.basis,

    conflict:
      false,
  };
}


async function getControlledCampaignMetrics(
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
      .findById(
        campaignId
      )
      .lean();

  if (!campaign) {
    throw serviceError(
      'Controlled campaign not found.',
      'CONTROLLED_CAMPAIGN_NOT_FOUND',
      404
    );
  }

  const allCampaigns = await ControlledCampaign.find({}).lean();
  const leadFilter =
    buildCampaignLeadFilter(
      campaign
    );

  const leads =
    await Lead.find(
      leadFilter
    )
      .select({
        _id: 1,
        leadCode: 1,
        source: 1,
        crmStatus: 1,
        crmHistory: 1,
        commercialOutcome: 1,
        'attribution.utmSource': 1,
        'attribution.utmMedium': 1,
        'attribution.utmCampaign': 1,
        'attribution.utmContent': 1,
        'attribution.campaignId': 1,
        'attribution.adSetId': 1,
        'attribution.adId': 1,
        'attribution.creativeId': 1,
        createdAt: 1,
      })
      .lean();

  const leadIds =
    leads.map(
      (lead) =>
        lead._id
    );

  const activities =
    leadIds.length > 0
      ? await LeadActivity.find({
          leadId: {
            $in: leadIds,
          },

          actionType:
            'CRM_STATUS_CHANGED',
        })
          .select({
            leadId: 1,
            'metadata.toStatus': 1,
          })
          .lean()
      : [];

  const statusHistory =
    buildStatusHistory(
      activities
    );

  const overall =
    createMetricBucket();

  const byPath = {
    [
      ACQUISITION_PATHS
        .WEBSITE
    ]:
      createMetricBucket(),

    [
      ACQUISITION_PATHS
        .META_INSTANT_FORM
    ]:
      createMetricBucket(),
  };

  const campaignIdentity =
    buildCampaignIdentity(
      campaign
    );

  const creativeIndex =
    buildCreativeAttributionIndex(
      campaign
    );

  const attributionIntegrity = {
    candidateLeads:
      leads.length,

    trustedLeads:
      0,

    excludedConflictingLeads:
      0,

    conflictReasons: {},
  };

  const creativeAttributionCoverage = {
    attributed:
      0,

    byUtmContent:
      0,

    byMetaAdId:
      0,

    byMetaCreativeId:
      0,

    unattributed:
      0,

    conflicting:
      0,
  };

  for (
    const lead of leads
  ) {
    const campaignAttribution = assessAttribution(lead.attribution, allCampaigns);

    if (!campaignAttribution.trusted || String(campaignAttribution.campaign?._id) !== String(campaign._id)) {
      attributionIntegrity
        .excludedConflictingLeads +=
        1;

      campaignAttribution
        .conflicts
        .forEach(
          (reason) => {
            attributionIntegrity
              .conflictReasons[
                reason
              ] =
              (
                attributionIntegrity
                  .conflictReasons[
                    reason
                  ] || 0
              ) + 1;
          }
        );

      continue;
    }

    attributionIntegrity
      .trustedLeads +=
      1;

    const outcome =
      classifyLeadOutcome(
        lead,
        statusHistory
      );

    addLeadToBucket(
      overall,
      lead,
      outcome
    );

    const pathKey =
      getPathKey(
        lead
      );

    addLeadToBucket(
      byPath[
        pathKey
      ],
      lead,
      outcome
    );

    const creativeAttribution =
      resolveCreativeAttribution(
        lead,
        creativeIndex
      );

    if (
      creativeAttribution
        .conflict
    ) {
      creativeAttributionCoverage
        .conflicting +=
        1;

      continue;
    }

    if (
      !creativeAttribution.key
    ) {
      creativeAttributionCoverage
        .unattributed +=
        1;

      continue;
    }

    creativeAttributionCoverage
      .attributed +=
      1;

    if (
      creativeAttribution.basis ===
      'UTM_CONTENT'
    ) {
      creativeAttributionCoverage
        .byUtmContent +=
        1;
    } else if (
      creativeAttribution.basis ===
      'META_AD_ID'
    ) {
      creativeAttributionCoverage
        .byMetaAdId +=
        1;
    } else if (
      creativeAttribution.basis ===
      'META_CREATIVE_ID'
    ) {
      creativeAttributionCoverage
        .byMetaCreativeId +=
        1;
    }

    addLeadToBucket(
      creativeIndex
        .buckets
        .get(
          creativeAttribution.key
        )
        .metrics,
      lead,
      outcome
    );
  }

  const finalizedOverall =
    finalizeBucket(
      overall
    );

  const finalizedByPath = {
    [
      ACQUISITION_PATHS
        .WEBSITE
    ]:
      finalizeBucket(
        byPath[
          ACQUISITION_PATHS
            .WEBSITE
        ]
      ),

    [
      ACQUISITION_PATHS
        .META_INSTANT_FORM
    ]:
      finalizeBucket(
        byPath[
          ACQUISITION_PATHS
            .META_INSTANT_FORM
        ]
      ),
  };

  const byCreative =
    [
      ...creativeIndex
        .buckets
        .values()
    ]
      .map(
        (item) => ({
          utmContent:
            item.utmContent,

          angle:
            item.angle,

          name:
            item.name,

          ...finalizeBucket(
            item.metrics
          ),
        })
      );

  const trustedLeads = leads.filter(lead => { const a = assessAttribution(lead.attribution, allCampaigns); return a.trusted && String(a.campaign?._id) === String(campaign._id); });
  const actual=campaign.actualPerformance;
  const spend = actual?.reference && actual?.verifiedAt && actual?.verifiedBy && /^[A-Z]{3}$/.test(actual.currency||'') && typeof actual.amount==='number' && Number.isFinite(actual.amount) && actual.amount>=0 ? actual : null;
  const spendCohort = spend ? trustedLeads.filter(lead => new Date(lead.createdAt) <= new Date(spend.through)) : [];
  const qualifiedCohort = spendCohort.filter(lead => classifyLeadOutcome(lead, statusHistory).qualifiedObserved);
  const byCurrency = {};
  for (const lead of trustedLeads) {
    const o = lead.commercialOutcome;
    if (!o?.currency || !o.evidenceReference || !o.recordedAt || !o.recordedBy) continue;
    const bucket = byCurrency[o.currency] ||= { revenue: null, grossProfit: null, observedOrders: 0 };
    bucket.observedOrders += 1;
    for (const key of ['revenue', 'grossProfit']) if (typeof o[key] === 'number' && Number.isFinite(o[key])) bucket[key] = (bucket[key] ?? 0) + o[key];
  }
  const financial = { actualSpend: spend || null, cpl: spend && spendCohort.length ? spend.amount / spendCohort.length : null, cpql: spend && qualifiedCohort.length ? spend.amount / qualifiedCohort.length : null, currency: spend?.currency || null, byCurrency, costCohortLeads: spendCohort.length, costCohortQualifiedLeads: qualifiedCohort.length };
  const phase4ExitAchieved =
    finalizedOverall
      .qualifiedLeads > 0;

  return {
    campaign: {
      id:
        String(
          campaign._id
        ),

      utmCampaign:
        cleanText(
          campaign?.utm?.campaign,
          160
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

      plannedManagementBudget:
        campaign?.managementBudget || null,
    },

    financial,
    observedDelivery:campaign.observedDelivery || null,
    decisionMetrics:
      CAMPAIGN_DECISION_METRICS,

    observed: {
      overall:
        finalizedOverall,

      byAcquisitionPath:
        finalizedByPath,

      byCreative,

      attributionIntegrity,

      creativeAttributionCoverage,
    },

    unavailableWithoutAdditionalRealData: {
      cpl: {
        value: financial.cpl,
        reason: spend ? (financial.cpl === null ? 'NO_LEADS_IN_SPEND_COHORT' : null) : 'REAL_AD_SPEND_NOT_STORED',
      },

      cpql: {
        value: financial.cpql,
        reason: spend ? (financial.cpql === null ? 'NO_LEADS_IN_SPEND_COHORT' : null) : 'REAL_AD_SPEND_NOT_STORED',
      },

      grossProfitContribution: {
        value: Object.keys(byCurrency).length===1?Object.values(byCurrency)[0].grossProfit:null,
        currency:Object.keys(byCurrency).length===1?Object.keys(byCurrency)[0]:null,
        reason:Object.keys(byCurrency).length>1?'MULTIPLE_CURRENCIES_SEE_BREAKDOWN':Object.values(byCurrency)[0]?.grossProfit!=null?null:'ACTUAL_GROSS_PROFIT_NOT_STORED',
      },

      observedOrderValue: {
        value:Object.keys(byCurrency).length===1?Object.values(byCurrency)[0].revenue:null,
        currency:Object.keys(byCurrency).length===1?Object.keys(byCurrency)[0]:null,
        reason:Object.keys(byCurrency).length>1?'MULTIPLE_CURRENCIES_SEE_BREAKDOWN':Object.values(byCurrency)[0]?.revenue!=null?null:'ACTUAL_REVENUE_NOT_STORED',
      },
    },

    phase4: {
      exitCriterion:
        PHASE_4_EXIT_CRITERION,

      exitCriterionAchieved:
        phase4ExitAchieved,

      realQualifiedLeadsObserved:
        finalizedOverall
          .qualifiedLeads,
    },

    methodology: {
      validContact:
        'Lead reached CONTACTED or a later canonical CRM lifecycle state.',

      qualifiedLead:
        'Lead reached QUALIFIED or a later canonical CRM lifecycle state.',

      quote:
        'Lead reached QUOTATION_SENT or a later canonical CRM lifecycle state.',

      order:
        'Lead reached WON.',

      historicalTransitionsIncluded:
        true,

      historicalTransitionsDependOnLeadActivityLog:
        true,

      governedUtmRequiredForUtmOnlyMatch:
        true,

      conflictingAttributionExcluded:
        true,

      creativeAttributionFallbackOrder: [
        'UTM_CONTENT',
        'META_AD_ID',
        'META_CREATIVE_ID',
      ],

      clickMetricsAreDecisionMetrics:
        false,

      plannedManagementBudgetIsActualSpend:
        false,

      orderAmountAggregatedAcrossUnknownCurrencies:
        false,
    },
  };
}

module.exports = {
  getControlledCampaignMetrics,
};
