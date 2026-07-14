import React from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiAward, FiUsers, FiTrendingUp } from 'react-icons/fi';

export default function About() {
  const coreValues = [
    { icon: FiShield, title: 'Integrity', description: 'Honest, transparent and ethical business practices in every transaction.' },
    { icon: FiAward, title: 'Quality', description: 'Products and services aligned with agreed buyer specifications and commercial expectations.' },
    { icon: FiUsers, title: 'Trust', description: 'Long-term relationships built through consistency, accountability and clear communication.' },
    { icon: FiTrendingUp, title: 'Growth', description: 'Commercial opportunities created for clients, supply partners, employees and communities.' }
  ];

  const governancePillars = [
    { title: 'Ethical Governance', desc: 'Strict compliance architectures managing structural domestic and multilateral risk variables securely.' },
    { title: 'Strategic Leadership', desc: 'Data-guided operational pipelines steering source security and dynamic fulfillment workflows.' },
    { title: 'Risk and Compliance', desc: 'Rigorous transactional auditing frameworks handling complete regulatory parameters.' },
    { title: 'Sustainable Vision', desc: 'Scalable structural value models driving continuous multi-generational institutional growth.' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.15,
      }
    }
  };

  const textPopUpVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] antialiased min-h-screen selection:bg-[#6D7886]/30 selection:text-white font-sans overflow-x-hidden">
      {/* Structural Double-Line Top Border Accent */}
      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full"></div>

      {/* Page Hero Template Layer */}
      <section className="relative w-full py-16 lg:py-24 px-6 sm:px-12 lg:px-16 overflow-hidden bg-[#040A12] border-b border-[#C5CBD3]/10">
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-100">
          <img
            src="/images/ito_images/ito_7.png"
            alt="Corporate Operations Background Canvas"
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(1.5) contrast(1.15) saturate(0.72)' }}
          />
          <div className="absolute inset-0 bg-[#0E1116]/80 mix-blend-multiply" />
        </div>

        <div className="max-w-[1480px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full pt-[60px]">
          <div className="lg:col-span-5 w-full flex justify-center">
            <div className="relative p-2 bg-[#121D29]/58 backdrop-blur-[8px] border border-[#C5CBD3]/24 rounded-[4px] shadow-xl">
              <img
                src="/images/ito_images/ito_5.png"
                alt="Company Profile"
                className="w-full h-auto object-contain max-h-[460px] rounded-[2px]"
                onError={(e) => e.target.src = './images/Company_logo.png'}
              />
            </div>
          </div>

          <motion.div
            className="lg:col-span-7 space-y-5 text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.span
              variants={textPopUpVariants}
              className="text-[#6D7886] text-[11px] sm:text-[12px] font-medium tracking-[3px] uppercase block font-sans"
            >
              ABOUT INDIA TRADE OVERSEAS
            </motion.span>

            <motion.h1
              variants={textPopUpVariants}
              className="text-3xl sm:text-4xl lg:text-[54px] font-serif text-[#F2F4F7] font-normal tracking-tight uppercase leading-[1.1]"
            >
              Corporate Overview
            </motion.h1>

            <motion.p
              variants={textPopUpVariants}
              className="text-[#C5CBD3] leading-[1.65] font-sans font-light text-sm sm:text-base max-w-[680px]"
            >
              A founder-led trade and logistics enterprise connecting trusted supply with domestic and international demand. India Trade Overseas operates across complex raw product sourcing configurations, large-volume supply operations, inter-state transit distribution routing models, and custom manufacturing. We unify trusted processing mills and industrial sectors under strict corporate governance blueprints.
            </motion.p>

            <motion.div
              variants={textPopUpVariants}
              className="grid grid-cols-2 gap-4 pt-6 border-t border-[#C5CBD3]/24 max-w-[480px]"
            >
              <div className="bg-[#121D29]/58 p-4 rounded-[4px] border border-[#C5CBD3]/24 shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6D7886] font-bold block mb-1">Established</span>
                <span className="font-serif text-2xl font-normal text-[#F2F4F7]">2024</span>
              </div>
              <div className="bg-[#121D29]/58 p-4 rounded-[4px] border border-[#C5CBD3]/24 shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6D7886] font-bold block mb-1">Headquarters</span>
                <span className="font-sans text-[12px] text-[#F2F4F7] font-medium block mt-1 uppercase tracking-wide">Kishanganj, Bihar</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Values Section Grid - Alternating Palette Context Mapping */}
      <section className="py-20 bg-[#0E1116] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16">
        <div className="max-w-[1480px] mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">Operational Pillars</span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">Core Corporate Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((value, idx) => (
              <div key={idx} className="bg-[#121D29]/58 p-6 border border-[#C5CBD3]/24 rounded-[4px] shadow-sm group hover:border-[#F2F4F7] transition-all duration-200">
                <div className="text-[#F2F4F7] bg-[#0E1116] inline-flex p-3 rounded-[2px] border border-[#C5CBD3]/24 mb-4 transition-colors duration-200 group-hover:bg-[#C5CBD3] group-hover:text-[#0E1116]">
                  <value.icon size={18} />
                </div>
                <h4 className="text-base font-serif font-medium text-[#F2F4F7] mb-2">{value.title}</h4>
                <p className="text-[#C5CBD3] text-xs leading-[1.6] font-sans font-light">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Governance Section - Four Structured Pillars */}
      <section className="py-20 bg-[#040A12] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16">
        <div className="max-w-[1480px] mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">Control Blueprint</span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">Corporate Governance Hierarchy</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {governancePillars.map((pillar, idx) => (
              <div key={idx} className="bg-[#121D29]/58 p-6 border border-[#C5CBD3]/24 rounded-[4px] shadow-sm hover:border-[#F2F4F7] transition-colors duration-150">
                <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#6D7886] block mb-2">Pillar 0{idx + 1}</span>
                <h4 className="text-base font-serif font-medium text-[#F2F4F7] mb-2">{pillar.title}</h4>
                <p className="text-[#C5CBD3] text-xs leading-[1.6] font-sans font-light">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="py-20 px-6 sm:px-12 lg:px-16 max-w-[1040px] mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">Executive Desk</span>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">Governance &amp; Direction</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 rounded-[4px] p-6 lg:p-8 flex flex-col items-center text-center hover:border-[#F2F4F7] transition-colors duration-200 shadow-sm">
            <div className="w-20 h-24 rounded-[2px] mb-4 border border-[#C5CBD3]/24 overflow-hidden bg-[#0E1116] shrink-0">
              <img src="./images/Raza.jpeg" alt="Md Ramiz Raza Khan" className="w-full h-full object-cover scale-105" />
            </div>
            <h4 className="text-base font-serif font-medium text-[#F2F4F7] mb-1">Md Ramiz Raza Khan</h4>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6D7886] mb-3"><span>Founder &amp; Proprietor</span></p>
            <span className="text-[9px] bg-[#0E1116] text-[#C5CBD3] px-3 py-1 border border-[#C5CBD3]/24 rounded-full font-mono">BA LLB, Amity University, Mumbai</span>
            <p className="text-[#C5CBD3] text-xs font-sans font-light leading-[1.65] border-t border-[#C5CBD3]/10 pt-4 mt-4 w-full text-left">Directs legal auditing frameworks, multilateral corporate trade relations, document compliance parameters, and macro portfolio execution setups.</p>
          </div>

          <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 rounded-[4px] p-6 lg:p-8 flex flex-col items-center text-center hover:border-[#F2F4F7] transition-colors duration-200 shadow-sm">
            <div className="w-20 h-24 rounded-[2px] mb-4 border border-[#C5CBD3]/24 overflow-hidden bg-[#0E1116] shrink-0">
              <img src="./images/sonia_mam_new_image.jpeg" alt="Soniya Singh" className="w-full h-full object-cover scale-105" />
            </div>
            <h4 className="text-base font-serif font-medium text-[#F2F4F7] mb-1">Soniya Singh</h4>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6D7886] mb-3"><span>Co-Founder / Business Support</span></p>
            <span className="text-[9px] bg-[#0E1116] text-[#C5CBD3] px-3 py-1 border border-[#C5CBD3]/24 rounded-full font-mono">Operations Management</span>
            <p className="text-[#C5CBD3] text-xs font-sans font-light leading-[1.65] border-t border-[#C5CBD3]/10 pt-4 mt-4 w-full text-left">Manages dynamic client-facing account pipelines, multi-tier source logging infrastructures, and state-level freight transport distribution setups.</p>
          </div>
        </div>
      </section>

      {/* Shared Handoff Footer Seal */}
      <footer className="bg-[#040A12] text-[#6D7886] py-16 px-6 border-t border-[#C5CBD3]/24 text-center font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[12px] uppercase tracking-[0.25em] font-semibold text-[#F2F4F7]">
            India Trade Overseas
            <br />
            <span className="text-xs text-[#6D7886] tracking-widest capitalize font-normal font-sans block mt-1">Trade. Supply. Logistics. Growth.</span>
          </p>
          <p className="text-xs italic text-[#C5CBD3]/60 font-serif">
            "Where Quality Meets Global Demand."
          </p>
          <div className="text-[10px] text-[#6D7886]/40 font-light max-w-2xl mx-auto border-t border-[#C5CBD3]/10 pt-4 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </div>
        </div>
      </footer>
    </div>
  );
}