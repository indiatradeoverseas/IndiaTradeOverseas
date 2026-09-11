const ManagerChat = require('./managerChat.model');
const User = require('../users/user.model');
const Employee = require('../employee/employee.model');
const socketService = require('../../services/socket.service');
const { ok, fail } = require('../../utils/response');
const mongoose = require('mongoose');

/**
 * Helper to collect all matching identifier strings (ObjectIds, employeeIds, emails)
 * for a user across User, Employee, and Admin models so 1-on-1 chats match 100%.
 */
async function getUserAllIds(userOrId) {
  const ids = new Set();
  if (!userOrId) return [];

  let targetIdStr = '';
  let targetEmail = '';

  if (typeof userOrId === 'object') {
    if (userOrId._id) ids.add(String(userOrId._id));
    if (userOrId.id) ids.add(String(userOrId.id));
    if (userOrId.employeeDbId) ids.add(String(userOrId.employeeDbId));
    if (userOrId.employeeId) ids.add(String(userOrId.employeeId));
    if (userOrId.email) targetEmail = String(userOrId.email).toLowerCase().trim();
    targetIdStr = String(userOrId._id || userOrId.id || userOrId.employeeDbId || userOrId.employeeId || '');
  } else {
    targetIdStr = String(userOrId).trim();
    if (targetIdStr.includes('@')) {
      targetEmail = targetIdStr.toLowerCase();
    }
  }

  if (targetIdStr) ids.add(targetIdStr);
  if (targetEmail) ids.add(targetEmail);

  try {
    const isObjId = mongoose.isValidObjectId(targetIdStr);
    const query = [];

    if (isObjId) {
      query.push({ _id: targetIdStr });
    }
    if (targetEmail) {
      query.push({ email: targetEmail });
    }
    if (targetIdStr && !targetEmail) {
      query.push({ employeeId: targetIdStr });
    }

    if (query.length > 0) {
      const filter = { $or: query };

      const Admin = require('../admin-auth/admin.model');
      const [uMatches, eMatches, aMatches] = await Promise.all([
        User.find(filter).select('_id email employeeId').lean(),
        Employee.find(filter).select('_id email employeeId').lean(),
        Admin.find(filter).select('_id email').lean()
      ]);

      [...uMatches, ...eMatches, ...aMatches].forEach(item => {
        if (item._id) ids.add(String(item._id));
        if (item.employeeId) ids.add(String(item.employeeId));
        if (item.email) ids.add(String(item.email).toLowerCase());
      });
    }
  } catch (err) {
    console.error('Error resolving user IDs:', err);
  }

  return Array.from(ids).filter(Boolean);
}

