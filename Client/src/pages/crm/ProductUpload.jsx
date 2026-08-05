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
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[var(--crm-ink-soft)]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] block pb-12">
      
      {/* Upper Context Header Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">MODULE 05 / INFRASTRUCTURE</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] uppercase tracking-tight">Catalog Ledger Management</h1>
        </div>
        {((user?.role && ['ADMIN', 'MANAGER', 'IT', 'SOFTWARE_ENGINEER'].includes(user.role)) || user?.productUploadPermission) && (
          <button 
            onClick={handleOpenUpload} 
            className="w-full sm:w-auto bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-[11px] uppercase tracking-widest font-bold h-[42px] px-6 rounded-sm flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer hover:bg-[var(--crm-ink-soft)]"
          >
            <FiPlus size={14} /> <span>Upload Commodity</span>
          </button>
        )}
      </motion.div>

      {/* Main Container Content */}
      <div className="w-full py-8 bg-[var(--crm-bg)]">
        {products.length === 0 ? (
          <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)]/10 border border-[var(--crm-ink-soft)]/15 text-center py-20 rounded-sm">
            <FiGrid size={36} className="mx-auto text-[var(--crm-ink-faint)] opacity-50 mb-4" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-medium">No commodity entries indexed within the registry.</p>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <motion.div 
                key={product._id} 
                variants={blockVariants}
                whileHover={{ y: -4, borderColor: 'rgba(197,203,211,0.35)' }}
                className="bg-[var(--crm-bg-raised)]/30 border border-[var(--crm-ink-soft)]/15 p-5 flex flex-col justify-between rounded-sm shadow-2xl transition-all duration-300 group"
              >
                <div>
                  {/* Container Box for Lazily Loaded Images */}
                  <div className="overflow-hidden bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm mb-4 h-48 flex items-center justify-center shadow-inner relative">
                    <img 
                      src={product.image || product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-102" 
                      loading="lazy" 
                    />
                  </div>
                  
                  {/* Title and Metadata Tag Strip */}
                  <div className="flex justify-between items-start mb-3 gap-3 text-left">
                    <h3 className="text-sm font-serif font-normal text-[var(--crm-heading)] uppercase tracking-wide truncate flex-1">{product.name}</h3>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--crm-heading)] bg-[var(--crm-bg-sunken)]/60 border border-[var(--crm-ink-soft)]/10 px-2 py-0.5 rounded-sm shrink-0">
                      {categoryLabels[product.category] || product.category}
                    </span>
                  </div>
                  
                  {/* Description Box */}
                  <p className="text-xs text-[var(--crm-ink-soft)]/80 leading-relaxed font-light line-clamp-3 bg-[var(--crm-bg-sunken)]/40 p-3 border border-[var(--crm-ink-soft)]/10 h-16 overflow-hidden mb-4 text-left rounded-sm">
                    {product.description}
                  </p>
                </div>
                
                {/* Lower Card Action / Details Footer */}
                <div className="pt-3 border-t border-[var(--crm-ink-soft)]/10 flex justify-between items-center text-[10px] font-mono tracking-wide">
                  <span className="text-[var(--crm-ink-faint)]">Origin Hub: <strong className="text-[var(--crm-ink-soft)] font-medium uppercase">{product.origin || 'Global'}</strong></span>
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