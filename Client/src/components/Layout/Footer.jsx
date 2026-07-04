import React from 'react';
import { Link } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiLinkedin, FiInstagram, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Footer() {
  // Mandated Copy Context Blocks from the Directive
  const footerContactText = `Phone: +91 82506 14079\nEmail: info@indiatradeoverseas.com`;
  const registeredOfficeText = `Vill-Deramari, Tola-Maujabari, panch-Deramari, Block-Khochadham, dist - kishanganj, Near imambada pani bagh, Kishanganj, Bihar - 855107`;

  const copyToClipboard = (text, typeLabel) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to Clipboard'))
      .catch(() => toast.error('Clipboard access disabled'));
  };

  return (
    <footer className="bg-[#0B2D5B] text-slate-300 font-sans border-t-2 border-[#C99B38] relative overflow-hidden">

      {/* Structural Double Gold Line Border Accent */}
      <div className="border-t-[3px] border-double border-[#C99B38] w-full opacity-30"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">

          {/* Column 1: Brand Authority and Mottos */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-xl font-serif text-white tracking-wide font-normal">
              India Trade Overseas
            </h3>
            <div className="w-12 h-[1px] bg-[#C99B38]"></div>
            <p className="text-[#C99B38] text-xs uppercase tracking-widest font-semibold">
              Empowering Trade. Enabling Growth.
            </p>
            <p className="text-slate-400 font-serif italic text-xs tracking-wide">
              "Where Quality Meets Global Demand."
            </p>

            {/* Social Channels with Guarded Link Tracking */}
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-slate-400 hover:text-[#C99B38] transition-colors"><FiFacebook size={18} /></a>
              <a href="#" className="text-slate-400 hover:text-[#C99B38] transition-colors"><FiTwitter size={18} /></a>
              <a href="https://linkedin.com/in/india-trade-overseas-64012234b?original_referer=https%3A%2F%2Fwww%2Egoogle%2Ecom%2F&originalSubdomain=in" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#C99B38] transition-colors"><FiLinkedin size={18} /></a>
              <a href="https://www.instagram.com/indiatradeoverseas?igsh=MmVkZjg0cXVhazN1" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#C99B38] transition-colors"><FiInstagram size={18} /></a>
            </div>
          </div>

          {/* Column 2: Architecture Navigation Links */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-light">
              <li><Link to="/" className="hover:text-[#C99B38] transition-colors">Home</Link></li>
              <li><Link to="/products" className="hover:text-[#C99B38] transition-colors">Products</Link></li>
              <li><Link to="/about" className="hover:text-[#C99B38] transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-[#C99B38] transition-colors">Contact</Link></li>
              <li><Link to="/careers" className="hover:text-[#C99B38] transition-colors">Careers</Link></li>
              <li><Link to="/quote-request" className="hover:text-[#C99B38] transition-colors">Get Quote</Link></li>
            </ul>
          </div>

          {/* Column 3: Brand Mandatory Business Verticals */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white">Business Verticals</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-light">
              <li><Link to="/products" className="hover:text-[#C99B38] transition-colors">Trade &amp; Export</Link></li>
              <li><Link to="/products" className="hover:text-[#C99B38] transition-colors">Food &amp; Agriculture</Link></li>
              <li><Link to="/products" className="hover:text-[#C99B38] transition-colors">Coal &amp; Industrial Materials</Link></li>
              <li><Link to="/products" className="hover:text-[#C99B38] transition-colors">Stone &amp; Construction Supply</Link></li>
              <li><Link to="/products" className="hover:text-[#C99B38] transition-colors">ITO Transport &amp; Logistics</Link></li>
              <li><Link to="/products" className="hover:text-[#C99B38] transition-colors">Clay &amp; Consumer Products</Link></li>
            </ul>
          </div>

          {/* Column 4: Document Contact Info Layer with Action Triggers */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white">Contact Info</h4>
            <div className="space-y-3 font-sans text-xs text-slate-400 font-light leading-relaxed">

              <div className="relative group bg-[#102F60]/40 p-2.5 border border-slate-800 rounded-sm">
                <p className="pr-6 text-[11px]">
                  {registeredOfficeText}
                </p>
              </div>

              <div className="space-y-1.5 pt-1  relative group">
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
        <div className="border-t border-slate-800/80 mt-12 pt-8 text-center space-y-3">
          <p className="text-[10px] text-slate-500 font-light max-w-2xl mx-auto leading-relaxed">
            Rates, availability, product specifications, freight, GST, dispatch timelines and delivery commitments are subject to final commercial confirmation.
          </p>
          <p className="text-[10px] tracking-wider text-slate-600 uppercase font-mono font-light">
            &copy; {new Date().getFullYear()} India Trade Overseas. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
