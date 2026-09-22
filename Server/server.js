const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const http = require('http');

const app = require('./src/app');
const env = require('./src/config/env');

const {
  connectDB,
} = require('./src/config/database');

const {
  seedRoles,
} = require('./src/modules/users/roles/permission.service');

const {
  retryPendingWebsiteLeadAutomations,
} = require('./src/modules/leads/websiteLead.service');

const {
  processCrmSyncBatch,
  getCrmSyncStatus,
} = require('./src/modules/leads/crmSync.service');

const {
  processLeadNotificationBatch,
} = require('./src/modules/leads/leadNotificationRecovery.service');

const {
  processLeadOwnershipRecoveryBatch,
} = require('./src/modules/leads/leadOwnershipRecovery.service');

const {
  processMetaCapiBatch,
  getMetaCapiStatus,
} = require('./src/modules/analytics/metaCapi.service');

const socketService = require('./src/services/socket.service');

const PORT = env.PORT || 5000;

// ============================================================
// MASTER DPR v4.0 — WORKER SETTINGS
// ============================================================

const WEBSITE_LEAD_RETRY_INTERVAL_MS = 5 * 60 * 1000;
const WEBSITE_LEAD_RETRY_BATCH_SIZE = 50;

const CRM_SYNC_WORKER_INTERVAL_MS = 60 * 1000;
const CRM_SYNC_BATCH_SIZE = 25;

const LEAD_NOTIFICATION_WORKER_INTERVAL_MS = 60 * 1000;
const LEAD_NOTIFICATION_BATCH_SIZE = 25;

const LEAD_OWNERSHIP_RECOVERY_INTERVAL_MS = 60 * 1000;
const LEAD_OWNERSHIP_RECOVERY_BATCH_SIZE = 25;

const META_CAPI_WORKER_INTERVAL_MS = 30 * 1000;
const META_CAPI_BATCH_SIZE = 25;

// ============================================================
// WORKER STATE
// ============================================================

let websiteLeadRetryTimer = null;
let websiteLeadStartupTimer = null;
let websiteLeadRecoveryRunning = false;

let crmSyncWorkerTimer = null;
let crmSyncStartupTimer = null;
let crmSyncWorkerRunning = false;

let leadNotificationWorkerTimer = null;
let leadNotificationStartupTimer = null;
let leadNotificationWorkerRunning = false;

let leadOwnershipRecoveryTimer = null;
let leadOwnershipRecoveryStartupTimer = null;
let leadOwnershipRecoveryRunning = false;

let metaCapiWorkerTimer = null;
let metaCapiStartupTimer = null;
let metaCapiWorkerRunning = false;

// ============================================================
// WEBSITE LEAD AUTOMATION RECOVERY
// ============================================================

async function runWebsiteLeadRecovery() {
  if (websiteLeadRecoveryRunning) {
    console.log(
      '[Website Lead Recovery] Previous cycle still running. Skipping.'
    );
    return;
  }

  websiteLeadRecoveryRunning = true;

  try {
    const processed = await retryPendingWebsiteLeadAutomations(
      WEBSITE_LEAD_RETRY_BATCH_SIZE
    );

    if (processed > 0) {
      console.log(
        `[Website Lead Recovery] Processed ${processed} recoverable lead automation(s).`
      );
    }
  } catch (error) {
    console.error(
      '[Website Lead Recovery] Cycle failed:',
      error.message
    );
  } finally {
    websiteLeadRecoveryRunning = false;
  }
}

function startWebsiteLeadRecoveryWorker() {
  if (websiteLeadRetryTimer || websiteLeadStartupTimer) {
    return;
  }

  websiteLeadStartupTimer = setTimeout(() => {
    websiteLeadStartupTimer = null;
    runWebsiteLeadRecovery();
  }, 3000);

  websiteLeadStartupTimer.unref?.();

  websiteLeadRetryTimer = setInterval(() => {
    runWebsiteLeadRecovery();
  }, WEBSITE_LEAD_RETRY_INTERVAL_MS);

  websiteLeadRetryTimer.unref?.();

console.log('[Website Lead Recovery] Worker enabled.');
}

