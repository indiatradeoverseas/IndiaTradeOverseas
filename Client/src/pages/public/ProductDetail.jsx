import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiGlobe, FiSend, FiInbox, FiCompass, FiShield } from 'react-icons/fi';
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
  stone_construction: 'Stone & Construction',
  clay_consumer: 'Clay & Consumer',
  tea: 'Premium Tea',
  rice: 'Bulk Rice',
  food_agriculture: 'Food & Agriculture',
  coal_industrial: 'Coal & Industrial Mat'
};

const renderFormattedDescriptionFull = (description) => {
  if (!description) return null;

  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length <= 1) {
    return <p className="text-slate-600 leading-relaxed text-xs font-sans font-light">{description}</p>;
  }

  return (
    <div className="space-y-3.5 text-slate-600 font-sans text-xs font-light">
      {lines.map((line, index) => {
        const isHeader = line === line.toUpperCase() && line.length > 4 && !line.includes(':');
        if (isHeader) {
          return (
            <div key={index} className="font-serif font-medium text-[#0B2D5B] tracking-wide border-b border-[#0B2D5B]/10 pb-1 mt-5 first:mt-0 text-sm uppercase">
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
            <div key={index} className="flex justify-between items-baseline gap-4 py-2 border-b border-[#0B2D5B]/5 hover:bg-[#FAF9F5] px-1 transition-colors">
              <span className="text-[#0B2D5B]/50 text-[10px] uppercase tracking-wider font-medium shrink-0">{key}</span>
              <span className="text-[#0B2D5B] text-xs font-semibold text-right">{value}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          const content = line.substring(1).trim();
          return (
            <div key={index} className="flex items-start space-x-2 py-0.5">
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
      <div className="min-h-screen flex items-center justify-center bg-[#FBF7EF]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0B2D5B] border-t-transparent"></div>
          <p className="text-[#0B2D5B]/60 text-xs tracking-wider">Accessing Ledger Specifications...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF7EF] px-4">
        <div className="max-w-sm w-full text-center bg-[#FBF7EF] border border-[#C99B38]/30 p-8 rounded shadow-sm">
          <FiInbox className="mx-auto text-[#C99B38] mb-3" size={36} />
          <h2 className="text-lg font-serif font-semibold text-[#0B2D5B] tracking-wide mb-1">Dossier Missing</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'The item requested cannot be extracted.'}</p>
          <Link to="/products" className="w-full inline-flex items-center justify-center space-x-2 bg-[#0B2D5B] text-[#FBF7EF] text-xs font-medium tracking-wider py-2.5 rounded shadow-xs uppercase">
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
    <div className="bg-[#FBF7EF] min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="max-w-6xl mx-auto">
        
        {/* Navigation Breadcrumb Node */}
        <div className="mb-6 flex items-center justify-between border-b border-[#0B2D5B]/5 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center space-x-1.5 text-xs text-[#0B2D5B]/70 hover:text-[#0B2D5B] transition-colors"
          >
            <FiArrowLeft className="transform group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Back</span>
          </button>

          <div className="hidden sm:flex items-center space-x-1.5 text-[10px] tracking-wide uppercase text-slate-400 font-medium">
            <Link to="/" className="hover:text-slate-600">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-slate-600">Products</Link>
            <span>/</span>
            <span className="text-[#0B2D5B] font-semibold truncate max-w-[180px]">{product.name}</span>
          </div>
        </div>

        {/* Outer Split Container - Disconnects height constraints */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative">
          
          {/* Left Column: Intelligently Sticky to frame window with long specification tables */}
          <div className="md:col-span-5 sticky md:top-24 w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white border border-[#F5EEDF] p-4 rounded-sm shadow-md overflow-hidden relative flex flex-col items-center justify-center bg-gradient-to-b from-[#FAF9F5] to-white"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C99B38] via-[#E2C275] to-[#C99B38]" />
              <img
                src={product.image || product.imageUrl}
                alt={product.name}
                className="w-full max-h-[340px] md:max-h-[380px] object-contain rounded-xs select-none p-1 transition-transform duration-500 hover:scale-[1.01]"
                loading="eager"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80';
                }}
              />
            </motion.div>
          </div>

          {/* Right Column: Independent Scrolling Stream Area */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="md:col-span-7 bg-white border border-[#F5EEDF] shadow-md rounded-sm p-6 sm:p-8 flex flex-col relative"
          >
            <div className="space-y-5">
              
              {/* Category and Origin Matrix Tags */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#0B2D5B] bg-[#0B2D5B]/5 border border-[#0B2D5B]/10 px-2.5 py-1 rounded-sm">
                  {categoryName || 'Sourcing Commodity'}
                </span>
                <span className="inline-flex items-center text-[9px] font-medium uppercase tracking-widest text-slate-500 bg-[#FAF9F5] border border-slate-200/50 px-2.5 py-1 rounded-sm">
                  <FiGlobe className="mr-1 text-[#C99B38]" /> Origin: <strong className="ml-1 text-slate-700 tracking-normal normal-case font-sans">{product.origin || 'India'}</strong>
                </span>
              </div>

              {/* Title Header Layout Block */}
              <h1 className="text-xl sm:text-2xl font-serif font-medium text-[#0B2D5B] tracking-wide leading-tight uppercase border-b border-[#0B2D5B]/5 pb-3">
                {product.name}
              </h1>

              {/* Trust & Exporter Regulatory Verification Box */}
              <div className="bg-[#FAF9F5] rounded-sm p-3.5 border border-[#F5EEDF] flex items-center justify-between shadow-3xs">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Verification Profile
                  </span>
                  <span className="text-[10px] font-bold text-[#0B2D5B] uppercase tracking-wider flex items-center mt-0.5">
                    <FiShield className="mr-1 text-[#C99B38]" size={11} /> India Trade Registry
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-block text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Verified Exporter
                  </span>
                </div>
              </div>

              {/* Product Specifications Section Area */}
              <div className="space-y-2 pt-2">
                <span className="block text-[10px] font-bold text-[#0B2D5B]/60 uppercase tracking-widest flex items-center mb-1">
                  <FiCompass className="mr-1 text-[#C99B38]" /> Technical Specifications Ledger
                </span>
                <div className="border border-[#0B2D5B]/10 rounded-sm p-5 bg-[#FAF9F5]/20 shadow-3xs">
                  {renderFormattedDescriptionFull(product.description)}
                </div>
              </div>
            </div>

            {/* Action Trigger Interface Handoff */}
            <div className="mt-8 pt-4 border-t border-[#0B2D5B]/5 flex items-center justify-end">
              <Link
                to={`/quote-request?${quoteParams}`}
                className="w-full sm:w-auto bg-[#0B2D5B] hover:bg-[#0B2D5B]/90 text-[#FBF7EF] text-xs font-medium tracking-widest uppercase py-3.5 px-6 rounded-sm flex items-center justify-center space-x-2 text-center transition-all shadow-sm uppercase"
              >
                <FiSend size={13} className="text-[#C99B38]" />
                <span>Request Custom Quote</span>
              </Link>
            </div>

          </motion.div>
        </div>

      </div>
    </div>
  );
}