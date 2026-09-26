import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import authService from '../services/authService.js';

const ProtectedRoute = ({ children }) => {
  const token = authService.getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
