const router = require('express').Router();
const {
  register,
  login,
  getProfile,
  getNextEmployeeId,
  getListManagers,
  signupEmployee,
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('./employee.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const rbac = require('../../middlewares/rbac.middleware');

const adminOnly = [authenticate, rbac('ADMIN', 'MANAGER', 'HR_MANAGER')];

router.get('/next-id', getNextEmployeeId);
router.get('/list-managers', getListManagers);
router.get('/all', ...adminOnly, getAllEmployees);
router.post('/signup', signupEmployee);
router.post('/', ...adminOnly, createEmployee);
router.patch('/:id', ...adminOnly, updateEmployee);
router.delete('/:id', ...adminOnly, deleteEmployee);

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/me', authenticate, getProfile);

module.exports = router;
