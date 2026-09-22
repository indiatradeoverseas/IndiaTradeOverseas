const Lead = require('./lead.model');
const LeadActivity = require('./leadActivity.model');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.18: Sales SLA / untouched-lead monitoring
 *
 * Master DPR requirements covered here:
 * - every lead must have an owner;
 * - every contact attempt must be logged;
 * - every lead must move out of NEW;
 * - HOT leads are immediate operational priority during working hours;
 * - WARM leads require contact in a management-defined same-day window;
 * - NURTURE leads need automated/scheduled follow-up;
 * - Management must monitor lead response time and untouched HOT leads.
 *
 * Important:
 * The DPR does NOT define a numeric response-time SLA and does not define
 * company working-hour boundaries. This service therefore reports factual
 * queue state and elapsed response time instead of inventing SLA thresholds.
 */

const ACTIVE_CRM_STATUSES = Object.freeze([
  'NEW',
  'CONTACT_ATTEMPTED',
  'CONTACTED',
  'QUALIFIED',
  'QUOTATION_SENT',
  'NEGOTIATION',
]);

const TERMINAL_CRM_STATUSES = Object.freeze([
  'WON',
  'LOST',
]);

const DPR_SALES_ACTION = Object.freeze({
  HOT:
    'Immediate operational priority during working hours',

  WARM:
    'Contact in defined same-day service window',

  NURTURE:
    'Automated message + scheduled follow-up',

  LOW:
    'Review / nurture without crowding priority queue',
});


