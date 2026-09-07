const env = require('./env');

const securityConfig = {
  rateLimiting: {
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'development' ? 50000 : 20000,
    message: {
      success: false,
      errorCode: 'RATE_LIMITED',
      message: 'Too many requests from this connection, please try again after 15 minutes',
      details: []
    }
  },
  revealRateLimiting: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
      success: false,
      errorCode: 'RATE_LIMITED',
      message: 'Too many data reveal requests. Incident logged.',
      details: []
    }
  },
  accountLockThreshold: 5,
  encryption: {
    algorithm: 'aes-256-cbc',
    key: env.ENCRYPTION_KEY,
    ivLength: 16
  }
};

module.exports = securityConfig;
