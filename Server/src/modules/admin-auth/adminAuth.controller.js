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

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    if (!admin) {
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

    if (!admin.isActive) {
      // Check if lock has expired (15 minutes)
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
        admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
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
      metadata: { lastLoginAt: admin.lastLoginAt }
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

    const admin = await Admin.findOne({ email: googlePayload.email });

    if (!admin) {
      await recordAudit({
        actionType: 'LOGIN_FAILED',
        entityType: 'ADMIN',
        entityId: 'UNKNOWN_ADMIN',
        severity: 'MEDIUM',
        ipAddress,
        metadata: { email: googlePayload.email, method: 'google' }
      });
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'No admin account found for this Google account');
    }

    if (!admin.isActive) {
      // Check if lock has expired (15 minutes)
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
  } catch (error) {
    next(error);
  }
}

module.exports = { adminLogin, adminGoogleLogin };
