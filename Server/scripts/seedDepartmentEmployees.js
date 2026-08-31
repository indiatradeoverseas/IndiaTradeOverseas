const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/modules/users/user.model');
const Employee = require('../src/modules/employee/employee.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ito_db';

const UNIFIED_PASSWORD = 'ItoPass123!';

const testAccounts = [
  {
    employeeId: 'EMP-ADM-001',
    fullName: 'System Admin',
    name: 'System Admin',
    email: 'admin@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'ADMIN',
    department: 'ADMIN',
    position: 'Chief Operations Officer',
    phone: '+91 9876543210',
    permissions: { productUpload: true, lead: true, export: true, document: true, task: true, dispatch: true, payment: true, quotation: true, job: true }
  },
  {
    employeeId: 'EMP-TRN-001',
    fullName: 'Rajesh Verma (Transport Manager)',
    name: 'Rajesh Verma',
    email: 'transport.manager@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'MANAGER',
    department: 'TRANSPORT',
    position: 'Transport Department Manager',
    phone: '+91 9811223344',
    permissions: { productUpload: false, lead: true, export: true, document: true, task: true, dispatch: true, payment: false, quotation: false, job: false }
  },
  {
    employeeId: 'EMP-TRN-002',
    fullName: 'Sunil Kumar (Transport Executive)',
    name: 'Sunil Kumar',
    email: 'transport.exec@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'EMPLOYEE',
    department: 'TRANSPORT',
    position: 'Logistics & Dispatch Executive',
    phone: '+91 9811223355',
    permissions: { productUpload: false, lead: true, export: false, document: true, task: true, dispatch: true, payment: false, quotation: false, job: false }
  },
  {
    employeeId: 'EMP-DRV-001',
    fullName: 'Ramesh Driver (Fleet Captain)',
    name: 'Ramesh Driver',
    email: 'driver@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'DRIVER',
    department: 'TRANSPORT',
    position: 'Heavy Vehicle Fleet Driver',
    phone: '+91 9811223366',
    permissions: { productUpload: false, lead: false, export: false, document: false, task: false, dispatch: true, payment: false, quotation: false, job: false }
  },
  {
    employeeId: 'EMP-SAL-001',
    fullName: 'Amit Sharma (Sales Manager)',
    name: 'Amit Sharma',
    email: 'sales.manager@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'MANAGER',
    department: 'SALES',
    position: 'Global Sales Manager',
    phone: '+91 9877112233',
    permissions: { productUpload: true, lead: true, export: true, document: true, task: true, dispatch: true, payment: true, quotation: true, job: false }
  },
  {
    employeeId: 'EMP-SAL-002',
    fullName: 'Sumit Joshi (Sales Executive)',
    name: 'Sumit Joshi',
    email: 'sales.exec@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'SALES',
    department: 'SALES',
    position: 'Senior Sales Executive',
    phone: '+91 9877112244',
    permissions: { productUpload: false, lead: true, export: false, document: true, task: true, dispatch: false, payment: false, quotation: true, job: false }
  },
  {
    employeeId: 'EMP-HRM-001',
    fullName: 'Pooja Verma (HR Manager)',
    name: 'Pooja Verma',
    email: 'hr.manager@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'HR_MANAGER',
    department: 'HR',
    position: 'Head of Human Resources',
    phone: '+91 9833445566',
    permissions: { productUpload: false, lead: true, export: true, document: true, task: true, dispatch: false, payment: false, quotation: false, job: true }
  },
  {
    employeeId: 'EMP-HRE-001',
    fullName: 'Ananya Roy (HR Executive)',
    name: 'Ananya Roy',
    email: 'hr.exec@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'HR_EXECUTIVE',
    department: 'HR',
    position: 'Talent Acquisition Specialist',
    phone: '+91 9833445577',
    permissions: { productUpload: false, lead: false, export: false, document: true, task: true, dispatch: false, payment: false, quotation: false, job: true }
  },
  {
    employeeId: 'EMP-FIN-001',
    fullName: 'Manish Gupta (Finance Head)',
    name: 'Manish Gupta',
    email: 'finance.manager@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'MANAGER',
    department: 'FINANCE',
    position: 'Chief Financial Officer',
    phone: '+91 9855667788',
    permissions: { productUpload: false, lead: true, export: true, document: true, task: true, dispatch: false, payment: true, quotation: true, job: false }
  },
  {
    employeeId: 'EMP-ITM-001',
    fullName: 'Manjeet Singh (IT Lead)',
    name: 'Manjeet Singh',
    email: 'it.admin@indiatradeoverseas.com',
    password: UNIFIED_PASSWORD,
    role: 'IT',
    department: 'IT',
    position: 'IT Operations & Infrastructure Lead',
    phone: '+91 9899001122',
    permissions: { productUpload: true, lead: true, export: true, document: true, task: true, dispatch: true, payment: true, quotation: true, job: true }
  }
];

async function seedData() {
  try {
    console.log('Connecting to MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully!');

    for (const acc of testAccounts) {
      const passwordHash = await bcrypt.hash(acc.password, 10);

      // 1. Upsert in User collection
      const userObj = {
        employeeId: acc.employeeId,
        fullName: acc.fullName,
        email: acc.email.toLowerCase(),
        phone: acc.phone,
        passwordHash,
        role: acc.role,
        department: acc.department,
        isActive: true,
        exportPermission: acc.permissions.export,
        productUploadPermission: acc.permissions.productUpload,
        leadPermission: acc.permissions.lead,
        documentPermission: acc.permissions.document,
        taskPermission: acc.permissions.task,
        dispatchPermission: acc.permissions.dispatch,
        paymentPermission: acc.permissions.payment,
        quotationPermission: acc.permissions.quotation,
        jobPermission: acc.permissions.job
      };

      await User.findOneAndUpdate(
        { email: acc.email.toLowerCase() },
        { $set: userObj },
        { upsert: true, new: true }
      );

      // 2. Upsert in Employee collection
      const empObj = {
        employeeId: acc.employeeId,
        name: acc.name,
        email: acc.email.toLowerCase(),
        password: passwordHash,
        phone: acc.phone,
        department: acc.department,
        position: acc.position,
        role: acc.role,
        status: 'ACTIVE',
        joiningDate: new Date(),
        salary: 75000,
        permissions: acc.permissions
      };

      await Employee.findOneAndUpdate(
        { email: acc.email.toLowerCase() },
        { $set: empObj },
        { upsert: true, new: true }
      );

      console.log(`✅ Updated account: ${acc.email} with password "${UNIFIED_PASSWORD}"`);
    }

    console.log('\n🎉 ALL DEPARTMENT TEST ACCOUNTS UPDATED WITH UNIFIED PASSWORD!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seedData();
