import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ studentInfo, children }) => {
  if (!studentInfo) {
    return <Navigate to="/" />;  // Redirect to login page if no student info (password not entered)
  }

  return children;  // Show protected content if student info exists
};

export default ProtectedRoute;
