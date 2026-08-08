import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiX,
  FiLogOut,
  FiLayers,
  FiChevronDown,
  FiChevronRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  getCrmMainNavItems,
  getCrmDepartmentLinks,
  getCrmAdminNavItems,
  shouldShowCrmAdminMenu
} from '../../config/crmNav';

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDeptExpanded, setIsDeptExpanded] = useState(false);

  const menuItems = getCrmMainNavItems(user);
  const departments = getCrmDepartmentLinks();
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
        <div className="space-y-1">
          <div className="px-4 mb-2 text-left">
            <p
              className="text-[9px] uppercase tracking-[0.25em] font-bold"
              style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}
            >
              Main Core
            </p>
          </div>
          {menuItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
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
          ))}
        </div>

        {/* Department Section */}
        <div className="space-y-1">
          <button
            onClick={() => setIsDeptExpanded(!isDeptExpanded)}
            className="flex items-center justify-between w-full px-4 py-2 text-left text-[9px] font-bold uppercase tracking-[0.25em] transition-colors cursor-pointer"
            style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}
          >
            <span>Department</span>
            {isDeptExpanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
          </button>

          <AnimatePresence>
            {isDeptExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-1 pl-3"
              >
                {departments.map((dept) => (
                  <NavLink key={dept.to} to={dept.to} onClick={onClose} className={linkClass}>
                    {({ isActive }) => (
                      <>
                        <FiLayers
                          size={13}
                          style={{ color: isActive ? 'var(--crm-accent)' : 'var(--crm-ink-faint)' }}
                        />
                        <span className="text-[11px]">{dept.label}</span>
                        {isActive && (
                          <span
                            className="absolute right-0 top-1 bottom-1 w-[2.5px] rounded-l-full"
                            style={{ background: 'var(--crm-accent)' }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Administration Section */}
        {showAdminMenu && (
          <div className="space-y-1">
            <div className="px-4 mb-2 text-left">
              <p
                className="text-[9px] uppercase tracking-[0.25em] font-bold"
                style={{ fontFamily: 'var(--crm-font-mono)', color: 'var(--crm-ink-faint)' }}
              >
                Administration
              </p>
            </div>
            {adminMenuItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
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
            ))}
          </div>
        )}

        {/* Action Bottom Section Layer */}
        <div className="pt-4 border-t px-1" style={{ borderColor: 'var(--crm-line)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-md font-medium text-xs uppercase tracking-wider transition-colors text-left cursor-pointer group"
            style={{ color: 'var(--crm-danger)' }}
          >
            <FiLogOut size={15} className="opacity-80 group-hover:opacity-100 transition-opacity" />
            <span>Terminate Session</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
