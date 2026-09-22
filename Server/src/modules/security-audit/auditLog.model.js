const mongoose = require('mongoose');


/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.27F: Append-only security / CRM audit ledger
 *
 * Design:
 * - audit records are immutable after creation;
 * - entityId is always required;
 * - known Master DPR actions are exported as a shared dictionary;
 * - legacy/future actions remain compatible when they follow the safe
 *   UPPER_SNAKE_CASE action naming convention;
 * - secrets / raw PII must never be deliberately stored in metadata;
 * - controller/service layers remain responsible for supplying privacy-safe
 *   metadata.
 *
 * We intentionally do NOT use a rigid Mongoose enum for actionType.
 * A rigid enum previously made legitimate new security/recovery actions fail
 * until the schema enum was manually updated. Instead, the standard action
 * dictionary below remains canonical while the schema validates the action
 * naming format for backward compatibility.
 */


/* ============================================================
   MASTER DPR / SECURITY ACTION DICTIONARY
============================================================ */

const AUDIT_ACTIONS = Object.freeze({
  // ----------------------------------------------------------
  // AUTH / ACCESS
  // ----------------------------------------------------------

  LOGIN:
    'LOGIN',

  LOGIN_SUCCESS:
    'LOGIN_SUCCESS',

  LOGIN_FAILED:
    'LOGIN_FAILED',

  LOGOUT:
    'LOGOUT',

  PASSWORD_CHANGED:
    'PASSWORD_CHANGED',

  SESSION_REVOKED:
    'SESSION_REVOKED',

  ACCESS_DENIED:
    'ACCESS_DENIED',

  RBAC_ACCESS_DENIED:
    'RBAC_ACCESS_DENIED',

  PERMISSION_CHANGED:
    'PERMISSION_CHANGED',

  ROLE_ASSIGNED:
    'ROLE_ASSIGNED',

  ROLE_UPDATED:
    'ROLE_UPDATED',


  // ----------------------------------------------------------
  // USER / EMPLOYEE
  // ----------------------------------------------------------

  USER_CREATED:
    'USER_CREATED',

  USER_UPDATED:
    'USER_UPDATED',

  USER_DEACTIVATED:
    'USER_DEACTIVATED',

  USER_DELETED:
    'USER_DELETED',

  EMPLOYEE_CREATED:
    'EMPLOYEE_CREATED',

  EMPLOYEE_UPDATED:
    'EMPLOYEE_UPDATED',

  EMPLOYEE_DELETED:
    'EMPLOYEE_DELETED',


  // ----------------------------------------------------------
  // LEAD CREATION / PERSISTENCE
  // ----------------------------------------------------------

  LEAD_CREATED:
    'LEAD_CREATED',

  WEBSITE_LEAD_CREATED:
    'WEBSITE_LEAD_CREATED',

  MANUAL_LEAD_CREATED:
    'MANUAL_LEAD_CREATED',

  AI_LEAD_CREATED:
    'AI_LEAD_CREATED',

  LEAD_API_SUCCEEDED:
    'LEAD_API_SUCCEEDED',

  LEAD_API_FAILED:
    'LEAD_API_FAILED',

  LEAD_DB_WRITE_SUCCEEDED:
    'LEAD_DB_WRITE_SUCCEEDED',

  LEAD_DB_WRITE_FAILED:
    'LEAD_DB_WRITE_FAILED',

  LEAD_BULK_IMPORTED:
    'LEAD_BULK_IMPORTED',


  // ----------------------------------------------------------
  // LEAD CRM / OWNERSHIP / ACTIVITY
  // ----------------------------------------------------------

  LEAD_ASSIGNED:
    'LEAD_ASSIGNED',

  ADMIN_LEAD_ASSIGN:
    'ADMIN_LEAD_ASSIGN',

  LEADS_BULK_ASSIGNED:
    'LEADS_BULK_ASSIGNED',

  LEAD_REASSIGNED:
    'LEAD_REASSIGNED',

  LEAD_STAGE_CHANGED:
    'LEAD_STAGE_CHANGED',

  LEAD_CRM_STATUS_CHANGED:
    'LEAD_CRM_STATUS_CHANGED',

  LEAD_PRIORITY_CHANGED:
    'LEAD_PRIORITY_CHANGED',

  LEAD_PRIORITY_UPDATED:
    'LEAD_PRIORITY_UPDATED',

  LEAD_ACTIVITY_ADDED:
    'LEAD_ACTIVITY_ADDED',

  LEAD_LOST:
    'LEAD_LOST',

  LEAD_WON:
    'LEAD_WON',

  LEAD_DELETED:
    'LEAD_DELETED',


  // ----------------------------------------------------------
  // SALES SLA / MANAGEMENT MONITORING
  // ----------------------------------------------------------

  SALES_SLA_DASHBOARD_VIEWED:
    'SALES_SLA_DASHBOARD_VIEWED',

  LEAD_RECOVERY_DASHBOARD_VIEWED:
    'LEAD_RECOVERY_DASHBOARD_VIEWED',


  // ----------------------------------------------------------
  // RECOVERY / RELIABILITY
  // ----------------------------------------------------------

  LEAD_RECOVERY_REQUEUED:
    'LEAD_RECOVERY_REQUEUED',

  RECOVERY_ACCESS_DENIED:
    'RECOVERY_ACCESS_DENIED',

  RECOVERY_MUTATION_DENIED:
    'RECOVERY_MUTATION_DENIED',

  WEBSITE_AUTOMATION_RECOVERY_REQUEUED:
    'WEBSITE_AUTOMATION_RECOVERY_REQUEUED',


  // ----------------------------------------------------------
  // CRM SYNC
  // ----------------------------------------------------------

  CRM_SYNC_SUCCEEDED:
    'CRM_SYNC_SUCCEEDED',

  CRM_SYNC_FAILED:
    'CRM_SYNC_FAILED',

  CRM_SYNC_RETRY_SCHEDULED:
    'CRM_SYNC_RETRY_SCHEDULED',

  CRM_SYNC_MANUAL_RECOVERY:
    'CRM_SYNC_MANUAL_RECOVERY',

  CRM_SYNC_REQUEUED:
    'CRM_SYNC_REQUEUED',

  CRM_SYNC_PAYLOAD_SUPERSEDED:
    'CRM_SYNC_PAYLOAD_SUPERSEDED',


  // ----------------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------------

  NOTIFICATION_SENT:
    'NOTIFICATION_SENT',

  NOTIFICATION_FAILED:
    'NOTIFICATION_FAILED',

  NOTIFICATION_RETRY_SCHEDULED:
    'NOTIFICATION_RETRY_SCHEDULED',

  SALES_ALERT_MANUAL_RECOVERY:
    'SALES_ALERT_MANUAL_RECOVERY',

  IT_ALERT_MANUAL_RECOVERY:
    'IT_ALERT_MANUAL_RECOVERY',


  // ----------------------------------------------------------
  // PRIVACY / EXPORT / DEVICE / DOCUMENT SECURITY
  // ----------------------------------------------------------

  MOBILE_REVEAL:
    'MOBILE_REVEAL',

  EMAIL_REVEAL:
    'EMAIL_REVEAL',

  REVEAL_DENIED:
    'REVEAL_DENIED',

  EXPORT_ATTEMPT:
    'EXPORT_ATTEMPT',

  UNAUTHORIZED_VIEW:
    'UNAUTHORIZED_VIEW',

  DEVICE_APPROVAL_REQUEST:
    'DEVICE_APPROVAL_REQUEST',

  DEVICE_APPROVED:
    'DEVICE_APPROVED',

  DEVICE_REVOKED:
    'DEVICE_REVOKED',

  SCREENSHOT_ATTEMPTED:
    'SCREENSHOT_ATTEMPTED',

  DOCUMENT_UPLOADED:
    'DOCUMENT_UPLOADED',

  DOCUMENT_VIEWED:
    'DOCUMENT_VIEWED',

  DOCUMENT_DOWNLOADED:
    'DOCUMENT_DOWNLOADED',

  DOCUMENT_SOFT_DELETED:
    'DOCUMENT_SOFT_DELETED',


  // ----------------------------------------------------------
  // QUOTATIONS
  // ----------------------------------------------------------

  QUOTATION_REQUESTED:
    'QUOTATION_REQUESTED',

  QUOTATION_CREATED:
    'QUOTATION_CREATED',

  QUOTATION_APPROVED:
    'QUOTATION_APPROVED',

  QUOTATION_REJECTED:
    'QUOTATION_REJECTED',

  QUOTATION_SENT:
    'QUOTATION_SENT',

  QUOTATION_UPDATED:
    'QUOTATION_UPDATED',


  // ----------------------------------------------------------
  // TRACKING / ANALYTICS
  // ----------------------------------------------------------

  TRACKING_EVENT_CREATED:
    'TRACKING_EVENT_CREATED',

  TRACKING_DISPATCH_SUCCEEDED:
    'TRACKING_DISPATCH_SUCCEEDED',

  TRACKING_DISPATCH_FAILED:
    'TRACKING_DISPATCH_FAILED',

  META_CAPI_SENT:
    'META_CAPI_SENT',

  META_CAPI_FAILED:
    'META_CAPI_FAILED',

  META_CAPI_RETRY_SCHEDULED:
    'META_CAPI_RETRY_SCHEDULED',


  // ----------------------------------------------------------
  // SENSITIVE LEAD EVIDENCE
  // ----------------------------------------------------------

  CALL_RECORDING_UPLOADED:
    'CALL_RECORDING_UPLOADED',

  CALL_RECORDING_VIEWED:
    'CALL_RECORDING_VIEWED',

  CALL_RECORDING_UPDATED:
    'CALL_RECORDING_UPDATED',

  CALL_RECORDING_ACCESS_DENIED:
    'CALL_RECORDING_ACCESS_DENIED',

  VOICE_NOTE_UPLOADED:
    'VOICE_NOTE_UPLOADED',

  VOICE_NOTE_VIEWED:
    'VOICE_NOTE_VIEWED',

  VOICE_NOTE_ACCESS_DENIED:
    'VOICE_NOTE_ACCESS_DENIED',

  LOI_DOCUMENT_UPLOADED:
    'LOI_DOCUMENT_UPLOADED',

  LOI_DOCUMENT_VIEWED:
    'LOI_DOCUMENT_VIEWED',

  LOI_DOCUMENT_ACCESS_DENIED:
    'LOI_DOCUMENT_ACCESS_DENIED',

  LEAD_EVIDENCE_ACCESS_DENIED:
    'LEAD_EVIDENCE_ACCESS_DENIED',


  // ----------------------------------------------------------
  // TASKS
  // ----------------------------------------------------------

  TASK_CREATED:
    'TASK_CREATED',

  TASK_UPDATED:
    'TASK_UPDATED',

  TASK_ASSIGNED:
    'TASK_ASSIGNED',

  TASK_COMPLETED:
    'TASK_COMPLETED',

  TASK_DELETED:
    'TASK_DELETED',


  // ----------------------------------------------------------
  // COMMERCIAL / ORDER / PAYMENT / DISPATCH COMPATIBILITY
  // ----------------------------------------------------------

  ORDER_CREATED:
    'ORDER_CREATED',

  ORDER_UPDATED:
    'ORDER_UPDATED',

  ORDER_WON:
    'ORDER_WON',

  PAYMENT_CREATED:
    'PAYMENT_CREATED',

  PAYMENT_UPDATED:
    'PAYMENT_UPDATED',

  PAYMENT_VERIFIED:
    'PAYMENT_VERIFIED',

  DISPATCH_CREATED:
    'DISPATCH_CREATED',

  DISPATCH_UPDATED:
    'DISPATCH_UPDATED',

  DELIVERY_COMPLETED:
    'DELIVERY_COMPLETED',
});


