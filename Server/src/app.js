const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');

const coalVisitorRoutes =
  require('./modules/distributors/coalVisitor.routes');

const onionVisitorRoutes =
  require('./modules/distributors/onionVisitor.routes');

const corsOptions = require('./config/cors');

const {
  rateLimiter
} = require('./middlewares/rateLimit.middleware');

const {
  errorHandler
} = require('./middlewares/error.middleware');

const authRoutes =
  require('./modules/auth/auth.routes');

const adminAuthRoutes =
  require('./modules/admin-auth/adminAuth.routes');

const userRoutes =
  require('./modules/users/user.routes');

const leadRoutes =
  require('./modules/leads/lead.routes');

const softLeadRoutes =
  require('./modules/leads/softLead.routes');

const quotationRoutes =
  require('./modules/quotations/quotation.routes');

const quotationCommercialRoutes =
  require('./modules/quotations/quotationCommercial.routes');

const leadCommercialRoutes =
  require('./modules/leads/leadCommercial.routes');

const salesPolicyRoutes =
  require('./modules/leads/salesPolicy.routes');

const controlledCampaignRoutes =
  require('./modules/marketing/controlledCampaign.routes');

const campaignEvidenceRoutes =
  require('./modules/marketing/campaignEvidence.routes');

const dispatchRoutes =
  require('./modules/dispatch/dispatch.routes');

const paymentRoutes =
  require('./modules/payments/payment.routes');

const productRoutes =
  require('./modules/products/product.routes');

const documentRoutes =
  require('./modules/documents/document.routes');

const reportRoutes =
  require('./modules/reports/report.routes');

const dailyReportRoutes =
  require('./modules/daily-reports/dailyReport.routes');

const auditRoutes =
  require('./modules/security-audit/audit.routes');

const notificationRoutes =
  require('./modules/notifications/notification.routes');

const chatRoutes =
  require('./modules/chat/chat.routes');

const careerRoutes =
  require('./modules/careers/career.routes');

const distributorRoutes =
  require('./modules/distributors/distributor.routes');

const attendanceRoutes =
  require('./modules/attendance/attendance.routes');

const ticketRoutes =
  require('./modules/tickets/ticket.routes');

const leaveRoutes =
  require('./modules/leave/leave.routes');

const salesRoutes =
  require('./modules/sales/sales.routes');

const employeeRoutes =
  require('./modules/employee/employee.routes');

const taskRoutes =
  require('./modules/task/task.routes');

const sharedFileRoutes =
  require('./modules/shared-files/sharedFile.routes');

const payslipRoutes =
  require('./modules/payslip/payslip.routes');

const aiRoutes =
  require('./modules/ai/ai.routes');

const salesTrialRoutes =
  require('./modules/sales-trial/salesTrial.routes');

const itoAdsRoutes =
  require('./modules/itoads/itoads.routes');

const employeeActivityRoutes =
  require('./modules/employee-activity/employeeActivity.routes');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');


/*
 * Master DPR v4.0 — request correlation.
 *
 * Generate the request ID before CORS, rate limiting and route execution so
 * every rejection/error can be correlated without logging sensitive payloads.
 */
app.use(
  (req, res, next) => {
    req.id =
      'req_' +
      crypto
        .randomBytes(6)
        .toString('hex');

    res.setHeader(
      'X-Request-Id',
      req.id
    );

    next();
  }
);


app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);


morgan.token(
  'request-id',
  req => req.id || '-'
);

morgan.token(
  'safe-path',
  req =>
    String(
      req.originalUrl ||
      req.url ||
      ''
    ).split('?')[0]
);

app.use(
  morgan(
    ':method :safe-path :status :response-time ms request_id=:request-id'
  )
);


app.use(
  cors(corsOptions)
);


/*
 * Normalize blocked-origin failures into an explicit 403 instead of allowing
 * the generic error handler to report them as server failures.
 */
app.use(
  (err, req, res, next) => {
    if (
      err &&
      err.message === 'Not allowed by CORS'
    ) {
      err.status = 403;
      err.statusCode = 403;
      err.errorCode =
        'CORS_ORIGIN_FORBIDDEN';
    }

    next(err);
  }
);


