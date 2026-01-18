
import React, { useState, useEffect } from 'react';
import { CustodyRecord, CustodyStatus } from '../types';
import { analyzeRisk } from '../services/geminiService';
import CustodyTimeline from './CustodyTimeline';
import { translations, Language } from '../translations.ts';
import * as api from '../services/api';

interface LawyerNGOViewProps {
  records: CustodyRecord[];
  onUpdateStatus: (id: string, newStatus: CustodyStatus, notes: string) => void;
  onArchiveCase: (id: string) => void;
  onUpdateRecord: (id: string, updates: Partial<CustodyRecord>, logNote: string) => void;
  lang: Language;
}

import ForensicVisualizer from './ForensicVisualizer';

type TabType = 'Case Info' | 'Timeline' | 'AI Analysis' | 'Forensics' | 'Modify';

const LawyerNGOView: React.FC<LawyerNGOViewProps> = ({ records, onUpdateStatus, onArchiveCase, onUpdateRecord, lang }) => {
  const [selectedCase, setSelectedCase] = useState<CustodyRecord | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('Case Info');
  const [riskAssessment, setRiskAssessment] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const t = translations[lang];

  const fetchAnalysis = async (record: CustodyRecord) => {
    if (riskAssessment[record.id]) return;
    setIsAnalyzing(true);
    const assessment = await analyzeRisk(record, lang);
    setRiskAssessment(prev => ({ ...prev, [record.id]: assessment }));
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (selectedCase && activeTab === 'AI Analysis') {
      fetchAnalysis(selectedCase);
    }
  }, [selectedCase?.id, activeTab]);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {!selectedCase ? (
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-20 space-y-4">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-xs font-black uppercase tracking-tactical text-slate-400">{t.lawyers} Oversight</h2>
            <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{records.length} ACTIVE</span>
          </div>
          {records.map(record => (
            <div
              key={record.id}
              onClick={() => setSelectedCase(record)}
              className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm active:scale-[0.98] active:border-indigo-600 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-black uppercase italic tracking-tighter text-slate-950 truncate max-w-[70%]">{record.detaineeName}</h3>
                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">{record.status}</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-[7px] font-black text-slate-300 uppercase tracking-widest">
                <i className="fas fa-fingerprint"></i> {record.id} // {record.policeStation}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 animate-in slide-in-from-right-10 duration-500">
          {/* Mobile Back Button & Header */}
          <div className="p-4 bg-slate-900 border-b border-white/5 flex items-center gap-4 shrink-0">
            <button onClick={() => setSelectedCase(null)} className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center active:scale-90 transition-all">
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="truncate">
              <h2 className="text-white text-base font-black uppercase italic truncate">{selectedCase.detaineeName}</h2>
              <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{selectedCase.id} // Security Node</p>
            </div>
          </div>

          {/* Detailed View Tabs */}
          <div className="flex bg-slate-900/50 border-b border-white/5 shrink-0 overflow-x-auto scrollbar-hide">
            {(['Case Info', 'Timeline', 'AI Analysis', 'Forensics', 'Modify'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[100px] py-4 text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-[#00FFFF] border-b-2 border-[#00FFFF]' : 'text-slate-500 border-b-2 border-transparent'}`}
              >
                {tab === 'AI Analysis' ? 'Risk' : tab === 'Forensics' ? 'V-Audit' : tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {activeTab === 'Case Info' && (
              <div className="space-y-6">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-4">
                  <span className="text-[8px] font-black uppercase text-[#00FFFF] tracking-widest">Detention Context</span>
                  <p className="text-slate-300 text-xs leading-relaxed italic">"{selectedCase.reason}"</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="text-[7px] font-black uppercase text-slate-500 block mb-1">Age</span>
                    <span className="text-white text-xs font-black">{selectedCase.age}</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="text-[7px] font-black uppercase text-slate-500 block mb-1">Gender</span>
                    <span className="text-white text-xs font-black">{selectedCase.gender}</span>
                  </div>
                </div>

                {/* Evidence & Documents Section */}
                <div className="space-y-3">
                  <h4 className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Digital Evidence Locker</h4>
                  {selectedCase.medicalDocuments && selectedCase.medicalDocuments.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[7px] font-black text-[#00FFFF] uppercase">Medical Reports</span>
                      {selectedCase.medicalDocuments.map((doc, i) => (
                        <a key={i} href={api.getFileUrl(doc)} target="_blank" rel="noopener noreferrer" className="block bg-white/5 p-3 rounded-lg border border-white/5 hover:border-[#00FFFF]/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <i className="fas fa-file-medical text-rose-400"></i>
                            <span className="text-[9px] text-white font-mono truncate">{doc}</span>
                            <i className="fas fa-external-link-alt text-[8px] text-slate-500 ml-auto group-hover:text-[#00FFFF]"></i>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                  {selectedCase.evidenceUrls && selectedCase.evidenceUrls.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <span className="text-[7px] font-black text-[#00FFFF] uppercase">Crime Scene Assets</span>
                      {selectedCase.evidenceUrls.map((doc, i) => (
                        <a key={i} href={api.getFileUrl(doc)} target="_blank" rel="noopener noreferrer" className="block bg-white/5 p-3 rounded-lg border border-white/5 hover:border-[#00FFFF]/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <i className="fas fa-file-contract text-indigo-400"></i>
                            <span className="text-[9px] text-white font-mono truncate">{doc}</span>
                            <i className="fas fa-external-link-alt text-[8px] text-slate-500 ml-auto group-hover:text-[#00FFFF]"></i>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                  {(!selectedCase.medicalDocuments?.length && !selectedCase.evidenceUrls?.length) && (
                    <div className="p-4 bg-white/5 rounded-xl text-center">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest">No Digital Assets Found</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'Timeline' && (
              <div className="bg-white rounded-3xl p-6 shadow-2xl">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Audit Trail</h4>
                <CustodyTimeline logs={selectedCase.logs} />
              </div>
            )}

            {activeTab === 'AI Analysis' && (
              <div className="space-y-6">
                <div className="p-8 rounded-3xl bg-gradient-to-br from-[#00FFFF]/10 to-indigo-600/10 border border-[#00FFFF]/30 shadow-2xl">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-[#00FFFF] mb-6 flex items-center gap-2">
                    <i className="fas fa-brain"></i> Neural Audit Summary
                  </h4>
                  {isAnalyzing ? (
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full animate-pulse"></div>
                      <span className="text-slate-400 text-[10px] font-black uppercase">Scanning Registry...</span>
                    </div>
                  ) : (
                    <p className="text-white text-lg font-black italic leading-tight">"{riskAssessment[selectedCase.id] || "Run audit to see analysis."}"</p>
                  )}
                </div>
                {!riskAssessment[selectedCase.id] && !isAnalyzing && (
                  <button onClick={() => fetchAnalysis(selectedCase)} className="w-full bg-[#00FFFF] text-[#051025] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                    Initialize AI Risk Audit
                  </button>
                )}
              </div>
            )}

            {activeTab === 'Forensics' && (
              <div className="space-y-6">
                <ForensicVisualizer initialPrompt={`Crime scene reconstruction for case ${selectedCase.id}: ${selectedCase.reason}`} lang={lang} />
              </div>
            )}

            {activeTab === 'Modify' && (
              <div className="space-y-4">
                <button className="w-full bg-white/5 text-white border border-white/10 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                  <i className="fas fa-flag"></i> Mark Priority Violation
                </button>
                <button onClick={() => onArchiveCase(selectedCase.id)} className="w-full bg-rose-600/20 text-rose-500 border border-rose-500/30 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                  <i className="fas fa-box-archive"></i> Archive Record
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LawyerNGOView;
