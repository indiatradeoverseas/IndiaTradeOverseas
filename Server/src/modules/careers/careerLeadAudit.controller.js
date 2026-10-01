const CareerLeadAudit = require('./careerLeadAudit.model');
const CareerLeadUpload = require('./careerLeadUpload.model');
const CareerApplication = require('./career.model');

// Create audit log for interview scheduling, evaluation, or candidate stage change
exports.createAuditLog = async (req, res) => {
  try {
    const {
      leadId,
      leadType = 'CAREER_LEAD',
      candidateName,
      candidateEmail,
      candidatePhone = 'N/A',
      position = 'General Candidate',
      refNo = '',
      action = 'INTERVIEW_SCHEDULED',
      roundName = 'Round 1 - Screening',
      scheduledDate = '',
      scheduledTime = '',
      meetingLink = '',
      status = 'SCHEDULED',
      rating = 0,
      feedback = '',
      notes = ''
    } = req.body;

    if (!leadId || !candidateEmail || !candidateName) {
      return res.status(400).json({
        success: false,
        message: 'leadId, candidateName, and candidateEmail are required'
      });
    }

    const performedBy = req.user ? (req.user._id || req.user.id) : null;
    const performedByName = req.user ? (req.user.fullName || req.user.name || 'HR Executive') : 'HR Staff';
    const performedByRole = req.user ? (req.user.role || req.user.department || 'HR_EXECUTIVE') : 'HR_EXECUTIVE';

    const isPassed = status === 'PASSED' || status === 'ACCEPTED' || status === 'HIRED';

    // Create Audit Entry
    const auditRecord = await CareerLeadAudit.create({
      leadId,
      leadType,
      candidateName,
      candidateEmail: candidateEmail.toLowerCase().trim(),
      candidatePhone,
      position,
      refNo,
      action: isPassed ? 'PASSED_FORWARDED_TO_HR_MANAGER' : action,
      roundName,
      scheduledDate,
      scheduledTime,
      meetingLink,
      status,
      rating: Number(rating) || 0,
      feedback,
      notes,
      performedBy,
      performedByName,
      performedByRole,
      forwardedToHrManager: isPassed
    });

    // Update underlying Lead or Application status & notes
    if (leadId) {
      try {
        const mongoLeadId = leadId.replace('lead_task_', '').replace('app_task_', '');
        
        // Try updating CareerLeadUpload first
        const leadDoc = await CareerLeadUpload.findById(mongoLeadId);
        if (leadDoc) {
          if (isPassed) {
            leadDoc.status = 'HIRED';
            leadDoc.result = 'PASSED (Evaluated by HR)';
          } else if (status === 'SCHEDULED' || status === 'INTERVIEW_SCHEDULED') {
            leadDoc.status = 'INTERVIEW_SCHEDULED';
          } else if (status === 'FAILED' || status === 'REJECTED') {
            leadDoc.status = 'REJECTED';
            leadDoc.result = 'REJECTED';
          }

          const auditSummary = `[Audit ${new Date().toLocaleDateString()}] ${roundName} (${status}) by ${performedByName}${feedback ? ` | Remarks: ${feedback}` : ''}`;
          leadDoc.notes = leadDoc.notes ? `${leadDoc.notes}\n${auditSummary}` : auditSummary;
          await leadDoc.save();
        }

        // Try updating CareerApplication if applicable
        const appDoc = await CareerApplication.findById(mongoLeadId);
        if (appDoc) {
          if (isPassed) {
            appDoc.status = 'ACCEPTED';
          } else if (status === 'FAILED') {
            appDoc.status = 'REJECTED';
          }

          // Append or update interview round in application
          if (!appDoc.interviews) appDoc.interviews = [];
          appDoc.interviews.push({
            roundNumber: appDoc.interviews.length + 1,
            roundName,
            interviewerId: String(performedBy || ''),
            interviewerName: performedByName,
            scheduledDate,
            scheduledTime,
            meetingLink,
            notes,
            status,
            rating: Number(rating) || 0,
            feedback,
            evaluatedBy: performedByName,
            evaluatedAt: new Date()
          });

          await appDoc.save();
        }
      } catch (err) {
        console.error('Error updating target lead document in audit log sync:', err);
      }
    }

    return res.status(201).json({
      success: true,
      message: isPassed
        ? 'Interview evaluation logged & profile forwarded to HR Manager! 🎯'
        : 'Interview audit log created successfully',
      auditRecord
    });
  } catch (error) {
    console.error('Error in createAuditLog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record audit log',
      error: error.message
    });
  }
};

// Get audit logs for a specific candidate by leadId or email
exports.getAuditLogsForLead = async (req, res) => {
  try {
    const { leadId, email } = req.query;

    if (!leadId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Either leadId or email query parameter is required'
      });
    }

    const query = {};
    if (leadId) {
      const cleanId = leadId.replace('lead_task_', '').replace('app_task_', '');
      query.$or = [{ leadId }, { leadId: cleanId }];
    }
    if (email) {
      query.candidateEmail = email.toLowerCase().trim();
    }

    const logs = await CareerLeadAudit.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error in getAuditLogsForLead:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
};

// Get all candidates passed / forwarded to HR Manager
exports.getPassedLeadsForHRManager = async (req, res) => {
  try {
    const passedLogs = await CareerLeadAudit.find({
      $or: [
        { forwardedToHrManager: true },
        { status: { $in: ['PASSED', 'HIRED', 'ACCEPTED'] } }
      ]
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      logs: passedLogs
    });
  } catch (error) {
    console.error('Error in getPassedLeadsForHRManager:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch passed candidates for HR Manager',
      error: error.message
    });
  }
};
