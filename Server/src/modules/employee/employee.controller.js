const bcrypt = require('bcryptjs');
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

async function getAllEmployees(req, res, next) {
  try {
    const employees = await Employee.find(
      { status: { $ne: 'TERMINATED' } },
      { _id: 1, name: 1, email: 1, employeeId: 1, role: 1, department: 1, position: 1, status: 1, joiningDate: 1 }
    ).sort({ employeeId: 1 });
    return ok(res, { employees }, 'Employees retrieved successfully', 200, req);
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
  getAllEmployees
};
