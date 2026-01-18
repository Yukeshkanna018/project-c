
import React, { useState } from 'react';
import { LogEntry } from '../types';

interface CustodyTimelineProps {
  logs: LogEntry[];
}

const CustodyTimeline: React.FC<CustodyTimelineProps> = ({ logs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prevId => (prevId === id ? null : id));
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flow-root mt-4">
      <ul role="list" className="-mb-8">
        {logs.slice().reverse().map((entry, idx) => {
          const isExpanded = expandedId === entry.id;
          return (
            <li key={entry.id} className="group">
              <div className="relative pb-8">
                {idx !== logs.length - 1 ? (
                  <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-100 group-hover:bg-indigo-100 transition-colors" aria-hidden="true" />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white transition-all duration-500 ${
                      isExpanded ? 'bg-indigo-600 scale-110 shadow-lg' : 'bg-slate-300 group-hover:bg-indigo-400'
                    }`}>
                      <i className={`fas ${isExpanded ? 'fa-fingerprint' : 'fa-check'} text-white text-[10px] ${isExpanded ? 'animate-pulse' : ''}`}></i>
                    </span>
                  </div>
                  <div 
                    className={`flex min-w-0 flex-1 flex-col justify-between pt-1.5 cursor-pointer rounded-2xl p-4 -mt-3 transition-all duration-300 border ${
                      isExpanded 
                        ? 'bg-indigo-50/50 border-indigo-100 shadow-sm ring-1 ring-indigo-50' 
                        : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'
                    }`}
                    onClick={() => toggleExpand(entry.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-6">
                        <p className={`text-sm tracking-tight leading-none transition-colors ${isExpanded ? 'font-black text-indigo-900' : 'text-slate-700 font-bold'}`}>
                          {entry.action} 
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                             {entry.performedBy}
                           </span>
                           {!isExpanded && (
                             <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                               View Details
                             </span>
                           )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-[10px] font-black tabular-nums tracking-tight transition-colors ${isExpanded ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-3 duration-500">
                        <div className="bg-white/90 p-5 rounded-2xl border border-indigo-100/50 shadow-inner space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                              <i className="fas fa-quote-left text-[8px] opacity-40"></i> 
                              Official Notes
                            </h5>
                            <i className="fas fa-shield-check text-indigo-200 text-xs"></i>
                          </div>
                          
                          {entry.notes ? (
                            <p className="text-sm text-slate-800 leading-relaxed font-medium italic">
                              "{entry.notes}"
                            </p>
                          ) : (
                            <p className="text-sm text-slate-400 italic">No supplemental logs were recorded for this timestamp.</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-900/5 p-3 rounded-xl border border-slate-200/20">
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Hash ID</span>
                            <div className="flex items-center justify-between">
                              <code className="text-[10px] text-slate-600 font-mono tracking-tighter">{entry.id.slice(0, 16)}...</code>
                              <button 
                                onClick={(e) => copyToClipboard(entry.id, e)}
                                className="text-slate-300 hover:text-indigo-600 transition-colors p-1"
                                title="Copy full ID"
                              >
                                <i className="fas fa-copy text-[10px]"></i>
                              </button>
                            </div>
                          </div>
                          <div className="bg-slate-900/5 p-3 rounded-xl border border-slate-200/20">
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Type</span>
                            <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">
                              {entry.action.includes('Emergency') ? 'Urgent' : 'Routine'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-3 py-1">
                          <div className="h-px bg-slate-200 flex-1"></div>
                          <div className="flex items-center gap-1.5 opacity-30">
                            <i className="fas fa-lock text-[8px]"></i>
                            <span className="text-[7px] font-black uppercase tracking-widest">Encrypted Entry</span>
                          </div>
                          <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CustodyTimeline;
