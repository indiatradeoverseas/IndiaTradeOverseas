import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { notificationsApi } from '../../api/notifications';
import CompanyLogo from '../../../public/images/ITO Logo.jpeg';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPrakritiDropdownOpen, setIsPrakritiDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
    { to: '/', label: 'HOME' },
    { to: '/about', label: 'ABOUT US' },
    { to: '/careers', label: 'CAREERS' },
    { to: '/products', label: 'PRODUCTS'},
  ];

  const prakritiDivisions = [
    { to: '/prakriti', label: 'TEA DIVISION' },
    { to: '/prakriti/rice', label: 'RICE DIVISION' },
    { to: '/prakriti/coal', label: 'COAL DIVISION' },
  ];

  const isActive = (path) => location.pathname === path;
  const isPrakritiActive = location.pathname.startsWith('/prakriti');

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent transition-all duration-300">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* MOBILE NAVIGATION BAR HEADER */}
        <div className="flex lg:hidden justify-between items-center h-[104px] w-full">
          <div className="flex items-center space-x-3 text-right">
            <div className="h-[56px] w-[56px] flex items-center justify-center rounded-full overflow-hidden border border-[#C5CBD3]/20 bg-black/25 shrink-0">
              <img
                src={CompanyLogo}
                alt="India Trade Overseas Logo"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="flex flex-col justify-center text-right leading-none">
                <span className="font-serif font-normal text-lg tracking-wide uppercase mr-9 text-[#F2F4F7] whitespace-nowrap">
                  INDIA
                </span>
                <span className="font-sans font-light text-[10px] tracking-widest uppercase mt-1 text-[#C5CBD3] whitespace-nowrap">
                  TRADE OVERSEAS
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Notification bell on mobile row for logged in users */}
            {user && (
              <Link to="/crm/notifications" className="relative text-[#C5CBD3] hover:text-[#F2F4F7] p-2 mr-1 transition-colors">
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
            >
              {isMobileMenuOpen ? <FiX size={26} /> : <FiMenu size={26} />}
            </button>
          </div>
        </div>

        {/* DESKTOP NAVIGATION BAR HEADER */}
        <div className="hidden lg:flex justify-between items-center h-[104px]">
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center space-x-3.5 group">
              <div className="h-[64px] w-[64px] flex items-center justify-center rounded-full overflow-hidden border border-[#C5CBD3]/20 bg-black/20 shrink-0">
                <img
                  src={CompanyLogo}
                  alt="India Trade Overseas Logo"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>

              <div className="flex flex-col justify-center text-left">
                <span className="font-serif font-normal text-[20px] xl:text-[22px] tracking-[0.01em] text-[#F2F4F7] leading-tight uppercase whitespace-nowrap">
                  India Trade Overseas
                </span>
                <span className="font-sans font-light text-[10px] xl:text-[11px] tracking-[0.12em] text-[#C5CBD3] uppercase mt-0.5 whitespace-nowrap">
                  Trade. Supply. Logistics. Growth.
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center justify-end flex-1 min-w-0 space-x-5 xl:space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative text-[11px] xl:text-[12px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-medium font-sans transition-all duration-200 whitespace-nowrap outline-none ${isActive(link.to) ? 'text-[#F2F4F7]' : 'text-[#C5CBD3] hover:text-[#F2F4F7]'
                  }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-[#F2F4F7]" />
                )}
              </Link>
            ))}

            <div
              className="relative py-2"
              onMouseEnter={() => setIsPrakritiDropdownOpen(true)}
              onMouseLeave={() => setIsPrakritiDropdownOpen(false)}
            >
              <button
                className={`flex items-center space-x-1 text-[11px] xl:text-[12px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-medium font-sans transition-all duration-200 outline-none ${isPrakritiActive ? 'text-[#F2F4F7]' : 'text-[#C5CBD3] hover:text-[#F2F4F7]'
                  }`}
              >
                <span>PRAKRITI DIVISION</span>
                <FiChevronDown size={12} className={`transition-transform duration-300 ${isPrakritiDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isPrakritiDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 mt-3 w-48 bg-[#0E1116] border border-[#C5CBD3]/24 shadow-xl py-2 z-50 rounded-[2px]"
                  >
                    {prakritiDivisions.map((subLink) => (
                      <Link
                        key={subLink.to}
                        to={subLink.to}
                        className={`block text-left px-4 py-2.5 text-[11px] font-sans font-medium tracking-wider transition-colors whitespace-nowrap ${location.pathname === subLink.to ? 'bg-[#2B3440] text-[#F2F4F7]' : 'text-[#C5CBD3] hover:bg-[#2B3440]/60 hover:text-[#F2F4F7]'
                          }`}
                      >
                        {subLink.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              to="/contact"
              className={`text-[11px] xl:text-[12px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-medium font-sans transition-all duration-200 whitespace-nowrap ${isActive('/contact') ? 'text-[#F2F4F7]' : 'text-[#C5CBD3] hover:text-[#F2F4F7]'
                }`}
            >
              CONTACT
            </Link>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-[#C5CBD3]/24 shrink-0">
                <Link to="/crm/notifications" className="relative text-[#C5CBD3] hover:text-[#F2F4F7] transition-colors">
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
                    className="flex items-center space-x-1 px-2.5 py-1.5 border border-[#C5CBD3]/24 bg-[#2B3440]/40 text-[#F2F4F7] hover:bg-[#2B3440]/70 text-[11px] tracking-wider uppercase transition-colors"
                  >
                    <FiUser size={13} />
                    <span>{user?.fullName?.split(' ')[0]}</span>
                    <FiChevronDown size={12} />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-[#0E1116] border border-[#C5CBD3]/24 shadow-2xl py-1 z-50 text-[11px] rounded-[2px]">
                        {!user?.employeeId?.startsWith('CL_') && (
                          <Link to="/crm/dashboard" className="flex items-center space-x-2 px-4 py-2 text-[#C5CBD3] hover:bg-[#2B3440] hover:text-[#F2F4F7]">
                            <FiPackage size={12} /> <span>DASHBOARD</span>
                          </Link>
                        )}
                        {user?.role === 'ADMIN' && (
                          <Link to="/crm/admin" className="flex items-center space-x-2 px-4 py-2 text-[#C5CBD3] hover:bg-[#2B3440] hover:text-[#F2F4F7]">
                            <FiSettings size={12} /> <span>ADMIN PANEL</span>
                          </Link>
                        )}
                        <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:bg-red-950/20 w-full text-left font-semibold border-t border-[#C5CBD3]/10">
                          <FiLogOut size={12} /> <span>LOGOUT</span>
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
                  className="h-[44px] px-3 xl:px-4 flex items-center justify-center space-x-1.5 text-[10px] xl:text-[11px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-semibold font-sans text-[#F2F4F7] border border-[#C5CBD3]/30 bg-[#2B3440]/30 hover:bg-[#2B3440]/60 transition-all duration-200"
                >
                  <span>REQUEST BULK QUOTE</span>
                  <span className="text-sm font-light">&rarr;</span>
                </Link>

                <div className="flex items-center space-x-3 xl:space-x-4 border-l border-[#C5CBD3]/24 pl-3 xl:pl-4">
                  <Link to="/login" className="text-[11px] xl:text-[12px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-medium text-[#C5CBD3] hover:text-[#F2F4F7]">LOGIN</Link>
                  <Link to="/client-signup" className="h-[44px] px-3 xl:px-4 flex items-center justify-center text-[10px] xl:text-[11px] uppercase tracking-[0.1em] xl:tracking-[0.15em] font-semibold font-sans bg-[#2B3440] border border-[#C5CBD3]/42 text-[#F2F4F7] hover:bg-[#0E1116] hover:border-[#F2F4F7] rounded-[2px] transition-all duration-200">SIGN UP</Link>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Mobile Viewport Subdeck Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-y-auto font-sans bg-[#0E1116]">
          <div className="flex justify-between items-center h-[104px] px-4 sm:px-6">
            <div className="flex items-center space-x-3">
              <div className="h-[56px] w-[56px] flex items-center justify-center rounded-full overflow-hidden border border-[#C5CBD3]/20 bg-black/25 shrink-0">
                <img
                  src={CompanyLogo}
                  alt="India Trade Overseas Logo"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="flex flex-col justify-center text-left leading-none">
                <span className="font-serif font-normal text-lg tracking-wide uppercase text-[#F2F4F7] whitespace-nowrap">
                  INDIA
                </span>
                <span className="font-sans font-light text-[10px] tracking-widest uppercase mt-1 text-[#C5CBD3] whitespace-nowrap">
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

          {/* Links Area Container */}
          <div className="px-6 pb-12 space-y-6 text-left uppercase font-medium tracking-[0.18em] text-[11px]">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`block text-base tracking-wider ${isActive(link.to) ? 'text-[#F2F4F7]' : 'text-[#C5CBD3]'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <Link
              to="/contact"
              className={`block text-base tracking-wider ${isActive('/contact') ? 'text-[#F2F4F7]' : 'text-[#C5CBD3]'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              CONTACT
            </Link>

            {/* FIXED SECTION: Render Secure User Hub actions explicitly for mobile menu panels */}
            {user && (
              <div className="border-t border-[#C5CBD3]/10 pt-6 space-y-4">
                <div className="text-[#6D7886] text-[10px] tracking-widest font-mono font-bold">OPERATOR VAULT ({user?.fullName})</div>
                
                {!user?.employeeId?.startsWith('CL_') && (
                  <Link
                    to="/crm/dashboard"
                    className="flex items-center space-x-3 text-sm tracking-wider text-[#C5CBD3] hover:text-[#F2F4F7] py-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FiPackage size={16} className="text-[#6D7886]" />
                    <span>DASHBOARD</span>
                  </Link>
                )}
                
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/crm/admin"
                    className="flex items-center space-x-3 text-sm tracking-wider text-[#C5CBD3] hover:text-[#F2F4F7] py-1"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FiSettings size={16} className="text-[#6D7886]" />
                    <span>ADMIN PANEL</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 text-sm tracking-wider text-rose-400 hover:text-rose-300 w-full text-left py-2 font-bold border-t border-[#C5CBD3]/5 mt-2"
                >
                  <FiLogOut size={16} />
                  <span>SECURE LOGOUT</span>
                </button>
              </div>
            )}

            <div className="border-t border-[#C5CBD3]/10 pt-6 space-y-4">
              <div className="text-[#6D7886] text-[10px] tracking-widest font-mono font-bold">PRAKRITI DIVISION</div>
              {prakritiDivisions.map((subLink) => (
                <Link
                  key={subLink.to}
                  to={subLink.to}
                  className="block pl-4 text-sm tracking-wider text-[#C5CBD3] hover:text-[#F2F4F7]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {subLink.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-[#C5CBD3]/24 pt-6 space-y-3">
              <Link
                to="/quote-request"
                className="w-full h-[52px] flex items-center justify-center bg-[#2B3440] border border-[#C5CBD3]/42 text-[#F2F4F7] font-semibold text-xs tracking-widest rounded-[2px]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                REQUEST BULK QUOTE
              </Link>
              {!user && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="h-[48px] flex items-center justify-center border border-[#C5CBD3]/30 text-[#C5CBD3] text-xs tracking-widest">LOGIN</Link>
                  <Link to="/client-signup" onClick={() => setIsMobileMenuOpen(false)} className="h-[48px] flex items-center justify-center bg-[#2B3440] border border-transparent text-[#F2F4F7] text-xs tracking-widest">SIGN UP</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}