import React, { useEffect, Suspense, lazy } from 'react';
import CommercialRequirement from './components/CommercialRequirement';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

import ScrollToTop from './utils/ScrollToTop';
import {
  DPR_EVENTS,
  pushDataLayerEvent,
  pushDprEvent
} from './utils/analytics';
import { isPricingRoute } from './utils/routeHelpers';

import Home from './pages/public/Home';
import Products from './pages/public/Products';
import OurServices from './pages/public/OurServices';
import Rice from './pages/public/Rice';
import ProductDetail from './pages/public/ProductDetail';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Careers from './pages/public/Careers';
import QuoteRequest from './pages/public/QuoteRequest';
import Coal from './pages/public/Coal';
import Login from './pages/public/Login';
import ClientLogin from './pages/public/ClientLogin';
import EmployeeLogin from './pages/public/EmployeeLogin';
import AdminLogin from './pages/public/AdminLogin';
import TrialLogin from './pages/public/TrialLogin';
import TrialSignUp from './pages/public/TrialSignUp';
import Signup from './pages/public/Signup';
import ClientSignup from './pages/public/ClientSignup';
import EmployeeSignup from './pages/public/EmployeeSignup';
import DevicePending from './pages/public/DevicePending';
import VerifyEmail from './pages/public/VerifyEmail';
import ForgotPassword from './pages/public/ForgotPassword';

const ITOAds = lazy(() => import('./pages/public/ITOAds'));

import Dashboard from './pages/crm/Dashboard';
import Leads from './pages/crm/Leads';
import Stone from './pages/public/Stone';
import LeadDetail from './pages/crm/LeadDetail';
import Quotations from './pages/crm/Quotations';
import Dispatches from './pages/crm/Dispatches';
import Payments from './pages/crm/Payments';
import Documents from './pages/crm/Documents';
import SharedFilesPage from './pages/crm/SharedFilesPage';
import Employees from './pages/crm/Employees';
import Distributors from './pages/crm/Distributors';
import CoalOrders from './pages/crm/CoalOrders';
import Visitors from './pages/crm/Visitors';
import Security from './pages/crm/Security';
import Reports from './pages/crm/Reports';
import AdminPanel from './pages/crm/AdminPanel';
import ProductUpload from './pages/crm/ProductUpload';
import Tasks from './pages/crm/Tasks';
import Notifications from './pages/crm/Notifications';
import Applications from './pages/crm/Applications';
import CareerLeads from './pages/crm/CareerLeads';
import Jobs from './pages/crm/Jobs';
import Attendance from './pages/crm/Attendance';
import Tickets from './pages/crm/Tickets';
import Leave from './pages/crm/Leave';
import EmployeeProfile from './pages/crm/EmployeeProfile';
import SalesPerformance from './pages/crm/SalesPerformance';
import SalesDashboard from './pages/crm/SalesDashboard';
import Followup from './pages/crm/Followup';
import TrialDashboard from './pages/crm/TrialDashboard';
import ControlledCampaigns from './pages/crm/ControlledCampaigns';

import HrManagerDashboard from './pages/crm/HrManagerDashboard';
import HrExecutiveDashboard from './pages/crm/HrExecutiveDashboard';
import FounderDashboard from './pages/crm/FounderDashboard';
import CEODashboard from './pages/crm/CEODashboard';
import FinanceManagerDashboard from './pages/crm/FinanceManagerDashboard';
import TransportManager from './pages/crm/transport/TransportManager';
import TransportExecutive from './pages/crm/transport/TransportExecutive';
import DriverMobileView from './pages/crm/transport/DriverMobileView';
import ManagerChatSupport from './pages/crm/ManagerChatSupport';
import ItDashboard from './pages/crm/ItDashboard';

