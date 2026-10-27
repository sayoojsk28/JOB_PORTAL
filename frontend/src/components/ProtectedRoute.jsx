
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken } from '../utils/authHelper';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ allowedRoles }) => {
  const token = getAccessToken();

  const loginRoute = allowedRoles.includes('admin')
    ? '/login/admin'
    : allowedRoles.includes('employee')
      ? '/login/employee'
      : '/login/student';

  if (!token) {
    return <Navigate to={loginRoute} replace />;
  }

  try {
    const decoded = jwtDecode(token);
    const isExpired = !decoded.exp || decoded.exp * 1000 <= Date.now();

    if (isExpired) {
      return <Navigate to={loginRoute} replace />;
    }

    if (!allowedRoles.includes(decoded.role)) {
      return <Navigate to="/" replace />;
    }

    return <Outlet />;
  } catch {
    return <Navigate to={loginRoute} replace />;
  }
};

export default ProtectedRoute;
