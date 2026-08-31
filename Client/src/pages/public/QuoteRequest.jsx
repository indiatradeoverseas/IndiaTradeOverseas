import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { FiSend, FiCheckCircle, FiAnchor } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { pushDataLayerEvent } from '../../utils/analytics';
import useDocumentMeta from '../../hooks/useDocumentMeta';

export default function QuoteRequest() {
  useDocumentMeta({
    title: 'Request a Quote | India Trade Overseas',
    description:
      'Request a bulk sourcing or export quote from India Trade Overseas for stone, rice, tea, coal, industrial materials and logistics services.',
    canonicalPath: '/quote-request'
  });

  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    customerName: '',
    companyName: '',
    phone: '',
    email: '',
    productCategory: '',
    quantity: '',
    destination: '',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* =========================================================
     PREFILL FROM PRODUCT / CATEGORY URL
  ========================================================= */

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const productNameParam = searchParams.get('productName');

    if (categoryParam || productNameParam) {
      const categoryMapping = {
        stone: 'STONE',
        natural_stone: 'STONE',
        white_stone: 'WHITE_STONE',
        aggregates: 'WHITE_STONE',
        tea: 'TEA',
        rice: 'RICE',
        coal: 'COAL',
        industrial_materials: 'COAL',
        logistics: 'LOGISTICS',
        transport: 'LOGISTICS'
      };

      const mappedCategory =
        categoryMapping[categoryParam?.toLowerCase()] || '';

      setFormData((prev) => ({
        ...prev,
        productCategory:
          mappedCategory || prev.productCategory,

        message: productNameParam
          ? `I am interested in requesting a quote for "${productNameParam}". Please provide pricing, availability and delivery details.`
          : prev.message
      }));
    }
  }, [searchParams]);

  /* =========================================================
     INPUT HANDLER
  ========================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  /* =========================================================
     FORM SUBMISSION
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      customerName,
      companyName,
      phone,
      email,
      productCategory,
      quantity,
      destination,
      message
    } = formData;

    /* ---------------------------------------------------------
       Basic Validation
    --------------------------------------------------------- */

    if (
      !customerName.trim() ||
      customerName.trim().length < 2 ||
      customerName.trim().length > 120
    ) {
      return toast.error(
        'Please enter a valid name between 2 and 120 characters.'
      );
    }

    if (!phone.trim()) {
      return toast.error(
        'Please enter your phone / WhatsApp number.'
      );
    }

    if (!email.trim()) {
      return toast.error(
        'Please enter your email address.'
      );
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return toast.error(
        'Please enter a valid email address.'
      );
    }

    if (!productCategory.trim()) {
      return toast.error(
        'Please select the product or service you require.'
      );
    }

    if (!quantity.trim()) {
      return toast.error(
        'Please provide the required quantity or volume.'
      );
    }

    if (!destination.trim()) {
      return toast.error(
        'Please provide the destination or delivery location.'
      );
    }

    /* ---------------------------------------------------------
       Submit
    --------------------------------------------------------- */

    setSubmitting(true);

    try {
      const response = await leadsApi.createLead(formData);

      if (response.success) {
        setSubmitted(true);

        toast.success(
          'Quote request submitted successfully! Our team will contact you soon.',
          {
            style: {
              borderRadius: '4px',
              background: '#0E1116',
              color: '#F2F4F7',
              border: '1px solid #C5CBD3',
              fontSize: '12px'
            }
          }
        );

        pushDataLayerEvent('generate_lead', {
          lead_type: 'quote_request',
          product_category:
            formData.productCategory || undefined
        });

        setTimeout(() => {
          setSubmitted(false);

          setFormData({
            customerName: '',
            companyName: '',
            phone: '',
            email: '',
            productCategory: '',
            quantity: '',
            destination: '',
            message: ''
          });
        }, 3000);
      } else {
        toast.error(
          response?.message ||
            'Unable to submit the quote request. Please try again.'
        );
      }
    } catch (error) {
      console.error(
        'Error submitting quote request:',
        error
      );

      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error;

      if (backendMessage) {
        toast.error(backendMessage, {
          style: {
            borderRadius: '4px',
            background: '#0E1116',
            color: '#F2F4F7',
            border: '1px solid #ef4444',
            fontSize: '12px'
          }
        });
      } else {
        toast.error(
          'Unable to submit your request. Please try again shortly.',
          {
            style: {
              borderRadius: '4px',
              background: '#0E1116',
              color: '#F2F4F7',
              border: '1px solid #ef4444',
              fontSize: '12px'
            }
          }
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     ANIMATION
  ========================================================= */

  const containerVariants = {
    hidden: {
      opacity: 0
    },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const popUpVariants = {
    hidden: {
      opacity: 0,
      y: 15
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'linear',
        duration: 0.55
      }
    }
  };

  /* =========================================================
     SUCCESS STATE
  ========================================================= */

  if (submitted) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-20 flex items-center justify-center bg-[#040A12] min-h-[75vh]">

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.98
          }}
          animate={{
            opacity: 1,
            scale: 1
          }}
          className="bg-[#0E1116]/90 backdrop-blur-md p-8 border border-[#C5CBD3]/20 rounded-sm text-center max-w-sm w-full relative shadow-2xl"
        >

          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6D7886] via-[#C5CBD3] to-[#6D7886]" />

          <div className="inline-flex p-3 bg-[#040A12] border border-[#C5CBD3]/24 rounded-sm mb-4 text-[#F2F4F7]">
            <FiCheckCircle size={28} />
          </div>

          <h2 className="text-xl font-serif font-normal text-[#F2F4F7] tracking-wide mb-2 uppercase">
            Request Received
          </h2>

          <p className="text-[#C5CBD3] text-xs leading-relaxed font-light opacity-90">
            Thank you for your enquiry. Our commercial team will review your requirement and contact you shortly.
          </p>

        </motion.div>

      </div>
    );
  }

  /* =========================================================
     MAIN PAGE
  ========================================================= */

  return (
    <div className="bg-[#0E1116] min-h-screen pt-32 sm:pt-40 lg:pt-[150px] pb-20 px-6 sm:px-12 lg:px-16 font-sans antialiased relative overflow-hidden text-[#C5CBD3]">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-50">

        <img
          src="/images/ito_images/ito_10.jpeg"
          alt="India Trade Overseas commercial and logistics operations"
          className="w-full h-full object-cover filter brightness-[1] contrast-[1.15] saturate-[0.80]"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/20 via-transparent to-[#040A12]/10" />

      </div>

      {/* =====================================================
          TOP BORDER
      ===================================================== */}

      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full fixed top-0 left-0 z-50" />

      <div className="max-w-3xl mx-auto relative z-10">

        {/* ===================================================
            HEADER
        =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 12
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1]
          }}
          className="text-center mb-10 space-y-3"
        >

          <div className="flex justify-center">

            <div className="h-9 w-9 bg-[#0E1116] rounded-sm border border-[#C5CBD3]/30 flex items-center justify-center shadow-md">

              <FiAnchor className="h-4 w-4 text-[#F2F4F7]" />

            </div>

          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#F2F4F7] tracking-tight uppercase leading-none">
            Request a Quote
          </h1>

          <div
            className="w-12 h-[1px] bg-[#C5CBD3]/30 mx-auto"
            aria-hidden="true"
          />

          <p className="text-[10px] text-[#f6f8fb] tracking-widest uppercase font-mono font-bold">
            India Trade Overseas
          </p>

          <p className="text-xs sm:text-sm text-[#C5CBD3] max-w-xl mx-auto leading-relaxed font-light pt-1">
            Share your sourcing, supply or logistics requirement and our team will get back to you with the relevant commercial details.
          </p>

        </motion.div>

        {/* ===================================================
            FORM CONTAINER
        =================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 15
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.7,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1]
          }}
          className="bg-[#121D29]/40 backdrop-blur-sm border border-[#C5CBD3]/20 shadow-2xl rounded-sm p-6 sm:p-8 relative"
        >

          {/* Top Accent */}

          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6D7886] via-[#C5CBD3] to-[#6D7886] rounded-t-sm" />

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* ===============================================
                ROW 1 — NAME + COMPANY
            =============================================== */}

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >

              <motion.div variants={popUpVariants}>

                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Full Name <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="customerName"
                  required
                  minLength={2}
                  maxLength={120}
                  value={formData.customerName}
                  onChange={handleChange}
                  className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  placeholder="Enter full name"
                />

              </motion.div>

              <motion.div variants={popUpVariants}>

                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Company Name
                </label>

                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  placeholder="Company / Organisation"
                />

              </motion.div>

            </motion.div>

            {/* ===============================================
                ROW 2 — PHONE + EMAIL
            =============================================== */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Phone / WhatsApp <span className="text-red-500">*</span>
                </label>

                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  placeholder="Country code + number"
                />

              </div>

              <div>

                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Email Address <span className="text-red-500">*</span>
                </label>

                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  placeholder="name@company.com"
                />

              </div>

            </div>

            {/* ===============================================
                ROW 3 — PRODUCT + QUANTITY
            =============================================== */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Product / Service <span className="text-red-500">*</span>
                </label>

                <div className="relative">

                  <select
                    name="productCategory"
                    required
                    value={formData.productCategory}
                    onChange={handleChange}
                    className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/90 px-3.5 py-2.5 text-xs text-[#F2F4F7] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all appearance-none cursor-pointer"
                  >

                    <option
                      value=""
                      className="bg-[#0E1116] text-[#6D7886]"
                    >
                      Select product or service
                    </option>

                    <option
                      value="STONE"
                      className="bg-[#0E1116] text-[#C5CBD3]"
                    >
                      Stone / Aggregates
                    </option>

                    <option
                      value="WHITE_STONE"
                      className="bg-[#0E1116] text-[#C5CBD3]"
                    >
                      White Stone Aggregates
                    </option>

                    <option
                      value="TEA"
                      className="bg-[#0E1116] text-[#C5CBD3]"
                    >
                      Tea
                    </option>

                    <option
                      value="RICE"
                      className="bg-[#0E1116] text-[#C5CBD3]"
                    >
                      Rice
                    </option>

                    <option
                      value="COAL"
                      className="bg-[#0E1116] text-[#C5CBD3]"
                    >
                      Coal / Industrial Materials
                    </option>

                    <option
                      value="LOGISTICS"
                      className="bg-[#0E1116] text-[#C5CBD3]"
                    >
                      Logistics / Transport
                    </option>

                  </select>

                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#6D7886]">

                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>

                  </div>

                </div>

              </div>

              <div>

                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Required Quantity / Volume <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="quantity"
                  required
                  value={formData.quantity}
                  onChange={handleChange}
                  className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  placeholder="e.g. 500 MT / 20 containers"
                />

              </div>

            </div>

            {/* ===============================================
                DESTINATION
            =============================================== */}

            <div>

              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                Destination / Delivery Location <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                name="destination"
                required
                value={formData.destination}
                onChange={handleChange}
                className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                placeholder="City / Port / Country"
              />

            </div>

            {/* ===============================================
                REQUIREMENTS
            =============================================== */}

            <div>

              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                Additional Requirements
              </label>

              <textarea
                name="message"
                rows={5}
                value={formData.message}
                onChange={handleChange}
                className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all resize-none custom-scrollbar"
                placeholder="Tell us about your required quality, specifications, delivery timeline, preferred trade terms or any other commercial details."
              />

            </div>

            {/* ===============================================
                INFORMATION NOTICE
            =============================================== */}

            <div className="p-3.5 bg-[#040A12]/60 border border-[#C5CBD3]/10 text-[#b5bdc8] text-[11px] font-light leading-relaxed rounded-sm">

              <strong>Note:</strong>{' '}
              Pricing, availability, specifications, freight, delivery timelines and other commercial terms are subject to final confirmation by our team.

            </div>

            {/* ===============================================
                SUBMIT
            =============================================== */}

            <motion.button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-2 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#0E1116] text-xs font-semibold tracking-widest py-3.5 rounded-sm disabled:opacity-50 disabled:pointer-events-none transition-all uppercase mt-2 shadow-md cursor-pointer"
            >

              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0E1116] border-t-transparent" />
              ) : (
                <>
                  <FiSend
                    size={13}
                    className="text-[#0E1116]"
                  />

                  <span>
                    Request Quote
                  </span>
                </>
              )}

            </motion.button>

            <p className="text-[10px] text-[#6D7886] text-center leading-relaxed pt-1">
              Your enquiry will be reviewed by our commercial team and routed to the appropriate trade division.
            </p>

          </form>

        </motion.div>

      </div>

      {/* =====================================================
          MOBILE FOOTER SEAL
      ===================================================== */}

      <footer className="bg-[#040A12] text-[#6D7886] py-16 px-6 border-t border-[#C5CBD3]/24 text-center font-sans absolute bottom-0 left-0 right-0 h-auto pointer-events-none select-none opacity-0 lg:hidden">

        <div className="max-w-3xl mx-auto space-y-4">

          <p className="text-[12px] uppercase tracking-[0.25em] font-semibold text-[#F2F4F7]">
            India Trade Overseas
          </p>

        </div>

      </footer>

    </div>
  );
}