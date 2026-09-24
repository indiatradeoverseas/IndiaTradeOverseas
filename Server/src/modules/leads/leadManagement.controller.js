const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');
const CallRecording = require('./callRecording.model');
const Employee = require('../employee/employee.model');

const {
  getRelativePath,
  resolveUploadPath,
  proxyFromProduction,
} = require('../../utils/file');

const {
  encryptText,
  hashText,
  hashCompanyName,
  maskPhone,
  maskEmail,
  decryptText,
} = require('../../utils/crypto');

const {
  scoreAndClassifyLead,
} = require('./ai-agent/leadScoring.service');

const {
  ok,
  fail,
} = require('../../utils/response');

const {
  CRM_STATUS,
  normalizeCrmStatus,
} = require('./lead.constants');

const {
  transitionLeadCrmStatus,
} = require('./leadLifecycle.service');

const {
  resolveOrCreateContact,
  markContactOpportunityCreated,
  normalizeContactPhone,
} = require('./contactResolution.service');

const {
  autoRouteLead,
} = require('./leadAssignment.service');

const {
  canAccessLead,
  getLeadDisplay,
  assignLead,
} = require('./lead.service');

const {
  isBroadEvidenceReviewer,
  hasLeadEvidenceAccess,
  hasCallRecordingAccess,
  canManageCallRecordingRemark,
} = require('./leadEvidenceAccess.service');

