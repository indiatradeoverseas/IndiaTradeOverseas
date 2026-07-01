const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { getProducts, createProduct, deleteProduct, getProduct } = require('./product.controller');
const { fail } = require('../../utils/response');

const checkProductPermission = (req, res, next) => {
  if (
    ['ADMIN', 'MANAGER', 'IT', 'SOFTWARE_ENGINEER'].includes(req.user.role) ||
    req.user.productUploadPermission
  ) {
    return next();
  }
  return fail(
    res,
    403,
    'RBAC_FORBIDDEN',
    'Forbidden: Access restricted to Admin, Manager, IT, Software Engineer or users with product upload permission',
    [],
    req
  );
};

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post(
  '/',
  authenticate,
  checkProductPermission,
  createProduct
);

router.delete(
  '/:id',
  authenticate,
  checkProductPermission,
  deleteProduct
);

module.exports = router;
