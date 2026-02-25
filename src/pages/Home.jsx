import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Star, Users, CheckCircle, User, Clock, Activity, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { user } = useAuth();
    const heroRef = useRef(null);
    const textRef = useRef(null);
    const cardRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const tl = gsap.timeline();

        tl.fromTo(textRef.current.children,
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: "power3.out" }
        );

        tl.fromTo('.floating-card',
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)" },
            "-=0.5"
        );

        gsap.to('.floating-card', {
            y: 15,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }, []);

    return (
        <div ref={heroRef} className="min-h-screen pt-32 pb-20 px-8 bg-[#E2E8F0] relative overflow-hidden">
            {/* Soft Ambient Glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-[120px] opacity-50"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-white rounded-full blur-[100px] opacity-40"></div>

            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
                <div ref={textRef} className="flex-1 space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 premium-shadow">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">World's Most Adopted Healthcare AI</span>
                    </div>

                    <h1 className="text-7xl md:text-8xl font-medium tracking-tight text-black leading-[0.95]">
                        Revolutionizing <br />
                        Healthcare with <br />
                        AI
                    </h1>

                    <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
                        Redefine healthcare with AI! Experience the power of faster diagnostics and precisely tailored treatments,
                        designed by MetQ. Unveil the immense potential of intelligent care.
                        Bridge the gap between cutting-edge technology and holistic wellness.
                    </p>

                    <div className="flex items-center gap-4 pt-4">
                        <button
                            onClick={() => navigate('/book')}
                            className="px-10 py-4 bg-black text-white rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all premium-shadow group"
                        >
                            Book a call <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => navigate('/book')}
                            className="px-10 py-4 bg-white/50 backdrop-blur-md rounded-full text-sm font-bold border border-gray-200 hover:bg-white transition-all"
                        >
                            Appointment
                        </button>
                    </div>

                    <div className="flex items-center gap-4 pt-12">
                        <div className="flex -space-x-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-12 h-12 rounded-full border-4 border-[#E2E8F0] bg-gray-300 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" />
                                </div>
                            ))}
                        </div>
                        <div className="text-sm">
                            <div className="flex items-center gap-1 font-bold text-black">
                                Rated 5/5 & Trusted by
                            </div>
                            <div className="text-gray-500">1000+ Patients</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative flex justify-center items-center">
                    {/* The Generated Robot Hand & Brain Visual */}
                    <div className="w-full h-full relative pointer-events-none transform scale-110">
                        <img
                            src="/hero-main.png"
                            alt="MetQ AI Healthcare"
                            className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
                        />
                        {/* Glow Overlay */}
                        <div className="absolute top-[30%] left-[40%] w-40 h-40 bg-blue-400 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
                    </div>

                    {/* Floating Tech Cards */}
                    <div className="floating-card absolute top-[10%] -right-10 glass-morphism p-5 rounded-3xl w-64 premium-shadow border border-white/40">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => (
                                    <img key={i} src={`https://i.pravatar.cc/100?u=doc${i + 10}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="" />
                                ))}
                            </div>
                            <div className="text-[11px] font-bold leading-tight">300+<br /><span className="text-gray-500 font-medium">Expert doctors</span></div>
                        </div>
                        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                    </div>

                    <div className="floating-card absolute bottom-[10%] left-[-20px] bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] w-72 premium-shadow border border-white">
                        <div className="w-full h-36 bg-gray-100 rounded-3xl mb-4 overflow-hidden shadow-inner">
                            <img src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400" className="w-full h-full object-cover grayscale brightness-110" alt="treatment" />
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="text-2xl font-black text-black">5,000+</div>
                                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Successful Treatment</div>
                            </div>
                            <div className="p-3 bg-green-500 rounded-2xl text-white shadow-lg shadow-green-200">
                                <CheckCircle size={20} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="max-w-7xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 relative z-20 pb-10">
                {[
                    {
                        label: 'Dashboard',
                        path: user?.role === 'patient' ? '/patient-dashboard' : (user?.role === 'doctor' ? '/doctor-dashboard' : (user ? '/dashboard' : '/login')),
                        icon: User,
                        desc: 'Your Central Hub',
                        color: 'bg-white',
                        public: true
                    },
                    { label: 'Book', path: '/book', icon: ArrowRight, desc: 'AI Triage', color: 'bg-medical-primary text-white', public: false },
                    { label: 'Track', path: '/queue', icon: Clock, desc: 'Live Status', color: 'bg-white', public: false },
                    { label: 'Passport', path: '/passport', icon: ShieldCheck, desc: 'Medical Data', color: 'bg-black text-white', public: false }
                ].map((action, i) => (
                    <button
                        key={i}
                        onClick={() => navigate(action.path)}
                        className={`${action.color} p-6 rounded-[2rem] premium-shadow hover:scale-105 transition-all text-left group border border-white/20`}
                    >
                        <div className={`p-3 rounded-2xl mb-4 inline-block ${action.color.includes('white') ? 'bg-gray-50 text-medical-primary' : 'bg-white/10 text-white'}`}>
                            <action.icon size={24} />
                        </div>
                        <h4 className="text-xl font-bold mb-1">{action.label}</h4>
                        <p className={`text-xs font-medium uppercase tracking-widest opacity-60`}>{action.desc}</p>
                    </button>
                ))}
            </div>

            {/* Social Icons Floating */}
            <div className="absolute bottom-10 right-10 flex flex-col gap-6 text-gray-500">
                <div className="hover:text-black cursor-pointer transition-colors"><Star size={20} /></div>
                <div className="hover:text-black cursor-pointer transition-colors"><Users size={20} /></div>
                <div className="hover:text-black cursor-pointer transition-colors"><CheckCircle size={20} /></div>
            </div>
        </div>
    );
};

export default Home;
