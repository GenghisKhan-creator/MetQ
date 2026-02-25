import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldAlert, ArrowRight, CheckCircle } from 'lucide-react';

const ChangePasswordModal = () => {
    const { user, changePassword, logout } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!user || !user.requires_password_change) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) {
            return setError('Password must be at least 6 characters long.');
        }
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        setLoading(true);
        try {
            await changePassword(newPassword);
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[3.5rem] premium-shadow overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8">
                    <button onClick={logout} className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest">Logout</button>
                </div>

                <div className="p-12">
                    <div className="flex flex-col items-center mb-10">
                        <div className={`p-5 rounded-[2rem] mb-6 ${success ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            {success ? <CheckCircle size={40} /> : <ShieldAlert size={40} />}
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 text-center">
                            {success ? 'Security Updated' : 'Reset Your Password'}
                        </h2>
                        <p className="text-gray-500 text-sm mt-3 text-center max-w-xs leading-relaxed font-medium">
                            {success
                                ? 'Your account is now fully secured. You can proceed to your dashboard.'
                                : `Hi ${user.full_name}, for security reasons you must change your temporary password before accessing your workspace.`}
                        </p>
                    </div>

                    {!success ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                                    <ShieldAlert size={14} /> {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        placeholder="Min. 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-gray-50 rounded-[2rem] border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Confirm New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        placeholder="Repeat new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-14 pr-6 py-5 bg-gray-50 rounded-[2rem] border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-black text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
                            >
                                {loading ? 'Securing Account...' : 'Update & Continue'} <ArrowRight size={18} />
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-5 bg-medical-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            Enter Dashboard <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