const {
  recordAudit,
} = require('../security-audit/auditLog.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.27C: Lead lifecycle alignment + evidence object authorization
 *
 * Key rules implemented in this controller:
 * - a call / WhatsApp / email / follow-up is a CONTACT_ATTEMPTED signal;
 * - an actual connected interaction is CONTACTED only when explicitly known;
 * - firstResponseAt is created by the canonical lifecycle transition;
 * - lastContactAt is updated only for confirmed contact;
 * - activity logging never silently jumps a Lead to QUALIFIED;
 * - manual/call-created enquiries use Contact resolution rather than Lead
 *   duplicate suppression;
 * - completing a call-recording review does not imply requirement capture;
 * - uploading an LOI does not bypass the canonical CRM lifecycle;
 * - CRM-visible changes are queued for asynchronous re-sync.
 */

const INTERNAL_SOURCES = new Set([
  'WEBSITE',
  'AI_AGENT',
  'WHATSAPP',
  'INDIAMART',
  'MANUAL',
  'IMPORT',
]);

const CONTACT_ATTEMPT_ACTIVITY_TYPES = new Set([
  'FOLLOW_UP',
  'CALL',
  'PHONE_CALL',
  'CALL_ATTEMPT',
  'EMAIL',
  'EMAIL_SENT',
  'WHATSAPP',
  'WHATSAPP_SENT',
  'CONTACT_ATTEMPT',
  'CONTACT_ATTEMPTED',
]);

const CONFIRMED_CONTACT_ACTIVITY_TYPES = new Set([
  'CONTACTED',
  'CALL_CONNECTED',
  'CUSTOMER_RESPONDED',
  'WHATSAPP_REPLY',
  'EMAIL_REPLY',
  'MEETING',
  'MEETING_COMPLETED',
]);

function cleanText(value, maxLength = 1000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function removeUploadedFileQuietly(file) {
  const filePath = file?.path;

  if (!filePath) {
    return;
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn(
      '[Lead Evidence] Failed to clean rejected upload:',
      error.message
    );
  }
}

function getEvidenceAuditActorId(user) {
  const candidates = [
    user?._id,
    user?.employeeDbId,
  ];

  for (const candidate of candidates) {
    if (
      candidate &&
      mongoose.isValidObjectId(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

function getEvidenceRequestIp(req) {
  const forwarded =
    cleanText(
      req.headers?.['x-forwarded-for'],
      200
    );

  if (forwarded) {
    return cleanText(
      forwarded.split(',')[0],
      200
    );
  }

  return cleanText(
    req.ip,
    200
  );
}

async function safeEvidenceAudit(payload) {
  try {
    await recordAudit(payload);
  } catch (error) {
    console.warn(
      '[Lead Evidence] Audit logging failed:',
      cleanText(
        error.message,
        300
      )
    );
  }
}

async function auditEvidenceAccessDenied(
  req,
  {
    actionType = 'LEAD_EVIDENCE_ACCESS_DENIED',
    entityType = 'LEAD',
    entityId,
    leadId = null,
    recordingId = null,
    evidenceType = '',
    operation = '',
  } = {}
) {
  const safeEntityId =
    cleanText(
      entityId ||
      recordingId ||
      leadId ||
      'LEAD_EVIDENCE',
      200
    );

  await safeEvidenceAudit({
    actorId:
      getEvidenceAuditActorId(
        req.user
      ),

    actionType,

    entityType,

    entityId:
      safeEntityId,

    severity:
      'MEDIUM',

    ipAddress:
      getEvidenceRequestIp(
        req
      ),

    deviceHash:
      cleanText(
        req.headers?.['x-device-hash'],
        256
      ),

    metadata: {
      evidenceType:
        cleanText(
          evidenceType,
          80
        ).toUpperCase(),

      operation:
        cleanText(
          operation,
          80
        ).toUpperCase(),

      leadId:
        leadId
          ? cleanText(
              leadId,
              100
            )
          : '',

      recordingId:
        recordingId
          ? cleanText(
              recordingId,
              100
            )
          : '',

      role:
        cleanText(
          req.user?.role,
          100
        ).toUpperCase(),

      department:
        cleanText(
          req.user?.department,
          100
        ).toUpperCase(),

      position:
        cleanText(
          req.user?.position,
          150
        ).toUpperCase(),

      method:
        cleanText(
          req.method,
          20
        ).toUpperCase(),

      path:
        cleanText(
          req.route?.path ||
          req.path,
          250
        ),
    },
  });
}

async function auditEvidenceSuccess(
  req,
  {
    actionType,
    entityType = 'LEAD',
    entityId,
    leadId = null,
    recordingId = null,
    evidenceType = '',
    operation = '',
    metadata = {},
  } = {}
) {
  const safeEntityId =
    cleanText(
      entityId ||
      recordingId ||
      leadId ||
      'LEAD_EVIDENCE',
      200
    );

  await safeEvidenceAudit({
    actorId:
      getEvidenceAuditActorId(
        req.user
      ),

    actionType,

    entityType,

    entityId:
      safeEntityId,

    severity:
      'LOW',

    ipAddress:
      getEvidenceRequestIp(
        req
      ),

    deviceHash:
      cleanText(
        req.headers?.['x-device-hash'],
        256
      ),

    metadata: {
      evidenceType:
        cleanText(
          evidenceType,
          80
        ).toUpperCase(),

      operation:
        cleanText(
          operation,
          80
        ).toUpperCase(),

      leadId:
        leadId
          ? cleanText(
              leadId,
              100
            )
          : '',

      recordingId:
        recordingId
          ? cleanText(
              recordingId,
              100
            )
          : '',

      ...metadata,
    },
  });
}

function normalizeInternalSource(
  value,
  fallback = 'MANUAL'
) {
  const source =
    cleanText(
      value,
      40
    ).toUpperCase();

  return INTERNAL_SOURCES.has(
    source
  )
    ? source
    : fallback;
}

function normalizePriority(value) {
  const priority =
    cleanText(
      value,
      40
    ).toUpperCase();

  if (
    priority === 'COLD'
  ) {
    return 'LOW';
  }

  return [
    'HOT',
    'WARM',
    'NURTURE',
    'LOW',
    'FAKE',
    'INCOMPLETE',
  ].includes(
    priority
  )
    ? priority
    : null;
}

function toRecordingPriority(value) {
  const priority =
    normalizePriority(
      value
    );

  return [
    'HOT',
    'WARM',
    'NURTURE',
    'LOW',
  ].includes(
    priority
  )
    ? priority
    : null;
}

function parseOptionalDate(
  value,
  fieldName = 'date'
) {
  if (!value) {
    return null;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(
          value
        );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    const error =
      new Error(
        `${fieldName} must be a valid date.`
      );

    error.code =
      'VALIDATION_FAILED';

    throw error;
  }

  return parsed;
}

function parseQuantityValue(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return 0;
  }

  const numeric =
    Number(
      String(
        value
      ).replace(
        /[^0-9.]/g,
        ''
      )
    );

  return Number.isFinite(
    numeric
  )
    ? numeric
    : 0;
}

function escapeHtml(value) {
  return String(
    value ||
    ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}

function isManagementUser(user) {
  const role =
    cleanText(
      user?.role,
      80
    ).toUpperCase();

  const department =
    cleanText(
      user?.department,
      80
    ).toUpperCase();

  const position =
    cleanText(
      user?.position,
      120
    ).toUpperCase();

  return (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'FOUNDER' ||
    role === 'CO_FOUNDER' ||
    role === 'CEO' ||
    role === 'MANAGER' ||
    role === 'HR' ||
    role.endsWith(
      '_MANAGER'
    ) ||
    role.includes(
      'MANAGER'
    ) ||
    department === 'ADMIN' ||
    department === 'MANAGEMENT' ||
    position.includes(
      'ADMIN'
    ) ||
    position.includes(
      'FOUNDER'
    ) ||
    position.includes(
      'CEO'
    ) ||
    position.includes(
      'MANAGER'
    )
  );
}

async function safeAudit(payload) {
  try {
    await recordAudit(
      payload
    );
  } catch (error) {
    console.warn(
      '[Lead Management] Audit logging failed:',
      error.message
    );
  }
}

async function queueCrmResync(
  leadId
) {
  try {
    await Lead.updateOne(
      {
        _id:
          leadId,

        'crmSync.status': {
          $in: [
            'SYNCED',
            'NOT_REQUIRED',
          ],
        },
      },

      {
        $set: {
          'crmSync.status':
            'PENDING',

          'crmSync.nextAttemptAt':
            null,

          'crmSync.lastError':
            '',
        },
      }
    );

  } catch (error) {
    console.warn(
      '[Lead Management] CRM resync queue update failed:',
      error.message
    );
  }
}

function getContactOutcomeFromActivity(
  actionType,
  explicitOutcome
) {
  const explicit =
    cleanText(
      explicitOutcome,
      40
    )
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        '_'
      );

  if (
    [
      'CONTACTED',
      'CONNECTED',
      'SUCCESS',
      'SUCCESSFUL',
    ].includes(
      explicit
    )
  ) {
    return 'CONTACTED';
  }

  if (
    [
      'ATTEMPTED',
      'CONTACT_ATTEMPTED',
      'NO_ANSWER',
      'UNREACHABLE',
    ].includes(
      explicit
    )
  ) {
    return 'ATTEMPTED';
  }

  const normalizedAction =
    cleanText(
      actionType,
      80
    )
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        '_'
      );

  if (
    CONFIRMED_CONTACT_ACTIVITY_TYPES.has(
      normalizedAction
    )
  ) {
    return 'CONTACTED';
  }

  if (
    CONTACT_ATTEMPT_ACTIVITY_TYPES.has(
      normalizedAction
    )
  ) {
    return 'ATTEMPTED';
  }

  return 'NONE';
}

async function advanceLeadForCommunication({
  lead,
  outcome,
  actorId = null,
  note = '',
  nextFollowupAt = null,
}) {
  if (
    !lead?._id ||
    outcome === 'NONE'
  ) {
    return lead;
  }

  let currentLead =
    lead;

  let currentStatus =
    normalizeCrmStatus(
      currentLead.crmStatus
    ) ||
    CRM_STATUS.NEW;

  if (
    currentStatus ===
      CRM_STATUS.WON ||
    currentStatus ===
      CRM_STATUS.LOST
  ) {
    return currentLead;
  }

  if (
    outcome ===
      'ATTEMPTED' &&
    currentStatus ===
      CRM_STATUS.NEW
  ) {
    const result =
      await transitionLeadCrmStatus({
        leadId:
          currentLead._id,

        toStatus:
          CRM_STATUS.CONTACT_ATTEMPTED,

        actorId,

        note:
          note ||
          'Buyer contact attempt logged.',

        nextFollowupAt,
      });

    return result.lead;
  }

  if (
    outcome ===
    'CONTACTED'
  ) {
    if (
      currentStatus ===
      CRM_STATUS.NEW
    ) {
      const attempted =
        await transitionLeadCrmStatus({
          leadId:
            currentLead._id,

          toStatus:
            CRM_STATUS.CONTACT_ATTEMPTED,

          actorId,

          note:
            'Contact attempt recorded before confirmed buyer contact.',

          nextFollowupAt,
        });

      currentLead =
        attempted.lead;

      currentStatus =
        CRM_STATUS.CONTACT_ATTEMPTED;
    }

    if (
      currentStatus ===
      CRM_STATUS.CONTACT_ATTEMPTED
    ) {
      const contacted =
        await transitionLeadCrmStatus({
          leadId:
            currentLead._id,

          toStatus:
            CRM_STATUS.CONTACTED,

          actorId,

          note:
            note ||
            'Buyer contact confirmed.',

          nextFollowupAt,
        });

      return contacted.lead;
    }

    if (
      [
        CRM_STATUS.CONTACTED,
        CRM_STATUS.QUALIFIED,
        CRM_STATUS.QUOTATION_SENT,
        CRM_STATUS.NEGOTIATION,
      ].includes(
        currentStatus
      )
    ) {
      const now =
        new Date();

      const set = {
        lastContactAt:
          now,
      };

      if (
        !currentLead.firstResponseAt
      ) {
        set.firstResponseAt =
          now;
      }

      if (
        nextFollowupAt
      ) {
        set.nextFollowupAt =
          nextFollowupAt;
      }

      currentLead =
        await Lead.findByIdAndUpdate(
          currentLead._id,

          {
            $set:
              set,
          },

          {
            new:
              true,
          }
        );

      await queueCrmResync(
        currentLead._id
      );

      return currentLead;
    }
  }

  /*
   * Legacy data can already be beyond NEW while firstResponseAt is absent.
   * A real outbound attempt repairs the timestamp without rewriting status.
   */
  if (
    outcome ===
      'ATTEMPTED' &&
    !currentLead.firstResponseAt
  ) {
    currentLead =
      await Lead.findByIdAndUpdate(
        currentLead._id,

        {
          $set: {
            firstResponseAt:
              new Date(),

            ...(nextFollowupAt
              ? {
                  nextFollowupAt,
                }
              : {}),
          },
        },

        {
          new:
            true,
        }
      );

    await queueCrmResync(
      currentLead._id
    );
  }

  return currentLead;
}

async function createInternalLeadOpportunity({
  payload = {},
  actorUser,
  source = 'MANUAL',
}) {
  const customerName =
    cleanText(
      payload.customerName ||
      payload.name,
      150
    );

  const productCategory =
    cleanText(
      payload.productCategory ||
      payload.material,
      100
    );

  if (!customerName) {
    const error =
      new Error(
        'customerName is required.'
      );

    error.code =
      'VALIDATION_FAILED';

    throw error;
  }

  if (
    !payload.phone &&
    !payload.mobileNumber
  ) {
    const error =
      new Error(
        'phone is required.'
      );

    error.code =
      'VALIDATION_FAILED';

    throw error;
  }

  if (!productCategory) {
    const error =
      new Error(
        'productCategory is required.'
      );

    error.code =
      'VALIDATION_FAILED';

    throw error;
  }

  const phone =
    normalizeContactPhone(
      payload.phone ||
      payload.mobileNumber
    );

  const email =
    cleanText(
      payload.email,
      320
    ).toLowerCase();

  const companyName =
    cleanText(
      payload.companyName ||
      payload.company,
      200
    );

  const gst =
    cleanText(
      payload.gst ||
      payload.gstin,
      40
    )
      .toUpperCase()
      .replace(
        /[^A-Z0-9]/g,
        ''
      );

  const timeline =
    cleanText(
      payload.timeline ||
      payload.purchaseTimeline,
      120
    );

  const targetDate =
    parseOptionalDate(
      payload.targetDate,
      'targetDate'
    );

  const quantity =
    cleanText(
      payload.quantity,
      120
    );

  const quantityValue =
    payload.quantityValue !==
      undefined
      ? Number(
          payload.quantityValue
        )
      : parseQuantityValue(
          quantity
        );

  const safeSource =
    normalizeInternalSource(
      source ||
      payload.source,
      'MANUAL'
    );

  const contactResolution =
    await resolveOrCreateContact({
      source:
        safeSource,

      name:
        customerName,

      companyName,

      country:
        cleanText(
          payload.country,
          100
        ),

      phone,

      phoneVerified:
        payload.phoneVerified ===
        true,

      email,

      emailVerified:
        payload.emailVerified ===
        true,

      gst,

      gstVerified:
        payload.gstVerified ===
        true,

      consent:
        payload.consent ||
        {},

      actorId:
        actorUser?._id ||
        null,
    });

  const scoring =
    scoreAndClassifyLead({
      truckCount:
        payload.truckCount ??
        payload.trucks ??
        payload.quantityTrucks ??
        payload.requiredTrucks,

      timeline,

      targetDate,

      isImmediateRequirement:
        payload.isImmediateRequirement ===
        true,

      withinSevenDays:
        payload.withinSevenDays ===
          true ||
        payload.within7Days ===
          true,

      isPriorityAServiceableMarket:
        payload.isPriorityAServiceableMarket ===
          true ||
        payload.priorityAServiceableMarket ===
          true,

      serviceabilityTier:
        payload.serviceabilityTier ||
        payload.marketTier ||
        payload.destinationTier,

      companyName,

      gst,

      gstVerified:
        payload.gstVerified ===
        true,

      businessVerificationProvided:
        payload.businessVerificationProvided ===
          true ||
        payload.businessVerified ===
          true,

      completedPriceCheck:
        payload.completedPriceCheck ===
          true ||
        payload.priceCheckCompleted ===
          true,

      returnVisit:
        payload.returnVisit ===
          true ||
        payload.isReturnVisit ===
          true,

      visitCount:
        payload.visitCount ||
        payload.sessionVisitCount,

      repeatVisitCount:
        payload.repeatVisitCount,
    });

  const leadCode =
    `LD-${Date.now()}-${crypto
      .randomUUID()
      .slice(
        0,
        8
      )}`;

  const lead =
    await Lead.create({
      leadCode,

      contactId:
        contactResolution
          .contact?._id ||
        null,

      contactResolution: {
        status:
          contactResolution.status ||
          'UNRESOLVED',

        method:
          contactResolution.method ||
          'NONE',

        resolvedAt:
          contactResolution.contact
            ? new Date()
            : null,
      },

      source:
        safeSource,

      leadOrigin:
        'MANUAL',

      customerName,

      companyName,

      companyNameHash:
        companyName
          ? hashCompanyName(
              companyName
            )
          : '',

      phoneEncrypted:
        encryptText(
          phone
        ),

      phoneMasked:
        maskPhone(
          phone
        ),

      phoneHash:
        hashText(
          phone
        ),

      emailEncrypted:
        email
          ? encryptText(
              email
            )
          : '',

      emailMasked:
        email
          ? maskEmail(
              email
            )
          : '',

      emailHash:
        email
          ? hashText(
              email
            )
          : '',

      gstEncrypted:
        gst
          ? encryptText(
              gst
            )
          : '',

      gstMasked:
        gst
          ? `${gst.slice(
              0,
              2
            )}${'*'.repeat(
              Math.max(
                4,
                gst.length -
                4
              )
            )}${gst.slice(
              -2
            )}`
          : '',

      gstHash:
        gst
          ? hashText(
              gst
            )
          : '',

      whatsAppNumber:
        '',

      contactPerson:
        customerName,

      country:
        cleanText(
          payload.country,
          100
        ),

      productCategory,

      product:
        cleanText(
          payload.product,
          150
        ),

      productVariant:
        cleanText(
          payload.productVariant,
          150
        ),

      grade:
        cleanText(
          payload.grade,
          150
        ),

      specification:
        cleanText(
          payload.specification,
          1000
        ),

      quantity,

      quantityValue:
        Number.isFinite(
          quantityValue
        )
          ? quantityValue
          : 0,

      quantityUnit:
        cleanText(
          payload.quantityUnit,
          30
        ) ||
        'MT',

      quantityBand:
        cleanText(
          payload.quantityBand,
          100
        ),

      destination:
        cleanText(
          payload.destination ||
          payload.location,
          200
        ),

      timeline,

      targetDate,

      leadValue:
        Number(
          payload.leadValue ||
          0
        ) ||
        0,

      score:
        scoring.score,

      priority:
        scoring.priority,

      crmStatus:
        CRM_STATUS.NEW,

      crmStatusChangedAt:
        new Date(),

      crmStatusChangedBy:
        actorUser?._id ||
        null,

      stage:
        'NEW_LEAD',

      stageChangedAt:
        new Date(),

      stageChangedBy:
        actorUser?._id ||
        null,

      duplicateOf:
        null,

      consent: {
        contactAllowed:
          payload.consent
            ?.contactAllowed ===
          true,

        marketingAllowed:
          payload.consent
            ?.marketingAllowed ===
          true,

        analyticsAllowed:
          payload.consent
            ?.analyticsAllowed ===
          true,

        advertisingAllowed:
          payload.consent
            ?.advertisingAllowed ===
          true,

        privacyVersion:
          cleanText(
            payload.consent
              ?.privacyVersion,
            80
          ),

        trackingConsentCapturedAt:
          parseOptionalDate(
            payload.consent
              ?.trackingConsentCapturedAt,
            'trackingConsentCapturedAt'
          ),

        capturedAt:
          payload.consent
            ? new Date()
            : null,
      },

      attribution: {
        utmSource:
          cleanText(
            payload.attribution
              ?.utmSource,
            150
          ),

        utmMedium:
          cleanText(
            payload.attribution
              ?.utmMedium,
            150
          ),

        utmCampaign:
          cleanText(
            payload.attribution
              ?.utmCampaign,
            200
          ),

        utmContent:
          cleanText(
            payload.attribution
              ?.utmContent,
            200
          ),

        utmTerm:
          cleanText(
            payload.attribution
              ?.utmTerm,
            200
          ),

        gclid:
          cleanText(
            payload.attribution
              ?.gclid,
            250
          ),

        fbclid:
          cleanText(
            payload.attribution
              ?.fbclid,
            250
          ),

        campaignId:
          cleanText(
            payload.attribution
              ?.campaignId,
            150
          ),

        adSetId:
          cleanText(
            payload.attribution
              ?.adSetId,
            150
          ),

        adId:
          cleanText(
            payload.attribution
              ?.adId,
            150
          ),

        creativeId:
          cleanText(
            payload.attribution
              ?.creativeId,
            150
          ),

        creative:
          cleanText(
            payload.attribution
              ?.creative,
            200
          ),

        landingPage:
          cleanText(
            payload.attribution
              ?.landingPage,
            250
          ),

        landingPageType:
          cleanText(
            payload.attribution
              ?.landingPageType,
            100
          ),

        analyticsSessionId:
          cleanText(
            payload.attribution
              ?.analyticsSessionId,
            160
          ),
      },

      automationStatus:
        'COMPLETED',

      automationAttempts:
        0,

      crmSync: {
        status:
          'PENDING',

        attempts:
          0,

        nextAttemptAt:
          null,

        manualRecoveryRequired:
          false,
      },

      notificationDelivery: {
        salesAlert: {
          status:
            'PENDING',

          attempts:
            0,

          nextAttemptAt:
            null,
        },
      },

      originalPayload: {
        ingestionVersion:
          'MASTER_DPR_V4_PHASE_2_MANUAL_V1',

        scoringVersion:
          scoring.scoringVersion,

        scoreBreakdown:
          scoring.breakdown,

        contactResolutionReason:
          cleanText(
            contactResolution.reason,
            200
          ),

        contactConflictIds:
          Array.isArray(
            contactResolution
              .conflictContactIds
          )
            ? contactResolution
                .conflictContactIds
                .map(
                  (id) =>
                    cleanText(
                      id,
                      64
                    )
                )
                .filter(
                  Boolean
                )
            : [],
      },

      createdBy:
        actorUser?._id ||
        null,
    });

  if (
    lead.contactId
  ) {
    try {
      await markContactOpportunityCreated(
        lead.contactId,

        {
          source:
            safeSource,

          occurredAt:
            lead.createdAt ||
            new Date(),
        }
      );

    } catch (error) {
      console.warn(
        '[Lead Management] Contact opportunity summary update failed:',
        error.message
      );
    }
  }

  try {
    await LeadActivity.create({
      leadId:
        lead._id,

      actionType:
        'LEAD_CREATED',

      note:
        `Lead manually created by ${actorUser?.fullName || actorUser?.name || 'user'}. Initial DPR score: ${scoring.score}.`,

      actorId:
        actorUser?._id ||
        null,

      metadata: {
        scoringVersion:
          scoring.scoringVersion,

        contactResolutionStatus:
          contactResolution.status,
      },
    });

  } catch (error) {
    console.warn(
      '[Lead Management] Lead-created activity failed:',
      error.message
    );
  }

  await safeAudit({
    actorId:
      actorUser?._id ||
      null,

    actionType:
      'LEAD_CREATED',

    entityType:
      'LEAD',

    entityId:
      lead._id,

    severity:
      contactResolution.status ===
      'AMBIGUOUS'
        ? 'MEDIUM'
        : 'LOW',

    metadata: {
      leadCode:
        lead.leadCode,

      source:
        safeSource,

      contactResolutionStatus:
        contactResolution.status,

      scoringVersion:
        scoring.scoringVersion,
    },
  });

  const requestedAssignee =
    payload.assignedTo ||
    null;

  const requestedDepartment =
    payload.assignedDepartment ||
    null;

  if (
    requestedAssignee ||
    requestedDepartment
  ) {
    try {
      await assignLead({
        leadId:
          lead._id,

        assignedTo:
          requestedAssignee,

        assignedDepartment:
          requestedDepartment,

        user:
          actorUser,
      });

    } catch (error) {
      console.warn(
        '[Lead Management] Manual assignment failed after Lead persistence:',
        error.message
      );
    }

  } else {
    try {
      await autoRouteLead(
        lead
      );

    } catch (error) {
      console.warn(
        '[Lead Management] Automatic routing failed after Lead persistence:',
        error.message
      );
    }
  }

  return (
    await Lead.findById(
      lead._id
    )
  ) ||
  lead;
}


// ============================================================
// CREATE MANUAL LEAD
// ============================================================

async function createManualLead(
  req,
  res,
  next
) {
  try {
    const lead =
      await createInternalLeadOpportunity({
        payload:
          req.body,

        actorUser:
          req.user,

        source:
          normalizeInternalSource(
            req.body.source,
            'MANUAL'
          ),
      });

    return ok(
      res,

      {
        lead:
          getLeadDisplay(
            lead,
            req.user
          ),
      },

      'Lead created successfully',
      201,
      req
    );

  } catch (error) {
    if (
      error?.code ===
        'VALIDATION_FAILED' ||
      error?.code ===
        'CONTACT_PHONE_INVALID' ||
      error?.code ===
        'CONTACT_EMAIL_INVALID' ||
      error?.code ===
        'CONTACT_RESOLUTION_KEY_REQUIRED'
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        error.message
      );
    }

    next(
      error
    );
  }
}


// ============================================================
// DUE REMINDERS
// ============================================================

async function getDueReminders(
  req,
  res,
  next
) {
  try {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const tomorrow =
      new Date();

    tomorrow.setDate(
      tomorrow.getDate() +
      1
    );

    tomorrow.setHours(
      23,
      59,
      59,
      999
    );

    const filter = {
      nextFollowupAt: {
        $gte:
          today,

        $lte:
          tomorrow,
      },

      crmStatus: {
        $nin: [
          CRM_STATUS.WON,
          CRM_STATUS.LOST,
        ],
      },
    };

    if (
      !isManagementUser(
        req.user
      )
    ) {
      filter.assignedTo =
        req.user._id;
    }

    const leads =
      await Lead.find(
        filter
      )
        .sort({
          nextFollowupAt:
            1,
        })
        .select(
          'leadCode customerName productCategory nextFollowupAt stage crmStatus priority assignedTo assignedDepartment'
        );

    return ok(
      res,

      {
        reminders:
          leads,
      },

      'Due reminders list retrieved',
      200,
      req
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// VOICE NOTE UPLOAD
// ============================================================

async function uploadVoiceNote(
  req,
  res,
  next
) {
  try {
    const {
      id,
    } =
      req.params;

    if (
      !req.file
    ) {
      return fail(
        res,
        400,
        'FILE_REQUIRED',
        'Please upload a voice note recording.'
      );
    }

    const lead =
      await Lead.findById(
        id
      );

    if (!lead) {
      removeUploadedFileQuietly(
        req.file
      );

      return fail(
        res,
        404,
        'NOT_FOUND',
        'Lead not found.'
      );
    }

    const allowed =
      await hasLeadEvidenceAccess({
        user:
          req.user,

        lead,
      });

    if (!allowed) {
      removeUploadedFileQuietly(
        req.file
      );

      await auditEvidenceAccessDenied(
        req,

        {
          actionType:
            'VOICE_NOTE_ACCESS_DENIED',

          entityType:
            'LEAD',

          entityId:
            String(
              lead._id
            ),

          leadId:
            String(
              lead._id
            ),

          evidenceType:
            'VOICE_NOTE',

          operation:
            'UPLOAD',
        }
      );

      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied for this Lead evidence.'
      );
    }

    const voiceNoteObj = {
      path:
        getRelativePath(
          req.file.path
        ),

      originalName:
        req.file.originalname,

      uploadedBy:
        req.user?._id ||
        null,

      createdAt:
        new Date(),
    };

    if (
      !Array.isArray(
        lead.voiceNotes
      )
    ) {
      lead.voiceNotes =
        [];
    }

    lead.voiceNotes.push(
      voiceNoteObj
    );

    await lead.save();

    await LeadActivity.create({
      leadId:
        lead._id,

      actionType:
        'VOICE_NOTE_ADDED',

      note:
        `Added a voice note memo: "${req.file.originalname}"`,

      actorId:
        req.user?._id ||
        null,
    });

    await auditEvidenceSuccess(
      req,

      {
        actionType:
          'VOICE_NOTE_UPLOADED',

        entityType:
          'LEAD',

        entityId:
          String(
            lead._id
          ),

        leadId:
          String(
            lead._id
          ),

        evidenceType:
          'VOICE_NOTE',

        operation:
          'UPLOAD',

        metadata: {
          noteIndex:
            lead.voiceNotes.length -
            1,
        },
      }
    );

    return ok(
      res,

      {
        voiceNotes:
          lead.voiceNotes,
      },

      'Voice note attached successfully',
      200,
      req
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// VOICE NOTE STREAM
// ============================================================

async function streamVoiceNote(
  req,
  res,
  next
) {
  try {
    const {
      id,
      index,
    } =
      req.params;

    const noteIndex =
      Number(
        index
      );

    if (
      !Number.isInteger(
        noteIndex
      ) ||
      noteIndex <
        0
    ) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Voice note not found at this index.'
      );
    }

    const lead =
      await Lead.findById(
        id
      );

    if (!lead) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Lead not found.'
      );
    }

    const allowed =
      await hasLeadEvidenceAccess({
        user:
          req.user,

        lead,
      });

    if (!allowed) {
      await auditEvidenceAccessDenied(
        req,

        {
          actionType:
            'VOICE_NOTE_ACCESS_DENIED',

          entityType:
            'LEAD',

          entityId:
            String(
              lead._id
            ),

          leadId:
            String(
              lead._id
            ),

          evidenceType:
            'VOICE_NOTE',

          operation:
            'STREAM',
        }
      );

      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied for this Lead evidence.'
      );
    }

    const voiceNote =
      lead.voiceNotes?.[
        noteIndex
      ];

    if (
      !voiceNote ||
      !voiceNote.path
    ) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Voice note not found at this index.'
      );
    }

    const filePath =
      resolveUploadPath(
        voiceNote.path,
        'voice_notes'
      );

    if (
      !filePath ||
      !fs.existsSync(
        filePath
      )
    ) {
      try {
        const prodUrl =
          `https://indiatradeoverseas-ito.onrender.com/api/leads/${id}/voice-note/${noteIndex}`;

        await auditEvidenceSuccess(
          req,

          {
            actionType:
              'VOICE_NOTE_VIEWED',

            entityType:
              'LEAD',

            entityId:
              String(
                lead._id
              ),

            leadId:
              String(
                lead._id
              ),

            evidenceType:
              'VOICE_NOTE',

            operation:
              'STREAM',

            metadata: {
              noteIndex,

              storageSource:
                'PRODUCTION_PROXY',
            },
          }
        );

        await proxyFromProduction(
          prodUrl,
          req.headers.authorization,
          res
        );

        return;

      } catch (proxyError) {
        console.warn(
          `Local voice note missing, and production proxy failed: ${proxyError.message}`
        );
      }

      return fail(
        res,
        404,
        'FILE_NOT_FOUND',
        'Voice note audio file not found on disk.'
      );
    }

    await auditEvidenceSuccess(
      req,

      {
        actionType:
          'VOICE_NOTE_VIEWED',

        entityType:
          'LEAD',

        entityId:
          String(
            lead._id
          ),

        leadId:
          String(
            lead._id
          ),

        evidenceType:
          'VOICE_NOTE',

        operation:
          'STREAM',

        metadata: {
          noteIndex,

          storageSource:
            'LOCAL',
        },
      }
    );

    return res.sendFile(
      path.resolve(
        filePath
      )
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// GENERIC CRM ACTIVITY
// ============================================================

async function addActivity(
  req,
  res,
  next
) {
  try {
    const {
      id,
    } =
      req.params;

    const actionType =
      cleanText(
        req.body.actionType,
        80
      )
        .toUpperCase()
        .replace(
          /[\s-]+/g,
          '_'
        );

    const note =
      cleanText(
        req.body.note,
        4000
      );

    if (
      !actionType ||
      !note
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'actionType and note are required.'
      );
    }

    let lead =
      await Lead.findById(
        id
      );

    if (!lead) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Lead not found.'
      );
    }

    if (
      !canAccessLead(
        req.user,
        lead
      )
    ) {
      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied for this Lead.'
      );
    }

    const nextFollowupAt =
      parseOptionalDate(
        req.body.nextFollowupAt,
        'nextFollowupAt'
      );

    const contactOutcome =
      getContactOutcomeFromActivity(
        actionType,
        req.body.contactOutcome
      );

    lead =
      await advanceLeadForCommunication({
        lead,

        outcome:
          contactOutcome,

        actorId:
          req.user?._id ||
          null,

        note,

        nextFollowupAt,
      });

    if (
      nextFollowupAt &&
      String(
        lead.nextFollowupAt ||
        ''
      ) !==
        String(
          nextFollowupAt
        )
    ) {
      lead.nextFollowupAt =
        nextFollowupAt;

      await lead.save();

      await queueCrmResync(
        lead._id
      );
    }

    const activity =
      await LeadActivity.create({
        leadId:
          lead._id,

        actionType,

        note,

        nextFollowupAt,

        actorId:
          req.user?._id ||
          null,

        metadata: {
          contactOutcome,

          crmStatus:
            lead.crmStatus,

          performedByName:
            req.user?.fullName ||
            req.user?.name ||
            req.user?.email ||
            'User',

          performedByRole:
            req.user?.role ||
            'USER',
        },
      });

    /*
     * Preserve existing Employee Activity feed.
     * Failure here must not rollback the Lead activity.
     */
    try {
      const employeeActivityService =
        require(
          '../employee-activity/employeeActivity.service'
        );

      const actionCat =
        actionType ===
          'CALL_LOGGED' ||
        actionType ===
          'CALL'
          ? 'CALL_LOGGED'
          : (
              nextFollowupAt
                ? 'FOLLOWUP_COMPLETED'
                : 'NOTE_ADDED'
            );

      employeeActivityService
        .recordCrmAction(
          req.user,
          actionCat,
          note
        )
        .catch(
          () => {}
        );

    } catch (error) {
      console.warn(
        '[Lead Management] Employee activity notice:',
        error.message
      );
    }

    return ok(
      res,

      {
        activity,

        crmStatus:
          lead.crmStatus,

        firstResponseAt:
          lead.firstResponseAt ||
          null,

        lastContactAt:
          lead.lastContactAt ||
          null,

        nextFollowupAt:
          lead.nextFollowupAt ||
          null,
      },

      'Activity logged successfully',
      201,
      req
    );

  } catch (error) {
    if (
      error?.code ===
        'VALIDATION_FAILED' ||
      error?.code
        ?.startsWith?.(
          'CRM_'
        )
    ) {
      return fail(
        res,
        400,
        error.code ||
          'VALIDATION_FAILED',
        error.message
      );
    }

    next(
      error
    );
  }
}


