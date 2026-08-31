const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  getDashboardSummary, 
  getDashboardHistory,
  getDashboardMetrics
} = require('./notification.controller');

router.use(authenticate);
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:notificationId/read', markNotificationRead);
router.delete('/notifications', deleteAllNotifications);
router.delete('/notifications/:notificationId', deleteNotification);
router.get('/summary', getDashboardSummary);
router.get('/history', getDashboardHistory);
router.get('/metrics', getDashboardMetrics);

module.exports = router;
