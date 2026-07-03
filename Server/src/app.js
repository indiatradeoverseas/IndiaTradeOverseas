const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const corsOptions = require('./config/cors');
const { rateLimiter } = require('./middlewares/rateLimit.middleware');
const { errorHandler } = require('./middlewares/error.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const leadRoutes = require('./modules/leads/lead.routes');
const quotationRoutes = require('./modules/quotations/quotation.routes');
const dispatchRoutes = require('./modules/dispatch/dispatch.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const productRoutes = require('./modules/products/product.routes');
const documentRoutes = require('./modules/documents/document.routes');
const reportRoutes = require('./modules/reports/report.routes');
const dailyReportRoutes = require('./modules/daily-reports/dailyReport.routes');
const auditRoutes = require('./modules/security-audit/audit.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const careerRoutes = require('./modules/careers/career.routes');

const app = express();


app.use(helmet());


app.use(morgan('dev'));


app.use(cors());


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


app.use(rateLimiter);


app.use((req, res, next) => {
  const crypto = require('crypto');
  req.id = 'req_' + crypto.randomBytes(6).toString('hex');
  next();
});


const healthCheck = (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    success: true,
    service: 'ITO Backend API',
    database: dbStatus,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
};

app.get('/api/health', healthCheck);
app.get('/api/v1/health', healthCheck);


const apiRoutes = [
  { path: '/auth', router: authRoutes },
  { path: '/users', router: userRoutes },
  { path: '/leads', router: leadRoutes },
  { path: '/ai/leads', router: leadRoutes },
  { path: '/quotations', router: quotationRoutes },
  { path: '/dispatches', router: dispatchRoutes },
  { path: '/dispatch', router: dispatchRoutes },
  { path: '/payments', router: paymentRoutes },
  { path: '/products', router: productRoutes },
  { path: '/documents', router: documentRoutes },
  { path: '/reports', router: reportRoutes },
  { path: '/dashboard', router: notificationRoutes },
  { path: '/daily-reports', router: dailyReportRoutes },
  { path: '/security', router: auditRoutes },
  { path: '/chat', router: chatRoutes },
  { path: '/careers', router: careerRoutes }
];

apiRoutes.forEach(route => {
  app.use(`/api${route.path}`, route.router);
  app.use(`/api/v1${route.path}`, route.router);
});


const adminFallbackRouter = require('express').Router();
const rbac = require('./middlewares/rbac.middleware');
const { authenticate } = require('./middlewares/auth.middleware');

adminFallbackRouter.patch('/leads/:leadId/assign', authenticate, rbac('ADMIN', 'MANAGER', 'HR'), require('./modules/leads/lead.controller').assignLead);
adminFallbackRouter.get('/users', authenticate, rbac('ADMIN', 'MANAGER', 'HR'), require('./modules/users/user.controller').listUsers);

adminFallbackRouter.use(authenticate, rbac('ADMIN', 'MANAGER'));
adminFallbackRouter.get('/dashboard/summary', require('./modules/reports/report.controller').getAdminSummary);
adminFallbackRouter.get('/dashboard/pipeline', require('./modules/reports/report.controller').getPipelineReport);
adminFallbackRouter.get('/dashboard/employee-performance', require('./modules/reports/report.controller').getPerformanceReport);
adminFallbackRouter.get('/dashboard/security-alerts', async (req, res, next) => {
  try {
    const SecurityAlert = require('./modules/security-audit/securityAlert.model');
    const alerts = await SecurityAlert.find().populate('actorId', 'fullName email').sort({ createdAt: -1 });
    return require('./utils/response').ok(res, { alerts }, 'Alerts list', 200, req);
  } catch (error) { next(error); }
});
adminFallbackRouter.patch('/security/alerts/:alertId/resolve', require('./modules/security-audit/audit.controller').resolveAlert);
adminFallbackRouter.get('/dashboard/quotation-queue', async (req, res, next) => {
  try {
    const Quotation = require('./modules/quotations/quotation.model');
    const quotations = await Quotation.find({ status: 'PENDING' }).populate('leadId').sort({ createdAt: -1 });
    return require('./utils/response').ok(res, { quotations }, 'Pending quotations queue', 200, req);
  } catch (error) { next(error); }
});

adminFallbackRouter.patch('/users/:id/activate', require('./modules/users/user.controller').activateUser);
adminFallbackRouter.patch('/users/:id/deactivate', require('./modules/users/user.controller').deactivateUser);
adminFallbackRouter.patch('/users/:id/role', require('./modules/users/user.controller').updateUserRole);
adminFallbackRouter.patch('/users/:id/department', require('./modules/users/user.controller').updateUserDepartment);
adminFallbackRouter.patch('/users/:id/export-permission', require('./modules/users/user.controller').updateUserPermissions);
adminFallbackRouter.patch('/users/:id/product-upload-permission', require('./modules/users/user.controller').updateUserPermissions);
adminFallbackRouter.patch('/users/:id/lead-permission', require('./modules/users/user.controller').updateUserPermissions);
adminFallbackRouter.patch('/users/:id/document-permission', require('./modules/users/user.controller').updateUserPermissions);
adminFallbackRouter.patch('/users/:id/task-permission', require('./modules/users/user.controller').updateUserPermissions);
adminFallbackRouter.patch('/users/:id/dispatch-permission', require('./modules/users/user.controller').updateUserPermissions);
adminFallbackRouter.patch('/users/:id/payment-permission', require('./modules/users/user.controller').updateUserPermissions);
adminFallbackRouter.patch('/users/:id/quotation-permission', require('./modules/users/user.controller').updateUserPermissions);
adminFallbackRouter.patch('/users/:id/job-permission', require('./modules/users/user.controller').updateUserPermissions);
adminFallbackRouter.delete('/users/:id', require('./modules/users/user.controller').deleteUser);
adminFallbackRouter.delete('/leads/:leadId', rbac('ADMIN'), require('./modules/leads/lead.controller').deleteLead);
adminFallbackRouter.get('/devices', async (req, res, next) => {
  try {
    const TrustedDevice = require('./modules/auth/trustedDevice.model');
    const devices = await TrustedDevice.find().populate('userId', 'fullName email employeeId');
    return require('./utils/response').ok(res, { devices }, 'Devices list retrieved', 200, req);
  } catch (error) { next(error); }
});
adminFallbackRouter.patch('/devices/:deviceId/approve', async (req, res, next) => {
  try {
    const TrustedDevice = require('./modules/auth/trustedDevice.model');
    const device = await TrustedDevice.findByIdAndUpdate(
      req.params.deviceId,
      { isApproved: true, approvedBy: req.user._id, verifiedAt: new Date(), revokedAt: null },
      { new: true }
    );
    if (!device) return require('./utils/response').fail(res, 404, 'NOT_FOUND', 'Device not found');
    return require('./utils/response').ok(res, { device }, 'Device approved successfully', 200, req);
  } catch (error) { next(error); }
});
adminFallbackRouter.patch('/devices/:deviceId/revoke', async (req, res, next) => {
  try {
    const TrustedDevice = require('./modules/auth/trustedDevice.model');
    const device = await TrustedDevice.findByIdAndUpdate(
      req.params.deviceId,
      { isApproved: false, revokedAt: new Date() },
      { new: true }
    );
    if (!device) return require('./utils/response').fail(res, 404, 'NOT_FOUND', 'Device not found');
    return require('./utils/response').ok(res, { device }, 'Device revoked successfully', 200, req);
  } catch (error) { next(error); }
});

app.use('/api/admin', adminFallbackRouter);
app.use('/api/v1/admin', adminFallbackRouter);


app.use(errorHandler);

module.exports = app;
