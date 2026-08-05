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
  FiPackage,
  FiCheckSquare,
  FiBell,
  FiBriefcase,
  FiUserCheck,
  FiLifeBuoy,
  FiCalendar,
  FiUser,
  FiTrendingUp
} from 'react-icons/fi';

export function getCrmMainNavItems(user) {
  return [
    { to: '/crm/dashboard', label: 'Dashboard', icon: FiLayout },
    { to: '/crm/notifications', label: 'Notifications', icon: FiBell },
    { to: '/crm/attendance', label: 'Attendance', icon: FiUserCheck },
    { to: '/crm/leave', label: 'Leave', icon: FiCalendar },
    { to: '/crm/profile', label: 'My Profile', icon: FiUser },
    { to: '/crm/tickets', label: 'Support Tickets', icon: FiLifeBuoy },
    { to: '/crm/sales', label: 'Sales Performance', icon: FiTrendingUp },
    (user?.role === 'ADMIN' || user?.taskPermission === true) && { to: '/crm/tasks', label: 'My Tasks', icon: FiCheckSquare },
    (user?.role === 'ADMIN' || user?.leadPermission === true) && { to: '/crm/leads', label: 'Leads', icon: FiUsers },
    { to: '/crm/products', label: 'Products', icon: FiPackage },
    (['ADMIN', 'MANAGER'].includes(user?.role) || user?.leadPermission === true || user?.quotationPermission === true) && { to: '/crm/quotations', label: 'Quotations', icon: FiFileText },
    (['ADMIN', 'MANAGER', 'PROCUREMENT'].includes(user?.role) || user?.dispatchPermission === true) && { to: '/crm/dispatches', label: 'Dispatches', icon: FiTruck },
    (['ADMIN', 'MANAGER', 'ACCOUNTS'].includes(user?.role) || user?.paymentPermission === true) && { to: '/crm/payments', label: 'Payments', icon: FiDollarSign },
    (user?.role === 'ADMIN' || user?.documentPermission === true) && { to: '/crm/documents', label: 'Documents', icon: FiFolder },
    (['ADMIN', 'MANAGER', 'HR'].includes(user?.role)) && { to: '/crm/distributors', label: 'Distributors', icon: FiBriefcase }
  ].filter(Boolean);
}

export function getCrmDepartmentLinks() {
  return [
    { label: 'Sales', to: '/crm/employees?dept=SALES' },
    { label: 'Transport', to: '/crm/employees?dept=TRANSPORT' },
    { label: 'HR', to: '/crm/employees?dept=HR' },
    { label: 'IT', to: '/crm/employees?dept=IT' },
    { label: 'Management', to: '/crm/employees?role=MANAGER' },
    { label: 'Co-founder', to: '/crm/employees?role=ADMIN' }
  ];
}

export function getCrmAdminNavItems(user) {
  return [
    (user?.role === 'ADMIN' || user?.role === 'MANAGER') && { to: '/crm/admin', label: 'Admin Panel', icon: FiSettings },
    (user?.role === 'ADMIN' || user?.role === 'MANAGER') && { to: '/crm/employees', label: 'Employees', icon: FiUsers },
    { to: '/crm/applications', label: 'Job Applications', icon: FiFileText },
    (user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR' || user?.jobPermission === true) && { to: '/crm/jobs', label: 'Manage Jobs', icon: FiBriefcase },
    (user?.role === 'ADMIN' || user?.role === 'MANAGER') && { to: '/crm/security', label: 'Security', icon: FiShield },
    (user?.role === 'ADMIN' || user?.role === 'MANAGER') && { to: '/crm/reports', label: 'Reports', icon: FiBarChart2 }
  ].filter(Boolean);
}

export function shouldShowCrmAdminMenu(user) {
  return ['ADMIN', 'MANAGER', 'HR'].includes(user?.role) || user?.jobPermission === true;
}

export function getCrmCommandItems(user) {
  const main = getCrmMainNavItems(user).map((item) => ({ ...item, group: 'Navigate' }));
  const admin = shouldShowCrmAdminMenu(user)
    ? getCrmAdminNavItems(user).map((item) => ({ ...item, group: 'Administration' }))
    : [];
  return [...main, ...admin];
}
