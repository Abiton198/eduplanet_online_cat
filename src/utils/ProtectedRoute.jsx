import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ studentInfo, adminInfo, children }) => {
  if (!studentInfo && !adminInfo) {
    return <Navigate to="/" />;  // Redirect if no one is logged in
  }

  return children;  // Allow access if student or admin is authenticated
};

export default ProtectedRoute;
