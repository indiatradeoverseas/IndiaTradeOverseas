import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { notificationsApi } from '../../api/notifications';
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

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
    { to: '/about', label: 'About Us', icon: FiInfo },
    { to: '/contact', label: 'Contact', icon: FiPhone },
    { to: '/careers', label: 'Careers', icon: FiBriefcase },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 bg-[#FBF7EF] border-b ${scrolled ? 'shadow-lg border-[#C99B38]/30' : 'border-[#F5EEDF] shadow-sm'}`}>

      {/* Structural Double-Line Gold Top Border Accent */}
      <div className="border-t-[3px] border-double border-[#C99B38] w-full"></div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-16">

          {/* Brand Authority Identity */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="h-9 flex items-center justify-center transition-transform group-hover:scale-105">
                <img
                  src="./images/ITO Logo.jpeg"
                  alt="India Trade Overseas Logo"
                  className="h-full w-auto object-contain max-w-[120px]  rounded-full"
                  loading="eager"
                />
              </div>
              <span className="hidden sm:inline font-serif font-normal text-[#0B2D5B] text-lg tracking-wide">
                India Trade Overseas
              </span>
            </Link>
          </div>

          {/* Desktop Core Navigation Links Panel */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3 py-2 text-xs uppercase tracking-widest font-semibold font-sans transition-all duration-150 ${isActive(link.to)
                    ? 'text-[#0B2D5B] bg-[#F5EEDF]'
                    : 'text-[#102F60]/80 hover:text-[#0B2D5B] hover:bg-[#F5EEDF]/50'
                  }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#C99B38]"></span>
                )}
              </Link>
            ))}

            {/* Mandated Gold Get a Quote Call-To-Action fixed to the right of navigation */}
            <Link
              to="/quote-request"
              className={`ml-2 text-xs uppercase tracking-widest font-bold px-4 py-2 rounded-sm transition-all shadow-xs border ${isActive('/quote-request')
                  ? 'bg-[#0B2D5B] text-white border-transparent'
                  : 'bg-[#C99B38] hover:bg-amber-600 text-white border-transparent'
                }`}
            >
              Get a Quote
            </Link>

            {/* Authenticated Context Dropdown Panel */}
            {user ? (
              <div className="flex items-center gap-2 ml-4 border-l border-[#F5EEDF] pl-4">
                <Link to="/crm/notifications" className="relative p-2 rounded-sm text-[#102F60] hover:bg-[#F5EEDF] transition-colors">
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
                    className="flex items-center space-x-1.5 bg-white border border-[#F5EEDF] rounded-sm px-3 py-1.5 hover:bg-[#FAF9F5] transition-colors"
                  >
                    <FiUser className="text-[#C99B38]" size={14} />
                    <span className="text-xs font-semibold text-[#0B2D5B] hidden lg:inline">
                      {user?.fullName ? user.fullName.split(' ')[0] : 'User'}
                    </span>
                    <FiChevronDown size={12} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-sm shadow-xl border border-[#F5EEDF] py-1 z-50 text-xs">
                        <div className="px-4 py-2 border-b border-slate-100 bg-[#FAF9F5]/40">
                          <p className="font-serif font-semibold text-[#0B2D5B]">{user?.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
                          <span className="inline-block mt-1.5 text-[9px] font-mono tracking-wider uppercase font-bold bg-[#F5EEDF] px-2 py-0.5 rounded-full text-amber-900">
                            {user?.employeeId?.startsWith('CL_') ? 'CLIENT' : user?.role}
                          </span>
                        </div>
                        {!user?.employeeId?.startsWith('CL_') && (
                          <Link to="/crm/dashboard" className="flex items-center space-x-2 px-4 py-2.5 text-slate-600 hover:bg-[#FAF9F5]" onClick={() => setIsUserMenuOpen(false)}>
                            <FiPackage size={12} className="text-[#C99B38]" /> <span>Dashboard</span>
                          </Link>
                        )}
                        {user?.role === 'ADMIN' && (
                          <Link to="/crm/admin" className="flex items-center space-x-2 px-4 py-2.5 text-slate-600 hover:bg-[#FAF9F5]" onClick={() => setIsUserMenuOpen(false)}>
                            <FiSettings size={12} className="text-[#C99B38]" /> <span>Admin Panel</span>
                          </Link>
                        )}
                        <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2.5 text-red-600 hover:bg-red-50/60 w-full text-left font-medium border-t border-slate-50">
                          <FiLogOut size={12} /> <span>Logout</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 ml-4 border-l border-[#F5EEDF] pl-4">
                <Link to="/login" className="px-3 py-2 text-xs uppercase tracking-widest font-bold text-[#102F60] hover:text-[#0B2D5B]">Login</Link>
                <Link to="/client-signup" className="bg-[#0B2D5B] text-white px-4 py-2 rounded-sm text-xs uppercase tracking-widest font-bold hover:bg-[#102F60] shadow-xs">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile Utility Actions Bar */}
          <div className="flex items-center gap-1.5 md:hidden">
            {user && (
              <Link to="/crm/notifications" className="relative p-2 rounded-sm text-[#102F60]">
                <FiBell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-mono font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[#102F60] p-2 rounded-sm z-50"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu Viewport */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[67px] bg-[#FBF7EF] shadow-xl border-b border-[#F5EEDF] z-40 max-h-[calc(100vh-67px)] overflow-y-auto font-sans text-xs">
          <div className="px-3 py-4 space-y-1">
            {user && (
              <div className="mb-4 p-3.5 bg-white border border-[#F5EEDF] rounded-sm flex items-center space-x-3">
                <div className="bg-[#F5EEDF] text-[#C99B38] p-2.5 rounded-full">
                  <FiUser size={16} />
                </div>
                <div>
                  <p className="font-serif font-semibold text-sm text-[#0B2D5B]">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-1 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#F5EEDF] px-2 py-0.5 rounded-full text-amber-900">
                    {user?.employeeId?.startsWith('CL_') ? 'CLIENT' : user?.role}
                  </span>
                </div>
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-3 px-3 py-3 rounded-sm uppercase tracking-wider font-semibold ${isActive(link.to)
                    ? 'bg-[#F5EEDF] text-[#0B2D5B]'
                    : 'text-[#102F60] hover:bg-[#F5EEDF]/40'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <link.icon size={14} className="text-[#C99B38]" />
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Mobile View Quote link action */}
            <Link
              to="/quote-request"
              className={`flex items-center space-x-3 px-3 py-3 rounded-sm uppercase tracking-wider font-bold ${isActive('/quote-request')
                  ? 'bg-[#F5EEDF] text-[#0B2D5B]'
                  : 'bg-[#C99B38]/10 text-[#C99B38] border border-[#C99B38]/20'
                }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiFileText size={14} />
              <span>Get a Quote</span>
            </Link>

            {user ? (
              <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                {!user?.employeeId?.startsWith('CL_') && (
                  <Link to="/crm/dashboard" className="flex items-center space-x-3 px-3 py-3 rounded-sm text-slate-600 font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                    <FiPackage size={14} className="text-[#C99B38]" /> <span>Dashboard</span>
                  </Link>
                )}
                <button onClick={handleLogout} className="flex items-center space-x-3 w-full px-3 py-3 rounded-sm text-red-600 font-semibold border border-transparent hover:bg-red-50 text-left">
                  <FiLogOut size={14} /> <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="pt-4 space-y-2">
                <Link to="/login" className="flex items-center justify-center px-3 py-3 rounded-sm font-bold uppercase tracking-wider border border-[#102F60] text-[#102F60]" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                <Link to="/client-signup" className="flex items-center justify-center px-3 py-3 rounded-sm font-bold uppercase tracking-wider bg-[#0B2D5B] text-white" onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}