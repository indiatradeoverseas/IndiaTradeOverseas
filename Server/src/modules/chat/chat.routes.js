const router = require('express').Router();
const { 
  initSession, 
  getMessages, 
  sendMessage, 
  getAdminSessions, 
  sendAdminReply, 
  resolveSession,
  getTransportChats,
  sendTransportChat
} = require('./chat.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/transport', getTransportChats);
router.post('/transport', sendTransportChat);

router.post('/sessions', initSession);
router.get('/sessions/:sessionId/messages', getMessages);
router.post('/sessions/:sessionId/messages', sendMessage);

router.get('/admin/sessions', authenticate, getAdminSessions);
router.post('/admin/sessions/:sessionId/messages', authenticate, sendAdminReply);
router.patch('/admin/sessions/:sessionId/resolve', authenticate, resolveSession);

module.exports = router;
