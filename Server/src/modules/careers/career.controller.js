const fs = require('fs');
const path = require('path');
const CareerApplication = require('./career.model');
const CareerLead = require('./careerLead.model');
const Job = require('./job.model');
const { ok, fail } = require('../../utils/response');
const { resolveUploadPath, getRelativePath, proxyFromProduction } = require('../../utils/file');


const hasJobPermission = (user) => {
  if (!user) return false;
  if (['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user.role)) return true;
  return user.jobPermission === true;
};

const applyJob = async (req, res, next) => {
  try {
    const { fullName, email, phone, position, coverLetter } = req.body;

    if (!fullName || !email || !phone || !position) {
      return fail(res, 400, 'VALIDATION_ERROR', 'All required fields (fullName, email, phone, position) must be provided.');
    }

    const resumeFile = req.files && req.files['resume'] ? req.files['resume'][0] : null;
    const coverLetterFile = req.files && req.files['coverLetter'] ? req.files['coverLetter'][0] : null;

    if (!resumeFile) {
      return fail(res, 400, 'FILE_REQUIRED', 'Please upload your resume.');
    }

    const application = new CareerApplication({
      fullName,
      email,
      phone,
      position,
      resumeData: resumeFile.buffer,
      resumeContentType: resumeFile.mimetype,
      resumeOriginalName: resumeFile.originalname,
      coverLetter,
      coverLetterData: coverLetterFile ? coverLetterFile.buffer : undefined,
      coverLetterContentType: coverLetterFile ? coverLetterFile.mimetype : undefined,
      coverLetterOriginalName: coverLetterFile ? coverLetterFile.originalname : undefined
    });

    await application.save();

    return ok(res, { application }, 'Your job application has been submitted successfully!', 201, req);
  } catch (error) {
    next(error);
  }
};

const listApplications = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can view applications.');
    }

    // Excludes the resume/cover-letter binary fields - the list view only
    // needs metadata, and those blobs would otherwise bloat every fetch.
    const applications = await CareerApplication.find()
      .select('-resumeData -coverLetterData')
      .sort({ appliedAt: -1 });

    return ok(res, { applications }, 'Job applications retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can update application status.');
    }

    const { status, interviewDetails } = req.body;
    if (!status || !['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please provide a valid status.');
    }

    const application = await CareerApplication.findById(req.params.id);

    if (!application) {
      return fail(res, 404, 'NOT_FOUND', 'Job application not found.');
    }

    application.status = status;

    // Push new interview round into interviews array if interview details are provided
    if (interviewDetails) {
      const { date, time, interviewerName, interviewerId, roundNumber, roundName, totalRounds, notes, meetingLink } = interviewDetails;
      
      if (totalRounds) {
        application.totalRounds = Number(totalRounds);
      }

      const calculatedTotalRounds = Number(totalRounds || application.totalRounds || 3);

      const newRound = {
        roundNumber: Number(roundNumber || (application.interviews ? application.interviews.length + 1 : 1)),
        totalRounds: calculatedTotalRounds,
        roundName: roundName || `Round ${application.interviews ? application.interviews.length + 1 : 1}`,
        interviewerId: interviewerId || '',
        interviewerName: interviewerName || 'Assigned Interviewer',
        scheduledDate: date || '',
        scheduledTime: time || '',
        meetingLink: meetingLink || '',
        notes: notes || '',
        status: 'SCHEDULED'
      };

      if (!application.interviews) application.interviews = [];
      application.interviews.push(newRound);

      // Send email to candidate
      const { sendEmail } = require('../../utils/mailer');
      const subject = `Interview Scheduled - ${newRound.roundName} - India Trade Overseas`;
      const text = `Dear ${application.fullName},\n\nYour interview (${newRound.roundName}) for the position of ${application.position} has been scheduled.\n\nDate: ${date}\nTime: ${time}\nInterviewer: ${interviewerName}\nMeeting Link: ${meetingLink || 'To be shared'}\nNotes: ${notes || 'None'}\n\nBest regards,\nIndia Trade Overseas`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0E1116; border-bottom: 2px solid #C89A54; padding-bottom: 10px;">Interview Invitation - ${newRound.roundName}</h2>
          <p>Dear <strong>${application.fullName}</strong>,</p>
          <p>We are pleased to invite you for <strong>${newRound.roundName}</strong> for the <strong>${application.position}</strong> position at India Trade Overseas.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #C89A54; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
            <p style="margin: 5px 0;"><strong>Interviewer:</strong> ${interviewerName}</p>
            ${meetingLink ? `<p style="margin: 5px 0;"><strong>Meeting Link (Google Meet / Zoom):</strong> <a href="${meetingLink}" target="_blank" style="color: #C89A54; font-weight: bold;">${meetingLink}</a></p>` : ''}
            ${notes ? `<p style="margin: 5px 0;"><strong>Additional Info:</strong> ${notes}</p>` : ''}
          </div>
          
          <p>Please click on the meeting link at the scheduled time to join the interview session.</p>
          <p style="margin-top: 25px;">Best regards,<br/><strong>India Trade Overseas HR Team</strong></p>
        </div>
      `;
      
      sendEmail(application.email, subject, text, html).catch(err => {
        console.error('Failed to send interview scheduled email:', err);
      });
    }

    await application.save();

    return ok(res, { application }, `Application status updated to ${status}`, 200, req);
  } catch (error) {
    next(error);
  }
};

const submitInterviewFeedback = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can submit interview feedback.');
    }

    const { id: applicationId, interviewId } = req.params;
    const { status, rating, feedback } = req.body;

    if (!status || !['PASSED', 'FAILED', 'ON_HOLD'].includes(status)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please select a valid evaluation result (PASSED, FAILED, ON_HOLD).');
    }

    const application = await CareerApplication.findById(applicationId);
    if (!application) {
      return fail(res, 404, 'NOT_FOUND', 'Job application not found.');
    }

    let round = null;
    if (interviewId && application.interviews) {
      round = application.interviews.id(interviewId) || application.interviews.find(i => i._id && i._id.toString() === interviewId);
    }
    if (!round && application.interviews && application.interviews.length > 0) {
      round = application.interviews[application.interviews.length - 1];
    }

    if (!round) {
      return fail(res, 404, 'NOT_FOUND', 'No interview round record found to evaluate.');
    }

    round.status = status;
    round.rating = Number(rating || 0);
    round.feedback = feedback || '';
    round.evaluatedBy = req.user.fullName || req.user.name || 'HR Evaluator';
    round.evaluatedAt = new Date();

    if (status === 'FAILED') {
      application.status = 'REJECTED';
    } else if (status === 'PASSED') {
      const allPassed = application.interviews.every(i => i.status === 'PASSED');
      if (allPassed) {
        application.status = 'ACCEPTED';
      }
    }

    await application.save();

    return ok(res, { application }, `Interview evaluation submitted: ${status}`, 200, req);
  } catch (error) {
    next(error);
  }
};

const downloadResume = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can download resumes.');
    }

    const application = await CareerApplication.findById(req.params.id);
    if (!application) {
      return fail(res, 404, 'NOT_FOUND', 'Job application not found.');
    }

    if (application.resumeData) {
      res.setHeader('Content-Type', application.resumeContentType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(application.resumeOriginalName || 'resume.pdf')}"`);
      return res.send(application.resumeData);
    }

    // Legacy fallback: applications submitted before resumes moved into
    // MongoDB may still only have a disk path (see career.model.js).
    const filePath = resolveUploadPath(application.resumePath, 'resumes');
    if (!filePath || !fs.existsSync(filePath)) {
      // Fallback: proxy from production in development mode
      try {
        const prodUrl = `https://indiatradeoverseas-1.onrender.com/api/careers/${req.params.id}/resume`;
        await proxyFromProduction(prodUrl, req.headers.authorization, res);
        return;
      } catch (proxyError) {
        console.warn(`Local resume missing, and production proxy failed: ${proxyError.message}`);
      }
      return fail(res, 404, 'FILE_NOT_FOUND', 'Resume file not found on server disk.');
    }

    return res.download(filePath, application.resumeOriginalName);
  } catch (error) {
    next(error);
  }
};