// ============================================================
// WHATSAPP ACTIVITY
// ============================================================

async function logWhatsAppActivity(
  req,
  res,
  next
) {
  try {
    const {
      id,
    } =
      req.params;

    let lead =
      await Lead.findById(
        id
      );

    if (!lead) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Lead not found.'
      );
    }

    if (
      !canAccessLead(
        req.user,
        lead
      )
    ) {
      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied for this Lead.'
      );
    }

    const message =
      cleanText(
        req.body.message,
        4000
      );

    const nextFollowupAt =
      parseOptionalDate(
        req.body.nextFollowupAt,
        'nextFollowupAt'
      );

    lead =
      await advanceLeadForCommunication({
        lead,

        outcome:
          'ATTEMPTED',

        actorId:
          req.user?._id ||
          null,

        note:
          'WhatsApp contact attempt logged.',

        nextFollowupAt,
      });

    const activity =
      await LeadActivity.create({
        leadId:
          lead._id,

        actionType:
          'WHATSAPP_SENT',

        note:
          message ||
          'Sent quick template message via WhatsApp.',

        nextFollowupAt,

        actorId:
          req.user?._id ||
          null,

        metadata: {
          contactOutcome:
            'ATTEMPTED',

          crmStatus:
            lead.crmStatus,
        },
      });

    await safeAudit({
      actorId:
        req.user?._id ||
        null,

      actionType:
        'WHATSAPP_SENT',

      entityType:
        'LEAD',

      entityId:
        lead._id,

      severity:
        'LOW',

      metadata: {
        leadCode:
          lead.leadCode,

        crmStatus:
          lead.crmStatus,
      },
    });

    return ok(
      res,

      {
        activity,

        crmStatus:
          lead.crmStatus,

        firstResponseAt:
          lead.firstResponseAt ||
          null,
      },

      'WhatsApp activity logged successfully',
      200,
      req
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// EMAIL ACTIVITY
// ============================================================

async function logEmailActivity(
  req,
  res,
  next
) {
  try {
    const {
      id,
    } =
      req.params;

    const subject =
      cleanText(
        req.body.subject,
        300
      );

    const body =
      cleanText(
        req.body.body,
        10000
      );

    if (
      !subject ||
      !body
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'Subject and Body are required to send email.'
      );
    }

    let lead =
      await Lead.findById(
        id
      );

    if (!lead) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Lead not found.'
      );
    }

    if (
      !canAccessLead(
        req.user,
        lead
      )
    ) {
      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied for this Lead.'
      );
    }

    const decryptedEmail =
      lead.emailEncrypted
        ? decryptText(
            lead.emailEncrypted
          )
        : '';

    let emailSentSuccessfully =
      false;

    if (
      decryptedEmail &&
      decryptedEmail !==
        'DECRYPTION_ERROR'
    ) {
      try {
        const {
          sendEmail,
        } =
          require(
            '../../utils/mailer'
          );

        const safeHtmlBody =
          escapeHtml(
            body
          ).replace(
            /\n/g,
            '<br/>'
          );

        await sendEmail(
          decryptedEmail,
          subject,
          body,
          `<p>${safeHtmlBody}</p>`
        );

        emailSentSuccessfully =
          true;

      } catch (error) {
        console.warn(
          '[Lead Management] Email send failed; activity retained for visibility:',
          error.message
        );
      }
    }

    const nextFollowupAt =
      parseOptionalDate(
        req.body.nextFollowupAt,
        'nextFollowupAt'
      );

    if (
      emailSentSuccessfully
    ) {
      lead =
        await advanceLeadForCommunication({
          lead,

          outcome:
            'ATTEMPTED',

          actorId:
            req.user?._id ||
            null,

          note:
            `Email contact attempt sent: ${subject}`,

          nextFollowupAt,
        });
    }

    const activity =
      await LeadActivity.create({
        leadId:
          lead._id,

        actionType:
          'EMAIL_SENT',

        note:
          `Email ${emailSentSuccessfully ? 'sent' : 'logged but delivery failed'}: "${subject}"\n---\n${body}`,

        nextFollowupAt,

        actorId:
          req.user?._id ||
          null,

        metadata: {
          subject,

          sentLive:
            emailSentSuccessfully,

          contactOutcome:
            emailSentSuccessfully
              ? 'ATTEMPTED'
              : 'NONE',

          crmStatus:
            lead.crmStatus,
        },
      });

    if (
      emailSentSuccessfully
    ) {
      await safeAudit({
        actorId:
          req.user?._id ||
          null,

        actionType:
          'EMAIL_SENT',

        entityType:
          'LEAD',

        entityId:
          lead._id,

        severity:
          'LOW',

        metadata: {
          leadCode:
            lead.leadCode,

          crmStatus:
            lead.crmStatus,
        },
      });
    }

    return ok(
      res,

      {
        sentLive:
          emailSentSuccessfully,

        activity,

        crmStatus:
          lead.crmStatus,

        firstResponseAt:
          lead.firstResponseAt ||
          null,
      },

      emailSentSuccessfully
        ? 'Email sent and recorded under activity timeline'
        : 'Email delivery failed; activity recorded for follow-up',

      200,
      req
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// SALES METRICS
// ============================================================

async function getSalesMetrics(
  req,
  res,
  next
) {
  try {
    const filter =
      {};

    if (
      !isManagementUser(
        req.user
      )
    ) {
      filter.assignedTo =
        req.user._id;
    }

    const stats =
      await Lead.aggregate([
        {
          $match:
            filter,
        },

        {
          $group: {
            _id:
              null,

            totalLeads: {
              $sum:
                1,
            },

            totalValuation: {
              $sum:
                '$leadValue',
            },

            wonDeals: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      '$crmStatus',
                      CRM_STATUS.WON,
                    ],
                  },

                  1,
                  0,
                ],
              },
            },

            lostDeals: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      '$crmStatus',
                      CRM_STATUS.LOST,
                    ],
                  },

                  1,
                  0,
                ],
              },
            },

            qualifiedLeads: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$crmStatus',

                      [
                        CRM_STATUS.QUALIFIED,
                        CRM_STATUS.QUOTATION_SENT,
                        CRM_STATUS.NEGOTIATION,
                        CRM_STATUS.WON,
                      ],
                    ],
                  },

                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

    const result =
      stats[0] ||
      {
        totalLeads:
          0,

        totalValuation:
          0,

        wonDeals:
          0,

        lostDeals:
          0,

        qualifiedLeads:
          0,
      };

    const conversionRate =
      result.totalLeads >
      0
        ? Math.round(
            (
              result.wonDeals /
              result.totalLeads
            ) *
            100
          )
        : 0;

    return ok(
      res,

      {
        ...result,

        conversionRate,
      },

      'Sales metrics retrieved successfully',
      200,
      req
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// CALL RECORDING UPLOAD
// ============================================================

async function uploadCallRecording(
  req,
  res,
  next
) {
  try {
    if (
      !req.file
    ) {
      return fail(
        res,
        400,
        'FILE_REQUIRED',
        'Please select a call recording audio file.'
      );
    }

    const {
      leadId,
      notes,
      duration,
      leadPriority,
      customerName:
        inputCustomerName,
      mobileNumber,
      contactRole,
      material,
      quantity,
      location,
      serialNo,
      contactOutcome,
    } =
      req.body;

    let lead =
      null;

    let customerName =
      cleanText(
        inputCustomerName,
        150
      );

    let leadCode =
      '';

    if (leadId) {
      lead =
        await Lead.findById(
          leadId
        );

      if (!lead) {
        removeUploadedFileQuietly(
          req.file
        );

        return fail(
          res,
          404,
          'NOT_FOUND',
          'Lead not found.'
        );
      }

      const evidenceAllowed =
        await hasLeadEvidenceAccess({
          user:
            req.user,

          lead,
        });

      if (
        !evidenceAllowed
      ) {
        removeUploadedFileQuietly(
          req.file
        );

        await auditEvidenceAccessDenied(
          req,

          {
            actionType:
              'CALL_RECORDING_ACCESS_DENIED',

            entityType:
              'LEAD',

            entityId:
              String(
                lead._id
              ),

            leadId:
              String(
                lead._id
              ),

            evidenceType:
              'CALL_RECORDING',

            operation:
              'UPLOAD',
          }
        );

        return fail(
          res,
          403,
          'OWNERSHIP_FORBIDDEN',
          'Access denied for this Lead evidence.'
        );
      }

      customerName =
        lead.customerName ||
        customerName;

      leadCode =
        lead.leadCode ||
        '';

      if (
        !lead.voiceNotes
      ) {
        lead.voiceNotes =
          [];
      }

      lead.voiceNotes.push({
        path:
          getRelativePath(
            req.file.path
          ),

        originalName:
          req.file.originalname,

        uploadedBy:
          req.user?._id ||
          null,

        createdAt:
          new Date(),
      });

      if (material) {
        lead.productCategory =
          cleanText(
            material,
            100
          );
      }

      if (quantity) {
        lead.quantity =
          cleanText(
            quantity,
            120
          );
      }

      if (location) {
        lead.destination =
          cleanText(
            location,
            200
          );
      }

      const normalizedPriority =
        normalizePriority(
          leadPriority
        );

      if (
        normalizedPriority
      ) {
        lead.priority =
          normalizedPriority;
      }

      const normalizedOutcome =
        getContactOutcomeFromActivity(
          'CALL',
          contactOutcome ||
          'ATTEMPTED'
        );

      lead =
        await advanceLeadForCommunication({
          lead,

          outcome:
            normalizedOutcome ===
              'NONE'
              ? 'ATTEMPTED'
              : normalizedOutcome,

          actorId:
            req.user?._id ||
            null,

          note:
            cleanText(
              notes,
              2000
            ) ||
            'Call recording uploaded.',
        });

      const earlyStages = ['NEW_LEAD', 'ASSIGNED', 'CONTACTED', 'CONTACT_ATTEMPTED', 'LEAD_QUALIFICATION', 'FOLLOW_UP'];
      if (earlyStages.includes(String(lead.stage || '').toUpperCase())) {
        lead.stage = 'REQUIREMENT_CAPTURED';
        await lead.save();
      }

      await LeadActivity.create({
        leadId:
          lead._id,

        actionType:
          'VOICE_NOTE_ADDED',

        note:
          `Call recording uploaded by ${req.user?.fullName || req.user?.name || 'user'}: "${req.file.originalname}"${notes ? ` - ${cleanText(notes, 2000)}` : ''}`,

        actorId:
          req.user?._id ||
          null,

        metadata: {
          contactOutcome:
            normalizedOutcome ===
              'NONE'
              ? 'ATTEMPTED'
              : normalizedOutcome,

          crmStatus:
            lead.crmStatus,
        },
      });

      await queueCrmResync(
        lead._id
      );

    } else if (
      customerName ||
      mobileNumber
    ) {
      if (
        !mobileNumber
      ) {
        removeUploadedFileQuietly(
          req.file
        );

        return fail(
          res,
          400,
          'VALIDATION_FAILED',
          'mobileNumber is required when creating a Lead from an unlinked call recording.'
        );
      }

      lead =
        await createInternalLeadOpportunity({
          payload: {
            customerName:
              customerName ||
              'Direct Customer',

            phone:
              mobileNumber,

            productCategory:
              material ||
              'GENERAL_INQUIRY',

            product:
              material ||
              '',

            quantity:
              quantity ||
              '',

            destination:
              location ||
              '',

            priority:
              leadPriority,

            source:
              'MANUAL',
          },

          actorUser:
            req.user,

          source:
            'MANUAL',
        });

      customerName =
        lead.customerName ||
        customerName ||
        'Direct Customer';

      leadCode =
        lead.leadCode ||
        '';

      if (
        !lead.voiceNotes
      ) {
        lead.voiceNotes =
          [];
      }

      lead.voiceNotes.push({
        path:
          getRelativePath(
            req.file.path
          ),

        originalName:
          req.file.originalname,

        uploadedBy:
          req.user?._id ||
          null,

        createdAt:
          new Date(),
      });

      await lead.save();

      const normalizedOutcome =
        getContactOutcomeFromActivity(
          'CALL',
          contactOutcome ||
          'ATTEMPTED'
        );

      lead =
        await advanceLeadForCommunication({
          lead,

          outcome:
            normalizedOutcome ===
              'NONE'
              ? 'ATTEMPTED'
              : normalizedOutcome,

          actorId:
            req.user?._id ||
            null,

          note:
            cleanText(
              notes,
              2000
            ) ||
            'Direct call recording logged.',
        });
    }

    const recordingPriority =
      toRecordingPriority(
        leadPriority ||
        lead?.priority
      ) ||
      'WARM';

    const callRecording =
      await CallRecording.create({
        executiveId:
          req.user?._id,

        executiveName:
          req.user?.fullName ||
          req.user?.name ||
          'Sales Executive',

        leadId:
          lead?._id ||
          null,

        leadCode:
          leadCode ||
          lead?.leadCode ||
          '',

        customerName:
          customerName ||
          'Direct Customer',

        /*
         * Avoid duplicating decrypted Lead phone data into
         * call-recording evidence.
         */
        mobileNumber:
          lead?.phoneMasked ||
          (
            mobileNumber
              ? maskPhone(
                  normalizeContactPhone(
                    mobileNumber
                  )
                )
              : ''
          ),

        contactRole:
          cleanText(
            contactRole,
            100
          ) ||
          'Customer',

        material:
          cleanText(
            material,
            150
          ),

        quantity:
          cleanText(
            quantity,
            120
          ),

        location:
          cleanText(
            location,
            200
          ),

        serialNo:
          cleanText(
            serialNo,
            100
          ),

        audioPath:
          getRelativePath(
            req.file.path
          ),

        originalName:
          req.file.originalname,

        mimeType:
          req.file.mimetype ||
          'audio/mpeg',

        size:
          req.file.size ||
          0,

        duration:
          cleanText(
            duration,
            100
          ),

        notes:
          cleanText(
            notes,
            4000
          ),

        leadPriority:
          recordingPriority,
      });

    // Trigger Google Drive upload asynchronously in background to ensure instant API response
    (async () => {
      try {
        const { uploadToGoogleDrive } = require('../../services/googleDrive.service');
        const driveResult = await uploadToGoogleDrive(
          req.file.path,
          req.file.originalname,
          req.file.mimetype
        );
        if (driveResult && driveResult.fileId) {
          callRecording.driveFileId = driveResult.fileId;
          callRecording.driveWebViewLink = driveResult.webViewLink || '';
          callRecording.driveWebContentLink = driveResult.webContentLink || '';
          await callRecording.save();
        }
      } catch (error) {
        console.warn('[CallRecording] Background Google Drive upload notice:', error.message);
      }
    })();

    await auditEvidenceSuccess(
      req,

      {
        actionType:
          'CALL_RECORDING_UPLOADED',

        entityType:
          'CALL_RECORDING',

        entityId:
          String(
            callRecording._id
          ),

        leadId:
          lead?._id
            ? String(
                lead._id
              )
            : null,

        recordingId:
          String(
            callRecording._id
          ),

        evidenceType:
          'CALL_RECORDING',

        operation:
          'UPLOAD',

        metadata: {
          linkedToLead:
            Boolean(
              lead?._id
            ),

          priority:
            callRecording
              .leadPriority ||
            '',

          driveCopyAvailable:
            Boolean(
              callRecording
                .driveFileId
            ),
        },
      }
    );

    /*
     * Preserve working Employee Activity.
     * This remains best-effort and cannot rollback evidence persistence.
     */
    try {
      const employeeActivityService =
        require(
          '../employee-activity/employeeActivity.service'
        );

      employeeActivityService
        .recordCrmAction(
          req.user,
          'RECORDING_UPLOADED',
          `Uploaded call recording: ${req.file.originalname}`
        )
        .catch(
          () => {}
        );

    } catch (error) {
      console.warn(
        '[Lead Management] Recording employee activity notice:',
        error.message
      );
    }

    return ok(
      res,

      {
        callRecording,

        lead:
          lead
            ? getLeadDisplay(
                lead,
                req.user
              )
            : null,
      },

      'Call recording uploaded successfully',
      201,
      req
    );

  } catch (error) {
    console.error(
      '[CallRecording] Upload error:',
      error?.message || error,
      error?.stack ? error.stack.split('\n').slice(0, 3).join(' | ') : ''
    );

    // Clean up uploaded file on error
    if (req.file) {
      removeUploadedFileQuietly(
        req.file
      );
    }

    if (
      [
        'VALIDATION_FAILED',
        'CONTACT_PHONE_INVALID',
        'CONTACT_EMAIL_INVALID',
        'CONTACT_RESOLUTION_KEY_REQUIRED',
      ].includes(
        error?.code
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        error.message
      );
    }

    // Mongoose ValidationError (e.g. enum mismatch, required field missing)
    if (
      error?.name === 'ValidationError'
    ) {
      const firstMessage =
        Object.values(
          error.errors || {}
        )
          .map(
            (e) => e.message
          )
          .join('; ') ||
        error.message;

      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        firstMessage
      );
    }

    // Mongoose CastError (e.g. invalid ObjectId)
    if (
      error?.name === 'CastError'
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        `Invalid value for ${error.path || 'field'}: ${error.value}`
      );
    }

    // Duplicate key error (e.g. unique index conflict)
    if (
      error?.code === 11000 ||
      error?.code === 11001
    ) {
      return fail(
        res,
        409,
        'DUPLICATE_RECORD',
        'A duplicate call recording entry was detected.'
      );
    }

    next(
      error
    );
  }
}