import Navbar from './components/Layout/Navbar';
import PortalLayout from './components/Layout/PortalLayout';
import { VoiceAssistantProvider } from './context/VoiceAssistantContext';
import Footer from './components/Layout/Footer';
import ChatWidget from './components/Chat/ChatWidget';
import TrackingConsentBanner from './components/privacy/TrackingConsentBanner';
import Prakriti from './pages/public/Prakriti';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import Terms from './pages/legal/Terms';
import Disclaimer from './pages/legal/Disclaimer';
import FraudPaymentPolicy from './pages/legal/FraudPaymentPolicy';
import Onion from './pages/public/Onion';

import StonePricing from './pages/public/StonePricing';
import RicePricing from './pages/public/RicePricing';
import TeaPricing from './pages/public/TeaPricing';

import SecurityGuard from './components/security/SecurityGuard';


/* =========================================================
   MASTER DPR v4.0 — PHASE 1 ROUTE TRACKING

   External acquisition analytics is intentionally limited to
   known public website routes. Internal CRM/auth routes can contain
   identifiers or operational context and must not be sent to GTM/GA4/Meta.

   `virtual_page_view` is a diagnostic/navigation event.
   `landing_page_view` is the canonical DPR acquisition event and is
   emitted only for commercial landing experiences.
========================================================= */

const PUBLIC_PAGE_META = Object.freeze({
  '/': {
    page_type: 'homepage'
  },

  '/products': {
    page_type: 'product_index'
  },

  '/about': {
    page_type: 'corporate'
  },

  '/contact': {
    page_type: 'contact'
  },

  '/careers': {
    page_type: 'careers'
  },

  '/quote-request': {
    page_type: 'commercial_enquiry'
  },

  '/our-services': {
    page_type: 'services'
  },

  '/prakriti/tea': {
    page_type: 'commercial_landing',
    vertical: 'tea',
    landing_page_type: 'product'
  },

  '/prakriti/rice': {
    page_type: 'commercial_landing',
    vertical: 'rice',
    landing_page_type: 'product'
  },

  '/stone': {
    page_type: 'commercial_landing',
    vertical: 'stone',
    landing_page_type: 'product'
  },

  '/ito-ads': {
    page_type: 'commercial_landing',
    vertical: 'ito_ads',
    landing_page_type: 'service'
  },

  '/privacy-policy': {
    page_type: 'legal'
  },

  '/terms': {
    page_type: 'legal'
  },

  '/terms-and-conditions': {
    page_type: 'legal'
  },

  '/fraud-payment-policy': {
    page_type: 'legal'
  },

  '/disclaimer': {
    page_type: 'legal'
  }
});


function getPublicPageMeta(pathname) {
  if (PUBLIC_PAGE_META[pathname]) {
    return PUBLIC_PAGE_META[pathname];
  }

  if (pathname.startsWith('/products/')) {
    return {
      page_type: 'product_detail'
    };
  }

  return null;
}


function getCommercialLandingMeta(pathname) {
  const pageMeta =
    getPublicPageMeta(pathname);

  if (
    !pageMeta ||
    pageMeta.page_type !== 'commercial_landing'
  ) {
    return null;
  }

  return pageMeta;
}


/* =========================================================
   ROUTE ACCESS HELPERS
========================================================= */

function ProtectedRoute({ children }) {
  const {
    user,
    loading
  } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}


function isAdminUser(user) {
  if (!user) {
    return false;
  }

  const role =
    String(
      user.role || ''
    ).toUpperCase();

  const department =
    String(
      user.department || ''
    ).toUpperCase();

  const position =
    String(
      user.position || ''
    ).toLowerCase();

  const email =
    String(
      user.email || ''
    ).toLowerCase();

  return (
    [
      'ADMIN',
      'FOUNDER',
      'CEO',
      'SUPER_ADMIN',
      'CO_FOUNDER'
    ].includes(role) ||
    department === 'ADMIN' ||
    department === 'MANAGEMENT' ||
    position.includes('admin') ||
    position.includes('founder') ||
    position.includes('ceo') ||
    position.includes('chief executive') ||
    role.includes('FOUNDER') ||
    role.includes('CEO') ||
    email.startsWith('ceo@') ||
    email.startsWith('founder@')
  );
}


