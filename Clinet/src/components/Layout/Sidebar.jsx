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
  FiBell
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
    { to: '/crm/admin', label: 'Admin Panel', icon: FiSettings },
    { to: '/crm/employees', label: 'Employees', icon: FiUsers },
    { to: '/crm/security', label: 'Security', icon: FiShield },
    { to: '/crm/reports', label: 'Reports', icon: FiBarChart2 },
  ];

  return (
    <aside className="h-full bg-[#0f4c75] text-white flex flex-col">
      <div className="p-6 border-b border-[#144c7c] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">India Trade Center</h1>
          <p className="text-sm text-[#cbd5e1] mt-1">{user?.role}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-lg p-2 text-[#dbeafe] hover:bg-[#144c7c] hover:text-white transition"
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4">
        <div className="px-4 mb-2">
          <p className="text-xs text-[#a8c5dc] uppercase tracking-wider">Main</p>
        </div>
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-6 py-3 text-[#dbeafe] hover:bg-[#144c7c] hover:text-white transition-colors ${isActive ? 'bg-[#144c7c] text-white border-r-4 border-[#f5a524]' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <>
            <div className="px-4 mt-6 mb-2">
              <p className="text-xs text-[#a8c5dc] uppercase tracking-wider">Administration</p>
            </div>
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-6 py-3 text-[#dbeafe] hover:bg-[#144c7c] hover:text-white transition-colors ${isActive ? 'bg-[#144c7c] text-white border-r-4 border-[#f5a524]' : ''}`
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