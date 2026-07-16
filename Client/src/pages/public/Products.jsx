import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMapPin, FiCheckCircle, FiChevronRight, FiGrid, FiSliders } from 'react-icons/fi';
import { productsApi } from '../../api/products';

const renderFormattedDescription = (description) => {
  if (!description) return null;
  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length <= 1) {
    return <p className="text-[#C5CBD3] leading-relaxed text-xs font-sans font-light opacity-90">{description}</p>;
  }

  return (
    <div className="space-y-1.5 text-[#C5CBD3] font-sans text-xs font-light text-left">
      {lines.map((line, index) => {
        const isHeader = line === line.toUpperCase() && line.length > 4 && !line.includes(':');
        if (isHeader) {
          return <div key={index} className="font-medium text-[#F2F4F7] tracking-wider uppercase border-b border-[#C5CBD3]/20 pb-0.5 mt-3 first:mt-0 text-[10px]">{line}</div>;
        }

        if (line.includes(':') || line.includes(' - ')) {
          const delimiter = line.includes(':') ? ':' : ' - ';
          const parts = line.split(delimiter);
          const key = parts[0].trim();
          const value = parts.slice(1).join(delimiter).trim();
          return (
            <div key={index} className="flex justify-between items-baseline gap-2 py-0.5 border-b border-[#C5CBD3]/10">
              <span className="text-[#6D7886] text-[10px] uppercase tracking-wider shrink-0">{key}</span>
              <span className="text-[#F2F4F7] text-[11px] font-medium text-right">{value}</span>
            </div>
          );
        }

        if (line.startsWith('-')) {
          return (
            <div key={index} className="flex items-start space-x-1.5 py-0.5">
              <span className="text-[#6D7886] font-bold">&bull;</span>
              <span className="text-[#C5CBD3]">{line.substring(1).trim()}</span>
            </div>
          );
        }

        return <p key={index} className="text-[#C5CBD3] leading-relaxed py-0.5 opacity-90">{line}</p>;
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
    { value: 'coal_industrial', label: 'Coal & Industrial Materials' },
    { value: 'stone_construction', label: 'Stone & Construction Supply' },
    { value: 'transport_logistics', label: 'ITO Transport & Logistics' },
    { value: 'clay_consumer', label: 'Clay & Consumer Products' }
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "linear", duration: 0.45 } }
  };

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] antialiased min-h-screen selection:bg-[#6D7886]/30 selection:text-white font-sans overflow-x-hidden">

      {/* Structural Double-Line Top Border Accent */}
      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full fixed top-0 left-0 z-50"></div>

      {/* PRODUCTS HERO SECTION - CONFIGURING 3/4 VIEWPORT HEIGHT (75vh Target Boundary) */}
      <section className="relative min-h-[70vh] flex items-center justify-center bg-[#040A12] overflow-hidden border-b border-[#C5CBD3]/10 py-20 lg:py-32">

        {/* Background Graphic Framework Container */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-40">
          <img
            src="./images/ito_images/ito_10.jpeg"
            alt="India Trade Overseas Bulk Cargo Freight Hub Background"
            className="w-full h-full object-cover object-center scale-105"
            style={{ filter: 'brightness(1.2) contrast(1.12) saturate(1.5)' }}
          />
          {/* Layered cinematic grading overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/20 via-transparent to-[#040A12]/10 z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/30 via-[#040A12]/20 to-[#0E1116]/10 z-1" />
          <div className="absolute inset-0 box-shadow-[inset_0_0_180px_rgba(0,0,0,0.6)] z-1" />
        </div>

        {/* Hero Typography Metadata Stack with Dynamic Top-Padding Buffer */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-5 pt-32 sm:pt-40 lg:pt-[160px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-2 bg-[#121D29]/70 backdrop-blur-md border border-[#C5CBD3]/20 px-4 py-1.5 text-[10px] sm:text-[11px] tracking-[3px] font-sans uppercase text-[#F2F4F7] font-medium rounded-sm shadow-md">
              <span className="w-1.5 h-1.5 bg-[#F2F4F7] rounded-full animate-pulse" />
              DIRECT ALLOCATION CATALOGUE
            </span>
            <h2 className="text-4xl sm:text-5xl md:text-[62px] font-serif tracking-tight uppercase text-[#F2F4F7] leading-[1.08]">
              Core Commodities
            </h2>
            <div className="w-16 h-[1px] bg-[#C5CBD3]/30 mx-auto my-4 border-b" aria-hidden="true" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-[#C5CBD3] font-sans font-light text-sm sm:text-[16px] max-w-2xl mx-auto leading-[1.65] opacity-90"
          >
            Premium quality industrial and agricultural resources sourced globally from verified producers. Browse current allocation frameworks to inspect precise metrics, grading sheets, and customs clearance protocols.
          </motion.p>
        </div>
      </section>

      {/* CORE CATALOG FEED CONTAINER GRID */}
      <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16 py-16 sm:py-24">

        {/* Search and Category Filtering Node Group */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-12 bg-[#121D29]/40 backdrop-blur-md border border-[#C5CBD3]/15 p-4 sm:p-5 shadow-lg rounded-sm flex flex-col md:flex-row gap-4 items-center"
        >
          <div className="flex-1 w-full relative font-sans text-xs">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6D7886]" size={14} />
            <input
              type="text"
              placeholder="Search specification keyword, category origin or grading records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 h-[48px] border border-[#C5CBD3]/20 bg-[#0E1116]/90 focus:border-[#C5CBD3]/60 focus:ring-1 focus:ring-[#C5CBD3]/10 outline-none transition-all rounded-sm text-[#F2F4F7] text-xs placeholder-[#6D7886]"
            />
          </div>
          <div className="w-full md:w-80 relative font-sans text-xs flex items-center">
            <FiSliders className="absolute left-4 pointer-events-none text-[#6D7886]" size={14} />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full pl-10 pr-10 h-[48px] border border-[#C5CBD3]/20 bg-[#0E1116]/90 focus:border-[#C5CBD3]/60 outline-none text-[#F2F4F7] font-medium rounded-sm transition-all text-xs cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236D7886%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-7.4H18.4c-5%200-9.3%202.5-12.3%206.4a17.6%2017.6%200%200%200-2.3%2014.1l113%20194.5c2%203.4%205.7%205.4%209.7%205.4s7.7-2%209.7-5.4L289.5%2089.9a17.6%2017.6%200%200%200-2.5-20.5z%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_16px_center] bg-no-repeat"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value} className="bg-[#0E1116] text-[#C5CBD3]">{cat.label}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Display Counter Support Point Metric */}
        <div className="mb-6 text-left px-1 flex items-center justify-between border-b border-[#C5CBD3]/10 pb-4">
          <p className="text-[11px] font-mono text-[#6D7886] uppercase tracking-wider flex items-center gap-2">
            <FiGrid size={12} />
            Verified Catalog Entries: <span className="text-[#F2F4F7] font-sans font-bold">{filteredProducts.length} items</span>
          </p>
        </div>

        {/* Dynamic State Staging Viewport Grid */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#121D29]/30 border border-[#C5CBD3]/15 rounded-sm p-5 flex flex-col justify-between h-[490px] animate-pulse">
                  <div>
                    <div className="bg-[#0E1116] rounded-sm mb-4 h-52 w-full"></div>
                    <div className="h-4 bg-white/5 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-white/5 rounded w-1/2 mb-4"></div>
                    <div className="border border-[#C5CBD3]/10 rounded-sm p-3 space-y-2">
                      <div className="h-2 bg-white/5 rounded w-full"></div>
                      <div className="h-2 bg-white/5 rounded w-5/6"></div>
                    </div>
                  </div>
                  <div>
                    <div className="w-full h-11 bg-white/5 rounded-sm"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredProducts.map(product => (
                  <motion.div
                    key={product._id || product.id}
                    variants={itemVariants}
                    layout
                    className="bg-[#121D29]/80 backdrop-blur-sm border border-[#C5CBD3]/20 shadow-md rounded-sm p-5 flex flex-col justify-between group hover:border-[#F2F4F7] hover:-translate-y-1.5 transition-all duration-300 relative"
                  >
                    <div>
                      {/* Consistent 16:10 / 4:3 Image Container Framing Area */}
                      <div className="overflow-hidden bg-[#040A12] border border-[#C5CBD3]/10 rounded-sm mb-5 h-52 relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-[#040A12]/10 z-10 transition-colors group-hover:bg-transparent pointer-events-none" />
                        <img
                          src={product.image || product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] filter brightness-[1] contrast-[1.15] group-hover:brightness-100"
                          loading="lazy"
                          onError={(e) => e.target.src = './images/ito_images/ito_5.png'}
                        />
                      </div>

                      <h3 className="text-lg font-serif font-normal text-[#F2F4F7] mb-3.5 text-left tracking-wide line-clamp-2 min-h-[56px] group-hover:text-white transition-colors">
                        {product.name}
                      </h3>

                      {/* Structured Specs Rows Block */}
                      <div className="max-h-40 overflow-y-auto mb-5 border border-[#C5CBD3]/10 rounded-sm p-3 bg-[#040A12]/50 text-xs custom-scrollbar">
                        {renderFormattedDescription(product.description)}
                      </div>
                    </div>

                    <div>
                      {/* Card Anatomy Meta Badges */}
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-[#6D7886] mb-4 pt-3.5 border-t border-[#C5CBD3]/15">
                        <span className="flex items-center gap-1.5">
                          <FiMapPin size={12} className="text-[#6D7886]" />
                          <span>Origin:</span>
                          <strong className="text-[#F2F4F7] font-sans normal-case ml-0.5 font-medium">{product.origin || 'India'}</strong>
                        </span>
                        <span className="text-[#6D7886] font-semibold text-[9px] bg-[#0E1116] px-2.5 py-0.5 border border-[#C5CBD3]/30 rounded-sm flex items-center gap-1">
                          <FiCheckCircle size={10} className="text-[#6D7886]" /> Verified
                        </span>
                      </div>

                      <Link
                        to={`/products/${product._id || product.id}`}
                        className="w-full h-[46px] inline-flex items-center justify-center text-center bg-[#0E1116] hover:bg-[#2B3440] border border-[#C5CBD3]/25 hover:border-[#F2F4F7] text-[#F2F4F7] font-sans text-[11px] uppercase tracking-widest font-semibold transition-all duration-200 rounded-sm group/btn"
                      >
                        <span>View Specifications</span>
                        <FiChevronRight className="ml-1 h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Shared Corporate Handoff Footer Seal Layout */}
      <footer className="bg-[#040A12] text-[#6D7886] py-16 px-6 border-t border-[#C5CBD3]/24 text-center font-sans relative overflow-hidden">

        {/* Cinematic Photo Background Overlay Matrix */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-80">
          <img
            src="/images/footer-bg-image.png" // Sourced corporate terminal or map backdrop path
            alt="India Trade Overseas Industrial Logistics Footprint"
            className="w-full h-full object-cover object-center scale-106 mt-3"
            style={{ filter: 'brightness(1.5) contrast(1.5) saturate(0.5)' }}
          />
          {/* Protective vignette mask gradient layer to secure text parameter isolation */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/30 via-transparent to-[#040A12]/10" />
        </div>

        {/* Centered Footer Content Meta Stack */}
        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <p className="text-[16px] uppercase tracking-[0.25em] font-semibold text-[#F2F4F7] drop-shadow-[0_2px_4px_rgba(4,10,18,0.5)]">
            India Trade Overseas
            <br />
            <span className="text-xs text-[#8a939e] tracking-widest capitalize font-normal font-sans block mt-1">Trade. Supply. Logistics. Growth.</span>
          </p>

          <p className="text-xs italic text-[#C5CBD3]/70 font-serif drop-shadow-[0_2px_4px_rgba(4,10,18,0.4)]">
            "Where Quality Meets Global Demand"
          </p>

          <div className="text-[10px] text-[#8a939e] /50 font-light max-w-2xl mx-auto border-t border-[#C5CBD3]/20 pt-4 leading-relaxed tracking-wide">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>
    </div>
  );
}