// ============================================================
// CALL RECORDING LIST
// ============================================================

async function getCallRecordings(
  req,
  res,
  next
) {
  try {
    const filter =
      {};

    const {
      executiveId,
      leadId,
      priority,
    } =
      req.query;

    /*
     * Keep DPR evidence-role rules as the primary authority,
     * while preserving latest-main Founder/CEO/Super Admin access.
     */
    const isManagerOrAdmin =
      isBroadEvidenceReviewer(
        req.user
      ) ||
      isManagementUser(
        req.user
      );

    if (
      !isManagerOrAdmin
    ) {
      const User =
        require(
          '../users/user.model'
        );

      const Task =
        require(
          '../task/task.model'
        );

      const idSet =
        new Set();

      if (
        req.user?._id
      ) {
        idSet.add(
          String(
            req.user._id
          )
        );
      }

      if (
        req.user?.employeeDbId
      ) {
        idSet.add(
          String(
            req.user.employeeDbId
          )
        );
      }

      if (
        req.user?.employeeId
      ) {
        idSet.add(
          String(
            req.user.employeeId
          )
        );
      }

      if (
        req.user?.trialId
      ) {
        idSet.add(
          String(
            req.user.trialId
          )
        );
      }

      if (
        req.user?.email
      ) {
        const email =
          String(
            req.user.email
          )
            .trim()
            .toLowerCase();

        const emp =
          await Employee.findOne({
            email,
          });

        if (
          emp?._id
        ) {
          idSet.add(
            String(
              emp._id
            )
          );
        }

        const uDoc =
          await User.findOne({
            email,
          });

        if (
          uDoc?._id
        ) {
          idSet.add(
            String(
              uDoc._id
            )
          );
        }
      }

      const matchIds =
        [];

      idSet.forEach(
        (
          idStr
        ) => {
          matchIds.push(
            idStr
          );

          if (
            mongoose.isValidObjectId(
              idStr
            )
          ) {
            matchIds.push(
              new mongoose.Types.ObjectId(
                idStr
              )
            );
          }
        }
      );

      const assignedLeads =
        await Lead.find({
          assignedTo: {
            $in:
              matchIds,
          },
        })
          .select(
            '_id'
          )
          .lean();

      const assignedLeadIds =
        assignedLeads.map(
          (
            lead
          ) =>
            lead._id
        );

      const assignedTasks =
        await Task.find({
          assignedTo: {
            $in:
              matchIds,
          },

          leadId: {
            $ne:
              null,
          },
        })
          .select(
            'leadId'
          )
          .lean();

      const taskLeadIds =
        assignedTasks
          .map(
            (
              task
            ) =>
              task.leadId
          )
          .filter(
            Boolean
          );

      const combinedLeadIds =
        [
          ...new Set([
            ...assignedLeadIds.map(
              String
            ),

            ...taskLeadIds.map(
              String
            ),
          ]),
        ].map(
          (
            idStr
          ) =>
            mongoose.isValidObjectId(
              idStr
            )
              ? new mongoose.Types.ObjectId(
                  idStr
                )
              : idStr
        );

      filter.$or = [
        {
          executiveId: {
            $in:
              matchIds,
          },
        },

        {
          leadId: {
            $in:
              combinedLeadIds,
          },
        },
      ];

    } else if (
      executiveId
    ) {
      filter.executiveId =
        executiveId;
    }

    if (
      leadId
    ) {
      filter.leadId =
        leadId;
    }

    if (
      priority
    ) {
      const recordingPriorityFilter =
        toRecordingPriority(
          priority
        );

      if (
        !recordingPriorityFilter
      ) {
        return fail(
          res,
          400,
          'INVALID_PRIORITY',
          'priority must be HOT, WARM, NURTURE, or LOW.'
        );
      }

      filter.leadPriority =
        recordingPriorityFilter ===
          'LOW'
          ? {
              $in: [
                'LOW',
                'COLD',
              ],
            }
          : recordingPriorityFilter;
    }

    const User =
      require(
        '../users/user.model'
      );

    const SalesTrialUser =
      require(
        '../sales-trial/salesTrialUser.model'
      );

    const rawRecordings =
      await CallRecording.find(
        filter
      )
        .populate(
          'leadId',
          'customerName leadCode companyName priority stage crmStatus assignedTo assignedDepartment'
        )
        .sort({
          createdAt:
            -1,
        })
        .lean();

    const searchIdsSet =
      new Set();

    rawRecordings.forEach(
      (
        recording
      ) => {
        if (
          recording.executiveId
        ) {
          searchIdsSet.add(
            String(
              recording.executiveId
            )
          );
        }

        if (
          recording.leadId &&
          recording.leadId
            .assignedTo
        ) {
          const assigned =
            recording.leadId
              .assignedTo;

          searchIdsSet.add(
            String(
              assigned._id ||
              assigned
            )
          );
        }
      }
    );

    const searchArray =
      [
        ...searchIdsSet,
      ].filter(
        Boolean
      );

    const objectIdArray =
      [];

    const stringArray =
      [];

    searchArray.forEach(
      (
        idStr
      ) => {
        stringArray.push(
          idStr
        );

        if (
          mongoose.isValidObjectId(
            idStr
          )
        ) {
          try {
            objectIdArray.push(
              new mongoose.Types.ObjectId(
                idStr
              )
            );
          } catch (error) {
            // Ignore invalid conversion.
          }
        }
      }
    );

    let users =
      [];

    let employees =
      [];

    let trialUsers =
      [];

    if (
      searchArray.length >
      0
    ) {
      [
        users,
        employees,
        trialUsers,
      ] =
        await Promise.all([
          User.collection
            .find({
              $or: [
                {
                  _id: {
                    $in:
                      stringArray,
                  },
                },

                {
                  _id: {
                    $in:
                      objectIdArray,
                  },
                },

                {
                  employeeId: {
                    $in:
                      stringArray,
                  },
                },
              ],
            })
            .toArray(),

          Employee.collection
            .find({
              $or: [
                {
                  _id: {
                    $in:
                      stringArray,
                  },
                },

                {
                  _id: {
                    $in:
                      objectIdArray,
                  },
                },

                {
                  employeeId: {
                    $in:
                      stringArray,
                  },
                },
              ],
            })
            .toArray(),

          SalesTrialUser.collection
            .find({
              $or: [
                {
                  _id: {
                    $in:
                      stringArray,
                  },
                },

                {
                  _id: {
                    $in:
                      objectIdArray,
                  },
                },

                {
                  trialId: {
                    $in:
                      stringArray,
                  },
                },
              ],
            })
            .toArray(),
        ]);
    }

    const nameMap =
      new Map();

    const addToMap =
      (
        doc
      ) => {
        if (!doc) {
          return;
        }

        const displayName =
          doc.fullName ||
          doc.name ||
          doc.email ||
          doc.employeeId ||
          doc.trialId ||
          String(
            doc._id
          );

        nameMap.set(
          String(
            doc._id
          ),
          displayName
        );

        if (
          doc.employeeId
        ) {
          nameMap.set(
            String(
              doc.employeeId
            ),
            displayName
          );
        }

        if (
          doc.trialId
        ) {
          nameMap.set(
            String(
              doc.trialId
            ),
            displayName
          );
        }
      };

    users.forEach(
      addToMap
    );

    employees.forEach(
      addToMap
    );

    trialUsers.forEach(
      addToMap
    );

    const recordings =
      rawRecordings.map(
        (
          recording
        ) => {
          const execIdStr =
            recording.executiveId
              ? String(
                  recording.executiveId
                )
              : '';

          const execResolvedName =
            nameMap.get(
              execIdStr
            ) ||
            recording.executiveName ||
            'Executive';

          let assignedCustodianName =
            'Unassigned';

          if (
            recording.leadId &&
            recording.leadId
              .assignedTo
          ) {
            const assigned =
              recording.leadId
                .assignedTo;

            const leadAssigneeStr =
              String(
                assigned._id ||
                assigned
              );

            assignedCustodianName =
              nameMap.get(
                leadAssigneeStr
              ) ||
              (
                typeof assigned ===
                  'object'
                  ? (
                      assigned.fullName ||
                      assigned.name
                    )
                  : assigned
              ) ||
              'Unassigned';

          } else if (
            recording.leadId &&
            recording.leadId
              .assignedDepartment
          ) {
            assignedCustodianName =
              `Dept: ${recording.leadId.assignedDepartment}`;

          } else {
            assignedCustodianName =
              execResolvedName;
          }

          const isDone =
            recording.status
              ? (
                  recording.status ===
                  'COMPLETED'
                )
              : (
                  Boolean(
                    recording.completedAt
                  ) ||
                  (
                    recording.leadId &&
                    [
                      'CLOSED_WON',
                      'DEAL_WON',
                      'DELIVERED',
                      'COMPLETED',
                      'QUOTATION_REQUIRED',
                      'QUOTATION_SENT',
                      'NEGOTIATION',
                      'REQUIREMENT_CAPTURED',
                    ].includes(
                      String(
                        recording
                          .leadId
                          .stage
                      ).toUpperCase()
                    )
                  )
                );

          return {
            ...recording,

            executiveName:
              execResolvedName,

            assignedToName:
              assignedCustodianName,

            status:
              isDone
                ? 'COMPLETED'
                : 'PENDING',
          };
        }
      );

    return ok(
      res,

      {
        recordings,
      },

      'Call recordings retrieved successfully',
      200,
      req
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// CALL RECORDING STREAM
// ============================================================

async function streamCallRecording(
  req,
  res,
  next
) {
  try {
    const {
      recordingId,
    } =
      req.params;

    if (
      !recordingId ||
      !mongoose.isValidObjectId(
        recordingId
      )
    ) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Invalid call recording ID.'
      );
    }

    const recording =
      await CallRecording.findById(
        recordingId
      );

    if (
      !recording ||
      !recording.audioPath
    ) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Call recording not found.'
      );
    }

    const lead =
      recording.leadId
        ? await Lead.findById(
            recording.leadId
          )
        : null;

    const allowed =
      await hasCallRecordingAccess({
        user:
          req.user,

        recording,

        lead,
      });

    if (!allowed) {
      await auditEvidenceAccessDenied(
        req,

        {
          actionType:
            'CALL_RECORDING_ACCESS_DENIED',

          entityType:
            'CALL_RECORDING',

          entityId:
            String(
              recording._id
            ),

          leadId:
            lead?._id
              ? String(
                  lead._id
                )
              : null,

          recordingId:
            String(
              recording._id
            ),

          evidenceType:
            'CALL_RECORDING',

          operation:
            'STREAM',
        }
      );

      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied for this call recording.'
      );
    }

    const filePath =
      resolveUploadPath(
        recording.audioPath,
        'call_recordings'
      );

    if (
      !filePath ||
      !fs.existsSync(
        filePath
      )
    ) {
      if (
        recording.driveFileId
      ) {
        try {
          const {
            getDriveFileStream,
          } =
            require(
              '../../services/googleDrive.service'
            );

          const driveStream =
            await getDriveFileStream(
              recording.driveFileId
            );

          if (
            driveStream
          ) {
            await auditEvidenceSuccess(
              req,

              {
                actionType:
                  'CALL_RECORDING_VIEWED',

                entityType:
                  'CALL_RECORDING',

                entityId:
                  String(
                    recording._id
                  ),

                leadId:
                  lead?._id
                    ? String(
                        lead._id
                      )
                    : null,

                recordingId:
                  String(
                    recording._id
                  ),

                evidenceType:
                  'CALL_RECORDING',

                operation:
                  'STREAM',

                metadata: {
                  storageSource:
                    'GOOGLE_DRIVE',
                },
              }
            );

            res.setHeader(
              'Content-Type',
              recording.mimeType ||
              'audio/mpeg'
            );

            return driveStream.pipe(
              res
            );
          }

        } catch (driveStreamErr) {
          console.warn(
            '[CallRecording] Drive stream error:',
            driveStreamErr.message
          );
        }
      }

      try {
        const prodUrl =
          `https://indiatradeoverseas-ito.onrender.com/api/leads/call-recordings/${recordingId}/stream`;

        await auditEvidenceSuccess(
          req,

          {
            actionType:
              'CALL_RECORDING_VIEWED',

            entityType:
              'CALL_RECORDING',

            entityId:
              String(
                recording._id
              ),

            leadId:
              lead?._id
                ? String(
                    lead._id
                  )
                : null,

            recordingId:
              String(
                recording._id
              ),

            evidenceType:
              'CALL_RECORDING',

            operation:
              'STREAM',

            metadata: {
              storageSource:
                'PRODUCTION_PROXY',
            },
          }
        );

        await proxyFromProduction(
          prodUrl,
          req.headers.authorization,
          res
        );

        return;

      } catch (proxyError) {
        console.warn(
          `Local call recording missing: ${proxyError.message}`
        );
      }

      return fail(
        res,
        404,
        'FILE_NOT_FOUND',
        'Audio file not found on disk or Drive.'
      );
    }

    const absPath =
      path.resolve(
        filePath
      );

    const stat =
      fs.statSync(
        absPath
      );

    const fileSize =
      stat.size;

    const range =
      req.headers.range;

    const mimeType =
      recording.mimeType ||
      'audio/mpeg';

    await auditEvidenceSuccess(
      req,

      {
        actionType:
          'CALL_RECORDING_VIEWED',

        entityType:
          'CALL_RECORDING',

        entityId:
          String(
            recording._id
          ),

        leadId:
          lead?._id
            ? String(
                lead._id
              )
            : null,

        recordingId:
          String(
            recording._id
          ),

        evidenceType:
          'CALL_RECORDING',

        operation:
          'STREAM',

        metadata: {
          storageSource:
            'LOCAL',

          rangeRequest:
            Boolean(
              range
            ),
        },
      }
    );

    if (range) {
      const match =
        /^bytes=(\d*)-(\d*)$/.exec(
          range
        );

      if (!match) {
        return res
          .status(
            416
          )
          .end();
      }

      const start =
        match[1]
          ? Number(
              match[1]
            )
          : 0;

      const end =
        match[2]
          ? Number(
              match[2]
            )
          : fileSize -
            1;

      if (
        !Number.isInteger(
          start
        ) ||
        !Number.isInteger(
          end
        ) ||
        start <
          0 ||
        end <
          start ||
        start >=
          fileSize ||
        end >=
          fileSize
      ) {
        res.setHeader(
          'Content-Range',
          `bytes */${fileSize}`
        );

        return res
          .status(
            416
          )
          .end();
      }

      const chunkSize =
        end -
        start +
        1;

      res.writeHead(
        206,

        {
          'Content-Range':
            `bytes ${start}-${end}/${fileSize}`,

          'Accept-Ranges':
            'bytes',

          'Content-Length':
            chunkSize,

          'Content-Type':
            mimeType,

          'Cross-Origin-Resource-Policy':
            'same-site',
        }
      );

      return fs
        .createReadStream(
          absPath,

          {
            start,
            end,
          }
        )
        .pipe(
          res
        );
    }

    res.writeHead(
      200,

      {
        'Content-Length':
          fileSize,

        'Content-Type':
          mimeType,

        'Accept-Ranges':
          'bytes',

        'Cross-Origin-Resource-Policy':
          'same-site',
      }
    );

    return fs
      .createReadStream(
        absPath
      )
      .pipe(
        res
      );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// MANAGER REMARK
