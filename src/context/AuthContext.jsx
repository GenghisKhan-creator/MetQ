import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // In a real app, verify token with backend
            const storedUser = JSON.parse(localStorage.getItem('user'));
            setUser(storedUser);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return user;
    };

    const register = async (userData) => {
        const res = await axios.post('http://localhost:5000/api/auth/register', userData);
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    const changePassword = async (newPassword) => {
        const res = await axios.post('http://localhost:5000/api/auth/change-password', { newPassword });
        // Update user state locally
        const updatedUser = { ...user, requires_password_change: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return res.data;
    };

    const value = {
        user,
        login,
        register,
        changePassword,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
