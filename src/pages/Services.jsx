import React, { useState } from 'react';
import { Calendar, UserCheck, ShieldCheck, Activity, Stethoscope, Video, X } from 'lucide-react';

const Services = () => {
    const [selectedService, setSelectedService] = useState(null);

    const services = [
        {
            icon: Calendar,
            title: 'Smart Appointments',
            desc: 'AI-guided triage identifies urgent cases during the booking phase, ensuring medical priority over time-slots.',
            details: 'Our Smart Appointment system uses a proprietary AI triage engine to assess symptom severity in real-time. Unlike traditional first-come-first-served systems, MetQ automatically prioritizes patients based on clinical need, reducing congestion and improving outcomes for critical cases.',
            color: 'bg-blue-500'
        },
        {
            icon: UserCheck,
            title: 'Real-Time Tracking',
            desc: 'Live queue monitoring with GPS-integrated arrival alerts and precisely calculated predictive wait times.',
            details: 'MetQ provides a live, transparent view of the hospital queue. Patients receive push notifications as their appointment approaches, and our system calculates predictive wait times using historical provider efficiency data and current patient volume.',
            color: 'bg-green-500'
        },
        {
            icon: ShieldCheck,
            title: 'Global Medical Passport',
            desc: 'Access your health records from anywhere in the world. Secure, encrypted, and patient-owned.',
            details: 'The Global Medical Passport is a secure, blockchain-verified digital health record. It allows patients to carry their entire history, prescriptions, and lab results in their pocket, ensuring seamless transitions of care between hospitals and clinics worldwide.',
            color: 'bg-purple-500'
        },
        {
            icon: Stethoscope,
            title: 'Doctor Management',
            desc: 'Full administration tools for doctors to manage slots, patient history, and digital prescriptions effortlessly.',
            details: 'The Doctor Dashboard provides clinicians with a streamlined interface to manage their daily schedule, review patient history before a visit, and issue digital prescriptions that sync directly to the patient\'s MetQ passport.',
            color: 'bg-orange-500'
        }
    ];

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#E2E8F0] relative">
            {/* Modal Overlay */}
            {selectedService && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedService(null)}
                >
                    <div
                        className="bg-white max-w-2xl w-full p-10 rounded-[3rem] premium-shadow border border-white relative animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedService(null)}
                            className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                        >
                            <X size={24} />
                        </button>

                        <div className={`w-20 h-20 rounded-3xl ${selectedService.color} text-white flex items-center justify-center mb-8 shadow-xl`}>
                            <selectedService.icon size={42} />
                        </div>

                        <h2 className="text-4xl font-black text-gray-900 mb-6">{selectedService.title}</h2>
                        <p className="text-lg text-gray-600 leading-relaxed font-medium mb-8">
                            {selectedService.details}
                        </p>

                        <button
                            onClick={() => setSelectedService(null)}
                            className="w-full py-5 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-medical-primary mb-4">Patient Solutions</h2>
                    <h1 className="text-7xl font-black text-black leading-tight">Comprehensive Care. <br />Digitally Delivered.</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {services.map((service, i) => (
                        <div key={i} className="bg-white p-12 rounded-[3rem] premium-shadow border border-white flex flex-col md:flex-row gap-8 items-start hover:bg-gray-50 transition-all cursor-default group">
                            <div className={`p-6 rounded-3xl ${service.color} text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                                <service.icon size={40} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-bold">{service.title}</h3>
                                <p className="text-gray-500 leading-relaxed font-medium">
                                    {service.desc}
                                </p>
                                <div
                                    onClick={() => setSelectedService(service)}
                                    className="pt-4 flex items-center gap-2 text-sm font-black text-medical-primary uppercase tracking-widest cursor-pointer hover:underline"
                                >
                                    Learn More <Activity size={16} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-16 bg-black p-12 rounded-[4rem] text-white flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="space-y-2">
                        <h4 className="text-3xl font-black">Ready to modernize your hospital?</h4>
                        <p className="text-gray-400 font-medium">Join 300+ healthcare providers using MetQ infrastructure.</p>
                    </div>
                    <button className="px-10 py-5 bg-white text-black rounded-full font-black hover:scale-105 transition-all text-sm uppercase tracking-widest">
                        Partner with us
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Services;
