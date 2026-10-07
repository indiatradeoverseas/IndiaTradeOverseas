const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('./admin.model');
const tokenService = require('../auth/token.service');
const sessionModel = require('../auth/session.model');
const env = require('../../config/env');
const securityConfig = require('../../config/security');
const { ok, fail } = require('../../utils/response');
const { recordAudit } = require('../security-audit/auditLog.service');
const { raiseAlert } = require('../security-audit/securityAlert.service');
const { verifyGoogleIdToken } = require('../../utils/googleAuth');

const { generateOtp, getOtpHtml } = require('../../utils/otp');
const { sendEmail } = require('../../utils/mailer');
const otpModel = require('../auth/Model.otp');

const ADMIN_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  CEO: 'CEO',
  FOUNDER: 'FOUNDER',
  CO_FOUNDER: 'CO_FOUNDER',
  SUPER_ADMIN: 'SUPER_ADMIN'
});

function resolveAdminRole(targetAccount) {
  if (!targetAccount) return null;
  const role = (targetAccount.role || '').toUpperCase();
  const position = (targetAccount.position || '').toLowerCase();
  const email = (targetAccount.email || '').toLowerCase();
  const empId = (targetAccount.employeeId || '').toUpperCase();

  if (role === ADMIN_ROLES.CEO || position.includes('chief executive') || position === 'ceo' || empId.includes('CEO') || email.startsWith('ceo@')) {
    return ADMIN_ROLES.CEO;
  }
  if (role === ADMIN_ROLES.FOUNDER || role === ADMIN_ROLES.CO_FOUNDER || position.includes('founder') || empId.includes('FOUNDER') || email.startsWith('founder@')) {
    return role === ADMIN_ROLES.CO_FOUNDER ? ADMIN_ROLES.CO_FOUNDER : ADMIN_ROLES.FOUNDER;
  }
  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    return ADMIN_ROLES.SUPER_ADMIN;
  }
  return ADMIN_ROLES.ADMIN;
}

function sanitizeAdmin(admin) {
  const plain = admin.toObject ? admin.toObject() : admin;
  delete plain.passwordHash;
  delete plain.failedLoginCount;
  return plain;
}

