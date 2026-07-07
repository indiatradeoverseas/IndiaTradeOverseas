const fs = require('fs');
const path = require('path');
const Distributor = require('./distributor.model');
const { generateOtp, getOtpHtml } = require('../../utils/otp');
const { sendEmail } = require('../../utils/mailer');
const { ok, fail } = require('../../utils/response');
const { getRelativePath, resolveUploadPath } = require('../../utils/file');

// 1. Register Distributor (Upload Details & Certificates + Send OTP)
const registerDistributor = async (req, res, next) => {
  try {
    const { name, email, mobile, address } = req.body;

    if (!name || !email || !mobile || !address) {
      return fail(res, 400, 'VALIDATION_ERROR', 'All fields (name, email, mobile, address) are required.');
    }

    const gstFile = req.files && req.files['gstCertificate'] ? req.files['gstCertificate'][0] : null;
    const udyamFile = req.files && req.files['udyamCertificate'] ? req.files['udyamCertificate'][0] : null;

    if (!gstFile) {
      return fail(res, 400, 'FILE_REQUIRED', 'GST Certificate is required.');
    }
    if (!udyamFile) {
      return fail(res, 400, 'FILE_REQUIRED', 'Udyam Certificate is required.');
    }

    // Generate 6-digit OTP code
    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Check if there is an existing distributor with the same email
    let distributor = await Distributor.findOne({ email });
    if (distributor) {
      distributor.name = name;
      distributor.mobile = mobile;
      distributor.address = address;
      distributor.gstCertificatePath = getRelativePath(gstFile.path);
      distributor.gstCertificateOriginalName = gstFile.originalname;
      distributor.udyamCertificatePath = getRelativePath(udyamFile.path);
      distributor.udyamCertificateOriginalName = udyamFile.originalname;
      distributor.otp = otpCode;
      distributor.otpExpiresAt = otpExpiresAt;
      distributor.isVerified = false; // Reset verification
      await distributor.save();
    } else {
      distributor = new Distributor({
        name,
        email,
        mobile,
        address,
        gstCertificatePath: getRelativePath(gstFile.path),
        gstCertificateOriginalName: gstFile.originalname,
        udyamCertificatePath: getRelativePath(udyamFile.path),
        udyamCertificateOriginalName: udyamFile.originalname,
        otp: otpCode,
        otpExpiresAt,
        isVerified: false
      });
      await distributor.save();
    }

    // Send OTP to distributor email
    const subject = 'Distributor Verification OTP - India Trade Overseas';
    const text = `Your OTP Code for distributor verification is: ${otpCode}. It will expire in 10 minutes.`;
    const html = getOtpHtml(otpCode);
    
    await sendEmail(email, subject, text, html);

    return ok(res, { distributorId: distributor._id, email: distributor.email }, 'Distributor registration initiated. OTP sent to email.', 201, req);
  } catch (error) {
    // If error, cleanup uploaded files
    if (req.files) {
      if (req.files['gstCertificate'] && fs.existsSync(req.files['gstCertificate'][0].path)) {
        try { fs.unlinkSync(req.files['gstCertificate'][0].path); } catch (e) {}
      }
      if (req.files['udyamCertificate'] && fs.existsSync(req.files['udyamCertificate'][0].path)) {
        try { fs.unlinkSync(req.files['udyamCertificate'][0].path); } catch (e) {}
      }
    }
    next(error);
  }
};

// 2. Verify Distributor OTP
const verifyDistributorOtp = async (req, res, next) => {
  try {
    const { distributorId, otp } = req.body;

    if (!distributorId || !otp) {
      return fail(res, 400, 'VALIDATION_ERROR', 'distributorId and otp are required.');
    }

    const distributor = await Distributor.findById(distributorId);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor record not found.');
    }

    // Check OTP expiration
    if (distributor.otpExpiresAt < new Date()) {
      return fail(res, 400, 'OTP_EXPIRED', 'OTP code has expired. Please register again to get a new code.');
    }

    // Check OTP match
    if (distributor.otp !== otp) {
      return fail(res, 400, 'INVALID_OTP', 'The OTP code entered is incorrect.');
    }

    // Success! Verify distributor
    distributor.isVerified = true;
    distributor.otp = undefined; // clear otp
    distributor.otpExpiresAt = undefined;
    await distributor.save();

    return ok(res, { verified: true, email: distributor.email }, 'Distributor verified successfully!', 200, req);
  } catch (error) {
    next(error);
  }
};

// 3. Get all distributors
const getDistributors = async (req, res, next) => {
  try {
    const distributors = await Distributor.find().sort({ createdAt: -1 });
    return ok(res, { distributors }, 'Distributors list retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

// 4. Toggle distributor verification status
const toggleDistributorVerification = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor not found.');
    }
    
    distributor.isVerified = !distributor.isVerified;
    await distributor.save();
    
    return ok(res, { distributor }, `Distributor verification status toggled to ${distributor.isVerified}`, 200, req);
  } catch (error) {
    next(error);
  }
};

// 5. Delete distributor and their certificates from disk
const deleteDistributor = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor not found.');
    }
    
    // Cleanup files on disk
    if (distributor.gstCertificatePath) {
      const gstPath = path.join(process.cwd(), distributor.gstCertificatePath);
      if (fs.existsSync(gstPath)) {
        try { fs.unlinkSync(gstPath); } catch (e) { console.error('Failed to delete GST certificate file:', e); }
      }
    }
    if (distributor.udyamCertificatePath) {
      const udyamPath = path.join(process.cwd(), distributor.udyamCertificatePath);
      if (fs.existsSync(udyamPath)) {
        try { fs.unlinkSync(udyamPath); } catch (e) { console.error('Failed to delete Udyam certificate file:', e); }
      }
    }
    
    await Distributor.findByIdAndDelete(req.params.id);
    return ok(res, null, 'Distributor record and files deleted successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

// 6. Download GST certificate
const downloadGstCertificate = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor not found.');
    }
    
    const filePath = resolveUploadPath(distributor.gstCertificatePath, 'gst_certificates');
    if (!filePath || !fs.existsSync(filePath)) {
      return fail(res, 404, 'FILE_NOT_FOUND', 'GST certificate file not found on disk.');
    }
    
    return res.download(filePath, distributor.gstCertificateOriginalName || 'gst_certificate.pdf');
  } catch (error) {
    next(error);
  }
};

// 7. Download Udyam certificate
const downloadUdyamCertificate = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor not found.');
    }
    
    const filePath = resolveUploadPath(distributor.udyamCertificatePath, 'udyam_certificates');
    if (!filePath || !fs.existsSync(filePath)) {
      return fail(res, 404, 'FILE_NOT_FOUND', 'Udyam certificate file not found on disk.');
    }
    
    return res.download(filePath, distributor.udyamCertificateOriginalName || 'udyam_certificate.pdf');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerDistributor,
  verifyDistributorOtp,
  getDistributors,
  toggleDistributorVerification,
  deleteDistributor,
  downloadGstCertificate,
  downloadUdyamCertificate
};
