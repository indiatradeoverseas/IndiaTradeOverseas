const { maskPhone, maskEmail } = require('../utils/crypto');

function maskOutput(req, res, next) {

  res.maskData = (data, type) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'MANAGER')) {
      return data;
    }
    if (type === 'phone') return maskPhone(data);
    if (type === 'email') return maskEmail(data);
    return data;
  };
  next();
}

module.exports = { maskOutput };
