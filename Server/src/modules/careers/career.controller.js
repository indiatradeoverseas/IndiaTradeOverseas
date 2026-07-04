const fs = require('fs');
const path = require('path');
const CareerApplication = require('./career.model');
const Job = require('./job.model');
const { ok, fail } = require('../../utils/response');


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
      resumePath: resumeFile.path,
      resumeOriginalName: resumeFile.originalname,
      coverLetter,
      coverLetterPath: coverLetterFile ? coverLetterFile.path : undefined,
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

    const filePath = application.resumePath;
    if (!fs.existsSync(filePath)) {
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

    const filePath = application.coverLetterPath;
    if (!filePath || !fs.existsSync(filePath)) {
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

    const job = new Job({
      title,
      department,
      location,
      type,
      experience,
      description,
      requirements: reqs,
      postedBy: req.user._id
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
    if (Array.isArray(requirements)) updateFields.requirements = requirements;
    if (typeof isActive === 'boolean') updateFields.isActive = isActive;

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

    return ok(res, null, 'Job posting deleted successfully', 200, req);
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
  deleteJob
};