// Send Message (Manager / Founder Chat)
async function sendManagerMessage(req, res, next) {
  try {
    const { recipientId = 'GENERAL', recipientName = 'General Leadership Hub', message, text, attachmentUrl, leadCode } = req.body || {};
    const cleanMessage = (message || text || '').trim();

    if (!cleanMessage && !attachmentUrl) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Message text or attachment is required');
    }

    const senderId = String(req.user?._id || req.user?.id || req.user?.employeeDbId || req.user?.employeeId || 'unknown');
    const senderEmail = (req.user?.email || '').toLowerCase();
    const senderName = req.user?.fullName || req.user?.name || 'User';
    const senderRole = req.user?.role || 'MANAGER';
    const senderDepartment = req.user?.department || 'GENERAL';

    const chatDoc = await ManagerChat.create({
      senderId,
      senderName,
      senderRole,
      senderDepartment,
      recipientId: String(recipientId || 'GENERAL'),
      recipientName: recipientName || 'General Leadership Hub',
      message: cleanMessage,
      attachmentUrl: attachmentUrl || '',
      leadCode: leadCode || '',
      isRead: false,
      readBy: [senderId, senderEmail].filter(Boolean)
    });

    const formatted = {
      _id: chatDoc._id.toString(),
      id: chatDoc._id.toString(),
      senderId: chatDoc.senderId,
      senderEmail,
      senderName: chatDoc.senderName,
      senderRole: chatDoc.senderRole,
      senderDepartment: chatDoc.senderDepartment,
      recipientId: chatDoc.recipientId,
      recipientName: chatDoc.recipientName,
      message: chatDoc.message,
      attachmentUrl: chatDoc.attachmentUrl,
      leadCode: chatDoc.leadCode,
      isRead: false,
      readBy: chatDoc.readBy || [senderId],
      createdAt: chatDoc.createdAt,
      time: new Date(chatDoc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Broadcast socket event to all clients to guarantee immediate real-time sync across roles
    try {
      socketService.emitToAll('manager_chat_receive', formatted);
    } catch (sktErr) {
      console.error('Error broadcasting manager chat socket:', sktErr);
    }

    return ok(res, { chat: formatted }, 'Manager chat message sent successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

// Get Chat Messages (General Leadership Hub or 1-on-1 Direct Chat)
async function getManagerMessages(req, res, next) {
  try {
    let { recipientId } = req.query || {};
    if (!recipientId || recipientId === 'undefined' || recipientId === 'null') {
      recipientId = 'GENERAL';
    }

    let filter = {};
    if (recipientId === 'GENERAL') {
      filter = { recipientId: 'GENERAL' };
    } else {
      // 1-on-1 DM: match ALL resolved IDs for current user and recipient to prevent missing messages
      const myUserIds = await getUserAllIds(req.user);
      const targetUserIds = await getUserAllIds(recipientId);

      filter = {
        $or: [
          { senderId: { $in: myUserIds }, recipientId: { $in: targetUserIds } },
          { senderId: { $in: targetUserIds }, recipientId: { $in: myUserIds } }
        ]
      };
    }

    const rawChats = await ManagerChat.find(filter)
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    const chats = rawChats.map(c => ({
      _id: String(c._id),
      id: String(c._id),
      senderId: c.senderId,
      senderName: c.senderName,
      senderRole: c.senderRole,
      senderDepartment: c.senderDepartment,
      recipientId: c.recipientId,
      recipientName: c.recipientName,
      message: c.message,
      attachmentUrl: c.attachmentUrl || '',
      leadCode: c.leadCode || '',
      isRead: Boolean(c.isRead),
      readBy: c.readBy || [],
      createdAt: c.createdAt,
      time: c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    }));

    return ok(res, { chats }, 'Manager chat messages retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// Get Chat Participants List (Founder, Admin & Department Managers)
async function getManagerParticipants(req, res, next) {
  try {
    const MANAGER_ROLES = [
      'ADMIN', 'FOUNDER', 'MANAGER', 'HR_MANAGER', 'HR', 'HR_EXECUTIVE',
      'SALES_MANAGER', 'SALES', 'FINANCE_MANAGER', 'FINANCE',
      'TRANSPORT_MANAGER', 'TRANSPORT', 'LOGISTICS_MANAGER', 'LOGISTICS',
      'PROCUREMENT', 'ACCOUNTS', 'IT'
    ];

    const users = await User.find(
      { role: { $in: MANAGER_ROLES } },
      'fullName name email role department position employeeId phone'
    ).lean();

    const emps = await Employee.find(
      { role: { $in: MANAGER_ROLES } },
      'name fullName email role department position employeeId phone'
    ).lean();

    let admins = [];
    try {
      const Admin = require('../admin-auth/admin.model');
      admins = await Admin.find(
        {},
        'fullName name email role designation department position phone'
      ).lean();
    } catch (err) {
      console.error('Error querying Admin collection for chat participants:', err);
    }

    const participantMap = new Map();

    const addParticipant = (u, source) => {
      if (!u || !u._id) return;
      const idStr = String(u._id);
      const emailKey = u.email ? String(u.email).toLowerCase().trim() : idStr;

      if (!participantMap.has(emailKey)) {
        participantMap.set(emailKey, {
          _id: idStr,
          fullName: u.fullName || u.name || 'Manager',
          name: u.fullName || u.name || 'Manager',
          email: u.email || '',
          role: u.role || 'MANAGER',
          department: u.department || 'GENERAL',
          position: u.designation || u.position || u.role || 'Department Manager',
          employeeId: u.employeeId || idStr,
          phone: u.phone || '',
          allIds: [idStr, u.employeeId].filter(Boolean),
          source
        });
      } else {
        const existing = participantMap.get(emailKey);
        if (!existing.allIds.includes(idStr)) existing.allIds.push(idStr);
        if (u.employeeId && !existing.allIds.includes(u.employeeId)) existing.allIds.push(u.employeeId);
      }
    };

    admins.forEach(a => addParticipant(a, 'Admin'));
    users.forEach(u => addParticipant(u, 'User'));
    emps.forEach(e => addParticipant(e, 'Employee'));

    // Filter out current user from direct participants list
    const myIds = await getUserAllIds(req.user);
    const mySet = new Set(myIds);

    const participants = Array.from(participantMap.values()).filter(p => {
      if (mySet.has(String(p._id)) || (p.email && mySet.has(p.email.toLowerCase()))) {
        return false;
      }
      return true;
    });

    return ok(res, { participants }, 'Manager chat participants retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// Mark Messages as Read
async function markManagerChatRead(req, res, next) {
  try {
    let { recipientId } = req.body || {};
    if (!recipientId || recipientId === 'undefined' || recipientId === 'null') {
      recipientId = 'GENERAL';
    }
    
    const myUserIds = await getUserAllIds(req.user);
    let filter = {};

    if (recipientId === 'GENERAL') {
      filter = { recipientId: 'GENERAL' };
    } else {
      const targetUserIds = await getUserAllIds(recipientId);
      filter = {
        senderId: { $in: targetUserIds },
        recipientId: { $in: myUserIds }
      };
    }

    if (myUserIds.length > 0) {
      await ManagerChat.updateMany(filter, {
        $addToSet: { readBy: { $each: myUserIds } },
        $set: { isRead: true }
      });
    }

    // Broadcast socket read receipt so sender gets instant double teal ticks!
    try {
      socketService.emitToAll('manager_chat_read', {
        readerIds: myUserIds,
        channelId: recipientId
      });
    } catch (e) {}

    return ok(res, { success: true }, 'Manager chat marked as read', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendManagerMessage,
  getManagerMessages,
  getManagerParticipants,
  markManagerChatRead
};

