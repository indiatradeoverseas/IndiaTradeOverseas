import React, { useState } from 'react';
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

  const menuItems = getCrmMainNavItems(user);
  const adminMenuItems = getCrmAdminNavItems(user);
  const showAdminMenu = shouldShowCrmAdminMenu(user);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-md text-xs font-medium tracking-wide uppercase transition-all duration-200 relative group ${
      isActive
        ? 'bg-[var(--crm-accent-bg)] text-[var(--crm-heading)] font-semibold'
        : 'text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-raised)] hover:text-[var(--crm-ink)]'
    }`;

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
      className="h-full w-full flex flex-col select-none border-r"
      style={{
        fontFamily: 'var(--crm-font-body)',
        background: 'linear-gradient(180deg, var(--crm-nav-bg) 0%, var(--crm-nav-bg-to) 100%)',
        color: 'var(--crm-ink-soft)',
        borderColor: 'var(--crm-line)'
      }}
    >
      {/* Sidebar Header Block */}
      <div
        className="p-6 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--crm-line)' }}
      >
        <div className="text-left">
          <h1
            className="text-lg font-normal uppercase tracking-wide"
            style={{ fontFamily: 'var(--crm-font-display)', color: 'var(--crm-heading)' }}
          >
            India Trade Center
          </h1>
          <p
            className="text-[9px] font-bold mt-1.5 uppercase tracking-[0.2em]"
            style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-accent)' }}
          >
            Role // {user?.role}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-sm p-1.5 transition-all cursor-pointer"
            style={{ color: 'var(--crm-ink-faint)' }}
            aria-label="Close Sidebar"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* Navigation Stream Matrix */}
      <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar space-y-6 px-3">
        {/* Main Section */}
        <motion.div variants={navSection} initial="hidden" animate="visible" className="space-y-1">
          <div className="px-4 mb-2 text-left">
            <p
              className="text-[9px] uppercase tracking-[0.25em] font-bold"
              style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}
            >
              Main Core
            </p>
          </div>
          {menuItems.map((item) => {
            if (item.children && item.children.length > 0) {
              const routeActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              const isOpen = manualToggle[item.to] ?? routeActive;

              return (
                <motion.div key={item.to} variants={navItem} className="space-y-1">
                  <div
                    className="flex items-center rounded-md transition-colors duration-200"
                    style={{ background: routeActive ? 'var(--crm-accent-bg)' : 'transparent' }}
                  >
                    <NavLink
                      to={item.to}
                      end
                      onClick={onClose}
                      className="flex-1 flex items-center space-x-3 px-4 py-3 text-xs font-medium tracking-wide uppercase relative group min-w-0"
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            size={16}
                            style={{ color: isActive ? 'var(--crm-accent)' : 'var(--crm-ink-faint)' }}
                            className="transition-colors group-hover:opacity-100 shrink-0"
                          />
                          <span
                            className="truncate"
                            style={{ color: isActive ? 'var(--crm-heading)' : 'var(--crm-ink-soft)' }}
                          >
                            {item.label}
                          </span>
                          {isActive && (
                            <motion.span
                              layoutId="activeIndicator"
                              className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full"
                              style={{ background: 'var(--crm-accent)' }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => setManualToggle((prev) => ({ ...prev, [item.to]: !isOpen }))}
                      className="px-3 py-3 cursor-pointer transition-colors"
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
                        className="overflow-hidden ml-[26px] pl-3 border-l"
                        style={{ borderColor: 'var(--crm-line)' }}
                      >
                        <motion.div variants={navSection} initial="hidden" animate="visible" className="space-y-1 py-1">
                          {item.children.map((child) => (
                            <motion.div key={child.to} variants={navItem}>
                              <NavLink
                                to={child.to}
                                onClick={onClose}
                                className={({ isActive }) =>
                                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-medium tracking-wide uppercase transition-all duration-200 relative group ${
                                    isActive
                                      ? 'bg-[var(--crm-accent-bg)] text-[var(--crm-heading)] font-semibold'
                                      : 'text-[var(--crm-ink-faint)] hover:bg-[var(--crm-bg-raised)] hover:text-[var(--crm-ink)]'
                                  }`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ background: child.dotColor || 'var(--crm-accent)' }}
                                    />
                                    <span>{child.label}</span>
                                    {isActive && (
                                      <span
                                        className="absolute right-0 top-1 bottom-1 w-[2.5px] rounded-l-full"
                                        style={{ background: 'var(--crm-accent)' }}
                                      />
                                    )}
                                  </>
                                )}
                              </NavLink>
                            </motion.div>
                          ))}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            }

            return (
              <motion.div key={item.to} variants={navItem}>
                <NavLink to={item.to} className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={16}
                        style={{ color: isActive ? 'var(--crm-accent)' : 'var(--crm-ink-faint)' }}
                        className="transition-colors group-hover:opacity-100"
                      />
                      <span>{item.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="activeIndicator"
                          className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full"
                          style={{ background: 'var(--crm-accent)' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Administration Section */}
        {showAdminMenu && (
          <motion.div variants={navSection} initial="hidden" animate="visible" className="space-y-1">
            <div className="px-4 mb-2 text-left">
              <p
                className="text-[9px] uppercase tracking-[0.25em] font-bold"
                style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}
              >
                Administration
              </p>
            </div>
            {adminMenuItems.map((item) => (
              <motion.div key={item.to} variants={navItem}>
              <NavLink to={item.to} className={linkClass}>
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={16}
                      style={{ color: isActive ? 'var(--crm-accent)' : 'var(--crm-ink-faint)' }}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="activeIndicator"
                        className="absolute right-0 top-2 bottom-2 w-[3px] rounded-l-full"
                        style={{ background: 'var(--crm-accent)' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Action Bottom Section Layer */}
        <div className="pt-4 border-t px-1" style={{ borderColor: 'var(--crm-line)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-md font-medium text-xs uppercase tracking-wider transition-colors text-left cursor-pointer group"
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
