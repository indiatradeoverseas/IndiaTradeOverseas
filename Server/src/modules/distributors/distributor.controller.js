const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Distributor = require('./distributor.model');
const DistributorTransaction = require('./transaction.model');
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
      gstNumber,
      division
    } = req.body;

    if (!name || !email || !mobile) {
      if (req.files) {
        const pDoc = req.files['doc1'] || req.files['primaryDocument'];
        const sDoc = req.files['doc2'] || req.files['secondaryDocument'];
        if (pDoc && fs.existsSync(pDoc[0].path)) {
          try { fs.unlinkSync(pDoc[0].path); } catch (e) { }
        }
        if (sDoc && fs.existsSync(sDoc[0].path)) {
          try { fs.unlinkSync(sDoc[0].path); } catch (e) { }
        }
      }
      return fail(res, 400, 'VALIDATION_ERROR', 'Name, email, and mobile are required.');
    }

    const doc1 = req.files && req.files['doc1'] ? req.files['doc1'][0] : (req.files && req.files['primaryDocument'] ? req.files['primaryDocument'][0] : null);
    const doc2 = req.files && req.files['doc2'] ? req.files['doc2'][0] : (req.files && req.files['secondaryDocument'] ? req.files['secondaryDocument'][0] : null);

    let distributor = await Distributor.findOne({ email });

    const currentBusinessType = businessType || (distributor ? distributor.businessType : '1');

    const hasDoc1 = doc1 || (distributor && distributor.doc1Path);
    const hasDoc2 = doc2 || (distributor && distributor.doc2Path);

    if (['1', '2', '3'].includes(currentBusinessType) && !hasDoc1) {
      if (req.files) {
        const pDoc = req.files['doc1'] || req.files['primaryDocument'];
        const sDoc = req.files['doc2'] || req.files['secondaryDocument'];
        if (pDoc && fs.existsSync(pDoc[0].path)) {
          try { fs.unlinkSync(pDoc[0].path); } catch (e) { }
        }
        if (sDoc && fs.existsSync(sDoc[0].path)) {
          try { fs.unlinkSync(sDoc[0].path); } catch (e) { }
        }
      }
      return fail(res, 400, 'VALIDATION_ERROR', 'Compliance Enforced: GST Certificate or Udyam Registration file is required.');
    }
    if (currentBusinessType === '4' && !hasDoc1) {
      if (req.files) {
        const pDoc = req.files['doc1'] || req.files['primaryDocument'];
        const sDoc = req.files['doc2'] || req.files['secondaryDocument'];
        if (pDoc && fs.existsSync(pDoc[0].path)) {
          try { fs.unlinkSync(pDoc[0].path); } catch (e) { }
        }
        if (sDoc && fs.existsSync(sDoc[0].path)) {
          try { fs.unlinkSync(sDoc[0].path); } catch (e) { }
        }
      }
      return fail(res, 400, 'VALIDATION_ERROR', 'Compliance Enforced: FSSAI License or GST Certificate upload is required.');
    }
    if (['5', '6', '7'].includes(currentBusinessType) && (!hasDoc1 || !hasDoc2)) {
      if (req.files) {
        const pDoc = req.files['doc1'] || req.files['primaryDocument'];
        const sDoc = req.files['doc2'] || req.files['secondaryDocument'];
        if (pDoc && fs.existsSync(pDoc[0].path)) {
          try { fs.unlinkSync(pDoc[0].path); } catch (e) { }
        }
        if (sDoc && fs.existsSync(sDoc[0].path)) {
          try { fs.unlinkSync(sDoc[0].path); } catch (e) { }
        }
      }
      return fail(res, 400, 'VALIDATION_ERROR', 'Compliance Enforced: Dual documentation stack required for verification.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (distributor) {
      if (doc1 && distributor.doc1Path) {
        const oldDoc1 = path.join(process.cwd(), distributor.doc1Path);
        if (fs.existsSync(oldDoc1)) {
          try { fs.unlinkSync(oldDoc1); } catch (e) { }
        }
        distributor.doc1Path = getRelativePath(doc1.path);
      } else if (doc1) {
        distributor.doc1Path = getRelativePath(doc1.path);
      }

      if (doc2 && distributor.doc2Path) {
        const oldDoc2 = path.join(process.cwd(), distributor.doc2Path);
        if (fs.existsSync(oldDoc2)) {
          try { fs.unlinkSync(oldDoc2); } catch (e) { }
        }
        distributor.doc2Path = getRelativePath(doc2.path);
      } else if (doc2) {
        distributor.doc2Path = getRelativePath(doc2.path);
      }

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
      distributor.division = division || distributor.division || 'TEA';

      distributor.otpToken = otpCode;
      distributor.otpExpires = otpExpires;
      distributor.isOtpVerified = false;
      if (distributor.approvalStatus !== 'approved') {
        distributor.approvalStatus = 'pending';
      }
      await distributor.save();
    } else {
      distributor = new Distributor({
        name,
        email,
        mobile,
        address: address || '',
        city: city || 'N/A',
        state: state || 'N/A',
        country: country || 'India',
        company,
        teaType,
        monthlyReq: monthlyReq ? Number(monthlyReq) : 0,
        purpose,
        businessType,
        gstNumber,
        doc1Path: doc1 ? getRelativePath(doc1.path) : '',
        doc2Path: doc2 ? getRelativePath(doc2.path) : undefined,
        otpToken: otpCode,
        otpExpires,
        isOtpVerified: false,
        approvalStatus: 'pending',
        division: division || 'TEA'
      });
      await distributor.save();
    }

    const subject = 'Distributor Verification OTP - Prakriti Tea Division';
    const text = `Your OTP Code for distributor verification is: ${otpCode}. It will expire in 5 minutes.`;
    const html = getOtpHtml(otpCode, email);

    await sendEmail(email, subject, text, html);

    return ok(res, { distributorId: distributor._id, email: distributor.email }, 'Distributor registration initiated. OTP sent to email.', 201, req);
  } catch (error) {
    if (req.files) {
      const pDoc = req.files['doc1'] || req.files['primaryDocument'];
      const sDoc = req.files['doc2'] || req.files['secondaryDocument'];
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

    if (new Date() > distributor.otpExpires) {
      return fail(res, 400, 'OTP_EXPIRED', 'OTP code has expired. Please register again to get a new code.');
    }
    if (distributor.otpToken !== otp) {
      return fail(res, 400, 'INVALID_OTP', 'The OTP code entered is incorrect.');
    }

    distributor.isOtpVerified = true;
    if (distributor.approvalStatus !== 'approved') {
      distributor.approvalStatus = 'pending';
    }
    distributor.otpToken = undefined;
    distributor.otpExpires = undefined;
    await distributor.save();

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

const toggleDistributorVerification = async (req, res, next) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return fail(res, 404, 'NOT_FOUND', 'Distributor not found.');
    }

    const previousStatus = distributor.approvalStatus;
    distributor.approvalStatus = distributor.approvalStatus === 'approved' ? 'pending' : 'approved';
    await distributor.save();

    if (distributor.approvalStatus === 'approved') {
      try {
        const subject = 'Account Approved - Prakriti Tea B2B Portal';
        const text = `Congratulations! Your distributor profile has been approved. You can now access our premium items.`;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Account Approved - IndiaTradeOverseas</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #eeeeee;
            padding-bottom: 20px;
        }
        .header h2 {
            color: #004B3B;
            margin: 0;
        }
        .content {
            padding: 20px 0;
            line-height: 1.6;
            color: #555555;
        }
        .btn-container {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            background-color: #004B3B;
            color: #50C878 !important;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 5px;
            font-weight: bold;
            display: inline-block;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eeeeee;
            text-align: center;
            font-size: 12px;
            color: #999999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Prakriti Tea Division</h2>
        </div>
        <div class="content">
            <p>Dear ${distributor.name},</p>
            <p>Congratulations! Your business registration has been verified and approved by our team.</p>
            <p>You can now access our premium items, view real-time bulk pricing, inspect tasting scores, and place orders.</p>
            <div class="btn-container">
                <a href="${frontendUrl}/prakriti" class="btn" style="color: #50C878;">Access Distributor Page</a>
            </div>
            <p>If you have any questions or require procurement support, feel free to contact your account manager.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 IndiaTradeOverseas. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
        await sendEmail(distributor.email, subject, text, html);
      } catch (err) {
        console.error('Error sending approval email:', err);
      }
    }

    const responseData = {
      ...distributor.toObject(),
      isVerified: distributor.approvalStatus === 'approved'
    };

    return ok(res, { distributor: responseData }, `Distributor verification status toggled to ${distributor.approvalStatus}`, 200, req);
  } catch (error) {
    next(error);
  }
};

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

