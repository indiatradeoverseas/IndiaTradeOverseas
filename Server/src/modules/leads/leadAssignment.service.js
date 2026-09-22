const Lead = require('./lead.model');
const User = require('../users/user.model');
const Notification = require('../notifications/notification.model');
const { recordAudit } = require('../security-audit/auditLog.service');
const logger = require('../../utils/logger');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.24A: Assignment hardening for durable ownership recovery
 *
 * Goals:
 * - preserve a valid existing owner;
 * - route by product/department, geography, capacity and buyer quality;
 * - never regress an operational stage when assigning a previously-unowned
 *   Lead that has already progressed through the CRM lifecycle;
 * - use ADMIN/MANAGER as a real fallback owner when sales capacity is absent;
 * - keep a Lead persisted and visible even when no eligible owner exists;
 * - deduplicate assignment notifications for the same Lead + target;
 * - support background ownership recovery without notification spam;
 * - never let notification failure roll back Lead persistence/ownership.
 */

const ACTIVE_CRM_STATUSES = Object.freeze([
  'NEW',
  'CONTACT_ATTEMPTED',
  'CONTACTED',
  'QUALIFIED',
  'QUOTATION_SENT',
  'NEGOTIATION',
]);

const PRODUCT_DEPARTMENT_RULES = Object.freeze([
  { token: 'STONE', department: 'STONE' },
  { token: 'COAL', department: 'COAL' },
  { token: 'TEA', department: 'TEA' },
  { token: 'RICE', department: 'RICE' },
  { token: 'TRANSPORT', department: 'TRANSPORT' },
  { token: 'LOGISTICS', department: 'TRANSPORT' },
]);

const BUYER_QUALITY_WEIGHT = Object.freeze({
  HOT: 40,
  WARM: 25,
  NURTURE: 10,
  LOW: 0,
  COLD: 0,
  FAKE: -100,
  INCOMPLETE: -20,
});

function cleanText(value, maxLength = 250) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeForMatch(value) {
  return cleanText(
    value,
    250
  )
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

function hasOwner(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return false;
  }

  const raw =
    cleanText(
      typeof value === 'object' &&
        value !== null
        ? (
            value._id ||
            value.employeeDbId ||
            value.employeeId ||
            value.email
          )
        : value,
      320
    ).toLowerCase();

  return Boolean(
    raw &&
    ![
      'unassigned',
      'null',
      'undefined',
    ].includes(raw)
  );
}

function resolveDepartment(productCategory) {
  const product =
    normalizeForMatch(
      productCategory
    );

  for (
    const rule of
      PRODUCT_DEPARTMENT_RULES
  ) {
    if (
      product.includes(
        rule.token
      )
    ) {
      return rule.department;
    }
  }

  return null;
}

function getBuyerQualityWeight(priority) {
  const normalized =
    cleanText(
      priority,
      40
    ).toUpperCase();

  return (
    BUYER_QUALITY_WEIGHT[
      normalized
    ] ?? 0
  );
}

function isGeographicMatch(
  user,
  destination
) {
  const normalizedDestination =
    normalizeForMatch(
      destination
    );

  const normalizedCity =
    normalizeForMatch(
      user?.city
    );

  if (
    !normalizedDestination ||
    !normalizedCity
  ) {
    return false;
  }

  return (
    normalizedDestination ===
      normalizedCity ||
    normalizedDestination.includes(
      normalizedCity
    ) ||
    normalizedCity.includes(
      normalizedDestination
    )
  );
}

async function getActiveLoadByUserIds(
  userIds = []
) {
  if (!userIds.length) {
    return new Map();
  }

  const rows =
    await Lead.aggregate([
      {
        $match: {
          assignedTo: {
            $in: userIds,
          },

          crmStatus: {
            $in:
              ACTIVE_CRM_STATUSES,
          },
        },
      },

      {
        $group: {
          _id:
            '$assignedTo',

          activeCount: {
            $sum: 1,
          },
        },
      },
    ]);

  return new Map(
    rows.map(
      (row) => [
        String(
          row._id
        ),

        Number(
          row.activeCount
        ) || 0,
      ]
    )
  );
}