// ============================================================

async function updateCallRecordingRemark(
  req,
  res,
  next
) {
  try {
    const {
      recordingId,
    } =
      req.params;

    if (
      !recordingId ||
      !mongoose.isValidObjectId(
        recordingId
      )
    ) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Invalid call recording ID.'
      );
    }

    if (
      !canManageCallRecordingRemark(
        req.user
      )
    ) {
      await auditEvidenceAccessDenied(
        req,

        {
          actionType:
            'CALL_RECORDING_ACCESS_DENIED',

          entityType:
            'CALL_RECORDING',

          entityId:
            recordingId,

          recordingId,

          evidenceType:
            'CALL_RECORDING',

          operation:
            'UPDATE_MANAGER_REMARK',
        }
      );

      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Only authorized management reviewers can update manager remarks.'
      );
    }

    const recording =
      await CallRecording.findById(
        recordingId
      );

    if (!recording) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Call recording not found.'
      );
    }

    const managerRemark =
      cleanText(
        req.body?.managerRemark,
        4000
      );

    recording.managerRemark =
      managerRemark;

    recording.managerRemarkBy =
      req.user?.fullName ||
      req.user?.name ||
      'Sales Manager';

    recording.managerRemarkAt =
      new Date();

    await recording.save();

    await auditEvidenceSuccess(
      req,

      {
        actionType:
          'CALL_RECORDING_UPDATED',

        entityType:
          'CALL_RECORDING',

        entityId:
          String(
            recording._id
          ),

        leadId:
          recording.leadId
            ? String(
                recording.leadId
              )
            : null,

        recordingId:
          String(
            recording._id
          ),

        evidenceType:
          'CALL_RECORDING',

        operation:
          'UPDATE_MANAGER_REMARK',
      }
    );

    return ok(
      res,

      {
        recording,
      },

      'Manager remark updated successfully',
      200,
      req
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// LOI UPLOAD
// ============================================================

async function uploadLOIDocument(
  req,
  res,
  next
) {
  try {
    const {
      id,
    } =
      req.params;

    const notes =
      cleanText(
        req.body.notes,
        2000
      );

    if (
      !req.file
    ) {
      return fail(
        res,
        400,
        'FILE_REQUIRED',
        'Please select an LOI document file to upload.'
      );
    }

    const lead =
      await Lead.findById(
        id
      );

    if (!lead) {
      removeUploadedFileQuietly(
        req.file
      );

      return fail(
        res,
        404,
        'NOT_FOUND',
        'Lead not found.'
      );
    }

    const evidenceAllowed =
      await hasLeadEvidenceAccess({
        user:
          req.user,

        lead,
      });

    if (
      !evidenceAllowed
    ) {
      removeUploadedFileQuietly(
        req.file
      );

      await auditEvidenceAccessDenied(
        req,

        {
          actionType:
            'LOI_DOCUMENT_ACCESS_DENIED',

          entityType:
            'LEAD',

          entityId:
            String(
              lead._id
            ),

          leadId:
            String(
              lead._id
            ),

          evidenceType:
            'LOI_DOCUMENT',

          operation:
            'UPLOAD',
        }
      );

      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied for this Lead evidence.'
      );
    }

    const loiObj = {
      path:
        getRelativePath(
          req.file.path
        ),

      originalName:
        req.file.originalname,

      mimeType:
        req.file.mimetype ||
        'application/pdf',

      size:
        req.file.size ||
        0,

      notes,

      uploadedBy:
        req.user?._id ||
        null,

      uploadedByName:
        req.user?.fullName ||
        req.user?.name ||
        'Sales Executive',

      createdAt:
        new Date(),

      driveFileId:
        '',

      driveWebViewLink:
        '',
    };

    try {
      const {
        uploadToGoogleDrive,
      } =
        require(
          '../../services/googleDrive.service'
        );

      const driveResult =
        await uploadToGoogleDrive(
          req.file.path,
          `LOI_${lead.leadCode}_${req.file.originalname}`,
          req.file.mimetype
        );

      if (
        driveResult &&
        driveResult.fileId
      ) {
        loiObj.driveFileId =
          driveResult.fileId;

        loiObj.driveWebViewLink =
          driveResult.webViewLink ||
          '';
      }

    } catch (error) {
      console.warn(
        '[LOI Upload] Google Drive upload notice:',
        error.message
      );
    }

    if (
      !lead.loiDocuments
    ) {
      lead.loiDocuments =
        [];
    }

    lead.loiDocuments.push(
      loiObj
    );

    /*
     * Uploading LOI is evidence only.
     *
     * It must not jump an opportunity directly to LOI_PO_PENDING
     * or skip CONTACTED / QUALIFIED / QUOTATION_SENT / NEGOTIATION.
     */
    await lead.save();

    await LeadActivity.create({
      leadId:
        lead._id,

      actionType:
        'LOI_UPLOADED',

      note:
        `LOI Document uploaded by ${req.user?.fullName || req.user?.name || 'Sales Executive'}: "${req.file.originalname}"${notes ? ` (Notes: ${notes})` : ''}`,

      actorId:
        req.user?._id ||
        null,

      metadata: {
        crmStatus:
          lead.crmStatus,

        operationalStage:
          lead.stage,
      },
    });

    await auditEvidenceSuccess(
      req,

      {
        actionType:
          'LOI_DOCUMENT_UPLOADED',

        entityType:
          'LEAD',

        entityId:
          String(
            lead._id
          ),

        leadId:
          String(
            lead._id
          ),

        evidenceType:
          'LOI_DOCUMENT',

        operation:
          'UPLOAD',

        metadata: {
          documentIndex:
            lead.loiDocuments.length -
            1,

          crmStatus:
            lead.crmStatus,

          driveCopyAvailable:
            Boolean(
              loiObj.driveFileId
            ),
        },
      }
    );

    return ok(
      res,

      {
        loiDocuments:
          lead.loiDocuments,

        lead:
          getLeadDisplay(
            lead,
            req.user
          ),
      },

      'LOI document uploaded and attached successfully',
      201,
      req
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// LOI STREAM
// ============================================================

async function streamLOIDocument(
  req,
  res,
  next
) {
  try {
    const {
      id,
      index,
    } =
      req.params;

    const documentIndex =
      Number(
        index
      );

    if (
      !Number.isInteger(
        documentIndex
      ) ||
      documentIndex <
        0
    ) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'LOI document not found at this index.'
      );
    }

    const lead =
      await Lead.findById(
        id
      );

    if (!lead) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Lead not found.'
      );
    }

    const allowed =
      await hasLeadEvidenceAccess({
        user:
          req.user,

        lead,
      });

    if (!allowed) {
      await auditEvidenceAccessDenied(
        req,

        {
          actionType:
            'LOI_DOCUMENT_ACCESS_DENIED',

          entityType:
            'LEAD',

          entityId:
            String(
              lead._id
            ),

          leadId:
            String(
              lead._id
            ),

          evidenceType:
            'LOI_DOCUMENT',

          operation:
            'STREAM',
        }
      );

      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied for this Lead evidence.'
      );
    }

    const loiDoc =
      lead.loiDocuments?.[
        documentIndex
      ];

    if (
      !loiDoc ||
      !loiDoc.path
    ) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'LOI document not found at this index.'
      );
    }

    const filePath =
      resolveUploadPath(
        loiDoc.path,
        'loi_documents'
      );

    if (
      filePath &&
      fs.existsSync(
        filePath
      )
    ) {
      const absPath =
        path.resolve(
          filePath
        );

      const ext =
        path
          .extname(
            absPath
          )
          .toLowerCase();

      let mimeType =
        loiDoc.mimeType;

      if (
        !mimeType ||
        mimeType ===
          'application/octet-stream'
      ) {
        if (
          ext === '.pdf'
        ) {
          mimeType =
            'application/pdf';

        } else if (
          ext === '.png'
        ) {
          mimeType =
            'image/png';

        } else if (
          ext === '.jpg' ||
          ext === '.jpeg'
        ) {
          mimeType =
            'image/jpeg';

        } else if (
          ext === '.docx'
        ) {
          mimeType =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        } else if (
          ext === '.doc'
        ) {
          mimeType =
            'application/msword';

        } else {
          mimeType =
            'application/pdf';
        }
      }

      res.setHeader(
        'Content-Type',
        mimeType
      );

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(
          loiDoc.originalName ||
          'loi-document'
        )}"`
      );

      res.setHeader(
        'Cross-Origin-Resource-Policy',
        'same-site'
      );

      await auditEvidenceSuccess(
        req,

        {
          actionType:
            'LOI_DOCUMENT_VIEWED',

          entityType:
            'LEAD',

          entityId:
            String(
              lead._id
            ),

          leadId:
            String(
              lead._id
            ),

          evidenceType:
            'LOI_DOCUMENT',

          operation:
            'STREAM',

          metadata: {
            documentIndex,

            storageSource:
              'LOCAL',
          },
        }
      );

      return res.sendFile(
        absPath
      );
    }

    if (
      loiDoc.driveFileId
    ) {
      try {
        const {
          getDriveFileStream,
        } =
          require(
            '../../services/googleDrive.service'
          );

        const driveStream =
          await getDriveFileStream(
            loiDoc.driveFileId
          );

        if (
          driveStream
        ) {
          res.setHeader(
            'Content-Type',
            loiDoc.mimeType ||
            'application/pdf'
          );

          res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(
              loiDoc.originalName ||
              'loi-document'
            )}"`
          );

          res.setHeader(
            'Cross-Origin-Resource-Policy',
            'same-site'
          );

          await auditEvidenceSuccess(
            req,

            {
              actionType:
                'LOI_DOCUMENT_VIEWED',

              entityType:
                'LEAD',

              entityId:
                String(
                  lead._id
                ),

              leadId:
                String(
                  lead._id
                ),

              evidenceType:
                'LOI_DOCUMENT',

              operation:
                'STREAM',

              metadata: {
                documentIndex,

                storageSource:
                  'GOOGLE_DRIVE',
              },
            }
          );

          return driveStream.pipe(
            res
          );
        }

      } catch (driveStreamErr) {
        console.warn(
          '[LOIDoc] Drive stream error:',
          driveStreamErr.message
        );
      }
    }

    /*
     * Never redirect directly to a persistent Google Drive URL.
     * Authenticated backend streaming remains the authorization boundary.
     */
    return fail(
      res,
      404,
      'FILE_NOT_FOUND',
      'LOI document file not found on disk or Drive.'
    );

  } catch (error) {
    next(
      error
    );
  }
}


