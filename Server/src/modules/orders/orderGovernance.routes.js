const router = require('express').Router();
const mongoose = require('mongoose');
const { authenticate } = require('../../middlewares/auth.middleware');
const { isManagement, department, actor } = require('../marketing/campaignGovernance');
const Order = require('./customerOrder.model');
const Lead = require('../leads/lead.model');
const { transitionLeadCrmStatus } = require('../leads/leadLifecycle.service');
const { recordAnalyticsEvent } = require('../analytics/analyticsEvent.service');
const logger = require('../../utils/logger');
const { ok, fail } = require('../../utils/response');
const { recordAudit } = require('../security-audit/auditLog.service');

router.use(authenticate);

async function recordDeliveredOrderAnalytics(order, lead) {
  if (!order?._id || !lead?._id) return;

  const analyticsAllowed = lead.consent?.analyticsAllowed === true;
  const advertisingAllowed = lead.consent?.advertisingAllowed === true;

  if (!analyticsAllowed && !advertisingAllowed) return;

  const eventNames = ['purchase'];

  if (lead.leadOrigin === 'REPEAT_ORDER') {
    eventNames.push('repeat_order');
  }

  for (const eventName of eventNames) {
    try {
      await recordAnalyticsEvent(
        {
          eventId: `${eventName}_${order._id}`,
          eventName,
          eventSource: 'SERVER',
          occurredAt: order.fulfillmentVerifiedAt || new Date(),
          analyticsSessionId: lead.attribution?.analyticsSessionId || '',
          submissionId: lead.submissionId || '',
          leadId: lead._id,
          leadCode: lead.leadCode,
          attribution: {
            utmSource: lead.attribution?.utmSource,
            utmMedium: lead.attribution?.utmMedium,
            utmCampaign: lead.attribution?.utmCampaign,
            utmContent: lead.attribution?.utmContent,
            utmTerm: lead.attribution?.utmTerm,
            gclid: lead.attribution?.gclid,
            fbclid: lead.attribution?.fbclid,
            campaignId: lead.attribution?.campaignId,
            adSetId: lead.attribution?.adSetId,
            adId: lead.attribution?.adId,
          },
          page: {
            pagePath: lead.attribution?.landingPage,
            landingPageType: lead.attribution?.landingPageType,
          },
          business: {
            vertical: lead.productCategory,
            productCategory: lead.productCategory,
            productCode: lead.grade || lead.product,
            quantityBand: lead.quantityBand,
            timelineBand: lead.timeline,
            eligibilityStatus: lead.eligibilityStatus,
            leadPriority: lead.priority,
          },
          properties: {
            tracking_version: 'master_dpr_v4_phase_9',
            order_status: order.status,
            payment_status: order.paymentStatus,
            currency: order.currency || '',
          },
        },
        {
          queueMetaCapi: advertisingAllowed,
        }
      );
    } catch (error) {
      // Order/CRM persistence must never be rolled back by analytics failure.
      logger.warn('[Customer Order] Completion analytics persistence failed', {
        orderId: String(order._id),
        leadId: String(lead._id),
        eventName,
        error: String(error?.message || 'ANALYTICS_FAILED').slice(0, 300),
      });
    }
  }
}

async function syncOrderCommercialsToLead(order) {
  if (!order?.leadId) return null;

  const set = {
    quoteId: order.quoteId,
  };

  const amount = Number(order.amount);
  if (Number.isFinite(amount) && amount >= 0) {
    set.orderAmount = amount;
  }

  const lead = await Lead.findByIdAndUpdate(
    order.leadId,
    { $set: set },
    { new: true, runValidators: true }
  );

  if (!lead) return null;

  await Lead.updateOne(
    {
      _id: lead._id,
      'crmSync.status': { $in: ['SYNCED', 'NOT_REQUIRED'] },
    },
    {
      $set: {
        'crmSync.status': 'PENDING',
        'crmSync.nextAttemptAt': null,
        'crmSync.lastError': '',
      },
    }
  );

  return lead;
}

