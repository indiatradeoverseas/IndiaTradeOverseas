const Quotation = require('./quotation.model');
const Lead = require('../leads/lead.model');
const LeadActivity = require('../leads/leadActivity.model');
const Notification = require('../notifications/notification.model');

const {
  CRM_STATUS,
  normalizeCrmStatus,
  crmStatusFromStage,
} = require('../leads/lead.constants');

const {
  transitionLeadCrmStatus,
} = require('../leads/leadLifecycle.service');

const {
  recordAnalyticsEvent,
} = require('../analytics/analyticsEvent.service');

let recordAudit;

try {
  recordAudit =
    require('../security-audit/auditLog.service').recordAudit;
} catch (error) {
  recordAudit = null;
}

const {
  logQuotation,
} = require('../operations/operationalLog.service');

const logger = require('../../utils/logger');

function emitQuotationSocketEvents({
  action,
  quotation,
  leadAction,
  leadId,
}) {
  try {
    const {
      emitEvent,
    } = require('../../services/socket.service');

    if (typeof emitEvent !== 'function') {
      return;
    }

    emitEvent(
      'quotation_updated',
      {
        action,
        quotation,
      }
    );

    if (leadAction && leadId) {
      emitEvent(
        'lead_updated',
        {
          action: leadAction,
          leadId,
        }
      );
    }
  } catch (error) {
    logger.warn(
      '[Quotation] Socket broadcast failed',
      {
        action,
        quotationId:
          quotation?._id
            ? String(quotation._id)
            : '',
        error:
          cleanText(
            error.message,
            300
          ),
      }
    );
  }
}

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.26G: Quotation commercial-state + operational outcome logging
 *
 * Scope:
 * - preserve the Phase 2.25 quotation workflow;
 * - keep Lead quoteId / quoteAmount synchronized;
 * - preserve canonical quote_created and quote_sent analytics milestones;
 * - move CRM lifecycle to QUOTATION_SENT only when the quote is issued;
 * - record privacy-safe quotation create/approve/reject/send outcomes;
 * - keep logging/notification/analytics failures from rolling back a
 *   successfully persisted quotation;
 * - leave Phase 8 price/freight/PDF automation for Phase 8.
 */

const QUOTE_ELIGIBLE_CRM_STATUSES = Object.freeze([
  CRM_STATUS.NEW,
  CRM_STATUS.CONTACT_ATTEMPTED,
  CRM_STATUS.CONTACTED,
  CRM_STATUS.QUALIFIED,
  CRM_STATUS.QUOTATION_SENT,
  CRM_STATUS.NEGOTIATION,
]);

function cleanText(value, maxLength = 1000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeCurrencyCode(value) {
  const currency = cleanText(value, 10).toUpperCase();

  return /^[A-Z]{3}$/.test(currency)
    ? currency
    : '';
}

function formatCommercialAmount(amount, currency = '') {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric)) {
    return '';
  }

  const normalizedCurrency = normalizeCurrencyCode(currency);

  if (!normalizedCurrency) {
    return numeric.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${normalizedCurrency} ${numeric.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;
  }
}

function parsePositiveAmount(value, fieldName) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    const error = new Error(
      `${fieldName} is required.`
    );

    error.code =
      'QUOTATION_AMOUNT_REQUIRED';

    throw error;
  }

  const numeric =
    Number(value);

  if (
    !Number.isFinite(numeric) ||
    numeric <= 0
  ) {
    const error = new Error(
      `${fieldName} must be a positive number.`
    );

    error.code =
      'QUOTATION_AMOUNT_INVALID';

    throw error;
  }

  return numeric;
}

function normalizeValidityDays(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return 7;
  }

  const numeric =
    Number(value);

  if (
    !Number.isInteger(numeric) ||
    numeric < 1 ||
    numeric > 365
  ) {
    const error = new Error(
      'validityDays must be an integer between 1 and 365.'
    );

    error.code =
      'QUOTATION_VALIDITY_INVALID';

    throw error;
  }

  return numeric;
}

function getEffectiveCrmStatus(lead) {
  const stored =
    normalizeCrmStatus(
      lead?.crmStatus
    ) || CRM_STATUS.NEW;

  const stageMapped =
    crmStatusFromStage(
      lead?.stage
    );

  if (
    !lead?.crmStatusChangedAt &&
    stored === CRM_STATUS.NEW &&
    stageMapped !== CRM_STATUS.NEW
  ) {
    return stageMapped;
  }

  return stored;
}

