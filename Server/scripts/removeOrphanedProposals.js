const mongoose = require('mongoose');
const env = require('../src/config/env');
const Proposal = require('../src/modules/proposals/proposal.model');
const Distributor = require('../src/modules/distributors/distributor.model');

// One-off cleanup: a proposal only stores a *reference* to its distributor
// (distributorId), never a snapshot of their name/company. Distributors
// deleted from the CRM (e.g. via the old Distributors.jsx delete button,
// since removed) leave their proposals behind, which then render as
// "Unknown Distributor" on the Orders pages because the populate() lookup
// comes back empty. This finds and deletes those orphaned proposals.
async function run() {
  await mongoose.connect(env.MONGO_URI);

  const proposals = await Proposal.find();
  const orphaned = [];

  for (const proposal of proposals) {
    const exists = await Distributor.exists({ _id: proposal.distributorId });
    if (!exists) orphaned.push(proposal);
  }

  console.log(`Found ${orphaned.length} orphaned sourcing request(s) (distributor record no longer exists):`);
  orphaned.forEach((p) => {
    console.log(`  _id=${p._id} division=${p.division} lotId=${p.lotId} status=${p.status} distributorId=${p.distributorId} createdAt=${p.createdAt?.toISOString()}`);
  });

  if (orphaned.length > 0) {
    const result = await Proposal.deleteMany({ _id: { $in: orphaned.map((p) => p._id) } });
    console.log(`Deleted ${result.deletedCount} orphaned sourcing request(s).`);
  }

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Cleanup failed:', error.message);
  process.exit(1);
});
