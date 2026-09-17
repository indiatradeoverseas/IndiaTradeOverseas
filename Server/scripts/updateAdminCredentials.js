const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Admin = require('../src/modules/admin-auth/admin.model');
const User = require('../src/modules/users/user.model');
const Employee = require('../src/modules/employee/employee.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ito_db';
const TARGET_PASSWORD = 'Ramiz2024@@';

const accountsToUpsert = [
  {
    employeeId: 'EMP-FND-001',
    fullName: 'Md Ramiz Raza Khan',
    name: 'Md Ramiz Raza Khan',
    email: 'info@indiatradeoverseas.com',
    role: 'FOUNDER',
    department: 'ADMIN',
    position: 'Founder & Managing Director',
    designation: 'Founder'
  },
  {
    employeeId: 'EMP-CEO-001',
    fullName: 'Jasvinder Singh Chopra',
    name: 'Jasvinder Singh Chopra',
    email: 'ceo@indiatradeoverseas.com',
    role: 'CEO',
    department: 'MANAGEMENT',
    position: 'Chief Executive Officer',
    designation: 'CEO'
  },
  {
    employeeId: 'EMP-ADM-001',
    fullName: 'System Admin',
    name: 'System Admin',
    email: 'admin@indiatradeoverseas.com',
    role: 'ADMIN',
    department: 'ADMIN',
    position: 'Chief Operations Officer',
    designation: 'Administrator'
  }
];

async function updateCredentials() {
  try {
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected successfully!');

    const passwordHash = await bcrypt.hash(TARGET_PASSWORD, 10);

    for (const acc of accountsToUpsert) {
      const emailLower = acc.email.toLowerCase();

      // 1. Admin Collection
      await Admin.findOneAndUpdate(
        { email: emailLower },
        {
          $set: {
            fullName: acc.fullName,
            email: emailLower,
            passwordHash: passwordHash,
            role: acc.role,
            department: acc.department,
            position: acc.position,
            designation: acc.designation,
            isActive: true,
            isEmailVerified: true,
            failedLoginCount: 0,
            lockUntil: null
          }
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Admin collection updated: ${emailLower} (${acc.role})`);

      // 2. User Collection
      await User.findOneAndUpdate(
        { email: emailLower },
        {
          $set: {
            employeeId: acc.employeeId,
            fullName: acc.fullName,
            email: emailLower,
            passwordHash: passwordHash,
            role: acc.role,
            department: acc.department,
            isActive: true,
            exportPermission: true,
            productUploadPermission: true,
            leadPermission: true,
            documentPermission: true,
            taskPermission: true,
            dispatchPermission: true,
            paymentPermission: true,
            quotationPermission: true,
            jobPermission: true
          }
        },
        { upsert: true, new: true }
      );
      console.log(`✅ User collection updated: ${emailLower} (${acc.role})`);

      // 3. Employee Collection
      await Employee.findOneAndUpdate(
        { email: emailLower },
        {
          $set: {
            employeeId: acc.employeeId,
            name: acc.name,
            email: emailLower,
            password: passwordHash,
            department: acc.department,
            position: acc.position,
            role: acc.role,
            status: 'ACTIVE',
            permissions: {
              productUpload: true,
              lead: true,
              export: true,
              document: true,
              task: true,
              dispatch: true,
              payment: true,
              quotation: true,
              job: true
            }
          }
        },
        { upsert: true, new: true }
      );
      console.log(`✅ Employee collection updated: ${emailLower} (${acc.role})`);
    }

    console.log('\n🎉 ALL FOUNDER, CEO & ADMIN CREDENTIALS UPDATED SUCCESSFULLY!');
    console.log(`Password set for all: ${TARGET_PASSWORD}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating credentials:', err);
    process.exit(1);
  }
}

updateCredentials();