function scoreCandidate({
  user,
  activeLoad,
  lead,
}) {
  let score = 0;

  const reasons = [];

  /*
   * Product/department match is the strongest routing
   * constraint.
   */
  score += 100;

  reasons.push(
    'product_department_match'
  );

  if (
    isGeographicMatch(
      user,
      lead.destination
    )
  ) {
    score += 30;

    reasons.push(
      'geography_match'
    );
  }

  /*
   * Lower live CRM load means more available capacity.
   */
  const capacityScore =
    Math.max(
      0,
      30 -
        activeLoad * 3
    );

  score +=
    capacityScore;

  reasons.push(
    `active_load_${activeLoad}`
  );

  const buyerQualityWeight =
    getBuyerQualityWeight(
      lead.priority
    );

  if (
    user.leadPermission ===
    true
  ) {
    score +=
      buyerQualityWeight;

    reasons.push(
      'lead_permission_quality_match'
    );

  } else {
    score +=
      Math.max(
        0,
        Math.floor(
          buyerQualityWeight / 2
        )
      );
  }

  if (
    user.isOnline === true
  ) {
    score += 5;

    reasons.push(
      'currently_online'
    );
  }

  if (user.lastActiveAt) {
    const lastActiveAt =
      new Date(
        user.lastActiveAt
      );

    if (
      !Number.isNaN(
        lastActiveAt.getTime()
      )
    ) {
      const ageMs =
        Date.now() -
        lastActiveAt.getTime();

      if (
        ageMs >= 0 &&
        ageMs <=
          24 *
          60 *
          60 *
          1000
      ) {
        score += 3;

        reasons.push(
          'recently_active'
        );
      }
    }
  }

  return {
    score,
    activeLoad,
    reasons,
  };
}

async function findBestOwner({
  department,
  lead,
}) {
  if (!department) {
    return null;
  }

  let candidates =
    await User.find({
      department,

      role:
        'SALES',

      isActive:
        true,
    }).lean();

  /*
   * Compatibility fallback for installations where
   * salespeople are stored in the generic SALES
   * department rather than product-specific departments.
   */
  if (!candidates.length) {
    candidates =
      await User.find({
        department:
          'SALES',

        role:
          'SALES',

        isActive:
          true,
      }).lean();
  }

  if (!candidates.length) {
    return null;
  }

  const userIds =
    candidates.map(
      (candidate) =>
        candidate._id
    );

  const activeLoad =
    await getActiveLoadByUserIds(
      userIds
    );

  const ranked =
    candidates
      .map(
        (candidate) => {
          const ranking =
            scoreCandidate({
              user:
                candidate,

              activeLoad:
                activeLoad.get(
                  String(
                    candidate._id
                  )
                ) || 0,

              lead,
            });

          return {
            user:
              candidate,

            ...ranking,
          };
        }
      )
      .sort(
        (
          a,
          b
        ) => {
          if (
            b.score !==
            a.score
          ) {
            return (
              b.score -
              a.score
            );
          }

          if (
            a.activeLoad !==
            b.activeLoad
          ) {
            return (
              a.activeLoad -
              b.activeLoad
            );
          }

          return String(
            a.user.employeeId ||
            a.user._id
          ).localeCompare(
            String(
              b.user.employeeId ||
              b.user._id
            )
          );
        }
      );

  return (
    ranked[0] ||
    null
  );
}

async function findAdminFallbackOwner(
  lead
) {
  const candidates =
    await User.find({
      isActive:
        true,

      role: {
        $in: [
          'ADMIN',
          'MANAGER',
        ],
      },
    }).lean();

  if (!candidates.length) {
    return null;
  }

  const userIds =
    candidates.map(
      (candidate) =>
        candidate._id
    );

  const activeLoad =
    await getActiveLoadByUserIds(
      userIds
    );

  const ranked =
    candidates
      .map(
        (candidate) => ({
          user:
            candidate,

          activeLoad:
            activeLoad.get(
              String(
                candidate._id
              )
            ) || 0,

          geographyMatch:
            isGeographicMatch(
              candidate,
              lead.destination
            ),
        })
      )
      .sort(
        (
          a,
          b
        ) => {
          if (
            a.geographyMatch !==
            b.geographyMatch
          ) {
            return (
              a.geographyMatch
                ? -1
                : 1
            );
          }

          if (
            a.activeLoad !==
            b.activeLoad
          ) {
            return (
              a.activeLoad -
              b.activeLoad
            );
          }

          return String(
            a.user.employeeId ||
            a.user._id
          ).localeCompare(
            String(
              b.user.employeeId ||
              b.user._id
            )
          );
        }
      );

  return (
    ranked[0] ||
    null
  );
}

