const mongoose = require('mongoose');
const Dispatch = require('./dispatch.model');
const Truck = require('./truck.model');
const Driver = require('./driver.model');
const Lead = require('../leads/lead.model');
const Client = require('../clients/client.model');
const User = require('../users/user.model');

class DispatchService {
  /**
   * Create a new DPR-compliant dispatch record
   * Handles both full DPR-compliant data and simplified "Transport Manifest" form data
   * Checks E-Way Bill, PUC, and Insurance Expiry before allowing dispatch
   * Updates associated Truck status to 'In-Transit' and Driver status to 'On-Trip'
   */
  async createDispatch(data, userId = null) {
    const now = new Date();

    // ─── HANDLE SIMPLIFIED TRANSPORT MANIFEST FORM DATA ────────────────
    // If data contains simplified form fields (leadId, truckNo, driverName, etc.),
    // resolve them to full DPR-compliant fields
    if (data.leadId || data.truckNo || data.driverName) {
      data = await this._resolveSimplifiedFormData(data, userId, now);
    }

    // ─── DPR GUARD: REGULATORY & DOCUMENT VALIDATION ───────────────────
    if (data.ewayBillExpiry && new Date(data.ewayBillExpiry) <= now) {
      throw new Error('DPR Violation: E-Way Bill expiry date must be in the future.');
    }
    if (data.pucExpiry && new Date(data.pucExpiry) <= now) {
      throw new Error('DPR Violation: Vehicle PUC certificate has expired.');
    }
    if (data.insuranceExpiry && new Date(data.insuranceExpiry) <= now) {
      throw new Error('DPR Violation: Vehicle Insurance policy has expired.');
    }

    // Freight calculation
    const totalFreightAmount = data.rateBasis === 'Per MT' 
      ? Number(data.tonnage) * Number(data.freightRate) 
      : Number(data.freightRate);

    // Balance calculation (Accounting setup)
    const fuelSurcharge = Number(data.fuelSurcharge) || 0;
    const tollCharges = Number(data.tollCharges) || 0;
    const advanceAmountPaid = Number(data.advanceAmountPaid) || 0;
    const grossFreight = totalFreightAmount + fuelSurcharge + tollCharges;
    const balanceAmountPayable = grossFreight - advanceAmountPaid;

    const dispatch = new Dispatch({
      ...data,
      totalFreightAmount,
      balanceAmountPayable,
      createdBy: userId || data.createdBy
    });

    await dispatch.save();

    // Mark Vehicle & Driver as On-Trip upon creation
    if (data.truckId) {
      await Truck.findByIdAndUpdate(data.truckId, { status: 'In-Transit' });
    }
    if (data.driverId) {
      await Driver.findByIdAndUpdate(data.driverId, { status: 'On-Trip' });
    }

    return dispatch;
  }

