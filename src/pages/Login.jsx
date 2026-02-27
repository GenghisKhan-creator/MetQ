import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Mail, Lock, ArrowRight, User, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                const user = await login(email, password);
                if (user.role === 'patient') navigate('/patient-dashboard');
                else if (user.role === 'doctor') navigate('/doctor-dashboard');
                else navigate('/dashboard');
            } else {
                const user = await register({ full_name: fullName, email, password, role: 'patient' });
                navigate('/patient-dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#E2E8F0] flex justify-center items-center">
            <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] premium-shadow border border-white">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-medical-primary rounded-2xl text-white mb-4">
                        <Activity size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900">{isLogin ? 'Welcome Back' : 'Join MetQ'}</h2>
                    <p className="text-gray-500 text-sm mt-2 text-center">
                        {isLogin ? 'Enter your credentials to access your global medical passport.' : 'Start your journey towards a smarter healthcare experience.'}
                    </p>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium"
                                required
                            />
                        </div>
                    )}
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium"
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>



                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-black text-white rounded-2xl font-bold flex justify-center items-center gap-2 hover:scale-[1.02] transition-all premium-shadow disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Login Account' : 'Create Account')} <ArrowRight size={18} />
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm font-bold text-gray-500 hover:text-medical-primary transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
