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

    // Verify recipient exists
    const mongoose = require('mongoose');
    const recipientIdQuery = mongoose.isValidObjectId(sentTo)
      ? { $or: [{ _id: sentTo }, { _id: new mongoose.Types.ObjectId(sentTo) }] }
      : { _id: sentTo };
    const recipient = await Employee.findOne(recipientIdQuery);
    if (!recipient) {
      return fail(res, 404, 'NOT_FOUND', 'Recipient employee not found', [], req);
    }

    const sharedFile = await SharedFile.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: req.file.path.replace(/\\/g, '/'),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      sentBy: req.user._id,
      sentTo: recipient._id,
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
    const userIds = [req.user._id];
    const emp = await Employee.findOne({ email: req.user.email });
    if (emp && String(emp._id) !== String(req.user._id)) {
      userIds.push(emp._id);
    }

    const { direction } = req.query; // 'received' | 'sent' | undefined (both)

    let query = {};

    if (direction === 'sent') {
      query.sentBy = { $in: userIds };
    } else if (direction === 'received') {
      query.sentTo = { $in: userIds };
    } else {
      // Default: show files relevant to this user (sent or received)
      query.$or = [
        { sentBy: { $in: userIds } },
        { sentTo: { $in: userIds } }
      ];
    }

    const files = await SharedFile.find(query)
      .populate('sentBy', 'name email department position role')
      .populate('sentTo', 'name email department position role')
      .sort({ createdAt: -1 });

    return ok(res, { files }, 'Shared files retrieved successfully', 200, req);
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
    const userId = String(req.user._id);

    const sharedFile = await SharedFile.findById(id);
    if (!sharedFile) {
      return fail(res, 404, 'NOT_FOUND', 'Shared file not found', [], req);
    }

    const isSender = String(sharedFile.sentBy) === userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isSender && !isAdmin) {
      return fail(res, 403, 'FORBIDDEN', 'Only the sender or admin can delete shared files', [], req);
    }

    // Remove file from disk
    const filePath = path.resolve(sharedFile.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
