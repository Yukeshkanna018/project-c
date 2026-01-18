
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './services/supabaseClient';
import { UserRole, CustodyRecord, CustodyStatus, LogEntry } from './types';
import PoliceDashboard from './components/PoliceDashboard';
import { PublicDashboard } from './components/PublicDashboard';
import LawyerNGOView from './components/LawyerNGOView';
import LiveMonitor from './components/LiveMonitor';
import { translations, Language } from './translations';
import * as api from './services/api';

const AppLogo = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="50%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="irisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00FFFF" />
        <stop offset="100%" stopColor="#006688" />
      </linearGradient>
      <filter id="detailGlow">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path d="M50 2 L95 18 V50 C95 85 50 98 50 98 C50 98 5 85 5 50 V18 L50 2Z" fill="url(#shieldMetal)" stroke="#1e293b" strokeWidth="1" />
    <path d="M50 2 V25 M50 75 V98 M5 18 L25 25 M95 18 L75 25 M15 50 H25 M85 50 H75" stroke="#00FFFF" strokeWidth="0.5" opacity="0.15" />
    <path d="M50 8 L88 22 V50 C88 78 50 90 50 90 C50 90 12 78 12 50 V22 L50 8Z" fill="none" stroke="#00FFFF" strokeWidth="1.5" filter="url(#detailGlow)" />
    <path d="M20 50 Q50 20 80 50 Q50 80 20 50 Z" fill="#020617" stroke="#00FFFF" strokeWidth="0.8" />
    <circle cx="50" cy="50" r="16" fill="url(#irisGrad)" opacity="0.9" />
    <path d="M50 34 V40 M50 66 V60 M34 50 H40 M66 50 H60 M39 39 L43 43 M61 39 L57 43 M39 61 L43 57 M61 61 L57 57" stroke="#020617" strokeWidth="1" strokeLinecap="round" />
    <path d="M50 43 L56 46 L56 54 L50 57 L44 54 L44 46 Z" fill="#020617" />
    <circle cx="50" cy="50" r="3" fill="#00FFFF" filter="url(#detailGlow)" />
    <ellipse cx="60" cy="40" rx="4" ry="2" fill="white" opacity="0.7" transform="rotate(-45 60 40)" />
  </svg>
);

const PoliceLogo = () => (
  <svg viewBox="0 0 100 120" className="w-12 h-14 md:w-20 md:h-24" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5 L90 20 V60 C90 90 50 115 50 115 C50 115 10 90 10 60 V20 L50 5Z" fill="#051025" stroke="#00FFFF" strokeWidth="4" />
    <path d="M50 25 L65 40 H35 L50 25Z" fill="#00FFFF" />
    <circle cx="50" cy="80" r="10" stroke="#00FFFF" strokeWidth="2" fill="none" />
    <path d="M50 75 V85 M45 80 H55" stroke="#00FFFF" strokeWidth="2" />
  </svg>
);

