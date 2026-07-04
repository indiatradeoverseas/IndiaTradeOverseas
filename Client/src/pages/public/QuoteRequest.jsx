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
          style: { borderRadius: '4px', background: '#0B2D5B', color: '#FBF7EF', border: '1px solid #C99B38', fontSize: '12px' }
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
        style: { borderRadius: '4px', background: '#0B2D5B', color: '#FBF7EF', border: '1px solid #ef4444', fontSize: '12px' }
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center justify-center bg-[#FBF7EF] min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#FBF7EF] p-8 border border-[#C99B38]/30 rounded shadow-xl text-center max-w-sm w-full relative"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C99B38] via-[#E2C275] to-[#C99B38] rounded-t" />
          <div className="inline-flex p-3 bg-[#0B2D5B]/5 rounded-full mb-4 text-[#C99B38]">
            <FiCheckCircle size={36} />
          </div>
          <h2 className="text-xl font-serif font-medium text-[#0B2D5B] tracking-wide mb-1.5 uppercase">Request Transmitted</h2>
          <p className="text-slate-500 text-xs leading-relaxed font-light">
            Thank you for your interest. Our logistics compliance team will evaluate your dossier parameters within 24 hours.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBF7EF] min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased relative overflow-hidden">
      
      {/* Background Decor - Ambient gallery blurs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C99B38]/5 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#0B2D5B]/5 rounded-full filter blur-3xl" />
      </div>

      <div className="border-t-[3px] border-double border-[#C99B38] w-full max-w-4xl mx-auto mb-8" />

      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* Header Block */}
        <div className="text-center mb-8 space-y-2">
          <div className="flex justify-center mb-2">
            <div className="h-9 w-9 bg-[#0B2D5B] rounded-sm border border-[#C99B38]/20 flex items-center justify-center shadow-xs">
              <FiAnchor className="h-4 w-4 text-[#C99B38]" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-[#0B2D5B] tracking-wide uppercase">
            FOB / CIF Pricing Request
          </h1>
          <p className="text-xs text-[#C99B38] tracking-widest uppercase font-medium max-w-xl mx-auto">
            India Trade Overseas Commercial Intake
          </p>
        </div>

        {/* Form Container */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#F5EEDF] shadow-md rounded-sm p-6 sm:p-8 relative"
        >
          {/* Subtle Top Accent Ribbon */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C99B38] via-[#E2C275] to-[#C99B38] rounded-t-sm" />
          <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.99] pointer-events-none" />

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Row 1: Name and Company */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0B2D5B]/70 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="block w-full border border-[#0B2D5B]/15 rounded bg-[#FAF9F5]/40 px-3 py-2 text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] focus:bg-white transition-all"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0B2D5B]/70 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="block w-full border border-[#0B2D5B]/15 rounded bg-[#FAF9F5]/40 px-3 py-2 text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] focus:bg-white transition-all"
                  placeholder="Enter registered entity name"
                />
              </div>
            </div>

            {/* Row 2: Phone and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0B2D5B]/70 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full border border-[#0B2D5B]/15 rounded bg-[#FAF9F5]/40 px-3 py-2 text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] focus:bg-white transition-all"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0B2D5B]/70 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full border border-[#0B2D5B]/15 rounded bg-[#FAF9F5]/40 px-3 py-2 text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] focus:bg-white transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Row 3: Product Category and Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0B2D5B]/70 mb-1">
                  Product Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.productCategory}
                  onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                  className="block w-full border border-[#0B2D5B]/15 rounded bg-[#FAF9F5]/40 px-3 py-2 text-xs text-[#0B2D5B] focus:outline-none focus:border-[#C99B38] focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select commodity classification</option>
                  <option value="STONE">Natural Stone</option>
                  <option value="WHITE_STONE">White Stone</option>
                  <option value="TEA">Tea Premium</option>
                  <option value="RICE">Rice Portfolio</option>
                  <option value="FRUIT">Fresh Fruits</option>
                  <option value="VEGETABLE">Fresh Vegetables</option>
                  <option value="COAL">Industrial Coal</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0B2D5B]/70 mb-1">
                  Target Quantity
                </label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="block w-full border border-[#0B2D5B]/15 rounded bg-[#FAF9F5]/40 px-3 py-2 text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] focus:bg-white transition-all"
                  placeholder="e.g., 500 MT, 20 Containers"
                />
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0B2D5B]/70 mb-1">
                Destination Port or Discharge City
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="block w-full border border-[#0B2D5B]/15 rounded bg-[#FAF9F5]/40 px-3 py-2 text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] focus:bg-white transition-all"
                placeholder="Specify target discharge port or final terminal city location"
              />
            </div>

            {/* Message/Requirements */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#0B2D5B]/70 mb-1">
                Additional Requirements & Grading Parameters
              </label>
              <textarea
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="block w-full border border-[#0B2D5B]/15 rounded bg-[#FAF9F5]/40 px-3 py-2 text-xs text-[#0B2D5B] placeholder-[#0B2D5B]/30 focus:outline-none focus:border-[#C99B38] focus:bg-white transition-all resize-none"
                placeholder="Specify dimensions, size parameters, chemical tracking metrics, or shipping line rules..."
              />
            </div>

            {/* Submit Trigger */}
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ y: -0.5 }}
              whileTap={{ y: 0 }}
              className="w-full flex items-center justify-center space-x-2 bg-[#0B2D5B] text-[#FBF7EF] text-xs font-medium tracking-wider py-3 rounded border border-transparent hover:border-[#C99B38]/30 disabled:opacity-50 disabled:pointer-events-none transition-all uppercase mt-2 shadow-sm cursor-pointer"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#FBF7EF] border-t-transparent"></div>
              ) : (
                <>
                  <FiSend size={13} className="text-[#C99B38]" />
                  <span>Transmit Official Quote Request</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}