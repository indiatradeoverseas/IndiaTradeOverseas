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
  let targetPhone = '';

  if (typeof userOrId === 'object') {
    if (userOrId._id) ids.add(String(userOrId._id));
    if (userOrId.id) ids.add(String(userOrId.id));
    if (userOrId.employeeDbId) ids.add(String(userOrId.employeeDbId));
    if (userOrId.employeeId) ids.add(String(userOrId.employeeId));
    if (userOrId.trialId) ids.add(String(userOrId.trialId));
    if (userOrId.phone) {
      targetPhone = String(userOrId.phone).trim();
      ids.add(targetPhone);
    }
    if (userOrId.email) targetEmail = String(userOrId.email).toLowerCase().trim();
    targetIdStr = String(userOrId._id || userOrId.id || userOrId.employeeDbId || userOrId.employeeId || '');
  } else {
    targetIdStr = String(userOrId).trim();
    if (targetIdStr.includes('@')) {
      targetEmail = targetIdStr.toLowerCase();
    } else if (/^\+?[0-9]{7,15}$/.test(targetIdStr)) {
      targetPhone = targetIdStr;
    }
  }

  if (targetIdStr) ids.add(targetIdStr);
  if (targetEmail) ids.add(targetEmail);
  if (targetPhone) ids.add(targetPhone);

  try {
    const isObjId = mongoose.isValidObjectId(targetIdStr);
    const query = [];

    if (isObjId) {
      query.push({ _id: targetIdStr });
    }
    if (targetEmail) {
      query.push({ email: targetEmail });
    }
    if (targetPhone) {
      query.push({ phone: targetPhone });
    }
    if (targetIdStr && !targetEmail && !targetPhone) {
      query.push({ employeeId: targetIdStr });
      query.push({ trialId: targetIdStr });
    }

    if (query.length > 0) {
      const filter = { $or: query };

      const Admin = require('../admin-auth/admin.model');
      const SalesTrialUser = require('../sales-trial/salesTrialUser.model');
      let Driver;
      try {
        Driver = require('../dispatch/driver.model');
      } catch (e) {}

      const promises = [
        User.find(filter).select('_id email employeeId phone').lean(),
        Employee.find(filter).select('_id email employeeId phone').lean(),
        Admin.find(filter).select('_id email phone').lean(),
        SalesTrialUser.find(filter).select('_id email trialId employeeId phone').lean()
      ];

      if (Driver) {
        promises.push(Driver.find(filter).select('_id phone employeeId name').lean().catch(() => []));
      }

      const results = await Promise.all(promises);
      const uMatches = results[0] || [];
      const eMatches = results[1] || [];
      const aMatches = results[2] || [];
      const tMatches = results[3] || [];
      const dMatches = results[4] || [];

      const foundEmails = new Set();
      [...uMatches, ...eMatches, ...aMatches, ...tMatches, ...dMatches].forEach(item => {
        if (item._id) ids.add(String(item._id));
        if (item.employeeId) ids.add(String(item.employeeId));
        if (item.trialId) ids.add(String(item.trialId));
        if (item.phone) ids.add(String(item.phone));
        if (item.email) {
          const em = String(item.email).toLowerCase().trim();
          ids.add(em);
          foundEmails.add(em);
        }
      });

      if (foundEmails.size > 0) {
        const emailList = Array.from(foundEmails);
        const emailFilter = { email: { $in: emailList } };
        const [uByEmail, eByEmail, aByEmail, tByEmail] = await Promise.all([
          User.find(emailFilter).select('_id email employeeId phone').lean(),
          Employee.find(emailFilter).select('_id email employeeId phone').lean(),
          Admin.find(emailFilter).select('_id email phone').lean(),
          SalesTrialUser.find(emailFilter).select('_id email trialId employeeId phone').lean()
        ]);
        [...uByEmail, ...eByEmail, ...aByEmail, ...tByEmail].forEach(item => {
          if (item._id) ids.add(String(item._id));
          if (item.employeeId) ids.add(String(item.employeeId));
          if (item.trialId) ids.add(String(item.trialId));
          if (item.phone) ids.add(String(item.phone));
          if (item.email) ids.add(String(item.email).toLowerCase());
        });
      }
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
    const senderEmail = (req.user?.email || '').toLowerCase().trim();
    const senderName = req.user?.fullName || req.user?.name || 'User';
    const senderRole = req.user?.role || 'STAFF';
    const senderDepartment = req.user?.department || 'GENERAL';

    let senderAllIds = [senderId].filter(Boolean);
    try {
      const resolved = await getUserAllIds(req.user);
      if (resolved && resolved.length) senderAllIds = resolved;
    } catch (e) {
      console.error('Error resolving senderAllIds in sendManagerMessage:', e);
    }

    let recipientEmail = '';
    let recipientAllIds = [];
    if (recipientId !== 'GENERAL') {
      try {
        const resolved = await getUserAllIds(recipientId);
        if (resolved && resolved.length) {
          recipientAllIds = resolved;
          const foundEm = recipientAllIds.find(id => id && typeof id === 'string' && id.includes('@'));
          if (foundEm) recipientEmail = foundEm.toLowerCase().trim();
        } else {
          recipientAllIds = [String(recipientId)].filter(Boolean);
        }
      } catch (e) {
        console.error('Error resolving recipientAllIds in sendManagerMessage:', e);
        recipientAllIds = [String(recipientId)].filter(Boolean);
      }
    }

    const chatDoc = await ManagerChat.create({
      senderId,
      senderEmail,
      senderName,
      senderRole,
      senderDepartment,
      senderAllIds,
      recipientId: String(recipientId || 'GENERAL'),
      recipientEmail,
      recipientName: recipientName || 'General Leadership Hub',
      recipientAllIds,
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
      senderEmail: chatDoc.senderEmail || senderEmail,
      senderName: chatDoc.senderName,
      senderRole: chatDoc.senderRole,
      senderDepartment: chatDoc.senderDepartment,
      senderAllIds: chatDoc.senderAllIds || senderAllIds,
      recipientId: chatDoc.recipientId,
      recipientEmail: chatDoc.recipientEmail || recipientEmail,
      recipientName: chatDoc.recipientName,
      recipientAllIds: chatDoc.recipientAllIds || recipientAllIds,
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
      let myUserIds = [String(req.user?._id || req.user?.id || '')].filter(Boolean);
      let targetUserIds = [String(recipientId)].filter(Boolean);
      try {
        const resMine = await getUserAllIds(req.user);
        if (resMine && resMine.length) myUserIds = resMine;
        const resTarget = await getUserAllIds(recipientId);
        if (resTarget && resTarget.length) targetUserIds = resTarget;
      } catch (e) {
        console.error('Error resolving IDs in getManagerMessages:', e);
      }

      const myEmail = (req.user?.email || '').toLowerCase().trim();
      let targetEmail = '';
      const foundEm = targetUserIds.find(id => id && typeof id === 'string' && id.includes('@'));
      if (foundEm) targetEmail = foundEm.toLowerCase().trim();

      const orConditions = [
        { senderId: { $in: myUserIds }, recipientId: { $in: targetUserIds } },
        { senderId: { $in: targetUserIds }, recipientId: { $in: myUserIds } },
        { senderAllIds: { $in: myUserIds }, recipientId: { $in: targetUserIds } },
        { senderId: { $in: targetUserIds }, recipientAllIds: { $in: myUserIds } },
        { senderAllIds: { $in: targetUserIds }, recipientId: { $in: myUserIds } },
        { senderId: { $in: myUserIds }, recipientAllIds: { $in: targetUserIds } }
      ];

      if (myEmail && targetEmail) {
        orConditions.push(
          { senderEmail: myEmail, recipientEmail: targetEmail },
          { senderEmail: targetEmail, recipientEmail: myEmail }
        );
      }

      filter = { $or: orConditions };
    }

    const rawChats = await ManagerChat.find(filter)
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    const chats = rawChats.map(c => ({
      _id: String(c._id),
      id: String(c._id),
      senderId: c.senderId,
      senderEmail: c.senderEmail || '',
      senderName: c.senderName,
      senderRole: c.senderRole,
      senderDepartment: c.senderDepartment,
      senderAllIds: c.senderAllIds || [],
      recipientId: c.recipientId,
      recipientEmail: c.recipientEmail || '',
      recipientName: c.recipientName,
      recipientAllIds: c.recipientAllIds || [],
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

// Get Chat Participants List (All Roles: HR, HR Manager, HR Executive, Sales Manager, Sales Executive, CEO, Admin, Driver, Transport Manager, etc.)
async function getManagerParticipants(req, res, next) {
  try {
    const users = await User.find(
      { isActive: { $ne: false } },
      'fullName name email role department position employeeId phone'
    ).lean();

    const emps = await Employee.find(
      { status: { $ne: 'Inactive' } },
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

    let salesTrials = [];
    try {
      const SalesTrialUser = require('../sales-trial/salesTrialUser.model');
      salesTrials = await SalesTrialUser.find(
        { status: { $ne: 'INACTIVE' } },
        'fullName name email role department position trialId employeeId phone'
      ).lean();
    } catch (err) {
      console.error('Error querying SalesTrialUser collection for chat participants:', err);
    }

    let drivers = [];
    try {
      const Driver = require('../dispatch/driver.model');
      drivers = await Driver.find({}).lean();
    } catch (err) {
      console.error('Error querying Driver collection for chat participants:', err);
    }

    const participantMap = new Map();

    const addParticipant = (u, source) => {
      if (!u || !u._id) return;
      const idStr = String(u._id);
      const emailKey = u.email ? String(u.email).toLowerCase().trim() : (u.phone ? `phone_${u.phone}` : idStr);

      if (!participantMap.has(emailKey)) {
        participantMap.set(emailKey, {
          _id: idStr,
          fullName: u.fullName || u.name || (source === 'Driver' ? 'Driver' : 'Staff Member'),
          name: u.fullName || u.name || (source === 'Driver' ? 'Driver' : 'Staff Member'),
          email: u.email || '',
          role: u.role || (source === 'Driver' ? 'DRIVER' : 'STAFF'),
          department: u.department || (source === 'Driver' ? 'TRANSPORT' : 'GENERAL'),
          position: u.designation || u.position || u.role || (source === 'Driver' ? 'Vehicle Driver' : 'Staff Member'),
          employeeId: u.trialId || u.employeeId || u.phone || idStr,
          phone: u.phone || '',
          allIds: [idStr, u.trialId, u.employeeId, u.phone].filter(Boolean),
          source
        });
      } else {
        const existing = participantMap.get(emailKey);
        if (!existing.allIds.includes(idStr)) existing.allIds.push(idStr);
        if (u.trialId && !existing.allIds.includes(u.trialId)) existing.allIds.push(u.trialId);
        if (u.employeeId && !existing.allIds.includes(u.employeeId)) existing.allIds.push(u.employeeId);
        if (u.phone && !existing.allIds.includes(u.phone)) existing.allIds.push(u.phone);
      }
    };

    admins.forEach(a => addParticipant(a, 'Admin'));
    users.forEach(u => addParticipant(u, 'User'));
    emps.forEach(e => addParticipant(e, 'Employee'));
    salesTrials.forEach(t => addParticipant(t, 'SalesTrial'));
    drivers.forEach(d => addParticipant(d, 'Driver'));

    // Filter out current user from direct participants list
    const myIds = await getUserAllIds(req.user);
    const mySet = new Set(myIds);

    const rawParticipants = Array.from(participantMap.values()).filter(p => {
      if (mySet.has(String(p._id)) || (p.email && mySet.has(p.email.toLowerCase())) || (p.phone && mySet.has(String(p.phone)))) {
        return false;
      }
      return true;
    });

    // Populate full multi-model resolved allIds for each participant so client matching is 100% accurate
    const participants = await Promise.all(
      rawParticipants.map(async (p) => {
        const resolvedIds = await getUserAllIds(p);
        return {
          ...p,
          allIds: Array.from(new Set([...(p.allIds || []), ...resolvedIds])).filter(Boolean)
        };
      })
    );

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
    
    let myUserIds = [String(req.user?._id || req.user?.id || '')].filter(Boolean);
    let targetUserIds = [String(recipientId)].filter(Boolean);
    try {
      const resMine = await getUserAllIds(req.user);
      if (resMine && resMine.length) myUserIds = resMine;
      const resTarget = await getUserAllIds(recipientId);
      if (resTarget && resTarget.length) targetUserIds = resTarget;
    } catch (e) {
      console.error('Error resolving IDs in markManagerChatRead:', e);
    }

    let filter = {};
    if (recipientId === 'GENERAL') {
      filter = { recipientId: 'GENERAL' };
    } else {
      const myEmail = (req.user?.email || '').toLowerCase().trim();
      let targetEmail = '';
      const foundEm = targetUserIds.find(id => id && typeof id === 'string' && id.includes('@'));
      if (foundEm) targetEmail = foundEm.toLowerCase().trim();

      const readConditions = [
        { senderId: { $in: targetUserIds }, recipientId: { $in: myUserIds } },
        { senderAllIds: { $in: targetUserIds }, recipientId: { $in: myUserIds } },
        { senderId: { $in: targetUserIds }, recipientAllIds: { $in: myUserIds } }
      ];

      if (myEmail && targetEmail) {
        readConditions.push({ senderEmail: targetEmail, recipientEmail: myEmail });
      }

      filter = { $or: readConditions };
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

