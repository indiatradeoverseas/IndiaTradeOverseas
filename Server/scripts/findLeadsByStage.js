require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const env = require('../src/config/env');
const Lead = require('../src/modules/leads/lead.model');

(async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const leads = await Lead.find().lean();
  console.log(`Found ${leads.length} total lead(s) in 'leads' collection.`);

  for (const l of leads) {
    console.log({
      _id: l._id,
      leadCode: l.leadCode,
      customerName: l.customerName,
      productCategory: l.productCategory,
      stage: l.stage,
      podFileUrl: l.podFileUrl,
      paymentProofUrl: l.paymentProofUrl
    });
  }

  await mongoose.disconnect();
})();
