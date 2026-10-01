import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiMenu, FiX, FiSun, FiMoon, FiLogIn, FiLogOut, FiCoffee, FiSearch, FiAlertCircle } from 'react-icons/fi';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import VoiceStatusPill from './VoiceStatusPill';
import NotificationDropdown from '../common/NotificationDropdown';
import AiChatMessenger from '../common/AiChatMessenger';
import ItcLogo, { ItcLogoBadge } from '../common/ItcLogo';
import { useAuth } from '../../hooks/useAuth';
import { attendanceApi } from '../../api/attendance';
import toast from 'react-hot-toast';

export default function PortalLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('crm-theme') || 'dark');
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const isTransportManagerRoute = location.pathname === '/crm/transport/manager' || location.pathname === '/transport/manager';
  const effectiveTheme = theme;

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

  const triggerSearch = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      ctrlKey: true,
      bubbles: true
    });
    window.dispatchEvent(event);
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
      className={`crm-portal min-h-screen flex flex-col antialiased overflow-x-hidden ${effectiveTheme === 'light' ? 'light-theme' : 'dark'} ${isTransportManagerRoute ? 'transport-shell-layout' : ''}`}
      style={{ background: 'var(--crm-bg)', color: 'var(--crm-ink-soft)', fontFamily: 'var(--crm-font-body)' }}
    >
      {/* TOP HEADER NAVBAR */}
      <header
        className="sticky top-0 z-[52] w-full h-[62px] border-b flex items-center justify-between px-3 sm:px-6 backdrop-blur-xl shrink-0 transition-colors duration-200"
        style={{
          background: effectiveTheme === 'light' ? '#FFFFFF' : '#000000ff',
          borderColor: effectiveTheme === 'light' ? '#E2E8F0' : '#01050bff'
        }}
      >
        {/* MOBILE HEADER BAR (Clean Icon Buttons without Background Box) */}
        <div className="flex md:hidden items-center justify-between w-full px-1 py-1.5 transition-colors duration-200">
          {/* Left: Hamburger Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            className="inline-flex items-center justify-center p-1.5 text-slate-800 dark:text-slate-100 hover:opacity-80 transition cursor-pointer bg-transparent border-0"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            <FiMenu size={20} className="text-slate-800 dark:text-slate-100" />
          </button>

          {/* Center: INDIA TRADE CENTER text */}
          <div className="flex items-center justify-center text-center px-1 shrink-0">
            <span
              className="font-serif font-black uppercase text-[11px] sm:text-[14px] tracking-wide whitespace-nowrap itc-brand-title"
              style={{ fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif", fontWeight: 900 }}
            >
              INDIA TRADE CENTER
            </span>
          </div>

          {/* Right: Actions [IN/OUT Badge] [Theme] [Bell] [Alert] */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile Check-In / Lunch / Check-Out Button (Compact [IN] / [OUT] Badge matching Reference) */}
            {user && (
              <div className="flex items-center shrink-0">
                {(!todayAttendance || (!todayAttendance.checkInTime && !todayAttendance.checkInAt)) && (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="px-2 py-0.5 rounded border border-emerald-500/80 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    title="Click to Check In"
                  >
                    {loadingAttendance ? '...' : 'IN'}
                  </button>
                )}

                {todayAttendance && (todayAttendance.checkInTime || todayAttendance.checkInAt) && (!todayAttendance.checkOutTime && !todayAttendance.checkOutAt) && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!todayAttendance.lunchStartAt && (
                      <button
                        type="button"
                        onClick={handleLunchStart}
                        disabled={loadingAttendance}
                        className="px-1.5 py-0.5 rounded border border-amber-500/80 text-amber-600 dark:text-amber-400 font-bold text-[10px] tracking-wider bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                        title="Start Lunch Break"
                      >
                        ☕ LUNCH
                      </button>
                    )}

                    {todayAttendance.lunchStartAt && !todayAttendance.lunchEndAt && (
                      <button
                        type="button"
                        onClick={handleLunchEnd}
                        disabled={loadingAttendance}
                        className="px-1.5 py-0.5 rounded border border-amber-500/80 text-amber-500 font-mono font-bold text-[10px] bg-amber-500/20 animate-pulse active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                        title="End Lunch Break"
                      >
                        ☕ {formatElapsed(lunchElapsed)}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCheckOut}
                      disabled={loadingAttendance}
                      className="px-2 py-0.5 rounded border border-rose-500/80 text-rose-600 dark:text-rose-400 font-bold text-[11px] tracking-wider bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                      title="Click to Check Out"
                    >
                      OUT
                    </button>
                  </div>
                )}

                {todayAttendance && (todayAttendance.checkOutTime || todayAttendance.checkOutAt) && (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="px-2 py-0.5 rounded border border-emerald-500/80 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    title="Click to Check In again"
                  >
                    {loadingAttendance ? '...' : 'IN'}
                  </button>
                )}
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center p-1 text-slate-700 dark:text-slate-200 hover:opacity-80 transition cursor-pointer bg-transparent border-0"
              aria-label="Toggle Theme"
            >
              {effectiveTheme === 'light' ? <FiMoon size={18} className="text-slate-700 dark:text-slate-200" /> : <FiSun size={18} className="text-amber-400" />}
            </button>

            {/* Notification Dropdown */}
            <NotificationDropdown compact />

            {/* Alert Icon Button */}
            <button
              type="button"
              className="inline-flex items-center justify-center p-1 text-[#FF4D4F] dark:text-rose-400 hover:opacity-80 transition cursor-pointer bg-transparent border-0"
              title="Alerts"
            >
              <FiAlertCircle size={18} className="text-[#FF4D4F] dark:text-rose-400" />
            </button>
          </div>
        </div>

        {/* DESKTOP HEADER BAR (Visible on screens >= md) */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <ItcLogo showText={true} size="md" />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user && (
              <div className="hidden sm:flex items-center gap-2 font-mono shrink-0">
                {(!todayAttendance || (!todayAttendance.checkInTime && !todayAttendance.checkInAt)) && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <FiLogIn size={12} /> Check In
                  </button>
                )}

                {todayAttendance && (todayAttendance.checkInTime || todayAttendance.checkInAt) && (!todayAttendance.checkOutTime && !todayAttendance.checkOutAt) && (
                  <>
                    {!todayAttendance.lunchStartAt && (
                      <button
                        onClick={handleLunchStart}
                        disabled={loadingAttendance}
                        className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                        title="Start Lunch Break"
                      >
                        <FiCoffee size={12} /> Lunch
                      </button>
                    )}

                    {todayAttendance.lunchStartAt && !todayAttendance.lunchEndAt && (
                      <button
                        onClick={handleLunchEnd}
                        disabled={loadingAttendance}
                        className="flex items-center gap-1.5 bg-[#1f170d] hover:bg-[#2a1f11] border border-[#c89a54] text-[#f5c46c] text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer shadow-md animate-pulse disabled:opacity-50"
                        title="Click to end lunch break and return to work"
                      >
                        <FiCoffee size={12} /> BACK TO WORK <span className="font-bold text-amber-200">{formatElapsed(lunchElapsed)}</span>
                      </button>
                    )}

                    <button
                      onClick={handleCheckOut}
                      disabled={loadingAttendance}
                      className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <FiLogOut size={12} /> Check Out
                    </button>
                  </>
                )}

                {todayAttendance && (todayAttendance.checkOutTime || todayAttendance.checkOutAt) && (
                  <button
                    onClick={handleCheckIn}
                    disabled={loadingAttendance}
                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <FiLogIn size={12} /> Check In
                  </button>
                )}
              </div>
            )}

            {/* Theme Switcher Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] transition cursor-pointer shrink-0"
              style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {effectiveTheme === 'light' ? <FiMoon size={16} /> : <FiSun size={16} />}
            </button>

            {/* Notifications Dropdown */}
            <NotificationDropdown />

            {/* Indian Flag Badge */}
            <div
              className="flex items-center justify-center px-2 py-1 rounded-md border border-slate-300/40 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 shadow-2xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              title="India (IN)"
            >
              <svg className="w-5 h-3.5 rounded-[1px] shadow-2xs" viewBox="0 0 640 480">
                <path fill="#f93" d="M0 0h640v160H0z"/>
                <path fill="#fff" d="M0 160h640v160H0z"/>
                <path fill="#128807" d="M0 320h640v160H0z"/>
                <g transform="translate(320 240)">
                  <circle r="60" fill="none" stroke="#008" strokeWidth="6"/>
                  <circle r="12" fill="#008"/>
                  <path stroke="#008" strokeWidth="3" d="M0-60V60M-60 0H60M-42.4-42.4l84.8 84.8M-42.4 42.4l84.8-84.8M-55.4-23l110.8 46M-55.4 23l110.8-46M-23-55.4l46 110.8M23-55.4l-46 110.8"/>
                </g>
              </svg>
            </div>

            <VoiceStatusPill />
            <CommandPalette />
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT BODY */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden relative">
        {/* PORTAL SIDEBAR */}
        <div
          className={`fixed inset-y-0 left-0 z-[60] w-64 sm:w-72 transform border-r transition-all duration-300 ease-in-out shadow-2xl md:sticky md:top-0 md:h-[calc(100vh-62px)] md:flex-shrink-0 md:translate-x-0 md:shadow-none ${
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden h-[calc(100vh-62px)]" style={{ background: 'var(--crm-bg)' }}>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 sm:px-5 sm:py-6 md:px-6 md:py-7 lg:px-8 scroll-smooth">
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
