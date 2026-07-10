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
    // Destructured all parameters uploaded from the frontend form
    const {
      name,
      email,
      mobile,
      address,
      city,
      state,
      country,
      company,
      teaType,
      monthlyReq,
      purpose,
      businessType,
      gstNumber
    } = req.body;

    if (!name || !email || !mobile || !city || !state) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Name, email, mobile, city, and state are required.');
    }

    // Capture standard payload keys
    const doc1 = req.files && req.files['primaryDocument'] ? req.files['primaryDocument'][0] : null;
    const doc2 = req.files && req.files['secondaryDocument'] ? req.files['secondaryDocument'][0] : null;

    // Check if there is an existing distributor with the same email
    let distributor = await Distributor.findOne({ email });

    if (!doc1 && !distributor) {
      return fail(res, 400, 'FILE_REQUIRED', 'Primary validation document is required.');
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (distributor) {
      // Clean up old doc1 on rewrite
      if (doc1 && distributor.doc1Path) {
        const oldDoc1 = path.join(process.cwd(), distributor.doc1Path);
        if (fs.existsSync(oldDoc1)) {
          try { fs.unlinkSync(oldDoc1); } catch (e) { }
        }
        distributor.doc1Path = getRelativePath(doc1.path);
      } else if (doc1) {
        distributor.doc1Path = getRelativePath(doc1.path);
      }
      
      // Clean up old doc2 on rewrite
      if (doc2 && distributor.doc2Path) {
        const oldDoc2 = path.join(process.cwd(), distributor.doc2Path);
        if (fs.existsSync(oldDoc2)) {
          try { fs.unlinkSync(oldDoc2); } catch (e) { }
        }
        distributor.doc2Path = getRelativePath(doc2.path);
      } else if (doc2) {
        distributor.doc2Path = getRelativePath(doc2.path);
      }

      // Sync every profile parameter provided by frontend actions
      distributor.name = name;
      distributor.mobile = mobile;
      distributor.address = address || distributor.address;
      distributor.city = city;
      distributor.state = state;
      distributor.country = country || distributor.country;
      distributor.company = company || distributor.company;
      distributor.teaType = teaType || distributor.teaType;
      distributor.monthlyReq = monthlyReq ? Number(monthlyReq) : distributor.monthlyReq;
      distributor.purpose = purpose || distributor.purpose;
      distributor.businessType = businessType || distributor.businessType;
      distributor.gstNumber = gstNumber || distributor.gstNumber;

      distributor.otpToken = otpCode;
      distributor.otpExpires = otpExpires;
      distributor.isOtpVerified = false; 
      distributor.approvalStatus = 'pending';
      await distributor.save();
    } else {
      distributor = new Distributor({
        name,
        email,
        mobile,
        address,
        city,
        state,
        country,
        company,
        teaType,
        monthlyReq: monthlyReq ? Number(monthlyReq) : 0,
        purpose,
        businessType,
        gstNumber,
        doc1Path: getRelativePath(doc1.path),
        doc2Path: doc2 ? getRelativePath(doc2.path) : undefined,
        otpToken: otpCode,
        otpExpires,
        isOtpVerified: false,
        approvalStatus: 'pending'
      });
      await distributor.save();
    }

    // Send OTP to distributor email
    const subject = 'Distributor Verification OTP - Prakriti Tea Division';
    const text = `Your OTP Code for distributor verification is: ${otpCode}. It will expire in 5 minutes.`;
    const html = getOtpHtml(otpCode);

    await sendEmail(email, subject, text, html);

    return ok(res, { distributorId: distributor._id, email: distributor.email }, 'Distributor registration initiated. OTP sent to email.', 201, req);
  } catch (error) {
    // If error, cleanup raw binary traces immediately from storage paths
    if (req.files) {
      const pDoc = req.files['primaryDocument'];
      const sDoc = req.files['secondaryDocument'];
      if (pDoc && fs.existsSync(pDoc[0].path)) {
        try { fs.unlinkSync(pDoc[0].path); } catch (e) { }
      }
      if (sDoc && fs.existsSync(sDoc[0].path)) {
        try { fs.unlinkSync(sDoc[0].path); } catch (e) { }
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
    if (new Date() > distributor.otpExpires) {
      return fail(res, 400, 'OTP_EXPIRED', 'OTP code has expired. Please register again to get a new code.');
    }

    // Check OTP match
    if (distributor.otpToken !== otp) {
      return fail(res, 400, 'INVALID_OTP', 'The OTP code entered is incorrect.');
    }

    // Success! Verify distributor and auto-approve for direct access
    distributor.isOtpVerified = true;
    distributor.approvalStatus = 'approved';
    distributor.otpToken = undefined; 
    distributor.otpExpires = undefined;
    await distributor.save();

    // Generate standardized session token (JWT)
    const jwt = require('jsonwebtoken');
    const env = require('../../config/env');
    const token = jwt.sign(
      { sub: distributor._id.toString(), role: 'DISTRIBUTOR', email: distributor.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return ok(res, {
      token,
      distributorId: distributor._id,
      email: distributor.email,
      approvalStatus: distributor.approvalStatus
    }, 'Distributor verified successfully!', 200, req);
  } catch (error) {
    next(error);
  }
};

// 3. Get distributor verification/approval status (Polling endpoint)
const getDistributorStatus = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor record not found.');
    }
    return ok(res, { approvalStatus: distributor.approvalStatus }, 'Status retrieved successfully.', 200, req);
  } catch (error) {
    next(error);
  }
};

