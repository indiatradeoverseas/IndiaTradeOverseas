const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const app = require('./src/app');
const env = require('./src/config/env');
const { connectDB } = require('./src/config/database');
const { seedRoles } = require('./src/modules/users/roles/permission.service');

const http = require('http');
const socketService = require('./src/services/socket.service');
const PORT = env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await seedRoles();
    if (!process.env.VERCEL) {
      const server = http.createServer(app);
      socketService.init(server);

      server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
          console.log(`Port ${PORT} is busy, retrying in 1s...`);
          setTimeout(() => {
            server.close();
            server.listen(PORT);
          }, 1000);
        } else {
          console.error('Server error:', e);
        }
      });

      const listenServer = server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });

      const gracefulShutdown = () => {
        console.log('Closing HTTP server...');
        listenServer.close(() => {
          console.log('HTTP server closed.');
          process.exit(0);
        });
      };

      process.once('SIGINT', gracefulShutdown);
      process.once('SIGTERM', gracefulShutdown);
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
