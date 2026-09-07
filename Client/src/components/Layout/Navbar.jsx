import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { notificationsApi } from '../../api/notifications';
const CompanyLogo = '/images/web_trans_icon.jpeg';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiPackage,
  FiSettings,
  FiBell,
  FiChevronDown
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();

  const isAdmin =
    user?.role === 'ADMIN' ||
    user?.department === 'ADMIN' ||
    (user?.position && user.position.toLowerCase().includes('admin'));

  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const servicesRef = useRef(null);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;

      try {
        const response = await notificationsApi.getNotifications();

        if (response.success) {
          setUnreadCount(
            response.data.notifications.filter((n) => !n.isRead).length
          );
        }
      } catch (error) {
        console.error('Unable to load notification badge:', error);
      }
    };

    loadNotifications();
  }, [user]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsServicesDropdownOpen(false);
  }, [location]);

  useEffect(() => {
    if (!isServicesDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (
        servicesRef.current &&
        !servicesRef.current.contains(event.target)
      ) {
        setIsServicesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isServicesDropdownOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');

    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  // Main navigation
  const navLinks = [
    { to: '/', label: 'HOME' },
    { to: '/about', label: 'ABOUT US' },
    { to: '/careers', label: 'CAREERS' },
  ];

  // Services structure
  const servicesGroups = [
    {
      groupLabel: 'PRAKRITI',
      links: [
        { to: '/prakriti', label: 'Tea' },
        { to: '/prakriti/rice', label: 'Rice' },
        { to: null, label: 'Onion' }
      ]
    },
    {
      groupLabel: 'BUILDING, CONSTRUCTION AND MINERALS',
      links: [
        { to: '/stone', label: 'Stone' }
      ]
    },
    {
      groupLabel: 'INDIA TRADE CENTER',
      links: [
        { to: '/ito-ads', label: 'ITO ADS' }
      ]
    },
    {
      groupLabel: 'ADVERTISING & LEAD GEN',
      links: [
        { to: '/ito-ads', label: 'ITO ADS' },
      ]
    }
  ];

  const isActive = (path) => location.pathname === path;
  const isServicesActive = location.pathname.startsWith('/prakriti') || location.pathname === '/stone' || location.pathname === '/ito-ads';

  const [hoveredDivision, setHoveredDivision] = useState(null);
  const [expandedDivisions, setExpandedDivisions] = useState({});

  const mobileMenuContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.055,
        delayChildren: 0.05
      }
    },
    exit: {
      transition: {
        staggerChildren: 0.03,
        staggerDirection: -1
      }
    }
  };

  const mobileMenuItem = {
    hidden: {
      opacity: 0,
      y: -8,
      x: -6
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1]
      }
    },
    exit: {
      opacity: 0,
      x: -6,
      transition: {
        duration: 0.15,
        ease: 'easeIn'
      }
    }
  };

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/60 to-transparent transition-all duration-300">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* =====================================================
            MOBILE NAVIGATION BAR HEADER
        ===================================================== */}
        <div className="flex lg:hidden justify-between items-center h-[104px] w-full">
          <Link to="/" className="flex items-center space-x-3 group">
            {/* Logo Icon */}
            <div className="h-[48px] w-[48px] flex items-center justify-center shrink-0">
              <img
                src={CompanyLogo}
                alt="India Trade Overseas Logo"
                className="h-full w-full object-contain drop-shadow"
              />
            </div>

            {/* Glowing Vertical Line Divider */}
            <div className="h-[42px] w-[1px] bg-gradient-to-b from-amber-400/80 via-white/40 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>

            {/* Typography Stack */}
            <div className="flex flex-col justify-center text-left leading-none space-y-[2px]">
              <span className="font-serif font-black text-[20px] tracking-[0.14em] text-white uppercase whitespace-nowrap leading-none drop-shadow">
                INDIA
              </span>
              <span className="font-sans font-bold text-[8.5px] tracking-[0.24em] text-gray-200 uppercase whitespace-nowrap leading-none">
                TRADE OVERSEAS
              </span>
              <div className="w-full h-[1.5px] bg-gradient-to-r from-orange-500 via-amber-400 to-transparent my-[2px]"></div>
              <span className="font-sans font-semibold text-[6.5px] tracking-[0.22em] text-gray-400 uppercase whitespace-nowrap leading-none">
                WHERE QUALITY MEETS GLOBAL DEMAND
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-2 shrink-0">
            {user && (
              <Link
                to="/crm/notifications"
                className="relative text-[#C5CBD3] hover:text-[#F2F4F7] p-2 mr-1 transition-colors"
              >
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-mono font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#C5CBD3] hover:text-[#F2F4F7] focus:outline-none"
              aria-label="Toggle Navigation Menu"
              aria-expanded={isMobileMenuOpen}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isMobileMenuOpen ? 'close' : 'open'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="inline-flex"
                >
                  {isMobileMenuOpen ? <FiX size={26} /> : <FiMenu size={26} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* =====================================================
            DESKTOP NAVIGATION BAR HEADER
        ===================================================== */}
        <div className="hidden lg:flex justify-between items-center h-[104px]">
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center space-x-4 group">
              {/* Logo Icon */}
              <div className="h-[68px] w-[68px] flex items-center justify-center shrink-0">
                <img
                  src={CompanyLogo}
                  alt="India Trade Overseas Logo"
                  className="h-full w-full object-contain drop-shadow-md"
                />
              </div>

              {/* Vertical Divider with Gold/Orange Highlight Spot */}
              <div className="h-[54px] w-[1px] bg-gradient-to-b from-amber-400/90 via-white/50 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>

              {/* Exact Brand Typography from Image */}
              <div className="flex flex-col justify-center text-left leading-none space-y-[3px]">
                <span className="font-serif font-black text-[28px] xl:text-[30px] tracking-[0.12em] text-white uppercase whitespace-nowrap leading-none drop-shadow-md">
                  INDIA
                </span>
                <span className="font-sans font-bold text-[11px] xl:text-[12px] tracking-[0.26em] text-gray-200 uppercase whitespace-nowrap leading-none">
                  TRADE OVERSEAS
                </span>
                
                {/* Horizontal Accent Gradient Line */}
                <div className="w-[85%] h-[2px] bg-gradient-to-r from-orange-500 via-amber-400 to-transparent my-[2px]"></div>
                
                <span className="font-sans font-semibold text-[8px] xl:text-[8.5px] tracking-[0.26em] text-gray-400 uppercase whitespace-nowrap leading-none">
                  WHERE QUALITY MEETS GLOBAL DEMAND
                </span>
              </div>
            </Link>
          </div>

          {/* MAIN NAVIGATION */}
          <div className="flex items-center justify-end flex-1 min-w-0 space-x-5 xl:space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative text-[11px] xl:text-[12px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-medium font-sans transition-all duration-200 whitespace-nowrap outline-none drop-shadow-sm ${
                  isActive(link.to)
                    ? 'text-[#F2F4F7]'
                    : 'text-[#C5CBD3] hover:text-[#F2F4F7]'
                }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-[#F2F4F7]" />
                )}
              </Link>
            ))}

            {/* SERVICES DROPDOWN */}
            <div
              ref={servicesRef}
              className="relative py-2"
              onMouseEnter={() => setIsServicesDropdownOpen(true)}
              onMouseLeave={() => {
                setIsServicesDropdownOpen(false);
                setHoveredDivision(null);
              }}
            >
              <div className="flex items-center">
                <Link
                  to="/our-services"
                  className={`relative flex items-center text-[11px] xl:text-[12px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-medium font-sans transition-all duration-200 outline-none drop-shadow-sm ${
                    isServicesActive
                      ? 'text-[#F2F4F7]'
                      : 'text-[#C5CBD3] hover:text-[#F2F4F7]'
                  }`}
                  onClick={() => setIsServicesDropdownOpen(false)}
                >
                  <span>OUR SERVICES</span>
                  {isServicesActive && (
                    <span className="absolute bottom-[-12px] left-0 right-0 h-[2px] bg-[#F2F4F7]" />
                  )}
                </Link>

                <button
                  type="button"
                  aria-label="Open Our Services menu"
                  aria-expanded={isServicesDropdownOpen}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsServicesDropdownOpen((prev) => !prev);
                  }}
                  className={`ml-1 flex items-center justify-center text-[11px] xl:text-[12px] outline-none ${
                    isServicesActive
                      ? 'text-[#F2F4F7]'
                      : 'text-[#C5CBD3] hover:text-[#F2F4F7]'
                  }`}
                >
                  <FiChevronDown
                    size={12}
                    className={`transition-transform duration-300 ${
                      isServicesDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* MEGA MENU DESKTOP */}
              <AnimatePresence>
                {isServicesDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 mt-3 bg-[#0E1116]/95 border border-[#C5CBD3]/24 backdrop-blur-md shadow-2xl py-2 z-50 rounded-[2px]"
                  >
                    <div className="flex flex-col gap-1 px-2">
                      {servicesGroups.map((group, gIdx) => (
                        <div
                          key={group.groupLabel}
                          className="relative"
                          onMouseEnter={() => setHoveredDivision(gIdx)}
                          onMouseLeave={() => setHoveredDivision(null)}
                        >
                          <div className={`px-4 py-3 text-[9px] font-mono font-bold tracking-widest uppercase cursor-pointer transition-colors ${
                            hoveredDivision === gIdx
                              ? 'text-[#F2F4F7] bg-[#2B3440]/60'
                              : 'text-[#6D7886] hover:text-[#F2F4F7] hover:bg-[#2B3440]/30'
                          } rounded-[2px]`}>
                            {group.groupLabel}
                          </div>

                          {hoveredDivision === gIdx && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="absolute left-full top-0 ml-1 bg-[#0E1116]/95 border border-[#C5CBD3]/24 backdrop-blur-md shadow-2xl py-1 z-50 rounded-[2px] min-w-[160px]"
                            >
                              {group.links.map((subLink) => (
                                subLink.to ? (
                                  <Link
                                    key={subLink.to}
                                    to={subLink.to}
                                    className={`block text-left px-4 py-2.5 text-[11px] font-sans font-medium tracking-wider transition-colors whitespace-nowrap ${
                                      location.pathname === subLink.to
                                        ? 'bg-[#2B3440] text-[#F2F4F7]'
                                        : 'text-[#C5CBD3] hover:bg-[#2B3440]/60 hover:text-[#F2F4F7]'
                                    }`}
                                    onClick={() => setIsServicesDropdownOpen(false)}
                                  >
                                    {subLink.label}
                                  </Link>
                                ) : (
                                  <span
                                    key={subLink.label}
                                    className="block text-left px-4 py-2.5 text-[11px] font-sans font-medium tracking-wider text-[#6D7886] cursor-default"
                                  >
                                    {subLink.label}
                                  </span>
                                )
                              ))}
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CONTACT LINK */}
            <Link
              to="/contact"
              className={`text-[11px] xl:text-[12px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-medium font-sans transition-all duration-200 whitespace-nowrap drop-shadow-sm ${
                isActive('/contact')
                  ? 'text-[#F2F4F7]'
                  : 'text-[#C5CBD3] hover:text-[#F2F4F7]'
              }`}
            >
              CONTACT
            </Link>

            {/* AUTH ACTIONS */}
            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-[#C5CBD3]/24 shrink-0">
                <Link
                  to="/crm/notifications"
                  className="relative text-[#C5CBD3] hover:text-[#F2F4F7] transition-colors"
                  aria-label="Notifications"
                >
                  <FiBell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-mono font-bold animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-1 px-2.5 py-1.5 border border-[#C5CBD3]/24 bg-[#2B3440]/60 text-[#F2F4F7] hover:bg-[#2B3440]/90 text-[11px] tracking-wider uppercase transition-colors rounded-[2px]"
                  >
                    <FiUser size={13} />
                    <span>{user?.fullName?.split(' ')[0]}</span>
                    <FiChevronDown size={12} />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-[#0E1116] border border-[#C5CBD3]/24 shadow-2xl py-1 z-50 text-[11px] rounded-[2px]">
                        {!user?.employeeId?.startsWith('CL_') && (
                          <Link
                            to="/crm/dashboard"
                            className="flex items-center space-x-2 px-4 py-2 text-[#C5CBD3] hover:bg-[#2B3440] hover:text-[#F2F4F7]"
                          >
                            <FiPackage size={12} />
                            <span>DASHBOARD</span>
                          </Link>
                        )}

                        {isAdmin && (
                          <Link
                            to="/crm/admin"
                            className="flex items-center space-x-2 px-4 py-2 text-[#C5CBD3] hover:bg-[#2B3440] hover:text-[#F2F4F7]"
                          >
                            <FiSettings size={12} />
                            <span>ADMIN PANEL</span>
                          </Link>
                        )}

                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:bg-red-950/20 w-full text-left font-semibold border-t border-[#C5CBD3]/10"
                        >
                          <FiLogOut size={12} />
                          <span>LOGOUT</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 xl:gap-4 shrink-0 pl-1">
                <Link
                  to="/quote-request"
                  className="h-[44px] px-3 xl:px-4 flex items-center justify-center space-x-1.5 text-[10px] xl:text-[11px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-semibold font-sans text-[#F2F4F7] border border-[#C5CBD3]/40 bg-[#2B3440]/50 hover:bg-[#2B3440]/80 backdrop-blur-sm transition-all duration-200 rounded-[2px]"
                >
                  <span>REQUEST BULK QUOTE</span>
                  <span className="text-sm font-light">&rarr;</span>
                </Link>

                <div className="flex items-center space-x-3 xl:space-x-4 border-l border-[#C5CBD3]/24 pl-3 xl:pl-4">
                  <Link
                    to="/login"
                    className="text-[11px] xl:text-[12px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-medium text-[#C5CBD3] hover:text-[#F2F4F7]"
                  >
                    LOGIN
                  </Link>

                  <Link
                    to="/client-signup"
                    className="h-[44px] px-3 xl:px-4 flex items-center justify-center text-[10px] xl:text-[11px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-semibold font-sans bg-[#2B3440] border border-[#C5CBD3]/42 text-[#F2F4F7] hover:bg-[#0E1116] hover:border-[#F2F4F7] rounded-[2px] transition-all duration-200"
                  >
                    SIGN UP
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden fixed inset-0 z-50 overflow-y-auto font-sans bg-[#0E1116] text-[#C5CBD3]"
          >
            <div className="flex justify-between items-center h-[104px] px-4 sm:px-6">
              <div className="flex items-center space-x-3">
                <div className="h-[42px] w-[42px] flex items-center justify-center shrink-0">
                  <img
                    src={CompanyLogo}
                    alt="India Trade Overseas Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="h-[36px] w-[1px] bg-gradient-to-b from-amber-400 via-white/40 to-transparent"></div>
                <div className="flex flex-col justify-center text-left leading-none space-y-[2px]">
                  <span className="font-serif font-black text-base tracking-[0.14em] uppercase text-white">
                    INDIA
                  </span>
                  <span className="font-sans font-bold text-[8px] tracking-[0.24em] uppercase text-gray-200">
                    TRADE OVERSEAS
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-[#C5CBD3] hover:text-[#F2F4F7] focus:outline-none shrink-0"
                aria-label="Close Navigation Menu"
              >
                <FiX size={26} />
              </button>
            </div>

            {/* MOBILE MENU CONTENT */}
            <motion.div
              variants={mobileMenuContainer}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="px-6 pb-12 space-y-6 text-left uppercase font-medium tracking-[0.18em] text-[11px]"
            >
              {navLinks.map((link) => (
                <motion.div key={link.to} variants={mobileMenuItem}>
                  <Link
                    to={link.to}
                    className={`block text-base tracking-wider ${
                      isActive(link.to) ? 'text-[#F2F4F7]' : 'text-[#C5CBD3]'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div variants={mobileMenuItem}>
                <Link
                  to="/contact"
                  className={`block text-base tracking-wider ${
                    isActive('/contact') ? 'text-[#F2F4F7]' : 'text-[#C5CBD3]'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  CONTACT
                </Link>
              </motion.div>

              {/* SERVICES SECTION MOBILE */}
              <motion.div
                variants={mobileMenuContainer}
                className="border-t border-[#C5CBD3]/10 pt-6 space-y-4"
              >
                <motion.div variants={mobileMenuItem}>
                  <Link
                    to="/our-services"
                    className={`block text-base tracking-wider ${
                      isServicesActive ? 'text-[#F2F4F7]' : 'text-[#C5CBD3]'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    OUR SERVICES
                  </Link>
                </motion.div>

                {servicesGroups.map((group, gIdx) => (
                  <motion.div
                    key={group.groupLabel}
                    variants={mobileMenuContainer}
                    className="space-y-2 pt-1"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedDivisions(prev => ({ ...prev, [gIdx]: !prev[gIdx] }))}
                      className="flex items-center justify-between w-full pl-2 text-[#6D7886] text-[9px] tracking-widest font-mono font-bold uppercase hover:text-[#F2F4F7] transition-colors"
                      aria-expanded={expandedDivisions[gIdx]}
                    >
                      <span>{group.groupLabel}</span>
                      <FiChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${expandedDivisions[gIdx] ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence>
                      {expandedDivisions[gIdx] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="overflow-hidden pl-2 space-y-1"
                        >
                          {group.links.map((subLink) => (
                            subLink.to ? (
                              <Link
                                key={subLink.to}
                                to={subLink.to}
                                className={`block pl-4 text-sm tracking-wider py-2 ${
                                  location.pathname === subLink.to
                                    ? 'text-[#F2F4F7]'
                                    : 'text-[#C5CBD3] hover:text-[#F2F4F7]'
                                }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {subLink.label}
                              </Link>
                            ) : (
                              <span
                                key={subLink.label}
                                className="block pl-4 text-sm tracking-wider py-2 text-[#6D7886] cursor-default"
                              >
                                {subLink.label}
                              </span>
                            )
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>

              {/* ACTION BUTTONS MOBILE */}
              <motion.div
                variants={mobileMenuContainer}
                className="border-t border-[#C5CBD3]/24 pt-6 space-y-3"
              >
                <motion.div variants={mobileMenuItem}>
                  <Link
                    to="/quote-request"
                    className="w-full h-[52px] flex items-center justify-center bg-[#2B3440] border border-[#C5CBD3]/42 text-[#F2F4F7] font-semibold text-xs tracking-widest rounded-[2px]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    REQUEST BULK QUOTE
                  </Link>
                </motion.div>

                {!user && (
                  <motion.div
                    variants={mobileMenuItem}
                    className="grid grid-cols-2 gap-3 pt-1"
                  >
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="h-[48px] flex items-center justify-center border border-[#C5CBD3]/30 text-[#C5CBD3] text-xs tracking-widest"
                    >
                      LOGIN
                    </Link>

                    <Link
                      to="/client-signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="h-[48px] flex items-center justify-center bg-[#2B3440] text-[#F2F4F7] font-semibold text-xs tracking-widest"
                    >
                      SIGN UP
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}