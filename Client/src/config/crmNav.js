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
  FiAward,
  FiCommand,
  FiHome,
  FiLayers,
  FiCreditCard
} from 'react-icons/fi';

// ─────────────────────────────────────────────
// RBAC helpers
// ─────────────────────────────────────────────
function isAdminUser(user) {
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  const department = (user.department || '').toUpperCase();
  const position = (user.position || '').toLowerCase();

  return (
    role === 'ADMIN' ||
    role === 'FOUNDER' ||
    role === 'CO_FOUNDER' ||
    role === 'SUPER_ADMIN' ||
    department === 'ADMIN' ||
    department === 'MANAGEMENT' ||
    position.includes('admin') ||
    position.includes('founder') ||
    position.includes('ceo') ||
    position.includes('director') ||
    position.includes('owner')
  );
}

function isSalesManager(user) {
  return (
    user?.role === 'SALES_MANAGER' ||
    (user?.role === 'MANAGER' && user?.department === 'SALES') ||
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

// Helper check for Transport / Founder access
function isTransportAllowed(user) {
  const role = user?.role?.toUpperCase() || '';
  const dept = user?.department?.toUpperCase() || '';
  const pos = user?.position?.toLowerCase() || '';

  return (
    isAdminUser(user) ||
    role === 'FOUNDER' ||
    role === 'CO_FOUNDER' ||
    role === 'TRANSPORT' ||
    role === 'LOGISTICS' ||
    role === 'DRIVER' ||
    dept === 'TRANSPORT' ||
    dept === 'LOGISTICS' ||
    pos.includes('founder') ||
    pos.includes('transport') ||
    pos.includes('driver') ||
    user?.permissions?.dispatch === true ||
    user?.dispatchPermission === true
  );
}

function getTransportDefaultPath(user) {
  if (!user) return '/crm/transport/manager';
  const role = (user.role || '').toUpperCase();
  const pos = (user.position || '').toLowerCase();
  
  if (role === 'DRIVER' || pos.includes('driver')) {
    return '/crm/transport/driver';
  }
  if (!isAdminUser(user) && role !== 'MANAGER' && !role.includes('MANAGER') && !pos.includes('manager')) {
    return '/crm/transport/executive';
  }
  return '/crm/transport/manager';
}

function getTransportChildren(user) {
  const admin = isAdminUser(user);
  const role = (user.role || '').toUpperCase();
  const pos = (user.position || '').toLowerCase();
  const isManager = admin || role === 'MANAGER' || role.includes('MANAGER') || pos.includes('manager');

  if (role === 'DRIVER' || pos.includes('driver')) {
    return [
      { to: '/crm/transport/driver', label: 'Driver Mobile PWA', dotColor: '#22c55e' }
    ];
  }

  if (!isManager) {
    return [
      { to: '/crm/transport/executive', label: 'Executive Console', dotColor: '#38bdf8' }
    ];
  }

  return [
    { to: '/crm/transport/manager', label: 'Manager Terminal', dotColor: '#c9a84c' },
    { to: '/crm/transport/executive', label: 'Executive Console', dotColor: '#38bdf8' },
    { to: '/crm/transport/driver', label: 'Driver Mobile PWA', dotColor: '#22c55e' }
  ];
}

function isTransportManagerUser(user) {
  if (!user || isAdminUser(user)) return false;
  const role = (user.role || '').toUpperCase();
  const dept = (user.department || '').toUpperCase();
  const pos = (user.position || '').toLowerCase();

  return (
    (dept === 'TRANSPORT' || dept === 'LOGISTICS' || role === 'TRANSPORT' || role === 'LOGISTICS' || role === 'TRANSPORT_MANAGER') &&
    (role === 'MANAGER' || role === 'TRANSPORT_MANAGER' || role.includes('MANAGER') || pos.includes('manager') || pos.includes('head') || pos.includes('lead'))
  );
}

function isTransportExecutiveUser(user) {
  if (!user || isAdminUser(user)) return false;
  if (isDriverRole(user) || isTransportManagerUser(user)) return false;

  const role = (user.role || '').toUpperCase();
  const dept = (user.department || '').toUpperCase();
  const pos = (user.position || '').toLowerCase();

  return (
    (dept === 'TRANSPORT' || dept === 'LOGISTICS' || role === 'TRANSPORT' || role === 'LOGISTICS' || role === 'TRANSPORT_EXECUTIVE') ||
    (pos.includes('transport') || pos.includes('logistics'))
  );
}

function isDriverRole(user) {
  if (!user || isAdminUser(user)) return false;
  const role = (user.role || '').toUpperCase();
  const pos = (user.position || '').toLowerCase();

  return role === 'DRIVER' || pos.includes('driver');
}

// ─────────────────────────────────────────────
// Main sidebar navigation items
// ─────────────────────────────────────────────
export function getCrmMainNavItems(user) {
  const admin = isAdminUser(user);

  // 1. DRIVER: Driver Dashboard, Support Tickets, Payment Proof & My Profile
  if (!admin && isDriverRole(user)) {
    return [
      { to: '/crm/transport/driver', label: 'Driver Dashboard', icon: FiTruck },
      { to: '/crm/tickets', label: 'Support Tickets', icon: FiLifeBuoy },
      { to: '/crm/profile', label: 'My Profile', icon: FiUser },
      { to: '/crm/transport/driver?tab=PAYMENTS', label: 'Payment Proof', icon: FiCreditCard }
    ];
  }

  // 2. TRANSPORT EXECUTIVE: Transport Executive Dashboard, Support Tickets & My Profile
  if (!admin && isTransportExecutiveUser(user)) {
    return [
      { to: '/crm/transport/executive', label: 'Transport Executive Dashboard', icon: FiTruck },
      { to: '/crm/tickets', label: 'Support Tickets', icon: FiLifeBuoy },
      { to: '/crm/profile', label: 'My Profile', icon: FiUser }
    ];
  }

  // 3. TRANSPORT MANAGER: Transport Manager Dashboard, Lead & Trip Assignment, Quotations, Support Tickets, Driver Uploaded All Proof & My Profile
  if (!admin && isTransportManagerUser(user)) {
    return [
      { to: '/crm/transport/manager?tab=DASHBOARD', label: 'Transport Manager Dashboard', icon: FiTruck },
      { to: '/crm/transport/manager?tab=ASSIGN_LEADS', label: 'Lead & Trip Assignment', icon: FiCheckSquare },
      { to: '/crm/quotations', label: 'Quotations', icon: FiFileText },
      { to: '/crm/tickets', label: 'Support Tickets', icon: FiLifeBuoy },
      { to: '/crm/profile', label: 'My Profile', icon: FiUser },
      { to: '/crm/transport/manager?tab=DRIVER_PROOFS', label: 'Driver Uploaded All Proof', icon: FiFolder }
    ];
  }

  const salesMgr = isSalesManager(user);
  const salesExec = isSalesExecutive(user);
  const hrMgr = isHRManager(user);
  const hrExec = isHRExecutive(user);

  return [
    // 1. Founder Dashboard — ADMIN & FOUNDER
    admin && { to: '/crm/founder', label: 'Founder Dashboard', icon: FiCommand },

    // 2. HR Dashboard — ADMIN + HR Manager + HR Executive
    (admin || hrMgr || hrExec) && { to: '/crm/hr', label: 'HR Dashboard', icon: FiAward },

    // 3. Sales Dashboard — ADMIN + Sales Manager + Sales Executive
    (admin || salesMgr || salesExec) && { to: '/crm/sales-dashboard', label: 'Sales Dashboard', icon: FiBarChart2 },

    // 4. Transport Dashboard — Transport Dept or Permitted or Admin
    (admin || isTransportAllowed(user)) && { 
      to: getTransportDefaultPath(user), 
      label: 'Transport Dashboard', 
      icon: FiTruck,
      children: getTransportChildren(user)
    },

    // 5. Attendance — ADMIN + HR_MANAGER
    (admin || hrMgr) && { to: '/crm/attendance', label: 'Attendance', icon: FiUserCheck },

    // 6. Leads — ADMIN, Sales Manager, Sales Executive, or permission-based
    (admin || salesMgr || salesExec || user?.permissions?.lead === true || user?.leadPermission === true) && { to: '/crm/leads', label: 'Leads', icon: FiUsers },

    // 7. Distributors — ADMIN + Sales Manager
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

    // 8. Buyer Visitors — ADMIN + Sales Manager
    (admin || salesMgr) && {
      to: '/crm/visitors',
      label: 'Buyer Visitors',
      icon: FiUserPlus,
      children: [
        { to: '/crm/visitors/tea', label: 'Tea Visitors', dotColor: '#2dd4a7' },
        { to: '/crm/visitors/rice', label: 'Rice Visitors', dotColor: '#f5b942' },
        { to: '/crm/visitors/stone', label: 'Stone Visitors', dotColor: '#94a3b8' }
      ]
    },

    // 9. My Profile — Common to all
    { to: '/crm/profile', label: 'My Profile', icon: FiUser },

    // ── REMAINING OPTIONS ──
    // Overview Dashboard — ADMIN & FOUNDER
    admin && { to: '/crm/dashboard', label: 'Overview Dashboard', icon: FiLayout },

    // Finance & Accounts — Non-admin Finance/Accounts staff only
    (!admin && (user?.department === 'FINANCE' || user?.role === 'ACCOUNTS' || user?.role === 'FINANCE_MANAGER')) && { 
      to: '/crm/finance', 
      label: 'Finance & Accounts', 
      icon: FiDollarSign 
    },

    // Notifications — Common to all employees
    { to: '/crm/notifications', label: 'Notifications', icon: FiBell },

    // Leave — ADMIN + HR_MANAGER
    (admin || hrMgr) && { to: '/crm/leave', label: 'Leave', icon: FiCalendar },

    // Sales Performance — ADMIN only
    admin && { to: '/crm/sales', label: 'Sales Performance', icon: FiTrendingUp },

    // Support Tickets — Available to all employees for raising tickets/grievances
    { to: '/crm/tickets', label: 'Support Tickets', icon: FiLifeBuoy },

    // My Tasks — ADMIN, Sales Manager, Sales Executive, or permission-based
    (admin || salesMgr || salesExec || user?.permissions?.task === true || user?.taskPermission === true) && { to: '/crm/tasks', label: 'My Tasks', icon: FiCheckSquare },

    // Dispatches Manifest — Non-admin permitted dispatch staff only
    (!admin && (user?.permissions?.dispatch === true || user?.dispatchPermission === true)) && { to: '/crm/dispatches', label: 'Dispatches Manifest', icon: FiFileText },

    // Quotations — ADMIN, Sales Manager, or permission-based
    (admin || salesMgr || user?.permissions?.quotation === true || user?.quotationPermission === true) && { to: '/crm/quotations', label: 'Quotations', icon: FiFileText },

    // Payments — Non-admin permitted payment staff only
    (!admin && (user?.permissions?.payment === true || user?.paymentPermission === true)) && { to: '/crm/payments', label: 'Payments', icon: FiDollarSign },

    // Documents — ADMIN or permission-based
    (admin || user?.permissions?.document === true || user?.documentPermission === true) && { to: '/crm/documents', label: 'Documents', icon: FiFolder }
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