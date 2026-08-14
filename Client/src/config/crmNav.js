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
  FiCheckSquare,
  FiBell,
  FiBriefcase,
  FiUserCheck,
  FiLifeBuoy,
  FiCalendar,
  FiUser,
  FiTrendingUp,
  FiUserPlus,
  FiAward
} from 'react-icons/fi';

// Local helper to identify admin accounts, ADMIN department, and admin position titles
function isAdminUser(user) {
  return (
    user?.role === 'ADMIN' ||
    user?.department === 'ADMIN' ||
    (user?.position && user.position.toLowerCase().includes('admin'))
  );
}

export function getCrmMainNavItems(user) {
  const adminBypass = isAdminUser(user);
  return [
    { to: '/crm/dashboard', label: 'Dashboard', icon: FiLayout },
    (adminBypass || ['MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role)) && { to: '/crm/hr', label: 'HR Dashboard', icon: FiAward },
    { to: '/crm/notifications', label: 'Notifications', icon: FiBell },
    { to: '/crm/attendance', label: 'Attendance', icon: FiUserCheck },
    { to: '/crm/leave', label: 'Leave', icon: FiCalendar },
    { to: '/crm/profile', label: 'My Profile', icon: FiUser },
    { to: '/crm/tickets', label: 'Support Tickets', icon: FiLifeBuoy },
    { to: '/crm/sales', label: 'Sales Performance', icon: FiTrendingUp },
    (adminBypass || user?.taskPermission === true) && { to: '/crm/tasks', label: 'My Tasks', icon: FiCheckSquare },
    (adminBypass || user?.leadPermission === true) && { to: '/crm/leads', label: 'Leads', icon: FiUsers },
    (adminBypass || user?.role === 'MANAGER' || user?.leadPermission === true || user?.quotationPermission === true) && { to: '/crm/quotations', label: 'Quotations', icon: FiFileText },
    (adminBypass || ['MANAGER', 'PROCUREMENT'].includes(user?.role) || user?.dispatchPermission === true) && { to: '/crm/dispatches', label: 'Dispatches', icon: FiTruck },
    (adminBypass || ['MANAGER', 'ACCOUNTS'].includes(user?.role) || user?.paymentPermission === true) && { to: '/crm/payments', label: 'Payments', icon: FiDollarSign },
    (adminBypass || user?.documentPermission === true) && { to: '/crm/documents', label: 'Documents', icon: FiFolder },
    (adminBypass || ['MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role)) && {
      to: '/crm/distributors',
      label: 'Distributors',
      icon: FiBriefcase,
      children: [
        { to: '/crm/distributors/tea', label: 'Tea Orders', dotColor: '#2dd4a7' },
        { to: '/crm/distributors/rice', label: 'Rice Orders', dotColor: '#f5b942' },
        { to: '/crm/distributors/stone', label: 'Stone Orders', dotColor: '#94a3b8' }
      ]
    },
    (adminBypass || ['MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role)) && {
      to: '/crm/visitors',
      label: 'Buyer Visitors',
      icon: FiUserPlus,
      children: [
        { to: '/crm/visitors/tea', label: 'Tea Visitors', dotColor: '#2dd4a7' },
        { to: '/crm/visitors/rice', label: 'Rice Visitors', dotColor: '#f5b942' },
        { to: '/crm/visitors/stone', label: 'Stone Visitors', dotColor: '#94a3b8' }
      ]
    }
  ].filter(Boolean);
}

export function getCrmDepartmentLinks() {
  return [
    { label: 'Sales', to: '/crm/employees?dept=SALES' },
    { label: 'Transport', to: '/crm/employees?dept=TRANSPORT' },
    { label: 'HR', to: '/crm/hr' },
    { label: 'IT', to: '/crm/employees?dept=IT' },
    { label: 'Management', to: '/crm/employees?role=MANAGER' },
    { label: 'Co-founder', to: '/crm/employees?role=ADMIN' }
  ];
}

export function getCrmAdminNavItems(user) {
  const adminBypass = isAdminUser(user);
  return [
    (adminBypass || user?.role === 'MANAGER') && { to: '/crm/admin', label: 'Admin Panel', icon: FiSettings },
    (adminBypass || user?.role === 'MANAGER') && { to: '/crm/employees', label: 'Employees', icon: FiUsers },
    { to: '/crm/applications', label: 'Job Applications', icon: FiFileText },
    (adminBypass || ['MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role)) && { to: '/crm/career-leads', label: 'Career Leads', icon: FiUserPlus },
    (adminBypass || ['MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role) || user?.jobPermission === true) && { to: '/crm/jobs', label: 'Manage Jobs', icon: FiBriefcase },
    (adminBypass || user?.role === 'MANAGER') && { to: '/crm/security', label: 'Security', icon: FiShield },
    (adminBypass || user?.role === 'MANAGER') && { to: '/crm/reports', label: 'Reports', icon: FiBarChart2 }
  ].filter(Boolean);
}

export function shouldShowCrmAdminMenu(user) {
  return isAdminUser(user) || ['MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role) || user?.jobPermission === true;
}

export function getCrmCommandItems(user) {
  const main = getCrmMainNavItems(user).map((item) => ({ ...item, group: 'Navigate' }));
  const admin = shouldShowCrmAdminMenu(user)
    ? getCrmAdminNavItems(user).map((item) => ({ ...item, group: 'Administration' }))
    : [];
  return [...main, ...admin];
}