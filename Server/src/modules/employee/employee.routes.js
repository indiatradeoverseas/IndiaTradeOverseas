const router = require('express').Router();
const {
  register,
  login,
  getProfile,
  getNextEmployeeId,
  getListManagers,
  signupEmployee,
  listEmployees,
  getEmployeesCount,
  getEmployeeStatus,
  updateEmployeeStatus
} = require('./employee.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/next-id', getNextEmployeeId);
router.get('/list-managers', getListManagers);
router.post('/signup', signupEmployee);

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/me', authenticate, getProfile);

// Dashboard / Management endpoints
router.get('/', authenticate, listEmployees);
router.get('/count', authenticate, getEmployeesCount);
router.get('/:id/status', authenticate, getEmployeeStatus);
router.post('/:id/status', authenticate, updateEmployeeStatus);

module.exports = router;
