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

    if (!req.file || !req.file.buffer) {
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

    // Upload file directly into MongoDB GridFS Bucket
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

    const sharedFile = await SharedFile.create({
      fileName: storedFileName,
      originalName: req.file.originalname,
      fileUrl: fullDownloadUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      gridFsFileId: gridFsFileId,
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

    return ok(res, { sharedFile }, 'File shared and stored in Database successfully', 201, req);
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
  shareFile,
  getSharedFiles,
  downloadFile,
  downloadGridFSFileDirect,
  deleteSharedFile
};
