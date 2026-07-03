import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAnchor,
  FiChevronRight,
  FiCheckCircle,
  FiCopy,
  FiLayers,
  FiMapPin
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { IoLogoWhatsapp } from "react-icons/io";

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);

  // Mandated Trust Badge Set
  const trustBadges = [
    'EXPORTER', 'IMPORTER', 'BULK SUPPLIER', 'ITO TRANSPORT',
    'TRADE SOLUTIONS', 'GST REGISTERED', 'IEC HOLDER', 'MSME / UDYAM', 'FSSAI REGISTERED'
  ];

  // Mandated Location Chips
  const locations = ['Kishanganj', 'Siliguri', 'Jaigaon', 'Noida'];

  // Mandated Full Clipboard Dataset
  const companyDetailsText = `India Trade Overseas
Motto: Empowering Trade. Enabling Growth.
Brand Line: Where Quality Meets Global Demand.
Phone: +91 82506 14079
Email: info.indiatradeoverseas@gmail.com
GSTIN: 10JIMPK9981B1Z0
FSSAI Licence No.: 20425371000005
Registered Office: Kishanganj, Bihar, India
Branch Office: Pradhan Nagar, Siliguri, West Bengal, India
Factory: Deramari, Kishanganj, Bihar, India`;

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

  const copyToClipboard = (text, successMsg = 'Copied to Clipboard') => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(successMsg))
      .catch(() => toast.error('Clipboard access disabled'));
  };

  return (
    <div className="bg-[#FBF7EF] text-slate-900 antialiased min-h-screen selection:bg-amber-100 selection:text-amber-900 font-sans">
      
      {/* Non-Negotiable Double Gold Frame Top Divider Accent */}
      <div className="border-t-[3px] border-double border-[#C99B38] w-full"></div>

      {/* 03 HOME HERO SECTION - WITH CINEMATIC VESSEL BG OVERLAY */}
      <section className="relative min-h-[85vh] flex items-center bg-[#0B2D5B] text-white py-24 md:py-32 overflow-hidden border-b border-[#C99B38]">
        
        {/* Cinematic Backdrop Image Layer */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1920&q=80" 
            alt="Cinematic Container Vessel" 
            className="w-full h-full object-cover object-center transform scale-105 animate-[subtle-zoom_20s_infinite_alternate]"
          />
          {/* Brand-Directive Gradient Shield (Ensures Premium Contrast) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B2D5B]/95 via-[#0B2D5B]/90 to-[#102F60]/80 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2D5B] via-transparent to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center w-full">
          <div className="max-w-4xl mx-auto">
            
            {/* Context Badge */}
            <span className="inline-flex items-center space-x-2 bg-[#102F60]/80 backdrop-blur-xs text-blue-200 border border-[#C99B38]/30 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-6">
              <FiAnchor className="text-[#C99B38]" /> <span>India Trade Overseas</span>
            </span>

            {/* Mandated Hero Heading Text */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white tracking-tight font-normal leading-tight mb-4">
              INDIA TRADE OVERSEAS <br />
              <span className="text-slate-200 text-2xl sm:text-3xl block mt-2 font-sans font-light tracking-wide">
                Trade. Supply. Logistics. Growth.
              </span>
            </h1>

            <div className="w-16 h-[1px] bg-[#C99B38] mx-auto mb-6"></div>

            {/* Motto & Supporting Brand Lines */}
            <p className="text-xl sm:text-2xl uppercase tracking-[0.15em] font-sans text-[#C99B38] font-bold mb-2">
              Empowering Trade. Enabling Growth.
            </p>
            <p className="text-sm sm:text-base italic font-serif text-slate-300 tracking-wider mb-8 block">
              Where Quality Meets Global Demand.
            </p>

            {/* Mandated Hero Narrative Copy */}
            <p className="text-slate-300 font-sans font-light text-sm sm:text-base max-w-3xl mx-auto leading-relaxed mb-12 backdrop-blur-xs py-2">
              India Trade Overseas is a multi-dimensional trade enterprise providing domestic and international sourcing, bulk supply, logistics coordination, industrial materials, construction materials, food commodities and consumer product solutions.
            </p>

            {/* Mandated Hero Multi-Action Interface Matrix */}
            <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 max-w-4xl mx-auto">
              <Link to="/products" className="bg-[#C99B38] hover:bg-amber-600 text-white text-xs tracking-widest uppercase font-semibold px-6 py-3.5 rounded-sm shadow-md transition-colors">
                Explore Products
              </Link>
              <Link to="/quote-request" className="bg-transparent border border-white/40 hover:border-white text-white text-xs tracking-widest uppercase font-semibold px-6 py-3.5 rounded-sm transition-colors">
                Request Bulk Quote
              </Link>
              <a href="https://wa.me/918250614079" target="_blank" rel="noreferrer" className="bg-[#102F60] hover:bg-slate-800 text-white text-xs tracking-widest uppercase font-semibold px-6 py-3.5 rounded-sm border border-[#C99B38]/20 transition-all">
                <IoLogoWhatsapp className='text-xl'/>
              </a>
            </div>

          </div>
        </div>
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

      {/* CORE INFO MATRIX: QUICK CONTACT & LOCATION CHIPS */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Quick Contact Card Panel */}
          <div className="lg:col-span-7 bg-white border border-[#F5EEDF] p-8 rounded-sm shadow-md flex flex-col justify-between relative">
            <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.98] pointer-events-none"></div>
            <div>
              <h3 className="text-2xl font-serif text-[#0B2D5B] mb-6">Quick Contact Card</h3>
              <div className="space-y-4 font-sans text-xs">
                
                {/* Conduits: WhatsApp / Call */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#FAF9F5] border border-slate-100 rounded-sm gap-3">
                  <div>
                    <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400 block mb-0.5">WhatsApp / Call Conduits</span>
                    <span className="text-slate-800 font-medium text-sm tracking-wide">+91 82506 14079</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href="tel:+918250614079" className="bg-[#0B2D5B] hover:bg-[#102F60] text-white px-3 py-3 font-semibold uppercase tracking-wider text-[10px] rounded-sm transition-colors">Call Now</a>
                    <a href="https://wa.me/918250614079" target="_blank" rel="noreferrer" className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 font-semibold uppercase tracking-wider text-[10px] rounded-sm transition-colors"><IoLogoWhatsapp className='text-xl'/></a>
                  </div>
                </div>

                {/* Conduits: Email */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#FAF9F5] border border-slate-100 rounded-sm gap-3">
                  <div>
                    <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400 block mb-0.5">Secure Document Transmission</span>
                    <span className="text-slate-800 font-medium text-sm">info.indiatradeoverseas@gmail.com</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href="mailto:info.indiatradeoverseas@gmail.com" className="bg-[#0B2D5B] hover:bg-[#102F60] text-white px-3 py-2 font-semibold uppercase tracking-wider text-[10px] rounded-sm transition-colors">Send Email</a>
                  </div>
                </div>

                {/* Conduits: Hours */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#FAF9F5] border border-slate-100 rounded-sm gap-3">
                  <div>
                    <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400 block mb-0.5">Operational Availability</span>
                    <span className="text-slate-800 font-medium text-xs">Monday to Saturday 9:30 AM to 6:30 PM IST</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Location Chips Panel */}
          <div className="lg:col-span-5 bg-white border border-[#F5EEDF] p-8 rounded-sm shadow-md flex flex-col justify-center">
            <span className="text-amber-700 font-medium tracking-[0.2em] text-xs uppercase block mb-1">Corporate Corridor Presence</span>
            <h4 className="text-xl font-serif text-[#0B2D5B] mb-3">Location Chips</h4>
            <p className="text-xs text-slate-500 font-sans font-light leading-relaxed mb-6">
              Our active multi-category physical footprints maintain operational hubs inside the following major regional logistics corridors:
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {verticals.map((v, idx) => (
              <div key={idx} className="bg-white border border-slate-200/40 p-6 shadow-sm rounded-sm flex flex-col justify-between relative group hover:border-[#C99B38]/40 transition-colors">
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
              </div>
            ))}
          </div>

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
          
          {/* Toggle Column */}
          <div className="lg:col-span-5 space-y-3">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-4 rounded-sm border font-sans transition duration-150 flex items-center space-x-4 ${
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

          {/* Detailed Response Block Panel */}
          <div className="lg:col-span-7 bg-white border border-[#F5EEDF] rounded-sm p-8 min-h-[260px] flex flex-col justify-between shadow-md relative">
            <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.98] pointer-events-none"></div>
            <div>
              <div className="flex items-center gap-2 text-[#C99B38] mb-4">
                <FiCheckCircle size={20} />
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Phase {activeStep + 1} of 4</span>
              </div>
              <h3 className="text-xl font-serif font-medium text-[#0B2D5B] mb-3">{steps[activeStep].title}</h3>
              <p className="text-slate-600 text-xs font-sans font-light leading-relaxed">{steps[activeStep].description}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-sans">
              <span className="text-slate-400 font-light">Verification Discipline</span>
              <Link to="/contact" className="text-[#C99B38] font-semibold hover:underline flex items-center tracking-wide">
                Talk to a Compliance Specialist <FiChevronRight className="ml-0.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* PARTNER WITH INDIA TRADE OVERSEAS (MODERN CTA) */}
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