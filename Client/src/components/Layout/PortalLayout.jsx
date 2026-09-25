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
      className={`crm-portal min-h-screen antialiased overflow-x-hidden ${theme === 'light' ? 'light-theme' : ''}`}
      style={{ background: 'var(--crm-bg)', color: 'var(--crm-ink-soft)', fontFamily: 'var(--crm-font-body)' }}
    >

      {/* MOBILE TOP BAR */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-[52] border-b shadow-sm backdrop-blur-xl"
        style={{ background: 'color-mix(in srgb, var(--crm-nav-bg) 94%, transparent)', borderColor: 'var(--crm-line)' }}
      >
        <div className="flex min-h-[54px] items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            className="inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border transition duration-200 focus:outline-none cursor-pointer"
            style={{ color: 'var(--crm-ink)', borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
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
                {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </motion.span>
            </AnimatePresence>
          </button>

          <div
            className="min-w-0 flex-1 truncate text-center text-[10px] sm:text-[12px] font-semibold uppercase tracking-wider sm:tracking-[0.14em] px-1"
            style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}
          >
            <span className="hidden sm:inline">India Trade Center</span>
            <span className="sm:hidden font-mono font-bold tracking-widest text-[11px] text-[var(--crm-accent)]">INDIA TRADE</span>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
            {user && (
              <div className="flex items-center gap-1 font-mono shrink-0">
                {(!todayAttendance || (!todayAttendance.checkInTime && !todayAttendance.checkInAt)) && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="bg-emerald-950/90 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/40 text-[8px] font-bold uppercase px-2 py-1 rounded cursor-pointer whitespace-nowrap shadow-sm"
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
                        className="bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-800/40 text-[8px] font-bold uppercase px-1.5 py-1 rounded cursor-pointer flex items-center gap-0.5 whitespace-nowrap"
                      >
                        <FiCoffee size={9} /> Lunch
                      </button>
                    )}
                    {todayAttendance.lunchStartAt && !todayAttendance.lunchEndAt && (
                      <button
                        onClick={handleLunchEnd}
                        disabled={loadingAttendance}
                        className="bg-[#1f170d] text-[#f5c46c] border border-[#c89a54] text-[8px] font-bold uppercase px-1.5 py-1 rounded cursor-pointer animate-pulse flex items-center gap-0.5 whitespace-nowrap"
                      >
                        <FiCoffee size={9} /> {formatElapsed(lunchElapsed)}
                      </button>
                    )}
                    <button
                      onClick={handleCheckOut}
                      disabled={loadingAttendance}
                      className="bg-rose-950/90 hover:bg-rose-900 text-rose-400 border border-rose-900/40 text-[8px] font-bold uppercase px-2 py-1 rounded cursor-pointer whitespace-nowrap shadow-sm"
                    >
                      Out
                    </button>
                  </>
                )}
                {todayAttendance && (todayAttendance.checkOutTime || todayAttendance.checkOutAt) && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="bg-emerald-950/90 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/40 text-[8px] font-bold uppercase px-2 py-1 rounded cursor-pointer whitespace-nowrap shadow-sm"
                  >
                    In
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md border text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] transition cursor-pointer shrink-0"
              style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <FiMoon size={15} /> : <FiSun size={15} />}
            </button>
            <NotificationDropdown compact />
            <VoiceStatusPill compact />
          </div>
        </div>
      </div>

      <div className="flex min-h-screen md:h-screen">

        {/* PORTAL SIDEBAR BRAND CONTEXT CONTAINER */}
        <div
          className={`fixed inset-y-0 left-0 z-[60] w-64 sm:w-72 transform border-r transition-all duration-300 ease-in-out shadow-2xl md:sticky md:top-0 md:h-screen md:flex-shrink-0 md:translate-x-0 md:shadow-none ${
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
        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden md:h-screen" style={{ background: 'var(--crm-bg)' }}>
          {/* Buffer spacer block to balance mobile fixed top bar overlay */}
          <div className="md:hidden h-[60px] shrink-0" />

          {/* Desktop utility bar */}
          <div
            className="hidden md:flex min-h-[56px] shrink-0 items-center justify-between gap-4 border-b px-5 lg:px-8 py-2.5 backdrop-blur-xl"
            style={{ borderColor: 'var(--crm-line)', background: 'color-mix(in srgb, var(--crm-bg-raised) 94%, transparent)' }}
          >
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--crm-accent)' }}>
                India Trade Overseas
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: 'var(--crm-ink-faint)' }}>
                <span className="font-semibold" style={{ color: 'var(--crm-heading)' }}>CRM Workspace</span>
                {user && <span className="hidden lg:inline">· {user.department || user.role || 'Authenticated user'}</span>}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
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
          </div>

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5 sm:py-6 md:px-6 md:py-7 lg:px-8 scroll-smooth">
            <div className="mx-auto w-full max-w-[1800px] min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>
      <AiChatMessenger />
    </div>
  );
}