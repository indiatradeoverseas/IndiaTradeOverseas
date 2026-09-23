const router = require('express').Router();

const {
  verifyMetaLeadAdsWebhook,
  receiveMetaLeadAdsWebhook,
} = require('./metaLeadAds.controller');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 4.15: Meta Lead Ads webhook routes
 *
 * These endpoints are intentionally public because Meta's servers must reach
 * them directly. Security is enforced inside the controller/service layer:
 * - GET verification requires the configured verify token.
 * - POST delivery requires a valid x-hub-signature-256 calculated with the
 *   real Meta App Secret against the exact raw request body.
 *
 * Do not add normal employee/session authentication here; doing so would block
 * Meta's webhook delivery.
 */

// Meta webhook subscription verification.
router.get(
  '/webhook',
  verifyMetaLeadAdsWebhook
);

// Signed Meta leadgen notifications.
router.post(
  '/webhook',
  receiveMetaLeadAdsWebhook
);

module.exports = router;
