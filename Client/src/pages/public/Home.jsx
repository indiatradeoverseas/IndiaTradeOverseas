import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAnchor,
  FiChevronRight,
  FiCheckCircle,
  FiLayers,
  FiMail,
  FiActivity,
  FiBookOpen
} from 'react-icons/fi';

// Editorial B2B global trade carousel assets curated to match business segments
const CINEMATIC_CAROUSEL_BACKDROPS = [
  "./images/ito_1.jpeg", // Mandated Starting Vessel Asset
  "./images/ito_2.jpeg",           // Heavy Ocean Container Carrier 
  "./images/ito_3.jpeg",           // Global Supply Distribution Hub
  "./images/ito_4.jpeg",           // Dockside Terminal Infrastructure
  "./images/ito_5.jpeg",
  "./images/ito_7.jpeg"            // Industrial Freight Crane Cranes Overview
];

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Automated fade rotation background loop stepping over a clean 5-second lifecycle threshold
  useEffect(() => {
    const backdropTimer = setInterval(() => {
      setCarouselIndex((prevIndex) => (prevIndex + 1) % CINEMATIC_CAROUSEL_BACKDROPS.length);
    }, 5000);
    return () => clearInterval(backdropTimer);
  }, []);

  // Mandated Trust Badge Set
  const trustBadges = [
    'EXPORTER', 'IMPORTER', 'BULK SUPPLIER', 'ITO TRANSPORT',
    'TRADE SOLUTIONS', 'GST REGISTERED', 'IEC HOLDER', 'MSME / UDYAM', 'FSSAI REGISTERED'
  ];

  // Mandated Location Chips
  const locations = ['Kishanganj', 'Siliguri', 'Jaigaon', 'Noida'];

  // Mandated Six Commercial Business Verticals
  const verticals = [
    {
      num: '01',
      title: 'Trade & Export',
      desc: 'Global trade solutions across multiple industries with product sourcing, buyer-supplier coordination, export support and commercial reliability.',
      cta: 'Explore Trade & Export'
    },
    {
      num: '02',
      title: 'Food & Agriculture',
      desc: 'Rice, tea, spices, maize, onion, banana, green chilli, wheat, sattu and other agricultural commodities.',
      cta: 'Explore Food Products'
    },
    {
      num: '03',
      title: 'Coal & Industrial Materials',
      desc: 'Domestic coal, imported coal, dolomite powder and industrial raw materials for power, manufacturing and infrastructure.',
      cta: 'Explore Industrial Materials'
    },
    {
      num: '04',
      title: 'Stone & Construction Supply',
      desc: 'Black stone aggregate, white stone, crushed aggregate and construction material supply for concrete, civil and infrastructure projects.',
      cta: 'Explore Construction Materials'
    },
    {
      num: '05',
      title: 'ITO Transport & Logistics',
      desc: 'Truck placement, route planning, loading coordination, dispatch follow-up and delivery communication.',
      cta: 'Explore Logistics'
    },
    {
      num: '06',
      title: 'Clay & Consumer Products',
      desc: 'Kulhad cups, clay water bottles, ceramic products, crockery, tea cups, coffee mugs and custom bulk supply.',
      cta: 'Explore Consumer Products'
    }
  ];

  const steps = [
    {
      title: 'Sourcing & Verification',
      description: 'We directly contract with verified mines and plantations, performing on-site pre-inspection of product grade.'
    },
    {
      title: 'Quality Certification',
      description: 'Independent inspection agencies (e.g. SGS) perform laboratory analysis to certify quality standards.'
    },
    {
      title: 'Customs & Documents',
      description: 'Our in-house compliance team handles bill of lading, certificates of origin, phytosanitary certs, and customs clearance.'
    },
    {
      title: 'Secure Marine Transit',
      description: 'Commodities are dispatched via top-tier container lines and bulk carriers with real-time tracking.'
    }
  ];

  const fadeInUp = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const sampleStagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="bg-[#FBF7EF] text-slate-900 antialiased min-h-screen selection:bg-amber-100 selection:text-amber-900 font-sans overflow-x-hidden">

      {/* Non-Negotiable Double Gold Frame Top Divider Accent */}
      <div className="border-t-[3px] border-double border-[#C99B38] w-full"></div>

      {/* 03 HOME HERO SECTION - FIXED TRANSPARENCY DROP WITH PREMIUM IVORY BLENDING */}
      <section className="relative min-h-[80vh] md:min-h-[85vh] flex items-center bg-[#FBF7EF] pt-8 pb-16 md:py-32 overflow-hidden border-b border-[#C99B38]">

        {/* Dynamic Image Canvas Layer */}
        <div className="absolute inset-0 z-0 bg-[#FBF7EF]">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={carouselIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }} // Gently modulated opacity to prevent merging with texts on any viewport
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              src={CINEMATIC_CAROUSEL_BACKDROPS[carouselIndex]}
              alt="Cinematic Sourcing Container Logistics Terminal"
              className="w-full h-full object-cover object-center absolute inset-0"
            />
          </AnimatePresence>
          {/* Steady color-safe gradients to guarantee legibility regardless of carousel shifts */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FBF7EF] via-[#FBF7EF]/80 to-transparent z-1"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#FBF7EF] via-transparent to-transparent z-1"></div>
        </div>

        {/* Dynamic Mobile Layout Wrapper Node */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sampleStagger}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center md:text-left w-full"
        >
          <div className="max-w-3xl mx-auto md:mx-0 pt-4 sm:pt-6 md:pt-0">

            {/* Context Badge */}
            <motion.span
              variants={fadeInUp}
              className="inline-flex items-center space-x-2 bg-white/95 backdrop-blur-xs text-[#0B2D5B] border border-[#C99B38]/40 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-widest uppercase mb-4 sm:mb-6 shadow-xs"
            >
              <FiAnchor className="text-[#C99B38]" /> <span>India Trade Overseas</span>
            </motion.span>

            {/* Mandated Hero Heading Text */}
            <motion.h1
              variants={fadeInUp}
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#0B2D5B] tracking-tight font-normal leading-tight mb-3 sm:mb-4 uppercase"
            >
              India Trade Overseas <br />
              <span className="text-slate-600 text-lg sm:text-2xl md:text-3xl block mt-1 sm:mt-2 font-sans font-light tracking-wide normal-case">
                Trade. Supply. Logistics. Growth.
              </span>
            </motion.h1>

            {/* Gold Divider Line Layout Alignment Rule */}
            <motion.div variants={fadeInUp} className="w-12 sm:w-16 h-[1px] bg-[#C99B38] mb-4 sm:mb-6 mx-auto md:mx-0"></motion.div>

            {/* Motto & Supporting Brand Lines */}
            <motion.p
              variants={fadeInUp}
              className="text-base sm:text-xl md:text-2xl uppercase tracking-[0.12em] sm:tracking-[0.15em] font-sans text-[#C99B38] font-bold mb-1"
            >
              Empowering Trade. Enabling Growth.
            </motion.p>
            <motion.p
              variants={fadeInUp}
              className="text-[11px] sm:text-xs md:text-sm italic font-serif text-slate-500 tracking-wider mb-5 sm:mb-8 block"
            >
              Where Quality Meets Global Demand.
            </motion.p>

            {/* Mandated Hero Narrative Copy */}
            <motion.p
              variants={fadeInUp}
              className="text-slate-700 font-sans font-light text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed mb-6 sm:mb-10"
            >
              India Trade Overseas is a multi-dimensional trade enterprise providing domestic and international sourcing, bulk supply, logistics coordination, industrial materials, construction materials, food commodities and consumer product solutions.
            </motion.p>

            {/* Mandated Hero Multi-Action Interface Matrix */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2.5 sm:gap-4"
            >
              <Link
                to="/products"
                className="w-full sm:w-auto bg-[#0B2D5B] hover:bg-[#0B2D5B]/90 text-white text-[11px] sm:text-xs tracking-widest uppercase font-semibold px-5 py-3 sm:px-6 sm:py-3.5 rounded-sm shadow-sm transition-all"
              >
                Explore Products
              </Link>
              <Link
                to="/quote-request"
                className="w-full sm:w-auto bg-white/60 backdrop-blur-xs border border-[#0B2D5B]/20 hover:border-[#0B2D5B] text-[#0B2D5B] text-[11px] sm:text-xs tracking-widest uppercase font-semibold px-5 py-3 sm:px-6 sm:py-3.5 rounded-sm transition-all"
              >
                Request Bulk Quote
              </Link>
            </motion.div>

          </div>
        </motion.div>
      </section>

      {/* MANDATED BRAND TRUST SIGNALS STRIP */}
      <section className="bg-[#F5EEDF] py-4 border-b border-[#C99B38]/10 overflow-x-auto select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center items-center gap-2.5 md:gap-4 whitespace-nowrap">
          {trustBadges.map((badge, index) => (
            <span key={index} className="bg-white border border-[#C99B38]/15 text-[#0B2D5B] text-[9px] sm:text-[10px] tracking-widest font-bold uppercase px-3 py-1 rounded-sm shadow-3xs">
              &bull; {badge}
            </span>
          ))}
        </div>
      </section>

      {/* EDITORIAL REVEAL DOSSIER METRICS BLOCK */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#F5EEDF] p-5 rounded-sm shadow-3xs">
            <div className="text-[#C99B38] mb-2"><FiActivity size={16} /></div>
            <h4 className="font-serif text-base text-[#0B2D5B] mb-1.5">Enterprise Timeline</h4>
            <p className="text-[11px] text-slate-500 font-light leading-relaxed">Established in 2024 as a founder-led trade gateway supporting secure business procurement chains.</p>
            <div className="text-[9px] font-mono font-bold text-[#C99B38] mt-3">ESTABLISHED 2024</div>
          </div>

          <div className="bg-white border border-[#F5EEDF] p-5 rounded-sm shadow-3xs">
            <div className="text-[#C99B38] mb-2"><FiLayers size={16} /></div>
            <h4 className="font-serif text-base text-[#0B2D5B] mb-1.5">Market Capabilities</h4>
            <p className="text-[11px] text-slate-500 font-light leading-relaxed">Systematically configured to coordinate bulk cross-border operations across Trade, Supply, and Logistics networks.</p>
            <div className="text-[9px] font-mono font-bold text-[#C99B38] mt-3">MULTILATERAL INFRASTRUCTURE</div>
          </div>

          <div className="bg-white border border-[#F5EEDF] p-5 rounded-sm shadow-3xs">
            <div className="text-[#C99B38] mb-2"><FiBookOpen size={16} /></div>
            <h4 className="font-serif text-base text-[#0B2D5B] mb-1.5">Verified Sourcing</h4>
            <p className="text-[11px] text-slate-500 font-light leading-relaxed">Connecting reliable suppliers, domestic factories, and overseas buyers under full document compliance parameters.</p>
            <div className="text-[9px] font-mono font-bold text-[#C99B38] mt-3">QUALITY ASSURED PROFILE</div>
          </div>
        </div>
      </section>

      {/* CORE INFO MATRIX: EXCLUSIVE ELECTRONIC INTAKE & LOCATION CORRIDORS */}
      <section className="pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          <div className="lg:col-span-7 bg-white border border-[#F5EEDF] p-6 rounded-sm shadow-3xs flex flex-col justify-between relative">
            <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.98] pointer-events-none"></div>
            <div>
              <h3 className="text-xl font-serif text-[#0B2D5B] mb-2">Official Transmission Node</h3>
              <p className="text-[11px] text-slate-500 font-sans font-light leading-relaxed mb-4">
                To maintain standard corporate workflows and verification speed, all commercial sourcing inquiries are processed via our electronic mail network.
              </p>
              <div className="space-y-3 font-sans text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#FAF9F5] border border-slate-100 rounded-sm gap-2">
                  <div>
                    <span className="text-[9px] tracking-wider uppercase font-bold text-slate-400 block mb-0.5">Secure Document Transmission</span>
                    <span className="text-slate-800 font-medium text-xs">info@indiatradeoverseas.com</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href="mailto:info.indiatradeoverseas@gmail.com" className="bg-[#0B2D5B] hover:bg-[#0B2D5B]/90 text-[#FBF7EF] px-3 py-1.5 font-semibold uppercase tracking-wider text-[9px] rounded-sm transition-colors flex items-center gap-1.5 shadow-xs">
                      <FiMail /> Send Email
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF9F5]/40 border border-slate-100/70 text-slate-400 text-[10px] font-light leading-relaxed rounded-sm">
                  <strong>Operational Hours:</strong> Dossier packages are evaluated Monday to Saturday between 9:30 AM and 6:30 PM IST.
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#F5EEDF] p-6 rounded-sm shadow-3xs flex flex-col justify-center">
            <span className="text-amber-700 font-medium tracking-[0.2em] text-[10px] uppercase block mb-0.5">Corporate Office Location</span>
            <h4 className="text-lg font-serif text-[#0B2D5B] mb-2">Location Stone Chips</h4>
            <p className="text-[11px] text-slate-500 font-sans font-light leading-relaxed mb-4">
              Our active multi-category physical footprints maintain operational hubs inside the following major regional logistics corridors:
            </p>
            <div className="flex flex-wrap gap-2">
              {locations.map((city) => (
                <span key={city} className="bg-[#FAF9F5] border border-[#F5EEDF] text-[#0B2D5B] font-sans font-medium text-[11px] px-3 py-1.5 rounded-sm shadow-3xs">
                  {city}
                </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 05-BUSINESS VERTICALS PRESENTATION PANELS */}
      <section className="py-16 bg-[#F5EEDF] border-y border-[#C99B38]/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-12">
            <span className="text-amber-700 font-medium tracking-[0.2em] text-[10px] uppercase block mb-1">Capabilities</span>
            <h2 className="text-2xl font-serif text-[#0B2D5B] tracking-wide uppercase">Six Commercial Verticals</h2>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={sampleStagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {verticals.map((v, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white border border-slate-200/40 p-5 shadow-3xs rounded-sm flex flex-col justify-between relative group hover:border-[#C99B38]/30 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-serif text-[#C99B38] font-bold text-base tracking-wider">{v.num}</span>
                    <FiLayers className="text-slate-300 group-hover:text-[#C99B38] transition-colors" size={14} />
                  </div>
                  <h4 className="text-base font-serif font-medium text-[#0B2D5B] mb-1.5">{v.title}</h4>
                  <p className="text-slate-500 text-[11px] font-sans font-light leading-relaxed mb-5">{v.desc}</p>
                </div>
                <Link to="/products" className="w-full inline-flex items-center justify-center text-center bg-[#FAF9F5] hover:bg-[#F5EEDF] border border-slate-100 text-[#0B2D5B] font-sans text-[10px] uppercase tracking-widest py-2 font-bold transition-colors">
                  {v.cta}
                </Link>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* DATA WORKFLOW PRESENTATION LAYER */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-amber-700 font-medium tracking-[0.2em] text-[10px] uppercase block mb-1">Procurement Architecture</span>
          <h2 className="text-2xl font-serif text-[#0B2D5B] tracking-wide uppercase">Our Rigorous Trade Workflow</h2>
          <p className="text-slate-400 font-sans font-light text-[11px] mt-1">We handle procedural complexity to preserve risk-free corporate supply lines.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          <div className="lg:col-span-5 space-y-2.5">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-3.5 rounded-sm border font-sans transition-all flex items-center space-x-3 ${activeStep === index
                  ? 'bg-[#0B2D5B] border-[#C99B38] text-white shadow-sm'
                  : 'bg-white border-slate-200/60 text-slate-500 hover:bg-[#F5EEDF]/40'
                  }`}
              >
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-mono font-bold ${activeStep === index ? 'bg-[#C99B38] text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                  {index + 1}
                </span>
                <span className="font-serif text-xs font-medium tracking-wide">{step.title}</span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-7 bg-white border border-[#F5EEDF] rounded-sm p-6 min-h-[220px] flex flex-col justify-between shadow-3xs relative overflow-hidden">
            <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.98] pointer-events-none"></div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-1.5 text-[#C99B38] mb-3">
                  <FiCheckCircle size={16} />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold">Phase {activeStep + 1} of 4</span>
                </div>
                <h3 className="text-lg font-serif font-medium text-[#0B2D5B] mb-2">{steps[activeStep].title}</h3>
                <p className="text-slate-500 text-[11px] font-sans font-light leading-relaxed">{steps[activeStep].description}</p>
              </motion.div>
            </AnimatePresence>

            <div className="text-right text-[11px] font-sans pt-3 border-t border-slate-100 mt-5">
              <Link to="/contact" className="text-[#C99B38] font-semibold hover:underline inline-flex items-center tracking-wide">
                Talk to a Compliance Specialist <FiChevronRight className="ml-0.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* PARTNER WITH INDIA TRADE OVERSEAS */}
      <section className="relative w-full py-10 px-4 sm:px-6 lg:px-8 overflow-hidden border-t border-b border-[#C99B38] bg-[#FBF7EF]">

        {/* 1. Base Cinematic Port Image Layer (Mirrors the Hero Section structure) */}
        <div className="absolute inset-0 z-0">
          <img
            src="./images/ito_1.jpeg"
            alt="India Trade Overseas Freight Port Terminal Background"
            className="w-full h-full object-cover object-center pointer-events-none select-none"
          />
          {/* Lightened overlay mask to make the background image stand out clearly */}
          <div className="absolute inset-0 bg-[#FBF7EF]/45 backdrop-blur-3xs" />
          <div className="absolute inset-0 opacity-2 bg-[linear-gradient(to_right,#0B2D5B_1px,transparent_1px),linear-gradient(to_bottom,#0B2D5B_1px,transparent_1px)] bg-[size:40px_32px]" />
        </div>

        {/* 2. Content Grid */}
        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Column: Context Branding Text */}
          <div className="lg:col-span-5 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#0B2D5B]/5 border border-[#0B2D5B]/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C99B38] animate-ping" />
              <span className="text-[10px] tracking-widest font-mono uppercase text-[#0B2D5B] font-bold">Fulfillment Matrix</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif text-[#0B2D5B] tracking-wide uppercase leading-tight">
              Partner with <br className="hidden lg:block" />India Trade Overseas
            </h2>

            <p className="text-slate-900 font-sans font-light text-xs sm:text-sm max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Ready to secure regular commodity deliveries or customized natural stone blocks? Get in touch with our team today for direct port-to-port pricing configurations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link to="/quote-request" className="bg-[#0B2D5B] hover:bg-[#C99B38] text-white font-sans font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-sm transition-all shadow-md text-center">
                Get FOB / CIF Pricing
              </Link>
              <Link to="/contact" className="bg-white border border-[#0B2D5B]/20 text-[#0B2D5B] hover:border-[#C99B38] hover:text-[#C99B38] text-sans font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-sm transition-all text-center">
                Contact Commercial Office
              </Link>
            </div>
          </div>

          {/* Right Column: Perfected Narrative Animation Stage */}
          <div className="lg:col-span-7 w-full flex items-center justify-center">
            {/* Added a light alpha transparency mask so the background layer bleeds through the container gracefully */}
            <div className="relative w-full max-w-xl h-60 bg-[#0B2D5B]/35 border border-[#C99B38]/20 rounded-xl overflow-hidden flex flex-col justify-between p-6 shadow-2xl backdrop-blur">

              {/* Transit Dotted Track Ground Base */}
              <div className="absolute bottom-20 left-8 right-12 h-[1px] border-b border-dashed border-white/30 z-0" />

              {/* Content Arena */}
              <div className="relative z-10 flex justify-between items-end w-full h-full pb-16">

                {/* Sourcing Origin Node */}
                <div className="flex flex-col items-center gap-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-[#0B2D5B] border border-[#C99B38] flex items-center justify-center shadow-lg">
                    <span className="text-[10px] font-mono font-bold text-[#C99B38]">IND</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest font-mono text-slate-300 font-semibold">Origin</span>
                </div>

                {/* Full Container Track Area */}
                <div className="absolute left-14 right-20 top-0 bottom-16 z-20">

                  {/* Expanded Truck moving via absolute track percentage layout coordinates */}
                  <motion.div
                    initial={{ left: "0%" }}
                    animate={{ left: ["0%", "86%", "86%", "0%"] }}
                    transition={{
                      repeat: Infinity,
                      duration: 4.5, // Standardized runtime duration
                      times: [0, 0.40, 0.75, 1],
                      ease: "easeInOut"
                    }}
                    className="absolute bottom-0 flex flex-col items-center"
                    style={{ width: "64px" }}
                  >
                    {/* Unloading Goods Box Payload */}
                    <motion.div
                      animate={{
                        opacity: [1, 1, 0, 0, 1],
                        y: [0, 0, 22, 22, 0]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4.5, // Must match parent loop duration explicitly
                        times: [0, 0.40, 0.45, 0.75, 1] // Drops at exactly 0.40 keyframe
                      }}
                      className="w-5 h-5 bg-[#C99B38] rounded-xs border border-white/30 shadow-md flex items-center justify-center mb-1"
                    >
                      <span className="w-2.5 h-[1px] bg-[#0B2D5B]/30" />
                    </motion.div>

                    {/* Freight Cargo Truck Vector */}
                    <svg className="w-14 h-10 text-[#C99B38] fill-current drop-shadow-md" viewBox="0 0 24 24">
                      <path d="M20 8h-3V4H4c-1.1 0-2 .9-2 2v11h2c0 1.66.89 3 2.5 3s2.5-1.34 2.5-3h6c0 1.66.89 3 2.5 3s2.5-1.34 2.5-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm11.5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                    </svg>
                  </motion.div>

                  {/* Delivered Cargo Drop Reference left with Customer */}
                  <motion.div
                    animate={{
                      opacity: [0, 0, 1, 0, 0],
                      scale: [0.5, 0.5, 1, 0.5, 0.5]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 4.5, // Standardized runtime duration
                      times: [0, 0.40, 0.45, 0.75, 1] // Inherits matching cargo-floor handoff timing 
                    }}
                    className="absolute right-0 bottom-0 w-5 h-5 bg-[#C99B38] rounded-xs border border-white/30 shadow-md"
                  />
                </div>

                {/* Stick Figure Customer Node */}
                <div className="flex flex-col items-center gap-2 relative pl-4 z-10">

                  {/* Horizontally Balanced Endorsement Banner Box */}
                  <motion.div
                    animate={{
                      opacity: [0, 0, 1, 1, 0],
                      scale: [0, 0, 1, 1, 0],
                      y: [10, 10, 0, 0, 10]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 4.5, // Corrected from 5 down to 4.5 to eliminate timeline drift
                      times: [0, 0.40, 0.45, 0.75, 1], // Synced directly with cargo delivery frames
                      ease: "backOut"
                    }}
                    className="absolute -top-10 bg-[#C99B38] text-[#0B2D5B] text-[10px] font-sans font-bold py-2 px-4 rounded-lg shadow-2xl flex flex-col items-center border border-white/20 z-30 min-w-[260px] max-w-sm left-0.4 -translate-x-[76%]"
                  >
                    <span className="text-xs">Order Received! 🎉</span>
                    <span className="text-[9px] text-[#0B2D5B] font-extrabold tracking-wider mt-0.5 whitespace-nowrap">"Use India Trade Overseas for Import-Export"</span>
                    {/* Carey pointer perfectly aligned to stay positioned over the stick figure */}
                    <div className="w-2 h-2 bg-[#C99B38] rotate-45 absolute -bottom-1 right-12" />
                  </motion.div>

                  {/* Custom Vector Stick Figure (Circle Head, 2 Arms, Spine, 2 Legs) */}
                  <div className="w-12 h-10 relative flex items-center justify-center">
                    <svg className="w-full h-full text-amber-400 stroke-current" strokeWidth="2.5" strokeLinecap="round" fill="none" viewBox="0 0 24 36">
                      <circle cx="12" cy="6" r="4" fill="#0B2D5B" strokeWidth="2.5" />
                      <line x1="12" y1="10" x2="12" y2="22" />
                      <line x1="12" y1="13" x2="5" y2="17" />
                      <motion.line
                        animate={{ y2: [11, 5, 11] }}
                        transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
                        x1="12" y1="13" x2="19" y2="11"
                      />
                      <line x1="12" y1="22" x2="6" y2="33" />
                      <line x1="12" y1="22" x2="18" y2="33" />
                    </svg>
                  </div>

                  <span className="text-[9px] uppercase tracking-widest font-mono text-slate-300 font-bold">Consignee</span>
                </div>

              </div>

              {/* Real-Time Telemetry Data Ribbon Footer */}
              <div className="border-t border-white/10 pt-3 flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  End-To-End Freight Vector Active
                </span>
                <span className="text-[#C99B38]/80 font-bold tracking-widest uppercase">Fulfillment Clear</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* CORPORATE HANDOFF FOOTER SEAL */}
      <footer className="bg-[#0B2D5B] text-slate-400 py-12 px-4 border-t-2 border-[#C99B38] text-center font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">
            India Trade Overseas
            <br />
            Empowering Trade. Enabling Growth.
          </p>
          <p className="text-xs italic text-[#C99B38] font-serif">
            "Where Quality Meets Global Demand."
          </p>
          <div className="text-[10px] text-slate-400 font-light max-w-2xl mx-auto border-t border-slate-700/50 pt-4 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>

    </div>
  );
}