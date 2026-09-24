const mongoose = require('mongoose');

const User = require('../users/user.model');
const Employee = require('../employee/employee.model');
const Task = require('../task/task.model');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.27B: Lead evidence object-level authorization
 *
 * Sensitive Lead evidence includes:
 * - call recordings;
 * - voice notes;
 * - LOI / commercial documents.
 *
 * Route-level permission is not enough for these resources.
 * A user must additionally be related to the specific Lead/evidence record,
 * unless they are an explicitly authorized management/review role.
 */

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

function normalizeRole(value) {
  return cleanText(
    value,
    100
  ).toUpperCase();
}

const SalesTrialUser = require('../sales-trial/salesTrialUser.model');

function isBroadEvidenceReviewer(
  user
) {
  if (!user) {
    return false;
  }

  const role =
    normalizeRole(
      user.role
    );

  const department =
    normalizeRole(
      user.department
    );

  const position =
    normalizeRole(
      user.position
    );

  return (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'FOUNDER' ||
    role === 'CO_FOUNDER' ||
    role === 'CEO' ||
    role === 'MANAGER' ||
    role === 'SALES_MANAGER' ||
    role === 'SALES_EXECUTIVE' ||
    role === 'SALES_TRIAL' ||
    role === 'SALES' ||
    role === 'HR' ||
    role.endsWith(
      '_MANAGER'
    ) ||
    role.includes(
      'MANAGER'
    ) ||
    role.includes(
      'FOUNDER'
    ) ||
    role.includes(
      'CEO'
    ) ||
    role.includes(
      'SALES'
    ) ||
    position.includes(
      'ADMIN'
    ) ||
    position.includes(
      'FOUNDER'
    ) ||
    position.includes(
      'MANAGER'
    ) ||
    position.includes(
      'CEO'
    ) ||
    department ===
      'ADMIN' ||
    department ===
      'MANAGEMENT' ||
    department ===
      'SALES' ||
    department ===
      'SALES_TRIAL' ||
    user?.isTrial === true ||
    user?.modelName === 'SalesTrialUser'
  );
}

function addIdentity(
  identitySet,
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return;
  }

  if (
    typeof value === 'object' &&
    value !== null
  ) {
    const candidates = [
      value._id,
      value.id,
      value.employeeDbId,
      value.employeeId,
      value.trialId,
    ];

    candidates.forEach(
      (candidate) =>
        addIdentity(
          identitySet,
          candidate
        )
    );

    return;
  }

  const normalized =
    cleanText(
      value,
      320
    );

  if (!normalized) {
    return;
  }

  identitySet.add(
    normalized
  );
}

async function buildUserIdentitySet(
  user
) {
  const identitySet =
    new Set();

  if (!user) {
    return identitySet;
  }

  addIdentity(
    identitySet,
    user._id
  );

  addIdentity(
    identitySet,
    user.employeeDbId
  );

  addIdentity(
    identitySet,
    user.employeeId
  );

  addIdentity(
    identitySet,
    user.trialId
  );

  const email =
    cleanText(
      user.email,
      320
    ).toLowerCase();

  if (!email) {
    return identitySet;
  }

  try {
    const [
      employee,
      userRecord,
      trialUser,
    ] =
      await Promise.all([
        Employee.findOne({
          email,
        })
          .select(
            '_id employeeId'
          )
          .lean(),

        User.findOne({
          email,
        })
          .select(
            '_id employeeId employeeDbId'
          )
          .lean(),

        SalesTrialUser.findOne({
          email,
        })
          .select(
            '_id trialId'
          )
          .lean(),
      ]);

    if (employee) {
      addIdentity(
        identitySet,
        employee._id
      );

      addIdentity(
        identitySet,
        employee.employeeId
      );
    }

    if (userRecord) {
      addIdentity(
        identitySet,
        userRecord._id
      );

      addIdentity(
        identitySet,
        userRecord.employeeId
      );

      addIdentity(
        identitySet,
        userRecord.employeeDbId
      );
    }

    if (trialUser) {
      addIdentity(
        identitySet,
        trialUser._id
      );

      addIdentity(
        identitySet,
        trialUser.trialId
      );
    }

  } catch {
    /*
     * Identity expansion failure must not accidentally grant access.
     * The IDs already present on req.user remain available.
     */
  }

  return identitySet;
}

function identityMatches(
  value,
  identitySet
) {
  if (
    !value ||
    !(identitySet instanceof Set)
  ) {
    return false;
  }

  const candidates =
    [];

  if (
    typeof value ===
      'object' &&
    value !== null
  ) {
    candidates.push(
      value._id,
      value.id,
      value.employeeDbId,
      value.employeeId
    );

  } else {
    candidates.push(
      value
    );
  }

  return candidates.some(
    (candidate) => {
      if (
        candidate === undefined ||
        candidate === null ||
        candidate === ''
      ) {
        return false;
      }

      return identitySet.has(
        String(
          candidate
        ).trim()
      );
    }
  );
}

