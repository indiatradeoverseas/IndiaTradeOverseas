const mongoose = require('mongoose');
const env = require('../src/config/env');
const Distributor = require('../src/modules/distributors/distributor.model');

// One-off cleanup: run AFTER fixDistributorEmailDivisionIndex.js.
// Deletes every Distributor record for a given email (there may be more
// than one now that records are scoped per division). Use this to clear out
// a record that got corrupted by the pre-fix email-only lookup bug — its
// division/company/isOtpVerified fields reflect whichever division was
// registered last, not any single division cleanly, so it can't be
// salvaged in place; re-register fresh per division after deleting it.
//
// Usage: node scripts/deleteDistributorByEmail.js someone@example.com
async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/deleteDistributorByEmail.js <email>');
    process.exit(1);
  }

  await mongoose.connect(env.MONGO_URI);

  const matches = await Distributor.find({ email: email.toLowerCase().trim() });
  console.log(`Found ${matches.length} record(s) for ${email}:`);
  matches.forEach((rec) => {
    console.log(`  _id=${rec._id} division=${rec.division} company="${rec.company}" createdAt=${rec.createdAt}`);
  });

  if (matches.length > 0) {
    const result = await Distributor.deleteMany({ email: email.toLowerCase().trim() });
    console.log(`Deleted ${result.deletedCount} record(s).`);
  }

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Cleanup failed:', error.message);
  process.exit(1);
});
