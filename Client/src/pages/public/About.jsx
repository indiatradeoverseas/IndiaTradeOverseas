import React from 'react';
import { motion } from 'framer-motion';
import {
  FiShield,
  FiAward,
  FiUsers,
  FiTrendingUp,
  FiGlobe,
  FiCompass,
  FiMapPin
} from 'react-icons/fi';
import useDocumentMeta from '../../hooks/useDocumentMeta';

export default function About() {
  useDocumentMeta({
    title: 'About Us | India Trade Overseas',
    description:
      'Learn about India Trade Overseas, a B2B sourcing, bulk supply, export and logistics company connecting Indian supply with domestic and international demand.',
    canonicalPath: '/about'
  });

  /* =========================================================
     CORE VALUES
  ========================================================== */
  const coreValues = [
    {
      icon: FiShield,
      title: 'Integrity',
      description:
        'We believe commercial relationships should be built on honest communication, responsible practices and clear commitments.'
    },
    {
      icon: FiAward,
      title: 'Quality',
      description:
        'We focus on agreed product requirements, specifications and quality expectations throughout the sourcing process.'
    },
    {
      icon: FiUsers,
      title: 'Trust',
      description:
        'We aim to build long-term relationships through consistency, accountability and dependable communication.'
    },
    {
      icon: FiTrendingUp,
      title: 'Growth',
      description:
        'We are building ITO as a growing trade organization through sustainable business relationships and disciplined execution.'
    }
  ];

  /* =========================================================
     BUSINESS PRINCIPLES
  ========================================================== */
  const principles = [
    {
      number: '01',
      title: 'Understand',
      description:
        'We begin by understanding the buyer requirement, product specifications, quantity, destination and delivery expectations.'
    },
    {
      number: '02',
      title: 'Coordinate',
      description:
        'We coordinate sourcing, commercial discussions, documentation and logistics with clear communication between the parties involved.'
    },
    {
      number: '03',
      title: 'Execute',
      description:
        'We focus on structured execution so that agreed requirements can move efficiently from sourcing through fulfillment.'
    },
    {
      number: '04',
      title: 'Build Relationships',
      description:
        'Our objective is to develop dependable and repeat business relationships rather than focusing only on individual transactions.'
    }
  ];

  /* =========================================================
     BUSINESS IDENTITY
     Kept high-level on About page.
     Detailed products/services remain on Our Services.
  ========================================================== */
  const businessAreas = [
    'Food & Agriculture',
    'Building & Construction',
    'Coal & Industrial',
    'Trade & Export',
    'Logistics & Supply',
    'Other Trade Requirements'
  ];

  /* =========================================================
     OPERATING PRESENCE
  ========================================================== */
  const locations = [
    'Kishanganj',
    'Siliguri',
    'Jaigaon',
    'Noida',
    'Bangladesh'
  ];

  /* =========================================================
     ANIMATION VARIANTS
  ========================================================== */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.12
      }
    }
  };

  const textPopUpVariants = {
    hidden: {
      opacity: 0,
      y: 15
    },
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
    hidden: {
      opacity: 0,
      y: 20
    },
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

      {/* =========================================================
          STRUCTURAL TOP BORDER
      ========================================================== */}
      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full fixed top-0 left-0 z-50"></div>

      {/* =========================================================
          HERO — CORPORATE OVERVIEW
      ========================================================== */}
      <section className="relative w-full min-h-[85vh] flex items-center bg-[#040A12] border-b border-[#C5CBD3]/10 py-16 lg:py-24 overflow-hidden">

        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-40">

          <img
            src="/images/ito_images/ito_7.png"
            alt="India Trade Overseas corporate operations"
            className="w-full h-full object-cover object-center scale-105"
            style={{
              filter: 'brightness(1.3) contrast(1.12) saturate(0.6)'
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/30 via-transparent to-[#040A12]/20 z-1" />

          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/20 via-[#040A12]/20 to-[#0E1116]/10 z-1" />

          <div className="absolute inset-0 box-shadow-[inset_0_0_180px_rgba(0,0,0,0.6)] z-1" />
        </div>

        <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full pt-32 sm:pt-40 lg:pt-[160px]">

          {/* HERO IMAGE */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.98,
              y: 15
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="lg:col-span-5 w-full flex justify-center order-2 lg:order-1"
          >

            <div className="relative p-2 bg-[#121D29]/40 backdrop-blur-md border border-[#C5CBD3]/20 rounded-sm shadow-2xl group overflow-hidden max-w-md lg:max-w-none">

              <div className="absolute inset-0 bg-gradient-to-tr from-[#040A12]/40 to-transparent pointer-events-none z-10" />

              <img
                src="/images/ito_images/ito_2.png"
                alt="India Trade Overseas"
                className="w-full h-auto object-contain max-h-[440px] rounded-sm transition-transform duration-700 ease-out group-hover:scale-[1.015]"
                onError={(e) => {
                  e.target.src = './images/Company_logo.png';
                }}
              />

            </div>
          </motion.div>

          {/* HERO CONTENT */}
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

            <motion.h1
              variants={textPopUpVariants}
              className="text-3xl sm:text-5xl lg:text-[62px] font-serif text-[#F2F4F7] font-normal tracking-tight uppercase leading-[1.1]"
            >
              Corporate Overview
            </motion.h1>

            <div
              className="w-16 h-[1px] bg-[#C5CBD3]/30 border-b my-2"
              aria-hidden="true"
            />

            <motion.p
              variants={textPopUpVariants}
              className="text-[#C5CBD3] leading-[1.68] font-sans font-light text-sm sm:text-base max-w-[680px] opacity-90"
            >
              India Trade Overseas is a B2B sourcing, bulk supply, export and
              logistics company connecting Indian supply with domestic and
              international demand.
            </motion.p>

            <motion.p
              variants={textPopUpVariants}
              className="text-[#C5CBD3] leading-[1.68] font-sans font-light text-sm sm:text-base max-w-[680px] opacity-90"
            >
              Founded in 2024, ITO is being built as a practical trade
              organization where sourcing, supply, commercial coordination and
              logistics come together around real buyer requirements.
            </motion.p>

            <motion.p
              variants={textPopUpVariants}
              className="text-[#C5CBD3] leading-[1.68] font-sans font-light text-sm sm:text-base max-w-[680px] opacity-90"
            >
              Our approach is straightforward: understand the requirement,
              coordinate the right supply, communicate clearly and support the
              transaction through fulfillment.
            </motion.p>

            {/* COMPANY SNAPSHOT */}
            <motion.div
              variants={textPopUpVariants}
              className="grid grid-cols-2 gap-4 pt-6 border-t border-[#C5CBD3]/15 max-w-[480px]"
            >

              <div className="bg-[#121D29]/40 backdrop-blur-sm p-4 rounded-sm border border-[#C5CBD3]/15 shadow-sm">

                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6D7886] font-bold block mb-1">
                  Established
                </span>

                <span className="font-serif text-2xl font-normal text-[#F2F4F7]">
                  2024
                </span>

              </div>

              <div className="bg-[#121D29]/40 backdrop-blur-sm p-4 rounded-sm border border-[#C5CBD3]/15 shadow-sm">

                <span className="text-[10px] font-mono uppercase tracking-widest text-[#6D7886] font-bold block mb-1">
                  Headquarters
                </span>

                <span className="font-sans text-[12px] text-[#F2F4F7] font-medium block mt-1 uppercase tracking-wide">
                  Kishanganj, Bihar
                </span>

              </div>

            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          OUR STORY
      ========================================================== */}
      <section className="py-24 bg-[#0E1116] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16">

        <div className="max-w-[1180px] mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

            <motion.div
              className="lg:col-span-5 space-y-5"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{
                once: true,
                margin: '-60px'
              }}
            >

              <motion.span
                variants={textPopUpVariants}
                className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block"
              >
                Our Story
              </motion.span>

              <motion.h2
                variants={textPopUpVariants}
                className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#F2F4F7] uppercase tracking-tight leading-[1.1]"
              >
                Built From Trade,
                <br />
                Growing Through Relationships
              </motion.h2>

              <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mt-5" />

            </motion.div>

            <motion.div
              className="lg:col-span-7 space-y-5"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{
                once: true,
                margin: '-60px'
              }}
            >

              <motion.p
                variants={textPopUpVariants}
                className="text-[#C5CBD3] text-sm sm:text-base leading-[1.75] font-light opacity-90"
              >
                India Trade Overseas began with a simple business objective:
                connect genuine buyer requirements with dependable supply and
                make the commercial process easier to coordinate.
              </motion.p>

              <motion.p
                variants={textPopUpVariants}
                className="text-[#C5CBD3] text-sm sm:text-base leading-[1.75] font-light opacity-90"
              >
                Since its establishment in 2024, the company has been
                developing its presence across sourcing, bulk supply, trade,
                export and logistics. The business operates across multiple
                commercial verticals while maintaining one consistent approach
                to business.
              </motion.p>

              <motion.p
                variants={textPopUpVariants}
                className="text-[#C5CBD3] text-sm sm:text-base leading-[1.75] font-light opacity-90"
              >
                This foundation continues to shape the way ITO approaches
                business today: practical sourcing, clear commercial
                communication, coordinated execution and relationships that can
                develop beyond a single transaction.
              </motion.p>

            </motion.div>
          </div>
        </div>
      </section>

      {/* =========================================================
          VISION & MISSION
      ========================================================== */}
      <section className="py-24 bg-[#040A12] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16 relative overflow-hidden">

        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-35">

          <img
            src="/images/ito_images/ito_7.png"
            alt="India Trade Overseas global trade operations"
            className="w-full h-full object-cover object-center scale-105"
            style={{
              filter: 'brightness(1.3) contrast(1.12) saturate(0.6)'
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/50 via-transparent to-[#040A12]/40 z-1" />

          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/30 via-transparent to-[#040A12]/40 z-1" />

        </div>

        <div className="max-w-[1180px] mx-auto relative z-10">

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              margin: '-60px'
            }}
          >

            {/* VISION */}
            <motion.div
              variants={cardVariants}
              className="bg-[#0E1116]/75 backdrop-blur-md border border-[#C5CBD3]/20 rounded-sm p-7 lg:p-9 group hover:border-[#F2F4F7] transition-all duration-300"
            >

              <div className="text-[#F2F4F7] bg-[#121D29] inline-flex p-3 rounded-sm border border-[#C5CBD3]/20 mb-6 group-hover:bg-[#F2F4F7] group-hover:text-[#0E1116] transition-all duration-300">
                <FiCompass size={19} />
              </div>

              <span className="text-[#6D7886] text-[10px] uppercase tracking-[3px] font-medium block mb-3">
                Our Vision
              </span>

              <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide mb-4">
                Connecting India With Opportunity
              </h2>

              <p className="text-[#C5CBD3] text-sm leading-[1.75] font-light opacity-90">
                We aim to build India Trade Overseas into a trusted B2B trade
                organization that connects Indian supply with buyers across
                domestic and international markets.
              </p>

            </motion.div>

            {/* MISSION */}
            <motion.div
              variants={cardVariants}
              className="bg-[#0E1116]/75 backdrop-blur-md border border-[#C5CBD3]/20 rounded-sm p-7 lg:p-9 group hover:border-[#F2F4F7] transition-all duration-300"
            >

              <div className="text-[#F2F4F7] bg-[#121D29] inline-flex p-3 rounded-sm border border-[#C5CBD3]/20 mb-6 group-hover:bg-[#F2F4F7] group-hover:text-[#0E1116] transition-all duration-300">
                <FiGlobe size={19} />
              </div>

              <span className="text-[#6D7886] text-[10px] uppercase tracking-[3px] font-medium block mb-3">
                Our Mission
              </span>

              <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide mb-4">
                Make Trade Simpler
              </h2>

              <p className="text-[#C5CBD3] text-sm leading-[1.75] font-light opacity-90">
                Our mission is to make sourcing and supply more structured by
                bringing together product understanding, supplier coordination,
                commercial clarity and logistics support around the buyer's
                requirement.
              </p>

            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* =========================================================
          BUSINESS IDENTITY
          High-level only. Detailed products/services are handled
          by the Our Services section.
      ========================================================== */}
      <section className="py-24 bg-[#0E1116] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16">

        <div className="max-w-[1180px] mx-auto space-y-14">

          <div className="text-center space-y-2">

            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">
              Our Business
            </span>

            <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">
              A Growing Trade Organization
            </h2>

            <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />

            <p className="text-[#C5CBD3] text-sm leading-[1.7] font-light max-w-2xl mx-auto pt-3 opacity-90">
              India Trade Overseas works across multiple commercial
              requirements while maintaining a common focus on sourcing,
              supply, trade coordination and dependable execution.
            </p>

          </div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              margin: '-60px'
            }}
          >

            {businessAreas.map((area, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="bg-[#121D29]/40 backdrop-blur-sm p-5 sm:p-6 border border-[#C5CBD3]/20 rounded-sm text-center hover:border-[#F2F4F7] hover:-translate-y-1 transition-all duration-300 group"
              >

                <span className="font-mono text-[10px] uppercase tracking-widest text-[#6D7886] block mb-3">
                  0{idx + 1}
                </span>

                <h3 className="text-sm sm:text-base font-serif text-[#F2F4F7] group-hover:text-white transition-colors">
                  {area}
                </h3>

              </motion.div>
            ))}

          </motion.div>
        </div>
      </section>

      {/* =========================================================
          BUSINESS PHILOSOPHY
      ========================================================== */}
      <section className="py-24 bg-[#040A12] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16 relative overflow-hidden">

        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-30">

          <img
            src="/images/ito_images/ito_2.png"
            alt="India Trade Overseas supply operations"
            className="w-full h-full object-cover object-center scale-105"
            style={{
              filter: 'brightness(1.3) contrast(1.12) saturate(0.8)'
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/45 via-transparent to-[#040A12]/35 z-1" />

        </div>

        <div className="max-w-[1480px] mx-auto space-y-16 relative z-10">

          <div className="text-center space-y-2">

            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">
              Business Philosophy
            </span>

            <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">
              How We Approach Business
            </h2>

            <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />

          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              margin: '-60px'
            }}
          >

            {principles.map((principle, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="bg-[#0E1116]/75 backdrop-blur-md p-6 border border-[#C5CBD3]/15 rounded-sm shadow-sm hover:border-[#F2F4F7] transition-all duration-300 group"
              >

                <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#6D7886] block mb-3 border-b border-[#C5CBD3]/10 pb-2 group-hover:text-[#C5CBD3] transition-colors">
                  Principle {principle.number}
                </span>

                <h3 className="text-base font-serif font-medium text-[#F2F4F7] mb-2.5">
                  {principle.title}
                </h3>

                <p className="text-[#C5CBD3] text-xs leading-[1.65] font-sans font-light opacity-90">
                  {principle.description}
                </p>

              </motion.div>
            ))}

          </motion.div>
        </div>
      </section>

      {/* =========================================================
          CORE VALUES
      ========================================================== */}
      <section className="py-24 bg-[#0E1116] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16">

        <div className="max-w-[1480px] mx-auto space-y-16">

          <div className="text-center space-y-2">

            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">
              Our Values
            </span>

            <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">
              What Guides Us
            </h2>

            <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />

          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              margin: '-60px'
            }}
          >

            {coreValues.map((value, idx) => {
              const Icon = value.icon;

              return (
                <motion.div
                  key={idx}
                  variants={cardVariants}
                  className="bg-[#121D29]/40 backdrop-blur-sm p-6 border border-[#C5CBD3]/20 rounded-sm shadow-md group hover:border-[#F2F4F7] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                >

                  <div>

                    <div className="text-[#F2F4F7] bg-[#0E1116] inline-flex p-3 rounded-sm border border-[#C5CBD3]/24 mb-5 transition-all duration-300 group-hover:bg-[#F2F4F7] group-hover:text-[#0E1116] group-hover:scale-105 shadow-inner">
                      <Icon size={18} />
                    </div>

                    <h3 className="text-base font-serif font-medium text-[#F2F4F7] mb-2.5 group-hover:text-white transition-colors">
                      {value.title}
                    </h3>

                    <p className="text-[#C5CBD3] text-xs leading-[1.65] font-sans font-light opacity-90">
                      {value.description}
                    </p>

                  </div>

                </motion.div>
              );
            })}

          </motion.div>
        </div>
      </section>

      {/* =========================================================
          LEADERSHIP
      ========================================================== */}
      <section className="py-24 px-6 sm:px-12 lg:px-16 max-w-[1080px] mx-auto space-y-16">

        <div className="text-center space-y-2">

          <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">
            Leadership
          </span>

          <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">
            Governance &amp; Direction
          </h2>

          <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />

          <p className="text-[#C5CBD3] text-sm leading-[1.7] font-light max-w-2xl mx-auto pt-3 opacity-90">
            India Trade Overseas is led by its founder and proprietor, with
            strategic direction centered on business development, trade,
            sourcing and commercial execution.
          </p>

        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            margin: '-60px'
          }}
        >

          <motion.div
            variants={cardVariants}
            className="bg-[#121D29]/40 backdrop-blur-sm border border-[#C5CBD3]/20 rounded-sm p-6 lg:p-8 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 lg:gap-8 hover:border-[#F2F4F7] hover:-translate-y-1 transition-all duration-300 shadow-lg group max-w-3xl mx-auto w-full"
          >

            <div className="w-28 h-32 md:w-32 md:h-36 rounded-sm mb-4 md:mb-0 border border-[#C5CBD3]/20 overflow-hidden bg-[#040A12] shrink-0 relative shadow-md">

              <div className="absolute inset-0 bg-[#040A12]/10 z-10 transition-colors group-hover:bg-transparent" />

              <img
                src="./images/Raza.jpeg"
                alt="Md Ramiz Raza Khan"
                className="w-full h-full object-cover scale-105 transition-transform duration-500 group-hover:scale-100 filter brightness-95"
              />

            </div>

            <div className="flex-1 flex flex-col items-center md:items-start w-full">

              <h3 className="text-lg font-serif font-medium text-[#F2F4F7] mb-1 group-hover:text-white transition-colors">
                Md Ramiz Raza Khan
              </h3>

              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6D7886] mb-3">
                Founder &amp; Proprietor
              </p>

              <span className="text-[9px] bg-[#0E1116] text-[#C5CBD3] px-3.5 py-1 border border-[#C5CBD3]/30 rounded-full font-mono font-medium shadow-sm tracking-wide self-center md:self-start">
                BA LLB, Amity University, Mumbai
              </span>

              <p className="text-[#C5CBD3] text-xs font-sans font-light leading-[1.68] border-t border-[#C5CBD3]/15 pt-4 mt-5 w-full text-left opacity-90">
                Provides strategic direction for the business and oversees its
                development across trade relationships, sourcing, commercial
                operations and organizational growth.
              </p>

            </div>

          </motion.div>

        </motion.div>
      </section>

      {/* =========================================================
          LOCATIONS / PRESENCE
      ========================================================== */}
      <section className="py-20 bg-[#0E1116] border-t border-[#C5CBD3]/15 border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16">

        <div className="max-w-[1080px] mx-auto text-center space-y-10">

          <div className="space-y-2">

            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">
              Our Presence
            </span>

            <h2 className="text-2xl sm:text-3xl font-serif text-[#F2F4F7] uppercase tracking-wide">
              Growing Across Trade Corridors
            </h2>

            <div className="w-12 h-[1px] bg-[#C5CBD3]/24 mx-auto mt-4" />

            <p className="text-[#C5CBD3] text-sm leading-[1.7] font-light max-w-2xl mx-auto pt-3 opacity-90">
              Our business references multiple operating and market locations
              supporting sourcing, trade and logistics activities.
            </p>

          </div>

          <motion.div
            className="flex flex-wrap justify-center gap-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              margin: '-60px'
            }}
          >

            {locations.map((location, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="bg-[#121D29]/40 backdrop-blur-sm border border-[#C5CBD3]/20 px-5 py-3 rounded-sm flex items-center gap-2 hover:border-[#F2F4F7] transition-all duration-300"
              >

                <FiMapPin
                  size={14}
                  className="text-[#F2F4F7]"
                />

                <span className="text-[11px] uppercase tracking-widest text-[#C5CBD3] font-medium">
                  {location}
                </span>

              </motion.div>
            ))}

          </motion.div>
        </div>
      </section>

      {/* =========================================================
          CLOSING CTA
      ========================================================== */}
      <section className="py-20 bg-[#040A12] border-b border-[#C5CBD3]/24 px-6 sm:px-12 lg:px-16">

        <div className="max-w-4xl mx-auto text-center space-y-6">

          <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase block">
            India Trade Overseas
          </span>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#F2F4F7] uppercase tracking-wide">
            Where Quality Meets Global Demand
          </h2>

          <p className="text-[#C5CBD3] text-sm sm:text-base font-light leading-[1.75] max-w-2xl mx-auto opacity-90">
            We are building a trade organization focused on dependable
            sourcing, responsible commercial relationships and coordinated
            supply from India to markets that need it.
          </p>

          <div className="pt-3">

            <a
              href="/contact"
              className="inline-flex items-center justify-center px-7 py-3 border border-[#C5CBD3]/30 bg-[#121D29]/40 text-[#F2F4F7] text-xs uppercase tracking-[2px] font-medium rounded-sm hover:bg-[#F2F4F7] hover:text-[#0E1116] transition-all duration-300"
            >
              Contact Us
            </a>

          </div>

        </div>
      </section>

      {/* =========================================================
          SHARED FOOTER
      ========================================================== */}
      <footer className="bg-[#040A12] text-[#6D7886] py-16 px-6 border-t border-[#C5CBD3]/24 text-center font-sans relative overflow-hidden">

        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-80">

          <img
            src="/images/footer-bg-image.png"
            alt="India Trade Overseas Industrial Logistics Footprint"
            className="w-full h-full object-cover object-center scale-106 mt-3"
            style={{
              filter: 'brightness(1.5) contrast(1.5) saturate(0.5)'
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#040A12]/30 via-transparent to-[#040A12]/10" />

        </div>

        <div className="max-w-3xl mx-auto space-y-4 relative z-10">

          <p className="text-[16px] uppercase tracking-[0.25em] font-semibold text-[#F2F4F7] drop-shadow-[0_2px_4px_rgba(4,10,18,0.5)]">
            India Trade Overseas
            <br />

            <span className="text-xs text-[#8a939e] tracking-widest capitalize font-normal font-sans block mt-1">
              Trade. Supply. Logistics. Growth.
            </span>
          </p>

          <p className="text-xs italic text-[#C5CBD3]/70 font-serif drop-shadow-[0_2px_4px_rgba(4,10,18,0.4)]">
            "Where Quality Meets Global Demand"
          </p>

          <div className="text-[10px] text-[#8a939e] /50 font-light max-w-2xl mx-auto border-t border-[#C5CBD3]/20 pt-4 leading-relaxed tracking-wide">
            Rates, availability, product specifications, freight, GST, dispatch
            timelines and delivery commitments are subject to final commercial
            confirmation.
          </div>

        </div>
      </footer>

    </div>
  );
}