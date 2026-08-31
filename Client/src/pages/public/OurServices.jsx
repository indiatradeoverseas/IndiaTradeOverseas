import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowUpRight,
  FiCheckCircle,
  FiGlobe,
  FiShield,
  FiTruck,
  FiFileText,
  FiShoppingBag,
  FiUsers,
} from 'react-icons/fi';
import { GiTeapot, GiWheat, GiStonePile } from 'react-icons/gi';
import useDocumentMeta from '../../hooks/useDocumentMeta';

const divisions = [
  {
    number: '01',
    title: 'Prakriti Division',
    eyebrow: 'AGRICULTURE & NATURAL PRODUCTS',
    description:
      'Agricultural sourcing and bulk supply solutions for buyers looking for dependable products, commercial quantities and coordinated delivery.',
    image: '/images/tea_images/g4.jpeg',
    products: [
      {
        icon: GiTeapot,
        title: 'Tea Division',
        description:
          'Tea sourcing and bulk supply for domestic buyers, distributors and export requirements.',
        link: '/prakriti',
      },
      {
        icon: GiWheat,
        title: 'Rice Division',
        description:
          'Bulk rice sourcing and supply for commercial, distribution and export requirements.',
        link: '/prakriti/rice',
      },
    ],
  },
  {
    number: '02',
    title: 'Building & Construction',
    eyebrow: 'STONE & CONSTRUCTION SUPPLY',
    description:
      'Construction material sourcing and bulk supply for civil, infrastructure and commercial projects.',
    image: '/images/stone_images/Wmm.png',
    products: [
      {
        icon: GiStonePile,
        title: 'Stone & Aggregates',
        description:
          'Stone aggregates and construction materials supplied according to project specifications and quantity requirements.',
        link: '/stone',
      },
    ],
  },
];

const buyerPaths = [
  {
    icon: FiShoppingBag,
    title: 'I Need Products',
    description:
      'Share the product, specification, quantity and delivery location.',
    cta: 'Request Bulk Quote',
    link: '/quote-request',
  },
  {
    icon: FiUsers,
    title: 'I Want to Supply',
    description:
      'Connect with us if you can supply products at commercial scale.',
    cta: 'Contact Commercial Team',
    link: '/contact',
  },
  {
    icon: FiTruck,
    title: 'I Need Logistics',
    description:
      'Discuss transportation, dispatch and delivery requirements.',
    cta: 'Talk to Sales',
    link: '/contact',
  },
];

const processSteps = [
  {
    number: '01',
    title: 'Share Requirement',
    description:
      'Tell us the product, specification, quantity and delivery location.',
  },
  {
    number: '02',
    title: 'Source & Review',
    description:
      'We review sourcing options, product requirements and availability.',
  },
  {
    number: '03',
    title: 'Confirm Commercials',
    description:
      'Pricing, specifications, availability and delivery requirements are discussed.',
  },
  {
    number: '04',
    title: 'Dispatch & Delivery',
    description:
      'Once confirmed, dispatch and logistics are coordinated through the agreed process.',
  },
];

