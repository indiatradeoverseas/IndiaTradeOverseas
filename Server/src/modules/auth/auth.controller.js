const authService = require('./auth.service');
const tokenService = require('./token.service');
const User = require('../users/user.model');
const TrustedDevice = require('./trustedDevice.model');
const { ok, fail } = require('../../utils/response');
const { recordAudit } = require('../security-audit/auditLog.service');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../../utils/mailer');
const { generateOtp, getOtpHtml } = require('../../utils/otp');
const otpModel = require('./Model.otp');
const sessionModel = require('./session.model');

function sanitizeUser(user) {
  const plain = user.toObject ? user.toObject() : user;
  delete plain.passwordHash;
  delete plain.otp;
  delete plain.otpExpires;
  delete plain.failedLoginCount;
  return plain;
}

async function register(req, res, next) {
  try {
    const { employeeId, fullName, email, phone, password, role, department } = req.body;

    if (!employeeId || !fullName || !email || !password) {
      return fail(res, 400, 'VALIDATION_FAILED', 'employeeId, fullName, email, and password are required');
    }

    const userService = require('../users/user.service');
    const user = await userService.createUser({
      employeeId,
      fullName,
      email,
      phone,
      password,
      role: role || 'SALES',
      department: department || 'SALES'
    });

    const isClient = employeeId && employeeId.startsWith('CL_');
    if (isClient) {
      try {
        const Client = require('../clients/client.model');
        await Client.create({
          userId: user._id,
          email: user.email,
          phone: user.phone || phone || '',
          companyName: req.body.companyName || '',
          address: req.body.address || '',
          gstin: req.body.gstin || '',
          businessType: req.body.businessType || '',
          status: 'PENDING'
        });
      } catch (clientErr) {

        await User.deleteOne({ _id: user._id });
        throw clientErr;
      }
    }


    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);


    await otpModel.deleteMany({ email: user.email });
    await otpModel.create({
      email: user.email,
      user: user._id,
      otpHash
    });


    await sendEmail(user.email, 'Email Verification Code', null, getOtpHtml(otp));


    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const crypto = require('crypto');
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

    const session = await sessionModel.create({
      user: user._id,
      refreshTokenHash: tokenHash,
      ip,
      userAgent
    });

    const accessToken = tokenService.generateAccessToken(user);
    const jwt = require('jsonwebtoken');
    const env = require('../../config/env');
    const refreshToken = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await recordAudit({
      actorId: user._id,
      actionType: 'USER_CREATED',
      entityType: 'USER',
      entityId: user._id.toString(),
      severity: 'LOW',
      ipAddress: req.ip,
      deviceHash: req.headers['x-device-hash'] || '',
      metadata: { employeeId: user.employeeId }
    });

    return ok(res, {
      user: sanitizeUser(user),
      token: accessToken,
      refreshToken,
      isEmailVerified: false
    }, 'Registration successful. A verification OTP has been sent to ' + user.email, 201, req);
  } catch (error) {
    if (error.code === 11000 || error.message.includes('duplicate key') || error.message.includes('DUPLICATE_FOUND')) {
      return fail(res, 409, 'DUPLICATE_FOUND', 'User with this email or Employee ID already exists');
    }
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const deviceHash = req.headers['x-device-hash'] || req.body.deviceHash || '';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';

    if (!email || !password) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Email and password are required');
    }

    const user = await authService.login({ email, password, ipAddress, deviceHash });


    if (!user.isEmailVerified) {
      const otp = generateOtp();
      const otpHash = await bcrypt.hash(otp, 10);
      await otpModel.deleteMany({ email: user.email });
      await otpModel.create({
        email: user.email,
        user: user._id,
        otpHash
      });
      await sendEmail(user.email, 'Email Verification Code', null, getOtpHtml(otp));

      return fail(res, 403, 'EMAIL_NOT_VERIFIED', 'Your email is not verified. A new verification OTP has been sent to ' + user.email);
    }

    const accessToken = tokenService.generateAccessToken(user);


    const crypto = require('crypto');
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

    const session = await sessionModel.create({
      user: user._id,
      refreshTokenHash: tokenHash,
      ip: ipAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const jwt = require('jsonwebtoken');
    const env = require('../../config/env');
    const refreshToken = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );


    let requiresDeviceApproval = false;
    const isClient = user.employeeId && user.employeeId.startsWith('CL_');
    const isBypassedRole = ['ADMIN', 'MANAGER', 'HR'].includes(user.role);
    const bypassDeviceCheck = isClient || isBypassedRole;

    if (!bypassDeviceCheck) {
      if (deviceHash) {
        const device = await TrustedDevice.findOne({ userId: user._id, deviceHash });
        if (!device || !device.isApproved) {
          requiresDeviceApproval = true;
        }
      } else {
        requiresDeviceApproval = true;
      }
    }

    return ok(res, {
      user: sanitizeUser(user),
      token: accessToken,
      refreshToken,
      requiresDeviceApproval
    }, 'Login successful', 200, req);
  } catch (error) {
    if (error.message === 'ACCOUNT_LOCKED') {
      return fail(res, 403, 'ACCOUNT_LOCKED', 'Your account has been locked due to consecutive login failures.');
    }
    if (error.message === 'AUTH_INVALID_CREDENTIALS') {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    }
    next(error);
  }
}