const AUDIT_SEVERITIES = Object.freeze([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);


const AUDIT_ENTITY_TYPES = Object.freeze([
  'AUTH',
  'SESSION',
  'ROLE',
  'PERMISSION',
  'USER',
  'EMPLOYEE',
  'ADMIN',
  'LEAD',
  'CONTACT',
  'QUOTATION',
  'TASK',
  'ORDER',
  'PAYMENT',
  'DISPATCH',
  'NOTIFICATION',
  'ANALYTICS_EVENT',
  'CALL_RECORDING',
  'VOICE_NOTE',
  'DOCUMENT',
  'DEVICE',
  'SECURITY_ALERT',
  'DASHBOARD',
  'SYSTEM',
]);


/* ============================================================
   HELPERS
============================================================ */

function cleanText(
  value,
  maxLength = 1000
) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .slice(
      0,
      maxLength
    );
}


function normalizeActionType(
  value
) {
  return cleanText(
    value,
    120
  )
    .toUpperCase()
    .replace(
      /[^A-Z0-9_]+/g,
      '_'
    )
    .replace(
      /^_+|_+$/g,
      ''
    );
}


function normalizeEntityType(
  value
) {
  return cleanText(
    value,
    80
  )
    .toUpperCase()
    .replace(
      /[^A-Z0-9_]+/g,
      '_'
    )
    .replace(
      /^_+|_+$/g,
      ''
    );
}


