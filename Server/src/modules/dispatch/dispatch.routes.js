const express = require('express');
const router = express.Router();
const dispatchController = require('./dispatch.controller');
// ✅ FIXED: Imported both authenticate and authorize from auth.middleware
const { authenticate, authorize } = require('../../middlewares/auth.middleware');

// Apply authentication middleware globally to all dispatch endpoints
router.use(authenticate);

// ─── READ OPERATIONS ───────────────────────────────────────────────────

// Fetch transport dashboard summary metrics (Admin / Managers / Procurement)
router.get(
  '/dashboard-summary', 
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'DRIVER', 'TRANSPORT', 'LOGISTICS', 'Admin', 'SalesManager', 'HRManager', 'LogisticsManager', 'Driver']), 
  dispatchController.getAdminSummary
);

// Fetch all dispatch records
router.get(
  '/', 
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'DRIVER', 'TRANSPORT', 'LOGISTICS', 'EMPLOYEE', 'Admin', 'LogisticsManager', 'SalesManager', 'Driver']), 
  dispatchController.getAllDispatches
);

// Fetch single dispatch record by ID
router.get(
  '/:id', 
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'DRIVER', 'TRANSPORT', 'LOGISTICS', 'EMPLOYEE', 'Admin', 'LogisticsManager', 'SalesManager', 'Driver']), 
  dispatchController.getDispatchById
);

// ─── WRITE / WRITE-STATUS OPERATIONS ─────────────────────────────────

// Create a new DPR-compliant dispatch record
router.post(
  '/', 
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'TRANSPORT', 'Admin', 'LogisticsManager']), 
  dispatchController.createDispatch
);

// Update dispatch fields (e.g., DPR compliance fields, freight details, etc.)
router.patch(
  '/:id', 
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'LogisticsManager', 'Driver']), 
  dispatchController.updateDispatch
);

// Update status (e.g., Pending -> Truck Assigned -> In Transit -> Delivered)
router.patch(
  '/:id/status', 
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'DRIVER', 'TRANSPORT', 'LOGISTICS', 'EMPLOYEE', 'Admin', 'LogisticsManager', 'Driver']), 
  dispatchController.updateStatus
);

// Attach / Update Proof of Delivery (POD)
router.post(
  '/:id/proof', 
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'DRIVER', 'Admin', 'LogisticsManager', 'Driver']), 
  dispatchController.uploadPOD
);

router.patch(
  '/:id/pod', 
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'DRIVER', 'Admin', 'LogisticsManager', 'Driver']), 
  dispatchController.uploadPOD
);

// Complete trip and release Truck/Driver resources
router.patch(
  '/:id/complete', 
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'LogisticsManager', 'Driver']), 
  dispatchController.completeTrip
);

// Emergency Breakdown SOS System
router.post(
  '/emergency/sos',
  authorize(['ADMIN', 'MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'Driver']),
  dispatchController.sendEmergencySOS
);

// Acknowledge Emergency Breakdown SOS (Manager/Admin)
router.post(
  '/emergency/acknowledge',
  authorize(['ADMIN', 'MANAGER', 'LOGISTICS_MANAGER', 'Admin', 'LogisticsManager']),
  dispatchController.acknowledgeEmergencySOS
);
router.post(
  '/emergency/:sosId/acknowledge',
  authorize(['ADMIN', 'MANAGER', 'LOGISTICS_MANAGER', 'Admin', 'LogisticsManager']),
  dispatchController.acknowledgeEmergencySOS
);

// Log Trip Expense
router.post(
  '/:id/expense',
  authorize(['ADMIN', 'MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'Driver']),
  dispatchController.logExpense
);

// ─── PHASE 4.1 ENHANCEMENT ROUTES ──────────────────────────────────────────

// Feature 1: Real-Time Payment Proof Upload (UPI/QR)
router.post(
  '/:id/payment-proof',
  authorize(['ADMIN', 'MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'Driver']),
  dispatchController.submitPaymentProof
);

// Feature 1: Verify Payment Proof (Finance/Manager)
router.post(
  '/:id/verify-payment',
  authorize(['ADMIN', 'MANAGER', 'PROCUREMENT', 'LOGISTICS_MANAGER', 'Admin', 'LogisticsManager']),
  dispatchController.verifyPaymentProof
);

// Feature 2: Odometer Start Reading
router.post(
  '/:id/odometer/start',
  authorize(['ADMIN', 'MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'Driver']),
  dispatchController.recordStartOdometer
);

// Feature 2: Odometer End Reading
router.post(
  '/:id/odometer/end',
  authorize(['ADMIN', 'MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'Driver']),
  dispatchController.recordEndOdometer
);

// Feature 2: Fuel Log Entry
router.post(
  '/:id/fuel-log',
  authorize(['ADMIN', 'MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'Driver']),
  dispatchController.addFuelLog
);

// Feature 3: Departure Verification Photos (At Loading)
router.post(
  '/:id/departure-images',
  authorize(['ADMIN', 'MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'Driver']),
  dispatchController.submitDepartureImages
);

// Feature 3: Delivery Verification Photos (At Unloading)
router.post(
  '/:id/delivery-images',
  authorize(['ADMIN', 'MANAGER', 'DRIVER', 'TRANSPORT', 'Admin', 'Driver']),
  dispatchController.submitDeliveryImages
);

module.exports = router;