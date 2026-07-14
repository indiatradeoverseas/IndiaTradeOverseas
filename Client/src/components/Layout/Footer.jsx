import React from 'react';
import { Link } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiLinkedin, FiInstagram, FiCopy, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  const currentPath = location.pathname;

  // 1. Determine active colour scheme token object
  let theme = {
    bg: 'bg-[#08121D]',
    text: 'text-white',
    border: 'border-[#6D7886]/10',
    doubleBorder: '#C5CBD3',
    accentText: '#C5CBD3',
    subtleAccent: '#6D7886'
  };

  if (currentPath === '/prakriti') {
    theme = {
      bg: 'bg-[#0B3D2E]',
      text: 'text-white',
      border: 'border-[#004B3B]/30',
      doubleBorder: '#50C878',
      accentText: '#50C878',
      subtleAccent: '#50C878'
    };
  } else if (currentPath === '/prakriti/rice') {
    theme = {
      bg: 'bg-[#5A4422]', // Rich Earth
      text: 'text-[#FFF9EC]', // Ivory White
      border: 'border-[#A67C2D]/30', // Harvest Gold
      doubleBorder: '#D9B85C', // Golden Wheat
      accentText: '#F2E3B4', // Cream Beige
      subtleAccent: '#D9B85C' // Golden Wheat
    };
  }

  const officialEmail = "info.indiatradeoverseas@gmail.com";
  const officialPhone = "+91 8250614079";
  const registeredOfficeText = "Deramari, Kishanganj, Bihar - 855107, India";

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to Clipboard'))
      .catch(() => toast.error('Clipboard access disabled'));
  };

  return (
    <footer className={`w-full py-6 px-4 transition-colors duration-300 font-serif ${theme.bg} ${theme.text} border-t ${theme.border}`}>
      
      {/* Structural Double Line Border Accent */}
      <div 
        className="border-t-[3px] border-double w-full opacity-30 mb-8" 
        style={{ borderColor: theme.doubleBorder }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 text-left">

          {/* Column 1: Brand Authority, Mottos, and Statutory Registration Data */}
          <div className="md:col-span-4 space-y-4">
            <div>
              <h3 className="text-xl text-white tracking-wide font-normal uppercase">
                India Trade Overseas
              </h3>
              <div className="w-12 h-[1px] mt-2" style={{ backgroundColor: theme.doubleBorder }} />
            </div>

            <p className="font-serif italic text-xs tracking-wide" style={{ color: theme.accentText }}>
              "Where Quality Meets Global Demand."
            </p>

            {/* Corporate Registration Registry Token Feed */}
            

            {/* Social Channels with Guarded Link Tracking */}
            <div className="flex space-x-4 pt-1">
              <a href="#" className="hover:text-white transition-colors" style={{ color: theme.subtleAccent }}><FiFacebook size={18} /></a>
              <a href="#" className="hover:text-white transition-colors" style={{ color: theme.subtleAccent }}><FiTwitter size={18} /></a>
              <a href="https://linkedin.com/in/india-trade-overseas-64012234b?original_referer=https%3A%2F%2Fwww%2Egoogle%2Ecom%2F&originalSubdomain=in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" style={{ color: theme.subtleAccent }}><FiLinkedin size={18} /></a>
              <a href="https://www.instagram.com/indiatradeoverseas?igsh=MmVkZjg0cXVhazN1" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" style={{ color: theme.subtleAccent }}><FiInstagram size={18} /></a>
            </div>
          </div>

          {/* Column 2: Architecture Navigation Links */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2.5 text-xs font-sans font-light" style={{ color: theme.accentText }}>
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
            <ul className="space-y-2.5 text-xs font-sans font-light" style={{ color: theme.accentText }}>
              <li><Link to="/products" className="hover:text-white transition-colors">Trade &amp; Export</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Food &amp; Agriculture</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Coal &amp; Industrial Materials</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Stone &amp; Construction Supply</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">ITO Transport &amp; Logistics</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">Clay &amp; Consumer Products</Link></li>
            </ul>
          </div>

          {/* Column 4: Document Contact Info Layer with Action Triggers */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-white">Contact Info</h4>
            <div className="space-y-3 font-sans text-xs font-light leading-relaxed" style={{ color: theme.accentText }}>

              <div className="space-y-1">
                <div className="font-bold uppercase tracking-wider text-[9px] opacity-60">Registered Office Address:</div>
                <p className="text-[11px] font-serif leading-normal text-white/90">
                  {registeredOfficeText}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between group">
                  <a href={`mailto:${officialEmail}`} className="hover:text-white transition-colors block text-xs tracking-wide truncate max-w-[90%]">
                    Email: <span className="font-medium text-white/90 underline">{officialEmail}</span>
                  </a>
                  
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Brand Dictated Verification Notice Bar */}
        <div className="border-t mt-8 pt-8 text-center border-white/10">
          <p className="text-[10px] font-sans font-light max-w-3xl mx-auto leading-relaxed tracking-wider" style={{ color: theme.accentText }}>
            Every appointment, price, margin, scheme, target, product specification, and territory protection right must be confirmed explicitly through authorized written company communication loops.
          </p>
          <p className="text-[10px] tracking-wider uppercase font-mono font-light mt-3" style={{ color: theme.subtleAccent }}>
            &copy; 2026 India Trade Overseas. All rights reserved. Protected Environment Terminal.
          </p>
        </div>
      </div>
    </footer>
  );
}