import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { gsap } from 'gsap';
import { AlertCircle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

const BookAppointment = () => {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [hospitals, setHospitals] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [responses, setResponses] = useState({
        shortnessOfBreath: false,
        chestPain: false,
        highFever: false,
        severePain: false,
        duration: 'short'
    });
    const [triageResult, setTriageResult] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [loading, setLoading] = useState(false);
    const [bookingStatus, setBookingStatus] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/hospitals');
                setHospitals(res.rows || res.data); // Adjust based on common API response formats
            } catch (err) {
                console.error('Failed to fetch hospitals');
            }
        };
        fetchHospitals();
    }, []);

    useEffect(() => {
        if (selectedHospital) {
            const fetchDoctors = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/hospitals/${selectedHospital}/doctors`);
                    setDoctors(res.data);
                } catch (err) {
                    console.error('Failed to fetch doctors');
                }
            };
            fetchDoctors();
        }
    }, [selectedHospital]);

    const handleTriageSubmit = async () => {
        setLoading(true);
        try {
            // Replicating logic but also preparing for final submission
            let score = 0;
            if (responses.shortnessOfBreath) score += 5;
            if (responses.chestPain) score += 5;
            if (responses.highFever) score += 3;
            if (responses.severePain) score += 3;

            let urgency = 'Routine';
            if (score >= 8) urgency = 'Critical';
            else if (score >= 4) urgency = 'Moderate';

            setTriageResult({ urgency, score });
            setStep(3);
            gsap.from('.result-card', { scale: 0.9, opacity: 0, duration: 0.5 });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async () => {
        if (!selectedSlot) return alert('Please select a time slot');
        setLoading(true);
        try {
            const payload = {
                hospital_id: selectedHospital,
                doctor_id: selectedDoctor,
                appointment_date: new Date().toISOString().split('T')[0], // Today for demo
                start_time: selectedSlot,
                triage_responses: responses
            };
            await axios.post('http://localhost:5000/api/appointments', payload);
            setBookingStatus({ type: 'success', text: 'Appointment booked successfully!' });
            setStep(4);
        } catch (err) {
            setBookingStatus({ type: 'error', text: err.response?.data?.message || 'Booking failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#f8fafc]">
            <div className="max-w-3xl mx-auto">
                <div className="mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">Smart Booking</h2>
                    <p className="text-gray-500 text-lg">AI-powered triage ensures you get the care you need, when you need it.</p>
                </div>

                {step === 1 && (
                    <div className="bg-white p-8 rounded-[2rem] premium-shadow border border-gray-100">
                        <h3 className="text-xl font-bold mb-8">Select Provider</h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Healthcare Facility</label>
                                <select
                                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary outline-none transition-all font-bold text-gray-700 appearance-none"
                                    value={selectedHospital}
                                    onChange={(e) => setSelectedHospital(e.target.value)}
                                >
                                    <option value="">Select Hospital</option>
                                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>

                            {selectedHospital && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Available Doctors</label>
                                    <div className="grid grid-cols-1 gap-4">
                                        {doctors.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => setSelectedDoctor(d.id)}
                                                className={`p-6 rounded-2xl border-2 transition-all flex justify-between items-center ${selectedDoctor === d.id ? 'border-medical-primary bg-medical-soft' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}`}
                                            >
                                                <div className="text-left">
                                                    <div className="font-bold text-gray-900 group-hover:text-medical-primary">Dr. {d.full_name}</div>
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{d.specialty}</div>
                                                </div>
                                                {selectedDoctor === d.id && <CheckCircle2 className="text-medical-primary" size={20} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!selectedDoctor}
                            className="w-full mt-10 py-5 bg-black text-white rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-gray-900 transition-all disabled:opacity-50"
                        >
                            Continue to Triage <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-white p-8 rounded-[2rem] premium-shadow border border-gray-100">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <AlertCircle className="text-medical-primary" />
                            Symptoms Assessment
                        </h3>

                        <div className="space-y-6">
                            {[
                                { id: 'shortnessOfBreath', label: 'Are you experiencing shortness of breath?' },
                                { id: 'chestPain', label: 'Are you feeling any chest pain or pressure?' },
                                { id: 'highFever', label: 'Do you have a fever higher than 39°C (102°F)?' },
                                { id: 'severePain', label: 'Are you in severe, uncontrollable pain?' }
                            ].map((q) => (
                                <div key={q.id} className="flex justify-between items-center p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                    <span className="font-medium text-gray-700">{q.label}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={responses[q.id]}
                                            onChange={(e) => setResponses({ ...responses, [q.id]: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-medical-primary"></div>
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setStep(1)} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-bold">Back</button>
                            <button
                                onClick={handleTriageSubmit}
                                disabled={loading}
                                className="flex-[2] py-5 bg-black text-white rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-gray-900 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Analyzing...' : 'Assessment Complete'} <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && triageResult && (
                    <div className="result-card space-y-6">
                        <div className={`p-8 rounded-[2rem] premium-shadow flex items-start gap-6 ${triageResult.urgency === 'Critical' ? 'bg-red-50 border-red-100' :
                            triageResult.urgency === 'Moderate' ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'
                            } border`}>
                            <div className={`p-4 rounded-2xl ${triageResult.urgency === 'Critical' ? 'bg-red-500' :
                                triageResult.urgency === 'Moderate' ? 'bg-orange-500' : 'bg-green-500'
                                } text-white`}>
                                <AlertCircle size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Assessment Level: {triageResult.urgency}</h3>
                                <p className="text-gray-600">
                                    {triageResult.urgency === 'Critical'
                                        ? 'Your symptoms require immediate attention. We have prioritized your slot.'
                                        : triageResult.urgency === 'Moderate'
                                            ? 'Please book a slot within the next 24 hours. We recommend an early morning slot.'
                                            : 'You can book a routine appointment at your convenience.'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] premium-shadow border border-gray-100">
                            <h3 className="text-xl font-bold mb-6">Available Priority Slots</h3>
                            {bookingStatus.text && bookingStatus.type === 'error' && (
                                <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
                                    {bookingStatus.text}
                                </div>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM'].map((time) => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedSlot(time)}
                                        className={`p-4 rounded-2xl border-2 transition-all text-center group ${selectedSlot === time ? 'border-medical-primary bg-medical-soft' : 'border-gray-100 hover:border-medical-primary'}`}
                                    >
                                        <div className={`flex justify-center mb-2 ${selectedSlot === time ? 'text-medical-primary' : 'text-gray-400 group-hover:text-medical-primary'}`}><Clock size={20} /></div>
                                        <div className={`font-bold ${selectedSlot === time ? 'text-medical-primary' : 'text-gray-800'}`}>{time}</div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button onClick={() => setStep(2)} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-bold">Back</button>
                                <button
                                    onClick={handleBooking}
                                    disabled={loading || !selectedSlot}
                                    className="flex-[2] py-5 bg-medical-primary text-white rounded-2xl font-bold hover:bg-medical-secondary transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Confirming...' : 'Confirm Appointment'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="bg-white p-12 rounded-[3.5rem] premium-shadow border border-gray-100 text-center">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-3xl mx-auto flex items-center justify-center mb-8">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mb-4">Confirmed!</h2>
                        <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium">Your appointment has been successfully scheduled. You will receive a notification 1 hour before your slot.</p>
                        <button
                            onClick={() => window.location.href = '/patient-dashboard'}
                            className="px-10 py-5 bg-black text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookAppointment;
