const dns = require('dns');

if (
  typeof dns.setDefaultResultOrder ===
  'function'
) {
  dns.setDefaultResultOrder(
    'ipv4first'
  );
}


const app = require('./src/app');
const env = require('./src/config/env');

const {
  connectDB
} = require('./src/config/database');

const {
  seedRoles
} = require(
  './src/modules/users/roles/permission.service'
);


// ============================================================
// MASTER DPR v4.0 — WEBSITE LEAD AUTOMATION RECOVERY
// ============================================================

const {
  retryPendingWebsiteLeadAutomations
} = require(
  './src/modules/leads/websiteLead.service'
);


const http = require('http');

const socketService = require(
  './src/services/socket.service'
);


const PORT =
  env.PORT || 5000;


// ============================================================
// MASTER DPR v4.0 — RECOVERY WORKER SETTINGS
// ============================================================

// Retry every 5 minutes on a persistent Node process.
//
// This handles:
// - PENDING automation jobs
// - FAILED automation jobs
// - stale PROCESSING jobs recovered by the service
//
// The actual Lead record has already been persisted before
// any of this processing runs.
const WEBSITE_LEAD_RETRY_INTERVAL_MS =
  5 * 60 * 1000;


// Maximum leads handled during one recovery cycle.
const WEBSITE_LEAD_RETRY_BATCH_SIZE =
  50;


let websiteLeadRetryTimer = null;

let websiteLeadRecoveryRunning =
  false;


// ============================================================
// MASTER DPR v4.0 — RUN ONE RECOVERY PASS
// ============================================================

async function runWebsiteLeadRecovery() {
  // Prevent overlapping workers if one cycle takes longer
  // than expected.
  if (websiteLeadRecoveryRunning) {
    console.log(
      '[Website Lead Recovery] Previous cycle still running. Skipping.'
    );

    return;
  }


  websiteLeadRecoveryRunning =
    true;


  try {
    const processed =
      await retryPendingWebsiteLeadAutomations(
        WEBSITE_LEAD_RETRY_BATCH_SIZE
      );


    if (processed > 0) {
      console.log(
        `[Website Lead Recovery] Processed ${processed} recoverable lead automation(s).`
      );
    }
  } catch (error) {
    // Recovery failure must never bring down the API.
    //
    // Leads remain persisted in MongoDB with their
    // automation state and can be retried later.
    console.error(
      '[Website Lead Recovery] Cycle failed:',
      error.message
    );
  } finally {
    websiteLeadRecoveryRunning =
      false;
  }
}


// ============================================================
// MASTER DPR v4.0 — START PERSISTENT RECOVERY WORKER
// ============================================================

function startWebsiteLeadRecoveryWorker() {
  if (websiteLeadRetryTimer) {
    return;
  }


  // Run once shortly after server startup.
  setTimeout(() => {
    runWebsiteLeadRecovery();
  }, 3000);


  // Then continue periodically.
  websiteLeadRetryTimer =
    setInterval(() => {
      runWebsiteLeadRecovery();
    }, WEBSITE_LEAD_RETRY_INTERVAL_MS);


  // Do not keep the Node process alive solely because
  // this retry timer exists.
  websiteLeadRetryTimer.unref?.();
}


// ============================================================
// MASTER DPR v4.0 — STOP RECOVERY WORKER
// ============================================================

function stopWebsiteLeadRecoveryWorker() {
  if (!websiteLeadRetryTimer) {
    return;
  }


  clearInterval(
    websiteLeadRetryTimer
  );


  websiteLeadRetryTimer =
    null;


  console.log(
    '[Website Lead Recovery] Worker stopped.'
  );
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
      const server =
        http.createServer(app);


      socketService.init(
        server
      );


      server.on(
        'error',
        (e) => {
          if (
            e.code ===
            'EADDRINUSE'
          ) {
            console.log(
              `Port ${PORT} is busy, retrying in 1s...`
            );


            setTimeout(() => {
              server.close();

              server.listen(
                PORT
              );
            }, 1000);
          } else {
            console.error(
              'Server error:',
              e
            );
          }
        }
      );


      const listenServer =
        server.listen(
          PORT,
          () => {
            console.log(
              `Server is running on port ${PORT}`
            );


            // Start recovery only after the application
            // and database are ready.
            startWebsiteLeadRecoveryWorker();
          }
        );


      const gracefulShutdown =
        () => {
          console.log(
            'Closing HTTP server...'
          );


          // Stop background recovery before shutting down.
          stopWebsiteLeadRecoveryWorker();


          listenServer.close(
            () => {
              console.log(
                'HTTP server closed.'
              );

              process.exit(0);
            }
          );
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


      // A serverless instance cannot reliably maintain
      // setInterval().
      //
      // Perform one opportunistic recovery pass whenever
      // this server instance initializes.
      runWebsiteLeadRecovery()
        .catch((error) => {
          console.error(
            '[Website Lead Recovery] Vercel startup recovery failed:',
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