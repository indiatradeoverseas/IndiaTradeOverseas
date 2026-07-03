import React, { useState } from 'react';
import { 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiClock, 
  FiSend, 
  FiCopy, 
  FiBookmark 
} from 'react-icons/fi';
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

  // Mandated Copy Context Blocks from the Directive
  const officeLocationsText = `Registered Office: Kishanganj, Bihar, India\nBranch Office: Pradhan Nagar, Siliguri, West Bengal, India\nFactory: Deramari, Kishanganj, Bihar, India`;
  const emailTargetText = `info@indiatradeoverseas.com`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Kept identical to your original form architecture logic to ensure zero breakage
    setTimeout(() => {
      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setSubmitting(false);
    }, 1000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to Clipboard'))
      .catch(() => toast.error('Clipboard access disabled'));
  };

  const contactInfo = [
    {
      icon: FiMapPin,
      title: 'Corporate Presence',
      details: [
        'Registered Office: Kishanganj, Bihar, India',
        'Branch Office: Pradhan Nagar, Siliguri, West Bengal',
        'Factory: Deramari, Kishanganj, Bihar, India'
      ],
      copyData: officeLocationsText
    },
    { 
      icon: FiMail, 
      title: 'Secure Electronic Mail', 
      details: ['info@indiatradeoverseas.com'], 
      copyData: emailTargetText 
    },
    { 
      icon: FiClock, 
      title: 'Business Hours', 
      details: ['Monday to Saturday 9:30 AM to 6:30 PM IST'], 
      copyData: 'Monday to Saturday 9:30 AM to 6:30 PM IST' 
    }
  ];

  return (
    <div className="bg-[#FBF7EF] text-slate-900 antialiased min-h-screen selection:bg-amber-100 selection:text-amber-900">
      
      {/* Structural Double Gold Line Top Border Accent */}
      <div className="border-t-[3px] border-double border-[#C99B38] w-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* Corporate Editorial Header */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-[#C99B38] font-medium tracking-[0.25em] text-xs uppercase block mb-3 font-sans">
            Commercial Intake Portal
          </span>
          <h1 className="text-4xl sm:text-5xl font-serif text-[#0B2D5B] tracking-tight font-normal mb-4">
            Contact Commercial Office
          </h1>
          <div className="w-24 h-[1px] bg-[#C99B38] mx-auto mb-4"></div>
          <p className="text-sm italic font-serif text-slate-500 max-w-2xl mx-auto px-4">
            "Where Quality Meets Global Demand."
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-start">
          
          {/* Left Column: Premium Information Blocks */}
          <div className="lg:col-span-5 space-y-6">
            {contactInfo.map((info, index) => (
              <div key={index} className="bg-white border border-[#F5EEDF] shadow-sm rounded-sm p-5 relative group">
                <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.98] pointer-events-none"></div>
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-[#FAF9F5] border border-amber-900/5 text-[#C99B38] rounded-sm shrink-0">
                    <info.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-serif text-base font-medium text-[#0B2D5B]">
                        {info.title}
                      </h3>
                    </div>
                    {info.details.map((detail, i) => (
                      <p key={i} className="text-slate-600 text-xs font-sans font-light leading-relaxed truncate">
                        {detail}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Map Frame Container */}
            <div className="bg-white border border-[#F5EEDF] rounded-sm shadow-sm overflow-hidden p-3">
              <div className="p-2 pb-3 flex items-center gap-2 text-[#0B2D5B]">
                <FiBookmark size={14} className="text-[#C99B38]" />
                <h3 className="font-serif text-sm font-medium">Regional Mapping</h3>
              </div>
              <div className="h-52 w-full bg-slate-50 border border-slate-100 rounded-sm overflow-hidden">
                <iframe
                  title="India Trade Overseas Location Mapping"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3570.3664797042576!2d87.9405623!3d26.4447472!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDI2JzQxLjEiTiA4N8KwNTYnMjYuMCJF!5e0!3m2!1sen!2sin!4v1680000000000"
                  className="w-full h-full border-0 grayscale-[20%] contrast-[110%]"
                  allowFullScreen=""
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Form Element */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-[#F5EEDF] shadow-md rounded-sm p-6 sm:p-8 relative">
              <div className="absolute inset-0 border border-[#C99B38]/5 scale-[0.985] pointer-events-none"></div>
              
              <h2 className="text-2xl font-serif text-[#0B2D5B] tracking-tight mb-8">
                Transmit Communication Dossier
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6 font-sans text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-mono uppercase tracking-wider text-slate-500 mb-2">
                      Full Name <span className="text-amber-700">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white focus:border-amber-600 outline-none transition-all rounded-sm text-slate-800"
                      placeholder="Enter full identity name"
                    />
                  </div>
                  <div>
                    <label className="block font-mono uppercase tracking-wider text-slate-500 mb-2">
                      Email Address <span className="text-amber-700">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white focus:border-amber-600 outline-none transition-all rounded-sm text-slate-800"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-mono uppercase tracking-wider text-slate-500 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white focus:border-amber-600 outline-none transition-all rounded-sm text-slate-800"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <label className="block font-mono uppercase tracking-wider text-slate-500 mb-2">
                      Subject / Procurement Core <span className="text-amber-700">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white focus:border-amber-600 outline-none transition-all rounded-sm text-slate-800"
                      placeholder="e.g., Bulk Industrial Coal Request"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono uppercase tracking-wider text-slate-500 mb-2">
                    Message Specification <span className="text-amber-700">*</span>
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 bg-[#FAF9F5]/30 focus:bg-white focus:border-amber-600 outline-none transition-all rounded-sm text-slate-800 resize-none"
                    placeholder="Outline your detailed commercial specifications or operational requirements..."
                  ></textarea>
                </div>

                {/* Mandated Corporate Large Action Target */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#0B2D5B] hover:bg-[#102F60] text-white font-mono text-xs uppercase tracking-widest py-3.5 px-6 rounded-sm shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <FiSend size={14} className="text-[#C99B38]" />
                      <span>Transmit Message Dossier</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      {/* Corporate Handoff Footer Notice Seal */}
      <footer className="bg-[#0B2D5B] text-slate-400 py-12 px-4 border-t-2 border-[#C99B38] text-center">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">
            India Trade Overseas &bull; Empowering Trade. Enabling Growth.
          </p>
          <div className="text-[10px] font-sans text-slate-400 font-light max-w-xl mx-auto border-t border-slate-700/50 pt-4 leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation[cite: 1670].
          </div>
        </div>
      </footer>

    </div>
  );
}