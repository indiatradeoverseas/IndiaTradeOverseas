/**
 * Central Client Environment & Backend URL Configuration
 * 
 * Changing VITE_BACKEND_URL or VITE_API_URL in Client/.env 
 * automatically updates every API endpoint, WebSocket connection, 
 * and file download link across the entire application!
 */

const FALLBACK_BACKEND = import.meta.env.PROD 
  ? 'https://indiatradeoverseas-1.onrender.com' 
  : 'http://localhost:5000';

const rawBackend = (import.meta.env.VITE_BACKEND_URL || FALLBACK_BACKEND).trim().replace(/\/+$/, '');
const rawApi = (import.meta.env.VITE_API_URL || `${rawBackend}/api`).trim().replace(/\/+$/, '');

export const BACKEND_URL = rawBackend;
export const API_URL = rawApi;

/**
 * Helper function to construct full absolute URL for uploaded files or relative media paths.
 * @param {string} relativeOrAbsoluteUrl 
 * @returns {string} Absolute URL
 */
export const getFileUrl = (relativeOrAbsoluteUrl) => {
  if (!relativeOrAbsoluteUrl) return '';
  if (relativeOrAbsoluteUrl.startsWith('http://') || relativeOrAbsoluteUrl.startsWith('https://')) {
    return relativeOrAbsoluteUrl;
  }
  const cleanPath = relativeOrAbsoluteUrl.replace(/^\/+/, '');
  return `${BACKEND_URL}/${cleanPath}`;
};

export default {
  BACKEND_URL,
  API_URL,
  getFileUrl
};