function normalizeSeverity(
  value
) {
  const severity =
    cleanText(
      value,
      20
    ).toUpperCase();

  return AUDIT_SEVERITIES.includes(
    severity
  )
    ? severity
    : 'LOW';
}


/* ============================================================
   SCHEMA
============================================================ */

const auditLogSchema =
  new mongoose.Schema(
    {
      /*
       * Actor compatibility:
       * production events may originate from User, Employee, Admin,
       * SalesTrialUser, system workers, or legacy identifiers.
       *
       * Keep this polymorphic rather than forcing every actor through
       * the User collection. Services remain responsible for writing
       * privacy-safe actor identifiers.
       */
      actorId: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          null,

        index:
          true,
      },


      actionType: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,

        index:
          true,

        set:
          normalizeActionType,

        validate: {
          validator(
            value
          ) {
            /*
             * Canonical actions live in AUDIT_ACTIONS.
             *
             * Legacy/future modules may still add legitimate actions without
             * breaking production auditing, provided they follow the safe
             * UPPER_SNAKE_CASE convention.
             */
            return /^[A-Z][A-Z0-9_]{1,119}$/.test(
              value
            );
          },

          message:
            'Audit actionType must use UPPER_SNAKE_CASE.',
        },
      },


      entityType: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          80,

        index:
          true,

        set:
          normalizeEntityType,

        validate: {
          validator(
            value
          ) {
            return /^[A-Z][A-Z0-9_]{0,79}$/.test(
              value
            );
          },

          message:
            'Audit entityType must use UPPER_SNAKE_CASE.',
        },
      },


      /*
       * Required by design.
       *
       * Entity ID does not have to be a Mongo ObjectId because dashboard,
       * system and aggregate audit events legitimately use stable logical IDs:
       *
       * SALES_SLA_DASHBOARD
       * LEAD_RECOVERY_DASHBOARD
       * CRM_SYNC_WORKER
       */
      entityId: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          200,

        index:
          true,

        set(value) {
          return cleanText(
            value,
            200
          );
        },

        validate: {
          validator(
            value
          ) {
            return Boolean(
              cleanText(
                value,
                200
              )
            );
          },

          message:
            'Audit entityId is required.',
        },
      },


      severity: {
        type:
          String,

        enum:
          AUDIT_SEVERITIES,

        default:
          'LOW',

        index:
          true,

        set:
          normalizeSeverity,
      },


      ipAddress: {
        type:
          String,

        default:
          '',

        trim:
          true,

        maxlength:
          200,

        set(value) {
          return cleanText(
            value,
            200
          );
        },
      },


      deviceHash: {
        type:
          String,

        default:
          '',

        trim:
          true,

        maxlength:
          256,

        set(value) {
          return cleanText(
            value,
            256
          );
        },
      },


      requestId: {
        type:
          String,

        default:
          '',

        trim:
          true,

        maxlength:
          160,

        index:
          true,

        set(value) {
          return cleanText(
            value,
            160
          );
        },
      },


      correlationId: {
        type:
          String,

        default:
          '',

        trim:
          true,

        maxlength:
          160,

        index:
          true,

        set(value) {
          return cleanText(
            value,
            160
          );
        },
      },


      metadata: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          {},
      },


      occurredAt: {
        type:
          Date,

        required:
          true,

        default:
          Date.now,

        index:
          true,
      },
    },

    {
      timestamps: {
        createdAt:
          'createdAt',

        /*
         * Append-only ledger does not need an updatedAt field.
         */
        updatedAt:
          false,
      },

      versionKey:
        false,

      minimize:
        true,
    }
  );


