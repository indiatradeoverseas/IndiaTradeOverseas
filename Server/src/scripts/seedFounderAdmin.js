const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const Admin = require('../modules/admin-auth/admin.model');

const FOUNDER = {
  fullName: 'Ramiz Raza Khan',
  email: 'info@indiatradeoverseas.com',
  password: 'Ramiz@123',
  role: 'ADMIN',
  designation: 'Founder'
};

async function run() {
  await mongoose.connect(env.MONGO_URI);

  const existing = await Admin.findOne({ email: FOUNDER.email });
  if (existing) {
    console.log('Founder admin already exists:', existing.email);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(FOUNDER.password, 10);
  const admin = await Admin.create({
    fullName: FOUNDER.fullName,
    email: FOUNDER.email,
    passwordHash,
    role: FOUNDER.role,
    designation: FOUNDER.designation,
    isActive: true,
    isEmailVerified: true
  });

  console.log('Founder admin created:', admin.email, admin._id.toString());
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
