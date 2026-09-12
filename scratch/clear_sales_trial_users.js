const path = require('path');
const { connectDB } = require('../Server/src/config/database');
const SalesTrialUser = require('../Server/src/modules/sales-trial/salesTrialUser.model');

async function clearTrialUsers() {
  try {
    await connectDB();
    const result = await SalesTrialUser.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} SalesTrialUser records from MongoDB.`);
    process.exit(0);
  } catch (err) {
    console.error('Error deleting SalesTrialUser records:', err);
    process.exit(1);
  }
}

clearTrialUsers();