const downloadCoverLetter = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can download cover letters.');
    }

    const application = await CareerApplication.findById(req.params.id);
    if (!application) {
      return fail(res, 404, 'NOT_FOUND', 'Job application not found.');
    }

    if (application.coverLetterData) {
      res.setHeader('Content-Type', application.coverLetterContentType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(application.coverLetterOriginalName || 'cover_letter.pdf')}"`);
      return res.send(application.coverLetterData);
    }

    // Legacy fallback: applications submitted before cover letters moved
    // into MongoDB may still only have a disk path (see career.model.js).
    const filePath = resolveUploadPath(application.coverLetterPath, 'cover_letters');
    if (!filePath || !fs.existsSync(filePath)) {
      // Fallback: proxy from production in development mode
      try {
        const prodUrl = `https://indiatradeoverseas-1.onrender.com/api/careers/${req.params.id}/cover-letter`;
        await proxyFromProduction(prodUrl, req.headers.authorization, res);
        return;
      } catch (proxyError) {
        console.warn(`Local cover letter missing, and production proxy failed: ${proxyError.message}`);
      }
      return fail(res, 404, 'FILE_NOT_FOUND', 'Cover letter file not found on server disk.');
    }

    return res.download(filePath, application.coverLetterOriginalName || 'cover_letter.pdf');
  } catch (error) {
    next(error);
  }
};