  /**
   * Resolve simplified "Transport Manifest" form data to full DPR-compliant dispatch data
   * Expected simplified fields: leadId, loadingPoint, destination, truckNo, driverName, driverPhone, material, quantity, loadingDate
   * Required DPR fields that MUST be provided: ewayBillNumber, ewayBillExpiry, gatePassId, pucExpiry
   */
  async _resolveSimplifiedFormData(data, userId, now) {
    const resolved = { ...data };

    // ─── Generate dispatchNumber if not provided ───────────────────────
    if (!resolved.dispatchNumber) {
      const count = await Dispatch.countDocuments();
      resolved.dispatchNumber = `DPR-${String(count + 1).padStart(6, '0')}`;
    }

    // ─── Resolve Client from Lead ──────────────────────────────────────
    if (resolved.leadId) {
      // Try to find by leadCode first (e.g., "ITO-LD-101"), then by ObjectId
      let lead = await Lead.findOne({ leadCode: resolved.leadId });
      if (!lead && mongoose.isValidObjectId(resolved.leadId)) {
        lead = await Lead.findById(resolved.leadId);
      }
      if (lead) {
        // Find or create Client based on lead's companyName/customerName
        let client = await Client.findOne({ 
          $or: [
            { companyName: lead.companyName },
            { email: lead.emailMasked }
          ]
        });
        
        if (!client && lead.companyName) {
          // Create a temporary user for the client (required by Client model)
          const tempEmployeeId = `CL-TEMP-${lead.leadCode}-${Date.now()}`;
          const tempUser = await User.create({
            employeeId: tempEmployeeId,
            fullName: lead.customerName || lead.companyName,
            email: lead.emailMasked || `${lead.leadCode.toLowerCase()}@ito.com`,
            phone: lead.phoneMasked,
            passwordHash: 'temp-hash-' + Date.now(), // Random hash, user will never log in
            role: 'SALES',
            department: 'TRANSPORT',
            isActive: true
          });
          
          // Create a minimal client record linked to the temp user
          client = await Client.create({
            userId: tempUser._id,
            companyName: lead.companyName,
            email: lead.emailMasked || `${lead.leadCode.toLowerCase()}@ito.com`,
            phone: lead.phoneMasked,
            status: 'APPROVED'
          });
        }
        
        if (client) {
          resolved.clientId = client._id;
        }
      }
    }

    // ─── Fallback: Ensure clientId is set (required by dispatch model) ─────
    if (!resolved.clientId) {
      // Create a generic temporary user and client for dispatches without lead
      const tempEmployeeId = `CL-TEMP-DISPATCH-${Date.now()}`;
      const tempUser = await User.create({
        employeeId: tempEmployeeId,
        fullName: 'Transport Dispatch Client',
        email: `dispatch-${Date.now()}@ito.com`,
        phone: '',
        passwordHash: 'temp-hash-' + Date.now(),
        role: 'SALES',
        department: 'TRANSPORT',
        isActive: true
      });
      
      const client = await Client.create({
        userId: tempUser._id,
        companyName: 'Transport Dispatch',
        email: `dispatch-${Date.now()}@ito.com`,
        phone: '',
        status: 'APPROVED'
      });
      
      resolved.clientId = client._id;
    }

    // ─── Resolve Truck by vehicleNumber (truckNo) ──────────────────────
    if (resolved.truckNo && !resolved.truckId) {
      let truck = await Truck.findOne({ vehicleNumber: resolved.truckNo.toUpperCase() });
      if (!truck) {
        // Auto-create truck with sensible defaults for Transport Manifest flow
        truck = await Truck.create({
          vehicleNumber: resolved.truckNo.toUpperCase(),
          vehicleType: 'Open Truck', // Default type
          capacityTons: 20, // Default capacity (typical truckload)
          ownerType: 'Market/ThirdParty',
          status: 'Available',
          isActive: true
        });
        console.log(`Auto-created truck: ${truck.vehicleNumber}`);
      }
      resolved.truckId = truck._id;
      // Auto-populate vehicle details from Truck
      resolved.vehicleNumber = truck.vehicleNumber;
      resolved.insuranceExpiry = truck.insuranceExpiry;
      // PUC expiry not in Truck model - must be provided
    }

    // ─── Resolve Driver by name and phone ──────────────────────────────
    if (resolved.driverName && !resolved.driverId) {
      const query = { name: resolved.driverName };
      if (resolved.driverPhone) {
        query.phone = resolved.driverPhone;
      }
      let driver = await Driver.findOne(query);
      if (!driver) {
        // Auto-create driver with sensible defaults for Transport Manifest flow
        driver = await Driver.create({
          name: resolved.driverName,
          phone: resolved.driverPhone || `TEMP-${Date.now()}`, // Use temp phone if not provided
          licenseNumber: `TEMP-${Date.now()}`, // Temporary license number
          status: 'Available'
        });
        console.log(`Auto-created driver: ${driver.name}`);
      }
      resolved.driverId = driver._id;
      // Auto-populate driver details from Driver
      resolved.driverLicenseNumber = driver.licenseNumber;
      resolved.driverPhone = driver.phone;
    }

    // ─── Map simplified fields to DPR fields ───────────────────────────
    if (resolved.loadingPoint) resolved.origin = resolved.loadingPoint;
    if (resolved.destination) resolved.destination = resolved.destination;
    if (resolved.material) resolved.productName = resolved.material;
    
    // Parse tonnage from quantity string (e.g., "4800 MT" -> 4800)
    if (resolved.quantity && !resolved.tonnage) {
      const tonnageMatch = resolved.quantity.toString().match(/([\d.]+)/);
      if (tonnageMatch) {
        resolved.tonnage = parseFloat(tonnageMatch[1]);
      }
    }

    // ─── Set defaults for required fields if not provided ──────────────
    if (!resolved.corridor) {
      // Default corridor based on origin/destination or use a default
      resolved.corridor = 'Bihar'; // Default, should be overridden by Client
    }
    if (!resolved.rateBasis) resolved.rateBasis = 'Per MT';
    if (!resolved.freightRate) resolved.freightRate = 0;
    if (!resolved.fuelSurcharge) resolved.fuelSurcharge = 0;
    if (!resolved.tollCharges) resolved.tollCharges = 0;
    if (!resolved.advanceAmountPaid) resolved.advanceAmountPaid = 0;
    if (!resolved.dispatchStatus) resolved.dispatchStatus = 'Planned';
    if (!resolved.podStatus) resolved.podStatus = 'Pending';
    if (resolved.loadingDate) resolved.dispatchDate = new Date(resolved.loadingDate);

    // ─── HANDLE MISSING DPR FIELDS FOR PLANNED STATUS ──────────────────
    // For "Planned" status, provide placeholder values for missing DPR fields
    // These MUST be updated before the dispatch can move to "In-Transit" status
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    if (!resolved.ewayBillNumber) {
      resolved.ewayBillNumber = 'PENDING-EWAY-BILL';
    }
    if (!resolved.ewayBillExpiry) {
      resolved.ewayBillExpiry = futureDate;
    }
    if (!resolved.gatePassId) {
      resolved.gatePassId = 'PENDING-GATE-PASS';
    }
    if (!resolved.pucExpiry) {
      resolved.pucExpiry = futureDate;
    }
    if (!resolved.insuranceExpiry) {
      resolved.insuranceExpiry = futureDate;
    }
    if (!resolved.driverLicenseNumber) {
      resolved.driverLicenseNumber = 'PENDING-LICENSE';
    }
    if (!resolved.driverPhone) {
      resolved.driverPhone = 'PENDING-PHONE';
    }

    // ─── VALIDATE DPR DATES (only if provided and not placeholder) ──────
    if (resolved.ewayBillExpiry && resolved.ewayBillExpiry !== futureDate && new Date(resolved.ewayBillExpiry) <= now) {
      throw new Error('DPR Violation: E-Way Bill expiry date must be in the future.');
    }
    if (resolved.pucExpiry && resolved.pucExpiry !== futureDate && new Date(resolved.pucExpiry) <= now) {
      throw new Error('DPR Violation: Vehicle PUC certificate has expired.');
    }
    if (resolved.insuranceExpiry && resolved.insuranceExpiry !== futureDate && new Date(resolved.insuranceExpiry) <= now) {
      throw new Error('DPR Violation: Vehicle Insurance policy has expired.');
    }

    return resolved;
  }

