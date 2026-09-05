const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Payslip = require('./payslip.model');
const Employee = require('../employee/employee.model');
const { ok, fail } = require('../../utils/response');

async function uploadPayslip(req, res) {
  try {
    const allowedRoles = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'];
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: Only HR or Admins can upload payslips', [], req);
    }

    const { employeeId, month, netAmount, status, basic, hra, allowance, pf, esi } = req.body;

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

    let gridFsFileId = null;
    let fileUrl = '';

    if (req.file.buffer) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
      const ext = path.extname(req.file.originalname || '.pdf');
      const storedFileName = `payslip-${uniqueSuffix}${ext}`;

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'payslips'
      });

      const uploadStream = bucket.openUploadStream(storedFileName, {
        contentType: req.file.mimetype || 'application/pdf'
      });

      await new Promise((resolve, reject) => {
        uploadStream.end(req.file.buffer, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      gridFsFileId = uploadStream.id;
      const backendBase = process.env.BACKEND_URL || (req.protocol + '://' + req.get('host'));
      fileUrl = `${backendBase}/api/payslips/${gridFsFileId}/download`;
    } else {
      fileUrl = req.file.path.replace(/\\/g, '/');
    }

    const payslip = await Payslip.create({
      employeeId,
      month,
      netAmount: Number(netAmount),
      basic: Number(basic) || 0,
      hra: Number(hra) || 0,
      allowance: Number(allowance) || 0,
      pf: Number(pf) || 0,
      esi: Number(esi) || 0,
      grossAmount: (Number(basic) || 0) + (Number(hra) || 0) + (Number(allowance) || 0),
      deductions: (Number(pf) || 0) + (Number(esi) || 0),
      status: status || 'PAID',
      gridFsFileId: gridFsFileId ? String(gridFsFileId) : null,
      fileUrl,
      fileOriginalName: req.file.originalname || `Payslip_${month}.pdf`,
      uploadedBy: req.user._id
    });

    await payslip.populate('employeeId', 'name email department position role');
    await payslip.populate('uploadedBy', 'name email department position role');

    return ok(res, { payslip }, 'Payslip uploaded to MongoDB successfully', 201, req);
  } catch (error) {
    console.error('Error uploading payslip to GridFS:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

async function generatePayslip(req, res) {
  try {
    const allowedRoles = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'];
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: Only HR or Admins can generate payslips', [], req);
    }

    const { employeeId, month, basic, hra, allowance, pf, esi, netAmount, status } = req.body;

    if (!employeeId || !month) {
      return fail(res, 400, 'BAD_REQUEST', 'employeeId and month are mandatory fields', [], req);
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return fail(res, 404, 'NOT_FOUND', 'Target employee not found', [], req);
    }

    const numBasic = Number(basic) || 0;
    const numHra = Number(hra) || 0;
    const numAllowance = Number(allowance) || 0;
    const numPf = Number(pf) || 0;
    const numEsi = Number(esi) || 0;

    const gross = numBasic + numHra + numAllowance;
    const deductions = numPf + numEsi;
    const calculatedNet = netAmount !== undefined ? Number(netAmount) : (gross - deductions);

    const payslip = await Payslip.create({
      employeeId,
      month,
      netAmount: calculatedNet,
      basic: numBasic,
      hra: numHra,
      allowance: numAllowance,
      pf: numPf,
      esi: numEsi,
      grossAmount: gross,
      deductions,
      status: status || 'PAID',
      fileOriginalName: `Payslip_${(employee.name || 'Employee').replace(/\s+/g, '_')}_${month.replace(/\s+/g, '_')}.pdf`,
      uploadedBy: req.user._id
    });

    await payslip.populate('employeeId', 'name email department position role');
    await payslip.populate('uploadedBy', 'name email department position role');

    return ok(res, { payslip }, `Payslip for ${employee.name} generated and saved in MongoDB`, 201, req);
  } catch (error) {
    console.error('Error generating payslip:', error);
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

    const payslip = await Payslip.findById(id).populate('employeeId', 'name email department position employeeId');
    if (!payslip) {
      return fail(res, 404, 'NOT_FOUND', 'Payslip not found', [], req);
    }

    const targetEmpId = String(payslip.employeeId?._id || payslip.employeeId);
    const isSelf = targetEmpId === userId;
    const allowedManagers = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'];
    const isManager = allowedManagers.includes(req.user.role);

    if (!isSelf && !isManager) {
      return fail(res, 403, 'FORBIDDEN', 'Access denied: You are not authorized to download this payslip', [], req);
    }

    const filename = payslip.fileOriginalName || `payslip-${payslip.month}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    // 1. Download directly from MongoDB GridFS Bucket if stored in Database
    if (payslip.gridFsFileId) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'payslips'
      });
      const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(payslip.gridFsFileId));
      downloadStream.on('error', (err) => {
        console.error('Payslip GridFS stream error:', err);
        if (!res.headersSent) {
          fail(res, 404, 'NOT_FOUND', 'Payslip file chunk not found in database', [], req);
        }
      });
      return downloadStream.pipe(res);
    }

    // 2. Download from Disk if fileUrl exists
    if (payslip.fileUrl) {
      const filePath = path.resolve(payslip.fileUrl);
      if (fs.existsSync(filePath)) {
        const fileStream = fs.createReadStream(filePath);
        return fileStream.pipe(res);
      }
    }

    // 3. Fallback: Stream dynamically generated text/HTML document
    const empName = payslip.employeeId?.name || 'Employee';
    const empCode = payslip.employeeId?.employeeId || 'N/A';
    const dept = payslip.employeeId?.department || 'GENERAL';
    const content = `====================================================
               INDIA TRADE OVERSEAS
                   SALARY PAYSLIP
====================================================
Month           : ${payslip.month}
Status          : ${payslip.status}
Employee Name   : ${empName}
Employee ID     : ${empCode}
Department      : ${dept}
----------------------------------------------------
EARNINGS:
  Basic Salary  : INR ${payslip.basic || 0}
  HRA           : INR ${payslip.hra || 0}
  Allowance     : INR ${payslip.allowance || 0}
  Gross Amount  : INR ${payslip.grossAmount || payslip.netAmount}
----------------------------------------------------
DEDUCTIONS:
  PF            : INR ${payslip.pf || 0}
  ESI           : INR ${payslip.esi || 0}
  Total Deduct. : INR ${payslip.deductions || 0}
----------------------------------------------------
NET PAYABLE     : INR ${payslip.netAmount}
====================================================
Generated On    : ${new Date(payslip.createdAt).toLocaleDateString()}
Authorized By   : HR Department
====================================================
`;
    res.setHeader('Content-Type', 'text/plain');
    return res.send(content);
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

    if (payslip.gridFsFileId) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: 'payslips'
        });
        await bucket.delete(new mongoose.Types.ObjectId(payslip.gridFsFileId));
      } catch (gridErr) {
        console.warn('Could not remove payslip from GridFS:', gridErr.message);
      }
    }

    if (payslip.fileUrl) {
      try {
        const filePath = path.resolve(payslip.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.warn('Could not remove file from disk:', e.message);
      }
    }

    await Payslip.findByIdAndDelete(id);
    return ok(res, {}, 'Payslip deleted successfully from MongoDB', 200, req);
  } catch (error) {
    console.error('Error deleting payslip:', error);
    return fail(res, 500, 'INTERNAL_SERVER_ERROR', error.message, [], req);
  }
}

module.exports = {
  uploadPayslip,
  generatePayslip,
  getEmployeePayslips,
  downloadPayslipFile,
  deletePayslip
};
