const mongoose = require('mongoose');

const {
  CONTROLLED_CAMPAIGN_VERTICAL,
  CONTROLLED_CAMPAIGN_PLATFORM,
  DELIVERY_CAPABILITIES,
  MARKET_PRIORITIES,
  ACQUISITION_PATHS,
  CREATIVE_ANGLES,
  CONTROLLED_TEST_GUARDRAILS,
  META_UTM_STANDARD
} = require('./controlledCampaign.constants');


/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.2: Controlled Stone campaign persistence model
 *
 * Scope:
 * - one Stone product;
 * - one commercially selected market;
 * - Operations-supplied economics / delivery inputs;
 * - Meta website + Instant Form acquisition-path configuration;
 * - 3–5 distinct creatives;
 * - governed lowercase UTM naming.
 *
 * This model stores campaign configuration only.
 * It does NOT invent:
 * - product/source/market;
 * - MOQ;
 * - price/cost/freight/margin values;
 * - availability or delivery promises;
 * - ad budget values unless Management supplies them;
 * - campaign performance.
 *
 * Actual performance must later be derived from attribution + CRM outcomes.
 */


const moneyRangeSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 10
    },

    min: {
      type: Number,
      required: true,
      min: 0
    },

    max: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator(value) {
          return (
            typeof this.min !== 'number' ||
            value >= this.min
          );
        },
        message:
          'Commercial range maximum must be greater than or equal to minimum.'
      }
    },

    /**
     * Examples could later be "per MT", "per truck", etc.
     * No default is supplied because the DPR does not define one
     * universal commercial unit.
     */
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    }
  },
  {
    _id: false
  }
);


const minimumCommercialQuantitySchema =
  new mongoose.Schema(
    {
      value: {
        type: Number,
        required: true,
        min: 0
      },

      /**
       * Intentionally required instead of defaulting to MT/truck.
       * Operations must provide the real operating MOQ unit.
       */
      unit: {
        type: String,
        required: true,
        trim: true,
        maxlength: 40
      }
    },
    {
      _id: false
    }
  );


const managementBudgetSchema =
  new mongoose.Schema(
    {
      currency: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 10
      },

      amount: {
        type: Number,
        required: true,
        validate: {
          validator(value) {
            return (
              Number.isFinite(value) &&
              value > 0
            );
          },
          message:
            'Management budget amount must be greater than zero.'
        }
      },

      /**
       * The DPR assigns budget ownership to Management but does not
       * prescribe one universal daily/monthly/test-total basis.
       * Management must supply the real basis text instead of the system
       * inventing one.
       */
      basis: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
      }
    },
    {
      _id: false
    }
  );


const verificationEvidenceSchema =
  new mongoose.Schema(
    {
      /**
       * Real QA/test reference only: for example a test record, screenshot
       * path, ticket/reference ID or another stable internal evidence link.
       * The application must never fabricate this value.
       */
      reference: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
      },

      /**
       * Optional factual notes describing what was checked.
       * This is not a place for invented commercial claims.
       */
      notes: {
        type: String,
        default: '',
        trim: true,
        maxlength: 2000
      }
    },
    {
      _id: false
    }
  );


const targetMarketSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'CITY',
        'DISTRICT',
        'CORRIDOR'
      ],
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    }
  },
  {
    _id: false
  }
);


const creativeSchema = new mongoose.Schema(
  {
    /**
     * Master DPR §12.1:
     * product proof, loading/dispatch proof, source proof,
     * price/availability hook, corporate trust.
     */
    angle: {
      type: String,
      enum:
        Object.values(
          CREATIVE_ANGLES
        ),
      required: true
    },

    /**
     * Internal descriptive name only.
     * This is not treated as customer-facing claim copy.
     */
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },

    /**
     * Actual customer-facing message/copy used for this creative.
     * Storing the real message lets Operations/Management verify that
     * price, availability, source, certification, stock or delivery
     * claims are not invented and that the paid promise matches landing
     * experience.
     */
    message: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000
    },

    /**
     * File path, object-storage key, approved asset URL, or other
     * stable internal reference. The model does not assert that the
     * asset's claims are true; approval belongs to campaign workflow.
     */
    assetReference: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },

    /**
     * Required so every creative can be attributed separately.
     * Master DPR requires one governed lowercase naming convention.
     */
    utmContent: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
      match: [
        /^[a-z0-9][a-z0-9_-]*$/,
        'utmContent must use lowercase letters, numbers, underscores or hyphens.'
      ]
    },

    /**
     * Optional Meta IDs are stored only after they actually exist.
     * Empty strings are safer than fabricated identifiers.
     */
    metaAdId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160
    },

    metaCreativeId: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160
    }
  },
  {
    _id: true,
    timestamps: true
  }
);


