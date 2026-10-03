const CareerLeadUpload = require('./careerLeadUpload.model');
const CareerLead = require('./careerLead.model');
const { ok, fail } = require('../../utils/response');

const hasHRAuthorization = (user) => {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  const dept = (user.department || '').toUpperCase();
  const pos = (user.position || '').toLowerCase();

  return (
    ['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'CEO', 'SUPER_ADMIN', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR', 'MANAGER'].includes(role) ||
    dept === 'HR' || dept === 'ADMIN' || dept === 'MANAGEMENT' ||
    pos.includes('hr') || pos.includes('admin')
  );
};

// 1. Upload Single Career Lead
const uploadSingleCareerLead = async (req, res, next) => {
  try {
    if (!hasHRAuthorization(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only HR Managers and Admins can upload career leads.');
    }

    const { fullName, email, phone, position, experience, location, refNo, result, status, notes, source } = req.body;

    if (!fullName || !email || !phone) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Full name, email, and phone number are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if lead already exists in CareerLeadUpload by email
    let lead = await CareerLeadUpload.findOne({ email: normalizedEmail });

    if (lead) {
      lead.fullName = fullName.trim();
      lead.phone = phone.trim();
      if (position) lead.position = position.trim();
      if (experience) lead.experience = experience.trim();
      if (location) lead.location = location.trim();
      if (refNo !== undefined) lead.refNo = String(refNo).trim();
      if (result !== undefined) lead.result = String(result).trim();
      if (status) lead.status = status;
      if (notes) lead.notes = notes.trim();
      if (source) lead.source = source.trim();
      lead.uploadedBy = req.user._id;
      lead.uploadedByName = req.user.fullName || req.user.name || 'HR Manager';

      await lead.save();
      return ok(res, { lead, isUpdated: true }, 'Existing career lead updated successfully with uploaded info.', 200, req);
    }

    lead = new CareerLeadUpload({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      position: position ? position.trim() : 'General Candidate',
      experience: experience ? experience.trim() : 'N/A',
      location: location ? location.trim() : 'N/A',
      refNo: refNo ? String(refNo).trim() : '',
      result: result ? String(result).trim() : '',
      status: status || 'NEW',
      source: source || 'MANUAL_UPLOAD',
      notes: notes ? notes.trim() : '',
      uploadedBy: req.user._id,
      uploadedByName: req.user.fullName || req.user.name || 'HR Manager'
    });

    await lead.save();

    // Also sync to CareerLead model for gate consistency
    try {
      await CareerLead.findOneAndUpdate(
        { email: normalizedEmail },
        { fullName: fullName.trim(), email: normalizedEmail, phone: phone.trim() },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } catch (syncErr) {
      console.warn('Sync to CareerLead gate warning:', syncErr.message);
    }

    return ok(res, { lead, isUpdated: false }, 'Career lead uploaded successfully!', 201, req);
  } catch (error) {
    next(error);
  }
};

// 2. Bulk Upload Career Leads (from CSV / Excel array payload)
const bulkUploadCareerLeads = async (req, res, next) => {
  try {
    if (!hasHRAuthorization(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only HR Managers and Admins can upload career leads.');
    }

    const { leads } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please provide a non-empty array of career leads to upload.');
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const processedLeads = [];
    const errors = [];

    // Pre-fetch all users to map assignedToName / task owner to HR Executive ObjectId
    let allUsers = [];
    try {
      const { listAllUsers } = require('../users/user.service');
      allUsers = await listAllUsers();
    } catch (e) {}

    for (let i = 0; i < leads.length; i++) {
      const item = leads[i];
      if (!item || typeof item !== 'object') continue;

      const rawName = item.fullName || item['Full Name'] || item['Name'] || item['fullName'] || item['Candidate Name'] || item['Candidate'] || item['Applicant'];
      let email = item.email || item['Email'] || item['Email Address'] || item['email'] || item['Email ID'] || item['Mail'] || '';
      let phone = item.phone || item['Phone'] || item['Mobile'] || item['Phone Number'] || item['phone'] || item['Contact'] || item['Contact Number'] || item['Mobile No'] || '';
      const position = item.position || item['Position'] || item['Job Title'] || item['Role'] || item['Target Position'] || 'General Candidate';
      const experience = item.experience || item['Experience'] || item['Exp'] || 'N/A';
      const location = item.location || item['Location'] || item['City'] || item['Country'] || item['Location (Country)'] || 'N/A';
      const refNo = item.refNo || item['Ref No'] || item['Ref'] || item['Reference'] || item['RefNo'] || item['refno'] || '';
      const result = item.result || item['Result'] || item['Outcome'] || '';
      const status = item.status || item['Status'] || 'NEW';
      const notes = item.notes || item['Notes'] || item['Remark'] || item['Remarks'] || '';
      const assignedToName = item.assignedToName || item['Assigned To'] || item['Owner'] || item['Task Owner'] || item['AssignedTo'] || item['Assigned HR'] || '';

      const fullName = String(rawName || `Candidate #${i + 1}`).trim();

      // If email is missing or placeholder, construct a unique candidate email handle
      let normalizedEmail = String(email).toLowerCase().trim();
      if (!normalizedEmail || normalizedEmail === 'n/a' || normalizedEmail === 'candidate@email.com' || normalizedEmail === 'none' || normalizedEmail === 'undefined') {
        const cleanRef = refNo ? String(refNo).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
        normalizedEmail = cleanRef ? `candidate_${cleanRef}@talent.local` : `candidate_${i + 1}_${Date.now()}@talent.local`;
      }

      let cleanPhone = String(phone).trim();
      if (!cleanPhone) {
        cleanPhone = 'N/A';
      }

      // Try to resolve assignedTo User from assignedToName if present
      let assignedToId = null;
      let resolvedAssignedName = '';
      let resolvedAssignedEmail = '';

      if (assignedToName && allUsers.length > 0) {
        const searchAssigned = String(assignedToName).toLowerCase().trim();
        const foundUser = allUsers.find(u => {
          const uName = (u.fullName || u.name || '').toLowerCase();
          const uEmail = (u.email || '').toLowerCase();
          return uName.includes(searchAssigned) || searchAssigned.includes(uName) || (uEmail && uEmail.includes(searchAssigned));
        });
        if (foundUser) {
          assignedToId = foundUser._id;
          resolvedAssignedName = foundUser.fullName || foundUser.name || 'HR Executive';
          resolvedAssignedEmail = foundUser.email || '';
        } else {
          resolvedAssignedName = String(assignedToName).trim();
        }
      } else if (assignedToName) {
        resolvedAssignedName = String(assignedToName).trim();
      }

      try {
        let lead = null;

        // 1. Try finding lead by refNo if refNo exists
        if (refNo) {
          lead = await CareerLeadUpload.findOne({ refNo: String(refNo).trim() });
        }

        // 2. If no refNo match, try finding by normalizedEmail (only if non-talent.local email)
        if (!lead && normalizedEmail && !normalizedEmail.endsWith('@talent.local')) {
          lead = await CareerLeadUpload.findOne({ email: normalizedEmail });
        }

        if (lead) {
          lead.fullName = fullName;
          lead.email = normalizedEmail;
          lead.phone = cleanPhone;
          lead.position = String(position).trim();
          lead.experience = String(experience).trim();
          lead.location = String(location).trim();
          if (refNo) lead.refNo = String(refNo).trim();
          if (result) lead.result = String(result).trim();
          if (notes) lead.notes = String(notes).trim();
          if (resolvedAssignedName) {
            lead.assignedToName = resolvedAssignedName;
            if (assignedToId) lead.assignedTo = assignedToId;
            if (resolvedAssignedEmail) lead.assignedToEmail = resolvedAssignedEmail;
            lead.assignedAt = new Date();
          }
          lead.uploadedBy = req.user._id;
          lead.uploadedByName = req.user.fullName || req.user.name || 'HR Manager';

          await lead.save();
          updatedCount++;
          processedLeads.push(lead);
        } else {
          lead = new CareerLeadUpload({
            fullName,
            email: normalizedEmail,
            phone: cleanPhone,
            position: String(position).trim(),
            experience: String(experience).trim(),
            location: String(location).trim(),
            refNo: String(refNo).trim(),
            result: String(result).trim(),
            status: status || 'NEW',
            source: 'CSV_BULK_UPLOAD',
            notes: notes ? String(notes).trim() : '',
            assignedTo: assignedToId || null,
            assignedToName: resolvedAssignedName || '',
            assignedToEmail: resolvedAssignedEmail || '',
            assignedAt: assignedToId ? new Date() : null,
            uploadedBy: req.user._id,
            uploadedByName: req.user.fullName || req.user.name || 'HR Manager'
          });

          await lead.save();
          insertedCount++;
          processedLeads.push(lead);
        }

        // Sync to CareerLead gate model if non-talent.local email
        if (!normalizedEmail.endsWith('@talent.local')) {
          await CareerLead.findOneAndUpdate(
            { email: normalizedEmail },
            { fullName, email: normalizedEmail, phone: cleanPhone },
            { upsert: true, setDefaultsOnInsert: true }
          ).catch(() => {});
        }

      } catch (err) {
        errors.push({ row: i + 1, email: normalizedEmail, error: err.message });
      }
    }

    return ok(
      res,
      {
        totalReceived: leads.length,
        insertedCount,
        updatedCount,
        failedCount: errors.length,
        errors,
        processedLeads
      },
      `Bulk upload complete! ${insertedCount} new lead(s) created, ${updatedCount} existing lead(s) updated.`,
      200,
      req
    );
  } catch (error) {
    next(error);
  }
};

// 3. Get All Career Leads (Unified list: Uploaded leads + Gate leads)
const getCareerLeads = async (req, res, next) => {
  try {
    if (!hasHRAuthorization(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only HR Managers and Admins can view career leads.');
    }

    const { search, status, source } = req.query;

    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (source && source !== 'ALL') {
      filter.source = source;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { position: searchRegex },
        { location: searchRegex },
        { refNo: searchRegex },
        { result: searchRegex },
        { assignedToName: searchRegex }
      ];
    }

    // Fetch all uploaded career leads
    const uploadedLeads = await CareerLeadUpload.find(filter).sort({ createdAt: -1 });

    // Fetch gate leads from CareerLead model to ensure none are missed
    const gateLeads = await CareerLead.find().sort({ createdAt: -1 });

    // Build unique set of non-local uploaded emails to avoid duplicating gate entries
    const uploadedEmails = new Set();
    uploadedLeads.forEach(l => {
      if (l.email && !l.email.endsWith('@talent.local')) {
        uploadedEmails.add(l.email.toLowerCase());
      }
    });

    const mergedList = uploadedLeads.map(l => l.toObject());

    // Merge gate leads if email is not already present in uploadedLeads
    gateLeads.forEach(gate => {
      const email = gate.email ? gate.email.toLowerCase() : '';
      if (email && !uploadedEmails.has(email)) {
        mergedList.push({
          _id: gate._id,
          fullName: gate.fullName,
          email: gate.email,
          phone: gate.phone,
          position: 'Careers Gate Lead',
          experience: 'N/A',
          location: 'N/A',
          refNo: '',
          result: '',
          status: 'NOT_APPLIED',
          source: 'CAREER_GATE',
          notes: 'Captured from Careers Page Entry Gate',
          createdAt: gate.createdAt,
          updatedAt: gate.updatedAt
        });
      }
    });

    let finalFiltered = mergedList;

    // Apply search filter on merged gate items if search query provided
    if (search) {
      const q = search.toLowerCase().trim();
      finalFiltered = finalFiltered.filter(l =>
        (l.fullName && l.fullName.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.position && l.position.toLowerCase().includes(q)) ||
        (l.refNo && l.refNo.toLowerCase().includes(q)) ||
        (l.result && l.result.toLowerCase().includes(q)) ||
        (l.assignedToName && l.assignedToName.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'ALL') {
      finalFiltered = finalFiltered.filter(l => l.status === status);
    }
    if (source && source !== 'ALL') {
      finalFiltered = finalFiltered.filter(l => l.source === source);
    }

    // Sort by createdAt descending
    finalFiltered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return ok(res, { leads: finalFiltered, total: finalFiltered.length }, 'Career leads retrieved successfully.', 200, req);
  } catch (error) {
    next(error);
  }
};

// 4. Update Career Lead Status or Notes
const updateCareerLeadStatus = async (req, res, next) => {
  try {
    if (!hasHRAuthorization(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only HR Managers and Admins can update career leads.');
    }

    const { id } = req.params;
    const { status, notes, position, experience, location, refNo, result } = req.body;

    let lead = await CareerLeadUpload.findById(id);

    if (!lead) {
      // Check if it's a CareerLead gate entry
      const gateLead = await CareerLead.findById(id);
      if (gateLead) {
        // Upgrade gate lead into CareerLeadUpload
        lead = new CareerLeadUpload({
          fullName: gateLead.fullName,
          email: gateLead.email,
          phone: gateLead.phone,
          position: position || 'Careers Gate Lead',
          experience: experience || 'N/A',
          location: location || 'N/A',
          refNo: refNo || '',
          result: result || '',
          status: status || 'CONTACTED',
          source: 'CAREER_GATE',
          notes: notes || 'Upgraded from Careers Gate',
          uploadedBy: req.user._id,
          uploadedByName: req.user.fullName || req.user.name || 'HR Manager'
        });
        await lead.save();
        return ok(res, { lead }, 'Gate lead upgraded and updated successfully.', 200, req);
      }

      return fail(res, 404, 'NOT_FOUND', 'Career lead not found.');
    }

    if (status) lead.status = status;
    if (notes !== undefined) lead.notes = notes;
    if (position) lead.position = position;
    if (experience) lead.experience = experience;
    if (location) lead.location = location;
    if (refNo !== undefined) lead.refNo = refNo;
    if (result !== undefined) lead.result = result;

    await lead.save();

    return ok(res, { lead }, `Career lead status updated to ${lead.status}`, 200, req);
  } catch (error) {
    next(error);
  }
};

// 5. Delete Career Lead
const deleteCareerLead = async (req, res, next) => {
  try {
    if (!hasHRAuthorization(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only HR Managers and Admins can delete career leads.');
    }

    const { id } = req.params;

    // Try to delete from CareerLeadUpload first
    let deleted = await CareerLeadUpload.findByIdAndDelete(id);

    if (!deleted) {
      // Fallback: Try to delete from CareerLead gate model
      deleted = await CareerLead.findByIdAndDelete(id);
    }

    if (!deleted) {
      return fail(res, 404, 'NOT_FOUND', 'Career lead not found.');
    }

    return ok(res, { deletedId: id }, 'Career lead deleted successfully.', 200, req);
  } catch (error) {
    next(error);
  }
};

// Helper to check if user can assign career leads (Founder, CEO, Admin, HR Manager)
const canAssignCareerLead = (user) => {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  const dept = (user.department || '').toUpperCase();
  const pos = (user.position || '').toLowerCase();

  return (
    ['FOUNDER', 'CO_FOUNDER', 'CEO', 'ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'].includes(role) ||
    dept === 'ADMIN' || dept === 'MANAGEMENT' ||
    pos.includes('founder') || pos.includes('ceo') || pos.includes('admin') || pos.includes('hr manager')
  );
};

// 6. Get list of HR Executives available for lead assignment
const getHRExecutives = async (req, res, next) => {
  try {
    const { listAllUsers } = require('../users/user.service');
    const allUsers = await listAllUsers();

    // Filter HR Executives (strictly HR_EXECUTIVE role or position containing HR Executive/Recruiter)
    let hrExecs = allUsers.filter(u => {
      const role = (u.role || '').toUpperCase();
      const pos = (u.position || '').toLowerCase();

      return (
        role === 'HR_EXECUTIVE' ||
        role === 'HR' ||
        pos.includes('hr executive') ||
        pos.includes('recruiter') ||
        pos.includes('talent executive') ||
        pos.includes('hr associate')
      );
    });

    // Fallback if no specific HR_EXECUTIVE role exists in database: include HR department users
    if (hrExecs.length === 0) {
      hrExecs = allUsers.filter(u => {
        const role = (u.role || '').toUpperCase();
        const dept = (u.department || '').toUpperCase();
        const pos = (u.position || '').toLowerCase();

        return (
          dept === 'HR' ||
          role.includes('HR') ||
          pos.includes('hr')
        );
      });
    }

    // Secondary Fallback if database is sparse: include active users
    if (hrExecs.length === 0) {
      hrExecs = allUsers.filter(u => u.isActive);
    }

    const formatted = hrExecs.map(u => ({
      _id: String(u._id),
      fullName: u.fullName || u.name || 'HR Executive',
      email: u.email || '',
      employeeId: u.employeeId || '',
      role: u.role || 'HR_EXECUTIVE',
      position: u.position || 'HR Executive',
      department: u.department || 'HR'
    }));

    return ok(res, { hrExecutives: formatted, count: formatted.length }, 'HR Executives fetched successfully.', 200, req);
  } catch (error) {
    next(error);
  }
};

// 7. Assign Career Lead to an HR Executive
const assignCareerLead = async (req, res, next) => {
  try {
    if (!canAssignCareerLead(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Founder, CEO, Admin, and HR Manager can assign career leads.');
    }

    const { id } = req.params;
    const { assignedToId } = req.body;

    let lead = await CareerLeadUpload.findById(id);

    if (!lead) {
      const gateLead = await CareerLead.findById(id);
      if (gateLead) {
        lead = new CareerLeadUpload({
          fullName: gateLead.fullName,
          email: gateLead.email,
          phone: gateLead.phone,
          position: 'Careers Gate Lead',
          status: 'NEW',
          source: 'CAREER_GATE',
          notes: 'Upgraded from Careers Gate',
          uploadedBy: req.user._id,
          uploadedByName: req.user.fullName || req.user.name || 'HR Manager'
        });
      } else {
        return fail(res, 404, 'NOT_FOUND', 'Career lead not found.');
      }
    }

    if (!assignedToId || assignedToId === 'UNASSIGNED') {
      lead.assignedTo = null;
      lead.assignedToName = '';
      lead.assignedToEmail = '';
      lead.assignedAt = null;
      lead.assignedBy = null;
      lead.assignedByName = '';
      await lead.save();
      return ok(res, { lead }, 'Lead unassigned successfully.', 200, req);
    }

    const { listAllUsers } = require('../users/user.service');
    const allUsers = await listAllUsers();
    const targetUser = allUsers.find(u => String(u._id) === String(assignedToId) || String(u.employeeId) === String(assignedToId));

    if (!targetUser) {
      return fail(res, 404, 'NOT_FOUND', 'Target HR Executive not found.');
    }

    lead.assignedTo = targetUser._id;
    lead.assignedToName = targetUser.fullName || targetUser.name || 'HR Executive';
    lead.assignedToEmail = targetUser.email || '';
    lead.assignedAt = new Date();
    lead.assignedBy = req.user._id;
    lead.assignedByName = req.user.fullName || req.user.name || 'Manager';

    await lead.save();

    return ok(res, { lead }, `Career lead assigned to ${lead.assignedToName} successfully!`, 200, req);
  } catch (error) {
    next(error);
  }
};

// 8. Bulk Assign Career Leads to an HR Executive
const bulkAssignCareerLeads = async (req, res, next) => {
  try {
    if (!canAssignCareerLead(req.user)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied. Only Founder, CEO, Admin, and HR Manager can assign career leads.');
    }

    const { leadIds, assignedToId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Please provide a non-empty array of lead IDs.');
    }

    // Resolve target user once
    let targetUser = null;
    const isUnassign = !assignedToId || assignedToId === 'UNASSIGNED';

    if (!isUnassign) {
      const { listAllUsers } = require('../users/user.service');
      const allUsers = await listAllUsers();
      targetUser = allUsers.find(u => String(u._id) === String(assignedToId) || String(u.employeeId) === String(assignedToId));

      if (!targetUser) {
        return fail(res, 404, 'NOT_FOUND', 'Target HR Executive not found.');
      }
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const leadId of leadIds) {
      try {
        let lead = await CareerLeadUpload.findById(leadId);

        if (!lead) {
          // Try gate lead upgrade
          const gateLead = await CareerLead.findById(leadId);
          if (gateLead) {
            lead = new CareerLeadUpload({
              fullName: gateLead.fullName,
              email: gateLead.email,
              phone: gateLead.phone,
              position: 'Careers Gate Lead',
              status: 'NEW',
              source: 'CAREER_GATE',
              notes: 'Upgraded from Careers Gate',
              uploadedBy: req.user._id,
              uploadedByName: req.user.fullName || req.user.name || 'HR Manager'
            });
          } else {
            errors.push({ leadId, error: 'Lead not found' });
            failedCount++;
            continue;
          }
        }

        if (isUnassign) {
          lead.assignedTo = null;
          lead.assignedToName = '';
          lead.assignedToEmail = '';
          lead.assignedAt = null;
          lead.assignedBy = null;
          lead.assignedByName = '';
        } else {
          lead.assignedTo = targetUser._id;
          lead.assignedToName = targetUser.fullName || targetUser.name || 'HR Executive';
          lead.assignedToEmail = targetUser.email || '';
          lead.assignedAt = new Date();
          lead.assignedBy = req.user._id;
          lead.assignedByName = req.user.fullName || req.user.name || 'Manager';
        }

        await lead.save();
        successCount++;
      } catch (err) {
        errors.push({ leadId, error: err.message });
        failedCount++;
      }
    }

    const assigneeName = isUnassign ? 'Unassigned' : (targetUser?.fullName || 'HR Executive');
    return ok(
      res,
      { successCount, failedCount, totalRequested: leadIds.length, errors, assignedToName: assigneeName },
      isUnassign
        ? `${successCount} lead(s) unassigned successfully.`
        : `${successCount} lead(s) assigned to ${assigneeName} successfully!`,
      200,
      req
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSingleCareerLead,
  bulkUploadCareerLeads,
  getCareerLeads,
  updateCareerLeadStatus,
  deleteCareerLead,
  getHRExecutives,
  assignCareerLead,
  bulkAssignCareerLeads
};
