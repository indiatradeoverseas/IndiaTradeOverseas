const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Employee = require('./employee.model');
const MonthlyLeaveBalance = require('../leave/monthlyLeaveBalance.model');
const { generateAccessToken } = require('../auth/token.service');
const { ok, fail } = require('../../utils/response');

async function register(req, res, next) {
  try {
    const { name, email, password, department, joiningDate, phone, address, profileImage } = req.body;

    if (!name || !email || !password || !department) {
      return fail(res, 400, 'BAD_REQUEST', 'Missing required registration parameters', [], req);
    }

    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return fail(res, 409, 'EMPLOYEE_EXISTS', 'Employee email already registered', [], req);
    }

    // Hash password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    // Create employee
    const employee = await Employee.create({
      name,
      email,
      password: passwordHash,
      department,
      joiningDate: joiningDate || new Date(),
      role: req.body.role || 'EMPLOYEE',
      status: req.body.status || 'ACTIVE',
      phone: phone || '',
      address: address || '',
      profileImage: profileImage || ''
    });

    // Initialize MonthlyLeaveBalance for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    await MonthlyLeaveBalance.create({
      employeeId: employee._id,
      month: currentMonth,
      totalLeaves: 4,
      usedLeaves: 0,
      remainingLeaves: 4,
      extraLeavesUsed: 0,
      totalLeavesUsed: 0,
      isReset: false
    });

    const token = generateAccessToken(employee);

    const employeeResponse = {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      joiningDate: employee.joiningDate,
      status: employee.status,
      phone: employee.phone,
      address: employee.address,
      profileImage: employee.profileImage
    };

    return ok(res, { token, employee: employeeResponse }, 'Employee registered successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return fail(res, 400, 'BAD_REQUEST', 'Email and password are required', [], req);
    }

    const employee = await Employee.findOne({ email });
    if (!employee || employee.status !== 'ACTIVE') {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials or employee deactivated', [], req);
    }

    if (!employee.password) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials', [], req);
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials', [], req);
    }

    const token = generateAccessToken(employee);

    const employeeResponse = {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      position: employee.position,
      joiningDate: employee.joiningDate,
      status: employee.status,
      phone: employee.phone,
      address: employee.address,
      profileImage: employee.profileImage
    };

    return ok(res, { token, employee: employeeResponse }, 'Employee logged in successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    // req.user is loaded by authenticate middleware
    if (!req.user) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Not authenticated', [], req);
    }
    
    return ok(res, { employee: req.user }, 'Profile retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getNextEmployeeId(req, res, next) {
  try {
    const employees = await Employee.find({}, { employeeId: 1 });
    let maxNum = 0;
    employees.forEach(emp => {
      if (emp.employeeId && emp.employeeId.startsWith('EMP')) {
        const numPart = emp.employeeId.replace('EMP', '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });
    const nextNum = maxNum + 1;
    const formattedId = `EMP${String(nextNum).padStart(3, '0')}`;
    return ok(res, { nextEmployeeId: formattedId }, 'Next Employee ID generated', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getListManagers(req, res, next) {
  try {
    const managers = await Employee.find(
      { role: { $in: ['ADMIN', 'MANAGER', 'HR_MANAGER'] }, status: 'ACTIVE' },
      { _id: 1, name: 1, email: 1, employeeId: 1, position: 1 }
    );
    return ok(res, { managers }, 'Reporting managers retrieved', 200, req);
  } catch (error) {
    next(error);
  }
}

async function signupEmployee(req, res, next) {
  try {
    const {
      employeeId,
      name,
      email,
      password,
      phone,
      dob,
      gender,
      fatherHusbandName,
      permanentAddress,
      currentAddress,
      department,
      position,
      joiningDate,
      employmentType,
      probationEndDate,
      reportingManager,
      salary,
      bankName,
      bankAccountNumber,
      ifscCode,
      panCardNumber,
      aadhaarNumber,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      emergencyContactEmail,
      profileImage,
      resume,
      panCardCopy,
      aadhaarCardCopy,
      passportPhoto,
      offerLetter,
      additionalDocs,
      permissions
    } = req.body;

    // 1. Mandatory Validations
    if (!employeeId || !name || !email || !password || !phone || !department || !position) {
      return fail(res, 400, 'BAD_REQUEST', 'Missing required registration parameters', [], req);
    }

    // 2. Format Validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(res, 400, 'INVALID_EMAIL', 'Email address format is invalid', [], req);
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    if (!phoneRegex.test(cleanPhone)) {
      return fail(res, 400, 'INVALID_PHONE', 'Phone number must be exactly 10 digits starting with 6-9', [], req);
    }

    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
    if (panCardNumber && !panRegex.test(panCardNumber.toUpperCase())) {
      return fail(res, 400, 'INVALID_PAN', 'PAN card format must be ABCDE1234F', [], req);
    }

    const aadhaarRegex = /^\d{4}-\d{4}-\d{4}$/;
    if (aadhaarNumber && !aadhaarRegex.test(aadhaarNumber)) {
      return fail(res, 400, 'INVALID_AADHAAR', 'Aadhaar format must be XXXX-XXXX-XXXX', [], req);
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (ifscCode && !ifscRegex.test(ifscCode.toUpperCase())) {
      return fail(res, 400, 'INVALID_IFSC', 'IFSC code must be a valid 11-character alphanumeric code', [], req);
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return fail(res, 400, 'WEAK_PASSWORD', 'Password must be minimum 8 characters with at least 1 uppercase, 1 lowercase, 1 number, and 1 special character', [], req);
    }

    if (bankAccountNumber && bankAccountNumber.replace(/[^0-9]/g, '').length < 9) {
      return fail(res, 400, 'INVALID_BANK_ACCOUNT', 'Bank Account number must contain at least 9 digits', [], req);
    }

    // 3. Database uniqueness constraints
    const duplicateEmail = await Employee.findOne({ email });
    if (duplicateEmail) {
      return fail(res, 409, 'DUPLICATE_EMAIL', 'Email address is already registered', [], req);
    }

    const duplicatePhone = await Employee.findOne({ phone });
    if (duplicatePhone) {
      return fail(res, 409, 'DUPLICATE_PHONE', 'Phone number is already registered', [], req);
    }

    const duplicateId = await Employee.findOne({ employeeId });
    if (duplicateId) {
      return fail(res, 409, 'DUPLICATE_EMPLOYEE_ID', 'Employee ID is already assigned', [], req);
    }

    // Hash password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    // Save Employee
    const employee = await Employee.create({
      employeeId,
      name,
      email,
      password: passwordHash,
      phone,
      dob,
      gender,
      fatherHusbandName,
      permanentAddress,
      currentAddress,
      department,
      position,
      joiningDate: joiningDate || new Date(),
      employmentType: employmentType || 'Permanent',
      probationEndDate: employmentType === 'Probation' ? probationEndDate : undefined,
      reportingManager: reportingManager || null,
      salary: salary || 0,
      bankName,
      bankAccountNumber,
      ifscCode: ifscCode ? ifscCode.toUpperCase() : undefined,
      panCardNumber: panCardNumber ? panCardNumber.toUpperCase() : undefined,
      aadhaarNumber,
      emergencyContactName,
      emergencyContactRelationship: emergencyContactRelationship || 'Other',
      emergencyContactPhone,
      emergencyContactEmail,
      profileImage,
      resume,
      panCardCopy,
      aadhaarCardCopy,
      passportPhoto,
      offerLetter,
      additionalDocs: additionalDocs || [],
      permissions: permissions || {
        productUpload: false,
        lead: false,
        export: false,
        document: false,
        task: false,
        dispatch: false,
        payment: false,
        quotation: false,
        job: false
      }
    });

    // Initialize MonthlyLeaveBalance for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    await MonthlyLeaveBalance.create({
      employeeId: employee._id,
      month: currentMonth,
      totalLeaves: 4,
      usedLeaves: 0,
      remainingLeaves: 4,
      extraLeavesUsed: 0,
      totalLeavesUsed: 0,
      isReset: false
    });

    const token = generateAccessToken(employee);

    const employeeResponse = {
      _id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      position: employee.position,
      status: employee.status
    };

    return ok(res, { token, employee: employeeResponse }, 'Employee registered successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function listEmployees(req, res, next) {
  try {
    const { department } = req.query;
    let query = { status: 'ACTIVE' };
    if (department) {
      query.department = department.toUpperCase();
    }

    const employees = await Employee.find(query)
      .select('-password')
      .sort({ name: 1 })
      .lean();

    const employeeIds = employees.map(emp => emp._id);

    // Fetch statuses
    const EmployeeStatus = require('./employeeStatus.model');
    const statuses = await EmployeeStatus.find({ employeeId: { $in: employeeIds } }).lean();
    const statusMap = statuses.reduce((map, s) => {
      if (s && s.employeeId) {
        map[s.employeeId.toString()] = s;
      }
      return map;
    }, {});

    // Fetch pending task counts
    const Task = require('../task/task.model');
    const targetIds = [];
    employeeIds.forEach(id => {
      targetIds.push(String(id));
      if (mongoose.isValidObjectId(id)) {
        targetIds.push(new mongoose.Types.ObjectId(id));
      }
    });

    const pendingTasksAgg = await Task.aggregate([
      { $match: { assignedTo: { $in: targetIds }, status: { $ne: 'COMPLETED' } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);
    const tasksCountMap = pendingTasksAgg.reduce((map, t) => {
      if (t && t._id) {
        map[t._id.toString()] = t.count;
      }
      return map;
    }, {});

    const employeesWithStatus = employees.map(emp => {
      const statusInfo = statusMap[emp._id.toString()] || {
        status: 'OFFLINE',
        currentActivity: 'Offline',
        lastUpdated: emp.updatedAt || new Date(),
        duration: '00:00:00'
      };
      return {
        ...emp,
        status: statusInfo.status,
        currentActivity: statusInfo.currentActivity,
        lastUpdated: statusInfo.lastUpdated,
        duration: statusInfo.duration,
        tasksCount: tasksCountMap[emp._id.toString()] || 0,
        statusInfo
      };
    });

    return ok(res, { employees: employeesWithStatus }, 'Employees list retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getEmployeesCount(req, res, next) {
  try {
    const { role, department } = req.query;
    let filter = { status: 'ACTIVE' };

    if (role) {
      if (role.toLowerCase() === 'sales') {
        filter.department = 'SALES';
      } else {
        filter.role = role.toUpperCase();
      }
    }
    if (department) {
      filter.department = department.toUpperCase();
    }

    const count = await Employee.countDocuments(filter);
    return ok(res, { count }, 'Employees count retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getEmployeeStatus(req, res, next) {
  try {
    const { id } = req.params;
    const EmployeeStatus = require('./employeeStatus.model');
    let statusObj = await EmployeeStatus.findOne({ employeeId: id }).lean();
    if (!statusObj) {
      statusObj = {
        employeeId: id,
        status: 'OFFLINE',
        currentActivity: 'Offline',
        lastUpdated: new Date(),
        duration: '00:00:00'
      };
    }
    return ok(res, { status: statusObj }, 'Employee status retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function updateEmployeeStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, currentActivity } = req.body;

    const validStatuses = ['ON_CALL', 'FOLLOWING_UP', 'CONVERTING', 'PAYMENT', 'IDLE', 'OFFLINE'];
    if (!validStatuses.includes(status)) {
      return fail(res, 400, 'BAD_REQUEST', 'Invalid status type');
    }

    const EmployeeStatus = require('./employeeStatus.model');
    const statusObj = await EmployeeStatus.findOneAndUpdate(
      { employeeId: id },
      {
        status,
        currentActivity: currentActivity || '',
        lastUpdated: new Date(),
        duration: '00:00:00'
      },
      { upsert: true, new: true }
    );

    // Broadcast update via socket
    const socketService = require('../../services/socket.service');
    const employee = await Employee.findById(id).select('name role department position');

    const updateData = {
      employeeId: id,
      name: employee ? employee.name : 'Unknown',
      status: statusObj.status,
      currentActivity: statusObj.currentActivity,
      lastUpdated: statusObj.lastUpdated,
      duration: statusObj.duration
    };

    socketService.emitToAll('employee_status_updated', updateData);

    return ok(res, { status: statusObj }, 'Employee status updated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getAllEmployees(req, res, next) {
  try {
    const employees = await Employee.find(
      { status: { $ne: 'TERMINATED' } },
      { _id: 1, name: 1, email: 1, employeeId: 1, role: 1, department: 1, position: 1, status: 1, joiningDate: 1, salary: 1 }
    ).sort({ employeeId: 1 });
    return ok(res, { employees }, 'Employees retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function createEmployee(req, res, next) {
  try {
    const { name, email, phone, department, position, role, status, salary, joiningDate, password } = req.body;

    if (!name || !email || !phone || !department || !position) {
      return fail(res, 400, 'BAD_REQUEST', 'Missing required fields: name, email, phone, department, position', [], req);
    }

    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return fail(res, 409, 'EMPLOYEE_EXISTS', 'Employee email already registered', [], req);
    }

    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const passwordHash = await bcrypt.hash(password || 'ItoPass123!', bcryptRounds);

    const employee = await Employee.create({
      name,
      email,
      password: passwordHash,
      phone,
      department,
      position,
      role: role || 'EMPLOYEE',
      status: status || 'ACTIVE',
      salary: salary || 0,
      joiningDate: joiningDate || new Date(),
    });

    const currentMonth = new Date().toISOString().slice(0, 7);
    await MonthlyLeaveBalance.create({
      employeeId: employee._id,
      month: currentMonth,
      totalLeaves: 4,
      usedLeaves: 0,
      remainingLeaves: 4,
      extraLeavesUsed: 0,
      totalLeavesUsed: 0,
      isReset: false
    });

    const employeeResponse = {
      _id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      position: employee.position,
      status: employee.status,
      salary: employee.salary,
      joiningDate: employee.joiningDate
    };

    return ok(res, { employee: employeeResponse }, 'Employee created successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.password) {
      const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
      updates.password = await bcrypt.hash(updates.password, bcryptRounds);
    } else {
      delete updates.password;
    }

    const employee = await Employee.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!employee) {
      return fail(res, 404, 'NOT_FOUND', 'Employee not found', [], req);
    }

    const employeeResponse = {
      _id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      position: employee.position,
      status: employee.status,
      salary: employee.salary,
      joiningDate: employee.joiningDate
    };

    return ok(res, { employee: employeeResponse }, 'Employee updated successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function deleteEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const employee = await Employee.findByIdAndDelete(id);
    if (!employee) {
      return fail(res, 404, 'NOT_FOUND', 'Employee not found', [], req);
    }
    await MonthlyLeaveBalance.deleteMany({ employeeId: id });
    return ok(res, {}, 'Employee deleted successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  getNextEmployeeId,
  getListManagers,
  signupEmployee,
  listEmployees,
  getEmployeesCount,
  getEmployeeStatus,
  updateEmployeeStatus,
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