const submitGateLead = async (req, res, next) => {
  try {
    const { fullName, email, phone } = req.body;

    if (!fullName || !email || !phone) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Full name, email, and phone are required.');
    }

    const lead = await CareerLead.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { fullName, email, phone },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return ok(res, { lead }, 'Career gate details captured.', 201, req);
  } catch (error) {
    next(error);
  }
};

const listGateLeads = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can view career leads.');
    }

    const leads = await CareerLead.find().sort({ createdAt: -1 });

    return ok(res, { leads }, 'Career gate leads retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

const listJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ isActive: true }).sort({ createdAt: -1 });
    return ok(res, { jobs }, 'Active job openings list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
};

const listAllJobs = async (req, res, next) => {
  try {
    if (!hasJobPermission(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. You do not have permission to manage jobs.');
    }

    const jobs = await Job.find().sort({ createdAt: -1 }).populate('postedBy', 'fullName email');
    return ok(res, { jobs }, 'All job openings list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
};

const createJob = async (req, res, next) => {
  try {
    if (!hasJobPermission(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Admin permission is required to post jobs.');
    }

    const { title, department, location, type, experience, description, requirements } = req.body;
    if (!title || !department || !location || !type || !experience || !description) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please fill all required fields to create a job.');
    }

    const reqs = Array.isArray(requirements)
      ? requirements
      : requirements ? [requirements] : [];

    const jdFile = req.files && req.files['jd'] ? req.files['jd'][0] : null;

    const job = new Job({
      title,
      department,
      location,
      type,
      experience,
      description,
      requirements: reqs,
      postedBy: req.user._id,
      jdPath: jdFile ? getRelativePath(jdFile.path) : undefined,
      jdOriginalName: jdFile ? jdFile.originalname : undefined
    });

    await job.save();

    return ok(res, { job }, 'Job posting created successfully', 201, req);
  } catch (error) {
    next(error);
  }
};

const updateJob = async (req, res, next) => {
  try {
    if (!hasJobPermission(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Admin permission is required to update jobs.');
    }

    const { title, department, location, type, experience, description, requirements, isActive } = req.body;

    const updateFields = {};
    if (title) updateFields.title = title;
    if (department) updateFields.department = department;
    if (location) updateFields.location = location;
    if (type) updateFields.type = type;
    if (experience) updateFields.experience = experience;
    if (description) updateFields.description = description;
    if (requirements) {
      updateFields.requirements = Array.isArray(requirements)
        ? requirements
        : [requirements];
    }
    if (isActive !== undefined) {
      updateFields.isActive = isActive === 'true' || isActive === true;
    }

    const jdFile = req.files && req.files['jd'] ? req.files['jd'][0] : null;
    if (jdFile) {
      // Delete old JD file if it exists
      const oldJob = await Job.findById(req.params.id);
      if (oldJob && oldJob.jdPath) {
        const oldJdPath = resolveUploadPath(oldJob.jdPath, 'job_descriptions');
        if (oldJdPath && fs.existsSync(oldJdPath)) {
          try {
            fs.unlinkSync(oldJdPath);
          } catch (err) {
            console.error(`Error deleting old JD file: ${oldJdPath}`, err);
          }
        }
      }
      updateFields.jdPath = getRelativePath(jdFile.path);
      updateFields.jdOriginalName = jdFile.originalname;
    }

    const job = await Job.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!job) {
      return fail(res, 404, 'NOT_FOUND', 'Job opening not found.');
    }

    return ok(res, { job }, 'Job posting updated successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    if (!hasJobPermission(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Admin permission is required to delete jobs.');
    }

    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      return fail(res, 404, 'NOT_FOUND', 'Job opening not found.');
    }

    // Clean up JD file from disk if it exists
    if (job.jdPath) {
      const jdPath = resolveUploadPath(job.jdPath, 'job_descriptions');
      if (jdPath && fs.existsSync(jdPath)) {
        try {
          fs.unlinkSync(jdPath);
        } catch (err) {
          console.error(`Error deleting JD file: ${jdPath}`, err);
        }
      }
    }

    return ok(res, null, 'Job posting deleted successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

const deleteApplication = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can delete applications.');
    }

    const application = await CareerApplication.findById(req.params.id);
    if (!application) {
      return fail(res, 404, 'NOT_FOUND', 'Job application not found.');
    }

    // Delete associated files from server disk if they exist
    if (application.resumePath) {
      const resumePath = resolveUploadPath(application.resumePath, 'resumes');
      if (resumePath && fs.existsSync(resumePath)) {
        try {
          fs.unlinkSync(resumePath);
        } catch (err) {
          console.error(`Error deleting resume file: ${resumePath}`, err);
        }
      }
    }

    if (application.coverLetterPath) {
      const coverLetterPath = resolveUploadPath(application.coverLetterPath, 'cover_letters');
      if (coverLetterPath && fs.existsSync(coverLetterPath)) {
        try {
          fs.unlinkSync(coverLetterPath);
        } catch (err) {
          console.error(`Error deleting cover letter file: ${coverLetterPath}`, err);
        }
      }
    }

    await CareerApplication.findByIdAndDelete(req.params.id);

    return ok(res, null, 'Job application deleted successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

const downloadJobJD = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return fail(res, 404, 'NOT_FOUND', 'Job opening not found.');
    }

    const filePath = resolveUploadPath(job.jdPath, 'job_descriptions');
    if (!filePath || !fs.existsSync(filePath)) {
      // Fallback: proxy from production in development mode
      try {
        const prodUrl = `https://indiatradeoverseas-1.onrender.com/api/careers/jobs/${req.params.id}/jd`;
        await proxyFromProduction(prodUrl, req.headers.authorization, res);
        return;
      } catch (proxyError) {
        console.warn(`Local JD PDF missing, and production proxy failed: ${proxyError.message}`);
      }
      return fail(res, 404, 'FILE_NOT_FOUND', 'Job description PDF not found on server disk.');
    }

    return res.download(filePath, job.jdOriginalName || 'job_description.pdf');
  } catch (error) {
    next(error);
  }
};

const bulkAssignApplications = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can assign applications.');
    }

    const { applicationIds, assignedTo, assignedToName } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please provide a non-empty array of applicationIds.');
    }

    if (!assignedToName) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please select an HR Executive to assign.');
    }

    await CareerApplication.updateMany(
      { _id: { $in: applicationIds } },
      {
        $set: {
          assignedTo: assignedTo || '',
          assignedToName,
          assignedAt: new Date()
        }
      }
    );

    return ok(
      res,
      { count: applicationIds.length },
      `Successfully assigned ${applicationIds.length} candidate applications to ${assignedToName}`,
      200,
      req
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyJob,
  listApplications,
  updateApplicationStatus,
  submitInterviewFeedback,
  bulkAssignApplications,
  downloadResume,
  downloadCoverLetter,
  submitGateLead,
  listGateLeads,
  listJobs,
  listAllJobs,
  createJob,
  updateJob,
  deleteJob,
  deleteApplication,
  downloadJobJD
};

