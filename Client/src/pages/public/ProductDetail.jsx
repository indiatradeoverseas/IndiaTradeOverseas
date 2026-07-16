import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiGlobe, FiSend, FiInbox, FiCompass, FiShield, FiChevronRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { productsApi } from '../../api/products';

const staticProducts = [
  {
    id: 1,
    origin: 'India',
    name: 'Jharia Jharkhand Coal',
    image: 'https://tiimg.tistatic.com/fp/1/008/230/99-purity-natural-black-coal-for-industrial-use-842.jpg',
    category: 'coal_industrial',
    description: 'Premium High-Calorific Jharia Jharkhand Coal for heavy industrial application.'
  },
  {
    id: 2,
    origin: 'India',
    name: 'Jharkhand Coal',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8IbtVGkg34mUsY_o5fccaQy5iSmtkXjH6J_JDAP6YKN9uR2-Vm_ShuNk&s=10',
    category: 'coal_industrial',
    description: 'Sourced Standard Grade Jharkhand Coal for power and manufacturing works.'
  },
  {
    id: 3,
    origin: 'India',
    name: 'Indonesian Steam Coal - 20mm Grade',
    image: 'https://cpimg.tistatic.com/10890150/b/4/Indonesian-Steam-Coal..jpg',
    category: 'coal_industrial',
    description: 'High Purity Imported Indonesian Steam Coal variety. Sized dimension specifications: 20 Millimeter (mm).'
  }
];

const categoryLabels = {
  stone_construction: 'Stone & Construction Supply',
  clay_consumer: 'Clay & Consumer Products',
  tea: 'Premium Tea',
  rice: 'Bulk Rice',
  food_agriculture: 'Food & Agriculture',
  coal_industrial: 'Coal & Industrial Materials'
};

