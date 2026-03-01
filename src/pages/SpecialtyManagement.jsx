import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    Stethoscope, Search, Trash2, AlertTriangle, X,
    ChevronLeft, CheckCircle, RefreshCw, Plus
} from 'lucide-react';

const API = 'http://localhost:5000';

export default function SpecialtyManagement() {
    const { user: admin } = useAuth();
    const navigate = useNavigate();

    const [specialties, setSpecialties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const [showAddModal, setShowAddModal] = useState(false);
    const [newSpecialty, setNewSpecialty] = useState('');
    const [adding, setAdding] = useState(false);

    const fetchSpecialties = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/hospitals/specialties`);
            setSpecialties(res.data);
        } catch (err) {
            console.error('Fetch specialties error', err);
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load specialties' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSpecialties(); }, [fetchSpecialties]);

    const handleAddSpecialty = async (e) => {
        e.preventDefault();
        if (!newSpecialty.trim()) return;
        setAdding(true);
        try {
            const res = await axios.post(`${API}/api/hospitals/specialties`, { name: newSpecialty.trim() }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMsg({ type: 'success', text: 'Specialty added successfully' });
            setSpecialties(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
            setShowAddModal(false);
            setNewSpecialty('');
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to add specialty' });
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await axios.delete(`${API}/api/hospitals/specialties/${deleteTarget.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMsg({ type: 'success', text: res.data.message });
            setSpecialties(prev => prev.filter(s => s.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Deletion failed' });
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    // Guard — non-admins shouldn't access this page
    if (!['hospital_admin', 'super_admin'].includes(admin?.role)) {
        navigate('/');
        return null;
    }

    const filteredSpecialties = specialties.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen pt-28 pb-20 px-6 bg-[#f8fafc]">
            <div className="max-w-4xl mx-auto">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-xl premium-shadow">
                                <Stethoscope size={18} className="text-medical-primary" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Facility Settings</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Specialty Management</h1>
                        <p className="text-gray-500 mt-1 font-medium">Add, view, and remove medical specialties available at your hospital.</p>
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

                {/* ── Main Panel ── */}
                <div className="bg-white rounded-[2rem] premium-shadow border border-gray-100 overflow-hidden mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-gray-50">

                        {/* Search + Refresh */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search specialties..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-transparent focus:border-medical-primary outline-none text-sm font-medium transition-all"
                                />
                            </div>
                            <button
                                onClick={fetchSpecialties}
                                title="Refresh"
                                className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <RefreshCw size={16} className="text-gray-500" />
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2.5 bg-medical-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all text-sm premium-shadow"
                        >
                            <Plus size={16} /> Add Specialty
                        </button>
                    </div>

                    {/* Specialty List */}
                    {loading ? (
                        <div className="flex items-center justify-center py-24 gap-3">
                            <div className="w-8 h-8 border-4 border-medical-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-gray-400 font-bold text-sm uppercase tracking-widest">Loading...</span>
                        </div>
                    ) : filteredSpecialties.length === 0 ? (
                        <div className="py-24 text-center">
                            <Stethoscope size={36} className="text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                {search ? `No specialties match "${search}"` : `No specialties found`}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredSpecialties.map(s => (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-medical-primary flex items-center justify-center">
                                            <Stethoscope size={18} />
                                        </div>
                                        <span className="font-black text-gray-900 text-lg">{s.name}</span>
                                    </div>

                                    {/* Delete button */}
                                    <button
                                        onClick={() => setDeleteTarget(s)}
                                        className="p-2.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                        title={`Delete ${s.name}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add Specialty Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !adding && setShowAddModal(false)}></div>
                    <div className="bg-white w-full max-w-md rounded-[3rem] premium-shadow relative z-10 overflow-hidden" style={{ animation: 'slideUp 0.3s ease' }}>
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Add Specialty</h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-white rounded-2xl transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddSpecialty} className="p-8 space-y-4">
                            <div className="relative">
                                <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Specialty Name (e.g., Cardiology)"
                                    value={newSpecialty}
                                    onChange={(e) => setNewSpecialty(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium"
                                    required
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={adding || !newSpecialty.trim()}
                                className="w-full py-5 bg-medical-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4"
                            >
                                {adding ? 'Adding...' : 'Add Specialty'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
                                <Trash2 size={32} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-1">
                                Delete Specialty
                            </h3>
                            <p className="text-red-200 text-sm font-medium">This action cannot be undone</p>
                        </div>

                        {/* Body */}
                        <div className="p-8">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                                <div className="w-12 h-12 rounded-xl bg-white text-medical-primary flex items-center justify-center premium-shadow">
                                    <Stethoscope size={24} />
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 text-xl">{deleteTarget.name}</div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3">
                                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-700 font-medium">
                                    You cannot delete a specialty if it is still assigned to one or more doctors. Make sure to reassign them first.
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
