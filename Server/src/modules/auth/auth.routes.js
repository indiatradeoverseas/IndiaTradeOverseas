const router = require('express').Router();
const {
  register,
  login,
  requestOtp,
  verifyOtp,
  refresh,
  logout,
  me,
  getSessions,
  requestDeviceApproval,
  getMe,
  refreshToken,
  logoutAll,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getGoogleClientId,
  getLatestOtp
} = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');


router.post('/register', register);
router.post('/login', login);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh', refresh);
router.get('/refresh-token', refreshToken);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/google-client-id', getGoogleClientId);
router.get('/latest-otp', getLatestOtp);


router.get('/me', authenticate, me);
router.get('/get-me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.get('/logout', authenticate, logout);
router.get('/logout-all', authenticate, logoutAll);
router.get('/sessions', authenticate, getSessions);
router.post('/device/request-approval', authenticate, requestDeviceApproval);

module.exports = router;
