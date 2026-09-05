import axios from 'axios';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE_URL = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000/api' : 'https://indiatradeoverseas-1.onrender.com/api');

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const requestUrl = config.url || '';

    // Safely extract custom header
    const portalContext = config.headers ? config.headers['X-Portal-Context'] : null;

    let isCustomerAction = false;

    if (portalContext === 'customer') {
      isCustomerAction = true;
    } else if (portalContext === 'admin') {
      isCustomerAction = false;
    } else {
      isCustomerAction =
        currentPath.includes('/prakriti') ||
        requestUrl.includes('/distributors/verify-otp') ||
        requestUrl.includes('/distributors/resend-otp') ||
        requestUrl.includes('/distributors/status/');
    }

    // Safely remove context header before sending request
    if (config.headers && config.headers['X-Portal-Context']) {
      delete config.headers['X-Portal-Context'];
    }

    let token = null;

    if (isCustomerAction) {
      // 🟢 Customer Token
      token = localStorage.getItem('distributor_token');
    } else {
      // 🔵 Admin/Employee Token
      token = localStorage.getItem('token');
    }

    // Attach Token safely using standard Axios header setters or fallback
    if (token) {
      if (config.headers.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Device Hash
    let deviceHash = localStorage.getItem('deviceHash');
    if (!deviceHash) {
      deviceHash = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceHash', deviceHash);
    }

    if (config.headers.set) {
      config.headers.set('x-device-hash', deviceHash);
    } else {
      config.headers['x-device-hash'] = deviceHash;
    }

    if (config.data instanceof FormData) {
      if (config.headers.delete) {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const requestUrl = error.config?.url || '';

      // 🛡️ Suppress auto-redirect when on Prakriti Customer Portal
      if (currentPath.includes('/prakriti')) {
        console.warn('401 Unauthorized suppressed on Prakriti Customer Portal (Session missing/expired).');
        return Promise.reject(error);
      }

      // 🛡️ If the caller explicitly suppressed auto-logout (e.g. dashboard batch calls)
      if (error.config?._suppressAutoLogout) {
        return Promise.reject(error);
      }

      const authPaths = [
        '/login',
        '/signup',
        '/client-login',
        '/employee-login',
        '/admin-login',
        '/client-signup',
        '/employee-signup',
        '/verify-email',
        '/forgot-password'
      ];

      if (authPaths.includes(currentPath) || currentPath.startsWith('/verify-email') || currentPath.startsWith('/forgot-password')) {
        return Promise.reject(error);
      }

      // 🛡️ Only auto-logout for auth verification endpoints (getMe / checkAuth).
      // For all other API calls (dashboard data, reports, etc.), let the caller handle 401.
      const authVerifyEndpoints = ['/auth/me', '/employee/me', '/admin-auth/me'];
      const isAuthVerifyCall = authVerifyEndpoints.some(ep => requestUrl.includes(ep));

      if (isAuthVerifyCall) {
        // Token is genuinely invalid/expired — clear session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isEmployeeAuth');
        window.location.href = '/login';
      } else {
        // Non-auth API returned 401 (e.g. RBAC issue on a dashboard call).
        // Log it but do NOT nuke the session — let the component .catch() handle it.
        console.warn(`[Axios] 401 on non-auth endpoint "${requestUrl}" — suppressing auto-logout.`);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
