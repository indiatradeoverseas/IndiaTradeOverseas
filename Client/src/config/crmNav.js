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

// ─────────────────────────────────────────────
// RBAC helpers
// ─────────────────────────────────────────────
function isAdminUser(user) {
  return (
    user?.role === 'ADMIN' ||
    user?.department === 'ADMIN' ||
    (user?.position && user.position.toLowerCase().includes('admin'))
  );
}

function isSalesManager(user) {
  return (
    user?.role === 'MANAGER' ||
    user?.role === 'SALES_MANAGER' ||
    (user?.department === 'SALES' && user?.position?.toLowerCase()?.includes('manager'))
  );
}

function isSalesExecutive(user) {
  return (
    !isSalesManager(user) &&
    !isAdminUser(user) &&
    (user?.department === 'SALES' || user?.role === 'SALES_EXECUTIVE' || user?.role === 'SALES')
  );
}

function isHRManager(user) {
  return user?.role === 'HR_MANAGER';
}

function isHRExecutive(user) {
  return user?.role === 'HR_EXECUTIVE' || user?.role === 'HR';
}

// ─────────────────────────────────────────────
// Main sidebar navigation items
// ─────────────────────────────────────────────
export function getCrmMainNavItems(user) {
  const admin = isAdminUser(user);
  const salesMgr = isSalesManager(user);
  const salesExec = isSalesExecutive(user);
  const hrMgr = isHRManager(user);
  const hrExec = isHRExecutive(user);

  return [
    // Dashboard — ADMIN only
    admin && { to: '/crm/dashboard', label: 'Dashboard', icon: FiLayout },

    // HR Dashboard — ADMIN + HR_MANAGER
    (admin || hrMgr) && { to: '/crm/hr', label: 'HR Dashboard', icon: FiAward },

    // Sales Dashboard — ADMIN + Sales Manager + Sales Executive
    (admin || salesMgr || salesExec) && { to: '/crm/sales-dashboard', label: 'Sales Dashboard', icon: FiBarChart2 },

    // Notifications — ADMIN only
    admin && { to: '/crm/notifications', label: 'Notifications', icon: FiBell },

    // Attendance — ADMIN + HR_MANAGER
    (admin || hrMgr) && { to: '/crm/attendance', label: 'Attendance', icon: FiUserCheck },

    // Leave — ADMIN + HR_MANAGER
    (admin || hrMgr) && { to: '/crm/leave', label: 'Leave', icon: FiCalendar },

    // My Profile — everyone
    { to: '/crm/profile', label: 'My Profile', icon: FiUser },

    // Support Tickets — ADMIN only
    admin && { to: '/crm/tickets', label: 'Support Tickets', icon: FiLifeBuoy },

    // Sales Performance — ADMIN only
    admin && { to: '/crm/sales', label: 'Sales Performance', icon: FiTrendingUp },

    // My Tasks — ADMIN, Sales Manager, Sales Executive, or permission-based
    (admin || salesMgr || salesExec || user?.permissions?.task === true || user?.taskPermission === true) && { to: '/crm/tasks', label: 'My Tasks', icon: FiCheckSquare },

    // Leads — ADMIN, Sales Manager, Sales Executive, or permission-based
    (admin || salesMgr || salesExec || user?.permissions?.lead === true || user?.leadPermission === true) && { to: '/crm/leads', label: 'Leads', icon: FiUsers },

    // Quotations — ADMIN or permission-based
    (admin || user?.permissions?.quotation === true || user?.quotationPermission === true) && { to: '/crm/quotations', label: 'Quotations', icon: FiFileText },

    // Dispatches — ADMIN or permission-based
    (admin || user?.permissions?.dispatch === true || user?.dispatchPermission === true) && { to: '/crm/dispatches', label: 'Dispatches', icon: FiTruck },

    // Payments — ADMIN or permission-based
    (admin || user?.permissions?.payment === true || user?.paymentPermission === true) && { to: '/crm/payments', label: 'Payments', icon: FiDollarSign },

    // Documents — ADMIN or permission-based
    (admin || user?.permissions?.document === true || user?.documentPermission === true) && { to: '/crm/documents', label: 'Documents', icon: FiFolder },

    // Distributors — ADMIN + Sales Manager
    (admin || salesMgr) && {
      to: '/crm/distributors',
      label: 'Distributors',
      icon: FiBriefcase,
      children: [
        { to: '/crm/distributors/tea', label: 'Tea Orders', dotColor: '#2dd4a7' },
        { to: '/crm/distributors/rice', label: 'Rice Orders', dotColor: '#f5b942' },
        { to: '/crm/distributors/stone', label: 'Stone Orders', dotColor: '#94a3b8' }
      ]
    },

    // Buyer Visitors — ADMIN + Sales Manager
    (admin || salesMgr) && {
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

// ─────────────────────────────────────────────
// Department links section
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Administration sidebar section
// ─────────────────────────────────────────────
export function getCrmAdminNavItems(user) {
  const admin = isAdminUser(user);
  const hrMgr = isHRManager(user);
  const hrExec = isHRExecutive(user);

  return [
    // Admin Panel — ADMIN only
    admin && { to: '/crm/admin', label: 'Admin Panel', icon: FiSettings },

    // Employees — ADMIN + HR_MANAGER
    (admin || hrMgr) && { to: '/crm/employees', label: 'Employees', icon: FiUsers },

    // Job Applications — ADMIN + HR_MANAGER + HR_EXECUTIVE
    (admin || hrMgr || hrExec) && { to: '/crm/applications', label: 'Job Applications', icon: FiFileText },

    // Career Leads — ADMIN + HR_MANAGER + HR_EXECUTIVE
    (admin || hrMgr || hrExec) && { to: '/crm/career-leads', label: 'Career Leads', icon: FiUserPlus },

    // Manage Jobs — ADMIN + HR_MANAGER only (NOT HR_EXECUTIVE)
    (admin || hrMgr) && { to: '/crm/jobs', label: 'Manage Jobs', icon: FiBriefcase },

    // Security — ADMIN only
    admin && { to: '/crm/security', label: 'Security', icon: FiShield },

    // Reports — ADMIN only
    admin && { to: '/crm/reports', label: 'Reports', icon: FiBarChart2 }
  ].filter(Boolean);
}

// ─────────────────────────────────────────────
// Whether to show the administration section at all
// ─────────────────────────────────────────────
export function shouldShowCrmAdminMenu(user) {
  return isAdminUser(user) || isHRManager(user) || isHRExecutive(user);
}

// ─────────────────────────────────────────────
// Command palette items (sidebar + admin combined)
// ─────────────────────────────────────────────
export function getCrmCommandItems(user) {
  const main = getCrmMainNavItems(user).map((item) => ({ ...item, group: 'Navigate' }));
  const admin = shouldShowCrmAdminMenu(user)
    ? getCrmAdminNavItems(user).map((item) => ({ ...item, group: 'Administration' }))
    : [];
  return [...main, ...admin];
}