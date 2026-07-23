import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

import ScrollToTop from './utils/ScrollToTop'; // <-- Already imported cleanly here!
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
import Signup from './pages/public/Signup';
import ClientSignup from './pages/public/ClientSignup';
import EmployeeSignup from './pages/public/EmployeeSignup';
import DevicePending from './pages/public/DevicePending';
import VerifyEmail from './pages/public/VerifyEmail';
import ForgotPassword from './pages/public/ForgotPassword';

import Dashboard from './pages/crm/Dashboard';
import Leads from './pages/crm/Leads';
// import Stone from './pages/public/Stone';
import LeadDetail from './pages/crm/LeadDetail';
import Quotations from './pages/crm/Quotations';
import Dispatches from './pages/crm/Dispatches';
import Payments from './pages/crm/Payments';
import Documents from './pages/crm/Documents';
import Employees from './pages/crm/Employees';
import Distributors from './pages/crm/Distributors';
import Security from './pages/crm/Security';
import Reports from './pages/crm/Reports';
import AdminPanel from './pages/crm/AdminPanel';
import ProductUpload from './pages/crm/ProductUpload';
import Tasks from './pages/crm/Tasks';
import Notifications from './pages/crm/Notifications';
import Applications from './pages/crm/Applications';
import Jobs from './pages/crm/Jobs';

import Navbar from './components/Layout/Navbar';
import PortalLayout from './components/Layout/PortalLayout';
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
  const isCRM = location.pathname.startsWith('/crm');
  const isAuth = [
    '/login',
    '/signup',
    '/client-login',
    '/employee-login',
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
      <PortalLayout>
        <ScrollToTop /> {/* <-- INJECTED TO HANDLE CRM DASHBOARD CHANNELS */}
        <Routes>
          <Route path="/crm/dashboard" element={<Dashboard />} />
          <Route path="/crm/notifications" element={<Notifications />} />
          <Route path="/crm/distributors" element={<Distributors />}/>
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
          {/* <Route path="/stone" element={<Stone />} /> */}
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
        <Toaster position="top-right" />
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}

export default App;