const PublicLogo = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 md:w-20 md:h-20" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="#051025" stroke="#6366f1" strokeWidth="4" />
    <path d="M30 40 Q50 20 70 40 Q50 60 30 40 Z" fill="none" stroke="#6366f1" strokeWidth="2" />
    <circle cx="50" cy="40" r="5" fill="#6366f1" />
    <path d="M30 75 Q50 55 70 75" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const LawyerLogo = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 md:w-20 md:h-20" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 80 H80 M50 80 V30 M30 40 L50 30 L70 40" stroke="#00FFFF" strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="30" cy="50" r="8" fill="#051025" stroke="#00FFFF" strokeWidth="2" />
    <circle cx="70" cy="50" r="8" fill="#051025" stroke="#00FFFF" strokeWidth="2" />
    <path d="M30 58 V75 M70 58 V75" stroke="#00FFFF" strokeWidth="2" />
  </svg>
);

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [records, setRecords] = useState<CustodyRecord[]>([]);
  const [showLiveMonitor, setShowLiveMonitor] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    // 1. Initial Fetch
    setIsConnected(true);
    fetchData();

    // 2. Realtime Subscriptions
    const recordsSubscription = supabase
      .channel('public:records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, () => {
        fetchData();
      })
      .subscribe();

    const logsSubscription = supabase
      .channel('public:logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, () => {
        fetchData();
      })
      .subscribe();

    const evidenceSubscription = supabase
      .channel('public:evidence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evidence' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(recordsSubscription);
      supabase.removeChannel(logsSubscription);
      supabase.removeChannel(evidenceSubscription);
    };
  }, []);

  const fetchData = async () => {
    try {
      const data = await api.getRecords();
      setRecords(data);
    } catch (e) {
      console.error("Failed to fetch records", e);
    }
  };

  useEffect(() => {
    fetchData();
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const publicRecords = useMemo(() => {
    return records.map(r => ({
      ...r,
      logs: r.logs.filter(log => !log.isInternal)
    }));
  }, [records]);

  const handleUpdateRecord = async (id: string, updates: Partial<CustodyRecord>, logNote: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action: 'Profile Modified',
      performedBy: role || 'SYSTEM',
      notes: logNote,
      isInternal: false
    };
    await api.updateRecord(id, updates, newLog);
  };

  const handleUpdateStatus = async (id: string, newStatus: CustodyStatus, notes: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action: `Status Change: ${newStatus}`,
      performedBy: role || 'SYSTEM',
      notes: notes
    };
    await api.updateRecord(id, { status: newStatus }, newLog);
  };

  const handleAddRecord = async (data: Omit<CustodyRecord, 'id' | 'logs' | 'riskLevel' | 'evidenceUrls' | 'medicalDocuments'>) => {
    const newRecord: CustodyRecord = {
      ...data,
      id: `CASE-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      riskLevel: 'Low',
      evidenceUrls: [],
      medicalDocuments: [],
      logs: [{
        id: 'init-1',
        timestamp: new Date().toISOString(),
        action: 'Intake Protocol Initialized',
        performedBy: 'Officer Reed'
      }]
    };
    await api.createRecord(newRecord);
  };

  const handleArchiveCase = async (id: string) => {
    await api.archiveRecord(id);
  };

  const handleReportConcern = (recordId: string, concern: string) => {
    handleUpdateStatus(recordId, CustodyStatus.EMERGENCY, `PUBLIC_REPORT: ${concern}`);
    alert(lang === 'ta' ? "அவசர SOS ஒளிபரப்பப்பட்டது." : "Emergency SOS broadcasted.");
  };

  const handleGeneralSOS = async (details: { name: string; location: string; description: string }) => {
    const newAlert: CustodyRecord = {
      id: `ALERT-${Math.floor(1000 + Math.random() * 9000)}`,
      detaineeName: details.name,
      age: 0,
      gender: 'Unknown',
      dateTimeDetained: new Date().toISOString(),
      location: details.location,
      reason: details.description,
      status: CustodyStatus.UNREGISTERED_ALERT,
      policeStation: 'N/A',
      officerInCharge: 'N/A',
      riskLevel: 'High',
      evidenceUrls: [],
      medicalDocuments: [],
      logs: [{
        id: 'alert-1',
        timestamp: new Date().toISOString(),
        action: 'Unregistered Detention Reported by Public',
        performedBy: 'PUBLIC_CITIZEN',
        notes: `LOCATION: ${details.location} | DETAILS: ${details.description}`
      }]
    };
    await api.createRecord(newAlert);
  };

  return (
    // Main container is constrained by index.html #root styles
    <div className="flex flex-col h-full w-full">
      <header className="glass shrink-0 border-b border-slate-200/40 h-16 md:h-20 flex items-center px-4 justify-between backdrop-blur-3xl z-50">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setRole(null)}>
          <div className="bg-[#051025] p-1.5 rounded-xl shadow-glow-indigo shrink-0 border border-cyan-500/30">
            <div className="w-8 h-8 flex items-center justify-center">
              <AppLogo />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tightest uppercase italic leading-none text-slate-950">
              {t.appName.split(' ')[0]}<span className="text-indigo-600 ml-0.5">{t.appName.split(' ')[1]}</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{isConnected ? 'Online' : 'Connecting...'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {role && (
            <button
              onClick={() => setShowLiveMonitor(true)}
              className="flex items-center gap-1 px-3 py-2 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 active:scale-95 transition-all shadow-lg"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>LIVE</span>
            </button>
          )}

          <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200">
            <button onClick={() => setLang('en')} className={`px-2 py-1 text-[10px] font-black rounded-md transition-all ${lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>EN</button>
            <button onClick={() => setLang('ta')} className={`px-2 py-1 text-[10px] font-black rounded-md transition-all ${lang === 'ta' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>தமிழ்</button>
          </div>

          {role && (
            <button onClick={() => setRole(null)} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-600 border border-slate-100 active:scale-95">
              <i className="fas fa-power-off text-xs"></i>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col">
        {!role ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 flex flex-col items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black tracking-tightest uppercase italic text-slate-950 leading-[0.9]">
                {t.gateway.split(' ')[0]}<br /><span className="text-indigo-600">{t.gateway.split(' ')[1]}</span>
              </h2>
              <p className="text-slate-400 font-bold max-w-xs mx-auto text-[10px] uppercase tracking-widest opacity-60">Digital Transparency Protocol Activated</p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
              <button
                onClick={() => setRole(UserRole.POLICE)}
                className="group flex items-center gap-6 bg-white border border-slate-100 p-6 rounded-3xl text-left hover:border-indigo-600 hover:shadow-xl transition-all active:scale-[0.98] shadow-sm"
              >
                <div className="shrink-0 group-hover:scale-110 transition-transform">
                  <PoliceLogo />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-950 leading-none">{t.police}</h3>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-tactical opacity-60 mt-2">Precinct Management</p>
                </div>
              </button>

              <button
                onClick={() => setRole(UserRole.LAWYER_NGO)}
                className="group flex items-center gap-6 bg-white border border-slate-100 p-6 rounded-3xl text-left hover:border-indigo-600 hover:shadow-xl transition-all active:scale-[0.98] shadow-sm"
              >
                <div className="shrink-0 group-hover:scale-110 transition-transform">
                  <LawyerLogo />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-950 leading-none">{t.lawyers}</h3>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-tactical opacity-60 mt-2">Legal Oversight</p>
                </div>
              </button>

              <button
                onClick={() => setRole(UserRole.PUBLIC)}
                className="group flex items-center gap-6 bg-white border border-slate-100 p-6 rounded-3xl text-left hover:border-indigo-600 hover:shadow-xl transition-all active:scale-[0.98] shadow-sm"
              >
                <div className="shrink-0 group-hover:scale-110 transition-transform">
                  <PublicLogo />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-950 leading-none">{t.public}</h3>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-tactical opacity-60 mt-2">Citizen Portal</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {role === UserRole.POLICE && <PoliceDashboard records={records} onUpdateStatus={handleUpdateStatus} onAddRecord={handleAddRecord} onUpdateRecord={handleUpdateRecord} lang={lang} />}
            {role === UserRole.PUBLIC && <PublicDashboard records={publicRecords} onReportConcern={handleReportConcern} onEmergencySOS={(id) => handleUpdateStatus(id, CustodyStatus.EMERGENCY, 'SOS_SIGNAL_TRIGGERED')} onGeneralSOS={handleGeneralSOS} lang={lang} hasApiKey={hasApiKey} onOpenKeySelector={handleOpenKeySelector} />}
            {role === UserRole.LAWYER_NGO && <LawyerNGOView records={records} onUpdateStatus={handleUpdateStatus} onArchiveCase={handleArchiveCase} onUpdateRecord={handleUpdateRecord} lang={lang} />}
          </div>
        )}
      </main>

      {showLiveMonitor && role && (
        <LiveMonitor mode={role === UserRole.LAWYER_NGO ? 'NGO' : 'CITIZEN'} onClose={() => setShowLiveMonitor(false)} lang={lang} />
      )}
    </div>
  );
};

export default App;