// ============================================================
// CALL RECORDING STATUS
// ============================================================

async function updateCallRecordingStatus(
  req,
  res,
  next
) {
  try {
    const {
      recordingId,
    } =
      req.params;

    if (
      !recordingId ||
      !mongoose.isValidObjectId(
        recordingId
      )
    ) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Invalid call recording ID.'
      );
    }

    const targetStatus =
      cleanText(
        req.body?.status,
        40
      ).toUpperCase();

    if (
      ![
        'PENDING',
        'COMPLETED',
      ].includes(
        targetStatus
      )
    ) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'status must be PENDING or COMPLETED.'
      );
    }

    const recording =
      await CallRecording.findById(
        recordingId
      );

    if (!recording) {
      return fail(
        res,
        404,
        'NOT_FOUND',
        'Call recording not found.'
      );
    }

    const lead =
      recording.leadId
        ? await Lead.findById(
            recording.leadId
          )
        : null;

    const allowed =
      await hasCallRecordingAccess({
        user:
          req.user,

        recording,

        lead,
      });

    if (!allowed) {
      await auditEvidenceAccessDenied(
        req,

        {
          actionType:
            'CALL_RECORDING_ACCESS_DENIED',

          entityType:
            'CALL_RECORDING',

          entityId:
            String(
              recording._id
            ),

          leadId:
            lead?._id
              ? String(
                  lead._id
                )
              : null,

          recordingId:
            String(
              recording._id
            ),

          evidenceType:
            'CALL_RECORDING',

          operation:
            'UPDATE_STATUS',
        }
      );

      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Access denied for this call recording.'
      );
    }

    recording.status =
      targetStatus;

    recording.completedBy =
      targetStatus ===
        'COMPLETED'
        ? (
            req.user?.fullName ||
            req.user?.name ||
            'User'
          )
        : '';

    recording.completedAt =
      targetStatus ===
        'COMPLETED'
        ? new Date()
        : null;

    await recording.save();

    await auditEvidenceSuccess(
      req,

      {
        actionType:
          'CALL_RECORDING_UPDATED',

        entityType:
          'CALL_RECORDING',

        entityId:
          String(
            recording._id
          ),

        leadId:
          lead?._id
            ? String(
                lead._id
              )
            : null,

        recordingId:
          String(
            recording._id
          ),

        evidenceType:
          'CALL_RECORDING',

        operation:
          'UPDATE_STATUS',

        metadata: {
          status:
            targetStatus,
        },
      }
    );

    /*
     * IMPORTANT:
     *
     * Completing a call recording review does NOT mean:
     * - buyer contacted;
     * - requirement captured;
     * - Lead qualified.
     *
     * Those business facts must be recorded through explicit
     * CRM lifecycle/activity actions.
     */

    return ok(
      res,

      {
        recording,
      },

      `Follow-up status updated to ${targetStatus}`,
      200,
      req
    );

  } catch (error) {
    next(
      error
    );
  }
}


