const SalesTrialChat = require('./salesTrialChat.model');
const SalesTrialUser = require('./salesTrialUser.model');
const { ok, fail } = require('../../utils/response');
const socketService = require('../../services/socket.service');

// Controller: Send Chat Message (Sales Manager ↔ Sales Trial Employee)
async function sendTrialChatMessage(req, res, next) {
  try {
    const { trialUserId, managerId, message, leadCode, attachments } = req.body;

    if (!message || !message.trim()) {
      return fail(res, 400, 'BAD_REQUEST', 'Message content cannot be empty', [], req);
    }

    const senderId = String(req.user?._id || req.user?.id || req.user?.employeeId || '');
    const senderName = req.user?.fullName || req.user?.name || 'User';
    const senderRole = req.user?.role || 'SALES_TRIAL';

    // Target trialUserId and managerId
    const targetTrialUserId = String(trialUserId || (senderRole === 'SALES_TRIAL' ? senderId : ''));
    const targetManagerId = String(managerId || (senderRole === 'SALES_MANAGER' ? senderId : ''));

    const chatDoc = await SalesTrialChat.create({
      trialUserId: targetTrialUserId,
      managerId: targetManagerId,
      senderId,
      senderName,
      senderRole,
      message: message.trim(),
      leadCode: leadCode || '',
      attachments: attachments || [],
      isRead: false
    });

    const formattedMsg = chatDoc.toObject();

    // Broadcast via socket
    if (socketService) {
      if (senderRole === 'SALES_TRIAL') {
        // Emit to Sales Manager
        socketService.emitToEmployee(targetManagerId, 'sales_trial_chat_receive', formattedMsg);
        socketService.emitToRoles(['ADMIN', 'MANAGER', 'SALES_MANAGER'], 'sales_trial_chat_receive', formattedMsg);
      } else {
        // Emit to Sales Trial Employee
        socketService.emitToEmployee(targetTrialUserId, 'sales_trial_chat_receive', formattedMsg);
      }
      socketService.emitToAll('sales_trial_chat_receive', formattedMsg);
    }

    return ok(res, { chat: formattedMsg }, 'Chat message sent successfully', 201, req);
  } catch (err) {
    next(err);
  }
}

// Controller: Get Chat History between Manager and Trial Employee
async function getTrialChatHistory(req, res, next) {
  try {
    const { trialUserId } = req.params;
    const currentUserId = String(req.user?._id || req.user?.id || req.user?.employeeId || '');

    const targetTrialUserId = trialUserId || (req.user?.role === 'SALES_TRIAL' ? currentUserId : '');

    if (!targetTrialUserId) {
      return fail(res, 400, 'BAD_REQUEST', 'trialUserId parameter is required', [], req);
    }

    const mongoose = require('mongoose');
    const userVariants = [String(targetTrialUserId)];

    const queryOr = [
      { _id: targetTrialUserId },
      { trialId: targetTrialUserId },
      { trialId: String(targetTrialUserId).toUpperCase() }
    ];
    if (mongoose.Types.ObjectId.isValid(targetTrialUserId)) {
      queryOr.push({ _id: new mongoose.Types.ObjectId(targetTrialUserId) });
    }

    const trialUser = await SalesTrialUser.findOne({ $or: queryOr }).catch(() => null);

    if (trialUser) {
      if (trialUser._id) userVariants.push(String(trialUser._id));
      if (trialUser.trialId) userVariants.push(trialUser.trialId);
      if (trialUser.email) userVariants.push(trialUser.email);
    }

    const messages = await SalesTrialChat.find({
      $or: [
        { trialUserId: { $in: userVariants } },
        { senderId: { $in: userVariants } },
        { managerId: { $in: userVariants } }
      ]
    }).sort({ createdAt: 1 });

    return ok(res, { messages }, 'Chat history retrieved successfully', 200, req);
  } catch (err) {
    next(err);
  }
}

// Controller: Mark Chat Messages as Read
async function markTrialChatRead(req, res, next) {
  try {
    const { trialUserId } = req.params;
    const currentUserId = String(req.user?._id || req.user?.id || '');

    await SalesTrialChat.updateMany(
      { trialUserId, senderId: { $ne: currentUserId }, isRead: false },
      { $set: { isRead: true } }
    );

    return ok(res, { success: true }, 'Messages marked as read', 200, req);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendTrialChatMessage,
  getTrialChatHistory,
  markTrialChatRead
};
