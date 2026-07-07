const fs = require('fs');
const path = require('path');
const CareerApplication = require('./career.model');
const Job = require('./job.model');
const { ok, fail } = require('../../utils/response');
const { resolveUploadPath, getRelativePath, proxyFromProduction } = require('../../utils/file');


const hasJobPermission = (user) => {
  if (!user) return false;
  if (['ADMIN', 'MANAGER', 'HR'].includes(user.role)) return true;
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
      resumePath: getRelativePath(resumeFile.path),
      resumeOriginalName: resumeFile.originalname,
      coverLetter,
      coverLetterPath: coverLetterFile ? getRelativePath(coverLetterFile.path) : undefined,
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
    if (!['ADMIN', 'MANAGER', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can view applications.');
    }

    const applications = await CareerApplication.find().sort({ appliedAt: -1 });

    return ok(res, { applications }, 'Job applications retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can update application status.');
    }

    const { status } = req.body;
    if (!status || !['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please provide a valid status.');
    }

    const application = await CareerApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!application) {
      return fail(res, 404, 'NOT_FOUND', 'Job application not found.');
    }

    return ok(res, { application }, `Application status updated to ${status}`, 200, req);
  } catch (error) {
    next(error);
  }
};

const downloadResume = async (req, res, next) => {
  try {
    if (!['ADMIN', 'MANAGER', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can download resumes.');
    }

    const application = await CareerApplication.findById(req.params.id);
    if (!application) {
      return fail(res, 404, 'NOT_FOUND', 'Job application not found.');
    }

    const filePath = resolveUploadPath(application.resumePath, 'resumes');
    if (!filePath || !fs.existsSync(filePath)) {
      // Fallback: proxy from production in development mode
      try {
        const prodUrl = `https://indiatradeoverseas-ito.onrender.com/api/careers/${req.params.id}/resume`;
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
    if (!['ADMIN', 'MANAGER', 'HR'].includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Admins, Managers, and HR can download cover letters.');
    }

    const application = await CareerApplication.findById(req.params.id);
    if (!application) {
      return fail(res, 404, 'NOT_FOUND', 'Job application not found.');
    }

    const filePath = resolveUploadPath(application.coverLetterPath, 'cover_letters');
    if (!filePath || !fs.existsSync(filePath)) {
      // Fallback: proxy from production in development mode
      try {
        const prodUrl = `https://indiatradeoverseas-ito.onrender.com/api/careers/${req.params.id}/cover-letter`;
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
    if (!['ADMIN', 'MANAGER', 'HR'].includes(req.user.role)) {
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
        const prodUrl = `https://indiatradeoverseas-ito.onrender.com/api/careers/jobs/${req.params.id}/jd`;
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

module.exports = {
  applyJob,
  listApplications,
  updateApplicationStatus,
  downloadResume,
  downloadCoverLetter,
  listJobs,
  listAllJobs,
  createJob,
  updateJob,
  deleteJob,
  deleteApplication,
  downloadJobJD
};

