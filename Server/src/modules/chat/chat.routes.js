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

const {
  sendManagerMessage,
  getManagerMessages,
  getManagerParticipants,
  markManagerChatRead
} = require('./managerChat.controller');

router.get('/transport', getTransportChats);
router.post('/transport', sendTransportChat);

router.get('/manager/messages', authenticate, getManagerMessages);
router.post('/manager/send', authenticate, sendManagerMessage);
router.get('/manager/participants', authenticate, getManagerParticipants);
router.put('/manager/read', authenticate, markManagerChatRead);

router.post('/sessions', initSession);
router.get('/sessions/:sessionId/messages', getMessages);
router.post('/sessions/:sessionId/messages', sendMessage);

router.get('/admin/sessions', authenticate, getAdminSessions);
router.post('/admin/sessions/:sessionId/messages', authenticate, sendAdminReply);
router.patch('/admin/sessions/:sessionId/resolve', authenticate, resolveSession);

module.exports = router;
