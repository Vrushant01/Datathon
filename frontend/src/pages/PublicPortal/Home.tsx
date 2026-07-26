import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Brain, ChevronDown, Users, ChevronRight, Lock, MapPin, BarChart3 } from 'lucide-react';
import { mockDb } from '../../utils/mockDb';
import { TransparentLogo } from '../../components/TransparentLogo';
export const Home: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'Admin') navigate('/admin-portal');
      else if (user.role === 'Analytics') navigate('/analytics-portal');
      else navigate('/officer-portal');
    }
  }, [isAuthenticated, user, navigate]);

  const faqs = [
    {
      q: "What is the KSP Crime Analytics Platform?",
      a: "It is an advanced administrative and analytical portal used by the Karnataka State Police for managing First Information Reports (FIRs), tracking investigation timelines, uploading multimedia evidence, mapping crime hotspots via GIS, and analyzing repeat offender patterns."
    },
    {
      q: "Who is authorized to log in?",
      a: "Only active law enforcement employees of the Karnataka State Police (using their Employee ID / KGID and system password) and designated platform Administrators are permitted to log in. Unauthorized access is a punishable offence."
    },
    {
      q: "How does the GIS mapping system work?",
      a: "The GIS system plots active crime occurrences in real-time, filtered by district, station, date, and crime category. It computes geographical clusters using heatmaps to direct police patrols to active hotspots."
    }
  ];

  return (
    <div className="flex-grow flex flex-col bg-slate-50 min-h-screen">

      {/* Hero Section with Official Aesthetics */}
      <section className="bg-gradient-to-r from-ksp-navy-dark via-ksp-navy to-ksp-blue text-white py-16 px-4 border-b border-ksp-gold/20 relative overflow-hidden">
        {/* Background Subtle Watermark */}
        <div className="absolute right-10 bottom-0 opacity-10 pointer-events-none scale-150 select-none">
          <TransparentLogo 
            src="/ksp-logo-new.png" 
            alt="watermark" 
            className="w-[300px] h-[300px] object-contain" 
          />
        </div>

        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-ksp-gold/15 border border-ksp-gold/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-ksp-gold mb-6 select-none shadow-sm uppercase tracking-wider">
            <Shield size={14} /> Official Law Enforcement System
          </div>
          
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 font-heading text-white">
            Crime Analytics & GIS Platform
          </h2>
          
          <p className="text-base md:text-xl text-slate-200 max-w-3xl mx-auto mb-8 font-medium leading-relaxed">
            Empowering the Karnataka State Police with real-time spatial analytics and unified case management workflow to enforce security and peace.
          </p>

          {/* Core Portal Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <Link 
              to="/login"
              className="bg-white/10 hover:bg-white/15 text-white font-bold p-5 rounded-xl border border-white/20 hover:border-white/30 flex items-center justify-between transition-all duration-300 shadow group"
            >
              <div className="text-left">
                <span className="text-xs uppercase text-slate-300 font-semibold tracking-wider block mb-1">Station Operations</span>
                <span className="text-lg text-white font-bold block">Police Officer Portal</span>
              </div>
              <ChevronRight className="text-ksp-gold group-hover:translate-x-1.5 transition" />
            </Link>

            <Link 
              to="/analytics-login"
              className="bg-white/10 hover:bg-white/15 text-white font-bold p-5 rounded-xl border border-white/20 hover:border-white/30 flex items-center justify-between transition-all duration-300 shadow group"
            >
              <div className="text-left">
                <span className="text-xs uppercase text-slate-300 font-semibold tracking-wider block mb-1">Insights & Data</span>
                <span className="text-lg text-white font-bold block">Analytics Portal</span>
              </div>
              <BarChart3 className="text-ksp-gold group-hover:scale-110 transition" />
            </Link>

            <Link 
              to="/admin"
              className="bg-ksp-gold hover:bg-ksp-gold-light text-ksp-navy-dark font-bold p-5 rounded-xl flex items-center justify-between transition-all duration-300 shadow-lg group border border-ksp-gold/35"
            >
              <div className="text-left">
                <span className="text-xs uppercase text-ksp-navy-dark/75 font-bold tracking-wider block mb-1">Administrative Control</span>
                <span className="text-lg text-ksp-navy-dark font-extrabold block">Administrator Login</span>
              </div>
              <Lock className="text-ksp-navy-dark/70 group-hover:scale-110 transition" />
            </Link>
          </div>
        </div>
      </section>

      {/* Advanced AI Features Panel */}
      <section className="py-16 container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-ksp-navy-light block mb-2">Platform Features</span>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 m-0">AI & GIS Intelligence Suite</h3>
          <div className="w-16 h-1 bg-ksp-gold mx-auto mt-3 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border hover:shadow-lg transition duration-300">
            <div className="p-3 bg-blue-50 text-ksp-navy-light w-fit rounded-lg mb-4 border border-blue-100">
              <MapPin size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Crime Hotspot Detection</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Spatial density analysis maps local incidents onto geographic tiles, outlining recurring high-crime zones to optimization patrol deployment.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border hover:shadow-lg transition duration-300">
            <div className="p-3 bg-amber-50 text-ksp-gold-dark w-fit rounded-lg mb-4 border border-amber-100">
              <Brain size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Repeat Offender Prediction</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Machine learning models calculate risk scores based on offender profiles, incident timing, and modus operandi to forecast recidivism.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border hover:shadow-lg transition duration-300">
            <div className="p-3 bg-red-50 text-red-600 w-fit rounded-lg mb-4 border border-red-100">
              <Shield size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Syndicate Link Analysis</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Visualizes connections between accomplices, co-accused, and shared crime networks utilizing node-link graphs and relationship association tables.
            </p>
          </div>
        </div>
      </section>



      {/* Frequently Asked Questions */}
      <section className="py-16 container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 m-0">Frequently Asked Questions</h3>
          <div className="w-16 h-1 bg-ksp-gold mx-auto mt-3 rounded-full"></div>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-lg border overflow-hidden">
              <button 
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full text-left p-5 font-bold text-slate-900 flex justify-between items-center hover:bg-slate-50 transition"
              >
                <span>{faq.q}</span>
                <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${activeFaq === index ? 'rotate-180' : ''}`} />
              </button>
              {activeFaq === index && (
                <div className="p-5 border-t text-xs text-slate-600 leading-relaxed bg-slate-50/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Directories */}
      <section className="bg-slate-900 text-white py-12 border-t border-ksp-gold/20">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 text-center md:text-left">
          <div>
            <h4 className="text-lg font-bold text-ksp-gold uppercase tracking-wider mb-4">State Control Room Contact</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Karnataka State Police Headquarters, Nrupathunga Road, Bengaluru, Karnataka - 560001
            </p>
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center justify-center md:justify-start gap-2 text-slate-300">
                <strong>Tel:</strong> +91 80 2294 3355
              </span>
              <span className="flex items-center justify-center md:justify-start gap-2 text-slate-300">
                <strong>Fax:</strong> +91 80 2221 2011
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-center items-center md:items-end">
            <h4 className="text-lg font-bold text-slate-200 mb-2">Recruitment & Grievances</h4>
            <p className="text-xs text-slate-400 mb-4">File online complaints directly at KSP public portal.</p>
            <a 
              href="https://ksp.karnataka.gov.in" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-2.5 rounded-lg border border-white/20 transition-all text-xs flex items-center gap-1.5"
            >
              <Shield size={14} /> Visit KSP Citizen Portal
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
