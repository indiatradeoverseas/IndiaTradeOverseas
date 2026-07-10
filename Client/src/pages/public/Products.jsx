import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMapPin, FiCheckCircle } from 'react-icons/fi';
import { productsApi } from '../../api/products';

const renderFormattedDescription = (description) => {
  if (!description) return null;
  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length <= 1) {
    return <p className="text-[#0C1F3F]/70 leading-relaxed text-xs font-sans font-light">{description}</p>;
  }

  return (
    <div className="space-y-1.5 text-[#0C1F3F]/70 font-sans text-xs font-light text-left">
      {lines.map((line, index) => {
        const isHeader = line === line.toUpperCase() && line.length > 4 && !line.includes(':');
        if (isHeader) {
          return <div key={index} className="font-bold text-[#0C1F3F] tracking-wider uppercase border-b border-[#8FAADC]/10 pb-0.5 mt-3 first:mt-0 text-[10px]">{line}</div>;
        }

        if (line.includes(':') || line.includes(' - ')) {
          const delimiter = line.includes(':') ? ':' : ' - ';
          const parts = line.split(delimiter);
          const key = parts[0].trim();
          const value = parts.slice(1).join(delimiter).trim();
          return (
            <div key={index} className="flex justify-between items-baseline gap-2 py-0.5 border-b border-[#8FAADC]/10">
              <span className="text-[#8FAADC] text-[10px] uppercase tracking-wider shrink-0">{key}</span>
              <span className="text-[#0C1F3F] text-[11px] font-bold text-right">{value}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          return (
            <div key={index} className="flex items-start space-x-1.5 py-0.5">
              <span className="text-[#2F5DA8] font-bold">&bull;</span>
              <span className="text-[#0C1F3F]/80">{line.substring(1).trim()}</span>
            </div>
          );
        }

        return <p key={index} className="text-[#0C1F3F]/70 leading-relaxed py-0.5">{line}</p>;
      })}
    </div>
  );
};

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDbProducts = async () => {
      try {
        setLoading(true);
        const response = await productsApi.getProducts('all');
        if (response.success) setDbProducts(response.data.products);
      } catch (error) { console.error('Database connection error:', error); }
      finally { setLoading(false); }
    };
    fetchDbProducts();
  }, []);

  const staticProducts = [
    { id: "static_1", origin: 'India', name: 'Jharia Jharkhand Coal', image: 'https://tiimg.tistatic.com/fp/1/008/230/99-purity-natural-black-coal-for-industrial-use-842.jpg', category: 'coal_industrial', description: 'Premium High-Calorific Jharia Jharkhand Coal for heavy industrial application.' },
    { id: "static_2", origin: 'India', name: 'Jharkhand Coal', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8IbtVGkg34mUsY_o5fccaQy5iSmtkXjH6J_JDAP6YKN9uR2-Vm_ShuNk&s=10', category: 'coal_industrial', description: 'Sourced Standard Grade Jharkhand Coal for power and manufacturing works.' },
    { id: "static_3", origin: 'India', name: 'Indonesian Steam Coal - 20mm Grade', image: 'https://cpimg.tistatic.com/10890150/b/4/Indonesian-Steam-Coal..jpg', category: 'coal_industrial', description: 'High Purity Imported Indonesian Steam Coal variety. Sized dimension specifications: 20 Millimeter (mm).' }
  ];

  const categories = [
    { value: 'all', label: 'All Commodity Tiers' },
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
    if (category === 'stone_construction') return matchesSearch && (prodCat === 'stone_construction' || prodCat === 'stone' || prodCat === 'natural_stones');
    if (category === 'food_agriculture') return matchesSearch && (prodCat === 'food_agriculture' || prodCat === 'rice' || prodCat === 'tea' || prodCat === 'fruit' || prodCat === 'vegetable');
    if (category === 'coal_industrial') return matchesSearch && (prodCat === 'coal_industrial' || prodCat === 'coal');

    return matchesSearch && prodCat === category;
  });

  if (loading) {
    return (
      <div className="bg-[#ffffff] text-[#0C1F3F] antialiased min-h-screen font-sans">
        <div className="border-t-[3px] border-double border-[#8FAADC] w-full"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          
          {/* Header Skeleton */}
          <div className="text-center mb-12 space-y-3 animate-pulse">
            <div className="w-24 h-2 bg-[#2F5DA8]/20 mx-auto rounded"></div>
            <div className="w-64 sm:w-96 h-8 bg-[#0C1F3F]/10 mx-auto rounded"></div>
            <div className="w-12 h-[2px] bg-[#2F5DA8]/30 mx-auto mt-2"></div>
          </div>

          {/* Filters Skeleton */}
          <div className="mb-10 bg-[#ffffff] border border-[#8FAADC]/20 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center animate-pulse">
            <div className="flex-1 w-full h-9 bg-[#0C1F3F]/5 rounded-md"></div>
            <div className="w-full md:w-64 h-9 bg-[#0C1F3F]/5 rounded-md"></div>
          </div>

          {/* Shimmer Grid Structure */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-[#ffffff] border border-[#8FAADC]/20 rounded-xl p-4 flex flex-col justify-between h-[450px] animate-pulse">
                <div>
                  {/* Image Placeholder */}
                  <div className="bg-[#0C1F3F]/5 rounded-lg mb-4 h-52 w-full"></div>
                  {/* Title Placeholder */}
                  <div className="h-4 bg-[#0C1F3F]/10 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-[#0C1F3F]/10 rounded w-1/2 mb-4"></div>
                  {/* Description Box Placeholder */}
                  <div className="border border-[#8FAADC]/10 rounded-lg p-2.5 space-y-2">
                    <div className="h-2 bg-[#0C1F3F]/5 rounded w-full"></div>
                    <div className="h-2 bg-[#0C1F3F]/5 rounded w-5/6"></div>
                    <div className="h-2 bg-[#0C1F3F]/5 rounded w-4/5"></div>
                  </div>
                </div>
                {/* Footer Metadata & Action Buttons */}
                <div>
                  <div className="flex justify-between items-center mb-4 pt-4 border-t border-[#8FAADC]/10">
                    <div className="h-2 bg-[#0C1F3F]/5 rounded w-1/3"></div>
                    <div className="h-4 bg-[#0C1F3F]/5 rounded w-16"></div>
                  </div>
                  <div className="w-full h-11 bg-[#2F5DA8]/20 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#ffffff] text-[#0C1F3F] antialiased min-h-screen selection:bg-[#8FAADC]/30 selection:text-[#0C1F3F] font-sans">
      <div className="border-t-[3px] border-double border-[#8FAADC] w-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        <div className="text-center mb-12 space-y-1">
          <span className="text-[#2F5DA8] font-bold tracking-[0.25em] text-[10px] uppercase block">Direct Allocation</span>
          <h1 className="text-3xl sm:text-4xl font-serif text-[#0C1F3F] font-bold tracking-wide uppercase">Core Commodities Catalog</h1>
          <div className="w-12 h-[2px] bg-[#2F5DA8] mx-auto mt-2"></div>
        </div>

        {/* Filters */}
        <div className="mb-10 bg-[#ffffff] border border-[#8FAADC]/20 p-4 shadow-xs rounded-xl flex flex-col md:flex-row gap-3 items-center">
          <div className="flex-1 w-full relative font-sans text-xs">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8FAADC]" size={13} />
            <input type="text" placeholder="Search institutional products by name, origin or grade specifications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-[#8FAADC]/30 bg-[#ffffff] focus:border-[#2F5DA8] outline-none transition-all rounded-md text-[#0C1F3F] text-xs" />
          </div>
          <div className="w-full md:w-64 font-sans text-xs">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2.5 border border-[#8FAADC]/30 bg-[#ffffff] focus:border-[#2F5DA8] outline-none text-[#0C1F3F] font-bold rounded-md transition-all text-xs cursor-pointer">{categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}</select>
          </div>
        </div>

        {/* Grid */}
        <div className="min-h-[400px]">
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(product => (
                <motion.div key={product._id || product.id} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }} initial="hidden" animate="visible" exit={{ opacity: 0, scale: 0.98 }} layout className="bg-[#ffffff] border border-[#8FAADC]/20 shadow-xs rounded-xl p-4 flex flex-col justify-between group hover:shadow-md hover:border-[#2F5DA8] transition-all duration-300">
                  <div>
                    <div className="overflow-hidden bg-[#ffffff] border border-[#8FAADC]/10 rounded-lg mb-4 h-52 relative flex items-center justify-center">
                      <img src={product.image || product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-101" loading="lazy" onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'} />
                    </div>
                    <h3 className="text-base font-serif font-bold text-[#0C1F3F] mb-3 text-left tracking-wide line-clamp-2">{product.name}</h3>
                    <div className="max-h-40 overflow-y-auto mb-4 border border-[#8FAADC]/10 rounded-lg p-2.5 bg-[#ffffff] text-xs">{renderFormattedDescription(product.description)}</div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-widest text-[#8FAADC] mb-4 pt-2 border-t border-[#8FAADC]/10">
                      <span className="flex items-center gap-1"><FiMapPin className="text-[#2F5DA8]" /> Origin: <strong className="text-[#0C1F3F] font-sans normal-case ml-0.5">{product.origin || 'India'}</strong></span>
                      <span className="text-[#2F5DA8] font-bold text-[8px] bg-[#ffffff] px-2 py-0.5 rounded-md border border-[#8FAADC]/30 flex items-center gap-1"><FiCheckCircle size={8} /> Verified</span>
                    </div>
                    <Link to={`/products/${product._id || product.id}`} className="w-full inline-flex items-center justify-center text-center bg-[#2F5DA8] hover:bg-[#0C1F3F] text-white py-3 font-bold tracking-widest transition-colors rounded-lg uppercase text-[10px]">Analyze Specifications</Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <footer className="bg-[#0C1F3F] text-[#8FAADC] py-12 px-4 border-t-2 border-[#2F5DA8] text-center font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">
            India Trade Overseas
            <br />
            Empowering Trade. Enabling Growth.
          </p>
          <p className="text-xs italic text-[#8FAADC] font-serif">
            "Where Quality Meets Global Demand."
          </p>
          <div className="text-[10px] text-[#8FAADC]/50 font-light max-w-2xl mx-auto border-t border-slate-700/30 pt-4 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>
    </div>
  );
}