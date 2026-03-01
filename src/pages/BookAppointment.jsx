import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { gsap } from 'gsap';
import { AlertCircle, Clock, CheckCircle2, ArrowRight, Calendar, ChevronLeft, Hospital } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Working hours end at 16:30. We allow same-day booking as long as
// the current time is before 16:00 (so at least one slot remains).
const BOOKING_CUTOFF_HOUR = 16; // 4 PM local time

const getAvailableDates = () => {
    const dates = [];
    const now = new Date();
    const todayDay = now.getDay();
    const isWeekday = todayDay !== 0 && todayDay !== 6;
    const beforeCutoff = now.getHours() < BOOKING_CUTOFF_HOUR;

    // Include today only if it's a weekday AND before the booking cutoff
    if (isWeekday && beforeCutoff) {
        dates.push(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    }

    // Add the next 14 weekdays
    const d = new Date(now);
    while (dates.length < 14) {
        d.setDate(d.getDate() + 1);
        const day = d.getDay();
        if (day !== 0 && day !== 6) {
            dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        }
    }
    return dates;
};

// Returns true if a time slot ("HH:MM") is still bookable today
const isSlotAvailable = (timeStr, selectedDateIso) => {
    const todayIso = new Date().toISOString().split('T')[0];
    if (selectedDateIso !== todayIso) return true; // future dates are always open
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    // Require at least 30 min lead time
    return h * 60 + m > now.getHours() * 60 + now.getMinutes() + 30;
};

// Time slots are generated dynamically now

const getDynamicAvailableDates = (schedules) => {
    const dates = [];
    const now = new Date();
    const todayDay = now.getDay();
    const beforeCutoff = now.getHours() < BOOKING_CUTOFF_HOUR;

    // Check if today is working day according to schedule
    const todaySched = schedules.find(s => s.day_of_week === todayDay);
    const todayIsWorking = todaySched ? !todaySched.is_off : (todayDay !== 0 && todayDay !== 6);

    if (todayIsWorking && beforeCutoff) {
        dates.push(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    }

    const d = new Date(now);
    while (dates.length < 14) {
        d.setDate(d.getDate() + 1);
        const day = d.getDay();
        const sched = schedules.find(s => s.day_of_week === day);
        const isWorking = sched ? !sched.is_off : (day !== 0 && day !== 6);

        if (isWorking) {
            dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        }
    }
    return dates;
};

const generateTimeSlots = (selectedDateIso, schedules) => {
    if (!selectedDateIso) return [];
    const dateObj = new Date(selectedDateIso);
    const dayOfWeek = dateObj.getDay();
    const sched = schedules.find(s => s.day_of_week === dayOfWeek);

    if (sched && sched.is_off) return [];

    let start = "08:00";
    let end = "16:30";
    let lunchStart = "12:00";
    let lunchEnd = "13:00";

    if (sched) {
        if (sched.start_time) start = sched.start_time.substring(0, 5);
        if (sched.end_time) end = sched.end_time.substring(0, 5);
        if (sched.lunch_start) lunchStart = sched.lunch_start.substring(0, 5);
        if (sched.lunch_end) lunchEnd = sched.lunch_end.substring(0, 5);
    }

    const slots = [];
    let current = start;

    const parseToMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const endMins = parseToMinutes(end);
    let currentMins = parseToMinutes(start);
    const lsMins = parseToMinutes(lunchStart);
    const leMins = parseToMinutes(lunchEnd);

    while (currentMins < endMins) {
        if (currentMins >= lsMins && currentMins < leMins) {
            currentMins = leMins; // skip lunch break
            continue;
        }

        const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
        const m = (currentMins % 60).toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
        currentMins += 30; // 30 mins interval
    }

    return slots;
};

const BookAppointment = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [hospitals, setHospitals] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [doctorSchedules, setDoctorSchedules] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [responses, setResponses] = useState({
        shortnessOfBreath: false,
        chestPain: false,
        highFever: false,
        severePain: false,
    });
    const [triageResult, setTriageResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingStatus, setBookingStatus] = useState({ type: '', text: '' });

    const availableDates = getDynamicAvailableDates(doctorSchedules);
    const dynamicTimeSlots = generateTimeSlots(selectedDate, doctorSchedules);

    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/hospitals');
                setHospitals(res.data);
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

    useEffect(() => {
        if (selectedDoctor) {
            const fetchSchedule = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/doctors/${selectedDoctor}/schedule`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    setDoctorSchedules(res.data || []);
                } catch (err) {
                    console.error('Failed to fetch doctor schedule');
                    setDoctorSchedules([]);
                }
            };
            fetchSchedule();
        } else {
            setDoctorSchedules([]);
            setSelectedDate('');
            setSelectedSlot('');
        }
    }, [selectedDoctor]);

    const animateIn = (selector) => {
        gsap.from(selector, { y: 20, opacity: 0, duration: 0.5, ease: 'power3.out' });
    };

    const handleStepChange = (nextStep) => {
        setStep(nextStep);
        setTimeout(() => animateIn('.step-content'), 50);
    };

    const handleTriageSubmit = () => {
        let score = 0;
        if (responses.shortnessOfBreath) score += 5;
        if (responses.chestPain) score += 5;
        if (responses.highFever) score += 3;
        if (responses.severePain) score += 3;

        let urgency = 'Routine';
        if (score >= 8) urgency = 'Critical';
        else if (score >= 4) urgency = 'Moderate';

        setTriageResult({ urgency, score });
        handleStepChange(3);
    };

    const handleBooking = async () => {
        if (!selectedSlot || !selectedDate) return;
        setLoading(true);
        setBookingStatus({ type: '', text: '' });
        try {
            const payload = {
                hospital_id: selectedHospital,
                doctor_id: selectedDoctor,
                appointment_date: selectedDate,
                start_time: selectedSlot,
                triage_responses: responses
            };
            await axios.post('http://localhost:5000/api/appointments', payload);
            setBookingStatus({ type: 'success', text: 'Appointment booked successfully!' });
            handleStepChange(4);
        } catch (err) {
            setBookingStatus({ type: 'error', text: err.response?.data?.message || 'Booking failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const selectedDoctorObj = doctors.find(d => d.id === selectedDoctor);
    const selectedHospitalObj = hospitals.find(h => h.id === selectedHospital);

    const urgencyConfig = {
        Critical: { color: 'red', bg: 'bg-red-50', border: 'border-red-100', icon: 'bg-red-500', text: 'Your symptoms require immediate attention. We have prioritized your slot.' },
        Moderate: { color: 'orange', bg: 'bg-orange-50', border: 'border-orange-100', icon: 'bg-orange-500', text: 'We recommend booking an early slot as soon as possible.' },
        Routine: { color: 'green', bg: 'bg-green-50', border: 'border-green-100', icon: 'bg-green-500', text: 'Your symptoms are non-urgent. Book a routine appointment at your convenience.' },
    };

    // Step indicator
    const steps = ['Provider', 'Triage', 'Schedule', 'Confirm'];

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#f8fafc]">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">Smart Booking</h2>
                    <p className="text-gray-500 text-lg">AI-powered triage ensures you get the right care at the right time.</p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center mb-10 gap-0">
                    {steps.map((s, i) => (
                        <React.Fragment key={s}>
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 ${step > i + 1 ? 'bg-green-500 text-white' :
                                    step === i + 1 ? 'bg-black text-white' :
                                        'bg-gray-100 text-gray-400'
                                    }`}>
                                    {step > i + 1 ? <CheckCircle2 size={18} /> : i + 1}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest mt-2 transition-all ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mb-5 transition-all duration-500 ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* STEP 1: Select Provider */}
                {step === 1 && (
                    <div className="step-content bg-white p-8 rounded-[2rem] premium-shadow border border-gray-100">
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                            <div className="p-2 bg-medical-soft rounded-xl text-medical-primary"><Hospital size={20} /></div>
                            Select Healthcare Provider
                        </h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Healthcare Facility</label>
                                <select
                                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border border-transparent focus:border-medical-primary outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                                    value={selectedHospital}
                                    onChange={(e) => { setSelectedHospital(e.target.value); setSelectedDoctor(''); }}
                                >
                                    <option value="">— Select a Hospital —</option>
                                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                </select>
                            </div>

                            {selectedHospital && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Available Doctors</label>
                                    {doctors.length === 0 ? (
                                        <div className="p-6 bg-gray-50 rounded-2xl text-gray-400 text-sm font-medium text-center">
                                            No doctors available at this facility
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {doctors.map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => setSelectedDoctor(d.id)}
                                                    className={`p-5 rounded-2xl border-2 transition-all flex justify-between items-center ${selectedDoctor === d.id ? 'border-medical-primary bg-medical-soft' : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'}`}
                                                >
                                                    <div className="text-left">
                                                        <div className="font-bold text-gray-900">Dr. {d.full_name}</div>
                                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{d.specialty}</div>
                                                    </div>
                                                    {selectedDoctor === d.id && <CheckCircle2 className="text-medical-primary flex-shrink-0" size={20} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => handleStepChange(2)}
                            disabled={!selectedDoctor}
                            className="w-full mt-10 py-5 bg-black text-white rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-gray-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Continue to Triage <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {/* STEP 2: Triage */}
                {step === 2 && (
                    <div className="step-content bg-white p-8 rounded-[2rem] premium-shadow border border-gray-100">
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-3">
                            <div className="p-2 bg-red-50 rounded-xl text-red-500"><AlertCircle size={20} /></div>
                            Symptoms Assessment
                        </h3>
                        <p className="text-gray-400 text-sm font-medium mb-8 ml-1">Help us understand your urgency level so we can serve you better.</p>

                        <div className="space-y-4">
                            {[
                                { id: 'shortnessOfBreath', label: 'Are you experiencing shortness of breath?', severity: 'High' },
                                { id: 'chestPain', label: 'Are you feeling any chest pain or pressure?', severity: 'High' },
                                { id: 'highFever', label: 'Do you have a fever higher than 39°C (102°F)?', severity: 'Medium' },
                                { id: 'severePain', label: 'Are you in severe, uncontrollable pain?', severity: 'Medium' },
                            ].map((q) => (
                                <div
                                    key={q.id}
                                    onClick={() => setResponses({ ...responses, [q.id]: !responses[q.id] })}
                                    className={`flex justify-between items-center p-5 rounded-2xl transition-all cursor-pointer border-2 ${responses[q.id] ? 'border-red-200 bg-red-50' : 'border-transparent hover:bg-gray-50 border-transparent'}`}
                                >
                                    <div>
                                        <span className="font-medium text-gray-800">{q.label}</span>
                                        <span className={`ml-3 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${q.severity === 'High' ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-500'}`}>
                                            {q.severity}
                                        </span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={responses[q.id]}
                                            onChange={() => { }}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button onClick={() => handleStepChange(1)} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                                <ChevronLeft size={18} /> Back
                            </button>
                            <button
                                onClick={handleTriageSubmit}
                                className="flex-[2] py-5 bg-black text-white rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-gray-900 transition-all"
                            >
                                See My Assessment <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Schedule */}
                {step === 3 && triageResult && (
                    <div className="step-content space-y-6">
                        {/* Triage Result Banner */}
                        <div className={`p-6 rounded-[2rem] premium-shadow flex items-center gap-5 ${urgencyConfig[triageResult.urgency].bg} border ${urgencyConfig[triageResult.urgency].border}`}>
                            <div className={`p-4 rounded-2xl ${urgencyConfig[triageResult.urgency].icon} text-white flex-shrink-0`}>
                                <AlertCircle size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">Assessment: <span className={`text-${urgencyConfig[triageResult.urgency].color}-600`}>{triageResult.urgency}</span></h3>
                                <p className="text-gray-600 text-sm">{urgencyConfig[triageResult.urgency].text}</p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] premium-shadow border border-gray-100">
                            {/* Date Selection */}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Calendar size={20} className="text-medical-primary" /> Select a Date
                                </h3>
                                <div className="flex gap-3 overflow-x-auto pb-3">
                                    {availableDates.map((date) => {
                                        const iso = date.toISOString().split('T')[0];
                                        const isSelected = selectedDate === iso;
                                        return (
                                            <button
                                                key={iso}
                                                onClick={() => { setSelectedDate(iso); setSelectedSlot(''); }}
                                                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all min-w-[70px] ${isSelected ? 'border-medical-primary bg-medical-soft' : 'border-gray-100 hover:border-gray-200'}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </span>
                                                <span className={`text-2xl font-black mt-1 ${isSelected ? 'text-medical-primary' : 'text-gray-800'}`}>
                                                    {date.getDate()}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold">
                                                    {date.toLocaleDateString('en-US', { month: 'short' })}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Time Slot Selection */}
                            {selectedDate && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <Clock size={20} className="text-medical-primary" /> Select a Time Slot
                                    </h3>
                                    {selectedDate === new Date().toISOString().split('T')[0] && (
                                        <p className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-3">
                                            ⏰ Same-day booking — slots before now + 30 min are unavailable.
                                        </p>
                                    )}
                                    <div className="grid grid-cols-4 gap-3">
                                        {dynamicTimeSlots.length === 0 ? (
                                            <div className="col-span-4 text-center text-sm font-bold text-gray-400 py-4">No available slots for this date.</div>
                                        ) : dynamicTimeSlots.map((time) => {
                                            const available = isSlotAvailable(time, selectedDate);
                                            return (
                                                <button
                                                    key={time}
                                                    onClick={() => available && setSelectedSlot(time)}
                                                    disabled={!available}
                                                    title={!available ? 'This slot has already passed' : ''}
                                                    className={`p-3 rounded-2xl border-2 transition-all text-center text-sm font-bold ${!available
                                                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                                                        : selectedSlot === time
                                                            ? 'border-medical-primary bg-medical-soft text-medical-primary'
                                                            : 'border-gray-100 hover:border-medical-primary text-gray-700'
                                                        }`}
                                                >
                                                    {time}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Booking Summary */}
                            {selectedDate && selectedSlot && (
                                <div className="p-5 bg-gray-50 rounded-2xl mb-6 border border-gray-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Booking Summary</p>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-gray-400">Hospital:</span> <span className="font-bold">{selectedHospitalObj?.name}</span></div>
                                        <div><span className="text-gray-400">Doctor:</span> <span className="font-bold">Dr. {selectedDoctorObj?.full_name}</span></div>
                                        <div><span className="text-gray-400">Date:</span> <span className="font-bold">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
                                        <div><span className="text-gray-400">Time:</span> <span className="font-bold">{selectedSlot}</span></div>
                                        <div><span className="text-gray-400">Urgency:</span> <span className={`font-bold text-${urgencyConfig[triageResult.urgency].color}-600`}>{triageResult.urgency}</span></div>
                                    </div>
                                </div>
                            )}

                            {bookingStatus.text && bookingStatus.type === 'error' && (
                                <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
                                    {bookingStatus.text}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button onClick={() => handleStepChange(2)} className="flex-1 py-5 bg-gray-100 text-gray-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                                    <ChevronLeft size={18} /> Back
                                </button>
                                <button
                                    onClick={handleBooking}
                                    disabled={loading || !selectedSlot || !selectedDate}
                                    className="flex-[2] py-5 bg-medical-primary text-white rounded-2xl font-bold hover:bg-blue-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Confirming...' : 'Confirm Appointment'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: Confirmation */}
                {step === 4 && (
                    <div className="step-content bg-white p-12 rounded-[3.5rem] premium-shadow border border-gray-100 text-center">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-3xl mx-auto flex items-center justify-center mb-8">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mb-4">Appointment Confirmed!</h2>
                        <p className="text-gray-500 mb-3 max-w-sm mx-auto font-medium">
                            Your appointment with <strong>Dr. {selectedDoctorObj?.full_name}</strong> at{' '}
                            <strong>{selectedHospitalObj?.name}</strong> has been scheduled.
                        </p>
                        <p className="text-gray-400 text-sm mb-10">
                            📅 {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ⏰ {selectedSlot}
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => navigate('/patient-dashboard')}
                                className="px-10 py-5 bg-black text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
                            >
                                Go to Dashboard
                            </button>
                            <button
                                onClick={() => navigate('/queue')}
                                className="px-10 py-5 bg-medical-soft text-medical-primary rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
                            >
                                Track Queue
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookAppointment;
