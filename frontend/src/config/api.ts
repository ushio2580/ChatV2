// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3003';

export { API_BASE_URL, SOCKET_URL };

// Environment check
export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;