async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';

    if (!email || !password) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const User = require('../users/user.model');
    const Employee = require('../employee/employee.model');

    let admin = await Admin.findOne({ email: normalizedEmail });
    let fallbackAccount = null;

    if (!admin) {
      fallbackAccount = await User.findOne({ email: normalizedEmail }) || await Employee.findOne({ email: normalizedEmail });
    }

    const targetAccount = admin || fallbackAccount;

    if (!targetAccount) {
      await recordAudit({
        actionType: 'LOGIN_FAILED',
        entityType: 'ADMIN',
        entityId: 'UNKNOWN_ADMIN',
        severity: 'MEDIUM',
        ipAddress,
        metadata: { email }
      });
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Restrict Admin Login portal to Founder, CEO & Admin accounts defined in ADMIN_ROLES enum
    const resolvedRole = resolveAdminRole(targetAccount);
    const isAllowedRole = Object.values(ADMIN_ROLES).includes(resolvedRole);

    if (!isAllowedRole) {
      return fail(res, 403, 'ACCESS_DENIED', 'Founder/Admin Login portal is restricted to Founder, CEO & Admin accounts. Please use Employee Login.');
    }

    if (admin) {
      if (!admin.isActive) {
        if (admin.lockUntil && admin.lockUntil < new Date()) {
          admin.isActive = true;
          admin.failedLoginCount = 0;
          admin.lockUntil = null;
          await admin.save();
        } else {
          await raiseAlert({
            actorId: admin._id,
            alertType: 'ACCOUNT_LOCKED_ACCESS_ATTEMPT',
            severity: 'HIGH',
            message: `Locked admin ${admin.fullName} attempted to log in.`,
            metadata: { ipAddress }
          });
          return fail(res, 403, 'ACCOUNT_LOCKED', 'Your account has been locked due to consecutive login failures.');
        }
      }

      if (!admin.passwordHash) {
        return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const matched = await bcrypt.compare(password, admin.passwordHash);

      if (!matched) {
        admin.failedLoginCount += 1;
        if (admin.failedLoginCount >= securityConfig.accountLockThreshold) {
          admin.isActive = false;
          admin.lockUntil = new Date(Date.now() + 5 * 60 * 1000);
          await admin.save();
          await raiseAlert({
            actorId: admin._id,
            alertType: 'ACCOUNT_LOCKED',
            severity: 'CRITICAL',
            message: `Admin ${admin.fullName} account locked due to repeated failed login attempts.`,
            metadata: { ipAddress, failedCount: admin.failedLoginCount }
          });
          return fail(res, 403, 'ACCOUNT_LOCKED', 'Your account has been locked due to consecutive login failures.');
        }
        await admin.save();
        await recordAudit({
          actorId: admin._id,
          actionType: 'LOGIN_FAILED',
          entityType: 'ADMIN',
          entityId: admin._id.toString(),
          severity: 'MEDIUM',
          ipAddress,
          metadata: { failedLoginCount: admin.failedLoginCount }
        });
        return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const is2faRequired = process.env.REQUIRE_2FA === 'true' || process.env.MANDATE_FOUNDER_OTP === 'true';
      if (is2faRequired) {
        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        await otpModel.deleteMany({ email: normalizedEmail });
        await otpModel.create({
          email: normalizedEmail,
          user: admin._id,
          otpHash
        });

        sendEmail(
          normalizedEmail,
          'India Trade Overseas - Founder 2FA Security Code',
          `Your 2FA Security Code is ${otp}`,
          getOtpHtml(otp, normalizedEmail)
        ).catch(e => console.warn('[2FA Email Notice]:', e.message));

        console.log(`\n==================================================\n[FOUNDER 2FA OTP GENERATED]\nTarget Account: ${normalizedEmail}\n2FA Security OTP Code: ${otp}\n==================================================\n`);

        return ok(res, {
          requiresOtp: true,
          email: normalizedEmail,
          role: resolvedRole
        }, '2FA verification required. Security OTP sent to registered email.', 200, req);
      }

      admin.failedLoginCount = 0;
      admin.lastLoginAt = new Date();
      await admin.save();

      const accessToken = tokenService.generateAccessToken(admin);
      const rawRefreshToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

      const session = await sessionModel.create({
        user: admin._id,
        refreshTokenHash: tokenHash,
        ip: ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const refreshToken = jwt.sign(
        { sub: admin._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return ok(res, {
        user: sanitizeAdmin(admin),
        token: accessToken,
        refreshToken
      }, 'Admin login successful', 200, req);
    } else if (fallbackAccount) {
      const passwordField = fallbackAccount.passwordHash || fallbackAccount.password;
      if (!passwordField) {
        return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
      }
      const matched = await bcrypt.compare(password, passwordField);
      if (!matched) {
        return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
      }

      const is2faRequired = process.env.REQUIRE_2FA === 'true' || process.env.MANDATE_FOUNDER_OTP === 'true';
      if (is2faRequired) {
        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        await otpModel.deleteMany({ email: normalizedEmail });
        await otpModel.create({
          email: normalizedEmail,
          user: fallbackAccount._id,
          otpHash
        });

        sendEmail(
          normalizedEmail,
          'India Trade Overseas - Founder 2FA Security Code',
          `Your 2FA Security Code is ${otp}`,
          getOtpHtml(otp, normalizedEmail)
        ).catch(e => console.warn('[2FA Email Notice]:', e.message));

        console.log(`\n==================================================\n[FOUNDER 2FA OTP GENERATED]\nTarget Account: ${normalizedEmail}\n2FA Security OTP Code: ${otp}\n==================================================\n`);

        return ok(res, {
          requiresOtp: true,
          email: normalizedEmail,
          role: resolvedRole
        }, '2FA verification required. Security OTP sent to registered email.', 200, req);
      }
      const accessToken = tokenService.generateAccessToken(fallbackAccount);
      const rawRefreshToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

      const session = await sessionModel.create({
        user: fallbackAccount._id,
        refreshTokenHash: tokenHash,
        ip: ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const refreshToken = jwt.sign(
        { sub: fallbackAccount._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const userObj = {
        _id: fallbackAccount._id,
        fullName: fallbackAccount.fullName || fallbackAccount.name,
        name: fallbackAccount.name || fallbackAccount.fullName,
        email: fallbackAccount.email,
        role: fallbackAccount.role || 'ADMIN',
        department: fallbackAccount.department || 'ADMIN',
        position: fallbackAccount.position || fallbackAccount.role
      };

      return ok(res, {
        user: userObj,
        token: accessToken,
        refreshToken
      }, 'Login successful', 200, req);
    }
  } catch (error) {
    next(error);
  }
}

async function adminGoogleLogin(req, res, next) {
  try {
    const { credential } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';

    if (!credential) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Google credential is required');
    }

    let googlePayload;
    try {
      googlePayload = await verifyGoogleIdToken(credential);
    } catch (verifyErr) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Google sign-in verification failed');
    }

    const User = require('../users/user.model');
    const Employee = require('../employee/employee.model');

    let admin = await Admin.findOne({ email: googlePayload.email });
    let fallbackAccount = null;

    if (!admin) {
      fallbackAccount = await User.findOne({ email: googlePayload.email }) || await Employee.findOne({ email: googlePayload.email });
    }

    const targetAccount = admin || fallbackAccount;

    if (!targetAccount) {
      await recordAudit({
        actionType: 'LOGIN_FAILED',
        entityType: 'ADMIN',
        entityId: 'UNKNOWN_ADMIN',
        severity: 'MEDIUM',
        ipAddress,
        metadata: { email: googlePayload.email, method: 'google' }
      });
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'No admin or founder account found for this Google account');
    }

    const resolvedRole = resolveAdminRole(targetAccount);
    const isAllowedRole = Object.values(ADMIN_ROLES).includes(resolvedRole);

    if (!isAllowedRole) {
      return fail(res, 403, 'ACCESS_DENIED', 'Founder/Admin Login portal is restricted to Founder, CEO & Admin personnel.');
    }

    if (admin) {
      if (!admin.isActive) {
        if (admin.lockUntil && admin.lockUntil < new Date()) {
          admin.isActive = true;
          admin.failedLoginCount = 0;
          admin.lockUntil = null;
          await admin.save();
        } else {
          await raiseAlert({
            actorId: admin._id,
            alertType: 'ACCOUNT_LOCKED_ACCESS_ATTEMPT',
            severity: 'HIGH',
            message: `Locked admin ${admin.fullName} attempted to log in via Google.`,
            metadata: { ipAddress }
          });
          return fail(res, 403, 'ACCOUNT_LOCKED', 'Your account has been locked due to consecutive login failures.');
        }
      }

      admin.failedLoginCount = 0;
      admin.lastLoginAt = new Date();
      await admin.save();

      await recordAudit({
        actorId: admin._id,
        actionType: 'LOGIN_SUCCESS',
        entityType: 'ADMIN',
        entityId: admin._id.toString(),
        severity: 'LOW',
        ipAddress,
        metadata: { lastLoginAt: admin.lastLoginAt, method: 'google' }
      });

      const accessToken = tokenService.generateAccessToken(admin);

      const rawRefreshToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

      const session = await sessionModel.create({
        user: admin._id,
        refreshTokenHash: tokenHash,
        ip: ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const refreshToken = jwt.sign(
        { sub: admin._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return ok(res, {
        user: sanitizeAdmin(admin),
        token: accessToken,
        refreshToken
      }, 'Admin login successful', 200, req);
    } else if (fallbackAccount) {
      const accessToken = tokenService.generateAccessToken(fallbackAccount);
      const rawRefreshToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

      const session = await sessionModel.create({
        user: fallbackAccount._id,
        refreshTokenHash: tokenHash,
        ip: ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const refreshToken = jwt.sign(
        { sub: fallbackAccount._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const userObj = {
        _id: fallbackAccount._id,
        fullName: fallbackAccount.fullName || fallbackAccount.name,
        name: fallbackAccount.name || fallbackAccount.fullName,
        email: fallbackAccount.email,
        role: fallbackAccount.role || 'ADMIN',
        department: fallbackAccount.department || 'ADMIN',
        position: fallbackAccount.position || fallbackAccount.role
      };

      return ok(res, {
        user: userObj,
        token: accessToken,
        refreshToken
      }, 'Login successful', 200, req);
    }
  } catch (error) {
    next(error);
  }
}

async function verifyAdminOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';

    if (!email || !otp) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Email and OTP code are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpDoc = await otpModel.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return fail(res, 400, 'INVALID_OTP', 'No active 2FA security code found or code expired. Please request a new code.');
    }

    const isMatched = await bcrypt.compare(String(otp).trim(), otpDoc.otpHash);
    if (!isMatched) {
      return fail(res, 401, 'INVALID_OTP', 'Invalid 2FA security code. Please check and try again.');
    }

    // Clear used OTP
    await otpModel.deleteMany({ email: normalizedEmail });

    // Fetch account details
    const User = require('../users/user.model');
    const Employee = require('../employee/employee.model');

    let admin = await Admin.findOne({ email: normalizedEmail });
    let fallbackAccount = null;

    if (!admin) {
      fallbackAccount = await User.findOne({ email: normalizedEmail }) || await Employee.findOne({ email: normalizedEmail });
    }

    const targetAccount = admin || fallbackAccount;
    if (!targetAccount) {
      return fail(res, 404, 'NOT_FOUND', 'Founder / Admin account not found.');
    }

    if (admin) {
      admin.failedLoginCount = 0;
      admin.lastLoginAt = new Date();
      await admin.save();

      await recordAudit({
        actorId: admin._id,
        actionType: 'LOGIN_SUCCESS_2FA',
        entityType: 'ADMIN',
        entityId: admin._id.toString(),
        severity: 'LOW',
        ipAddress,
        metadata: { lastLoginAt: admin.lastLoginAt, method: '2fa_otp' }
      });

      const accessToken = tokenService.generateAccessToken(admin);
      const rawRefreshToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

      const session = await sessionModel.create({
        user: admin._id,
        refreshTokenHash: tokenHash,
        ip: ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const refreshToken = jwt.sign(
        { sub: admin._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return ok(res, {
        user: sanitizeAdmin(admin),
        token: accessToken,
        refreshToken
      }, 'Founder 2FA authentication successful', 200, req);
    } else if (fallbackAccount) {
      const accessToken = tokenService.generateAccessToken(fallbackAccount);
      const rawRefreshToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

      const session = await sessionModel.create({
        user: fallbackAccount._id,
        refreshTokenHash: tokenHash,
        ip: ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      const refreshToken = jwt.sign(
        { sub: fallbackAccount._id.toString(), sid: session._id.toString(), raw: rawRefreshToken },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const userObj = {
        _id: fallbackAccount._id,
        fullName: fallbackAccount.fullName || fallbackAccount.name,
        name: fallbackAccount.name || fallbackAccount.fullName,
        email: fallbackAccount.email,
        role: fallbackAccount.role || 'ADMIN',
        department: fallbackAccount.department || 'ADMIN',
        position: fallbackAccount.position || fallbackAccount.role
      };

      return ok(res, {
        user: userObj,
        token: accessToken,
        refreshToken
      }, 'Founder 2FA authentication successful', 200, req);
    }
  } catch (error) {
    next(error);
  }
}

async function requestAdminOtp(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return fail(res, 400, 'VALIDATION_FAILED', 'Email is required');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await otpModel.deleteMany({ email: normalizedEmail });
    await otpModel.create({ email: normalizedEmail, otpHash });

    sendEmail(
      normalizedEmail,
      'India Trade Overseas - Resent 2FA Security Code',
      `Your 2FA Security Code is ${otp}`,
      getOtpHtml(otp, normalizedEmail)
    ).catch(e => console.warn('[2FA Resend Notice]:', e.message));

    console.log(`\n==================================================\n[FOUNDER 2FA OTP RESENT]\nTarget Account: ${normalizedEmail}\nNew 2FA Security Code: ${otp}\n==================================================\n`);

    return ok(res, { success: true }, 'New 2FA Security Code sent to email.', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = { adminLogin, adminGoogleLogin, verifyAdminOtp, requestAdminOtp };

