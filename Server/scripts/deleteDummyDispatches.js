const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/indiatradeoverseas';

async function cleanDummyDispatches() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const dispatchesCol = db.collection('dispatches');
    
    const res = await dispatchesCol.deleteMany({
      $or: [
        { customerName: /Lead Cargo Customer|Lead Customer Cargo/i },
        { origin: 'Main Freight Depot' }
      ]
    });
    
    console.log(`Successfully deleted ${res.deletedCount} auto-generated dummy dispatch records.`);
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

cleanDummyDispatches();