const controlledCampaignSchema =
  new mongoose.Schema(
    {
      vertical: {
        type: String,
        enum: [
          CONTROLLED_CAMPAIGN_VERTICAL
        ],
        default:
          CONTROLLED_CAMPAIGN_VERTICAL,
        immutable: true,
        index: true
      },

      releaseChecks: { type: [{ key: String, reference: String, notes: String, verifiedAt: Date, verifiedBy: mongoose.Schema.Types.ObjectId }], default: [] },
      observedDelivery: { type:new mongoose.Schema({status:{type:String,enum:['RUNNING','PAUSED','STOPPED']},observedAt:Date,reference:String,notes:String,verifiedAt:Date,verifiedBy:mongoose.Schema.Types.ObjectId},{_id:false}),default:null },
      actualPerformance: { type: new mongoose.Schema({ amount: Number, currency: String, through: Date, impressions: Number, clicks: Number, reference: String, notes: String, verifiedAt: Date, verifiedBy: mongoose.Schema.Types.ObjectId }, { _id: false }), default: null },
      experiments: { type: [{ decision: String, economicsAccepted: Boolean, hypothesis: String, salesFeedback: String, reference: String, notes: String, verifiedAt: Date, verifiedBy: mongoose.Schema.Types.ObjectId }], default: [] },

      platform: {
        type: String,
        enum: [
          CONTROLLED_CAMPAIGN_PLATFORM
        ],
        default:
          CONTROLLED_CAMPAIGN_PLATFORM,
        immutable: true,
        index: true
      },

      /**
       * Master DPR §12:
       * Website conversion and Meta Instant Form are controlled
       * alternatives whose downstream quality should be compared.
       */
      acquisitionPaths: {
        type: [
          {
            type: String,
            enum:
              Object.values(
                ACQUISITION_PATHS
              )
          }
        ],
        default: () => [
          ACQUISITION_PATHS.WEBSITE,
          ACQUISITION_PATHS.META_INSTANT_FORM
        ],
        validate: {
          validator(values) { return Array.isArray(values) && values.length>0 && values.length<=2 && new Set(values).size===values.length && values.every(v=>Object.values(ACQUISITION_PATHS).includes(v)); },
          message: 'Select one or both controlled acquisition alternatives.'
        }
      },

      // ============================================================
      // MASTER DPR §4.1 — COMMERCIAL MARKET SELECTION
      // ============================================================

      marketSelection: {
        product: {
          type: String,
          required: true,
          trim: true,
          maxlength: 160
        },

        source: {
          type: String,
          required: true,
          trim: true,
          maxlength: 160
        },

        targetMarket: {
          type: targetMarketSchema,
          required: true
        },

        minimumCommercialQuantity: {
          type:
            minimumCommercialQuantitySchema,
          required: true
        },

        materialEconomics: {
          type: moneyRangeSchema,
          required: true
        },

        freightEconomics: {
          type: moneyRangeSchema,
          required: true
        },

        expectedSellingRange: {
          type: moneyRangeSchema,
          required: true
        },

        /**
         * DPR marks margin band as internal but does not prescribe
         * a universal numeric/percentage representation.
         */
        marginBand: {
          type: String,
          required: true,
          trim: true,
          maxlength: 120
        },

        deliveryCapability: {
          type: String,
          enum:
            Object.values(
              DELIVERY_CAPABILITIES
            ),
          required: true,
          index: true
        },

        priority: {
          type: String,
          enum:
            Object.keys(
              MARKET_PRIORITIES
            ),
          required: true,
          index: true
        }
      },

      // ============================================================
      // MATCHED LANDING EXPERIENCE
      // ============================================================

      landingPage: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
      },

      /**
       * Real paid-ad promise/offer summary. The DPR requires the paid
       * product ad and landing experience to match product, geography and
       * promise. This is descriptive evidence only; it does not create a
       * commercial guarantee.
       */
      campaignPromise: {
        type: String,
        default: '',
        trim: true,
        maxlength: 1000
      },

      /**
       * This is descriptive internal context, not a delivery promise.
       * It lets the campaign configuration record the intended buyer
       * segment without putting personal data into the campaign model.
       */
      buyerContext: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
      },

      // ============================================================
      // MASTER DPR §8.3 — UTM GOVERNANCE
      // ============================================================

      utm: {
        source: {
          type: String,
          default:
            META_UTM_STANDARD.source,
          immutable: true,
          lowercase: true,
          trim: true
        },

        medium: {
          type: String,
          default:
            META_UTM_STANDARD.medium,
          immutable: true,
          lowercase: true,
          trim: true
        },

        campaign: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
          maxlength: 160,
          match: [
            /^[a-z0-9][a-z0-9_-]*$/,
            'utmCampaign must use lowercase letters, numbers, underscores or hyphens.'
          ]
        }
      },

      // ============================================================
      // MASTER DPR §12.1 — 3–5 DISTINCT CREATIVES
      // ============================================================

      creatives: {
        type: [creativeSchema],
        required: true,

        validate: [
          {
            validator(values) {
              return (
                Array.isArray(values) &&
                values.length >=
                  CONTROLLED_TEST_GUARDRAILS.minCreativeCount &&
                values.length <=
                  CONTROLLED_TEST_GUARDRAILS.maxCreativeCount
              );
            },
            message:
              'Controlled campaign must contain 3–5 creatives.'
          },
          {
            validator(values) {
              if (!Array.isArray(values)) {
                return false;
              }

              const angles =
                values.map(
                  (item) => item.angle
                );

              return (
                new Set(angles).size ===
                angles.length
              );
            },
            message:
              'Controlled campaign creatives must use distinct DPR creative angles.'
          },
          {
            validator(values) {
              if (!Array.isArray(values)) {
                return false;
              }

              const contentKeys =
                values.map(
                  (item) =>
                    String(
                      item.utmContent ||
                      ''
                    ).toLowerCase()
                );

              return (
                new Set(contentKeys).size ===
                contentKeys.length
              );
            },
            message:
              'Each controlled campaign creative must have a unique utmContent value.'
          }
        ]
      },

      // ============================================================
      // META IDENTIFIERS — ONLY AFTER THEY REALLY EXIST
      // ============================================================

      metaCampaignId: {
        type: String,
        default: '',
        trim: true,
        maxlength: 160,
        index: true
      },

      metaAdSetId: {
        type: String,
        default: '',
        trim: true,
        maxlength: 160,
        index: true
      },

      // ============================================================
      // GOVERNANCE / EVIDENCE
      // ============================================================

      /**
       * Management owns campaign budget in the DPR responsibility
       * matrix. No default amount or basis is supplied. This is planned
       * campaign budget, not actual ad spend and must never be used as
       * CPL/CPQL spend data.
       */
      managementBudget: {
        type: managementBudgetSchema,
        default: null
      },

      /**
       * Existing leads/customers should be excluded from generic
       * acquisition where appropriate. The exact scope is a business
       * decision, so free-text scope/rationale are persisted instead of
       * inventing a universal audience rule.
       */
      audienceExclusion: {
        scope: {
          type: String,
          default: '',
          trim: true,
          maxlength: 240
        },

        rationale: {
          type: String,
          default: '',
          trim: true,
          maxlength: 1000
        },

        requiredForGenericAcquisition: {
          type: Boolean,
          default: false
        },

        applied: {
          type: Boolean,
          default: false
        },

        /**
         * Optional until an exclusion is actually applied. When applied is
         * true, the service layer must require a real reference proving what
         * audience/suppression action was used; no Meta audience ID is guessed.
         */
        evidenceReference: {
          type: String,
          default: '',
          trim: true,
          maxlength: 1000
        },

        recordedAt: {
          type: Date,
          default: null
        },

        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null
        }
      },

      /**
       * Pre-launch QA evidence. These are nullable on purpose: an empty
       * timestamp means the verification has not been performed. The
       * application never auto-marks these from configuration presence.
       */
      landingExperienceVerifiedAt: {
        type: Date,
        default: null
      },

      landingExperienceVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      creativeClaimsVerifiedAt: {
        type: Date,
        default: null
      },

      creativeClaimsVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      websiteAttributionVerifiedAt: {
        type: Date,
        default: null
      },

      websiteAttributionVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      metaInstantFormAttributionVerifiedAt: {
        type: Date,
        default: null
      },

      metaInstantFormAttributionVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      /**
       * A timestamp/user alone is not sufficient evidence for a serious paid
       * campaign check. The verification action must also store a real
       * reference. These objects remain null until an actual check is recorded.
       */
      prelaunchVerificationEvidence: {
        landingExperience: {
          type: verificationEvidenceSchema,
          default: null
        },

        creativeClaims: {
          type: verificationEvidenceSchema,
          default: null
        },

        websiteAttribution: {
          type: verificationEvidenceSchema,
          default: null
        },

        metaInstantFormAttribution: {
          type: verificationEvidenceSchema,
          default: null
        }
      },

      /**
       * These timestamps do not invent an approval workflow.
       * They simply preserve evidence that the responsible business
       * inputs/approval happened before activation when later services
       * enforce campaign readiness.
       */
      operationsInputsConfirmedAt: {
        type: Date,
        default: null
      },

      operationsInputsConfirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      managementApprovalAt: {
        type: Date,
        default: null
      },

      managementApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
      }
    },
    {
      timestamps: true,
      optimisticConcurrency: true,
      minimize: false
    }
  );


/**
 * One UTM campaign key = one persisted controlled-campaign definition.
 * This protects attribution from accidental duplicate configuration.
 */
controlledCampaignSchema.index(
  {
    'utm.campaign': 1
  },
  {
    unique: true
  }
);


/**
 * Useful for operations/management review queues without inventing
 * campaign-performance conclusions.
 */
controlledCampaignSchema.index({
  'marketSelection.priority': 1,
  'marketSelection.deliveryCapability': 1,
  createdAt: -1
});


module.exports =
  mongoose.model(
    'ControlledCampaign',
    controlledCampaignSchema
  );
