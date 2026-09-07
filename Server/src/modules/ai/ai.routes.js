const express = require('express');
const router = express.Router();
const { handleAiChat } = require('./ai.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/chat', authenticate, handleAiChat);

module.exports = router;
