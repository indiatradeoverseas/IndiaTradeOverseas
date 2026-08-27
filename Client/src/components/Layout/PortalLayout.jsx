import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiMenu, FiX, FiSun, FiMoon, FiLogIn, FiLogOut } from 'react-icons/fi';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import VoiceStatusPill from './VoiceStatusPill';
import { useAuth } from '../../hooks/useAuth';
import { attendanceApi } from '../../api/attendance';
import toast from 'react-hot-toast';
// Removed the duplicate main-site Navbar import from here to protect CRM view real estate

export default function PortalLayout({ children }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('crm-theme') || 'dark');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    localStorage.setItem('crm-theme', theme);
  }, [theme]);

  const fetchTodayAttendance = async () => {
    if (!user || ['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'SUPER_ADMIN'].includes(user.role)) return;
    try {
      const res = await attendanceApi.getMyToday();
        setTodayAttendance(res.data.record || res.data.attendance);
    } catch (err) {
      console.error('Error fetching today attendance in PortalLayout:', err);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, [user]);

  const handleCheckIn = async () => {
    setLoadingAttendance(true);
    try {
      const res = await attendanceApi.checkIn();
      if (res.success) {
        toast.success('Successfully checked in! Have a great day. ☀️');
        fetchTodayAttendance();
        window.dispatchEvent(new Event('attendance_updated'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleCheckOut = async () => {
    setLoadingAttendance(true);
    try {
      const res = await attendanceApi.checkOut();
      if (res.success) {
        toast.success('Successfully checked out! Logging out... 🌙');
        fetchTodayAttendance();
        window.dispatchEvent(new Event('attendance_updated'));
        setTimeout(() => {
          logout();
        }, 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div
      className={`crm-portal min-h-screen antialiased ${theme === 'light' ? 'light-theme' : ''}`}
      style={{ background: 'var(--crm-bg)', color: 'var(--crm-ink-soft)', fontFamily: 'var(--crm-font-body)' }}
    >

      {/* MOBILE TOP BAR */}
      <div
        className="md:hidden backdrop-blur-md fixed top-0 left-0 right-0 z-[52] border-b"
        style={{ background: 'color-mix(in srgb, var(--crm-nav-bg) 92%, transparent)', borderColor: 'var(--crm-line)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-sm p-2 transition duration-200 focus:outline-none"
            style={{ color: 'var(--crm-ink)' }}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={sidebarOpen ? 'close' : 'open'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="inline-flex"
              >
                {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
              </motion.span>
            </AnimatePresence>
          </button>
          <div
            className="text-sm font-medium uppercase tracking-wider"
            style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}
          >
            India Trade Center
          </div>
          <div className="flex items-center gap-2 justify-end">
            {user && !['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'SUPER_ADMIN'].includes(user.role) && (
              <div className="flex items-center gap-1.5 mr-1">
                {!todayAttendance && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="bg-emerald-950/90 text-emerald-400 border border-emerald-900/40 text-[8px] font-bold uppercase px-2.5 py-1 rounded cursor-pointer"
                  >
                    In
                  </button>
                )}
                {todayAttendance && !todayAttendance.clockOut && (
                  <button
                    onClick={handleCheckOut}
                    disabled={loadingAttendance}
                    className="bg-rose-950/90 text-rose-400 border border-rose-900/40 text-[8px] font-bold uppercase px-2.5 py-1 rounded cursor-pointer"
                  >
                    Out
                  </button>
                )}
                {todayAttendance && todayAttendance.clockOut && (
                  <span className="text-[8px] text-[var(--crm-positive)] font-mono font-bold">
                    ✓ Complete
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] transition cursor-pointer p-1"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
            </button>
            <VoiceStatusPill compact />
          </div>
        </div>
      </div>

      <div className="flex min-h-screen">

        {/* PORTAL SIDEBAR BRAND CONTEXT CONTAINER */}
        <div
          className={`fixed inset-y-0 left-0 z-[60] w-64 sm:w-72 transform border-r transition-all duration-300 ease-in-out shadow-2xl md:static md:translate-x-0 md:shadow-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ borderColor: 'var(--crm-line)' }}
        >
          <Sidebar
            key={isMobile ? `mobile-${sidebarOpen}` : 'desktop'}
            onClose={() => isMobile && setSidebarOpen(false)}
          />
        </div>

        {/* Dynamic Mobile Shield Mask Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-xs md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            />
          )}
        </AnimatePresence>

        {/* Core Main Viewport Workspace Terminal Container */}
        <div className="flex-1 flex flex-col min-h-screen" style={{ background: 'var(--crm-bg)' }}>
          {/* Buffer spacer block to balance mobile fixed top bar overlay */}
          <div className="md:hidden h-[57px]" />

          {/* Desktop utility bar */}
          <div
            className="hidden md:flex items-center justify-end gap-3 px-8 py-3 border-b"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            {user && !['ADMIN', 'FOUNDER', 'CO_FOUNDER', 'SUPER_ADMIN'].includes(user.role) && (
              <div className="flex items-center gap-2 mr-4">
                {!todayAttendance && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="flex items-center gap-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-900/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer"
                  >
                    <FiLogIn size={12} /> Check In
                  </button>
                )}
                {todayAttendance && !todayAttendance.clockOut && (
                  <button
                    onClick={handleCheckOut}
                    disabled={loadingAttendance}
                    className="flex items-center gap-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-900/40 text-rose-400 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer"
                  >
                    <FiLogOut size={12} /> Check Out
                  </button>
                )}
                {todayAttendance && todayAttendance.clockOut && (
                  <span className="text-[10px] text-[var(--crm-positive)] font-mono font-bold">
                    ✓ Shift Completed
                  </span>
                )}
                {todayAttendance && todayAttendance.clockIn && (
                  <span className="text-[10px] text-[var(--crm-ink-faint)] font-mono">
                    Clocked in: {new Date(todayAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 border border-[var(--crm-line)] rounded-sm hover:border-[var(--crm-heading)] transition cursor-pointer text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] bg-[var(--crm-bg-raised)]"
              title="Toggle Theme"
            >
              {theme === 'light' ? <FiMoon size={13} /> : <FiSun size={13} />}
            </button>
            <VoiceStatusPill />
            <CommandPalette />
          </div>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pt-6 md:pt-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}