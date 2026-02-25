import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { gsap } from 'gsap';
import UserAvatar from '../components/UserAvatar';
import {
    User, Mail, Phone, Hash, Shield, Calendar, Clock,
    Edit3, Save, X, CheckCircle, XCircle, AlertTriangle,
    ArrowRight, Activity, Stethoscope, Camera, Upload
} from 'lucide-react';

const statusConfig = {
    pending: { color: 'bg-orange-100 text-orange-600', label: 'Pending' },
    confirmed: { color: 'bg-blue-100 text-blue-700', label: 'Confirmed' },
    completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
    canceled: { color: 'bg-red-100 text-red-600', label: 'Cancelled' },
    in_progress: { color: 'bg-purple-100 text-purple-700', label: 'In Progress' },
    no_show: { color: 'bg-gray-100 text-gray-500', label: 'No Show' },
};

const urgencyConfig = {
    Critical: 'text-red-500',
    Moderate: 'text-orange-500',
    Routine: 'text-green-500',
};

const PatientProfile = () => {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [cancellingId, setCancellingId] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({ full_name: '', phone: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileRes, appsRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/auth/profile'),
                    axios.get('http://localhost:5000/api/appointments/my'),
                ]);
                const profileData = profileRes.data;
                setProfile(profileData);
                setAvatarPreview(profileData.avatar_url
                    ? `http://localhost:5000${profileData.avatar_url}`
                    : null
                );
                setForm({ full_name: profileData.full_name, phone: profileData.phone || '' });
                setAppointments(appsRes.data);

                // Sync avatar_url from DB → AuthContext so Navbar + Passport stay in sync
                if (setUser && profileData.avatar_url) {
                    setUser({ avatar_url: profileData.avatar_url });
                }
            } catch (err) {
                console.error('Profile load failed', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!loading) {
            gsap.fromTo('.profile-card',
                { y: 24, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'power3.out' }
            );
        }
    }, [loading]);

    const handleSave = async () => {
        setSaving(true);
        setMsg({ type: '', text: '' });
        try {
            const res = await axios.patch('http://localhost:5000/api/auth/profile', form);
            setProfile(prev => ({ ...prev, ...res.data.user }));
            if (setUser) setUser(res.data.user);
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
            setEditing(false);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' });
        } finally {
            setSaving(false);
        }
    };

    // Handle avatar file selection + upload
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type and size client-side
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.type)) {
            setMsg({ type: 'error', text: 'Please select a JPEG, PNG, WebP, or GIF image.' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setMsg({ type: 'error', text: 'Image must be under 5MB.' });
            return;
        }

        // Show instant local preview
        const localPreview = URL.createObjectURL(file);
        setAvatarPreview(localPreview);

        // Upload to server
        setAvatarUploading(true);
        setMsg({ type: '', text: '' });
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await axios.post('http://localhost:5000/api/auth/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Update profile state
            setProfile(prev => ({ ...prev, avatar_url: res.data.avatar_url }));
            setAvatarPreview(`http://localhost:5000${res.data.avatar_url}`);
            // Push to global auth context so Navbar updates immediately
            if (setUser) setUser({ avatar_url: res.data.avatar_url });
            setMsg({ type: 'success', text: 'Profile picture updated!' });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed. Please try again.' });
            setAvatarPreview(profile?.avatar_url ? `http://localhost:5000${profile.avatar_url}` : null);
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this appointment? This action cannot be undone.')) return;
        setCancellingId(id);
        try {
            await axios.patch(`http://localhost:5000/api/appointments/${id}/cancel`);
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'canceled' } : a));
            setMsg({ type: 'success', text: 'Appointment cancelled. A confirmation email has been sent.' });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Cancellation failed' });
        } finally {
            setCancellingId(null);
        }
    };

    // Partition appointments
    const today = new Date().toISOString().split('T')[0];
    const upcoming = appointments.filter(a =>
        a.appointment_date?.split('T')[0] >= today && a.status !== 'canceled'
    );
    const past = appointments.filter(a =>
        a.appointment_date?.split('T')[0] < today || a.status === 'canceled' || a.status === 'completed'
    );

    const displayedApps = activeTab === 'upcoming' ? upcoming : past;

    const stats = [
        { label: 'Total Visits', value: appointments.filter(a => a.status === 'completed').length, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
        { label: 'Upcoming', value: upcoming.length, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Cancelled', value: appointments.filter(a => a.status === 'canceled').length, icon: XCircle, color: 'text-red-400', bg: 'bg-red-50' },
        { label: 'No-Shows', value: appointments.filter(a => a.status === 'no_show').length, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
    ];

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-medical-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Profile...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#f8fafc]">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white rounded-xl premium-shadow">
                                <User size={18} className="text-medical-primary" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Account Profile</span>
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tight">
                            {profile?.full_name || 'Your Profile'}
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">Manage your account details and appointment history</p>
                    </div>
                </div>

                {/* Message Banner */}
                {msg.text && (
                    <div className={`mb-6 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border ${msg.type === 'success'
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                        {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        {msg.text}
                        <button onClick={() => setMsg({ type: '', text: '' })} className="ml-auto opacity-60 hover:opacity-100"><X size={16} /></button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: Profile Card */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Identity Card */}
                        <div className="profile-card bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100">
                            {/* Avatar Upload */}
                            <div className="relative group w-20 h-20 mb-6">
                                <div className="w-20 h-20 rounded-3xl overflow-hidden bg-gradient-to-br from-medical-primary to-blue-900 flex items-center justify-center">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white font-black text-3xl">
                                            {profile?.full_name?.[0]?.toUpperCase() || 'P'}
                                        </span>
                                    )}
                                </div>
                                {/* Camera overlay */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={avatarUploading}
                                    className="absolute inset-0 rounded-3xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    title="Change profile picture"
                                >
                                    {avatarUploading ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <Camera size={22} className="text-white" />
                                    )}
                                </button>
                                {/* Green check badge when uploading completes */}
                                {!avatarUploading && avatarPreview && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                                        <CheckCircle size={12} className="text-white" />
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                />
                            </div>
                            {/* Upload hint */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={avatarUploading}
                                className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-medical-primary transition-colors flex items-center gap-1 mb-4 -mt-3"
                            >
                                <Upload size={10} /> {avatarUploading ? 'Uploading...' : 'Upload Photo'}
                            </button>

                            {!editing ? (
                                <>
                                    <h2 className="text-2xl font-black text-gray-900 mb-1">{profile?.full_name}</h2>
                                    <div className="space-y-4 mt-4 pb-6 border-b border-gray-100">
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail size={16} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-600 font-medium truncate">{profile?.email}</span>
                                        </div>
                                        {profile?.phone && (
                                            <div className="flex items-center gap-3 text-sm">
                                                <Phone size={16} className="text-gray-400 flex-shrink-0" />
                                                <span className="text-gray-600 font-medium">{profile.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-sm">
                                            <Hash size={16} className="text-medical-primary flex-shrink-0" />
                                            <span className="text-medical-primary font-black text-xs tracking-widest">
                                                {profile?.medical_id || 'METQ-PENDING'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-6 text-sm">
                                        <span className="text-gray-400 font-medium">Member since</span>
                                        <span className="font-bold text-gray-700">
                                            {profile?.created_at
                                                ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="mt-6 w-full py-3 border-2 border-gray-100 rounded-2xl text-gray-700 font-bold text-sm flex items-center justify-center gap-2 hover:border-medical-primary hover:text-medical-primary transition-all"
                                    >
                                        <Edit3 size={16} /> Edit Profile
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="font-black text-gray-900 mb-4">Edit Profile</h3>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                value={form.full_name}
                                                onChange={e => setForm({ ...form, full_name: e.target.value })}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary outline-none transition-all text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-1 block">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="tel"
                                                value={form.phone}
                                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                                placeholder="+1 234 567 8900"
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary outline-none transition-all text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => { setEditing(false); setForm({ full_name: profile?.full_name, phone: profile?.phone || '' }); }}
                                            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                                        >
                                            <X size={16} /> Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex-1 py-3 bg-black text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-medical-primary transition-all disabled:opacity-50"
                                        >
                                            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Health ID Card (nice visual) */}
                        <div className="profile-card bg-gradient-to-br from-medical-primary to-blue-900 p-8 rounded-[2.5rem] text-white premium-shadow relative overflow-hidden">
                            <div className="absolute -right-8 -bottom-8 opacity-10">
                                <Shield size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6">
                                    <Shield size={18} className="text-blue-300" />
                                    <span className="text-xs font-black uppercase tracking-widest text-blue-300">Health ID</span>
                                </div>
                                <div className="text-3xl font-black tracking-widest mb-4">
                                    {profile?.medical_id || 'METQ-PENDING'}
                                </div>
                                <p className="text-blue-200 text-sm font-medium">{profile?.full_name}</p>
                                <p className="text-blue-300 text-xs mt-1 font-bold uppercase tracking-widest">MetQ Patient</p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="profile-card bg-white p-6 rounded-[2.5rem] premium-shadow border border-gray-100 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Quick Actions</p>
                            {[
                                { label: 'Book Appointment', path: '/book', icon: Calendar, color: 'text-blue-500' },
                                { label: 'Medical Passport', path: '/passport', icon: Shield, color: 'text-green-500' },
                                { label: 'Live Queue', path: '/queue', icon: Activity, color: 'text-purple-500' },
                            ].map(action => (
                                <button
                                    key={action.path}
                                    onClick={() => navigate(action.path)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl bg-gray-50 ${action.color}`}>
                                            <action.icon size={16} />
                                        </div>
                                        <span className="font-bold text-sm text-gray-700">{action.label}</span>
                                    </div>
                                    <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: Stats + Appointment History */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats.map((stat, i) => (
                                <div key={i} className="profile-card bg-white p-6 rounded-[2rem] premium-shadow border border-gray-100 flex flex-col gap-3">
                                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} w-fit`}>
                                        <stat.icon size={18} />
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black text-gray-900">{stat.value}</div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Appointments Section */}
                        <div className="profile-card bg-white rounded-[2.5rem] premium-shadow border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <Stethoscope size={20} className="text-medical-primary" /> Appointment History
                                </h3>
                                <div className="flex bg-gray-100 p-1 rounded-2xl">
                                    {['upcoming', 'past'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                                        >
                                            {tab === 'upcoming' ? `Upcoming (${upcoming.length})` : `History (${past.length})`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="divide-y divide-gray-50">
                                {displayedApps.length === 0 ? (
                                    <div className="p-16 text-center">
                                        <Calendar size={32} className="text-gray-200 mx-auto mb-4" />
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                            {activeTab === 'upcoming' ? 'No upcoming appointments' : 'No appointment history yet'}
                                        </p>
                                        {activeTab === 'upcoming' && (
                                            <button
                                                onClick={() => navigate('/book')}
                                                className="mt-6 px-8 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                                            >
                                                Book Appointment
                                            </button>
                                        )}
                                    </div>
                                ) : displayedApps.map((appt, i) => {
                                    const statusCfg = statusConfig[appt.status] || statusConfig.pending;
                                    const isToday = appt.appointment_date?.split('T')[0] === today;
                                    const canCancel = activeTab === 'upcoming' && !['canceled', 'completed', 'in_progress'].includes(appt.status);

                                    return (
                                        <div key={appt.id} className="p-6 md:p-8 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="flex items-start gap-5">
                                                    {/* Date Block */}
                                                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl font-black flex-shrink-0 ${isToday ? 'bg-medical-primary text-white' : 'bg-gray-50 text-gray-700'}`}>
                                                        <span className="text-[10px] font-black uppercase">
                                                            {appt.appointment_date
                                                                ? new Date(appt.appointment_date).toLocaleDateString('en-US', { month: 'short' })
                                                                : '---'}
                                                        </span>
                                                        <span className="text-2xl leading-none">
                                                            {appt.appointment_date
                                                                ? new Date(appt.appointment_date).getDate()
                                                                : '--'}
                                                        </span>
                                                    </div>

                                                    {/* Details */}
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <h4 className="font-black text-gray-900">Dr. {appt.doctor_name}</h4>
                                                            {isToday && (
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-medical-primary text-white rounded-lg animate-pulse">Today</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-medical-primary font-bold mb-1">{appt.specialty}</p>
                                                        <div className="flex items-center gap-4 text-xs text-gray-400 font-bold">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={12} /> {appt.start_time}
                                                            </span>
                                                            {appt.urgency && (
                                                                <span className={`flex items-center gap-1 ${urgencyConfig[appt.urgency] || 'text-gray-400'}`}>
                                                                    <AlertTriangle size={12} /> {appt.urgency}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusCfg.color}`}>
                                                        {statusCfg.label}
                                                    </span>
                                                    {canCancel && (
                                                        <button
                                                            onClick={() => handleCancel(appt.id)}
                                                            disabled={cancellingId === appt.id}
                                                            className="px-4 py-2 border-2 border-red-100 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50"
                                                        >
                                                            {cancellingId === appt.id ? '...' : 'Cancel'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientProfile;
