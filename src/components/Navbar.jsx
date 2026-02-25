import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User, LogOut, Menu } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isLargeFont, setIsLargeFont] = useState(false);
    const [isHighContrast, setIsHighContrast] = useState(false);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        logout();
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
                    <div className="flex items-center gap-4">
                        {user.role === 'hospital_admin' || user.role === 'super_admin' ? (
                            <Link to="/dashboard" className="px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all premium-shadow">
                                Admin
                            </Link>
                        ) : user.role === 'doctor' ? (
                            <Link to="/doctor-dashboard" className="px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all premium-shadow">
                                Doctor
                            </Link>
                        ) : (
                            <Link to="/patient-dashboard" className="px-6 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all premium-shadow">
                                Dashboard
                            </Link>
                        )}
                        <Link to="/passport" className="px-6 py-2 bg-medical-soft text-medical-primary rounded-full text-sm font-medium hover:bg-blue-100 transition-all">
                            Passport
                        </Link>
                        <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                            <LogOut size={20} />
                        </button>
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
