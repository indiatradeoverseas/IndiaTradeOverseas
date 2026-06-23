import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { notificationsApi } from '../../api/notifications';
import { FiMenu, FiX, FiUser, FiLogOut, FiHome, FiPackage, FiInfo, FiPhone, FiBriefcase, FiFileText, FiSettings, FiBell, FiChevronDown } from 'react-icons/fi';
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
    { to: '/about', label: 'About', icon: FiInfo },
    { to: '/contact', label: 'Contact', icon: FiPhone },
    { to: '/careers', label: 'Careers', icon: FiBriefcase },
    { to: '/quote-request', label: 'Get Quote', icon: FiFileText },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={`bg-[#f8fafc] sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'shadow-lg border-b border-[#cbd5e1]' : 'shadow-md'}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">

          
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="h-8 w-8 bg-[#0f4c75] rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                <span className="text-white font-bold text-sm">ITO</span>
              </div>
              <span className="hidden sm:inline font-semibold text-[#0f4c75] text-lg">ITO Exim</span>
            </Link>
          </div>

          {/* Desktop Navigation (MD screens and above) */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive(link.to)
                  ? 'text-[#0f4c75] bg-[#0f4c75]/10'
                  : 'text-[#334e68] hover:text-[#0f4c75] hover:bg-[#0f4c75]/5'
                  }`}
              >
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-[#0f4c75] rounded-full"></span>
                )}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-2 ml-4">
                {/* Notifications */}
                <Link to="/crm/notifications" className="relative p-2 rounded-lg text-[#334e68] hover:text-[#0f4c75] hover:bg-[#0f4c75]/10 transition-colors">
                  <FiBell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-semibold animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* User Menu Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 bg-[#0f4c75]/10 rounded-lg px-3 py-1.5 hover:bg-[#0f4c75]/20 transition-colors"
                  >
                    <FiUser className="text-[#0f4c75]" size={16} />
                    <span className="text-sm font-medium text-[#102a43] hidden lg:inline">
                      {user?.fullName ? user.fullName.split(' ')[0] : 'User'}
                    </span>
                    <FiChevronDown size={14} className={`text-[#334e68] transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-[#cbd5e1] py-1 z-50">
                        <div className="px-4 py-2 border-b border-[#cbd5e1]">
                          <p className="text-sm font-medium text-[#102a43]">{user?.fullName}</p>
                          <p className="text-xs text-[#334e68]">{user?.email}</p>
                          <span className="inline-block mt-1 text-xs bg-[#f5a524] px-2 py-0.5 rounded-full">{user?.role}</span>
                        </div>
                        {!user?.employeeId?.startsWith('CL_') && (
                          <Link to="/crm/dashboard" className="flex items-center space-x-2 px-4 py-2 text-sm text-[#334e68] hover:bg-[#f8fafc]" onClick={() => setIsUserMenuOpen(false)}>
                            <FiPackage size={14} /> <span>Dashboard</span>
                          </Link>
                        )}
                        {user?.role === 'ADMIN' && (
                          <Link to="/crm/admin" className="flex items-center space-x-2 px-4 py-2 text-sm text-[#334e68] hover:bg-[#f8fafc]" onClick={() => setIsUserMenuOpen(false)}>
                            <FiSettings size={14} /> <span>Admin Panel</span>
                          </Link>
                        )}
                        <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                          <FiLogOut size={14} /> <span>Logout</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 ml-4">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-[#334e68] hover:text-[#0f4c75]">Login</Link>
                <Link to="/client-signup" className="bg-[#0f4c75] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0b365e]">Sign Up</Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Link to="/crm/notifications" className="relative p-2 rounded-lg text-[#334e68]">
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[#334e68] hover:text-[#0f4c75] p-2 rounded-lg hover:bg-[#0f4c75]/10 transition-colors z-50"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bg-[#f8fafc] shadow-xl border-b border-[#cbd5e1] z-40 max-h-[calc(100vh-56px)] overflow-y-auto">
          <div className="px-3 py-3 space-y-1">
            {user && (
              <div className="mb-4 p-3 bg-gradient-to-r from-[#0f4c75]/10 to-transparent rounded-lg">
                <div className="flex items-center space-x-2">
                  <FiUser className="text-[#0f4c75]" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-[#102a43]">{user?.fullName}</p>
                    <p className="text-xs text-[#334e68]">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xs bg-[#f5a524] px-2 py-0.5 rounded-full">{user?.role}</span>
                </div>
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-base font-medium ${isActive(link.to) ? 'bg-[#0f4c75]/10 text-[#0f4c75]' : 'text-[#334e68] hover:bg-[#0f4c75]/5'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <link.icon size={18} />
                <span>{link.label}</span>
              </Link>
            ))}

            {user ? (
              <>
                {!user?.employeeId?.startsWith('CL_') && (
                  <Link to="/crm/dashboard" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-base font-medium text-[#334e68]" onClick={() => setIsMobileMenuOpen(false)}>
                    <FiPackage size={18} /> <span>Dashboard</span>
                  </Link>
                )}
                <button onClick={handleLogout} className="flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 text-left">
                  <FiLogOut size={18} /> <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="pt-2 space-y-2">
                <Link to="/login" className="flex items-center justify-center px-3 py-2.5 rounded-lg text-base font-medium text-[#0f4c75] border border-[#0f4c75]" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                <Link to="/client-signup" className="flex items-center justify-center px-3 py-2.5 rounded-lg text-base font-medium bg-[#0f4c75] text-white" onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}