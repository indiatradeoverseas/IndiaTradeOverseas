import axios from 'axios';

let API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
if (API_BASE_URL.endsWith('/api/v1')) {
  API_BASE_URL = API_BASE_URL.replace('/api/v1', '/api');
} else if (API_BASE_URL.endsWith('/api/v1/')) {
  API_BASE_URL = API_BASE_URL.replace('/api/v1/', '/api');
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});


axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    let deviceHash = localStorage.getItem('deviceHash');
    if (!deviceHash) {
      deviceHash = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceHash', deviceHash);
    }
    config.headers['x-device-hash'] = deviceHash;

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);


axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    } else if (!error.response) {
      console.error('Network Error - Backend might be down');
    } else if (error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    } else if (error.response.status === 403 &&
      (error.response.data?.errorCode === 'DEVICE_PENDING_APPROVAL' ||
        error.response.data?.errorCode === 'DEVICE_REQUIRED')) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/device-pending') {
        window.location.href = '/device-pending';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
