const router = require('express').Router();
const { adminLogin, adminGoogleLogin, verifyAdminOtp, requestAdminOtp } = require('./adminAuth.controller');

router.post('/login', adminLogin);
router.post('/google', adminGoogleLogin);
router.post('/verify-otp', verifyAdminOtp);
router.post('/request-otp', requestAdminOtp);

module.exports = router;
