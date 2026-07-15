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
  FiBookOpen,
  FiGlobe,
  FiShield,
  FiClipboard
} from 'react-icons/fi';

const CINEMATIC_CAROUSEL_BACKDROPS = [
  "./images/ito_images/ito_1.jpeg",
  "./images/ito_images/ito_2.png",
  "./images/ito_images/ito_3.jpeg",
  "./images/ito_images/ito_4.png",
  "./images/ito_images/ito_5.png",
  "./images/ito_images/ito_6.jpeg",
  "./images/ito_images/ito_7.png",
  "./images/ito_images/ito_8.jpeg",
  "./images/ito_images/ito_9.jpeg",
  "./images/ito_images/ito_10.jpeg",
  "./images/ito_images/ito_11.jpeg",
  "./images/ito_images/ito_12.jpeg",
  "./images/ito_images/ito_13.jpeg",
  "./images/ito_images/ito_14.png",
  "./images/ito_images/ito_15.jpeg",
  "./images/ito_images/ito_16.jpeg",
  "./images/ito_images/ito_17.jpeg",
  "./images/ito_images/ito_18.jpeg",
];

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    const backdropTimer = setInterval(() => {
      setCarouselIndex((prevIndex) => (prevIndex + 1) % CINEMATIC_CAROUSEL_BACKDROPS.length);
    }, 5000);
    return () => clearInterval(backdropTimer);
  }, []);

  const trustBadges = [
    { label: 'APEDA ', img: 'cer_1.jpeg' },
    { label: 'DGFT CERTIFIED', img: 'cer_2.jpeg' },
    { label: 'ISO CERTIFIED', img: 'cer_3.jpeg' },
    { label: 'FSSAI REGISTERED', img: 'cer_4.jpeg' },
    { label: 'GST REGISTERED', img: 'cer_5.jpeg' },
    { label: 'IEC HOLDER', img: 'cer_6.jpeg' },
    { label: 'MSME / UDYAM', img: 'cer_7.jpeg' },
  ];

  const locations = ['Kishanganj', 'Siliguri', 'Jaigaon', 'Noida', 'Bangladesh', 'Bhutan', 'Nepal'];

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

  const sampleStagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] antialiased min-h-screen selection:bg-[#6D7886]/30 selection:text-white font-sans overflow-x-hidden">

      {/* Structural Double-Line Top Border Accent mapped to token metrics */}
      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full absolute top-0 left-0 z-50"></div>

      {/* HERO SECTION: Configured as full bleed viewport height framework */}
      {/* HERO SECTION: Configured as a fully adaptive cinematic framework */}
      {/* HERO SECTION: Fully responsive layout architecture using dynamic grid row allocations */}
      {/* HERO SECTION: Configured as a fully adaptive cinematic framework */}
      <section className="relative min-h-screen lg:h-screen lg:min-h-[760px] lg:max-h-[980px] flex items-center bg-[#0E1116] overflow-hidden border-b border-[#C5CBD3]/10">

        {/* Dynamic Image Canvas Layer & Grading Modifications */}
        <div className="absolute inset-0 z-0 bg-[#040A12]">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={carouselIndex}
              initial={{ opacity: 0, scale: 1.0 }}
              animate={{ opacity: 1, scale: 1.035, transition: { duration: 1.5 } }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              src={CINEMATIC_CAROUSEL_BACKDROPS[carouselIndex]}
              alt="Cinematic Sourcing Container Logistics Terminal"
              className="w-full h-full object-cover object-[68%_center] absolute inset-0"
              style={{ filter: 'brightness(1.2) contrast(1.15) saturate(0.70)' }}
            />
          </AnimatePresence>

          {/* Cinematic Overlay Protectors Layering */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/95 via-[#040A12]/85 via-[#040A12]/70 via-[#040A12]/20 to-[#040A12]/10 z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/70 via-transparent to-[#040A12]/95 z-1 animate-none" />
          <div className="absolute inset-0 box-shadow-[inset_0_0_180px_rgba(0,0,0,0.48)] pointer-events-none z-1" />
        </div>

        {/* Unified Safe Content Container Frame with Expanded Layout Distribution */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sampleStagger}
          className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10 w-full flex flex-col justify-between pt-28 sm:pt-32 md:pt-36 lg:pt-[140px] pb-10 md:pb-12 lg:pb-16 min-h-screen lg:h-full"
        >
          {/* Centered Hero Content Left Column Block (Stretches text components evenly down the viewport height) */}
          <div className="max-w-[720px] text-left flex-1 flex flex-col justify-center space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12 xl:space-y-14 w-full py-8">

            <div>
              {/* Context Eyebrow Text */}
              <motion.p
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' } } }}
                className="font-sans font-medium text-[10px] sm:text-[11px] md:text-[12px] lg:text-[13px] tracking-[3px] sm:tracking-[4px] text-[#C5CBD3] uppercase mb-1"
              >
                GLOBAL TRADE. RELIABLE PARTNER.
              </motion.p>

              {/* Editorial Serif Main Heading */}
              <motion.h1
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } } }}
                className="text-3xl sm:text-5xl lg:text-6xl xl:text-[68px] font-serif tracking-tight font-normal leading-[1.2] sm:leading-[1.1] md:leading-[1.06] uppercase text-[#F2F4F7] mt-3 sm:mt-4"
              >
                CONNECTING INDIA.<br />
                POWERING THE WORLD.
              </motion.h1>
            </div>

            <div className="w-full">
              <motion.div
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                className="w-16 h-[1px] bg-[#C5CBD3]/30 mb-6 sm:mb-8 border-b"
                aria-hidden="true"
              />

              {/* Supporting Context Copy */}
              <motion.p
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } } }}
                className="font-sans font-light text-[#C5CBD3] text-xs sm:text-sm lg:text-[16px] max-w-[580px] leading-[1.65] opacity-90"
              >
                End-to-end trade and logistics solutions built on trust, scale, and performance. India Trade Overseas coordinates multi-dimensional distribution architectures safely across key global markets.
              </motion.p>
            </div>

            {/* Primary & Secondary Action Targets */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2">
              <Link to="/products" className="w-full sm:w-auto min-w-[220px] sm:min-w-[240px] bg-[#F2F4F7] border border-transparent hover:bg-[#C5CBD3] text-[#0E1116] text-[11px] sm:text-[12px] tracking-widest uppercase font-semibold h-[50px] sm:h-[54px] flex items-center justify-center rounded-[2px] transition-all duration-200 shadow-md">
                Explore Solutions &rarr;
              </Link>
              <Link to="/quote-request" className="w-full sm:w-auto min-w-[220px] sm:min-w-[250px] bg-[#121D29]/58 backdrop-blur-[8px] border border-[#C5CBD3]/42 hover:bg-[#2B3440] hover:border-[#F2F4F7] text-[#F2F4F7] text-[11px] sm:text-[12px] tracking-widest uppercase font-semibold h-[50px] sm:h-[54px] flex items-center justify-center rounded-[2px] transition-all duration-200">
                Request Bulk Quote &rarr;
              </Link>
            </div>
          </div>

          {/* DESKTOP HORIZON PANEL STRIP (Operational Pillars Matrix - Always anchors cleanly to the bottom) */}
          <div className="w-full hidden md:block pt-6 border-t border-white/5 mt-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full">

              <div className="grid grid-cols-[auto_1fr] gap-4 items-start px-4">
                <FiGlobe className="text-[#F2F4F7] shrink-0 mt-0.5" size={20} />
                <div>
                  <h5 className="text-[#F2F4F7] font-sans text-[13px] font-medium tracking-wider uppercase mb-1">Global Sourcing</h5>
                  <p className="text-[#C5CBD3] text-[11px] leading-normal font-light">Trusted network of manufacturers and suppliers across key markets.</p>
                </div>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-4 items-start px-4 border-l border-[#C5CBD3]/22">
                <FiShield className="text-[#F2F4F7] shrink-0 mt-0.5" size={20} />
                <div>
                  <h5 className="text-[#F2F4F7] font-sans text-[13px] font-medium tracking-wider uppercase mb-1">Smart Logistics</h5>
                  <p className="text-[#C5CBD3] text-[11px] leading-normal font-light">Integrated multi-modal logistics ensuring speed, reliability and scale.</p>
                </div>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-4 items-start px-4 border-l border-[#C5CBD3]/22">
                <FiClipboard className="text-[#F2F4F7] shrink-0 mt-0.5" size={20} />
                <div>
                  <h5 className="text-[#F2F4F7] font-sans text-[13px] font-medium tracking-wider uppercase mb-1">Compliance Assured</h5>
                  <p className="text-[#C5CBD3] text-[11px] leading-normal font-light">Adherence to international standards and regulatory excellence.</p>
                </div>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-4 items-start px-4 border-l border-[#C5CBD3]/22">
                <FiAnchor className="text-[#F2F4F7] shrink-0 mt-0.5" size={20} />
                <div>
                  <h5 className="text-[#F2F4F7] font-sans text-[13px] font-medium tracking-wider uppercase mb-1">Built For Partnerships</h5>
                  <p className="text-[#C5CBD3] text-[11px] leading-normal font-light">Long-term relationships powered by transparency and results.</p>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </section>

      {/* MOBILE ONLY PILLARS STRIP: Positioned cleanly below viewport as fallback scroll deck */}
      <section className="block md:hidden bg-[#0E1116] border-b border-[#C5CBD3]/24 py-10 px-6 w-full">
        <div className="grid grid-cols-1 gap-4 bg-[#121D29]/58 border border-[#C5CBD3]/24 p-5 rounded-md shadow-md w-full">
          {[
            { icon: <FiGlobe size={18} />, title: "Global Sourcing", desc: "Trusted network of manufacturers and suppliers across key markets." },
            { icon: <FiShield size={18} />, title: "Smart Logistics", desc: "Integrated multi-modal logistics ensuring speed, reliability and scale." },
            { icon: <FiClipboard size={18} />, title: "Compliance Assured", desc: "Adherence to international standards and regulatory excellence." },
            { icon: <FiAnchor size={18} />, title: "Built For Partnerships", desc: "Long-term relationships powered by transparency and results." }
          ].map((item, idx) => (
            <div key={idx} className="grid grid-cols-[auto_1fr] gap-3 py-3 border-b border-[#C5CBD3]/10 last:border-b-0 w-full text-left">
              <div className="text-[#F2F4F7] shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <h5 className="text-[#F2F4F7] font-sans text-[12px] font-medium tracking-wide uppercase mb-1">{item.title}</h5>
                <p className="text-[#C5CBD3] text-[11px] leading-relaxed font-light">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BRAND TRUST SIGNALS GRID STRIP */}
      <section className="bg-[#0E1116] py-8 border-b border-[#C5CBD3]/24 select-none">
        <div className="max-w-[1480px] mx-auto px-6 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center items-center gap-3 md:gap-4">
          {trustBadges.map((badge, index) => (
            <span
              key={index}
              className="inline-flex items-center justify-center w-full sm:w-auto sm:min-w-[140px] h-11 border border-[#C5CBD3]/24 text-[#F2F4F7] text-[10px] tracking-widest font-semibold uppercase px-4 rounded-[2px] transition-all duration-200 relative overflow-hidden group hover:border-[#F2F4F7]"
            >
              <img
                src={`./images/certificates/${badge.img}`}
                alt={`${badge.label} Certification Token`}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0 transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-[#0E1116]/80 backdrop-blur-[0.5px] z-5 transition-colors group-hover:bg-[#0E1116]/70" />
              <span className="relative z-10 text-center pointer-events-none text-[9px] sm:text-[10px] px-1 line-clamp-1">
                {badge.label}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* SYSTEM DOSSIER INFORMATION CARDS */}
      <section className="py-20 max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 p-6 rounded-md shadow-sm hover:border-[#C5CBD3] transition-colors duration-200">
            <div className="text-[#F2F4F7] mb-3"><FiActivity size={18} /></div>
            <h4 className="font-serif text-lg text-[#F2F4F7] mb-2">Enterprise Timeline</h4>
            <p className="text-xs text-[#C5CBD3] font-light leading-[1.6]">Established in 2024 as a founder-led trade gateway supporting secure business procurement chains.</p>
            <div className="text-[10px] font-mono font-bold text-[#6D7886] mt-4 tracking-wider">ESTABLISHED 2024</div>
          </div>

          <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 p-6 rounded-md shadow-sm hover:border-[#C5CBD3] transition-colors duration-200">
            <div className="text-[#F2F4F7] mb-3"><FiLayers size={18} /></div>
            <h4 className="font-serif text-lg text-[#F2F4F7] mb-2">Market Capabilities</h4>
            <p className="text-xs text-[#C5CBD3] font-light leading-[1.6]">Systematically configured to coordinate bulk cross-border operations across Trade, Supply, and Logistics networks.</p>
            <div className="text-[10px] font-mono font-bold text-[#6D7886] mt-4 tracking-wider">MULTILATERAL INFRASTRUCTURE</div>
          </div>

          <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 p-6 rounded-md shadow-sm hover:border-[#C5CBD3] transition-colors duration-200">
            <div className="text-[#F2F4F7] mb-3"><FiBookOpen size={18} /></div>
            <h4 className="font-serif text-lg text-[#F2F4F7] mb-2">Verified Sourcing</h4>
            <p className="text-xs text-[#C5CBD3] font-light leading-[1.6]">Connecting reliable suppliers, domestic factories, and overseas buyers under full document compliance parameters.</p>
            <div className="text-[10px] font-mono font-bold text-[#6D7886] mt-4 tracking-wider">QUALITY ASSURED PROFILE</div>
          </div>

        </div>
      </section>

      {/* INTAKE NODES & LOCATION CHIPS CONTAINER */}
      <section className="pb-20 max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          <div className="lg:col-span-7 bg-[#121D29]/58 border border-[#C5CBD3]/24 p-6 rounded-md shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-serif text-[#F2F4F7] mb-2">Official Transmission Node</h3>
              <p className="text-xs text-[#C5CBD3] font-sans font-light leading-[1.6] mb-6">
                To maintain standard corporate workflows and verification speed, all commercial sourcing inquiries are processed via our electronic mail network.
              </p>
              <div className="space-y-4 font-sans text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] gap-3">
                  <div>
                    <span className="text-[10px] tracking-wider uppercase font-bold text-[#6D7886] block mb-0.5">Secure Document Transmission</span>
                    <span className="text-[#F2F4F7] font-medium text-sm">info@indiatradeoverseas.com</span>
                  </div>
                  <a href="mailto:info@indiatradeoverseas.com" className="bg-[#2B3440] hover:bg-[#0E1116] text-[#F2F4F7] border border-[#C5CBD3]/42 hover:border-[#F2F4F7] px-4 h-[38px] font-semibold uppercase tracking-wider text-[10px] rounded-[2px] transition-colors flex items-center justify-center gap-2 shrink-0">
                    <FiMail /> Send Email
                  </a>
                </div>

                <div className="p-3.5 bg-[#040A12]/60 border border-[#C5CBD3]/10 text-[#6D7886] text-[11px] font-light leading-relaxed rounded-[2px]">
                  <strong>Operational Hours:</strong> Dossier packages are evaluated Monday to Saturday between 9:30 AM and 6:30 PM IST.
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#121D29]/58 border border-[#C5CBD3]/24 p-6 rounded-md shadow-sm flex flex-col justify-center">
            <span className="text-[#6D7886] font-medium tracking-[2px] text-[10px] uppercase block mb-1">Corporate Infrastructure</span>
            <h4 className="text-xl font-serif text-[#F2F4F7] mb-3">Corporate Office Locations</h4>
            <p className="text-xs text-[#C5CBD3] font-sans font-light leading-[1.6] mb-6">
              Our active multi-category physical footprints maintain operational hubs inside the following major regional logistics corridors:
            </p>
            <div className="flex flex-wrap gap-2">
              {locations.map((city) => (
                <span key={city} className="bg-[#0E1116] border border-[#C5CBD3]/24 text-[#F2F4F7] font-sans font-medium text-[11px] px-3 py-2 rounded-[2px] shadow-sm hover:border-[#F2F4F7] transition-colors duration-150">
                  {city}
                </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* CORE BUSINESS VERTICALS MATRIX */}
      <section className="relative py-20 bg-[#0E1116] border-y border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16 overflow-hidden">

        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-100">
          <img
            src="./images/ito_images/ito_2.png"
            alt="Commercial Verticals Layout Background"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#0E1116]/40 mix-blend-multiply" />
        </div>

        <div className="max-w-[1480px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block mb-2">Capabilities Matrix</span>
            <h2 className="text-3xl font-serif text-[#F2F4F7] tracking-wide uppercase">Six Commercial Verticals</h2>
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
                variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
                className="bg-[#121D29]/58 backdrop-blur-[4px] border border-[#C5CBD3]/24 p-6 shadow-sm rounded-[2px] flex flex-col justify-between group hover:border-[#F2F4F7] transition-colors duration-200"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-serif text-[#6D7886] font-bold text-lg tracking-wider">{v.num}</span>
                    <FiLayers className="text-[#6D7886] group-hover:text-[#F2F4F7] transition-colors" size={14} />
                  </div>
                  <h4 className="text-lg font-serif font-medium text-[#F2F4F7] mb-2.5">{v.title}</h4>
                  <p className="text-[#C5CBD3] text-xs font-sans font-light leading-[1.6] mb-6">{v.desc}</p>
                </div>
                <Link to="/products" className="w-full h-[40px] inline-flex items-center justify-center text-center bg-[#0E1116] hover:bg-[#2B3440] border border-[#C5CBD3]/24 hover:border-[#F2F4F7] text-[#F2F4F7] font-sans text-[11px] uppercase tracking-widest font-semibold transition-colors duration-150 rounded-[2px]">
                  {v.cta}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* DATA WORKFLOW LAYER BLOCK */}
      <section className="py-20 max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16">
        <div className="text-center mb-16">
          <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block mb-2">Procurement Architecture</span>
          <h2 className="text-3xl font-serif text-[#F2F4F7] tracking-wide uppercase">Our Rigorous Trade Workflow</h2>
          <p className="text-[#6D7886] font-sans font-light text-xs mt-2">We handle procedural complexity to preserve risk-free corporate supply lines.</p>
        </div>

        <div className="grid grid-cols-1 grid-rows-none lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-3">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-4 rounded-[2px] border font-sans transition-all duration-150 flex items-center space-x-4 ${activeStep === index
                  ? 'bg-[#2B3440] border-[#F2F4F7] text-[#F2F4F7] shadow-sm'
                  : 'bg-[#0E1116] border-[#C5CBD3]/24 text-[#C5CBD3] hover:bg-[#2B3440]/40'
                  }`}
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-mono font-bold ${activeStep === index ? 'bg-[#F2F4F7] text-[#0E1116]' : 'bg-[#040A12] border border-[#C5CBD3]/24 text-[#6D7886]'
                  }`}>
                  {index + 1}
                </span>
                <span className="font-serif text-[13px] font-medium tracking-wide">{step.title}</span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-7 bg-[#121D29]/58 border border-[#C5CBD3]/24 rounded-md p-6 min-h-[240px] flex flex-col justify-between shadow-sm relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 text-[#6D7886] mb-4">
                  <FiCheckCircle size={16} />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Phase {activeStep + 1} of 4</span>
                </div>
                <h3 className="text-xl font-serif font-medium text-[#F2F4F7] mb-3">{steps[activeStep].title}</h3>
                <p className="text-[#C5CBD3] text-xs font-sans font-light leading-[1.65]">{steps[activeStep].description}</p>
              </motion.div>
            </AnimatePresence>

            <div className="text-right text-xs font-sans pt-4 border-t border-[#C5CBD3]/10 mt-6">
              <Link to="/contact" className="text-[#F2F4F7] font-semibold hover:underline inline-flex items-center tracking-wide">
                Talk to a Compliance Specialist <FiChevronRight className="ml-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL FULFILLMENT MATRIX CTA BLOCK */}
      <section className="relative w-full py-24 px-6 sm:px-12 lg:px-16 overflow-hidden border-t border-[#C5CBD3]/24 bg-[#040A12]">

        <div className="absolute inset-0 z-0 opacity-70">
          <img
            src="./images/ito_images/ito_1.jpeg"
            alt="India Trade Overseas Freight Port Terminal Background"
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(1.3) contrast(1.15) saturate(0.72)' }}
          />
          <div className="absolute inset-0 bg-[#0E1116]/70 backdrop-blur-[0.5px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#2B3440]/80 border border-[#C5CBD3]/24 rounded-full px-4 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F2F4F7] animate-ping" />
            <span className="text-[10px] tracking-widest font-mono uppercase text-[#F2F4F7] font-bold">Fulfillment Matrix</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-serif text-[#F2F4F7] tracking-wide uppercase leading-tight">
            Partner with India Trade Overseas
          </h2>

          <p className="text-[#C5CBD3] font-sans font-light text-xs sm:text-sm max-w-2xl leading-[1.6] mx-auto">
            Ready to secure regular commodity deliveries or customized natural stone blocks? Get in touch with our team today for direct port-to-port pricing configurations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto items-center justify-center">
            <Link to="/quote-request" className="w-full sm:w-auto min-w-[220px] h-[52px] bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#0E1116] font-sans font-bold text-[12px] uppercase tracking-widest flex items-center justify-center rounded-[2px] transition-all shadow-md">
              Get FOB / CIF Pricing
            </Link>
            <Link to="/contact" className="w-full sm:w-auto min-w-[240px] h-[52px] bg-[#121D29]/58 backdrop-blur-[4px] border border-[#C5CBD3]/42 text-[#F2F4F7] hover:bg-[#2B3440] hover:border-[#F2F4F7] font-sans font-bold text-[12px] uppercase tracking-widest flex items-center justify-center rounded-[2px] transition-all">
              Contact Commercial Office
            </Link>
          </div>
        </div>
      </section>

      {/* CORPORATE FOOTER PANEL */}
      <footer className="bg-[#040A12] text-[#6D7886] py-16 px-6 border-t border-[#C5CBD3]/24 text-center font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[16px] uppercase tracking-[0.25em] font-semibold text-[#F2F4F7]">
            India Trade Overseas
            <br />
            <span className="text-xs text-[#6D7886] tracking-widest capitalize font-normal font-sans block mt-1">Trade. Supply. Logistics. Growth.</span>
          </p>
          <p className="text-xs italic text-[#C5CBD3]/60 font-serif">
            "Where Quality Meets Global Demand"
          </p>
          <div className="text-[10px] text-[#ffff]/60 font-light max-w-2xl mx-auto border-t border-[#C5CBD3]/30 pt-4 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>

    </div>
  );
}