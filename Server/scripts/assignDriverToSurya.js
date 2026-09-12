const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/indiatradeoverseas';

async function assignRahulToSurya() {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const driverUser = await db.collection('employees').findOne({ role: /driver/i });
  console.log('Driver employee in DB:', driverUser);

  const res = await db.collection('leads').updateMany(
    { $or: [{ leadCode: 'LD-1789104355604-3548' }, { customerName: 'Surya' }] },
    {
      $set: {
        driverName: driverUser?.fullName || driverUser?.name || 'Rahul',
        assignedDriverName: driverUser?.fullName || driverUser?.name || 'Rahul',
        driverPhone: '9876543210',
        vehicleNo: 'KA-01-EA-1234'
      }
    }
  );

  console.log('Updated leads with assigned driver Rahul:', res.modifiedCount);
  await mongoose.disconnect();
}

assignRahulToSurya();
