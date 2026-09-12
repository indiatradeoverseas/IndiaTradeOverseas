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

async function uploadDoc({ ownerType, ownerId, accessLevel = 'RESTRICTED', file, user, exportDocType = 'OTHER' }) {
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
    exportDocType,
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

async function createNewVersion({ originalId, file, user }) {
  const original = await Document.findById(originalId);
  if (!original || original.isDeleted) {
    throw new Error('DOCUMENT_NOT_FOUND');
  }

  const isOwner = original.uploadedBy && original.uploadedBy.toString() === user._id.toString();
  if (!(user.role === 'ADMIN' || user.role === 'MANAGER' || isOwner)) {
    throw new Error('OWNERSHIP_FORBIDDEN');
  }

  validateFileType(file.originalname);

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('LIMIT_FILE_SIZE: File size exceeds the maximum limit of 10MB.');
  }

  const fileBuffer = fs.readFileSync(file.path);
  const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const newDoc = await Document.create({
    ownerType: original.ownerType,
    ownerId: original.ownerId,
    fileName: file.originalname,
    mimeType: file.mimetype,
    storagePath: file.path,
    fileData: fileBuffer,
    uploadedBy: user._id,
    accessLevel: original.accessLevel,
    exportDocType: original.exportDocType,
    checksum,
    virusScanStatus: 'CLEAN',
    version: original.version + 1,
    previousVersionId: original._id,
    approvalStatus: 'PENDING'
  });

  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  await recordAudit({
    actorId: user._id,
    actionType: 'DOCUMENT_NEW_VERSION',
    entityType: 'DOCUMENT',
    entityId: newDoc._id.toString(),
    severity: 'LOW',
    metadata: { previousVersionId: original._id.toString(), version: newDoc.version, fileName: newDoc.fileName }
  });

  return newDoc;
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
  const mongoose = require('mongoose');

  if (doc.ownerType === 'LEAD') {
    const ownerIdVal = doc.ownerId ? (doc.ownerId._id || doc.ownerId) : null;
    if (!ownerIdVal || !mongoose.Types.ObjectId.isValid(ownerIdVal)) return false;
    const lead = await Lead.findById(ownerIdVal);
    if (!lead) return false;
    return canAccessLead(user, lead);
  }

  if (doc.ownerType === 'QUOTATION') {
    const ownerIdVal = doc.ownerId ? (doc.ownerId._id || doc.ownerId) : null;
    if (!ownerIdVal || !mongoose.Types.ObjectId.isValid(ownerIdVal)) return false;
    const Quotation = require('../quotations/quotation.model');
    const quotation = await Quotation.findById(ownerIdVal);
    if (!quotation) return false;
    const lead = await Lead.findById(quotation.leadId);
    if (!lead) return false;
    return canAccessLead(user, lead);
  }

  if (doc.ownerType === 'DISPATCH') {
    const ownerIdVal = doc.ownerId ? (doc.ownerId._id || doc.ownerId) : null;
    if (!ownerIdVal || !mongoose.Types.ObjectId.isValid(ownerIdVal)) return false;
    const Dispatch = require('../dispatch/dispatch.model');
    const dispatch = await Dispatch.findById(ownerIdVal);
    if (!dispatch) return false;
    const lead = await Lead.findById(dispatch.leadId);
    if (!lead) return false;
    return canAccessLead(user, lead);
  }

  if (doc.ownerType === 'USER') {
    if (!doc.ownerId || !user?._id) return true;
    const ownerIdStr = String(doc.ownerId._id || doc.ownerId);
    const userIdStr = String(user._id);
    const empDbIdStr = user.employeeDbId ? String(user.employeeDbId) : '';
    if (ownerIdStr === userIdStr || (empDbIdStr && ownerIdStr === empDbIdStr)) return true;

    const userRole = (user.role || '').toUpperCase();
    const userDept = (user.department || '').toUpperCase();
    if (['ADMIN', 'MANAGER', 'HR', 'HR_MANAGER', 'TRANSPORT', 'SALES'].includes(userRole) || userDept === 'HR') {
      return true;
    }
  }

  return true;
}

