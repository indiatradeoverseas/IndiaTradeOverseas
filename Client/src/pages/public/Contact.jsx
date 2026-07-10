import React, { useState } from 'react';
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend, FiBookmark } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success('Dossier successfully processed by trade intake system.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setSubmitting(false);
    }, 1000);
  };

  const contactInfo = [
    { icon: FiMapPin, title: 'Corporate Footprints', details: ['Regd: Kishanganj, Bihar, India', 'Branch: Pradhan Nagar, Siliguri, WB', 'Factory: Deramari, Kishanganj, Bihar'] },
    { icon: FiMail, title: 'Trade Intake Node', details: ['info@indiatradeoverseas.com'] },
    { icon: FiClock, title: 'Clearing Window', details: ['Mon to Sat: 9:30 AM - 6:30 PM IST'] }
  ];

  return (
    <div className="bg-[#ffffff] text-[#0C1F3F] antialiased min-h-screen selection:bg-[#8FAADC]/30 selection:text-[#0C1F3F]">
      <div className="border-t-[3px] border-double border-[#8FAADC] w-full"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16 space-y-1">
          <span className="text-[#2F5DA8] font-bold tracking-[0.25em] text-xs uppercase block">Secure Intake Desk</span>
          <h1 className="text-4xl sm:text-5xl font-serif text-[#0C1F3F] font-bold tracking-wide uppercase">Contact Commercial Office</h1>
          <div className="w-16 h-[2px] bg-[#2F5DA8] mx-auto mt-2"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-6">
            {contactInfo.map((info, idx) => (
              <div key={idx} className="bg-[#ffffff] border border-[#8FAADC]/20 shadow-xs rounded-xl p-5 flex items-center space-x-4">
                <div className="p-3 bg-[#ffffff] border border-[#8FAADC]/20 text-[#2F5DA8] rounded-xl"><info.icon size={16} /></div>
                <div className="text-left min-w-0 flex-1">
                  <h3 className="font-serif text-sm font-bold text-[#0C1F3F] mb-1">{info.title}</h3>
                  {info.details.map((line, i) => <p key={i} className="text-[#8FAADC] text-xs font-sans font-light truncate">{line}</p>)}
                </div>
              </div>
            ))}

            <div className="bg-[#ffffff] border border-[#8FAADC]/20 rounded-xl shadow-xs p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#0C1F3F] border-b border-[#8FAADC]/10 pb-2"><FiBookmark size={13} className="text-[#2F5DA8]" /><h3 className="font-serif text-xs font-bold uppercase tracking-wider">Fulfillment Mapping</h3></div>
              <div className="h-48 w-full bg-[#ffffff] rounded-lg overflow-hidden border border-[#8FAADC]/20">
                <iframe title="ITO Map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3570.3664797042576!2d87.9405623!3d26.4447472!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDI2JzQxLjEiTiA4N8KwNTYnMjYuMCJF!5e0!3m2!1sen!2sin!4v1680000000000" className="w-full h-full border-0 grayscale"></iframe>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-[#ffffff] border border-[#8FAADC]/20 shadow-lg rounded-2xl p-6 sm:p-8 text-left">
              <h2 className="text-xl font-serif text-[#0C1F3F] font-bold tracking-wide uppercase mb-6 border-b border-[#8FAADC]/10 pb-3">Transmit Trade Dossier</h2>
              <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8FAADC] uppercase tracking-wider mb-1.5">Full Corporate Identity *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#8FAADC]/30 rounded-lg outline-none focus:border-[#2F5DA8] text-[#0C1F3F]" placeholder="e.g. Satyam Raj" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8FAADC] uppercase tracking-wider mb-1.5">Corporate Email Address *</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#8FAADC]/30 rounded-lg outline-none focus:border-[#2F5DA8] text-[#0C1F3F]" placeholder="partner@enterprise.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8FAADC] uppercase tracking-wider mb-1.5">Direct Mobile Line</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#8FAADC]/30 rounded-lg outline-none focus:border-[#2F5DA8] text-[#0C1F3F]" placeholder="+91 82506 14079" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8FAADC] uppercase tracking-wider mb-1.5">Procurement Target Subject *</label>
                    <input type="text" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#8FAADC]/30 rounded-lg outline-none focus:border-[#2F5DA8] text-[#0C1F3F]" placeholder="e.g. Export-Quality Tea Allocation" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8FAADC] uppercase tracking-wider mb-1.5">Commercial Specifications Bundle *</label>
                  <textarea rows={4} required value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#8FAADC]/30 rounded-lg outline-none focus:border-[#2F5DA8] text-[#0C1F3F] resize-none" placeholder="Outline volume requirements, custom packaging metrics or preferred discharge ports..."></textarea>
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-[#2F5DA8] hover:bg-[#0C1F3F] text-white font-mono font-bold text-xs uppercase tracking-widest py-3.5 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FiSend /> Dispatch Dossier Link</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-[#0C1F3F] text-[#8FAADC] py-12 px-4 border-t-2 border-[#2F5DA8] text-center font-sans">
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-white">India Trade Overseas <br /> Empowering Trade. Enabling Growth.</p>
          <p className="text-xs italic text-[#8FAADC] font-serif">"Where Quality Meets Global Demand."</p>
        </div>
      </footer>
    </div>
  );
}