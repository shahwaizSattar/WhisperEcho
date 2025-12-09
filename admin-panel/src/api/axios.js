import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const isAdmin = localStorage.getItem('isAdmin');
    const adminToken = localStorage.getItem('adminToken');
    
    if (isAdmin === 'true' && adminToken) {
      // Add admin headers for backend verification
      config.headers['X-Admin-Auth'] = 'true';
      config.headers['X-Admin-Token'] = adminToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