async function getDocumentsForUser(user) {
  const mongoose = require('mongoose');
  const docs = await Document.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  // 1. Collect LEAD owner IDs
  const leadIds = docs
    .filter(d => d.ownerType === 'LEAD' && d.ownerId)
    .map(d => String(d.ownerId._id || d.ownerId))
    .filter(Boolean);

  let leadMap = new Map();
  if (leadIds.length > 0) {
    const validLeadObjIds = leadIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
    const leads = await Lead.find({
      $or: [
        { _id: { $in: validLeadObjIds } },
        { _id: { $in: leadIds } }
      ]
    }).select('_id customerName companyName leadCode').lean();
    leads.forEach(l => {
      leadMap.set(String(l._id), l);
    });
  }

  // 2. Collect ALL potential user/employee person IDs (from ownerId and uploadedBy)
  const personQueryIds = new Set();
  const personQueryStrings = new Set();

  docs.forEach(d => {
    // Collect from ownerId
    if (d.ownerId) {
      const val = typeof d.ownerId === 'object' ? String(d.ownerId._id || '') : String(d.ownerId);
      if (val && val !== 'null' && val !== 'undefined') {
        personQueryStrings.add(val);
        if (mongoose.Types.ObjectId.isValid(val)) {
          personQueryIds.add(new mongoose.Types.ObjectId(val));
        }
      }
    }
    // Collect from uploadedBy
    if (d.uploadedBy) {
      const val = typeof d.uploadedBy === 'object' ? String(d.uploadedBy._id || '') : String(d.uploadedBy);
      if (val && val !== 'null' && val !== 'undefined') {
        personQueryStrings.add(val);
        if (mongoose.Types.ObjectId.isValid(val)) {
          personQueryIds.add(new mongoose.Types.ObjectId(val));
        }
      }
    }
  });

  let personMap = new Map();
  if (personQueryStrings.size > 0) {
    try {
      const User = require('../users/user.model');
      const Employee = require('../employee/employee.model');

      const objIdArray = Array.from(personQueryIds);
      const strArray = Array.from(personQueryStrings);

      const orConditions = [
        { _id: { $in: strArray } },
        { employeeId: { $in: strArray } },
        { email: { $in: strArray } }
      ];
      if (objIdArray.length > 0) {
        orConditions.push({ _id: { $in: objIdArray } });
      }

      const [usersFound, empsFound] = await Promise.all([
        User.find({ $or: orConditions }).select('_id employeeId fullName name email role').lean(),
        Employee.find({ $or: orConditions }).select('_id employeeId fullName name email role position').lean()
      ]);

      const addPersonToMap = (p) => {
        const personObj = {
          _id: p._id,
          fullName: p.fullName || p.name || 'Employee Account',
          name: p.fullName || p.name || 'Employee Account',
          email: p.email || '',
          role: p.role || p.position || ''
        };
        if (p._id) {
          personMap.set(String(p._id), personObj);
        }
        if (p.employeeId) {
          personMap.set(String(p.employeeId), personObj);
        }
        if (p.email) {
          personMap.set(String(p.email).toLowerCase(), personObj);
        }
      };

      usersFound.forEach(addPersonToMap);
      empsFound.forEach(addPersonToMap);
    } catch (err) {
      console.error('Error populating document user/employee owner names:', err);
    }
  }

  // Helper to extract employee name from fileName if database person lookup yields nothing
  const extractNameFromFileName = (fileName) => {
    if (!fileName) return null;
    const base = fileName.replace(/\.[^/.]+$/, '');
    const parts = base.split('-').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 1].replace(/\(\d+\)$/, '').trim();
      if (candidate && candidate.length > 2 && !/^\d+$/.test(candidate) && !/pdf|doc|docx|jpg|png/i.test(candidate)) {
        return candidate;
      }
    }
    return null;
  };

  // 3. Attach populated objects back to docs
  docs.forEach(doc => {
    // Populate uploadedBy
    if (doc.uploadedBy) {
      const idStr = typeof doc.uploadedBy === 'object' ? String(doc.uploadedBy._id || '') : String(doc.uploadedBy);
      if (personMap.has(idStr)) {
        doc.uploadedBy = personMap.get(idStr);
      } else if (personMap.has(idStr.toLowerCase())) {
        doc.uploadedBy = personMap.get(idStr.toLowerCase());
      }
    }

    // Populate ownerId
    if (doc.ownerType === 'LEAD' && doc.ownerId) {
      const idStr = typeof doc.ownerId === 'object' ? String(doc.ownerId._id || '') : String(doc.ownerId);
      if (leadMap.has(idStr)) {
        doc.ownerId = leadMap.get(idStr);
      }
    } else if (doc.ownerType === 'USER' && doc.ownerId) {
      const idStr = typeof doc.ownerId === 'object' ? String(doc.ownerId._id || '') : String(doc.ownerId);
      if (personMap.has(idStr)) {
        doc.ownerId = personMap.get(idStr);
      } else if (personMap.has(idStr.toLowerCase())) {
        doc.ownerId = personMap.get(idStr.toLowerCase());
      } else if (doc.uploadedBy && typeof doc.uploadedBy === 'object' && (doc.uploadedBy.fullName || doc.uploadedBy.name)) {
        doc.ownerId = doc.uploadedBy;
      } else {
        const extracted = extractNameFromFileName(doc.fileName);
        if (extracted) {
          doc.ownerId = { fullName: extracted, name: extracted };
        }
      }
    }
  });

  // 4. Merge Employee uploadedDocuments from Employee collection
  try {
    const Employee = require('../employee/employee.model');
    const empsWithDocs = await Employee.find({ 'uploadedDocuments.0': { $exists: true } }).lean();
    
    const existingDocKeys = new Set(docs.map(d => String(d._id || d.fileName)));
    
    empsWithDocs.forEach(emp => {
      if (emp.uploadedDocuments && Array.isArray(emp.uploadedDocuments)) {
        emp.uploadedDocuments.forEach(empDoc => {
          const key = String(empDoc._id || empDoc.fileName);
          if (!existingDocKeys.has(key)) {
            existingDocKeys.add(key);
            docs.push({
              _id: empDoc._id || `emp_doc_${Date.now()}_${Math.random()}`,
              fileName: empDoc.fileName || 'Employee Document.pdf',
              ownerType: 'USER',
              ownerId: {
                _id: emp._id,
                fullName: emp.name || emp.fullName || 'Employee Account',
                name: emp.name || emp.fullName || 'Employee Account',
                email: emp.email || ''
              },
              uploadedBy: {
                _id: emp._id,
                fullName: emp.name || emp.fullName || 'Employee Account',
                name: emp.name || emp.fullName || 'Employee Account'
              },
              accessLevel: 'HR',
              exportDocType: 'OTHER',
              approvalStatus: empDoc.approvalStatus || 'PENDING',
              createdAt: empDoc.createdAt || emp.updatedAt || new Date()
            });
          }
        });
      }
    });
  } catch (err) {
    console.error('Error fetching Employee uploadedDocuments for registry:', err);
  }

  // 5. Merge Dispatch Proof Documents (PODs / Driver Proofs) from Dispatch collection
  try {
    const Dispatch = require('../dispatch/dispatch.model');
    const dispatchesWithProofs = await Dispatch.find({
      $or: [
        { podFileUrl: { $exists: true, $ne: '' } },
        { driverProofUrl: { $exists: true, $ne: '' } },
        { paymentProofUrl: { $exists: true, $ne: '' } },
        { 'paymentProof.proofImageUrl': { $exists: true, $ne: '' } }
      ]
    }).lean();

    const existingDocKeys = new Set(docs.map(d => String(d._id || d.fileName)));

    dispatchesWithProofs.forEach(disp => {
      const proofUrl = disp.podFileUrl || disp.driverProofUrl || disp.paymentProofUrl || disp.paymentProof?.proofImageUrl;
      if (proofUrl) {
        const docName = disp.driverProofName || disp.paymentProofName || `Driver_Proof_${disp.dispatchNumber || disp.orderNumber || 'Log'}.pdf`;
        const key = `disp_proof_${disp._id}_${docName}`;
        if (!existingDocKeys.has(key)) {
          existingDocKeys.add(key);
          docs.push({
            _id: key,
            fileName: docName,
            ownerType: 'USER',
            ownerId: {
              fullName: disp.driverName || 'Driver Account',
              name: disp.driverName || 'Driver Account'
            },
            uploadedBy: {
              fullName: disp.driverName || 'Driver Account',
              name: disp.driverName || 'Driver Account'
            },
            accessLevel: 'TRANSPORT',
            exportDocType: 'OTHER',
            approvalStatus: 'PENDING',
            createdAt: disp.actualDeliveryDate || disp.updatedAt || disp.createdAt || new Date()
          });
        }
      }
    });
  } catch (err) {
    console.error('Error fetching Dispatch proofs for document registry:', err);
  }

  // Sort newest first
  docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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
  createNewVersion,
  checkAccess,
  getDocumentsForUser
};