const supportPoints = [
  {
    icon: FiGlobe,
    title: 'Domestic & Export',
    description:
      'Supply support for domestic buyers as well as international trade requirements.',
  },
  {
    icon: FiShield,
    title: 'Commercial Coordination',
    description:
      'Product, quantity, documentation and delivery requirements coordinated through one process.',
  },
  {
    icon: FiFileText,
    title: 'Documentation Support',
    description:
      'Relevant commercial and product documentation coordinated as part of the trade process.',
  },
  {
    icon: FiTruck,
    title: 'Logistics Coordination',
    description:
      'Dispatch and delivery coordination based on the agreed supply requirement.',
  },
];

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: 'easeOut',
    },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function OurServices() {
  useDocumentMeta({
    title: 'Our Services | India Trade Overseas',
    description:
      'Explore India Trade Overseas sourcing, bulk supply, export and logistics solutions across agriculture and construction divisions.',
    canonicalPath: '/our-services',
  });

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] antialiased min-h-screen font-sans overflow-x-hidden">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative min-h-screen lg:min-h-[760px] lg:h-screen max-h-[980px] flex items-center bg-[#0E1116] overflow-hidden border-b border-[#C5CBD3]/10">

        <div className="absolute inset-0 z-0 bg-[#040A12]">

          <img
            src="/images/ito_images/ito_2.png"
            alt="India Trade Overseas sourcing and supply"
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{
              filter: 'brightness(1.05) contrast(1.1) saturate(0.7)',
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/95 via-[#040A12]/80 to-[#040A12]/25" />

          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/80 via-transparent to-[#040A12]/95" />

          <div className="absolute inset-0 bg-[#040A12]/20" />
        </div>

        <div className="absolute top-0 left-0 w-full z-40 border-t-[3px] border-double border-[#C5CBD3]/20" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="
            relative z-10
            max-w-[1480px]
            mx-auto
            px-6 sm:px-12 lg:px-16
            w-full
            min-h-screen
            lg:h-full
            flex flex-col
            justify-center
            pt-[120px]
            sm:pt-[130px]
            md:pt-[140px]
            lg:pt-[150px]
            pb-16
          "
        >

          <div className="max-w-[760px]">

            <motion.p
              variants={fadeUp}
              className="
                font-sans
                font-medium
                text-[10px]
                sm:text-[11px]
                md:text-[12px]
                lg:text-[13px]
                tracking-[3px]
                sm:tracking-[4px]
                text-[#C5CBD3]
                uppercase
                mb-4
              "
            >
              INDIA TRADE OVERSEAS
              <span className="mx-2 text-[#6D7886]">•</span>
              SOURCING & SUPPLY
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="
                font-serif
                font-normal
                text-[#F2F4F7]
                uppercase
                tracking-tight
                text-4xl
                sm:text-5xl
                md:text-6xl
                lg:text-[68px]
                leading-[1.05]
              "
            >
              Our
              <br />
              <span className="font-medium">
                Services
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="
                font-sans
                font-medium
                text-[11px]
                sm:text-[12px]
                md:text-[13px]
                tracking-[2px]
                text-[#F2F4F7]/80
                uppercase
                mt-6
                max-w-[700px]
              "
            >
              PRODUCTS • SOURCING • BULK SUPPLY • LOGISTICS
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="w-16 h-[1px] bg-[#C5CBD3]/40 my-7"
            />

            <motion.p
              variants={fadeUp}
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
              Explore our product divisions and sourcing capabilities
              across agriculture and construction. Share your requirement
              and our commercial team will coordinate the next steps.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 mt-9"
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
                  text-[11px]
                  sm:text-[12px]
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
                <span className="ml-2">→</span>
              </Link>

              <a
                href="#divisions"
                className="
                  w-full
                  sm:w-auto
                  min-w-[220px]
                  h-[52px]
                  bg-[#121D29]/58
                  backdrop-blur-[8px]
                  border
                  border-[#C5CBD3]/42
                  hover:bg-[#2B3440]
                  hover:border-[#F2F4F7]
                  text-[#F2F4F7]
                  font-sans
                  font-bold
                  text-[11px]
                  sm:text-[12px]
                  uppercase
                  tracking-widest
                  flex
                  items-center
                  justify-center
                  rounded-[2px]
                  transition-all
                "
              >
                Explore Divisions
                <span className="ml-2">↓</span>
              </a>

            </motion.div>

          </div>

          <div className="hidden md:block absolute bottom-0 left-0 right-0 px-6 sm:px-12 lg:px-16 pb-8">

            <div className="border-t border-[#C5CBD3]/10 pt-6">

              <div className="grid grid-cols-4 gap-6">

                {[
                  'Agriculture',
                  'Construction',
                  'Bulk Supply',
                  'Logistics Support',
                ].map((item) => (
                  <div
                    key={item}
                    className="border-l border-[#C5CBD3]/20 px-4"
                  >
                    <p className="text-[#F2F4F7] font-sans text-[11px] uppercase tracking-wider">
                      {item}
                    </p>
                  </div>
                ))}

              </div>

            </div>

          </div>

        </motion.div>
      </section>


      {/* =====================================================
          INTRODUCTION
      ===================================================== */}

      <section className="relative bg-[#0E1116] py-20 sm:py-24 lg:py-28 border-b border-[#C5CBD3]/10">

        <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16">

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">

            <div>

              <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase">
                WHAT WE SUPPLY
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-serif text-[#F2F4F7] uppercase tracking-wide leading-tight">
                Find the right
                <br />
                <span className="font-medium">
                  supply division.
                </span>
              </h2>

            </div>

            <div className="lg:pt-8">

              <p className="text-[#C5CBD3] font-sans font-light text-sm lg:text-[16px] leading-[1.7] max-w-[620px]">
                India Trade Overseas works around actual commercial
                requirements — helping buyers identify the right product
                division, discuss quantity and specifications, and
                coordinate sourcing and delivery.
              </p>

            </div>

          </div>

        </div>
      </section>


      {/* =====================================================
          COMMERCIAL PATHWAYS
      ===================================================== */}

      <section className="relative py-20 sm:py-24 bg-[#040A12] border-b border-[#C5CBD3]/10">

        <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16">

          <div className="mb-12">

            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase">
              START HERE
            </span>

            <h2 className="mt-3 text-3xl sm:text-4xl font-serif text-[#F2F4F7] uppercase tracking-wide">
              What do you need?
            </h2>

          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >

            {buyerPaths.map((path) => {

              const Icon = path.icon;

              return (
                <motion.div
                  key={path.title}
                  variants={fadeUp}
                  className="
                    group
                    border
                    border-[#C5CBD3]/20
                    bg-[#121D29]/35
                    p-7
                    sm:p-8
                    hover:border-[#C5CBD3]/40
                    hover:bg-[#121D29]/55
                    transition-all
                  "
                >

                  <Icon
                    size={21}
                    className="text-[#6D7886] mb-6"
                  />

                  <h3 className="text-[#F2F4F7] font-serif text-xl uppercase tracking-wide">
                    {path.title}
                  </h3>

                  <p className="mt-3 text-[#C5CBD3] text-xs font-light leading-[1.7] min-h-[58px]">
                    {path.description}
                  </p>

                  <Link
                    to={path.link}
                    className="
                      mt-7
                      inline-flex
                      items-center
                      gap-2
                      text-[#F2F4F7]
                      text-[10px]
                      uppercase
                      tracking-widest
                      font-bold
                      border-b
                      border-[#C5CBD3]/30
                      pb-2
                      group-hover:border-[#F2F4F7]
                      transition-all
                    "
                  >
                    {path.cta}
                    <FiArrowUpRight
                      size={14}
                      className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                    />
                  </Link>

                </motion.div>
              );
            })}

          </motion.div>

        </div>
      </section>


      {/* =====================================================
          DIVISIONS
      ===================================================== */}

      <section
        id="divisions"
        className="relative py-20 sm:py-24 lg:py-28 bg-[#0E1116]"
      >

        <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16">

          <div className="mb-14">

            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase">
              OUR DIVISIONS
            </span>

            <h2 className="mt-3 text-3xl sm:text-4xl font-serif text-[#F2F4F7] uppercase tracking-wide">
              Products & Supply
            </h2>

            <p className="mt-4 text-[#C5CBD3] text-sm font-light max-w-[620px] leading-[1.7]">
              Explore our current product divisions. Each division
              provides a focused route into the products and supply
              requirements it serves.
            </p>

          </div>


          <div className="space-y-8">

            {divisions.map((division, index) => (

              <motion.div
                key={division.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.65 }}
                className="grid lg:grid-cols-2 border border-[#C5CBD3]/20 bg-[#121D29]/35 overflow-hidden"
              >

                {/* IMAGE */}

                <div
                  className={`relative min-h-[340px] lg:min-h-[500px] ${
                    index % 2 !== 0 ? 'lg:order-2' : ''
                  }`}
                >

                  <img
                    src={division.image}
                    alt={division.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      filter:
                        'brightness(0.85) contrast(1.08) saturate(0.72)',
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#040A12]/80 via-transparent to-[#040A12]/20" />

                  <div className="absolute top-6 left-6">

                    <span className="inline-flex items-center justify-center min-w-[48px] h-8 px-3 border border-[#C5CBD3]/30 bg-[#0E1116]/60 backdrop-blur-sm text-[#F2F4F7] text-[11px] font-mono tracking-wider">
                      {division.number}
                    </span>

                  </div>

                </div>


                {/* CONTENT */}

                <div className="p-7 sm:p-10 lg:p-14 flex flex-col justify-center">

                  <span className="text-[#6D7886] font-medium tracking-[2.5px] text-[10px] uppercase">
                    {division.eyebrow}
                  </span>

                  <h3 className="mt-4 text-3xl sm:text-4xl font-serif text-[#F2F4F7] uppercase tracking-wide">
                    {division.title}
                  </h3>

                  <div className="w-12 h-[1px] bg-[#C5CBD3]/30 my-6" />

                  <p className="text-[#C5CBD3] font-sans font-light text-sm leading-[1.7] max-w-[560px]">
                    {division.description}
                  </p>

                  <div className="mt-9 border-t border-[#C5CBD3]/15">

                    {division.products.map((product) => {

                      const Icon = product.icon;

                      return (
                        <Link
                          key={product.title}
                          to={product.link}
                          className="
                            group
                            flex
                            items-center
                            gap-5
                            py-5
                            border-b
                            border-[#C5CBD3]/15
                            hover:bg-[#121D29]/60
                            transition-colors
                            px-2
                          "
                        >

                          <div className="
                            w-10
                            h-10
                            flex
                            items-center
                            justify-center
                            border
                            border-[#C5CBD3]/20
                            text-[#6D7886]
                            group-hover:text-[#F2F4F7]
                            group-hover:border-[#C5CBD3]/50
                            transition-all
                            shrink-0
                          ">
                            <Icon size={18} />
                          </div>

                          <div className="flex-1">

                            <h4 className="text-[#F2F4F7] font-serif text-lg uppercase tracking-wide">
                              {product.title}
                            </h4>

                            <p className="text-[#C5CBD3] text-xs font-light leading-relaxed mt-1">
                              {product.description}
                            </p>

                          </div>

                          <FiArrowUpRight
                            size={18}
                            className="
                              text-[#6D7886]
                              group-hover:text-[#F2F4F7]
                              group-hover:translate-x-1
                              group-hover:-translate-y-1
                              transition-all
                              shrink-0
                            "
                          />

                        </Link>
                      );
                    })}

                  </div>

                </div>

              </motion.div>

            ))}

          </div>

        </div>
      </section>


      {/* =====================================================
          SUPPORT
      ===================================================== */}

      <section className="relative bg-[#040A12] py-20 sm:py-24 lg:py-28 border-y border-[#C5CBD3]/10">

        <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16">

          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-14 lg:gap-24">

            <div>

              <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase">
                HOW WE SUPPORT
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-serif text-[#F2F4F7] uppercase tracking-wide leading-tight">
                More than
                <br />
                <span className="font-medium">
                  product supply.
                </span>
              </h2>

            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="grid sm:grid-cols-2 gap-8"
            >

              {supportPoints.map((item) => {

                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.title}
                    variants={fadeUp}
                    className="border-t border-[#C5CBD3]/20 pt-5"
                  >

                    <Icon
                      size={19}
                      className="text-[#6D7886] mb-4"
                    />

                    <h3 className="text-[#F2F4F7] font-serif text-lg uppercase tracking-wide mb-2">
                      {item.title}
                    </h3>

                    <p className="text-[#C5CBD3] text-xs font-light leading-[1.65]">
                      {item.description}
                    </p>

                  </motion.div>
                );
              })}

            </motion.div>

          </div>

        </div>
      </section>


      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}

      <section className="relative py-20 sm:py-24 lg:py-28 bg-[#0E1116]">

        <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16">

          <div className="mb-14">

            <span className="text-[#6D7886] font-medium tracking-[3px] text-[11px] uppercase">
              HOW IT WORKS
            </span>

            <h2 className="mt-3 text-3xl sm:text-4xl font-serif text-[#F2F4F7] uppercase tracking-wide">
              From requirement to delivery
            </h2>

            <p className="mt-4 text-[#C5CBD3] text-sm font-light max-w-[600px] leading-[1.7]">
              A straightforward commercial process designed to move from
              requirement to supply with clear communication at each stage.
            </p>

          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

            {processSteps.map((step) => (

              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55 }}
                className="
                  border
                  border-[#C5CBD3]/20
                  bg-[#121D29]/35
                  p-6
                  min-h-[220px]
                "
              >

                <div className="flex items-center justify-between">

                  <span className="font-serif text-[#6D7886] font-bold text-lg tracking-wider">
                    {step.number}
                  </span>

                  <FiCheckCircle
                    size={16}
                    className="text-[#6D7886]"
                  />

                </div>

                <h3 className="mt-8 text-lg font-serif text-[#F2F4F7] uppercase tracking-wide">
                  {step.title}
                </h3>

                <p className="mt-3 text-[#C5CBD3] text-xs font-light leading-[1.65]">
                  {step.description}
                </p>

              </motion.div>

            ))}

          </div>

        </div>
      </section>


      {/* =====================================================
          FINAL CTA
      ===================================================== */}

      <section className="relative w-full py-24 sm:py-28 overflow-hidden border-t border-[#C5CBD3]/20 bg-[#040A12]">

        <div className="absolute inset-0 opacity-65">

          <img
            src="/images/ito_images/ito_1.jpeg"
            alt="India Trade Overseas logistics"
            className="w-full h-full object-cover object-center"
            style={{
              filter:
                'brightness(1.05) contrast(1.1) saturate(0.65)',
            }}
          />

          <div className="absolute inset-0 bg-[#0E1116]/75" />

        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">

          <div className="inline-flex items-center gap-2 bg-[#2B3440]/70 border border-[#C5CBD3]/20 rounded-full px-4 py-1">

            <span className="w-1.5 h-1.5 rounded-full bg-[#F2F4F7]" />

            <span className="text-[10px] tracking-widest font-mono uppercase text-[#F2F4F7] font-bold">
              TELL US WHAT YOU NEED
            </span>

          </div>

          <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-serif text-[#F2F4F7] tracking-wide uppercase leading-tight">
            Start your
            <br />
            <span className="font-medium">
              sourcing requirement.
            </span>
          </h2>

          <p className="mt-6 text-[#C5CBD3] font-sans font-light text-xs sm:text-sm max-w-2xl leading-[1.7] mx-auto">
            Share the product, quantity and delivery location.
            Our commercial team will review the requirement and
            coordinate sourcing, availability and logistics.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-8 items-center justify-center">

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
                text-[11px]
                sm:text-[12px]
                uppercase
                tracking-widest
                flex
                items-center
                justify-center
                rounded-[2px]
                transition-all
              "
            >
              Request Bulk Quote
            </Link>

            <Link
              to="/contact"
              className="
                w-full
                sm:w-auto
                min-w-[220px]
                h-[52px]
                bg-[#121D29]/60
                backdrop-blur-[5px]
                border
                border-[#C5CBD3]/40
                hover:bg-[#2B3440]
                hover:border-[#F2F4F7]
                text-[#F2F4F7]
                font-sans
                font-bold
                text-[11px]
                sm:text-[12px]
                uppercase
                tracking-widest
                flex
                items-center
                justify-center
                rounded-[2px]
                transition-all
              "
            >
              Talk to Sales
            </Link>

          </div>

        </div>
      </section>

    </div>
  );
}