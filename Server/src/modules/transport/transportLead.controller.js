const TransportLead = require('./transportLead.model');
const { ok, fail } = require('../../utils/response');

/**
 * Create a single Transport Lead with Custom Serial Number
 */
exports.createTransportLead = async (req, res, next) => {
  try {
    const {
      serialNumber,
      customerName,
      companyName,
      phone,
      email,
      pickupLocation,
      dropLocation,
      goodsType,
      vehicleType,
      estimatedDistanceKm,
      offeredRate,
      totalAmount,
      assignedDrivers,
      notes
    } = req.body;

    if (!customerName || !String(customerName).trim()) {
      return fail(res, 400, 'BAD_REQUEST', 'Customer Name is required', [], req);
    }

    let cleanSerial = serialNumber && String(serialNumber).trim() ? String(serialNumber).trim().toUpperCase() : '';

    if (!cleanSerial) {
      // Auto generate unique serial number
      const year = new Date().getFullYear();
      let uniqueFound = false;
      let attempts = 0;
      while (!uniqueFound && attempts < 50) {
        attempts++;
        const rand = Math.floor(1000 + Math.random() * 9000);
        const candidate = `TRP-${year}-${rand}`;
        const exists = await TransportLead.findOne({ serialNumber: candidate });
        if (!exists) {
          cleanSerial = candidate;
          uniqueFound = true;
        }
      }
      if (!cleanSerial) cleanSerial = `TRP-${year}-${Date.now().toString().slice(-6)}`;
    } else {
      // Check for existing lead with same serial number
      const existing = await TransportLead.findOne({ serialNumber: cleanSerial });
      if (existing) {
        return fail(res, 400, 'DUPLICATE_SERIAL', `Transport Lead with Serial Number "${cleanSerial}" already exists. Please use a unique serial number or click Auto-Generate.`, [], req);
      }
    }

    const computedTotal = Number(totalAmount) || (Number(estimatedDistanceKm || 0) * Number(offeredRate || 0)) || 0;

    const driversArray = Array.isArray(assignedDrivers) ? assignedDrivers : [];
    const initialStatus = driversArray.length > 0 ? 'ASSIGNED' : 'NEW';

    const lead = await TransportLead.create({
      serialNumber: cleanSerial,
      customerName: String(customerName).trim(),
      companyName: companyName ? String(companyName).trim() : '',
      phone: phone ? String(phone).trim() : '',
      email: email ? String(email).trim() : '',
      pickupLocation: pickupLocation ? String(pickupLocation).trim() : '',
      dropLocation: dropLocation ? String(dropLocation).trim() : '',
      goodsType: goodsType ? String(goodsType).trim() : 'General Cargo',
      vehicleType: vehicleType ? String(vehicleType).trim() : 'Open Body Truck',
      estimatedDistanceKm: Number(estimatedDistanceKm) || 0,
      offeredRate: Number(offeredRate) || 0,
      totalAmount: computedTotal,
      status: initialStatus,
      assignedDrivers: driversArray,
      notes: notes ? String(notes).trim() : '',
      createdBy: req.user?._id || req.user?.id
    });

    return ok(res, { lead }, `Transport Lead "${cleanSerial}" created successfully`, 201, req);
  } catch (error) {
    console.error('[TransportLeadController] Error creating transport lead:', error);
    next(error);
  }
};

/**
 * Bulk Upload Transport Leads (CSV / Excel JSON data)
 */
exports.bulkUploadTransportLeads = async (req, res, next) => {
  try {
    const { leads } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return fail(res, 400, 'BAD_REQUEST', 'Please provide an array of transport leads to import', [], req);
    }

    const createdLeads = [];
    const skippedLeads = [];

    for (let index = 0; index < leads.length; index++) {
      const item = leads[index];
      let rawSerial = item.serialNumber || item.serialNo || item.leadCode || item.code || '';
      let cleanSerial = String(rawSerial).trim().toUpperCase();
      const custName = item.customerName || item.customer || item.name || 'Transport Client';

      // Check if missing or duplicate serial number
      if (!cleanSerial) {
        cleanSerial = `TRP-CSV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${index + 1}`;
      } else {
        const existing = await TransportLead.findOne({ serialNumber: cleanSerial });
        if (existing) {
          cleanSerial = `${cleanSerial}-A${index + 1}`;
        }
      }

      const km = Number(item.estimatedDistanceKm || item.km) || 0;
      const rate = Number(item.offeredRate || item.rate) || 0;
      let total = Number(item.totalAmount || item.total);
      if (isNaN(total) || total <= 0) {
        const rawTotalStr = String(item.totalAmount || item.total || item['KM / RATE / TOTAL'] || item.kmRateTotal || '');
        const totalMatch = rawTotalStr.match(/=\s*₹?\s*([\d,]+(?:\.\d+)?)/i) || rawTotalStr.match(/₹\s*([\d,]+(?:\.\d+)?)/i);
        if (totalMatch) {
          total = Number(totalMatch[1].replace(/,/g, ''));
        } else {
          const nums = rawTotalStr.match(/[\d,]+/g);
          if (nums && nums.length > 0) {
            const lastNum = Number(nums[nums.length - 1].replace(/,/g, ''));
            if (!isNaN(lastNum) && lastNum > 0) total = lastNum;
          }
        }
      }
      if (isNaN(total) || total <= 0) {
        total = (km * rate) || 0;
      }

      const newLead = await TransportLead.create({
        serialNumber: cleanSerial,
        customerName: String(custName).trim(),
        companyName: item.companyName || item.company || '',
        phone: item.phone || item.mobile || '',
        email: item.email || '',
        pickupLocation: item.pickupLocation || item.pickup || item.origin || '',
        dropLocation: item.dropLocation || item.drop || item.destination || '',
        goodsType: item.goodsType || item.goods || 'General Cargo',
        vehicleType: item.vehicleType || item.vehicle || 'Open Body Truck',
        estimatedDistanceKm: km,
        offeredRate: rate,
        totalAmount: total,
        status: 'NEW',
        notes: item.notes || item.remarks || '',
        createdBy: req.user?._id || req.user?.id
      });

      createdLeads.push(newLead);
    }

    return ok(res, {
      uploadedCount: createdLeads.length,
      skippedCount: skippedLeads.length,
      uploadedLeads: createdLeads,
      skippedLeads
    }, `Bulk uploaded ${createdLeads.length} transport lead(s) successfully`, 200, req);

  } catch (error) {
    console.error('[TransportLeadController] Error bulk uploading transport leads:', error);
    next(error);
  }
};

