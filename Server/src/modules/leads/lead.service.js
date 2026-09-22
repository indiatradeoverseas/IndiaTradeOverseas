const crypto = require('crypto');
const mongoose = require('mongoose');

const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');
const Quotation = require('../quotations/quotation.model');

let recordAudit;

try {
  recordAudit =
    require('../security-audit/auditLog.service').recordAudit;
} catch (error) {
  recordAudit = null;
}

const {
  encryptText,
  decryptText,
  hashText,
  hashCompanyName,
  maskPhone,
  maskEmail,
} = require('../../utils/crypto');

const {
  CRM_STATUS,
  CRM_STATUSES,
  crmStatusFromStage,
  normalizeCrmStatus,
  normalizeLostReason,
} = require('./lead.constants');

const {
  transitionLeadCrmStatus,
  canTransition: canTransitionCrmStatus,
} = require('./leadLifecycle.service');

const {
  scoreAndClassifyLead,
} = require('./ai-agent/leadScoring.service');

const {
  parseFlexibleDate,
} = require('./ai-agent/aiLead.service');

const {
  resolveOrCreateContact,
  markContactOpportunityCreated,
  normalizeContactPhone,
} = require('./contactResolution.service');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.16: Lead service alignment
 *
 * Responsibilities of this service after Phase 2 alignment:
 * - preserve the existing rich operational stage pipeline;
 * - never fake qualification simply because ownership was assigned;
 * - keep canonical crmStatus authoritative through leadLifecycle.service.js;
 * - prevent operational stage changes from skipping canonical lifecycle steps;
 * - keep Contact identity separate from Lead / Opportunity identity;
 * - queue CRM re-sync after meaningful CRM-visible mutations;
 * - queue durable assignment notifications instead of relying only on
 *   best-effort immediate Notification.create();
 * - preserve existing list/detail/assignment/import functionality.
 */

