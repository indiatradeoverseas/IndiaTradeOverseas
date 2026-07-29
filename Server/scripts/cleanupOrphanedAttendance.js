const mongoose = require('mongoose');
const env = require('../src/config/env');
const Attendance = require('../src/modules/attendance/attendance.model');

async function run() {
  await mongoose.connect(env.MONGO_URI);

  const orphaned = await Attendance.find({ checkInAt: null });
  console.log(`Found ${orphaned.length} malformed attendance record(s) (no checkInAt):`);
  orphaned.forEach((rec) => {
    console.log(`  _id=${rec._id} employeeId=${rec.employeeId} date=${rec.date.toISOString()}`);
  });

  if (orphaned.length > 0) {
    const result = await Attendance.deleteMany({ checkInAt: null });
    console.log(`Deleted ${result.deletedCount} record(s).`);
  }

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Cleanup failed:', error.message);
  process.exit(1);
});
