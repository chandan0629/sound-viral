export const BACKEND_URL = import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? (window.location.protocol === 'https:' ? 'http://10.0.2.2:5000' : 'http://localhost:5000')
    : 'https://sound-viral-production-b006.up.railway.app');
