import React from 'react';
import { 
  FiShield, 
  FiAward, 
  FiUsers, 
  FiTrendingUp, 
  FiCopy, 
  FiPhone, 
  FiMail, 
  FiMapPin 
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function About() {
  const coreValues = [
    { icon: FiShield, title: 'Integrity', description: 'Honest, transparent and ethical business practices in every transaction.' },
    { icon: FiAward, title: 'Quality', description: 'Reliable products and services aligned with buyer specifications and commercial expectations.' },
    { icon: FiUsers, title: 'Trust', description: 'Long-term business relationships built through consistency, accountability and clear communication.' },
    { icon: FiTrendingUp, title: 'Growth', description: 'Creating commercial opportunities for clients, supply partners and communities.' }
  ];

  const fullCompanyProfileText = `INDIA TRADE OVERSEAS
Empowering Trade. Enabling Growth.
Where Quality Meets Global Demand.
Established: 2024
Founder & Proprietor: Md Ramiz Raza Khan
Co-Founder/ Business Support: Soniya Bharti
Registered Office: Kishanganj, Bihar, India
Branch Office: Pradhan Nagar, Siliguri, West Bengal, India
Additional Presence: Jaigaon and Noida
Factory: Deramari, Kishanganj, Bihar, India
Phone: +91 82506 14079
Email: info.indiatradeoverseas@gmail.com
GSTIN: 10JIMPK9981B1Z0
FSSAI Licence No.: 20425371000005`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to Clipboard'))
      .catch(() => toast.error('Failed to copy to clipboard'));
  };

  return (
    <div className="bg-[#FBF7EF] text-slate-900 antialiased min-h-screen selection:bg-amber-100 selection:text-amber-900">
      
      {/* Decorative Double Gold Line Top Border */}
      <div className="border-t-[3px] border-double border-[#C99B38] w-full"></div>

      {/* Corporate Editorial Header */}
      {/* <header className="relative max-w-7xl mx-auto pt-20 pb-12 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-6xl font-serif text-[#0B2D5B] tracking-tight font-normal mb-4">
          India Trade Overseas
        </h1>
        <div className="w-24 h-[1px] bg-[#C99B38] mx-auto mb-4"></div>
        <p className="text-md sm:text-lg uppercase tracking-[0.2em] font-sans text-[#C99B38] font-semibold mb-2">
          Empowering Trade. Enabling Growth.
        </p>
        <p className="text-sm italic font-serif text-slate-600 tracking-wide">
          Where Quality Meets Global Demand.
        </p>
      </header> */}

      {/* Main Presentation Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Left Side: The Asymmetric Profile Cover Image */}
          <div className="lg:col-span-5 w-full flex justify-center">
            <div className="relative p-4 bg-white border border-[#F5EEDF] shadow-xl rounded-sm">
              <div className="absolute inset-0 border border-[#C99B38]/20 scale-[0.97] pointer-events-none"></div>
              <img 
                src="/images/ito Image.jpeg" 
                alt="India Trade Overseas Complete Company Profile Cover" 
                className="w-full h-auto object-contain max-h-[500px]"
                onError={(e) => {
                  e.target.src = './images/ITO Logo.jpeg';
                }}
              />
              {/* <div className="mt-4 text-center border-t border-slate-100 pt-3">
                <p className="font-serif italic text-xs text-slate-400 tracking-wide">
                  Complete Company Book Cover &bull; 2026 Edition
                </p>
              </div> */}
            </div>
          </div>

          {/* Right Side: Detailed Narrative Block */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-6">
              <h2 className="text-3xl font-serif text-[#0B2D5B] tracking-tight">
                Corporate Profile &amp; Overview
              </h2>
              <p className="text-slate-700 leading-relaxed font-sans font-light text-base">
                India Trade Overseas is a founder-led Indian enterprise established in 2024. The business operates across trade, sourcing, supply coordination, logistics support, manufacturing initiatives and commercial growth solutions. The company connects suppliers, buyers, logistics partners and markets across India and international trade channels, with emphasis on professional communication, transparent dealing, product reliability and customer-focused execution.
              </p>
            </div>

            {/* Structured Parameters Quick Read */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#C99B38]/20">
              <div className="bg-[#F5EEDF] p-4 rounded-sm border border-[#C99B38]/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C99B38] block mb-1">Established</span>
                <span className="font-serif text-xl text-[#0B2D5B]">2024</span>
              </div>
              <div className="bg-[#F5EEDF] p-4 rounded-sm border border-[#C99B38]/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C99B38] block mb-1">Company Positioning</span>
                <span className="font-sans text-xs text-slate-700 font-medium leading-tight block">
                  Trade | Supply | Logistics | Export
                </span>
              </div>
            </div>

            {/* Quick Location Badge Strip */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">Operational Presence</span>
              <div className="flex flex-wrap gap-2 text-xs font-sans text-[#0B2D5B]">
                {['Kishanganj', 'Siliguri', 'Jaigaon', 'Noida'].map((city) => (
                  <span key={city} className="bg-white px-3 py-1.5 border border-[#F5EEDF] flex items-center gap-1.5 text-xs rounded-sm shadow-sm font-medium">
                    <FiMapPin size={12} className="text-[#C99B38]" /> {city}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-16 bg-[#F5EEDF] border-y border-[#C99B38]/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-amber-700 font-medium tracking-[0.2em] text-xs uppercase block mb-2">Operational Anchors</span>
            <h2 className="text-3xl font-serif text-[#0B2D5B] tracking-tight">Core Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((value, idx) => (
              <div key={idx} className="bg-white p-6 border border-[#F5EEDF] shadow-sm rounded-sm">
                <div className="text-[#C99B38] bg-[#FAF9F5] inline-flex p-3 rounded-sm border border-[#C99B38]/10 mb-4">
                  <value.icon size={20} />
                </div>
                <h4 className="text-lg font-serif font-medium text-[#0B2D5B] mb-2">{value.title}</h4>
                <p className="text-slate-600 text-xs leading-relaxed font-sans font-light">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate Governance Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-amber-700 font-medium tracking-[0.2em] text-xs uppercase block mb-2">Governance</span>
          <h2 className="text-3xl font-serif text-[#0B2D5B] tracking-tight">Leadership</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Executive Founder Card */}
          <div className="bg-white border border-[#F5EEDF] shadow-md rounded-sm p-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full mb-6 border border-[#F5EEDF] shadow-inner overflow-hidden bg-[#FAF9F5] flex items-center justify-center">
              <img 
                src="./images/Raza.jpeg" 
                alt="Md Ramiz Raza Khan" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<span class="font-serif text-sm italic text-slate-400">ITO</span>';
                }}
              />
            </div>
            <h4 className="text-lg font-serif font-semibold text-[#0B2D5B]">Md Ramiz Raza Khan</h4>
            <p className="text-[11px] uppercase tracking-widest font-semibold text-[#C99B38] mb-2 mt-1">Founder &amp; Proprietor</p>
            <span className="text-[10px] bg-[#FAF9F5] text-slate-500 px-3 py-1 border border-[#F5EEDF] rounded-full mb-4 font-mono">
              BA LLB, Amity University, Mumbai
            </span>
            <p className="text-slate-600 text-xs font-sans font-light leading-relaxed border-t border-slate-100 pt-4 w-full">
              Leads global enterprise trade directions, regional administrative decisions, compliant documentation workflows, and strategic organizational structure.
            </p>
          </div>

          {/* Co-Founder Card */}
          <div className="bg-white border border-[#F5EEDF] shadow-md rounded-sm p-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full mb-6 border border-[#F5EEDF] shadow-inner overflow-hidden bg-[#FAF9F5] flex items-center justify-center">
              <img 
                src="./images/Ito Image.jpeg" 
                alt="Soniya Singh" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<span class="font-serif text-sm italic text-slate-400">ITO</span>';
                }}
              />
            </div>
            <h4 className="text-lg font-serif font-semibold text-[#0B2D5B]">Soniya Singh</h4>
            <p className="text-[11px] uppercase tracking-widest font-semibold text-[#C99B38] mb-2 mt-1">Co-Founder / Business Support</p>
            <span className="text-[10px] bg-[#FAF9F5] text-slate-500 px-3 py-1 border border-[#F5EEDF] rounded-full mb-4 font-mono">
              Operational Coordination
            </span>
            <p className="text-slate-600 text-xs font-sans font-light leading-relaxed border-t border-slate-100 pt-4 w-full">
              Directs multi-category supply chain coordination, high-level client business communication management, and regional operational execution logistics.
            </p>
          </div>
        </div>
      </section>

      {/* Corporate Handoff Footer Seal */}
      <footer className="bg-[#0B2D5B] text-slate-400 py-12 px-4 border-t-2 border-[#C99B38] text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">
            India Trade Overseas &bull; Empowering Trade. Enabling Growth.
          </p>
          <p className="text-xs italic text-[#C99B38] font-serif">
            "Where Quality Meets Global Demand."
          </p>
          <div className="text-[10px] font-sans text-slate-400 font-light max-w-xl mx-auto border-t border-slate-700/50 pt-4 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>

    </div>
  );
}