const renderFormattedDescriptionFull = (description) => {
  if (!description) return null;

  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length <= 1) {
    return <p className="text-[#C5CBD3] leading-relaxed text-xs font-sans font-light opacity-90">{description}</p>;
  }

  return (
    <div className="space-y-3.5 text-[#C5CBD3] font-sans text-xs font-light">
      {lines.map((line, index) => {
        const isHeader = line === line.toUpperCase() && line.length > 4 && !line.includes(':');
        if (isHeader) {
          return (
            <div key={index} className="font-serif font-medium text-[#F2F4F7] tracking-wider border-b border-[#C5CBD3]/20 pb-1 mt-6 first:mt-0 text-xs uppercase">
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
            <div key={index} className="flex justify-between items-baseline gap-4 py-2 border-b border-[#C5CBD3]/10 hover:bg-[#121D29]/40 px-1 transition-colors">
              <span className="text-[#6D7886] text-[10px] uppercase tracking-wider font-medium shrink-0">{key}</span>
              <span className="text-[#F2F4F7] text-xs font-medium text-right">{value}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          const content = line.substring(1).trim();
          return (
            <div key={index} className="flex items-start space-x-2 py-0.5">
              <span className="text-[#6D7886] font-bold">&bull;</span>
              <span className="text-[#C5CBD3] opacity-90">{content}</span>
            </div>
          );
        }

        return (
          <p key={index} className="leading-relaxed py-0.5 opacity-90">
            {line}
          </p>
        );
      })}
    </div>
  );
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const staticItem = staticProducts.find(p => String(p.id) === String(id));
        if (staticItem) {
          setProduct(staticItem);
          setLoading(false);
          return;
        }

        const response = await productsApi.getProductById(id);
        if (response.success && response.data.product) {
          setProduct(response.data.product);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Error fetching product detail:', err);
        const staticFallback = staticProducts.find(p => String(p.id) === String(id));
        if (staticFallback) {
          setProduct(staticFallback);
        } else {
          setError(err.response?.data?.message || 'Failed to load product details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040A12]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C5CBD3] border-t-transparent"></div>
          <p className="text-[#6D7886] text-xs tracking-widest uppercase font-mono">Accessing Ledger Specifications...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040A12] px-4">
        <div className="max-w-sm w-full text-center bg-[#0E1116] border border-[#C5CBD3]/20 p-8 rounded-sm shadow-xl">
          <FiInbox className="mx-auto text-[#6D7886] mb-4" size={36} />
          <h2 className="text-lg font-serif font-normal text-[#F2F4F7] tracking-wide mb-1 uppercase">Dossier Missing</h2>
          <p className="text-xs text-[#6D7886] mb-6">{error || 'The item requested cannot be extracted.'}</p>
          <Link to="/products" className="w-full inline-flex items-center justify-center space-x-2 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#0E1116] text-xs font-semibold tracking-widest py-3 rounded-sm shadow-md uppercase">
            <FiArrowLeft />
            <span>Return to Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  const categoryName = categoryLabels[product.category] || product.category;

  const quoteParams = new URLSearchParams({
    category: product.category || '',
    productName: product.name || ''
  }).toString();

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] min-h-screen pt-32 sm:pt-36 lg:pt-[140px] pb-20 px-6 sm:px-12 lg:px-16 font-sans antialiased overflow-x-hidden relative">
      
      {/* Structural Double-Line Top Border Accent */}
      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full fixed top-0 left-0 z-50"></div>
      
      <div className="max-w-[1480px] mx-auto">
        
        {/* Navigation Breadcrumb Node Layer */}
        <div className="mb-8 flex items-center justify-between border-b border-[#C5CBD3]/10 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center space-x-1.5 text-xs text-[#C5CBD3] hover:text-[#F2F4F7] transition-colors cursor-pointer"
          >
            <FiArrowLeft className="transform group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-semibold uppercase tracking-widest text-[10px]">Back to catalog</span>
          </button>

          <div className="hidden sm:flex items-center space-x-2 text-[10px] tracking-widest uppercase text-[#6D7886] font-medium font-mono">
            <Link to="/" className="hover:text-[#C5CBD3] transition-colors">Home</Link>
            <FiChevronRight size={10} />
            <Link to="/products" className="hover:text-[#C5CBD3] transition-colors">Products</Link>
            <FiChevronRight size={10} />
            <span className="text-[#F2F4F7] font-semibold truncate max-w-[220px] normal-case font-sans tracking-normal">{product.name}</span>
          </div>
        </div>

        {/* Outer Split Layout Geometry Frame */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative">
          
          {/* Left Column: Intelligently Sticky Showcase Area */}
          <div className="lg:col-span-5 lg:sticky lg:top-36 w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#121D29]/40 backdrop-blur-sm border border-[#C5CBD3]/20 p-5 rounded-sm shadow-xl overflow-hidden relative flex flex-col items-center justify-center bg-gradient-to-b from-[#121D29]/60 to-[#0E1116]/40"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6D7886] via-[#C5CBD3] to-[#6D7886]" />
              <div className="w-full h-72 sm:h-96 md:h-[420px] flex items-center justify-center bg-[#040A12]/80 border border-[#C5CBD3]/10 rounded-sm overflow-hidden p-2">
                <img
                  src={product.image || product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-xs select-none filter brightness-95 transition-transform duration-700 ease-out hover:scale-[1.02] hover:brightness-100"
                  loading="eager"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-157857437130-527eed3abbec?auto=format&fit=crop&w=600&q=80';
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* Right Column: Independent Scrolling Stream Specification Sheet Area */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 bg-[#121D29]/40 backdrop-blur-sm border border-[#C5CBD3]/20 shadow-xl rounded-sm p-6 sm:p-8 flex flex-col relative"
          >
            <div className="space-y-6">
              
              {/* Category and Origin Matrix Metadata Tags */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#F2F4F7] bg-[#0E1116] border border-[#C5CBD3]/30 px-3 py-1 rounded-sm shadow-sm">
                  {categoryName || 'Sourcing Commodity'}
                </span>
                <span className="inline-flex items-center text-[9px] font-medium uppercase tracking-widest text-[#C5CBD3] bg-[#0E1116]/60 border border-[#C5CBD3]/15 px-3 py-1 rounded-sm">
                  <FiGlobe className="mr-1.5 text-[#6D7886]" size={11} /> Origin: <strong className="ml-1 text-[#F2F4F7] tracking-normal normal-case font-sans font-medium">{product.origin || 'India'}</strong>
                </span>
              </div>

              {/* Title Header Layout Block */}
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] tracking-wide leading-tight uppercase border-b border-[#C5CBD3]/10 pb-4">
                {product.name}
              </h1>

              {/* Trust & Exporter Regulatory Verification Box */}
              <div className="bg-[#0E1116]/80 rounded-sm p-4 border border-[#C5CBD3]/15 flex items-center justify-between shadow-inner">
                <div className="space-y-0.5">
                  <span className="block text-[9px] font-bold text-[#6D7886] uppercase tracking-widest font-mono">
                    Verification Profile
                  </span>
                  <span className="text-[10px] font-semibold text-[#C5CBD3] uppercase tracking-wider flex items-center">
                    <FiShield className="mr-1.5 text-[#6D7886]" size={12} /> India Trade Registry
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-sm uppercase tracking-widest font-mono">
                    Verified Exporter
                  </span>
                </div>
              </div>

              {/* Product Specifications Section Area */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[10px] font-bold text-[#6D7886] uppercase tracking-widest flex items-center font-mono tracking-widest">
                  <FiCompass className="mr-1.5 text-[#6D7886]" size={13} /> Technical Specifications Ledger
                </span>
                <div className="border border-[#C5CBD3]/10 rounded-sm p-5 sm:p-6 bg-[#040A12]/60 shadow-inner">
                  {renderFormattedDescriptionFull(product.description)}
                </div>
              </div>
            </div>

            {/* Action Trigger Interface Handoff */}
            <div className="mt-10 pt-5 border-t border-[#C5CBD3]/15 flex items-center justify-end">
              <Link
                to={`/quote-request?${quoteParams}`}
                className="w-full sm:w-auto bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#0E1116] text-xs font-semibold tracking-widest uppercase py-4 px-8 rounded-sm flex items-center justify-center space-x-2 text-center transition-all shadow-md group/btn"
              >
                <FiSend size={13} className="text-[#0E1116] group-hover/btn:translate-x-0.5 transition-transform" />
                <span>Request Custom Quote</span>
              </Link>
            </div>

          </motion.div>
        </div>

      </div>
    </div>
  );
}