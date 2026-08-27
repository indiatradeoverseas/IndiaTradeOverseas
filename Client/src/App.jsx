import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

import ScrollToTop from './utils/ScrollToTop'; // <-- Already imported cleanly here!
import { pushDataLayerEvent, initActivityTracking } from './utils/analytics';
import Home from './pages/public/Home';
import Products from './pages/public/Products';
import Rice from './pages/public/Rice';
import ProductDetail from './pages/public/ProductDetail';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Careers from './pages/public/Careers';
import QuoteRequest from './pages/public/QuoteRequest';
import Login from './pages/public/Login';
import ClientLogin from './pages/public/ClientLogin';
import EmployeeLogin from './pages/public/EmployeeLogin';
import AdminLogin from './pages/public/AdminLogin';
import Signup from './pages/public/Signup';
import ClientSignup from './pages/public/ClientSignup';
import EmployeeSignup from './pages/public/EmployeeSignup';
import DevicePending from './pages/public/DevicePending';
import VerifyEmail from './pages/public/VerifyEmail';
import ForgotPassword from './pages/public/ForgotPassword';


import Dashboard from './pages/crm/Dashboard';
import Leads from './pages/crm/Leads';
import Stone from './pages/public/Stone';
import LeadDetail from './pages/crm/LeadDetail';
import Quotations from './pages/crm/Quotations';
import Dispatches from './pages/crm/Dispatches';
import Payments from './pages/crm/Payments';
import Documents from './pages/crm/Documents';
import Employees from './pages/crm/Employees';
import Distributors from './pages/crm/Distributors';
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

import HrManagerDashboard from './pages/crm/HrManagerDashboard';
import HrExecutiveDashboard from './pages/crm/HrExecutiveDashboard';
import FounderDashboard from './pages/crm/FounderDashboard';
import FinanceManagerDashboard from './pages/crm/FinanceManagerDashboard';
import FinanceDashboard from './pages/crm/FinanceDashboard';


import Navbar from './components/Layout/Navbar';
import PortalLayout from './components/Layout/PortalLayout';
import { VoiceAssistantProvider } from './context/VoiceAssistantContext';
import Footer from './components/Layout/Footer';
import ChatWidget from './components/Chat/ChatWidget';
import Prakriti from './pages/public/Prakriti';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

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

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !isAdminUser(user)) {
    return <Navigate to="/crm/dashboard" />;
  }

  return children;
}

function RoleProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/crm/dashboard" />;
  }

  return children;
}

function HRRedirectGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (['ADMIN', 'MANAGER', 'HR_MANAGER'].includes(user.role)) {
    return <Navigate to="/crm/hr/manager" replace />;
  } else if (['HR_EXECUTIVE', 'HR'].includes(user.role)) {
    return <Navigate to="/crm/hr/executive" replace />;
  } else {
    return <Navigate to="/crm/dashboard" replace />;
  }
}

function FinanceRedirectGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isFinanceManager = user?.role === 'FINANCE_MANAGER' || 
                           user?.role === 'ACCOUNTS_MANAGER' || 
                           (user?.department === 'FINANCE' && user?.position?.toLowerCase()?.includes('manager'));

  if (['ADMIN', 'MANAGER'].includes(user.role) || isFinanceManager) {
    return <Navigate to="/crm/finance/manager" replace />;
  } else {
    return <Navigate to="/crm/finance/executive" replace />;
  }
}

