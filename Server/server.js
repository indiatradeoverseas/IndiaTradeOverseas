const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const app = require('./src/app');
const env = require('./src/config/env');
const { connectDB } = require('./src/config/database');
const { seedRoles } = require('./src/modules/users/roles/permission.service');

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await seedRoles();
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    } else {
      console.log('Server initialized on Vercel (serverless mode)');
    }
  } catch (error) {
    console.error('Server boot failed:', error.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

startServer();

module.exports = app;
