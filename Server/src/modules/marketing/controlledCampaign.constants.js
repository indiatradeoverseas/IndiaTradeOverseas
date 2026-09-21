/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.1: Controlled Campaign contract
 *
 * Purpose:
 * Freeze the campaign rules defined by the Master DPR before we build
 * persistence, APIs, dashboards, or campaign-launch controls around them.
 *
 * Important:
 * - No city, source, MOQ, cost, freight, selling price, margin, budget,
 *   delivery promise, or serviceability value is invented here.
 * - Those values must come from Operations / Management as required by DPR.
 * - ITO Ads (the customer-facing advertising service) is a separate product
 *   area. These constants are for ITO's own controlled Stone acquisition test.
 */

const CONTROLLED_CAMPAIGN_VERTICAL = 'STONE';
const CONTROLLED_CAMPAIGN_PLATFORM = 'META';

/**
 * Master DPR §4.1 — Commercial market selection.
 *
 * These are the required business inputs before Marketing buys traffic.
 * The application layer will later validate that these values are present
 * before a campaign is marked ready for a controlled test.
 */
const MARKET_SELECTION_FIELDS = Object.freeze([
  'product',
  'source',
  'targetMarket',
  'minimumCommercialQuantity',
  'materialEconomics',
  'freightEconomics',
  'expectedSellingRange',
  'marginBand',
  'deliveryCapability',
  'priority'
]);

const DELIVERY_CAPABILITIES = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  CONSTRAINED: 'CONSTRAINED',
  NOT_SUPPORTED: 'NOT_SUPPORTED'
});

/**
 * DPR wording:
 * A = Scale
 * B = Test
 * C = Limited
 * D = Do Not Advertise
 *
 * The labels are kept separately from the stored code so the application
 * does not have to infer their commercial meaning.
 */
const MARKET_PRIORITIES = Object.freeze({
  A: Object.freeze({
    code: 'A',
    label: 'Scale'
  }),

  B: Object.freeze({
    code: 'B',
    label: 'Test'
  }),

  C: Object.freeze({
    code: 'C',
    label: 'Limited'
  }),

  D: Object.freeze({
    code: 'D',
    label: 'Do Not Advertise'
  })
});

/**
 * Master DPR §12 — Meta Advertising Operating Model.
 *
 * Website conversion and Meta Instant Form are controlled alternatives.
 * This file does not decide which path Management/Marketing must activate.
 */
const ACQUISITION_PATHS = Object.freeze({
  WEBSITE: 'WEBSITE',
  META_INSTANT_FORM: 'META_INSTANT_FORM'
});

/**
 * Master DPR §12.1 — First controlled test.
 *
 * Exactly one product and one commercially strong market are tested with
 * 3–5 distinct creatives. These five creative angles are the DPR's stated
 * test matrix; no additional campaign promise is invented here.
 */
const CREATIVE_ANGLES = Object.freeze({
  PRODUCT_PROOF: 'PRODUCT_PROOF',
  LOADING_DISPATCH_PROOF: 'LOADING_DISPATCH_PROOF',
  SOURCE_PROOF: 'SOURCE_PROOF',
  PRICE_AVAILABILITY_HOOK: 'PRICE_AVAILABILITY_HOOK',
  CORPORATE_TRUST: 'CORPORATE_TRUST'
});

const CONTROLLED_TEST_GUARDRAILS = Object.freeze({
  productCount: 1,
  marketCount: 1,
  minCreativeCount: 3,
  maxCreativeCount: 5,

  /**
   * DPR: do not optimize decisions on CPC or CTR alone.
   */
  clickMetricsAreDiagnosticOnly: true,

  /**
   * DPR: existing leads/customers should be excluded from generic
   * acquisition where appropriate.
   */
  excludeExistingLeadsWhereAppropriate: true
});

/**
 * Master DPR §12.1 — business metrics used to compare campaign quality.
 *
 * CPC / CTR remain useful diagnostics, but they are intentionally absent
 * from this decision-metric set because the DPR says not to optimize on
 * click metrics alone.
 */
const CAMPAIGN_DECISION_METRICS = Object.freeze([
  'CPL',
  'VALID_CONTACT_RATE',
  'QUALIFIED_LEAD_RATE',
  'CPQL',
  'QUOTE_RATE',
  'ORDER_RATE',
  'GROSS_PROFIT_CONTRIBUTION'
]);

/**
 * Master DPR §8.3 — governed UTM standard for Meta paid social.
 *
 * utm_campaign and utm_content must be supplied per campaign/creative and
 * normalized to one lowercase convention. The example campaign name in the
 * DPR is not treated as a production value.
 */
const META_UTM_STANDARD = Object.freeze({
  source: 'facebook',
  medium: 'paid_social',
  caseConvention: 'lowercase'
});

/**
 * Master DPR §8.2 — attribution keys relevant to controlled campaign data.
 * Personal information is intentionally not part of this dictionary.
 */
const CAMPAIGN_ATTRIBUTION_KEYS = Object.freeze([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'campaign_id',
  'adset_id',
  'ad_id',
  'landing_page_type',
  'session_id'
]);

/**
 * The first controlled Stone campaign must not be considered scale-ready
 * merely because it receives clicks. Phase 4 exits only after real qualified
 * leads are observed; Phase 5 handles optimization/economics.
 */
const PHASE_4_EXIT_CRITERION = 'REAL_QUALIFIED_LEADS_OBSERVED';

module.exports = {
  CONTROLLED_CAMPAIGN_VERTICAL,
  CONTROLLED_CAMPAIGN_PLATFORM,
  MARKET_SELECTION_FIELDS,
  DELIVERY_CAPABILITIES,
  MARKET_PRIORITIES,
  ACQUISITION_PATHS,
  CREATIVE_ANGLES,
  CONTROLLED_TEST_GUARDRAILS,
  CAMPAIGN_DECISION_METRICS,
  META_UTM_STANDARD,
  CAMPAIGN_ATTRIBUTION_KEYS,
  PHASE_4_EXIT_CRITERION
};
