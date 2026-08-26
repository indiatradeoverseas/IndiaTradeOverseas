const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./src/modules/users/user.model');
const salesService = require('./src/modules/sales/sales.service');

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const user = await User.findOne({ email: /manjeet/i });
    if (user) {
      console.log('Running getMyPerformance for User:', user.fullName);
      try {
        const perf = await salesService.getMyPerformance(user);
        console.log('Performance result:', perf);
      } catch (err) {
        console.error('Error in getMyPerformance:', err);
      }
    } else {
      console.log('User not found.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
