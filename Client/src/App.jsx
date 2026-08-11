import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

import ScrollToTop from './utils/ScrollToTop'; // <-- Already imported cleanly here!
import { pushDataLayerEvent, initActivityTracking } from './utils/analytics';
// Home stays a static import - it's the most common landing page and needs
// to be in the initial bundle for prerendering/first paint. Every other
// route (including the entire CRM, which is most of this app's code) is
// lazy-loaded so a marketing visitor never downloads the CRM bundle, and a
// CRM user never downloads pages they haven't navigated to yet.
import Home from './pages/public/Home';
const Products = lazy(() => import('./pages/public/Products'));
const Rice = lazy(() => import('./pages/public/Rice'));
const ProductDetail = lazy(() => import('./pages/public/ProductDetail'));
const About = lazy(() => import('./pages/public/About'));
const Contact = lazy(() => import('./pages/public/Contact'));
const Careers = lazy(() => import('./pages/public/Careers'));
const QuoteRequest = lazy(() => import('./pages/public/QuoteRequest'));
const ClientLogin = lazy(() => import('./pages/public/ClientLogin'));
const EmployeeLogin = lazy(() => import('./pages/public/EmployeeLogin'));
const AdminLogin = lazy(() => import('./pages/public/AdminLogin'));
const Signup = lazy(() => import('./pages/public/Signup'));
const ClientSignup = lazy(() => import('./pages/public/ClientSignup'));
const EmployeeSignup = lazy(() => import('./pages/public/EmployeeSignup'));
const DevicePending = lazy(() => import('./pages/public/DevicePending'));
const VerifyEmail = lazy(() => import('./pages/public/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'));

const Dashboard = lazy(() => import('./pages/crm/Dashboard'));
const Leads = lazy(() => import('./pages/crm/Leads'));
const Stone = lazy(() => import('./pages/public/Stone'));
const LeadDetail = lazy(() => import('./pages/crm/LeadDetail'));
const Quotations = lazy(() => import('./pages/crm/Quotations'));
const Dispatches = lazy(() => import('./pages/crm/Dispatches'));
const Payments = lazy(() => import('./pages/crm/Payments'));
const Documents = lazy(() => import('./pages/crm/Documents'));
const Employees = lazy(() => import('./pages/crm/Employees'));
const Distributors = lazy(() => import('./pages/crm/Distributors'));
const Visitors = lazy(() => import('./pages/crm/Visitors'));
const Security = lazy(() => import('./pages/crm/Security'));
const Reports = lazy(() => import('./pages/crm/Reports'));
const AdminPanel = lazy(() => import('./pages/crm/AdminPanel'));
const ProductUpload = lazy(() => import('./pages/crm/ProductUpload'));
const Tasks = lazy(() => import('./pages/crm/Tasks'));
const Notifications = lazy(() => import('./pages/crm/Notifications'));
const Applications = lazy(() => import('./pages/crm/Applications'));
const CareerLeads = lazy(() => import('./pages/crm/CareerLeads'));
const Jobs = lazy(() => import('./pages/crm/Jobs'));
const Attendance = lazy(() => import('./pages/crm/Attendance'));
const Tickets = lazy(() => import('./pages/crm/Tickets'));
const Leave = lazy(() => import('./pages/crm/Leave'));
const EmployeeProfile = lazy(() => import('./pages/crm/EmployeeProfile'));
const SalesPerformance = lazy(() => import('./pages/crm/SalesPerformance'));
const Prakriti = lazy(() => import('./pages/public/Prakriti'));

import Navbar from './components/Layout/Navbar';
import PortalLayout from './components/Layout/PortalLayout';
import Footer from './components/Layout/Footer';
import ChatWidget from './components/Chat/ChatWidget';

function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}

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

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
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
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </>
    );
  }

  if (isCRM && user) {
    const isClient = user.employeeId && user.employeeId.startsWith('CL_');
    if (isClient) {
      return <Navigate to="/" replace />;
    }
    return (
      <PortalLayout>
        <ScrollToTop /> {/* <-- INJECTED TO HANDLE CRM DASHBOARD CHANNELS */}
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/crm/dashboard" element={<Dashboard />} />
          <Route path="/crm/notifications" element={<Notifications />} />
          <Route path="/crm/attendance" element={<Attendance />} />
          <Route path="/crm/leave" element={<Leave />} />
          <Route path="/crm/profile" element={<EmployeeProfile />} />
          <Route path="/crm/tickets" element={<Tickets />} />
          <Route path="/crm/sales" element={<SalesPerformance />} />
          <Route path="/crm/distributors" element={<Navigate to="/crm/distributors/tea" replace />}/>
          <Route path="/crm/distributors/:division" element={<Distributors />}/>
          <Route path="/crm/visitors" element={<Navigate to="/crm/visitors/tea" replace />}/>
          <Route path="/crm/visitors/:division" element={<Visitors />}/>
          <Route
            path="/crm/career-leads"
            element={
              ['ADMIN', 'MANAGER', 'HR'].includes(user?.role) ? (
                <CareerLeads />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route
            path="/crm/leads"
            element={
              user?.role === 'ADMIN' || user?.leadPermission === true ? (
                <Leads />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route
            path="/crm/leads/:id"
            element={
              user?.role === 'ADMIN' || user?.leadPermission === true || user?.taskPermission === true ? (
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
              user?.role === 'ADMIN' || user?.documentPermission === true ? (
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
              user?.role === 'ADMIN' || user?.taskPermission === true ? (
                <Tasks />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route path="/crm/employees" element={<AdminRoute><Employees /></AdminRoute>} />
          <Route path="/crm/employees/:id" element={<AdminRoute><EmployeeProfile /></AdminRoute>} />
          <Route path="/crm/security" element={<AdminRoute><Security /></AdminRoute>} />
          <Route path="/crm/reports" element={<AdminRoute><Reports /></AdminRoute>} />
          <Route path="/crm/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route
            path="/crm/applications"
            element={
              ['ADMIN', 'MANAGER', 'HR'].includes(user?.role) ? (
                <Applications />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route
            path="/crm/jobs"
            element={
              ['ADMIN', 'MANAGER', 'HR'].includes(user?.role) || user?.jobPermission === true ? (
                <Jobs />
              ) : (
                <Navigate to="/crm/dashboard" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/crm/dashboard" />} />
        </Routes>
        </Suspense>
        <ChatWidget />
      </PortalLayout>
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
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
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