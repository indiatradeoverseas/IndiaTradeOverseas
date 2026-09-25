require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function cleanup() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI missing in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB database:', mongoose.connection.name);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const PRESERVE_PATTERN = /^(employees|users|admins|salestrialusers|salestrialchats|saletrial.*|system\..*)$/i;

  const kept = [];
  const deleted = [];

  console.log('\n--- ANALYZING COLLECTIONS ---');
  for (const colInfo of collections) {
    const name = colInfo.name;
    const col = db.collection(name);
    const count = await col.countDocuments();

    if (PRESERVE_PATTERN.test(name)) {
      kept.push({ name, count });
      console.log(`[PRESERVED] ${name}: ${count} documents`);
    } else {
      deleted.push({ name, count });
      console.log(`[TO DELETE] ${name}: ${count} documents`);
    }
  }

  console.log(`\nDeleting data from ${deleted.length} collections...`);
  for (const item of deleted) {
    if (item.count > 0) {
      const res = await db.collection(item.name).deleteMany({});
      console.log(`Cleared collection ${item.name}: ${res.deletedCount} documents deleted.`);
    } else {
      console.log(`Collection ${item.name} is already empty.`);
    }
  }

  console.log('\n--- CLEANUP COMPLETE ---');
  console.log('Preserved collections:');
  for (const k of kept) {
    const finalCount = await db.collection(k.name).countDocuments();
    console.log(`- ${k.name}: ${finalCount} documents remaining`);
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

cleanup().catch((err) => {
  console.error('Error during database cleanup:', err);
  process.exit(1);
});
