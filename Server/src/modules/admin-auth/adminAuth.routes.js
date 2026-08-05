const router = require('express').Router();
const { adminLogin } = require('./adminAuth.controller');

router.post('/login', adminLogin);

module.exports = router;
