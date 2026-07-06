import React, { useState, useEffect } from 'react';
import { FiPlus, FiTag, FiGlobe, FiFileText, FiImage, FiGrid, FiUpload, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { productsApi } from '../../api/products';
import { useAuth } from '../../hooks/useAuth';

const categoryLabels = { stone: 'Natural Stone', white_stone: 'White Stone', tea: 'Tea Premium', rice: 'Premium Rice', fruit: 'Fresh Fruits', vegetable: 'Fresh Vegetable' };
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.02 } } };
const blockVariants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };

export default function ProductUpload() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: 'stone', origin: '', price: '', description: '', image: '' });

  useEffect(() => { fetchProducts(); }, []);
  const fetchProducts = async () => {
    try {
      const response = await productsApi.getProducts('all');
      if (response.success) setProducts(response.data.products);
    } catch (error) {
      toast.error('Failed to load products.');
    } finally { setLoading(false); }
  };

  const handleOpenUpload = () => { setEditingProduct(null); setFormData({ name: '', category: 'stone', origin: '', price: '', description: '', image: '' }); setShowModal(true); };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full bg-[#FBF7EF] text-[#0B2D5B] font-sans antialiased m-0 p-0 box-border block">
      <motion.div variants={blockVariants} className="w-full border-b border-[#C99B38]/20 px-4 sm:px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-[#FBF7EF]">
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#C99B38] font-bold block">MODULE 05 / INFRASTRUCTURE</span>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight">Catalog Ledger Management</h1>
        </div>
        {((user?.role && ['ADMIN', 'MANAGER', 'IT', 'SOFTWARE_ENGINEER'].includes(user.role)) || user?.productUploadPermission) && (
          <button onClick={handleOpenUpload} className="w-full sm:w-auto bg-[#0B2D5B] text-[#FBF7EF] text-xs font-bold py-3 px-6 rounded-none flex items-center justify-center space-x-2 uppercase cursor-pointer">
            <FiPlus size={13} className="text-[#C99B38]" /> <span>Upload Commodity</span>
          </button>
        )}
      </motion.div>

      <div className="w-full px-4 sm:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-12 h-[1px] bg-[#C99B38] animate-pulse" /></div>
        ) : products.length === 0 ? (
          <div className="bg-[#0B2D5B]/5 border border-[#C99B38]/15 text-center py-20"><p className="text-xs font-light opacity-60">No entries indexed.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product._id} className="bg-[#0B2D5B]/5 border border-[#C99B38]/15 p-4 flex flex-col justify-between rounded-none transition-all duration-200 hover:border-[#C99B38]">
                <div>
                  <div className="overflow-hidden bg-[#FBF7EF] border border-[#C99B38]/10 rounded-none mb-3 h-48 flex items-center justify-center">
                    <img src={product.image || product.imageUrl} alt={product.name} className="w-full h-full object-cover select-none" loading="lazy" />
                  </div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="text-sm font-serif uppercase tracking-wide truncate flex-1">{product.name}</h3>
                    <span className="text-[8px] font-bold uppercase tracking-widest bg-[#FBF7EF] border border-[#C99B38]/20 px-1.5 py-0.5 shrink-0">
                      {categoryLabels[product.category] || product.category}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 font-light line-clamp-3 bg-[#FBF7EF] p-2 border border-[#C99B38]/10 h-16 overflow-hidden mb-3">{product.description}</p>
                </div>
                <div className="pt-2 border-t border-[#C99B38]/15 flex justify-between items-center text-[10px]">
                  <span className="opacity-60">Origin: <strong className="text-[#0B2D5B] font-bold">{product.origin}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}