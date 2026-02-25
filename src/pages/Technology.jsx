import React from 'react';
import { Cpu, Database, Fingerprint, Layers, BarChart3, Globe } from 'lucide-react';

const Technology = () => {
    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#E2E8F0]">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div className="max-w-2xl">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-medical-primary mb-4">MetQ Engine</h2>
                        <h1 className="text-6xl font-black text-black leading-tight">The Tech Behind <br />The Trust.</h1>
                    </div>
                    <div className="p-8 bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-white max-w-sm">
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                            Our proprietary AI infrastructure processes thousands of medical data points per second to ensure predictive accuracy in patient queue management.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { icon: Cpu, title: 'AI Triage Engine', desc: 'Rule-based assessment system that dynamically adjusts queue priority based on symptom severity.' },
                        { icon: Database, title: 'Medical Ledger', desc: 'Secure PostgreSQL-powered health records system with automated history tracking and encryption.' },
                        { icon: Fingerprint, title: 'E-Passport', desc: 'Unique digital identities generated for every patient, enabling seamless global health accessibility.' },
                        { icon: Layers, title: 'Predictive Wait', desc: 'Machine-learning models that calculate real-time wait times based on historical provider efficiency.' },
                        { icon: Globe, title: 'Multi-Tenant SaaS', desc: 'Cloud-native architecture designed to handle thousands of hospitals on a single high-availability node.' },
                        { icon: BarChart3, title: 'Admin Analytics', desc: 'Advanced data visualization for hospital administrators to optimize staffing and patient flow.' }
                    ].map((tech, i) => (
                        <div key={i} className="bg-white p-10 rounded-[3rem] premium-shadow border border-white hover:scale-105 transition-all group">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-medical-primary mb-8 group-hover:bg-medical-primary group-hover:text-white transition-all">
                                <tech.icon size={32} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">{tech.title}</h3>
                            <p className="text-gray-500 leading-relaxed text-sm font-medium">
                                {tech.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Technology;