function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // SPA route changes don't trigger a new document load, so GTM's default
  // pageview trigger only ever fires once. Push a virtual pageview per route
  // change so ad-traffic landing on / then navigating to /stone (or any page)
  // is captured.
  useEffect(() => {
    pushDataLayerEvent('virtual_page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title
    });
  }, [location.pathname, location.search]);

  // Site-wide click + form-submit tracking (every button/link click and form
  // submission), mounted once. See utils/analytics.js for what's captured.
  useEffect(() => {
    initActivityTracking();
  }, []);

  const isCRM = location.pathname.startsWith('/crm');
  const isAuth = [
    '/login',
    '/signup',
    '/client-login',
    '/employee-login',
    '/admin-login',
    '/client-signup',
    '/employee-signup',
    '/device-pending',
    '/verify-email',
    '/forgot-password'
  ].includes(location.pathname);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isAuth) {
    return (
      <>
        <ScrollToTop /> {/* <-- INJECTED TO HANDLE AUTH ENTRY ROUTES */}
        <Routes>
          <Route path="/login" element={<ClientLogin />} />
          <Route path="/client-login" element={<Navigate to="/login" replace />} />
          <Route path="/employee-login" element={<EmployeeLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/client-signup" element={<ClientSignup />} />
          <Route path="/employee-signup" element={<EmployeeSignup />} />
          <Route path="/device-pending" element={<DevicePending />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </>
    );
  }

  if (isCRM && user) {
    const isClient = user.employeeId && user.employeeId.startsWith('CL_');
    if (isClient) {
      return <Navigate to="/" replace />;
    }
    return (
      <VoiceAssistantProvider>
        <PortalLayout>
          <ScrollToTop /> {/* <-- INJECTED TO HANDLE CRM DASHBOARD CHANNELS */}
        <Routes>
          <Route path="/crm/dashboard" element={<Dashboard />} />
          <Route path="/crm/notifications" element={<Notifications />} />
          <Route path="/crm/attendance" element={<Attendance />} />
          <Route path="/crm/leave" element={<Leave />} />
          <Route path="/crm/profile" element={<EmployeeProfile />} />
          <Route path="/crm/tickets" element={<Tickets />} />
          <Route path="/crm/sales" element={<SalesPerformance />} />
          <Route path="/crm/sales-dashboard" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
          <Route path="/crm/distributors" element={<Navigate to="/crm/distributors/tea" replace />}/>
          <Route path="/crm/distributors/:division" element={<Distributors />}/>
          <Route path="/crm/visitors" element={<Navigate to="/crm/visitors/tea" replace />}/>
          <Route path="/crm/visitors/:division" element={<Visitors />}/>
          <Route
            path="/crm/career-leads"
            element={
              (isAdminUser(user) || ['MANAGER', 'SALES_MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role)) ? (
                <CareerLeads />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route
            path="/crm/leads"
            element={
              (isAdminUser(user) || ['MANAGER', 'HR', 'SALES', 'EMPLOYEE', 'SALES_MANAGER', 'SALES_EXECUTIVE'].includes(user?.role) || user?.leadPermission === true) ? (
                <Leads />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route
            path="/crm/leads/:id"
            element={
              (isAdminUser(user) || ['MANAGER', 'HR', 'SALES', 'EMPLOYEE', 'SALES_MANAGER', 'SALES_EXECUTIVE'].includes(user?.role) || user?.leadPermission === true || user?.taskPermission === true) ? (
                <LeadDetail />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route path="/crm/quotations" element={<Quotations />} />
          <Route path="/crm/dispatches" element={<Dispatches />} />
          <Route path="/crm/payments" element={<Payments />} />
          <Route
            path="/crm/documents"
            element={
              (isAdminUser(user) || user?.documentPermission === true) ? (
                <Documents />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route path="/crm/products" element={<ProductUpload />} />
          <Route
            path="/crm/tasks"
            element={
              (isAdminUser(user) || ['MANAGER', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'SALES'].includes(user?.role) || user?.taskPermission === true || user?.permissions?.task === true) ? (
                <Tasks />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route
            path="/crm/employees"
            element={
              (isAdminUser(user) || ['MANAGER', 'SALES_MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role)) ? (
                <Employees />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route
            path="/crm/employees/:id"
            element={
              (isAdminUser(user) || ['MANAGER', 'SALES_MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role) || (user && window.location.pathname.endsWith('/' + user._id))) ? (
                <EmployeeProfile />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route path="/crm/security" element={<AdminRoute><Security /></AdminRoute>} />
          <Route path="/crm/reports" element={<AdminRoute><Reports /></AdminRoute>} />
          <Route path="/crm/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/crm/founder" element={<AdminRoute><FounderDashboard /></AdminRoute>} />
          <Route
            path="/crm/applications"
            element={
              ['ADMIN', 'MANAGER', 'SALES_MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role) ? (
                <Applications />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route
            path="/crm/jobs"
            element={
              ['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR'].includes(user?.role) || user?.jobPermission === true ? (
                <Jobs />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route path="/crm/hr" element={<HRRedirectGate />} />
          <Route
            path="/crm/hr/manager"
            element={
              <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'HR_MANAGER']}>
                <HrManagerDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/crm/hr/executive"
            element={
              <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'HR_MANAGER', 'HR_EXECUTIVE', 'HR']}>
                <HrExecutiveDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route path="/crm/finance" element={<FinanceRedirectGate />} />
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
                <FinanceDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/crm/dashboard" />} />
        </Routes>
        <ChatWidget />
      </PortalLayout>
      </VoiceAssistantProvider>
    );
  }

  if (isCRM && !user) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <ScrollToTop /> {/* <-- INJECTED TO HANDLE ALL CORE WEBSITE SCREENS */}
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/quote-request" element={<QuoteRequest />} />
          <Route path="/prakriti" element={<Prakriti />} />
          <Route path='/prakriti/rice' element={<Rice/>}/>
          <Route path="/stone" element={<Stone />} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#23262C',
              color: '#E7E3D9',
              border: '1px solid rgba(231,227,217,0.16)',
              borderRadius: '6px',
              fontSize: '13px',
              padding: '10px 14px',
              boxShadow: '0 20px 44px -20px rgba(0,0,0,0.5)'
            },
            success: { iconTheme: { primary: '#56A587', secondary: '#23262C' } },
            error: { iconTheme: { primary: '#C96A57', secondary: '#23262C' } }
          }}
        />
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}

export default App;