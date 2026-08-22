const router = require('express').Router();
const {
  register,
  login,
  getProfile,
  getNextEmployeeId,
  getListManagers,
  signupEmployee,
  getAllEmployees
} = require('./employee.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');

router.get('/next-id', getNextEmployeeId);
router.get('/list-managers', getListManagers);
router.get('/all', authenticate, rbac('ADMIN', 'MANAGER', 'HR_MANAGER'), getAllEmployees);
router.post('/signup', signupEmployee);

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/me', authenticate, getProfile);

module.exports = router;
