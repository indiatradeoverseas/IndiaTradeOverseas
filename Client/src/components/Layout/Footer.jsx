import React from 'react';
import { Link } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiLinkedin, FiInstagram, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  const isPrakritiPage = location.pathname === '/prakriti';
  const footerContactText = `Phone: +91 82506 14079\nEmail: info@indiatradeoverseas.com`;
  const registeredOfficeText = `Vill-Deramari, Tola-Maujabari, panch-Deramari, Block-Khochadham, dist - kishanganj, Near imambada pani bagh, Kishanganj, Bihar - 855107`;

  const copyToClipboard = (text, typeLabel) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to Clipboard'))
      .catch(() => toast.error('Clipboard access disabled'));
  };

  return (
    <footer
      className={`w-full py-6 px-4 transition-colors duration-300 ${isPrakritiPage
          ? 'bg-[#0B3D2E] text-white border-t border-[#50C878]/20'
          : 'bg-[#0C1F3F] text-white border-t border-[#8FAADC]/10'
        }`}
    >

      {/* Structural Double Gold Line Border Accent */}
      <div className="border-t-[3px] border-double border-[#8FAADC] w-full opacity-30"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">

          {/* Column 1: Brand Authority and Mottos */}
          <div className="md:col-span-4 space-y-2">
            <h3 className="text-xl font-serif text-white tracking-wide font-normal">
              India Trade Overseas
            </h3>
            <div className="w-12 h-[1px] bg-[#2F5DA8]"></div>

            <p className="text-[#8FAADC] font-serif italic text-xs tracking-wide">
              "Where Quality Meets Global Demand."
            </p>

            {/* Social Channels with Guarded Link Tracking */}
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-[#8FAADC] hover:text-[#2F5DA8] transition-colors"><FiFacebook size={18} /></a>
              <a href="#" className="text-[#8FAADC] hover:text-[#2F5DA8] transition-colors"><FiTwitter size={18} /></a>
              <a href="https://linkedin.com/in/india-trade-overseas-64012234b?original_referer=https%3A%2F%2Fwww%2Egoogle%2Ecom%2F&originalSubdomain=in" target="_blank" rel="noopener noreferrer" className="text-[#8FAADC] hover:text-[#2F5DA8] transition-colors"><FiLinkedin size={18} /></a>
              <a href="https://www.instagram.com/indiatradeoverseas?igsh=MmVkZjg0cXVhazN1" target="_blank" rel="noopener noreferrer" className="text-[#8FAADC] hover:text-[#2F5DA8] transition-colors"><FiInstagram size={18} /></a>
            </div>
          </div>

          {/* Column 2: Architecture Navigation Links */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2.5 text-xs text-[#8FAADC] font-light">
              <li><Link to="/" className="hover:text-white transition-colors cursor-pointer">Home</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors cursor-pointer">Products</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors cursor-pointer">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors cursor-pointer">Contact</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors cursor-pointer">Careers</Link></li>
              <li><Link to="/quote-request" className="hover:text-white transition-colors cursor-pointer">Get Quote</Link></li>
            </ul>
          </div>

          {/* Column 3: Brand Mandatory Business Verticals */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white">Business Verticals</h4>
            <ul className="space-y-2.5 text-xs text-[#8FAADC] font-light">
              <li><Link to="/products" className="hover:text-white transition-colors">Trade &amp; Export</Link></li>
              <li><Link join="/products" className="hover:text-white transition-colors">Food &amp; Agriculture</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Coal &amp; Industrial Materials</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Stone &amp; Construction Supply</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">ITO Transport &amp; Logistics</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Clay &amp; Consumer Products</Link></li>
            </ul>
          </div>

          {/* Column 4: Document Contact Info Layer with Action Triggers */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white">Contact Info</h4>
            <div className="space-y-3 font-sans text-xs text-[#8FAADC] font-light leading-relaxed">

              <div className={`w-full py-12 px-4 transition-colors duration-300 ${isPrakritiPage
                  ? 'bg-[#0B3D2E] text-white border-t border-[#50C878]/20'
                  : 'bg-[#0C1F3F] text-white border-t border-white/10'
                }`}>
                <p className="pr-6 text-[11px]">
                  {registeredOfficeText}
                </p>
              </div>

              <div className="space-y-1.5 pt-1 relative group">
                <div className="flex items-center justify-between">
                  <a href="mailto:info@indiatradeoverseas.com" className="hover:text-white transition-colors block text-xs tracking-wide">
                    Email: <span className="font-medium text-slate-300">info@indiatradeoverseas.com</span>
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Brand Dictated Verification Notice Bar */}
        <div className="border-t border-[#8FAADC]/10 mt-8 pt-8 text-center ">
          <p className="text-[10px] text-[#8FAADC] font-light max-w-2xl mx-auto leading-relaxed tracking-wider">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </p>
          <p className="text-[10px] tracking-wider text-[#8FAADC]/60 uppercase font-mono font-light mt-2">
            &copy; {new Date().getFullYear()} India Trade Overseas. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}