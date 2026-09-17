const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../modules/users/user.model');
const Employee = require('../modules/employee/employee.model');

async function cleanup() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/indiatradeoverseas';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for cleanup');

    const dummyNames = [/sales staff/i, /^employee$/i, /unassigned/i];
    
    for (const pattern of dummyNames) {
      const resUserFull = await User.deleteMany({ fullName: pattern });
      console.log(`Deleted Users (fullName) matching ${pattern}:`, resUserFull.deletedCount);

      const resUserName = await User.deleteMany({ name: pattern });
      console.log(`Deleted Users (name) matching ${pattern}:`, resUserName.deletedCount);

      const resEmpName = await Employee.deleteMany({ name: pattern });
      console.log(`Deleted Employees (name) matching ${pattern}:`, resEmpName.deletedCount);
    }

    console.log('Cleanup finished successfully');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err);
    process.exit(1);
  }
}

cleanup();
