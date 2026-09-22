const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Middlewares
const { rateLimiter } = require('./middlewares/rateLimit.middleware');
const { errorHandler } = require('./middlewares/error.middleware');
const { authenticate, authenticateDistributor } = require('./middlewares/auth.middleware');
const rbac = require('./middlewares/rbac.middleware');

// Controllers & Routes
const authRoutes = require('./modules/auth/auth.routes');
const adminAuthRoutes = require('./modules/admin-auth/adminAuth.routes');
const userRoutes = require('./modules/users/user.routes');
const leadRoutes = require('./modules/leads/lead.routes');
const softLeadRoutes = require('./modules/leads/softLead.routes');
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
const distributorRoutes = require('./modules/distributors/distributor.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const ticketRoutes = require('./modules/tickets/ticket.routes');
const leaveRoutes = require('./modules/leave/leave.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const employeeRoutes = require('./modules/employee/employee.routes');
const taskRoutes = require('./modules/task/task.routes');
const sharedFileRoutes = require('./modules/shared-files/sharedFile.routes');
const payslipRoutes = require('./modules/payslip/payslip.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const salesTrialRoutes = require('./modules/sales-trial/salesTrial.routes');
const itoAdsRoutes = require('./modules/itoads/itoads.routes');
const employeeActivityRoutes = require('./modules/employee-activity/employeeActivity.routes');

const { getMarketplace } = require('./modules/distributors/distributor.controller');
const userController = require('./modules/users/user.controller');
const leadController = require('./modules/leads/lead.controller');
const reportController = require('./modules/reports/report.controller');
const auditController = require('./modules/security-audit/audit.controller');
const SecurityAlert = require('./modules/security-audit/securityAlert.model');
const Quotation = require('./modules/quotations/quotation.model');
const TrustedDevice = require('./modules/auth/trustedDevice.model');
const response = require('./utils/response');

const app = express();

app.set('trust proxy', 1);

// Security & Logging
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('dev'));

// Request ID Generation
app.use((req, res, next) => {
  req.id = 'req_' + crypto.randomBytes(6).toString('hex');
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Body Parsers
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Uploads Static File Handling
app.use((req, res, next) => {
  if (req.url && req.url.includes('uploads/')) {
    const idx = req.url.indexOf('uploads/');
    const cleanUrl = '/' + req.url.substring(idx);
    if (req.url !== cleanUrl) {
      req.url = cleanUrl;
    }
  }
  next();
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global Rate Limiter
app.use(rateLimiter);

// Health Checks
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

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to India Trade Overseas Backend API. Access health check at /api/health'
  });
});

// Module Routes Mapping
const apiRoutes = [
  { path: '/auth', router: authRoutes },
  { path: '/admin-auth', router: adminAuthRoutes },
  { path: '/users', router: userRoutes },
  { path: '/leads', router: leadRoutes },
  { path: '/ai/leads', router: leadRoutes },
  { path: '/soft-leads', router: softLeadRoutes },
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
  { path: '/security-audit', router: auditRoutes },
  { path: '/chat', router: chatRoutes },
  { path: '/careers', router: careerRoutes },
  { path: '/distributors', router: distributorRoutes },
  { path: '/attendance', router: attendanceRoutes },
  { path: '/tickets', router: ticketRoutes },
  { path: '/leaves', router: leaveRoutes },
  { path: '/leave', router: leaveRoutes },
  { path: '/sales', router: salesRoutes },
  { path: '/employee', router: employeeRoutes },
  { path: '/employees', router: employeeRoutes },
  { path: '/tasks', router: taskRoutes },
  { path: '/shared-files', router: sharedFileRoutes },
  { path: '/payslips', router: payslipRoutes },
  { path: '/ai', router: aiRoutes },
  { path: '/sales-trial', router: salesTrialRoutes },
  { path: '/itoads', router: itoAdsRoutes },
  { path: '/employee-activity', router: employeeActivityRoutes }
];

apiRoutes.forEach(route => {
  app.use(`/api${route.path}`, route.router);
  app.use(`/api/v1${route.path}`, route.router);
});

// Marketplace
app.get('/api/marketplace', authenticateDistributor, getMarketplace);
app.get('/api/v1/marketplace', authenticateDistributor, getMarketplace);

// Admin Routes Router
const adminRouter = express.Router();

adminRouter.patch('/leads/:leadId/assign', authenticate, rbac('ADMIN', 'MANAGER', 'HR'), leadController.assignLead);
adminRouter.get('/users', authenticate, rbac('ADMIN', 'MANAGER', 'HR', 'HR_MANAGER', 'HR_EXECUTIVE'), userController.listUsers);

// Protected Admin Scope
adminRouter.use(authenticate, rbac('ADMIN', 'MANAGER', 'HR_MANAGER', 'HR', 'CEO', 'FOUNDER', 'SUPER_ADMIN'));

adminRouter.get('/dashboard/summary', reportController.getAdminSummary);
adminRouter.get('/dashboard/pipeline', reportController.getPipelineReport);
adminRouter.get('/dashboard/employee-performance', reportController.getPerformanceReport);

adminRouter.get('/dashboard/security-alerts', async (req, res, next) => {
  try {
    const alerts = await SecurityAlert.find()
      .populate('actorId', 'fullName email')
      .sort({ createdAt: -1 });
    return response.ok(res, { alerts }, 'Alerts list', 200, req);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/security/alerts/:alertId/resolve', auditController.resolveAlert);

adminRouter.get('/dashboard/quotation-queue', async (req, res, next) => {
  try {
    const quotations = await Quotation.find({ status: 'PENDING' })
      .populate('leadId')
      .sort({ createdAt: -1 });
    return response.ok(res, { quotations }, 'Pending quotations queue', 200, req);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/users/:id/activate', userController.activateUser);
adminRouter.patch('/users/:id/deactivate', userController.deactivateUser);
adminRouter.patch('/users/:id/role', userController.updateUserRole);
adminRouter.patch('/users/:id/department', userController.updateUserDepartment);
adminRouter.patch('/users/:id/permissions', userController.updateUserPermissions);
adminRouter.patch('/users/:id/export-permission', userController.updateUserPermissions);
adminRouter.patch('/users/:id/import-permission', userController.updateUserPermissions);
adminRouter.patch('/users/:id/product-upload-permission', userController.updateUserPermissions);
adminRouter.patch('/users/:id/lead-permission', userController.updateUserPermissions);
adminRouter.patch('/users/:id/document-permission', userController.updateUserPermissions);
adminRouter.patch('/users/:id/task-permission', userController.updateUserPermissions);
adminRouter.patch('/users/:id/dispatch-permission', userController.updateUserPermissions);
adminRouter.patch('/users/:id/payment-permission', userController.updateUserPermissions);
adminRouter.patch('/users/:id/quotation-permission', userController.updateUserPermissions);
adminRouter.patch('/users/:id/job-permission', userController.updateUserPermissions);
adminRouter.delete('/users/:id', userController.deleteUser);
adminRouter.delete('/leads/:leadId', rbac('ADMIN'), leadController.deleteLead);

adminRouter.get('/devices', async (req, res, next) => {
  try {
    const devices = await TrustedDevice.find().populate('userId', 'fullName email employeeId');
    return response.ok(res, { devices }, 'Devices list retrieved', 200, req);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/devices/:deviceId/approve', async (req, res, next) => {
  try {
    const device = await TrustedDevice.findByIdAndUpdate(
      req.params.deviceId,
      { isApproved: true, approvedBy: req.user._id, verifiedAt: new Date(), revokedAt: null },
      { new: true }
    );
    if (!device) return response.fail(res, 404, 'NOT_FOUND', 'Device not found');
    return response.ok(res, { device }, 'Device approved successfully', 200, req);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/devices/:deviceId/revoke', async (req, res, next) => {
  try {
    const device = await TrustedDevice.findByIdAndUpdate(
      req.params.deviceId,
      { isApproved: false, revokedAt: new Date() },
      { new: true }
    );
    if (!device) return response.fail(res, 404, 'NOT_FOUND', 'Device not found');
    return response.ok(res, { device }, 'Device revoked successfully', 200, req);
  } catch (error) {
    next(error);
  }
});

app.use('/api/admin', adminRouter);
app.use('/api/v1/admin', adminRouter);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
