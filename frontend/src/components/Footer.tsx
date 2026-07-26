import React from 'react';
import { Phone, Mail, HelpCircle, ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 text-sm mt-auto select-none">
      {/* Help Desk & Emergency Helpline Row */}
      <div className="bg-slate-950 py-6 border-b border-slate-800">
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="p-2 bg-red-950 text-red-500 rounded-full border border-red-500/20">
              <Phone className="animate-pulse" size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase m-0">Emergency Helpline</p>
              <p className="text-lg font-extrabold text-white m-0">Dial 112 / 100</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="p-2 bg-blue-950 text-blue-400 rounded-full border border-blue-500/20">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase m-0">Cyber Crime Helpline</p>
              <p className="text-lg font-extrabold text-white m-0">Dial 1930</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-full">
              <Mail size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase m-0">Email Support</p>
              <p className="text-sm font-bold text-white m-0">support-police@karnataka.gov.in</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-full">
              <HelpCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase m-0">Official Portal Version</p>
              <p className="text-sm font-bold text-white m-0">v2.1.0 (Secured)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Logos */}
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-bold text-base mb-3 tracking-tight">KSP Crime Analytics Platform</h3>
          <p className="text-xs leading-relaxed text-slate-500">
            This platform is built for official law enforcement management, data-driven policing, and predictive analytics under the Department of Police, State of Karnataka. Access by unauthorized personnel is strictly prohibited and subject to legal prosecution under the Information Technology Act.
          </p>
        </div>
        <div>
          <h3 className="text-white font-bold text-base mb-3 tracking-tight">Quick Links</h3>
          <ul className="grid grid-cols-2 gap-2 text-xs m-0 p-0 list-none">
            <li><a href="https://ksp.karnataka.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">KSP Official Website</a></li>
            <li><a href="https://karnataka.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Karnataka Govt Portal</a></li>
            <li><a href="https://india.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">National Portal of India</a></li>
            <li><a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">National Cyber Crime Portal</a></li>
            <li><a href="https://mha.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Ministry of Home Affairs</a></li>
            <li><a href="https://digitalindia.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Digital India initiative</a></li>
          </ul>
        </div>
        <div className="flex flex-col items-center md:items-end justify-center">
          <div className="flex gap-4 mb-4 select-none opacity-60 hover:opacity-100 transition duration-300">
            <img 
              src="/digital-india.svg" 
              alt="Digital India" 
              className="h-10 object-contain bg-white p-1 rounded" 
            />
            <img 
              src="/india-gov.svg" 
              alt="India Gov" 
              className="h-10 object-contain bg-white p-1 rounded" 
            />
          </div>
          <p className="text-[11px] text-slate-600 text-center md:text-right m-0">
            © 2026 Karnataka State Police Department. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
