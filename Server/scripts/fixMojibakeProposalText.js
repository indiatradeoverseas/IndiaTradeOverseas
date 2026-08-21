// One-off backfill: a handful of Proposal documents were created while
// Rice.jsx built its `grade` string using a source file where the em dash
// character had been corrupted into mojibake - the real "—" (U+2014) had
// been decoded as Windows-1252 and re-saved as UTF-8, producing the three
// literal characters U+00E2 U+20AC U+201D ("â€"") instead. The source file
// is now fixed (see Rice.jsx/Stone.jsx/Prakriti.jsx), but proposals created
// before that fix still carry the corrupted text in `grade` (and
// potentially `region`/`lotId`, checked defensively here too). This
// corrects those existing records in place.
//
// Character codes verified directly against a live record before writing
// this script - see conversation history / PR description for how.
//
// Usage:
//   node scripts/fixMojibakeProposalText.js          (dry run, no writes)
//   node scripts/fixMojibakeProposalText.js --apply  (writes changes)
//
// On Windows, mongodb+srv:// DNS SRV lookups can fail locally
// (querySrv ECONNREFUSED) even though the OS resolver works fine - force a
// public DNS server before connecting.
require('dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const env = require('../src/config/env');
const Proposal = require('../src/modules/proposals/proposal.model');

// Mojibake sequence -> real character, using explicit code points to avoid
// any ambiguity from visually-similar characters.
const EM_DASH_MOJIBAKE = 'â€”';
const REAL_EM_DASH = '—';

const fixText = (text) => (text ? text.split(EM_DASH_MOJIBAKE).join(REAL_EM_DASH) : text);

const APPLY = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no writes)'}`);

  const all = await Proposal.find().select('_id division lotId region grade');
  const mismatched = all.filter((p) =>
    fixText(p.lotId) !== p.lotId || fixText(p.region) !== p.region || fixText(p.grade) !== p.grade
  );

  console.log(`Scanned ${all.length} proposal(s). Found ${mismatched.length} with mojibake text.`);

  for (const p of mismatched) {
    const fixedGrade = fixText(p.grade);
    console.log(`- ${p._id} (${p.division}): grade "${p.grade}" -> "${fixedGrade}"`);

    if (APPLY) {
      p.lotId = fixText(p.lotId);
      p.region = fixText(p.region);
      p.grade = fixedGrade;
      await p.save();
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
