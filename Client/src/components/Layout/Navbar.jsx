import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { notificationsApi } from '../../api/notifications';
import CompanyLogo from '../../../public/images/ITO Logo.jpeg';
import {
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiHome,
  FiPackage,
  FiInfo,
  FiPhone,
  FiBriefcase,
  FiFileText,
  FiSettings,
  FiBell,
  FiChevronDown
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { GiThreeLeaves , GiCoalWagon} from "react-icons/gi";
import { AnimatePresence, motion } from 'framer-motion';
import { FaBowlRice } from "react-icons/fa6";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPrakritiDropdownOpen, setIsPrakritiDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;
      try {
        const response = await notificationsApi.getNotifications();
        if (response.success) {
          setUnreadCount(response.data.notifications.filter((n) => !n.isRead).length);
        }
      } catch (error) {
        console.error('Unable to load notification badge:', error);
      }
    };
    loadNotifications();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsPrakritiDropdownOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: FiHome },
    { to: '/products', label: 'Products', icon: FiPackage },
    { to: '/careers', label: 'Careers', icon: FiBriefcase },
    { to: '/contact', label: 'Contact', icon: FiPhone },
    { to: '/about', label: 'About Us', icon: FiInfo },
  ];

  const prakritiDivisions = [
    { to: '/prakriti', label: 'Tea Division' , icon:GiThreeLeaves },
    { to: '/prakriti/coal', label: 'Coal Division' , icon:GiCoalWagon},
    { to: '/prakriti/rice', label: 'Rice Division' , icon: FaBowlRice }
  ];

  const isActive = (path) => location.pathname === path;
  const isPrakritiActive = location.pathname.startsWith('/prakriti');

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 border-b bg-[#ffffff] ${
        scrolled ? 'shadow-lg border-[#8FAADC]/40' : 'border-[#8FAADC]/20 shadow-sm'
      }`}
    >
      {/* Structural Double-Line Top Border Accent fixed to corporate Blue profile */}
      <div className="border-t-[3px] border-double w-full border-[#8FAADC]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">

          {/* Brand Authority Identity */}
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="h-9 flex items-center justify-center transition-transform group-hover:scale-105">
                <img
                  src={CompanyLogo}
                  alt="India Trade Overseas Logo"
                  className="h-full w-auto object-contain max-w-[120px]"
                  loading="eager"
                />
              </div>

              <span className="hidden lg:inline font-serif font-bold text-lg tracking-wide text-[#0C1F3F] whitespace-nowrap">
                India Trade Overseas
              </span>

              <div className="flex flex-col justify-center leading-none lg:hidden">
                <span className="font-serif font-bold text-sm tracking-wide uppercase text-[#0C1F3F] whitespace-nowrap">
                  India
                </span>
                <span className="font-sans font-bold text-[9px] tracking-widest uppercase mt-0.5 text-[#2F5DA8] whitespace-nowrap">
                  Trade Overseas
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Link Cluster */}
          <div className="hidden md:flex items-center justify-end flex-1 min-w-0 md:space-x-1 lg:space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-2 py-2 text-xs uppercase tracking-widest font-bold font-sans transition-all duration-150 whitespace-nowrap ${
                  isActive(link.to)
                    ? 'text-[#0C1F3F] bg-[#8FAADC]/20 rounded-md'
                    : 'text-[#0C1F3F]/80 hover:text-[#2F5DA8] hover:bg-[#8FAADC]/10 rounded-md'
                }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#2F5DA8]" />
                )}
              </Link>
            ))}

            {/* PREMIUM DROPDOWN FOR PRAKRITI DIVISION */}
            <div
              className="relative py-2"
              onMouseEnter={() => setIsPrakritiDropdownOpen(true)}
              onMouseLeave={() => setIsPrakritiDropdownOpen(false)}
            >
              <button
                className={`flex items-center px-2 py-2 text-xs uppercase tracking-widest font-bold font-sans transition-all duration-150 rounded-md outline-none ${
                  isPrakritiActive
                    ? 'text-[#0C1F3F] bg-[#8FAADC]/20 rounded-md'
                    : 'text-[#0C1F3F]/80 hover:text-[#2F5DA8] hover:bg-[#8FAADC]/10'
                }`}
              >
                <span>Prakriti Division</span>
                <FiChevronDown size={12} className={`transition-transform duration-300 ${isPrakritiDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Flyout Cards Structure Overlay Container */}
              <AnimatePresence>
                {isPrakritiDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-1 w-48 bg-white border border-[#8FAADC]/30 rounded-lg shadow-xl py-1 z-50 overflow-hidden"
                  >
                    {prakritiDivisions.map((subLink) => {
                      const isSubActive = location.pathname === subLink.to;
                      return (
                        <Link
                          key={subLink.to}
                          to={subLink.to}
                          className={`block text-left px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider transition-colors whitespace-nowrap text-[#0C1F3F] ${
                            isSubActive ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {subLink.label}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quote Action Button */}
            <Link
              to="/quote-request"
              className={`ml-1 lg:ml-2 text-xs uppercase tracking-widest font-bold px-3 lg:px-4 py-2 rounded-md transition-all shadow-sm border whitespace-nowrap ${
                isActive('/quote-request')
                  ? 'bg-[#0C1F3F] text-white border-transparent'
                  : 'bg-[#2F5DA8] hover:bg-[#0C1F3F] text-white border-transparent'
              }`}
            >
              Get a Quote
            </Link>

            {/* Authenticated Context Dropdown Panel */}
            {user ? (
              <div className="flex items-center gap-2 ml-2 lg:ml-4 border-l border-[#8FAADC]/30 pl-2 lg:pl-4 shrink-0">
                <Link
                  to="/crm/notifications"
                  className="relative p-2 rounded-md transition-colors text-[#0C1F3F] hover:bg-[#8FAADC]/10"
                >
                  <FiBell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-mono font-bold animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-1.5 bg-[#ffffff] border border-[#8FAADC]/20 rounded-md px-3 py-1.5 transition-colors hover:bg-[#ffffff]/30"
                  >
                    <FiUser className="text-[#2F5DA8]" size={14} />
                    <span className="text-xs font-bold hidden lg:inline whitespace-nowrap text-[#0C1F3F]">
                      {user?.fullName ? user.fullName.split(' ')[0] : 'User'}
                    </span>
                    <FiChevronDown size={12} className="text-slate-400 transition-transform" />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-[#ffffff] rounded-xl shadow-xl border border-[#8FAADC]/20 py-1 z-50 text-xs">
                        <div className="px-4 py-2 border-b border-slate-100 bg-[#ffffff]/30">
                          <p className="font-serif font-bold text-[#0C1F3F]">{user?.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
                          <span className="inline-block mt-1.5 text-[9px] font-mono tracking-wider uppercase font-bold px-2 py-0.5 rounded-full bg-[#8FAADC]/20 text-[#0C1F3F]">
                            {user?.employeeId?.startsWith('CL_') ? 'CLIENT' : user?.role}
                          </span>
                        </div>
                        {!user?.employeeId?.startsWith('CL_') && (
                          <Link to="/crm/dashboard" className="flex items-center space-x-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50" onClick={() => setIsUserMenuOpen(false)}>
                            <FiPackage size={12} className="text-[#2F5DA8]" /> <span>Dashboard</span>
                          </Link>
                        )}
                        {user?.role === 'ADMIN' && (
                          <Link to="/crm/admin" className="flex items-center space-x-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50" onClick={() => setIsUserMenuOpen(false)}>
                            <FiSettings size={12} className="text-[#2F5DA8]" /> <span>Admin Panel</span>
                          </Link>
                        )}
                        <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2.5 text-red-600 hover:bg-red-50/60 w-full text-left font-bold border-t border-slate-50">
                          <FiLogOut size={12} /> <span>Logout</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-1 ml-2 lg:ml-4 border-l border-[#8FAADC]/30 pl-2 lg:pl-4 shrink-0">
                <Link to="/login" className="px-2.5 py-2 text-xs uppercase tracking-widest font-bold whitespace-nowrap text-[#0C1F3F] hover:text-[#2F5DA8]">Login</Link>
                <Link to="/client-signup" className="px-3 py-2 rounded-md text-xs uppercase tracking-widest font-bold shadow-sm whitespace-nowrap bg-[#2F5DA8] hover:bg-[#0C1F3F] text-white">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile Utility Actions Bar */}
          <div className="flex items-center gap-1 md:hidden">
            {user && (
              <Link to="/crm/notifications" className="relative p-2 rounded-md text-[#0C1F3F]">
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-mono font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md z-50 text-[#0C1F3F]"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Viewport */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[67px] shadow-xl border-b z-40 max-h-[calc(100vh-67px)] overflow-y-auto font-sans text-xs uppercase tracking-widest font-bold bg-[#ffffff] border-[#8FAADC]/20">
          <div className="px-3 py-4 space-y-1">
            {user ? (
              <div className="mb-4 p-3.5 bg-[#ffffff] border border-slate-100 rounded-xl flex items-center space-x-3 text-left normal-case tracking-normal">
                <div className="p-2.5 rounded-full bg-[#ffffff] text-[#2F5DA8]">
                  <FiUser size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif font-bold text-sm text-[#0C1F3F]">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[9px] font-mono tracking-wider uppercase font-bold px-2 py-0.5 rounded-full bg-[#8FAADC]/20 text-[#0C1F3F]">
                    {user?.employeeId?.startsWith('CL_') ? 'CLIENT' : user?.role}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 border rounded-lg transition-colors border-[#8FAADC]/30 text-[#0C1F3F]"
                >
                  Login
                </Link>
                <Link
                  to="/client-signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center py-2.5 text-white rounded-lg shadow-sm bg-[#2F5DA8]"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-3 px-3 py-3 rounded-md text-left transition-colors ${
                  isActive(link.to) ? 'bg-[#8FAADC]/20 text-[#0C1F3F]' : 'text-[#0C1F3F] hover:bg-[#8FAADC]/10'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <link.icon size={16} className="text-[#2F5DA8]" />
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Mobile Expanded Prakriti Child Subdivisions Deck */}
            <div className="border-t border-[#8FAADC]/20 pt-2 mt-2 space-y-1">
              <div className="px-3 py-2 text-[10px] tracking-wider text-slate-400 font-mono text-left font-normal normal-case">
                Prakriti Sectors
              </div>
              {prakritiDivisions.map((subLink) => {
                const SubIcon = subLink.icon;
                return (
                  <Link
                    key={subLink.to}
                    to={subLink.to}
                    className={`flex items-center space-x-3.5 px-6 py-3 rounded-xl text-left transition-colors ${
                      isActive(subLink.to) ? 'bg-[#8FAADC]/30 text-[#0C1F3F]' : 'text-[#0C1F3F]/80 hover:bg-[#8FAADC]/10'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {SubIcon && <SubIcon size={14} className="text-[#2F5DA8] shrink-0" />}
                    <span>{subLink.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Global Actions Block (Dashboard/Admin/Logout & Quote) */}
            <div className="pt-3 border-t border-[#8FAADC]/20 mt-3 space-y-1">
              {user && (
                <>
                  {!user?.employeeId?.startsWith('CL_') && (
                    <Link to="/crm/dashboard" className="flex items-center space-x-3 px-3 py-3 text-slate-600" onClick={() => setIsMobileMenuOpen(false)}>
                      <FiPackage size={16} className="text-[#2F5DA8]" /> <span>Dashboard</span>
                    </Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link to="/crm/admin" className="flex items-center space-x-3 px-3 py-3 text-slate-600" onClick={() => setIsMobileMenuOpen(false)}>
                      <FiSettings size={16} className="text-[#2F5DA8]" /> <span>Admin Panel</span>
                    </Link>
                  )}
                  <button onClick={handleLogout} className="flex items-center space-x-3 px-3 py-3 text-red-600 w-full text-left font-bold">
                    <FiLogOut size={16} /> <span>Logout</span>
                  </button>
                </>
              )}

              <Link
                to="/quote-request"
                className="flex items-center justify-center space-x-1 px-4 py-3.5 rounded-xl text-white shadow-sm bg-[#2F5DA8]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FiFileText size={16} />
                <span>Get a Quote</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}