const allowedStageTransitions = {
  NEW_LEAD: [
    'ASSIGNED',
    'CONTACT_ATTEMPTED',
    'LEAD_QUALIFICATION',
    'CONTACTED',
    'FOLLOW_UP',
    'REQUIREMENT_CAPTURED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  ASSIGNED: [
    'CONTACT_ATTEMPTED',
    'CONTACTED',
    'FOLLOW_UP',
    'REQUIREMENT_CAPTURED',
    'QUOTATION_REQUIRED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  CONTACT_ATTEMPTED: [
    'CONTACTED',
    'FOLLOW_UP',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  CONTACTED: [
    'LEAD_QUALIFICATION',
    'FOLLOW_UP',
    'REQUIREMENT_CAPTURED',
    'QUOTATION_REQUIRED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  LEAD_QUALIFICATION: [
    'FOLLOW_UP',
    'REQUIREMENT_CAPTURED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  FOLLOW_UP: [
    'FOLLOW_UP',
    'CONTACTED',
    'REQUIREMENT_CAPTURED',
    'REQUIREMENT_RECEIVED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  REQUIREMENT_CAPTURED: [
    'FOLLOW_UP',
    'QUOTATION_REQUIRED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  QUOTATION_REQUIRED: [
    'REQUIREMENT_CAPTURED',
    'FOLLOW_UP',
    'QUOTATION_PENDING_APPROVAL',
    'QUOTATION_REQUESTED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  QUOTATION_PENDING_APPROVAL: [
    'QUOTATION_APPROVED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  QUOTATION_APPROVED: [
    'QUOTATION_SENT',
    'QUOTATION_SHARED',
    'NEGOTIATION',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  QUOTATION_REQUESTED: [
    'QUOTATION_SENT',
    'QUOTATION_SHARED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  QUOTATION_SHARED: [
    'NEGOTIATION',
    'DISPATCH_PLANNED',
    'CLOSED_WON',
    'CLOSED_LOST',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  NEGOTIATION: [
    'LOI_PO_PENDING',
    'SAMPLE_SENT',
    'PRICE_DISCUSSION',
    'CLOSED_LOST',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  LOI_PO_PENDING: [
    'ORDER_CONFIRMED',
    'CLOSED_LOST',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  ORDER_CONFIRMED: [
    'DISPATCH_PENDING',
    'DELIVERED',
    'COMPLETED',
    'CLOSED_LOST',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  DISPATCH_PENDING: [
    'PAYMENT_PENDING',
    'DELIVERED',
    'COMPLETED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  DISPATCH_PLANNED: [
    'PAYMENT_PENDING',
    'DELIVERED',
    'COMPLETED',
    'CLOSED_LOST',
    'DEAL_LOST',
  ],

  PAYMENT_PENDING: [
    'DOCUMENT_PENDING',
    'DELIVERED',
    'COMPLETED',
    'CLOSED_WON',
    'CLOSED_LOST',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  DOCUMENT_PENDING: [
    'CLOSED_WON',
    'DELIVERED',
    'COMPLETED',
    'CLOSED_LOST',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  DELIVERED: [
    'CLOSED_WON',
    'COMPLETED',
    'DEAL_WON',
  ],

  COMPLETED: [
    'CLOSED_WON',
    'DEAL_WON',
  ],

  CLOSED_WON: [
    'DEAL_WON',
  ],

  CLOSED_LOST: [],

  REQUIREMENT_RECEIVED: [
    'QUOTATION_SENT',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  QUOTATION_SENT: [
    'NEGOTIATION',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  SAMPLE_SENT: [
    'PRICE_DISCUSSION',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  PRICE_DISCUSSION: [
    'PAYMENT_DISCUSSION',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  PAYMENT_DISCUSSION: [
    'PO_RECEIVED',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  PO_RECEIVED: [
    'ORDER_CONFIRMED',
    'DEAL_WON',
    'DEAL_LOST',
  ],

  DEAL_WON: [],
  DEAL_LOST: [],
  WON: [],
  LOST: [],
};

const CRM_STATUS_RANK = Object.freeze({
  [CRM_STATUS.NEW]: 0,
  [CRM_STATUS.CONTACT_ATTEMPTED]: 1,
  [CRM_STATUS.CONTACTED]: 2,
  [CRM_STATUS.QUALIFIED]: 3,
  [CRM_STATUS.QUOTATION_SENT]: 4,
  [CRM_STATUS.NEGOTIATION]: 5,
  [CRM_STATUS.WON]: 6,
  [CRM_STATUS.LOST]: 6,
});

const TERMINAL_CRM_STATUSES = new Set([
  CRM_STATUS.WON,
  CRM_STATUS.LOST,
]);

const ADVANCED_OPERATIONAL_STAGES = new Set([
  'NEGOTIATION',
  'LOI_PO_PENDING',
  'ORDER_CONFIRMED',
  'DISPATCH_PENDING',
  'DISPATCH_PLANNED',
  'PAYMENT_PENDING',
  'DOCUMENT_PENDING',
  'CLOSED_WON',
  'DEAL_WON',
]);

const ASSIGNED_DEPARTMENTS = new Set([
  'STONE',
  'COAL',
  'TEA',
  'RICE',
  'TRANSPORT',
  'ADMIN',
  'IT',
  'PROCUREMENT',
  'ACCOUNTS',
  'HR',
  'SALES',
]);

const POST_LOI_STAGES = new Set([
  'ORDER_CONFIRMED',
  'DISPATCH_PENDING',
  'DISPATCH_PLANNED',
  'PAYMENT_PENDING',
  'DOCUMENT_PENDING',
  'CLOSED_WON',
  'DEAL_WON',
]);


/* ============================================================
   BASIC HELPERS
============================================================ */

function cleanText(value, maxLength = 1000) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function isHexObjectId(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-fA-F]{24}$/.test(
      value.trim()
    )
  );
}

function parseLeadDate(value) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    return null;
  }

  try {
    if (typeof parseFlexibleDate === 'function') {
      const flexible =
        parseFlexibleDate(value);

      if (
        flexible instanceof Date &&
        !Number.isNaN(
          flexible.getTime()
        )
      ) {
        return flexible;
      }
    }
  } catch (error) {
    // Fall through to native parsing.
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}

function getActorIdentity(user) {
  const isTrial =
    user?.role === 'SALES_TRIAL' ||
    user?.department === 'SALES_TRIAL' ||
    user?.modelName === 'SalesTrialUser';

  const rawName =
    user?.fullName ||
    user?.name ||
    user?.email ||
    '';

  const name =
    rawName &&
    !isHexObjectId(
      String(rawName)
    )
      ? String(rawName)
      : (
          isTrial
            ? 'Sales Trial Executive'
            : 'Sales Executive'
        );

  return {
    name,

    role:
      isTrial
        ? 'SALES_TRIAL'
        : (
            user?.role ||
            user?.position ||
            'SALES_EXECUTIVE'
          ),
  };
}

function isManagerOrAdmin(user) {
  const role = cleanText(
    user?.role,
    80
  ).toUpperCase();

  const dept = cleanText(
    user?.department,
    80
  ).toUpperCase();

  const position = cleanText(
    user?.position,
    120
  ).toUpperCase();

  return (
    role === 'ADMIN' ||
    role === 'FOUNDER' ||
    role === 'CEO' ||
    role === 'SUPER_ADMIN' ||
    role === 'CO_FOUNDER' ||
    role === 'MANAGER' ||
    role === 'SALES_MANAGER' ||
    role.endsWith('_MANAGER') ||
    role.includes('MANAGER') ||
    dept === 'ADMIN' ||
    dept === 'MANAGEMENT' ||
    position.includes('ADMIN') ||
    position.includes('FOUNDER') ||
    position.includes('CEO') ||
    position.includes('MANAGER')
  );
}

function canOverrideOperationalStage(user) {
  const role = cleanText(
    user?.role,
    80
  ).toUpperCase();

  const dept = cleanText(
    user?.department,
    80
  ).toUpperCase();

  const position = cleanText(
    user?.position,
    120
  ).toUpperCase();

  return (
    isManagerOrAdmin(user) ||
    role === 'DRIVER' ||
    role.includes('DRIVER') ||
    role === 'TRANSPORT' ||
    role === 'LOGISTICS' ||
    dept === 'ADMIN' ||
    dept === 'MANAGEMENT' ||
    dept === 'TRANSPORT' ||
    dept === 'LOGISTICS' ||
    position.includes('ADMIN') ||
    position.includes('MANAGER') ||
    position.includes('FOUNDER') ||
    position.includes('CEO')
  );
}

function actorMatchesAssignedTo(
  user,
  assignedTo
) {
  if (!user || !assignedTo) {
    return false;
  }

  const assigned =
    typeof assignedTo === 'object' &&
    assignedTo !== null
      ? assignedTo
      : { _id: assignedTo };

  const assignedIds = [
    assigned._id,
    assigned.employeeDbId,
    assigned.employeeId,
    assigned.trialId,
  ]
    .filter(Boolean)
    .map((value) =>
      String(value)
    );

  const userIds = [
    user._id,
    user.employeeDbId,
    user.employeeId,
    user.trialId,
  ]
    .filter(Boolean)
    .map((value) =>
      String(value)
    );

  if (
    assignedIds.some(
      (id) =>
        userIds.includes(id)
    )
  ) {
    return true;
  }

  const assignedEmail =
    cleanText(
      assigned.email,
      320
    ).toLowerCase();

  const userEmail =
    cleanText(
      user.email,
      320
    ).toLowerCase();

  return Boolean(
    assignedEmail &&
    userEmail &&
    assignedEmail === userEmail
  );
}

function canViewFullContact(
  user,
  lead
) {
  if (!user) {
    return false;
  }

  const role =
    cleanText(
      user.role,
      80
    ).toUpperCase();

  if (
    isManagerOrAdmin(user) ||
    role === 'HR'
  ) {
    return true;
  }

  return actorMatchesAssignedTo(
    user,
    lead?.assignedTo
  );
}

function safelyDecrypt(value) {
  if (!value) {
    return '';
  }

  try {
    const decrypted =
      decryptText(value);

    if (
      !decrypted ||
      decrypted === 'DECRYPTION_ERROR'
    ) {
      return '';
    }

    return decrypted;
  } catch (error) {
    return '';
  }
}

async function safeAudit(payload) {
  try {
    let fn =
      recordAudit;

    if (
      typeof fn !==
      'function'
    ) {
      const auditModule =
        require(
          '../security-audit/auditLog.service'
        );

      fn =
        auditModule
          ?.recordAudit ||
        null;

      recordAudit =
        fn;
    }

    if (
      typeof fn ===
      'function'
    ) {
      await fn(payload);
    }
  } catch (error) {
    console.warn(
      '[Lead Service] Audit logging failed:',
      error.message
    );
  }
}

function emitLeadUpdated(payload) {
  try {
    const {
      emitEvent,
    } =
      require(
        '../../services/socket.service'
      );

    if (
      typeof emitEvent ===
      'function'
    ) {
      emitEvent(
        'lead_updated',
        payload
      );
    }
  } catch (error) {
    console.warn(
      '[Lead Service] Socket broadcast notice:',
      error.message
    );
  }
}

async function queueCrmResync(leadId) {
  try {
    await Lead.updateOne(
      {
        _id: leadId,

        'crmSync.status': {
          $in: [
            'SYNCED',
            'NOT_REQUIRED',
          ],
        },
      },
      {
        $set: {
          'crmSync.status':
            'PENDING',

          'crmSync.nextAttemptAt':
            null,

          'crmSync.lastError':
            '',
        },
      }
    );
  } catch (error) {
    console.warn(
      '[Lead Service] CRM resync queue update failed:',
      error.message
    );
  }
}

function normalizeAssignedDepartment(value) {
  const normalized =
    cleanText(
      value,
      80
    )
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        '_'
      );

  return ASSIGNED_DEPARTMENTS.has(
    normalized
  )
    ? normalized
    : null;
}

function normalizeOperationalStage(value) {
  return cleanText(
    value,
    100
  )
    .toUpperCase()
    .replace(
      /[\s-]+/g,
      '_'
    );
}

function isLostOperationalStage(stage) {
  return [
    'CLOSED_LOST',
    'DEAL_LOST',
    'LOST',
  ].includes(stage);
}

function isWonOperationalStage(stage) {
  return [
    'CLOSED_WON',
    'DEAL_WON',
    'WON',
  ].includes(stage);
}


/* ============================================================
   ACCESS CONTROL
============================================================ */

function canAccessLead(user, lead) {
  if (!user || !lead) {
    return false;
  }

  const role = cleanText(
    user.role,
    80
  ).toUpperCase();

  const dept = cleanText(
    user.department,
    80
  ).toUpperCase();

  const broadPermission =
    isManagerOrAdmin(user) ||
    role === 'HR' ||
    role === 'ACCOUNTS' ||
    role === 'FINANCE' ||
    role === 'SALES' ||
    role === 'SALES_EXECUTIVE' ||
    role === 'SALES_TRIAL' ||
    role === 'EMPLOYEE' ||
    user.leadPermission === true ||
    user.permissions?.lead === true ||
    user.taskPermission === true ||
    user.permissions?.task === true ||
    user.paymentPermission === true ||
    user.dispatchPermission === true ||
    user.quotationPermission === true ||
    dept === 'SALES';

  if (broadPermission) {
    return true;
  }

  if (
    actorMatchesAssignedTo(
      user,
      lead.assignedTo
    )
  ) {
    return true;
  }

  if (!lead.assignedTo) {
    if (lead.assignedDepartment) {
      return Boolean(
        dept &&
        cleanText(
          lead.assignedDepartment,
          80
        ).toUpperCase() === dept
      );
    }

    return true;
  }

  return false;
}


/* ============================================================
   DISPLAY / PII PROJECTION
============================================================ */

function getLeadDisplay(lead, user) {
  const leadObj = lead?.toObject
    ? lead.toObject()
    : { ...(lead || {}) };

  if (
    !leadObj.estimatedValue ||
    String(
      leadObj.estimatedValue
    ).trim() === ''
  ) {
    const originalValue =
      leadObj.originalPayload?.estimatedValue ||
      leadObj.originalPayload?.valuation ||
      leadObj.originalPayload?.budget;

    if (originalValue) {
      leadObj.estimatedValue =
        String(
          originalValue
        ).trim();

    } else if (
      leadObj.leadValue &&
      Number(
        leadObj.leadValue
      ) > 0
    ) {
      leadObj.estimatedValue =
        `₹${Number(
          leadObj.leadValue
        ).toLocaleString(
          'en-IN'
        )}`;

    } else {
      const txt =
        leadObj.chatSummary ||
        leadObj.remarks ||
        '';

      if (txt) {
        const match =
          txt.match(
            /(?:Valuation\/Budget|Valuation|Budget|Value)[^\n:]*[:—]\s*([^\n,]+)/i
          );

        if (
          match?.[1] &&
          match[1].trim() !==
            'Not specified' &&
          match[1].trim() !==
            '—'
        ) {
          leadObj.estimatedValue =
            match[1].trim();
        }
      }
    }
  }

  if (!leadObj.targetDate) {
    const rawDate =
      leadObj.originalPayload?.targetDate ||
      leadObj.originalPayload?.requiredDate ||
      leadObj.originalPayload?.timeline;

    if (rawDate) {
      const parsed =
        parseLeadDate(
          rawDate
        );

      if (parsed) {
        leadObj.targetDate =
          parsed;
      }
    }
  }

  if (leadObj.assignedTo) {
    if (
      typeof leadObj.assignedTo ===
        'object' &&
      leadObj.assignedTo !==
        null
    ) {
      const displayName =
        leadObj.assignedTo.fullName ||
        leadObj.assignedTo.name ||
        leadObj.assignedTo.email ||
        leadObj.assignedTo.employeeId ||
        (
          leadObj.assignedTo._id
            ? String(
                leadObj.assignedTo._id
              )
            : ''
        );

      if (
        displayName &&
        displayName.toLowerCase() !==
          'unassigned'
      ) {
        leadObj.assignedTo = {
          ...leadObj.assignedTo,
          fullName:
            displayName,
          name:
            displayName,
        };
      } else {
        leadObj.assignedTo =
          null;
      }

    } else {
      const raw =
        cleanText(
          leadObj.assignedTo,
          320
        );

      if (
        raw &&
        ![
          'unassigned',
          'null',
          'undefined',
        ].includes(
          raw.toLowerCase()
        )
      ) {
        leadObj.assignedTo = {
          _id:
            raw,
          fullName:
            raw,
          name:
            raw,
        };

      } else {
        leadObj.assignedTo =
          null;
      }
    }
  }

  const fullContactAllowed =
    canViewFullContact(
      user,
      leadObj
    );

  const decryptedPhone =
    fullContactAllowed
      ? safelyDecrypt(
          leadObj.phoneEncrypted
        )
      : '';

  const decryptedEmail =
    fullContactAllowed
      ? safelyDecrypt(
          leadObj.emailEncrypted
        )
      : '';

  const decryptedGst =
    fullContactAllowed
      ? safelyDecrypt(
          leadObj.gstEncrypted
        )
      : '';

  delete leadObj.phoneEncrypted;
  delete leadObj.emailEncrypted;
  delete leadObj.gstEncrypted;
  delete leadObj.phoneHash;
  delete leadObj.emailHash;
  delete leadObj.gstHash;
  delete leadObj.companyNameHash;

  return {
    ...leadObj,

    phone:
      decryptedPhone ||
      leadObj.phoneMasked ||
      '',

    email:
      decryptedEmail ||
      leadObj.emailMasked ||
      '',

    gst:
      decryptedGst ||
      leadObj.gstMasked ||
      '',
  };
}


/* ============================================================
   ASSIGNEE RESOLUTION
============================================================ */

async function resolveAssignee(assignedTo) {
  if (!assignedTo) {
    return {
      targetAssignedTo:
        null,

      resolvedAssignee:
        null,
    };
  }

  const User =
    require(
      '../users/user.model'
    );

  const Employee =
    require(
      '../employee/employee.model'
    );

  const SalesTrialUser =
    require(
      '../sales-trial/salesTrialUser.model'
    );

  const rawVal =
    cleanText(
      assignedTo?._id ||
      assignedTo?.employeeDbId ||
      assignedTo?.employeeId ||
      assignedTo?.trialId ||
      assignedTo?.email ||
      assignedTo,
      320
    );

  if (!rawVal) {
    return {
      targetAssignedTo:
        null,

      resolvedAssignee:
        null,
    };
  }

  const objectIds = [];
  const emailStrings = [];
  const identifierStrings = [
    rawVal,
  ];

  if (
    rawVal.includes('@')
  ) {
    emailStrings.push(
      rawVal.toLowerCase()
    );
  }

  if (
    mongoose.Types.ObjectId
      .isValid(
        rawVal
      )
  ) {
    objectIds.push(
      new mongoose.Types.ObjectId(
        rawVal
      )
    );
  }

  const userOr = [];
  const employeeOr = [];
  const trialOr = [];

  if (
    objectIds.length
  ) {
    userOr.push(
      {
        _id: {
          $in:
            objectIds,
        },
      },
      {
        employeeDbId: {
          $in:
            objectIds,
        },
      }
    );

    employeeOr.push({
      _id: {
        $in:
          objectIds,
      },
    });

    trialOr.push({
      _id: {
        $in:
          objectIds,
      },
    });
  }

  if (
    emailStrings.length
  ) {
    userOr.push({
      email: {
        $in:
          emailStrings,
      },
    });

    employeeOr.push({
      email: {
        $in:
          emailStrings,
      },
    });

    trialOr.push({
      email: {
        $in:
          emailStrings,
      },
    });
  }

  userOr.push({
    employeeId: {
      $in:
        identifierStrings,
    },
  });

  employeeOr.push({
    employeeId: {
      $in:
        identifierStrings,
    },
  });

  trialOr.push({
    trialId: {
      $in:
        identifierStrings,
    },
  });

  const [
    userMatch,
    employeeMatch,
    trialMatch,
  ] =
    await Promise.all([
      User.findOne({
        $or:
          userOr,
      })
        .select(
          '_id fullName name email role profileImage employeeDbId employeeId department position'
        )
        .lean(),

      Employee.findOne({
        $or:
          employeeOr,
      })
        .select(
          '_id fullName name email role profileImage employeeId department position'
        )
        .lean(),

      SalesTrialUser.findOne({
        $or:
          trialOr,
      })
        .select(
          '_id fullName name email role profileImage trialId department position'
        )
        .lean(),
    ]);

  const resolvedAssignee =
    userMatch ||
    employeeMatch ||
    trialMatch;

  let targetAssignedTo =
    resolvedAssignee?._id ||
    null;

  if (
    !targetAssignedTo &&
    objectIds.length
  ) {
    targetAssignedTo =
      objectIds[0];
  }

  if (!targetAssignedTo) {
    targetAssignedTo =
      rawVal;
  }

  return {
    targetAssignedTo,
    resolvedAssignee,
  };
}

function getAssigneeDisplayObject(
  resolvedAssignee
) {
  if (!resolvedAssignee) {
    return null;
  }

  const displayName =
    resolvedAssignee.fullName ||
    resolvedAssignee.name ||
    resolvedAssignee.email ||
    resolvedAssignee.trialId ||
    resolvedAssignee.employeeId ||
    String(
      resolvedAssignee._id
    );

  const isTrial =
    resolvedAssignee.role ===
      'SALES_TRIAL' ||
    resolvedAssignee.department ===
      'SALES_TRIAL' ||
    Boolean(
      resolvedAssignee.trialId
    );

  return {
    _id:
      resolvedAssignee._id,

    fullName:
      displayName,

    name:
      displayName,

    email:
      resolvedAssignee.email ||
      '',

    role:
      resolvedAssignee.role ||
      (
        isTrial
          ? 'SALES_TRIAL'
          : ''
      ),

    profileImage:
      resolvedAssignee
        .profileImage ||
      '',

    employeeDbId:
      resolvedAssignee
        .employeeDbId ||
      '',

    employeeId:
      resolvedAssignee
        .employeeId ||
      resolvedAssignee
        .trialId ||
      '',

    trialId:
      resolvedAssignee
        .trialId ||
      '',

    department:
      resolvedAssignee
        .department ||
      '',
  };
}


/* ============================================================
   LIST LEADS
============================================================ */

async function listLeads(
  user,
  query = {}
) {
  const filter = {};

  if (query.stage) {
    filter.stage =
      normalizeOperationalStage(
        query.stage
      );
  }

  if (query.crmStatus) {
    const crmStatus =
      normalizeCrmStatus(
        query.crmStatus
      );

    if (crmStatus) {
      filter.crmStatus =
        crmStatus;
    }
  }

  if (query.priority) {
    filter.priority =
      cleanText(
        query.priority,
        40
      ).toUpperCase();
  }

  if (
    query.productCategory
  ) {
    filter.productCategory =
      cleanText(
        query.productCategory,
        100
      );

  } else if (
    query.includeCareers !==
      'true'
  ) {
    filter.productCategory = {
      $nin: [
        'CAREERS',
        'Careers',
        'careers',
      ],
    };
  }

  const role =
    cleanText(
      user?.role,
      80
    ).toUpperCase();

  const dept =
    cleanText(
      user?.department,
      80
    ).toUpperCase();

  const isManagerOrAdminUser =
    isManagerOrAdmin(
      user
    ) ||
    role ===
      'TRANSPORT_MANAGER' ||
    role ===
      'LOGISTICS_MANAGER' ||
    dept ===
      'TRANSPORT' ||
    dept ===
      'LOGISTICS' ||
    user?.dispatchPermission ===
      true ||
    user?.permissions?.dispatch ===
      true;

  const shouldFilterMyLeadsOnly =
    query.myLeadsOnly ===
      'true' ||
    (
      !isManagerOrAdminUser &&
      role !== 'HR' &&
      role !== 'ACCOUNTS' &&
      role !== 'FINANCE' &&
      query.dispatchQueue !==
        'true'
    );

  if (
    shouldFilterMyLeadsOnly
  ) {
    const actorIds = [];

    const pushActorId =
      (value) => {
        if (
          value === undefined ||
          value === null ||
          value === ''
        ) {
          return;
        }

        actorIds.push(
          value
        );

        const str =
          String(
            value
          );

        actorIds.push(
          str
        );

        if (
          str.includes('@')
        ) {
          actorIds.push(
            str.toLowerCase()
          );
        }
      };

    pushActorId(
      user?._id
    );

    pushActorId(
      user?.employeeDbId
    );

    pushActorId(
      user?.trialId
    );

    pushActorId(
      user?.employeeId
    );

    pushActorId(
      user?.email
    );

    try {
      const Employee =
        require(
          '../employee/employee.model'
        );

      const SalesTrialUser =
        require(
          '../sales-trial/salesTrialUser.model'
        );

      const promises = [];

      if (user?.email) {
        const escapedEmail =
          String(
            user.email
          ).replace(
            /[-\/\\^$*+?.()|[\]{}]/g,
            '\\$&'
          );

        const emailRegex = {
          $regex:
            new RegExp(
              `^${escapedEmail}$`,
              'i'
            ),
        };

        promises.push(
          Employee.findOne({
            email:
              emailRegex,
          })
        );

        promises.push(
          SalesTrialUser.findOne({
            email:
              emailRegex,
          })
        );
      }

      if (
        user?.trialId
      ) {
        promises.push(
          SalesTrialUser.findOne({
            trialId:
              user.trialId,
          })
        );

      } else if (
        user?._id &&
        mongoose.Types.ObjectId
          .isValid(
            String(
              user._id
            )
          )
      ) {
        promises.push(
          SalesTrialUser.findById(
            user._id
          )
        );
      }

      const results =
        await Promise.all(
          promises
        );

      results.forEach(
        (item) => {
          if (!item) {
            return;
          }

          pushActorId(
            item._id
          );

          pushActorId(
            item.trialId
          );

          pushActorId(
            item.employeeId
          );

          pushActorId(
            item.email
          );
        }
      );

    } catch (error) {
      console.warn(
        '[Lead Service] Employee / Sales Trial identity resolution failed:',
        error.message
      );
    }

    const queryIds = [];

    actorIds.forEach(
      (value) => {
        if (
          value === undefined ||
          value === null ||
          value === ''
        ) {
          return;
        }

        queryIds.push(
          value
        );

        const str =
          String(
            value
          );

        queryIds.push(
          str
        );

        if (
          str.includes('@')
        ) {
          queryIds.push(
            str.toLowerCase()
          );
        }

        if (
          mongoose.Types.ObjectId
            .isValid(
              str
            )
        ) {
          try {
            queryIds.push(
              new mongoose.Types.ObjectId(
                str
              )
            );
          } catch (error) {
            // Ignore invalid conversion.
          }
        }
      }
    );

    filter.assignedTo = {
      $in: [
        ...new Set(
          queryIds
        ),
      ],
    };
  }

  const User =
    require(
      '../users/user.model'
    );

  const Employee =
    require(
      '../employee/employee.model'
    );

  const SalesTrialUser =
    require(
      '../sales-trial/salesTrialUser.model'
    );

  const rawLeads =
    await Lead.find(
      filter
    )
      .populate(
        'createdBy',
        'fullName name email role profileImage'
      )
      .sort({
        createdAt:
          -1,
      })
      .lean();

  const rawAssignedValues = [
    ...new Set(
      rawLeads
        .map(
          (lead) =>
            lead.assignedTo
              ? String(
                  lead.assignedTo
                    ._id ||
                  lead.assignedTo
                )
              : null
        )
        .filter(Boolean)
    ),
  ];

  if (
    rawAssignedValues.length
  ) {
    const objectIds = [];
    const stringValues = [];

    for (
      const rawValue of
        rawAssignedValues
    ) {
      const value =
        cleanText(
          rawValue,
          320
        );

      if (!value) {
        continue;
      }

      stringValues.push(
        value
      );

      if (
        value.includes('@')
      ) {
        stringValues.push(
          value.toLowerCase()
        );
      }

      if (
        mongoose.Types.ObjectId
          .isValid(
            value
          )
      ) {
        objectIds.push(
          new mongoose.Types.ObjectId(
            value
          )
        );
      }
    }

    const userOr = [];
    const employeeOr = [];
    const trialOr = [];

    if (
      stringValues.length
    ) {
      userOr.push(
        {
          email: {
            $in:
              stringValues,
          },
        },
        {
          employeeId: {
            $in:
              stringValues,
          },
        }
      );

      employeeOr.push(
        {
          email: {
            $in:
              stringValues,
          },
        },
        {
          employeeId: {
            $in:
              stringValues,
          },
        }
      );

      trialOr.push(
        {
          email: {
            $in:
              stringValues,
          },
        },
        {
          trialId: {
            $in:
              stringValues,
          },
        }
      );
    }

    if (
      objectIds.length
    ) {
      userOr.push(
        {
          _id: {
            $in:
              objectIds,
          },
        },
        {
          employeeDbId: {
            $in:
              objectIds,
          },
        }
      );

      employeeOr.push({
        _id: {
          $in:
            objectIds,
        },
      });

      trialOr.push({
        _id: {
          $in:
            objectIds,
        },
      });
    }

    const [
      users,
      employees,
      trialUsers,
    ] =
      await Promise.all([
        userOr.length
          ? User.find({
              $or:
                userOr,
            })
              .select(
                '_id fullName name email role profileImage employeeDbId employeeId department'
              )
              .lean()
          : [],

        employeeOr.length
          ? Employee.find({
              $or:
                employeeOr,
            })
              .select(
                '_id fullName name email role profileImage employeeId department'
              )
              .lean()
          : [],

        trialOr.length
          ? SalesTrialUser
              .find({
                $or:
                  trialOr,
              })
              .select(
                '_id fullName name email role profileImage trialId department'
              )
              .lean()
          : [],
      ]);

    const assigneeMap =
      new Map();

    const addToMap =
      (info) => {
        if (!info) {
          return;
        }

        const cleanInfo =
          getAssigneeDisplayObject(
            info
          );

        const keys = [
          info._id,
          info.email,
          info.employeeDbId,
          info.employeeId,
          info.trialId,
        ]
          .filter(Boolean)
          .map(
            (value) =>
              String(
                value
              )
          );

        keys.forEach(
          (key) => {
            assigneeMap.set(
              key,
              cleanInfo
            );

            if (
              key.includes('@')
            ) {
              assigneeMap.set(
                key.toLowerCase(),
                cleanInfo
              );
            }
          }
        );
      };

    users.forEach(
      addToMap
    );

    employees.forEach(
      addToMap
    );

    trialUsers.forEach(
      addToMap
    );

    rawLeads.forEach(
      (lead) => {
        if (
          !lead.assignedTo
        ) {
          return;
        }

        let rawVal =
          lead.assignedTo;

        let existingName =
          null;

        if (
          typeof rawVal ===
            'object' &&
          rawVal !== null
        ) {
          existingName =
            rawVal.fullName ||
            rawVal.name ||
            rawVal.email ||
            rawVal.trialId ||
            rawVal.employeeId ||
            null;

          rawVal =
            String(
              rawVal._id ||
              rawVal
            );

        } else {
          rawVal =
            String(
              rawVal
            );
        }

        const resolved =
          assigneeMap.get(
            rawVal
          ) ||
          (
            rawVal.includes('@')
              ? assigneeMap.get(
                  rawVal.toLowerCase()
                )
              : null
          );

        if (resolved) {
          lead.assignedTo =
            resolved;

        } else if (
          existingName &&
          String(
            existingName
          ).toLowerCase() !==
            'unassigned'
        ) {
          lead.assignedTo = {
            _id:
              rawVal,

            fullName:
              existingName,

            name:
              existingName,
          };

        } else if (
          rawVal &&
          rawVal.toLowerCase() !==
            'unassigned'
        ) {
          lead.assignedTo = {
            _id:
              rawVal,

            fullName:
              rawVal,

            name:
              rawVal,
          };

        } else {
          lead.assignedTo =
            null;
        }
      }
    );
  }

  return rawLeads.map(
    (lead) =>
      getLeadDisplay(
        lead,
        user
      )
  );
}


/* ============================================================
   GET LEAD DETAILS
============================================================ */

async function getLeadById(
  id,
  user
) {
  const User =
    require(
      '../users/user.model'
    );

  const Employee =
    require(
      '../employee/employee.model'
    );

  const SalesTrialUser =
    require(
      '../sales-trial/salesTrialUser.model'
    );

  const cleanId =
    cleanText(
      id,
      320
    );

  if (!cleanId) {
    throw new Error(
      'LEAD_NOT_FOUND'
    );
  }

  let lead =
    null;

  if (
    mongoose.Types.ObjectId
      .isValid(
        cleanId
      )
  ) {
    try {
      lead =
        await Lead
          .findById(
            cleanId
          )
          .populate(
            'createdBy',
            'fullName name email role profileImage'
          );
    } catch (error) {
      console.warn(
        '[Lead Service] Lead ObjectId lookup notice:',
        error.message
      );
    }
  }

  if (!lead) {
    const escapedId =
      cleanId.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

    lead =
      await Lead.findOne({
        $or: [
          {
            leadCode:
              cleanId,
          },
          {
            leadCode:
              new RegExp(
                `^${escapedId}$`,
                'i'
              ),
          },
          {
            orderNumber:
              cleanId,
          },
        ],
      }).populate(
        'createdBy',
        'fullName name email role profileImage'
      );
  }

  if (!lead) {
    throw new Error(
      'LEAD_NOT_FOUND'
    );
  }

  if (
    !canAccessLead(
      user,
      lead
    )
  ) {
    throw new Error(
      'OWNERSHIP_FORBIDDEN'
    );
  }

  const leadObj =
    lead.toObject
      ? lead.toObject()
      : {
          ...lead,
        };

  if (
    leadObj.assignedTo
  ) {
    try {
      const {
        resolvedAssignee,
      } =
        await resolveAssignee(
          leadObj.assignedTo
        );

      if (
        resolvedAssignee
      ) {
        leadObj.assignedTo =
          getAssigneeDisplayObject(
            resolvedAssignee
          );
      }
    } catch (error) {
      console.warn(
        '[Lead Service] Assigned-to display resolution notice:',
        error.message
      );
    }
  }

  let rawActivities = [];

  try {
    rawActivities =
      await LeadActivity
        .find({
          leadId:
            lead._id,
        })
        .populate(
          'actorId',
          'fullName name email role profileImage'
        )
        .sort({
          createdAt:
            -1,
        })
        .lean();

  } catch (error) {
    console.warn(
      '[Lead Service] Lead activity lookup notice:',
      error.message
    );

    rawActivities =
      await LeadActivity
        .find({
          leadId:
            lead._id,
        })
        .sort({
          createdAt:
            -1,
        })
        .lean();
  }

  const searchActorIds = [
    ...new Set(
      rawActivities
        .map(
          (activity) => {
            if (
              !activity.actorId
            ) {
              return null;
            }

            if (
              typeof activity.actorId ===
                'object'
            ) {
              return String(
                activity.actorId._id ||
                ''
              );
            }

            return String(
              activity.actorId
            );
          }
        )
        .filter(Boolean)
    ),
  ];

  const validObjectIds = [];
  const stringIds = [];

  searchActorIds.forEach(
    (idString) => {
      if (!idString) {
        return;
      }

      if (
        isHexObjectId(
          idString
        )
      ) {
        try {
          validObjectIds.push(
            new mongoose.Types.ObjectId(
              idString
            )
          );
        } catch (error) {
          // Ignore invalid conversion.
        }

      } else {
        stringIds.push(
          idString
        );
      }
    }
  );

  const actorMap =
    new Map();

  if (
    validObjectIds.length ||
    stringIds.length
  ) {
    const userOr = [];
    const employeeOr = [];
    const trialOr = [];

    if (
      validObjectIds.length
    ) {
      userOr.push({
        _id: {
          $in:
            validObjectIds,
        },
      });

      employeeOr.push({
        _id: {
          $in:
            validObjectIds,
        },
      });

      trialOr.push({
        _id: {
          $in:
            validObjectIds,
        },
      });
    }

    if (
      stringIds.length
    ) {
      userOr.push(
        {
          employeeId: {
            $in:
              stringIds,
          },
        },
        {
          email: {
            $in:
              stringIds,
          },
        }
      );

      employeeOr.push(
        {
          employeeId: {
            $in:
              stringIds,
          },
        },
        {
          email: {
            $in:
              stringIds,
          },
        }
      );

      trialOr.push(
        {
          trialId: {
            $in:
              stringIds,
          },
        },
        {
          email: {
            $in:
              stringIds,
          },
        }
      );
    }

    try {
      const [
        users,
        employees,
        trialUsers,
      ] =
        await Promise.all([
          userOr.length
            ? User.find({
                $or:
                  userOr,
              })
                .select(
                  '_id fullName name email role department position profileImage employeeId'
                )
                .lean()
            : [],

          employeeOr.length
            ? Employee.find({
                $or:
                  employeeOr,
              })
                .select(
                  '_id fullName name email role department position profileImage employeeId'
                )
                .lean()
            : [],

          trialOr.length
            ? SalesTrialUser
                .find({
                  $or:
                    trialOr,
                })
                .select(
                  '_id fullName name email role department position profileImage trialId'
                )
                .lean()
            : [],
        ]);

      const addActorToMap =
        (
          info,
          defaultRole =
            null
        ) => {
          if (!info) {
            return;
          }

          let rawName =
            info.fullName ||
            info.name ||
            info.email ||
            info.trialId ||
            info.employeeId ||
            '';

          if (
            rawName &&
            isHexObjectId(
              String(
                rawName
              )
            )
          ) {
            rawName =
              info.trialId ||
              info.employeeId ||
              '';
          }

          const isTrial =
            defaultRole ===
              'SALES_TRIAL' ||
            info.department ===
              'SALES_TRIAL' ||
            info.role ===
              'SALES_TRIAL' ||
            Boolean(
              info.trialId
            );

          const cleanInfo = {
            _id:
              info._id,

            name:
              rawName ||
              (
                isTrial
                  ? 'Sales Trial Executive'
                  : 'Sales Executive'
              ),

            role:
              isTrial
                ? 'SALES_TRIAL'
                : (
                    info.role ||
                    info.position ||
                    info.department ||
                    'SALES_EXECUTIVE'
                  ),

            email:
              info.email ||
              '',
          };

          [
            info._id,
            info.employeeId,
            info.trialId,
          ]
            .filter(Boolean)
            .forEach(
              (key) => {
                actorMap.set(
                  String(
                    key
                  ),
                  cleanInfo
                );
              }
            );
        };

      users.forEach(
        (item) =>
          addActorToMap(
            item
          )
      );

      employees.forEach(
        (item) =>
          addActorToMap(
            item
          )
      );

      trialUsers.forEach(
        (item) =>
          addActorToMap(
            item,
            'SALES_TRIAL'
          )
      );

    } catch (error) {
      console.warn(
        '[Lead Service] Activity actor resolution notice:',
        error.message
      );
    }
  }

  const isUserTrial =
    user &&
    (
      user.role ===
        'SALES_TRIAL' ||
      user.department ===
        'SALES_TRIAL' ||
      user.modelName ===
        'SalesTrialUser'
    );

  let defaultCustodian =
    null;

  if (
    leadObj.assignedTo &&
    typeof leadObj.assignedTo ===
      'object' &&
    leadObj.assignedTo.fullName &&
    !isHexObjectId(
      String(
        leadObj.assignedTo.fullName
      )
    )
  ) {
    defaultCustodian = {
      name:
        leadObj.assignedTo.fullName ||
        leadObj.assignedTo.name ||
        leadObj.assignedTo.email ||
        'Assigned Executive',

      role:
        (
          leadObj.assignedTo.role &&
          leadObj.assignedTo.role !==
            'USER'
        )
          ? leadObj.assignedTo.role
          : (
              isUserTrial
                ? 'SALES_TRIAL'
                : 'SALES_EXECUTIVE'
            ),
    };

  } else if (
    leadObj.createdBy &&
    typeof leadObj.createdBy ===
      'object' &&
    leadObj.createdBy.fullName &&
    !isHexObjectId(
      String(
        leadObj.createdBy.fullName
      )
    )
  ) {
    defaultCustodian = {
      name:
        leadObj.createdBy.fullName ||
        leadObj.createdBy.name ||
        leadObj.createdBy.email ||
        'Lead Creator',

      role:
        leadObj.createdBy.role ||
        'USER',
    };

  } else if (user) {
    const actor =
      getActorIdentity(
        user
      );

    defaultCustodian = {
      name:
        actor.name,

      role:
        actor.role,
    };
  }

  const activities =
    rawActivities.map(
      (activity) => {
        let performer =
          null;

        if (
          activity.actorId &&
          typeof activity.actorId ===
            'object'
        ) {
          const actorName =
            activity.actorId.fullName ||
            activity.actorId.name ||
            activity.actorId.email ||
            '';

          if (
            actorName &&
            !isHexObjectId(
              String(
                actorName
              )
            )
          ) {
            performer = {
              _id:
                activity.actorId._id,

              name:
                actorName,

              role:
                activity.actorId.role ||
                (
                  isUserTrial
                    ? 'SALES_TRIAL'
                    : 'SALES_EXECUTIVE'
                ),

              email:
                activity.actorId.email ||
                '',
            };
          }
        }

        if (
          !performer &&
          activity.actorId
        ) {
          const actorId =
            String(
              activity.actorId._id ||
              activity.actorId
            );

          performer =
            actorMap.get(
              actorId
            ) ||
            null;
        }

        if (
          !performer &&
          activity.metadata
        ) {
          const metaName =
            activity.metadata.performedByName ||
            activity.metadata.actorName ||
            activity.metadata.userName ||
            activity.metadata.createdBy ||
            '';

          if (
            metaName &&
            metaName !==
              'System' &&
            !isHexObjectId(
              String(
                metaName
              )
            )
          ) {
            performer = {
              name:
                metaName,

              role:
                activity.metadata.performedByRole ||
                activity.metadata.role ||
                (
                  isUserTrial
                    ? 'SALES_TRIAL'
                    : 'SALES_EXECUTIVE'
                ),
            };
          }
        }

        if (
          !performer &&
          activity.note &&
          String(
            activity.note
          ).includes(
            'AI Agent'
          )
        ) {
          performer = {
            name:
              'AI Agent System',

            role:
              'WEBSITE_AI',
          };
        }

        const finalPerformer = {
          ...(
            performer ||
            defaultCustodian ||
            {
              name:
                isUserTrial
                  ? 'Sales Trial Executive'
                  : 'Sales Executive',

              role:
                isUserTrial
                  ? 'SALES_TRIAL'
                  : 'SALES_EXECUTIVE',
            }
          ),
        };

        if (
          finalPerformer.name &&
          isHexObjectId(
            String(
              finalPerformer.name
            )
          )
        ) {
          finalPerformer.name =
            isUserTrial
              ? 'Sales Trial Executive'
              : 'Sales Executive';
        }

        if (
          isUserTrial &&
          (
            !finalPerformer.role ||
            finalPerformer.role ===
              'SALES_EXECUTIVE'
          )
        ) {
          finalPerformer.role =
            'SALES_TRIAL';
        }

        return {
          ...activity,

          performer:
            finalPerformer,
        };
      }
    );

  const latestQuotation =
    await Quotation.findOne({
      leadId:
        lead._id,
    }).sort({
      createdAt:
        -1,
    });

  if (
    latestQuotation
  ) {
    leadObj.quotationStatus =
      latestQuotation.status;
  }

  return {
    lead:
      getLeadDisplay(
        leadObj,
        user
      ),

    activities,
  };
}


/* ============================================================
   CANONICAL CRM ALIGNMENT FOR OPERATIONAL STAGE
============================================================ */

async function alignCanonicalCrmStatusForStage({
  lead,
  newStage,
  lostReason,
  lostReasonNotes,
  remark,
  nextFollowupAt,
  user,
}) {
  const currentCrmStatus =
    normalizeCrmStatus(
      lead.crmStatus
    ) ||
    CRM_STATUS.NEW;

  const targetCrmStatus =
    crmStatusFromStage(
      newStage
    );

  if (
    TERMINAL_CRM_STATUSES.has(
      currentCrmStatus
    ) &&
    targetCrmStatus !==
      currentCrmStatus
  ) {
    throw new Error(
      'CRM_TERMINAL_REOPEN_REQUIRES_STATUS_ENDPOINT: Reopening a WON/LOST Lead requires the canonical CRM status endpoint and a controlled management override.'
    );
  }

  if (
    targetCrmStatus ===
    currentCrmStatus
  ) {
    return lead;
  }

  const currentRank =
    CRM_STATUS_RANK[
      currentCrmStatus
    ] ?? 0;

  const targetRank =
    CRM_STATUS_RANK[
      targetCrmStatus
    ] ?? 0;

  if (
    !TERMINAL_CRM_STATUSES.has(
      targetCrmStatus
    ) &&
    targetRank <
      currentRank
  ) {
    return lead;
  }

  if (
    !canTransitionCrmStatus(
      currentCrmStatus,
      targetCrmStatus
    )
  ) {
    throw new Error(
      `CRM_TRANSITION_REQUIRED: Operational stage ${newStage} would move CRM status from ${currentCrmStatus} to ${targetCrmStatus} without completing the required canonical lifecycle step.`
    );
  }

  const normalizedLostReason =
    targetCrmStatus ===
      CRM_STATUS.LOST
      ? normalizeLostReason(
          lostReason
        )
      : '';

  const result =
    await transitionLeadCrmStatus({
      leadId:
        lead._id,

      toStatus:
        targetCrmStatus,

      actorId:
        user?._id ||
        null,

      note:
        remark ||
        `Operational stage requested: ${newStage}`,

      nextFollowupAt:
        nextFollowupAt ||
        null,

      lostReason:
        normalizedLostReason,

      lostReasonNotes:
        lostReasonNotes ||
        remark ||
        '',
    });

  return result.lead;
}


/* ============================================================
   UPDATE OPERATIONAL STAGE
============================================================ */

async function updateStage({
  leadId,
  newStage,
  remark = '',
  nextFollowupAt = null,
  lostReason = '',
  lostReasonNotes = '',
  podFileUrl,
  paymentProofUrl,
  driverProofUrl,
  photoUrl,
  paymentProof,
  deliveryImages,
  user,
  ipAddress,
  deviceHash,
}) {
  const normalizedStage =
    normalizeOperationalStage(
      newStage
    );

  let lead =
    null;

  if (
    mongoose.isValidObjectId(
      leadId
    )
  ) {
    lead =
      await Lead.findById(
        leadId
      );
  }

  if (!lead) {
    lead =
      await Lead.findOne({
        $or: [
          {
            leadCode:
              leadId,
          },
          {
            orderNumber:
              leadId,
          },
        ],
      });
  }

  if (!lead) {
    throw new Error(
      'LEAD_NOT_FOUND'
    );
  }

  if (
    !canAccessLead(
      user,
      lead
    )
  ) {
    await safeAudit({
      actorId:
        user?._id ||
        null,

      actionType:
        'UNAUTHORIZED_VIEW',

      entityType:
        'LEAD',

      entityId:
        lead._id,

      severity:
        'HIGH',

      ipAddress,
      deviceHash,

      metadata: {
        action:
          'change_stage',
      },
    });

    throw new Error(
      'OWNERSHIP_FORBIDDEN'
    );
  }

  const previousStage =
    normalizeOperationalStage(
      lead.stage ||
      'NEW_LEAD'
    );

  const isAllowed =
    allowedStageTransitions[
      previousStage
    ]?.includes(
      normalizedStage
    );

  const canOverrideOperationalStageValue =
    canOverrideOperationalStage(
      user
    );

  if (
    !isAllowed &&
    previousStage !==
      normalizedStage &&
    !canOverrideOperationalStageValue
  ) {
    throw new Error(
      `INVALID_STAGE_TRANSITION: Cannot transition from ${previousStage} to ${normalizedStage}`
    );
  }

  if (
    isLostOperationalStage(
      normalizedStage
    ) &&
    !normalizeLostReason(
      lostReason
    )
  ) {
    throw new Error(
      'LOST_REASON_REQUIRED: A valid Master DPR lost reason is mandatory when marking a Lead as lost.'
    );
  }

  if (
    ADVANCED_OPERATIONAL_STAGES.has(
      normalizedStage
    )
  ) {
    const existingQuote =
      await Quotation.findOne({
        leadId:
          lead._id,
      }).sort({
        createdAt:
          -1,
      });

    if (
      existingQuote &&
      [
        'PENDING',
        'REJECTED',
      ].includes(
        existingQuote.status
      )
    ) {
      throw new Error(
        `QUOTATION_NOT_APPROVED: Cannot transition to ${normalizedStage.replace(/_/g, ' ')}. Quotation is ${existingQuote.status}. Manager approval is required first.`
      );
    }
  }

  if (
    POST_LOI_STAGES.has(
      normalizedStage
    )
  ) {
    const hasLOI =
      Array.isArray(
        lead.loiDocuments
      ) &&
      lead.loiDocuments.length > 0;

    if (!hasLOI) {
      throw new Error(
        `LOI_DOCUMENT_REQUIRED: LOI Document must be uploaded before advancing to ${normalizedStage.replace(/_/g, ' ')}.`
      );
    }
  }

  lead =
    await alignCanonicalCrmStatusForStage({
      lead,

      newStage:
        normalizedStage,

      lostReason,
      lostReasonNotes,
      remark,
      nextFollowupAt,
      user,
    });

  lead.stage =
    normalizedStage;

  lead.stageChangedAt =
    new Date();

  lead.stageChangedBy =
    user?._id ||
    null;

  if (remark) {
    lead.remarks =
      cleanText(
        remark,
        2000
      );
  }

  if (
    nextFollowupAt
  ) {
    const parsedFollowup =
      new Date(
        nextFollowupAt
      );

    if (
      Number.isNaN(
        parsedFollowup
          .getTime()
      )
    ) {
      throw new Error(
        'CRM_DATE_INVALID: nextFollowupAt must be a valid date.'
      );
    }

    lead.nextFollowupAt =
      parsedFollowup;
  }

  const activePodUrl =
    podFileUrl ||
    paymentProofUrl ||
    paymentProof
      ?.proofImageUrl ||
    '';

  const activeDriverUrl =
    driverProofUrl ||
    photoUrl ||
    deliveryImages
      ?.driverSelfieUrl ||
    '';

  if (
    activePodUrl
  ) {
    lead.podFileUrl =
      activePodUrl;

    lead.paymentProofUrl =
      activePodUrl;
  }

  if (
    activeDriverUrl
  ) {
    lead.driverProofUrl =
      activeDriverUrl;

    lead.photoUrl =
      activeDriverUrl;
  }

  if (
    paymentProof
  ) {
    lead.paymentProof =
      paymentProof;
  }

  if (
    deliveryImages
  ) {
    lead.deliveryImages =
      deliveryImages;
  }

  await lead.save();

  const actorIdentity =
    getActorIdentity(
      user
    );

  let activity =
    null;

  try {
    activity =
      await LeadActivity.create({
        leadId:
          lead._id,

        actionType:
          isLostOperationalStage(
            normalizedStage
          )
            ? 'LEAD_LOST'
            : 'LEAD_STAGE_CHANGED',

        note:
          isLostOperationalStage(
            normalizedStage
          )
            ? `Lead marked lost. Reason: ${normalizeLostReason(lostReason)}. Explanation: ${lostReasonNotes || remark || 'No additional note'}`
            : (
                remark ||
                `Stage transitioned from ${previousStage} to ${normalizedStage}`
              ),

        nextFollowupAt:
          lead.nextFollowupAt ||
          null,

        actorId:
          user?._id ||
          null,

        metadata: {
          fromStage:
            previousStage,

          toStage:
            normalizedStage,

          crmStatus:
            lead.crmStatus,

          lostReason:
            isLostOperationalStage(
              normalizedStage
            )
              ? normalizeLostReason(
                  lostReason
                )
              : '',

          lostReasonNotes:
            isLostOperationalStage(
              normalizedStage
            )
              ? cleanText(
                  lostReasonNotes,
                  1000
                )
              : '',

          performedByName:
            actorIdentity.name,

          performedByRole:
            actorIdentity.role,
        },
      });

  } catch (error) {
    console.warn(
      '[Lead Service] Stage activity logging failed:',
      error.message
    );
  }

  if (
    isLostOperationalStage(
      normalizedStage
    )
  ) {
    try {
      const Notification =
        require(
          '../notifications/notification.model'
        );

      await Notification.create({
        targetDepartment:
          'SALES',

        message:
          `Lead Lost: ${lead.leadCode || lead.customerName} was marked lost. Reason: ${normalizeLostReason(lostReason)}.`,

        type:
          'LEAD_LOST',

        metadata: {
          leadId:
            lead._id,

          leadCode:
            lead.leadCode,

          lostReason:
            normalizeLostReason(
              lostReason
            ),

          lostReasonNotes:
            cleanText(
              lostReasonNotes,
              1000
            ),
        },
      });

    } catch (error) {
      console.warn(
        '[Lead Service] Lost-lead notification failed:',
        error.message
      );
    }
  }

  if (
    [
      'ORDER_CONFIRMED',
      'PO_RECEIVED',
    ].includes(
      normalizedStage
    )
  ) {
    try {
      const Notification =
        require(
          '../notifications/notification.model'
        );

      await Notification.create({
        targetDepartment:
          'TRANSPORT',

        message:
          `New order confirmed for lead ${lead.leadCode || lead.customerName}. Transport and driver assignment can begin.`,

        type:
          'ORDER_CONFIRMED',

        metadata: {
          leadId:
            lead._id,

          leadCode:
            lead.leadCode,
        },
      });

    } catch (error) {
      console.warn(
        '[Lead Service] Order notification failed:',
        error.message
      );
    }
  }

  await safeAudit({
    actorId:
      user?._id ||
      null,

    actionType:
      'LEAD_STAGE_CHANGED',

    entityType:
      'LEAD',

    entityId:
      lead._id.toString(),

    severity:
      isWonOperationalStage(
        normalizedStage
      ) ||
      isLostOperationalStage(
        normalizedStage
      )
        ? 'MEDIUM'
        : 'LOW',

    ipAddress,
    deviceHash,

    metadata: {
      previousStage,

      newStage:
        normalizedStage,

      crmStatus:
        lead.crmStatus,

      activityId:
        activity?._id ||
        null,
    },
  });

  emitLeadUpdated({
    action:
      'stage_change',

    leadId:
      lead._id,

    stage:
      normalizedStage,

    crmStatus:
      lead.crmStatus,
  });

  await queueCrmResync(
    lead._id
  );

  return getLeadDisplay(
    lead,
    user
  );
}


/* ============================================================
   MANUAL ASSIGNMENT
============================================================ */

async function assignLead({
  leadId,
  assignedTo,
  assignedDepartment,
  user,
}) {
  const lead =
    await Lead.findById(
      leadId
    );

  if (!lead) {
    throw new Error(
      'LEAD_NOT_FOUND'
    );
  }

  const oldAssignedTo =
    lead.assignedTo
      ? String(
          lead.assignedTo._id ||
          lead.assignedTo
        )
      : '';

  const oldAssignedDepartment =
    lead.assignedDepartment ||
    null;

  const {
    targetAssignedTo,
    resolvedAssignee,
  } =
    await resolveAssignee(
      assignedTo
    );

  const requestedDepartment =
    assignedDepartment !==
      undefined
      ? assignedDepartment
      : (
          resolvedAssignee
            ?.department ||
          lead.assignedDepartment ||
          null
        );

  const finalDepartment =
    requestedDepartment
      ? normalizeAssignedDepartment(
          requestedDepartment
        )
      : null;

  if (
    requestedDepartment &&
    !finalDepartment
  ) {
    throw new Error(
      'INVALID_ASSIGNED_DEPARTMENT'
    );
  }

  lead.assignedTo =
    targetAssignedTo;

  lead.assignedDepartment =
    finalDepartment;

  lead.assignedAt =
    targetAssignedTo ||
    finalDepartment
      ? new Date()
      : null;

  lead.assignmentSource =
    'MANUAL';

  lead.assignmentReason =
    targetAssignedTo
      ? `Manually assigned by ${user?.fullName || user?.name || user?.email || 'management user'}`
      : 'Manual assignment update';

  if (
    finalDepartment &&
    !lead.assignedTeam
  ) {
    lead.assignedTeam =
      `${finalDepartment}_SALES`;
  }

  if (
    (
      targetAssignedTo ||
      finalDepartment
    ) &&
    lead.stage ===
      'NEW_LEAD'
  ) {
    lead.stage =
      'ASSIGNED';

    lead.stageChangedAt =
      new Date();

    lead.stageChangedBy =
      user?._id ||
      null;
  }

  const newAssignedTo =
    targetAssignedTo
      ? String(
          targetAssignedTo
        )
      : '';

  const assignmentChanged =
    oldAssignedTo !==
      newAssignedTo ||
    oldAssignedDepartment !==
      finalDepartment;

  if (
    assignmentChanged
  ) {
    lead.notificationDelivery =
      lead.notificationDelivery ||
      {};

    lead.notificationDelivery.salesAlert = {
      status:
        'PENDING',

      attempts:
        0,

      nextAttemptAt:
        null,

      lastAttemptAt:
        null,

      sentAt:
        null,

      lastError:
        '',
    };
  }

  await lead.save();

  const assigneeName =
    resolvedAssignee?.fullName ||
    resolvedAssignee?.name ||
    (
      targetAssignedTo
        ? 'assigned employee'
        : 'unassigned'
    );

  const actorIdentity =
    getActorIdentity(
      user
    );

  try {
    await LeadActivity.create({
      leadId:
        lead._id,

      actionType:
        'LEAD_ASSIGNED',

      note:
        `Lead assignment updated. Custodian: ${assigneeName}, Department: ${finalDepartment || 'none'}`,

      actorId:
        user?._id ||
        null,

      metadata: {
        assignedTo:
          targetAssignedTo
            ? String(
                targetAssignedTo
              )
            : '',

        assignedDepartment:
          finalDepartment ||
          '',

        crmStatus:
          lead.crmStatus,

        performedByName:
          actorIdentity.name,

        performedByRole:
          actorIdentity.role,
      },
    });

  } catch (error) {
    console.warn(
      '[Lead Service] Assignment activity failed:',
      error.message
    );
  }

  await safeAudit({
    actorId:
      user?._id ||
      null,

    actionType:
      'LEAD_ASSIGNED',

    entityType:
      'LEAD',

    entityId:
      lead._id.toString(),

    severity:
      'LOW',

    metadata: {
      assignedTo:
        targetAssignedTo
          ? String(
              targetAssignedTo
            )
          : '',

      assignedDepartment:
        finalDepartment ||
        '',

      assignmentSource:
        'MANUAL',
    },
  });

  emitLeadUpdated({
    action:
      'assign',

    leadId:
      lead._id,

    assignedTo:
      targetAssignedTo
        ? String(
            targetAssignedTo
          )
        : '',

    assignedDepartment:
      finalDepartment ||
      '',
  });

  await queueCrmResync(
    lead._id
  );

  const leadObj =
    lead.toObject();

  if (
    resolvedAssignee
  ) {
    leadObj.assignedTo =
      getAssigneeDisplayObject(
        resolvedAssignee
      );
  }

  return getLeadDisplay(
    leadObj,
    user
  );
}


/* ============================================================
   DELETE LEAD — LEGACY ADMIN OPERATION
============================================================ */

async function deleteLead(
  leadId,
  user
) {
  const lead =
    await Lead.findById(
      leadId
    );

  if (!lead) {
    throw new Error(
      'LEAD_NOT_FOUND'
    );
  }

  await Lead.findByIdAndDelete(
    leadId
  );

  await LeadActivity.deleteMany({
    leadId,
  });

  await safeAudit({
    actorId:
      user?._id ||
      null,

    actionType:
      'LEAD_DELETED',

    entityType:
      'LEAD',

    entityId:
      leadId,

    severity:
      'HIGH',

    metadata: {
      leadCode:
        lead.leadCode,
    },
  });

  return {
    success: true,
  };
}


/* ============================================================
   BULK ASSIGNMENT
============================================================ */

async function assignLeadsBulk({
  leadIds,
  assignedTo,
  user,
}) {
  if (
    !Array.isArray(
      leadIds
    ) ||
    !leadIds.length
  ) {
    throw new Error(
      'LEAD_IDS_REQUIRED'
    );
  }

  const {
    targetAssignedTo,
    resolvedAssignee,
  } =
    await resolveAssignee(
      assignedTo
    );

  const assigneeName =
    resolvedAssignee?.fullName ||
    resolvedAssignee?.name ||
    (
      targetAssignedTo
        ? 'assigned employee'
        : 'unassigned'
    );

  const actorIdentity =
    getActorIdentity(
      user
    );

  let modifiedCount =
    0;

  for (
    const leadId of
      leadIds
  ) {
    try {
      const lead =
        await Lead.findById(
          leadId
        );

      if (!lead) {
        continue;
      }

      lead.assignedTo =
        targetAssignedTo;

      lead.assignedAt =
        targetAssignedTo
          ? new Date()
          : null;

      lead.assignmentSource =
        'MANUAL';

      lead.assignmentReason =
        `Bulk assignment by ${user?.fullName || user?.name || user?.email || 'management user'}`;

      if (
        targetAssignedTo &&
        lead.stage ===
          'NEW_LEAD'
      ) {
        lead.stage =
          'ASSIGNED';

        lead.stageChangedAt =
          new Date();

        lead.stageChangedBy =
          user?._id ||
          null;
      }

      if (
        targetAssignedTo
      ) {
        lead.notificationDelivery =
          lead.notificationDelivery ||
          {};

        lead.notificationDelivery.salesAlert = {
          status:
            'PENDING',

          attempts:
            0,

          nextAttemptAt:
            null,

          lastAttemptAt:
            null,

          sentAt:
            null,

          lastError:
            '',
        };
      }

      await lead.save();

      modifiedCount +=
        1;

      try {
        await LeadActivity.create({
          leadId:
            lead._id,

          actionType:
            'LEAD_ASSIGNED',

          note:
            `Bulk Lead assignment updated. Custodian: ${assigneeName}.`,

          actorId:
            user?._id ||
            null,

          metadata: {
            performedByName:
              actorIdentity.name,

            performedByRole:
              actorIdentity.role,
          },
        });

      } catch (error) {
        console.warn(
          '[Lead Service] Bulk assignment activity failed:',
          error.message
        );
      }

      await queueCrmResync(
        lead._id
      );

    } catch (error) {
      console.warn(
        `[Lead Service] Bulk assignment failed for ${leadId}:`,
        error.message
      );
    }
  }

  await safeAudit({
    actorId:
      user?._id ||
      null,

    actionType:
      'LEAD_ASSIGNED',

    entityType:
      'LEAD',

    entityId:
      String(
        leadIds[0]
      ),

    severity:
      'MEDIUM',

    metadata: {
      leadIds,

      assignedTo:
        targetAssignedTo
          ? String(
              targetAssignedTo
            )
          : '',

      modifiedCount,
    },
  });

  return {
    success:
      true,

    modifiedCount,
  };
}


/* ============================================================
   BULK IMPORT
============================================================ */

async function bulkImportLeads(
  leadsArray,
  user
) {
  if (
    !Array.isArray(
      leadsArray
    ) ||
    !leadsArray.length
  ) {
    throw new Error(
      'LEADS_ARRAY_REQUIRED'
    );
  }

  const importedLeads =
    [];

  const errors =
    [];

  for (
    let index = 0;
    index < leadsArray.length;
    index += 1
  ) {
    const row =
      leadsArray[index] ||
      {};

    try {
      const customerName =
        cleanText(
          row.customerName ||
          row.name,
          150
        );

      const companyName =
        cleanText(
          row.companyName ||
          row.company,
          200
        );

      const productCategory =
        cleanText(
          row.productCategory,
          100
        );

      if (
        !customerName ||
        !row.phone ||
        !productCategory
      ) {
        errors.push(
          `Row ${index + 1}: Missing required fields (customerName, phone, productCategory)`
        );

        continue;
      }

      const phone =
        normalizeContactPhone(
          row.phone
        );

      const email =
        cleanText(
          row.email,
          320
        ).toLowerCase();

      const gst =
        cleanText(
          row.gst ||
          row.gstin,
          40
        )
          .toUpperCase()
          .replace(
            /[^A-Z0-9]/g,
            ''
          );

      const quantityText =
        cleanText(
          row.quantity,
          120
        );

      const quantityValueRaw =
        row.quantityValue !==
          undefined
          ? row.quantityValue
          : quantityText;

      const quantityValue =
        Number(
          String(
            quantityValueRaw ||
            ''
          ).replace(
            /[^0-9.]/g,
            ''
          )
        );

      const parsedTargetDate =
        parseLeadDate(
          row.targetDate ||
          row.requiredDate ||
          ''
        );

      const timeline =
        cleanText(
          row.timeline ||
          row.purchaseTimeline,
          120
        );

      const contactResolution =
        await resolveOrCreateContact({
          source:
            'IMPORT',

          name:
            customerName,

          companyName,

          country:
            cleanText(
              row.country,
              100
            ) ||
            'India',

          phone,

          phoneVerified:
            row.phoneVerified ===
            true,

          email,

          emailVerified:
            row.emailVerified ===
            true,

          gst,

          gstVerified:
            row.gstVerified ===
            true,

          consent:
            row.consent ||
            {},

          actorId:
            user?._id ||
            null,
        });

      const scoringResult =
        scoreAndClassifyLead({
          truckCount:
            row.truckCount ??
            row.trucks ??
            row.quantityTrucks ??
            row.requiredTrucks,

          timeline,

          targetDate:
            parsedTargetDate,

          isImmediateRequirement:
            row.isImmediateRequirement ===
            true,

          withinSevenDays:
            row.withinSevenDays ===
              true ||
            row.within7Days ===
              true,

          isPriorityAServiceableMarket:
            row.isPriorityAServiceableMarket ===
              true ||
            row.priorityAServiceableMarket ===
              true,

          serviceabilityTier:
            row.serviceabilityTier ||
            row.marketTier ||
            row.destinationTier,

          companyName,

          gst,

          gstVerified:
            row.gstVerified ===
            true,

          businessVerificationProvided:
            row.businessVerificationProvided ===
              true ||
            row.businessVerified ===
              true,

          completedPriceCheck:
            row.completedPriceCheck ===
              true ||
            row.priceCheckCompleted ===
              true,

          returnVisit:
            row.returnVisit ===
              true ||
            row.isReturnVisit ===
              true,

          visitCount:
            row.visitCount ||
            row.sessionVisitCount,

          repeatVisitCount:
            row.repeatVisitCount,
        });

      const suppliedPriority =
        cleanText(
          row.priority ||
          row.temperature ||
          row.quality,
          40
        ).toUpperCase();

      const explicitPriority =
        [
          'COLD',
          'DEAD',
        ].includes(
          suppliedPriority
        )
          ? 'LOW'
          : suppliedPriority;

      const finalPriority =
        [
          'HOT',
          'WARM',
          'NURTURE',
          'LOW',
          'FAKE',
          'INCOMPLETE',
        ].includes(
          explicitPriority
        )
          ? explicitPriority
          : scoringResult.priority;

      const phoneHash =
        hashText(
          phone
        );

      const emailHash =
        email
          ? hashText(
              email
            )
          : '';

      const companyNameHash =
        companyName
          ? hashCompanyName(
              companyName
            )
          : '';

      const gstHash =
        gst
          ? hashText(
              gst
            )
          : '';

      const leadCode =
        `LD-${Date.now()}-${crypto
          .randomUUID()
          .slice(
            0,
            8
          )}`;

      const lead =
        await Lead.create({
          leadCode,

          contactId:
            contactResolution
              .contact?._id ||
            null,

          contactResolution: {
            status:
              contactResolution.status ||
              'UNRESOLVED',

            method:
              contactResolution.method ||
              'NONE',

            resolvedAt:
              contactResolution.contact
                ? new Date()
                : null,
          },

          source:
            'IMPORT',

          leadOrigin:
            'IMPORT',

          customerName,
          companyName,
          companyNameHash,

          phoneEncrypted:
            encryptText(
              phone
            ),

          phoneMasked:
            maskPhone(
              phone
            ),

          phoneHash,

          emailEncrypted:
            email
              ? encryptText(
                  email
                )
              : '',

          emailMasked:
            email
              ? maskEmail(
                  email
                )
              : '',

          emailHash,

          gstEncrypted:
            gst
              ? encryptText(
                  gst
                )
              : '',

          gstMasked:
            gst
              ? `${gst.slice(0, 2)}${'*'.repeat(
                  Math.max(
                    4,
                    gst.length - 4
                  )
                )}${gst.slice(-2)}`
              : '',

          gstHash,

          whatsAppNumber:
            cleanText(
              row.whatsAppNumber ||
              row.whatsapp ||
              phone,
              40
            ),

          contactPerson:
            customerName,

          country:
            cleanText(
              row.country,
              100
            ) ||
            'India',

          productCategory,

          product:
            cleanText(
              row.product,
              150
            ),

          productVariant:
            cleanText(
              row.productVariant,
              150
            ),

          grade:
            cleanText(
              row.grade,
              150
            ),

          specification:
            cleanText(
              row.specification,
              1000
            ),

          quantity:
            quantityText,

          quantityValue:
            Number.isFinite(
              quantityValue
            )
              ? quantityValue
              : 0,

          quantityUnit:
            cleanText(
              row.quantityUnit,
              30
            ) ||
            'MT',

          quantityBand:
            cleanText(
              row.quantityBand,
              100
            ),

          destination:
            cleanText(
              row.destination,
              200
            ),

          timeline,

          targetDate:
            parsedTargetDate,

          leadValue:
            Number(
              row.leadValue ||
              0
            ) ||
            0,

          score:
            scoringResult.score,

          priority:
            finalPriority,

          crmStatus:
            'NEW',

          crmStatusChangedAt:
            new Date(),

          crmStatusChangedBy:
            user?._id ||
            null,

          stage:
            'NEW_LEAD',

          stageChangedAt:
            new Date(),

          stageChangedBy:
            user?._id ||
            null,

          assignedTo:
            null,

          duplicateOf:
            null,

          automationStatus:
            'COMPLETED',

          automationAttempts:
            0,

          crmSync: {
            status:
              'PENDING',

            attempts:
              0,

            nextAttemptAt:
              null,

            manualRecoveryRequired:
              false,
          },

          originalPayload: {
            ingestionVersion:
              'MASTER_DPR_V4_PHASE_2_IMPORT_V1',

            scoringVersion:
              scoringResult.scoringVersion,

            scoreBreakdown:
              scoringResult.breakdown,

            priorityOverride:
              finalPriority !==
              scoringResult.priority
                ? finalPriority
                : '',

            contactResolutionReason:
              cleanText(
                contactResolution.reason,
                200
              ),

            contactConflictIds:
              Array.isArray(
                contactResolution
                  .conflictContactIds
              )
                ? contactResolution
                    .conflictContactIds
                    .map(
                      (value) =>
                        cleanText(
                          value,
                          64
                        )
                    )
                    .filter(Boolean)
                : [],
          },

          createdBy:
            user?._id ||
            null,
        });

      if (
        lead.contactId
      ) {
        try {
          await markContactOpportunityCreated(
            lead.contactId,
            {
              source:
                'IMPORT',

              occurredAt:
                lead.createdAt ||
                new Date(),
            }
          );

        } catch (error) {
          console.warn(
            '[Lead Service] Imported Contact opportunity summary failed:',
            error.message
          );
        }
      }

      try {
        const actorIdentity =
          getActorIdentity(
            user
          );

        await LeadActivity.create({
          leadId:
            lead._id,

          actionType:
            'LEAD_CREATED',

          note:
            `Lead imported by ${user?.fullName || user?.name || 'user'}. Initial DPR Score: ${scoringResult.score}.`,

          actorId:
            user?._id ||
            null,

          metadata: {
            scoringVersion:
              scoringResult.scoringVersion,

            contactResolutionStatus:
              contactResolution.status,

            performedByName:
              actorIdentity.name,

            performedByRole:
              actorIdentity.role,
          },
        });

      } catch (error) {
        console.warn(
          '[Lead Service] Import activity failed:',
          error.message
        );
      }

      importedLeads.push(
        lead._id
      );

    } catch (error) {
      errors.push(
        `Row ${index + 1}: ${error.message}`
      );
    }
  }

  return {
    successCount:
      importedLeads.length,

    errors,
  };
}


/* ============================================================
   PRIORITY / COMMERCIAL VALUE UPDATE
============================================================ */

async function updatePriority({
  leadId,
  priority,
  leadValue,
  user,
}) {
  const lead =
    await Lead.findById(
      leadId
    );

  if (!lead) {
    throw new Error(
      'LEAD_NOT_FOUND'
    );
  }

  if (
    !canAccessLead(
      user,
      lead
    )
  ) {
    throw new Error(
      'OWNERSHIP_FORBIDDEN'
    );
  }

  const oldPriority =
    lead.priority;

  const oldLeadValue =
    lead.leadValue;

  if (priority) {
    let normalizedPriority =
      cleanText(
        priority,
        40
      ).toUpperCase();

    if (
      [
        'COLD',
        'DEAD',
      ].includes(
        normalizedPriority
      )
    ) {
      normalizedPriority =
        'LOW';
    }

    const validPriorities = [
      'HOT',
      'WARM',
      'NURTURE',
      'LOW',
      'FAKE',
      'INCOMPLETE',
    ];

    if (
      !validPriorities.includes(
        normalizedPriority
      )
    ) {
      throw new Error(
        'INVALID_PRIORITY'
      );
    }

    lead.priority =
      normalizedPriority;
  }

  if (
    leadValue !== undefined &&
    leadValue !== null &&
    leadValue !== ''
  ) {
    const numericValue =
      Number(
        String(
          leadValue
        ).replace(
          /[^0-9.]/g,
          ''
        )
      );

    if (
      !Number.isFinite(
        numericValue
      ) ||
      numericValue < 0
    ) {
      throw new Error(
        'INVALID_LEAD_VALUE'
      );
    }

    lead.leadValue =
      numericValue;
  }

  await lead.save();

  try {
    await LeadActivity.create({
      leadId:
        lead._id,

      actionType:
        'PRIORITY_UPDATED',

      note:
        `Lead details updated (Priority: ${lead.priority}, Valuation: ₹${lead.leadValue || 0}) by ${user?.fullName || user?.name || 'user'}`,

      actorId:
        user?._id ||
        null,

      metadata: {
        oldPriority,

        newPriority:
          lead.priority,

        oldLeadValue,

        newLeadValue:
          lead.leadValue,
      },
    });

  } catch (error) {
    console.warn(
      '[Lead Service] Priority activity failed:',
      error.message
    );
  }

  await safeAudit({
    actorId:
      user?._id ||
      null,

    actionType:
      'LEAD_PRIORITY_UPDATED',

    entityType:
      'LEAD',

    entityId:
      lead._id.toString(),

    severity:
      'LOW',

    metadata: {
      oldPriority,

      newPriority:
        lead.priority,

      oldLeadValue,

      newLeadValue:
        lead.leadValue,
    },
  });

  emitLeadUpdated({
    action:
      'priority_update',

    leadId:
      lead._id,

    priority:
      lead.priority,

    leadValue:
      lead.leadValue,
  });

  await queueCrmResync(
    lead._id
  );

  return getLeadDisplay(
    lead,
    user
  );
}


module.exports = {
  listLeads,
  getLeadById,
  updateStage,
  canAccessLead,
  getLeadDisplay,
  assignLead,
  deleteLead,
  assignLeadsBulk,
  bulkImportLeads,
  updatePriority,
};