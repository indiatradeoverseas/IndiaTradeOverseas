const path = require('path');
const fs = require('fs');
const Payslip = require('./payslip.model');
const Employee = require('../employee/employee.model');
const { ok, fail } = require('../../utils/response');

async function uploadPayslip(req, res) {
  try {
    const allowedRoles = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'];
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: Only HR or Admins can upload payslips', [], req);
    }

    const { employeeId, month, netAmount, status } = req.body;

    if (!employeeId || !month || !netAmount) {
      return fail(res, 400, 'BAD_REQUEST', 'Missing required fields: employeeId, month, and netAmount are mandatory', [], req);
    }

    if (!req.file) {
      return fail(res, 400, 'BAD_REQUEST', 'A payslip file attachment is required', [], req);
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return fail(res, 404, 'NOT_FOUND', 'Target employee not found', [], req);
    }

    const payslip = await Payslip.create({
      employeeId,
      month,
      netAmount: Number(netAmount),
      status: status || 'PAID',
      fileUrl: req.file.path.replace(/\\/g, '/'),
      fileOriginalName: req.file.originalname,
      uploadedBy: req.user._id
    });

    await payslip.populate('employeeId', 'name email department position role');
    await payslip.populate('uploadedBy', 'name email department position role');

    return ok(res, { payslip }, 'Payslip uploaded successfully', 201, req);
  } catch (error) {
    console.error('Error uploading payslip:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

async function getEmployeePayslips(req, res) {
  try {
    const { employeeId } = req.params;
    const userId = String(req.user._id);

    // Employees can only fetch their own payslips, managers/HR can fetch anyone's
    const isSelf = userId === employeeId;
    const allowedManagers = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'];
    const isManager = allowedManagers.includes(req.user.role);

    if (!isSelf && !isManager) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: You are not authorized to view this employee\'s payslips', [], req);
    }

    const payslips = await Payslip.find({ employeeId })
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });

    return ok(res, { payslips }, 'Payslips retrieved successfully', 200, req);
  } catch (error) {
    console.error('Error getting employee payslips:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

async function downloadPayslipFile(req, res) {
  try {
    const { id } = req.params;
    const userId = String(req.user._id);

    const payslip = await Payslip.findById(id);
    if (!payslip) {
      return fail(res, 404, 'NOT_FOUND', 'Payslip not found', [], req);
    }

    const isSelf = String(payslip.employeeId) === userId;
    const allowedManagers = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'];
    const isManager = allowedManagers.includes(req.user.role);

    if (!isSelf && !isManager) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: You are not authorized to download this payslip', [], req);
    }

    const filePath = path.resolve(payslip.fileUrl);
    if (!fs.existsSync(filePath)) {
      return fail(res, 404, 'NOT_FOUND', 'Payslip file not found on server disk', [], req);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${payslip.fileOriginalName}"`);
    res.setHeader('Content-Type', 'application/pdf');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading payslip file:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

async function deletePayslip(req, res) {
  try {
    const { id } = req.params;
    const allowedRoles = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'];
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: Only HR or Admins can delete payslips', [], req);
    }

    const payslip = await Payslip.findById(id);
    if (!payslip) {
      return fail(res, 404, 'NOT_FOUND', 'Payslip not found', [], req);
    }

    const filePath = path.resolve(payslip.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Payslip.findByIdAndDelete(id);
    return ok(res, {}, 'Payslip deleted successfully', 200, req);
  } catch (error) {
    console.error('Error deleting payslip:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

module.exports = {
  uploadPayslip,
  getEmployeePayslips,
  downloadPayslipFile,
  deletePayslip
};
