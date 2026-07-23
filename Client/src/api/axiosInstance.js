import axios from 'axios';

const API_BASE_URL = 'https://indiatradeoverseas-ito.onrender.com/api';

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

      // 🛡️ Suppress auto-redirect when on Prakriti Customer Portal
      if (currentPath.includes('/prakriti')) {
        console.warn('401 Unauthorized suppressed on Prakriti Customer Portal (Session missing/expired).');
        return Promise.reject(error);
      }

      if (currentPath === '/login' || currentPath === '/signup') {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;