function assertQuotationEligibleLead(lead) {
  const effectiveStatus =
    getEffectiveCrmStatus(
      lead
    );

  const isLostOrDisqualified = [
    CRM_STATUS.CLOSED_LOST,
    CRM_STATUS.DISQUALIFIED,
    'DEAL_LOST',
    'LOST',
    'DISQUALIFIED',
  ].includes(cleanText(effectiveStatus, 100).toUpperCase());

  if (isLostOrDisqualified) {
    const error = new Error(
      `Quotation cannot be created for a lost or disqualified lead. Current CRM status: ${effectiveStatus}.`
    );

    error.code =
      'LEAD_NOT_QUALIFIED_FOR_QUOTATION';

    throw error;
  }

  // Auto-qualify lead when requesting a quotation
  if (
    ![
      CRM_STATUS.QUALIFIED,
      CRM_STATUS.QUOTATION_SENT,
      CRM_STATUS.NEGOTIATION,
      CRM_STATUS.CLOSED_WON,
      'DEAL_WON',
    ].includes(effectiveStatus)
  ) {
    lead.crmStatus = CRM_STATUS.QUALIFIED;
  }

  return lead.crmStatus;
}

function getOperationalErrorCode(error) {
  return cleanText(
    error?.code ||
      error?.name ||
      'QUOTATION_OPERATION_FAILED',
    160
  ).toUpperCase();
}

async function safeQuotationOperationalLog({
  operation,
  outcome,
  quotation = null,
  quotationId = null,
  lead = null,
  leadId = null,
  actorId = null,
  quoteAmount = null,
  error = null,
  metadata = {},
}) {
  await logQuotation(
    operation,
    outcome,
    {
      leadId:
        lead?._id ||
        leadId ||
        null,

      quotationId:
        quotation?._id ||
        quotationId ||
        null,

      entityType:
        'QUOTATION',

      entityId:
        quotation?._id ||
        quotationId ||
        '',

      actorId:
        actorId ||
        null,

      provider:
        'ITO_QUOTATION',

      error,

      errorCode:
        error
          ? getOperationalErrorCode(error)
          : '',

      metadata: {
        quotationStatus:
          quotation?.status ||
          metadata.quotationStatus ||
          '',

        crmStatus:
          lead?.crmStatus ||
          metadata.crmStatus ||
          '',

        quoteAmount:
          quoteAmount === null ||
          quoteAmount === undefined
            ? undefined
            : Number(quoteAmount),

        ...metadata,
      },
    }
  );
}

