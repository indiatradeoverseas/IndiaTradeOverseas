const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.Mixed, default: null },
    actionType: {
      type: String,
      required: true,
      enum: [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'AI_LEAD_CREATED',
        'LEAD_CREATED',
        'LEAD_EDITED',
        'LEAD_STAGE_CHANGED',
        'LEAD_ASSIGNED',
        'ADMIN_LEAD_ASSIGN',
        'USER_DEACTIVATED',
        'USER_DELETED',
        'USER_CREATED',
        'MOBILE_REVEAL',
        'EMAIL_REVEAL',
        'REVEAL_DENIED',
        'EXPORT_ATTEMPT',
        'QUOTATION_REQUESTED',
        'QUOTATION_APPROVED',
        'QUOTATION_REJECTED',
        'DOCUMENT_UPLOADED',
        'DOCUMENT_VIEWED',
        'DOCUMENT_DOWNLOADED',
        'DOCUMENT_SOFT_DELETED',
        'UNAUTHORIZED_VIEW',
        'DEVICE_APPROVAL_REQUEST',
        'DEVICE_REVOKED',
        'DEVICE_APPROVED'
      ]
    },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    ipAddress: { type: String, default: '' },
    deviceHash: { type: String, default: '' },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    metadata: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);


auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are append-only. Modification is strictly prohibited.'));
  }
  next();
});


const blockUpdates = function (next) {
  next(new Error('Audit logs are append-only. Updates are strictly prohibited.'));
};
auditLogSchema.pre('updateOne', blockUpdates);
auditLogSchema.pre('updateMany', blockUpdates);
auditLogSchema.pre('findOneAndUpdate', blockUpdates);
auditLogSchema.pre('findByIdAndUpdate', blockUpdates);


const blockDeletes = function (next) {
  next(new Error('Audit logs are append-only. Deletion is strictly prohibited.'));
};
auditLogSchema.pre('deleteOne', blockDeletes);
auditLogSchema.pre('deleteMany', blockDeletes);
auditLogSchema.pre('findOneAndDelete', blockDeletes);
auditLogSchema.pre('findByIdAndDelete', blockDeletes);
auditLogSchema.pre('remove', blockDeletes);


auditLogSchema.index({ actorId: 1, actionType: 1, severity: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