async function updateNotificationDelivery(
  leadId,
  updates = {}
) {
  const set = {};

  Object.entries(
    updates
  ).forEach(
    (
      [
        key,
        value,
      ]
    ) => {
      set[
        `notificationDelivery.salesAlert.${key}`
      ] =
        value;
    }
  );

  if (
    !Object.keys(
      set
    ).length
  ) {
    return;
  }

  await Lead.findByIdAndUpdate(
    leadId,

    {
      $set:
        set,
    }
  );
}

function buildAssignmentAlertCode({
  assignedTo,
  assignedDepartment,
}) {
  if (assignedTo) {
    return `LEAD_ASSIGNMENT_USER_${String(
      assignedTo
    )}`;
  }

  if (assignedDepartment) {
    return `LEAD_ASSIGNMENT_DEPT_${cleanText(
      assignedDepartment,
      80
    ).toUpperCase()}`;
  }

  return (
    'LEAD_ASSIGNMENT_ADMIN_REVIEW'
  );
}

async function ensureAssignmentNotification({
  lead,
  assignedTo,
  assignedDepartment,
  adminReviewRequired,
}) {
  let targetUserId =
    assignedTo ||
    null;

  let targetDepartment =
    null;

  let targetRole =
    null;

  let message = '';

  if (assignedTo) {
    message =
      `A new lead ${lead.leadCode} has been assigned to you.`;

  } else if (
    assignedDepartment &&
    assignedDepartment !==
      'ADMIN'
  ) {
    targetDepartment =
      assignedDepartment;

    message =
      `Lead ${lead.leadCode} requires ownership in ${assignedDepartment}.`;

  } else {
    targetRole =
      'ADMIN';

    targetDepartment =
      'ADMIN';

    message =
      `Lead ${lead.leadCode} requires manual ownership review.`;
  }

  if (
    adminReviewRequired &&
    !targetUserId
  ) {
    targetRole =
      targetRole ||
      'ADMIN';
  }

  const alertCode =
    buildAssignmentAlertCode({
      assignedTo,
      assignedDepartment,
    });

  /*
   * Durable notification deduplication.
   *
   * Re-running recovery for the same lead/owner must
   * not generate repeated assignment notifications.
   */
  const existing =
    await Notification.findOne({
      type:
        'TASK_ASSIGNMENT',

      'metadata.leadId':
        lead._id,

      'metadata.alertCode':
        alertCode,
    });

  if (existing) {
    return existing;
  }

  return Notification.create({
    targetUserId,
    targetRole,
    targetDepartment,

    message,

    type:
      'TASK_ASSIGNMENT',

    metadata: {
      leadId:
        lead._id,

      leadCode:
        lead.leadCode,

      alertCode,

      productCategory:
        lead.productCategory,

      priority:
        lead.priority,

      assignedDepartment:
        assignedDepartment ||
        '',

      assignedTo:
        assignedTo
          ? String(
              assignedTo
            )
          : '',

      adminReviewRequired:
        adminReviewRequired ===
        true,
    },
  });
}

async function createAssignmentNotification({
  lead,
  assignedTo,
  assignedDepartment,
  adminReviewRequired,
}) {
  const now =
    new Date();

  await updateNotificationDelivery(
    lead._id,

    {
      status:
        'PROCESSING',

      lastAttemptAt:
        now,

      lastError:
        '',
    }
  );

  try {
    const notification =
      await ensureAssignmentNotification({
        lead,
        assignedTo,
        assignedDepartment,
        adminReviewRequired,
      });

    await updateNotificationDelivery(
      lead._id,

      {
        status:
          'SENT',

        attempts:
          Math.max(
            1,
            Number(
              lead
                .notificationDelivery
                ?.salesAlert
                ?.attempts
            ) || 0
          ),

        sentAt:
          new Date(),

        nextAttemptAt:
          null,

        lastError:
          '',
      }
    );

    return notification;

  } catch (error) {
    const attempts =
      Math.max(
        1,
        Number(
          lead
            .notificationDelivery
            ?.salesAlert
            ?.attempts
        ) || 1
      );

    const retryAt =
      new Date(
        Date.now() +
        60 *
        1000
      );

    await updateNotificationDelivery(
      lead._id,

      {
        status:
          'FAILED',

        attempts,

        nextAttemptAt:
          retryAt,

        lastError:
          cleanText(
            error.message ||
            'Notification delivery failed',
            500
          ),
      }
    );

    logger.error(
      '[Lead Assignment] Notification delivery failed',

      {
        leadId:
          String(
            lead._id
          ),

        error:
          cleanText(
            error.message,
            300
          ),
      }
    );

    /*
     * Never rethrow.
     *
     * Ownership/persistence must not be undone by
     * a notification subsystem failure.
     */
    return null;
  }
}

