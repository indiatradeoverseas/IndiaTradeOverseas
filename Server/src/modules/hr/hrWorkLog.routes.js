const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const {
  submitHrWorkLog,
  getHrWorkLogs
} = require('./hrWorkLog.controller');

router.use(authenticate);

router.post('/', submitHrWorkLog);
router.get('/', getHrWorkLogs);

module.exports = router;
