const router =
  require("express").Router();

const rateLimit =
  require("express-rate-limit");

const {
  authenticate,
} = require("../../middlewares/auth.middleware");

const {
  createCoalVisitor,
  getCoalVisitor,
  createRazorpayOrder,
  verifyPayment,
  listCoalVisitors,
} = require("./coalVisitor.controller");

const publicLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 30,

    message: {
      success: false,
      errorCode:
        "RATE_LIMITED",
      message:
        "Too many submissions. Please try again later.",
    },
  });

const paymentLimiter =
  rateLimit({
    windowMs:
      10 * 60 * 1000,

    max: 20,

    message: {
      success: false,
      errorCode:
        "RATE_LIMITED",
      message:
        "Too many payment attempts. Please try again later.",
    },
  });

router.post(
  "/",
  publicLimiter,
  createCoalVisitor
);

/*
 * IMPORTANT:
 * Keep CRM route before /:visitorId.
 */
router.get(
  "/crm/list",
  authenticate,
  listCoalVisitors
);

router.get(
  "/:visitorId",
  getCoalVisitor
);

router.post(
  "/:visitorId/payments/razorpay/create-order",
  paymentLimiter,
  createRazorpayOrder
);

router.post(
  "/:visitorId/payments/razorpay/verify-payment",
  paymentLimiter,
  verifyPayment
);

module.exports = router;