/* ============================================================
   NORMALIZATION
============================================================ */

auditLogSchema.pre(
  'validate',

  function normalizeAuditLog(
    next
  ) {
    this.actionType =
      normalizeActionType(
        this.actionType
      );

    this.entityType =
      normalizeEntityType(
        this.entityType
      );

    this.entityId =
      cleanText(
        this.entityId,
        200
      );

    this.severity =
      normalizeSeverity(
        this.severity
      );

    this.ipAddress =
      cleanText(
        this.ipAddress,
        200
      );

    this.deviceHash =
      cleanText(
        this.deviceHash,
        256
      );

    this.requestId =
      cleanText(
        this.requestId,
        160
      );

    this.correlationId =
      cleanText(
        this.correlationId,
        160
      );

    if (
      !this.occurredAt ||
      Number.isNaN(
        new Date(
          this.occurredAt
        ).getTime()
      )
    ) {
      this.occurredAt =
        new Date();
    }

    next();
  }
);


/* ============================================================
   APPEND-ONLY PROTECTION
============================================================ */

function rejectAuditMutation(
  next
) {
  const error =
    new Error(
      'Audit logs are append-only. Modification is prohibited.'
    );

  error.code =
    'AUDIT_LOG_IMMUTABLE';

  next(error);
}


function rejectAuditDeletion(
  next
) {
  const error =
    new Error(
      'Audit logs are append-only. Deletion is prohibited.'
    );

  error.code =
    'AUDIT_LOG_IMMUTABLE';

  next(error);
}


