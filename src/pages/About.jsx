import React from "react";
import { Target, Shield, Zap, Heart } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen pt-32 pb-20 px-8 bg-[#E2E8F0]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-medical-primary mb-4">
            Our Vision
          </h2>
          <h1 className="text-6xl font-medium tracking-tight text-black leading-tight">
            Redefining the{" "}
            <span className="text-medical-primary italic">Patient Journey</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div className="relative">
            <div className="aspect-square bg-white rounded-[3rem] premium-shadow overflow-hidden p-8 border border-white">
              <img
                src="doctor.jpg"
                className="w-full h-full object-cover rounded-[2.5rem]"
                alt="Modern Healthcare"
              />
            </div>
            {/* Status Float */}
            <div className="absolute -bottom-6 -right-6 bg-medical-primary p-8 rounded-[2rem] text-white premium-shadow">
              <div className="text-4xl font-black">99.9%</div>
              <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">
                System Accuracy
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-3xl font-bold leading-tight">
              MetQ is not just a queue manager. It's an intelligent healthcare
              infrastructure.
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Founded in 2026, MetQ was built with a single goal: to eliminate
              wait-time anxiety and empower patients with their own medical
              data. We believe that healthcare should be proactive, not
              reactive.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: Target, title: "Precision", desc: "Smarter Triage" },
                { icon: Zap, title: "Speed", desc: "Zero Idle Time" },
                { icon: Shield, title: "Security", desc: "Encrypted Records" },
                { icon: Heart, title: "Care", desc: "Patient-First" },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="p-3 bg-white rounded-2xl text-medical-primary">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500 font-medium tracking-wide uppercase">
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
