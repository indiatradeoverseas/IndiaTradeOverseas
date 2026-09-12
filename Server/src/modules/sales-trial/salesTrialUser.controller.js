const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const SalesTrialUser = require('./salesTrialUser.model');
const Task = require('../task/task.model');
const { generateAccessToken } = require('../auth/token.service');
const { ok, fail } = require('../../utils/response');
const socketService = require('../../services/socket.service');

const { generateOtp, getOtpHtml } = require('../../utils/otp');
const { sendEmail } = require('../../utils/mailer');

// Generate Next TRL Employee ID (e.g., TRL001, TRL002)
async function getNextTrialIdHelper() {
  const users = await SalesTrialUser.find({}, { trialId: 1 });
  let maxNum = 0;
  users.forEach(u => {
    if (u.trialId && u.trialId.startsWith('TRL')) {
      const numPart = u.trialId.replace('TRL', '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });
  const nextNum = maxNum + 1;
  return `TRL${String(nextNum).padStart(3, '0')}`;
}

// Controller: Get Next TRL ID API
async function getNextTrialId(req, res, next) {
  try {
    const nextTrialId = await getNextTrialIdHelper();
    return ok(res, { nextTrialId }, 'Next Trial Employee ID generated', 200, req);
  } catch (err) {
    next(err);
  }
}

// Controller: Create Sales Trial Account by Sales Manager / Admin
async function createSalesTrialUser(req, res, next) {
  try {
    const { fullName, email, password, phone, assignedManagerName } = req.body;

    if (!fullName || !email || !password) {
      return fail(res, 400, 'BAD_REQUEST', 'fullName, email, and password are required', [], req);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await SalesTrialUser.findOne({ email: normalizedEmail });
    if (existing) {
      return fail(res, 409, 'DUPLICATE_EMAIL', 'Sales Trial Employee email already registered', [], req);
    }

    const trialId = req.body.trialId || (await getNextTrialIdHelper());

    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    const trialUser = await SalesTrialUser.create({
      _id: new mongoose.Types.ObjectId(),
      trialId,
      fullName,
      name: fullName,
      email: normalizedEmail,
      passwordHash,
      phone: phone || '',
      role: 'SALES_TRIAL',
      department: 'SALES_TRIAL',
      position: 'Sales Trial Executive',
      assignedManager: req.user?._id || req.user?.id || null,
      assignedManagerName: assignedManagerName || req.user?.fullName || req.user?.name || 'Sales Manager',
      status: 'ACTIVE',
      isApproved: true,
      isOtpVerified: true
    });

    const userObj = trialUser.toObject();
    delete userObj.passwordHash;

    return ok(res, { trialUser: userObj }, 'Sales Trial Executive account created successfully', 201, req);
  } catch (err) {
    next(err);
  }
}

// Controller: Self-Registration for Sales Trial Account (Sends OTP & Requires Verification)
async function registerSalesTrialUser(req, res, next) {
  try {
    const { fullName, email, password, phone } = req.body;

    if (!fullName || !email || !password) {
      return fail(res, 400, 'BAD_REQUEST', 'fullName, email, and password are required', [], req);
    }

    const normalizedEmail = email.toLowerCase().trim();
    let trialUser = await SalesTrialUser.findOne({ email: normalizedEmail });
    
    if (trialUser) {
      if (trialUser.isOtpVerified) {
        return fail(res, 409, 'DUPLICATE_EMAIL', 'Sales Trial Employee email already registered and verified', [], req);
      }
      // If user started registration earlier but did not complete OTP verification, regenerate OTP
      const otpCode = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
      
      trialUser.fullName = fullName;
      trialUser.name = fullName;
      trialUser.passwordHash = await bcrypt.hash(password, bcryptRounds);
      trialUser.phone = phone || '';
      trialUser.otpCode = otpCode;
      trialUser.otpExpiresAt = otpExpiresAt;
      await trialUser.save();

      // Send OTP via Mailer
      await sendEmail(
        normalizedEmail,
        'Sales Trial Account Email Verification OTP - India Trade Overseas',
        `Your verification OTP is: ${otpCode}`,
        getOtpHtml(otpCode, normalizedEmail)
      ).catch(err => console.error('Failed to send OTP email:', err));

      return ok(
        res,
        { email: normalizedEmail, trialId: trialUser.trialId },
        'Verification OTP sent to your email address. Please enter the 6-digit OTP code to complete registration.',
        200,
        req
      );
    }

    const trialId = req.body.trialId || (await getNextTrialIdHelper());
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const passwordHash = await bcrypt.hash(password, bcryptRounds);
    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    trialUser = await SalesTrialUser.create({
      _id: new mongoose.Types.ObjectId(),
      trialId,
      fullName,
      name: fullName,
      email: normalizedEmail,
      passwordHash,
      phone: phone || '',
      role: 'SALES_TRIAL',
      department: 'SALES_TRIAL',
      position: 'Sales Trial Executive',
      assignedManager: null,
      assignedManagerName: 'Sales Manager',
      status: 'PENDING_APPROVAL',
      isApproved: false,
      isOtpVerified: false,
      otpCode,
      otpExpiresAt
    });

    // Send OTP via Mailer
    await sendEmail(
      normalizedEmail,
      'Sales Trial Account Email Verification OTP - India Trade Overseas',
      `Your verification OTP is: ${otpCode}`,
      getOtpHtml(otpCode, normalizedEmail)
    ).catch(err => console.error('Failed to send OTP email:', err));

    return ok(
      res,
      { email: normalizedEmail, trialId: trialUser.trialId },
      'Verification OTP sent to your email address. Please enter the 6-digit OTP code to complete registration.',
      201,
      req
    );
  } catch (err) {
    next(err);
  }
}

// Controller: Verify OTP for Sales Trial Account (Transitions to HR Manager Approval Queue)
async function verifySalesTrialOtp(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return fail(res, 400, 'BAD_REQUEST', 'Email and 6-digit OTP code are required', [], req);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trialUser = await SalesTrialUser.findOne({ email: normalizedEmail });

    if (!trialUser) {
      return fail(res, 404, 'NOT_FOUND', 'Registration record not found for this email', [], req);
    }

    if (trialUser.isOtpVerified) {
      return ok(
        res,
        { trialUser: { email: trialUser.email, trialId: trialUser.trialId, isOtpVerified: true } },
        'OTP already verified. Profile is pending HR Manager approval.',
        200,
        req
      );
    }

    if (!trialUser.otpCode || trialUser.otpCode !== String(otp).trim()) {
      return fail(res, 400, 'INVALID_OTP', 'Invalid OTP code. Please check your email and try again.', [], req);
    }

    if (trialUser.otpExpiresAt && new Date() > trialUser.otpExpiresAt) {
      return fail(res, 400, 'OTP_EXPIRED', 'OTP code has expired. Please request a new OTP.', [], req);
    }

    trialUser.isOtpVerified = true;
    trialUser.otpCode = null;
    trialUser.otpExpiresAt = null;
    trialUser.status = 'PENDING_APPROVAL';
    trialUser.isApproved = false;
    await trialUser.save();

    const userObj = trialUser.toObject();
    delete userObj.passwordHash;

    return ok(
      res,
      { trialUser: userObj },
      'OTP Verified Successfully! Your profile has been sent to the HR Manager for approval.',
      200,
      req
    );
  } catch (err) {
    next(err);
  }
}

// Controller: Resend OTP for Sales Trial Signup
async function resendSalesTrialOtp(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return fail(res, 400, 'BAD_REQUEST', 'Email is required', [], req);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trialUser = await SalesTrialUser.findOne({ email: normalizedEmail });

    if (!trialUser) {
      return fail(res, 404, 'NOT_FOUND', 'Registration record not found for this email', [], req);
    }

    if (trialUser.isOtpVerified) {
      return fail(res, 400, 'ALREADY_VERIFIED', 'OTP is already verified for this account.', [], req);
    }

    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    trialUser.otpCode = otpCode;
    trialUser.otpExpiresAt = otpExpiresAt;
    await trialUser.save();

    await sendEmail(
      normalizedEmail,
      'Resent Email Verification OTP - India Trade Overseas',
      `Your new verification OTP is: ${otpCode}`,
      getOtpHtml(otpCode, normalizedEmail)
    ).catch(err => console.error('Failed to resend OTP email:', err));

    return ok(
      res,
      { email: normalizedEmail },
      'A new 6-digit OTP code has been sent to your email address.',
      200,
      req
    );
  } catch (err) {
    next(err);
  }
}

// Controller: Login Sales Trial Employee
async function loginSalesTrialUser(req, res, next) {
  try {
    const { emailOrTrialId, password } = req.body;

    if (!emailOrTrialId || !password) {
      return fail(res, 400, 'BAD_REQUEST', 'Email/Trial ID and password are required', [], req);
    }

    const searchStr = emailOrTrialId.trim();
    const trialUser = await SalesTrialUser.findOne({
      $or: [
        { email: new RegExp('^' + searchStr + '$', 'i') },
        { trialId: new RegExp('^' + searchStr + '$', 'i') }
      ]
    });

    if (!trialUser) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid Trial ID / Email or Password', [], req);
    }

    if (trialUser.status === 'PENDING_APPROVAL' || !trialUser.isApproved) {
      return fail(
        res,
        403,
        'AUTH_PENDING_APPROVAL',
        'Your Sales Trial account is pending approval by HR Manager / Sales Manager. Please contact HR to approve your login.',
        [],
        req
      );
    }

    if (trialUser.status !== 'ACTIVE') {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Sales Trial Account is deactivated', [], req);
    }

    const isMatch = await bcrypt.compare(password, trialUser.passwordHash);
    if (!isMatch) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials', [], req);
    }

    const userForToken = {
      _id: trialUser._id,
      employeeId: trialUser.trialId,
      trialId: trialUser.trialId,
      name: trialUser.fullName,
      fullName: trialUser.fullName,
      email: trialUser.email,
      role: 'SALES_TRIAL',
      department: 'SALES_TRIAL',
      position: trialUser.position
    };

    const token = generateAccessToken(userForToken);

    return ok(res, { token, user: userForToken, trialUser: userForToken }, 'Sales Trial login successful', 200, req);
  } catch (err) {
    next(err);
  }
}

// Helper function to resolve SalesTrialUser by ObjectId, string _id, or trialId
async function findTrialUserByIdHelper(id) {
  if (!id) return null;
  const strId = String(id).trim();
  const query = [{ trialId: strId }, { trialId: strId.toUpperCase() }, { _id: strId }];
  if (mongoose.Types.ObjectId.isValid(strId)) {
    query.push({ _id: new mongoose.Types.ObjectId(strId) });
  }
  return await SalesTrialUser.findOne({ $or: query });
}

// Controller: Approve Sales Trial Account (by HR / Sales Manager)
async function approveSalesTrialUser(req, res, next) {
  try {
    const { id } = req.params;

    const trialUser = await findTrialUserByIdHelper(id);

    if (!trialUser) {
      return fail(res, 404, 'NOT_FOUND', 'Sales Trial user not found', [], req);
    }

    trialUser.status = 'ACTIVE';
    trialUser.isApproved = true;
    if (req.user?._id) {
      trialUser.assignedManager = req.user._id;
      trialUser.assignedManagerName = req.user.fullName || req.user.name || 'Sales Manager';
    }
    await trialUser.save();

    const userObj = trialUser.toObject();
    delete userObj.passwordHash;

    return ok(res, { trialUser: userObj }, 'Sales Trial user approved successfully', 200, req);
  } catch (err) {
    next(err);
  }
}

// Controller: Reject / Deactivate Sales Trial Account
async function rejectSalesTrialUser(req, res, next) {
  try {
    const { id } = req.params;

    const trialUser = await findTrialUserByIdHelper(id);

    if (!trialUser) {
      return fail(res, 404, 'NOT_FOUND', 'Sales Trial user not found', [], req);
    }

    trialUser.status = 'INACTIVE';
    trialUser.isApproved = false;
    await trialUser.save();

    const userObj = trialUser.toObject();
    delete userObj.passwordHash;

    return ok(res, { trialUser: userObj }, 'Sales Trial user account rejected / deactivated', 200, req);
  } catch (err) {
    next(err);
  }
}

// Controller: List all Sales Trial Users for Sales Manager / HR
async function getSalesTrialUsers(req, res, next) {
  try {
    const users = await SalesTrialUser.find({}, '-passwordHash').sort({ createdAt: -1 });
    return ok(res, { users }, 'Sales Trial users fetched successfully', 200, req);
  } catch (err) {
    next(err);
  }
}

// Controller: Assign Task specifically to Sales Trial Employee
async function assignTaskToTrialUser(req, res, next) {
  try {
    const { trialUserId, title, description, dueDate, priority } = req.body;

    if (!trialUserId || !title || !dueDate) {
      return fail(res, 400, 'BAD_REQUEST', 'trialUserId, title, and dueDate are required', [], req);
    }

    const trialUser = await findTrialUserByIdHelper(trialUserId);

    const task = await Task.create({
      _id: new mongoose.Types.ObjectId(),
      title,
      description: description || '',
      assignedTo: trialUser ? trialUser._id : trialUserId,
      assignedToName: trialUser ? trialUser.fullName : 'Sales Trial Executive',
      assignedBy: req.user?._id || req.user?.id,
      assignedByName: req.user?.fullName || req.user?.name || 'Sales Manager',
      dueDate: new Date(dueDate),
      priority: priority || 'MEDIUM',
      status: 'PENDING',
      department: 'SALES_TRIAL'
    });

    if (socketService && trialUser) {
      socketService.emitToEmployee(trialUser._id, 'task_assigned', task);
    }

    return ok(res, { task }, 'Task assigned to Sales Trial Executive successfully', 201, req);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNextTrialId,
  createSalesTrialUser,
  registerSalesTrialUser,
  verifySalesTrialOtp,
  resendSalesTrialOtp,
  loginSalesTrialUser,
  approveSalesTrialUser,
  rejectSalesTrialUser,
  getSalesTrialUsers,
  assignTaskToTrialUser
};
