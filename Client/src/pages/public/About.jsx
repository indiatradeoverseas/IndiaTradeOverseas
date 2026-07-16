import React from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiAward, FiUsers, FiTrendingUp, FiActivity, FiLayers, FiCompass } from 'react-icons/fi';

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
        staggerChildren: 0.12,
      }
    }
  };

  const textPopUpVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] antialiased min-h-screen selection:bg-[#6D7886]/30 selection:text-white font-sans overflow-x-hidden">

      {/* Structural Double-Line Top Border Accent */}
      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full fixed top-0 left-0 z-50"></div>

      {/* Page Hero Template Layer with Rigid Top Padding Buffer Zone */}
      <section className="relative w-full min-h-[85vh] flex items-center bg-[#040A12] border-b border-[#C5CBD3]/10 py-16 lg:py-24 overflow-hidden">

        {/* Cinematic Backdrop Layering */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-40">
          <img
            src="/images/ito_images/ito_7.png"
            alt="Corporate Operations Background Canvas"
            className="w-full h-full object-cover object-center scale-105"
            style={{ filter: 'brightness(1.3) contrast(1.12) saturate(0.6)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/30 via-transparent to-[#040A12]/20 z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/20 via-[#040A12]/20 to-[#0E1116]/10 z-1" />
          <div className="absolute inset-0 box-shadow-[inset_0_0_180px_rgba(0,0,0,0.6)] z-1" />
        </div>

        {/* Core Content Layout Wrapper with Fixed Height Cushioning */}
        <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full pt-32 sm:pt-40 lg:pt-[160px]">

          {/* Hero Left Column Asset Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 w-full flex justify-center order-2 lg:order-1"
          >
            <div className="relative p-2 bg-[#121D29]/40 backdrop-blur-md border border-[#C5CBD3]/20 rounded-sm shadow-2xl group overflow-hidden max-w-md lg:max-w-none">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#040A12]/40 to-transparent pointer-events-none z-10" />
              <img
                src="/images/ito_images/ito_2.png"
                alt="Company Profile"
                className="w-full h-auto object-contain max-h-[440px] rounded-sm transition-transform duration-700 ease-out group-hover:scale-[1.015]"
                onError={(e) => { e.target.src = './images/Company_logo.png'; }}
              />
            </div>
          </motion.div>

          {/* Hero Right Column Editorial Content */}
          <motion.div
            className="lg:col-span-7 space-y-5 text-left order-1 lg:order-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.span
              variants={textPopUpVariants}
              className="text-[#6D7886] text-[10px] sm:text-[11px] lg:text-[12px] font-medium tracking-[3px] uppercase block font-sans"
            >
              ABOUT INDIA TRADE OVERSEAS
            </motion.span>

            <motion.h2
              variants={textPopUpVariants}
              className="text-3xl sm:text-5xl lg:text-[62px] font-serif text-[#F2F4F7] font-normal tracking-tight uppercase leading-[1.1]"
            >
              Corporate Overview
            </motion.h2>

            <div className="w-16 h-[1px] bg-[#C5CBD3]/30 border-b my-2" aria-hidden="true" />

            <motion.p
              variants={textPopUpVariants}
              className="text-[#C5CBD3] leading-[1.68] font-sans font-light text-sm sm:text-base max-w-[680px] opacity-90"
            >
              A founder-led trade and logistics enterprise connecting trusted supply with domestic and international demand. India Trade Overseas operates across complex raw product sourcing configurations, large-volume supply operations, inter-state transit distribution routing models, and custom manufacturing. We unify trusted processing mills and industrial sectors under strict corporate governance blueprints.
            </motion.p>

            {/* Micro-Dashboard Metric Grid Token Layout */}
            <motion.div
              variants={textPopUpVariants}
              className="grid grid-cols-2 gap-4 pt-6 border-t border-[#C5CBD3]/15 max-w-[480px]"
            >
              <div className="bg-[#121D29]/40 backdrop-blur-sm p-4 rounded-sm border border-[#C5CBD3]/15 shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6D7886] font-bold block mb-1">Established</span>
                <span className="font-serif text-2xl font-normal text-[#F2F4F7]">2024</span>
              </div>
              <div className="bg-[#121D29]/40 backdrop-blur-sm p-4 rounded-sm border border-[#C5CBD3]/15 shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6D7886] font-bold block mb-1">Headquarters</span>
                <span className="font-sans text-[12px] text-[#F2F4F7] font-medium block mt-1 uppercase tracking-wide">Kishanganj, Bihar</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Values Section Grid - Alternating Palette Context Mapping */}
      <section className="py-24 bg-[#0E1116] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16 relative">
        <div className="max-w-[1480px] mx-auto space-y-16">
          <div className="text-center space-y-2">
            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">Operational Pillars</span>
            <h3 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">Core Corporate Values</h3>
            <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {coreValues.map((value, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="bg-[#121D29]/40 backdrop-blur-sm p-6 border border-[#C5CBD3]/20 rounded-sm shadow-md group hover:border-[#F2F4F7] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="text-[#F2F4F7] bg-[#0E1116] inline-flex p-3 rounded-sm border border-[#C5CBD3]/24 mb-5 transition-all duration-300 group-hover:bg-[#F2F4F7] group-hover:text-[#0E1116] group-hover:scale-105 shadow-inner">
                    <value.icon size={18} />
                  </div>
                  <h4 className="text-base font-serif font-medium text-[#F2F4F7] mb-2.5 group-hover:text-white transition-colors">{value.title}</h4>
                  <p className="text-[#C5CBD3] text-xs leading-[1.65] font-sans font-light opacity-90">{value.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Governance Section - Four Structured Pillars */}
      <section className="py-24 bg-[#040A12] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16 relative overflow-hidden">

        {/* Cinematic Backdrop Layering for Governance Block */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-40">
          <img
            src="/images/ito_images/ito_2.png"
            alt="Corporate Governance Structure Backdrop"
            className="w-full h-full object-cover object-center scale-105"
            style={{ filter: 'brightness(1.3) contrast(1.12) saturate(0.8)' }}
          />
          {/* Multi-directional vignette gradients to isolate card contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/30 via-transparent to-[#040A12]/20 z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/30 via-[#040A12]/10 to-[#040A12]/5 z-1" />
        </div>

        <div className="max-w-[1480px] mx-auto space-y-16 relative z-10">
          <div className="text-center space-y-2">
            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">Control Blueprint</span>
            <h3 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">Corporate Governance Hierarchy</h3>
            <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {governancePillars.map((pillar, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="bg-[#0E1116]/70 backdrop-blur-md p-6 border border-[#C5CBD3]/15 rounded-sm shadow-sm hover:border-[#F2F4F7] hover:bg-[#121D29]/60 transition-all duration-300 group"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#6D7886] block mb-3 border-b border-[#C5CBD3]/10 pb-1 group-hover:text-[#C5CBD3] transition-colors">
                  Pillar 0{idx + 1}
                </span>
                <h4 className="text-base font-serif font-medium text-[#F2F4F7] mb-2">{pillar.title}</h4>
                <p className="text-[#C5CBD3] text-xs leading-[1.65] font-sans font-light opacity-90">{pillar.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="py-24 px-6 sm:px-12 lg:px-16 max-w-[1080px] mx-auto space-y-16">
        <div className="text-center space-y-2">
          <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">Executive Desk</span>
          <h3 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">Governance &amp; Direction</h3>
          <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {/* Profile Card 1 */}
          <motion.div
            variants={cardVariants}
            className="bg-[#121D29]/40 backdrop-blur-sm border border-[#C5CBD3]/20 rounded-sm p-6 lg:p-8 flex flex-col items-center text-center hover:border-[#F2F4F7] hover:-translate-y-1 transition-all duration-300 shadow-lg group"
          >
            <div className="w-24 h-28 rounded-sm mb-4 border border-[#C5CBD3]/20 overflow-hidden bg-[#040A12] shrink-0 relative shadow-md">
              <div className="absolute inset-0 bg-[#040A12]/10 z-10 transition-colors group-hover:bg-transparent" />
              <img src="./images/Raza.jpeg" alt="Md Ramiz Raza Khan" className="w-full h-full object-cover scale-105 transition-transform duration-500 group-hover:scale-100 filter brightness-95" />
            </div>
            <h4 className="text-lg font-serif font-medium text-[#F2F4F7] mb-1 group-hover:text-white transition-colors">Md Ramiz Raza Khan</h4>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6D7886] mb-4"><span>Founder &amp; Proprietor</span></p>
            <span className="text-[9px] bg-[#0E1116] text-[#C5CBD3] px-3.5 py-1 border border-[#C5CBD3]/30 rounded-full font-mono font-medium shadow-sm tracking-wide">BA LLB, Amity University, Mumbai</span>
            <p className="text-[#C5CBD3] text-xs font-sans font-light leading-[1.68] border-t border-[#C5CBD3]/15 pt-4 mt-5 w-full text-left opacity-90">Directs legal auditing frameworks, multilateral corporate trade relations, document compliance parameters, and macro portfolio execution setups.</p>
          </motion.div>

          {/* Profile Card 2 */}
          <motion.div
            variants={cardVariants}
            className="bg-[#121D29]/40 backdrop-blur-sm border border-[#C5CBD3]/20 rounded-sm p-6 lg:p-8 flex flex-col items-center text-center hover:border-[#F2F4F7] hover:-translate-y-1 transition-all duration-300 shadow-lg group"
          >
            <div className="w-24 h-28 rounded-sm mb-4 border border-[#C5CBD3]/20 overflow-hidden bg-[#040A12] shrink-0 relative shadow-md">
              <div className="absolute inset-0 bg-[#040A12]/10 z-10 transition-colors group-hover:bg-transparent" />
              <img src="./images/sonia_mam_new_image.jpeg" alt="Soniya Singh" className="w-full h-full object-cover scale-105 transition-transform duration-500 group-hover:scale-100 filter brightness-95" />
            </div>
            <h4 className="text-lg font-serif font-medium text-[#F2F4F7] mb-1 group-hover:text-white transition-colors">Soniya Singh</h4>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6D7886] mb-4"><span>Co-Founder / Business Support</span></p>
            <span className="text-[9px] bg-[#0E1116] text-[#C5CBD3] px-3.5 py-1 border border-[#C5CBD3]/30 rounded-full font-mono font-medium shadow-sm tracking-wide">Operations Management</span>
            <p className="text-[#C5CBD3] text-xs font-sans font-light leading-[1.68] border-t border-[#C5CBD3]/15 pt-4 mt-5 w-full text-left opacity-90">Manages dynamic client-facing account pipelines, multi-tier source logging infrastructures, and state-level freight transport distribution setups.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* Shared Handoff Footer Seal */}
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#040A12]/30 via-transparent to-[#040A12]/10" />
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