const HrWorkLog = require('./hrWorkLog.model');
const { ok, fail } = require('../../utils/response');
const socketService = require('../../services/socket.service');

async function submitHrWorkLog(req, res, next) {
  try {
    const { numberOfCalls, callDuration, numberOfHiring, workSummary, note } = req.body;

    const empName = req.user.fullName || req.user.name || 'HR Representative';
    const userRole = req.user.role || (req.user.department === 'HR' ? 'HR_MANAGER' : 'HR_EXECUTIVE');
    const userDept = req.user.department || 'HR';
    const summaryText = workSummary || note || '';

    const log = await HrWorkLog.create({
      employeeId: req.user._id,
      employeeName: empName,
      employeeRole: userRole,
      department: userDept,
      numberOfCalls: Number(numberOfCalls || 0),
      callDuration: String(callDuration || '').trim(),
      numberOfHiring: Number(numberOfHiring || 0),
      workSummary: summaryText
    });

    const logObj = log.toObject ? log.toObject() : log;

    // Broadcast live event to Founder, CEO and HR dashboards
    socketService.emitToAll('hr_work_log_submitted', logObj);

    // Format & broadcast message for Manager / Founder Chat Hub
    const chatMsgText = `📋 HR Daily Work Log Submitted by ${empName}:\n• Calls Conducted: ${log.numberOfCalls}\n• Call Duration: ${log.callDuration || 'N/A'}\n• Hiring/Onboarding: ${log.numberOfHiring}\n• Summary: "${log.workSummary}"`;

    try {
      const ManagerChat = require('../chat/managerChat.model');
      await ManagerChat.create({
        senderId: String(req.user._id),
        senderName: empName,
        senderRole: userRole,
        senderDepartment: userDept,
        recipientId: 'FOUNDER_CEO',
        recipientName: 'Founder & CEO Leadership Hub',
        message: chatMsgText
      });
    } catch (chatErr) {
      console.warn('Notice persisting HR work log chat message:', chatErr.message);
    }

    return ok(res, { log: logObj }, 'HR daily work log submitted successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function getHrWorkLogs(req, res, next) {
  try {
    const { date, employeeId } = req.query;
    let query = {};

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const logs = await HrWorkLog.find(query).sort({ createdAt: -1 }).lean();
    return ok(res, { logs }, 'HR daily work logs retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitHrWorkLog,
  getHrWorkLogs
};