function stopWebsiteLeadRecoveryWorker() {
  if (websiteLeadStartupTimer) {
    clearTimeout(websiteLeadStartupTimer);
    websiteLeadStartupTimer = null;
  }

  if (websiteLeadRetryTimer) {
    clearInterval(websiteLeadRetryTimer);
    websiteLeadRetryTimer = null;
  }

  console.log('[Website Lead Recovery] Worker stopped.');
}

// ============================================================
// CRM SYNC WORKER
// ============================================================

async function runCrmSyncWorker() {
  if (crmSyncWorkerRunning) {
    console.log(
      '[CRM Sync] Previous worker cycle still running. Skipping.'
    );
    return;
  }

  crmSyncWorkerRunning = true;

  try {
    const result = await processCrmSyncBatch(
      CRM_SYNC_BATCH_SIZE
    );

    if (result?.processed > 0) {
      console.log(
        `[CRM Sync] Processed ${result.processed} lead(s): ${result.synced} synced, ${result.failed} scheduled for retry, ${result.manualRecovery} moved to manual recovery, ${result.superseded || 0} superseded payload(s) requeued.`
      );
    }
  } catch (error) {
    console.error(
      '[CRM Sync] Worker cycle failed:',
      error.message
    );
  } finally {
    crmSyncWorkerRunning = false;
  }
}

function startCrmSyncWorker() {
  if (crmSyncWorkerTimer || crmSyncStartupTimer) {
    return;
  }

  const status = getCrmSyncStatus();

  if (!status.configured) {
    console.warn(
      '[CRM Sync] Worker not started because CRM synchronization is not configured.'
    );
    return;
  }

  crmSyncStartupTimer = setTimeout(() => {
    crmSyncStartupTimer = null;
    runCrmSyncWorker();
  }, 7000);

  crmSyncStartupTimer.unref?.();

  crmSyncWorkerTimer = setInterval(() => {
    runCrmSyncWorker();
  }, CRM_SYNC_WORKER_INTERVAL_MS);

  crmSyncWorkerTimer.unref?.();

  console.log(
    status.mode === 'INTERNAL'
      ? '[CRM Sync] Worker enabled in INTERNAL CRM mode.'
      : '[CRM Sync] Worker enabled in WEBHOOK CRM mode.'
  );
}

function stopCrmSyncWorker() {
  if (crmSyncStartupTimer) {
    clearTimeout(crmSyncStartupTimer);
    crmSyncStartupTimer = null;
  }

  if (crmSyncWorkerTimer) {
    clearInterval(crmSyncWorkerTimer);
    crmSyncWorkerTimer = null;
  }

  console.log('[CRM Sync] Worker stopped.');
}

// ============================================================
// LEAD NOTIFICATION RETRY / RECOVERY WORKER
// ============================================================

async function runLeadNotificationWorker() {
  if (leadNotificationWorkerRunning) {
    console.log(
      '[Lead Notification Recovery] Previous worker cycle still running. Skipping.'
    );
    return;
  }

  leadNotificationWorkerRunning = true;

  try {
    const result = await processLeadNotificationBatch(
      LEAD_NOTIFICATION_BATCH_SIZE
    );

    if (
      result?.processed > 0 ||
      result?.recovered > 0
    ) {
      console.log(
        `[Lead Notification Recovery] ${result.recovered} stale state(s) recovered; ${result.processed} notification job(s) processed: ${result.sent} sent, ${result.failed} scheduled for retry, ${result.manualRecovery} moved to manual recovery.`
      );
    }
  } catch (error) {
    console.error(
      '[Lead Notification Recovery] Worker cycle failed:',
      error.message
    );
  } finally {
    leadNotificationWorkerRunning = false;
  }
}

function startLeadNotificationWorker() {
  if (
    leadNotificationWorkerTimer ||
    leadNotificationStartupTimer
  ) {
    return;
  }

  /*
   * Notification retry is entirely internal to ITO MongoDB, so unlike
   * external integrations it needs no extra deployment credentials.
   */
  leadNotificationStartupTimer = setTimeout(() => {
    leadNotificationStartupTimer = null;
    runLeadNotificationWorker();
  }, 9000);

  leadNotificationStartupTimer.unref?.();

  leadNotificationWorkerTimer = setInterval(() => {
    runLeadNotificationWorker();
  }, LEAD_NOTIFICATION_WORKER_INTERVAL_MS);

  leadNotificationWorkerTimer.unref?.();

  console.log('[Lead Notification Recovery] Worker enabled.');
}

