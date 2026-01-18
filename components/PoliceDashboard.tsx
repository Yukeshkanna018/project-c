
import React, { useState, useRef } from 'react';
import { CustodyRecord, CustodyStatus } from '../types';
import { translations, Language } from '../translations.ts';
import { resolveLocationFromCoordinates } from '../services/geminiService';
import * as api from '../services/api';

interface PoliceDashboardProps {
  records: CustodyRecord[];
  onUpdateStatus: (id: string, newStatus: CustodyStatus, notes: string) => void;
  onAddRecord: (record: Omit<CustodyRecord, 'id' | 'logs' | 'riskLevel' | 'evidenceUrls' | 'medicalDocuments'>) => void;
  onUpdateRecord: (id: string, updates: Partial<CustodyRecord>, logNote: string) => void;
  lang: Language;
}

const PoliceDashboard: React.FC<PoliceDashboardProps> = ({ records, onUpdateStatus, onAddRecord, onUpdateRecord, lang }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CustodyRecord | null>(null);
  const t = translations[lang];

  const urgentRecords = records.filter(r => !r.isArchived && (r.status === CustodyStatus.EMERGENCY || r.status === CustodyStatus.MEDICAL_CHECK || r.status === CustodyStatus.UNREGISTERED_ALERT));
  const activeRecords = records.filter(r => !r.isArchived && !urgentRecords.includes(r));

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Scrollable View Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 space-y-6">
        {urgentRecords.length > 0 && (
          <div className="bg-rose-600 rounded-2xl p-4 shadow-lg animate-pulse border border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <div>
                <h3 className="text-white text-[10px] font-black uppercase tracking-widest">{t.criticalIntervention}</h3>
                <p className="text-rose-100 text-[8px] font-bold uppercase mt-0.5">{urgentRecords.length} Active Alerts</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black uppercase tracking-tactical text-slate-400">Records Ledger</h2>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-black text-slate-500">{activeRecords.length} TOTAL</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {activeRecords.map(record => (
            <RecordCard 
              key={record.id} 
              record={record} 
              onUpdateStatus={onUpdateStatus} 
              onEdit={() => setEditingRecord(record)} 
              onUpdateRecord={onUpdateRecord} 
              t={t} 
            />
          ))}
        </div>
      </div>

      {/* Integrated Action Bar - Stays at bottom of flex container */}
      <div className="p-4 bg-white border-t border-slate-200 z-10 shrink-0">
        <button 
          onClick={() => setShowAddForm(true)} 
          className="w-full bg-slate-950 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] transition-all"
        >
          <i className="fas fa-user-plus"></i>
          {t.newIntake}
        </button>
      </div>

      {showAddForm && (
        <AddIntakeModal onClose={() => setShowAddForm(false)} onAdd={(data) => { onAddRecord(data); setShowAddForm(false); }} t={t} />
      )}
      
      {editingRecord && (
        <UpdateModal record={editingRecord} onClose={() => setEditingRecord(null)} onSubmit={(id, updates, note) => { onUpdateRecord(id, updates, note); setEditingRecord(null); }} t={t} />
      )}
    </div>
  );
};

const RecordCard: React.FC<{ record: CustodyRecord; onUpdateStatus: any; onEdit: () => void; onUpdateRecord: any; t: any }> = ({ record, onUpdateStatus, onEdit, onUpdateRecord, t }) => {
  const medicalFileInputRef = useRef<HTMLInputElement>(null);
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'medical' | 'evidence') => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        await api.uploadFile(record.id, file, type === 'medical' ? 'MEDICAL' : 'EVIDENCE');
        alert(`${type} file uploaded successfully.`);
      } catch (err) {
        console.error(err);
        alert('Upload failed');
      } finally {
        setIsUploading(false);
        // Reset inputs
        if (medicalFileInputRef.current) medicalFileInputRef.current.value = '';
        if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="max-w-[80%]">
          <h3 className="text-base font-black uppercase italic tracking-tighter text-slate-950 truncate leading-none">{record.detaineeName}</h3>
          <p className="text-[7px] font-mono font-black text-slate-400 mt-2 uppercase tracking-widest">{record.id} // {record.status}</p>
        </div>
        <button onClick={onEdit} className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 active:text-indigo-600 transition-all flex items-center justify-center shrink-0">
          <i className="fas fa-edit text-xs"></i>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5 min-h-[80px]">
          <div className="flex justify-between items-center mb-1">
             <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Medical</span>
             <button onClick={() => medicalFileInputRef.current?.click()} disabled={isUploading} className="text-[7px] text-indigo-600"><i className="fas fa-plus"></i></button>
          </div>
          <div className="text-[8px] font-bold text-slate-600 overflow-y-auto max-h-16 space-y-1">
            {record.medicalDocuments?.length ? (
              record.medicalDocuments.map((doc, i) => (
                <a key={i} href={api.getFileUrl(doc)} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 hover:underline truncate bg-white/50 px-1 py-0.5 rounded">
                  <i className="fas fa-file-medical mr-1"></i>{doc}
                </a>
              ))
            ) : 'No Docs'}
          </div>
          <input type="file" ref={medicalFileInputRef} className="hidden" onChange={e => handleUpload(e, 'medical')} />
        </div>
        
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5 min-h-[80px]">
          <div className="flex justify-between items-center mb-1">
             <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Evidence</span>
             <button onClick={() => evidenceFileInputRef.current?.click()} disabled={isUploading} className="text-[7px] text-slate-900"><i className="fas fa-plus"></i></button>
          </div>
          <div className="text-[8px] font-bold text-slate-600 overflow-y-auto max-h-16 space-y-1">
            {record.evidenceUrls?.length ? (
              record.evidenceUrls.map((doc, i) => (
                <a key={i} href={api.getFileUrl(doc)} target="_blank" rel="noopener noreferrer" className="block text-slate-900 hover:underline truncate bg-white/50 px-1 py-0.5 rounded">
                   <i className="fas fa-file-contract mr-1"></i>{doc}
                </a>
              ))
            ) : 'No Assets'}
          </div>
          <input type="file" ref={evidenceFileInputRef} className="hidden" onChange={e => handleUpload(e, 'evidence')} />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onUpdateStatus(record.id, CustodyStatus.MEDICAL_CHECK, 'Medical re-check requested')} className="flex-1 py-3 bg-slate-50 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 active:bg-rose-50 active:text-rose-600 transition-all">
          Re-Check
        </button>
        <button onClick={() => onUpdateStatus(record.id, CustodyStatus.RELEASED, 'Authorized subject release')} className="flex-1 py-3 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:bg-indigo-600 transition-all">
          Release
        </button>
      </div>
    </div>
  );
};

