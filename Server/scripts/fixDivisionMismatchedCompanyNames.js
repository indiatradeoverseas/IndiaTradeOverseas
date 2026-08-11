const mongoose = require('mongoose');
const env = require('../src/config/env');
const Distributor = require('../src/modules/distributors/distributor.model');

// One-off backfill: the quick-gate signup (Tea/Rice/Stone) never collects a
// company name, and the schema used to default it to "Prakriti Tea Partner"
// regardless of division, so pre-existing Rice/Stone distributor records can
// show a Tea-branded company name. That default has been removed going
// forward (see distributor.model.js / distributor.controller.js); this
// backfills the records already affected.
const DIVISION_LABELS = { TEA: 'Tea', RICE: 'Rice', STONE: 'Stone', COAL: 'Coal' };
const fallbackCompanyName = (division) => `Independent ${DIVISION_LABELS[division] || 'Sourcing'} Buyer`;

async function run() {
  await mongoose.connect(env.MONGO_URI);

  const mismatched = await Distributor.find({
    division: { $ne: 'TEA' },
    $or: [
      { company: 'Prakriti Tea Partner' },
      { teaType: 'CTC & Orthodox Bulk' }
    ]
  });

  console.log(`Found ${mismatched.length} distributor record(s) with Tea-branded defaults outside the Tea division:`);
  mismatched.forEach((rec) => {
    console.log(`  _id=${rec._id} name=${rec.name} division=${rec.division} company="${rec.company}" teaType="${rec.teaType}"`);
  });

  for (const rec of mismatched) {
    if (rec.company === 'Prakriti Tea Partner') rec.company = fallbackCompanyName(rec.division);
    if (rec.teaType === 'CTC & Orthodox Bulk') rec.teaType = undefined;
    await rec.save();
  }

  console.log(`Updated ${mismatched.length} record(s).`);
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Backfill failed:', error.message);
  process.exit(1);
});
