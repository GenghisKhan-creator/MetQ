import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { Clock, Users, ArrowRight, Share2 } from 'lucide-react';

const QueueStatus = () => {
    const [servingNow, setServingNow] = useState(12);
    const [myPosition, setMyPosition] = useState(5);
    const [waitTime, setWaitTime] = useState(23);
    const numberRef = useRef(null);

    useEffect(() => {
        // Simple polling simulation
        const interval = setInterval(() => {
            setServingNow(prev => prev + 1);
            setMyPosition(prev => Math.max(0, prev - 1));
            setWaitTime(prev => Math.max(0, prev - 5));
        }, 30000); // Update every 30s

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (numberRef.current) {
            gsap.from(numberRef.current, {
                innerText: servingNow - 1,
                duration: 1,
                snap: { innerText: 1 },
                ease: "power2.out"
            });
        }
    }, [servingNow]);

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#f8fafc]">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-4xl font-bold text-gray-900 mb-2">Live Queue</h2>
                        <p className="text-gray-500">Real-time tracking for Dr. Sarah Smith - General Ward</p>
                    </div>
                    <button className="p-4 bg-white rounded-2xl premium-shadow hover:bg-gray-50 transition-all">
                        <Share2 size={20} className="text-gray-600" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-medical-primary p-8 rounded-[2.5rem] text-white premium-shadow relative overflow-hidden group">
                        <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-4">Now Serving</p>
                        <h3 ref={numberRef} className="text-8xl font-black mb-2">{servingNow}</h3>
                        <p className="text-blue-200">Patient ID: #METQ-882</p>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100 flex flex-col justify-between">
                        <div>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Your Position</p>
                            <h3 className="text-6xl font-black text-gray-900">{myPosition}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-green-500 font-bold bg-green-50 px-4 py-2 rounded-xl self-start mt-4">
                            <Users size={16} /> Just 4 people ahead
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] premium-shadow border border-gray-100 flex flex-col justify-between">
                        <div>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Est. Wait Time</p>
                            <h3 className="text-6xl font-black text-gray-900">{waitTime} <span className="text-2xl text-gray-400">min</span></h3>
                        </div>
                        <div className="flex items-center gap-2 text-blue-500 font-bold bg-blue-50 px-4 py-2 rounded-xl self-start mt-4">
                            <Clock size={16} /> Based on avg. 15m visit
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] premium-shadow border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="text-xl font-bold">Upcoming in Queue</h3>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-gray-200"></div>)}
                        </div>
                    </div>
                    <div className="p-4 space-y-2">
                        {[
                            { pos: 1, id: 'METQ-901', time: '10:45 AM', status: 'Next' },
                            { pos: 2, id: 'METQ-442', time: '11:00 AM', status: 'Waiting' },
                            { pos: 3, id: 'METQ-129', time: '11:15 AM', status: 'Waiting' },
                        ].map((item) => (
                            <div key={item.id} className="flex justify-between items-center p-6 rounded-2xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-6">
                                    <span className="text-2xl font-black text-gray-200">#{item.pos}</span>
                                    <div>
                                        <div className="font-bold text-gray-900">{item.id}</div>
                                        <div className="text-sm text-gray-400">Appointment at {item.time}</div>
                                    </div>
                                </div>
                                <span className={`px-4 py-2 rounded-full text-xs font-bold ${item.status === 'Next' ? 'bg-medical-primary text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 p-6 bg-gradient-to-r from-medical-primary to-blue-800 rounded-3xl text-white flex justify-between items-center">
                    <div>
                        <h4 className="font-bold">Avoid the crowd?</h4>
                        <p className="text-blue-200 text-sm">Reschedule to a less busy hour (2 PM - 4 PM)</p>
                    </div>
                    <button className="bg-white text-medical-primary px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-all">
                        Reschedule <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QueueStatus;
