import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, FileText, Download, Pill, Activity, Calendar, User, Phone, Hash, X, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MedicalPassport = () => {
    const { user } = useAuth();
    const [isDownloading, setIsDownloading] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [selectedRecord, setSelectedRecord] = useState(null); // for View Summary modal

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

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            // ── Header ──────────────────────────────────────────────
            doc.setFillColor(26, 54, 93); // medical-primary dark blue
            doc.rect(0, 0, pageWidth, 40, 'F');

            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('MetQ Medical Passport', 15, 18);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(179, 205, 224);
            doc.text('Secure Health Record — Confidential', 15, 27);
            doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 15, 34);

            // Medical ID badge
            const profile = data?.profile || {};
            doc.setFillColor(255, 255, 255, 0.1);
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.text(`ID: ${profile.medical_id || user?.medical_id || 'METQ-XXXXXXXX'}`, pageWidth - 15, 20, { align: 'right' });

            // ── Patient Info Section ─────────────────────────────────
            doc.setTextColor(26, 54, 93);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('Patient Profile', 15, 55);

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(15, 60, pageWidth - 30, 38, 4, 4, 'F');

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 30);
            doc.text(profile.full_name || user?.full_name || 'N/A', 22, 72);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);

            const infoLeft = [
                ['Email', profile.email || user?.email || 'N/A'],
                ['Phone', profile.phone || 'N/A'],
            ];
            const infoRight = [
                ['Medical ID', profile.medical_id || 'N/A'],
                ['Record Date', new Date().toLocaleDateString()],
            ];

            infoLeft.forEach(([label, val], i) => {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(26, 54, 93);
                doc.text(`${label}:`, 22, 80 + i * 8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 60);
                doc.text(val, 50, 80 + i * 8);
            });
            infoRight.forEach(([label, val], i) => {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(26, 54, 93);
                doc.text(`${label}:`, pageWidth / 2 + 5, 80 + i * 8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 60);
                doc.text(val, pageWidth / 2 + 30, 80 + i * 8);
            });

            // ── Medical Records Table ─────────────────────────────────
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(26, 54, 93);
            doc.text('Medical History', 15, 112);

            const records = data?.records || [];

            if (records.length > 0) {
                autoTable(doc, {
                    startY: 118,
                    head: [['Date', 'Diagnosis', 'Symptoms', 'Doctor', 'Prescriptions']],
                    body: records.map(r => [
                        r.visit_date ? new Date(r.visit_date).toLocaleDateString() : 'N/A',
                        r.diagnosis || 'N/A',
                        r.symptoms ? (r.symptoms.length > 40 ? r.symptoms.substring(0, 40) + '...' : r.symptoms) : 'N/A',
                        r.doctor_name || 'N/A',
                        r.prescriptions?.list ? r.prescriptions.list.slice(0, 2).join(', ') : 'None'
                    ]),
                    headStyles: {
                        fillColor: [26, 54, 93],
                        textColor: [255, 255, 255],
                        fontSize: 9,
                        fontStyle: 'bold',
                    },
                    bodyStyles: {
                        fontSize: 9,
                        textColor: [50, 50, 50],
                    },
                    alternateRowStyles: {
                        fillColor: [248, 250, 252],
                    },
                    columnStyles: {
                        0: { cellWidth: 22 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 50 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 40 },
                    },
                    margin: { left: 15, right: 15 },
                });
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(150, 150, 150);
                doc.text('No medical records on file.', 15, 125);
            }

            // ── Footer ───────────────────────────────────────────────
            const finalY = doc.lastAutoTable?.finalY || 130;
            doc.setFillColor(248, 250, 252);
            doc.rect(0, doc.internal.pageSize.getHeight() - 20, pageWidth, 20, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text('This document is auto-generated by MetQ Health System. For medical use only.', pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });

            // Download
            doc.save(`MetQ_Passport_${user?.full_name?.replace(/\s+/g, '_') || 'Patient'}.pdf`);
        } catch (err) {
            console.error('PDF generation failed', err);
            alert('PDF generation failed. Please try again.');
        } finally {
            setTimeout(() => setIsDownloading(false), 500);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-medical-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Accessing Secure Records...</p>
            </div>
        </div>
    );

    const { profile, records = [], totalVisits = 0 } = data || {};

    // Filter records by tab
    const filteredRecords = records.filter(r => {
        if (activeTab === 'all') return true;
        if (activeTab === 'lab') return r.lab_results && Object.keys(r.lab_results).length > 0;
        return true;
    });

    // Get unique active prescriptions (from last 3 records)
    const recentPrescriptions = records
        .slice(0, 3)
        .flatMap(r => r.prescriptions?.list || [])
        .filter(Boolean)
        .slice(0, 4);

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#f8fafc]">

            {/* ── Visit Summary Modal ── */}
            {selectedRecord && (
                <div
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setSelectedRecord(null)}
                >
                    <div
                        className="w-full max-w-lg bg-white rounded-[2.5rem] premium-shadow overflow-hidden"
                        onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease' }}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-medical-primary to-blue-800 p-8 relative">
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-white/10 rounded-xl">
                                    <FileText size={18} className="text-white" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-blue-200">Visit Summary</span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-1">{selectedRecord.diagnosis}</h3>
                            <div className="flex items-center gap-4 text-sm text-blue-200 font-medium">
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={13} />
                                    {selectedRecord.visit_date
                                        ? new Date(selectedRecord.visit_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-6">
                            {/* Doctor */}
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                                <div className="w-10 h-10 bg-gradient-to-br from-medical-primary to-blue-900 rounded-xl flex items-center justify-center text-white text-xs font-black">Dr</div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Attending Physician</div>
                                    <div className="font-black text-gray-900">{selectedRecord.doctor_name ? `Dr. ${selectedRecord.doctor_name}` : 'Unknown Physician'}</div>
                                </div>
                            </div>

                            {/* Summary Text */}
                            {selectedRecord.visit_summary ? (
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Clinical Notes</div>
                                    <p className="text-gray-700 leading-relaxed font-medium bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                        {selectedRecord.visit_summary}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-gray-400 italic text-sm">No detailed summary available for this visit.</p>
                            )}

                            {/* Symptoms */}
                            {selectedRecord.symptoms && (
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Symptoms Reported</div>
                                    <p className="text-gray-600 font-medium text-sm">{selectedRecord.symptoms}</p>
                                </div>
                            )}

                            {/* Prescribed medications */}
                            {selectedRecord.prescriptions?.list?.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Prescriptions</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRecord.prescriptions.list.map((med, i) => (
                                            <span key={i} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full">
                                                <Pill size={11} /> {med}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 pb-8">
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-medical-primary transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                {/* Header */}
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
                    {/* Sidebar */}
                    <div className="md:col-span-1 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100">
                            {/* Avatar — uses uploaded photo from DB */}
                            <div className="mb-4">
                                <UserAvatar
                                    user={{
                                        full_name: profile?.full_name || user?.full_name,
                                        avatar_url: profile?.avatar_url || user?.avatar_url
                                    }}
                                    size="xl"
                                />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{profile?.full_name || user?.full_name || 'Patient'}</h3>
                            <p className="text-gray-400 text-sm font-bold mb-1">{profile?.email || user?.email}</p>
                            <div className="flex items-center gap-2 text-xs text-medical-primary font-black mb-6 pb-6 border-b border-gray-100">
                                <Hash size={12} /> {profile?.medical_id || user?.medical_id || 'METQ-PENDING'}
                            </div>
                            <div className="space-y-4">
                                {profile?.phone && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400 font-medium flex items-center gap-2"><Phone size={14} /> Phone</span>
                                        <span className="font-bold">{profile.phone}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-medium">Total Visits</span>
                                    <span className="font-bold text-medical-primary">{totalVisits}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400 font-medium">Last Visit</span>
                                    <span className="font-bold">
                                        {records[0]?.visit_date
                                            ? new Date(records[0].visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                            : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Active Prescriptions */}
                        <div className="bg-gradient-to-br from-medical-primary to-blue-900 p-8 rounded-[2.5rem] text-white premium-shadow">
                            <h4 className="font-bold mb-4 flex items-center gap-2"><Pill size={18} /> Active Prescriptions</h4>
                            <div className="space-y-3">
                                {recentPrescriptions.length > 0 ? recentPrescriptions.map((p, i) => (
                                    <div key={i} className="bg-white/10 p-4 rounded-2xl border border-white/5">
                                        <p className="font-bold text-sm">{p}</p>
                                        <p className="text-xs text-blue-200 mt-1">From recent visit</p>
                                    </div>
                                )) : (
                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                                        <p className="text-sm text-blue-200 italic">No active prescriptions</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main History */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Tab Filter */}
                        <div className="flex gap-2">
                            {['all', 'lab'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === tab
                                        ? 'bg-white shadow-sm border border-gray-100 text-medical-primary'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {tab === 'all' ? 'All Records' : 'Lab Results'}
                                </button>
                            ))}
                            <div className="ml-auto text-xs font-bold text-gray-400 self-center uppercase tracking-widest">
                                {filteredRecords.length} {filteredRecords.length === 1 ? 'Record' : 'Records'}
                            </div>
                        </div>

                        {/* Records List */}
                        {filteredRecords.length > 0 ? filteredRecords.map((record, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100 hover:border-medical-accent transition-all group cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-4">
                                        <div className="p-4 bg-gray-50 rounded-2xl text-medical-primary group-hover:bg-medical-soft transition-colors">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    {new Date(record.visit_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <h4 className="text-xl font-bold text-gray-900 group-hover:text-medical-primary transition-colors">{record.diagnosis}</h4>
                                            <p className="text-sm text-gray-500 mt-2 font-medium line-clamp-2">{record.symptoms}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-medical-soft rounded-lg text-medical-primary flex-shrink-0">Visit #{totalVisits - i}</span>
                                </div>

                                {/* Prescriptions pills */}
                                {record.prescriptions?.list?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {record.prescriptions.list.map((med, j) => (
                                            <span key={j} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full">
                                                <Pill size={10} /> {med}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-sm pt-5 border-t border-gray-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-medical-primary">Dr</div>
                                        <span className="text-gray-500 font-medium">
                                            Provided by{' '}
                                            <span className="text-gray-900 font-bold">
                                                {record.doctor_name ? `Dr. ${record.doctor_name}` : 'Unknown Physician'}
                                            </span>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedRecord(record)}
                                        className="text-medical-primary font-bold text-xs hover:underline underline-offset-4 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-medical-soft transition-colors"
                                    >
                                        <FileText size={12} />
                                        View Summary
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white p-16 rounded-[2.5rem] text-center border-2 border-dashed border-gray-100">
                                <Activity size={32} className="text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">No medical history on record yet.</p>
                                <p className="text-gray-300 text-sm mt-2">Your history will appear here after your first consultation.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicalPassport;