/**
 * Get All Transport Leads with Filters
 */
exports.getTransportLeads = async (req, res, next) => {
  try {
    const { search, status, driverId } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = String(status).toUpperCase();
    }

    if (driverId && driverId !== 'ALL') {
      filter['assignedDrivers.driverId'] = driverId;
    }

    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { serialNumber: regex },
        { customerName: regex },
        { companyName: regex },
        { phone: regex },
        { pickupLocation: regex },
        { dropLocation: regex },
        { vehicleType: regex }
      ];
    }

    const leads = await TransportLead.find(filter)
      .populate('assignedDrivers.driverId', 'fullName name phone email role vehicleNumber')
      .populate('createdBy', 'fullName name email')
      .sort({ createdAt: -1 });

    return ok(res, { leads, total: leads.length }, 'Transport leads retrieved successfully', 200, req);
  } catch (error) {
    console.error('[TransportLeadController] Error fetching transport leads:', error);
    next(error);
  }
};

/**
 * Assign Multiple Drivers to a Transport Lead
 */
exports.assignMultipleDrivers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { drivers } = req.body; // Expecting array of { driverId, driverName, phone }

    if (!Array.isArray(drivers)) {
      return fail(res, 400, 'BAD_REQUEST', 'Please provide an array of drivers to assign', [], req);
    }

    const lead = await TransportLead.findById(id);
    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Transport Lead not found', [], req);
    }

    const cleanDrivers = drivers.map(d => ({
      driverId: d.driverId || d._id || null,
      driverName: d.driverName || d.fullName || d.name || 'Assigned Driver',
      phone: d.phone || d.mobile || '',
      assignedAt: new Date()
    }));

    lead.assignedDrivers = cleanDrivers;
    if (cleanDrivers.length > 0 && lead.status === 'NEW') {
      lead.status = 'ASSIGNED';
    } else if (cleanDrivers.length === 0 && lead.status === 'ASSIGNED') {
      lead.status = 'NEW';
    }

    await lead.save();

    const updatedLead = await TransportLead.findById(id)
      .populate('assignedDrivers.driverId', 'fullName name phone email role vehicleNumber');

    return ok(res, { lead: updatedLead }, `Assigned ${cleanDrivers.length} driver(s) to lead ${lead.serialNumber}`, 200, req);
  } catch (error) {
    console.error('[TransportLeadController] Error assigning drivers to lead:', error);
    next(error);
  }
};

/**
 * Update Transport Lead Status
 */
exports.updateTransportLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return fail(res, 400, 'BAD_REQUEST', 'Status is required', [], req);
    }

    const validStatuses = ['NEW', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
    const upperStatus = String(status).toUpperCase();

    if (!validStatuses.includes(upperStatus)) {
      return fail(res, 400, 'BAD_REQUEST', `Invalid status. Must be one of: ${validStatuses.join(', ')}`, [], req);
    }

    const lead = await TransportLead.findByIdAndUpdate(
      id,
      { status: upperStatus },
      { new: true }
    ).populate('assignedDrivers.driverId', 'fullName name phone email role vehicleNumber');

    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Transport Lead not found', [], req);
    }

    return ok(res, { lead }, `Status updated to ${upperStatus}`, 200, req);
  } catch (error) {
    console.error('[TransportLeadController] Error updating transport lead status:', error);
    next(error);
  }
};

/**
 * Delete Transport Lead
 */
exports.deleteTransportLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await TransportLead.findByIdAndDelete(id);

    if (!lead) {
      return fail(res, 404, 'NOT_FOUND', 'Transport Lead not found', [], req);
    }

    return ok(res, { id }, `Transport Lead "${lead.serialNumber}" deleted successfully`, 200, req);
  } catch (error) {
    console.error('[TransportLeadController] Error deleting transport lead:', error);
    next(error);
  }
};
