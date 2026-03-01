import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { Clock, Users, ArrowRight, Share2, Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { socket, connectSocket, disconnectSocket, joinQueueRoom } from '../services/socket';

const QueueStatus = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [queueData, setQueueData] = useState(null);
    const [myEntry, setMyEntry] = useState(null);
    const [myTurn, setMyTurn] = useState(false);
    const [doctorId, setDoctorId] = useState(null);
    const numberRef = useRef(null);
    const prevServingRef = useRef(null);

    // Fetch initial queue data based on patient's today's appointment
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const aptRes = await axios.get('http://localhost:5000/api/appointments/my');
                const today = new Date().toISOString().split('T')[0];
                const todaysApt = aptRes.data.find(a =>
                    a.appointment_date?.split('T')[0] === today &&
                    a.status !== 'canceled'
                );

                if (todaysApt) {
                    setDoctorId(todaysApt.doctor_id);
                    const qRes = await axios.get(`http://localhost:5000/api/queues/live/${todaysApt.doctor_id}`);
                    setQueueData(qRes.data);
                    // Find patient's own entry
                    const me = qRes.data.entries?.find(e => e.patient_user_id === user?.id);
                    setMyEntry(me);
                    setMyTurn(me?.status === 'serving');
                }
            } catch (err) {
                console.error('Failed to load queue data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitial();
    }, [user]);

    // Connect Socket.io when we know the doctor_id
    useEffect(() => {
        if (!doctorId) return;

        connectSocket();

        socket.on('connect', () => {
            setConnected(true);
            joinQueueRoom(doctorId);
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('queue_updated', (data) => {
            setQueueData(data);
            const me = data.entries?.find(e => e.patient_user_id === user?.id);
            setMyEntry(me);
            setMyTurn(me?.status === 'serving');
        });

        // Listen for personal "your turn" notification
        if (user?.id) {
            socket.on(`patient_turn_${user.id}`, () => {
                setMyTurn(true);
            });
        }

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('queue_updated');
            if (user?.id) socket.off(`patient_turn_${user.id}`);
            disconnectSocket();
        };
    }, [doctorId, user]);

    // Animate number change when serving number updates
    useEffect(() => {
        if (numberRef.current && queueData?.currentNumber !== undefined) {
            if (prevServingRef.current !== null && prevServingRef.current !== queueData.currentNumber) {
                gsap.fromTo(numberRef.current,
                    { scale: 1.4, color: '#2b6cb0' },
                    { scale: 1, color: '#1a365d', duration: 0.6, ease: 'elastic.out(1, 0.5)' }
                );
            }
            prevServingRef.current = queueData.currentNumber;
        }
    }, [queueData?.currentNumber]);

    // Animate "your turn" alert
    useEffect(() => {
        if (myTurn) {
            gsap.fromTo('.your-turn-alert',
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
            );
        }
    }, [myTurn]);

    // Animate cards on initial load
    useEffect(() => {
        if (!loading) {
            gsap.fromTo('.queue-card',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out' }
            );
        }
    }, [loading]);

    const myPosition = myEntry?.position || null;
    const aheadCount = myPosition ? Math.max(0, myPosition - (queueData?.currentNumber || 0) - 1) : null;
    const estimatedWait = aheadCount !== null ? aheadCount * 15 : null;

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-medical-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Live Queue...</p>
            </div>
        </div>
    );

    if (!queueData && !loading) return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#f8fafc]">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white p-16 rounded-[3rem] premium-shadow border border-gray-100 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-3">No Active Queue</h3>
                    <p className="text-gray-400 font-medium max-w-sm mx-auto">
                        You don't have an appointment scheduled for today. Book one to join the live queue.
                    </p>
                    <button
                        onClick={() => window.location.href = '/book'}
                        className="mt-8 px-10 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                    >
                        Book Appointment
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#f8fafc]">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-4xl font-bold text-gray-900 mb-2">Live Queue</h2>
                        <p className="text-gray-500">Real-time tracking • Updates automatically</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${connected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {connected ? 'Live' : 'Connecting...'}
                    </div>
                </div>

                {/* Queue Paused Alert */}
                {queueData && queueData.is_active === false && (
                    <div className="mb-8 p-6 bg-orange-50 border border-orange-200 rounded-[2rem] text-orange-600 flex items-center gap-5 premium-shadow">
                        <div className="p-3 bg-orange-100 rounded-xl">
                            <AlertCircle size={28} className="text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black mb-1">Queue is Paused</h3>
                            <p className="font-medium">The doctor is currently taking a break or attending to an emergency. Wait times may be longer.</p>
                        </div>
                    </div>
                )}

                {/* Your Turn Alert */}
                {myTurn && queueData?.is_active !== false && (
                    <div className="your-turn-alert mb-8 p-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-[2.5rem] text-white premium-shadow flex items-center gap-6">
                        <div className="p-4 bg-white/20 rounded-2xl">
                            <CheckCircle size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black mb-1">It's Your Turn!</h3>
                            <p className="text-green-100 font-medium">Please proceed to the consultation room now.</p>
                        </div>
                        <div className="ml-auto w-8 h-8 bg-white/30 rounded-full animate-ping"></div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {/* Now Serving */}
                    <div className="queue-card bg-medical-primary p-8 rounded-[2.5rem] text-white premium-shadow relative overflow-hidden group">
                        <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-4">Now Serving</p>
                        <h3 ref={numberRef} className="text-8xl font-black mb-2">
                            {queueData?.entries?.find(e => e.status === 'serving') ? queueData.entries.find(e => e.status === 'serving').position : '—'}
                        </h3>
                        <p className="text-blue-200 text-sm">
                            {queueData?.entries?.find(e => e.status === 'serving') ? `Queue #${queueData.entries.find(e => e.status === 'serving').position}` : 'Doctor is idle'}
                        </p>
                    </div>

                    {/* My Position */}
                    <div className="queue-card bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100 flex flex-col justify-between">
                        <div>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Your Position</p>
                            <h3 className="text-6xl font-black text-gray-900">
                                {myPosition !== null ? `#${myPosition}` : '—'}
                            </h3>
                        </div>
                        {aheadCount !== null ? (
                            <div className="flex items-center gap-2 text-green-500 font-bold bg-green-50 px-4 py-2 rounded-xl self-start mt-4">
                                <Users size={16} />
                                {aheadCount === 0 ? "You're next!" : `${aheadCount} ${aheadCount === 1 ? 'person' : 'people'} ahead`}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-4">Not in queue yet</div>
                        )}
                    </div>

                    {/* Est. Wait */}
                    <div className="queue-card bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100 flex flex-col justify-between">
                        <div>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Est. Wait Time</p>
                            <h3 className="text-6xl font-black text-gray-900">
                                {estimatedWait !== null ? estimatedWait : '—'}
                                {estimatedWait !== null && <span className="text-2xl text-gray-400 ml-2">min</span>}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 text-blue-500 font-bold bg-blue-50 px-4 py-2 rounded-xl self-start mt-4">
                            <Clock size={16} /> Based on avg. 15m visit
                        </div>
                    </div>
                </div>

                {/* Upcoming Patients List */}
                <div className="queue-card bg-white rounded-[2.5rem] premium-shadow border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="text-xl font-bold">Queue Overview</h3>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {queueData?.waitingCount || 0} Waiting
                        </span>
                    </div>
                    <div className="p-4 space-y-2">
                        {queueData?.entries?.length > 0 ? queueData.entries.map((item, i) => (
                            <div
                                key={item.id}
                                className={`flex justify-between items-center p-6 rounded-2xl transition-colors ${item.patient_user_id === user?.id
                                    ? 'bg-medical-soft border-2 border-medical-primary'
                                    : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-6">
                                    <span className={`text-2xl font-black ${item.patient_user_id === user?.id ? 'text-medical-primary' : 'text-gray-200'}`}>
                                        #{item.position}
                                    </span>
                                    <div>
                                        <div className="font-bold text-gray-900">
                                            {item.patient_user_id === user?.id ? 'You' : `Patient #${item.position}`}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            Est. wait: {Math.max(0, (item.position - (queueData.currentNumber || 0) - 1)) * 15} min
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-4 py-2 rounded-full text-xs font-bold ${item.status === 'serving' ? 'bg-medical-primary text-white animate-pulse' :
                                    item.patient_user_id === user?.id ? 'bg-medical-primary/10 text-medical-primary' :
                                        'bg-gray-100 text-gray-500'
                                    }`}>
                                    {item.status === 'serving' ? '🔴 Now Serving' :
                                        item.patient_user_id === user?.id ? 'Your Slot' : 'Waiting'}
                                </span>
                            </div>
                        )) : (
                            <div className="p-12 text-center text-gray-400 italic">
                                No patients currently in queue
                            </div>
                        )}
                    </div>
                </div>

                {/* Reschedule Banner */}
                <div className="mt-8 p-6 bg-gradient-to-r from-medical-primary to-blue-800 rounded-3xl text-white flex justify-between items-center queue-card">
                    <div>
                        <h4 className="font-bold">Need to Reschedule?</h4>
                        <p className="text-blue-200 text-sm">Book a different time slot that works better for you</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/book'}
                        className="bg-white text-medical-primary px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-all"
                    >
                        Rebook <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QueueStatus;
