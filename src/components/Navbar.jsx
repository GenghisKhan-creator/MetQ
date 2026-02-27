import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User, LogOut, Menu, Shield, LayoutDashboard, ChevronDown } from 'lucide-react';
import UserAvatar from './UserAvatar';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isLargeFont, setIsLargeFont] = useState(false);
    const [isHighContrast, setIsHighContrast] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
        navigate('/login');
    };

    const toggleLargeFont = () => {
        setIsLargeFont(!isLargeFont);
        document.documentElement.classList.toggle('text-lg-mode');
    };

    const toggleHighContrast = () => {
        setIsHighContrast(!isHighContrast);
        document.documentElement.classList.toggle('high-contrast');
    };

    const getDashboardPath = () => {
        if (user?.role === 'hospital_admin' || user?.role === 'super_admin') return '/dashboard';
        if (user?.role === 'doctor') return '/doctor-dashboard';
        return '/patient-dashboard';
    };

    const getDashboardLabel = () => {
        if (user?.role === 'hospital_admin' || user?.role === 'super_admin') return 'Admin Dashboard';
        if (user?.role === 'doctor') return 'Doctor Dashboard';
        return 'My Dashboard';
    };

    return (
        <nav className={`fixed w-full z-50 glass-morphism px-8 py-4 flex justify-between items-center transition-all duration-300 ${isHighContrast ? 'bg-black border-yellow-400' : ''}`}>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="p-2 bg-medical-primary rounded-lg text-white">
                        <Activity size={24} />
                    </div>
                    <span className={`text-2xl font-bold tracking-tight ${isHighContrast ? 'text-white' : 'text-medical-primary'}`}>MetQ.</span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={toggleLargeFont}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${isLargeFont ? 'bg-black text-white' : 'bg-white text-gray-400 border-gray-100'}`}
                    >
                        A+
                    </button>
                    <button
                        onClick={toggleHighContrast}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${isHighContrast ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white text-gray-400 border-gray-100'}`}
                    >
                        Contrast
                    </button>
                </div>
            </div>

            <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600 uppercase tracking-widest">
                {[
                    { name: 'Home', path: '/' },
                    { name: 'About', path: '/about' },
                    { name: 'Technology', path: '/technology' },
                    { name: 'Services', path: '/services' }
                ].map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`transition-all duration-300 relative py-1 ${isActive(link.path) ? 'text-medical-primary font-bold' : 'hover:text-medical-primary'}`}
                    >
                        {link.name}
                        {isActive(link.path) && (
                            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-medical-primary rounded-full"></span>
                        )}
                    </Link>
                ))}
            </div>

            <div className="flex items-center gap-4">
                {user ? (
                    <div className="relative">
                        {/* Avatar Button */}
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-gray-100 premium-shadow hover:border-gray-300 transition-all"
                        >
                            <UserAvatar user={user} size="sm" />
                            <div className="hidden md:block text-left">
                                <div className="text-xs font-black text-gray-900 leading-none">{user.full_name?.split(' ')[0]}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{user.role?.replace('_', ' ')}</div>
                            </div>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
                                <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl premium-shadow border border-gray-100 overflow-hidden z-50">
                                    {/* User Info */}
                                    <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                                        <div className="font-black text-gray-900 text-sm">{user.full_name}</div>
                                        <div className="text-xs text-gray-400 font-medium truncate">{user.email || user.medical_id}</div>
                                    </div>
                                    {/* Items */}
                                    <div className="p-2">
                                        <Link
                                            to={getDashboardPath()}
                                            onClick={() => setShowUserMenu(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-50 text-gray-700 transition-colors group"
                                        >
                                            <LayoutDashboard size={16} className="text-gray-400 group-hover:text-medical-primary" />
                                            <span className="text-sm font-bold">{getDashboardLabel()}</span>
                                        </Link>

                                        <Link
                                            to="/profile"
                                            onClick={() => setShowUserMenu(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-50 text-gray-700 transition-colors group"
                                        >
                                            <User size={16} className="text-gray-400 group-hover:text-medical-primary" />
                                            <span className="text-sm font-bold">My Profile</span>
                                        </Link>

                                        <Link
                                            to="/passport"
                                            onClick={() => setShowUserMenu(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-gray-50 text-gray-700 transition-colors group"
                                        >
                                            <Shield size={16} className="text-gray-400 group-hover:text-medical-primary" />
                                            <span className="text-sm font-bold">Health Passport</span>
                                        </Link>

                                        <div className="border-t border-gray-100 mt-2 pt-2">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-red-50 text-red-400 transition-colors"
                                            >
                                                <LogOut size={16} />
                                                <span className="text-sm font-bold">Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <Link to="/book" className="px-8 py-2.5 bg-black text-white rounded-full text-sm font-semibold hover:scale-105 transition-all premium-shadow active:scale-95">
                        Book a call
                    </Link>
                )}
                <button className="md:hidden p-2 text-gray-600">
                    <Menu size={24} />
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
