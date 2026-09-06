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
  // Skip rate limiting for static uploads and health check endpoints
  if (req.originalUrl && (req.originalUrl.includes('/uploads/') || req.originalUrl.includes('/health'))) {
    return next();
  }

  const rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
  const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : String(rawIp);
  const now = Date.now();

  let record = ipCache.get(clientIp);
  if (!record || now - record.resetTime > securityConfig.rateLimiting.windowMs) {
    record = {
      hits: 0,
      resetTime: now
    };
    ipCache.set(clientIp, record);
  }

  record.hits += 1;

  if (record.hits > securityConfig.rateLimiting.max) {
    console.warn(`[rateLimiter] BLOCKED ip=${clientIp} hits=${record.hits} max=${securityConfig.rateLimiting.max} path=${req.method} ${req.originalUrl}`);
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
