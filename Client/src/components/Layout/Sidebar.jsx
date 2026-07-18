import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';
import {
  FiLayout,
  FiUsers,
  FiFileText,
  FiTruck,
  FiDollarSign,
  FiFolder,
  FiShield,
  FiBarChart2,
  FiSettings,
  FiX,
  FiPackage,
  FiCheckSquare,
  FiBell,
  FiBriefcase,
  FiLogOut
} from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { to: '/crm/dashboard', label: 'Dashboard', icon: FiLayout },
    { to: '/crm/notifications', label: 'Notifications', icon: FiBell },
    (user?.role === 'ADMIN' || user?.taskPermission === true) && { to: '/crm/tasks', label: 'My Tasks', icon: FiCheckSquare },
    (user?.role === 'ADMIN' || user?.leadPermission === true) && { to: '/crm/leads', label: 'Leads', icon: FiUsers },
    { to: '/crm/products', label: 'Products', icon: FiPackage },
    { to: '/crm/quotations', label: 'Quotations', icon: FiFileText },
    { to: '/crm/dispatches', label: 'Dispatches', icon: FiTruck },
    { to: '/crm/payments', label: 'Payments', icon: FiDollarSign },
    (user?.role === 'ADMIN' || user?.documentPermission === true) && { to: '/crm/documents', label: 'Documents', icon: FiFolder },
    { to: '/crm/distributors', label: 'Distributors', icon: FiBriefcase }
  ].filter(Boolean);

  const adminMenuItems = [
    (user?.role === 'ADMIN' || user?.role === 'MANAGER') && { to: '/crm/admin', label: 'Admin Panel', icon: FiSettings },
    (user?.role === 'ADMIN' || user?.role === 'MANAGER') && { to: '/crm/employees', label: 'Employees', icon: FiUsers },
    { to: '/crm/applications', label: 'Job Applications', icon: FiFileText },
    (user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR' || user?.jobPermission === true) && { to: '/crm/jobs', label: 'Manage Jobs', icon: FiBriefcase },
    (user?.role === 'ADMIN' || user?.role === 'MANAGER') && { to: '/crm/security', label: 'Security', icon: FiShield },
    (user?.role === 'ADMIN' || user?.role === 'MANAGER') && { to: '/crm/reports', label: 'Reports', icon: FiBarChart2 },
  ].filter(Boolean);

  const showAdminMenu = ['ADMIN', 'MANAGER', 'HR'].includes(user?.role) || user?.jobPermission === true;

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  return (
    <aside className="h-full w-full bg-[#040A12] text-[#C5CBD3] flex flex-col font-sans select-none border-r border-[#C5CBD3]/10">
      
      {/* Sidebar Header Block */}
      <div className="p-6 border-b border-[#C5CBD3]/10 flex items-center justify-between bg-[#0E1116]/30">
        <div className="text-left">
          <h1 className="text-lg font-serif font-normal text-[#F2F4F7] uppercase tracking-wide">
            India Trade Center
          </h1>
          <p className="text-[9px] font-mono font-bold text-[#6D7886] mt-1.5 uppercase tracking-[0.2em]">
            SYSTEM ROLE // {user?.role}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-sm p-1.5 text-[#6D7886] hover:bg-[#121D29] hover:text-[#F2F4F7] transition-all cursor-pointer"
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
            <p className="text-[9px] font-mono text-[#6D7886] uppercase tracking-[0.25em] font-bold">Main Core</p>
          </div>
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-sm text-xs font-medium tracking-wide uppercase transition-all relative group ${
                  isActive 
                    ? 'bg-[#121D29] text-[#F2F4F7] font-semibold shadow-inner' 
                    : 'text-[#C5CBD3] hover:bg-[#121D29]/40 hover:text-[#F2F4F7]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={16} className={isActive ? "text-[#F2F4F7]" : "text-[#6D7886] group-hover:text-[#C5CBD3] transition-colors"} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.span 
                      layoutId="activeIndicator"
                      className="absolute right-0 top-2 bottom-2 w-[3px] bg-[#F2F4F7] rounded-l-full"
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Administration Section */}
        {showAdminMenu && (
          <div className="space-y-1">
            <div className="px-4 mb-2 text-left">
              <p className="text-[9px] font-mono text-[#6D7886] uppercase tracking-[0.25em] font-bold">Administration</p>
            </div>
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-sm text-xs font-medium tracking-wide uppercase transition-all relative group ${
                    isActive 
                      ? 'bg-[#121D29] text-[#F2F4F7] font-semibold shadow-inner' 
                      : 'text-[#C5CBD3] hover:bg-[#121D29]/40 hover:text-[#F2F4F7]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} className={isActive ? "text-[#F2F4F7]" : "text-[#6D7886] group-hover:text-[#C5CBD3] transition-colors"} />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.span 
                        layoutId="activeIndicator"
                        className="absolute right-0 top-2 bottom-2 w-[3px] bg-[#F2F4F7] rounded-l-full"
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )}

        {/* Action Bottom Section Layer */}
        <div className="pt-4 border-t border-[#C5CBD3]/10 px-1">
          <button 
            onClick={handleLogout} 
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-sm text-red-400 hover:text-red-300 font-medium font-sans text-xs uppercase tracking-wider transition-colors hover:bg-red-950/20 text-left cursor-pointer group"
          >
            <FiLogOut size={15} className="text-red-400 opacity-80 group-hover:opacity-100 transition-opacity" /> 
            <span>Terminate Session</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}