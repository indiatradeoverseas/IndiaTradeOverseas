const router = require('express').Router();
const { adminLogin, adminGoogleLogin } = require('./adminAuth.controller');

router.post('/login', adminLogin);
router.post('/google', adminGoogleLogin);

module.exports = router;