router.get('/', async (req, res, next) => {
  try {
    if (
      !isManagement(req.user) &&
      !['OPERATIONS', 'SALES', 'FINANCE', 'ACCOUNTS'].some((d) =>
        department(req.user, d)
      )
    ) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied.');
    }

    const query = {};

    if (req.query.leadId) {
      if (!mongoose.isValidObjectId(req.query.leadId)) {
        return fail(res, 400, 'VALIDATION_FAILED', 'Invalid leadId.');
      }

      query.leadId = req.query.leadId;
    }

    return ok(res, {
      orders: await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = req.body || {};
    const payment = Object.hasOwn(body, 'paymentStatus');
    const fulfillment = Object.hasOwn(body, 'status');
    const document = Object.hasOwn(body, 'document');

    if (!payment && !fulfillment && !document) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'Provide a payment, fulfillment or document update.'
      );
    }

    if (
      payment &&
      !(
        isManagement(req.user) ||
        department(req.user, 'FINANCE') ||
        department(req.user, 'ACCOUNTS')
      )
    ) {
      return fail(
        res,
        403,
        'FORBIDDEN',
        'Finance or Management must verify payment or credit.'
      );
    }

    if (
      (fulfillment || document) &&
      !department(req.user, 'OPERATIONS')
    ) {
      return fail(
        res,
        403,
        'FORBIDDEN',
        'Operations owns fulfillment and documents.'
      );
    }

    if (typeof body.reference !== 'string' || !body.reference.trim()) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        'Real verification evidence is required.'
      );
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return fail(res, 404, 'NOT_FOUND', 'Order not found.');
    }

    if (payment) {
      if (!['PENDING', 'PAID', 'CREDIT_APPROVED'].includes(body.paymentStatus)) {
        return fail(res, 400, 'VALIDATION_FAILED', 'Invalid payment state.');
      }

      order.paymentStatus = body.paymentStatus;
      order.paymentReference = body.reference;
      order.paymentVerifiedAt = new Date();
      order.paymentVerifiedBy = actor(req.user);
    }

    if (fulfillment) {
      const transitions = {
        ACCEPTED_PENDING_REVIEW: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['DISPATCHED', 'CANCELLED'],
        DISPATCHED: ['DELIVERED'],
        DELIVERED: [],
        CANCELLED: [],
      };

      if (!transitions[order.status]?.includes(body.status)) {
        return fail(
          res,
          409,
          'TRANSITION_INVALID',
          'Invalid fulfillment transition.'
        );
      }

      if (
        ['CONFIRMED', 'DISPATCHED'].includes(body.status) &&
        order.paymentStatus === 'PENDING'
      ) {
        return fail(
          res,
          409,
          'PAYMENT_PENDING',
          'Finance must verify payment or approved credit first.'
        );
      }

      order.status = body.status;
      order.fulfillmentReference = body.reference;
      order.fulfillmentVerifiedAt = new Date();
      order.fulfillmentVerifiedBy = actor(req.user);
    }

    if (document) {
      let url;

      try {
        url = new URL(body.document.url);
      } catch {
        return fail(
          res,
          400,
          'VALIDATION_FAILED',
          'An HTTPS document link is required.'
        );
      }

      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        typeof body.document.title !== 'string' ||
        !body.document.title.trim()
      ) {
        return fail(
          res,
          400,
          'VALIDATION_FAILED',
          'Document title and HTTPS link are required.'
        );
      }

      order.documents.push({
        title: body.document.title.trim().slice(0, 200),
        url: url.href,
        recordedAt: new Date(),
        recordedBy: actor(req.user),
      });
    }

    await order.save();

    /*
     * Master DPR CRM commercial fields must reflect the real order record.
     * This does not fabricate revenue or gross profit; it only mirrors the
     * persisted order amount / quotation linkage into the linked Lead.
     */
    let linkedLead = null;

    try {
      linkedLead = await syncOrderCommercialsToLead(order);

      /*
       * DELIVERED is terminal in the current order state machine, so this is
       * the safe point to close an already-negotiated Lead as WON without
       * risking a later CONFIRMED -> CANCELLED reversal.
       */
      if (
        fulfillment &&
        body.status === 'DELIVERED' &&
        linkedLead?.crmStatus === 'NEGOTIATION'
      ) {
        const lifecycle = await transitionLeadCrmStatus({
          leadId: linkedLead._id,
          toStatus: 'WON',
          actorId: actor(req.user),
          orderAmount:
            Number.isFinite(Number(order.amount)) && Number(order.amount) >= 0
              ? Number(order.amount)
              : null,
          note: `Customer order ${order._id} delivered.`,
        });

        linkedLead = lifecycle.lead;
      }

      if (fulfillment && body.status === 'DELIVERED' && linkedLead) {
        await recordDeliveredOrderAnalytics(order, linkedLead);
      }
    } catch (crmError) {
      await recordAudit({
        actorId: actor(req.user),
        actionType: 'CUSTOMER_ORDER_CRM_SYNC_FAILED',
        entityType: 'CUSTOMER_ORDER',
        entityId: order._id,
        metadata: {
          leadId: order.leadId ? String(order.leadId) : '',
          status: order.status,
          error: String(crmError?.message || 'CRM_SYNC_FAILED').slice(0, 300),
        },
      }).catch(() => {});
    }

    await recordAudit({
      actorId: actor(req.user),
      actionType: 'CUSTOMER_ORDER_UPDATED',
      entityType: 'CUSTOMER_ORDER',
      entityId: order._id,
      metadata: {
        reference: body.reference,
        payment,
        fulfillment,
        document,
      },
    });

    return ok(res, {
      order,
      leadId: linkedLead?._id || order.leadId || null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
