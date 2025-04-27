import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, studentInfo }) {
  if (!studentInfo) {
    // If no student info, redirect to password page
    return <Navigate to="/" replace />;
  }
  return children;
}
