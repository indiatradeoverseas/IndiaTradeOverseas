import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiX,
  FiLogOut,
  FiLayers,
  FiChevronRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { notificationsApi } from '../../api/notifications';
import { processNotifications } from '../../utils/notificationStorage';
import {
  getCrmMainNavItems,
  getCrmAdminNavItems,
  shouldShowCrmAdminMenu
} from '../../config/crmNav';

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [manualToggle, setManualToggle] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function checkNotifications() {
      try {
        const res = await notificationsApi.getNotifications();
        if (res?.success && res.data?.notifications) {
          const processed = processNotifications(res.data.notifications);
          const unread = processed.filter(n => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (e) {
        // quiet fallback
      }
    }
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = getCrmMainNavItems(user);
  const adminMenuItems = getCrmAdminNavItems(user);
  const showAdminMenu = shouldShowCrmAdminMenu(user);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const isNavItemActive = (item) => {
    const currentPath = location.pathname;
    const currentSearch = location.search || '';

    if (item.to.includes('?')) {
      const [itemPath, itemSearch] = item.to.split('?');
      if (currentPath !== itemPath) return false;
      const currentParams = new URLSearchParams(currentSearch);
      const itemParams = new URLSearchParams(itemSearch);
      
      for (let [k, v] of itemParams.entries()) {
        if (currentParams.get(k) !== v) return false;
      }
      return true;
    }

    if (currentSearch.includes('tab=')) {
      return false;
    }

    return currentPath === item.to || (item.to !== '/crm' && currentPath.startsWith(`${item.to}/`));
  };

  // Staggered cascade for nav sections, mirroring the mobile Navbar menu entrance
  const navSection = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } }
  };

  const navItem = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <aside
      className="flex h-full w-full select-none flex-col overflow-hidden border-r"
      style={{
        fontFamily: 'var(--crm-font-body)',
        background: 'linear-gradient(180deg, var(--crm-nav-bg) 0%, var(--crm-nav-bg-to) 100%)',
        color: 'var(--crm-ink-soft)',
        borderColor: 'var(--crm-line)'
      }}
    >
      {/* Sidebar Header Block */}
      <div
        className="flex min-h-[92px] items-center justify-between gap-3 border-b px-4 py-4 sm:px-5"
        style={{ borderColor: 'var(--crm-line)' }}
      >
        <div className="min-w-0 flex-1 text-left">
          <h1
            className="truncate text-[15px] font-semibold uppercase tracking-[0.08em]"
            style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}
          >
            India Trade Center
          </h1>
          <p
            className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em]"
            style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-accent)' }}
          >
            <span>Role</span><span style={{ color: 'var(--crm-heading)' }}>· {user?.role || 'USER'}</span>{user?.department && <><span>·</span><span>{user.department}</span></>}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer"
            style={{ color: 'var(--crm-ink-faint)', borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}
            aria-label="Close Sidebar"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      <div className="px-3 pt-3">
        <div
          className="rounded-xl border px-3 py-2.5"
          style={{
            borderColor: 'var(--crm-line)',
            background: 'var(--crm-bg-sunken)'
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div
                className="truncate text-[10px] font-semibold"
                style={{ color: 'var(--crm-heading)' }}
              >
                {user?.name || user?.fullName || user?.email || 'Authenticated user'}
              </div>
              <div
                className="mt-0.5 truncate text-[9px] uppercase tracking-[0.12em]"
                style={{ color: 'var(--crm-ink-faint)' }}
              >
                {user?.department || 'CRM'} workspace
              </div>
            </div>
            <FiLayers
              size={15}
              className="shrink-0"
              style={{ color: 'var(--crm-accent)' }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Stream Matrix */}
      <nav className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:py-5">
        {/* Main Section */}
        <motion.div variants={navSection} initial="hidden" animate="visible" className="space-y-1.5">
          <div className="mb-2 px-3 text-left">
            <p
              className="text-[9px] font-bold uppercase tracking-[0.2em]"
              style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}
            >
              Workspace
            </p>
          </div>
          {menuItems.map((item) => {
            const isActive = isNavItemActive(item);

            if (item.children && item.children.length > 0) {
              const routeActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              const isOpen = manualToggle[item.to] ?? routeActive;

              return (
                <motion.div key={item.to} variants={navItem} className="space-y-1.5">
                  <div
                    className="flex items-center rounded-xl border transition-all duration-200"
                    style={{ background: routeActive ? 'var(--crm-accent-bg)' : 'transparent', borderColor: routeActive ? 'color-mix(in srgb, var(--crm-accent) 30%, var(--crm-line))' : 'transparent' }}
                  >
                    <NavLink
                      to={item.to}
                      end
                      onClick={onClose}
                      className="group relative flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
                    >
                      <item.icon
                        size={15}
                        style={{ color: routeActive ? 'var(--crm-accent)' : 'var(--crm-ink-faint)' }}
                        className="transition-colors group-hover:opacity-100 shrink-0"
                      />
                      <span
                        className="truncate"
                        style={{ color: routeActive ? 'var(--crm-heading)' : 'var(--crm-ink-soft)' }}
                      >
                        {item.label}
                      </span>
                      {routeActive && (
                        <motion.span
                          layoutId="activeIndicator"
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                          style={{ background: 'var(--crm-accent)' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        />
                      )}
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => setManualToggle((prev) => ({ ...prev, [item.to]: !isOpen }))}
                      className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors"
                      style={{ color: 'var(--crm-ink-faint)' }}
                      aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.label}`}
                      aria-expanded={isOpen}
                    >
                      <motion.span
                        animate={{ rotate: isOpen ? 90 : 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex"
                      >
                        <FiChevronRight size={13} />
                      </motion.span>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="ml-5 overflow-hidden border-l pl-3"
                        style={{ borderColor: 'var(--crm-line)' }}
                      >
                        <motion.div variants={navSection} initial="hidden" animate="visible" className="space-y-1 py-1.5">
                          {item.children.map((child) => {
                            const childActive = isNavItemActive(child);
                            return (
                              <motion.div key={child.to} variants={navItem}>
                                <NavLink
                                  to={child.to}
                                  onClick={onClose}
                                  className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.05em] transition-all duration-200 ${
                                    childActive
                                      ? 'bg-[var(--crm-accent-bg)] text-[var(--crm-heading)] font-semibold'
                                      : 'text-[var(--crm-ink-faint)] hover:bg-[var(--crm-bg-raised)] hover:text-[var(--crm-ink)]'
                                  }`}
                                >
                                  <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                                    style={{ background: child.dotColor || 'var(--crm-accent)' }}
                                  />
                                  <span className="min-w-0 flex-1 truncate">{child.label}</span>
                                  {childActive && (
                                    <span
                                      className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-full"
                                      style={{ background: 'var(--crm-accent)' }}
                                    />
                                  )}
                                </NavLink>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            }

            return (
              <motion.div key={item.to} variants={navItem}>
                <NavLink
                  to={item.to}
                  onClick={onClose}
                  className={`group relative flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-all duration-200 ${
                    isActive
                      ? 'border-[var(--crm-line)] bg-[var(--crm-accent-bg)] text-[var(--crm-heading)]'
                      : 'border-transparent text-[var(--crm-ink-soft)] hover:border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] hover:text-[var(--crm-ink)]'
                  }`}
                >
                  <item.icon
                    size={15}
                    style={{ color: isActive ? 'var(--crm-accent)' : 'var(--crm-ink-faint)' }}
                    className="shrink-0 transition-colors group-hover:opacity-100"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.to === '/crm/notifications' && unreadCount > 0 && (
                    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="activeIndicator"
                      className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                      style={{ background: 'var(--crm-accent)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    />
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Administration Section */}
        {showAdminMenu && (
          <motion.div variants={navSection} initial="hidden" animate="visible" className="space-y-1.5">
            <div className="mb-2 px-3 text-left">
              <p
                className="text-[9px] font-bold uppercase tracking-[0.2em]"
                style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}
              >
                Administration
              </p>
            </div>
            {adminMenuItems.map((item) => {
              const isActive = isNavItemActive(item);
              return (
                <motion.div key={item.to} variants={navItem}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={`group relative flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-all duration-200 ${
                      isActive
                        ? 'border-[var(--crm-line)] bg-[var(--crm-accent-bg)] text-[var(--crm-heading)]'
                        : 'border-transparent text-[var(--crm-ink-soft)] hover:border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] hover:text-[var(--crm-ink)]'
                    }`}
                  >
                    <item.icon
                      size={15}
                      style={{ color: isActive ? 'var(--crm-accent)' : 'var(--crm-ink-faint)' }}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="activeIndicator"
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                        style={{ background: 'var(--crm-accent)' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      />
                    )}
                  </NavLink>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Action Bottom Section Layer */}
        <div className="mt-1 border-t px-1 pt-3" style={{ borderColor: 'var(--crm-line)' }}>
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] transition-all cursor-pointer hover:border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)]"
            style={{ color: 'var(--crm-danger)' }}
          >
            <FiLogOut size={15} className="opacity-80 group-hover:opacity-100 transition-opacity" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
