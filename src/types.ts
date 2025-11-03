
export enum Page {
  Login,
  Home,
  Assessment,
  Chatbot,
  Dashboard,
  FetalMovement,
  WeeklyGuide,
  AdminDashboard,
}

export enum Role {
  Patient = 'patient',
  Admin = 'admin',
}
// في ملف src/types.ts

export interface User {
  id: string; 
  role: Role;
  name?: string; // 🚨 إضافة هذا الحقل
}

// ...
export interface User {
  id: string;
  role: Role;
}

export interface PersonalInfo {
  name: string;
  age: number;
}

export interface PregnancyHistory {
  g: number;
  p: number;
  a: number;
}

export interface MeasurementData {
  height: number;
  prePregnancyWeight: number;
  currentWeight: number;
}

export interface LabResults {
  systolicBp?: number;
  diastolicBp?: number;
  fastingGlucose?: number;
  hb?: number;
  [key: string]: number | undefined;
}

export type SymptomLevel = 'None' | 'Mild' | 'Moderate' | 'Severe';

export interface Symptoms {
    nausea: SymptomLevel;
    vomiting: SymptomLevel;
    other: string;
}

export interface AIResponse {
  urgency: string;
  brief_summary: string;
  detailed_report: string;
  extracted_labs: LabResults;
}

export interface PatientRecord {
  id: string;
  userId: string;
  timestamp: Date;
  personalInfo: PersonalInfo;
  pregnancyHistory: PregnancyHistory;
  measurementData: MeasurementData;
  symptoms: Symptoms;
  labResults: LabResults;
  ocrText?: string;
  aiResponse: AIResponse;
}
