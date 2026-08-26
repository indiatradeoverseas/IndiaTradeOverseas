const bcrypt = require('bcryptjs');
const User = require('../users/user.model');
const TrustedDevice = require('./trustedDevice.model');
const securityConfig = require('../../config/security');
const { raiseAlert } = require('../security-audit/securityAlert.service');
const { recordAudit } = require('../security-audit/auditLog.service');
const { generateAccessToken, generateRefreshToken } = require('./token.service');

async function login({ email, password, ipAddress = '', deviceHash = '' }) {
  const user = await User.findOne({ email });

  if (!user) {
    
    await recordAudit({
      actionType: 'LOGIN_FAILED',
      entityType: 'USER',
      entityId: 'UNKNOWN_USER',
      severity: 'LOW',
      ipAddress,
      deviceHash,
      metadata: { email }
    });
    throw new Error('AUTH_INVALID_CREDENTIALS');
  }

  
  if (!user.isActive) {
    // Check if lock has expired (15 minutes)
    if (user.lockUntil && user.lockUntil < new Date()) {
      user.isActive = true;
      user.failedLoginCount = 0;
      user.lockUntil = null;
      await user.save();
    } else {
      await raiseAlert({
        actorId: user._id,
        alertType: 'ACCOUNT_LOCKED_ACCESS_ATTEMPT',
        severity: 'HIGH',
        message: `Locked user ${user.fullName} (${user.employeeId}) attempted to log in.`,
        metadata: { ipAddress, deviceHash }
      });
      throw new Error('ACCOUNT_LOCKED');
    }
  }

  if (!user.passwordHash) {
    throw new Error('AUTH_INVALID_CREDENTIALS');
  }

  const matched = await bcrypt.compare(password || '', user.passwordHash);

  if (!matched) {
    user.failedLoginCount += 1;

    if (user.failedLoginCount >= securityConfig.accountLockThreshold) {
      user.isActive = false; 
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      await user.save();

      await raiseAlert({
        actorId: user._id, 
        alertType: 'ACCOUNT_LOCKED',
        severity: 'CRITICAL',
        message: `User ${user.fullName} (${user.employeeId}) account locked due to repeated failed login attempts.`,
        metadata: { ipAddress, deviceHash, failedCount: user.failedLoginCount }
      });

      await recordAudit({
        actorId: user._id,
        actionType: 'LOGIN_FAILED',
        entityType: 'USER',
        entityId: user._id.toString(),
        severity: 'CRITICAL',
        ipAddress,
        deviceHash,
        metadata: { message: 'Account locked due to consecutive failures' }
      });

      throw new Error('ACCOUNT_LOCKED');
    }

    await user.save();

    await recordAudit({
      actorId: user._id,
      actionType: 'LOGIN_FAILED',
      entityType: 'USER',
      entityId: user._id.toString(),
      severity: 'MEDIUM',
      ipAddress,
      deviceHash,
      metadata: { failedLoginCount: user.failedLoginCount }
    });

    throw new Error('AUTH_INVALID_CREDENTIALS');
  }

  
  user.failedLoginCount = 0;
  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  user.isOnline = true;
  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginCount: 0, lastLoginAt: user.lastLoginAt, lastActiveAt: user.lastActiveAt, isOnline: true } }
  );

  await recordAudit({
    actorId: user._id,
    actionType: 'LOGIN_SUCCESS',
    entityType: 'USER',
    entityId: user._id.toString(),
    severity: 'LOW',
    ipAddress,
    deviceHash,
    metadata: { lastLoginAt: user.lastLoginAt }
  });

  return user;
}

module.exports = { login };
