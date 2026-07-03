import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiCopy, FiChevronRight } from 'react-icons/fi';
import { IoLogoWhatsapp } from 'react-icons/io';
import { productsApi } from '../../api/products';
import toast from 'react-hot-toast';

const renderFormattedDescription = (description) => {
  if (!description) return null;
  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length <= 1) {
    return <p className="text-slate-600 leading-relaxed text-xs font-sans font-light">{description}</p>;
  }

  return (
    <div className="space-y-1.5 text-slate-600 font-sans text-xs font-light">
      {lines.map((line, index) => {
        const isHeader = line === line.toUpperCase() && line.length > 4 && !line.includes(':');
        if (isHeader) {
          return (
            <div key={index} className="font-bold text-[#0B2D5B] tracking-wider uppercase border-b border-slate-100 pb-0.5 mt-3 first:mt-0 text-[10px]">
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
              <span className="text-slate-400 text-[10px] uppercase tracking-wider shrink-0">{key}</span>
              <span className="text-slate-800 text-[11px] font-semibold text-right">{value}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          return (
            <div key={index} className="flex items-start space-x-1.5 py-0.5">
              <span className="text-[#C99B38] font-bold">&bull;</span>
              <span className="text-slate-700">{line.substring(1).trim()}</span>
            </div>
          );
        }

        return (
          <p key={index} className="text-slate-600 leading-relaxed py-0.5">
            {line}
          </p>
        );
      })}
    </div>
  );
};

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [dbProducts, setDbProducts] = useState([]);

  useEffect(() => {
    const fetchDbProducts = async () => {
      try {
        const response = await productsApi.getProducts('all');
        if (response.success) {
          // Storing directly from backend safely without disrupting the lifecycle
          setDbProducts(response.data.products);
        }
      } catch (error) {
        console.error('Error fetching database products:', error);
      }
    };
    fetchDbProducts();
  }, []);

  const staticProducts = [
    {
      id: "static_1",
      origin: 'India',
      name: 'Jharia Jharkhand Coal',
      image: 'https://tiimg.tistatic.com/fp/1/008/230/99-purity-natural-black-coal-for-industrial-use-842.jpg',
      category: 'coal_industrial',
      description: 'Premium High-Calorific Jharia Jharkhand Coal for heavy industrial application.'
    },
    {
      id: "static_2",
      origin: 'India',
      name: 'Jharkhand Coal',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8IbtVGkg34mUsY_o5fccaQy5iSmtkXjH6J_JDAP6YKN9uR2-Vm_ShuNk&s=10',
      category: 'coal_industrial',
      description: 'Sourced Standard Grade Jharkhand Coal for power and manufacturing works.'
    },
    {
      id: "static_3",
      origin: 'India',
      name: 'Indonesian Steam Coal - 20mm Grade',
      image: 'https://cpimg.tistatic.com/10890150/b/4/Indonesian-Steam-Coal..jpg',
      category: 'coal_industrial',
      description: 'High Purity Imported Indonesian Steam Coal variety. Sized dimension specifications: 20 Millimeter (mm).'
    }
  ];

  // Updated Label configuration to display "All Portfolios" as requested
  const categories = [
    { value: 'all', label: 'All Products' },
    { value: 'food_agriculture', label: 'Food & Agriculture' },
    { value: 'coal_industrial', label: 'Coal & Industrial' },
    { value: 'stone_construction', label: 'Stone & Construction' },
    { value: 'transport_logistics', label: 'ITO Transport' },
    { value: 'clay_consumer', label: 'Clay & Consumer' }
  ];

  const products = [...dbProducts, ...staticProducts];

  const filteredProducts = products.filter(product => {
    const name = product.name || '';
    const description = product.description || '';
    const origin = product.origin || '';
    const prodCat = product.category || '';

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      origin.toLowerCase().includes(searchTerm.toLowerCase());

    if (category === 'all') return matchesSearch;

    // Direct and flexible fallback matching mapping logic to prevent database filtering breakdown
    if (category === 'stone_construction') {
      return matchesSearch && (prodCat === 'stone_construction' || prodCat === 'stone' || prodCat === 'natural_stones');
    }
    if (category === 'food_agriculture') {
      return matchesSearch && (prodCat === 'food_agriculture' || prodCat === 'rice' || prodCat === 'tea' || prodCat === 'fruit' || prodCat === 'vegetable');
    }
    if (category === 'coal_industrial') {
      return matchesSearch && (prodCat === 'coal_industrial' || prodCat === 'coal');
    }

    return matchesSearch && prodCat === category;
  });

  const handleCopyEnquiry = (productName, categoryVal) => {
    const textBlock = `India Trade Overseas Procurement Query\nProduct Name: ${productName}\nCategory Classification: ${categoryVal || 'General'}\nStatus: Request for CIF/FOB pricing metrics.`;
    navigator.clipboard.writeText(textBlock)
      .then(() => toast.success('Copied to Clipboard'))
      .catch(() => toast.error('Clipboard action disabled'));
  };

  const getWhatsAppLink = (productName) => {
    const text = `Hello India Trade Overseas Team, I would like to request commercial pricing details regarding: ${productName}. Please forward the freight and documentation parameters.`;
    return `https://wa.me/918250614079?text=${encodeURIComponent(text)}`;
  };

  // Motion Variants configuration
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemCardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  return (
    <div className="bg-[#FBF7EF] text-slate-900 antialiased min-h-screen selection:bg-amber-100 selection:text-amber-900">
      
      <div className="border-t-[3px] border-double border-[#C99B38] w-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Header Block */}
        <div className="text-center mb-12">
          <span className="text-[#C99B38] font-medium tracking-[0.25em] text-xs uppercase block mb-3 font-sans">Corporate Catalogs</span>
          <h1 className="text-4xl sm:text-5xl font-serif text-[#0B2D5B] font-normal tracking-tight mb-4">Our Core Commodities</h1>
          <div className="w-16 h-[1px] bg-[#C99B38] mx-auto mb-3"></div>
          <p className="text-sm italic font-serif text-slate-500">Empowering Trade. Enabling Growth.</p>
        </div>

        {/* Filters Panel Matrix */}
        <div className="mb-12 bg-white border border-[#F5EEDF] p-5 shadow-sm rounded-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full relative font-sans text-xs">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search institutional products by name, origin or grade specifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/40 focus:bg-white focus:border-amber-600 outline-none transition-all rounded-sm text-slate-800"
              />
            </div>
            <div className="w-full md:w-72 font-sans text-xs">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/40 focus:bg-white focus:border-amber-600 outline-none text-slate-700 font-semibold rounded-sm transition-all"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Display Grid Layer */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <AnimatePresence mode="popLayout">
            {filteredProducts.map(product => {
              const productDetailUrl = `/products/${product._id || product.id}`;
              const quoteParams = new URLSearchParams({
                category: product.category || '',
                productName: product.name || ''
              }).toString();
              const quoteUrl = `/quote-request?${quoteParams}`;

              return (
                <motion.div 
                  key={product._id || product.id} 
                  variants={itemCardVariants}
                  layout
                  className="bg-white border border-[#F5EEDF] shadow-sm rounded-sm p-4 flex flex-col justify-between relative group hover:shadow-md hover:border-[#C99B38]/30 transition-all duration-300"
                >
                  <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.985] pointer-events-none"></div>
                  
                  <div>
                    {/* Image Container Block */}
                    <Link to={productDetailUrl} className="block overflow-hidden bg-slate-50 border border-slate-100 rounded-xs mb-4 h-64 relative">
                      <img
                        src={product.image || product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transform group-hover:scale-102 transition-transform duration-500 grayscale-[10%]"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    </Link>

                    <h3 className="text-xl font-serif font-medium text-[#0B2D5B] mb-3 leading-snug tracking-tight hover:text-[#C99B38] transition-colors line-clamp-2">
                      <Link to={productDetailUrl}>
                        {product.name}
                      </Link>
                    </h3>

                    {/* Description Area */}
                    <div className="max-h-44 overflow-y-auto pr-1.5 custom-scrollbar mb-4 border border-slate-50 rounded-sm p-3 bg-[#FAF9F5]/50">
                      {renderFormattedDescription(product.description)}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-4 pt-2 border-t border-slate-50">
                      <span>Origin: <strong className="text-slate-600 font-sans normal-case tracking-normal">{product.origin || 'India'}</strong></span>
                      <span className="text-[#C99B38] font-bold text-[9px] bg-[#FAF9F5] px-2 py-0.5 rounded-full border border-amber-900/5">Verified</span>
                    </div>

                    {/* Action Interface Grid Matrix */}
                    <div className="space-y-2 font-sans text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <Link to={productDetailUrl} className="w-full inline-flex items-center justify-center text-center bg-[#FAF9F5] hover:bg-[#F5EEDF] border border-slate-100 text-[#0B2D5B] py-2.5 font-bold transition-all rounded-sm">
                          View Details
                        </Link>
                        <Link to={quoteUrl} className="w-full inline-flex items-center justify-center text-center bg-[#C99B38] hover:bg-amber-600 text-white py-2.5 font-bold transition-all rounded-sm shadow-2xs">
                          Request Quote
                        </Link>
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        <button 
                          onClick={() => handleCopyEnquiry(product.name, product.category)}
                          className="col-span-4 inline-flex items-center justify-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 py-2 rounded-sm font-medium transition-colors"
                        >
                          <FiCopy size={12} className="text-[#C99B38]" /> Copy Enquiry
                        </button>
                        
                        <a 
                          href={getWhatsAppLink(product.name)}
                          target="_blank" 
                          rel="noreferrer"
                          className="col-span-1 inline-flex items-center justify-center bg-[#102F60] hover:bg-[#0B2D5B] text-white py-2 rounded-sm transition-colors"
                          title="WhatsApp Enquiry"
                        >
                          <IoLogoWhatsapp size={14} className="text-[#C99B38]" />
                        </a>
                      </div>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-white border border-[#F5EEDF] rounded-sm shadow-2xs mt-8">
            <p className="text-slate-400 font-sans font-light text-sm">No commodities found matching the specified evaluation criteria.</p>
          </div>
        )}
      </div>

      {/* Corporate Handoff Footer Notice Bar */}
      <footer className="bg-[#0B2D5B] text-slate-400 py-12 px-4 border-t-2 border-[#C99B38] text-center font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">
            India Trade Overseas
            <br />
            Empowering Trade. Enabling Growth.
          </p>
          <div className="text-[10px] text-slate-400 font-light max-w-2xl mx-auto border-t border-slate-700/50 pt-4 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>

    </div>
  );
}