const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env' });

// Mock req, res
const mockReq = {
  body: {
    employeeId: 'EMP998',
    name: 'Test Onboarding Two',
    email: 'testonboarding2@company.com',
    password: 'Password123!',
    phone: '9999999998',
    department: 'IT',
    position: 'Frontend Developer',
    joiningDate: '2026-08-14',
    employmentType: 'Permanent',
    reportingManager: '',
    salary: '60000',
    bankName: '',
    bankAccountNumber: '',
    confirmBankAccountNumber: '',
    ifscCode: '',
    panCardNumber: '',
    aadhaarNumber: '',
    emergencyContactName: 'Contact Name',
    emergencyContactRelationship: 'Other',
    emergencyContactPhone: '9999999999',
    emergencyContactEmail: '',
    termsAccepted: true
  },
  ip: '127.0.0.1',
  headers: {}
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('RESPONSE:', JSON.stringify(data, null, 2));
    process.exit(0);
  }
};

const mockNext = (err) => {
  console.error('UNHANDLED ERROR:', err);
  process.exit(1);
};

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ito';
    await mongoose.connect(mongoUri.trim());
    console.log('DB Connected successfully for testing');

    const { signupEmployee } = require('../modules/employee/employee.controller');
    await signupEmployee(mockReq, mockRes, mockNext);
  } catch (err) {
    console.error('Run failed:', err);
    process.exit(1);
  }
}

run();
