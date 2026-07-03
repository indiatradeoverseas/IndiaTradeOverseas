import axiosInstance from './axiosInstance';

export const productsApi = {
  async getProducts(category) {
    const params = {};
    if (category && category !== 'all') {
      params.category = category;
    }
    const response = await axiosInstance.get('/products', { params });
    return response.data;
  },

  async createProduct(productData) {
    const response = await axiosInstance.post('/products', productData);
    return response.data;
  },

  async deleteProduct(productId) {
    const response = await axiosInstance.delete(`/products/${productId}`);
    return response.data;
  },

  async updateProduct(productId, productData) {
    const response = await axiosInstance.put(`/products/${productId}`, productData);
    return response.data;
  },

  async getProductById(productId) {
    const response = await axiosInstance.get(`/products/${productId}`);
    return response.data;
  }
};
