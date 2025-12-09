import React from 'react';
import { Navigate } from 'react-router-dom';
import adminAuth from '../utils/auth';

const ProtectedRoute = ({ children }) => {
  return adminAuth.isAuthenticated() ? children : <Navigate to="/admin/login" />;
};

export default ProtectedRoute;