function cleanText(
  value,
  maxLength = 250
) {
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


function normalizeLimit(
  value,
  fallback = 50
) {
  const parsed =
    Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(
    1,
    Math.min(
      Math.floor(parsed),
      100
    )
  );
}


function parseOptionalDate(
  value,
  fieldName
) {
  if (!value) {
    return null;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    const error =
      new Error(
        `${fieldName} must be a valid date.`
      );

    error.code =
      'SLA_DATE_INVALID';

    throw error;
  }

  return parsed;
}


function buildCreatedAtFilter({
  from = null,
  to = null,
} = {}) {
  const parsedFrom =
    parseOptionalDate(
      from,
      'from'
    );

  const parsedTo =
    parseOptionalDate(
      to,
      'to'
    );

  if (
    parsedFrom &&
    parsedTo &&
    parsedFrom > parsedTo
  ) {
    const error =
      new Error(
        'from cannot be later than to.'
      );

    error.code =
      'SLA_DATE_RANGE_INVALID';

    throw error;
  }

  const range = {};

  if (parsedFrom) {
    range.$gte =
      parsedFrom;
  }

  if (parsedTo) {
    range.$lte =
      parsedTo;
  }

  return Object.keys(range).length
    ? {
        createdAt:
          range,
      }
    : {};
}


function isAssigned(
  lead
) {
  if (!lead) {
    return false;
  }

  const assignedTo =
    lead.assignedTo;

  if (
    assignedTo === undefined ||
    assignedTo === null ||
    assignedTo === ''
  ) {
    return false;
  }

  const raw =
    cleanText(
      typeof assignedTo ===
        'object'
        ? assignedTo._id ||
            assignedTo.employeeDbId ||
            assignedTo.employeeId ||
            assignedTo.email
        : assignedTo,
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


function getLeadAgeMinutes(
  lead,
  now = new Date()
) {
  const createdAt =
    new Date(
      lead?.createdAt
    );

  if (
    Number.isNaN(
      createdAt.getTime()
    )
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.round(
      (
        now.getTime() -
        createdAt.getTime()
      ) /
      60000
    )
  );
}


function getFirstResponseMinutes(
  lead
) {
  if (
    !lead?.createdAt ||
    !lead?.firstResponseAt
  ) {
    return null;
  }

  const createdAt =
    new Date(
      lead.createdAt
    );

  const firstResponseAt =
    new Date(
      lead.firstResponseAt
    );

  if (
    Number.isNaN(
      createdAt.getTime()
    ) ||
    Number.isNaN(
      firstResponseAt.getTime()
    )
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.round(
      (
        firstResponseAt.getTime() -
        createdAt.getTime()
      ) /
      60000
    )
  );
}


/* ============================================================
   INDIVIDUAL LEAD SLA FLAGS
============================================================ */

function buildLeadSlaFlags(
  lead,
  now = new Date()
) {
  const flags = [];

  const crmStatus =
    cleanText(
      lead?.crmStatus,
      50
    ).toUpperCase();

  const priority =
    cleanText(
      lead?.priority,
      50
    ).toUpperCase();

  const active =
    ACTIVE_CRM_STATUSES.includes(
      crmStatus
    );

  if (
    active &&
    !isAssigned(lead)
  ) {
    flags.push(
      'UNOWNED'
    );
  }

  if (
    active &&
    crmStatus === 'NEW'
  ) {
    flags.push(
      'STILL_NEW'
    );
  }

  if (
    active &&
    priority === 'HOT' &&
    !lead.firstResponseAt
  ) {
    flags.push(
      'UNTOUCHED_HOT'
    );
  }

  if (
    active &&
    priority === 'WARM' &&
    !lead.firstResponseAt
  ) {
    flags.push(
      'WARM_AWAITING_RESPONSE'
    );
  }

  if (
    active &&
    priority === 'NURTURE' &&
    !lead.nextFollowupAt
  ) {
    flags.push(
      'NURTURE_FOLLOWUP_NOT_SCHEDULED'
    );
  }

  if (
    active &&
    lead.nextFollowupAt
  ) {
    const followupAt =
      new Date(
        lead.nextFollowupAt
      );

    if (
      !Number.isNaN(
        followupAt.getTime()
      ) &&
      followupAt < now
    ) {
      flags.push(
        'FOLLOWUP_OVERDUE'
      );
    }
  }

  if (
    active &&
    crmStatus !== 'NEW' &&
    !lead.firstResponseAt
  ) {
    flags.push(
      'FIRST_RESPONSE_TIMESTAMP_MISSING'
    );
  }

  return flags;
}


/* ============================================================
   MANAGEMENT QUEUE PROJECTION
============================================================ */

function projectQueueLead(
  lead,
  now = new Date()
) {
  const leadObj =
    lead?.toObject
      ? lead.toObject()
      : lead || {};

  const priority =
    cleanText(
      leadObj.priority,
      50
    ).toUpperCase();

  return {
    leadId:
      leadObj._id
        ? String(
            leadObj._id
          )
        : null,

    leadCode:
      leadObj.leadCode ||
      '',

    crmStatus:
      leadObj.crmStatus ||
      'NEW',

    priority:
      priority ||
      '',

    requiredAction:
      DPR_SALES_ACTION[
        priority
      ] || '',

    source:
      leadObj.source ||
      '',

    productCategory:
      leadObj.productCategory ||
      '',

    assignedTo:
      leadObj.assignedTo ||
      null,

    assignedDepartment:
      leadObj.assignedDepartment ||
      null,

    assignedTeam:
      leadObj.assignedTeam ||
      '',

    territory:
      leadObj.territory ||
      '',

    createdAt:
      leadObj.createdAt ||
      null,

    assignedAt:
      leadObj.assignedAt ||
      null,

    firstResponseAt:
      leadObj.firstResponseAt ||
      null,

    lastContactAt:
      leadObj.lastContactAt ||
      null,

    nextFollowupAt:
      leadObj.nextFollowupAt ||
      null,

    leadAgeMinutes:
      getLeadAgeMinutes(
        leadObj,
        now
      ),

    firstResponseMinutes:
      getFirstResponseMinutes(
        leadObj
      ),

    flags:
      buildLeadSlaFlags(
        leadObj,
        now
      ),
  };
}


/* ============================================================
   RESPONSE-TIME METRICS
============================================================ */

async function getResponseTimeSummary(
  createdAtFilter = {}
) {
  const rows =
    await Lead.aggregate([
      {
        $match: {
          ...createdAtFilter,

          firstResponseAt: {
            $ne:
              null,
          },
        },
      },

      {
        $project: {
          responseMs: {
            $subtract: [
              '$firstResponseAt',
              '$createdAt',
            ],
          },
        },
      },

      {
        $match: {
          responseMs: {
            $gte:
              0,
          },
        },
      },

      {
        $group: {
          _id:
            null,

          respondedLeads: {
            $sum:
              1,
          },

          averageResponseMs: {
            $avg:
              '$responseMs',
          },

          fastestResponseMs: {
            $min:
              '$responseMs',
          },

          slowestResponseMs: {
            $max:
              '$responseMs',
          },
        },
      },
    ]);

  const row =
    rows[0] ||
    {};

  const toMinutes =
    (value) => {
      if (
        value === undefined ||
        value === null ||
        !Number.isFinite(
          Number(value)
        )
      ) {
        return null;
      }

      return Number(
        (
          Number(value) /
          60000
        ).toFixed(2)
      );
    };

  return {
    respondedLeads:
      Number(
        row.respondedLeads
      ) || 0,

    averageMinutes:
      toMinutes(
        row.averageResponseMs
      ),

    fastestMinutes:
      toMinutes(
        row.fastestResponseMs
      ),

    slowestMinutes:
      toMinutes(
        row.slowestResponseMs
      ),
  };
}


/* ============================================================
   CONTACT-ATTEMPT LOG INTEGRITY
============================================================ */

async function findMissingFirstContactAttemptLogs({
  createdAtFilter = {},
  limit = 50,
} = {}) {
  const candidates =
    await Lead.find({
      ...createdAtFilter,

      crmStatus: {
        $in: [
          'CONTACT_ATTEMPTED',
          'CONTACTED',
          'QUALIFIED',
          'QUOTATION_SENT',
          'NEGOTIATION',
          'WON',
          'LOST',
        ],
      },
    })
      .select(
        '_id leadCode crmStatus priority source productCategory assignedTo assignedDepartment assignedTeam territory createdAt assignedAt firstResponseAt lastContactAt nextFollowupAt'
      )
      .sort({
        createdAt: -1,
      })
      .limit(
        Math.max(
          limit * 5,
          100
        )
      )
      .lean();

  if (!candidates.length) {
    return [];
  }

  const candidateIds =
    candidates.map(
      (lead) =>
        lead._id
    );

  const loggedLeadIds =
    await LeadActivity.distinct(
      'leadId',
      {
        leadId: {
          $in:
            candidateIds,
        },

        $or: [
          {
            'metadata.toStatus':
              'CONTACT_ATTEMPTED',
          },

          {
            actionType: {
              $in: [
                'CONTACT_ATTEMPTED',
                'CONTACT_ATTEMPT',
                'CALL_ATTEMPT',
                'WHATSAPP_ATTEMPT',
                'EMAIL_ATTEMPT',
              ],
            },
          },
        ],
      }
    );

  const loggedSet =
    new Set(
      loggedLeadIds.map(
        (id) =>
          String(id)
      )
    );

  return candidates
    .filter(
      (lead) =>
        !loggedSet.has(
          String(
            lead._id
          )
        )
    )
    .slice(
      0,
      limit
    )
    .map(
      (lead) =>
        projectQueueLead(
          lead
        )
    );
}


/* ============================================================
   SALES SLA MANAGEMENT DASHBOARD DATA
============================================================ */

async function getSalesSlaDashboard({
  from = null,
  to = null,
  limit = 50,
} = {}) {
  const safeLimit =
    normalizeLimit(
      limit
    );

  const createdAtFilter =
    buildCreatedAtFilter({
      from,
      to,
    });

  const now =
    new Date();

  const openFilter = {
    ...createdAtFilter,

    crmStatus: {
      $in:
        ACTIVE_CRM_STATUSES,
    },
  };

  const unownedFilter = {
    ...openFilter,

    $or: [
      {
        assignedTo:
          null,
      },

      {
        assignedTo:
          '',
      },

      {
        assignedTo: {
          $exists:
            false,
        },
      },
    ],
  };

  const stillNewFilter = {
    ...createdAtFilter,

    crmStatus:
      'NEW',
  };

  const untouchedHotFilter = {
    ...openFilter,

    priority:
      'HOT',

    firstResponseAt:
      null,
  };

  const warmAwaitingResponseFilter = {
    ...openFilter,

    priority:
      'WARM',

    firstResponseAt:
      null,
  };

  const nurtureWithoutFollowupFilter = {
    ...openFilter,

    priority:
      'NURTURE',

    $or: [
      {
        nextFollowupAt:
          null,
      },

      {
        nextFollowupAt: {
          $exists:
            false,
        },
      },
    ],
  };

  const overdueFollowupFilter = {
    ...openFilter,

    nextFollowupAt: {
      $lt:
        now,

      $ne:
        null,
    },
  };

  const queueProjection =
    '_id leadCode crmStatus priority source productCategory assignedTo assignedDepartment assignedTeam territory createdAt assignedAt firstResponseAt lastContactAt nextFollowupAt';

  const [
    totalLeads,
    openLeads,
    unownedLeads,
    stillNewLeads,
    untouchedHotLeads,
    warmAwaitingResponse,
    nurtureWithoutFollowup,
    overdueFollowups,
    responseTime,
    unownedQueue,
    newQueue,
    hotQueue,
    warmQueue,
    nurtureQueue,
    overdueQueue,
    missingContactAttemptLogs,
  ] =
    await Promise.all([
      Lead.countDocuments(
        createdAtFilter
      ),

      Lead.countDocuments(
        openFilter
      ),

      Lead.countDocuments(
        unownedFilter
      ),

      Lead.countDocuments(
        stillNewFilter
      ),

      Lead.countDocuments(
        untouchedHotFilter
      ),

      Lead.countDocuments(
        warmAwaitingResponseFilter
      ),

      Lead.countDocuments(
        nurtureWithoutFollowupFilter
      ),

      Lead.countDocuments(
        overdueFollowupFilter
      ),

      getResponseTimeSummary(
        createdAtFilter
      ),

      Lead.find(
        unownedFilter
      )
        .select(
          queueProjection
        )
        .sort({
          createdAt:
            1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      Lead.find(
        stillNewFilter
      )
        .select(
          queueProjection
        )
        .sort({
          createdAt:
            1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      Lead.find(
        untouchedHotFilter
      )
        .select(
          queueProjection
        )
        .sort({
          createdAt:
            1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      Lead.find(
        warmAwaitingResponseFilter
      )
        .select(
          queueProjection
        )
        .sort({
          createdAt:
            1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      Lead.find(
        nurtureWithoutFollowupFilter
      )
        .select(
          queueProjection
        )
        .sort({
          createdAt:
            1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      Lead.find(
        overdueFollowupFilter
      )
        .select(
          queueProjection
        )
        .sort({
          nextFollowupAt:
            1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      findMissingFirstContactAttemptLogs({
        createdAtFilter,
        limit:
          safeLimit,
      }),
    ]);

  const approvedPolicy=await require('./salesPolicy.model').findOne({key:'CURRENT'}).lean();
  let responseBreaches=null;
  if(approvedPolicy?.approvedAt) {
    responseBreaches={};
    for(const [priority,minutes] of [['HOT',approvedPolicy.hotResponseMinutes],['WARM',approvedPolicy.warmResponseMinutes]]) {
      responseBreaches[priority]=await Lead.countDocuments({priority,crmStatus:{$nin:['WON','LOST']},firstResponseAt:null,createdAt:{$lt:new Date(now.getTime()-minutes*60000)}});
    }
  }
  return {
    generatedAt:
      now,

    scope: {
      from:
        from ||
        null,

      to:
        to ||
        null,

      queueLimit:
        safeLimit,
    },

    policy: {
      approved: approvedPolicy || null,
      responseBreaches,
      HOT:
        DPR_SALES_ACTION.HOT,

      WARM:
        DPR_SALES_ACTION.WARM,

      NURTURE:
        DPR_SALES_ACTION.NURTURE,

      LOW:
        DPR_SALES_ACTION.LOW,

      numericResponseSlaDefinedByDpr:
        false,

      note:
        'Master DPR v4.0 requires Management to define SLAs but does not prescribe numeric response-time thresholds or working-hour boundaries.',
    },

    metrics: {
      totalLeads,
      openLeads,
      unownedLeads,
      stillNewLeads,
      untouchedHotLeads,
      warmAwaitingResponse,
      nurtureWithoutFollowup,
      overdueFollowups,

      missingFirstContactAttemptLogs:
        missingContactAttemptLogs.length,

      responseTime,
    },

    queues: {
      unowned:
        unownedQueue.map(
          (lead) =>
            projectQueueLead(
              lead,
              now
            )
        ),

      stillNew:
        newQueue.map(
          (lead) =>
            projectQueueLead(
              lead,
              now
            )
        ),

      untouchedHot:
        hotQueue.map(
          (lead) =>
            projectQueueLead(
              lead,
              now
            )
        ),

      warmAwaitingResponse:
        warmQueue.map(
          (lead) =>
            projectQueueLead(
              lead,
              now
            )
        ),

      nurtureWithoutFollowup:
        nurtureQueue.map(
          (lead) =>
            projectQueueLead(
              lead,
              now
            )
        ),

      overdueFollowups:
        overdueQueue.map(
          (lead) =>
            projectQueueLead(
              lead,
              now
            )
        ),

      missingFirstContactAttemptLogs:
        missingContactAttemptLogs,
    },
  };
}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  ACTIVE_CRM_STATUSES,
  TERMINAL_CRM_STATUSES,
  DPR_SALES_ACTION,

  buildLeadSlaFlags,
  projectQueueLead,

  getResponseTimeSummary,
  findMissingFirstContactAttemptLogs,

  getSalesSlaDashboard,
};