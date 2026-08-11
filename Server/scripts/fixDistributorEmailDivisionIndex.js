const mongoose = require('mongoose');
const env = require('../src/config/env');
const Distributor = require('../src/modules/distributors/distributor.model');

// One-off migration: Distributor used to enforce a single email-only unique
// index, which let a registration in a second division silently overwrite
// the first division's record instead of creating an independent one (see
// registerDistributor in distributor.controller.js). The schema now declares
// a compound { email, division } unique index instead — this drops the old
// index and creates the new one on an existing database.
//
// Safe to run with data present: the new constraint is strictly looser than
// the old one (at most one document per email already existed, which
// trivially satisfies "at most one per email+division" too), so no existing
// document can violate it.
async function run() {
  await mongoose.connect(env.MONGO_URI);

  const before = await Distributor.collection.indexes();
  console.log('Indexes before:', before.map((i) => `${i.name} ${JSON.stringify(i.key)}`));

  const dropped = await Distributor.syncIndexes();
  console.log('Indexes dropped/rebuilt by syncIndexes:', dropped);

  const after = await Distributor.collection.indexes();
  console.log('Indexes after:', after.map((i) => `${i.name} ${JSON.stringify(i.key)}`));

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Index migration failed:', error.message);
  process.exit(1);
});
