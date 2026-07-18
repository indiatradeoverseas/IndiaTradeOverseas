import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTag, FiGlobe, FiFileText, FiImage, FiGrid, FiUpload, FiTrash2, FiEdit2, FiX } from 'react-icons/fi';
import { productsApi } from '../../api/products';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const categoryLabels = { 
  stone: 'Natural Stone', 
  white_stone: 'White Stone', 
  tea: 'Tea Premium', 
  rice: 'Premium Rice', 
  fruit: 'Fresh Fruits', 
  vegetable: 'Fresh Vegetable' 
};

// Staggered layout entrance configurations
const containerVariants = { 
  hidden: { opacity: 0 }, 
  visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.1 } } 
};

const blockVariants = { 
  hidden: { opacity: 0, y: 12, scale: 0.99 }, 
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } } 
};

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
      if (response.success) setProducts(response.data.products || []);
    } catch (error) {
      toast.error('Failed to load products.');
    } finally { 
      setLoading(false); 
    }
  };

  const handleOpenUpload = () => { 
    setEditingProduct(null); 
    setFormData({ name: '', category: 'stone', origin: '', price: '', description: '', image: '' }); 
    setShowModal(true); 
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[#C5CBD3]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[#0E1116] text-[#C5CBD3] block pb-12">
      
      {/* Upper Context Header Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-[#040A12]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">MODULE 05 / INFRASTRUCTURE</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] uppercase tracking-tight">Catalog Ledger Management</h1>
        </div>
        {((user?.role && ['ADMIN', 'MANAGER', 'IT', 'SOFTWARE_ENGINEER'].includes(user.role)) || user?.productUploadPermission) && (
          <button 
            onClick={handleOpenUpload} 
            className="w-full sm:w-auto bg-[#F2F4F7] text-[#040A12] text-[11px] uppercase tracking-widest font-bold h-[42px] px-6 rounded-sm flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer hover:bg-[#C5CBD3]"
          >
            <FiPlus size={14} /> <span>Upload Commodity</span>
          </button>
        )}
      </motion.div>

      {/* Main Container Content */}
      <div className="w-full py-8 bg-[#0E1116]">
        {products.length === 0 ? (
          <motion.div variants={blockVariants} className="bg-[#121D29]/10 border border-[#C5CBD3]/15 text-center py-20 rounded-sm">
            <FiGrid size={36} className="mx-auto text-[#6D7886] opacity-50 mb-4" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#6D7886] font-medium">No commodity entries indexed within the registry.</p>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <motion.div 
                key={product._id} 
                variants={blockVariants}
                whileHover={{ y: -4, borderColor: 'rgba(197,203,211,0.35)' }}
                className="bg-[#121D29]/30 border border-[#C5CBD3]/15 p-5 flex flex-col justify-between rounded-sm shadow-2xl transition-all duration-300 group"
              >
                <div>
                  {/* Container Box for Lazily Loaded Images */}
                  <div className="overflow-hidden bg-[#040A12] border border-[#C5CBD3]/10 rounded-sm mb-4 h-48 flex items-center justify-center shadow-inner relative">
                    <img 
                      src={product.image || product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-102" 
                      loading="lazy" 
                    />
                  </div>
                  
                  {/* Title and Metadata Tag Strip */}
                  <div className="flex justify-between items-start mb-3 gap-3 text-left">
                    <h3 className="text-sm font-serif font-normal text-[#F2F4F7] uppercase tracking-wide truncate flex-1">{product.name}</h3>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#F2F4F7] bg-[#040A12]/60 border border-[#C5CBD3]/10 px-2 py-0.5 rounded-sm shrink-0">
                      {categoryLabels[product.category] || product.category}
                    </span>
                  </div>
                  
                  {/* Description Box */}
                  <p className="text-xs text-[#C5CBD3]/80 leading-relaxed font-light line-clamp-3 bg-[#040A12]/40 p-3 border border-[#C5CBD3]/10 h-16 overflow-hidden mb-4 text-left rounded-sm">
                    {product.description}
                  </p>
                </div>
                
                {/* Lower Card Action / Details Footer */}
                <div className="pt-3 border-t border-[#C5CBD3]/10 flex justify-between items-center text-[10px] font-mono tracking-wide">
                  <span className="text-[#6D7886]">Origin Hub: <strong className="text-[#C5CBD3] font-medium uppercase">{product.origin || 'Global'}</strong></span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Creation / Upload Modal Sheet Placeholder Interface */}
      {/* You can inject your sub-form element layout inside this block safely using your state parameters */}
    </motion.div>
  );
}