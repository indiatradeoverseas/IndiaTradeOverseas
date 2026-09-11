const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/indiatradeoverseas';

async function inspectSurya() {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  
  const lead = await db.collection('leads').findOne({
    $or: [{ leadCode: 'LD-1789104355604-3548' }, { customerName: 'Surya' }]
  });
  console.log('--- LEAD SURYA IN MONGODB ---');
  console.log(JSON.stringify(lead, null, 2));

  const dispatches = await db.collection('dispatches').find({}).toArray();
  console.log('--- ALL DISPATCHES IN MONGODB ---');
  console.log(JSON.stringify(dispatches, null, 2));

  await mongoose.disconnect();
}

inspectSurya();
