import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiMenu, FiX, FiSun, FiMoon, FiLogIn, FiLogOut, FiCoffee } from 'react-icons/fi';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import VoiceStatusPill from './VoiceStatusPill';
import NotificationDropdown from '../common/NotificationDropdown';
import AiChatMessenger from '../common/AiChatMessenger';
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

  const [lunchElapsed, setLunchElapsed] = useState(0);

  const fetchTodayAttendance = async () => {
    if (!user) return;
    try {
      const res = await attendanceApi.getMyToday();
      const att = res.data?.attendance || res.data?.record;
      setTodayAttendance(att);
    } catch (err) {
      console.error('Error fetching today attendance in PortalLayout:', err);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
    const handleUpdate = () => {
      fetchTodayAttendance();
    };
    window.addEventListener('attendance_updated', handleUpdate);
    return () => {
      window.removeEventListener('attendance_updated', handleUpdate);
    };
  }, [user]);

  useEffect(() => {
    if (!todayAttendance?.lunchStartAt || todayAttendance?.lunchEndAt) {
      setLunchElapsed(0);
      return;
    }
    const startedAt = new Date(todayAttendance.lunchStartAt).getTime();
    const tick = () => setLunchElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [todayAttendance?.lunchStartAt, todayAttendance?.lunchEndAt]);

  const formatElapsed = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

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
    if (!window.confirm('Check out now? This ends your work shift.')) return;
    setLoadingAttendance(true);
    try {
      const res = await attendanceApi.checkOut();
      if (res.success) {
        toast.success('Successfully checked out! Shift completed. 🌙');
        fetchTodayAttendance();
        window.dispatchEvent(new Event('attendance_updated'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleLunchStart = async () => {
    setLoadingAttendance(true);
    try {
      const res = await attendanceApi.startLunch();
      if (res.success) {
        toast.success('Lunch break started! ☕');
        fetchTodayAttendance();
        window.dispatchEvent(new Event('attendance_updated'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start lunch break');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleLunchEnd = async () => {
    setLoadingAttendance(true);
    try {
      const res = await attendanceApi.endLunch();
      if (res.success) {
        toast.success(`Lunch break ended — ${res.data?.attendance?.lunchDurationMinutes || ''} min recorded!`);
        fetchTodayAttendance();
        window.dispatchEvent(new Event('attendance_updated'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end lunch break');
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
            {user && (
              <div className="flex items-center gap-1.5 mr-1 font-mono">
                {(!todayAttendance || (!todayAttendance.checkInTime && !todayAttendance.checkInAt)) && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="bg-emerald-950/90 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/40 text-[8px] font-bold uppercase px-2.5 py-1 rounded cursor-pointer"
                  >
                    In
                  </button>
                )}
                {todayAttendance && (todayAttendance.checkInTime || todayAttendance.checkInAt) && (!todayAttendance.checkOutTime && !todayAttendance.checkOutAt) && (
                  <>
                    {!todayAttendance.lunchStartAt && (
                      <button
                        onClick={handleLunchStart}
                        disabled={loadingAttendance}
                        className="bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-800/40 text-[8px] font-bold uppercase px-2 py-1 rounded cursor-pointer flex items-center gap-1"
                      >
                        <FiCoffee size={10} /> Lunch
                      </button>
                    )}
                    {todayAttendance.lunchStartAt && !todayAttendance.lunchEndAt && (
                      <button
                        onClick={handleLunchEnd}
                        disabled={loadingAttendance}
                        className="bg-[#1f170d] text-[#f5c46c] border border-[#c89a54] text-[8px] font-bold uppercase px-2 py-1 rounded cursor-pointer animate-pulse flex items-center gap-1"
                      >
                        <FiCoffee size={10} /> {formatElapsed(lunchElapsed)}
                      </button>
                    )}
                    <button
                      onClick={handleCheckOut}
                      disabled={loadingAttendance}
                      className="bg-rose-950/90 hover:bg-rose-900 text-rose-400 border border-rose-900/40 text-[8px] font-bold uppercase px-2.5 py-1 rounded cursor-pointer"
                    >
                      Out
                    </button>
                  </>
                )}
                {todayAttendance && (todayAttendance.checkOutTime || todayAttendance.checkOutAt) && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="bg-emerald-950/90 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/40 text-[8px] font-bold uppercase px-2.5 py-1 rounded cursor-pointer"
                  >
                    In
                  </button>
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
            <NotificationDropdown compact />
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
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden" style={{ background: 'var(--crm-bg)' }}>
          {/* Buffer spacer block to balance mobile fixed top bar overlay */}
          <div className="md:hidden h-[57px]" />

          {/* Desktop utility bar */}
          <div
            className="hidden md:flex items-center justify-end gap-3 px-8 py-3 border-b"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            {user && (
              <div className="flex items-center gap-2 mr-4 font-mono">
                {(!todayAttendance || (!todayAttendance.checkInTime && !todayAttendance.checkInAt)) && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <FiLogIn size={12} /> Check In
                  </button>
                )}

                {todayAttendance && (todayAttendance.checkInTime || todayAttendance.checkInAt) && (!todayAttendance.checkOutTime && !todayAttendance.checkOutAt) && (
                  <>
                    {/* Lunch Break Controls */}
                    {!todayAttendance.lunchStartAt && (
                      <button
                        onClick={handleLunchStart}
                        disabled={loadingAttendance}
                        className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer shadow-sm disabled:opacity-50"
                        title="Start Lunch Break"
                      >
                        <FiCoffee size={12} /> Lunch Break
                      </button>
                    )}

                    {todayAttendance.lunchStartAt && !todayAttendance.lunchEndAt && (
                      <button
                        onClick={handleLunchEnd}
                        disabled={loadingAttendance}
                        className="flex items-center gap-1.5 bg-[#1f170d] hover:bg-[#2a1f11] border border-[#c89a54] text-[#f5c46c] text-[10px] font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer shadow-md animate-pulse disabled:opacity-50"
                        title="Click to end lunch break and return to work"
                      >
                        <FiCoffee size={12} /> BACK TO WORK <span className="font-bold text-amber-200">{formatElapsed(lunchElapsed)}</span>
                      </button>
                    )}

                    {todayAttendance.lunchEndAt && (
                      <span
                        className="text-[10px] font-mono text-amber-300/90 bg-amber-950/40 border border-amber-900/40 px-2.5 py-1 rounded flex items-center gap-1"
                        title={`Lunch break taken: ${todayAttendance.lunchDurationMinutes || 0} min`}
                      >
                        <FiCoffee size={10} /> Lunch ({todayAttendance.lunchDurationMinutes || 0}m)
                      </span>
                    )}

                    {/* Check Out Button */}
                    <button
                      onClick={handleCheckOut}
                      disabled={loadingAttendance}
                      className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <FiLogOut size={12} /> Check Out
                    </button>
                  </>
                )}

                {todayAttendance && (todayAttendance.checkOutTime || todayAttendance.checkOutAt) && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer shadow-sm disabled:opacity-50"
                    title="Click to check in again"
                  >
                    <FiLogIn size={12} /> Check In
                  </button>
                )}
              </div>
            )}
            <NotificationDropdown />
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

          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 pt-6 md:pt-8 min-w-0">
            <div className="max-w-7xl mx-auto min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>
      <AiChatMessenger />
    </div>
  );
}