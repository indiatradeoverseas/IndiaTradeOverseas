const fs = require('fs');
const path = require('path');
const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');
const CallRecording = require('./callRecording.model');
const Employee = require('../employee/employee.model');
const { getRelativePath, resolveUploadPath, proxyFromProduction } = require('../../utils/file');
const { encryptText, hashText, hashCompanyName, maskPhone, maskEmail } = require('../../utils/crypto');
const { scoreAndClassifyLead } = require('./ai-agent/leadScoring.service');
const { ok, fail } = require('../../utils/response');


// 1. Create Lead manually with Scoring
async function createManualLead(req, res, next) {
  try {
    const {
      customerName,
      companyName,
      country,
      phone,
      whatsAppNumber,
      email,
      productCategory,
      quantity,
      destination,
      leadValue,
      assignedTo,
      source
    } = req.body;

    if (!customerName || !phone || !productCategory) {
      return fail(res, 400, 'VALIDATION_FAILED', 'customerName, phone, and productCategory are required.');
    }

    // Clean number and hash
    const cleanPhone = String(phone).replace(/\s/g, '');
    const phoneHash = hashText(cleanPhone);
    const emailHash = email ? hashText(email.trim()) : '';
    const companyNameHash = companyName ? hashCompanyName(companyName) : '';

    // Check duplicate
    const duplicateQueries = [{ phoneHash }];
    if (emailHash) duplicateQueries.push({ emailHash });
    const duplicate = await Lead.findOne({ $or: duplicateQueries });

    // Run lead scoring
    const qtyText = String(quantity || '');
    const { score, priority } = scoreAndClassifyLead({
      quantity: qtyText,
      hasLOI: false,
      paymentTerms: 'Pending',
      contactPerson: customerName,
      mobile: cleanPhone,
      email: email || '',
      chatSummary: 'Manually created lead.'
    });

    // Create unique lead code
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const leadCode = `LD-${timestamp}-${random}`;

    const lead = await Lead.create({
      leadCode,
      source: source || 'MANUAL',
      customerName,
      companyName: companyName || '',
      companyNameHash,
      phoneEncrypted: encryptText(cleanPhone),
      phoneMasked: maskPhone(cleanPhone),
      phoneHash,
      emailEncrypted: email ? encryptText(email.trim()) : '',
      emailMasked: email ? maskEmail(email.trim()) : '',
      emailHash,
      whatsAppNumber: whatsAppNumber || cleanPhone,
      country: country || '',
      productCategory,
      quantity: qtyText,
      destination: destination || '',
      leadValue: Number(leadValue || 0),
      score,
      priority,
      stage: 'NEW_LEAD',
      assignedTo: assignedTo || null,
      duplicateOf: duplicate ? duplicate._id : null,
      createdBy: req.user._id
    });

    // Log Activity
    await LeadActivity.create({
      leadId: lead._id,
      actionType: 'LEAD_CREATED',
      note: `Lead manually created by ${req.user.fullName}. Initial Score: ${score}.`,
      actorId: req.user._id
    });

    return ok(res, { lead }, 'Lead created and qualified successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

// 2. Pull due reminders
async function getDueReminders(req, res, next) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const filter = {
      nextFollowupAt: { $gte: today, $lte: tomorrow }
    };

    // Filter by ownership if not Admin/Manager/HR
    const isManagerOrAdmin = ['ADMIN', 'MANAGER', 'HR'].includes(req.user.role) || req.user.role.endsWith('_MANAGER') || req.user.role.toLowerCase().includes('manager');
    if (!isManagerOrAdmin) {
      filter.assignedTo = req.user._id;
    }

    const leads = await Lead.find(filter)
      .sort({ nextFollowupAt: 1 })
      .select('leadCode customerName productCategory nextFollowupAt stage priority');

    return ok(res, { reminders: leads }, 'Due reminders list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

// 3. Upload Voice Note (Audio clip)
async function uploadVoiceNote(req, res, next) {
  try {
    const { id } = req.params;
    if (!req.file) {
      return fail(res, 400, 'FILE_REQUIRED', 'Please upload a voice note recording.');
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Lead not found.');
    }

    const voiceNoteObj = {
      path: getRelativePath(req.file.path),
      originalName: req.file.originalname,
      uploadedBy: req.user._id,
      createdAt: new Date()
    };

    lead.voiceNotes.push(voiceNoteObj);
    await lead.save();

    // Log activity
    await LeadActivity.create({
      leadId: lead._id,
      actionType: 'VOICE_NOTE_ADDED',
      note: `Added a voice note memo: "${req.file.originalname}"`,
      actorId: req.user._id
    });

    return ok(res, { voiceNotes: lead.voiceNotes }, 'Voice note attached successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 4. Stream / Download Voice Note
async function streamVoiceNote(req, res, next) {
  try {
    const { id, index } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Lead not found.');
    }

    const voiceNote = lead.voiceNotes[Number(index)];
    if (!voiceNote || !voiceNote.path) {
      return fail(res, 404, 'NOT_FOUND', 'Voice note not found at this index.');
    }

    const filePath = resolveUploadPath(voiceNote.path, 'voice_notes');
    if (!filePath || !fs.existsSync(filePath)) {
      // Fallback: proxy from production in development mode
      try {
        const prodUrl = `https://indiatradeoverseas-ito.onrender.com/api/leads/${id}/voice-note/${index}`;
        await proxyFromProduction(prodUrl, req.headers.authorization, res);
        return;
      } catch (proxyError) {
        console.warn(`Local voice note missing, and production proxy failed: ${proxyError.message}`);
      }
      return fail(res, 404, 'FILE_NOT_FOUND', 'Voice note audio file not found on disk.');
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
}

// 5b. Log a generic activity (call/email/meeting/follow-up/note)
async function addActivity(req, res, next) {
  try {
    const { id } = req.params;
    const { actionType, note, nextFollowupAt } = req.body;

    if (!actionType || !note) {
      return fail(res, 400, 'VALIDATION_FAILED', 'actionType and note are required.');
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Lead not found.');
    }

    if (nextFollowupAt) {
      lead.nextFollowupAt = new Date(nextFollowupAt);
      await lead.save();
    }

    const activity = await LeadActivity.create({
      leadId: lead._id,
      actionType,
      note,
      nextFollowupAt: nextFollowupAt || null,
      actorId: req.user._id,
      metadata: {
        performedByName: req.user.fullName || req.user.name || req.user.email || 'User',
        performedByRole: req.user.role || 'USER'
      }
    });

    return ok(res, { activity }, 'Activity logged successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

// 5. Log WhatsApp Sent Activity
async function logWhatsAppActivity(req, res, next) {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Lead not found.');
    }

    await LeadActivity.create({
      leadId: lead._id,
      actionType: 'WHATSAPP_SENT',
      note: message || 'Sent quick template message via WhatsApp.',
      actorId: req.user._id
    });

    return ok(res, {}, 'WhatsApp activity logged successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 6. Send Email & Log Activity
async function logEmailActivity(req, res, next) {
  try {
    const { id } = req.params;
    const { subject, body } = req.body;

    if (!subject || !body) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Subject and Body are required to send email.');
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Lead not found.');
    }

    const { sendEmail } = require('../../utils/mailer');
    const { decryptText } = require('../../utils/crypto');
    const decryptedEmail = lead.emailEncrypted ? decryptText(lead.emailEncrypted) : '';

    let emailSentSuccessfully = false;
    if (decryptedEmail) {
      try {
        await sendEmail(decryptedEmail, subject, body, `<p>${body.replace(/\n/g, '<br/>')}</p>`);
        emailSentSuccessfully = true;
      } catch (err) {
        console.warn('Mail send failed, falling back to database activity logger only:', err.message);
      }
    }


    await LeadActivity.create({
      leadId: lead._id,
      actionType: 'EMAIL_SENT',
      note: `Email Sent: "${subject}"\n---\n${body}`,
      actorId: req.user._id,
      metadata: { subject, body, sentLive: emailSentSuccessfully }
    });

    return ok(res, { sentLive: emailSentSuccessfully }, 'Email logged and recorded under activity timeline', 200, req);
  } catch (error) {
    next(error);
  }
}
// Add to leadManagement.controller.js
async function getSalesMetrics(req, res, next) {
  try {
    const filter = {};
    const isManagerOrAdmin = ['ADMIN', 'MANAGER', 'HR'].includes(req.user.role) || req.user.role.endsWith('_MANAGER') || req.user.role.toLowerCase().includes('manager');
    if (!isManagerOrAdmin) {
      filter.assignedTo = req.user._id;
    }

    const stats = await Lead.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalLeads: { $sum: 1 },
          totalValuation: { $sum: "$leadValue" },
          wonDeals: {
            $sum: {
              $cond: [{ $in: ["$stage", ["CLOSED_WON", "DEAL_WON"]] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || { totalLeads: 0, totalValuation: 0, wonDeals: 0 };
    const conversionRate = result.totalLeads > 0 
      ? Math.round((result.wonDeals / result.totalLeads) * 100) 
      : 0;

    return ok(res, { ...result, conversionRate }, 'Sales metrics retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 7. Upload Call Recording by Sales Executive
async function uploadCallRecording(req, res, next) {
  try {
    if (!req.file) {
      return fail(res, 400, 'FILE_REQUIRED', 'Please select a call recording audio file.');
    }

    const {
      leadId,
      notes,
      duration,
      leadPriority,
      customerName: inputCustomerName,
      mobileNumber,
      contactRole,
      material,
      quantity,
      location,
      serialNo
    } = req.body;

    let lead = null;
    let customerName = inputCustomerName || '';
    let leadCode = '';

    if (leadId) {
      lead = await Lead.findById(leadId);
      if (lead) {
        customerName = lead.customerName || customerName;
        leadCode = lead.leadCode || '';

        // Attach to lead voiceNotes if lead exists
        lead.voiceNotes.push({
          path: getRelativePath(req.file.path),
          originalName: req.file.originalname,
          uploadedBy: req.user._id,
          createdAt: new Date()
        });

        if (material) lead.productCategory = material;
        if (quantity) lead.quantity = quantity;
        if (location) lead.destination = location;
        if (leadPriority) lead.priority = leadPriority;
        await lead.save();

        await LeadActivity.create({
          leadId: lead._id,
          actionType: 'VOICE_NOTE_ADDED',
          note: `Call recording uploaded by ${req.user.fullName || req.user.name}: "${req.file.originalname}"${notes ? ` - ${notes}` : ''}`,
          actorId: req.user._id
        });
      }
    } else if (customerName || mobileNumber) {
      // Auto-create lead in MongoDB if direct unlinked call details are provided
      try {
        const cleanPhone = mobileNumber ? String(mobileNumber).replace(/\s/g, '') : '';
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        leadCode = `LD-${timestamp}-${random}`;

        lead = await Lead.create({
          leadCode,
          source: 'CALL_RECORDING',
          customerName: customerName || 'Direct Customer',
          phoneEncrypted: cleanPhone ? encryptText(cleanPhone) : '',
          phoneMasked: cleanPhone ? maskPhone(cleanPhone) : '',
          phoneHash: cleanPhone ? hashText(cleanPhone) : '',
          whatsAppNumber: cleanPhone,
          productCategory: material || 'General Inquiry',
          quantity: quantity || '',
          destination: location || '',
          priority: ['HOT', 'WARM', 'COLD'].includes(leadPriority) ? leadPriority : 'WARM',
          stage: 'NEW_LEAD',
          assignedTo: req.user._id,
          createdBy: req.user._id
        });

        lead.voiceNotes.push({
          path: getRelativePath(req.file.path),
          originalName: req.file.originalname,
          uploadedBy: req.user._id,
          createdAt: new Date()
        });
        await lead.save();
      } catch (autoLeadErr) {
        console.warn('Auto-create lead from call recording notice:', autoLeadErr.message);
      }
    }

    const callRecording = await CallRecording.create({
      executiveId: req.user._id,
      executiveName: req.user.fullName || req.user.name || 'Sales Executive',
      leadId: lead ? lead._id : null,
      leadCode: leadCode || (lead ? lead.leadCode : ''),
      customerName: customerName || 'Direct Customer',
      mobileNumber: mobileNumber || '',
      contactRole: contactRole || 'Customer',
      material: material || '',
      quantity: quantity || '',
      location: location || '',
      serialNo: serialNo || '',
      audioPath: getRelativePath(req.file.path),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || 'audio/mpeg',
      size: req.file.size || 0,
      duration: duration || '',
      notes: notes || '',
      leadPriority: ['HOT', 'WARM', 'COLD'].includes(leadPriority) ? leadPriority : (lead ? lead.priority : 'WARM')
    });

    // Upload to Google Drive directly in background/inline
    try {
      const { uploadToGoogleDrive } = require('../../services/googleDrive.service');
      const driveResult = await uploadToGoogleDrive(req.file.path, req.file.originalname, req.file.mimetype);
      if (driveResult && driveResult.fileId) {
        callRecording.driveFileId = driveResult.fileId;
        callRecording.driveWebViewLink = driveResult.webViewLink || '';
        callRecording.driveWebContentLink = driveResult.webContentLink || '';
        await callRecording.save();
        console.log(`[CallRecording] Recording attached to Google Drive File ID: ${driveResult.fileId}`);
      }
    } catch (driveErr) {
      console.warn('[CallRecording] Google Drive upload notice:', driveErr.message);
    }

    return ok(res, { callRecording }, 'Call recording uploaded and saved to Google Drive & Server successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

// 8. Get list of all Call Recordings for Manager / Executive Dashboard
async function getCallRecordings(req, res, next) {
  try {
    const filter = {};
    const { executiveId, leadId, priority } = req.query;

    const role = req.user?.role || '';
    const isManagerOrAdmin = ['ADMIN', 'MANAGER', 'HR'].includes(role) || role.endsWith('_MANAGER') || role.toLowerCase().includes('manager');

    if (!isManagerOrAdmin) {
      const mongoose = require('mongoose');
      const User = require('../users/user.model');
      const Employee = require('../employee/employee.model');
      const Lead = require('./lead.model');
      const Task = require('../task/task.model');

      const idSet = new Set();
      if (req.user._id) idSet.add(String(req.user._id));
      if (req.user.employeeDbId) idSet.add(String(req.user.employeeDbId));
      if (req.user.email) {
        const emp = await Employee.findOne({ email: req.user.email });
        if (emp && emp._id) idSet.add(String(emp._id));
        const uDoc = await User.findOne({ email: req.user.email });
        if (uDoc && uDoc._id) idSet.add(String(uDoc._id));
      }

      const matchIds = [];
      idSet.forEach((idStr) => {
        matchIds.push(idStr);
        if (mongoose.isValidObjectId(idStr)) {
          matchIds.push(new mongoose.Types.ObjectId(idStr));
        }
      });

      const assignedLeads = await Lead.find({ assignedTo: { $in: matchIds } }).select('_id').lean();
      const assignedLeadIds = assignedLeads.map(l => l._id);

      const assignedTasks = await Task.find({ assignedTo: { $in: matchIds }, leadId: { $ne: null } }).select('leadId').lean();
      const taskLeadIds = assignedTasks.map(t => t.leadId).filter(Boolean);

      const combinedLeadIds = [...new Set([...assignedLeadIds.map(String), ...taskLeadIds.map(String)])].map(idStr => 
        mongoose.isValidObjectId(idStr) ? new mongoose.Types.ObjectId(idStr) : idStr
      );

      filter.$or = [
        { executiveId: { $in: matchIds } },
        { leadId: { $in: combinedLeadIds } }
      ];
    } else if (executiveId) {
      filter.executiveId = executiveId;
    }

    if (leadId) filter.leadId = leadId;
    if (priority) filter.leadPriority = priority;

    const mongoose = require('mongoose');
    const User = require('../users/user.model');
    const Employee = require('../employee/employee.model');
    const SalesTrialUser = require('../sales-trial/salesTrialUser.model');

    const rawRecordings = await CallRecording.find(filter)
      .populate('leadId', 'customerName leadCode companyName priority stage assignedTo assignedDepartment')
      .sort({ createdAt: -1 })
      .lean();

    // Collect all search IDs for name resolution (executiveId + lead assignedTo)
    const searchIdsSet = new Set();
    rawRecordings.forEach(r => {
      if (r.executiveId) searchIdsSet.add(String(r.executiveId));
      if (r.leadId && r.leadId.assignedTo) {
        const a = r.leadId.assignedTo;
        searchIdsSet.add(String(a._id || a));
      }
    });

    const searchArray = [...searchIdsSet].filter(Boolean);
    const objectIdArray = [];
    const stringArray = [];

    searchArray.forEach(idStr => {
      stringArray.push(idStr);
      if (mongoose.isValidObjectId(idStr)) {
        try { objectIdArray.push(new mongoose.Types.ObjectId(idStr)); } catch (e) {}
      }
    });

    let users = [];
    let employees = [];
    let trialUsers = [];

    if (searchArray.length > 0) {
      [users, employees, trialUsers] = await Promise.all([
        User.collection.find({
          $or: [
            { _id: { $in: stringArray } },
            { _id: { $in: objectIdArray } },
            { employeeId: { $in: stringArray } }
          ]
        }).toArray(),
        Employee.collection.find({
          $or: [
            { _id: { $in: stringArray } },
            { _id: { $in: objectIdArray } },
            { employeeId: { $in: stringArray } }
          ]
        }).toArray(),
        SalesTrialUser.collection.find({
          $or: [
            { _id: { $in: stringArray } },
            { _id: { $in: objectIdArray } },
            { trialId: { $in: stringArray } }
          ]
        }).toArray()
      ]);
    }

    const nameMap = new Map();
    const addToMap = (doc) => {
      if (!doc) return;
      const displayName = doc.fullName || doc.name || doc.email || doc.employeeId || doc.trialId || String(doc._id);
      nameMap.set(String(doc._id), displayName);
      if (doc.employeeId) nameMap.set(String(doc.employeeId), displayName);
      if (doc.trialId) nameMap.set(String(doc.trialId), displayName);
    };

    users.forEach(addToMap);
    employees.forEach(addToMap);
    trialUsers.forEach(addToMap);

    const recordings = rawRecordings.map(r => {
      const execIdStr = r.executiveId ? String(r.executiveId) : '';
      const execResolvedName = nameMap.get(execIdStr) || r.executiveName || 'Executive';

      let assignedCustodianName = 'Unassigned';
      if (r.leadId && r.leadId.assignedTo) {
        const leadAssigneeStr = String(r.leadId.assignedTo._id || r.leadId.assignedTo);
        assignedCustodianName = nameMap.get(leadAssigneeStr) || (typeof r.leadId.assignedTo === 'object' ? (r.leadId.assignedTo.fullName || r.leadId.assignedTo.name) : r.leadId.assignedTo) || 'Unassigned';
      } else if (r.leadId && r.leadId.assignedDepartment) {
        assignedCustodianName = `Dept: ${r.leadId.assignedDepartment}`;
      } else {
        assignedCustodianName = execResolvedName;
      }

      const isDone = r.status ? (r.status === 'COMPLETED') : (Boolean(r.completedAt) || (r.leadId && ['CLOSED_WON', 'DEAL_WON', 'DELIVERED', 'COMPLETED', 'QUOTATION_REQUIRED', 'QUOTATION_SENT', 'NEGOTIATION', 'REQUIREMENT_CAPTURED'].includes(String(r.leadId.stage).toUpperCase())));

      return {
        ...r,
        executiveName: execResolvedName,
        assignedToName: assignedCustodianName,
        status: isDone ? 'COMPLETED' : 'PENDING'
      };
    });

    return ok(res, { recordings }, 'Call recordings retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 9. Stream Audio for Call Recording
async function streamCallRecording(req, res, next) {
  try {
    const { recordingId } = req.params;

    const mongoose = require('mongoose');
    if (!recordingId || !mongoose.isValidObjectId(recordingId)) {
      return fail(res, 404, 'NOT_FOUND', 'Invalid call recording ID.');
    }

    const recording = await CallRecording.findById(recordingId);
    if (!recording || !recording.audioPath) {
      return fail(res, 404, 'NOT_FOUND', 'Call recording not found.');
    }

    const filePath = resolveUploadPath(recording.audioPath, 'call_recordings');
    if (!filePath || !fs.existsSync(filePath)) {
      if (recording.driveFileId) {
        try {
          const { getDriveFileStream } = require('../../services/googleDrive.service');
          const driveStream = await getDriveFileStream(recording.driveFileId);
          if (driveStream) {
            res.setHeader('Content-Type', recording.mimeType || 'audio/mpeg');
            return driveStream.pipe(res);
          }
        } catch (driveStreamErr) {
          console.warn('[CallRecording] Drive stream error:', driveStreamErr.message);
        }
      }

      try {
        const prodUrl = `https://indiatradeoverseas-ito.onrender.com/api/leads/call-recordings/${recordingId}/stream`;
        await proxyFromProduction(prodUrl, req.headers.authorization, res);
        return;
      } catch (proxyError) {
        console.warn(`Local call recording missing: ${proxyError.message}`);
      }
      return fail(res, 404, 'FILE_NOT_FOUND', 'Audio file not found on disk or Drive.');
    }

    const absPath = path.resolve(filePath);
    const stat = fs.statSync(absPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const mimeType = recording.mimeType || 'audio/mpeg';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(absPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      };
      res.writeHead(200, head);
      fs.createReadStream(absPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
}

// 10. Update Manager Remark on Call Recording
async function updateCallRecordingRemark(req, res, next) {
  try {
    const { recordingId } = req.params;
    const { managerRemark } = req.body;

    const recording = await CallRecording.findByIdAndUpdate(
      recordingId,
      {
        managerRemark: managerRemark || '',
        managerRemarkBy: req.user.fullName || req.user.name || 'Sales Manager',
        managerRemarkAt: new Date()
      },
      { new: true }
    );

    if (!recording) {
      return fail(res, 404, 'NOT_FOUND', 'Call recording not found.');
    }

    return ok(res, { recording }, 'Manager remark updated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 11. Upload LOI Document for a Lead
async function uploadLOIDocument(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!req.file) {
      return fail(res, 400, 'FILE_REQUIRED', 'Please select an LOI document file to upload.');
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Lead not found.');
    }

    const loiObj = {
      path: getRelativePath(req.file.path),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || 'application/pdf',
      size: req.file.size || 0,
      notes: notes || '',
      uploadedBy: req.user._id,
      uploadedByName: req.user.fullName || req.user.name || 'Sales Executive',
      createdAt: new Date(),
      driveFileId: '',
      driveWebViewLink: ''
    };

    // Upload to Google Drive directly in background/inline
    try {
      const { uploadToGoogleDrive } = require('../../services/googleDrive.service');
      const driveResult = await uploadToGoogleDrive(req.file.path, `LOI_${lead.leadCode}_${req.file.originalname}`, req.file.mimetype);
      if (driveResult && driveResult.fileId) {
        loiObj.driveFileId = driveResult.fileId;
        loiObj.driveWebViewLink = driveResult.webViewLink || '';
      }
    } catch (driveErr) {
      console.warn('[LOI Upload] Google Drive upload notice:', driveErr.message);
    }

    if (!lead.loiDocuments) lead.loiDocuments = [];
    lead.loiDocuments.push(loiObj);

    // Auto update stage to LOI_PO_PENDING if currently in earlier stage
    if (['NEW_LEAD', 'ASSIGNED', 'CONTACTED', 'LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 'QUOTATION_REQUIRED', 'NEGOTIATION'].includes(lead.stage)) {
      lead.stage = 'LOI_PO_PENDING';
    }

    await lead.save();

    // Log Activity
    await LeadActivity.create({
      leadId: lead._id,
      actionType: 'LOI_UPLOADED',
      note: `LOI Document uploaded by ${req.user.fullName || req.user.name}: "${req.file.originalname}"${notes ? ` (Notes: ${notes})` : ''}`,
      actorId: req.user._id
    });

    return ok(res, { loiDocuments: lead.loiDocuments, lead }, 'LOI document uploaded and attached successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

// 12. Stream/Download LOI Document
async function streamLOIDocument(req, res, next) {
  try {
    const { id, index } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Lead not found.');
    }

    const loiDoc = lead.loiDocuments?.[Number(index)];
    if (!loiDoc || !loiDoc.path) {
      return fail(res, 404, 'NOT_FOUND', 'LOI document not found at this index.');
    }

    const filePath = resolveUploadPath(loiDoc.path, 'loi_documents');
    if (filePath && fs.existsSync(filePath)) {
      const absPath = path.resolve(filePath);
      const ext = path.extname(absPath).toLowerCase();
      let mimeType = loiDoc.mimeType;
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === '.doc') mimeType = 'application/msword';
        else mimeType = 'application/pdf';
      }

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(loiDoc.originalName || 'loi-document')}"`);
      return res.sendFile(absPath);
    }

    if (loiDoc.driveFileId) {
      try {
        const { getDriveFileStream } = require('../../services/googleDrive.service');
        const driveStream = await getDriveFileStream(loiDoc.driveFileId);
        if (driveStream) {
          res.setHeader('Content-Type', loiDoc.mimeType || 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(loiDoc.originalName || 'loi-document')}"`);
          return driveStream.pipe(res);
        }
      } catch (driveStreamErr) {
        console.warn('[LOIDoc] Drive stream error:', driveStreamErr.message);
      }
    }

    if (loiDoc.driveWebViewLink) {
      return res.redirect(loiDoc.driveWebViewLink);
    }

    return fail(res, 404, 'FILE_NOT_FOUND', 'LOI document file not found on disk or Drive.');
  } catch (error) {
    next(error);
  }
}

// 13. Update Followup / Call Recording Status (PENDING vs COMPLETED)
async function updateCallRecordingStatus(req, res, next) {
  try {
    const { recordingId } = req.params;
    const { status } = req.body;

    const targetStatus = status === 'COMPLETED' ? 'COMPLETED' : 'PENDING';
    const recording = await CallRecording.findByIdAndUpdate(
      recordingId,
      {
        status: targetStatus,
        completedBy: targetStatus === 'COMPLETED' ? (req.user.fullName || req.user.name || 'User') : '',
        completedAt: targetStatus === 'COMPLETED' ? new Date() : null
      },
      { new: true }
    );

    if (!recording) {
      return fail(res, 404, 'NOT_FOUND', 'Call recording not found.');
    }

    // Auto advance or revert lead stage when follow-up status is updated
    if (recording.leadId) {
      const leadIdStr = typeof recording.leadId === 'object' ? recording.leadId._id : recording.leadId;
      const lead = await Lead.findById(leadIdStr);
      if (lead) {
        if (targetStatus === 'COMPLETED' && ['NEW_LEAD', 'ASSIGNED', 'CONTACTED', 'LEAD_QUALIFICATION', 'FOLLOW_UP'].includes(String(lead.stage || '').toUpperCase())) {
          lead.stage = 'REQUIREMENT_CAPTURED';
          await lead.save();
        } else if (targetStatus === 'PENDING' && String(lead.stage || '').toUpperCase() === 'REQUIREMENT_CAPTURED') {
          lead.stage = 'FOLLOW_UP';
          await lead.save();
        }
      }
    }

    return ok(res, { recording }, `Follow-up status updated to ${targetStatus}`, 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createManualLead,
  getDueReminders,
  uploadVoiceNote,
  streamVoiceNote,
  addActivity,
  logWhatsAppActivity,
  logEmailActivity,
  getSalesMetrics,
  uploadCallRecording,
  getCallRecordings,
  streamCallRecording,
  updateCallRecordingRemark,
  updateCallRecordingStatus,
  uploadLOIDocument,
  streamLOIDocument
};
