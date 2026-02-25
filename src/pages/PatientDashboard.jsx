import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, FileText, ArrowRight, ShieldCheck, Activity, Bell, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import axios from 'axios';
import { socket, connectSocket, disconnectSocket, joinQueueRoom } from '../services/socket';

const PatientDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [liveQueue, setLiveQueue] = useState(null);
    const [myTurn, setMyTurn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [vitals, setVitals] = useState(null);      // { bp_systolic, bp_diastolic, bmi, heart_rate, ... }
    const [vitalsDate, setVitalsDate] = useState(null);
    const [vitalsDoctor, setVitalsDoctor] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        const fetchData = async () => {
            try {
                const [apptRes, vitalsRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/appointments/my'),
                    axios.get('http://localhost:5000/api/medical/vitals')
                ]);

                setAppointments(apptRes.data);

                if (vitalsRes.data.vitals) {
                    setVitals(vitalsRes.data.vitals);
                    setVitalsDate(vitalsRes.data.visit_date);
                    setVitalsDoctor(vitalsRes.data.doctor_name);
                }

                // If there's an appointment today, try to get live queue
                const today = new Date().toISOString().split('T')[0];
                const todaysApt = apptRes.data.find(a => a.appointment_date.split('T')[0] === today && a.status !== 'canceled');

                if (todaysApt) {
                    try {
                        const qRes = await axios.get(`http://localhost:5000/api/queues/live/${todaysApt.doctor_id}`);
                        setLiveQueue({
                            ...qRes.data,
                            doctor: todaysApt.doctor_name,
                            doctorId: todaysApt.doctor_id
                        });
                        const myEntry = qRes.data.entries?.find(e => e.patient_user_id === user?.id);
                        if (myEntry?.status === 'serving') setMyTurn(true);
                    } catch (qErr) {
                        console.log('No live queue yet');
                    }
                }
            } catch (err) {
                console.error('Dashboard fetch failed', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => clearInterval(timer);
    }, []);

    // Socket.io: real-time queue updates
    useEffect(() => {
        if (!liveQueue?.doctorId) return;

        connectSocket();
        socket.on('connect', () => joinQueueRoom(liveQueue.doctorId));
        socket.on('queue_updated', (data) => {
            setLiveQueue(prev => ({ ...prev, ...data }));
        });
        if (user?.id) {
            socket.on(`patient_turn_${user.id}`, () => setMyTurn(true));
        }

        return () => {
            socket.off('connect');
            socket.off('queue_updated');
            if (user?.id) socket.off(`patient_turn_${user.id}`);
            disconnectSocket();
        };
    }, [liveQueue?.doctorId, user]);

    useEffect(() => {
        if (!loading) {
            const tl = gsap.timeline();
            gsap.set('.dashboard-card', { opacity: 0, y: 30 });

            tl.to('.dashboard-card', {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.1,
                ease: "power3.out",
                delay: 0.2
            });
        }
    }, [loading]);

    const nextApt = appointments.find(a => new Date(a.appointment_date) >= new Date() && a.status !== 'canceled');

    // ── Vitals helpers ────────────────────────────────────────────────────────
    const getBpLabel = (sys, dia) => {
        if (!sys || !dia) return null;
        if (sys < 120 && dia < 80) return { text: 'Normal', color: 'text-green-500' };
        if (sys < 130 && dia < 80) return { text: 'Elevated', color: 'text-yellow-500' };
        if (sys < 140 || dia < 90) return { text: 'High', color: 'text-orange-500' };
        return { text: 'Very High', color: 'text-red-500' };
    };

    const getBmiLabel = (bmi) => {
        if (!bmi) return null;
        if (bmi < 18.5) return { text: 'Underweight', color: 'text-blue-500' };
        if (bmi < 25) return { text: 'Healthy', color: 'text-green-500' };
        if (bmi < 30) return { text: 'Overweight', color: 'text-yellow-500' };
        return { text: 'Obese', color: 'text-red-500' };
    };

    const bpLabel = vitals ? getBpLabel(vitals.bp_systolic, vitals.bp_diastolic) : null;
    const bmiLabel = vitals ? getBmiLabel(parseFloat(vitals.bmi)) : null;
    const vitalsRecordedDate = vitalsDate
        ? new Date(vitalsDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#E2E8F0]">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white rounded-xl premium-shadow">
                                <Bell size={18} className="text-medical-primary" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Patient Dashboard</span>
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tight">
                            Welcome back, <br />
                            <span className="text-medical-primary">{user?.full_name || 'John Doe'}</span>
                        </h1>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active Queue Status */}
                    {liveQueue ? (
                        <div className={`dashboard-card lg:col-span-2 rounded-[3rem] p-10 text-white premium-shadow relative overflow-hidden group ${myTurn
                            ? 'bg-gradient-to-br from-green-500 to-emerald-700'
                            : 'bg-gradient-to-br from-medical-primary to-blue-900'
                            }`}>
                            <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-white rounded-full blur-[120px] opacity-20 group-hover:opacity-30 transition-opacity"></div>

                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-80 mb-6">Live Queue Status</h3>
                                    {myTurn ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                                                <div className="text-4xl font-black text-white">IT'S YOUR TURN!</div>
                                            </div>
                                            <p className="text-green-100 font-medium">Dr. {liveQueue.doctor} is ready to see you now.</p>
                                            <button
                                                onClick={() => navigate('/queue')}
                                                className="px-8 py-4 bg-white text-green-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                                            >
                                                <CheckCircle size={14} className="inline mr-2" />
                                                Enter Consultation Room
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-baseline gap-2 mb-2">
                                                <span className="text-8xl font-black">#{liveQueue.currentNumber || '0'}</span>
                                                <span className="text-2xl font-bold opacity-60">serving</span>
                                            </div>
                                            <p className="text-blue-100 font-medium">Currently treating patients with Dr. {liveQueue.doctor}</p>
                                        </>
                                    )}
                                </div>

                                <div className="bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 w-full md:w-auto">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Clock size={20} className="text-blue-300" />
                                        <span className="text-xs font-black uppercase tracking-widest text-blue-200">Waiting Room</span>
                                    </div>
                                    <div className="text-4xl font-black">{liveQueue.waitingCount} People</div>
                                    <button
                                        onClick={() => navigate('/queue')}
                                        className="mt-6 w-full py-4 bg-white text-medical-primary rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all"
                                    >
                                        Track Live <Activity size={16} className="inline ml-2" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-card lg:col-span-2 bg-white rounded-[3rem] p-10 premium-shadow border border-white flex flex-col justify-center items-center text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mb-6 font-black text-4xl">!</div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">No Active Visits</h3>
                            <p className="text-gray-400 font-medium max-w-sm">You are not currently in any hospital queues. Book an appointment to get started.</p>
                            <button
                                onClick={() => navigate('/book')}
                                className="mt-8 px-8 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                            >
                                Start Assessment
                            </button>
                        </div>
                    )}

                    {/* Quick Access Sidebar */}
                    <div className="space-y-8">
                        {/* Medical Passport Link */}
                        <div className="dashboard-card bg-white p-8 rounded-[3rem] premium-shadow border border-white group hover:bg-medical-primary transition-all duration-500 cursor-pointer" onClick={() => navigate('/passport')}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-medical-soft rounded-2xl text-medical-primary group-hover:bg-white/20 group-hover:text-white transition-all">
                                    <ShieldCheck size={24} />
                                </div>
                                <ArrowRight className="text-gray-300 group-hover:text-white group-hover:translate-x-2 transition-all" />
                            </div>
                            <h4 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-white transition-all">Health Passport</h4>
                            <p className="text-sm text-gray-500 font-medium group-hover:text-blue-100 transition-all leading-relaxed">View your history, test results, and active prescriptions.</p>
                        </div>

                        {/* Booking Link */}
                        <div className="dashboard-card bg-black p-8 rounded-[3rem] premium-shadow border border-white/10 group cursor-pointer" onClick={() => navigate('/book')}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-white/10 rounded-2xl text-white">
                                    <Calendar size={24} />
                                </div>
                                <ArrowRight className="text-white/30 group-hover:text-white group-hover:translate-x-2 transition-all" />
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">Book Appointment</h4>
                            <p className="text-sm text-gray-400 font-medium leading-relaxed group-hover:text-white/80 transition-all">Skip the wait with our AI triage-enabled booking system.</p>
                        </div>
                    </div>
                </div>

                {/* Secondary Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                    {/* Upcoming Appointment */}
                    {nextApt ? (
                        <div className="dashboard-card bg-white p-10 rounded-[3rem] premium-shadow border border-white">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8 pb-4 border-b border-gray-50">Next Appointment</h3>
                            <div className="flex gap-6">
                                <div className="w-20 h-20 bg-medical-soft rounded-2xl overflow-hidden border-2 border-white shadow-inner flex items-center justify-center font-black text-medical-primary text-2xl">
                                    {nextApt.doctor_name[0]}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-2xl font-bold text-gray-900">Dr. {nextApt.doctor_name}</h4>
                                        <span className={`px-3 py-1 text-white text-[10px] font-black uppercase tracking-widest rounded-lg ${nextApt.status === 'confirmed' ? 'bg-green-500' : 'bg-orange-500'}`}>{nextApt.status}</span>
                                    </div>
                                    <p className="text-medical-primary font-bold text-sm mb-4">{nextApt.specialty}</p>
                                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-400" />
                                            <span className="text-sm font-bold text-gray-600">{new Date(nextApt.appointment_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-gray-400" />
                                            <span className="text-sm font-bold text-gray-600">{nextApt.start_time}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-card bg-white p-10 rounded-[3rem] premium-shadow border border-white text-center flex flex-col justify-center items-center">
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Schedule is empty</p>
                            <h4 className="text-xl font-bold text-gray-900">No Upcoming Visits</h4>
                        </div>
                    )}

                    {/* Health Insights */}
                    <div className="dashboard-card bg-white p-10 rounded-[3rem] premium-shadow border border-white">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Health Vital Stats</h3>
                            {vitalsRecordedDate && (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Recorded {vitalsRecordedDate}
                                </span>
                            )}
                        </div>

                        {vitals ? (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {/* Blood Pressure */}
                                    <div className="p-6 bg-gray-50 rounded-3xl">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Blood Pressure</div>
                                        {vitals.bp_systolic && vitals.bp_diastolic ? (
                                            <div className="text-3xl font-black text-gray-900">
                                                {vitals.bp_systolic}/{vitals.bp_diastolic}
                                                {bpLabel && <span className={`text-xs font-bold ml-2 ${bpLabel.color}`}>{bpLabel.text}</span>}
                                            </div>
                                        ) : (
                                            <div className="text-lg font-bold text-gray-300">—</div>
                                        )}
                                        <div className="text-[10px] text-gray-400 font-bold mt-1">mmHg</div>
                                    </div>

                                    {/* BMI */}
                                    <div className="p-6 bg-gray-50 rounded-3xl">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">BMI</div>
                                        {vitals.bmi ? (
                                            <div className="text-3xl font-black text-gray-900">
                                                {parseFloat(vitals.bmi).toFixed(1)}
                                                {bmiLabel && <span className={`text-xs font-bold ml-2 ${bmiLabel.color}`}>{bmiLabel.text}</span>}
                                            </div>
                                        ) : (
                                            <div className="text-lg font-bold text-gray-300">—</div>
                                        )}
                                        <div className="text-[10px] text-gray-400 font-bold mt-1">kg/m²</div>
                                    </div>
                                </div>

                                {/* Optional extras: Heart Rate, Weight, Height */}
                                {(vitals.heart_rate || vitals.weight || vitals.temperature) && (
                                    <div className="grid grid-cols-3 gap-3">
                                        {vitals.heart_rate && (
                                            <div className="p-4 bg-red-50 rounded-2xl text-center">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Heart Rate</div>
                                                <div className="text-xl font-black text-gray-900">{vitals.heart_rate}</div>
                                                <div className="text-[10px] text-gray-400 font-bold">bpm</div>
                                            </div>
                                        )}
                                        {vitals.weight && (
                                            <div className="p-4 bg-blue-50 rounded-2xl text-center">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Weight</div>
                                                <div className="text-xl font-black text-gray-900">{vitals.weight}</div>
                                                <div className="text-[10px] text-gray-400 font-bold">kg</div>
                                            </div>
                                        )}
                                        {vitals.temperature && (
                                            <div className="p-4 bg-orange-50 rounded-2xl text-center">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Temp</div>
                                                <div className="text-xl font-black text-gray-900">{vitals.temperature}</div>
                                                <div className="text-[10px] text-gray-400 font-bold">°C</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {vitalsDoctor && (
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4 text-right">
                                        Recorded by Dr. {vitalsDoctor}
                                    </p>
                                )}
                            </>
                        ) : (
                            /* Empty state */
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                                    <Activity size={24} className="text-gray-300" />
                                </div>
                                <p className="text-sm font-black text-gray-900 mb-1">No Vitals Recorded Yet</p>
                                <p className="text-xs text-gray-400 font-medium max-w-[200px] leading-relaxed">
                                    Your doctor will log your vital stats during your next consultation.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;
