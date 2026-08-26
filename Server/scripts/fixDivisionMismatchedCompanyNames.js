// One-off backfill: before the division-aware fallback company name existed,
// Distributor.company (and teaType) defaulted unconditionally to Tea-specific
// values ("Prakriti Tea Partner" / "CTC & Orthodox Bulk"), which leaked onto
// Rice/Stone quick-gate signups that never collected a company name. The
// schema/controller no longer do this (see distributor.controller.js's
// fallbackCompanyName), but records created before that fix still carry the
// stale Tea branding. This corrects those existing records in place.
//
// Usage:
//   node scripts/fixDivisionMismatchedCompanyNames.js          (dry run, no writes)
//   node scripts/fixDivisionMismatchedCompanyNames.js --apply  (writes changes)
//
// On Windows, mongodb+srv:// DNS SRV lookups can fail locally
// (querySrv ECONNREFUSED) even though the OS resolver works fine - force a
// public DNS server before connecting.
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Distributor = require('../src/modules/distributors/distributor.model');

const DIVISION_LABELS = { TEA: 'Tea', RICE: 'Rice', STONE: 'Stone', COAL: 'Coal' };
const fallbackCompanyName = (division) => `Independent ${DIVISION_LABELS[division] || 'Sourcing'} Buyer`;

const APPLY = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no writes)'}`);

  const mismatched = await Distributor.find({
    division: { $ne: 'TEA' },
    $or: [
      { company: 'Prakriti Tea Partner' },
      { teaType: 'CTC & Orthodox Bulk' }
    ]
  });

  console.log(`Found ${mismatched.length} mismatched record(s).`);

  for (const dist of mismatched) {
    const newCompany = fallbackCompanyName(dist.division);
    console.log(
      `- ${dist._id} (${dist.division}, ${dist.email}): company "${dist.company}" -> "${newCompany}", teaType "${dist.teaType}" -> removed`
    );

    if (APPLY) {
      dist.company = newCompany;
      dist.teaType = undefined;
      await dist.save();
    }
  }

  if (!APPLY && mismatched.length > 0) {
    console.log('\nDry run only - re-run with --apply to write these changes.');
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
