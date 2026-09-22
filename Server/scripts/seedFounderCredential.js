const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Admin = require('../src/modules/admin-auth/admin.model');
const User = require('../src/modules/users/user.model');
const Employee = require('../src/modules/employee/employee.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ito_db';
const UNIFIED_PASSWORD = 'ItoPass123!';

async function seedFounder() {
  try {
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected successfully!');

    const email = 'info@indiatradeoverseas.com';
    const passwordHash = await bcrypt.hash(UNIFIED_PASSWORD, 10);

    const founderData = {
      fullName: 'Md Ramiz Raza Khan',
      name: 'Md Ramiz Raza Khan',
      email: email.toLowerCase(),
      phone: '+91 9876543210',
      passwordHash: passwordHash,
      password: passwordHash,
      role: 'FOUNDER',
      department: 'ADMIN',
      position: 'Founder & Managing Director',
      designation: 'Founder',
      isActive: true,
      isEmailVerified: true
    };

    // 1. Upsert in Admin collection
    const adminDoc = await Admin.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          fullName: founderData.fullName,
          email: founderData.email,
          phone: founderData.phone,
          passwordHash: founderData.passwordHash,
          role: 'FOUNDER',
          department: 'ADMIN',
          position: founderData.position,
          designation: founderData.designation,
          isActive: true,
          isEmailVerified: true
        }
      },
      { upsert: true, new: true }
    );
    console.log('✅ Admin collection updated/created:', adminDoc.email, 'Role:', adminDoc.role);

    // 2. Upsert in User collection
    const userDoc = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          employeeId: 'EMP-FND-001',
          fullName: founderData.fullName,
          email: founderData.email,
          phone: founderData.phone,
          passwordHash: founderData.passwordHash,
          role: 'FOUNDER',
          department: 'ADMIN',
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
    console.log('✅ User collection updated/created:', userDoc.email, 'Role:', userDoc.role);

    // 3. Upsert in Employee collection
    const empDoc = await Employee.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          employeeId: 'EMP-FND-001',
          name: founderData.name,
          email: founderData.email,
          password: founderData.passwordHash,
          phone: founderData.phone,
          department: 'ADMIN',
          position: founderData.position,
          role: 'FOUNDER',
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
    console.log('✅ Employee collection updated/created:', empDoc.email, 'Role:', empDoc.role);

    console.log('\n🎉 FOUNDER CREDENTIAL PERSISTED SUCCESSFULLY!');
    console.log(`Email: ${email}`);
    console.log(`Default Password: ${UNIFIED_PASSWORD}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding founder credential:', err);
    process.exit(1);
  }
}

seedFounder();
