const express = require("express");

const {
  createVisitor,
  getVisitor,
  listVisitors,
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("./coalVisitor.controller");

const router = express.Router();

/*
  IMPORTANT:
  Keep /crm/list before /:visitorId.
*/

router.post("/", createVisitor);

router.get(
  "/crm/list",
  listVisitors
);

router.get(
  "/:visitorId",
  getVisitor
);

router.post(
  "/:visitorId/payments/razorpay/create-order",
  createRazorpayOrder
);

router.post(
  "/:visitorId/payments/razorpay/verify-payment",
  verifyRazorpayPayment
);

module.exports = router;