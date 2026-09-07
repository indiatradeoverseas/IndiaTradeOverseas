const env = require('./env');

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    const allowedOrigins = env.CORS_WHITELIST.map(o => o.trim().replace(/\/+$/, ''));

    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    if (env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-hash', 'x-requested-with']
};

module.exports = corsOptions;