app.use(
  express.json({
    limit: '200mb',

    /*
     * Master DPR Phase 4 — Meta Instant Form webhook.
     *
     * Meta POST signatures must be verified against the exact bytes
     * received from Meta before JSON normalization changes the
     * representation.
     */
    verify: (req, res, buffer) => {
      const requestUrl =
        req.originalUrl ||
        req.url ||
        '';

      if (
        requestUrl.includes(
          '/meta-lead-ads/webhook'
        )
      ) {
        req.rawBody =
          Buffer.from(buffer);
      }
    }
  })
);


app.use(
  express.urlencoded({
    limit: '200mb',
    extended: true,
    parameterLimit: 1000
  })
);


app.use(
  (req, res, next) => {
    if (
      req.url &&
      req.url.includes('uploads/')
    ) {
      const idx =
        req.url.indexOf('uploads/');

      const cleanUrl =
        '/' +
        req.url.substring(idx);

      if (
        req.url !== cleanUrl
      ) {
        req.url =
          cleanUrl;
      }
    }

    next();
  }
);


app.use(
  '/uploads',
  express.static(
    path.join(
      __dirname,
      '../uploads'
    )
  )
);


app.use(rateLimiter);


const healthCheck =
  (req, res) => {
    const dbStatus =
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected';

    res
      .status(200)
      .json({
        success: true,
        service:
          'ITO Backend API',
        database:
          dbStatus,
        version:
          '1.0.0',
        timestamp:
          new Date().toISOString()
      });
  };


app.get(
  '/api/health',
  healthCheck
);


app.get(
  '/api/v1/health',
  healthCheck
);


app.get(
  '/',
  (req, res) => {
    res
      .status(200)
      .json({
        success: true,
        message:
          'Welcome to India Trade Overseas Backend API. Access health check at /api/health'
      });
  }
);



const apiRoutes = [
  {
    path: '/auth',
    router: authRoutes
  },

  {
    path: '/admin-auth',
    router: adminAuthRoutes
  },

  {
    path: '/users',
    router: userRoutes
  },

  /*
   * COAL VISITOR FLOW
   *
   * Mounted here so it receives:
   * - CORS
   * - JSON body parsing
   * - URL encoded parsing
   * - global rate limiting
   *
   * It is mounted under both /api and /api/v1 below,
   * matching the architecture of the rest of the backend.
   */
  {
    path: '/coal-visitors',
    router: coalVisitorRoutes
  },

  {
    path: '/onion-visitors',
    router: onionVisitorRoutes
  },

  {
    path: '/leads',
    router: leadCommercialRoutes
  },

  {
    path: '/leads',
    router: leadRoutes
  },

  {
    path: '/ai/leads',
    router: leadRoutes
  },

  {
    path: '/soft-leads',
    router: softLeadRoutes
  },

  {
    path: '/sales-policy',
    router: salesPolicyRoutes
  },

  {
    path: '/marketing/controlled-campaigns',
    router: controlledCampaignRoutes
  },

  {
    path: '/marketing',
    router: controlledCampaignRoutes
  },

  {
    path: '/marketing',
    router: campaignEvidenceRoutes
  },

  {
    path: '/quotations',
    router: quotationCommercialRoutes
  },

  {
    path: '/quotations',
    router: quotationRoutes
  },

  {
    path: '/dispatches',
    router: dispatchRoutes
  },

  {
    path: '/dispatch',
    router: dispatchRoutes
  },

  {
    path: '/payments',
    router: paymentRoutes
  },

  {
    path: '/products',
    router: productRoutes
  },

  {
    path: '/documents',
    router: documentRoutes
  },

  {
    path: '/reports',
    router: reportRoutes
  },

  {
    path: '/dashboard',
    router: notificationRoutes
  },

  {
    path: '/daily-reports',
    router: dailyReportRoutes
  },

  {
    path: '/security',
    router: auditRoutes
  },

  {
    path: '/security-audit',
    router: auditRoutes
  },

  {
    path: '/chat',
    router: chatRoutes
  },

  {
    path: '/careers',
    router: careerRoutes
  },

  {
    path: '/distributors',
    router: distributorRoutes
  },

  {
    path: '/attendance',
    router: attendanceRoutes
  },

  {
    path: '/tickets',
    router: ticketRoutes
  },

  {
    path: '/leaves',
    router: leaveRoutes
  },

  {
    path: '/leave',
    router: leaveRoutes
  },

  {
    path: '/sales',
    router: salesRoutes
  },

  {
    path: '/employee',
    router: employeeRoutes
  },

  {
    path: '/employees',
    router: employeeRoutes
  },

  {
    path: '/tasks',
    router: taskRoutes
  },

  {
    path: '/shared-files',
    router: sharedFileRoutes
  },

  {
    path: '/payslips',
    router: payslipRoutes
  },

  {
    path: '/ai',
    router: aiRoutes
  },

  {
    path: '/sales-trial',
    router: salesTrialRoutes
  },

  {
    path: '/itoads',
    router: itoAdsRoutes
  },

  {
    path: '/employee-activity',
    router: employeeActivityRoutes
  }
];


