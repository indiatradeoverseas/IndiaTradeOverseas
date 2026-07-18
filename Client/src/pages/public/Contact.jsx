import React, { useState } from 'react';
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend, FiBookmark } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.name.length < 2 || formData.name.length > 120) {
      return toast.error('Full Corporate Identity must be between 2 and 120 characters.');
    }
    if (!formData.email.trim()) {
      return toast.error('Corporate email is a required field.');
    }
    if (!formData.subject.trim()) {
      return toast.error('Procurement target subject is a required field.');
    }
    if (!formData.message.trim() || formData.message.length < 30) {
      return toast.error('Commercial specifications must contain a minimum of 30 characters.');
    }

    setSubmitting(true);
    setTimeout(() => {
      toast.success('Commercial dossier successfully generated inside trade intake system.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setSubmitting(false);
    }, 1000);
  };

  const contactInfo = [
    {
      icon: FiMapPin,
      title: 'Corporate Footprints',
      details: ['Regd Office: Kishanganj, Bihar, India', 'Branch Office: Pradhan Nagar, Siliguri, WB', 'Factory Module: Deramari, Kishanganj, Bihar']
    },
    {
      icon: FiMail,
      title: 'Trade Intake Node',
      details: ['info@indiatradeoverseas.com']
    },
    {
      icon: FiClock,
      title: 'Clearing Window',
      details: ['Mon to Sat: 9:30 AM - 6:30 PM IST']
    }
  ];

  return (
    <div className="bg-[#0E1116] text-[#C5CBD3] antialiased min-h-screen selection:bg-[#6D7886]/30 selection:text-white font-sans overflow-x-hidden">
      {/* Structural Double-Line Top Border Accent */}
      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full"></div>

      {/* Page Hero Template Layer */}
      <section className="relative w-full py-20 lg:py-28 px-6 sm:px-12 lg:px-16 overflow-hidden bg-[#040A12] border-b border-[#C5CBD3]/10 flex items-center justify-center">

        {/* Cinematic Graphic Background Framework Container */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-40 group">
          <img
            src="/images/ito_images/ito_15.jpeg" // Sourced operational/port-map asset path
            alt="India Trade Overseas Commercial Office Gateway"
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-[10s] ease-out group-hover:scale-100"
            style={{ filter: 'brightness(1.3) contrast(1.20) saturate(0.55)' }}
          />
          {/* Multi-directional vignette protect gradient layers to isolate typography depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#040A12]/20 via-transparent to-[#040A12]/10 z-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/20 via-[#040A12]/10 to-[#040A12]/5 z-1" />
          <div className="absolute inset-0 box-shadow-[inset_0_0_120px_rgba(0,0,0,0.65)] z-1" />
        </div>

        {/* Hero Typography Metadata Stack with Dynamic Top-Padding Buffer against Navbar Overlap */}
        <div className="max-w-[1480px] mx-auto relative z-10 text-center space-y-5 pt-32 sm:pt-40 lg:pt-[160px] pb-6">

          {/* Context Eyebrow Text */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-[#aeb4be] text-[10px] sm:text-[11px] font-medium tracking-[4px] uppercase block font-sans drop-shadow-[0_2px_4px_rgba(4,10,18,0.4)]"
          >
            SECURE INTAKE DESK
          </motion.span>

          {/* High-Contrast Popping Editorial Serif Title */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-[62px] font-serif tracking-tight font-normal uppercase leading-[1.1] max-w-4xl mx-auto text-transparent bg-clip-text bg-gradient-to-b from-[#F2F4F7] via-[#F2F4F7] to-[#C5CBD3] filter drop-shadow-[0_4px_12px_rgba(4,10,18,0.7)]"
          >
            Contact Commercial Office
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-16 h-[1px] bg-[#C5CBD3]/40 mx-auto border-b"
            aria-hidden="true"
          />

          {/* Crisp Supporting Context Copy */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="font-sans font-light text-[#C5CBD3] text-sm sm:text-[16px] max-w-2xl mx-auto leading-[1.65] opacity-95 drop-shadow-[0_2px_8px_rgba(4,10,18,0.6)]"
          >
            Invite buyers, suppliers and logistics partners to submit specific commercial requirements.
          </motion.p>

        </div>
      </section>

      {/* Core Layout Grid System */}
      <div className="max-w-[1480px] mx-auto px-6 sm:px-12 lg:px-16 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">

          {/* Left Column Layout: Info Blocks and Map Canvas */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-6 w-full">
              {contactInfo.map((info, idx) => (
                <div key={idx} className="bg-[#121D29]/58 border border-[#C5CBD3]/24 shadow-sm rounded-[4px] p-5 flex items-center space-x-4">
                  <div className="p-3 bg-[#0E1116] border border-[#C5CBD3]/24 text-[#F2F4F7] rounded-[2px] shrink-0">
                    <info.icon size={16} />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h3 className="font-serif text-sm font-medium text-[#F2F4F7] mb-1.5">{info.title}</h3>
                    {info.details.map((line, i) => (
                      <p key={i} className="text-[#C5CBD3] text-xs font-sans font-light truncate">{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Map Block Layer */}
            <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 rounded-[4px] shadow-sm p-4 space-y-4 w-full">
              <div className="flex items-center gap-2 text-[#F2F4F7] border-b border-[#C5CBD3]/10 pb-3">
                <FiBookmark size={14} className="text-[#6D7886]" />
                <h3 className="font-serif text-xs font-medium uppercase tracking-wider">Fulfillment Mapping</h3>
              </div>
              <div className="h-48 w-full bg-[#0E1116] rounded-[2px] overflow-hidden border border-[#C5CBD3]/20 relative">
                <iframe
                  title="India Trade Overseas Operational Logistics Map Node"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3570.3664797042576!2d87.9405623!3d26.4447472!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDI2JzQxLjEiTiA4N8KwNTYnMjYuMCJF!5e0!3m2!1sen!2sin!4v1680000000000"
                  className="w-full h-full border-0 invert-[0.92] hue-rotate-180 brightness-90 contrast-125 grayscale"
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>

          {/* Right Column Layout: Commercial Intake Form Component */}
          <div className="lg:col-span-7">
            <div className="bg-[#121D29]/58 border border-[#C5CBD3]/24 shadow-sm rounded-[4px] p-6 sm:p-8 text-left h-full flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-serif text-[#F2F4F7] font-medium tracking-wide uppercase mb-6 border-b border-[#C5CBD3]/10 pb-3">
                  Commercial Enquiry Form
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5 font-sans text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">Full Corporate Identity *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="Buyer / Supplier Company Name"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">Corporate Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="partner@enterprise.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">Direct Mobile Line</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="Country Code + Phone Number"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">Procurement Target Subject *</label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 h-[46px] bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] placeholder-[#6D7886]"
                        placeholder="Product type or allocation title"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#F2F4F7] uppercase tracking-wider mb-1.5">Commercial Specifications Bundle *</label>
                    <textarea
                      rows={5}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full p-4 bg-[#0E1116] border border-[#C5CBD3]/24 rounded-[2px] outline-none focus:border-[#F2F4F7] text-[#F2F4F7] resize-none placeholder-[#6D7886] font-sans leading-relaxed"
                      placeholder="Outline required volumes, target processing grade, structural scheduling parameters or specified ports of final discharge (Minimum 30 characters)..."
                    ></textarea>
                  </div>

                  {/* Consent Checkbox Mandate */}
                  <div className="flex items-start space-x-2.5 pt-1">
                    <input
                      type="checkbox"
                      required
                      id="data-processing-consent"
                      className="mt-0.5 rounded-[1px] bg-[#0E1116] border-[#C5CBD3]/30 accent-[#2B3440] cursor-pointer"
                    />
                    <label htmlFor="data-processing-consent" className="text-[#6D7886] text-[11px] font-light leading-snug cursor-pointer select-none">
                      I authorize India Trade Overseas to verify and process the commercial inquiry metrics enclosed inside this data package.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-[52px] bg-[#2B3440] hover:bg-[#0E1116] border border-[#C5CBD3]/42 hover:border-[#F2F4F7] text-[#F2F4F7] font-sans font-bold text-xs uppercase tracking-widest rounded-[2px] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <FiSend /> <span>Dispatch Inquiry Dossier</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Shared Corporate Handoff Footer Seal Layout */}
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