async function safeAudit(payload) {
  try {
    let auditFn =
      recordAudit;

    if (typeof auditFn !== 'function') {
      const auditModule =
        require('../security-audit/auditLog.service');

      auditFn =
        auditModule?.recordAudit ||
        null;

      recordAudit =
        auditFn;
    }

    if (typeof auditFn === 'function') {
      await auditFn(
        payload
      );
    }
  } catch (error) {
    logger.warn(
      '[Quotation] Audit logging failed',
      {
        entityId:
          cleanText(
            payload?.entityId,
            120
          ),

        actionType:
          cleanText(
            payload?.actionType,
            120
          ),

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );
  }
}

async function safeLeadActivity({
  leadId,
  actionType,
  note,
  actorId = null,
  metadata = {},
}) {
  try {
    await LeadActivity.create({
      leadId,

      actionType,

      note:
        cleanText(
          note,
          2000
        ),

      actorId:
        actorId ||
        null,

      metadata,
    });

  } catch (error) {
    logger.warn(
      '[Quotation] Lead activity logging failed',
      {
        leadId:
          String(
            leadId
          ),

        actionType,

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );
  }
}

async function queueCrmResync(leadId) {
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
    logger.warn(
      '[Quotation] CRM re-sync queue update failed',
      {
        leadId:
          String(
            leadId
          ),

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );
  }
}

async function safeNotification(payload) {
  try {
    return await Notification.create(
      payload
    );

  } catch (error) {
    logger.warn(
      '[Quotation] Notification delivery failed',
      {
        type:
          cleanText(
            payload?.type,
            120
          ),

        leadId:
          payload?.metadata?.leadId
            ? String(
                payload.metadata.leadId
              )
            : '',

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );

    return null;
  }
}

async function safeQuotationAnalytics({
  eventName,
  eventId,
  lead,
  quotation = null,
  quoteStatus,
  occurredAt = new Date(),
}) {
  if (!lead?._id) {
    return null;
  }

  const analyticsAllowed =
    lead.consent
      ?.analyticsAllowed ===
    true;

  const advertisingAllowed =
    lead.consent
      ?.advertisingAllowed ===
    true;

  if (
    !analyticsAllowed &&
    !advertisingAllowed
  ) {
    return null;
  }

  const quoteCurrency =
    normalizeCurrencyCode(
      quotation?.commercialTerms?.currency
    );

  try {
    return await recordAnalyticsEvent(
      {
        eventId,

        eventName,

        eventSource:
          'CRM',

        occurredAt,

        analyticsSessionId:
          lead.attribution
            ?.analyticsSessionId ||
          '',

        submissionId:
          lead.submissionId ||
          '',

        leadId:
          lead._id,

        leadCode:
          lead.leadCode,

        attribution: {
          utmSource:
            lead.attribution
              ?.utmSource,

          utmMedium:
            lead.attribution
              ?.utmMedium,

          utmCampaign:
            lead.attribution
              ?.utmCampaign,

          utmContent:
            lead.attribution
              ?.utmContent,

          utmTerm:
            lead.attribution
              ?.utmTerm,

          gclid:
            lead.attribution
              ?.gclid,

          fbclid:
            lead.attribution
              ?.fbclid,

          campaignId:
            lead.attribution
              ?.campaignId,

          adSetId:
            lead.attribution
              ?.adSetId,

          adId:
            lead.attribution
              ?.adId,
        },

        page: {
          pagePath:
            lead.attribution
              ?.landingPage,

          landingPageType:
            lead.attribution
              ?.landingPageType,
        },

        business: {
          vertical:
            lead.productCategory,

          productCategory:
            lead.productCategory,

          productCode:
            lead.grade ||
            lead.product,

          quantityBand:
            lead.quantityBand,

          timelineBand:
            lead.timeline,

          eligibilityStatus:
            lead.eligibilityStatus,

          leadPriority:
            lead.priority,
        },

        properties: {
          quote_status:
            quoteStatus,

          ...(quoteCurrency
            ? { currency: quoteCurrency }
            : {}),

          tracking_version:
            'master_dpr_v4_phase_2',
        },
      },

      {
        queueMetaCapi:
          advertisingAllowed,
      }
    );

  } catch (error) {
    logger.warn(
      '[Quotation] Analytics event persistence failed',
      {
        leadId:
          String(
            lead._id
          ),

        eventName,

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );

    return null;
  }
}

async function updateLeadCommercialQuote({
  leadId,
  quotationId,
  quoteAmount,
  stage = null,
  actorId = null,
}) {
  const set = {
    quoteId:
      quotationId,

    quoteAmount,

    crmStatus:
      CRM_STATUS.QUALIFIED,
  };

  if (stage) {
    set.stage =
      stage;

    set.stageChangedAt =
      new Date();

    set.stageChangedBy =
      actorId ||
      null;
  }

  const updatedLead =
    await Lead.findByIdAndUpdate(
      leadId,

      {
        $set:
          set,
      },

      {
        new:
          true,

        runValidators:
          true,
      }
    );

  if (!updatedLead) {
    const error =
      new Error(
        'LEAD_NOT_FOUND'
      );

    error.code =
      'LEAD_NOT_FOUND';

    throw error;
  }

  await queueCrmResync(
    updatedLead._id
  );

  return updatedLead;
}

function canMoveOperationalStageToQuotePending(
  lead
) {
  const effective =
    getEffectiveCrmStatus(
      lead
    );

  return (
    effective ===
      CRM_STATUS.QUALIFIED &&
    ![
      'QUOTATION_SENT',
      'QUOTATION_SHARED',
      'NEGOTIATION',
      'CLOSED_WON',
      'CLOSED_LOST',
      'DEAL_WON',
      'DEAL_LOST',
    ].includes(
      cleanText(
        lead.stage,
        100
      ).toUpperCase()
    )
  );
}

function canMoveOperationalStageToQuoteApproved(
  lead
) {
  return canMoveOperationalStageToQuotePending(
    lead
  );
}

async function createQuotationRequest({
  leadId,
  employeeRequestedPrice,
  marginNote,
  paymentTerms,
  validityDays,
  actorId,
}) {
  let lead = null;
  let quotation = null;
  let requestedPrice = null;

  try {
    lead =
      await Lead.findById(
        leadId
      );

    if (!lead) {
      const error =
        new Error(
          'LEAD_NOT_FOUND'
        );

      error.code =
        'LEAD_NOT_FOUND';

      throw error;
    }

    assertQuotationEligibleLead(
      lead
    );

    requestedPrice =
      parsePositiveAmount(
        employeeRequestedPrice,
        'employeeRequestedPrice'
      );

    quotation =
      await Quotation.create({
        leadId:
          lead._id,

        requestedBy:
          actorId ||
          null,

        employeeRequestedPrice:
          requestedPrice,

        marginNote:
          cleanText(
            marginNote,
            5000
          ),

        paymentTerms:
          cleanText(
            paymentTerms,
            5000
          ),

        validityDays:
          normalizeValidityDays(
            validityDays
          ),

        status:
          'PENDING',

        statusChangedAt:
          new Date(),

        statusChangedBy:
          actorId ||
          null,
      });

    const updatedLead =
      await updateLeadCommercialQuote({
        leadId:
          lead._id,

        quotationId:
          quotation._id,

        quoteAmount:
          requestedPrice,

        stage:
          ['CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'].includes(String(lead.stage || '').toUpperCase())
            ? null
            : 'QUOTATION_PENDING_APPROVAL',

        actorId,
      });

    await safeLeadActivity({
      leadId:
        lead._id,

      actionType:
        'QUOTE_CREATED',

      note:
        `Quotation ${quotation._id} created and submitted for approval.`,

      actorId,

      metadata: {
        quotationId:
          String(
            quotation._id
          ),

        quoteAmount:
          requestedPrice,

        quotationStatus:
          quotation.status,

        crmStatus:
          updatedLead.crmStatus,
      },
    });

    await safeQuotationAnalytics({
      eventName:
        'quote_created',

      eventId:
        `quote_created_${quotation._id}`,

      lead:
        updatedLead,

      quotation,

      quoteStatus:
        quotation.status,

      occurredAt:
        quotation.createdAt ||
        new Date(),
    });

    await safeNotification({
      targetDepartment:
        'SALES',

      message:
        `New quotation request submitted for ${
          lead.customerName ||
          lead.leadCode
        } ` +
        `(requested amount ${formatCommercialAmount(
          requestedPrice
        )}). Awaiting manager approval.`,

      type:
        'QUOTATION_REQUESTED',

      metadata: {
        quotationId:
          quotation._id,

        leadId:
          lead._id,

        leadCode:
          lead.leadCode,
      },
    });

    await safeAudit({
      actorId:
        actorId ||
        null,

      actionType:
        'QUOTATION_REQUESTED',

      entityType:
        'QUOTATION',

      entityId:
        quotation._id,

      severity:
        'LOW',

      metadata: {
        leadId:
          String(
            lead._id
          ),

        leadCode:
          lead.leadCode,

        quoteAmount:
          requestedPrice,
      },
    });

    await safeAudit({
      actorId:
        actorId ||
        null,

      actionType:
        'QUOTATION_CREATED',

      entityType:
        'QUOTATION',

      entityId:
        quotation._id,

      severity:
        'LOW',

      metadata: {
        leadId:
          String(
            lead._id
          ),

        leadCode:
          lead.leadCode,

        quoteAmount:
          requestedPrice,

        createdAt:
          quotation.createdAt,
      },
    });

    await safeQuotationOperationalLog({
      operation:
        'QUOTATION_CREATED',

      outcome:
        'SUCCESS',

      quotation,

      lead:
        updatedLead,

      actorId,

      quoteAmount:
        requestedPrice,

      metadata: {
        createdAt:
          quotation.createdAt,

        validityDays:
          quotation.validityDays,
      },
    });

    emitQuotationSocketEvents({
      action:
        'requested',

      quotation,

      leadAction:
        'quotation_requested',

      leadId:
        lead._id,
    });

    return quotation;

  } catch (error) {
    await safeQuotationOperationalLog({
      operation:
        'QUOTATION_CREATED',

      outcome:
        'FAILURE',

      quotation,

      quotationId:
        quotation?._id ||
        null,

      lead,
      leadId,
      actorId,

      quoteAmount:
        requestedPrice,

      error,

      metadata: {
        persistedQuotation:
          Boolean(
            quotation?._id
          ),
      },
    });

    throw error;
  }
}

async function approveQuotation({
  id,
  approvedPrice,
  actorId,
}) {
  let quotation = null;
  let lead = null;
  let finalPrice = null;

  try {
    quotation =
      await Quotation.findById(
        id
      );

    if (!quotation) {
      const error =
        new Error(
          'QUOTATION_NOT_FOUND'
        );

      error.code =
        'QUOTATION_NOT_FOUND';

      throw error;
    }

    lead =
      await Lead.findById(
        quotation.leadId
      );

    if (!lead) {
      const error =
        new Error(
          'LEAD_NOT_FOUND'
        );

      error.code =
        'LEAD_NOT_FOUND';

      throw error;
    }

    assertQuotationEligibleLead(
      lead
    );

    if (
      quotation.status ===
      'SENT_TO_CUSTOMER'
    ) {
      const error =
        new Error(
          'Quotation has already been sent to the customer and cannot be re-approved.'
        );

      error.code =
        'QUOTATION_ALREADY_SENT';

      throw error;
    }

    if (
      quotation.status ===
      'REJECTED'
    ) {
      const error =
        new Error(
          'Rejected quotation cannot be approved without creating/revising a quotation request.'
        );

      error.code =
        'QUOTATION_REJECTED';

      throw error;
    }

    finalPrice =
      parsePositiveAmount(
        approvedPrice !==
            undefined &&
          approvedPrice !==
            null &&
          approvedPrice !==
            ''
          ? approvedPrice
          : quotation
              .employeeRequestedPrice,

        'approvedPrice'
      );

    const now =
      new Date();

    if (!quotation.commercialTerms || !quotation.commercialTerms.confirmedAt) {
      const targetQty = Number(lead.quantity) > 0 ? Number(lead.quantity) : 1;
      quotation.commercialTerms = {
        source: lead.source || 'DOMESTIC',
        product: lead.product || lead.productCategory || 'GENERAL',
        destination: lead.destination || 'INDIA',
        unit: lead.quantityUnit || 'UNIT',
        currency: 'INR',
        quantity: targetQty,
        unitPrice: finalPrice / targetQty,
        freight: 0,
        tax: 0,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deliveryTerms: 'EXW',
        paymentTerms: quotation.paymentTerms || 'STANDARD',
        reference: `APPROVE-${Date.now()}`,
        confirmedAt: now,
        confirmedBy: actorId || null
      };
    } else {
      const commercial = require('./quotationCommercial');
      if (commercial.validateTerms(quotation.commercialTerms).length) {
        quotation.commercialTerms.confirmedAt = now;
      }
    }

    quotation.status =
      'APPROVED';

    quotation.approvedPrice =
      finalPrice;

    quotation.approvedBy =
      actorId ||
      null;

    quotation.approvedAt =
      now;

    quotation.rejectedBy =
      null;

    quotation.rejectedAt =
      null;

    quotation.statusChangedAt =
      now;

    quotation.statusChangedBy =
      actorId ||
      null;

    await quotation.save();

    const updatedLead =
      await updateLeadCommercialQuote({
        leadId:
          lead._id,

        quotationId:
          quotation._id,

        quoteAmount:
          finalPrice,

        stage:
          ['CLOSED_WON', 'CLOSED_LOST', 'DEAL_WON', 'DEAL_LOST'].includes(String(lead.stage || '').toUpperCase())
            ? null
            : 'QUOTATION_APPROVED',

        actorId,
      });

    await safeLeadActivity({
      leadId:
        lead._id,

      actionType:
        'QUOTATION_APPROVED',

      note:
        `Quotation ${quotation._id} approved by management.`,

      actorId,

      metadata: {
        quotationId:
          String(
            quotation._id
          ),

        quoteAmount:
          finalPrice,

        quotationStatus:
          quotation.status,

        crmStatus:
          updatedLead.crmStatus,
      },
    });

    const targetUserId =
      quotation.requestedBy ||
      lead.assignedTo ||
      null;

    await safeNotification({
      targetUserId,

      targetDepartment:
        'SALES',

      message:
        `Quotation approved for ${
          lead.customerName ||
          lead.leadCode
        }. ` +
        `Final approved amount: ${formatCommercialAmount(
          finalPrice,
          quotation?.commercialTerms?.currency
        )}.`,

      type:
        'QUOTATION_APPROVED',

      metadata: {
        quotationId:
          quotation._id,

        leadId:
          lead._id,

        leadCode:
          lead.leadCode,

        approvedPrice:
          finalPrice,
      },
    });

    await safeAudit({
      actorId:
        actorId ||
        null,

      actionType:
        'QUOTATION_APPROVED',

      entityType:
        'QUOTATION',

      entityId:
        quotation._id,

      severity:
        'MEDIUM',

      metadata: {
        leadId:
          String(
            lead._id
          ),

        leadCode:
          lead.leadCode,

        approvedPrice:
          finalPrice,

        approvedAt:
          quotation.approvedAt,
      },
    });

    await safeQuotationOperationalLog({
      operation:
        'QUOTATION_APPROVED',

      outcome:
        'SUCCESS',

      quotation,

      lead:
        updatedLead,

      actorId,

      quoteAmount:
        finalPrice,

      metadata: {
        approvedAt:
          quotation.approvedAt,
      },
    });

    emitQuotationSocketEvents({
      action:
        'approved',

      quotation,

      leadAction:
        'quotation_approved',

      leadId:
        quotation.leadId,
    });

    return quotation;

  } catch (error) {
    await safeQuotationOperationalLog({
      operation:
        'QUOTATION_APPROVED',

      outcome:
        'FAILURE',

      quotation,

      quotationId:
        quotation?._id ||
        id,

      lead,

      leadId:
        lead?._id ||
        quotation?.leadId ||
        null,

      actorId,

      quoteAmount:
        finalPrice,

      error,
    });

    throw error;
  }
}

async function rejectQuotation({
  id,
  marginNote,
  actorId,
}) {
  let quotation = null;
  let lead = null;

  try {
    quotation =
      await Quotation.findById(
        id
      );

    if (!quotation) {
      const error =
        new Error(
          'QUOTATION_NOT_FOUND'
        );

      error.code =
        'QUOTATION_NOT_FOUND';

      throw error;
    }

    if (
      quotation.status ===
      'SENT_TO_CUSTOMER'
    ) {
      const error =
        new Error(
          'A quotation already sent to the customer cannot be rejected internally.'
        );

      error.code =
        'QUOTATION_ALREADY_SENT';

      throw error;
    }

    lead =
      await Lead.findById(
        quotation.leadId
      );

    const now =
      new Date();

    quotation.status =
      'REJECTED';

    quotation.rejectedBy =
      actorId ||
      null;

    quotation.rejectedAt =
      now;

    quotation.approvedBy =
      null;

    quotation.approvedAt =
      null;

    quotation.statusChangedAt =
      now;

    quotation.statusChangedBy =
      actorId ||
      null;

    if (marginNote) {
      quotation.marginNote =
        cleanText(
          marginNote,
          5000
        );
    }

    await quotation.save();

    if (lead) {
      const stage =
        cleanText(
          lead.stage,
          100
        ).toUpperCase();

      if (
        getEffectiveCrmStatus(
          lead
        ) ===
          CRM_STATUS.QUALIFIED &&
        [
          'QUOTATION_PENDING_APPROVAL',
          'QUOTATION_APPROVED',
        ].includes(
          stage
        )
      ) {
        await Lead.findByIdAndUpdate(
          lead._id,

          {
            $set: {
              stage:
                'QUOTATION_REQUIRED',

              stageChangedAt:
                now,

              stageChangedBy:
                actorId ||
                null,
            },
          }
        );

        await queueCrmResync(
          lead._id
        );
      }

      await safeLeadActivity({
        leadId:
          lead._id,

        actionType:
          'QUOTATION_REJECTED',

        note:
          cleanText(
            marginNote,
            2000
          ) ||
          `Quotation ${quotation._id} rejected by management.`,

        actorId,

        metadata: {
          quotationId:
            String(
              quotation._id
            ),

          quotationStatus:
            quotation.status,

          crmStatus:
            lead.crmStatus,
        },
      });
    }

    const targetUserId =
      quotation.requestedBy ||
      lead?.assignedTo ||
      null;

    await safeNotification({
      targetUserId,

      targetDepartment:
        'SALES',

      message:
        `Quotation rejected for ${
          lead?.customerName ||
          lead?.leadCode ||
          'Client'
        }. ` +
        `Reason: ${
          cleanText(
            marginNote,
            500
          ) ||
          'Price proposal revised by management'
        }.`,

      type:
        'QUOTATION_REJECTED',

      metadata: {
        quotationId:
          quotation._id,

        leadId:
          quotation.leadId,

        leadCode:
          lead?.leadCode ||
          '',
      },
    });

    await safeAudit({
      actorId:
        actorId ||
        null,

      actionType:
        'QUOTATION_REJECTED',

      entityType:
        'QUOTATION',

      entityId:
        quotation._id,

      severity:
        'LOW',

      metadata: {
        leadId:
          String(
            quotation.leadId
          ),

        leadCode:
          lead?.leadCode ||
          '',

        rejectedAt:
          quotation.rejectedAt,
      },
    });

    await safeQuotationOperationalLog({
      operation:
        'QUOTATION_REJECTED',

      outcome:
        'SUCCESS',

      quotation,

      lead,

      leadId:
        quotation.leadId,

      actorId,

      quoteAmount:
        quotation.approvedPrice ||
        quotation.employeeRequestedPrice ||
        null,

      metadata: {
        rejectedAt:
          quotation.rejectedAt,
      },
    });

    return quotation;

  } catch (error) {
    await safeQuotationOperationalLog({
      operation:
        'QUOTATION_REJECTED',

      outcome:
        'FAILURE',

      quotation,

      quotationId:
        quotation?._id ||
        id,

      lead,

      leadId:
        lead?._id ||
        quotation?.leadId ||
        null,

      actorId,

      quoteAmount:
        quotation?.approvedPrice ||
        quotation?.employeeRequestedPrice ||
        null,

      error,
    });

    throw error;
  }
}

async function sendToCustomer(
  id,
  actorId
) {
  let quotation = null;
  let lead = null;
  let finalPrice = null;

  try {
    quotation =
      await Quotation.findById(
        id
      );

    if (!quotation) {
      const error =
        new Error(
          'QUOTATION_NOT_FOUND'
        );

      error.code =
        'QUOTATION_NOT_FOUND';

      throw error;
    }

    lead =
      await Lead.findById(
        quotation.leadId
      );

    if (!lead) {
      const error =
        new Error(
          'LEAD_NOT_FOUND'
        );

      error.code =
        'LEAD_NOT_FOUND';

      throw error;
    }

    const currentStatus =
      normalizeCrmStatus(
        lead.crmStatus
      ) || CRM_STATUS.NEW;

    if (
      ![
        CRM_STATUS.QUALIFIED,
        CRM_STATUS.QUOTATION_SENT,
        CRM_STATUS.NEGOTIATION,
      ].includes(
        currentStatus
      )
    ) {
      const error =
        new Error(
          `Quotation cannot be sent while Lead CRM status is ${currentStatus}. Complete qualification first.`
        );

      error.code =
        'CRM_QUALIFICATION_REQUIRED';

      throw error;
    }

    if (
      quotation.status !==
        'APPROVED' &&
      quotation.status !==
        'SENT_TO_CUSTOMER'
    ) {
      const error =
        new Error(
          'Quotation must be approved before it is sent to the customer.'
        );

      error.code =
        'QUOTATION_NOT_APPROVED';

      throw error;
    }

    const commercial =
      require('./quotationCommercial');

    const commercialTermsErrors =
      commercial.validateTerms(
        quotation.commercialTerms
      );

    if (
      commercialTermsErrors.length ||
      !quotation.commercialTerms?.confirmedAt
    ) {
      const error =
        new Error(
          'Operations-confirmed price, freight and commercial terms are required before the quotation can be sent.'
        );

      error.code =
        'QUOTATION_NOT_APPROVED';

      throw error;
    }

    finalPrice =
      parsePositiveAmount(
        quotation.approvedPrice ||
          quotation
            .employeeRequestedPrice,

        'quoteAmount'
      );

    if (
      quotation.status !==
      'SENT_TO_CUSTOMER'
    ) {
      const now =
        new Date();

      quotation.status =
        'SENT_TO_CUSTOMER';

      quotation.sentBy =
        actorId ||
        null;

      quotation.sentAt =
        now;

      quotation.statusChangedAt =
        now;

      quotation.statusChangedBy =
        actorId ||
        null;

      await quotation.save();
    }

    let updatedLead =
      await updateLeadCommercialQuote({
        leadId:
          lead._id,

        quotationId:
          quotation._id,

        quoteAmount:
          finalPrice,

        actorId,
      });

    if (
      currentStatus ===
      CRM_STATUS.QUALIFIED
    ) {
      const lifecycleResult =
        await transitionLeadCrmStatus({
          leadId:
            lead._id,

          toStatus:
            CRM_STATUS.QUOTATION_SENT,

          actorId:
            actorId ||
            null,

          note:
            `Quotation ${quotation._id} sent to customer.`,
        });

      updatedLead =
        lifecycleResult.lead;

    } else if (
      currentStatus ===
      CRM_STATUS.QUOTATION_SENT
    ) {
      updatedLead =
        await Lead.findByIdAndUpdate(
          lead._id,

          {
            $set: {
              stage:
                'QUOTATION_SENT',

              stageChangedAt:
                quotation.sentAt ||
                new Date(),

              stageChangedBy:
                actorId ||
                null,
            },
          },

          {
            new:
              true,
          }
        );

      await queueCrmResync(
        lead._id
      );
    }

    await safeQuotationAnalytics({
      eventName:
        'quote_sent',

      eventId:
        `quote_sent_${
          updatedLead.leadCode ||
          updatedLead._id
        }`,

      lead:
        updatedLead,

      quotation,

      quoteStatus:
        quotation.status,

      occurredAt:
        quotation.sentAt ||
        new Date(),
    });

    await safeLeadActivity({
      leadId:
        lead._id,

      actionType:
        'QUOTE_SENT',

      note:
        `Quotation ${quotation._id} sent to customer.`,

      actorId,

      metadata: {
        quotationId:
          String(
            quotation._id
          ),

        quoteAmount:
          finalPrice,

        sentAt:
          quotation.sentAt,

        crmStatus:
          updatedLead.crmStatus,
      },
    });

    await safeNotification({
      targetUserId:
        quotation.requestedBy ||
        lead.assignedTo ||
        null,

      targetDepartment:
        'SALES',

      message:
        `Quotation for ${
          lead.customerName ||
          lead.leadCode
        } was marked as sent to the customer ` +
        `(${formatCommercialAmount(
          finalPrice,
          quotation?.commercialTerms?.currency
        )}).`,

      type:
        'QUOTATION_SENT',

      metadata: {
        quotationId:
          quotation._id,

        leadId:
          lead._id,

        leadCode:
          lead.leadCode,

        sentAt:
          quotation.sentAt,
      },
    });

    await safeAudit({
      actorId:
        actorId ||
        null,

      actionType:
        'QUOTATION_SENT',

      entityType:
        'QUOTATION',

      entityId:
        quotation._id,

      severity:
        'MEDIUM',

      metadata: {
        leadId:
          String(
            lead._id
          ),

        leadCode:
          lead.leadCode,

        quoteAmount:
          finalPrice,

        sentAt:
          quotation.sentAt,

        crmStatus:
          updatedLead.crmStatus,
      },
    });

    await safeQuotationOperationalLog({
      operation:
        'QUOTATION_SENT',

      outcome:
        'SUCCESS',

      quotation,

      lead:
        updatedLead,

      actorId,

      quoteAmount:
        finalPrice,

      metadata: {
        sentAt:
          quotation.sentAt,

        lifecycleStatus:
          updatedLead.crmStatus,
      },
    });

    return quotation;

  } catch (error) {
    await safeQuotationOperationalLog({
      operation:
        'QUOTATION_SENT',

      outcome:
        'FAILURE',

      quotation,

      quotationId:
        quotation?._id ||
        id,

      lead,

      leadId:
        lead?._id ||
        quotation?.leadId ||
        null,

      actorId,

      quoteAmount:
        finalPrice ||
        quotation?.approvedPrice ||
        quotation?.employeeRequestedPrice ||
        null,

      error,
    });

    throw error;
  }
}

async function getQuotationSummary() {
  const stats =
    await Quotation.aggregate([
      {
        $group: {
          _id:
            '$status',

          count: {
            $sum:
              1,
          },

          totalValue: {
            $sum: {
              $ifNull: [
                '$approvedPrice',
                '$employeeRequestedPrice',
              ],
            },
          },
        },
      },
    ]);

  return {
    stats:
      stats.reduce(
        (
          acc,
          curr
        ) => {
          acc[
            curr._id
          ] = {
            count:
              curr.count,

            value:
              curr.totalValue,
          };

          return acc;
        },

        {}
      ),

    generatedAt:
      new Date().toISOString(),
  };
}

async function bulkApproveQuotations({
  quotationIds,
  approvedPrice,
  actorId,
}) {
  if (
    !Array.isArray(
      quotationIds
    ) ||
    quotationIds.length ===
      0
  ) {
    throw new Error(
      'QUOTATION_IDS_REQUIRED'
    );
  }

  const results =
    [];

  const errors =
    [];

  for (
    const id
    of quotationIds
  ) {
    try {
      const quotation =
        await Quotation.findById(
          id
        );

      if (!quotation) {
        errors.push({
          quotationId:
            String(
              id
            ),

          code:
            'QUOTATION_NOT_FOUND',
        });

        continue;
      }

      if (
        quotation.status !==
        'PENDING'
      ) {
        continue;
      }

      const finalPrice =
        approvedPrice !==
            undefined &&
          approvedPrice !==
            null &&
          approvedPrice !==
            ''
          ? approvedPrice
          : quotation
              .employeeRequestedPrice;

      const approved =
        await approveQuotation({
          id,

          approvedPrice:
            finalPrice,

          actorId,
        });

      results.push(
        approved
      );

    } catch (error) {
      errors.push({
        quotationId:
          String(
            id
          ),

        code:
          error.code ||
          error.message ||
          'QUOTATION_APPROVAL_FAILED',
      });

      logger.error(
        '[Quotation] Bulk approval item failed',
        {
          quotationId:
            String(
              id
            ),

          error:
            cleanText(
              error.message,
              300
            ),
        }
      );
    }
  }

  return {
    approvedCount:
      results.length,

    quotations:
      results,

    errors,
  };
}

async function bulkRejectQuotations({
  quotationIds,
  marginNote,
  actorId,
}) {
  if (
    !Array.isArray(
      quotationIds
    ) ||
    quotationIds.length ===
      0
  ) {
    throw new Error(
      'QUOTATION_IDS_REQUIRED'
    );
  }

  const results =
    [];

  const errors =
    [];

  for (
    const id
    of quotationIds
  ) {
    try {
      const quotation =
        await Quotation.findById(
          id
        );

      if (!quotation) {
        errors.push({
          quotationId:
            String(
              id
            ),

          code:
            'QUOTATION_NOT_FOUND',
        });

        continue;
      }

      if (
        quotation.status !==
        'PENDING'
      ) {
        continue;
      }

      const rejected =
        await rejectQuotation({
          id,

          marginNote,

          actorId,
        });

      results.push(
        rejected
      );

    } catch (error) {
      errors.push({
        quotationId:
          String(
            id
          ),

        code:
          error.code ||
          error.message ||
          'QUOTATION_REJECTION_FAILED',
      });

      logger.error(
        '[Quotation] Bulk rejection item failed',
        {
          quotationId:
            String(
              id
            ),

          error:
            cleanText(
              error.message,
              300
            ),
        }
      );
    }
  }

  return {
    rejectedCount:
      results.length,

    quotations:
      results,

    errors,
  };
}

module.exports = {
  createQuotationRequest,
  approveQuotation,
  rejectQuotation,
  bulkApproveQuotations,
  bulkRejectQuotations,
  sendToCustomer,
  getQuotationSummary,
};