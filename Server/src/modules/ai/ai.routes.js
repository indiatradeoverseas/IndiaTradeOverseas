const express = require('express');
const router = express.Router();
const { handleAiChat, handleAiCommand, handleAiGreeting } = require('./ai.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.post('/chat', authenticate, handleAiChat);
router.post('/command', authenticate, handleAiCommand);
router.get('/greeting', authenticate, handleAiGreeting);

module.exports = router;
