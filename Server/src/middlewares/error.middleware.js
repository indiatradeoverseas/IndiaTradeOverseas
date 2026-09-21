const { fail } = require('../utils/response');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Request failed', { method: req.method, path: String(req.originalUrl || req.url || '').split('?')[0], code: err.code || err.name || 'UNKNOWN' });

  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.errorCode || 'SERVER_ERROR';
  const message = statusCode >= 500 ? 'An unexpected error occurred' : (err.message || 'Request failed');
  const details = err.details || [];

  return fail(res, statusCode, errorCode, message, details, req);
}

module.exports = { errorHandler };