async function requestOtp(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return fail(res, 404, 'VALIDATION_FAILED', 'User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await recordAudit({
      actorId: user._id,
      actionType: 'DEVICE_APPROVAL_REQUEST',
      entityType: 'USER',
      entityId: user._id.toString(),
      severity: 'LOW',
      ipAddress: req.ip,
      metadata: { email }
    });

    return ok(res, { otp }, 'OTP generated successfully (Demo Mode)', 200, req);
  } catch (error) {
    next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const deviceHash = req.headers['x-device-hash'] || req.body.deviceHash || '';

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or inactive user');
    }

    if (!user.otp || user.otp !== otp || new Date() > user.otpExpires) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid or expired OTP');
    }


    user.otp = null;
    user.otpExpires = null;
    await user.save();


    let requiresDeviceApproval = false;
    const isClient = user.employeeId && user.employeeId.startsWith('CL_');
    const isBypassedRole = ['ADMIN', 'MANAGER', 'HR'].includes(user.role);
    const bypassDeviceCheck = isClient || isBypassedRole;

    if (!bypassDeviceCheck) {
      if (deviceHash) {
        const device = await TrustedDevice.findOne({ userId: user._id, deviceHash });
        if (!device || !device.isApproved) {
          requiresDeviceApproval = true;
        }
      } else {
        requiresDeviceApproval = true;
      }
    }

    const accessToken = tokenService.generateAccessToken(user);


    const crypto = require('crypto');
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

    const session = await sessionModel.create({
      user: user._id,
      refreshTokenHash: tokenHash,
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const jwt = require('jsonwebtoken');
    const env = require('../../config/env');
    const refreshToken = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return ok(res, {
      user: sanitizeUser(user),
      token: accessToken,
      refreshToken,
      requiresDeviceApproval
    }, 'OTP verified successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Email and OTP are required');
    }

    const otpRecord = await otpModel.findOne({ email }).sort({ createdAt: -1 });
    if (!otpRecord) {
      return fail(res, 400, 'INVALID_OTP', 'No OTP request found for this email');
    }


    const elapsed = Date.now() - new Date(otpRecord.createdAt).getTime();
    if (elapsed > 15 * 60 * 1000) {
      return fail(res, 400, 'EXPIRED_OTP', 'OTP has expired. Please log in to request a new one.');
    }

    const matched = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!matched) {
      return fail(res, 401, 'INVALID_OTP', 'Invalid verification code');
    }

    const user = await User.findOne({ email });
    if (!user) {
      return fail(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    user.isEmailVerified = true;
    await user.save();


    await otpModel.deleteOne({ _id: otpRecord._id });


    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const crypto = require('crypto');
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

    const session = await sessionModel.create({
      user: user._id,
      refreshTokenHash: tokenHash,
      ip,
      userAgent
    });

    const accessToken = tokenService.generateAccessToken(user);
    const jwt = require('jsonwebtoken');
    const env = require('../../config/env');
    const refreshToken = jwt.sign(
      { sub: user._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await recordAudit({
      actorId: user._id,
      actionType: 'EMAIL_VERIFIED',
      entityType: 'USER',
      entityId: user._id.toString(),
      severity: 'LOW',
      ipAddress: req.ip,
      metadata: { email }
    });

    return ok(res, {
      user: sanitizeUser(user),
      token: accessToken,
      refreshToken
    }, 'Email verified successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function refreshToken(req, res, next) {
  try {
    let token = req.query.refreshToken || req.headers['x-refresh-token'];
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Refresh token is required');
    }

    const jwt = require('jsonwebtoken');
    const env = require('../../config/env');

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return fail(res, 401, 'AUTH_TOKEN_EXPIRED', 'Invalid or expired refresh token');
    }

    const session = await sessionModel.findOne({ _id: decoded.sid, user: decoded.sub, revoked: false });
    if (!session) {
      return fail(res, 401, 'AUTH_TOKEN_EXPIRED', 'Session expired or revoked');
    }

    const matched = await bcrypt.compare(decoded.raw, session.refreshTokenHash);
    if (!matched) {
      return fail(res, 401, 'AUTH_TOKEN_EXPIRED', 'Session credentials invalid');
    }


    session.revoked = true;
    await session.save();

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'User is deactivated or invalid');
    }


    const crypto = require('crypto');
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = await bcrypt.hash(rawRefreshToken, 10);

    const newSession = await sessionModel.create({
      user: user._id,
      refreshTokenHash: newRefreshTokenHash,
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const newAccessToken = tokenService.generateAccessToken(user);
    const newRefreshToken = jwt.sign(
      { sub: user._id.toString(), sid: newSession._id.toString(), raw: rawRefreshToken },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return ok(res, {
      token: newAccessToken,
      refreshToken: newRefreshToken
    }, 'Token rotated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {

  return refreshToken(req, res, next);
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body || req.query || {};
    let token = refreshToken || req.headers['x-refresh-token'];
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const env = require('../../config/env');
        const decoded = jwt.verify(token, env.JWT_SECRET);
        await sessionModel.findOneAndUpdate({ _id: decoded.sid }, { revoked: true });
      } catch (e) {
        await tokenService.revokeRefreshToken(token);
      }
    }
    return ok(res, {}, 'Logged out successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function logoutAll(req, res, next) {
  try {
    await sessionModel.updateMany({ user: req.user._id }, { revoked: true });


    const RefreshToken = require('./refreshToken.model');
    await RefreshToken.updateMany({ userId: req.user._id }, { isRevoked: true });

    return ok(res, {}, 'Logged out from all sessions successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    return ok(res, { user: sanitizeUser(req.user) }, 'Current user retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  return me(req, res, next);
}

async function getSessions(req, res, next) {
  try {
    const devices = await TrustedDevice.find({ userId: req.user._id });
    return ok(res, { devices }, 'Devices list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function requestDeviceApproval(req, res, next) {
  try {
    const { deviceHash, deviceName } = req.body;
    if (!deviceHash) {
      return fail(res, 400, 'VALIDATION_FAILED', 'deviceHash is required');
    }

    let device = await TrustedDevice.findOne({ userId: req.user._id, deviceHash });
    if (!device) {
      device = await TrustedDevice.create({
        userId: req.user._id,
        deviceHash,
        deviceName: deviceName || 'Unknown Device',
        ipAddress: req.ip || '',
        isApproved: false
      });
    }

    await recordAudit({
      actorId: req.user._id,
      actionType: 'DEVICE_APPROVAL_REQUEST',
      entityType: 'DEVICE',
      entityId: device._id.toString(),
      severity: 'LOW',
      ipAddress: req.ip,
      deviceHash,
      metadata: { deviceName }
    });

    return ok(res, { device }, 'Device approval request submitted successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Email is required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      return fail(res, 404, 'USER_NOT_FOUND', 'User with this email does not exist');
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await otpModel.deleteMany({ email: user.email });
    await otpModel.create({
      email: user.email,
      user: user._id,
      otpHash
    });

    await sendEmail(user.email, 'Password Reset OTP Code', null, getOtpHtml(otp));

    return ok(res, {}, 'Password reset OTP sent successfully to your email', 200, req);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Email, OTP and new password are required');
    }

    const otpRecord = await otpModel.findOne({ email }).sort({ createdAt: -1 });
    if (!otpRecord) {
      return fail(res, 400, 'INVALID_OTP', 'No OTP request found for this email');
    }

    const elapsed = Date.now() - new Date(otpRecord.createdAt).getTime();
    if (elapsed > 15 * 60 * 1000) {
      return fail(res, 400, 'EXPIRED_OTP', 'OTP has expired. Please request a new one.');
    }

    const matched = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!matched) {
      return fail(res, 401, 'INVALID_OTP', 'Invalid OTP code');
    }

    const user = await User.findOne({ email });
    if (!user) {
      return fail(res, 404, 'USER_NOT_FOUND', 'User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    await otpModel.deleteMany({ email: user.email });

    await recordAudit({
      actorId: user._id,
      actionType: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: user._id.toString(),
      severity: 'MEDIUM',
      ipAddress: req.ip,
      deviceHash: req.headers['x-device-hash'] || '',
      metadata: { email }
    });

    return ok(res, {}, 'Password reset successful', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  requestOtp,
  verifyOtp,
  refresh,
  logout,
  me,
  getSessions,
  requestDeviceApproval,
  getMe,
  refreshToken,
  logoutAll,
  verifyEmail,
  forgotPassword,
  resetPassword
};

