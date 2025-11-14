// ============================================================================
// ENUMS
// ============================================================================
export enum Page {
  Login, Home, Assessment, Chatbot, Dashboard, FetalMovement, WeeklyGuide, AdminDashboard,
}

export enum Role { 
  Patient = 'patient', 
  Admin = 'admin' 
}

// ============================================================================
// 🚨 NEW: Security & Validation Enums
// ============================================================================
export enum ValidationSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info'
}

export enum ReviewStatus {
  Pending = 'pending',
  Approved = 'approved',
  Flagged = 'flagged',
  Rejected = 'rejected'
}

export enum AnomalyType {
  ImpossibleChange = 'impossible_change',
  InconsistentData = 'inconsistent_data',
  SuspiciousPattern = 'suspicious_pattern',
  MedicalLogicViolation = 'medical_logic_violation',
  RapidSubmission = 'rapid_submission'
}

// ============================================================================
// BASIC INTERFACES
// ============================================================================
export interface User {
  id: string; 
  role: Role;
  name?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  email?: string;
  trustScore?: number;
  createdAt?: Date;
  lastSubmission?: Date;
}

export interface PersonalInfo { 
  name: string; 
  age: number;
  pregnancyWeek?: number; // 🚨 NEW: Added pregnancy week
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
  // Other
  otherSymptoms: string; 
}

export interface RiskScores {
  overallRisk: number;       // 0-1
  preeclampsiaRisk: number;  
  gdmRisk: number;           
  anemiaRisk: number;        
}

export interface AIResponse {
  riskScores: RiskScores; 
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
  symptoms: SymptomsPayload;
  labResults: LabResults;
  ocrText?: string;
  aiResponse: AIResponse;
  knownDiagnosis?: boolean;
  
  // 🚨 NEW: Security & Validation Fields
  trustScore?: number;
  reviewStatus?: ReviewStatus;
  flaggedReasons?: string[];
  validationWarnings?: ValidationWarning[];
  documentValidation?: DocumentValidation;
  submissionMetadata?: SubmissionMetadata;
}

// ============================================================================
// 🚨 NEW: SECURITY & VALIDATION INTERFACES
// ============================================================================

/**
 * Phone Verification
 */
export interface PhoneVerification {
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
}

/**
 * Submission Tracking - Rate Limiting
 */
export interface SubmissionTracker {
  userId: string;
  lastSubmission: Date;
  submissionCount: number;
  submissionsLast24h: number;
  submissionsLast7d: number;
  cooldownUntil?: Date;
  blocked?: boolean;
  blockReason?: string;
}

/**
 * User Trust Score System
 */
export interface UserTrustScore {
  userId: string;
  score: number; // 0-100
  lastUpdated: Date;
  factors: {
    phoneVerified: boolean;
    emailVerified: boolean;
    documentUploaded: boolean;
    consistentHistory: boolean;
    longTermUser: boolean;
    flaggedCount: number;
    successfulSubmissions: number;
  };
  history: TrustScoreChange[];
}

export interface TrustScoreChange {
  date: Date;
  oldScore: number;
  newScore: number;
  reason: string;
}

/**
 * Validation Results
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationWarning[];
  warnings: ValidationWarning[];
  infos: ValidationWarning[];
  trustImpact: number; // -10 to +10
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: ValidationSeverity;
  code: string;
  suggestedFix?: string;
}

/**
 * Anomaly Detection
 */
export interface AnomalyDetectionResult {
  hasAnomalies: boolean;
  anomalies: Anomaly[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  autoFlag: boolean; // Should this be auto-flagged for review?
  trustScorePenalty: number;
}

export interface Anomaly {
  type: AnomalyType;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  affectedFields: string[];
}

/**
 * Document Validation (OCR)
 */
export interface DocumentValidation {
  uploaded: boolean;
  confidence: number; // 0-1
  hasLabName: boolean;
  hasDate: boolean;
  hasPatientInfo: boolean;
  isRecent: boolean;
  extractedDate?: Date;
  warnings: string[];
  passedValidation: boolean;
}

/**
 * Medical Logic Cross-Validation
 */
export interface MedicalValidationResult {
  passed: boolean;
  consistency: {
    bmiSymptomConsistency: boolean;
    bpSymptomConsistency: boolean;
    glucoseSymptomConsistency: boolean;
    weightGainConsistency: boolean;
    pregnancyHistoryConsistency: boolean;
  };
  flags: string[];
  recommendations: string[];
}

/**
 * Submission Metadata
 */
export interface SubmissionMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  submissionDuration: number; // seconds
  timestamp: Date;
  location?: {
    country?: string;
    city?: string;
  };
}

/**
 * Admin Review Queue
 */
export interface ReviewQueueItem {
  id: string;
  recordId: string;
  userId: string;
  patientName: string;
  submissionDate: Date;
  flagReasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFlagged: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  status: ReviewStatus;
  anomalies: Anomaly[];
  trustScore: number;
  priority: number; // 1-10
}

/**
 * Rate Limit Check Result
 */
export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  nextAllowedTime?: Date;
  currentCount: number;
  limit: number;
  resetTime: Date;
}

/**
 * Security Flags
 */
export interface SecurityFlags {
  isBlocked: boolean;
  isSuspicious: boolean;
  requiresManualReview: boolean;
  requiresPhoneVerification: boolean;
  requiresDocumentUpload: boolean;
  reasons: string[];
}

// ============================================================================
// 🚨 NEW: VALIDATION CONFIGURATION
// ============================================================================
export interface ValidationConfig {
  rateLimit: {
    enabled: boolean;
    maxSubmissionsPerDay: number;
    maxSubmissionsPerWeek: number;
    cooldownHours: number;
  };
  trustScore: {
    minimumForAutoApproval: number;
    minimumForSubmission: number;
    phoneVerificationBonus: number;
    documentUploadBonus: number;
    flagPenalty: number;
  };
  anomalyDetection: {
    enabled: boolean;
    autoFlagThreshold: number; // Number of anomalies to auto-flag
    criticalAnomalyAutoFlag: boolean;
  };
  documentValidation: {
    required: boolean;
    minimumConfidence: number;
    requireRecent: boolean;
    maxAgeDays: number;
  };
}

// Default configuration
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  rateLimit: {
    enabled: true,
    maxSubmissionsPerDay: 1,
    maxSubmissionsPerWeek: 3,
    cooldownHours: 24
  },
  trustScore: {
    minimumForAutoApproval: 70,
    minimumForSubmission: 30,
    phoneVerificationBonus: 20,
    documentUploadBonus: 15,
    flagPenalty: 20
  },
  anomalyDetection: {
    enabled: true,
    autoFlagThreshold: 2,
    criticalAnomalyAutoFlag: true
  },
  documentValidation: {
    required: false, // Can be toggled based on trust score
    minimumConfidence: 0.7,
    requireRecent: true,
    maxAgeDays: 90
  }
};