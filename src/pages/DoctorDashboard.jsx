import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Users,
    Clock,
    Calendar,
    Activity,
    Clipboard,
    CheckCircle,
    ArrowRight,
    ChevronRight,
    MessageSquare,
    Stethoscope,
    AlertTriangle,
    ShieldCheck,
    TrendingUp,
    UserPlus,
    X,
    Mail,
    Lock,
    User,
    FileText,
    Pill,
    PlusSquare,
    Search
} from 'lucide-react';
import { gsap } from 'gsap';
import axios from 'axios';

const DoctorDashboard = () => {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());

    const [showReportModal, setShowReportModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [stats, setStats] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [queueActive, setQueueActive] = useState(true);
    const [doctorId, setDoctorId] = useState('');

    // Form State
    const [reportForm, setReportForm] = useState({
        patient_id: '',
        diagnosis: '',
        symptoms: '',
        prescriptions: '',
        lab_results: '',
        visit_summary: '',
        bp_systolic: '',
        bp_diastolic: '',
        bmi: '',
        heart_rate: ''
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        const fetchData = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/appointments/doctor');
                setAppointments(res.data.appointments);

                if (res.data.queue_active !== undefined) setQueueActive(res.data.queue_active);
                if (res.data.doctor_id) setDoctorId(res.data.doctor_id);

                // Map icon strings to components
                const iconMap = { Users, Clock, CheckCircle, Activity };
                const formattedStats = res.data.stats.map(s => ({
                    ...s,
                    icon: iconMap[s.icon] || Activity
                }));
                setStats(formattedStats);
            } catch (err) {
                console.error('Failed to fetch doctor dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        const tl = gsap.timeline();
        gsap.set('.dash-card', { opacity: 0, y: 30 });

        tl.to('.dash-card', {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out"
        });

        return () => clearInterval(timer);
    }, []);

    const handleUpdateStatus = async (queue_entry_id, status) => {
        if (!queue_entry_id) return;
        try {
            await axios.patch('http://localhost:5000/api/queues/status', {
                queue_entry_id,
                status
            });
            // Refresh data
            const res = await axios.get('http://localhost:5000/api/appointments/doctor');
            setAppointments(res.data.appointments);

            const iconMap = { Users, Clock, CheckCircle, Activity };
            setStats(res.data.stats.map(s => ({
                ...s,
                icon: iconMap[s.icon] || Activity
            })));
        } catch (err) {
            console.error('Failed to update status', err);
        }
    };

    const handleToggleQueue = async () => {
        if (!doctorId) return;
        const newStatus = !queueActive;
        try {
            await axios.patch(`http://localhost:5000/api/queues/toggle-status/${doctorId}`, {
                is_active: newStatus
            });
            setQueueActive(newStatus);
            setMsg({ type: 'success', text: `Queue ${newStatus ? 'resumed' : 'paused'} successfully.` });
            setTimeout(() => setMsg({ type: '', text: '' }), 3000);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to toggle queue status' });
        }
    };

    const handleAddRecord = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg({ type: '', text: '' });
        try {
            const payload = {
                ...reportForm,
                prescriptions: reportForm.prescriptions ? { list: reportForm.prescriptions.split(',').map(p => p.trim()) } : null,
                lab_results: reportForm.lab_results ? { notes: reportForm.lab_results } : null,
                vitals: {
                    bp_systolic: reportForm.bp_systolic,
                    bp_diastolic: reportForm.bp_diastolic,
                    bmi: reportForm.bmi,
                    heart_rate: reportForm.heart_rate
                }
            };
            await axios.post('http://localhost:5000/api/medical/record', payload);
            const currentSession = appointments.find(a => a.status === 'serving');

            // Generate invoice if provided
            if (reportForm.billing_amount && !isNaN(reportForm.billing_amount)) {
                try {
                    await axios.post('http://localhost:5000/api/invoices', {
                        patient_id: reportForm.patient_id,
                        appointment_id: currentSession?.id || null, // from appointments array
                        amount: parseFloat(reportForm.billing_amount),
                        description: reportForm.billing_description || 'Medical Consultation'
                    }, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                } catch (invErr) {
                    console.error('Failed to create invoice', invErr);
                }
            }

            setMsg({ type: 'success', text: 'Medical record updated successfully!' });

            if (currentSession?.queue_entry_id) {
                await handleUpdateStatus(currentSession.queue_entry_id, 'completed');
            }

            setTimeout(() => {
                setShowReportModal(false);
                setReportForm({ patient_id: '', diagnosis: '', symptoms: '', prescriptions: '', lab_results: '', visit_summary: '', bp_systolic: '', bp_diastolic: '', bmi: '', heart_rate: '', billing_amount: '', billing_description: '' });
                setMsg({ type: '', text: '' });
            }, 2000);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update medical record' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/medical/patients/search?search=${searchQuery}`);
            setSearchResults(res.data.patients || []);
        } catch (err) {
            console.error('Failed to search patients', err);
        } finally {
            setIsSearching(false);
        }
    };



    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#E2E8F0]">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white rounded-xl premium-shadow">
                                <Stethoscope size={18} className="text-medical-primary" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Medical Professional Portal</span>
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-4">
                            Good Afternoon, <br />
                            <span className="text-medical-primary">Dr. {user?.full_name?.split(' ')[1] || 'Smith'}</span>
                        </h1>
                        <div className="flex flex-wrap gap-4 mt-4">
                            <button
                                onClick={() => navigate('/doctor/schedule')}
                                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-black uppercase tracking-widest text-medical-primary premium-shadow hover:scale-105 transition-all"
                            >
                                <Calendar size={18} /> Manage Schedule
                            </button>
                            <button
                                onClick={handleToggleQueue}
                                className={`flex items-center gap-2 px-6 py-3 border rounded-2xl text-sm font-black uppercase tracking-widest premium-shadow hover:scale-105 transition-all ${queueActive ? 'bg-white border-orange-100 text-orange-500' : 'bg-green-500 border-green-500 text-white'
                                    }`}
                            >
                                {queueActive ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                                {queueActive ? 'Pause Queue' : 'Resume Queue'}
                            </button>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    {stats.map((stat, i) => (
                        <div key={i} className="dash-card bg-white p-8 rounded-[2.5rem] premium-shadow border border-white flex justify-between items-center group hover:bg-black transition-all duration-500">
                            <div>
                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1 group-hover:text-gray-500">{stat.label}</p>
                                <h3 className="text-3xl font-black text-gray-900 group-hover:text-white">{stat.value}</h3>
                            </div>
                            <div className={`p-4 rounded-2xl ${stat.color} text-white shadow-lg`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Area: Patient List */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="dash-card bg-white p-10 rounded-[3rem] premium-shadow border border-white">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black text-gray-900">Today's Schedule</h3>
                                <button
                                    onClick={() => setShowReportModal(true)}
                                    className="px-6 py-2 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <PlusSquare size={16} /> New Report
                                </button>
                            </div>

                            <div className="space-y-4">
                                {appointments.map((apt) => (
                                    <div key={apt.id} className="p-6 rounded-3xl bg-gray-50 border border-transparent hover:border-medical-primary hover:bg-white transition-all group flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-medical-primary font-black text-lg border border-gray-100 uppercase">
                                                {apt.patient[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{apt.patient}</h4>
                                                <div className="flex gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                    <span className="flex items-center gap-1"><Clock size={12} /> {apt.time}</span>
                                                    <span className="flex items-center gap-1"><Clipboard size={12} /> {apt.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${apt.status === 'serving' ? 'bg-medical-primary text-white animate-pulse' :
                                                apt.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                    apt.status === 'no_show' ? 'bg-red-100 text-red-600' :
                                                        'bg-orange-100 text-orange-600'
                                                }`}>
                                                {apt.status.replace('_', ' ')}
                                            </span>

                                            {apt.status === 'waiting' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(apt.queue_entry_id, 'serving')}
                                                        className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-medical-primary transition-all"
                                                    >
                                                        Start Visit
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(apt.queue_entry_id, 'no_show')}
                                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 hover:text-red-700 transition-all border border-red-100 ml-2"
                                                    >
                                                        No Show
                                                    </button>
                                                </>
                                            )}

                                            {apt.status === 'serving' && (
                                                <button
                                                    onClick={() => {
                                                        setReportForm(prev => ({ ...prev, patient_id: apt.patient_id || '' }));
                                                        setShowReportModal(true);
                                                    }}
                                                    className="px-4 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all"
                                                >
                                                    Add Report
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Quick Actions & Alerts */}
                    <div className="space-y-8">
                        <div className="dash-card bg-gradient-to-br from-black to-gray-800 p-10 rounded-[3rem] text-white premium-shadow relative overflow-hidden group">
                            <div className="relative z-10">
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-60 mb-8">Currently Serving</h3>
                                {appointments.find(a => a.status === 'serving') ? (
                                    <>
                                        <div className="text-4xl font-black mb-2">{appointments.find(a => a.status === 'serving').patient}</div>
                                        <p className="text-gray-400 font-medium mb-8">Session in progress...</p>
                                        <button
                                            onClick={() => {
                                                const apt = appointments.find(a => a.status === 'serving');
                                                setReportForm(prev => ({ ...prev, patient_id: apt.patient_id }));
                                                setShowReportModal(true);
                                            }}
                                            className="w-full py-4 bg-medical-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                                        >
                                            Add Clinical Report <CheckCircle size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-4xl font-black mb-2 text-gray-600">No Session</div>
                                        <p className="text-gray-400 font-medium mb-8">Start a visit from your schedule</p>
                                    </>
                                )}
                            </div>
                            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                                <Activity size={200} />
                            </div>
                        </div>

                        <div className="dash-card bg-white p-10 rounded-[3rem] premium-shadow border border-white">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8">Patient Lookup</h3>
                            <div className="space-y-6">
                                <p className="text-sm font-bold text-gray-500 mb-2">Search for existing patients and view their medical history.</p>
                                <button
                                    onClick={() => setShowSearchModal(true)}
                                    className="w-full py-4 bg-gray-50 hover:bg-black text-gray-900 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-gray-100"
                                >
                                    <Search size={16} /> Search Patients
                                </button>
                            </div>
                        </div>

                        <div className="dash-card bg-white p-10 rounded-[3rem] premium-shadow border border-white">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8">Critical Alerts</h3>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-red-100 text-red-600 rounded-xl h-fit">
                                        <MessageSquare size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 leading-tight mb-1">Emergency consultation requested</p>
                                        <p className="text-xs text-gray-400 font-medium tracking-wide">Patient: Sarah Wilson • Room 01</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Clinical Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}></div>
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] premium-shadow relative z-10 overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-medical-primary rounded-2xl text-white">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900">Clinical Consultation</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Update Patient Medical Passport</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="p-3 hover:bg-white rounded-2xl transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddRecord} className="p-8 space-y-6 overflow-y-auto">
                            {msg.text && (
                                <div className={`p-4 rounded-2xl text-xs font-bold border ${msg.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    {msg.text}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Patient UUID / ID</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Paste Patient unique ID"
                                            value={reportForm.patient_id}
                                            onChange={(e) => setReportForm({ ...reportForm, patient_id: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Clinical Diagnosis</label>
                                    <div className="relative">
                                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="e.g. Hypertension Phase 1"
                                            value={reportForm.diagnosis}
                                            onChange={(e) => setReportForm({ ...reportForm, diagnosis: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Presenting Symptoms</label>
                                <textarea
                                    placeholder="Describe current symptoms..."
                                    value={reportForm.symptoms}
                                    onChange={(e) => setReportForm({ ...reportForm, symptoms: e.target.value })}
                                    className="w-full p-6 bg-gray-50 rounded-[2rem] border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium min-h-[100px] resize-none"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Prescriptions (Comma separated)</label>
                                <div className="relative">
                                    <Pill className="absolute left-4 top-5 text-gray-400" size={18} />
                                    <textarea
                                        placeholder="Paracetamol 500mg, Amoxicillin 250mg..."
                                        value={reportForm.prescriptions}
                                        onChange={(e) => setReportForm({ ...reportForm, prescriptions: e.target.value })}
                                        className="w-full pl-12 pr-6 py-5 bg-gray-50 rounded-[2rem] border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium min-h-[80px] resize-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Lab Results (Optional)</label>
                                <div className="relative">
                                    <Activity className="absolute left-4 top-5 text-gray-400" size={18} />
                                    <textarea
                                        placeholder="Enter lab results or test interpretations..."
                                        value={reportForm.lab_results}
                                        onChange={(e) => setReportForm({ ...reportForm, lab_results: e.target.value })}
                                        className="w-full pl-12 pr-6 py-5 bg-gray-50 rounded-[2rem] border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium min-h-[80px] resize-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Billing & Invoicing (Optional)</label>
                                <div className="flex gap-4">
                                    <div className="relative w-1/3">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Fee"
                                            value={reportForm.billing_amount}
                                            onChange={(e) => setReportForm({ ...reportForm, billing_amount: e.target.value })}
                                            className="w-full pl-10 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Billing Description (e.g. Standard Consultation + Lab Tests)"
                                        value={reportForm.billing_description}
                                        onChange={(e) => setReportForm({ ...reportForm, billing_description: e.target.value })}
                                        className="w-2/3 px-6 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">BP Sys (mmHg)</label>
                                    <input
                                        type="number"
                                        placeholder="120"
                                        value={reportForm.bp_systolic}
                                        onChange={(e) => setReportForm({ ...reportForm, bp_systolic: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">BP Dia (mmHg)</label>
                                    <input
                                        type="number"
                                        placeholder="80"
                                        value={reportForm.bp_diastolic}
                                        onChange={(e) => setReportForm({ ...reportForm, bp_diastolic: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Heart Rate (bpm)</label>
                                    <input
                                        type="number"
                                        placeholder="72"
                                        value={reportForm.heart_rate}
                                        onChange={(e) => setReportForm({ ...reportForm, heart_rate: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">BMI</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="24.5"
                                        value={reportForm.bmi}
                                        onChange={(e) => setReportForm({ ...reportForm, bmi: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-bold"
                                    />
                                </div>
                            </div>


                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Visit Summary & Internal Notes</label>
                                <textarea
                                    placeholder="Confidential summary for medical history..."
                                    value={reportForm.visit_summary}
                                    onChange={(e) => setReportForm({ ...reportForm, visit_summary: e.target.value })}
                                    className="w-full p-6 bg-gray-50 rounded-[2rem] border border-transparent focus:border-medical-primary focus:bg-white outline-none transition-all text-sm font-medium min-h-[100px] resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-black text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4"
                            >
                                {loading ? 'Saving to Blockchain...' : 'Sign & Secure Report'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Search Patients Modal */}
            {showSearchModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearchModal(false)}></div>
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] premium-shadow relative z-10 overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-medical-primary rounded-2xl text-white">
                                    <Search size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900">Patient Lookup</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Search Database & Medical Passports</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSearchModal(false)} className="p-3 hover:bg-white rounded-2xl transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 flex flex-col gap-6 overflow-hidden max-h-[60vh]">
                            <form onSubmit={handleSearch} className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or medical ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-6 pr-14 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary outline-none text-sm font-bold transition-all"
                                />
                                <button type="submit" disabled={isSearching} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-medical-primary hover:bg-blue-600 rounded-xl text-white transition-all disabled:opacity-50">
                                    <Search size={16} />
                                </button>
                            </form>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {isSearching ? (
                                    <div className="flex justify-center p-8">
                                        <div className="w-8 h-8 border-4 border-medical-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(patient => (
                                        <div key={patient.id} className="flex justify-between items-center p-4 rounded-2xl border border-gray-100 hover:border-medical-primary hover:bg-blue-50/30 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-black">
                                                    {patient.avatar_url ? (
                                                        <img src={`http://localhost:5000${patient.avatar_url}`} alt="" className="w-full h-full object-cover rounded-xl" />
                                                    ) : patient.full_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-900">{patient.full_name}</div>
                                                    <div className="text-xs text-gray-500 font-medium">ID: {patient.medical_id || 'N/A'} • {patient.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/passport/${patient.id}`)}
                                                    className="p-3 rounded-xl bg-gray-100 text-medical-primary font-bold hover:bg-medical-primary hover:text-white transition-all text-xs flex items-center gap-2 opacity-0 group-hover:opacity-100"
                                                >
                                                    <ShieldCheck size={14} /> Passport
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setReportForm(prev => ({ ...prev, patient_id: patient.id }));
                                                        setShowSearchModal(false);
                                                        setShowReportModal(true);
                                                    }}
                                                    className="p-3 rounded-xl bg-gray-100 text-medical-primary font-bold hover:bg-medical-primary hover:text-white transition-all text-xs flex items-center gap-2 opacity-0 group-hover:opacity-100"
                                                >
                                                    <PlusSquare size={14} /> Report
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : searchQuery && (
                                    <div className="text-center p-8 text-gray-500 font-bold text-sm">
                                        <User size={32} className="mx-auto mb-3 text-gray-300" />
                                        No patients found for "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;