async function queueAssignmentNotification(
  leadId
) {
  return Lead.findByIdAndUpdate(
    leadId,

    {
      $set: {
        'notificationDelivery.salesAlert.status':
          'PENDING',

        'notificationDelivery.salesAlert.attempts':
          0,

        'notificationDelivery.salesAlert.nextAttemptAt':
          null,

        'notificationDelivery.salesAlert.lastAttemptAt':
          null,

        'notificationDelivery.salesAlert.sentAt':
          null,

        'notificationDelivery.salesAlert.lastError':
          '',
      },
    },

    {
      new:
        true,
    }
  );
}

async function autoRouteLead(
  lead,
  options = {}
) {
  if (!lead?._id) {
    throw new Error(
      'A persisted Lead is required for automatic routing.'
    );
  }

  const {
    force = false,
    attemptImmediateNotification = true,
    reasonPrefix = '',
  } = options;

  /*
   * Never silently replace a legitimate existing owner.
   *
   * Manual reassignment remains an explicit CRM action
   * through lead.service.js.
   */
  if (
    !force &&
    hasOwner(
      lead.assignedTo
    )
  ) {
    return {
      assignedTo:
        lead.assignedTo,

      assignedDepartment:
        lead.assignedDepartment ||
        null,

      assignedTeam:
        lead.assignedTeam ||
        '',

      territory:
        lead.territory ||
        '',

      assignedAt:
        lead.assignedAt ||
        null,

      assignmentSource:
        lead.assignmentSource ||
        'MANUAL',

      assignmentReason:
        lead.assignmentReason ||
        '',

      adminReviewRequired:
        false,

      preservedExistingOwner:
        true,
    };
  }

  const productDepartment =
    resolveDepartment(
      lead.productCategory
    );

  /*
   * A previously established department is useful
   * for legacy/recovery rows where product text is
   * not strong enough to resolve a routing rule.
   */
  const routingDepartment =
    productDepartment ||
    cleanText(
      lead.assignedDepartment,
      80
    ).toUpperCase() ||
    null;

  const bestOwner =
    await findBestOwner({
      department:
        routingDepartment,

      lead,
    });

  let assignedTo =
    bestOwner?.user?._id ||
    null;

  let finalDepartment =
    routingDepartment;

  let adminReviewRequired =
    false;

  let assignmentSource =
    'AUTO_ROUTING';

  let assignmentReason =
    '';

  let assignedTeam =
    routingDepartment
      ? `${routingDepartment}_SALES`
      : '';

  if (bestOwner) {
    assignmentReason = [
      reasonPrefix,

      `product=${routingDepartment}`,

      `priority=${cleanText(
        lead.priority,
        40
      ) || 'UNKNOWN'}`,

      `active_load=${bestOwner.activeLoad}`,

      ...bestOwner.reasons,
    ]
      .filter(Boolean)
      .join('; ');

  } else {
    const adminFallback =
      await findAdminFallbackOwner(
        lead
      );

    adminReviewRequired =
      true;

    if (adminFallback) {
      assignedTo =
        adminFallback
          .user
          ._id;

      finalDepartment =
        'ADMIN';

      assignedTeam =
        'ADMIN_REVIEW';

      assignmentSource =
        'SYSTEM_RECOVERY';

      assignmentReason = [
        reasonPrefix,

        routingDepartment
          ? `No active SALES owner available for ${routingDepartment}; routed to admin review.`
          : 'Product department could not be resolved; routed to admin review.',
      ]
        .filter(Boolean)
        .join('; ');

    } else {
      assignedTo =
        null;

      finalDepartment =
        routingDepartment ||
        'ADMIN';

      assignedTeam =
        routingDepartment
          ? `${routingDepartment}_SALES`
          : 'ADMIN_REVIEW';

      assignmentSource =
        'SYSTEM_RECOVERY';

      assignmentReason = [
        reasonPrefix,

        routingDepartment
          ? `No active owner available for ${routingDepartment}; department/admin review required.`
          : 'No product routing rule or active admin owner available; admin review required.',
      ]
        .filter(Boolean)
        .join('; ');
    }
  }

  const assignedAt =
    new Date();

  const territory =
    cleanText(
      lead.destination,
      200
    );

  /*
   * Assignment must never regress a Lead that has already
   * moved past the initial operational stage.
   *
   * Only a genuine NEW_LEAD becomes ASSIGNED.
   */
  const currentStage =
    cleanText(
      lead.stage ||
      'NEW_LEAD',
      100
    ).toUpperCase();

  const shouldMoveToAssigned =
    Boolean(
      assignedTo &&
      currentStage ===
        'NEW_LEAD'
    );

  const set = {
    assignedDepartment:
      finalDepartment,

    assignedTo,

    assignedTeam,

    territory,

    assignedAt,

    assignmentSource,

    assignmentReason:
      cleanText(
        assignmentReason,
        500
      ),

    /*
     * Assignment is ownership only.
     * It must never imply qualification.
     */
    crmStatus:
      lead.crmStatus ||
      'NEW',

    'notificationDelivery.salesAlert.status':
      'PENDING',

    'notificationDelivery.salesAlert.attempts':
      0,

    'notificationDelivery.salesAlert.nextAttemptAt':
      null,

    'notificationDelivery.salesAlert.lastAttemptAt':
      null,

    'notificationDelivery.salesAlert.sentAt':
      null,

    'notificationDelivery.salesAlert.lastError':
      '',
  };

  if (
    shouldMoveToAssigned
  ) {
    set.stage =
      'ASSIGNED';

    set.stageChangedAt =
      assignedAt;
  }

  const updatedLead =
    await Lead.findByIdAndUpdate(
      lead._id,

      {
        $set:
          set,
      },

      {
        new:
          true,

        runValidators:
          true,
      }
    );

  if (!updatedLead) {
    throw new Error(
      'Lead disappeared during automatic routing.'
    );
  }

  /*
   * Keep caller's in-memory Mongoose document updated
   * for subsequent automation in websiteLead.service.
   */
  if (
    typeof lead.set ===
    'function'
  ) {
    lead.set(
      updatedLead.toObject()
    );
  }

  if (
    attemptImmediateNotification
  ) {
    await createAssignmentNotification({
      lead:
        updatedLead,

      assignedTo,

      assignedDepartment:
        finalDepartment,

      adminReviewRequired,
    });
  }

  /*
   * Assignment audit is best-effort.
   *
   * Audit subsystem failure must not undo persisted
   * ownership or notification state.
   */
  try {
    const auditFn =
      typeof recordAudit ===
        'function'
        ? recordAudit
        : require(
            '../security-audit/auditLog.service'
          ).recordAudit;

    if (
      typeof auditFn ===
      'function'
    ) {
      await auditFn({
        actorId:
          null,

        actionType:
          'LEAD_ASSIGNED',

        entityType:
          'LEAD',

        entityId:
          String(
            lead._id
          ),

        severity:
          adminReviewRequired
            ? 'MEDIUM'
            : 'LOW',

        metadata: {
          assignedTo:
            assignedTo
              ? String(
                  assignedTo
                )
              : '',

          assignedDepartment:
            finalDepartment ||
            '',

          assignedTeam,

          territory,

          assignmentSource,

          adminReviewRequired,

          buyerPriority:
            cleanText(
              lead.priority,
              40
            ),

          recoveryMode:
            Boolean(
              reasonPrefix
            ),
        },
      });
    }

  } catch (auditError) {
    logger.warn(
      '[Lead Assignment] Audit logging failed',

      {
        leadId:
          String(
            lead._id
          ),

        error:
          cleanText(
            auditError.message,
            300
          ),
      }
    );
  }

  return {
    assignedTo,

    assignedDepartment:
      finalDepartment,

    assignedTeam,

    territory,

    assignedAt,

    assignmentSource,

    assignmentReason,

    adminReviewRequired,

    preservedExistingOwner:
      false,
  };
}

module.exports = {
  ACTIVE_CRM_STATUSES,
  autoRouteLead,
  resolveDepartment,
  hasOwner,
  queueAssignmentNotification,
};