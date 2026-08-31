import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useDocumentMeta from '../../hooks/useDocumentMeta';

import {
  FiAnchor,
  FiChevronRight,
  FiCheckCircle,
  FiLayers,
  FiMail,
  FiGlobe,
  FiClipboard,
  FiMessageCircle,
  FiArrowRight,
  FiPackage,
  FiTruck,
  FiFileText,
  FiSearch,
  FiSpeaker
} from 'react-icons/fi';

import {
  GiTeapot,
  GiWheat,
  GiStonePile
} from 'react-icons/gi';

// ============================================================
// HERO BACKGROUND IMAGES
// ============================================================

const CINEMATIC_CAROUSEL_BACKDROPS = [
  './images/ito_images/ito_1.jpeg',
  './images/ito_images/ito_2.png',
  './images/ito_images/ito_3.jpeg',
  './images/ito_images/ito_4.png',
  './images/ito_images/ito_5.jpeg',
  './images/ito_images/ito_6.jpeg',
  './images/ito_images/ito_7.png',
  './images/ito_images/ito_8.jpeg',
  './images/ito_images/ito_9.jpeg',
  './images/ito_images/ito_10.jpeg',
  './images/ito_images/ito_11.jpeg',
  './images/ito_images/ito_12.jpeg',
  './images/ito_images/ito_13.jpeg',
  './images/ito_images/ito_14.png',
  './images/ito_images/ito_15.jpeg',
  './images/ito_images/ito_16.jpeg',
  './images/ito_images/ito_17.jpeg',
  './images/ito_images/ito_18.jpeg'
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Home() {

  // ----------------------------------------------------------
  // SEO
  // ----------------------------------------------------------

  useDocumentMeta({
    title:
      'India Trade Overseas | B2B Sourcing, Bulk Supply & Export from India',

    description:
      'India Trade Overseas provides B2B sourcing, bulk supply, export and logistics support for agriculture, stone, coal, industrial materials and consumer products from India.',

    canonicalPath: '/'
  });

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [activeStep, setActiveStep] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [isMobileCarousel, setIsMobileCarousel] = useState(false);

  // ----------------------------------------------------------
  // HERO IMAGE CAROUSEL
  // ----------------------------------------------------------

  useEffect(() => {
    const backdropTimer = setInterval(() => {
      setCarouselIndex(
        (prevIndex) =>
          (prevIndex + 1) % CINEMATIC_CAROUSEL_BACKDROPS.length
      );
    }, 5000);

    return () => clearInterval(backdropTimer);
  }, []);

  // ----------------------------------------------------------
  // ESCAPE KEY FOR SOLUTIONS MODAL
  // ----------------------------------------------------------

  useEffect(() => {
    if (!isSolutionsOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsSolutionsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSolutionsOpen]);

  // ----------------------------------------------------------
  // MOBILE DETECTION
  // ----------------------------------------------------------

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileCarousel(window.innerWidth < 640);
    };

    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // ==========================================================
  // DATA
  // ==========================================================

  // ----------------------------------------------------------
  // PRODUCT DIVISIONS
  // ----------------------------------------------------------

  const DIVISIONS = [
    {
      to: '/prakriti',
      icon: GiTeapot,
      label: 'Tea Division',
      image: '/images/tea_images/g4.jpeg',
      points: [
        'Assam, Darjeeling & Dooars sourcing',
        'CTC, Orthodox & Dust grades',
        'Bulk supply for business buyers',
        'Export-ready sourcing support'
      ]
    },

    {
      to: '/prakriti/rice',
      icon: GiWheat,
      label: 'Rice Division',
      image: '/images/rice_images/rice_11.jpeg',
      points: [
        'Bulk rice and paddy sourcing',
        'Export-ready packaging',
        'Supplier coordination',
        'Commercial quantity supply'
      ]
    },

    {
      to: '/stone',
      icon: GiStonePile,
      label: 'Stone Division',
      image: '/images/stone_images/Wmm.png',
      points: [
        'Bhutan & Pakur stone aggregates',
        '10 / 20 / 40 / 60mm & dust',
        'Bulk construction supply',
        'Sourcing and logistics support'
      ]
    },

    {
      to: '/ito-ads',
      icon: FiSpeaker,
      label: 'ITO Ads',
      image: '/images/ito_images/ito_1.jpeg',
      points: [
        'Paid inbound lead generation campaigns',
        'Performance marketing & customer acquisition',
        'CRM-ready lead delivery & automation',
        'Pan-India targeting with transparent reporting'
      ]
    }
  ];

  // ----------------------------------------------------------
  // TRUST BADGES
  // ----------------------------------------------------------

  const trustBadges = [
    { label: 'APEDA', img: 'cer_1.jpeg' },
    { label: 'DGFT CERTIFIED', img: 'cer_2.jpeg' },
    { label: 'ISO CERTIFIED', img: 'cer_3.jpeg' },
    { label: 'FSSAI REGISTERED', img: 'cer_4.jpeg' },
    { label: 'GST REGISTERED', img: 'cer_5.jpeg' },
    { label: 'IEC HOLDER', img: 'cer_6.jpeg' },
    { label: 'MSME / UDYAM', img: 'cer_7.jpeg' }
  ];

  // ----------------------------------------------------------
  // BUSINESS LOCATIONS
  // ----------------------------------------------------------

  const locations = [
    'Kishanganj',
    'Siliguri',
    'Jaigaon',
    'Noida',
    'Bangladesh',
    'Bhutan',
    'Nepal'
  ];

  // ----------------------------------------------------------
  // WHAT WE SUPPLY
  // ----------------------------------------------------------

  const supplyCategories = [
    {
      number: '01',
      icon: GiWheat,
      title: 'Food & Agriculture',
      description:
        'Bulk agricultural commodities sourced for domestic and export requirements.',
      products:
        'Rice • Tea • Spices'
    },

    {
      number: '02',
      icon: GiStonePile,
      title: 'Stone & Construction',
      description:
        'Aggregates and construction materials for civil, concrete and infrastructure requirements.',
      products:
        'Black Stone • White Stone • Crushed Aggregate • WMM • Stone Dust'
    },

    {
      number: '03',
      icon: FiLayers,
      title: 'Coal & Industrial Materials',
      description:
        'Industrial raw materials for power, manufacturing and infrastructure requirements.',
      products:
        'Domestic Coal • Imported Coal • Dolomite • Industrial Raw Materials'
    },

    {
      number: '04',
      icon: FiPackage,
      title: 'Clay & Consumer Products',
      description:
        'Bulk clay, ceramic and consumer products for businesses, retailers and hospitality buyers.',
      products:
        'Kulhad • Clay Bottles • Ceramics • Crockery • Tea Cups'
    }
  ];

  // ----------------------------------------------------------
  // COMMERCIAL VERTICALS
  // ----------------------------------------------------------

  const verticals = [
    {
      num: '01',
      title: 'B2B Trade & Export',
      desc:
        'Sourcing, procurement and export support for businesses buying products from India.',
      cta: 'Explore Trade'
    },

    {
      num: '02',
      title: 'Food & Agriculture',
      desc:
        'Bulk sourcing of rice, tea, spices, maize, wheat and other agricultural commodities.',
      cta: 'Explore Food'
    },

    {
      num: '03',
      title: 'Stone & Construction',
      desc:
        'Stone aggregates and construction materials supplied for civil and infrastructure projects.',
      cta: 'Explore Stone'
    },

    {
      num: '04',
      title: 'Coal & Industrial',
      desc:
        'Domestic and imported coal, dolomite and other industrial materials for business requirements.',
      cta: 'Explore Industrial'
    },

    {
      num: '05',
      title: 'Transport & Logistics',
      desc:
        'Truck placement, route planning, loading, dispatch and delivery coordination.',
      cta: 'Explore Logistics'
    },

    {
      num: '06',
      title: 'Clay & Consumer',
      desc:
        'Bulk supply of kulhad, clay bottles, ceramics, crockery and other consumer products.',
      cta: 'Explore Consumer'
    }
  ];

  // ----------------------------------------------------------
  // PROCUREMENT WORKFLOW
  // ----------------------------------------------------------

  const steps = [
    {
      icon: FiMessageCircle,
      title: 'Tell Us What You Need',
      description:
        'Share the product, quantity, destination and delivery requirement with our commercial team.'
    },

    {
      icon: FiSearch,
      title: 'Sourcing & Verification',
      description:
        'We coordinate with relevant suppliers and verify product availability, specifications and commercial requirements.'
    },

    {
      icon: FiFileText,
      title: 'Quality & Documentation',
      description:
        'Product specifications, commercial documents and applicable compliance requirements are coordinated before dispatch.'
    },

    {
      icon: FiTruck,
      title: 'Dispatch & Logistics',
      description:
        'Transport, loading, dispatch and delivery coordination are managed according to the agreed order.'
    }
  ];

  // ----------------------------------------------------------
  // HERO PILLARS
  // ----------------------------------------------------------

  const heroPillars = [
    {
      icon: <FiGlobe size={20} />,
      title: 'B2B Sourcing',
      desc:
        'Supplier coordination for businesses buying from India.'
    },

    {
      icon: <FiPackage size={20} />,
      title: 'Bulk Supply',
      desc:
        'Commodity and material supply for regular and bulk requirements.'
    },

    {
      icon: <FiClipboard size={20} />,
      title: 'Documentation Support',
      desc:
        'Commercial and export documentation coordinated for each order.'
    },

    {
      icon: <FiAnchor size={20} />,
      title: 'Logistics Coordination',
      desc:
        'Dispatch, transport and delivery coordination from source to destination.'
    }
  ];

  // ----------------------------------------------------------
  // ANIMATION
  // ----------------------------------------------------------

  const sampleStagger = {
    hidden: {
      opacity: 0
    },

    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // ==========================================================
  // RETURN
  // ==========================================================

  return (
    <div
      className="
        bg-[#0E1116]
        text-[#C5CBD3]
        antialiased
        min-h-screen
        selection:bg-[#6D7886]/30
        selection:text-white
        font-sans
        overflow-x-hidden
      "
    >

      {/* ======================================================
          SOLUTIONS OVERLAY
      ====================================================== */}

      <AnimatePresence>

        {isSolutionsOpen && (

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              backdrop-blur-md
              bg-[#040A12]/30
              px-4
            "
            onClick={() => setIsSolutionsOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Explore Products"
          >

            <motion.div
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.96
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1
              }}
              exit={{
                opacity: 0,
                y: 12,
                scale: 0.96
              }}
              transition={{
                duration: 0.25,
                ease: 'easeOut'
              }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: isMobileCarousel ? 190 : 260,
                height: isMobileCarousel ? 280 : 400,
                perspective: isMobileCarousel ? 1000 : 1400
              }}
            >

              <div
                className="absolute inset-0"
                style={{
                  transformStyle: 'preserve-3d',
                  animationName: 'solutions-carousel-spin',
                  animationDuration: '20s',
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  animationPlayState: isCarouselPaused
                    ? 'paused'
                    : 'running'
                }}
              >

                {DIVISIONS.map((item, i) => {

                  const cardContent = (
                    <>
                      <img
                        src={item.image}
                        alt={item.label}
                        className="
                          absolute
                          inset-0
                          w-full
                          h-full
                          object-cover
                          transition-transform
                          duration-300
                          group-hover:scale-105
                        "
                      />

                      <div
                        className="
                          absolute
                          inset-0
                          bg-gradient-to-t
                          from-[#0E1116]/70
                          via-[#0E1116]/25
                          to-transparent
                        "
                      />

                      <div
                        className="
                          relative
                          h-full
                          flex
                          flex-col
                          justify-between
                          p-3.5
                          sm:p-5
                        "
                      >

                        <div className="flex items-start justify-between">

                          <div
                            className="
                              w-7
                              h-7
                              sm:w-8
                              sm:h-8
                              rounded-full
                              bg-[#0E1116]/60
                              backdrop-blur-sm
                              border
                              border-[#C5CBD3]/25
                              flex
                              items-center
                              justify-center
                            "
                          >
                            <item.icon
                              size={14}
                              className="text-[#F2F4F7]"
                            />
                          </div>

                          <span
                            className="
                              font-mono
                              text-[10px]
                              text-[#F2F4F7]/70
                              bg-[#0E1116]/50
                              backdrop-blur-sm
                              px-1.5
                              py-0.5
                              rounded-sm
                            "
                          >
                            0{i + 1}
                          </span>

                        </div>

                        <div className="space-y-1.5 sm:space-y-2">

                          <span
                            className="
                              block
                              font-sans
                              font-semibold
                              text-[12px]
                              sm:text-[13px]
                              tracking-widest
                              uppercase
                              text-[#F2F4F7]
                            "
                          >
                            {item.label}
                          </span>

                          <ul className="space-y-0.5 sm:space-y-1">

                            {item.points.map((point, idx) => (

                              <li
                                key={idx}
                                className="
                                  flex
                                  items-start
                                  gap-1.5
                                  text-[9px]
                                  sm:text-[10px]
                                  font-light
                                  text-[#F2F4F7]/85
                                  leading-snug
                                "
                              >
                                <span
                                  className="
                                    mt-[5px]
                                    w-1
                                    h-1
                                    rounded-full
                                    bg-[#C5CBD3]
                                    shrink-0
                                  "
                                />

                                {point}

                              </li>

                            ))}

                          </ul>

                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1
                              text-[9px]
                              sm:text-[10px]
                              font-semibold
                              tracking-widest
                              uppercase
                              text-[#F2F4F7]
                              pt-0.5
                            "
                          >
                            View <FiChevronRight size={11} />
                          </span>

                        </div>

                      </div>
                    </>
                  );

                  return (

                    <div
                      key={item.to}
                      className="absolute inset-0"
                      style={{
                        transform: `rotateY(${i * 90}deg) translateZ(${isMobileCarousel ? 110 : 160}px)`,
                        transformStyle: 'preserve-3d'
                      }}
                    >

                      <div
                        className="
                          group
                          absolute
                          inset-0
                          overflow-hidden
                          rounded-[2px]
                          border
                          border-[#C5CBD3]/20
                          shadow-2xl
                          pointer-events-none
                        "
                      >
                        {cardContent}
                      </div>

                      <Link
                        to={item.to}
                        onClick={() =>
                          setIsSolutionsOpen(false)
                        }
                        onMouseEnter={() =>
                          setIsCarouselPaused(true)
                        }
                        onMouseLeave={() =>
                          setIsCarouselPaused(false)
                        }
                        className="
                          group
                          absolute
                          inset-0
                          overflow-hidden
                          rounded-[2px]
                          border
                          border-[#C5CBD3]/20
                          hover:border-[#C5CBD3]/60
                          shadow-2xl
                          transition-colors
                          duration-200
                        "
                        style={{
                          backfaceVisibility: 'hidden'
                        }}
                      >
                        {cardContent}
                      </Link>

                    </div>

                  );

                })}

              </div>

            </motion.div>

            <style>
              {`
                @keyframes solutions-carousel-spin {
                  from {
                    transform: rotateY(0deg);
                  }

                  to {
                    transform: rotateY(360deg);
                  }
                }
              `}
            </style>

          </motion.div>

        )}

      </AnimatePresence>

      {/* ======================================================
          TOP BORDER
      ====================================================== */}

      <div
        className="
          border-t-[3px]
          border-double
          border-[#C5CBD3]/20
          w-full
          absolute
          top-0
          left-0
          z-50
        "
      />

      {/* ======================================================
          HERO
      ====================================================== */}

      <section
        className="
          relative
          min-h-screen
          lg:h-screen
          lg:min-h-[760px]
          lg:max-h-[980px]
          flex
          items-center
          bg-[#0E1116]
          overflow-hidden
          border-b
          border-[#C5CBD3]/10
        "
      >

        {/* HERO IMAGE */}

        <div className="absolute inset-0 z-0 bg-[#040A12]">

          <AnimatePresence mode="popLayout">

            <motion.img
              key={carouselIndex}
              initial={{
                opacity: 0,
                scale: 1
              }}
              animate={{
                opacity: 1,
                scale: 1.035,
                transition: {
                  duration: 1.5
                }
              }}
              exit={{
                opacity: 0
              }}
              transition={{
                duration: 1.5,
                ease: 'easeInOut'
              }}
              src={
                CINEMATIC_CAROUSEL_BACKDROPS[
                  carouselIndex
                ]
              }
              alt="India Trade Overseas sourcing and logistics"
              className="
                w-full
                h-full
                object-cover
                object-[68%_center]
                absolute
                inset-0
              "
              style={{
                filter:
                  'brightness(1.2) contrast(1.15) saturate(0.70)'
              }}
            />

          </AnimatePresence>

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-r
              from-[#040A12]/95
              via-[#040A12]/85
              via-[#040A12]/70
              via-[#040A12]/20
              to-[#040A12]/10
              z-1
            "
          />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-b
              from-[#040A12]/70
              via-transparent
              to-[#040A12]/95
              z-1
            "
          />

          <div
            className="
              absolute
              inset-0
              box-shadow-[inset_0_0_180px_rgba(0,0,0,0.48)]
              pointer-events-none
              z-1
            "
          />

        </div>

        {/* HERO CONTENT */}

        <motion.div
          initial="hidden"
          animate="visible"
          variants={sampleStagger}
          className="
            max-w-[1480px]
            mx-auto
            px-6
            sm:px-12
            lg:px-16
            relative
            z-10
            w-full
            flex
            flex-col
            justify-between
            pt-28
            sm:pt-32
            md:pt-36
            lg:pt-[140px]
            pb-10
            md:pb-12
            lg:pb-16
            min-h-screen
            lg:h-full
          "
        >

          <div
            className="
              max-w-[760px]
              text-left
              flex-1
              flex
              flex-col
              justify-center
              space-y-6
              sm:space-y-8
              md:space-y-10
              lg:space-y-10
              w-full
              py-8
            "
          >

            {/* EYEBROW */}

            <div>

              <motion.p
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 12
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.65,
                      ease: 'easeOut'
                    }
                  }
                }}
                className="
                  font-sans
                  font-semibold
                  text-[10px]
                  sm:text-[11px]
                  md:text-[12px]
                  lg:text-[13px]
                  tracking-[3px]
                  sm:tracking-[4px]
                  text-[#C5CBD3]
                  uppercase
                  mb-2
                "
              >
                INDIA TRADE OVERSEAS
              </motion.p>

              {/* H1 */}

              <motion.h1
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 20
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.8,
                      ease: 'easeOut'
                    }
                  }
                }}
                className="
                  text-3xl
                  sm:text-5xl
                  lg:text-6xl
                  xl:text-[68px]
                  font-serif
                  tracking-tight
                  font-normal
                  leading-[1.15]
                  sm:leading-[1.08]
                  md:leading-[1.04]
                  uppercase
                  text-[#F2F4F7]
                  mt-3
                  sm:mt-4
                "
              >
                B2B SOURCING,
                <br />
                BULK SUPPLY & EXPORT
                <br />
                FROM INDIA
              </motion.h1>

            </div>

            {/* SUPPORTING CONTENT */}

            <div className="w-full">

              <motion.div
                variants={{
                  hidden: {
                    opacity: 0
                  },
                  visible: {
                    opacity: 1
                  }
                }}
                className="
                  w-16
                  h-[1px]
                  bg-[#C5CBD3]/30
                  mb-6
                  sm:mb-7
                "
                aria-hidden="true"
              />

              {/* CATEGORY LINE */}

              <motion.p
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 12
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.7,
                      ease: 'easeOut'
                    }
                  }
                }}
                className="
                  font-sans
                  font-medium
                  text-[#F2F4F7]
                  text-[11px]
                  sm:text-xs
                  lg:text-sm
                  tracking-wide
                  leading-relaxed
                  mb-3
                "
              >
                Agriculture • Stone • Coal • Industrial Materials
                • Consumer Products • Logistics
              </motion.p>

              {/* BODY */}

              <motion.p
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 12
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.7,
                      ease: 'easeOut'
                    }
                  }
                }}
                className="
                  font-sans
                  font-light
                  text-[#C5CBD3]
                  text-xs
                  sm:text-sm
                  lg:text-[16px]
                  max-w-[620px]
                  leading-[1.65]
                  opacity-90
                "
              >
                B2B sourcing, procurement and supply support for
                businesses buying products from India — from
                supplier coordination and quality documentation
                to dispatch and logistics.
              </motion.p>

            </div>

            {/* CTA BUTTONS */}

            <div
              className="
                flex
                flex-col
                sm:flex-row
                items-center
                gap-4
                w-full
                sm:w-auto
                pt-1
              "
            >

              {/* PRIMARY */}

              <Link
                to="/quote-request"
                className="
                  w-full
                  sm:w-auto
                  min-w-[220px]
                  sm:min-w-[240px]
                  bg-[#F2F4F7]
                  border
                  border-transparent
                  hover:bg-[#C5CBD3]
                  text-[#0E1116]
                  text-[11px]
                  sm:text-[12px]
                  tracking-widest
                  uppercase
                  font-semibold
                  h-[50px]
                  sm:h-[54px]
                  flex
                  items-center
                  justify-center
                  rounded-[2px]
                  transition-all
                  duration-200
                  shadow-md
                "
              >
                Request Bulk Quote
                <FiArrowRight className="ml-2" size={15} />
              </Link>

              {/* SECONDARY */}

              <button
                type="button"
                onClick={() =>
                  setIsSolutionsOpen(true)
                }
                className="
                  w-full
                  sm:w-auto
                  min-w-[220px]
                  sm:min-w-[250px]
                  bg-[#121D29]/58
                  backdrop-blur-[8px]
                  border
                  border-[#C5CBD3]/42
                  hover:bg-[#2B3440]
                  hover:border-[#F2F4F7]
                  text-[#F2F4F7]
                  text-[11px]
                  sm:text-[12px]
                  tracking-widest
                  uppercase
                  font-semibold
                  h-[50px]
                  sm:h-[54px]
                  flex
                  items-center
                  justify-center
                  rounded-[2px]
                  transition-all
                  duration-200
                "
              >
                Explore Products
                <FiArrowRight className="ml-2" size={15} />
              </button>

            </div>

          </div>

          {/* ==================================================
              DESKTOP HERO TRUST ROW
          ================================================== */}

          <div
            className="
              w-full
              hidden
              md:block
              pt-6
              border-t
              border-white/5
              mt-auto
            "
          >

            <div
              className="
                grid
                grid-cols-2
                lg:grid-cols-4
                gap-6
                w-full
              "
            >

              {heroPillars.map((item, index) => (

                <div
                  key={index}
                  className={`
                    grid
                    grid-cols-[auto_1fr]
                    gap-4
                    items-start
                    px-4
                    ${
                      index !== 0
                        ? 'border-l border-[#C5CBD3]/22'
                        : ''
                    }
                  `}
                >

                  <div className="text-[#F2F4F7] shrink-0 mt-0.5">
                    {item.icon}
                  </div>

                  <div>

                    <h5
                      className="
                        text-[#F2F4F7]
                        font-sans
                        text-[13px]
                        font-medium
                        tracking-wider
                        uppercase
                        mb-1
                      "
                    >
                      {item.title}
                    </h5>

                    <p
                      className="
                        text-[#C5CBD3]
                        text-[11px]
                        leading-normal
                        font-light
                      "
                    >
                      {item.desc}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </motion.div>

      </section>

      {/* ======================================================
          MOBILE TRUST ROW
      ====================================================== */}

      <section
        className="
          block
          md:hidden
          bg-[#0E1116]
          border-b
          border-[#C5CBD3]/24
          py-8
          px-6
          w-full
        "
      >

        <div
          className="
            grid
            grid-cols-1
            gap-3
            bg-[#121D29]/58
            border
            border-[#C5CBD3]/24
            p-5
            rounded-md
          "
        >

          {heroPillars.map((item, idx) => (

            <div
              key={idx}
              className="
                grid
                grid-cols-[auto_1fr]
                gap-3
                py-3
                border-b
                border-[#C5CBD3]/10
                last:border-b-0
                w-full
                text-left
              "
            >

              <div
                className="
                  text-[#F2F4F7]
                  shrink-0
                  mt-0.5
                "
              >
                {item.icon}
              </div>

              <div>

                <h5
                  className="
                    text-[#F2F4F7]
                    font-sans
                    text-[12px]
                    font-medium
                    tracking-wide
                    uppercase
                    mb-1
                  "
                >
                  {item.title}
                </h5>

                <p
                  className="
                    text-[#C5CBD3]
                    text-[11px]
                    leading-relaxed
                    font-light
                  "
                >
                  {item.desc}
                </p>

              </div>

            </div>

          ))}

        </div>

      </section>

      {/* ======================================================
          TRUST / CREDENTIALS
      ====================================================== */}

      <section
        className="
          bg-[#0E1116]
          py-8
          border-b
          border-[#C5CBD3]/24
          select-none
        "
      >

        <div
          className="
            max-w-[1480px]
            mx-auto
            px-6
            grid
            grid-cols-2
            sm:flex
            sm:flex-wrap
            sm:justify-center
            items-center
            gap-3
            md:gap-4
          "
        >

          {trustBadges.map((badge, index) => (

            <span
              key={index}
              className="
                inline-flex
                items-center
                justify-center
                w-full
                sm:w-auto
                sm:min-w-[140px]
                h-11
                border
                border-[#C5CBD3]/24
                text-[#F2F4F7]
                text-[10px]
                tracking-widest
                font-semibold
                uppercase
                px-4
                rounded-[2px]
                transition-all
                duration-200
                relative
                overflow-hidden
                group
              "
            >

              <img
                src={`./images/certificates/${badge.img}`}
                alt={`${badge.label} registration or certification`}
                className="
                  absolute
                  inset-0
                  w-full
                  h-full
                  object-cover
                  pointer-events-none
                  select-none
                  z-0
                  transition-transform
                  duration-300
                  group-hover:scale-105
                "
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />

              <div
                className="
                  absolute
                  inset-0
                  bg-[#0E1116]/80
                  backdrop-blur-[0.5px]
                  z-5
                  transition-colors
                  group-hover:bg-[#0E1116]/70
                "
              />

              <span
                className="
                  relative
                  z-10
                  text-center
                  pointer-events-none
                  text-[9px]
                  sm:text-[10px]
                  px-1
                  line-clamp-1
                "
              >
                {badge.label}
              </span>

            </span>

          ))}

        </div>

      </section>

      {/* ======================================================
          WHAT WE SUPPLY
      ====================================================== */}

      <section
        className="
          py-20
          lg:py-24
          max-w-[1480px]
          mx-auto
          px-6
          sm:px-12
          lg:px-16
        "
      >

        <div className="max-w-3xl mb-12">

          <span
            className="
              text-[#6D7886]
              font-medium
              tracking-[3px]
              text-[11px]
              uppercase
              block
              mb-2
            "
          >
            What We Supply
          </span>

          <h2
            className="
              text-3xl
              sm:text-4xl
              font-serif
              text-[#F2F4F7]
              tracking-wide
              uppercase
              leading-tight
            "
          >
            Products for Business Buyers
          </h2>

          <p
            className="
              text-[#C5CBD3]
              font-sans
              font-light
              text-sm
              leading-[1.7]
              mt-4
              max-w-2xl
            "
          >
            We source and supply products across agriculture,
            construction, industrial materials and consumer
            categories for bulk and commercial requirements.
          </p>

        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{
            once: true,
            margin: '-100px'
          }}
          variants={sampleStagger}
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-5
          "
        >

          {supplyCategories.map((category) => {

            const CategoryIcon = category.icon;

            return (

              <motion.div
                key={category.number}
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 15
                  },

                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.6,
                      ease: 'easeOut'
                    }
                  }
                }}
                className="
                  bg-[#121D29]/58
                  border
                  border-[#C5CBD3]/24
                  p-6
                  sm:p-7
                  rounded-md
                  shadow-sm
                  hover:border-[#F2F4F7]
                  transition-colors
                  duration-200
                  group
                "
              >

                <div
                  className="
                    flex
                    items-start
                    justify-between
                    mb-6
                  "
                >

                  <div
                    className="
                      w-10
                      h-10
                      border
                      border-[#C5CBD3]/24
                      flex
                      items-center
                      justify-center
                      rounded-[2px]
                      text-[#F2F4F7]
                      group-hover:border-[#F2F4F7]
                      transition-colors
                    "
                  >
                    <CategoryIcon size={19} />
                  </div>

                  <span
                    className="
                      font-mono
                      text-[#6D7886]
                      text-xs
                      font-bold
                    "
                  >
                    {category.number}
                  </span>

                </div>

                <h3
                  className="
                    text-xl
                    font-serif
                    text-[#F2F4F7]
                    mb-2
                  "
                >
                  {category.title}
                </h3>

                <p
                  className="
                    text-[#C5CBD3]
                    text-xs
                    font-light
                    leading-[1.65]
                    mb-4
                  "
                >
                  {category.description}
                </p>

                <div
                  className="
                    pt-4
                    border-t
                    border-[#C5CBD3]/10
                  "
                >

                  <span
                    className="
                      text-[10px]
                      uppercase
                      tracking-wide
                      text-[#F2F4F7]
                      font-medium
                      leading-relaxed
                    "
                  >
                    {category.products}
                  </span>

                </div>

              </motion.div>

            );

          })}

        </motion.div>

        {/* PRODUCT CTA */}

        <div
          className="
            flex
            justify-center
            mt-10
          "
        >

          <button
            type="button"
            onClick={() =>
              setIsSolutionsOpen(true)
            }
            className="
              inline-flex
              items-center
              justify-center
              border
              border-[#C5CBD3]/42
              hover:border-[#F2F4F7]
              hover:bg-[#2B3440]
              text-[#F2F4F7]
              px-7
              h-[48px]
              rounded-[2px]
              text-[11px]
              font-semibold
              uppercase
              tracking-widest
              transition-all
            "
          >
            Explore Product Divisions
            <FiArrowRight
              className="ml-2"
              size={15}
            />
          </button>

        </div>

      </section>

      {/* ======================================================
          BUSINESS VERTICALS
      ====================================================== */}

      <section
        className="
          relative
          py-20
          lg:py-24
          bg-[#0E1116]
          border-y
          border-[#C5CBD3]/24
          px-6
          sm:px-12
          lg:px-16
          overflow-hidden
        "
      >

        {/* BACKGROUND */}

        <div
          className="
            absolute
            inset-0
            z-0
            select-none
            pointer-events-none
          "
        >

          <img
            src="./images/ito_images/ito_2.png"
            alt=""
            aria-hidden="true"
            className="
              w-full
              h-full
              object-cover
              object-center
            "
          />

          <div
            className="
              absolute
              inset-0
              bg-[#0E1116]/65
              mix-blend-multiply
            "
          />

        </div>

        <div
          className="
            max-w-[1480px]
            mx-auto
            relative
            z-10
          "
        >

          <div className="text-center mb-14">

            <span
              className="
                text-[#6D7886]
                font-medium
                tracking-[3px]
                text-[11px]
                uppercase
                block
                mb-2
              "
            >
              What We Do
            </span>

            <h2
              className="
                text-3xl
                sm:text-4xl
                font-serif
                text-[#F2F4F7]
                tracking-wide
                uppercase
              "
            >
              Six Commercial Verticals
            </h2>

          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              margin: '-100px'
            }}
            variants={sampleStagger}
            className="
              grid
              grid-cols-1
              md:grid-cols-2
              lg:grid-cols-3
              gap-5
            "
          >

            {verticals.map((v) => (

              <motion.div
                key={v.num}
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 15
                  },

                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.6,
                      ease: 'easeOut'
                    }
                  }
                }}
                className="
                  bg-[#121D29]/75
                  backdrop-blur-[6px]
                  border
                  border-[#C5CBD3]/24
                  p-6
                  shadow-sm
                  rounded-[2px]
                  flex
                  flex-col
                  justify-between
                  group
                  hover:border-[#F2F4F7]
                  transition-colors
                  duration-200
                "
              >

                <div>

                  <div
                    className="
                      flex
                      justify-between
                      items-center
                      mb-5
                    "
                  >

                    <span
                      className="
                        font-serif
                        text-[#6D7886]
                        font-bold
                        text-lg
                        tracking-wider
                      "
                    >
                      {v.num}
                    </span>

                    <FiLayers
                      className="
                        text-[#6D7886]
                        group-hover:text-[#F2F4F7]
                        transition-colors
                      "
                      size={14}
                    />

                  </div>

                  <h3
                    className="
                      text-lg
                      font-serif
                      font-medium
                      text-[#F2F4F7]
                      mb-2.5
                    "
                  >
                    {v.title}
                  </h3>

                  <p
                    className="
                      text-[#C5CBD3]
                      text-xs
                      font-sans
                      font-light
                      leading-[1.65]
                      mb-7
                    "
                  >
                    {v.desc}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsSolutionsOpen(true)
                  }
                  className="
                    w-full
                    h-[42px]
                    inline-flex
                    items-center
                    justify-center
                    text-center
                    bg-[#0E1116]
                    hover:bg-[#2B3440]
                    border
                    border-[#C5CBD3]/24
                    hover:border-[#F2F4F7]
                    text-[#F2F4F7]
                    font-sans
                    text-[10px]
                    uppercase
                    tracking-widest
                    font-semibold
                    transition-colors
                    duration-150
                    rounded-[2px]
                    cursor-pointer
                  "
                >
                  {v.cta}
                  <FiChevronRight
                    className="ml-1"
                    size={13}
                  />
                </button>

              </motion.div>

            ))}

          </motion.div>

        </div>

      </section>

      {/* ======================================================
          HOW IT WORKS
      ====================================================== */}

      <section
        className="
          py-20
          lg:py-24
          max-w-[1480px]
          mx-auto
          px-6
          sm:px-12
          lg:px-16
        "
      >

        <div className="max-w-3xl mb-12">

          <span
            className="
              text-[#6D7886]
              font-medium
              tracking-[3px]
              text-[11px]
              uppercase
              block
              mb-2
            "
          >
            How It Works
          </span>

          <h2
            className="
              text-3xl
              sm:text-4xl
              font-serif
              text-[#F2F4F7]
              tracking-wide
              uppercase
              leading-tight
            "
          >
            From Requirement to Delivery
          </h2>

          <p
            className="
              text-[#6D7886]
              font-sans
              font-light
              text-sm
              mt-3
              leading-relaxed
            "
          >
            A straightforward process for business buyers
            looking for products, pricing and supply support.
          </p>

        </div>

        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-12
            gap-8
            items-start
          "
        >

          {/* STEPS */}

          <div className="lg:col-span-5 space-y-3">

            {steps.map((step, index) => {

              const StepIcon = step.icon;

              return (

                <button
                  key={index}
                  onClick={() =>
                    setActiveStep(index)
                  }
                  className={`
                    w-full
                    text-left
                    p-4
                    rounded-[2px]
                    border
                    font-sans
                    transition-all
                    duration-150
                    flex
                    items-center
                    space-x-4
                    ${
                      activeStep === index
                        ? 'bg-[#2B3440] border-[#F2F4F7] text-[#F2F4F7] shadow-sm'
                        : 'bg-[#0E1116] border-[#C5CBD3]/24 text-[#C5CBD3] hover:bg-[#2B3440]/40'
                    }
                  `}
                >

                  <span
                    className={`
                      flex
                      items-center
                      justify-center
                      w-8
                      h-8
                      rounded-full
                      shrink-0
                      ${
                        activeStep === index
                          ? 'bg-[#F2F4F7] text-[#0E1116]'
                          : 'bg-[#040A12] border border-[#C5CBD3]/24 text-[#6D7886]'
                      }
                    `}
                  >
                    <StepIcon size={15} />
                  </span>

                  <span
                    className="
                      font-serif
                      text-[13px]
                      font-medium
                      tracking-wide
                    "
                  >
                    {step.title}
                  </span>

                </button>

              );

            })}

          </div>

          {/* STEP DETAIL */}

          <div
            className="
              lg:col-span-7
              bg-[#121D29]/58
              border
              border-[#C5CBD3]/24
              rounded-md
              p-6
              min-h-[260px]
              flex
              flex-col
              justify-between
              shadow-sm
              relative
              overflow-hidden
            "
          >

            <AnimatePresence mode="wait">

              <motion.div
                key={activeStep}
                initial={{
                  opacity: 0,
                  x: 10
                }}
                animate={{
                  opacity: 1,
                  x: 0
                }}
                exit={{
                  opacity: 0,
                  x: -10
                }}
                transition={{
                  duration: 0.2
                }}
              >

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-[#6D7886]
                    mb-4
                  "
                >

                  <FiCheckCircle size={16} />

                  <span
                    className="
                      text-[10px]
                      font-mono
                      uppercase
                      tracking-widest
                      font-bold
                    "
                  >
                    Step {activeStep + 1} of 4
                  </span>

                </div>

                <h3
                  className="
                    text-xl
                    font-serif
                    font-medium
                    text-[#F2F4F7]
                    mb-3
                  "
                >
                  {steps[activeStep].title}
                </h3>

                <p
                  className="
                    text-[#C5CBD3]
                    text-sm
                    font-sans
                    font-light
                    leading-[1.7]
                    max-w-2xl
                  "
                >
                  {steps[activeStep].description}
                </p>

              </motion.div>

            </AnimatePresence>

            <div
              className="
                text-right
                text-xs
                font-sans
                pt-4
                border-t
                border-[#C5CBD3]/10
                mt-6
              "
            >

              <Link
                to="/quote-request"
                className="
                  text-[#F2F4F7]
                  font-semibold
                  hover:underline
                  inline-flex
                  items-center
                  tracking-wide
                "
              >
                Start Your Requirement
                <FiChevronRight
                  className="ml-0.5"
                />
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* ======================================================
          CONTACT / COMMERCIAL INFORMATION
      ====================================================== */}

      <section
        className="
          pb-20
          max-w-[1480px]
          mx-auto
          px-6
          sm:px-12
          lg:px-16
        "
      >

        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-12
            gap-6
            items-stretch
          "
        >

          {/* EMAIL */}

          <div
            className="
              lg:col-span-7
              bg-[#121D29]/58
              border
              border-[#C5CBD3]/24
              p-6
              rounded-md
              shadow-sm
              flex
              flex-col
              justify-between
            "
          >

            <div>

              <span
                className="
                  text-[#6D7886]
                  font-medium
                  tracking-[2px]
                  text-[10px]
                  uppercase
                  block
                  mb-2
                "
              >
                Commercial Enquiries
              </span>

              <h3
                className="
                  text-2xl
                  font-serif
                  text-[#F2F4F7]
                  mb-3
                "
              >
                Tell Us What You Need
              </h3>

              <p
                className="
                  text-xs
                  text-[#C5CBD3]
                  font-sans
                  font-light
                  leading-[1.7]
                  mb-6
                  max-w-2xl
                "
              >
                Share your product requirement, quantity,
                destination and delivery timeline. Our team
                will review the requirement and respond with
                the next commercial steps.
              </p>

              <div
                className="
                  space-y-4
                  font-sans
                  text-xs
                "
              >

                <div
                  className="
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
                    justify-between
                    p-4
                    bg-[#0E1116]
                    border
                    border-[#C5CBD3]/24
                    rounded-[2px]
                    gap-3
                  "
                >

                  <div>

                    <span
                      className="
                        text-[10px]
                        tracking-wider
                        uppercase
                        font-bold
                        text-[#6D7886]
                        block
                        mb-0.5
                      "
                    >
                      Email
                    </span>

                    <span
                      className="
                        text-[#F2F4F7]
                        font-medium
                        text-sm
                      "
                    >
                      info@indiatradeoverseas.com
                    </span>

                  </div>

                  <a
                    href="mailto:info@indiatradeoverseas.com"
                    className="
                      bg-[#2B3440]
                      hover:bg-[#0E1116]
                      text-[#F2F4F7]
                      border
                      border-[#C5CBD3]/42
                      hover:border-[#F2F4F7]
                      px-4
                      h-[38px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-[10px]
                      rounded-[2px]
                      transition-colors
                      flex
                      items-center
                      justify-center
                      gap-2
                      shrink-0
                    "
                  >
                    <FiMail />
                    Send Email
                  </a>

                </div>

                {/* WHATSAPP */}

                <a
                  href="https://wa.me/919999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    flex
                    items-center
                    justify-between
                    p-4
                    bg-[#0E1116]
                    border
                    border-[#C5CBD3]/24
                    hover:border-[#F2F4F7]
                    rounded-[2px]
                    gap-3
                    transition-colors
                  "
                >

                  <div>

                    <span
                      className="
                        text-[10px]
                        tracking-wider
                        uppercase
                        font-bold
                        text-[#6D7886]
                        block
                        mb-0.5
                      "
                    >
                      Fast Contact
                    </span>

                    <span
                      className="
                        text-[#F2F4F7]
                        font-medium
                        text-sm
                      "
                    >
                      WhatsApp Sales
                    </span>

                  </div>

                  <span
                    className="
                      bg-[#2B3440]
                      text-[#F2F4F7]
                      border
                      border-[#C5CBD3]/30
                      px-4
                      h-[38px]
                      font-semibold
                      uppercase
                      tracking-wider
                      text-[10px]
                      rounded-[2px]
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <FiMessageCircle />
                    WhatsApp
                  </span>

                </a>

              </div>

            </div>

          </div>

          {/* LOCATIONS */}

          <div
            className="
              lg:col-span-5
              bg-[#121D29]/58
              border
              border-[#C5CBD3]/24
              p-6
              rounded-md
              shadow-sm
              flex
              flex-col
              justify-center
            "
          >

            <span
              className="
                text-[#6D7886]
                font-medium
                tracking-[2px]
                text-[10px]
                uppercase
                block
                mb-2
              "
            >
              Operating Footprint
            </span>

            <h3
              className="
                text-2xl
                font-serif
                text-[#F2F4F7]
                mb-3
              "
            >
              Regional Trade Corridors
            </h3>

            <p
              className="
                text-xs
                text-[#C5CBD3]
                font-sans
                font-light
                leading-[1.7]
                mb-6
              "
            >
              Our sourcing and logistics activity connects
              important regional markets and trade corridors.
            </p>

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >

              {locations.map((city) => (

                <span
                  key={city}
                  className="
                    bg-[#0E1116]
                    border
                    border-[#C5CBD3]/24
                    text-[#F2F4F7]
                    font-sans
                    font-medium
                    text-[11px]
                    px-3
                    py-2
                    rounded-[2px]
                    shadow-sm
                    hover:border-[#F2F4F7]
                    transition-colors
                    duration-150
                  "
                >
                  {city}
                </span>

              ))}

            </div>

          </div>

        </div>

      </section>

      {/* ======================================================
          FINAL CTA
      ====================================================== */}

      <section
        className="
          relative
          w-full
          py-24
          px-6
          sm:px-12
          lg:px-16
          overflow-hidden
          border-t
          border-[#C5CBD3]/24
          bg-[#040A12]
        "
      >

        <div
          className="
            absolute
            inset-0
            z-0
            opacity-70
          "
        >

          <img
            src="./images/ito_images/ito_1.jpeg"
            alt=""
            aria-hidden="true"
            className="
              w-full
              h-full
              object-cover
              object-center
            "
            style={{
              filter:
                'brightness(1.3) contrast(1.15) saturate(0.72)'
            }}
          />

          <div
            className="
              absolute
              inset-0
              bg-[#0E1116]/75
              backdrop-blur-[0.5px]
            "
          />

        </div>

        <div
          className="
            relative
            z-10
            max-w-4xl
            mx-auto
            flex
            flex-col
            items-center
            justify-center
            text-center
            space-y-6
          "
        >

          <div
            className="
              inline-flex
              items-center
              gap-2
              bg-[#2B3440]/80
              border
              border-[#C5CBD3]/24
              rounded-full
              px-4
              py-1
            "
          >

            <span
              className="
                w-1.5
                h-1.5
                rounded-full
                bg-[#F2F4F7]
                animate-ping
              "
            />

            <span
              className="
                text-[10px]
                tracking-widest
                font-mono
                uppercase
                text-[#F2F4F7]
                font-bold
              "
            >
              Start a Commercial Enquiry
            </span>

          </div>

          <h2
            className="
              text-3xl
              sm:text-4xl
              font-serif
              text-[#F2F4F7]
              tracking-wide
              uppercase
              leading-tight
            "
          >
            Looking for a Reliable
            <br className="hidden sm:block" />
            B2B Supply Partner?
          </h2>

          <p
            className="
              text-[#C5CBD3]
              font-sans
              font-light
              text-xs
              sm:text-sm
              max-w-2xl
              leading-[1.7]
              mx-auto
            "
          >
            Send us your product, quantity, destination and
            delivery requirement. Our team will review your
            enquiry and coordinate the next steps.
          </p>

          <div
            className="
              flex
              flex-col
              sm:flex-row
              gap-4
              pt-4
              w-full
              sm:w-auto
              items-center
              justify-center
            "
          >

            <Link
              to="/quote-request"
              className="
                w-full
                sm:w-auto
                min-w-[220px]
                h-[52px]
                bg-[#F2F4F7]
                hover:bg-[#C5CBD3]
                text-[#0E1116]
                font-sans
                font-bold
                text-[12px]
                uppercase
                tracking-widest
                flex
                items-center
                justify-center
                rounded-[2px]
                transition-all
                shadow-md
              "
            >
              Request Bulk Quote
              <FiArrowRight
                className="ml-2"
              />
            </Link>

            <Link
              to="/contact"
              className="
                w-full
                sm:w-auto
                min-w-[220px]
                h-[52px]
                bg-[#121D29]/58
                backdrop-blur-[4px]
                border
                border-[#C5CBD3]/42
                text-[#F2F4F7]
                hover:bg-[#2B3440]
                hover:border-[#F2F4F7]
                font-sans
                font-bold
                text-[12px]
                uppercase
                tracking-widest
                flex
                items-center
                justify-center
                rounded-[2px]
                transition-all
              "
            >
              Contact Our Team
              <FiArrowRight
                className="ml-2"
              />
            </Link>

          </div>

        </div>

      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer
        className="
          bg-[#040A12]
          text-[#6D7886]
          py-16
          px-6
          border-t
          border-[#C5CBD3]/24
          text-center
          font-sans
          relative
          overflow-hidden
        "
      >

        <div
          className="
            absolute
            inset-0
            z-0
            select-none
            pointer-events-none
            opacity-80
          "
        >

          <img
            src="/images/footer-bg-image.png"
            alt=""
            aria-hidden="true"
            className="
              w-full
              h-full
              object-cover
              object-center
              scale-105
              mt-3
            "
            style={{
              filter:
                'brightness(1.5) contrast(1.5) saturate(0.5)'
            }}
          />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-t
              from-[#040A12]/30
              via-transparent
              to-[#040A12]/10
            "
          />

        </div>

        <div
          className="
            max-w-3xl
            mx-auto
            space-y-4
            relative
            z-10
          "
        >

          <p
            className="
              text-[16px]
              uppercase
              tracking-[0.25em]
              font-semibold
              text-[#F2F4F7]
              drop-shadow-[0_2px_4px_rgba(4,10,18,0.5)]
            "
          >
            India Trade Overseas

            <br />

            <span
              className="
                text-xs
                text-[#8a939e]
                tracking-widest
                capitalize
                font-normal
                font-sans
                block
                mt-1
              "
            >
              Trade. Supply. Logistics. Growth.
            </span>

          </p>

          <p
            className="
              text-xs
              italic
              text-[#C5CBD3]/70
              font-serif
              drop-shadow-[0_2px_4px_rgba(4,10,18,0.4)]
            "
          >
            Where Quality Meets Global Demand
          </p>

          <div
            className="
              text-[10px]
              text-[#8a939e]
              font-light
              max-w-2xl
              mx-auto
              border-t
              border-[#C5CBD3]/20
              pt-4
              leading-relaxed
              tracking-wide
            "
          >
            Product availability, specifications, pricing,
            freight, GST, dispatch timelines and delivery
            commitments are subject to final commercial
            confirmation.
          </div>

        </div>

      </footer>

    </div>
  );
}