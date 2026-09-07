const express = require('express');
const router = express.Router();
const dispatchController = require('./dispatch.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// Apply authentication middleware globally to all dispatch endpoints
router.use(authenticate);

// Comprehensive Role List for Dispatch Operations
const DISPATCH_READ_WRITE_ROLES = [
  'ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'DRIVER', 'TRANSPORT', 
  'LOGISTICS', 'EMPLOYEE', 'TRANSPORT_EXECUTIVE', 'SALES', 'CRM', 'IT', 'FINANCE',
  'Admin', 'LogisticsManager', 'SalesManager', 'HRManager', 'Driver', 'HR', 
  'Employee', 'TransportExecutive', 'SalesExecutive'
];

// ─── DRIVER WORK UPDATE LOG PERSISTENCE ────────────────────────────────────
// These routes MUST be before /:id routes to prevent 'work-updates' being treated as an :id

router.get(
  '/work-updates',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.getWorkUpdates
);

router.post(
  '/work-updates',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.createWorkUpdate
);

// ─── READ OPERATIONS ───────────────────────────────────────────────────

// Fetch transport dashboard summary metrics (Admin / Managers / Procurement)
router.get(
  '/dashboard-summary', 
  authorize(DISPATCH_READ_WRITE_ROLES), 
  dispatchController.getAdminSummary
);

// Fetch all dispatch records
router.get(
  '/', 
  authorize(DISPATCH_READ_WRITE_ROLES), 
  dispatchController.getAllDispatches
);

// Fetch single dispatch record by ID
router.get(
  '/:id', 
  authorize(DISPATCH_READ_WRITE_ROLES), 
  dispatchController.getDispatchById
);

// ─── WRITE / WRITE-STATUS OPERATIONS ─────────────────────────────────

// Create a new DPR-compliant dispatch record
router.post(
  '/', 
  authorize(DISPATCH_READ_WRITE_ROLES), 
  dispatchController.createDispatch
);

// Update dispatch fields (e.g., DPR compliance fields, driver assignment, freight details)
router.patch(
  '/:id', 
  authorize(DISPATCH_READ_WRITE_ROLES), 
  dispatchController.updateDispatch
);

// Update status (e.g., Pending -> Truck Assigned -> In Transit -> Delivered)
router.patch(
  '/:id/status', 
  authorize(DISPATCH_READ_WRITE_ROLES), 
  dispatchController.updateStatus
);

// Attach / Update Proof of Delivery (POD)
router.post(
  '/:id/proof', 
  authorize(DISPATCH_READ_WRITE_ROLES), 
  dispatchController.uploadPOD
);

router.patch(
  '/:id/pod', 
  authorize(DISPATCH_READ_WRITE_ROLES), 
  dispatchController.uploadPOD
);

// Complete trip and release Truck/Driver resources
router.patch(
  '/:id/complete', 
  authorize(DISPATCH_READ_WRITE_ROLES), 
  dispatchController.completeTrip
);

// Emergency Breakdown SOS System
router.post(
  '/emergency/sos',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.sendEmergencySOS
);

// Acknowledge Emergency Breakdown SOS (Manager/Admin)
router.post(
  '/emergency/acknowledge',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.acknowledgeEmergencySOS
);
router.post(
  '/emergency/:sosId/acknowledge',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.acknowledgeEmergencySOS
);

// Log Trip Expense
router.post(
  '/:id/expense',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.logExpense
);

// ─── PHASE 4.1 ENHANCEMENT ROUTES ──────────────────────────────────────────

// Feature 1: Real-Time Payment Proof Upload (UPI/QR)
router.post(
  '/:id/payment-proof',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.submitPaymentProof
);

// Feature 1: Verify Payment Proof (Finance/Manager)
router.post(
  '/:id/verify-payment',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.verifyPaymentProof
);

// Feature 2: Odometer Start Reading
router.post(
  '/:id/odometer/start',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.recordStartOdometer
);

// Feature 2: Odometer End Reading
router.post(
  '/:id/odometer/end',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.recordEndOdometer
);

// Feature 2: Fuel Log Entry
router.post(
  '/:id/fuel-log',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.addFuelLog
);

// Feature 3: Departure Verification Photos (At Loading)
router.post(
  '/:id/departure-images',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.submitDepartureImages
);

// Feature 3: Delivery Verification Photos (At Unloading)
router.post(
  '/:id/delivery-images',
  authorize(DISPATCH_READ_WRITE_ROLES),
  dispatchController.submitDeliveryImages
);

module.exports = router;