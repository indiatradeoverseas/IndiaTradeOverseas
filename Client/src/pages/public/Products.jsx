import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiChevronRight, FiBriefcase, FiMapPin, FiCheckCircle } from 'react-icons/fi';
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

  const categories = [
    { value: 'all', label: 'All Portfolios' },
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

  const getWhatsAppLink = (productName) => {
    const text = `Hello India Trade Overseas Team, I would like to request commercial pricing details regarding: ${productName}. Please forward the freight parameters.`;
    return `https://wa.me/918250614079?text=${encodeURIComponent(text)}`;
  };

  const itemCardVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } }
  };

  return (
    <div className="bg-[#FBF7EF] text-slate-900 antialiased min-h-screen selection:bg-amber-100 selection:text-amber-900 font-sans">
      
      {/* Top Divider Accent */}
      <div className="border-t-[3px] border-double border-[#C99B38] w-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header Block */}
        <div className="text-center mb-10">
          <span className="text-[#C99B38] font-medium tracking-[0.25em] text-[10px] uppercase block mb-2 font-sans">Corporate Procurement</span>
          <h1 className="text-3xl sm:text-4xl font-serif text-[#0B2D5B] font-normal tracking-wide uppercase mb-3">Core Commodities Catalog</h1>
          <div className="w-12 h-[1px] bg-[#C99B38] mx-auto mb-2"></div>
          <p className="text-xs italic font-serif text-slate-400">Verified Port-to-Port Sourcing Infrastructure</p>
        </div>

        {/* Filters Panel Matrix */}
        <div className="mb-10 bg-white border border-[#F5EEDF] p-4 shadow-xs rounded-sm">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="flex-1 w-full relative font-sans text-xs">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search institutional products by name, origin or grade specifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-[#FAF9F5]/40 focus:bg-white focus:border-[#C99B38] outline-none transition-all rounded-sm text-slate-800 text-xs"
              />
            </div>
            <div className="w-full md:w-64 font-sans text-xs">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-[#FAF9F5]/40 focus:bg-white focus:border-[#C99B38] outline-none text-slate-700 font-medium rounded-sm transition-all text-xs cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Display Grid Layer */}
        <div className="min-h-[400px]">
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(product => {
                const productDetailUrl = `/products/${product._id || product.id}`;
                
                return (
                  <motion.div 
                    key={product._id || product.id} 
                    variants={itemCardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="bg-white border border-[#F5EEDF] shadow-xs rounded-sm p-4 flex flex-col justify-between relative group hover:shadow-md hover:border-[#C99B38]/30 transition-all duration-300"
                  >
                    <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.985] pointer-events-none"></div>
                    
                    <div>
                      {/* Image Frame Container */}
                      <div className="overflow-hidden bg-[#FAF9F5] border border-slate-100 rounded-xs mb-4 h-56 relative flex items-center justify-center">
                        <img
                          src={product.image || product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-101"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                      </div>

                      {/* Title Header */}
                      <h3 className="text-lg font-serif font-medium text-[#0B2D5B] mb-2.5 leading-snug tracking-wide line-clamp-2">
                        {product.name}
                      </h3>

                      {/* Description Area */}
                      <div className="max-h-36 overflow-y-auto pr-1 custom-scrollbar mb-4 border border-slate-50 rounded-sm p-2.5 bg-[#FAF9F5]/60 text-xs">
                        {renderFormattedDescription(product.description)}
                      </div>
                    </div>

                    {/* Specifications and Primary Action Grid */}
                    <div>
                      <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-4 pt-2 border-t border-slate-50">
                        <span className="flex items-center gap-1">
                          <FiMapPin className="text-[#C99B38]" /> Origin: <strong className="text-slate-600 font-sans normal-case tracking-normal ml-0.5">{product.origin || 'India'}</strong>
                        </span>
                        <span className="text-[#C99B38] font-bold text-[8px] bg-[#FAF9F5] px-2 py-0.5 rounded-sm border border-amber-900/5 flex items-center gap-1">
                          <FiCheckCircle size={8} /> Verified
                        </span>
                      </div>

                      {/* Action Triggers Grid - Structured to prevent link clashing */}
                      <div className="grid grid-cols-12 gap-2 font-sans text-[11px]">
                        <Link 
                          to={productDetailUrl} 
                          className="col-span-8 inline-flex items-center justify-center text-center bg-[#0B2D5B] hover:bg-[#0B2D5B]/90 text-[#FBF7EF] py-2 font-medium tracking-wide transition-colors rounded-sm shadow-xs uppercase text-[10px]"
                        >
                          View Specifications
                        </Link>
                        
                        <a 
                          href={getWhatsAppLink(product.name)}
                          target="_blank" 
                          rel="noreferrer"
                          className="col-span-4 inline-flex items-center justify-center bg-[#FAF9F5] hover:bg-[#F5EEDF] border border-slate-200 text-[#0B2D5B] py-2 font-semibold transition-colors rounded-sm gap-1"
                          title="WhatsApp Enquiry"
                        >
                          <IoLogoWhatsapp size={13} className="text-[#C99B38]" />
                          <span>Quotes</span>
                        </a>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Empty State Configuration */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-white border border-[#F5EEDF] rounded-sm shadow-3xs mt-6">
            <p className="text-slate-400 font-sans font-light text-xs">No commodities found matching the specified evaluation criteria.</p>
          </div>
        )}
      </div>

      {/* Corporate Handoff Footer Seal */}
      <footer className="bg-[#0B2D5B] text-slate-400 py-10 px-4 border-t-2 border-[#C99B38] text-center font-sans mt-8">
        <div className="max-w-3xl mx-auto space-y-3">
          <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-white">
            India Trade Overseas
            <br />
            <span className="text-[#C99B38]">Empowering Trade. Enabling Growth.</span>
          </p>
          <div className="text-[9px] text-slate-400 font-light max-w-2xl mx-auto border-t border-slate-700/40 pt-3 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>

    </div>
  );
}