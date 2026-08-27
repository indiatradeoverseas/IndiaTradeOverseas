const path = require('path');
const fs = require('fs');
const SharedFile = require('./sharedFile.model');
const Employee = require('../employee/employee.model');
const socketService = require('../../services/socket.service');
const { ok, fail } = require('../../utils/response');

/**
 * Share a file with an executive (Manager/Admin only)
 */
async function shareFile(req, res) {
  try {
    const allowedRoles = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'HR_EXECUTIVE', 'HR', 'EMPLOYEE'];
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied to share files', [], req);
    }

    const { sentTo, note, department } = req.body;

    if (!sentTo) {
      return fail(res, 400, 'BAD_REQUEST', 'Recipient employee ID (sentTo) is required', [], req);
    }

    if (!req.file) {
      return fail(res, 400, 'BAD_REQUEST', 'A file attachment is required', [], req);
    }

    // Verify recipient exists across Employee and User collections
    const mongoose = require('mongoose');
    const User = require('../users/user.model');
    
    let recipientId = sentTo;
    if (mongoose.isValidObjectId(sentTo)) {
      const recipientIdQuery = { $or: [{ _id: sentTo }, { _id: new mongoose.Types.ObjectId(sentTo) }] };
      const empRecipient = await Employee.findOne(recipientIdQuery);
      const userRecipient = await User.findOne(recipientIdQuery);
      const matchedRecipient = empRecipient || userRecipient;
      if (matchedRecipient) {
        recipientId = matchedRecipient._id;
      }
    }

    const sharedFile = await SharedFile.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: req.file.path.replace(/\\/g, '/'),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      sentBy: req.user._id,
      sentTo: recipientId,
      department: department || req.user.department || 'GENERAL',
      note: note || ''
    });

    await sharedFile.populate('sentBy', 'name email department position role');
    await sharedFile.populate('sentTo', 'name email department position role');

    // Real-time notification to recipient
    socketService.emitToEmployee(sentTo, 'file_shared', {
      message: `${req.user.name || 'Manager'} shared a file: ${req.file.originalname}`,
      file: sharedFile
    });

    return ok(res, { sharedFile }, 'File shared successfully', 201, req);
  } catch (error) {
    console.error('Error sharing file:', error);
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

    const idStrings = new Set();
    if (req.user._id) idStrings.add(String(req.user._id));
    if (req.user.email) {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp && emp._id) idStrings.add(String(emp._id));
      const userDoc = await User.findOne({ email: req.user.email });
      if (userDoc && userDoc._id) idStrings.add(String(userDoc._id));
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
          const sender = userSender || empSender;
          if (sender) {
            fileObj.sentBy = {
              _id: sender._id,
              name: sender.fullName || sender.name,
              fullName: sender.fullName || sender.name,
              role: sender.role || 'SALES_EXECUTIVE',
              department: sender.department || 'SALES'
            };
          } else {
            fileObj.sentBy = {
              _id: sentById,
              name: 'Executive',
              fullName: 'Executive',
              role: 'SALES_EXECUTIVE',
              department: 'SALES'
            };
          }
        }

        // 2. Resolve sentTo
        const sentToId = fileObj.sentTo?._id || fileObj.sentTo;
        if (sentToId) {
          const userRecipient = await User.findById(sentToId).select('fullName name email department position role');
          const empRecipient = await Employee.findById(sentToId).select('name fullName email department position role');
          const recipient = userRecipient || empRecipient;
          if (recipient) {
            fileObj.sentTo = {
              _id: recipient._id,
              name: recipient.fullName || recipient.name,
              fullName: recipient.fullName || recipient.name,
              role: recipient.role || 'EXECUTIVE',
              department: recipient.department || 'SALES'
            };
          } else {
            fileObj.sentTo = {
              _id: sentToId,
              name: 'Recipient',
              fullName: 'Recipient',
              role: 'EXECUTIVE',
              department: 'SALES'
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

    const isSender = String(sharedFile.sentBy) === userId;
    const isRecipient = String(sharedFile.sentTo) === userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isSender && !isRecipient && !isAdmin) {
      return fail(res, 403, 'FORBIDDEN', 'You are not authorized to download this file', [], req);
    }

    // Mark as downloaded if recipient is downloading
    if (isRecipient && !sharedFile.downloadedAt) {
      sharedFile.downloadedAt = new Date();
      await sharedFile.save();
    }

    const filePath = path.resolve(sharedFile.fileUrl);

    if (!fs.existsSync(filePath)) {
      return fail(res, 404, 'NOT_FOUND', 'File not found on server disk', [], req);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${sharedFile.originalName}"`);
    res.setHeader('Content-Type', sharedFile.mimeType || 'application/octet-stream');

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

    // Remove file from disk
    try {
      const filePath = path.resolve(sharedFile.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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

module.exports = {
  shareFile,
  getSharedFiles,
  downloadFile,
  deleteSharedFile
};