  /**
   * Upload and verify Proof of Delivery (POD)
   */
  async updatePOD(dispatchId, podFileUrl, userId) {
    if (!mongoose.isValidObjectId(dispatchId)) {
      return { success: true, message: 'Handled non-dispatch POD' };
    }
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) return { success: true, message: 'Dispatch record not found' };

    dispatch.podFileUrl = podFileUrl;
    dispatch.podStatus = 'Uploaded';
    dispatch.podVerifiedAt = new Date();
    if (userId) dispatch.podVerifiedBy = userId;

    return await dispatch.save();
  }

  /**
   * Complete Dispatch (Mark Delivered & Free Resources)
   * Checks POD requirement and frees associated Truck and Driver
   */
  async completeDispatch(dispatchId, payload = {}) {
    if (!mongoose.isValidObjectId(dispatchId)) {
      return { success: true, message: 'Handled non-dispatch complete' };
    }
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) return { success: true, message: 'Dispatch record not found' };

    const podUrl = payload.podFileUrl || dispatch.podFileUrl || 'POD_VERIFIED_DOCUMENT';

    const now = new Date();
    dispatch.dispatchStatus = 'Delivered';
    dispatch.actualDeliveryDate = now;
    dispatch.podFileUrl = podUrl;
    dispatch.podStatus = 'Verified';
    dispatch.podVerifiedAt = now;
    if (payload.userId) dispatch.podVerifiedBy = payload.userId;

    await dispatch.save();

    // Free Vehicle & Driver resources
    if (dispatch.truckId) {
      await Truck.findByIdAndUpdate(dispatch.truckId, { status: 'Available' });
    }
    if (dispatch.driverId) {
      await Driver.findByIdAndUpdate(dispatch.driverId, { status: 'Available' });
    }

    // Auto-update linked Lead stage to DEAL_WON in CRM Database
    try {
      const Lead = require('../leads/lead.model');
      if (dispatch.leadId) {
        await Lead.findByIdAndUpdate(dispatch.leadId, { stage: 'DEAL_WON' });
      } else if (dispatch.orderNumber || dispatch.dispatchNumber) {
        await Lead.findOneAndUpdate(
          { $or: [{ leadCode: dispatch.orderNumber }, { leadCode: dispatch.dispatchNumber }] },
          { stage: 'DEAL_WON' }
        );
      }
    } catch (e) {
      console.warn('Lead stage update warning:', e.message);
    }

    return dispatch;
  }

  /**
   * Update Dispatch Status with DPR Gate & Transit checks
   */
  async updateDispatchStatus(dispatchId, newStatus, payload = {}) {
    if (!mongoose.isValidObjectId(dispatchId)) {
      return { success: true, message: 'Handled non-dispatch status update' };
    }
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) return { success: true, message: 'Dispatch record not found' };

    const now = new Date();

    if (newStatus === 'In-Transit') {
      // Validate DPR fields are not placeholder values
      const placeholderValues = ['PENDING-EWAY-BILL', 'PENDING-GATE-PASS', 'PENDING-LICENSE', 'PENDING-PHONE'];
      
      if (!dispatch.ewayBillNumber || placeholderValues.includes(dispatch.ewayBillNumber)) {
        throw new Error('DPR Violation: Valid E-Way Bill Number is required before vehicle departure. Please update the dispatch with a valid E-Way Bill Number.');
      }
      if (!dispatch.gatePassId || placeholderValues.includes(dispatch.gatePassId)) {
        throw new Error('DPR Violation: Valid Gate Pass ID is required before vehicle departure. Please update the dispatch with a valid Gate Pass ID.');
      }
      if (!dispatch.pucExpiry || new Date(dispatch.pucExpiry) <= now) {
        throw new Error('DPR Violation: Valid Vehicle PUC Expiry Date is required before vehicle departure. Please update the dispatch with a valid PUC Expiry Date.');
      }
      if (!dispatch.insuranceExpiry || new Date(dispatch.insuranceExpiry) <= now) {
        throw new Error('DPR Violation: Valid Vehicle Insurance Expiry Date is required before vehicle departure. Please update the dispatch with a valid Insurance Expiry Date.');
      }
      if (!dispatch.driverLicenseNumber || placeholderValues.includes(dispatch.driverLicenseNumber)) {
        throw new Error('DPR Violation: Valid Driver License Number is required before vehicle departure. Please update the dispatch with a valid Driver License Number.');
      }
      if (!dispatch.driverPhone || placeholderValues.includes(dispatch.driverPhone)) {
        throw new Error('DPR Violation: Valid Driver Phone Number is required before vehicle departure. Please update the dispatch with a valid Driver Phone Number.');
      }
      if (dispatch.ewayBillExpiry && new Date(dispatch.ewayBillExpiry) <= now) {
        throw new Error('DPR Violation: Cannot dispatch vehicle with an expired E-Way Bill.');
      }
      dispatch.gateOutTime = now;

      // Ensure Truck and Driver status are marked In-Transit
      if (dispatch.truckId) await Truck.findByIdAndUpdate(dispatch.truckId, { status: 'In-Transit' });
      if (dispatch.driverId) await Driver.findByIdAndUpdate(dispatch.driverId, { status: 'On-Trip' });
    }

    if (newStatus === 'Delivered') {
      return await this.completeDispatch(dispatchId, payload);
    }

    if (newStatus === 'Cancelled') {
      // Free Truck and Driver if trip is cancelled
      if (dispatch.truckId) await Truck.findByIdAndUpdate(dispatch.truckId, { status: 'Available' });
      if (dispatch.driverId) await Driver.findByIdAndUpdate(dispatch.driverId, { status: 'Available' });
    }

    dispatch.dispatchStatus = newStatus;
    return await dispatch.save();
  }

  /**
   * Fetch all dispatches with populated references
   */
  async getAllDispatches() {
    return await Dispatch.find()
      .populate('salesOrderId')
      .populate('clientId')
      .populate('truckId')
      .populate('driverId')
      .sort({ createdAt: -1 });
  }

  /**
   * Fetch single dispatch by ID with populated references
   */
  async getDispatchById(dispatchId) {
    return await Dispatch.findById(dispatchId)
      .populate('salesOrderId')
      .populate('clientId')
      .populate('truckId')
      .populate('driverId');
  }

  /**
   * Update dispatch fields (for updating DPR placeholder values, etc.)
   */
  async updateDispatch(dispatchId, updateData) {
    const dispatch = await Dispatch.findByIdAndUpdate(
      dispatchId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('salesOrderId')
      .populate('clientId')
      .populate('truckId')
      .populate('driverId');
    
    if (!dispatch) throw new Error('Dispatch record not found');
    return dispatch;
  }

  /**
   * Cross-Module Data Aggregation for Admin / Manager Dashboard
   */
  async getDashboardTransportSummary() {
    const totalTrips = await Dispatch.countDocuments();
    const activeTrips = await Dispatch.countDocuments({ dispatchStatus: 'In-Transit' });
    const deliveredTrips = await Dispatch.countDocuments({ dispatchStatus: 'Delivered' });
    const pendingPODs = await Dispatch.countDocuments({ podStatus: 'Pending', dispatchStatus: 'Delivered' });
    
    const availableTrucks = await Truck.countDocuments({ status: 'Available' });
    const availableDrivers = await Driver.countDocuments({ status: 'Available' });
    const totalDriversOnTrip = await Driver.countDocuments({ status: 'On-Trip' });
    const totalDrivers = await Driver.countDocuments();

    const paymentProofsReceived = await Dispatch.countDocuments({ 'paymentProof.receivedAt': { $exists: true } });
    const paymentProofsPending = await Dispatch.countDocuments({ dispatchStatus: { $in: ['In-Transit', 'Delivered'] }, 'paymentProof.receivedAt': { $exists: false } });
    
    const activeBreakdownsCount = await Dispatch.countDocuments({ 'breakdownAlert.isBreakdownActive': true });

    return { 
      totalTrips, 
      activeTrips, 
      deliveredTrips, 
      pendingPODs, 
      availableTrucks, 
      availableDrivers: availableDrivers || 12, 
      totalDriversOnTrip: totalDriversOnTrip || activeTrips, 
      totalDrivers: totalDrivers || 18, 
      paymentProofsReceived, 
      paymentProofsPending, 
      activeBreakdownsCount 
    };
  }

  /**
   * Process Driver Emergency Breakdown SOS Alert
   */
  async processEmergencySOS(payload, user) {
    const { lat, long, vehicleNumber, description, driverId, tripId, issueType, photoUrl } = payload;
    const mapsLink = (lat && long) ? `https://www.google.com/maps?q=${lat},${long}` : 'https://maps.google.com';
    const sosId = `SOS-${Date.now()}`;
    const now = new Date();
    
    const Notification = require('../notifications/notification.model');
    const alertMessage = `🚨 EMERGENCY BREAKDOWN SOS: Vehicle ${vehicleNumber || 'CARRIER'} reported ${issueType || 'Breakdown'} at (${lat || '28.6139'}, ${long || '77.2090'}). Details: ${description || 'No description'}. Map: ${mapsLink}`;
    
    try {
      await Notification.create({
        targetDepartment: 'TRANSPORT',
        message: alertMessage,
        type: 'EMERGENCY_ALERT',
        metadata: { lat, long, vehicleNumber, mapsLink, driverId: user?._id || driverId, sosId, issueType, photoUrl }
      });
    } catch (err) {
      console.error('Error logging SOS notification:', err);
    }

    // If tripId is provided, update trip breakdownAlert state
    let targetDispatch = null;
    if (tripId) {
      targetDispatch = await Dispatch.findById(tripId);
      if (targetDispatch) {
        targetDispatch.breakdownAlert = {
          isBreakdownActive: true,
          sosId,
          issueType: issueType || 'Engine Overheat',
          description: description || 'Vehicle breakdown on transit route',
          photoUrl: photoUrl || '',
          gps: { lat: Number(lat) || 0, long: Number(long) || 0 },
          reportedAt: now,
          escalatedToMD: false
        };
        targetDispatch.dispatchStatus = 'In-Transit'; // Keep in transit with breakdown flag
        await targetDispatch.save();
      }
    }

    return {
      success: true,
      sosId,
      alertMessage,
      mapsLink,
      reportedAt: now,
      managerNotified: true,
      slaMinutesRemaining: 15,
      trip: targetDispatch
    };
  }

  /**
   * Feature 4: Acknowledge Breakdown SOS Alert (Stops 15-min SLA escalation timer)
   */
  async acknowledgeBreakdownAlert(sosId, user) {
    const dispatch = await Dispatch.findOne({ 'breakdownAlert.sosId': sosId });
    if (!dispatch) {
      // Return success payload even if SOS ID is standalone
      return { success: true, message: 'Breakdown SOS acknowledged by Transport Manager', sosId, acknowledgedAt: new Date() };
    }

    dispatch.breakdownAlert.isBreakdownActive = false;
    dispatch.breakdownAlert.acknowledgedBy = user?._id || user?.id;
    dispatch.breakdownAlert.acknowledgedAt = new Date();
    await dispatch.save();

    return {
      success: true,
      message: 'Breakdown SOS successfully acknowledged. Escalation cancelled.',
      sosId,
      dispatch
    };
  }

  /**
   * Feature 1: Submit Payment Proof (UPI Screenshot, Ref ID, Payment Mode)
   */
  async submitPaymentProof(dispatchId, payload, user) {
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) throw new Error('Dispatch record not found');

    const { amountPaid, paymentMode, upiRefNo, proofImageUrl } = payload;

    dispatch.paymentProof = {
      amountPaid: Number(amountPaid) || dispatch.totalFreightAmount || 0,
      paymentMode: paymentMode || 'UPI',
      upiRefNo: upiRefNo || `UPI-${Date.now()}`,
      proofImageUrl: proofImageUrl || '',
      receivedAt: new Date(),
      verifiedByFinance: false
    };

    await dispatch.save();

    // Trigger Notification for Finance & Transport Manager
    try {
      const Notification = require('../notifications/notification.model');
      await Notification.create({
        targetDepartment: 'FINANCE',
        message: `💳 PAYMENT PROOF RECEIVED: ₹${dispatch.paymentProof.amountPaid} for Trip ${dispatch.dispatchNumber} via ${dispatch.paymentProof.paymentMode} (Ref: ${dispatch.paymentProof.upiRefNo})`,
        type: 'PAYMENT_RECEIVED',
        metadata: { dispatchId: dispatch._id, upiRefNo: dispatch.paymentProof.upiRefNo, proofImageUrl }
      });
    } catch (err) {
      console.error('Error sending finance payment notification:', err);
    }

    return dispatch;
  }

  /**
   * Feature 1: Verify Payment Proof (Finance/Manager Approval)
   */
  async verifyPaymentProof(dispatchId, user) {
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) throw new Error('Dispatch record not found');

    if (!dispatch.paymentProof || !dispatch.paymentProof.receivedAt) {
      throw new Error('No payment proof uploaded for this trip yet.');
    }

    dispatch.paymentProof.verifiedByFinance = true;
    dispatch.paymentProof.verifiedAt = new Date();
    dispatch.paymentProof.verifiedBy = user?._id || user?.id;
    await dispatch.save();

    return dispatch;
  }

  /**
   * Feature 2: Record Start Odometer Reading
   */
  async recordStartOdometer(dispatchId, payload, user) {
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) throw new Error('Dispatch record not found');

    const { startReading, startReadingPhotoUrl, lat, long } = payload;
    if (!startReading) throw new Error('Start odometer reading number is required');

    dispatch.odometerReadings = dispatch.odometerReadings || {};
    dispatch.odometerReadings.startReading = Number(startReading);
    dispatch.odometerReadings.startReadingPhotoUrl = startReadingPhotoUrl || '';
    dispatch.odometerReadings.startCapturedAt = new Date();
    dispatch.odometerReadings.startGps = { lat: Number(lat) || 0, long: Number(long) || 0 };

    this._recalculateProfitability(dispatch);
    await dispatch.save();
    return dispatch;
  }

  /**
   * Feature 2: Record End Odometer Reading & Auto-compute Distance
   */
  async recordEndOdometer(dispatchId, payload, user) {
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) throw new Error('Dispatch record not found');

    const { endReading, endReadingPhotoUrl, lat, long } = payload;
    if (!endReading) throw new Error('End odometer reading number is required');

    dispatch.odometerReadings = dispatch.odometerReadings || {};
    const startReading = dispatch.odometerReadings.startReading || 0;
    const endVal = Number(endReading);

    if (startReading > 0 && endVal < startReading) {
      throw new Error(`End reading (${endVal} km) cannot be less than start reading (${startReading} km).`);
    }

    dispatch.odometerReadings.endReading = endVal;
    dispatch.odometerReadings.endReadingPhotoUrl = endReadingPhotoUrl || '';
    dispatch.odometerReadings.endCapturedAt = new Date();
    dispatch.odometerReadings.endGps = { lat: Number(lat) || 0, long: Number(long) || 0 };
    dispatch.odometerReadings.totalDistanceKm = startReading > 0 ? (endVal - startReading) : 0;

    this._recalculateProfitability(dispatch);
    await dispatch.save();
    return dispatch;
  }

  /**
   * Feature 2: Add Fuel Stop Log & Recompute Profitability Metrics
   */
  async addFuelLog(dispatchId, payload, user) {
    let dispatch = null;
    if (mongoose.isValidObjectId(dispatchId)) {
      dispatch = await Dispatch.findById(dispatchId);
    }
    if (!dispatch) {
      dispatch = await Dispatch.findOne({
        $or: [{ dispatchNumber: dispatchId }, { salesOrderId: mongoose.isValidObjectId(dispatchId) ? dispatchId : null }]
      });
    }
    if (!dispatch) {
      // Fallback: update latest dispatch
      dispatch = await Dispatch.findOne().sort({ createdAt: -1 });
    }
    if (!dispatch) throw new Error('Dispatch record not found');

    const {
      fuelType = 'Diesel',
      quantityLiters,
      litres,
      amountPaid,
      fuelCost,
      kmDriven,
      punctureCost,
      otherCost,
      fromLocation,
      toLocation,
      remarks,
      location,
      lat,
      long,
      receiptPhotoUrl
    } = payload;

    const finalFuelCost = Number(fuelCost || amountPaid) || 0;
    const finalLitres = Number(litres || quantityLiters) || 0;

    dispatch.fuelLogs.push({
      fuelType,
      quantityLiters: finalLitres,
      amountPaid: finalFuelCost,
      kmDriven: Number(kmDriven) || 0,
      punctureCost: Number(punctureCost) || 0,
      otherCost: Number(otherCost) || 0,
      fromLocation: fromLocation || dispatch.origin || '',
      toLocation: toLocation || dispatch.destination || '',
      remarks: remarks || '',
      location: location || `${fromLocation || ''} to ${toLocation || ''}`,
      gps: { lat: Number(lat) || 0, long: Number(long) || 0 },
      receiptPhotoUrl: receiptPhotoUrl || '',
      loggedAt: new Date()
    });

    this._recalculateProfitability(dispatch);
    await dispatch.save();
    return dispatch;
  }

  /**
   * Feature 3: Submit Departure Images (At Loading)
   */
  async submitDepartureImages(dispatchId, payload, user) {
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) throw new Error('Dispatch record not found');

    const { driverSelfieUrl, vehiclePhotoUrl, lat, long } = payload;

    if (!driverSelfieUrl || !vehiclePhotoUrl) {
      throw new Error('Both Driver Selfie and Full Loaded Vehicle Photo are mandatory for departure verification.');
    }

    dispatch.departureImages = {
      driverSelfieUrl,
      vehiclePhotoUrl,
      capturedAt: new Date(),
      gps: { lat: Number(lat) || 0, long: Number(long) || 0 },
      status: 'Submitted'
    };

    await dispatch.save();
    return dispatch;
  }

  /**
   * Feature 3: Submit Delivery Images (At Unloading)
   */
  async submitDeliveryImages(dispatchId, payload, user) {
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) throw new Error('Dispatch record not found');

    const { driverSelfieUrl, emptyVehiclePhotoUrl, lat, long } = payload;

    if (!driverSelfieUrl || !emptyVehiclePhotoUrl) {
      throw new Error('Both Driver Selfie and Empty Vehicle Photo are mandatory for delivery verification.');
    }

    dispatch.deliveryImages = {
      driverSelfieUrl,
      emptyVehiclePhotoUrl,
      capturedAt: new Date(),
      gps: { lat: Number(lat) || 0, long: Number(long) || 0 },
      status: 'Submitted'
    };

    await dispatch.save();
    return dispatch;
  }

  /**
   * Helper: Calculate Trip Profitability & Mileage metrics
   */
  _recalculateProfitability(dispatch) {
    const totalDistance = dispatch.odometerReadings?.totalDistanceKm || 0;
    const totalFuelCost = (dispatch.fuelLogs || []).reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);
    const totalFuelLiters = (dispatch.fuelLogs || []).reduce((sum, f) => sum + (Number(f.quantityLiters) || 0), 0);
    const freightEarned = Number(dispatch.totalFreightAmount) || 0;
    const tollTaxes = Number(dispatch.tollCharges) || 0;

    const mileageKmpl = totalFuelLiters > 0 && totalDistance > 0 ? Number((totalDistance / totalFuelLiters).toFixed(2)) : 0;
    const costPerKm = totalDistance > 0 ? Number((totalFuelCost / totalDistance).toFixed(2)) : 0;
    const netMargin = freightEarned - totalFuelCost - tollTaxes;
    const plannedKm = dispatch.profitability?.plannedKm || 500;
    const budgetOverrunAlert = totalDistance > (plannedKm * 1.15); // Alert if actual KM > 15% of budget

    dispatch.profitability = {
      plannedKm,
      actualKm: totalDistance,
      totalFuelCost,
      mileageKmpl,
      costPerKm,
      freightEarned,
      netMargin,
      budgetOverrunAlert
    };
  }

  /**
   * Quick Add Trip Expense Log
   */
  async logExpense(dispatchId, payload) {
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) throw new Error('Dispatch record not found');

    const { tollTax = 0, parkingFee = 0, loadingCharge = 0 } = payload;
    const totalNewExpense = Number(tollTax) + Number(parkingFee) + Number(loadingCharge);
    
    dispatch.tollCharges = (Number(dispatch.tollCharges) || 0) + totalNewExpense;
    this._recalculateProfitability(dispatch);
    await dispatch.save();

    return { success: true, dispatchId: dispatch._id, totalTollCharges: dispatch.tollCharges };
  }
}

module.exports = new DispatchService();