apiRoutes.forEach(
  route => {
    app.use(
      `/api${route.path}`,
      route.router
    );

    app.use(
      `/api/v1${route.path}`,
      route.router
    );
  }
);


/* ============================================================
   DISTRIBUTOR MARKETPLACE
============================================================ */

const {
  getMarketplace
} =
  require(
    './modules/distributors/distributor.controller'
  );


const {
  authenticateDistributor,
  authenticate
} =
  require(
    './middlewares/auth.middleware'
  );


app.get(
  '/api/marketplace',
  authenticateDistributor,
  getMarketplace
);


app.get(
  '/api/v1/marketplace',
  authenticateDistributor,
  getMarketplace
);


/* ============================================================
   ADMIN FALLBACK ROUTES
============================================================ */

const adminFallbackRouter =
  express.Router();


const rbac =
  require(
    './middlewares/rbac.middleware'
  );


/*
 * Routes with their own explicit access policy must stay
 * before the general adminFallbackRouter.use() guard.
 */
adminFallbackRouter.patch(
  '/leads/:leadId/assign',
  authenticate,
  rbac(
    'ADMIN',
    'MANAGER',
    'HR'
  ),
  require(
    './modules/leads/lead.controller'
  ).assignLead
);


adminFallbackRouter.get(
  '/users',
  authenticate,
  rbac(
    'ADMIN',
    'MANAGER',
    'HR',
    'HR_MANAGER',
    'HR_EXECUTIVE'
  ),
  require(
    './modules/users/user.controller'
  ).listUsers
);


adminFallbackRouter.use(
  authenticate,
  rbac(
    'ADMIN',
    'MANAGER',
    'HR_MANAGER',
    'HR',
    'CEO',
    'FOUNDER',
    'SUPER_ADMIN'
  )
);


adminFallbackRouter.get(
  '/dashboard/summary',
  require(
    './modules/reports/report.controller'
  ).getAdminSummary
);


adminFallbackRouter.get(
  '/dashboard/pipeline',
  require(
    './modules/reports/report.controller'
  ).getPipelineReport
);


adminFallbackRouter.get(
  '/dashboard/employee-performance',
  require(
    './modules/reports/report.controller'
  ).getPerformanceReport
);


adminFallbackRouter.get(
  '/dashboard/security-alerts',
  async (req, res, next) => {
    try {
      const SecurityAlert =
        require(
          './modules/security-audit/securityAlert.model'
        );

      const alerts =
        await SecurityAlert
          .find()
          .populate(
            'actorId',
            'fullName email'
          )
          .sort({
            createdAt: -1
          });

      return require(
        './utils/response'
      ).ok(
        res,
        { alerts },
        'Alerts list',
        200,
        req
      );

    } catch (error) {
      next(error);
    }
  }
);


adminFallbackRouter.patch(
  '/security/alerts/:alertId/resolve',
  require(
    './modules/security-audit/audit.controller'
  ).resolveAlert
);


