const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  getNextTrialId,
  createSalesTrialUser,
  registerSalesTrialUser,
  verifySalesTrialOtp,
  resendSalesTrialOtp,
  loginSalesTrialUser,
  approveSalesTrialUser,
  rejectSalesTrialUser,
  getSalesTrialUsers,
  assignTaskToTrialUser
} = require('./salesTrialUser.controller');
const {
  sendTrialChatMessage,
  getTrialChatHistory,
  markTrialChatRead
} = require('./salesTrialChat.controller');

// Public Auth Routes
router.post('/auth/signup', registerSalesTrialUser);
router.post('/auth/verify-otp', verifySalesTrialOtp);
router.post('/auth/resend-otp', resendSalesTrialOtp);
router.post('/auth/login', loginSalesTrialUser);
router.get('/auth/next-id', getNextTrialId);

// Authenticated Routes
router.post('/auth/create', authenticate, createSalesTrialUser);
router.put('/auth/approve/:id', authenticate, approveSalesTrialUser);
router.put('/auth/reject/:id', authenticate, rejectSalesTrialUser);
router.get('/users', authenticate, getSalesTrialUsers);
router.post('/tasks/assign', authenticate, assignTaskToTrialUser);

// Chat Routes
router.post('/chat/send', authenticate, sendTrialChatMessage);
router.get('/chat/history/:trialUserId?', authenticate, getTrialChatHistory);
router.put('/chat/read/:trialUserId', authenticate, markTrialChatRead);

module.exports = router;
