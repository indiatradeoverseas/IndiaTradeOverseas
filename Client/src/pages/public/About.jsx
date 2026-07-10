import React from 'react';
import { FiShield, FiAward, FiUsers, FiTrendingUp, FiMapPin } from 'react-icons/fi';

export default function About() {
  const coreValues = [
    { icon: FiShield, title: 'Integrity', description: 'Honest, transparent and ethical business practices in every transaction.' },
    { icon: FiAward, title: 'Quality', description: 'Reliable products and services aligned with buyer specifications and commercial expectations.' },
    { icon: FiUsers, title: 'Trust', description: 'Long-term business relationships built through consistency, accountability and clear communication.' },
    { icon: FiTrendingUp, title: 'Growth', description: 'Creating commercial opportunities for clients, supply partners and communities.' }
  ];

  return (
    <div className="bg-[#0C1F3F] text-white antialiased min-h-screen selection:bg-[#8FAADC]/30 selection:text-white">
      <div className="border-t-[3px] border-double border-[#8FAADC] w-full"></div>

      {/* Overview Block */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 w-full flex justify-center">
            <div className="relative p-3 bg-[#0C1F3F] border border-[#8FAADC]/20 shadow-xl rounded-2xl">
              <img src="/images/ito Image.jpeg" alt="Company Profile" className="w-full h-auto object-contain max-h-[460px] rounded-xl" onError={(e) => e.target.src = './images/Company_logo.png'} />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="text-[#8FAADC] text-[10px] font-bold tracking-[0.25em] uppercase block">Dossier Statement</span>
            <h2 className="text-3xl sm:text-4xl font-serif text-white font-bold tracking-tight uppercase">Corporate Overview</h2>
            <p className="text-white/80 leading-relaxed font-sans font-light text-sm sm:text-base">
              India Trade Overseas is a founder-led enterprise established in 2024. The business operates across complex raw product sourcing configurations, large-volume supply operations, inter-state transit distribution routing models, and custom manufacturing. We unify trusted processing mills and industrial sectors under strict corporate governance blueprints.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#8FAADC]/20">
              <div className="bg-[#0C1F3F] p-4 rounded-xl border border-[#8FAADC]/30">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#8FAADC] font-bold block mb-0.5">Established</span>
                <span className="font-serif text-xl font-bold text-white">2024</span>
              </div>
              <div className="bg-[#0C1F3F] p-4 rounded-xl border border-[#8FAADC]/30">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#8FAADC] font-bold block mb-0.5">Market Core</span>
                <span className="font-sans text-[11px] text-white font-bold block mt-1 uppercase tracking-wide">Trade &bull; Logistics &bull; EXIM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Block */}
      <section className="py-20 bg-[#0C1F3F] border-y border-[#8FAADC]/20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-1">
            <span className="text-[#8FAADC] font-bold tracking-[0.25em] text-[10px] uppercase block">Operational Pillars</span>
            <h2 className="text-2xl sm:text-3xl font-serif text-white font-bold uppercase tracking-wide">Core Corporate Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((value, idx) => (
              <div key={idx} className="bg-[#0C1F3F] p-6 border border-[#8FAADC]/20 shadow-2xs rounded-2xl group hover:border-[#8FAADC] transition-all duration-300">
                <div className="text-[#8FAADC] bg-[#0C1F3F] inline-flex p-3 rounded-xl border border-[#8FAADC]/20 mb-4 transition-colors group-hover:bg-[#8FAADC] group-hover:text-[#0C1F3F]"><value.icon size={18} /></div>
                <h4 className="text-base font-serif font-bold text-white mb-1.5">{value.title}</h4>
                <p className="text-[#8FAADC] text-xs leading-relaxed font-sans font-light">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Block */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-1">
          <span className="text-[#8FAADC] font-bold tracking-[0.25em] text-[10px] uppercase block">Executive Desk</span>
          <h2 className="text-2xl sm:text-3xl font-serif text-white font-bold uppercase tracking-wide">Governance &amp; Direction</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-[#0C1F3F] border border-[#8FAADC]/20 shadow-sm rounded-2xl p-8 flex flex-col items-center text-center hover:border-[#8FAADC] transition-colors duration-300">
            <div className="w-20 h-24 rounded-xl mb-4 border border-[#8FAADC]/20 overflow-hidden bg-[#0C1F3F]"><img src="./images/Raza.jpeg" alt="Md Ramiz Raza Khan" className="w-full h-full object-cover scale-105" /></div>
            <h4 className="text-base font-serif font-bold text-white">Md Ramiz Raza Khan</h4>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#8FAADC] mb-2">Founder &amp; Proprietor</p>
            <span className="text-[9px] bg-[#0C1F3F] text-white px-3 py-1 border border-[#8FAADC]/20 rounded-full font-mono">BA LLB, Amity University, Mumbai</span>
            <p className="text-[#8FAADC] text-xs font-sans font-light leading-relaxed border-t border-[#8FAADC]/10 pt-4 mt-4 w-full">Directs legal auditing frameworks, multilateral corporate trade relations, document compliance parameters, and macro portfolio execution setups.</p>
          </div>

          <div className="bg-[#0C1F3F] border border-[#8FAADC]/20 shadow-sm rounded-2xl p-8 flex flex-col items-center text-center hover:border-[#8FAADC] transition-colors duration-300">
            <div className="w-20 h-24 rounded-xl mb-4 border border-[#8FAADC]/20 overflow-hidden bg-[#0C1F3F]"><img src="./images/sonia_mam_new_image.jpeg" alt="Soniya Singh" className="w-full h-full object-cover scale-105" /></div>
            <h4 className="text-base font-serif font-bold text-white">Soniya Singh</h4>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#8FAADC] mb-2">Co-Founder / Business Support</p>
            <span className="text-[9px] bg-[#0C1F3F] text-white px-3 py-1 border border-[#8FAADC]/20 rounded-full font-mono">Operations Management</span>
            <p className="text-[#8FAADC] text-xs font-sans font-light leading-relaxed border-t border-[#8FAADC]/10 pt-4 mt-4 w-full">Manages dynamic client-facing account pipelines, multi-tier source logging infrastructures, and state-level freight transport distribution setups.</p>
          </div>
        </div>
      </section>

      {/* Footer Seal */}
      <footer className="bg-[#0C1F3F] text-[#8FAADC] py-12 px-4 border-t-2 border-[#2F5DA8] text-center font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">India Trade Overseas <br /> Empowering Trade. Enabling Growth.</p>
          <p className="text-xs italic text-[#FFF1E8]/80 font-serif">"Where Quality Meets Global Demand."</p>
          <div className="text-[10px] text-[#8FAADC]/50 font-light max-w-2xl mx-auto border-t border-[#8FAADC]/10 pt-4 leading-relaxed">Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.</div>
        </div>
      </footer>
    </div>
  );
}