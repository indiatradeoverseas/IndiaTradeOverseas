const { fail } = require('../utils/response');

function validateBody(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    const body = req.body || {};

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return fail(
        res,
        400,
        'VALIDATION_FAILED',
        `Validation failed: Missing required fields: [${missing.join(', ')}]`,
        missing.map(f => ({ field: f, message: 'This field is required' })),
        req
      );
    }
    next();
  };
}

module.exports = { validateBody };