function buildTaskIdentityCandidates(
  identitySet
) {
  const values =
    [];

  for (
    const value
    of identitySet
  ) {
    values.push(
      value
    );

    if (
      mongoose.isValidObjectId(
        value
      )
    ) {
      values.push(
        new mongoose.Types.ObjectId(
          value
        )
      );
    }
  }

  return values;
}

async function isTaskAssigneeForLead({
  leadId,
  identitySet,
}) {
  if (
    !leadId ||
    !identitySet?.size
  ) {
    return false;
  }

  const identities =
    buildTaskIdentityCandidates(
      identitySet
    );

  if (!identities.length) {
    return false;
  }

  const task =
    await Task.findOne({
      leadId,

      assignedTo: {
        $in:
          identities,
      },
    })
      .select(
        '_id'
      )
      .lean();

  return Boolean(
    task
  );
}

/**
 * Strict Lead evidence access.
 *
 * Unlike the generic CRM canAccessLead() helper, this does NOT grant access
 * merely because a user belongs to SALES or possesses a general leadPermission.
 *
 * Evidence access is intentionally object-specific.
 */
async function hasLeadEvidenceAccess({
  user,
  lead,
  allowTaskAssignee = true,
}) {
  if (
    !user ||
    !lead
  ) {
    return false;
  }

  if (
    isBroadEvidenceReviewer(
      user
    )
  ) {
    return true;
  }

  const identitySet =
    await buildUserIdentitySet(
      user
    );

  if (
    identityMatches(
      lead.assignedTo,
      identitySet
    )
  ) {
    return true;
  }

  if (
    identityMatches(
      lead.createdBy,
      identitySet
    )
  ) {
    return true;
  }

  if (
    allowTaskAssignee &&
    lead._id
  ) {
    try {
      const taskAssigned =
        await isTaskAssigneeForLead({
          leadId:
            lead._id,

          identitySet,
        });

      if (taskAssigned) {
        return true;
      }

    } catch {
      /*
       * Failure to resolve Task ownership must fail closed.
       */
    }
  }

  return false;
}

/**
 * Call recordings have an additional legitimate custodian:
 * the executive who created/owns the call recording.
 */
async function hasCallRecordingAccess({
  user,
  recording,
  lead = null,
}) {
  if (
    !user ||
    !recording
  ) {
    return false;
  }

  if (
    isBroadEvidenceReviewer(
      user
    )
  ) {
    return true;
  }

  const identitySet =
    await buildUserIdentitySet(
      user
    );

  if (
    identityMatches(
      recording.executiveId,
      identitySet
    )
  ) {
    return true;
  }

  if (!lead) {
    return false;
  }

  if (
    identityMatches(
      lead.assignedTo,
      identitySet
    ) ||
    identityMatches(
      lead.createdBy,
      identitySet
    )
  ) {
    return true;
  }

  try {
    return await isTaskAssigneeForLead({
      leadId:
        lead._id,

      identitySet,
    });

  } catch {
    return false;
  }
}

/**
 * Manager remarks are supervisory evidence.
 * Ordinary Lead ownership does not grant permission to impersonate a manager.
 */
function canManageCallRecordingRemark(
  user
) {
  if (!user) {
    return false;
  }

  const role =
    normalizeRole(
      user.role
    );

  const position =
    normalizeRole(
      user.position
    );

  const department =
    normalizeRole(
      user.department
    );

  return (
    isBroadEvidenceReviewer(
      user
    ) &&
    (
      role !== 'HR' ||
      role.includes(
        'MANAGER'
      ) ||
      position.includes(
        'MANAGER'
      ) ||
      position.includes(
        'ADMIN'
      ) ||
      department ===
        'ADMIN'
    )
  );
}

async function hasEvidenceUploaderAccess({
  user,
  uploadedBy,
}) {
  if (
    !user ||
    !uploadedBy
  ) {
    return false;
  }

  if (
    isBroadEvidenceReviewer(
      user
    )
  ) {
    return true;
  }

  const identitySet =
    await buildUserIdentitySet(
      user
    );

  return identityMatches(
    uploadedBy,
    identitySet
  );
}

module.exports = {
  isBroadEvidenceReviewer,

  buildUserIdentitySet,

  identityMatches,

  isTaskAssigneeForLead,

  hasLeadEvidenceAccess,

  hasCallRecordingAccess,

  canManageCallRecordingRemark,

  hasEvidenceUploaderAccess,
};