// 4. Get gated bulk marketplace data
const getMarketplace = async (req, res, next) => {
  try {
    const userId = req.distributor ? req.distributor._id : null;
    if (!userId) {
      return fail(res, 401, 'UNAUTHORIZED', 'Access denied. Invalid session context.');
    }

    let user = await Distributor.findById(userId);
    if (!user && req.user) {
      user = {
        _id: req.user._id,
        name: req.user.fullName,
        approvalStatus: 'approved'
      };
    }

    if (!user || user.approvalStatus !== 'approved') {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Distributor status is not approved.', [], req);
    }

    const bulkMarketData = [
      {
        id: 'LOT-DARJ-2026-A1',
        gardenName: 'Makaibari Estate, Darjeeling',
        grade: 'FTGFOP1 (First Flush)',
        livePricePerKg: 1250,
        currency: 'INR',
        availableQuantityKg: 450,
        tastingMetrics: { astringency: 7, floralNotes: 9, body: 6, sweetness: 8 },
        harvestDate: '2026-05-15'
      },
      {
        id: 'LOT-ASSA-2026-B4',
        gardenName: 'Halmari Estate, Assam',
        grade: 'TGFOP (Second Flush)',
        livePricePerKg: 780,
        currency: 'INR',
        availableQuantityKg: 1200,
        tastingMetrics: { maltiness: 9, body: 9, briskness: 8, strength: 9 },
        harvestDate: '2026-06-02'
      }
    ];

    return ok(res, { marketData: bulkMarketData }, 'Live bulk market data retrieved successfully.', 200, req);
  } catch (error) {
    next(error);
  }
};

// 5. Get all distributors (Admin Panel compatibility)
const getDistributors = async (req, res, next) => {
  try {
    const distributors = await Distributor.find().sort({ createdAt: -1 });
    const mappedDistributors = distributors.map(dist => ({
      ...dist.toObject(),
      isVerified: dist.approvalStatus === 'approved'
    }));
    return ok(res, { distributors: mappedDistributors }, 'Distributors list retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

// 6. Toggle distributor verification status (Admin Panel compatibility)
const toggleDistributorVerification = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor not found.');
    }

    distributor.approvalStatus = distributor.approvalStatus === 'approved' ? 'pending' : 'approved';
    await distributor.save();

    const responseData = {
      ...distributor.toObject(),
      isVerified: distributor.approvalStatus === 'approved'
    };

    return ok(res, { distributor: responseData }, `Distributor verification status toggled to ${distributor.approvalStatus}`, 200, req);
  } catch (error) {
    next(error);
  }
};

// 7. Delete distributor and their certificates from disk
const deleteDistributor = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor not found.');
    }

    if (distributor.doc1Path) {
      const doc1Path = path.join(process.cwd(), distributor.doc1Path);
      if (fs.existsSync(doc1Path)) {
        try { fs.unlinkSync(doc1Path); } catch (e) { }
      }
    }
    if (distributor.doc2Path) {
      const doc2Path = path.join(process.cwd(), distributor.doc2Path);
      if (fs.existsSync(doc2Path)) {
        try { fs.unlinkSync(doc2Path); } catch (e) { }
      }
    }

    await Distributor.findByIdAndDelete(req.params.id);
    return ok(res, null, 'Distributor record and files deleted successfully', 200, req);
  } catch (error) {
    next(error);
  }
};

// 8. Download Document 1 (GST/FSSAI/IEC)
const downloadGstCertificate = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor not found.');
    }

    const filePath = resolveUploadPath(distributor.doc1Path, 'distributor_docs');
    if (!filePath || !fs.existsSync(filePath)) {
      return fail(res, 404, 'FILE_NOT_FOUND', 'GST/FSSAI/IEC document file not found on disk.');
    }

    return res.download(filePath, path.basename(distributor.doc1Path) || 'document_1.pdf');
  } catch (error) {
    next(error);
  }
};

// 9. Download Document 2 (UDYAM/Secondary)
const downloadUdyamCertificate = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor not found.');
    }

    if (!distributor.doc2Path) {
      return fail(res, 400, 'FILE_NOT_FOUND', 'No second document uploaded for this distributor.');
    }

    const filePath = resolveUploadPath(distributor.doc2Path, 'distributor_docs');
    if (!filePath || !fs.existsSync(filePath)) {
      return fail(res, 404, 'FILE_NOT_FOUND', 'Udyam/Secondary document file not found on disk.');
    }

    return res.download(filePath, path.basename(distributor.doc2Path) || 'document_2.pdf');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerDistributor,
  verifyDistributorOtp,
  getDistributorStatus,
  getMarketplace,
  getDistributors,
  toggleDistributorVerification,
  deleteDistributor,
  downloadGstCertificate,
  downloadUdyamCertificate
};
