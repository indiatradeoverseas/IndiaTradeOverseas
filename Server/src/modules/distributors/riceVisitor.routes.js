const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const {
  createRiceVisitor,
  getRiceVisitor,
  updateRiceVisitorCart,
  createRazorpayOrderForVisitor,
  verifyPaymentAndCreateOrder,
  getRiceVisitorByEmail,
} = require('./riceVisitor.controller');

const riceVisitorCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, errorCode: 'RATE_LIMITED', message: 'Too many visitor submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const riceVisitorCartLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: { success: false, errorCode: 'RATE_LIMITED', message: 'Too many cart updates. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { success: false, errorCode: 'RATE_LIMITED', message: 'Too many payment attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', riceVisitorCreateLimiter, createRiceVisitor);
router.get('/by-email', getRiceVisitorByEmail);
router.get('/:visitorId', getRiceVisitor);
router.patch('/:visitorId/cart', riceVisitorCartLimiter, updateRiceVisitorCart);
router.post('/:visitorId/payments/razorpay/create-order', paymentLimiter, createRazorpayOrderForVisitor);
router.post('/:visitorId/payments/razorpay/verify-payment', paymentLimiter, verifyPaymentAndCreateOrder);

module.exports = router;