
export enum UserRole {
  POLICE = 'POLICE',
  PUBLIC = 'PUBLIC',
  LAWYER_NGO = 'LAWYER_NGO'
}

export enum Permission {
  VIEW_PUBLIC_LEDGER = 'VIEW_PUBLIC_LEDGER',
  VIEW_INTERNAL_LEDGER = 'VIEW_INTERNAL_LEDGER',
  CREATE_INTAKE = 'CREATE_INTAKE',
  UPDATE_STATUS = 'UPDATE_STATUS',
  VIEW_RISK_ANALYSIS = 'VIEW_RISK_ANALYSIS',
  TRIGGER_EMERGENCY = 'TRIGGER_EMERGENCY',
  ARCHIVE_RECORDS = 'ARCHIVE_RECORDS',
  ACCESS_LIVE_FEED = 'ACCESS_LIVE_FEED'
}

export enum CustodyStatus {
  DETAINED = 'Detained',
  MEDICAL_CHECK = 'Medical Check Required',
  TRANSFER_PENDING = 'Transfer Pending',
  RELEASED = 'Released',
  EMERGENCY = 'Emergency Flag',
  UNREGISTERED_ALERT = 'Unregistered Detention Alert'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  notes?: string;
  isInternal?: boolean; // allow hiding notes from public
}

export interface CustodyRecord {
  id: string;
  detaineeName: string;
  age: number;
  gender: string;
  dateTimeDetained: string;
  location: string;
  reason: string;
  status: CustodyStatus;
  policeStation: string;
  officerInCharge: string;
  lastMedicalCheck?: string;
  logs: LogEntry[];
  riskLevel: 'Low' | 'Medium' | 'High';
  evidenceUrls: string[];
  medicalDocuments: string[]; // List of uploaded document names or data URLs
  isArchived?: boolean;
}