adminFallbackRouter.get(
  '/dashboard/quotation-queue',
  async (req, res, next) => {
    try {
      const Quotation =
        require(
          './modules/quotations/quotation.model'
        );

      const quotations =
        await Quotation
          .find({
            status: 'PENDING'
          })
          .populate('leadId')
          .sort({
            createdAt: -1
          });

      return require(
        './utils/response'
      ).ok(
        res,
        { quotations },
        'Pending quotations queue',
        200,
        req
      );

    } catch (error) {
      next(error);
    }
  }
);


adminFallbackRouter.patch(
  '/users/:id/activate',
  require(
    './modules/users/user.controller'
  ).activateUser
);


adminFallbackRouter.patch(
  '/users/:id/deactivate',
  require(
    './modules/users/user.controller'
  ).deactivateUser
);


adminFallbackRouter.patch(
  '/users/:id/role',
  require(
    './modules/users/user.controller'
  ).updateUserRole
);


adminFallbackRouter.patch(
  '/users/:id/department',
  require(
    './modules/users/user.controller'
  ).updateUserDepartment
);


adminFallbackRouter.patch(
  '/users/:id/permissions',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/export-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/import-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/product-upload-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/lead-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/document-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/task-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/dispatch-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/payment-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/quotation-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.patch(
  '/users/:id/job-permission',
  require(
    './modules/users/user.controller'
  ).updateUserPermissions
);


adminFallbackRouter.delete(
  '/users/:id',
  require(
    './modules/users/user.controller'
  ).deleteUser
);


adminFallbackRouter.delete(
  '/leads/:leadId',
  rbac('ADMIN'),
  require(
    './modules/leads/lead.controller'
  ).deleteLead
);


adminFallbackRouter.get(
  '/devices',
  async (req, res, next) => {
    try {
      const TrustedDevice =
        require(
          './modules/auth/trustedDevice.model'
        );

      const devices =
        await TrustedDevice
          .find()
          .populate(
            'userId',
            'fullName email employeeId'
          );

      return require(
        './utils/response'
      ).ok(
        res,
        { devices },
        'Devices list retrieved',
        200,
        req
      );

    } catch (error) {
      next(error);
    }
  }
);


adminFallbackRouter.patch(
  '/devices/:deviceId/approve',
  async (req, res, next) => {
    try {
      const TrustedDevice =
        require(
          './modules/auth/trustedDevice.model'
        );

      const device =
        await TrustedDevice
          .findByIdAndUpdate(
            req.params.deviceId,
            {
              isApproved: true,
              approvedBy:
                req.user._id,
              verifiedAt:
                new Date(),
              revokedAt:
                null
            },
            {
              new: true
            }
          );

      if (!device) {
        return require(
          './utils/response'
        ).fail(
          res,
          404,
          'NOT_FOUND',
          'Device not found'
        );
      }

      return require(
        './utils/response'
      ).ok(
        res,
        { device },
        'Device approved successfully',
        200,
        req
      );

    } catch (error) {
      next(error);
    }
  }
);


adminFallbackRouter.patch(
  '/devices/:deviceId/revoke',
  async (req, res, next) => {
    try {
      const TrustedDevice =
        require(
          './modules/auth/trustedDevice.model'
        );

      const device =
        await TrustedDevice
          .findByIdAndUpdate(
            req.params.deviceId,
            {
              isApproved: false,
              revokedAt:
                new Date()
            },
            {
              new: true
            }
          );

      if (!device) {
        return require(
          './utils/response'
        ).fail(
          res,
          404,
          'NOT_FOUND',
          'Device not found'
        );
      }

      return require(
        './utils/response'
      ).ok(
        res,
        { device },
        'Device revoked successfully',
        200,
        req
      );

    } catch (error) {
      next(error);
    }
  }
);


app.use(
  '/api/admin',
  adminFallbackRouter
);


app.use(
  '/api/v1/admin',
  adminFallbackRouter
);


/*
 * Legacy compatibility mount retained from the working main branch.
 */
app.use(
  '/api/v1/dispatch',
  dispatchRoutes
);


app.use(errorHandler);


module.exports = app;