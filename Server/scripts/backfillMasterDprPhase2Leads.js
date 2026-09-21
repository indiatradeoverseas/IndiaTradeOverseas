const dns = require('dns');
const crypto = require('crypto');
const mongoose = require('mongoose');

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Older Node versions may not expose setDefaultResultOrder.
}

const env = require('../src/config/env');
const Lead = require('../src/modules/leads/lead.model');
const Contact = require('../src/modules/leads/contact.model');
const CallRecording = require('../src/modules/leads/callRecording.model');

const {
  CRM_STATUS,
  CRM_STATUSES,
  crmStatusFromStage,
} = require('../src/modules/leads/lead.constants');

/**
 * India Trade Overseas — Master DPR v4.0
 * Phase 2.23: Safe legacy Lead / Contact / CallRecording backfill
 *
 * Goals:
 * - preserve historical Lead opportunities;
 * - backfill canonical crmStatus from the existing operational stage;
 * - normalize legacy COLD priority -> LOW;
 * - link legacy Leads to Contact records only when identity is deterministic;
 * - mark conflicting strong identity signals AMBIGUOUS instead of auto-merging;
 * - initialize Phase-2 queue state without replaying historical automations;
 * - normalize historical CallRecording priority COLD -> LOW;
 * - rebuild Contact opportunity summary from actual linked Lead records;
 * - never print raw phone/email/GST values.
 *
 * Usage from Server/:
 *   node scripts/backfillMasterDprPhase2Leads.js
 *   node scripts/backfillMasterDprPhase2Leads.js --apply
 *
 * Optional:
 *   --limit=500
 *
 * Dry-run is the default. No writes occur unless --apply is supplied.
 */

const APPLY = process.argv.includes('--apply');
const SCRIPT_VERSION = 'MASTER_DPR_V4_PHASE_2_BACKFILL_V1';

function cleanText(value, maxLength = 500) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function parseLimit() {
  const arg = process.argv.find((value) =>
    value.startsWith('--limit=')
  );

  if (!arg) {
    return 0;
  }

  const parsed = Number(arg.split('=')[1]);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('--limit must be a positive integer.');
  }

  return Math.floor(parsed);
}

function normalizeSource(value) {
  const source = cleanText(value, 40).toUpperCase();

  return [
    'WEBSITE',
    'AI_AGENT',
    'WHATSAPP',
    'INDIAMART',
    'MANUAL',
    'IMPORT',
  ].includes(source)
    ? source
    : 'SYSTEM';
}

function isVerifiedEmailLead(rawLead) {
  return (
    rawLead?.emailVerified === true ||
    rawLead?.verifiedEmail === true ||
    rawLead?.originalPayload?.emailVerified === true ||
    rawLead?.originalPayload?.verifiedEmail === true ||
    rawLead?.originalPayload?.email_verified === true
  );
}

function isVerifiedPhoneLead(rawLead) {
  return (
    rawLead?.phoneVerified === true ||
    rawLead?.verifiedPhone === true ||
    rawLead?.originalPayload?.phoneVerified === true ||
    rawLead?.originalPayload?.verifiedPhone === true ||
    rawLead?.originalPayload?.phone_verified === true
  );
}

function isVerifiedGstLead(rawLead) {
  return (
    rawLead?.gstVerified === true ||
    rawLead?.originalPayload?.gstVerified === true ||
    rawLead?.originalPayload?.businessVerified === true
  );
}

function contactMethod({ phoneHash, verifiedEmailHash }) {
  if (phoneHash && verifiedEmailHash) {
    return 'PHONE_AND_EMAIL';
  }

  if (phoneHash) {
    return 'PHONE';
  }

  if (verifiedEmailHash) {
    return 'EMAIL';
  }

  return 'NONE';
}

