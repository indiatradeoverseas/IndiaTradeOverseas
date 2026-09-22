const AuditLog = require('./auditLog.model');

async function recordAudit({
  actorId = null,
  actionType,
  entityType,
  entityId,
  severity = 'LOW',
  ipAddress = '',
  deviceHash = '',
  metadata = {}
}) {
  try {
    const log = await AuditLog.create({
      actorId,
      actionType,
      entityType,
      entityId: String(entityId),
      severity,
      ipAddress,
      deviceHash,
      metadata
    });
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error.code || error.name);
  }
}

module.exports = { recordAudit };
