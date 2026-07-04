import React, { useState, useEffect } from 'react';
import { FiPlus, FiTag, FiGlobe, FiFileText, FiImage, FiGrid, FiUpload, FiTrash2, FiEdit2, FiShield } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
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
    return <p className="text-slate-600 leading-relaxed text-xs font-sans font-light whitespace-pre-wrap">{description}</p>;
  }

  return (
    <div className="space-y-1 text-slate-600 font-sans font-light text-xs">
      {lines.map((line, index) => {
        const isHeader = line === line.toUpperCase() && line.length > 4 && !line.includes(':');
        if (isHeader) {
          return (
            <div key={index} className="font-bold text-[#0B2D5B] tracking-wider uppercase border-b border-[#0B2D5B]/10 pb-0.5 mt-2.5 first:mt-0 text-[10px]">
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
            <div key={index} className="flex justify-between items-baseline gap-2 py-0.5 border-b border-[#0B2D5B]/5">
              <span className="text-slate-400 text-[9px] uppercase tracking-wider shrink-0">{key}</span>
              <span className="text-[#0B2D5B] text-[10px] font-semibold text-right">{value}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          const content = line.substring(1).trim();
          return (
            <div key={index} className="flex items-start space-x-1.5 py-0.5">
              <span className="text-[#C99B38] font-bold">&bull;</span>
              <span className="text-slate-600">{content}</span>
            </div>
          );
        }

        return (
          <p key={index} className="leading-relaxed py-0.5">
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
      if (file.size > 1024 * 1024) {
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
    <div className="space-y-8 font-sans antialiased bg-[#FBF7EF] min-h-screen p-1 sm:p-2">
      
      {/* Editorial Header Hub */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#0B2D5B]/10 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-medium text-[#0B2D5B] tracking-wide uppercase">Catalog Ledger Management</h1>
          <p className="text-xs text-[#C99B38] tracking-wider uppercase font-medium mt-0.5">Configure Active Import-Export Commodities Portfolio</p>
        </div>
        {((user?.role && ['ADMIN', 'MANAGER', 'IT', 'SOFTWARE_ENGINEER'].includes(user.role)) || user?.productUploadPermission) && (
          <motion.button
            whileHover={{ y: -0.5 }}
            whileTap={{ y: 0 }}
            onClick={handleOpenUpload}
            className="w-full sm:w-auto bg-[#0B2D5B] hover:bg-[#0B2D5B]/90 text-[#FBF7EF] text-xs font-medium tracking-widest py-3 px-5 rounded-sm flex items-center justify-center space-x-2 shadow-sm uppercase cursor-pointer"
          >
            <FiPlus size={14} className="text-[#C99B38]" />
            <span>Upload Commodity</span>
          </motion.button>
        )}
      </div>

      {/* Main Content Render Engine */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <div className="animate-spin rounded-full h-7 w-8 border-2 border-[#0B2D5B] border-t-transparent"></div>
          <p className="text-[#0B2D5B]/50 text-[10px] uppercase tracking-widest">Parsing Registry Systems...</p>
        </div>
      ) : products.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-[#F5EEDF] text-center py-16 rounded-sm shadow-3xs"
        >
          <FiGrid size={32} className="mx-auto text-[#C99B38] mb-3" />
          <p className="text-slate-400 font-light text-xs">No entries indexed. Transmit "Upload Commodity" to build records.</p>
        </motion.div>
      ) : (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {products.map((product) => {
              const canDelete = user?.role === 'ADMIN' || 
                (product.createdBy && 
                  (product.createdBy === user?._id || 
                   product.createdBy._id === user?._id || 
                   String(product.createdBy) === String(user?._id))
                );

              return (
                <motion.div 
                  key={product._id} 
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                    exit: { opacity: 0, scale: 0.98 }
                  }}
                  layout
                  className="bg-white border border-[#F5EEDF] shadow-3xs rounded-sm p-4 flex flex-col justify-between relative group hover:shadow-md hover:border-[#C99B38]/30 transition-all duration-300"
                >
                  <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.985] pointer-events-none" />
                  
                  <div>
                    {/* Image Window */}
                    <div className="overflow-hidden bg-[#FAF9F5] border border-slate-100 rounded-xs mb-4 h-56 flex items-center justify-center relative">
                      <img
                        src={product.image || product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-101 select-none"
                        loading="lazy"
                      />
                    </div>
                    
                    {/* Item Heading */}
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <h3 className="text-base font-serif font-medium text-[#0B2D5B] tracking-wide break-words line-clamp-2 uppercase flex-1">{product.name}</h3>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#0B2D5B] bg-[#0B2D5B]/5 border border-[#0B2D5B]/10 px-2 py-0.5 rounded-sm shrink-0">
                        {categoryLabels[product.category] || product.category}
                      </span>
                    </div>

                    {/* Technical Parameters Viewport */}
                    <div className="max-h-36 overflow-y-auto pr-1 custom-scrollbar mb-4 border border-slate-50 rounded-sm p-2.5 bg-[#FAF9F5]/60 text-xs">
                      {renderFormattedDescription(product.description)}
                    </div>
                  </div>

                  {/* Footprint Specifications Handoff */}
                  <div className="pt-3 border-t border-[#0B2D5B]/5 flex justify-between items-center text-[11px] font-sans text-slate-400">
                    <span className="flex items-center gap-1">Origin Country: <strong className="text-slate-600 font-medium font-sans">{product.origin}</strong></span>
                    {canDelete && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-2 text-[#0B2D5B] hover:text-[#FBF7EF] hover:bg-[#0B2D5B] rounded border border-[#0B2D5B]/15 bg-white transition-all shadow-3xs cursor-pointer flex items-center justify-center"
                          title="Edit Document"
                        >
                          <FiEdit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="p-2 text-red-700 hover:text-white hover:bg-red-700 rounded border border-red-200 bg-white transition-all shadow-3xs cursor-pointer flex items-center justify-center"
                          title="Purge Entry"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Upload/Edit Modal Overlay */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowModal(false); setEditingProduct(null); }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#FBF7EF] border border-[#C99B38]/30 rounded shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] relative z-10"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C99B38] via-[#E2C275] to-[#C99B38]" />

              {/* Modal Header */}
              <div className="p-5 border-b border-[#0B2D5B]/5 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-base font-serif font-medium text-[#0B2D5B] tracking-wide uppercase">
                    {editingProduct ? 'Modify Ledger Entry' : 'Add New Commodity Node'}
                  </h3>
                  <p className="text-[9px] text-[#C99B38] tracking-widest uppercase font-medium mt-0.5">India Trade Catalog Infrastructure</p>
                </div>
                <button
                  onClick={() => { setShowModal(false); setEditingProduct(null); }}
                  className="text-[#0B2D5B]/40 hover:text-[#0B2D5B] text-sm p-1 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Form Body Stream */}
              <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 font-sans text-xs">
                
                {/* Product Name Input */}
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B]/70 uppercase tracking-widest mb-1">
                    Commodity Title *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#0B2D5B]/30 group-focus-within:text-[#C99B38] transition-colors">
                      <FiTag size={13} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all"
                      placeholder="Enter operational product name"
                    />
                  </div>
                </div>

                {/* Categories & Origin Block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B]/70 uppercase tracking-widest mb-1">
                      Classification *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] focus:outline-none focus:border-[#C99B38] transition-all appearance-none cursor-pointer"
                    >
                      <option value="stone">Natural Stone</option>
                      <option value="white_stone">White Stone</option>
                      <option value="tea">Tea Premium</option>
                      <option value="rice">Premium Rice</option>
                      <option value="fruit">Fresh Fruits</option>
                      <option value="vegetable">Fresh Vegetable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B]/70 uppercase tracking-widest mb-1">
                      Origin Country *
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#0B2D5B]/30 group-focus-within:text-[#C99B38] transition-colors">
                        <FiGlobe size={13} />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.origin}
                        onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all"
                        placeholder="e.g. India"
                      />
                    </div>
                  </div>
                </div>

                {/* Media Resource Pointer Wrapper */}
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B]/70 uppercase tracking-widest mb-1">
                    Image File Pointer Resource *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative group flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#0B2D5B]/30 group-focus-within:text-[#C99B38] transition-colors">
                        <FiImage size={13} />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all"
                        placeholder="Paste secure remote asset URL link"
                      />
                    </div>

                    <label
                      className="bg-[#FAF9F5] hover:bg-[#F5EEDF] text-[#0B2D5B] px-3 rounded border border-[#0B2D5B]/15 flex items-center justify-center gap-1 transition-colors font-medium text-xs cursor-pointer select-none"
                      title="Upload file from local directory"
                    >
                      <FiUpload size={13} className="text-[#C99B38]" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>

                {/* Technical Description Specification Block */}
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B]/70 uppercase tracking-widest mb-1 flex items-center">
                    <FiFileText className="mr-1 text-[#C99B38]" size={13} />
                    Specifications Ledger Data *
                  </label>
                  <textarea
                    required
                    rows="5"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#0B2D5B]/15 rounded bg-white text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] transition-all resize-none font-sans font-light"
                    placeholder="Enter specs line-by-line. Format templates on separate lines:&#10;UPPERCASE HEADER (e.g. CERTIFICATIONS)&#10;Key: Value (e.g. Grade: Premium Clean)"
                  />
                </div>

                {/* Modal Footer Controls */}
                <div className="flex gap-3 pt-4 border-t border-[#0B2D5B]/5 shrink-0">
                  <button
                    type="submit"
                    className="flex-1 bg-[#0B2D5B] hover:bg-[#0B2D5B]/90 text-[#FBF7EF] text-xs font-medium tracking-wide py-3 rounded border border-transparent hover:border-[#C99B38]/30 transition-all uppercase shadow-xs cursor-pointer"
                  >
                    {editingProduct ? 'Commit Ledger Update' : 'Generate Commodity Node'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingProduct(null); }}
                    className="flex-1 bg-[#FAF9F5] hover:bg-[#F5EEDF] border border-[#0B2D5B]/15 text-[#0B2D5B] text-xs font-medium tracking-wide py-3 rounded transition-all uppercase cursor-pointer"
                  >
                    Discard Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}