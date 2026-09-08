const crypto = require('crypto');

const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');

const {
  encryptText,
  hashText,
  hashCompanyName,
  maskPhone,
  maskEmail
} = require('../../utils/crypto');

const {
  scoreAndClassifyLead
} = require('./ai-agent/leadScoring.service');

const {
  autoRouteLead
} = require('./leadAssignment.service');

const {
  recordAudit
} = require('../security-audit/auditLog.service');

const {
  parseFlexibleDate
} = require('./ai-agent/aiLead.service');


function validationError(message) {
  const error = new Error(message);
  error.code = 'VALIDATION_FAILED';
  return error;
}


function cleanText(value, maxLength = 250) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}


function normalizePhone(value) {
  const raw = cleanText(value, 40);

  if (!raw) {
    throw validationError('Phone / WhatsApp number is required.');
  }

  const digits = raw.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 15) {
    throw validationError(
      'Please provide a valid phone number including country code.'
    );
  }

  return `+${digits}`;
}


function getQuantityBand(quantity) {
  if (quantity < 40) return 'BELOW_40_MT';
  if (quantity < 100) return '40_99_MT';
  if (quantity < 500) return '100_499_MT';
  return '500_PLUS_MT';
}


function evaluateStoneEligibility(quantity) {
  if (quantity < 40) {
    return {
      status: 'NOT_ELIGIBLE',
      reason: 'MINIMUM_40_MT'
    };
  }

  // Quantity passes the public minimum.
  // Final commercial availability still requires ITO review.
  return {
    status: 'REVIEW_REQUIRED',
    reason: 'COMMERCIAL_AVAILABILITY_REVIEW'
  };
}


function buildAttribution(input = {}) {
  return {
    utmSource: cleanText(
      input.utmSource || input.utm_source,
      150
    ),

    utmMedium: cleanText(
      input.utmMedium || input.utm_medium,
      150
    ),

    utmCampaign: cleanText(
      input.utmCampaign || input.utm_campaign,
      200
    ),

    utmContent: cleanText(
      input.utmContent || input.utm_content,
      200
    ),

    utmTerm: cleanText(
      input.utmTerm || input.utm_term,
      200
    ),

    gclid: cleanText(input.gclid, 250),
    fbclid: cleanText(input.fbclid, 250),

    campaignId: cleanText(
      input.campaignId || input.campaign_id,
      150
    ),

    adSetId: cleanText(
      input.adSetId || input.adset_id,
      150
    ),

    adId: cleanText(
      input.adId || input.ad_id,
      150
    ),

    landingPage: cleanText(
      input.landingPage || input.landing_page,
      250
    ),

    landingPageType: cleanText(
      input.landingPageType ||
        input.landing_page_type,
      100
    ),

    analyticsSessionId: cleanText(
      input.analyticsSessionId ||
        input.analytics_session_id,
      150
    )
  };
}


