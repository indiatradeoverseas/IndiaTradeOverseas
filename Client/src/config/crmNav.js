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
  FiCreditCard,
  FiCheckCircle,
  FiPhoneCall,
  FiClock,
  FiMessageSquare,
  FiCpu,
  FiTarget
} from 'react-icons/fi';


// ─────────────────────────────────────────────
// RBAC helpers
// ─────────────────────────────────────────────

function isAdminUser(user) {
  if (!user) return false;

  const role =
    (user.role || '').toUpperCase();

  const department =
    (user.department || '').toUpperCase();

  const position =
    (user.position || '').toLowerCase();

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


function isCEOUser(user) {
  if (!user) return false;

  const role =
    (user.role || '').toUpperCase();

  const position =
    (user.position || '').toLowerCase();

  const email =
    (user.email || '').toLowerCase();

  const empId =
    (user.employeeId || '').toUpperCase();

  return (
    role === 'CEO' ||
    position.includes('chief executive') ||
    position === 'ceo' ||
    empId.includes('CEO') ||
    email.startsWith('ceo@')
  );
}


function isFounderUser(user) {
  if (!user) return false;

  // CEO accounts take precedence over name-matching for Founder.
  if (isCEOUser(user)) {
    return false;
  }

  const role =
    (user.role || '').toUpperCase();

  const position =
    (user.position || '').toLowerCase();

  const email =
    (user.email || '').toLowerCase();

  const name =
    (
      user.name ||
      user.fullName ||
      ''
    ).toLowerCase();

  const empId =
    (user.employeeId || '').toUpperCase();

  return (
    role === 'FOUNDER' ||
    role === 'CO_FOUNDER' ||
    position.includes('founder') ||
    empId.includes('FOUNDER') ||
    email.startsWith('founder@') ||
    name.includes('founder')
  );
}


/**
 * Master DPR v4.0 — Controlled Campaign access.
 *
 * Keep this aligned with the corresponding App route and backend
 * campaign-governance read boundary.
 */
function isControlledCampaignUser(user) {
  if (!user) return false;

  const role =
    String(
      user.role || ''
    )
      .trim()
      .toUpperCase();

  const department =
    String(
      user.department || ''
    )
      .trim()
      .toUpperCase();

  const position =
    String(
      user.position || ''
    )
      .trim()
      .toUpperCase();

  const isManagement =
    role === 'ADMIN' ||
    role === 'FOUNDER' ||
    role === 'CO_FOUNDER' ||
    role === 'SUPER_ADMIN' ||
    role.includes('FOUNDER') ||
    department === 'ADMIN' ||
    department === 'MANAGEMENT' ||
    position.includes('ADMIN') ||
    position.includes('FOUNDER') ||
    position.includes('CEO') ||
    position.includes('DIRECTOR') ||
    position.includes('OWNER');

  return (
    isManagement ||
    department === 'MARKETING' ||
    department === 'OPERATIONS' ||
    department === 'IT'
  );
}




function isSalesManager(user) {
  return (
    user?.role === 'SALES_MANAGER' ||
    (
      user?.role === 'MANAGER' &&
      user?.department === 'SALES'
    ) ||
    (
      user?.department === 'SALES' &&
      user?.position
        ?.toLowerCase()
        ?.includes('manager')
    )
  );
}


function isSalesExecutive(user) {
  return (
    !isSalesManager(user) &&
    !isAdminUser(user) &&
    (
      user?.department === 'SALES' ||
      user?.role === 'SALES_EXECUTIVE' ||
      user?.role === 'SALES'
    )
  );
}


function isHRManager(user) {
  return user?.role === 'HR_MANAGER';
}


function isHRExecutive(user) {
  return (
    user?.role === 'HR_EXECUTIVE' ||
    user?.role === 'HR'
  );
}


// Helper check for Transport / Founder access
function isTransportAllowed(user) {
  const role =
    user?.role?.toUpperCase() ||
    '';

  const dept =
    user?.department?.toUpperCase() ||
    '';

  const pos =
    user?.position?.toLowerCase() ||
    '';

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
  if (!user) {
    return '/crm/transport/manager';
  }

  const role =
    (user.role || '').toUpperCase();

  const pos =
    (user.position || '').toLowerCase();

  if (
    role === 'DRIVER' ||
    pos.includes('driver')
  ) {
    return '/crm/transport/driver';
  }

  if (
    !isAdminUser(user) &&
    role !== 'MANAGER' &&
    !role.includes('MANAGER') &&
    !pos.includes('manager')
  ) {
    return '/crm/transport/executive';
  }

  return '/crm/transport/manager';
}


function getTransportChildren(user) {
  const admin =
    isAdminUser(user);

  const role =
    (user.role || '').toUpperCase();

  const pos =
    (user.position || '').toLowerCase();

  const isManager =
    admin ||
    role === 'MANAGER' ||
    role.includes('MANAGER') ||
    pos.includes('manager');

  if (
    role === 'DRIVER' ||
    pos.includes('driver')
  ) {
    return [
      {
        to:
          '/crm/transport/driver',

        label:
          'Driver Mobile PWA',

        dotColor:
          '#22c55e'
      }
    ];
  }

  if (!isManager) {
    return [
      {
        to:
          '/crm/transport/executive',

        label:
          'Executive Console',

        dotColor:
          '#38bdf8'
      }
    ];
  }

  return [
    {
      to:
        '/crm/transport/manager',

      label:
        'Manager Terminal',

      dotColor:
        '#c9a84c'
    },

    {
      to:
        '/crm/transport/executive',

      label:
        'Executive Console',

      dotColor:
        '#38bdf8'
    },

    {
      to:
        '/crm/transport/driver',

      label:
        'Driver Mobile PWA',

      dotColor:
        '#22c55e'
    }
  ];
}


function isTransportManagerUser(user) {
  if (
    !user ||
    isAdminUser(user)
  ) {
    return false;
  }

  const role =
    (user.role || '').toUpperCase();

  const dept =
    (user.department || '').toUpperCase();

  const pos =
    (user.position || '').toLowerCase();

  return (
    (
      dept === 'TRANSPORT' ||
      dept === 'LOGISTICS' ||
      role === 'TRANSPORT' ||
      role === 'LOGISTICS' ||
      role === 'TRANSPORT_MANAGER'
    ) &&
    (
      role === 'MANAGER' ||
      role === 'TRANSPORT_MANAGER' ||
      role.includes('MANAGER') ||
      pos.includes('manager') ||
      pos.includes('head') ||
      pos.includes('lead')
    )
  );
}


function isTransportExecutiveUser(user) {
  if (
    !user ||
    isAdminUser(user)
  ) {
    return false;
  }

  if (
    isDriverRole(user) ||
    isTransportManagerUser(user)
  ) {
    return false;
  }

  const role =
    (user.role || '').toUpperCase();

  const dept =
    (user.department || '').toUpperCase();

  const pos =
    (user.position || '').toLowerCase();

  return (
    (
      dept === 'TRANSPORT' ||
      dept === 'LOGISTICS' ||
      role === 'TRANSPORT' ||
      role === 'LOGISTICS' ||
      role === 'TRANSPORT_EXECUTIVE'
    ) ||
    pos.includes('transport') ||
    pos.includes('logistics')
  );
}


function isDriverRole(user) {
  if (
    !user ||
    isAdminUser(user)
  ) {
    return false;
  }

  const role =
    (user.role || '').toUpperCase();

  const pos =
    (user.position || '').toLowerCase();

  return (
    role === 'DRIVER' ||
    pos.includes('driver')
  );
}


function isSalesTrialExecutive(user) {
  return (
    user?.role === 'SALES_TRIAL' ||
    user?.department === 'SALES_TRIAL' ||
    user?.position
      ?.toLowerCase()
      ?.includes('trial')
  );
}


// ─────────────────────────────────────────────
// Main sidebar navigation items
// ─────────────────────────────────────────────

export function getCrmMainNavItems(user) {
  const admin =
    isAdminUser(user);

  const isCEO =
    isCEOUser(user);

  const isFounder =
    isFounderUser(user);


  // SALES TRIAL EXECUTIVE
  if (
    !admin &&
    isSalesTrialExecutive(user)
  ) {
    return [
      {
        to:
          '/crm/trial-dashboard',

        label:
          'Sales Dashboard',

        icon:
          FiBarChart2
      },

      {
        to:
          '/crm/leads',

        label:
          'Leads',

        icon:
          FiUsers
      },

      {
        to:
          '/crm/followup',

        label:
          'Follow Up',

        icon:
          FiPhoneCall
      },

      {
        to:
          '/crm/manager-chat',

        label:
          'Executive Manager & Founder Chat',

        icon:
          FiMessageSquare
      },

      {
        to:
          '/crm/profile',

        label:
          'My Profile',

        icon:
          FiUser
      },

      {
        to:
          '/crm/notifications',

        label:
          'Notifications',

        icon:
          FiBell
      },

      {
        to:
          '/crm/tickets',

        label:
          'Support Tickets',

        icon:
          FiLifeBuoy
      },

      {
        to:
          '/crm/tasks',

        label:
          'My Tasks',

        icon:
          FiCheckSquare
      }
    ];
  }


  // DRIVER
  if (
    !admin &&
    isDriverRole(user)
  ) {
    return [
      {
        to:
          '/crm/transport/driver',

        label:
          'Driver Dashboard',

        icon:
          FiTruck
      },

      {
        to:
          '/crm/transport/driver?tab=COMPLETED_DELIVERED',

        label:
          'Completed & Delivered Loads',

        icon:
          FiCheckCircle
      },

      {
        to:
          '/crm/transport/driver?tab=PAYMENTS',

        label:
          'Payment Proof',

        icon:
          FiCreditCard
      },

      {
        to:
          '/crm/tickets',

        label:
          'Support Tickets',

        icon:
          FiLifeBuoy
      },

      {
        to:
          '/crm/manager-chat',

        label:
          'Executive Manager & Founder Chat',

        icon:
          FiMessageSquare
      },

      {
        to:
          '/crm/profile',

        label:
          'My Profile',

        icon:
          FiUser
      }
    ];
  }


  // TRANSPORT EXECUTIVE
  if (
    !admin &&
    isTransportExecutiveUser(user)
  ) {
    return [
      {
        to:
          '/crm/transport/executive',

        label:
          'Transport Executive Dashboard',

        icon:
          FiTruck
      },

      {
        to:
          '/crm/tickets',

        label:
          'Support Tickets',

        icon:
          FiLifeBuoy
      },

      {
        to:
          '/crm/manager-chat',

        label:
          'Executive Manager & Founder Chat',

        icon:
          FiMessageSquare
      },

      {
        to:
          '/crm/profile',

        label:
          'My Profile',

        icon:
          FiUser
      }
    ];
  }


  // TRANSPORT MANAGER
  if (
    !admin &&
    isTransportManagerUser(user)
  ) {
    return [
      {
        to:
          '/crm/transport/manager?tab=DASHBOARD',

        label:
          'Transport Manager Dashboard',

        icon:
          FiTruck
      },

      {
        to:
          '/crm/transport/manager?tab=ASSIGN_LEADS',

        label:
          'Lead & Trip Assignment',

        icon:
          FiCheckSquare
      },

      {
        to:
          '/crm/transport/manager?tab=TEAM_LEAVES',

        label:
          'Team Leave Requests',

        icon:
          FiCalendar
      },

      {
        to:
          '/crm/tickets',

        label:
          'Support Tickets',

        icon:
          FiLifeBuoy
      },

      {
        to:
          '/crm/manager-chat',

        label:
          'Executive Manager & Founder Chat',

        icon:
          FiMessageSquare
      },

      {
        to:
          '/crm/profile',

        label:
          'My Profile',

        icon:
          FiUser
      },

      {
        to:
          '/crm/transport/manager?tab=DRIVER_PROOFS',

        label:
          'Driver Uploaded All Proof',

        icon:
          FiFolder
      }
    ];
  }


  const salesMgr =
    isSalesManager(user);

  const salesExec =
    isSalesExecutive(user);

  const hrMgr =
    isHRManager(user);

  const hrExec =
    isHRExecutive(user);


  return [
    // CEO Dashboard — CEO and Founder leadership accounts.
    (
      isCEO ||
      isFounder
    ) && {
      to:
        '/crm/ceo',

      label:
        'CEO Dashboard',

      icon:
        FiCommand
    },




    /*
     * Management dashboard.
     *
     * Plain management/admin users receive one entry.
     * Founder gets the Founder-specific entry below.
     * CEO remains on the dedicated CEO dashboard.
     */
    (
      admin &&
      !isCEO &&
      !isFounder
    ) && {
      to:
        '/crm/founder',

      label:
        'Founder Dashboard',

      icon:
        FiCommand
    },


    isFounder && {
      to:
        '/crm/founder',

      label:
        'Founder Dashboard',

      icon:
        FiShield
    },


    // HR Dashboard
    (
      !isCEO &&
      (
        admin ||
        hrMgr ||
        hrExec
      )
    ) && {
      to:
        '/crm/hr',

      label:
        'HR Dashboard',

      icon:
        FiAward
    },


    // Sales Dashboard
    (
      !isCEO &&
      (
        admin ||
        salesMgr ||
        salesExec
      )
    ) && {
      to:
        '/crm/sales-dashboard',

      label:
        'Sales Dashboard',

      icon:
        FiBarChart2
    },


    // IT Dashboard
    (
      !isCEO &&
      (
        admin ||
        user?.department === 'IT' ||
        user?.role === 'IT' ||
        user?.role === 'IT_MANAGER' ||
        user?.position
          ?.toLowerCase()
          ?.includes('it')
      )
    ) && {
      to:
        '/crm/it',

      label:
        'IT Dashboard',

      icon:
        FiCpu
    },


    // Transport Dashboard
    (
      !isCEO &&
      !salesMgr &&
      !salesExec &&
      (
        admin ||
        isTransportAllowed(user)
      )
    ) && {
      to:
        getTransportDefaultPath(
          user
        ),

      label:
        'Transport Dashboard',

      icon:
        FiTruck,

      children:
        getTransportChildren(
          user
        )
    },


    // Master DPR v4.0 — Phase 4 controlled campaign workbench.
    isControlledCampaignUser(user) && {
      to:
        '/crm/controlled-campaigns',

      label:
        'Controlled Campaign',

      icon:
        FiTarget
    },


    // Attendance
    (
      admin ||
      hrMgr
    ) && {
      to:
        '/crm/attendance',

      label:
        'Attendance',

      icon:
        FiUserCheck
    },


    // Leads
    (
      !hrMgr &&
      !hrExec &&
      (
        admin ||
        salesMgr ||
        salesExec ||
        user?.permissions?.lead ===
          true ||
        user?.leadPermission ===
          true
      )
    ) && {
      to:
        '/crm/leads',

      label:
        'Leads',

      icon:
        FiUsers
    },


    // Follow Up Matrix
    (
      !hrMgr &&
      !hrExec &&
      (
        admin ||
        salesMgr ||
        salesExec ||
        user?.permissions?.lead ===
          true ||
        user?.leadPermission ===
          true
      )
    ) && {
      to:
        '/crm/followup',

      label:
        'Follow Up',

      icon:
        FiPhoneCall
    },


    // Quotations
    (
      admin ||
      salesMgr
    ) && {
      to:
        '/crm/quotations',

      label:
        'Quotations',

      icon:
        FiFileText
    },


    // Trial Dashboard
    (
      !salesMgr &&
      !salesExec &&
      (
        admin ||
        user?.role === 'TRIAL' ||
        user?.position
          ?.toLowerCase()
          ?.includes('trial')
      )
    ) && {
      to:
        '/crm/trial-dashboard',

      label:
        'Trial Dashboard',

      icon:
        FiClock
    },


    // Distributors
    (
      admin ||
      salesMgr
    ) && {
      to:
        '/crm/distributors',

      label:
        'Distributors',

      icon:
        FiBriefcase,

      children: [
        {
          to:
            '/crm/distributors/tea',

          label:
            'Tea Orders',

          dotColor:
            '#2dd4a7'
        },

        {
          to:
            '/crm/distributors/rice',

          label:
            'Rice Orders',

          dotColor:
            '#f5b942'
        },

        {
          to:
            '/crm/distributors/stone',

          label:
            'Stone Orders',

          dotColor:
            '#94a3b8'
        },

        {
          to:
            '/crm/distributors/coal',

          label:
            'Coal Orders',

          dotColor:
            '#78716c'
        }
      ]
    },


    // Buyer Visitors
    (
      admin ||
      salesMgr
    ) && {
      to:
        '/crm/visitors',

      label:
        'Buyer Visitors',

      icon:
        FiUserPlus,

      children: [
        {
          to:
            '/crm/visitors/tea',

          label:
            'Tea Visitors',

          dotColor:
            '#2dd4a7'
        },

        {
          to:
            '/crm/visitors/rice',

          label:
            'Rice Visitors',

          dotColor:
            '#f5b942'
        },

        {
          to:
            '/crm/visitors/stone',

          label:
            'Stone Visitors',

          dotColor:
            '#94a3b8'
        }
      ]
    },


    // Coal Orders
    (
      admin ||
      salesMgr
    ) && {
      to:
        '/crm/coal-orders',

      label:
        'Coal Orders',

      icon:
        FiLayers
    },


    // My Profile — Common to all
    {
      to:
        '/crm/profile',

      label:
        'My Profile',

      icon:
        FiUser
    },


    // Overview Dashboard — ADMIN only, excluding CEO / Founder.
    (
      !isCEO &&
      !isFounder &&
      admin
    ) && {
      to:
        '/crm/dashboard',

      label:
        'Overview Dashboard',

      icon:
        FiLayout
    },


    // Shared Files — available to normal CRM users.
    (
      !isCEO &&
      !isFounder
    ) && {
      to:
        '/crm/shared-files',

      label:
        'Shared Files',

      icon:
        FiFolder
    },


    // Finance & Accounts
    (
      !admin &&
      (
        user?.department === 'FINANCE' ||
        user?.role === 'ACCOUNTS' ||
        user?.role === 'FINANCE_MANAGER'
      )
    ) && {
      to:
        '/crm/finance',

      label:
        'Finance & Accounts',

      icon:
        FiDollarSign
    },


    // Notifications
    {
      to:
        '/crm/notifications',

      label:
        'Notifications',

      icon:
        FiBell
    },


    // Leave
    (
      !isCEO &&
      !isFounder &&
      admin &&
      !hrMgr &&
      !hrExec
    ) && {
      to:
        '/crm/leave',

      label:
        'Leave',

      icon:
        FiCalendar
    },


    // Sales Performance
    (
      !isCEO &&
      !isFounder &&
      admin
    ) && {
      to:
        '/crm/sales',

      label:
        'Sales Performance',

      icon:
        FiTrendingUp
    },


    // Support Tickets
    {
      to:
        '/crm/tickets',

      label:
        'Support Tickets',

      icon:
        FiLifeBuoy
    },


    // Executive Manager & Founder Chat
    {
      to:
        '/crm/manager-chat',

      label:
        'Executive Manager & Founder Chat',

      icon:
        FiMessageSquare
    },


    // My Tasks
    (
      !isCEO &&
      !isFounder &&
      (
        admin ||
        salesMgr ||
        salesExec ||
        user?.permissions?.task ===
          true ||
        user?.taskPermission ===
          true
      )
    ) && {
      to:
        '/crm/tasks',

      label:
        'My Tasks',

      icon:
        FiCheckSquare
    },


    // Dispatches Manifest
    (
      !salesMgr &&
      !salesExec &&
      !admin &&
      (
        user?.permissions?.dispatch ===
          true ||
        user?.dispatchPermission ===
          true
      )
    ) && {
      to:
        '/crm/dispatches',

      label:
        'Dispatches Manifest',

      icon:
        FiFileText
    },


    // Payments
    (
      !salesMgr &&
      !salesExec &&
      !admin &&
      (
        user?.permissions?.payment ===
          true ||
        user?.paymentPermission ===
          true
      )
    ) && {
      to:
        '/crm/payments',

      label:
        'Payments',

      icon:
        FiDollarSign
    }
  ].filter(Boolean);
}


// ─────────────────────────────────────────────
// Department links section
// ─────────────────────────────────────────────

export function getCrmDepartmentLinks() {
  return [
    {
      label:
        'Sales',

      to:
        '/crm/employees?dept=SALES'
    },

    {
      label:
        'Transport',

      to:
        '/crm/employees?dept=TRANSPORT'
    },

    {
      label:
        'HR',

      to:
        '/crm/hr'
    },

    {
      label:
        'IT',

      to:
        '/crm/employees?dept=IT'
    },

    {
      label:
        'Management',

      to:
        '/crm/employees?role=MANAGER'
    },

    {
      label:
        'Co-founder',

      to:
        '/crm/employees?role=ADMIN'
    }
  ];
}


// ─────────────────────────────────────────────
// Administration sidebar section
// ─────────────────────────────────────────────

export function getCrmAdminNavItems(user) {
  const admin =
    isAdminUser(user);

  const hrMgr =
    isHRManager(user);

  const hrExec =
    isHRExecutive(user);

  return [
    // Admin Panel
    admin && {
      to:
        '/crm/admin',

      label:
        'Admin Panel',

      icon:
        FiSettings
    },


    // Employees
    (
      admin ||
      hrMgr
    ) && {
      to:
        '/crm/employees',

      label:
        'Employees',

      icon:
        FiUsers
    },


    // Job Applications
    (
      admin ||
      hrMgr ||
      hrExec
    ) && {
      to:
        '/crm/applications',

      label:
        'Job Applications',

      icon:
        FiFileText
    },


    // Career Leads
    (
      admin ||
      hrMgr ||
      hrExec
    ) && {
      to:
        '/crm/career-leads',

      label:
        'Career Leads',

      icon:
        FiUserPlus
    },


    // Manage Jobs
    (
      admin ||
      hrMgr
    ) && {
      to:
        '/crm/jobs',

      label:
        'Manage Jobs',

      icon:
        FiBriefcase
    },


    // Security
    (
      admin &&
      !isCEOUser(user)
    ) && {
      to:
        '/crm/security',

      label:
        'Security',

      icon:
        FiShield
    },


    // Reports
    admin && {
      to:
        '/crm/reports',

      label:
        'Reports',

      icon:
        FiBarChart2
    }
  ].filter(Boolean);
}


// ─────────────────────────────────────────────
// Whether to show the administration section
// ─────────────────────────────────────────────

export function shouldShowCrmAdminMenu(user) {
  return (
    isAdminUser(user) ||
    isHRManager(user) ||
    isHRExecutive(user)
  );
}


// ─────────────────────────────────────────────
// Command palette items
// ─────────────────────────────────────────────

export function getCrmCommandItems(user) {
  const main =
    getCrmMainNavItems(
      user
    ).map(
      (item) => ({
        ...item,
        group:
          'Navigate'
      })
    );

  const admin =
    shouldShowCrmAdminMenu(
      user
    )
      ? getCrmAdminNavItems(
          user
        ).map(
          (item) => ({
            ...item,
            group:
              'Administration'
          })
        )
      : [];

  return [
    ...main,
    ...admin
  ];
}
