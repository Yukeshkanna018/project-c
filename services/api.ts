
import { CustodyRecord, LogEntry } from '../types';
import { supabase } from './supabaseClient';

export const getRecords = async (): Promise<CustodyRecord[]> => {
  const { data, error } = await supabase
    .from('records')
    .select(`
      *,
      logs (*),
      evidence (*)
    `)
    .eq('isArchived', false);

  if (error) throw error;

  return (data || []).map(record => ({
    ...record,
    isArchived: !!record.isArchived,
    logs: record.logs || [],
    medicalDocuments: (record.evidence || [])
      .filter((f: any) => f.type === 'MEDICAL')
      .map((f: any) => f.filename),
    evidenceUrls: (record.evidence || [])
      .filter((f: any) => f.type === 'EVIDENCE')
      .map((f: any) => f.filename)
  }));
};

export const createRecord = async (record: CustodyRecord): Promise<void> => {
  const { logs, medicalDocuments, evidenceUrls, ...recordData } = record;

  // 1. Insert Record
  const { error: recordError } = await supabase
    .from('records')
    .insert([{ ...recordData, isArchived: false }]);

  if (recordError) throw recordError;

  // 2. Insert Initial Logs
  if (logs && logs.length > 0) {
    const logsWithRecordId = logs.map(log => ({ ...log, recordId: record.id }));
    const { error: logsError } = await supabase
      .from('logs')
      .insert(logsWithRecordId);
    if (logsError) throw logsError;
  }
};

export const updateRecord = async (id: string, updates: Partial<CustodyRecord>, log: LogEntry): Promise<void> => {
  // 1. Update Record
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('records')
      .update(updates)
      .eq('id', id);
    if (updateError) throw updateError;
  }

  // 2. Add Log
  if (log) {
    const { error: logError } = await supabase
      .from('logs')
      .insert([{ ...log, recordId: id }]);
    if (logError) throw logError;
  }
};

export const archiveRecord = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('records')
    .update({ isArchived: true })
    .eq('id', id);
  if (error) throw error;
};

export const uploadFile = async (recordId: string, file: File, type: 'MEDICAL' | 'EVIDENCE'): Promise<string> => {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `${recordId}/${fileName}`;

  // 1. Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from('evidence')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 2. Register in Database
  const { error: dbError } = await supabase
    .from('evidence')
    .insert([{ recordId, filename: filePath, type }]);

  if (dbError) throw dbError;

  return filePath;
};

export const getFileUrl = (filename: string) => {
  const { data } = supabase.storage
    .from('evidence')
    .getPublicUrl(filename);
  return data.publicUrl;
};
