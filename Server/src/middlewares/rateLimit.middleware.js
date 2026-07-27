const securityConfig = require('../config/security');
const { fail } = require('../utils/response');

const ipCache = new Map();


setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipCache.entries()) {
    if (now - data.resetTime > securityConfig.rateLimiting.windowMs) {
      ipCache.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function rateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let record = ipCache.get(ip);
  if (!record || now - record.resetTime > securityConfig.rateLimiting.windowMs) {
    record = {
      hits: 0,
      resetTime: now
    };
    ipCache.set(ip, record);
  }

  record.hits += 1;

  if (record.hits > securityConfig.rateLimiting.max) {
    return fail(
      res,
      429,
      'RATE_LIMITED',
      securityConfig.rateLimiting.message.message,
      [],
      req
    );
  }

  next();
}

module.exports = { rateLimiter };