const AddIntakeModal = ({ onClose, onAdd, t }: any) => {
  const [formData, setFormData] = useState({ detaineeName: '', age: 25, gender: 'Male', location: '', reason: '', policeStation: '', officerInCharge: '' });
  const [isLocating, setIsLocating] = useState(false);

  const handleFetchGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, location: `Locating... (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` }));
        
        try {
          const address = await resolveLocationFromCoordinates(latitude, longitude);
          setFormData(prev => ({
            ...prev,
            location: address
          }));
        } catch (e) {
          setFormData(prev => ({
            ...prev,
            location: `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("GPS Error:", error);
        alert("Unable to retrieve location. Please ensure GPS is enabled.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/20 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black italic uppercase text-slate-950">{t.newIntake}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-600"><i className="fas fa-times text-xl"></i></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder={t.name} required className="w-full bg-slate-100 p-4 rounded-xl text-xs font-black outline-none" value={formData.detaineeName} onChange={e => setFormData({...formData, detaineeName: e.target.value})} />
            <input type="number" placeholder={t.age} required className="w-full bg-slate-100 p-4 rounded-xl text-xs font-black outline-none" value={formData.age} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} />
          </div>
          <div className="relative">
            <input 
              placeholder={t.location} 
              required 
              className="w-full bg-slate-100 p-4 rounded-xl text-xs font-black outline-none pr-12" 
              value={formData.location} 
              onChange={e => setFormData({...formData, location: e.target.value})} 
            />
            <button 
              type="button"
              onClick={handleFetchGPS}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isLocating ? 'bg-indigo-600 text-white animate-pulse' : 'bg-white text-slate-400 shadow-sm'}`}
            >
              <i className={`fas ${isLocating ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`}></i>
            </button>
          </div>
          <input placeholder={t.station} required className="w-full bg-slate-100 p-4 rounded-xl text-xs font-black outline-none" value={formData.policeStation} onChange={e => setFormData({...formData, policeStation: e.target.value})} />
          <textarea placeholder={t.reason} required className="w-full bg-slate-100 p-4 rounded-xl text-xs font-black outline-none h-24" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
          <button onClick={() => onAdd(formData)} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs mt-4">Start Protocol</button>
        </div>
      </div>
    </div>
  );
};

const UpdateModal = ({ record, onClose, onSubmit, t }: any) => {
  const [updates, setUpdates] = useState({ detaineeName: record.detaineeName, reason: record.reason });
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/20 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black italic uppercase text-slate-950">{t.modify}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-600"><i className="fas fa-times text-xl"></i></button>
        </div>
        <div className="space-y-4">
          <input className="w-full bg-slate-100 p-4 rounded-xl text-xs font-black outline-none" value={updates.detaineeName} onChange={e => setUpdates({...updates, detaineeName: e.target.value})} />
          <textarea className="w-full bg-slate-100 p-4 rounded-xl text-xs font-black outline-none h-20" value={updates.reason} onChange={e => setUpdates({...updates, reason: e.target.value})} />
          <textarea placeholder="Audit Trail Entry (Required)" required className="w-full bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-xs font-black outline-none h-24" value={note} onChange={e => setNote(e.target.value)} />
          <button onClick={() => note && onSubmit(record.id, updates, note)} disabled={!note} className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-50">Apply Changes</button>
        </div>
      </div>
    </div>
  );
};

export default PoliceDashboard;
