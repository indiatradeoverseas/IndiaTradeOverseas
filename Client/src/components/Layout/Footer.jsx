import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiFacebook,
  FiTwitter,
  FiLinkedin,
  FiInstagram,
  FiChevronDown
} from 'react-icons/fi';

export default function Footer() {
  const location = useLocation();
  const currentPath = location.pathname;

  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const servicesRef = useRef(null);

  // Mirrors the "OUR SERVICES" dropdown in Navbar.jsx
  const servicesGroups = [
    {
      groupLabel: 'PRAKRITI DIVISION',
      links: [
        { to: '/prakriti', label: 'Tea Division' },
        { to: '/prakriti/rice', label: 'Rice Division' }
      ]
    },
    {
      groupLabel: 'BUILDING & CONSTRUCTION',
      links: [
        { to: '/stone', label: 'Stone Division' }
      ]
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        servicesRef.current &&
        !servicesRef.current.contains(event.target)
      ) {
        setIsServicesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Determine active colour scheme
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
      bg: 'bg-[#5A4422]',
      text: 'text-[#FFF9EC]',
      border: 'border-[#A67C2D]/30',
      doubleBorder: '#D9B85C',
      accentText: '#F2E3B4',
      subtleAccent: '#D9B85C'
    };
  } else if (currentPath === '/stone') {
    theme = {
      bg: 'bg-[#37424B]',
      text: 'text-[#F4F2EE]',
      border: 'border-[#A89E8E]/40',
      doubleBorder: '#C5A059',
      accentText: '#DCCCB4',
      subtleAccent: '#A89E8E'
    };
  }

  const officialEmail = 'info@indiatradeoverseas.com';
  const officialPhone = '01169262028';

  const registeredOfficeText =
    'Deramari, Kishanganj, Bihar - 855107, India';

  const closeServicesMenu = () => {
    setIsServicesOpen(false);
  };

  const openServicesMenu = () => {
    setIsServicesOpen(true);
  };

  return (
    <footer
      className={`w-full py-6 px-4 transition-colors duration-300 font-serif ${theme.bg} ${theme.text} border-t ${theme.border}`}
    >
      {/* Structural Double Line Border Accent */}
      <div
        className="border-t-[3px] border-double w-full opacity-40 mb-8"
        style={{ borderColor: theme.doubleBorder }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">

        {/* =========================================================
            MAIN FOOTER
            Desktop: 4 balanced columns
            Mobile: stacked sections
        ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-8 lg:gap-8 text-left">

          {/* =======================================================
              COLUMN 1 — BRAND
          ======================================================= */}
          <div className="md:col-span-3 space-y-4 pb-8 md:pb-0">
            <div>
              <h3 className="text-xl tracking-wide font-normal uppercase">
                India Trade Overseas
              </h3>

              <div
                className="w-12 h-[1px] mt-2"
                style={{ backgroundColor: theme.doubleBorder }}
              />
            </div>

            <p
              className="font-serif italic text-xs tracking-wide"
              style={{ color: theme.accentText }}
            >
              "Where Quality Meets Global Demand."
            </p>

            <div className="flex space-x-4 pt-1">
              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                className="hover:opacity-100 transition-opacity"
                style={{ color: theme.subtleAccent }}
              >
                <FiFacebook size={18} />
              </a>

              {/* Twitter */}
              <a
                href="#"
                aria-label="Twitter"
                className="hover:opacity-100 transition-opacity"
                style={{ color: theme.subtleAccent }}
              >
                <FiTwitter size={18} />
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com/in/india-trade-overseas-64012234b?original_referer=https%3A%2F%2Fwww%2Egoogle%2Ecom%2F&originalSubdomain=in"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="hover:opacity-100 transition-opacity"
                style={{ color: theme.subtleAccent }}
              >
                <FiLinkedin size={18} />
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/indiatradeoverseas?igsh=MmVkZjg0cXVhazN1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:opacity-100 transition-opacity"
                style={{ color: theme.subtleAccent }}
              >
                <FiInstagram size={18} />
              </a>
            </div>
          </div>

          {/* =======================================================
              COLUMN 2 — QUICK LINKS
          ======================================================= */}
          <div className="md:col-span-3 space-y-4 py-8 md:py-0 border-t border-white/10 md:border-t-0">
            <h4 className="text-xs uppercase tracking-widest font-semibold">
              Quick Links
            </h4>

            <ul
              className="space-y-2.5 text-xs font-sans font-light"
              style={{ color: theme.accentText }}
            >
              <li>
                <Link
                  to="/"
                  className="hover:underline transition-all cursor-pointer"
                >
                  Home
                </Link>
              </li>

              <li className="relative" ref={servicesRef}>
                <button
                  type="button"
                  onClick={() =>
                    setIsServicesOpen((prev) => !prev)
                  }
                  aria-expanded={isServicesOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-1 hover:underline transition-all cursor-pointer"
                  style={{ color: theme.accentText }}
                >
                  <span>Our Services</span>

                  <FiChevronDown
                    size={11}
                    className={`transition-transform duration-200 ${
                      isServicesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isServicesOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-52 bg-[#0E1116] border border-white/10 shadow-2xl py-2 z-50 rounded-[2px] text-left">
                    {servicesGroups.map((group, gIdx) => (
                      <div
                        key={group.groupLabel}
                        className={
                          gIdx > 0
                            ? 'border-t border-white/10 mt-2 pt-2'
                            : ''
                        }
                      >
                        <div className="px-3 py-1 text-[9px] font-mono font-bold tracking-widest text-white/40 uppercase">
                          {group.groupLabel}
                        </div>

                        {group.links.map((subLink) => (
                          <Link
                            key={subLink.to}
                            to={subLink.to}
                            onClick={closeServicesMenu}
                            className="block px-3 py-1.5 text-xs text-[#C5CBD3] hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                          >
                            {subLink.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </li>

              <li>
                <Link
                  to="/about"
                  className="hover:underline transition-all cursor-pointer"
                >
                  About Us
                </Link>
              </li>

              <li>
                <Link
                  to="/contact"
                  className="hover:underline transition-all cursor-pointer"
                >
                  Contact
                </Link>
              </li>

              <li>
                <Link
                  to="/careers"
                  className="hover:underline transition-all cursor-pointer"
                >
                  Careers
                </Link>
              </li>

              <li>
                <Link
                  to="/quote-request"
                  className="hover:underline transition-all cursor-pointer"
                >
                  Get Quote
                </Link>
              </li>
            </ul>
          </div>

          {/* =======================================================
              COLUMN 3 — BUSINESS VERTICALS
          ======================================================= */}
          <div className="md:col-span-3 space-y-4 py-8 md:py-0 border-t border-white/10 md:border-t-0">
            <h4 className="text-xs uppercase tracking-widest font-semibold">
              Business Verticals
            </h4>

            <ul
              className="space-y-2.5 text-xs font-sans font-light"
              style={{ color: theme.accentText }}
            >
              <li>
                <button
                  type="button"
                  onClick={openServicesMenu}
                  className="hover:underline transition-all text-left"
                  style={{ color: theme.accentText }}
                >
                  Trade &amp; Export
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={openServicesMenu}
                  className="hover:underline transition-all text-left"
                  style={{ color: theme.accentText }}
                >
                  Food &amp; Agriculture
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={openServicesMenu}
                  className="hover:underline transition-all text-left"
                  style={{ color: theme.accentText }}
                >
                  Coal &amp; Industrial Materials
                </button>
              </li>

              <li>
                <Link
                  to="/stone"
                  className="hover:underline transition-all"
                >
                  Stone &amp; Construction Supply
                </Link>
              </li>

              <li>
                <button
                  type="button"
                  onClick={openServicesMenu}
                  className="hover:underline transition-all text-left"
                  style={{ color: theme.accentText }}
                >
                  Transport &amp; Logistics
                </button>
              </li>
            </ul>
          </div>

          {/* =======================================================
              COLUMN 4 — CONTACT INFO
          ======================================================= */}
          <div className="md:col-span-3 space-y-4 py-8 md:py-0 border-t border-white/10 md:border-t-0">
            <h4 className="text-xs uppercase tracking-widest font-semibold">
              Contact
            </h4>

            <div
              className="space-y-3 font-sans text-xs font-light leading-relaxed"
              style={{ color: theme.accentText }}
            >
              {/* Registered Office */}
              <div className="space-y-1">
                <div className="font-bold uppercase tracking-wider text-[9px] opacity-70">
                  Address
                </div>

                <p className="text-[11px] font-serif leading-normal opacity-90">
                  {registeredOfficeText}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <a
                  href={`mailto:${officialEmail}`}
                  className="hover:underline transition-all block text-xs tracking-wide break-all"
                >
                  Email:{' '}
                  <span className="font-medium underline">
                    {officialEmail}
                  </span>
                </a>

                {/* Phone */}
                <a
                  href={`tel:${officialPhone}`}
                  className="hover:underline transition-all block text-xs tracking-wide"
                >
                  Phone:{' '}
                  <span className="font-medium underline">
                    {officialPhone}
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            LEGAL SECTION
            Desktop: one horizontal row
            Mobile: clean vertical stack
        ========================================================= */}
        <div className="border-t border-white/10 mt-0 md:mt-10 pt-7 md:pt-6">

          <nav
            aria-label="Legal and Policies"
            className="
              flex
              flex-col
              items-start
              gap-3
              text-[10px]
              font-sans
              tracking-wide
              md:flex-row
              md:flex-wrap
              md:items-center
              md:justify-center
              md:gap-x-6
              md:gap-y-3
            "
            style={{ color: theme.accentText }}
          >
            <Link
              to="/privacy-policy"
              className="hover:underline transition-all"
            >
              Privacy Policy
            </Link>

            <span
              className="hidden md:inline opacity-30"
              aria-hidden="true"
            >
              •
            </span>

            <Link
              to="/terms"
              className="hover:underline transition-all"
            >
              Terms &amp; Conditions
            </Link>

            <span
              className="hidden md:inline opacity-30"
              aria-hidden="true"
            >
              •
            </span>

            <Link
              to="/fraud-payment-policy"
              className="hover:underline transition-all"
            >
              Fraud &amp; Payment Policy
            </Link>

            <span
              className="hidden md:inline opacity-30"
              aria-hidden="true"
            >
              •
            </span>

            <Link
              to="/disclaimer"
              className="hover:underline transition-all"
            >
              Disclaimer
            </Link>
          </nav>
        </div>

        {/* =========================================================
            COPYRIGHT
        ========================================================= */}
        <div className="border-t border-white/10 mt-6 pt-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">

            <p
              className="text-[10px] tracking-wider uppercase font-mono font-light"
              style={{ color: theme.subtleAccent }}
            >
              &copy; 2026 India Trade Overseas. All rights reserved.
            </p>

            <p
              className="text-[9px] font-sans tracking-wider opacity-60"
              style={{ color: theme.accentText }}
            >
              Trade &bull; Supply &bull; Logistics
            </p>

          </div>
        </div>
      </div>
    </footer>
  );
}