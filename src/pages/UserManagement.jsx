import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import {
    Users, Stethoscope, Search, Trash2, AlertTriangle, X,
    Mail, Phone, Hash, Calendar, ChevronLeft, ChevronRight,
    ShieldOff, UserX, CheckCircle, Clock, RefreshCw, Shield, FileText
} from 'lucide-react';

const API = 'http://localhost:5000';

const roleColors = {
    patient: 'bg-blue-50 text-blue-700',
    doctor: 'bg-purple-50 text-purple-700',
};

export default function UserManagement() {
    const { user: admin } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('patient');
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState(null); // user to confirm-delete
    const [deleting, setDeleting] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [selectedUser, setSelectedUser] = useState(null); // detail drawer

    const LIMIT = 12;
    const hospital_id = admin?.hospital_id;

    const fetchUsers = useCallback(async () => {
        if (!hospital_id) {
            setLoading(false);
            setMsg({ type: 'error', text: 'No hospital assigned to this admin account. Please log out and log back in.' });
            return;
        }
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/admin/users/${hospital_id}`, {
                params: { role: activeTab, search, page, limit: LIMIT }
            });
            setUsers(res.data.users);
            setTotal(res.data.total);
        } catch (err) {
            console.error('Fetch users error', err);
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load users' });
        } finally {
            setLoading(false);
        }
    }, [hospital_id, activeTab, search, page]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Reset page when tab/search changes
    useEffect(() => { setPage(1); }, [activeTab, search]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await axios.delete(`${API}/api/admin/users/${deleteTarget.id}`);
            setMsg({ type: 'success', text: res.data.message });
            setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
            setTotal(prev => prev - 1);
            setDeleteTarget(null);
            if (selectedUser?.id === deleteTarget.id) setSelectedUser(null);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Deletion failed' });
        } finally {
            setDeleting(false);
        }
    };

    const totalPages = Math.ceil(total / LIMIT);

    const formatDate = (d) => d
        ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'N/A';

    // Guard — non-admins shouldn't access this page
    if (!['hospital_admin', 'super_admin'].includes(admin?.role)) {
        navigate('/');
        return null;
    }

    return (
        <div className="min-h-screen pt-28 pb-20 px-6 bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-xl premium-shadow">
                                <Users size={18} className="text-medical-primary" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-500">User Management</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Hospital Accounts</h1>
                        <p className="text-gray-500 mt-1 font-medium">View, manage, and remove patient and doctor accounts.</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 hover:border-medical-primary hover:text-medical-primary transition-all premium-shadow"
                    >
                        <ChevronLeft size={16} /> Back to Dashboard
                    </button>
                </div>

                {/* ── Message Banner ── */}
                {msg.text && (
                    <div className={`mb-6 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border ${msg.type === 'success'
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        {msg.text}
                        <button onClick={() => setMsg({ type: '', text: '' })} className="ml-auto opacity-60 hover:opacity-100"><X size={16} /></button>
                    </div>
                )}

                <div className={`flex gap-6 ${selectedUser ? 'items-start' : ''}`}>
                    {/* ── Main Panel ── */}
                    <div className="flex-1 min-w-0">
                        {/* Tabs + Search */}
                        <div className="bg-white rounded-[2rem] premium-shadow border border-gray-100 overflow-hidden mb-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-gray-50">
                                {/* Tabs */}
                                <div className="flex bg-gray-100 p-1 rounded-2xl">
                                    {[
                                        { key: 'patient', label: 'Patients', icon: Users },
                                        { key: 'doctor', label: 'Doctors', icon: Stethoscope },
                                    ].map(({ key, label, icon: Icon }) => (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTab(key)}
                                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === key ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            <Icon size={14} /> {label}
                                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === key ? 'bg-medical-primary text-white' : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                {activeTab === key ? total : '—'}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Search + Refresh */}
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            placeholder={`Search ${activeTab}s...`}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-transparent focus:border-medical-primary outline-none text-sm font-medium transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={fetchUsers}
                                        title="Refresh"
                                        className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        <RefreshCw size={16} className="text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* User List */}
                            {loading ? (
                                <div className="flex items-center justify-center py-24 gap-3">
                                    <div className="w-8 h-8 border-4 border-medical-primary border-t-transparent rounded-full animate-spin" />
                                    <span className="text-gray-400 font-bold text-sm uppercase tracking-widest">Loading...</span>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="py-24 text-center">
                                    <UserX size={36} className="text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                        {search ? `No ${activeTab}s match "${search}"` : `No ${activeTab}s found`}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {users.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                                            className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 cursor-pointer transition-colors group ${selectedUser?.id === u.id ? 'bg-blue-50/50 border-l-4 border-medical-primary' : ''}`}
                                        >
                                            {/* Avatar */}
                                            <UserAvatar user={u} size="md" className="flex-shrink-0" />

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-black text-gray-900 text-sm truncate">{u.full_name}</span>
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${roleColors[u.role]}`}>
                                                        {u.role === 'doctor' ? `Dr` : 'Patient'}
                                                    </span>
                                                    {u.specialty && (
                                                        <span className="text-[10px] text-gray-400 font-bold hidden sm:block">• {u.specialty}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                                                    <span className="flex items-center gap-1 truncate"><Mail size={11} />{u.email}</span>
                                                    {u.role === 'patient' && u.medical_id && (
                                                        <span className="flex items-center gap-1 text-medical-primary font-black hidden md:flex"><Hash size={11} />{u.medical_id}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Appointment count */}
                                            <div className="hidden md:flex flex-col items-center px-6 border-x border-gray-100 flex-shrink-0">
                                                <span className="text-2xl font-black text-gray-900">{u.total_appointments || 0}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Visits</span>
                                            </div>

                                            {/* Joined */}
                                            <div className="hidden lg:flex flex-col items-center flex-shrink-0 min-w-[90px]">
                                                <span className="text-xs font-bold text-gray-600">{formatDate(u.created_at)}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Joined</span>
                                            </div>

                                            {/* Delete button */}
                                            <button
                                                onClick={e => { e.stopPropagation(); setDeleteTarget(u); }}
                                                className="ml-2 p-2.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                                                title={`Delete ${u.full_name}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                                    <span className="text-xs text-gray-400 font-bold">
                                        Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="px-4 py-2 text-sm font-bold text-gray-900">{page} / {totalPages}</span>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Detail Drawer ── */}
                    {selectedUser && (
                        <div className="w-72 flex-shrink-0">
                            <div className="bg-white rounded-[2rem] premium-shadow border border-gray-100 overflow-hidden sticky top-28">
                                {/* Top gradient */}
                                <div className="bg-gradient-to-br from-medical-primary to-blue-800 p-6 relative">
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="flex flex-col items-center text-center gap-3 pt-2">
                                        <UserAvatar user={selectedUser} size="lg" />
                                        <div>
                                            <div className="text-white font-black text-lg leading-tight">{selectedUser.full_name}</div>
                                            <div className={`inline-block mt-1 text-[10px] font-black uppercase px-3 py-0.5 rounded-full ${selectedUser.role === 'doctor' ? 'bg-purple-400/30 text-purple-100' : 'bg-blue-400/30 text-blue-100'
                                                }`}>
                                                {selectedUser.role === 'doctor' ? `Physician${selectedUser.specialty ? ` · ${selectedUser.specialty}` : ''}` : 'Patient'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="p-6 space-y-4">
                                    <div className="space-y-3">
                                        {[
                                            { icon: Mail, label: 'Email', value: selectedUser.email },
                                            { icon: Phone, label: 'Phone', value: selectedUser.phone || 'Not provided' },
                                            { icon: Calendar, label: 'Joined', value: formatDate(selectedUser.created_at) },
                                            { icon: Clock, label: 'Visits', value: `${selectedUser.total_appointments || 0} appointments` },
                                        ].map(({ icon: Icon, label, value }) => (
                                            <div key={label} className="flex items-start gap-3">
                                                <div className="p-1.5 bg-gray-50 rounded-lg mt-0.5">
                                                    <Icon size={13} className="text-gray-400" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</div>
                                                    <div className="font-bold text-gray-800 text-sm break-all">{value}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {selectedUser.medical_id && (
                                            <div className="flex items-start gap-3">
                                                <div className="p-1.5 bg-blue-50 rounded-lg mt-0.5">
                                                    <Hash size={13} className="text-medical-primary" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Medical ID</div>
                                                    <div className="font-black text-medical-primary text-sm">{selectedUser.medical_id}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status badge */}
                                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest ${selectedUser.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${selectedUser.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                                        Account {selectedUser.status}
                                    </div>

                                    {/* View Passport (Patient only) */}
                                    {selectedUser.role === 'patient' && (
                                        <button
                                            onClick={() => navigate(`/passport/${selectedUser.id}`)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-medical-primary text-white rounded-2xl text-sm font-black hover:bg-blue-600 transition-all premium-shadow"
                                        >
                                            <Shield size={15} />
                                            View Medical Passport
                                        </button>
                                    )}

                                    {/* Delete */}
                                    <button
                                        onClick={() => setDeleteTarget(selectedUser)}
                                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-red-100 text-red-500 rounded-2xl text-sm font-black hover:bg-red-50 hover:border-red-200 transition-all"
                                    >
                                        <Trash2 size={15} />
                                        {selectedUser.role === 'doctor' ? 'Remove Physician' : 'Delete Patient Account'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => !deleting && setDeleteTarget(null)}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-[2.5rem] premium-shadow overflow-hidden"
                        onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease' }}
                    >
                        {/* Danger Header */}
                        <div className="bg-gradient-to-r from-red-500 to-red-700 p-8 text-center">
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                {deleteTarget.role === 'doctor' ? <ShieldOff size={32} className="text-white" /> : <UserX size={32} className="text-white" />}
                            </div>
                            <h3 className="text-2xl font-black text-white mb-1">
                                {deleteTarget.role === 'doctor' ? 'Remove Physician' : 'Delete Patient'}
                            </h3>
                            <p className="text-red-200 text-sm font-medium">This action cannot be undone</p>
                        </div>

                        {/* Body */}
                        <div className="p-8">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                                <UserAvatar user={deleteTarget} size="md" />
                                <div>
                                    <div className="font-black text-gray-900">{deleteTarget.full_name}</div>
                                    <div className="text-xs text-gray-400 font-medium">{deleteTarget.email}</div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3">
                                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-700 font-medium">
                                    {deleteTarget.role === 'doctor'
                                        ? 'All appointments and records associated with this doctor will be permanently removed.'
                                        : 'All appointments, queue entries, and medical history for this patient will be permanently removed.'}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                    className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 py-3.5 bg-red-500 text-white rounded-2xl font-black text-sm hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting
                                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting...</>
                                        : <><Trash2 size={15} /> Yes, Delete</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
