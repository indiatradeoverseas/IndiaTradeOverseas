import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { leadsApi } from '../../api/leads';
import { FiSend, FiCheckCircle } from 'react-icons/fi';
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
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await leadsApi.createLead(formData);
      if (response.success) {
        setSubmitted(true);
        toast.success('Quote request submitted successfully! Our team will contact you soon.');
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
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex items-center justify-center">
        <div className="bg-white p-8 border border-gray-100 rounded-2xl shadow-xl text-center max-w-md w-full transform transition-all duration-300 scale-100">
          <div className="inline-flex p-4 bg-emerald-50 rounded-full mb-5 text-emerald-600 animate-bounce">
            <FiCheckCircle size={44} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
            Thank you for your interest. Our team will contact you within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Request a Quote
        </h1>
        <p className="text-base sm:text-lg text-gray-500 mt-3 max-w-xl mx-auto">
          Fill out the form below and our team will get back to you with the best competitive price.
        </p>
      </div>


      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 sm:p-10">
        <form onSubmit={handleSubmit} className="space-y-6">


          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-150 ease-in-out text-sm"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-150 ease-in-out text-sm"
                placeholder="Enter your company name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-rose-500">*</span></label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-150 ease-in-out text-sm"
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-rose-500">*</span></label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-150 ease-in-out text-sm"
                placeholder="Enter your email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Category <span className="text-rose-500">*</span></label>
              <select
                required
                value={formData.productCategory}
                onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-150 ease-in-out text-sm bg-white"
              >
                <option value="">Select a category</option>
                <option value="STONE">Natural Stone</option>
                <option value="WHITE_STONE">White Stone</option>
                <option value="TEA">Tea Premium</option>
                <option value="RICE">Premium Rice</option>
                <option value="FRUIT">Fresh Fruits</option>
                <option value="VEGETABLE">Fresh Vegetable</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
              <input
                type="text"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-150 ease-in-out text-sm"
                placeholder="e.g., 100 tons, 5000 kg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination Port/City</label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-150 ease-in-out text-sm"
              placeholder="Enter destination port or city"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Requirements</label>
            <textarea
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition duration-150 ease-in-out text-sm resize-none"
              placeholder="Tell us more about your requirements, specifications, or any special requests..."
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <FiSend size={18} className="transform -rotate-12 transition-transform group-hover:translate-x-1" />
                <span>Submit Quote Request</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}