function isControlledCampaignUser(user) {
  if (!user) {
    return false;
  }

  const role =
    String(
      user?.role || ''
    )
      .trim()
      .toUpperCase();

  const department =
    String(
      user?.department || ''
    )
      .trim()
      .toUpperCase();

  const position =
    String(
      user?.position || ''
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


function ManagementRoute({ children }) {
  const {
    user,
    loading
  } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (
    !user ||
    !isAdminUser(user)
  ) {
    return (
      <Navigate
        to="/crm/dashboard"
        replace
      />
    );
  }

  return children;
}


function AdminRoute({ children }) {
  const {
    user,
    loading
  } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (
    !user ||
    !isAdminUser(user)
  ) {
    return (
      <Navigate
        to="/crm/dashboard"
        replace
      />
    );
  }

  return children;
}


function isCEOUser(user) {
  if (!user) {
    return false;
  }

  const role =
    String(
      user.role || ''
    ).toUpperCase();

  const position =
    String(
      user.position || ''
    ).toLowerCase();

  const email =
    String(
      user.email || ''
    ).toLowerCase();

  const empId =
    String(
      user.employeeId || ''
    ).toUpperCase();

  return (
    role === 'CEO' ||
    position.includes('chief executive') ||
    position === 'ceo' ||
    empId.includes('CEO') ||
    email.startsWith('ceo@')
  );
}


function isFounderUser(user) {
  if (!user) {
    return false;
  }

  if (isCEOUser(user)) {
    return false;
  }

  const role =
    String(
      user.role || ''
    ).toUpperCase();

  const position =
    String(
      user.position || ''
    ).toLowerCase();

  const email =
    String(
      user.email || ''
    ).toLowerCase();

  const empId =
    String(
      user.employeeId || ''
    ).toUpperCase();

  const name =
    String(
      user.name ||
      user.fullName ||
      ''
    ).toLowerCase();

  return (
    role === 'FOUNDER' ||
    role === 'CO_FOUNDER' ||
    position.includes('founder') ||
    empId.includes('FOUNDER') ||
    email.startsWith('founder@') ||
    name.includes('founder')
  );
}


function FounderRoute({ children }) {
  const {
    user,
    loading
  } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (
    !user ||
    !isFounderUser(user)
  ) {
    return (
      <Navigate
        to="/crm/dashboard"
        replace
      />
    );
  }

  return children;
}


function CEORoute({ children }) {
  const {
    user,
    loading
  } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (
    !user ||
    (
      !isCEOUser(user) &&
      !isFounderUser(user)
    )
  ) {
    return (
      <Navigate
        to="/crm/dashboard"
        replace
      />
    );
  }

  return children;
}


function RoleProtectedRoute({
  children,
  allowedRoles
}) {
  const {
    user,
    loading
  } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (
    !user ||
    !allowedRoles.includes(
      user.role
    )
  ) {
    return (
      <Navigate
        to="/crm/dashboard"
        replace
      />
    );
  }

  return children;
}


function HRRedirectGate() {
  const {
    user,
    loading
  } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    [
      'ADMIN',
      'MANAGER',
      'HR_MANAGER'
    ].includes(
      user.role
    )
  ) {
    return (
      <Navigate
        to="/crm/hr/manager"
        replace
      />
    );
  }

  if (
    [
      'HR_EXECUTIVE',
      'HR'
    ].includes(
      user.role
    )
  ) {
    return (
      <Navigate
        to="/crm/hr/executive"
        replace
      />
    );
  }

  return (
    <Navigate
      to="/crm/dashboard"
      replace
    />
  );
}


/* =========================================================
   APP LAYOUT
========================================================= */

function AppLayout() {
  const {
    user,
    loading
  } = useAuth();

  const location =
    useLocation();


  useEffect(
    () => {
      if (loading) {
        return undefined;
      }

      const pageMeta =
        getPublicPageMeta(
          location.pathname
        );

      /*
       * Do not send CRM, employee/auth, transport or other internal
       * application routes to external acquisition analytics.
       */
      if (!pageMeta) {
        return undefined;
      }

      /*
       * Let the route render first so page-level SEO/meta hooks have an
       * opportunity to update document.title before we capture it.
       */
      const frameId =
        window.requestAnimationFrame(
          () => {
            const basePayload = {
              page_path:
                location.pathname,

              page_title:
                document.title,

              page_type:
                pageMeta.page_type
            };

            pushDataLayerEvent(
              'virtual_page_view',
              basePayload
            );

            const landingMeta =
              getCommercialLandingMeta(
                location.pathname
              );

            if (landingMeta) {
              pushDprEvent(
                DPR_EVENTS.LANDING_PAGE_VIEWED,
                {
                  ...basePayload,

                  vertical:
                    landingMeta.vertical,

                  landing_page_type:
                    landingMeta.landing_page_type
                }
              );
            }
          }
        );

      return () => {
        window.cancelAnimationFrame(
          frameId
        );
      };
    },
    [
      loading,
      location.pathname
    ]
  );


  const isCRM =
    location.pathname.startsWith(
      '/crm'
    );


  const isAuth = [
    '/login',
    '/signup',
    '/client-login',
    '/employee-login',
    '/admin-login',
    '/trial-login',
    '/trial-signup',
    '/client-signup',
    '/employee-signup',
    '/device-pending',
    '/verify-email',
    '/forgot-password'
  ].includes(
    location.pathname
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-500"></div>
      </div>
    );
  }


  /* =========================
     AUTH ROUTES
  ========================= */

  if (isAuth) {
    return (
      <>
        <ScrollToTop />

        <Routes>
          <Route
            path="/login"
            element={
              <ClientLogin />
            }
          />

          <Route
            path="/client-login"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

          <Route
            path="/employee-login"
            element={
              <EmployeeLogin />
            }
          />

          <Route
            path="/admin-login"
            element={
              <AdminLogin />
            }
          />

          <Route
            path="/trial-login"
            element={
              <TrialLogin />
            }
          />

          <Route
            path="/trial-signup"
            element={
              <TrialSignUp />
            }
          />

          <Route
            path="/signup"
            element={
              <Signup />
            }
          />

          <Route
            path="/client-signup"
            element={
              <ClientSignup />
            }
          />

          <Route
            path="/employee-signup"
            element={
              <EmployeeSignup />
            }
          />

          <Route
            path="/device-pending"
            element={
              <DevicePending />
            }
          />

          <Route
            path="/verify-email"
            element={
              <VerifyEmail />
            }
          />

          <Route
            path="/forgot-password"
            element={
              <ForgotPassword />
            }
          />
        </Routes>
      </>
    );
  }


  /* =========================
     CRM ROUTES
  ========================= */

  if (
    isCRM &&
    user
  ) {
    const isClient =
      user.employeeId &&
      user.employeeId.startsWith(
        'CL_'
      );

    if (isClient) {
      return (
        <Navigate
          to="/"
          replace
        />
      );
    }

    return (
      <VoiceAssistantProvider>
        <PortalLayout>
          <ScrollToTop />

          <Routes>
            <Route
              path="/crm/dashboard"
              element={
                <Dashboard />
              }
            />

            <Route
              path="/crm/notifications"
              element={
                <Notifications />
              }
            />

            <Route
              path="/crm/attendance"
              element={
                <Attendance />
              }
            />

            <Route
              path="/crm/leave"
              element={
                <Leave />
              }
            />

            <Route
              path="/crm/profile"
              element={
                <EmployeeProfile />
              }
            />

            <Route
              path="/crm/tickets"
              element={
                <Tickets />
              }
            />

            <Route
              path="/crm/it"
              element={
                <ProtectedRoute>
                  <ItDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/it-dashboard"
              element={
                <ProtectedRoute>
                  <ItDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/manager-chat"
              element={
                <ProtectedRoute>
                  <ManagerChatSupport />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/sales"
              element={
                <SalesPerformance />
              }
            />

            <Route
              path="/crm/sales-dashboard"
              element={
                <ProtectedRoute>
                  <SalesDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/followup"
              element={
                <ProtectedRoute>
                  <Followup />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/trial-dashboard"
              element={
                <ProtectedRoute>
                  <TrialDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/sales-trial-dashboard"
              element={
                <ProtectedRoute>
                  <TrialDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/distributors"
              element={
                <Navigate
                  to="/crm/distributors/tea"
                  replace
                />
              }
            />

            <Route
              path="/crm/distributors/:division"
              element={
                <Distributors />
              }
            />

            <Route
              path="/crm/coal-orders"
              element={
                <CoalOrders />
              }
            />

            <Route
              path="/crm/visitors"
              element={
                <Navigate
                  to="/crm/visitors/tea"
                  replace
                />
              }
            />

            <Route
              path="/crm/visitors/:division"
              element={
                <Visitors />
              }
            />

            <Route
              path="/crm/career-leads"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'HR_MANAGER',
                    'HR_EXECUTIVE',
                    'HR'
                  ].includes(
                    user?.role
                  ) ||
                  user?.department ===
                    'HR'
                )
                  ? (
                      <CareerLeads />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="/crm/leads"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'MANAGER',
                    'HR',
                    'SALES',
                    'EMPLOYEE',
                    'SALES_MANAGER',
                    'SALES_EXECUTIVE',
                    'SALES_TRIAL'
                  ].includes(
                    user?.role
                  ) ||
                  user?.leadPermission ===
                    true
                )
                  ? (
                      <Leads />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="/crm/leads/:id"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'MANAGER',
                    'HR',
                    'SALES',
                    'EMPLOYEE',
                    'SALES_MANAGER',
                    'SALES_EXECUTIVE',
                    'SALES_TRIAL'
                  ].includes(
                    user?.role
                  ) ||
                  user?.leadPermission ===
                    true ||
                  user?.taskPermission ===
                    true
                )
                  ? (
                      <LeadDetail />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="/crm/quotations"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'MANAGER',
                    'SALES_MANAGER',
                    'ADMIN',
                    'FOUNDER',
                    'CO_FOUNDER'
                  ].includes(
                    user?.role
                  )
                )
                  ? (
                      <Quotations />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />


            <Route
              path="/crm/dispatches"
              element={
                <Dispatches />
              }
            />

            <Route
              path="/crm/payments"
              element={
                <Payments />
              }
            />

            <Route
              path="/crm/documents"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'MANAGER',
                    'HR_MANAGER',
                    'HR_EXECUTIVE',
                    'HR',
                    'SALES_MANAGER',
                    'ADMIN',
                    'FOUNDER',
                    'CO_FOUNDER'
                  ].includes(
                    user?.role
                  ) ||
                  user?.department ===
                    'HR' ||
                  user?.documentPermission ===
                    true ||
                  user?.permissions?.document ===
                    true
                )
                  ? (
                      <Documents />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="/crm/shared-files"
              element={
                <ProtectedRoute>
                  <SharedFilesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/products"
              element={
                <ProductUpload />
              }
            />

            <Route
              path="/crm/tasks"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'MANAGER',
                    'SALES_MANAGER',
                    'SALES_EXECUTIVE',
                    'SALES',
                    'EMPLOYEE',
                    'USER',
                    'HR',
                    'HR_EXECUTIVE',
                    'HR_MANAGER',
                    'TRANSPORT',
                    'FINANCE'
                  ].includes(
                    user?.role
                  ) ||
                  Boolean(
                    user?.department
                  ) ||
                  user?.taskPermission ===
                    true ||
                  user?.permissions?.task ===
                    true ||
                  Boolean(user)
                )
                  ? (
                      <Tasks />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="/crm/employees"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'MANAGER',
                    'SALES_MANAGER',
                    'HR_MANAGER',
                    'HR_EXECUTIVE',
                    'HR'
                  ].includes(
                    user?.role
                  )
                )
                  ? (
                      <Employees />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="/crm/employees/:id"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'MANAGER',
                    'SALES_MANAGER',
                    'HR_MANAGER',
                    'HR_EXECUTIVE',
                    'HR'
                  ].includes(
                    user?.role
                  ) ||
                  (
                    user &&
                    window.location.pathname.endsWith(
                      '/' +
                      user._id
                    )
                  )
                )
                  ? (
                      <EmployeeProfile />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="/crm/security"
              element={
                <AdminRoute>
                  <Security />
                </AdminRoute>
              }
            />

            <Route
              path="/crm/reports"
              element={
                <AdminRoute>
                  <Reports />
                </AdminRoute>
              }
            />

            <Route
              path="/crm/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />

            <Route
              path="/crm/ceo"
              element={
                <CEORoute>
                  <CEODashboard />
                </CEORoute>
              }
            />

            <Route
              path="/ceo"
              element={
                <CEORoute>
                  <CEODashboard />
                </CEORoute>
              }
            />

            <Route
              path="/crm/founder"
              element={
                <ManagementRoute>
                  <FounderDashboard />
                </ManagementRoute>
              }
            />

            <Route
              path="/crm/applications"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'ADMIN',
                    'FOUNDER',
                    'CO_FOUNDER',
                    'CEO',
                    'SUPER_ADMIN',
                    'MANAGER',
                    'SALES_MANAGER',
                    'HR_MANAGER',
                    'HR_EXECUTIVE',
                    'HR'
                  ].includes(
                    user?.role
                  )
                )
                  ? (
                      <Applications />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="/crm/jobs"
              element={
                (
                  isAdminUser(user) ||
                  [
                    'ADMIN',
                    'FOUNDER',
                    'CO_FOUNDER',
                    'CEO',
                    'SUPER_ADMIN',
                    'MANAGER',
                    'HR_MANAGER',
                    'HR_EXECUTIVE',
                    'HR'
                  ].includes(
                    user?.role
                  ) ||
                  user?.jobPermission ===
                    true
                )
                  ? (
                      <Jobs />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="/crm/hr"
              element={
                <HRRedirectGate />
              }
            />

            <Route
              path="/crm/hr/manager"
              element={
                <RoleProtectedRoute
                  allowedRoles={[
                    'ADMIN',
                    'MANAGER',
                    'HR_MANAGER'
                  ]}
                >
                  <HrManagerDashboard />
                </RoleProtectedRoute>
              }
            />

            <Route
              path="/crm/hr/executive"
              element={
                <RoleProtectedRoute
                  allowedRoles={[
                    'ADMIN',
                    'MANAGER',
                    'HR_MANAGER',
                    'HR_EXECUTIVE',
                    'HR'
                  ]}
                >
                  <HrExecutiveDashboard />
                </RoleProtectedRoute>
              }
            />

            {/* Finance Routes */}

            <Route
              path="/crm/finance/manager"
              element={
                <ProtectedRoute>
                  <FinanceManagerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/finance/executive"
              element={
                <ProtectedRoute>
                  <FinanceManagerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Transport Module Routes */}

            <Route
              path="/crm/transport/manager"
              element={
                <ProtectedRoute>
                  <TransportManager />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transport/manager"
              element={
                <ProtectedRoute>
                  <TransportManager />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/transport/executive"
              element={
                <ProtectedRoute>
                  <TransportExecutive />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transport/executive"
              element={
                <ProtectedRoute>
                  <TransportExecutive />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crm/transport/driver"
              element={
                <ProtectedRoute>
                  <DriverMobileView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/transport/driver"
              element={
                <ProtectedRoute>
                  <DriverMobileView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/founder"
              element={
                <ManagementRoute>
                  <FounderDashboard />
                </ManagementRoute>
              }
            />

            <Route
              path="/crm/controlled-campaigns"
              element={
                isControlledCampaignUser(
                  user
                )
                  ? (
                      <ControlledCampaigns />
                    )
                  : (
                      <Navigate
                        to="/crm/dashboard"
                        replace
                      />
                    )
              }
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="/crm/dashboard"
                  replace
                />
              }
            />
          </Routes>
        </PortalLayout>
      </VoiceAssistantProvider>
    );
  }


  /* =========================
     CRM WITHOUT LOGIN
  ========================= */

  if (
    isCRM &&
    !user
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  /* =========================
     PUBLIC WEBSITE ROUTES
  ========================= */

  const isITOAds =
    location.pathname ===
    '/ito-ads';

  const isOnion =
    location.pathname ===
    '/nashik-onion';

  const hidePublicChrome =
    isITOAds ||
    isOnion ||
    isPricingRoute(
      location.pathname
    );


  return (
    <div>
      <ScrollToTop />

      {!hidePublicChrome && (
        <Navbar />
      )}

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Home />
            }
          />

          <Route
            path="/products"
            element={
              <Products />
            }
          />

          <Route
            path="/products/:id"
            element={
              <ProductDetail />
            }
          />

          <Route
            path="/about"
            element={
              <About />
            }
          />

          <Route
            path="/contact"
            element={
              <Contact />
            }
          />

          <Route
            path="/careers"
            element={
              <Careers />
            }
          />

          <Route
            path="/quote-request"
            element={
              <QuoteRequest />
            }
          />


          <Route
            path="/our-services"
            element={
              <OurServices />
            }
          />

          <Route
            path="/coal"
            element={
              <Coal />
            }
          />

          <Route
            path="/prakriti"
            element={
              <Navigate
                to="/prakriti/tea"
                replace
              />
            }
          />

          <Route
            path="/prakriti/tea"
            element={
              <Prakriti />
            }
          />

          <Route
            path="/prakriti/rice"
            element={
              <Rice />
            }
          />

          <Route
            path="/stone"
            element={
              <Stone />
            }
          />

          <Route
            path="/stone/pricing"
            element={
              <StonePricing />
            }
          />

          <Route
            path="/rice/pricing"
            element={
              <RicePricing />
            }
          />

          <Route
            path="/tea/pricing"
            element={
              <TeaPricing />
            }
          />

          <Route
            path="/ito-ads"
            element={
              <Suspense
                fallback={
                  <div className="flex min-h-[50vh] items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
                  </div>
                }
              >
                <ITOAds />
              </Suspense>
            }
          />

          <Route
            path="/privacy-policy"
            element={
              <PrivacyPolicy />
            }
          />

          <Route
            path="/terms"
            element={
              <Terms />
            }
          />

          <Route
            path="/terms-and-conditions"
            element={
              <Terms />
            }
          />

          <Route
            path="/fraud-payment-policy"
            element={
              <FraudPaymentPolicy />
            }
          />

          <Route
            path="/disclaimer"
            element={
              <Disclaimer />
            }
          />

          <Route
            path="/nashik-onion"
            element={
              <Onion />
            }
          />
        </Routes>
      </main>


      {isITOAds && (
        <CommercialRequirement
          key={
            location.pathname
          }
          category="ITO_ADS"
        />
      )}


      {!hidePublicChrome && (
        <Footer />
      )}


      {!isITOAds &&
        !isOnion && (
          <ChatWidget />
        )}


      {/*
        Master DPR v4.0 — Phase 1 consent management.

        This is intentionally rendered only on the public website.
        CRM/auth/employee routes are excluded from acquisition analytics,
        so they do not need the customer-facing tracking banner.
      */}
      <TrackingConsentBanner />
    </div>
  );
}


/* =========================================================
   APP ROOT
========================================================= */

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration:
              4000,

            style: {
              background:
                '#23262C',

              color:
                '#ECECEC',

              fontSize:
                '11px',

              fontFamily:
                'Inter, system-ui, sans-serif',

              border:
                '1px solid rgba(197, 203, 211, 0.15)',

              borderRadius:
                '2px',

              boxShadow:
                '0 4px 12px rgba(0, 0, 0, 0.2)'
            },

            success: {
              iconTheme: {
                primary:
                  '#56A587',

                secondary:
                  '#23262C'
              }
            },

            error: {
              iconTheme: {
                primary:
                  '#C96A57',

                secondary:
                  '#23262C'
              }
            }
          }}
        />

        <SecurityGuard>
          <AppLayout />
        </SecurityGuard>
      </AuthProvider>
    </Router>
  );
}


export default App;