function createContactCode() {
  return `CT-MIG-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function needsCanonicalCrmBackfill(rawLead) {
  const rawStatus = cleanText(rawLead?.crmStatus, 80).toUpperCase();

  if (!CRM_STATUSES.includes(rawStatus)) {
    return true;
  }

  /*
   * Old records created before canonical crmStatus existed have no
   * crmStatusChangedAt in MongoDB. If their operational stage already shows
   * progress, NEW is merely the new schema default and must not erase history.
   */
  if (!rawLead?.crmStatusChangedAt) {
    const mapped = crmStatusFromStage(rawLead?.stage);

    if (mapped !== rawStatus) {
      return true;
    }
  }

  return false;
}

function shouldInitializeAutomation(rawLead) {
  return !Object.prototype.hasOwnProperty.call(
    rawLead || {},
    'automationStatus'
  );
}

function shouldInitializeCrmSync(rawLead) {
  return (
    !rawLead?.crmSync ||
    !cleanText(rawLead.crmSync.status, 80)
  );
}

function shouldInitializeSalesAlert(rawLead) {
  return (
    !rawLead?.notificationDelivery ||
    !rawLead.notificationDelivery.salesAlert ||
    !cleanText(
      rawLead.notificationDelivery.salesAlert.status,
      80
    )
  );
}

function shouldInitializeItAlert(rawLead) {
  return (
    !rawLead?.notificationDelivery ||
    !rawLead.notificationDelivery.itAlert ||
    !cleanText(
      rawLead.notificationDelivery.itAlert.status,
      80
    )
  );
}

async function findIdentityContacts({ phoneHash, verifiedEmailHash }) {
  const [phoneContact, emailContact] = await Promise.all([
    phoneHash
      ? Contact.findOne({
          status: 'ACTIVE',
          phoneHash,
        }).lean()
      : null,

    verifiedEmailHash
      ? Contact.findOne({
          status: 'ACTIVE',
          emailVerified: true,
          emailHash: verifiedEmailHash,
        }).lean()
      : null,
  ]);

  return {
    phoneContact,
    emailContact,
  };
}

function contactsConflict(first, second) {
  return Boolean(
    first &&
    second &&
    String(first._id) !== String(second._id)
  );
}

async function createContactFromProtectedLead(rawLead) {
  const phoneHash = cleanText(rawLead?.phoneHash, 128);

  const emailVerified = isVerifiedEmailLead(rawLead);

  const verifiedEmailHash = emailVerified
    ? cleanText(rawLead?.emailHash, 128)
    : '';

  if (!phoneHash && !verifiedEmailHash) {
    return null;
  }

  const now = new Date();

  const seenAt =
    rawLead?.createdAt || now;

  const source =
    normalizeSource(rawLead?.source);

  const contactDoc = {
    contactCode:
      createContactCode(),

    status:
      'ACTIVE',

    name:
      cleanText(
        rawLead?.customerName,
        150
      ),

    companyName:
      cleanText(
        rawLead?.companyName,
        200
      ),

    companyNameHash:
      cleanText(
        rawLead?.companyNameHash,
        128
      ),

    country:
      cleanText(
        rawLead?.country,
        100
      ),

    phoneEncrypted:
      phoneHash
        ? cleanText(
            rawLead?.phoneEncrypted,
            10000
          )
        : '',

    phoneMasked:
      phoneHash
        ? cleanText(
            rawLead?.phoneMasked,
            80
          )
        : '',

    phoneHash,

    phoneVerified:
      phoneHash
        ? isVerifiedPhoneLead(rawLead)
        : false,

    phoneVerifiedAt:
      phoneHash &&
      isVerifiedPhoneLead(rawLead)
        ? seenAt
        : null,

    emailEncrypted:
      cleanText(
        rawLead?.emailEncrypted,
        10000
      ),

    emailMasked:
      cleanText(
        rawLead?.emailMasked,
        320
      ),

    emailHash:
      cleanText(
        rawLead?.emailHash,
        128
      ),

    emailVerified,

    emailVerifiedAt:
      emailVerified
        ? seenAt
        : null,

    gstEncrypted:
      cleanText(
        rawLead?.gstEncrypted,
        10000
      ),

    gstMasked:
      cleanText(
        rawLead?.gstMasked,
        80
      ),

    gstHash:
      cleanText(
        rawLead?.gstHash,
        128
      ),

    gstVerified:
      isVerifiedGstLead(rawLead),

    gstVerifiedAt:
      isVerifiedGstLead(rawLead)
        ? seenAt
        : null,

    firstSource:
      source,

    lastSource:
      source,

    firstSeenAt:
      seenAt,

    lastSeenAt:
      seenAt,

    /*
     * Opportunity summary is rebuilt after all Lead links are written.
     * Starting at zero keeps the script idempotent.
     */
    firstOpportunityAt:
      null,

    lastOpportunityAt:
      null,

    opportunityCount:
      0,

    consent: {
      contactAllowed:
        rawLead?.consent?.contactAllowed === true,

      marketingAllowed:
        rawLead?.consent?.marketingAllowed === true,

      privacyVersion:
        cleanText(
          rawLead?.consent?.privacyVersion,
          80
        ),

      updatedAt:
        rawLead?.consent
          ? seenAt
          : null,
    },

    createdBy:
      null,

    updatedBy:
      null,
  };

  try {
    return await Contact.create(
      contactDoc
    );

  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    /*
     * Another row may have created the same Contact earlier in this run.
     * Resolve again instead of failing the migration.
     */
    const resolved =
      await findIdentityContacts({
        phoneHash,
        verifiedEmailHash,
      });

    if (
      contactsConflict(
        resolved.phoneContact,
        resolved.emailContact
      )
    ) {
      return null;
    }

    return (
      resolved.phoneContact ||
      resolved.emailContact ||
      null
    );
  }
}

async function planContactResolution(
  rawLead,
  apply
) {
  if (rawLead?.contactId) {
    const existing =
      await Contact.findById(
        rawLead.contactId
      )
        .select(
          '_id status'
        )
        .lean();

    if (existing) {
      return {
        kind:
          'ALREADY_LINKED',

        contactId:
          existing._id,

        status:
          rawLead
            ?.contactResolution
            ?.status ||
          'MATCHED',

        method:
          rawLead
            ?.contactResolution
            ?.method ||
          'NONE',

        conflictContactIds:
          [],
      };
    }
  }

  const phoneHash =
    cleanText(
      rawLead?.phoneHash,
      128
    );

  const verifiedEmailHash =
    isVerifiedEmailLead(
      rawLead
    )
      ? cleanText(
          rawLead?.emailHash,
          128
        )
      : '';

  const method =
    contactMethod({
      phoneHash,
      verifiedEmailHash,
    });

  if (
    method ===
    'NONE'
  ) {
    return {
      kind:
        'UNRESOLVED',

      contactId:
        null,

      status:
        'UNRESOLVED',

      method:
        'NONE',

      conflictContactIds:
        [],
    };
  }

  const {
    phoneContact,
    emailContact,
  } =
    await findIdentityContacts({
      phoneHash,
      verifiedEmailHash,
    });

  if (
    contactsConflict(
      phoneContact,
      emailContact
    )
  ) {
    return {
      kind:
        'AMBIGUOUS',

      contactId:
        null,

      status:
        'AMBIGUOUS',

      method,

      conflictContactIds: [
        phoneContact?._id,
        emailContact?._id,
      ]
        .filter(Boolean)
        .map(String),
    };
  }

  const matched =
    phoneContact ||
    emailContact;

  if (matched) {
    return {
      kind:
        'MATCHED',

      contactId:
        matched._id,

      status:
        'MATCHED',

      method,

      conflictContactIds:
        [],
    };
  }

  if (!apply) {
    return {
      kind:
        'WOULD_CREATE',

      contactId:
        null,

      status:
        'CREATED',

      method,

      conflictContactIds:
        [],
    };
  }

  const created =
    await createContactFromProtectedLead(
      rawLead
    );

  if (!created) {
    const resolvedAfterCreate =
      await findIdentityContacts({
        phoneHash,
        verifiedEmailHash,
      });

    if (
      contactsConflict(
        resolvedAfterCreate.phoneContact,
        resolvedAfterCreate.emailContact
      )
    ) {
      return {
        kind:
          'AMBIGUOUS',

        contactId:
          null,

        status:
          'AMBIGUOUS',

        method,

        conflictContactIds: [
          resolvedAfterCreate
            .phoneContact
            ?._id,

          resolvedAfterCreate
            .emailContact
            ?._id,
        ]
          .filter(Boolean)
          .map(String),
      };
    }

    const matchedAfterCreate =
      resolvedAfterCreate.phoneContact ||
      resolvedAfterCreate.emailContact;

    if (
      matchedAfterCreate
    ) {
      return {
        kind:
          'MATCHED',

        contactId:
          matchedAfterCreate._id,

        status:
          'MATCHED',

        method,

        conflictContactIds:
          [],
      };
    }

    return {
      kind:
        'UNRESOLVED',

      contactId:
        null,

      status:
        'UNRESOLVED',

      method,

      conflictContactIds:
        [],
    };
  }

  return {
    kind:
      'CREATED',

    contactId:
      created._id,

    status:
      'CREATED',

    method,

    conflictContactIds:
      [],
  };
}

function buildLeadUpdate(
  rawLead,
  contactPlan,
  now
) {
  const set = {};

  if (
    needsCanonicalCrmBackfill(
      rawLead
    )
  ) {
    set.crmStatus =
      crmStatusFromStage(
        rawLead?.stage
      );

    set.crmStatusChangedAt =
      now;

    set.crmStatusChangedBy =
      null;
  }

  if (
    cleanText(
      rawLead?.priority,
      40
    ).toUpperCase() ===
    'COLD'
  ) {
    set.priority =
      'LOW';
  }

  if (
    !rawLead?.contactId &&
    contactPlan?.contactId
  ) {
    set.contactId =
      contactPlan.contactId;
  }

  if (
    !rawLead?.contactResolution ||
    rawLead?.contactResolution
      ?.status ===
      'UNRESOLVED' ||
    contactPlan?.kind ===
      'AMBIGUOUS'
  ) {
    set[
      'contactResolution.status'
    ] =
      contactPlan.status;

    set[
      'contactResolution.method'
    ] =
      contactPlan.method;

    set[
      'contactResolution.resolvedAt'
    ] =
      contactPlan.contactId
        ? now
        : null;
  }

  if (
    contactPlan?.kind ===
    'AMBIGUOUS'
  ) {
    set[
      'originalPayload.contactResolutionReason'
    ] =
      'LEGACY_IDENTITY_CONFLICT_REQUIRES_MANUAL_REVIEW';

    set[
      'originalPayload.contactConflictIds'
    ] =
      contactPlan
        .conflictContactIds;
  }

  if (
    shouldInitializeAutomation(
      rawLead
    )
  ) {
    /*
     * Historical Leads must not replay website side effects just because the
     * new worker fields did not exist when they were originally created.
     */
    set.automationStatus =
      'COMPLETED';

    set.automationAttempts =
      0;

    set.automationLastError =
      '';

    set.automationLastAttemptAt =
      null;
  }

  if (
    shouldInitializeCrmSync(
      rawLead
    )
  ) {
    /*
     * Existing records are already present in ITO's internal CRM database.
     * NOT_REQUIRED avoids bulk replay to a future external webhook. Any later
     * CRM-visible edit will move NOT_REQUIRED -> PENDING through queueCrmResync.
     */
    set[
      'crmSync.status'
    ] =
      'NOT_REQUIRED';

    set[
      'crmSync.attempts'
    ] =
      0;

    set[
      'crmSync.nextAttemptAt'
    ] =
      null;

    set[
      'crmSync.lastAttemptAt'
    ] =
      null;

    set[
      'crmSync.syncedAt'
    ] =
      null;

    set[
      'crmSync.lastError'
    ] =
      '';

    set[
      'crmSync.manualRecoveryRequired'
    ] =
      false;

    set[
      'crmSync.manualRecoveryReason'
    ] =
      '';
  }

  if (
    shouldInitializeSalesAlert(
      rawLead
    )
  ) {
    set[
      'notificationDelivery.salesAlert.status'
    ] =
      'NOT_REQUIRED';

    set[
      'notificationDelivery.salesAlert.attempts'
    ] =
      0;

    set[
      'notificationDelivery.salesAlert.nextAttemptAt'
    ] =
      null;

    set[
      'notificationDelivery.salesAlert.lastAttemptAt'
    ] =
      null;

    set[
      'notificationDelivery.salesAlert.sentAt'
    ] =
      null;

    set[
      'notificationDelivery.salesAlert.lastError'
    ] =
      '';
  }

  if (
    shouldInitializeItAlert(
      rawLead
    )
  ) {
    set[
      'notificationDelivery.itAlert.status'
    ] =
      'NOT_REQUIRED';

    set[
      'notificationDelivery.itAlert.attempts'
    ] =
      0;

    set[
      'notificationDelivery.itAlert.nextAttemptAt'
    ] =
      null;

    set[
      'notificationDelivery.itAlert.lastAttemptAt'
    ] =
      null;

    set[
      'notificationDelivery.itAlert.sentAt'
    ] =
      null;

    set[
      'notificationDelivery.itAlert.lastError'
    ] =
      '';
  }

  if (
    !rawLead?.assignmentSource
  ) {
    set.assignmentSource =
      rawLead?.assignedTo
        ? 'SYSTEM_RECOVERY'
        : 'UNASSIGNED';
  }

  set[
    'originalPayload.masterDprPhase2MigrationVersion'
  ] =
    SCRIPT_VERSION;

  set[
    'originalPayload.masterDprPhase2BackfilledAt'
  ] =
    now;

  return set;
}

async function rebuildContactOpportunitySummaries() {
  const grouped =
    await Lead.collection
      .aggregate([
        {
          $match: {
            contactId: {
              $ne:
                null,
            },
          },
        },

        {
          $group: {
            _id:
              '$contactId',

            opportunityCount: {
              $sum:
                1,
            },

            firstOpportunityAt: {
              $min:
                '$createdAt',
            },

            lastOpportunityAt: {
              $max:
                '$createdAt',
            },
          },
        },
      ])
      .toArray();

  if (
    !grouped.length
  ) {
    return 0;
  }

  const operations =
    grouped.map(
      (row) => ({
        updateOne: {
          filter: {
            _id:
              row._id,
          },

          update: {
            $set: {
              opportunityCount:
                row.opportunityCount,

              firstOpportunityAt:
                row.firstOpportunityAt ||
                null,

              lastOpportunityAt:
                row.lastOpportunityAt ||
                null,

              lastSeenAt:
                row.lastOpportunityAt ||
                new Date(),
            },
          },
        },
      })
    );

  const result =
    await Contact.bulkWrite(
      operations,
      {
        ordered:
          false,
      }
    );

  return (
    result.modifiedCount ||
    0
  );
}

async function main() {
  if (
    !env.MONGO_URI
  ) {
    throw new Error(
      'MONGO_URI is not configured.'
    );
  }

  const limit =
    parseLimit();

  await mongoose.connect(
    env.MONGO_URI
  );

  console.log(
    `[Phase 2.23] Connected. Mode: ${
      APPLY
        ? 'APPLY'
        : 'DRY RUN'
    }${
      limit
        ? `, limit=${limit}`
        : ''
    }`
  );

  const rawCursor =
    Lead.collection
      .find({})
      .sort({
        createdAt:
          1,

        _id:
          1,
      });

  if (limit) {
    rawCursor.limit(
      limit
    );
  }

  const stats = {
    scanned:
      0,

    leadsWouldChange:
      0,

    leadsChanged:
      0,

    crmStatusBackfill:
      0,

    leadPriorityColdToLow:
      0,

    contactsAlreadyLinked:
      0,

    contactsMatched:
      0,

    contactsWouldCreate:
      0,

    contactsCreated:
      0,

    contactsAmbiguous:
      0,

    contactsUnresolved:
      0,

    queueDefaultsInitialized:
      0,

    callRecordingsColdToLow:
      0,

    contactSummariesRebuilt:
      0,
  };

  for await (
    const rawLead
    of rawCursor
  ) {
    stats.scanned +=
      1;

    const contactPlan =
      await planContactResolution(
        rawLead,
        APPLY
      );

    if (
      contactPlan.kind ===
      'ALREADY_LINKED'
    ) {
      stats.contactsAlreadyLinked +=
        1;

    } else if (
      contactPlan.kind ===
      'MATCHED'
    ) {
      stats.contactsMatched +=
        1;

    } else if (
      contactPlan.kind ===
      'WOULD_CREATE'
    ) {
      stats.contactsWouldCreate +=
        1;

    } else if (
      contactPlan.kind ===
      'CREATED'
    ) {
      stats.contactsCreated +=
        1;

    } else if (
      contactPlan.kind ===
      'AMBIGUOUS'
    ) {
      stats.contactsAmbiguous +=
        1;

    } else {
      stats.contactsUnresolved +=
        1;
    }

    if (
      needsCanonicalCrmBackfill(
        rawLead
      )
    ) {
      stats.crmStatusBackfill +=
        1;
    }

    if (
      cleanText(
        rawLead?.priority,
        40
      ).toUpperCase() ===
      'COLD'
    ) {
      stats.leadPriorityColdToLow +=
        1;
    }

    if (
      shouldInitializeAutomation(
        rawLead
      ) ||
      shouldInitializeCrmSync(
        rawLead
      ) ||
      shouldInitializeSalesAlert(
        rawLead
      ) ||
      shouldInitializeItAlert(
        rawLead
      )
    ) {
      stats.queueDefaultsInitialized +=
        1;
    }

    const now =
      new Date();

    const set =
      buildLeadUpdate(
        rawLead,
        contactPlan,
        now
      );

    const hasMeaningfulUpdate =
      Object.keys(
        set
      ).some(
        (key) =>
          ![
            'originalPayload.masterDprPhase2MigrationVersion',
            'originalPayload.masterDprPhase2BackfilledAt',
          ].includes(
            key
          )
      );

    if (
      hasMeaningfulUpdate
    ) {
      stats.leadsWouldChange +=
        1;
    }

    if (APPLY) {
      const result =
        await Lead.collection.updateOne(
          {
            _id:
              rawLead._id,
          },

          {
            $set:
              set,
          }
        );

      if (
        result.modifiedCount >
        0
      ) {
        stats.leadsChanged +=
          1;
      }
    }

    if (
      stats.scanned %
        250 ===
      0
    ) {
      console.log(
        `[Phase 2.23] Processed ${stats.scanned} Lead(s)...`
      );
    }
  }

  const coldRecordingCount =
    await CallRecording.collection.countDocuments({
      leadPriority:
        'COLD',
    });

  stats.callRecordingsColdToLow =
    coldRecordingCount;

  if (
    APPLY &&
    coldRecordingCount >
      0
  ) {
    await CallRecording.collection.updateMany(
      {
        leadPriority:
          'COLD',
      },

      {
        $set: {
          leadPriority:
            'LOW',
        },
      }
    );
  }

  if (APPLY) {
    stats.contactSummariesRebuilt =
      await rebuildContactOpportunitySummaries();
  }

  console.log(
    '\n[Phase 2.23] Summary'
  );

  console.table(
    stats
  );

  if (!APPLY) {
    console.log(
      '\nDry run only. No database writes were performed. Run again with --apply during the migration/verification window after reviewing this summary.'
    );

  } else {
    console.log(
      '\nPhase 2.23 backfill completed. Historical automations/notifications were not replayed.'
    );
  }

  await mongoose.disconnect();
}

main().catch(
  async (error) => {
    console.error(
      '[Phase 2.23] Migration failed:',
      error?.message ||
      error
    );

    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect failure during fatal exit.
    }

    process.exit(1);
  }
);