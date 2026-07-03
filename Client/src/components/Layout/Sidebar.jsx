import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
  FiBriefcase
} from 'react-icons/fi';

export default function Sidebar({ onClose }) {
  const { user } = useAuth();

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

  return (
    <aside className="h-full bg-[#0B2D5B] text-[#FBF7EF] border-r border-[#C99B3B]/20 flex flex-col font-sans">
      <div className="p-6 border-b border-[#C99B3B]/20 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-bold text-white">India Trade Overseas</h1>
          <p className="text-xs text-[#C99B3B] mt-1 font-semibold uppercase tracking-wider">{user?.role}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-lg p-2 text-slate-350 hover:bg-[#102F60] hover:text-white transition"
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <div className="px-4 mb-2">
          <p className="text-xs text-[#C99B3B]/60 uppercase tracking-widest font-bold">Main</p>
        </div>
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-6 py-3 text-slate-300 hover:bg-[#102F60] hover:text-white transition-colors ${isActive ? 'bg-[#102F60] text-[#C99B3B] border-r-4 border-[#C99B3B] font-bold' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {showAdminMenu && (
          <>
            <div className="px-4 mt-6 mb-2">
              <p className="text-xs text-[#C99B3B]/60 uppercase tracking-widest font-bold">Administration</p>
            </div>
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-6 py-3 text-slate-300 hover:bg-[#102F60] hover:text-white transition-colors ${isActive ? 'bg-[#102F60] text-[#C99B3B] border-r-4 border-[#C99B3B] font-bold' : ''}`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}