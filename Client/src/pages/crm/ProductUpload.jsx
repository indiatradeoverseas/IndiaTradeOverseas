import React, { useState, useEffect } from 'react';
import { FiPlus, FiTag, FiDollarSign, FiGlobe, FiFileText, FiImage, FiGrid, FiUpload, FiTrash2, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { productsApi } from '../../api/products';
import { useAuth } from '../../hooks/useAuth';


const imagesByCategory = {
  stone: '/images/natural_stones.png',
  white_stone: '/images/natural_stones.png',
  tea: '/images/premium_tea.png',
  rice: '/images/basmati_rice.png',
  vegetable: '/images/premium_tea.png',
  fruit: '/images/premium_tea.png'
};

const categoryLabels = {
  stone: 'Natural Stone',
  white_stone: 'White Stone',
  tea: 'Tea Premium',
  rice: 'Premium Rice',
  fruit: 'Fresh Fruits',
  vegetable: 'Fresh Vegetable'
};

const renderFormattedDescription = (description) => {
  if (!description) return null;
  
  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length <= 1) {
    return <p className="text-slate-600 leading-relaxed text-xs whitespace-pre-wrap">{description}</p>;
  }

  return (
    <div className="space-y-1 text-slate-600">
      {lines.map((line, index) => {
        const isHeader = line === line.toUpperCase() && line.length > 4 && !line.includes(':');
        if (isHeader) {
          return (
            <div key={index} className="font-bold text-slate-900 tracking-wider uppercase border-b border-slate-100 pb-0.5 mt-2 first:mt-0 text-[10px]">
              {line}
            </div>
          );
        }

        if (line.includes(':') || line.includes(' - ')) {
          const delimiter = line.includes(':') ? ':' : ' - ';
          const parts = line.split(delimiter);
          const key = parts[0].trim();
          const value = parts.slice(1).join(delimiter).trim();
          return (
            <div key={index} className="flex justify-between items-baseline gap-2 py-0.5 border-b border-slate-50">
              <span className="text-slate-500 text-[10px] font-medium shrink-0">{key}</span>
              <span className="text-slate-800 text-[10px] font-semibold text-right">{value}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          const content = line.substring(1).trim();
          return (
            <div key={index} className="flex items-start space-x-1.5 text-[10px] py-0.5">
              <span className="text-indigo-500 font-bold">•</span>
              <span className="text-slate-700">{content}</span>
            </div>
          );
        }

        return (
          <p key={index} className="text-slate-600 text-[10px] leading-relaxed py-0.5">
            {line}
          </p>
        );
      })}
    </div>
  );
};

export default function ProductUpload() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'stone',
    origin: '',
    price: '',
    description: '',
    image: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsApi.getProducts('all');
      if (response.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  const autoGenerateImage = () => {
    const selectedImage = imagesByCategory[formData.category] || imagesByCategory.stone;
    setFormData(prev => ({
      ...prev,
      image: selectedImage
    }));
    toast.success('Assigned cover image matching category!');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // Limit to 1MB
        toast.error('File size is too large! Please upload an image smaller than 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
        toast.success('Local image uploaded and processed successfully!');
      };
      reader.onerror = () => {
        toast.error('Failed to read local file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenUpload = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'stone',
      origin: '',
      price: '',
      description: '',
      image: ''
    });
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      category: product.category || 'stone',
      origin: product.origin || '',
      price: product.price || '',
      description: product.description || '',
      image: product.image || product.imageUrl || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingProduct) {
        response = await productsApi.updateProduct(editingProduct._id, formData);
      } else {
        response = await productsApi.createProduct(formData);
      }
      if (response.success) {
        toast.success(editingProduct ? 'Product updated successfully!' : 'Product uploaded successfully!');
        setShowModal(false);
        setEditingProduct(null);
        setFormData({
          name: '',
          category: 'stone',
          origin: '',
          price: '',
          description: '',
          image: ''
        });
        fetchProducts();
      }
    } catch (error) {
      console.error('Error submitting product:', error);
      toast.error(error.response?.data?.message || `Failed to ${editingProduct ? 'update' : 'create'} product.`);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to permanently delete this product from the catalog?')) {
      try {
        const response = await productsApi.deleteProduct(productId);
        if (response.success) {
          toast.success('Product deleted successfully!');
          fetchProducts();
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error(error.response?.data?.message || 'Failed to delete product.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
          <p className="text-gray-600">Add, edit, or configure import-export catalog items</p>
        </div>
        {(['ADMIN', 'MANAGER', 'IT', 'SOFTWARE_ENGINEER'].includes(user?.role) || user?.productUploadPermission) && (
          <button
            onClick={handleOpenUpload}
            className="btn-primary bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
          >
            <FiPlus size={20} />
            <span>Upload Product</span>
          </button>
        )}
      </div>

      {/* Products list grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-12">
          <FiGrid size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No products uploaded yet. Click "Upload Product" to add the first item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const canDelete = user?.role === 'ADMIN' || 
              (product.createdBy && 
                (product.createdBy === user?._id || 
                 product.createdBy._id === user?._id || 
                 String(product.createdBy) === String(user?._id))
              );

            return (
              <div key={product._id} className="card flex flex-col justify-between hover:shadow-lg transition">
                <div>
                  <img
                    src={product.image || product.imageUrl}
                    alt={product.name}
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                  <div className="flex justify-between items-start mb-2 gap-2 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900 break-all flex-1 min-w-0">{product.name}</h3>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                      {categoryLabels[product.category] || product.category}
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto pr-1.5 custom-scrollbar mb-4 border border-slate-50 rounded-lg p-2 bg-slate-50/50">
                    {renderFormattedDescription(product.description)}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm text-gray-500">
                  <div className="flex flex-col">
                    <span>Origin: <strong>{product.origin}</strong></span>
                  </div>
                  {canDelete && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-xl border border-indigo-200 transition-all duration-150 cursor-pointer active:scale-95 flex items-center justify-center"
                        title="Edit Product"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-xl border border-red-200 transition-all duration-150 cursor-pointer active:scale-95 flex items-center justify-center"
                        title="Delete Product"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-800">
                {editingProduct ? 'Edit Commodity details' : 'Add New Commodity to Catalog'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <div className="relative">
                  <FiTag className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                    placeholder="Enter Your Product Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm cursor-pointer placeholder:text-slate-400"
                  >
                    <option value="">Select Category *</option>
                    <option value="stone">Natural Stone</option>
                    <option value="white_stone">White Stone</option>
                    <option value="tea">Tea Premium</option>
                    <option value="rice">Premium Rice</option>
                    <option value="fruit">Fresh Fruits</option>
                    <option value="vegetable">Fresh Vegetable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Origin Country *
                  </label>
                  <div className="relative">
                    <FiGlobe className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                      placeholder="Enter Your Origin Country"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Image URL or File *
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <FiImage className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                      placeholder="URL or Upload File"
                    />
                  </div>

                  {/* Choose File Styled Label Button */}
                  <label
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 cursor-pointer text-xs font-medium transition active:scale-95"
                    title="Upload image from your device"
                  >
                    <FiUpload className="mr-1" size={14} />
                    File
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center">
                  <FiFileText className="mr-1.5" size={14} />
                  Product Description *
                </label>
                <textarea
                  required
                  rows="6"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                  placeholder="Enter Product Description. Use 'Key: Value' format (e.g. 'Net Weight: 5 kg') and uppercase titles (e.g. 'TERMS & CONDITIONS') on new lines for premium styling."
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}