async function logCallOutcome(req, res, next) {
  try {
    const { id } = req.params;
    const { callOutcome, notes, remarks, nextFollowupAt } = req.body;

    let lead = null;
    if (mongoose.isValidObjectId(id)) {
      lead = await Lead.findById(id);
    }
    if (!lead) {
      lead = await Lead.findOne({ $or: [{ leadCode: id }, { leadId: id }] });
    }

    if (!lead) {
      return fail(res, 'Lead not found.', 404, req);
    }

    if (!canAccessLead(req.user, lead)) {
      return fail(res, 'Access denied.', 403, req);
    }

    const outcomeUpper = String(callOutcome || 'CONNECTED').toUpperCase().trim();
    const noteText = cleanText(notes || remarks || `Call outcome recorded: ${outcomeUpper}`, 1000);
    const actorName = req.user?.fullName || req.user?.name || req.user?.email || 'Sales Executive';
    const actorRole = req.user?.role || 'SALES_EXECUTIVE';

    const updates = {
      lastCallOutcome: outcomeUpper,
      lastCallAt: new Date(),
      lastCallBy: req.user?._id,
      lastCallByName: actorName,
      $inc: { callCount: 1 }
    };

    if (noteText) {
      updates.chatSummary = noteText;
      updates.remarks = noteText;
    }

    let parsedNextFollowup = null;
    if (nextFollowupAt) {
      const d = new Date(nextFollowupAt);
      if (!isNaN(d.getTime())) {
        parsedNextFollowup = d;
        updates.nextFollowupAt = d;
      }
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      lead._id,
      updates,
      { new: true }
    );

    const communicationOutcome = (outcomeUpper === 'CONNECTED') ? 'CONTACTED' : 'ATTEMPTED';
    await advanceLeadForCommunication({
      lead: updatedLead,
      outcome: communicationOutcome,
      actorId: req.user?._id,
      note: noteText,
      nextFollowupAt: parsedNextFollowup
    });

    const activity = await LeadActivity.create({
      leadId: lead._id,
      actionType: 'CALL_LOGGED',
      note: `Call Outcome: [${outcomeUpper}] - ${noteText}`,
      nextFollowupAt: parsedNextFollowup,
      actorId: req.user?._id,
      metadata: {
        callOutcome: outcomeUpper,
        performedByName: actorName,
        performedByRole: actorRole,
        notes: noteText
      }
    });

    try {
      const { emitEvent } = require('../../services/socket.service');
      emitEvent('lead_updated', { action: 'call_logged', leadId: lead._id, callOutcome: outcomeUpper });
    } catch (e) { }

    return ok(
      res,
      {
        lead: getLeadDisplay(updatedLead, req.user),
        activity
      },
      'Call outcome logged successfully',
      200,
      req
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createManualLead,
  getDueReminders,
  uploadVoiceNote,
  streamVoiceNote,
  addActivity,
  logWhatsAppActivity,
  logEmailActivity,
  logCallOutcome,
  getSalesMetrics,
  uploadCallRecording,
  getCallRecordings,
  streamCallRecording,
  updateCallRecordingRemark,
  updateCallRecordingStatus,
  uploadLOIDocument,
  streamLOIDocument,
};