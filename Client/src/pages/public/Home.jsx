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
  "https://images.unsplash.com/photo-1703977883249-d959f2b0c1ae?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Mandated Starting Vessel Asset
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1920&auto=format&fit=crop",          // Heavy Ocean Container Carrier 
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1920&auto=format&fit=crop",          // Global Supply Distribution Hub
  "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=80&w=1920&auto=format&fit=crop",          // Dockside Terminal Infrastructure
  "https://images.unsplash.com/photo-1710081647293-a07a5915bcd6?q=80&w=1331&auto=format&fit=crop"           // Industrial Freight Crane Cranes Overview
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
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }
  };

  const sampleStagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  return (
    <div className="bg-[#FBF7EF] text-slate-900 antialiased min-h-screen selection:bg-amber-100 selection:text-amber-900 font-sans overflow-x-hidden">
      
      {/* Non-Negotiable Double Gold Frame Top Divider Accent */}
      <div className="border-t-[3px] border-double border-[#C99B38] w-full"></div>

      {/* 03 HOME HERO SECTION - RESPONSIVE MOBILE EYE-CENTERED BACKDROP WITH CROSS-FADE CAROUSEL */}
      <section className="relative min-h-[85vh] flex items-center bg-slate-950 py-24 md:py-32 overflow-hidden border-b border-[#C99B38]">
        
        {/* Animated Cinematic Layer Box (No public busy elements overlay without protective shields) */}
        <div className="absolute inset-0 z-0 bg-slate-950">
          <AnimatePresence mode="wait">
            <motion.img 
              key={carouselIndex}
              initial={{ opacity: 0, scale: 1.10 }}
              animate={{ opacity: 0.80, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
              src={CINEMATIC_CAROUSEL_BACKDROPS[carouselIndex]} 
              alt="Cinematic Sourcing Container Logistics Terminal" 
              className="w-full h-full object-cover object-center absolute inset-0"
            />
          </AnimatePresence>
          {/* Subtle Clean Vignette Protective Layers */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FBF7EF]/90 via-[#FBF7EF]/40 to-transparent z-1"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#FBF7EF] via-transparent to-transparent z-1"></div>
        </div>

        {/* Updated alignment wrapper classes to properly shift layout orientations based on screens */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={sampleStagger}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center md:text-left w-full"
        >
          <div className="max-w-3xl mx-auto md:mx-0">
            
            {/* Context Badge */}
            <motion.span variants={fadeInUp} className="inline-flex items-center space-x-2 bg-white/90 backdrop-blur-xs text-[#0B2D5B] border border-[#C99B38]/40 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-6 shadow-xs">
              <FiAnchor className="text-[#C99B38]" /> <span>India Trade Overseas</span>
            </motion.span>

            {/* Mandated Hero Heading Text */}
            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#0B2D5B] tracking-tight font-normal leading-tight mb-4">
              INDIA TRADE OVERSEAS <br />
              <span className="text-slate-600 text-2xl sm:text-3xl block mt-2 font-sans font-light tracking-wide">
                Trade. Supply. Logistics. Growth.
              </span>
            </motion.h1>

            {/* Gold Divider Line Centered Layout Alignment Rule */}
            <motion.div variants={fadeInUp} className="w-16 h-[1px] bg-[#C99B38] mb-6 mx-auto md:mx-0"></motion.div>

            {/* Motto & Supporting Brand Lines */}
            <motion.p variants={fadeInUp} className="text-xl sm:text-2xl uppercase tracking-[0.15em] font-sans text-[#C99B38] font-bold mb-1">
              Empowering Trade. Enabling Growth.
            </motion.p>
            <motion.p variants={fadeInUp} className="text-xs sm:text-sm italic font-serif text-slate-500 tracking-wider mb-8 block">
              Where Quality Meets Global Demand.
            </motion.p>

            {/* Mandated Hero Narrative Copy */}
            <motion.p variants={fadeInUp} className="text-slate-700 font-sans font-light text-sm sm:text-base max-w-2xl leading-relaxed mb-10">
              India Trade Overseas is a multi-dimensional trade enterprise providing domestic and international sourcing, bulk supply, logistics coordination, industrial materials, construction materials, food commodities and consumer product solutions.
            </motion.p>

            {/* Mandated Hero Multi-Action Interface Matrix */}
            <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
              <Link to="/products" className="w-full sm:w-auto bg-[#0B2D5B] hover:bg-[#102F60] text-white text-xs tracking-widest uppercase font-semibold px-6 py-3.5 rounded-sm shadow-md transition-all active:scale-95">
                Explore Products
              </Link>
              <Link to="/quote-request" className="w-full sm:w-auto bg-transparent border border-[#0B2D5B]/30 hover:border-[#0B2D5B] text-[#0B2D5B] text-xs tracking-widest uppercase font-semibold px-6 py-3.5 rounded-sm transition-all active:scale-95">
                Request Bulk Quote
              </Link>
            </motion.div>

          </div>
        </motion.div>
      </section>

      {/* MANDATED BRAND TRUST SIGNALS STRIP */}
      <section className="bg-[#F5EEDF] py-5 border-b border-[#C99B38]/10 overflow-x-auto select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center items-center gap-3 md:gap-5 whitespace-nowrap">
          {trustBadges.map((badge, index) => (
            <span key={index} className="bg-white border border-[#C99B38]/15 text-[#0B2D5B] text-[10px] sm:text-xs tracking-widest font-bold uppercase px-3.5 py-1.5 rounded-sm shadow-xs">
              &bull; {badge}
            </span>
          ))}
        </div>
      </section>

      {/* EDITORIAL REVEAL DOSSIER METRICS BLOCK */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#F5EEDF] p-6 rounded-sm shadow-sm">
            <div className="text-[#C99B38] mb-3"><FiActivity size={18} /></div>
            <h4 className="font-serif text-lg text-[#0B2D5B] mb-2">Enterprise Timeline</h4>
            <p className="text-xs text-slate-600 font-light leading-relaxed">Established in 2024 as a founder-led trade gateway supporting secure business procurement chains.</p>
            <div className="text-[10px] font-mono font-bold text-[#C99B38] mt-4">ESTABLISHED 2024</div>
          </div>

          <div className="bg-white border border-[#F5EEDF] p-6 rounded-sm shadow-sm">
            <div className="text-[#C99B38] mb-3"><FiLayers size={18} /></div>
            <h4 className="font-serif text-lg text-[#0B2D5B] mb-2">Market Capabilities</h4>
            <p className="text-xs text-slate-600 font-light leading-relaxed">Systematically configured to coordinate bulk cross-border operations across Trade, Supply, and Logistics networks.</p>
            <div className="text-[10px] font-mono font-bold text-[#C99B38] mt-4">MULTILATERAL INFRASTRUCTURE</div>
          </div>

          <div className="bg-white border border-[#F5EEDF] p-6 rounded-sm shadow-sm">
            <div className="text-[#C99B38] mb-3"><FiBookOpen size={18} /></div>
            <h4 className="font-serif text-lg text-[#0B2D5B] mb-2">Verified Sourcing</h4>
            <p className="text-xs text-slate-600 font-light leading-relaxed">Connecting reliable suppliers, domestic factories, and overseas buyers under full document compliance parameters.</p>
            <div className="text-[10px] font-mono font-bold text-[#C99B38] mt-4">QUALITY ASSURED PROFILE</div>
          </div>
        </div>
      </section>

      {/* CORE INFO MATRIX: EXCLUSIVE ELECTRONIC INTAKE & LOCATION CORRIDORS */}
      <section className="pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          <div className="lg:col-span-7 bg-white border border-[#F5EEDF] p-8 rounded-sm shadow-sm flex flex-col justify-between relative">
            <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.98] pointer-events-none"></div>
            <div>
              <h3 className="text-2xl font-serif text-[#0B2D5B] mb-4">Official Transmission Node</h3>
              <p className="text-xs text-slate-500 font-sans font-light leading-relaxed mb-6">
                To maintain standard corporate workflows and verification speed, all commercial sourcing inquiries are processed via our electronic mail network.
              </p>
              <div className="space-y-4 font-sans text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#FAF9F5] border border-slate-100 rounded-sm gap-3">
                  <div>
                    <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400 block mb-0.5">Secure Document Transmission</span>
                    <span className="text-slate-800 font-medium text-sm">info@indiatradeoverseas.com</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href="mailto:info.indiatradeoverseas@gmail.com" className="bg-[#0B2D5B] hover:bg-[#102F60] text-white px-4 py-2 font-semibold uppercase tracking-wider text-[10px] rounded-sm transition-colors flex items-center gap-1.5 shadow-sm">
                      <FiMail /> Send Email
                    </a>
                  </div>
                </div>

                <div className="p-3.5 bg-[#FAF9F5]/40 border border-slate-100/70 text-slate-500 text-[11px] font-light leading-relaxed rounded-sm">
                  <strong>Operational Hours:</strong> Dossier packages are evaluated Monday to Saturday between 9:30 AM and 6:30 PM IST.
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#F5EEDF] p-8 rounded-sm shadow-sm flex flex-col justify-center">
            <span className="text-amber-700 font-medium tracking-[0.2em] text-xs uppercase block mb-1">Corporate Corridor Presence</span>
            <h4 className="text-xl font-serif text-[#0B2D5B] mb-3">Location Chips</h4>
            <p className="text-xs text-slate-500 font-sans font-light leading-relaxed mb-6">
              Our active multi-category physical footprints maintain operational hubs inside the following major regional logistics corridors:
            </p>
            <div className="flex flex-wrap gap-2">
              {locations.map((city) => (
                <span key={city} className="bg-[#FAF9F5] border border-[#F5EEDF] text-[#0B2D5B] font-sans font-medium text-xs px-3.5 py-2 rounded-sm shadow-2xs">
                  {city}
                </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 05-BUSINESS VERTICALS PRESENTATION PANELS */}
      <section className="py-20 bg-[#F5EEDF] border-y border-[#C99B38]/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <span className="text-amber-700 font-medium tracking-[0.2em] text-xs uppercase block mb-2">Capabilities</span>
            <h2 className="text-3xl font-serif text-[#0B2D5B] tracking-tight">Six Commercial Verticals</h2>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={sampleStagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {verticals.map((v, idx) => (
              <motion.div 
                key={idx} 
                variants={fadeInUp}
                className="bg-white border border-slate-200/40 p-6 shadow-sm rounded-sm flex flex-col justify-between relative group hover:border-[#C99B38]/40 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-serif text-[#C99B38] font-bold text-lg tracking-wider">{v.num}</span>
                    <FiLayers className="text-slate-300 group-hover:text-[#C99B38] transition-colors" size={16} />
                  </div>
                  <h4 className="text-lg font-serif font-medium text-[#0B2D5B] mb-2">{v.title}</h4>
                  <p className="text-slate-600 text-xs font-sans font-light leading-relaxed mb-6">{v.desc}</p>
                </div>
                <Link to="/products" className="w-full inline-flex items-center justify-center text-center bg-[#FAF9F5] hover:bg-[#F5EEDF] border border-slate-100 text-[#0B2D5B] font-sans text-xs uppercase tracking-widest py-2.5 font-bold transition-colors">
                  {v.cta}
                </Link>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* DATA WORKFLOW PRESENTATION LAYER */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-amber-700 font-medium tracking-[0.2em] text-xs uppercase block mb-2">Procurement Architecture</span>
          <h2 className="text-3xl font-serif text-[#0B2D5B] tracking-tight">Our Rigorous Trade Workflow</h2>
          <p className="text-slate-500 font-sans font-light text-xs mt-2">We handle procedural complexity to preserve risk-free corporate supply lines.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          <div className="lg:col-span-5 space-y-3">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-4 rounded-sm border font-sans transition-all duration-150 flex items-center space-x-4 ${
                  activeStep === index
                    ? 'bg-[#0B2D5B] border-[#C99B38] text-white shadow-md'
                    : 'bg-white border-slate-200/60 text-slate-600 hover:bg-[#F5EEDF]/40'
                }`}
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono font-bold ${
                  activeStep === index ? 'bg-[#C99B38] text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {index + 1}
                </span>
                <span className="font-serif text-sm font-medium tracking-wide">{step.title}</span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-7 bg-white border border-[#F5EEDF] rounded-sm p-8 min-h-[260px] flex flex-col justify-between shadow-md relative overflow-hidden">
            <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.98] pointer-events-none"></div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 text-[#C99B38] mb-4">
                  <FiCheckCircle size={20} />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Phase {activeStep + 1} of 4</span>
                </div>
                <h3 className="text-xl font-serif font-medium text-[#0B2D5B] mb-3">{steps[activeStep].title}</h3>
                <p className="text-slate-600 text-xs font-sans font-light leading-relaxed">{steps[activeStep].description}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-sans">
              <span className="text-slate-400 font-light">Verification Discipline</span>
              <Link to="/contact" className="text-[#C99B38] font-semibold hover:underline flex items-center tracking-wide">
                Talk to a Compliance Specialist <FiChevronRight className="ml-0.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* PARTNER WITH INDIA TRADE OVERSEAS */}
      <section className="bg-slate-900 text-white py-16 border-t border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-serif text-white tracking-tight">Partner with India Trade Overseas</h2>
          <p className="text-slate-400 font-sans font-light text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Ready to secure regular commodity deliveries or customized natural stone blocks? Get in touch with our team today for direct port-to-port pricing configurations.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 pt-4">
            <Link to="/quote-request" className="bg-[#C99B38] hover:bg-amber-600 text-white font-sans font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm transition-colors shadow-sm">
              Get FOB / CIF Pricing
            </Link>
            <Link to="/contact" className="bg-transparent border border-white/40 hover:border-white text-white font-sans font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-sm transition-colors">
              Contact Commercial Office
            </Link>
          </div>
        </div>
      </section>

      {/* CORPORATE HANDOFF FOOTER SEAL */}
      <footer className="bg-[#0B2D5B] text-slate-400 py-12 px-4 border-t-2 border-[#C99B38] text-center font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">
            India Trade Overseas &bull; Empowering Trade. Enabling Growth.
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