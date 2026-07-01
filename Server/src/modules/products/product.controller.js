const productService = require('./product.service');
const { ok, fail } = require('../../utils/response');

async function getProducts(req, res, next) {
  try {
    const filters = {};
    if (req.query.category) {
      filters.category = req.query.category;
    }

    const products = await productService.listProducts(filters);
    return ok(res, { products }, 'Products retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const productData = {
      ...req.body,
      createdBy: req.user._id
    };
    const product = await productService.createProduct(productData);
    return ok(res, { product }, 'Product created successfully', 201, req);
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return fail(res, 404, 'NOT_FOUND', 'Product not found');
    }

    // Allow delete only if user is Admin or user is the creator of the product
    const isAdmin = req.user.role === 'ADMIN';
    const isCreator = product.createdBy && product.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return fail(
        res,
        403,
        'OWNERSHIP_FORBIDDEN',
        'Forbidden: You are not authorized to delete this product'
      );
    }

    await productService.deleteProduct(req.params.id);
    return ok(res, {}, 'Product deleted successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return fail(res, 404, 'NOT_FOUND', 'Product not found');
    }
    return ok(res, { product }, 'Product retrieved successfully', 200, req);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  createProduct,
  deleteProduct,
  getProduct
};
