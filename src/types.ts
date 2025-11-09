export enum Page {
  Login, Home, Assessment, Chatbot, Dashboard, FetalMovement, WeeklyGuide, AdminDashboard,
}
export enum Role { Patient = 'patient', Admin = 'admin' }

export interface User {
  id: string; 
  role: Role;
  name?: string;
}

export interface PersonalInfo { name: string; age: number; }
export interface PregnancyHistory { g: number; p: number; a: number; }
export interface MeasurementData { height: number; prePregnancyWeight: number; currentWeight: number; }

export interface LabResults {
  systolicBp?: number;
  diastolicBp?: number;
  fastingGlucose?: number;
  hb?: number;
  [key: string]: number | undefined;
}

// -----------------------------------------------------------------
// 🚨 (النقطة 1) هيكل الأعراض الجديد (Checklist)
// -----------------------------------------------------------------
export interface SymptomsPayload {
  // Pre-Eclampsia
  headache: boolean;
  visionChanges: boolean;
  upperAbdominalPain: boolean;
  swelling: boolean;
  // GDM (سكري الحمل)
  excessiveThirst: boolean;
  frequentUrination: boolean;
  // Anemia (فقر الدم)
  fatigue: boolean;
  dizziness: boolean;
  shortnessOfBreath: boolean;
  
  // (النقطة 3) حقل الأعراض الأخرى
  otherSymptoms: string; 
}

// -----------------------------------------------------------------
// 🚨 (النقطة 7) هيكل النقاط الجديد (بدلاً من Urgency)
// -----------------------------------------------------------------
export interface RiskScores {
  overallRisk: number;       // سكور الخطورة العام (0-1)
  preeclampsiaRisk: number;  // سكور تسمم الحمل
  gdmRisk: number;           // سكور سكري الحمل
  anemiaRisk: number;        // سكور فقر الدم
}

export interface AIResponse {
  riskScores: RiskScores; 
  brief_summary: string;
  detailed_report: string;
  extracted_labs: LabResults;
}

// -----------------------------------------------------------------
// 🚨 تحديث السجل الكامل
// -----------------------------------------------------------------
export interface PatientRecord {
  id: string;
  userId: string;
  timestamp: Date;
  personalInfo: PersonalInfo;
  pregnancyHistory: PregnancyHistory;
  measurementData: MeasurementData;
  symptoms: SymptomsPayload; // <-- 🚨 استخدام الهيكل الجديد
  labResults: LabResults;
  ocrText?: string;
  aiResponse: AIResponse;
  knownDiagnosis?: boolean; // (من الاقتراحات السابقة)
}