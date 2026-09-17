const path = require('path');
const fs = require('fs');
const SharedFile = require('./sharedFile.model');
const Employee = require('../employee/employee.model');
const socketService = require('../../services/socket.service');
const { ok, fail } = require('../../utils/response');

/**
 * Get eligible recipient employees and managers for file sharing
 */
async function getRecipients(req, res) {
  try {
    const User = require('../users/user.model');
    const Employee = require('../employee/employee.model');
    const Admin = require('../admin-auth/admin.model');
    const SalesTrialUser = require('../sales-trial/salesTrialUser.model');

    const [users, employees, admins, salesTrials] = await Promise.all([
      User.find({ isActive: { $ne: false } }).select('fullName name email department position role employeeId').lean(),
      Employee.find({ status: { $ne: 'INACTIVE' } }).select('name fullName email department position role employeeId').lean(),
      Admin.find({}).select('fullName name username email department position role employeeId').lean(),
      SalesTrialUser.find({ status: { $ne: 'INACTIVE' } }).select('fullName name email department position role trialId employeeId').lean()
    ]);

    const senderRole = (req.user.role || '').toUpperCase();
    const senderPos = (req.user.position || '').toLowerCase();
    
    const isSenderLeader = ['FOUNDER', 'CEO', 'ADMIN', 'SUPER_ADMIN', 'CO_FOUNDER'].includes(senderRole) || 
      senderPos.includes('ceo') || senderPos.includes('founder') || senderPos.includes('admin');
    
    const isSenderManager = senderRole === 'MANAGER' || senderRole.endsWith('_MANAGER') || senderPos.includes('manager');

    const recipientMap = new Map();
    const currentUserIdStr = String(req.user._id);
    const currentUserEmail = (req.user.email || '').toLowerCase().trim();

    [...users, ...employees, ...admins, ...salesTrials].forEach((item) => {
      if (!item || !item._id) return;
      const idStr = String(item._id);
      const emailKey = item.email ? String(item.email).toLowerCase().trim() : idStr;
      
      // Exclude self from target selection list
      if (idStr === currentUserIdStr || (currentUserEmail && emailKey === currentUserEmail)) return;

      const rawName = item.fullName || item.name || item.username || (item.email ? item.email.split('@')[0] : '') || item.employeeId || item.trialId || 'Staff Member';
      const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const role = (item.role || '').toUpperCase();
      const pos = (item.position || '').toLowerCase();
      
      const isRecipientManager = role === 'MANAGER' || role.endsWith('_MANAGER') || pos.includes('manager') || pos.includes('head') || pos.includes('lead');
      const isRecipientLeader = ['FOUNDER', 'CEO', 'ADMIN', 'SUPER_ADMIN', 'CO_FOUNDER'].includes(role) || pos.includes('ceo') || pos.includes('founder');
      const isRecipientSalesExec = role === 'SALES_EXECUTIVE' || role === 'EXECUTIVE' || role === 'EMPLOYEE' || role === 'SALES_TRIAL' || pos.includes('executive') || pos.includes('trial');

      // Enforce Role Matrix Rules:
      // 1. Founder, CEO, Admin -> Can share with ALL (Managers, Executives, Employees, Sales Trial)
      // 2. Sales Manager -> Can share with Sales Executives, Sales Trial & Employees (and Leaders)
      // 3. Sales Executive / Trial -> Can share with Sales Manager & Founder, CEO, Admin
      let isEligible = false;

      if (isSenderLeader) {
        isEligible = true; // Founder/CEO/Admin can share with everyone
      } else if (isSenderManager) {
        if (isRecipientSalesExec || isRecipientLeader || isRecipientManager) {
          isEligible = true;
        }
      } else {
        // Executive / Employee / Trial sender: share with Managers and Management/Founder/CEO/Admin
        if (isRecipientManager || isRecipientLeader) {
          isEligible = true;
        }
      }

      if (!isEligible) return;

      let category = 'EMPLOYEE';
      if (isRecipientLeader) category = 'MANAGEMENT';
      else if (isRecipientManager) category = 'MANAGER';

      if (!recipientMap.has(emailKey)) {
        recipientMap.set(emailKey, {
          _id: item._id,
          name: cleanName,
          email: item.email || '',
          department: item.department || 'SALES_TRIAL',
          position: item.position || item.role || 'Sales Trial Executive',
          role: item.role || 'SALES_TRIAL',
          employeeId: item.trialId || item.employeeId || idStr,
          category,
          isSelf: false
        });
      }
    });

    const recipients = Array.from(recipientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    return ok(res, { recipients }, 'Recipients fetched successfully', 200, req);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

/**
 * Share a file with employee(s)/manager(s) (Founder, CEO, Admin, Managers, etc.)
 */
async function shareFile(req, res) {
  try {
    const userRole = (req.user.role || '').toUpperCase();
    const userPos = (req.user.position || '').toLowerCase();
    
    const isAuthorized = [
      'ADMIN', 'FOUNDER', 'CEO', 'CO_FOUNDER', 'SUPER_ADMIN', 'MANAGER', 
      'HR_MANAGER', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'HR_EXECUTIVE', 
      'HR', 'EMPLOYEE', 'SALES_TRIAL'
    ].includes(userRole) || userPos.includes('ceo') || userPos.includes('founder') || userPos.includes('manager');

    if (!isAuthorized) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied to share files', [], req);
    }

    const { sentTo, note, department } = req.body;

    if (!sentTo) {
      return fail(res, 400, 'BAD_REQUEST', 'Recipient employee ID (sentTo) is required', [], req);
    }

    if (!req.file || !req.file.buffer) {
      return fail(res, 400, 'BAD_REQUEST', 'A file attachment is required', [], req);
    }

    // STRICT 25MB FILE SIZE CHECK
    const MAX_ALLOWED_SIZE = 25 * 1024 * 1024; // 25 MB
    if (req.file.size > MAX_ALLOWED_SIZE) {
      return fail(res, 400, 'FILE_TOO_LARGE', 'File size exceeds maximum allowed limit of 25MB', [], req);
    }

    const mongoose = require('mongoose');
    const User = require('../users/user.model');
    const Employee = require('../employee/employee.model');
    const Admin = require('../admin-auth/admin.model');
    const SalesTrialUser = require('../sales-trial/salesTrialUser.model');
    const Notification = require('../notifications/notification.model');

    // Parse recipient targets (supports single ID, array of IDs, or 'ALL', 'MANAGERS', 'EMPLOYEES')
    let targetIds = [];
    if (Array.isArray(sentTo)) {
      targetIds = sentTo;
    } else if (typeof sentTo === 'string' && sentTo.includes(',')) {
      targetIds = sentTo.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (sentTo === 'ALL' || sentTo === 'MANAGERS' || sentTo === 'EMPLOYEES') {
      const [allUsers, allEmps, allAdmins, allTrials] = await Promise.all([
        User.find({ isActive: { $ne: false } }).select('_id role position').lean(),
        Employee.find({ status: { $ne: 'INACTIVE' } }).select('_id role position').lean(),
        Admin.find({}).select('_id role position').lean(),
        SalesTrialUser.find({ status: { $ne: 'INACTIVE' } }).select('_id role position').lean()
      ]);
      const combined = [...allUsers, ...allEmps, ...allAdmins, ...allTrials];
      combined.forEach((u) => {
        const r = (u.role || '').toUpperCase();
        const p = (u.position || '').toLowerCase();
        const isMgr = r === 'MANAGER' || r.endsWith('_MANAGER') || p.includes('manager');
        if (sentTo === 'ALL') targetIds.push(u._id);
        else if (sentTo === 'MANAGERS' && isMgr) targetIds.push(u._id);
        else if (sentTo === 'EMPLOYEES' && !isMgr) targetIds.push(u._id);
      });
    } else {
      targetIds = [sentTo];
    }

    // Remove duplicates
    targetIds = Array.from(new Set(targetIds.map(id => String(id))));

    if (targetIds.length === 0) {
      return fail(res, 400, 'BAD_REQUEST', 'No valid recipient targets found', [], req);
    }

    // Upload file directly into MongoDB GridFS Bucket (once)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(req.file.originalname);
    const storedFileName = `shared-${uniqueSuffix}${ext}`;

    let gridFsFileId = null;
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'shared_files'
    });

    const uploadStream = bucket.openUploadStream(storedFileName, {
      contentType: req.file.mimetype || 'application/octet-stream'
    });

    await new Promise((resolve, reject) => {
      uploadStream.end(req.file.buffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    gridFsFileId = uploadStream.id;

    const backendBase = process.env.BACKEND_URL || (req.protocol + '://' + req.get('host'));
    const fullDownloadUrl = `${backendBase}/api/shared-files/gridfs/${gridFsFileId}`;

    const createdSharedFiles = [];
    const senderName = req.user.fullName || req.user.name || 'Executive';

    // Create SharedFile entry & Notification for each target recipient
    for (const recipientId of targetIds) {
      let resolvedRecipientId = recipientId;
      if (mongoose.isValidObjectId(recipientId)) {
        const recipientQuery = { $or: [{ _id: recipientId }, { _id: new mongoose.Types.ObjectId(recipientId) }] };
        const empRec = await Employee.findOne(recipientQuery);
        const userRec = await User.findOne(recipientQuery);
        const trialRec = await SalesTrialUser.findOne(recipientQuery);
        const adminRec = await Admin.findOne(recipientQuery);
        const matched = empRec || userRec || trialRec || adminRec;
        if (matched) resolvedRecipientId = matched._id;
      }

      const sharedFileDoc = await SharedFile.create({
        fileName: storedFileName,
        originalName: req.file.originalname,
        fileUrl: fullDownloadUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        gridFsFileId: gridFsFileId,
        sentBy: req.user._id,
        sentTo: resolvedRecipientId,
        department: department || req.user.department || 'GENERAL',
        note: note || ''
      });

      createdSharedFiles.push(sharedFileDoc);

      // Create in-app notification for recipient with clickable link
      try {
        await Notification.create({
          targetUserId: resolvedRecipientId,
          message: `📁 ${senderName} shared a file with you: "${req.file.originalname}"`,
          type: 'FILE_SHARED',
          metadata: {
            sharedFileId: sharedFileDoc._id,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            sentBy: req.user._id,
            senderName,
            note: note || '',
            link: '/crm/shared-files'
          }
        });
      } catch (nErr) {
        console.warn('Notification creation failed for recipient:', resolvedRecipientId, nErr.message);
      }

      // Real-time socket notification
      try {
        socketService.emitToEmployee(String(resolvedRecipientId), 'file_shared', {
          message: `📁 ${senderName} shared a file with you: "${req.file.originalname}"`,
          file: sharedFileDoc,
          sharedFileId: sharedFileDoc._id,
          senderName
        });
      } catch (sErr) {
        console.warn('Socket notification failed:', sErr.message);
      }
    }

    return ok(res, { sharedFiles: createdSharedFiles, count: createdSharedFiles.length }, `File successfully shared with ${createdSharedFiles.length} recipient(s)`, 201, req);
  } catch (error) {
    console.error('Error sharing file to GridFS:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

/**
 * Get shared files (received by or sent by the logged-in user)
 */
async function getSharedFiles(req, res) {
  try {
    const mongoose = require('mongoose');
    const User = require('../users/user.model');
    const Employee = require('../employee/employee.model');
    const Admin = require('../admin-auth/admin.model');
    const SalesTrialUser = require('../sales-trial/salesTrialUser.model');

    const idStrings = new Set();
    if (req.user._id) idStrings.add(String(req.user._id));
    if (req.user.email) {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp && emp._id) idStrings.add(String(emp._id));
      const userDoc = await User.findOne({ email: req.user.email });
      if (userDoc && userDoc._id) idStrings.add(String(userDoc._id));
      const trialDoc = await SalesTrialUser.findOne({ email: req.user.email });
      if (trialDoc && trialDoc._id) idStrings.add(String(trialDoc._id));
    }

    const matchConditions = [];
    idStrings.forEach((idStr) => {
      matchConditions.push(idStr);
      if (mongoose.isValidObjectId(idStr)) {
        matchConditions.push(new mongoose.Types.ObjectId(idStr));
      }
    });

    const { direction } = req.query; // 'received' | 'sent' | undefined (both)
    const isManagerOrAdmin = ['ADMIN', 'MANAGER', 'HR'].includes(req.user.role) || 
      (req.user.role && req.user.role.endsWith('_MANAGER')) || 
      (req.user.role && req.user.role.toLowerCase().includes('manager'));

    let query = {};

    if (direction === 'sent') {
      query.sentBy = { $in: matchConditions };
    } else if (direction === 'received') {
      query.sentTo = { $in: matchConditions };
    } else if (!isManagerOrAdmin) {
      query.$or = [
        { sentBy: { $in: matchConditions } },
        { sentTo: { $in: matchConditions } }
      ];
    }

    const rawFiles = await SharedFile.find(query).lean().sort({ createdAt: -1 });

    const populatedFiles = await Promise.all(
      rawFiles.map(async (fileObj) => {
        // 1. Resolve sentBy
        const sentById = fileObj.sentBy?._id || fileObj.sentBy;
        if (sentById) {
          const userSender = await User.findById(sentById).select('fullName name email department position role');
          const empSender = await Employee.findById(sentById).select('name fullName email department position role');
          const adminSender = await Admin.findById(sentById).select('fullName name email department position role');
          const trialSender = await SalesTrialUser.findById(sentById).select('fullName name email department position role');
          const sender = userSender || empSender || adminSender || trialSender;
          if (sender) {
            fileObj.sentBy = {
              _id: sender._id,
              name: sender.fullName || sender.name || (sender.email ? sender.email.split('@')[0] : 'Executive'),
              fullName: sender.fullName || sender.name || (sender.email ? sender.email.split('@')[0] : 'Executive'),
              role: sender.role || sender.position || 'MANAGER',
              department: sender.department || 'MANAGEMENT'
            };
          } else {
            fileObj.sentBy = {
              _id: sentById,
              name: 'Executive',
              fullName: 'Executive',
              role: 'EXECUTIVE',
              department: 'GENERAL'
            };
          }
        }

        // 2. Resolve sentTo
        const sentToId = fileObj.sentTo?._id || fileObj.sentTo;
        if (sentToId) {
          const userRecipient = await User.findById(sentToId).select('fullName name email department position role');
          const empRecipient = await Employee.findById(sentToId).select('name fullName email department position role');
          const adminRecipient = await Admin.findById(sentToId).select('fullName name email department position role');
          const trialRecipient = await SalesTrialUser.findById(sentToId).select('fullName name email department position role');
          const recipient = userRecipient || empRecipient || adminRecipient || trialRecipient;
          if (recipient) {
            fileObj.sentTo = {
              _id: recipient._id,
              name: recipient.fullName || recipient.name || (recipient.email ? recipient.email.split('@')[0] : 'Staff'),
              fullName: recipient.fullName || recipient.name || (recipient.email ? recipient.email.split('@')[0] : 'Staff'),
              role: recipient.role || recipient.position || 'EXECUTIVE',
              department: recipient.department || 'GENERAL'
            };
          } else {
            fileObj.sentTo = {
              _id: sentToId,
              name: 'Recipient',
              fullName: 'Recipient',
              role: 'EXECUTIVE',
              department: 'GENERAL'
            };
          }
        }

        return fileObj;
      })
    );

    return ok(res, { files: populatedFiles }, 'Shared files retrieved successfully', 200, req);
  } catch (error) {
    console.error('Error getting shared files:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

/**
 * Download a shared file (only sender or recipient)
 */
async function downloadFile(req, res) {
  try {
    const { id } = req.params;
    const userId = String(req.user._id);

    const sharedFile = await SharedFile.findById(id);
    if (!sharedFile) {
      return fail(res, 404, 'NOT_FOUND', 'Shared file not found', [], req);
    }

    const isManagerOrAdmin = ['ADMIN', 'MANAGER', 'HR'].includes(req.user.role) || 
      (req.user.role && req.user.role.endsWith('_MANAGER')) || 
      (req.user.role && req.user.role.toLowerCase().includes('manager'));

    const emp = await Employee.findOne({ email: req.user.email });
    const myIds = [String(req.user._id)];
    if (emp) myIds.push(String(emp._id));

    const sentById = String(sharedFile.sentBy?._id || sharedFile.sentBy);
    const sentToId = String(sharedFile.sentTo?._id || sharedFile.sentTo);

    const isSender = myIds.includes(sentById);
    const isRecipient = myIds.includes(sentToId);

    if (!isSender && !isRecipient && !isManagerOrAdmin) {
      return fail(res, 403, 'FORBIDDEN', 'You are not authorized to download this file', [], req);
    }

    // Mark as downloaded if recipient is downloading
    if (isRecipient && !sharedFile.downloadedAt) {
      sharedFile.downloadedAt = new Date();
      await sharedFile.save();
    }

    // Notify Admin & Founder on download
    const isManagementRole = ['ADMIN', 'FOUNDER', 'SUPER_ADMIN', 'CO_FOUNDER'].includes((req.user.role || '').toUpperCase());
    if (!isManagementRole) {
      try {
        const Notification = require('../notifications/notification.model');
        const { recordAudit } = require('../security-audit/auditLog.service');
        const alertMsg = `🚨 Security Alert: ${req.user.fullName || req.user.name || 'User'} (${req.user.role}) downloaded file "${sharedFile.originalName}"`;
        
        await Notification.create({
          targetRole: 'ADMIN',
          message: alertMsg,
          type: 'SECURITY_ALERT',
          metadata: {
            downloadedBy: req.user._id,
            userName: req.user.fullName || req.user.name,
            userRole: req.user.role,
            fileName: sharedFile.originalName,
            ipAddress: req.ip
          }
        });

        await recordAudit({
          actorId: req.user._id,
          actionType: 'DOCUMENT_DOWNLOADED',
          entityType: 'SHARED_FILE',
          entityId: sharedFile._id.toString(),
          severity: 'HIGH',
          ipAddress: req.ip,
          metadata: { fileName: sharedFile.originalName, downloadedBy: req.user.fullName || req.user.name, role: req.user.role }
        });

        if (socketService.io) {
          socketService.io.emit('security_alert', {
            message: alertMsg,
            type: 'SECURITY_ALERT',
            downloadedBy: req.user.fullName || req.user.name,
            fileName: sharedFile.originalName,
            createdAt: new Date()
          });
        }
      } catch (notifErr) {
        console.error('Error notifying admin on shared file download:', notifErr.message);
      }
    }

    res.setHeader('Content-Disposition', `attachment; filename="${sharedFile.originalName}"`);
    res.setHeader('Content-Type', sharedFile.mimeType || 'application/octet-stream');

    const mongoose = require('mongoose');

    // 1. Download directly from MongoDB GridFS if stored in DB
    if (sharedFile.gridFsFileId) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'shared_files'
      });
      const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(sharedFile.gridFsFileId));
      downloadStream.on('error', (err) => {
        console.error('GridFS stream error:', err);
        if (!res.headersSent) {
          fail(res, 404, 'NOT_FOUND', 'File chunk not found in database', [], req);
        }
      });
      return downloadStream.pipe(res);
    }

    // 2. Fallback to Disk for legacy uploaded files
    let filePath = path.resolve(sharedFile.fileUrl);

    if (!fs.existsSync(filePath)) {
      const fileName = path.basename(sharedFile.fileUrl);
      const uploadsFallback = path.join(__dirname, '../../../uploads/shared-files', fileName);
      const filesFallback = path.join(process.cwd(), 'files', fileName);

      if (fs.existsSync(uploadsFallback)) {
        filePath = uploadsFallback;
      } else if (fs.existsSync(filesFallback)) {
        filePath = filesFallback;
      } else {
        return fail(res, 404, 'NOT_FOUND', 'File not found on server disk', [], req);
      }
    }

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading shared file:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

/**
 * Delete a shared file (only sender or admin)
 */
async function deleteSharedFile(req, res) {
  try {
    const { id } = req.params;
    const sharedFile = await SharedFile.findById(id);
    if (!sharedFile) {
      return fail(res, 404, 'NOT_FOUND', 'Shared file not found', [], req);
    }

    const isManagerOrAdmin = ['ADMIN', 'MANAGER', 'HR'].includes(req.user.role) || 
      (req.user.role && req.user.role.endsWith('_MANAGER')) || 
      (req.user.role && req.user.role.toLowerCase().includes('manager'));

    const emp = await Employee.findOne({ email: req.user.email });
    const myIds = [String(req.user._id)];
    if (emp) myIds.push(String(emp._id));

    const isSender = myIds.includes(String(sharedFile.sentBy));
    const isRecipient = myIds.includes(String(sharedFile.sentTo));

    if (!isSender && !isRecipient && !isManagerOrAdmin) {
      return fail(res, 403, 'FORBIDDEN', 'Only the sender, recipient, or manager/admin can delete shared files', [], req);
    }

    const mongoose = require('mongoose');

    // Remove from MongoDB GridFS Bucket if present
    if (sharedFile.gridFsFileId) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: 'shared_files'
        });
        await bucket.delete(new mongoose.Types.ObjectId(sharedFile.gridFsFileId));
      } catch (gridErr) {
        console.warn('Could not remove file from GridFS:', gridErr.message);
      }
    }

    // Remove file from disk if legacy file exists
    try {
      if (sharedFile.fileUrl) {
        const filePath = path.resolve(sharedFile.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (e) {
      console.warn('Could not remove file from disk:', e.message);
    }

    await SharedFile.findByIdAndDelete(id);

    return ok(res, {}, 'Shared file deleted successfully', 200, req);
  } catch (error) {
    console.error('Error deleting shared file:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

/**
 * Stream file directly from MongoDB GridFS by GridFS File ID or SharedFile Document ID
 */
async function downloadGridFSFileDirect(req, res) {
  try {
    const targetId = req.params.gridFsFileId || req.params.id;
    const mongoose = require('mongoose');

    if (!targetId || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid File ID' });
    }

    const objId = new mongoose.Types.ObjectId(targetId);

    // 1. Try finding by SharedFile document ID first if passed
    const sharedFileDoc = await SharedFile.findById(objId);
    let targetGridId = objId;
    let originalName = sharedFileDoc?.originalName || 'downloaded-file';
    let mimeType = sharedFileDoc?.mimeType || 'application/octet-stream';

    if (sharedFileDoc && sharedFileDoc.gridFsFileId) {
      targetGridId = new mongoose.Types.ObjectId(sharedFileDoc.gridFsFileId);
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'shared_files'
    });

    // Check if chunk exists in GridFS
    const filesCount = await mongoose.connection.db.collection('shared_files.files').countDocuments({ _id: targetGridId });
    if (filesCount === 0) {
      // Fallback check for disk files
      if (sharedFileDoc && sharedFileDoc.fileUrl) {
        let filePath = path.resolve(sharedFileDoc.fileUrl);
        if (!fs.existsSync(filePath)) {
          const fileName = path.basename(sharedFileDoc.fileUrl);
          const uploadsFallback = path.join(__dirname, '../../../uploads/shared-files', fileName);
          const filesFallback = path.join(process.cwd(), 'files', fileName);
          if (fs.existsSync(uploadsFallback)) filePath = uploadsFallback;
          else if (fs.existsSync(filesFallback)) filePath = filesFallback;
        }
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
          res.setHeader('Content-Type', mimeType);
          return fs.createReadStream(filePath).pipe(res);
        }
      }
      return res.status(404).json({ success: false, message: 'File not found in database' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.setHeader('Content-Type', mimeType);

    const downloadStream = bucket.openDownloadStream(targetGridId);
    downloadStream.on('error', (err) => {
      console.error('GridFS stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error streaming file from database' });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error('Error downloading direct GridFS file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getRecipients,
  shareFile,
  getSharedFiles,
  downloadFile,
  downloadGridFSFileDirect,
  deleteSharedFile
};
