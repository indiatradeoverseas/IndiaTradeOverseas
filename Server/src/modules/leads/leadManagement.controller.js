const fs = require('fs');
const path = require('path');
const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');
const CallRecording = require('./callRecording.model');
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
      actorId: req.user._id
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

    const { leadId, notes, duration, leadPriority, customerName: inputCustomerName } = req.body;

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
        await lead.save();

        await LeadActivity.create({
          leadId: lead._id,
          actionType: 'VOICE_NOTE_ADDED',
          note: `Call recording uploaded by ${req.user.fullName || req.user.name}: "${req.file.originalname}"`,
          actorId: req.user._id
        });
      }
    }

    const callRecording = await CallRecording.create({
      executiveId: req.user._id,
      executiveName: req.user.fullName || req.user.name || 'Sales Executive',
      leadId: lead ? lead._id : null,
      leadCode: leadCode,
      customerName: customerName || 'Direct Customer',
      audioPath: getRelativePath(req.file.path),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || 'audio/mpeg',
      size: req.file.size || 0,
      duration: duration || '',
      notes: notes || '',
      leadPriority: ['HOT', 'WARM', 'COLD'].includes(leadPriority) ? leadPriority : (lead ? lead.priority : 'WARM')
    });

    return ok(res, { callRecording }, 'Call recording uploaded and saved successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

// 8. Get list of all Call Recordings for Manager / Executive Dashboard
async function getCallRecordings(req, res, next) {
  try {
    const filter = {};
    const { executiveId, leadId, priority } = req.query;

    const isManagerOrAdmin = ['ADMIN', 'MANAGER', 'HR'].includes(req.user.role) || req.user.role.endsWith('_MANAGER') || req.user.role.toLowerCase().includes('manager');

    if (!isManagerOrAdmin) {
      const emp = await Employee.findOne({ email: req.user.email });
      const execIds = [req.user._id];
      if (emp && String(emp._id) !== String(req.user._id)) {
        execIds.push(emp._id);
      }
      filter.executiveId = { $in: execIds };
    } else if (executiveId) {
      filter.executiveId = executiveId;
    }

    if (leadId) filter.leadId = leadId;
    if (priority) filter.leadPriority = priority;

    const recordings = await CallRecording.find(filter)
      .populate('executiveId', 'fullName name email role profileImage')
      .populate('leadId', 'customerName leadCode companyName priority stage')
      .sort({ createdAt: -1 });

    return ok(res, { recordings }, 'Call recordings retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

// 9. Stream Audio for Call Recording
async function streamCallRecording(req, res, next) {
  try {
    const { recordingId } = req.params;
    const recording = await CallRecording.findById(recordingId);
    if (!recording || !recording.audioPath) {
      return fail(res, 404, 'NOT_FOUND', 'Call recording not found.');
    }

    const filePath = resolveUploadPath(recording.audioPath, 'call_recordings');
    if (!filePath || !fs.existsSync(filePath)) {
      try {
        const prodUrl = `https://indiatradeoverseas-ito.onrender.com/api/leads/call-recordings/${recordingId}/stream`;
        await proxyFromProduction(prodUrl, req.headers.authorization, res);
        return;
      } catch (proxyError) {
        console.warn(`Local call recording missing: ${proxyError.message}`);
      }
      return fail(res, 404, 'FILE_NOT_FOUND', 'Audio file not found on disk.');
    }

    res.sendFile(filePath);
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
  streamCallRecording
};