function stopLeadNotificationWorker() {
  if (leadNotificationStartupTimer) {
    clearTimeout(leadNotificationStartupTimer);
    leadNotificationStartupTimer = null;
  }

  if (leadNotificationWorkerTimer) {
    clearInterval(leadNotificationWorkerTimer);
    leadNotificationWorkerTimer = null;
  }

  console.log('[Lead Notification Recovery] Worker stopped.');
}

// ============================================================
// LEAD OWNERSHIP RECOVERY WORKER
// ============================================================

async function runLeadOwnershipRecoveryWorker() {
  if (leadOwnershipRecoveryRunning) {
    console.log(
      '[Lead Ownership Recovery] Previous worker cycle still running. Skipping.'
    );
    return;
  }

  leadOwnershipRecoveryRunning = true;

  try {
    const result = await processLeadOwnershipRecoveryBatch(
      LEAD_OWNERSHIP_RECOVERY_BATCH_SIZE
    );

    if (
      result?.claimed > 0 ||
      result?.failed > 0
    ) {
      console.log(
        `[Lead Ownership Recovery] ${result.candidates} candidate(s), ${result.claimed} claimed: ${result.assigned} owner assignment(s), ${result.adminFallbackAssigned} admin fallback assignment(s), ${result.stillUnowned} still unowned, ${result.crmResyncQueued} CRM re-sync(s), ${result.failed} failed.`
      );
    }
  } catch (error) {
    console.error(
      '[Lead Ownership Recovery] Worker cycle failed:',
      error.message
    );
  } finally {
    leadOwnershipRecoveryRunning = false;
  }
}

function startLeadOwnershipRecoveryWorker() {
  if (
    leadOwnershipRecoveryTimer ||
    leadOwnershipRecoveryStartupTimer
  ) {
    return;
  }

  /*
   * The worker may poll every minute, while the service itself enforces the
   * five-minute technical re-routing cooldown for a Lead that remains unowned.
   * This is not a sales-response SLA.
   */
  leadOwnershipRecoveryStartupTimer = setTimeout(() => {
    leadOwnershipRecoveryStartupTimer = null;
    runLeadOwnershipRecoveryWorker();
  }, 11000);

  leadOwnershipRecoveryStartupTimer.unref?.();

  leadOwnershipRecoveryTimer = setInterval(() => {
    runLeadOwnershipRecoveryWorker();
  }, LEAD_OWNERSHIP_RECOVERY_INTERVAL_MS);

  leadOwnershipRecoveryTimer.unref?.();

  console.log('[Lead Ownership Recovery] Worker enabled.');
}

function stopLeadOwnershipRecoveryWorker() {
  if (leadOwnershipRecoveryStartupTimer) {
    clearTimeout(leadOwnershipRecoveryStartupTimer);
    leadOwnershipRecoveryStartupTimer = null;
  }

  if (leadOwnershipRecoveryTimer) {
    clearInterval(leadOwnershipRecoveryTimer);
    leadOwnershipRecoveryTimer = null;
  }

  console.log('[Lead Ownership Recovery] Worker stopped.');
}

// ============================================================
// META CAPI WORKER
// ============================================================

async function runMetaCapiWorker() {
  if (metaCapiWorkerRunning) {
    console.log(
      '[Meta CAPI] Previous worker cycle still running. Skipping.'
    );
    return;
  }

  metaCapiWorkerRunning = true;

  try {
    const result = await processMetaCapiBatch(
      META_CAPI_BATCH_SIZE
    );

    if (
      result?.status === 'OK' &&
      result.processed > 0
    ) {
      console.log(
        `[Meta CAPI] Processed ${result.processed} event(s): ${result.sent} sent, ${result.failed} failed.`
      );
    }
  } catch (error) {
    console.error(
      '[Meta CAPI] Worker cycle failed:',
      error.message
    );
  } finally {
    metaCapiWorkerRunning = false;
  }
}

