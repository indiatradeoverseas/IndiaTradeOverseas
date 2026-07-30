const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Document = require('./document.model');
const Lead = require('../leads/lead.model');
const { recordAudit } = require('../security-audit/auditLog.service');


const BLOCKED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.scr', '.msi'];

function validateFileType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new Error('BLOCKED_FILE_TYPE: Uploading executable scripts is strictly prohibited.');
  }
}

async function uploadDoc({ ownerType, ownerId, accessLevel = 'RESTRICTED', file, user }) {
  validateFileType(file.originalname);

  
  const MAX_SIZE = 10 * 1024 * 1024; 
  if (file.size > MAX_SIZE) {
    throw new Error('LIMIT_FILE_SIZE: File size exceeds the maximum limit of 10MB.');
  }

  
  const fileBuffer = fs.readFileSync(file.path);
  const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  
  const duplicate = await Document.findOne({ checksum, isDeleted: false });
  if (duplicate) {
    
    fs.unlinkSync(file.path);
    return duplicate;
  }

  const doc = await Document.create({
    ownerType,
    ownerId,
    fileName: file.originalname,
    mimeType: file.mimetype,
    storagePath: file.path,
    fileData: fileBuffer,
    uploadedBy: user ? user._id : null,
    accessLevel,
    checksum,
    virusScanStatus: 'CLEAN' 
  });

  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  await recordAudit({
    actorId: user ? user._id : null,
    actionType: 'DOCUMENT_UPLOADED',
    entityType: 'DOCUMENT',
    entityId: doc._id.toString(),
    severity: 'LOW',
    metadata: { ownerType, ownerId, fileName: doc.fileName }
  });

  return doc;
}

async function checkAccess(user, doc) {
  if (!user) return false;

  
  if (user.role === 'ADMIN' || user.role === 'MANAGER') return true;

  
  if (doc.accessLevel === 'PUBLIC') {
    return true;
  }

  
  if (doc.accessLevel === 'ADMIN') {
    return user.role === 'ADMIN';
  }

  // Dynamic access check: if the accessLevel matches the user's role or department
  if (doc.accessLevel === user.role || doc.accessLevel === user.department) {
    return true;
  }

  if (doc.ownerType === 'PAYMENT') {
    return user.role === 'ACCOUNTS';
  }

  
  const { canAccessLead } = require('../leads/lead.service');

  if (doc.ownerType === 'LEAD') {
    const lead = await Lead.findById(doc.ownerId);
    if (!lead) return false;
    return canAccessLead(user, lead);
  }

  if (doc.ownerType === 'QUOTATION') {
    const Quotation = require('../quotations/quotation.model');
    const quotation = await Quotation.findById(doc.ownerId);
    if (!quotation) return false;
    const lead = await Lead.findById(quotation.leadId);
    if (!lead) return false;
    return canAccessLead(user, lead);
  }

  if (doc.ownerType === 'DISPATCH') {
    const Dispatch = require('../dispatch/dispatch.model');
    const dispatch = await Dispatch.findById(doc.ownerId);
    if (!dispatch) return false;
    const lead = await Lead.findById(dispatch.leadId);
    if (!lead) return false;
    return canAccessLead(user, lead);
  }

  if (doc.ownerType === 'USER') {
    return doc.ownerId.toString() === user._id.toString();
  }

  return true;
}

async function getDocumentsForUser(user) {
  const docs = await Document.find({ isDeleted: false }).sort({ createdAt: -1 });

  if (!user) {
    return docs.filter((doc) => doc.accessLevel === 'PUBLIC');
  }

  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return docs;
  }

  const visibleDocs = [];
  for (const doc of docs) {
    if (await checkAccess(user, doc)) {
      visibleDocs.push(doc);
    }
  }

  return visibleDocs;
}

module.exports = {
  uploadDoc,
  checkAccess,
  getDocumentsForUser
};
