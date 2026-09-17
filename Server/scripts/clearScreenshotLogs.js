const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/indiatradeoverseas';

async function clearScreenshotLogs() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Delete Security Alerts matching screenshot attempts
    const securityAlertsCol = db.collection('securityalerts');
    const resAlerts = await securityAlertsCol.deleteMany({
      $or: [
        { alertType: 'SCREENSHOT_ATTEMPT' },
        { message: /SCREENSHOT/i }
      ]
    });
    console.log(`Deleted ${resAlerts.deletedCount} screenshot security alert records.`);

    // 2. Delete Audit Logs matching screenshot attempts
    const auditLogsCol = db.collection('auditlogs');
    const resAudit = await auditLogsCol.deleteMany({
      $or: [
        { actionType: 'SCREENSHOT_ATTEMPTED' },
        { 'metadata.detectionType': { $exists: true } }
      ]
    });
    console.log(`Deleted ${resAudit.deletedCount} screenshot audit log records.`);

    // 3. Delete Notifications matching screenshot attempt security alerts
    const notificationsCol = db.collection('notifications');
    const resNotif = await notificationsCol.deleteMany({
      $or: [
        { type: 'SECURITY_ALERT', message: /SCREENSHOT/i },
        { message: /SCREENSHOT/i }
      ]
    });
    console.log(`Deleted ${resNotif.deletedCount} screenshot notification records.`);

    console.log('All screenshot breach & attempt records successfully deleted from Database!');
  } catch (err) {
    console.error('Error clearing screenshot logs:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

clearScreenshotLogs();