auditLogSchema.pre(
  'save',

  function rejectPersistedAuditMutation(
    next
  ) {
    if (
      !this.isNew &&
      this.isModified()
    ) {
      return rejectAuditMutation(
        next
      );
    }

    return next();
  }
);


auditLogSchema.pre(
  'updateOne',
  rejectAuditMutation
);

auditLogSchema.pre(
  'updateMany',
  rejectAuditMutation
);

auditLogSchema.pre(
  'replaceOne',
  rejectAuditMutation
);

auditLogSchema.pre(
  'findOneAndUpdate',
  rejectAuditMutation
);

auditLogSchema.pre(
  'deleteOne',
  rejectAuditDeletion
);

auditLogSchema.pre(
  'deleteMany',
  rejectAuditDeletion
);

auditLogSchema.pre(
  'findOneAndDelete',
  rejectAuditDeletion
);


/* ============================================================
   INDEXES
============================================================ */

auditLogSchema.index({
  entityType:
    1,

  entityId:
    1,

  occurredAt:
    -1,
});


auditLogSchema.index({
  actorId:
    1,

  occurredAt:
    -1,
});


auditLogSchema.index({
  actionType:
    1,

  occurredAt:
    -1,
});


auditLogSchema.index({
  severity:
    1,

  occurredAt:
    -1,
});


auditLogSchema.index({
  actionType:
    1,

  entityType:
    1,

  occurredAt:
    -1,
});


/* ============================================================
   EXPORTED DICTIONARIES
============================================================ */

auditLogSchema.statics.ACTIONS =
  AUDIT_ACTIONS;

auditLogSchema.statics.SEVERITIES =
  AUDIT_SEVERITIES;

auditLogSchema.statics.ENTITY_TYPES =
  AUDIT_ENTITY_TYPES;


/* ============================================================
   MODEL
============================================================ */

const AuditLog =
  mongoose.model(
    'AuditLog',
    auditLogSchema
  );


AuditLog.AUDIT_ACTIONS =
  AUDIT_ACTIONS;

AuditLog.AUDIT_SEVERITIES =
  AUDIT_SEVERITIES;

AuditLog.AUDIT_ENTITY_TYPES =
  AUDIT_ENTITY_TYPES;


module.exports =
  AuditLog;