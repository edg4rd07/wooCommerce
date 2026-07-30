import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--text-main)' }}>Cargando sesión...</div>;
  }

  if (!user) {
    // Si no está logueado, redirigir al login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se definen roles permitidos, verificar que el usuario tenga acceso
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'admin') {
    // Si no tiene acceso, redirigir a una ruta por defecto según su rol
    if (user.role === 'production') return <Navigate to="/production" replace />;
    if (user.role === 'delivery') return <Navigate to="/delivery" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
