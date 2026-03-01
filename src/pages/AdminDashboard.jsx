import React, { useEffect, useState } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Activity, Users, Clock, AlertTriangle, ShieldCheck, TrendingUp, UserPlus, X, Mail, Lock, User, Stethoscope, FileText } from 'lucide-react';
import { gsap } from 'gsap';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { socket, connectSocket, disconnectSocket, joinHospitalRoom } from '../services/socket';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

const AdminDashboard = () => {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [staffForm, setStaffForm] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'doctor',
        hospital_id: currentUser?.hospital_id,
        specialty_id: '',
        bio: ''
    });
    const [specialties, setSpecialties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const [data, setData] = useState({
        todayPatients: 0,
        noShowRate: 0,
        totalWaiting: 0,
        currentlyServing: 0,
        dailyVolume: [],
        activeQueue: [],
        todayAppointments: []
    });

    const [activeTab, setActiveTab] = useState('queue');

    const handleCheckIn = async (appointment_id) => {
        try {
            await axios.post('http://localhost:5000/api/queues/check-in', { appointment_id });
            await fetchStats();
        } catch (err) {
            console.error('Check-in failed', err);
        }
    };

    const fetchStats = async () => {
        if (!currentUser?.hospital_id) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/admin/stats/${currentUser.hospital_id}`);
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch admin stats', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchSpecialties = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/hospitals/specialties');
                setSpecialties(res.data);
            } catch (err) {
                console.error('Failed to fetch specialties', err);
            }
        };
        fetchSpecialties();
        fetchStats();
        // Fallback polling every 60s (socket handles real-time)
        const interval = setInterval(fetchStats, 60000);

        const tl = gsap.timeline();
        gsap.set(['.stat-card', '.dash-card'], { opacity: 0, y: 30 });

        tl.to('.stat-card', {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out"
        })
            .to('.dash-card', {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.2,
                ease: "power3.out"
            }, "-=0.4");

        // Connect to real-time hospital room
        if (currentUser?.hospital_id) {
            connectSocket();
            socket.on('connect', () => joinHospitalRoom(currentUser.hospital_id));
            socket.on('queue_updated', () => fetchStats());
            socket.on('emergency_override', (data) => {
                setMsg({ type: 'error', text: data.message });
                fetchStats();
            });
        }

        return () => {
            clearInterval(interval);
            socket.off('connect');
            socket.off('queue_updated');
            socket.off('emergency_override');
            disconnectSocket();
        };
    }, [currentUser]);

    const handleAddStaff = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg({ type: '', text: '' });
        try {
            await axios.post('http://localhost:5000/api/auth/register', staffForm);
            setMsg({ type: 'success', text: 'Staff account created successfully!' });
            setTimeout(() => {
                setShowStaffModal(false);
                setStaffForm({ full_name: '', email: '', password: '', role: 'doctor', hospital_id: currentUser?.hospital_id, specialty_id: '', bio: '' });
                setMsg({ type: '', text: '' });
            }, 2000);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create staff account' });
        } finally {
            setLoading(false);
        }
    };

    const handleEmergencyOverride = async () => {
        if (!window.confirm("WARNING: Emegency Override will instantly flush all live queues and forcefully cancel all pending appointments for today. This action cannot be undone. Are you absolutely sure you want to proceed?")) {
            return;
        }

        try {
            setMsg({ type: 'info', text: 'Initiating emergency override...' });
            await axios.post(`http://localhost:5000/api/admin/emergency-override/${currentUser.hospital_id}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            // Local fallback refresh (sockets should cover this anyway)
            fetchStats();

            setMsg({ type: 'success', text: 'Emergency override completed successfully.' });
            setTimeout(() => setMsg({ type: '', text: '' }), 5000);
        } catch (err) {
            console.error('Emergency Override failed:', err);
            setMsg({ type: 'error', text: err.response?.data?.message || 'Emergency Override failed' });
        }
    };

    const volumeData = {
        labels: data.dailyVolume.map(v => new Date(v.appointment_date).toLocaleDateString('en-US', { weekday: 'short' })).reverse(),
        datasets: [{
            label: 'Patient Volume',
            data: data.dailyVolume.map(v => parseInt(v.count)).reverse(),
            backgroundColor: '#1a365d',
            borderRadius: 10,
        }]
    };

    const noShowData = {
        labels: ['Attended', 'No-Show'],
        datasets: [{
            data: [100 - parseFloat(data.noShowRate), parseFloat(data.noShowRate)],
            backgroundColor: ['#4299e1', '#f56565'],
            borderWidth: 0,
        }]
    };

    const stats = [
        { title: 'Today\'s Patients', value: data.todayPatients.toString(), icon: Users, color: 'text-blue-600', trend: '+12%' },
        { title: 'Currently Waiting', value: data.totalWaiting.toString(), icon: Clock, color: 'text-orange-600', trend: 'Live' },
        { title: 'No-Show Rate', value: `${data.noShowRate}%`, icon: AlertTriangle, color: 'text-red-600', trend: '-2%' },
        { title: 'Currently Serving', value: data.currentlyServing.toString(), icon: ShieldCheck, color: 'text-green-600', trend: 'Active' },
    ];

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto">
                {msg.text && (
                    <div className={`mb-6 p-4 rounded-xl text-center font-bold ${msg.type === 'error' ? 'bg-red-100 text-red-600' :
                        msg.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        {msg.text}
                    </div>
                )}
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h2 className="text-4xl font-bold text-gray-900 mb-2">Hospital Command Center</h2>
                        <p className="text-gray-500 text-lg">Real-time operational analytics for {currentUser?.hospital_name || 'your hospital'}.</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="px-6 py-3 bg-white border border-gray-100 text-gray-700 rounded-2xl font-bold flex items-center gap-2 hover:border-medical-primary hover:text-medical-primary transition-all text-sm premium-shadow"
                        >
                            <Users size={18} /> Manage Users
                        </button>
                        <button
                            onClick={() => navigate('/admin/specialties')}
                            className="px-6 py-3 bg-white border border-gray-100 text-gray-700 rounded-2xl font-bold flex items-center gap-2 hover:border-medical-primary hover:text-medical-primary transition-all text-sm premium-shadow"
                        >
                            <Stethoscope size={18} /> Manage Specialties
                        </button>
                        <button
                            onClick={() => setShowStaffModal(true)}
                            className="px-6 py-3 bg-medical-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all text-sm premium-shadow"
                        >
                            <UserPlus size={18} /> Add Medical Staff
                        </button>
                        <button
                            onClick={handleEmergencyOverride}
                            className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all text-sm premium-shadow">
                            <AlertTriangle size={18} /> Emergency Override
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    {stats.map((stat, i) => (
                        <div key={i} className="stat-card bg-white p-8 rounded-[2rem] premium-shadow border border-gray-100">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-4 rounded-2xl bg-gray-50 ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                <span className={`text-sm font-bold ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                    {stat.trend}
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">{stat.title}</p>
                            <h3 className="text-4xl font-black text-gray-900">{stat.value}</h3>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="dash-card lg:col-span-2 bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold">Patient Traffic Analysis</h3>
                            <button className="text-sm font-bold text-medical-primary">View Full Report</button>
                        </div>
                        <div className="h-80">
                            <Bar data={volumeData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>

                    <div className="dash-card bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100">
                        <h3 className="text-xl font-bold mb-8 text-center">No-Show distribution</h3>
                        <div className="h-60 mb-6">
                            <Doughnut data={noShowData} options={{ maintainAspectRatio: false, cutout: '70%' }} />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Soft Penalties Active</span>
                                <span className="font-bold text-red-500">12 Users</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Reminders Sent</span>
                                <span className="font-bold text-green-500">842</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dash-card mt-12 bg-white rounded-[2.5rem] premium-shadow border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Activity className="text-medical-primary" /> Management Hub
                        </h3>
                        <div className="flex bg-gray-100 p-1 rounded-2xl">
                            <button
                                onClick={() => setActiveTab('queue')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'queue' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                            >
                                Live Queue
                            </button>
                            <button
                                onClick={() => setActiveTab('appointments')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'appointments' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                            >
                                Daily Appointments
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-[0.15em]">
                                <tr>
                                    <th className="px-8 py-4">{activeTab === 'queue' ? 'Pos' : 'Time'}</th>
                                    <th className="px-8 py-4">Patient</th>
                                    <th className="px-8 py-4">Doctor</th>
                                    <th className="px-8 py-4">Status</th>
                                    <th className="px-8 py-4">Urgency</th>
                                    <th className="px-8 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {activeTab === 'queue' ? (
                                    data.activeQueue.length > 0 ? data.activeQueue.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-8 py-6 font-black text-gray-400 text-xl">#0{item.position}</td>
                                            <td className="px-8 py-6 font-bold text-gray-900">{item.patient_name}</td>
                                            <td className="px-8 py-6 text-gray-500 text-sm">Dr. {item.doctor_name}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'serving' ? 'bg-medical-primary text-white animate-pulse' : 'bg-gray-100 text-gray-500'
                                                    }`}>{item.status.replace('_', ' ')}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`flex items-center gap-1.5 font-bold text-xs ${item.urgency === 'Critical' ? 'text-red-500' : 'text-gray-600'
                                                    }`}>
                                                    {item.urgency === 'Critical' && <AlertTriangle size={14} />}
                                                    {item.urgency}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    No Actions
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" className="px-8 py-10 text-center text-gray-400 italic">No patients in live queue</td></tr>
                                    )
                                ) : (
                                    data.todayAppointments.length > 0 ? data.todayAppointments.map((app, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-8 py-6 font-black text-gray-400 text-sm uppercase">{app.start_time}</td>
                                            <td className="px-8 py-6 font-bold text-gray-900">{app.patient_name}</td>
                                            <td className="px-8 py-6 text-gray-500 text-sm">Dr. {app.doctor_name}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${app.is_checked_in ? 'bg-green-100 text-green-600' :
                                                    app.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                                        app.status === 'canceled' || app.status === 'no_show' ? 'bg-red-100 text-red-600' :
                                                            app.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                                                                'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {app.is_checked_in ? 'In Queue' : app.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 font-bold text-xs">{app.urgency}</td>
                                            <td className="px-8 py-6">
                                                {!app.is_checked_in && app.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleCheckIn(app.id)}
                                                        className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-medical-primary transition-all shadow-md active:scale-95"
                                                    >
                                                        Manual Check-in
                                                    </button>
                                                )}
                                                {app.status !== 'pending' && (
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        No Actions
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" className="px-8 py-10 text-center text-gray-400 italic">No appointments for today</td></tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* Add Staff Modal */}
            {showStaffModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStaffModal(false)}></div>
                    <div className="bg-white w-full max-w-md rounded-[3rem] premium-shadow relative z-10 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">Add Staff</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Onboard new medical personnel</p>
                            </div>
                            <button onClick={() => setShowStaffModal(false)} className="p-3 hover:bg-white rounded-2xl transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddStaff} className="p-8 space-y-4">
                            {msg.text && (
                                <div className={`p-4 rounded-2xl text-xs font-bold border ${msg.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    {msg.text}
                                </div>
                            )}

                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={staffForm.full_name}
                                    onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    placeholder="Medical Email"
                                    value={staffForm.email}
                                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    placeholder="Temporary Password"
                                    value={staffForm.password}
                                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {['doctor', 'hospital_admin'].map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setStaffForm({ ...staffForm, role: r })}
                                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${staffForm.role === r
                                            ? 'bg-black text-white border-black shadow-lg'
                                            : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                                            }`}
                                    >
                                        {r.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>

                            {staffForm.role === 'doctor' && (
                                <>
                                    <div className="relative">
                                        <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <select
                                            value={staffForm.specialty_id}
                                            onChange={(e) => setStaffForm({ ...staffForm, specialty_id: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium appearance-none"
                                            required
                                        >
                                            <option value="">Select Specialty</option>
                                            {specialties.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-4 text-gray-400" size={18} />
                                        <textarea
                                            placeholder="Doctor Biography (Optional)"
                                            value={staffForm.bio}
                                            onChange={(e) => setStaffForm({ ...staffForm, bio: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium min-h-[100px]"
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-medical-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4"
                            >
                                {loading ? 'Creating Account...' : 'Complete Onboarding'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
