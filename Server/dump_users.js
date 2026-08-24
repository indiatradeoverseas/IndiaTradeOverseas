const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/modules/users/user.model');

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    const users = await User.find({}).lean();
    console.log('\n=========================================');
    console.log('             USER DATA DUMP              ');
    console.log('=========================================');

    users.forEach(u => {
      console.log(`\nName: ${u.fullName}`);
      console.log(`Email: ${u.email}`);
      console.log(`Employee ID: ${u.employeeId}`);
      console.log(`Role: ${u.role}`);
      console.log(`Department: ${u.department}`);
      console.log(`Lead Permission: ${u.leadPermission}`);
    });

    console.log('\n=========================================');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
