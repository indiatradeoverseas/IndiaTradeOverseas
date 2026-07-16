const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: parseInt(process.env.PORT, 10),
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  JWT_EXPIRY: process.env.JWT_EXPIRY,
  REFRESH_TOKEN_EXPIRY: '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10),
  CORS_WHITELIST: process.env.CORS_WHITELIST ? process.env.CORS_WHITELIST.split(',') : ['https://ito-7u4q.vercel.app/', 'http://localhost:3000', 'http://localhost:5173'],
  DEVICE_VERIFICATION_ENABLED: process.env.DEVICE_VERIFICATION_ENABLED
};

module.exports = env;
