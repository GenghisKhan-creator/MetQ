import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, FileText, Download, Pill, Activity, Calendar } from 'lucide-react';

const MedicalPassport = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/medical/passport');
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch medical passport', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDownload = () => {
        setIsDownloading(true);
        setTimeout(() => {
            setIsDownloading(false);
            alert('Your Secure Medical Passport (PDF) has been generated and downloaded.');
        }, 2000);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-medical-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Accessing Secure Records...</p>
            </div>
        </div>
    );

    const { profile, records, totalVisits } = data || { profile: {}, records: [], totalVisits: 0 };

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#f8fafc]">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-medical-primary rounded-2xl text-white">
                                <Shield size={24} />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-[0.2em] text-medical-primary">Secure Medical Passport</span>
                        </div>
                        <h2 className="text-5xl font-black text-gray-900 leading-tight">Your Health,<br />Digitalized.</h2>
                    </div>
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="px-8 py-4 bg-black text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all premium-shadow disabled:opacity-50"
                    >
                        <Download size={20} className={isDownloading ? 'animate-bounce' : ''} />
                        {isDownloading ? 'Generating PDF...' : 'Download E-Passport'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Info */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100">
                            <div className="w-24 h-24 bg-gray-100 rounded-3xl mb-6 overflow-hidden border-4 border-white shadow-inner">
                                <img src="https://i.pravatar.cc/150?u=patient" className="w-full h-full object-cover" alt="" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">John Doe</h3>
                            <p className="text-gray-500 text-sm mb-6 pb-6 border-b border-gray-50">METQ-PV-8823190</p>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-medium">Blood Group</span>
                                    <span className="font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">A+ Positive</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-medium">Age</span>
                                    <span className="font-bold">29 Years</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-medium">Last Visit</span>
                                    <span className="font-bold">Feb 12, 2026</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-medical-primary to-blue-900 p-8 rounded-[2.5rem] text-white premium-shadow">
                            <h4 className="font-bold mb-4 flex items-center gap-2"><Pill size={18} /> Active Prescriptions</h4>
                            <div className="space-y-3">
                                <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                                    <p className="font-bold text-sm">Amoxicillin 500mg</p>
                                    <p className="text-xs text-blue-200">Twice daily • 5 days left</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                                    <p className="font-bold text-sm">Cetirizine 10mg</p>
                                    <p className="text-xs text-blue-200">As needed for allergies</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main History */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex gap-4 mb-2">
                            <button className="px-6 py-2 bg-white rounded-full font-bold text-sm shadow-sm border border-gray-100 text-medical-primary">All Records</button>
                            <button className="px-6 py-2 rounded-full font-bold text-sm text-gray-400 hover:text-gray-600">Lab Results</button>
                            <button className="px-6 py-2 rounded-full font-bold text-sm text-gray-400 hover:text-gray-600">Vaccinations</button>
                        </div>

                        {records.length > 0 ? records.map((record, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100 hover:border-medical-accent transition-all group cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-4">
                                        <div className="p-4 bg-gray-50 rounded-2xl text-medical-primary group-hover:bg-medical-soft transition-colors">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(record.visit_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                            <h4 className="text-xl font-bold text-gray-900 group-hover:text-medical-primary transition-colors">{record.diagnosis}</h4>
                                            <p className="text-sm text-gray-500 mt-2 font-medium line-clamp-2">{record.symptoms}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-gray-50 rounded-lg text-gray-400">Record</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-6 border-t border-gray-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-medical-primary">Dr</div>
                                        <span className="text-gray-500 font-medium">Provided by <span className="text-gray-900 font-bold">{record.doctor_name}</span></span>
                                    </div>
                                    <button className="text-medical-primary font-bold hover:underline underline-offset-4">View Report</button>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">No medical history available on blockchain yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicalPassport;