async function createWebsiteLeadRecord(payload = {}) {
  const submissionId = cleanText(
    payload.submissionId,
    128
  );

  if (
    !submissionId ||
    !/^[a-zA-Z0-9_-]{8,128}$/.test(submissionId)
  ) {
    throw validationError(
      'A valid submissionId is required.'
    );
  }

  // Idempotency protection.
  const existing = await Lead.findOne({
    submissionId
  });

  if (existing) {
    return {
      lead: existing,
      reused: true
    };
  }


  const contactAllowed =
    payload.consent?.contactAllowed === true;

  if (!contactAllowed) {
    throw validationError(
      'Contact consent is required to submit this enquiry.'
    );
  }


  const privacyVersion = cleanText(
    payload.consent?.privacyVersion,
    50
  );

  if (!privacyVersion) {
    throw validationError(
      'Privacy notice version is required.'
    );
  }


  const phone = normalizePhone(
    payload.phone ||
    payload.mobile ||
    payload.whatsapp
  );


  const quantityValue = Number(
    payload.quantityValue ??
    payload.quantity
  );

  if (
    !Number.isFinite(quantityValue) ||
    quantityValue <= 0
  ) {
    throw validationError(
      'A valid quantity is required.'
    );
  }


  const destination = cleanText(
    payload.destination,
    200
  );

  if (!destination) {
    throw validationError(
      'Delivery destination is required.'
    );
  }


  const timeline = cleanText(
    payload.timeline,
    100
  );

  if (!timeline) {
    throw validationError(
      'Purchase timeline is required.'
    );
  }


  const product = cleanText(
    payload.product,
    150
  );

  if (!product) {
    throw validationError(
      'Stone product / material is required.'
    );
  }


  const productVariant = cleanText(
    payload.productVariant,
    150
  );

  const grade = cleanText(
    payload.grade,
    150
  );


  const customerName = cleanText(
    payload.customerName ||
    payload.name,
    150
  );

  const companyName = cleanText(
    payload.companyName ||
    payload.company,
    200
  );

  const email = cleanText(
    payload.email,
    250
  ).toLowerCase();


  const phoneHash = hashText(phone);

  const emailHash = email
    ? hashText(email)
    : '';

  const companyNameHash = companyName
    ? hashCompanyName(companyName)
    : '';


  const duplicateQueries = [
    { phoneHash }
  ];

  if (emailHash) {
    duplicateQueries.push({
      emailHash
    });
  }

  if (companyNameHash) {
    duplicateQueries.push({
      companyNameHash,
      productCategory: 'STONE'
    });
  }


  const duplicate = await Lead.findOne({
    $or: duplicateQueries
  }).sort({
    createdAt: -1
  });


  const targetDate =
  parseFlexibleDate(
    timeline.replace(/_/g, ' ')
  );


  const eligibility =
    evaluateStoneEligibility(quantityValue);


  const quantityBand =
    getQuantityBand(quantityValue);


  const requirementSummary =
    [
      'Website Stone requirement',
      `Product: ${product}`,
      productVariant
        ? `Variant: ${productVariant}`
        : '',
      grade
        ? `Grade: ${grade}`
        : '',
      `Quantity: ${quantityValue} MT`,
      `Destination: ${destination}`,
      `Timeline: ${timeline}`
    ]
      .filter(Boolean)
      .join(' | ');


  const {
    score,
    priority
  } = scoreAndClassifyLead({
    quantity: String(quantityValue),
    hasLOI: false,
    paymentTerms: '',
    contactPerson: customerName,
    mobile: phone,
    email,
    chatSummary: requirementSummary,
    leadValue: 0,
    targetDate
  });


  const leadCode =
    `LD-${Date.now()}-${crypto
      .randomUUID()
      .slice(0, 8)}`;


  const attribution =
    buildAttribution(
      payload.attribution || {}
    );


  let lead;

  try {
    lead = await Lead.create({
      leadCode,
      submissionId,

      source: 'WEBSITE',
      leadOrigin: 'REQUIREMENT_BUILDER',

      customerName,

      companyName,
      companyNameHash,

      phoneEncrypted:
        encryptText(phone),

      phoneMasked:
        maskPhone(phone),

      phoneHash,

      emailEncrypted:
        email
          ? encryptText(email)
          : '',

      emailMasked:
        email
          ? maskEmail(email)
          : '',

      emailHash,

      productCategory: 'STONE',

      product,
      productVariant,
      grade,

      quantity:
        `${quantityValue} MT`,

      quantityValue,
      quantityUnit: 'MT',
      quantityBand,

      destination,
      timeline,
      targetDate,

      eligibilityStatus:
        eligibility.status,

      eligibilityReason:
        eligibility.reason,

      priority,
      score,

      stage: 'NEW_LEAD',

      duplicateOf:
        duplicate
          ? duplicate._id
          : null,

      chatSummary:
        requirementSummary,

      contactPerson:
        customerName,

      country:
        cleanText(
          payload.country,
          100
        ),

      // Do not duplicate the phone in plaintext.
      whatsAppNumber: '',

      leadValue: 0,

      consent: {
        contactAllowed: true,

        marketingAllowed:
          payload.consent
            ?.marketingAllowed === true,

        privacyVersion,

        capturedAt:
          new Date()
      },

      attribution,

      automationStatus:
        'PENDING',

      automationAttempts: 0,

      // Deliberately excludes raw contact PII.
      originalPayload: {
        builderVersion:
          cleanText(
            payload.metadata
              ?.builderVersion,
            50
          ) || 'STONE_V1',

        eligibilityRuleVersion:
          'STONE_ELIGIBILITY_V1',

        landingPageType:
          attribution
            .landingPageType ||
          'STONE_PRODUCT'
      },

      createdBy: null
    });
  } catch (error) {
    // Handles two simultaneous retries racing
    // against the unique submissionId index.
    if (
      error?.code === 11000
    ) {
      const alreadyCreated =
        await Lead.findOne({
          submissionId
        });

      if (alreadyCreated) {
        return {
          lead: alreadyCreated,
          reused: true
        };
      }
    }

    throw error;
  }


  return {
    lead,
    reused: false
  };
}