// Razorpay and PayPal Online Payment Integrations
const getRazorpayAuth = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_live_TDkYIhxFKBUK3K';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '2DL5K0rcm00absDWP8oniGT8';
  return Buffer.from(`${keyId}:${keySecret}`).toString('base64');
};

const createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount, lotId, quantity } = req.body;
    if (!amount || !lotId || !quantity) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Amount, lotId and quantity are required.');
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_live_TDkYIhxFKBUK3K';
    const auth = getRazorpayAuth();
    
    // Amount is in INR. Razorpay expects it in paise (multiply by 100)
    const amountInPaise = Math.round(Number(amount) * 100);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `dist_receipt_${Date.now()}`
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return fail(res, response.status, 'PAYMENT_GATEWAY_ERROR', `Razorpay Order Error: ${errText}`);
    }

    const order = await response.json();
    return ok(res, { orderId: order.id, amount: order.amount, keyId }, 'Razorpay order created successfully', 201, req);
  } catch (error) {
    next(error);
  }
};

const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, lotId, quantity, amount } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !lotId || !quantity || !amount) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Missing verification parameters.');
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || '2DL5K0rcm00absDWP8oniGT8';
    
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return fail(res, 400, 'PAYMENT_VERIFICATION_FAILED', 'Invalid signature verification.');
    }

    // Save transaction
    const transaction = new DistributorTransaction({
      distributorId: req.distributor._id,
      lotId,
      quantity: Number(quantity),
      amount: Number(amount),
      currency: 'INR',
      paymentGateway: 'Razorpay',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: 'Success'
    });
    await transaction.save();

    return ok(res, { transaction }, 'Payment verified successfully and transaction recorded.', 200, req);
  } catch (error) {
    next(error);
  }
};

const getPaypalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID || 'AQsHOxpt4otfYTb2UO0WvHMH3q5ZkC-XZffGbPVL3QtcA-MQwZg6zuzOCWXpTJbdt3XbuUjz9N59CRRr';
  const clientSecret = process.env.PAYPAL_SECRET || 'EIUlUHJZ_ohSB1yms0nKdI7SA2AvEqbb8uiDHCyD5dkrltSIAidRLiIDXSGYkGIWGXcMiChVWrvQFfsh';
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PayPal Auth Error: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
};

const createPaypalOrder = async (req, res, next) => {
  try {
    const { amount, lotId, quantity } = req.body;
    if (!amount || !lotId || !quantity) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Amount, lotId and quantity are required.');
    }

    const accessToken = await getPaypalAccessToken();

    // Convert INR to USD (dividing by 85) for international gateway
    const usdAmount = (Number(amount) / 85).toFixed(2);

    const response = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: usdAmount
            },
            description: `Prakriti Sourcing Lot ${lotId} - ${quantity} Kg`
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return fail(res, response.status, 'PAYMENT_GATEWAY_ERROR', `PayPal Create Order Error: ${errText}`);
    }

    const order = await response.json();
    return ok(res, { orderId: order.id, usdAmount }, 'PayPal order created successfully', 201, req);
  } catch (error) {
    next(error);
  }
};

const capturePaypalOrder = async (req, res, next) => {
  try {
    const { orderId, lotId, quantity, amount } = req.body;
    if (!orderId || !lotId || !quantity || !amount) {
      return fail(res, 400, 'VALIDATION_ERROR', 'orderId, lotId, quantity and amount are required.');
    }

    const accessToken = await getPaypalAccessToken();

    const response = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return fail(res, response.status, 'PAYMENT_GATEWAY_ERROR', `PayPal Capture Order Error: ${errText}`);
    }

    const capture = await response.json();
    if (capture.status !== 'COMPLETED') {
      return fail(res, 400, 'PAYMENT_CAPTURE_FAILED', `PayPal Order not completed: Current status is ${capture.status}`);
    }

    // Save transaction
    const transaction = new DistributorTransaction({
      distributorId: req.distributor._id,
      lotId,
      quantity: Number(quantity),
      amount: Number(amount),
      currency: 'INR',
      paymentGateway: 'PayPal',
      paymentId: capture.purchase_units[0].payments.captures[0].id,
      orderId: orderId,
      status: 'Success'
    });
    await transaction.save();

    return ok(res, { transaction }, 'PayPal payment captured successfully and transaction recorded.', 200, req);
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
  downloadUdyamCertificate,
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPaypalOrder,
  capturePaypalOrder
};
