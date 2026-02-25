import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requireAdmin }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (requireAdmin && user.role !== 'hospital_admin' && user.role !== 'super_admin') {
        return <Navigate to="/" />;
    }

    return children;
};