async function processWebsiteLeadAutomation(
  leadId
) {
  const lead =
    await Lead.findOneAndUpdate(
      {
        _id: leadId,

        automationStatus: {
          $in: [
            'PENDING',
            'FAILED'
          ]
        },

        automationAttempts: {
          $lt: 5
        }
      },

      {
        $set: {
          automationStatus:
            'PROCESSING',

          automationLastAttemptAt:
            new Date()
        },

        $inc: {
          automationAttempts: 1
        }
      },

      {
        new: true
      }
    );


  // Already processed or another worker
  // claimed it.
  if (!lead) {
    return;
  }


  try {
    const existingActivity =
      await LeadActivity.findOne({
        leadId: lead._id,
        actionType: 'LEAD_CREATED'
      });


    if (!existingActivity) {
      await LeadActivity.create({
        leadId:
          lead._id,

        actionType:
          'LEAD_CREATED',

        note:
          'Lead persisted via website Stone requirement builder',

        actorId:
          null
      });
    }


    await recordAudit({
      actorId: null,

      actionType:
        'WEBSITE_LEAD_CREATED',

      entityType:
        'LEAD',

      entityId:
        lead._id.toString(),

      severity:
        lead.duplicateOf
          ? 'MEDIUM'
          : 'LOW',

      metadata: {
        leadCode:
          lead.leadCode,

        duplicateDetected:
          !!lead.duplicateOf,

        productCategory:
          'STONE'
      }
    });


    if (!lead.assignedTo) {
      await autoRouteLead(
        lead
      );
    }


    await Lead.findByIdAndUpdate(
      lead._id,
      {
        $set: {
          automationStatus:
            'COMPLETED',

          automationLastError:
            ''
        }
      }
    );
  } catch (error) {
    await Lead.findByIdAndUpdate(
      lead._id,
      {
        $set: {
          automationStatus:
            'FAILED',

          automationLastError:
            cleanText(
              error.message ||
              'Unknown automation error',
              500
            )
        }
      }
    );

    throw error;
  }
}


function scheduleWebsiteLeadAutomation(
  leadId
) {
  setImmediate(() => {
    processWebsiteLeadAutomation(
      leadId
    ).catch((error) => {
      console.error(
        '[Website Lead Automation]',
        leadId,
        error.message
      );
    });
  });
}


async function retryPendingWebsiteLeadAutomations(
  limit = 50
) {
  const staleBefore =
    new Date(
      Date.now() -
      10 * 60 * 1000
    );


  // Recover a server/process crash that
  // occurred while a lead was PROCESSING.
  await Lead.updateMany(
    {
      automationStatus:
        'PROCESSING',

      automationLastAttemptAt: {
        $lt: staleBefore
      }
    },

    {
      $set: {
        automationStatus:
          'FAILED',

        automationLastError:
          'Recovered stale processing state'
      }
    }
  );


  const leads =
    await Lead.find({
      automationStatus: {
        $in: [
          'PENDING',
          'FAILED'
        ]
      },

      automationAttempts: {
        $lt: 5
      }
    })
      .sort({
        createdAt: 1
      })
      .limit(limit)
      .select('_id');


  for (const lead of leads) {
    try {
      await processWebsiteLeadAutomation(
        lead._id
      );
    } catch (error) {
      console.error(
        '[Website Lead Retry]',
        lead._id.toString(),
        error.message
      );
    }
  }


  return leads.length;
}


module.exports = {
  createWebsiteLeadRecord,
  processWebsiteLeadAutomation,
  scheduleWebsiteLeadAutomation,
  retryPendingWebsiteLeadAutomations
};