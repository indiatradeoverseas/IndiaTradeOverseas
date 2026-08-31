import React, { useState } from 'react';

import {
  FiMapPin,
  FiMail,
  FiClock,
  FiSend,
  FiBookmark,
  FiMessageCircle
} from 'react-icons/fi';

import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { pushDataLayerEvent } from '../../utils/analytics';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { leadsApi } from '../../api/leads';

export default function Contact() {
  useDocumentMeta({
    title: 'Contact India Trade Overseas | Global Trade Enquiries',
    description:
      'Connect with India Trade Overseas for sourcing, supply, export, logistics and commercial enquiries across stone, rice, tea and industrial materials.',
    canonicalPath: '/contact'
  });

  /* =========================================================
     FORM STATE
  ========================================================= */
  const [formData, setFormData] = useState({
    leadType: 'BUYER',
    name: '',
    companyName: '',
    email: '',
    phone: '',
    productCategory: '',
    quantity: '',
    destination: '',
    specification: '',
    requiredDate: '',
    paymentTerms: '',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);

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
     WHATSAPP HANDLER
  ========================================================= */
  const handleWhatsApp = () => {
    if (!WHATSAPP_NUMBER) {
      toast.error(
        'WhatsApp contact is not configured yet. Please use the enquiry form or email us.'
      );
      return;
    }

    const message = encodeURIComponent(
      'Hello India Trade Overseas, I would like to discuss a commercial trade requirement.'
    );

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  /* =========================================================
     FORM SUBMISSION
  ========================================================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      leadType,
      name,
      companyName,
      email,
      phone,
      productCategory,
      quantity,
      destination,
      specification,
      requiredDate,
      paymentTerms,
      message
    } = formData;

    /* ---------------------------------------------------------
       Basic Validation
    --------------------------------------------------------- */

    if (
      !name.trim() ||
      name.trim().length < 2 ||
      name.trim().length > 120
    ) {
      return toast.error(
        'Contact person name must be between 2 and 120 characters.'
      );
    }

    if (!phone.trim()) {
      return toast.error(
        'Mobile / WhatsApp number is required.'
      );
    }

    if (!productCategory.trim()) {
      return toast.error(
        'Please specify the product or service required.'
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

    if (!message.trim() || message.trim().length < 30) {
      return toast.error(
        'Commercial requirement must contain at least 30 characters.'
      );
    }

    /* ---------------------------------------------------------
       Email validation when provided
    --------------------------------------------------------- */

    if (email.trim()) {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email.trim())) {
        return toast.error(
          'Please enter a valid corporate email address.'
        );
      }
    }

    /* ---------------------------------------------------------
       Submit
    --------------------------------------------------------- */

    setSubmitting(true);
    try {
      // Determine product category from subject keywords or default to GENERAL
      let productCategory = 'GENERAL';
      const subj = formData.subject.toLowerCase();
      if (subj.includes('tea') || subj.includes('prakriti')) productCategory = 'TEA';
      else if (subj.includes('rice')) productCategory = 'RICE';
      else if (subj.includes('stone')) productCategory = 'STONE';

      await leadsApi.createLead({
        customerName: formData.name,
        email: formData.email,
        phone: formData.phone || '9999999999',
        companyName: formData.subject,
        productCategory,
        message: formData.message,
        source: 'WEBSITE'
      });

      toast.success('Commercial dossier successfully generated inside trade intake system.');
      pushDataLayerEvent('generate_lead', { lead_type: 'contact_form' });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      console.error('Error submitting contact lead:', err);
      toast.error(err.response?.data?.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     CONTACT INFORMATION
  ========================================================= */

  const contactInfo = [
    {
      icon: FiMapPin,
      title: 'Our Offices',
      details: [
        'Regd Office: Kishanganj, Bihar, India',
        'Branch Office: Pradhan Nagar, Siliguri, WB',
        'Factory Module: Deramari, Kishanganj, Bihar'
      ]
    },
    {
      icon: FiMail,
      title: 'Email Us',
      details: [
        'info@indiatradeoverseas.com'
      ]
    },
    {
      icon: FiClock,
      title: 'Business Hours',
      details: [
        'Mon to Sat: 9:30 AM - 6:30 PM IST'
      ]
    }
  ];

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] antialiased min-h-screen selection:bg-[#6D7886]/30 selection:text-white font-sans overflow-x-hidden">

      {/* =====================================================
          TOP BORDER
      ===================================================== */}

      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full"></div>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative w-full py-20 lg:py-28 px-6 sm:px-12 lg:px-16 overflow-hidden bg-[#040A12] border-b border-[#C5CBD3]/10 flex items-center justify-center">

        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-40 group">

          <img
            src="/images/ito_images/ito_15.jpeg"
            alt="India Trade Overseas Commercial Office Gateway"
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-[10s] ease-out group-hover:scale-100"
            style={{
              filter:
                'brightness(1.3) contrast(1.20) saturate(0.55)'
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/20 via-transparent to-[#040A12]/10 z-1" />

          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/20 via-[#040A12]/10 to-[#040A12]/5 z-1" />

          <div className="absolute inset-0 box-shadow-[inset_0_0_120px_rgba(0,0,0,0.65)] z-1" />

        </div>

        <div className="max-w-[1480px] mx-auto relative z-10 text-center space-y-5 pt-32 sm:pt-40 lg:pt-[160px] pb-6">

          <motion.span
            initial={{
              opacity: 0,
              y: 10
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="text-[#aeb4be] text-[10px] sm:text-[11px] font-medium tracking-[4px] uppercase block font-sans drop-shadow-[0_2px_4px_rgba(4,10,18,0.4)]"
          >
            GLOBAL TRADE INTAKE
          </motion.span>

          <motion.h1
            initial={{
              opacity: 0,
              y: 16
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              duration: 0.75,
              delay: 0.1,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="text-4xl sm:text-5xl lg:text-[62px] font-serif tracking-tight font-normal uppercase leading-[1.1] max-w-5xl mx-auto text-transparent bg-clip-text bg-gradient-to-b from-[#F2F4F7] via-[#F2F4F7] to-[#C5CBD3] filter drop-shadow-[0_4px_12px_rgba(4,10,18,0.7)]"
          >
            Let's Build Your Trade Requirement
          </motion.h1>

          <motion.div
            initial={{
              opacity: 0,
              scaleX: 0
            }}
            animate={{
              opacity: 1,
              scaleX: 1
            }}
            transition={{
              duration: 0.5,
              delay: 0.2
            }}
            className="w-16 h-[1px] bg-[#C5CBD3]/40 mx-auto border-b"
            aria-hidden="true"
          />

          <motion.p
            initial={{
              opacity: 0,
              y: 12
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              duration: 0.7,
              delay: 0.25,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="font-sans font-light text-[#C5CBD3] text-sm sm:text-[16px] max-w-3xl mx-auto leading-[1.65] opacity-95 drop-shadow-[0_2px_8px_rgba(4,10,18,0.6)]"
          >
            Tell us what you need to source, supply or move.
            Our commercial team will review your requirement and
            connect with the appropriate trade division.
          </motion.p>

        </div>
      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16 py-20">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">

          {/* =================================================
              LEFT COLUMN
          ================================================= */}

          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">

            <div className="space-y-6 w-full">

              {contactInfo.map((info, idx) => {
                const Icon = info.icon;

                return (
                  <div
                    key={idx}
                    className="bg-[#121D29]/58 border border-[#C5CBD3]/24 shadow-sm rounded-[4px] p-5 flex items-center space-x-4"
                  >

                    <div className="p-3 bg-[#0E1116] border border-[#C5CBD3]/24 text-[#F2F4F7] rounded-[2px] shrink-0">
                      <Icon size={16} />
                    </div>

                    <div className="text-left min-w-0 flex-1">

                      <h3 className="font-serif text-sm font-medium text-[#F2F4F7] mb-1.5">
                        {info.title}
                      </h3>

                      {info.details.map((line, i) => (
                        <p
                          key={i}
                          className="text-[#C5CBD3] text-xs font-sans font-light truncate"
                        >
                          {line}
                        </p>
                      ))}

                    </div>
                  </div>
                );
              })}

            </div>

            {/* =================================================
                WHATSAPP CTA
            ================================================= */}

            <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 rounded-[4px] shadow-sm p-5 w-full">

              <div className="flex items-center gap-3">

                <div className="p-3 bg-[#0E1116] border border-[#C5CBD3]/24 text-[#F2F4F7] rounded-[2px] shrink-0">
                  <FiMessageCircle size={17} />
                </div>

                <div className="flex-1 min-w-0">

                  <h3 className="font-serif text-sm font-medium text-[#F2F4F7] mb-1">
                    Talk to Us on WhatsApp
                  </h3>

                  <p className="text-[#C5CBD3] text-xs font-sans font-light">
                    For quick commercial discussions and requirement follow-ups.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="shrink-0 px-4 h-[40px] bg-[#2B3440] hover:bg-[#0E1116] border border-[#C5CBD3]/42 hover:border-[#F2F4F7] text-[#F2F4F7] font-sans font-bold text-[10px] uppercase tracking-wider rounded-[2px] transition-all"
                >
                  WhatsApp
                </button>

              </div>

            </div>

            {/* =================================================
                MAP
            ================================================= */}

            <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 rounded-[4px] shadow-sm p-4 space-y-4 w-full">

              <div className="flex items-center gap-2 text-[#F2F4F7] border-b border-[#C5CBD3]/10 pb-3">

                <FiBookmark
                  size={14}
                  className="text-[#6D7886]"
                />

                <h3 className="font-serif text-xs font-medium uppercase tracking-wider">
                  Our Locations
                </h3>

              </div>

              <div className="h-48 w-full bg-[#0E1116] rounded-[2px] overflow-hidden border border-[#C5CBD3]/20 relative">

                <iframe
                  title="India Trade Overseas Operational Logistics Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3570.3664797042576!2d87.9405623!3d26.4447472!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDI2JzQxLjEiTiA4N8KwNTYnMjYuMCJF!5e0!3m2!1sen!2sin!4v1680000000000"
                  className="w-full h-full border-0 invert-[0.92] hue-rotate-180 brightness-90 contrast-125 grayscale"
                  loading="lazy"
                />

              </div>

            </div>

          </div>

          {/* =================================================
              RIGHT COLUMN — DPR INTAKE FORM
          ================================================= */}

          <div className="lg:col-span-7">

            <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 shadow-sm rounded-[4px] p-6 sm:p-8 text-left h-full flex flex-col justify-between">

              <div>

                <h2 className="text-xl font-serif text-[#F2F4F7] font-medium tracking-wide uppercase mb-6 border-b border-[#C5CBD3]/10 pb-3">
                  Commercial Enquiry Form
                </h2>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 font-sans text-xs"
                >

                  {/* =========================================
                      ENQUIRY TYPE
                  ========================================= */}

                  <div>

                    <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                      I Am Enquiring As *
                    </label>

                    <select
                      name="leadType"
                      required
                      value={formData.leadType}
                      onChange={handleChange}
                      className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7]"
                    >
                      <option value="BUYER">
                        Buyer / Procurement Requirement
                      </option>

                      <option value="SUPPLIER">
                        Supplier / Sourcing Partnership
                      </option>

                      <option value="LOGISTICS">
                        Logistics / Transport Requirement
                      </option>
                    </select>

                  </div>

                  {/* =========================================
                      NAME + COMPANY
                  ========================================= */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Contact Person *
                      </label>

                      <input
                        type="text"
                        name="name"
                        required
                        minLength={2}
                        maxLength={120}
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="Your full name"
                      />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Company Name
                      </label>

                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="Company / Organisation"
                      />

                    </div>

                  </div>

                  {/* =========================================
                      EMAIL + PHONE
                  ========================================= */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Corporate Email
                      </label>

                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="partner@enterprise.com"
                      />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Mobile / WhatsApp *
                      </label>

                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="Country Code + Number"
                      />

                    </div>

                  </div>

                  {/* =========================================
                      PRODUCT + QUANTITY
                  ========================================= */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Product / Service Required *
                      </label>

                      <input
                        type="text"
                        name="productCategory"
                        required
                        value={formData.productCategory}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="Tea, Rice, Stone, Logistics..."
                      />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Required Quantity / Volume *
                      </label>

                      <input
                        type="text"
                        name="quantity"
                        required
                        value={formData.quantity}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="e.g. 20 MT / 5000 units"
                      />

                    </div>

                  </div>

                  {/* =========================================
                      DESTINATION + REQUIRED DATE
                  ========================================= */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Destination / Delivery Location *
                      </label>

                      <input
                        type="text"
                        name="destination"
                        required
                        value={formData.destination}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="City / Port / Country"
                      />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Required By
                      </label>

                      <input
                        type="date"
                        name="requiredDate"
                        value={formData.requiredDate}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7]"
                      />

                    </div>

                  </div>

                  {/* =========================================
                      SPECIFICATION + PAYMENT
                  ========================================= */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Grade / Specification
                      </label>

                      <input
                        type="text"
                        name="specification"
                        value={formData.specification}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="Grade, quality, specification..."
                      />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                        Preferred Payment Terms
                      </label>

                      <input
                        type="text"
                        name="paymentTerms"
                        value={formData.paymentTerms}
                        onChange={handleChange}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="LC / Advance / Credit..."
                      />

                    </div>

                  </div>

                  {/* =========================================
                      REQUIREMENT
                  ========================================= */}

                  <div>

                    <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">
                      Commercial Requirement *
                    </label>

                    <textarea
                      name="message"
                      rows={5}
                      required
                      minLength={30}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full p-4 bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] resize-none placeholder-[#6D7886] font-sans leading-relaxed"
                      placeholder="Tell us about your requirement, preferred specifications, delivery expectations, target market, ports or any other commercial details. (Minimum 30 characters)"
                    />

                  </div>

                  {/* =========================================
                      CONSENT
                  ========================================= */}

                  <div className="flex items-start space-x-2.5 pt-1">

                    <input
                      type="checkbox"
                      required
                      id="data-processing-consent"
                      className="mt-0.5 rounded-[1px] bg-[#0E1116] border-[#C5CBD3]/30 accent-[#2B3440] cursor-pointer"
                    />

                    <label
                      htmlFor="data-processing-consent"
                      className="text-[#6D7886] text-[11px] font-light leading-snug cursor-pointer select-none"
                    >
                      I authorize India Trade Overseas to verify and process the commercial information submitted through this enquiry for business communication and requirement evaluation.
                    </label>

                  </div>

                  {/* =========================================
                      SUBMIT
                  ========================================= */}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-[52px] bg-[#2B3440] hover:bg-[#0E1116] border border-[#C5CBD3]/42 hover:border-[#F2F4F7] text-[#F2F4F7] font-sans font-bold text-xs uppercase tracking-widest rounded-[2px] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >

                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />

                        <span>
                          Processing Enquiry...
                        </span>
                      </>
                    ) : (
                      <>
                        <FiSend />

                        <span>
                          Submit Commercial Enquiry
                        </span>
                      </>
                    )}

                  </button>

                  <p className="text-[10px] text-[#6D7886] text-center leading-relaxed pt-1">
                    Your enquiry will be securely recorded in our trade intake system and routed for commercial review.
                  </p>

                </form>

              </div>

            </div>

          </div>

        </div>
      </div>

      {/* =====================================================
          FOOTER SEAL
      ===================================================== */}

      <footer className="bg-[#040A12] text-[#6D7886] py-16 px-6 border-t border-[#C5CBD3]/24 text-center font-sans relative overflow-hidden">

        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-80">

          <img
            src="/images/footer-bg-image.png"
            alt="India Trade Overseas Industrial Logistics Footprint"
            className="w-full h-full object-cover object-center scale-106 mt-3"
            style={{
              filter:
                'brightness(1.5) contrast(1.5) saturate(0.5)'
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
            Rates, availability, product specifications, freight, GST,
            dispatch timelines and delivery commitments are subject to
            final commercial confirmation.
          </div>

        </div>

      </footer>

    </div>
  );
}