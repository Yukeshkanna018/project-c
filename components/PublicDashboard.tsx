
import React, { useState, useRef, useEffect } from 'react';
import { CustodyRecord, CustodyStatus } from '../types';
import { getCitizenAssistantResponse } from '../services/geminiService';
import CustodyTimeline from './CustodyTimeline';
import { translations, Language } from '../translations';

interface PublicDashboardProps {
  records: CustodyRecord[];
  onReportConcern: (recordId: string, concern: string, evidence?: string) => void;
  onEmergencySOS: (recordId: string) => void;
  onGeneralSOS: (details: { name: string; location: string; description: string; evidence?: string }) => void;
  lang: Language;
  hasApiKey?: boolean;
  onOpenKeySelector?: () => void;
}

type MobileTab = 'ledger' | 'audit' | 'chat';

export const PublicDashboard: React.FC<PublicDashboardProps> = ({ records, onEmergencySOS, onGeneralSOS, lang, hasApiKey, onOpenKeySelector }) => {
  const t = translations[lang];
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<CustodyStatus | 'All'>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<CustodyRecord | null>(null);
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [useMaps, setUseMaps] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [activeTab, setActiveTab] = useState<MobileTab>('ledger');

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const rightsQueries = [
    t.rightsArrest,
    t.rightsLawyer,
    t.rightsBail,
    t.rightsMedical,
    t.rightsWoman,
    t.rightsFir
  ];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.warn("Geolocation denied"),
        { enableHighAccuracy: true }
      );
    }
    setAiMessages([{ role: 'assistant', text: t.chatWelcome, sources: [] }]);
  }, [lang]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isAiTyping]);

  const handleAiChat = async (directMessage?: string) => {
    const msg = directMessage || aiInput;
    if (!msg.trim()) return;
    
    if (!directMessage) setAiInput('');
    
    setAiMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsAiTyping(true);

    const res = await getCitizenAssistantResponse(msg, {
      caseContext: selectedRecord || undefined,
      lang,
      useSearch,
      useMaps,
      location: userLocation || undefined
    });

    setIsAiTyping(false);
    setAiMessages(prev => [...prev, { role: 'assistant', text: res.text, sources: res.sources }]);
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = !r.isArchived && (
      r.detaineeName.toLowerCase().includes(search.toLowerCase()) || 
      r.id.toLowerCase().includes(search.toLowerCase())
    );
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(r.dateTimeDetained) >= new Date(startDate);
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(r.dateTimeDetained) <= eDate;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const selectRecordAndTransition = (record: CustodyRecord) => {
    setSelectedRecord(record);
    setActiveTab('audit');
  };

  const statusOptions: (CustodyStatus | 'All')[] = [
    'All',
    CustodyStatus.DETAINED,
    CustodyStatus.MEDICAL_CHECK,
    CustodyStatus.RELEASED,
    CustodyStatus.EMERGENCY,
    CustodyStatus.UNREGISTERED_ALERT
  ];

  return (
    <div className="flex flex-col h-full bg-[#fdfdff]">
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {activeTab === 'ledger' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder={t.searchLedger} 
                    className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-xl font-black text-[11px] outline-none pl-10 focus:bg-white focus:ring-1 focus:ring-indigo-100 transition-all" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                  />
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                </div>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 rounded-xl border transition-all flex items-center justify-center ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <i className="fas fa-sliders-h text-xs"></i>
                </button>
              </div>

              {showFilters && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                  {/* Status Filter Scroll */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Status Registry</label>
                    <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-1">
                      {statusOptions.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setFilterStatus(opt)}
                          className={`px-4 py-2 rounded-full text-[9px] font-black uppercase whitespace-nowrap border transition-all ${filterStatus === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range Selection */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Time Horizon</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-300 uppercase">From</span>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[10px] font-bold outline-none"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-300 uppercase">To</span>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[10px] font-bold outline-none"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reset Filters */}
                  {(filterStatus !== 'All' || startDate || endDate || search) && (
                    <button 
                      onClick={() => { setSearch(''); setFilterStatus('All'); setStartDate(''); setEndDate(''); }}
                      className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 rounded-xl"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{filteredRecords.length} Results Found</span>
            </div>

            {filteredRecords.map(record => (
              <div 
                key={record.id} 
                onClick={() => selectRecordAndTransition(record)} 
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${selectedRecord?.id === record.id ? 'bg-slate-950 border-indigo-500 text-white shadow-lg' : 'bg-white border-white shadow-sm hover:border-slate-100'}`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-black uppercase italic tracking-tighter text-sm leading-none">{record.detaineeName}</h3>
                  <div className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${selectedRecord?.id === record.id ? 'bg-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                    {new Date(record.dateTimeDetained).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-[8px] font-mono font-black uppercase tracking-widest opacity-60">{record.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${record.status === CustodyStatus.EMERGENCY ? 'bg-rose-100 text-rose-600' : selectedRecord?.id === record.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-50 text-slate-400'}`}>
                    {record.status}
                  </span>
                </div>
              </div>
            ))}

            {filteredRecords.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <i className="fas fa-folder-open text-4xl mb-4 opacity-20"></i>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">No records match criteria</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 h-full flex flex-col">
            {selectedRecord ? (
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex justify-between items-center">
                  <div className="max-w-[70%]">
                    <h2 className="text-xl font-black italic uppercase text-slate-950 truncate">{selectedRecord.detaineeName}</h2>
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mt-1">{selectedRecord.policeStation}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setActiveTab('chat');
                        handleAiChat(t.nearbyStations + " to " + selectedRecord.policeStation);
                      }}
                      className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm"
                      title={t.nearbyStations}
                    >
                      <i className="fas fa-map-pin"></i>
                    </button>
                    <button onClick={() => onEmergencySOS(selectedRecord.id)} className="w-12 h-12 bg-rose-600 text-white rounded-xl flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all">
                      <i className="fas fa-bolt text-lg"></i>
                      <span className="text-[7px] font-black">SOS</span>
                    </button>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                     <i className="fas fa-history"></i> {t.timeline}
                   </h5>
                   <CustodyTimeline logs={selectedRecord.logs} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-300">
                <i className="fas fa-shield-halved text-5xl mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">Select a case to audit</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 bg-slate-950 rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5 bg-slate-900/50 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><i className="fas fa-shield-cat"></i></div>
              <div>
                <h3 className="text-white text-xs font-black uppercase tracking-widest">{t.rightsConcierge}</h3>
                <span className="text-[7px] text-indigo-400 uppercase font-black">AI Legal Grounding</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {aiMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[90%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 px-2">
                      {msg.sources.map((s: any, i: number) => (
                        <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[8px] font-black uppercase text-[#00FFFF] flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                          <i className="fas fa-location-dot text-[7px]"></i> {s.title || 'Source'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isAiTyping && (
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-[#00FFFF] rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black text-[#00FFFF]/60 uppercase">Thinking...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-slate-900/80 border-t border-white/5 space-y-3">
               {/* Suggested Queries Chips */}
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 {rightsQueries.map((q, i) => (
                   <button 
                    key={i} 
                    onClick={() => handleAiChat(q)}
                    className="bg-white/5 hover:bg-indigo-600 hover:text-white border border-white/10 text-slate-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap transition-colors"
                   >
                     {q}
                   </button>
                 ))}
               </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder={t.queryRights} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-[11px] outline-none pr-12 focus:border-indigo-500/50 transition-colors" 
                  value={aiInput} 
                  onChange={e => setAiInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAiChat()} 
                />
                <button onClick={() => handleAiChat()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white text-[#051025] rounded-lg flex items-center justify-center active:scale-90"><i className="fas fa-arrow-up"></i></button>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="glass shrink-0 border-t border-slate-200/50 flex items-center justify-around px-2 pb-safe h-20 z-10">
        {[
          { id: 'ledger', icon: 'list-check', label: 'Ledger' },
          { id: 'audit', icon: 'magnifying-glass-chart', label: 'Audit' },
          { id: 'chat', icon: 'comment-dots', label: 'Legal' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as MobileTab)} 
            className={`flex flex-col items-center gap-1 flex-1 py-2 transition-all ${activeTab === tab.id ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <i className={`fas fa-${tab.icon} text-lg`}></i>
            <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
            {activeTab === tab.id && <span className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5 animate-in zoom-in"></span>}
          </button>
        ))}
      </nav>
    </div>
  );
};
