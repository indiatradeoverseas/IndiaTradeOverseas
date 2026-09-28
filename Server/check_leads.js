const mongoose = require('mongoose');
const env = require('./src/config/env');

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const Lead = require('./src/modules/leads/lead.model');

  // Count all leads
  const allCount = await Lead.countDocuments();
  console.log('Total leads in DB:', allCount);

  // Count website TEA/RICE/STONE leads
  const websiteCount = await Lead.countDocuments({
    source: 'WEBSITE',
    productCategory: { $in: ['TEA', 'RICE', 'STONE'] }
  });
  console.log('Website TEA/RICE/STONE leads:', websiteCount);

  // Count AI_AGENT TEA/RICE/STONE leads
  const aiCount = await Lead.countDocuments({
    source: 'AI_AGENT',
    productCategory: { $in: ['TEA', 'RICE', 'STONE'] }
  });
  console.log('AI_AGENT TEA/RICE/STONE leads:', aiCount);

  // Get recent leads (any source)
  const recentLeads = await Lead.find({
    productCategory: { $in: ['TEA', 'RICE', 'STONE'] }
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('leadCode source leadOrigin productCategory customerName createdAt');

  console.log('\nRecent TEA/RICE/STONE leads:');
  recentLeads.forEach(l => {
    console.log(JSON.stringify({
      code: l.leadCode,
      src: l.source,
      origin: l.leadOrigin,
      cat: l.productCategory,
      name: l.customerName,
      date: l.createdAt
    }));
  });

  // Show all distinct sources in DB
  const sources = await Lead.distinct('source');
  console.log('\nAll distinct lead sources in DB:', sources);

  // Show all distinct productCategories in DB
  const cats = await Lead.distinct('productCategory');
  console.log('All distinct productCategories in DB:', cats);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
