import React, { useState } from 'react';
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    
    setTimeout(() => {
      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setSubmitting(false);
    }, 1000);
  };

  const contactInfo = [
    {
      icon: FiMapPin,
      title: 'Visit Us',
      details: [
        'Vill-Deramari, Tola-Maujabari, panch-Deramari, Block-Khochadham',
        'dist - kishanganj, Near imambada pani bagh, Kishanganj, Bihar - 855107'
      ]
    },
    { icon: FiPhone, title: 'Call Us', details: ['+91 8250614079'] },
    { icon: FiMail, title: 'Email Us', details: ['indiatradeoverseas@gmail.com'] },
    { icon: FiClock, title: 'Working Hours', details: ['Mon-Fri: 9:00 AM - 6:00 PM', 'Sat: 10:00 AM - 2:00 PM'] }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Contact Us
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            Get in touch with our team for any inquiries
          </p>
          <div className="w-20 h-1 bg-primary-600 mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          <div className="lg:col-span-1 space-y-5 sm:space-y-6">
            {contactInfo.map((info, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 sm:p-6 group">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="p-2.5 sm:p-3 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors duration-300">
                    <info.icon className="text-primary-600" size={22} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1.5 sm:mb-2 text-base sm:text-lg">
                      {info.title}
                    </h3>
                    {info.details.map((detail, i) => (
                      <p key={i} className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                        {detail}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 sm:p-6 pb-2 sm:pb-3">
                <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Find Us</h3>
              </div>
              <div className="h-56 sm:h-64 w-full bg-gray-100">
                <iframe
                  title="India Trade Overseas Location"
                  src="https://maps.google.com/maps?q=26.1800553,87.9105314&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full border-0"
                  allowFullScreen=""
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>

          
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-5 sm:mb-6 lg:mb-8">
                Send us a Message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                      placeholder="Enter Your Name "
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                      placeholder="Enter Your Email Address "
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                      placeholder="Enter Your Phone Number "
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                      placeholder="what's your quiry / App ki kaise help kare "
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm sm:text-base resize-y"
                    placeholder="Type your message here"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 sm:py-3.5 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-2 text-sm sm:text-base shadow-md hover:shadow-lg"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <FiSend size={18} />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
