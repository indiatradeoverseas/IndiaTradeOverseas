import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { FiSend, FiCheckCircle, FiAnchor } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function QuoteRequest() {
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

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const productNameParam = searchParams.get('productName');

    if (categoryParam || productNameParam) {
      const categoryMapping = {
        stone: 'STONE',
        natural_stone: 'STONE',
        white_stone: 'WHITE_STONE',
        tea: 'TEA',
        rice: 'RICE',
        fruit: 'FRUIT',
        vegetable: 'VEGETABLE'
      };

      const mappedCategory = categoryMapping[categoryParam?.toLowerCase()] || '';

      setFormData(prev => ({
        ...prev,
        productCategory: mappedCategory || prev.productCategory,
        message: productNameParam 
          ? `I am interested in requesting a quote for "${productNameParam}". Please provide CIF/FOB pricing and availability details.`
          : prev.message
      }));
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await leadsApi.createLead(formData);
      if (response.success) {
        setSubmitted(true);
        toast.success('Quote request submitted successfully! Our team will contact you soon.', {
          style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #C5CBD3', fontSize: '12px' }
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
      }
    } catch (error) {
      console.error('Error submitting quote request:', error);
      toast.error('Failed to submit request. Please try again.', {
        style: { borderRadius: '4px', background: '#0E1116', color: '#F2F4F7', border: '1px solid #ef4444', fontSize: '12px' }
      });
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const popUpVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'linear', duration: 0.55 } }
  };

  if (submitted) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-20 flex items-center justify-center bg-[#040A12] min-h-[75vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0E1116]/90 backdrop-blur-md p-8 border border-[#C5CBD3]/20 rounded-sm text-center max-w-sm w-full relative shadow-2xl"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6D7886] via-[#C5CBD3] to-[#6D7886]" />
          <div className="inline-flex p-3 bg-[#040A12] border border-[#C5CBD3]/24 rounded-sm mb-4 text-[#F2F4F7]">
            <FiCheckCircle size={28} />
          </div>
          <h2 className="text-xl font-serif font-normal text-[#F2F4F7] tracking-wide mb-2 uppercase">Request Transmitted</h2>
          <p className="text-[#C5CBD3] text-xs leading-relaxed font-light opacity-90">
            Thank you for your interest. Our logistics compliance team will evaluate your dossier parameters within 24 hours.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-[#0E1116] min-h-screen pt-32 sm:pt-40 lg:pt-[150px] pb-20 px-6 sm:px-12 lg:px-16 font-sans antialiased relative overflow-hidden text-[#C5CBD3]">
      
      {/* Background Decor - Ambient cinematic asset mapping */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none opacity-50">
        <img 
          src="./images/ito_images/ito_10.jpeg" 
          alt="Cinematic background asset context" 
          className="w-full h-full object-cover filter brightness-[1] contrast-[1.15] saturate-[0.80]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040A12]/20 via-transparent to-[#040A12]/10" />
      </div>

      <div className="border-t-[3px] border-double border-[#C5CBD3]/20 w-full fixed top-0 left-0 z-50" />

      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* Header Block with Motion Text Pop Ups */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10 space-y-3"
        >
          <div className="flex justify-center">
            <div className="h-9 w-9 bg-[#0E1116] rounded-sm border border-[#C5CBD3]/30 flex items-center justify-center shadow-md">
              <FiAnchor className="h-4 w-4 text-[#F2F4F7]" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#F2F4F7] tracking-tight uppercase leading-none">
            FOB / CIF Pricing Request
          </h1>
          <div className="w-12 h-[1px] bg-[#C5CBD3]/30 mx-auto" aria-hidden="true" />
          <p className="text-[10px] text-[#6D7886] tracking-widest uppercase font-mono font-bold">
            India Trade Overseas Commercial Intake
          </p>
        </motion.div>

        {/* Form Container */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#121D29]/40 backdrop-blur-sm border border-[#C5CBD3]/20 shadow-2xl rounded-sm p-6 sm:p-8 relative"
        >
          {/* Subtle Top Accent Ribbon */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#6D7886] via-[#C5CBD3] to-[#6D7886] rounded-t-sm" />

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Row 1: Name and Company */}
            <motion.div 
              variants={containerVariants} initial="hidden" animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <motion.div variants={popUpVariants}>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
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
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  placeholder="Enter registered entity name"
                />
              </motion.div>
            </motion.div>

            {/* Row 2: Phone and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Row 3: Product Category and Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Product Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.productCategory}
                    onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                    className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/90 px-3.5 py-2.5 text-xs text-[#F2F4F7] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0E1116] text-[#6D7886]">Select commodity classification</option>
                    <option value="STONE" className="bg-[#0E1116] text-[#C5CBD3]">Natural Stone Blocks</option>
                    <option value="WHITE_STONE" className="bg-[#0E1116] text-[#C5CBD3]">White Stone Aggregates</option>
                    <option value="TEA" className="bg-[#0E1116] text-[#C5CBD3]">Tea Premium Blends</option>
                    <option value="RICE" className="bg-[#0E1116] text-[#C5CBD3]">Rice Portfolio Catalog</option>
                    <option value="FRUIT" className="bg-[#0E1116] text-[#C5CBD3]">Fresh Horticultural Fruits</option>
                    <option value="VEGETABLE" className="bg-[#0E1116] text-[#C5CBD3]">Fresh Local Vegetables</option>
                    <option value="COAL" className="bg-[#0E1116] text-[#C5CBD3]">Industrial Grade Coal</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#6D7886]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                  Target Quantity
                </label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                  placeholder="e.g., 500 MT, 20 Containers"
                />
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                Destination Port or Discharge City
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all"
                placeholder="Specify target discharge port or final terminal city location"
              />
            </div>

            {/* Message/Requirements */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6D7886] mb-1.5 font-mono">
                Additional Requirements &amp; Grading Parameters
              </label>
              <textarea
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="block w-full border border-[#C5CBD3]/20 rounded-sm bg-[#0E1116]/80 px-3.5 py-2.5 text-xs text-[#F2F4F7] placeholder-[#6D7886] focus:outline-none focus:border-[#C5CBD3]/50 focus:ring-1 focus:ring-[#C5CBD3]/20 transition-all resize-none custom-scrollbar"
                placeholder="Specify dimensions, size parameters, chemical tracking metrics, or shipping line rules..."
              />
            </div>

            {/* Consent Notice Parameter Block */}
            <div className="p-3.5 bg-[#040A12]/60 border border-[#C5CBD3]/10 text-[#b5bdc8] text-[11px] font-light leading-relaxed rounded-sm">
              <strong>Notice:</strong> Documented specifications must align with verifiable enterprise routing criteria before formal validation manifests within the logistics loop.
            </div>

            {/* Submit Trigger */}
            <motion.button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-2 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#0E1116] text-xs font-semibold tracking-widest py-3.5 rounded-sm disabled:opacity-50 disabled:pointer-events-none transition-all uppercase mt-2 shadow-md cursor-pointer"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0E1116] border-t-transparent"></div>
              ) : (
                <>
                  <FiSend size={13} className="text-[#0E1116]" />
                  <span>Request Quote</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* Shared Corporate Footer Panel Seal */}
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