function startMetaCapiWorker() {
  if (
    metaCapiWorkerTimer ||
    metaCapiStartupTimer
  ) {
    return;
  }

  const status = getMetaCapiStatus();

  if (!status.enabled) {
    console.log(
      '[Meta CAPI] Worker disabled by configuration.'
    );
    return;
  }

  if (!status.configured) {
    console.warn(
      '[Meta CAPI] Worker not started because configuration is incomplete:',
      status.missing.join(', ')
    );
    return;
  }

  metaCapiStartupTimer = setTimeout(() => {
    metaCapiStartupTimer = null;
    runMetaCapiWorker();
  }, 5000);

  metaCapiStartupTimer.unref?.();

  metaCapiWorkerTimer = setInterval(() => {
    runMetaCapiWorker();
  }, META_CAPI_WORKER_INTERVAL_MS);

  metaCapiWorkerTimer.unref?.();

  console.log(
    status.testMode
      ? '[Meta CAPI] Worker enabled in Meta Test Events mode.'
      : '[Meta CAPI] Worker enabled.'
  );
}

function stopMetaCapiWorker() {
  if (metaCapiStartupTimer) {
    clearTimeout(metaCapiStartupTimer);
    metaCapiStartupTimer = null;
  }

  if (metaCapiWorkerTimer) {
    clearInterval(metaCapiWorkerTimer);
    metaCapiWorkerTimer = null;
  }

  console.log('[Meta CAPI] Worker stopped.');
}

// ============================================================
// SERVER STARTUP
// ============================================================

async function startServer() {
  try {
    await connectDB();
    await seedRoles();

    // ========================================================
    // NORMAL LONG-RUNNING NODE DEPLOYMENT
    // ========================================================

    if (!process.env.VERCEL) {
      const server = http.createServer(app);

      socketService.init(server);

      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.log(
            `Port ${PORT} is busy, retrying in 1s...`
          );

          setTimeout(() => {
            server.close();
            server.listen(PORT);
          }, 1000);
        } else {
          console.error(
            'Server error:',
            error
          );
        }
      });

      const listenServer = server.listen(
        PORT,
        () => {
          console.log(
            `Server is running on port ${PORT}`
          );

          startWebsiteLeadRecoveryWorker();
          startCrmSyncWorker();
          startLeadNotificationWorker();
          startLeadOwnershipRecoveryWorker();
          startMetaCapiWorker();
        }
      );

      let shuttingDown = false;

      const gracefulShutdown = () => {
        if (shuttingDown) {
          return;
        }

        shuttingDown = true;

        console.log(
          'Closing HTTP server...'
        );

        stopWebsiteLeadRecoveryWorker();
        stopCrmSyncWorker();
        stopLeadNotificationWorker();
        stopLeadOwnershipRecoveryWorker();
        stopMetaCapiWorker();

        listenServer.close(() => {
          console.log(
            'HTTP server closed.'
          );

          process.exit(0);
        });
      };

      process.once(
        'SIGINT',
        gracefulShutdown
      );

      process.once(
        'SIGTERM',
        gracefulShutdown
      );
    }

    // ========================================================
    // VERCEL / SERVERLESS DEPLOYMENT
    // ========================================================

    else {
      console.log(
        'Server initialized on Vercel (serverless mode)'
      );

      runWebsiteLeadRecovery().catch((error) => {
        console.error(
          '[Website Lead Recovery] Vercel startup recovery failed:',
          error.message
        );
      });

      runCrmSyncWorker().catch((error) => {
        console.error(
          '[CRM Sync] Vercel startup delivery failed:',
          error.message
        );
      });

      runLeadNotificationWorker().catch((error) => {
        console.error(
          '[Lead Notification Recovery] Vercel startup delivery failed:',
          error.message
        );
      });

      runLeadOwnershipRecoveryWorker().catch((error) => {
        console.error(
          '[Lead Ownership Recovery] Vercel startup recovery failed:',
          error.message
        );
      });

      runMetaCapiWorker().catch((error) => {
        console.error(
          '[Meta CAPI] Vercel startup delivery failed:',
          error.message
        );
      });
    }
  } catch (error) {
    console.error(
      'Server boot failed:',
      error.message
    );

    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

startServer();

module.exports = app;