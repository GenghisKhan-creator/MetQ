import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Save, ChevronLeft, CheckCircle, AlertTriangle } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_SCHEDULE = DAYS.map((day, idx) => ({
    day_of_week: idx,
    is_off: idx === 0 || idx === 6, // Weekends off by default
    start_time: '08:00:00',
    end_time: '16:30:00',
    lunch_start: '12:00:00',
    lunch_end: '13:00:00'
}));

const formatTimeForInput = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // '08:00:00' -> '08:00'
};

const formatTimeForDB = (timeStr) => {
    if (!timeStr) return null;
    if (timeStr.length === 5) return timeStr + ':00';
    return timeStr;
};

export default function DoctorSchedule() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState(DEFAULT_SCHEDULE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/doctors/my-schedule', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });

                if (res.data && res.data.length > 0) {
                    const merged = DEFAULT_SCHEDULE.map(defDay => {
                        const found = res.data.find(d => d.day_of_week === defDay.day_of_week);
                        if (found) {
                            return {
                                day_of_week: found.day_of_week,
                                is_off: found.is_off,
                                start_time: found.start_time || defDay.start_time,
                                end_time: found.end_time || defDay.end_time,
                                lunch_start: found.lunch_start || defDay.lunch_start,
                                lunch_end: found.lunch_end || defDay.lunch_end
                            };
                        }
                        return defDay;
                    });
                    setSchedules(merged);
                }
            } catch (err) {
                console.error('Failed to fetch schedule:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSchedule();
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        setMsg({ type: '', text: '' });
        try {
            const formattedSchedules = schedules.map(s => ({
                day_of_week: s.day_of_week,
                is_off: s.is_off,
                start_time: s.is_off ? null : formatTimeForDB(s.start_time),
                end_time: s.is_off ? null : formatTimeForDB(s.end_time),
                lunch_start: s.is_off ? null : formatTimeForDB(s.lunch_start),
                lunch_end: s.is_off ? null : formatTimeForDB(s.lunch_end),
            }));

            await axios.put('http://localhost:5000/api/doctors/schedule', { schedules: formattedSchedules }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMsg({ type: 'success', text: 'Schedule successfully updated!' });
        } catch (err) {
            console.error('Save failed:', err);
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update schedule.' });
        } finally {
            setSaving(false);
        }
    };

    const updateDay = (dayIndex, field, value) => {
        setSchedules(prev => {
            const newSchedule = [...prev];
            newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
            return newSchedule;
        });
    };

    if (loading) return <div className="min-h-screen pt-28 flex justify-center items-center font-bold text-gray-500">Loading schedule...</div>;

    if (user?.role !== 'doctor') {
        navigate('/');
        return null;
    }

    return (
        <div className="min-h-screen pt-28 pb-20 px-6 bg-[#f8fafc]">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-xl premium-shadow">
                                <Calendar size={18} className="text-medical-primary" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-500">My Schedule</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Working Hours</h1>
                        <p className="text-gray-500 mt-1 font-medium">Define your weekly availability for appointments.</p>
                    </div>
                    <button
                        onClick={() => navigate('/doctor-dashboard')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 hover:border-medical-primary hover:text-medical-primary transition-all premium-shadow"
                    >
                        <ChevronLeft size={16} /> Dashboard
                    </button>
                </div>

                {msg.text && (
                    <div className={`mb-6 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        {msg.text}
                    </div>
                )}

                <div className="bg-white rounded-[2rem] premium-shadow border border-gray-100 overflow-hidden">
                    <div className="p-8 space-y-4">
                        <div className="grid grid-cols-12 gap-4 pb-4 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <div className="col-span-3 lg:col-span-2">Day</div>
                            <div className="col-span-2 text-center">Status</div>
                            <div className="col-span-7 lg:col-span-8 flex justify-between pr-4">
                                <span className="flex-1 text-center">Shift Start</span>
                                <span className="flex-1 text-center">Shift End</span>
                                <span className="flex-1 text-center hidden lg:block">Lunch Start</span>
                                <span className="flex-1 text-center hidden lg:block">Lunch End</span>
                            </div>
                        </div>

                        {schedules.map((day, idx) => (
                            <div key={idx} className={`grid grid-cols-12 items-center gap-4 py-4 border-b border-gray-50 transition-all ${day.is_off ? 'opacity-60' : ''}`}>
                                <div className="col-span-3 lg:col-span-2 font-bold text-gray-900 flex items-center gap-2">
                                    {DAYS[idx]}
                                </div>
                                <div className="col-span-2 flex justify-center">
                                    <button
                                        onClick={() => updateDay(idx, 'is_off', !day.is_off)}
                                        className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${day.is_off ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'}`}
                                    >
                                        {day.is_off ? 'Off' : 'Working'}
                                    </button>
                                </div>

                                <div className="col-span-7 lg:col-span-8 flex justify-between gap-4">
                                    <input
                                        type="time"
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-medical-primary outline-none transition-all disabled:opacity-50 font-medium text-sm text-center"
                                        value={formatTimeForInput(day.start_time)}
                                        onChange={(e) => updateDay(idx, 'start_time', e.target.value)}
                                        disabled={day.is_off}
                                    />
                                    <input
                                        type="time"
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-medical-primary outline-none transition-all disabled:opacity-50 font-medium text-sm text-center"
                                        value={formatTimeForInput(day.end_time)}
                                        onChange={(e) => updateDay(idx, 'end_time', e.target.value)}
                                        disabled={day.is_off}
                                    />
                                    <input
                                        type="time"
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-medical-primary outline-none transition-all disabled:opacity-50 font-medium text-sm text-center hidden lg:block"
                                        value={formatTimeForInput(day.lunch_start)}
                                        onChange={(e) => updateDay(idx, 'lunch_start', e.target.value)}
                                        disabled={day.is_off}
                                    />
                                    <input
                                        type="time"
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-medical-primary outline-none transition-all disabled:opacity-50 font-medium text-sm text-center hidden lg:block"
                                        value={formatTimeForInput(day.lunch_end)}
                                        onChange={(e) => updateDay(idx, 'lunch_end', e.target.value)}
                                        disabled={day.is_off}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-50 p-6 flex justify-end gap-4 border-t border-gray-100">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-3.5 bg-medical-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                            {saving ? 'Saving...' : 'Save Schedule'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
