const { recordAudit } = require('../modules/security-audit/auditLog.service');

async function auditRequest(req, res, next) {

  req.auditAction = async ({ actionType, entityType, entityId, severity = 'LOW', metadata = {} }) => {
    return recordAudit({
      actorId: req.user ? req.user._id : null,
      actionType,
      entityType,
      entityId,
      severity,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      deviceHash: req.headers['x-device-hash'] || '',
      metadata
    });
  };
  next();
}

module.exports = { auditRequest };
