// src/pages/AssessmentPage.tsx
// FULL VERSION: Original UX Preserved + New Risk Factors Step Added

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Page, PersonalInfo, PregnancyHistory, MeasurementData, LabResults, PatientRecord, AIResponse, SymptomsPayload, Role } from '../types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import StepIndicator from '../components/StepIndicator';
import { analyzePatientData, mockOcrService } from '../services/geminiService';
import { useUser } from '../hooks/useUser';
import LoadingSpinner from '../components/LoadingSpinner';
import { saveNewPatientRecord, getPatientRecordsByUserId } from '../services/mockDB';

// Import structured knowledge base
import MedicalKB from '../constants/medicalKB';

// ============================================================================
// TYPES
// ============================================================================

interface FormData {
  personalInfo: PersonalInfo & { pregnancyWeek?: number };
  pregnancyHistory: PregnancyHistory;
  measurementData: MeasurementData;
  // ADD THIS LINE:
  antepartumRiskFactors: string[]; // Array of selected factor IDs
  riskFactors: Record<string, boolean>;
  symptoms: SymptomsPayload;
  labResults: LabResults;
  ocrText: string;
}

// Factors that require user input (cannot be calculated automatically)
const MANUAL_RISK_FACTORS = [
  'previousGDM',
  'familyDiabetes',
  'multiplePregnancy',
  'poorDiet',
  'closelySpacedPregnancies'
];

// ============================================================================
// KNOWLEDGE-BASE-DRIVEN VALIDATION
// ============================================================================

const validateStep = (step: number, formData: FormData, lang: 'ar' | 'en' = 'ar'): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // ADJUSTMENT: We inserted "Risk Factors" at Step 4.
  // We need to map the UI step to the correct KB validation rule set.
  // UI Step 1, 2, 3 -> Matches KB Step 1, 2, 3
  // UI Step 4 (Risk Factors) -> No validation needed (boolean checkboxes)
  // UI Step 5 (Symptoms) -> Matches KB "step4" (conceptually, though symptoms usually don't have blocking validation)
  // UI Step 6 (Labs) -> Matches KB "step5"

  let ruleKey = `step${step}`;

  // Logic to shift validation rules because we added a step in the middle
  if (step === 4) return { isValid: true, errors: [] }; // Risk step is optional
  if (step > 4) ruleKey = `step${step - 1}`; // Shift back to find original rules

  const rules = (MedicalKB.VALIDATION_RULES as any)[ruleKey];

  if (!rules) return { isValid: true, errors: [] };

  rules.forEach((rule: any) => {
    const sections = ['personalInfo', 'pregnancyHistory', 'measurementData', 'labResults'] as const;
    let value: any;

    // Find the value in form data
    for (const sec of sections) {
      if (rule.field in formData[sec]) {
        value = (formData[sec] as any)[rule.field];
        break;
      }
    }

    const message = lang === 'ar' ? rule.messageAr : rule.messageEn;

    // Required check
    if (rule.required && (!value || value === 0)) {
      errors.push(message);
      return;
    }

    // Range validation
    if (value && rule.min !== undefined && value < rule.min) {
      errors.push(message);
      return;
    }
    if (value && rule.max !== undefined && value > rule.max) {
      errors.push(message);
      return;
    }

    // Custom validation
    if (rule.customValidation && !rule.customValidation(value, formData)) {
      errors.push(message);
    }
  });

  return { isValid: errors.length === 0, errors };
};

// ============================================================================
// KNOWLEDGE-BASE-DRIVEN BMI INDICATOR
// ============================================================================

const BMIIndicator: React.FC<{ height: number; weight: number; lang?: 'ar' | 'en' }> = ({
  height,
  weight,
  lang = 'ar'
}) => {
  const bmi = MedicalKB.calculateBMI(height, weight);
  const category = bmi ? MedicalKB.getBMICategory(bmi) : null;

  if (!bmi || !category) return null;

  return (
    <div className={`bg-${category.colorClass}-50 border-r-4 border-${category.colorClass}-500 p-4 rounded-lg mt-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            {lang === 'ar' ? 'مؤشر كتلة الجسم (BMI)' : 'BMI'}
          </p>
          <p className={`text-2xl font-bold text-${category.colorClass}-600`}>{bmi.toFixed(1)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            {lang === 'ar' ? 'التصنيف' : 'Category'}
          </p>
          <p className={`text-lg font-semibold text-${category.colorClass}-600`}>
            {lang === 'ar' ? category.labelAr : category.labelEn}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          {lang === 'ar' ? 'زيادة الوزن الموصى بها: ' : 'Recommended weight gain: '}
          {category.weightGainRecommendation.min}-{category.weightGainRecommendation.max}
          {lang === 'ar' ? ' كجم' : ' kg'}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// KNOWLEDGE-BASE-DRIVEN REPORT RENDERER
// ============================================================================

const ReportRenderer: React.FC<{ markdown: string }> = React.memo(({ markdown }) => {
  const lines = useMemo(() => markdown.split('\n'), [markdown]);

  return (
    <div className="space-y-3 text-right">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;

        if (trimmedLine.startsWith('### ')) {
          return (
            <h4 key={index} className="text-lg font-semibold mt-4 mb-2 text-brand-pink-dark flex items-center gap-2">
              <span className="text-xl">▸</span>
              {trimmedLine.substring(4)}
            </h4>
          );
        }
        if (trimmedLine.startsWith('## ')) {
          return (
            <h3 key={index} className="text-xl font-bold mt-5 mb-3 text-brand-pink-dark border-r-4 border-brand-pink pr-4 bg-gradient-to-l from-transparent to-pink-50 p-3 rounded-r-lg">
              {trimmedLine.substring(3)}
            </h3>
          );
        }
        if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start hover:bg-gray-50 p-3 rounded-lg transition-colors group">
              <span className="text-brand-pink font-bold text-xl ml-3 mt-0.5 flex-shrink-0 group-hover:scale-125 transition-transform">•</span>
              <span className="flex-1 leading-relaxed">{trimmedLine.substring(2)}</span>
            </div>
          );
        }
        if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
          return (
            <p key={index} className="font-bold text-brand-gray-dark bg-yellow-50 border-r-4 border-yellow-400 p-3 rounded-r-lg my-2">
              {trimmedLine.substring(2, trimmedLine.length - 2)}
            </p>
          );
        }
        return <p key={index} className="leading-relaxed text-gray-700">{trimmedLine}</p>;
      }).filter(Boolean)}
    </div>
  );
});

ReportRenderer.displayName = 'ReportRenderer';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AssessmentPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [lang] = useState<'ar' | 'en'>('ar');
  const formRef = useRef<HTMLDivElement>(null);

  // Initialize form with empty symptoms based on KB
  const initialSymptoms = useMemo(() => {
    const symptoms: any = { otherSymptoms: '' };
    Object.keys(MedicalKB.SYMPTOMS).forEach(key => {
      symptoms[key] = false;
    });
    return symptoms;
  }, []);
  const [formData, setFormData] = useState<FormData>({
    personalInfo: { name: '', age: 0, pregnancyWeek: 12 },
    pregnancyHistory: { g: 0, p: 0, a: 0 },
    measurementData: { height: 0, prePregnancyWeight: 0, currentWeight: 0 },
    // ADD THIS LINE:
    antepartumRiskFactors: [],
    riskFactors: MANUAL_RISK_FACTORS.reduce((acc, key) => ({ ...acc, [key]: false }), {}),
    symptoms: initialSymptoms,
    labResults: {},
    ocrText: '',
  });

  const [postAnalysisData, setPostAnalysisData] = useState({ knownDiagnosis: false });
  const [labInputMethod, setLabInputMethod] = useState<'manual' | 'upload'>('manual');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AIResponse | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  // Calculate antepartum score
  const antepartumScore = useMemo(() => {
    return MedicalKB.calculateAntepartumScore(formData.antepartumRiskFactors);
  }, [formData.antepartumRiskFactors]);

  const antepartumRiskLevel = useMemo(() => {
    return MedicalKB.getAntepartumRiskLevel(antepartumScore);
  }, [antepartumScore]);

  // UPDATED: Added "Risk Factors" step in the middle
  const steps = useMemo(() => [
    lang === 'ar' ? "المعلومات الأساسية" : "Basic Information",
    lang === 'ar' ? "تاريخ الحمل" : "Pregnancy History",
    lang === 'ar' ? "القياسات الحيوية" : "Vital Measurements",
    lang === 'ar' ? "عوامل الخطورة" : "Risk Factors", // NEW STEP
    lang === 'ar' ? "الأعراض" : "Symptoms",
    lang === 'ar' ? "الفحوصات المخبرية" : "Lab Results",
    lang === 'ar' ? "التحليل" : "Analysis",
    lang === 'ar' ? "استبيان" : "Questionnaire"
  ], [lang]);

  // Auto-scroll on step change
  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Calculate statistics from KB
  const symptomStats = useMemo(() => {
    const selectedCount = Object.entries(formData.symptoms)
      .filter(([key, value]) => key !== 'otherSymptoms' && value === true)
      .length;

    const redFlagSymptoms = MedicalKB.getRedFlagSymptoms();
    const criticalCount = Object.entries(formData.symptoms)
      .filter(([key, value]) => {
        return redFlagSymptoms.some(s => s.key === key) && value === true;
      })
      .length;

    return { selectedCount, criticalCount };
  }, [formData.symptoms]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    const validation = validateStep(step, formData, lang);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setValidationErrors([]);
    setError(null);
    setStep(prev => Math.min(prev + 1, steps.length));
  }, [step, formData, steps.length, lang]);

  const handleBack = useCallback(() => {
    setValidationErrors([]);
    setError(null);
    setStep(prev => Math.max(prev - 1, 1));
  }, []);

  // Generic change handler
  const handleChange = useCallback(<T,>(
    section: keyof FormData,
    field: keyof T,
    value: string | number
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: typeof value === 'string' ? value : Number(value) || 0,
      },
    }));
  }, []);

  // Symptom checkbox handler
  const handleSymptomCheck = useCallback((key: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        [key]: !prev.symptoms[key as keyof SymptomsPayload],
      },
    }));
  }, []);

  // ADDED: Risk Factor checkbox handler
  const handleRiskFactorCheck = useCallback((key: string) => {
    setFormData(prev => ({
      ...prev,
      riskFactors: {
        ...prev.riskFactors,
        [key]: !prev.riskFactors[key],
      },
    }));
  }, []);

  const handleOtherSymptoms = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        otherSymptoms: value,
      },
    }));
  }, []);
  // NEW: Antepartum risk factor toggle
  const handleAntepartumFactorToggle = useCallback((factorId: string) => {
    setFormData(prev => ({
      ...prev,
      antepartumRiskFactors: prev.antepartumRiskFactors.includes(factorId)
        ? prev.antepartumRiskFactors.filter(id => id !== factorId)
        : [...prev.antepartumRiskFactors, factorId]
    }));
  }, []);
  // File change handler
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(lang === 'ar' ? '❌ حجم الملف يجب أن يكون أقل من 5 ميجابايت' : '❌ File size must be less than 5MB');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(file.type)) {
      setError(lang === 'ar' ? '❌ يرجى اختيار صورة (PNG/JPG) أو ملف PDF فقط' : '❌ Please select PNG/JPG image or PDF only');
      return;
    }

    setUploadedFile(file);
    setError(null);
  }, [lang]);

  // Analysis handler - Enhanced with KB-driven risk calculation + Manual Risks
  const handleAnalyze = useCallback(async () => {
    if (!user) {
      setError(lang === 'ar' ? "❌ خطأ: يجب تسجيل الدخول لحفظ البيانات." : "❌ Error: Must be logged in to save data");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    let ocrResult = '';
    if (labInputMethod === 'upload' && uploadedFile) {
      try {
        ocrResult = await mockOcrService(uploadedFile);
        setFormData(prev => ({ ...prev, ocrText: ocrResult }));
      } catch (e) {
        setError(lang === 'ar'
          ? "❌ فشل في قراءة الصورة. يرجى المحاولة مرة أخرى أو إدخال البيانات يدوياً."
          : "❌ Failed to read image. Please try again or enter data manually");
        setIsLoading(false);
        return;
      }
    }

    try {
      // 1. Calculate Base Risks (from KB logic: Age, BMI, Labs, Symptoms)
      const preeclampsiaRisk = MedicalKB.calculateConditionRisk('preeclampsia', formData);
      const gdmRisk = MedicalKB.calculateConditionRisk('gdm', formData);
      const anemiaRisk = MedicalKB.calculateConditionRisk('anemia', formData);

      // 2. Inject Manual Risk Factors (History/Diet)
      const injectManualRisks = (scoreObj: any, conditionId: string) => {
        let score = scoreObj.score;
        let factors = [...scoreObj.factors];

        // Loop through manual selections
        Object.entries(formData.riskFactors).forEach(([key, isSelected]) => {
          if (!isSelected) return;

          const kbFactor = MedicalKB.RISK_FACTORS[key];
          if (kbFactor && kbFactor.condition === conditionId) {
            score += kbFactor.weight;
            factors.push(lang === 'ar' ? kbFactor.labelAr : kbFactor.labelEn);
          }
        });

        // Cap at 1.0
        score = Math.min(score, 1);

        return { ...scoreObj, score, factors };
      };

      const finalPreeclampsia = injectManualRisks(preeclampsiaRisk, 'preeclampsia');
      const finalGdm = injectManualRisks(gdmRisk, 'gdm');
      const finalAnemia = injectManualRisks(anemiaRisk, 'anemia');

      const dataToAnalyze = {
        personalInfo: formData.personalInfo,
        pregnancyHistory: formData.pregnancyHistory,
        measurementData: formData.measurementData,
        symptoms: formData.symptoms,
        labResults: formData.labResults,
        ocrText: ocrResult || formData.ocrText,
        riskFactors: formData.riskFactors,
        // ADD THESE THREE LINES:
        antepartumRiskFactors: formData.antepartumRiskFactors,
        antepartumScore: antepartumScore,
        antepartumRiskLevel: antepartumRiskLevel,
        knownDiagnosis: false,
        kbRiskScores: {
          preeclampsia: finalPreeclampsia.score,
          gdm: finalGdm.score,
          anemia: finalAnemia.score
        }
      };
      const userHistory = await getPatientRecordsByUserId(user.id);
      const result = await analyzePatientData(dataToAnalyze, userHistory);

      // Merge KB-driven risk scores with AI result
      result.riskScores = {
        overallRisk: Math.max(finalPreeclampsia.score, finalGdm.score, finalAnemia.score),
        preeclampsiaRisk: finalPreeclampsia.score,
        gdmRisk: finalGdm.score,
        anemiaRisk: finalAnemia.score,
        antepartumScore: antepartumScore,
        antepartumRiskLevel: antepartumRiskLevel.level
      };

      setAnalysisResult(result);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);

      handleNext();
    } catch (e: any) {
      setError(e.message || (lang === 'ar'
        ? "❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."
        : "❌ Unexpected error occurred. Please try again"));
    } finally {
      setIsLoading(false);
    }
  }, [formData, uploadedFile, labInputMethod, user, handleNext, lang]);

  // Final save handler
  const handleFinalSave = useCallback(async () => {
    if (!user || !analysisResult) {
      setError(lang === 'ar' ? "❌ خطأ: لا يوجد تحليل للحفظ." : "❌ Error: No analysis to save");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newRecord: PatientRecord = {
        id: '',
        timestamp: new Date(),
        userId: user.id,
        personalInfo: formData.personalInfo,
        pregnancyHistory: formData.pregnancyHistory,
        measurementData: formData.measurementData,
        symptoms: formData.symptoms,
        labResults: { ...formData.labResults, ...analysisResult.extracted_labs },
        ocrText: formData.ocrText,
        aiResponse: analysisResult,
        knownDiagnosis: postAnalysisData.knownDiagnosis,
      };

      await saveNewPatientRecord(newRecord);

      setShowSuccessAnimation(true);
      setTimeout(() => {
        navigate(Page.Home);
      }, 1500);
    } catch (e: any) {
      setError((lang === 'ar' ? "❌ حدث خطأ أثناء حفظ السجل: " : "❌ Error saving record: ") + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, analysisResult, formData, postAnalysisData, navigate, lang]);

  // ============================================================================
  // RENDER STEP CONTENT
  // ============================================================================

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Card title={lang === 'ar' ? "✨ الخطوة 1: المعلومات الأساسية" : "✨ Step 1: Basic Information"}>
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg border-r-4 border-brand-pink">
                <p className="text-sm text-gray-700">
                  {lang === 'ar'
                    ? '📝 دعينا نبدأ بمعلوماتك الأساسية لتقديم رعاية شخصية لك'
                    : '📝 Let\'s start with your basic information to provide personalized care'}
                </p>
              </div>

              <Input
                id="name"
                label={lang === 'ar' ? "الاسم الكامل *" : "Full Name *"}
                type="text"
                value={formData.personalInfo.name}
                onChange={e => handleChange<PersonalInfo>('personalInfo', 'name', e.target.value)}
                placeholder={lang === 'ar' ? "أدخلي اسمك الكامل" : "Enter your full name"}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="age"
                  label={lang === 'ar' ? "العمر (سنوات) *" : "Age (years) *"}
                  type="number"
                  value={formData.personalInfo.age || ''}
                  onChange={e => handleChange<PersonalInfo>('personalInfo', 'age', e.target.value)}
                  placeholder={lang === 'ar' ? "أدخلي عمرك" : "Enter your age"}
                  min="15"
                  max="50"
                />

                <div>
                  <label htmlFor="pregnancyWeek" className="block text-right text-md font-medium text-brand-gray-dark mb-2">
                    {lang === 'ar' ? 'أسبوع الحمل الحالي * 🤰' : 'Current Pregnancy Week * 🤰'}
                  </label>
                  <div className="relative">
                    <input
                      id="pregnancyWeek"
                      type="range"
                      min="4"
                      max="42"
                      value={formData.personalInfo.pregnancyWeek || 12}
                      onChange={e => handleChange<PersonalInfo & { pregnancyWeek?: number }>('personalInfo', 'pregnancyWeek', e.target.value)}
                      className="w-full h-3 bg-gradient-to-r from-pink-200 to-purple-300 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: '#FF69B4' }}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <input
                        type="number"
                        min="4"
                        max="42"
                        value={formData.personalInfo.pregnancyWeek || 12}
                        onChange={e => handleChange<PersonalInfo & { pregnancyWeek?: number }>('personalInfo', 'pregnancyWeek', e.target.value)}
                        className="w-20 p-2 text-center text-xl font-bold border-2 border-brand-pink rounded-lg focus:ring-2 focus:ring-brand-pink-dark"
                      />
                      <span className="text-sm text-gray-600">
                        {lang === 'ar' ? `الأسبوع ${formData.personalInfo.pregnancyWeek || 12}` : `Week ${formData.personalInfo.pregnancyWeek || 12}`}
                      </span>
                    </div>
                  </div>

                  {/* KB-Driven Pregnancy Week Info */}
                  {formData.personalInfo.pregnancyWeek && (() => {
                    const weekInfo = MedicalKB.getPregnancyWeekInfo(formData.personalInfo.pregnancyWeek);
                    if (weekInfo) {
                      return (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-xs font-semibold text-purple-800 mb-1">
                            {lang === 'ar' ? `الثلث ${weekInfo.trimester}` : `Trimester ${weekInfo.trimester}`}
                          </p>
                          <p className="text-xs text-purple-700">
                            {lang === 'ar' ? weekInfo.fetalDevelopmentAr : weekInfo.fetalDevelopmentEn}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg animate-shake">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      {validationErrors.map((err, idx) => (
                        <p key={idx} className="text-red-700 text-sm font-medium">{err}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );

      case 2:
        return (
          <Card title={lang === 'ar' ? "👶 الخطوة 2: تاريخ الحمل والولادة" : "👶 Step 2: Pregnancy History"}>
            <div className="space-y-6">
              <div className="bg-blue-50 border-r-4 border-blue-400 p-4 rounded-lg">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="text-xl">ℹ️</span>
                  <span>
                    {lang === 'ar'
                      ? 'G (Gravida): عدد مرات الحمل الكلي | P (Para): عدد الولادات | A (Abortus): عدد حالات الإجهاض'
                      : 'G (Gravida): Total pregnancies | P (Para): Deliveries | A (Abortus): Miscarriages'}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  id="g"
                  label={lang === 'ar' ? "الحمل (G) *" : "Gravida (G) *"}
                  type="number"
                  value={formData.pregnancyHistory.g || ''}
                  onChange={e => handleChange<PregnancyHistory>('pregnancyHistory', 'g', e.target.value)}
                  min="0"
                  placeholder="0"
                />
                <Input
                  id="p"
                  label={lang === 'ar' ? "الولادة (P) *" : "Para (P) *"}
                  type="number"
                  value={formData.pregnancyHistory.p || ''}
                  onChange={e => handleChange<PregnancyHistory>('pregnancyHistory', 'p', e.target.value)}
                  min="0"
                  placeholder="0"
                />
                <Input
                  id="a"
                  label={lang === 'ar' ? "الإجهاض (A) *" : "Abortus (A) *"}
                  type="number"
                  value={formData.pregnancyHistory.a || ''}
                  onChange={e => handleChange<PregnancyHistory>('pregnancyHistory', 'a', e.target.value)}
                  min="0"
                  placeholder="0"
                />
              </div>

              {/* KB-Driven Risk Factor Display */}
              {formData.pregnancyHistory.g === 1 && (
                <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    <span>
                      {lang === 'ar'
                        ? MedicalKB.RISK_FACTORS.firstPregnancy.descriptionAr
                        : MedicalKB.RISK_FACTORS.firstPregnancy.descriptionEn}
                    </span>
                  </p>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg animate-shake">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      {validationErrors.map((err, idx) => (
                        <p key={idx} className="text-red-700 text-sm font-medium">{err}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );

      case 3:
        return (
          <Card title={lang === 'ar' ? "📏 الخطوة 3: القياسات الحيوية" : "📏 Step 3: Vital Measurements"}>
            <div className="space-y-6">
              <div className="bg-purple-50 border-r-4 border-purple-400 p-4 rounded-lg">
                <p className="text-sm text-purple-800">
                  {lang === 'ar'
                    ? '📊 هذه المعلومات مهمة لحساب مؤشر كتلة الجسم (BMI) وتقييم زيادة الوزن خلال الحمل'
                    : '📊 This information is important for calculating BMI and assessing weight gain during pregnancy'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  id="height"
                  label={lang === 'ar' ? "الطول (سم) *" : "Height (cm) *"}
                  type="number"
                  value={formData.measurementData.height || ''}
                  onChange={e => handleChange<MeasurementData>('measurementData', 'height', e.target.value)}
                  min="140"
                  max="200"
                  placeholder={lang === 'ar' ? "مثال: 165" : "e.g. 165"}
                />
                <Input
                  id="preWeight"
                  label={lang === 'ar' ? "الوزن قبل الحمل (كجم) *" : "Pre-pregnancy Weight (kg) *"}
                  type="number"
                  step="0.1"
                  value={formData.measurementData.prePregnancyWeight || ''}
                  onChange={e => handleChange<MeasurementData>('measurementData', 'prePregnancyWeight', e.target.value)}
                  min="35"
                  max="150"
                  placeholder={lang === 'ar' ? "مثال: 65" : "e.g. 65"}
                />
                <Input
                  id="currentWeight"
                  label={lang === 'ar' ? "الوزن الحالي (كجم) *" : "Current Weight (kg) *"}
                  type="number"
                  step="0.1"
                  value={formData.measurementData.currentWeight || ''}
                  onChange={e => handleChange<MeasurementData>('measurementData', 'currentWeight', e.target.value)}
                  min="35"
                  max="200"
                  placeholder={lang === 'ar' ? "مثال: 70" : "e.g. 70"}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.measurementData.height > 0 && formData.measurementData.prePregnancyWeight > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'BMI قبل الحمل' : 'Pre-pregnancy BMI'}
                    </p>
                    <BMIIndicator
                      height={formData.measurementData.height}
                      weight={formData.measurementData.prePregnancyWeight}
                      lang={lang}
                    />
                  </div>
                )}
                {formData.measurementData.height > 0 && formData.measurementData.currentWeight > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {lang === 'ar' ? 'BMI الحالي' : 'Current BMI'}
                    </p>
                    <BMIIndicator
                      height={formData.measurementData.height}
                      weight={formData.measurementData.currentWeight}
                      lang={lang}
                    />
                  </div>
                )}
              </div>

              {/* Weight Gain Indicator */}
              {formData.measurementData.prePregnancyWeight > 0 && formData.measurementData.currentWeight > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-teal-50 border-r-4 border-green-400 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        {lang === 'ar' ? 'زيادة الوزن خلال الحمل' : 'Pregnancy Weight Gain'}
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {(formData.measurementData.currentWeight - formData.measurementData.prePregnancyWeight).toFixed(1)}
                        {lang === 'ar' ? ' كجم' : ' kg'}
                      </p>
                    </div>
                    <span className="text-5xl">📈</span>
                  </div>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg animate-shake">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      {validationErrors.map((err, idx) => (
                        <p key={idx} className="text-red-700 text-sm font-medium">{err}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );

      case 4:
        return (
          <Card title={lang === 'ar' ? "⚠️ الخطوة 4: عوامل الخطورة أثناء الحمل" : "⚠️ Step 4: Antepartum Risk Factors"}>
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-r-4 border-yellow-400 p-5 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">📋</span>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-yellow-900 mb-2">
                      {lang === 'ar' ? 'تقييم عوامل الخطورة أثناء الحمل' : 'Antepartum Risk Assessment'}
                    </p>
                    <p className="text-sm text-yellow-800">
                      {lang === 'ar'
                        ? 'يرجى الإجابة بـ "نعم" على جميع العوامل التي تنطبق عليك. هذا التقييم يساعد في تحديد مستوى الخطورة والرعاية المناسبة.'
                        : 'Please check "Yes" for all factors that apply to you. This assessment helps determine risk level and appropriate care.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Score Display */}
              <div className={`p-6 rounded-xl border-2 ${antepartumRiskLevel.level === 'high' ? 'bg-red-50 border-red-400' :
                  antepartumRiskLevel.level === 'moderate' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-green-50 border-green-400'
                }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      {lang === 'ar' ? 'النقاط الحالية' : 'Current Score'}
                    </p>
                    <p className="text-5xl font-bold">
                      {antepartumRiskLevel.emoji} {antepartumScore}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">
                      {lang === 'ar' ? 'مستوى الخطورة' : 'Risk Level'}
                    </p>
                    <p className={`text-2xl font-bold ${antepartumRiskLevel.level === 'high' ? 'text-red-600' :
                        antepartumRiskLevel.level === 'moderate' ? 'text-yellow-600' :
                          'text-green-600'
                      }`}>
                      {lang === 'ar' ? antepartumRiskLevel.titleAr : antepartumRiskLevel.titleEn}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-300">
                  <p className="text-sm text-gray-700">
                    {lang === 'ar' ? antepartumRiskLevel.interpretationAr : antepartumRiskLevel.interpretationEn}
                  </p>
                </div>
              </div>

              {/* Risk Factor Categories */}
              {MedicalKB.ANTEPARTUM_RISK_FACTORS.map((category) => (
                <div key={category.name} className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                  <h3 className="text-xl font-bold text-brand-pink-dark mb-4 border-r-4 border-brand-pink pr-3 flex items-center gap-2">
                    <span className="text-2xl">
                      {category.name === 'demographic' ? '👥' :
                        category.name === 'psychosocial' ? '💭' :
                          category.name === 'obstetric_history' ? '👶' :
                            category.name === 'medical_history' ? '🏥' :
                              '🤰'}
                    </span>
                    <span>{lang === 'ar' ? category.nameAr : category.nameEn}</span>
                  </h3>

                  <div className="space-y-3">
                    {category.factors.map((factor) => {
                      const isSelected = formData.antepartumRiskFactors.includes(factor.id);

                      return (
                        <div
                          key={factor.id}
                          className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected
                              ? 'border-red-400 bg-red-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
                            }`}
                          onClick={() => handleAntepartumFactorToggle(factor.id)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {/* Score Badge */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${isSelected ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                              {factor.score}
                            </div>

                            {/* Question Text */}
                            <div className="text-right flex-1">
                              <p className={`font-semibold text-lg ${isSelected ? 'text-red-900' : 'text-gray-700'
                                }`}>
                                {lang === 'ar' ? factor.questionAr : factor.questionEn}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {lang === 'ar' ? `${factor.score} نقطة` : `${factor.score} points`}
                              </p>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <div className="flex items-center gap-3 mr-4">
                            <span className={`font-bold text-lg ${isSelected ? 'text-red-600' : 'text-gray-400'
                              }`}>
                              {isSelected ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No')}
                            </span>
                            <div className={`w-14 h-8 flex items-center rounded-full p-1 duration-300 ease-in-out ${isSelected ? 'bg-red-500' : 'bg-gray-300'
                              }`}>
                              <div className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out ${isSelected ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Recommendations Based on Score */}
              {antepartumScore > 0 && (
                <div className={`p-5 rounded-xl border-r-4 ${antepartumRiskLevel.level === 'high' ? 'bg-red-50 border-red-500' :
                    antepartumRiskLevel.level === 'moderate' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                  }`}>
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <span className="text-2xl">💡</span>
                    <span>{lang === 'ar' ? 'التوصيات' : 'Recommendations'}</span>
                  </h4>
                  <ul className="space-y-2">
                    {(lang === 'ar' ? antepartumRiskLevel.recommendationsAr : antepartumRiskLevel.recommendationsEn).map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-brand-pink font-bold mt-1">•</span>
                        <span className="flex-1">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        );
      case 5:
        // PREVIOUSLY STEP 4 - Full UI Restored
        return (
          <Card title={lang === 'ar' ? "🩺 الخطوة 5: الأعراض الحالية" : "🩺 Step 5: Current Symptoms"}>
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        {lang === 'ar' ? 'إجمالي الأعراض' : 'Total Symptoms'}
                      </p>
                      <p className="text-4xl font-bold text-blue-700">{symptomStats.selectedCount}</p>
                    </div>
                    <span className="text-5xl">📋</span>
                  </div>
                </div>
                <div className={`bg-gradient-to-br p-4 rounded-xl border-2 ${symptomStats.criticalCount > 0
                  ? 'from-red-50 to-red-100 border-red-300'
                  : 'from-green-50 to-green-100 border-green-300'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${symptomStats.criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {lang === 'ar' ? 'أعراض خطيرة' : 'Critical Symptoms'}
                      </p>
                      <p className={`text-4xl font-bold ${symptomStats.criticalCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {symptomStats.criticalCount}
                      </p>
                    </div>
                    <span className="text-5xl">{symptomStats.criticalCount > 0 ? '⚠️' : '✅'}</span>
                  </div>
                </div>
              </div>

              {/* KB-Driven Critical Warning */}
              {symptomStats.criticalCount > 0 && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg animate-pulse">
                  <p className="text-red-800 font-semibold flex items-center gap-2">
                    <span className="text-2xl">🚨</span>
                    {lang === 'ar'
                      ? `لديك ${symptomStats.criticalCount} من الأعراض الخطيرة - يُنصح بمراجعة الطبيب فوراً`
                      : `You have ${symptomStats.criticalCount} critical symptoms - immediate medical attention recommended`}
                  </p>
                </div>
              )}

              {/* KB-Driven Symptom Categories - Full UI */}
              <div className="space-y-4">
                {Object.entries(MedicalKB.SYMPTOM_CATEGORIES).map(([categoryKey, category]) => {
                  const symptomsInCategory = Object.values(MedicalKB.SYMPTOMS).filter(
                    s => s.category === categoryKey
                  );

                  if (symptomsInCategory.length === 0) return null;

                  return (
                    <div key={categoryKey} className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all bg-white">
                      <h3 className="text-lg font-bold text-brand-pink-dark mb-4 border-r-4 border-brand-pink pr-3 flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{lang === 'ar' ? category.labelAr : category.labelEn}</span>
                      </h3>
                      <div className="space-y-3">
                        {symptomsInCategory.map((symptom) => (
                          <div key={symptom.key}>
                            <label
                              className={`flex items-start space-x-3 space-x-reverse cursor-pointer p-4 rounded-xl transition-all hover:scale-[1.02] ${formData.symptoms[symptom.key as keyof SymptomsPayload]
                                ? symptom.severity === 'high'
                                  ? 'bg-red-50 border-2 border-red-400 shadow-md'
                                  : 'bg-pink-50 border-2 border-brand-pink shadow-md'
                                : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={!!formData.symptoms[symptom.key as keyof SymptomsPayload]}
                                onChange={() => handleSymptomCheck(symptom.key)}
                                className="form-checkbox h-6 w-6 text-brand-pink focus:ring-brand-pink rounded mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-3xl">{symptom.icon}</span>
                                  <span className="font-semibold text-gray-800">
                                    {lang === 'ar' ? symptom.labelAr : symptom.labelEn}
                                  </span>
                                  {symptom.severity === 'high' && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                                      {lang === 'ar' ? 'مهم جداً' : 'Critical'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mr-11">
                                  {lang === 'ar' ? symptom.descriptionAr : symptom.descriptionEn}
                                </p>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Other Symptoms */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <label htmlFor="symptoms-other" className="block text-right text-lg font-bold text-brand-gray-dark mb-3 flex items-center gap-2">
                  <span>✏️</span>
                  <span>{lang === 'ar' ? 'أعراض أخرى (اختياري)' : 'Other Symptoms (Optional)'}</span>
                </label>
                <textarea
                  id="symptoms-other"
                  rows={4}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent text-right resize-none"
                  value={formData.symptoms.otherSymptoms}
                  onChange={e => handleOtherSymptoms(e.target.value)}
                  placeholder={lang === 'ar'
                    ? "صفي بالتفصيل أي أعراض أخرى تشعرين بها..."
                    : "Describe in detail any other symptoms you're experiencing..."}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-2 text-left">
                  {formData.symptoms.otherSymptoms.length}/500
                </p>
              </div>
            </div>
          </Card>
        );

      case 6:
        // PREVIOUSLY STEP 5 - Full UI Restored
        return (
          <Card title={lang === 'ar' ? "🧪 الخطوة 6: الفحوصات المخبرية" : "🧪 Step 6: Laboratory Tests"}>
            <div className="space-y-6">
              {/* Method Selection */}
              <div className="flex justify-center gap-2 p-2 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setLabInputMethod('manual')}
                  className={`flex-1 py-4 px-6 font-semibold transition-all rounded-lg flex items-center justify-center gap-2 ${labInputMethod === 'manual'
                    ? 'bg-white text-brand-pink shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <span className="text-2xl">✏️</span>
                  <span>{lang === 'ar' ? 'إدخال يدوي' : 'Manual Entry'}</span>
                </button>
                <button
                  onClick={() => setLabInputMethod('upload')}
                  className={`flex-1 py-4 px-6 font-semibold transition-all rounded-lg flex items-center justify-center gap-2 ${labInputMethod === 'upload'
                    ? 'bg-white text-brand-pink shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <span className="text-2xl">📸</span>
                  <span>{lang === 'ar' ? 'رفع صورة' : 'Upload Image'}</span>
                </button>
              </div>

              {labInputMethod === 'manual' ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 border-r-4 border-blue-400 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {lang === 'ar'
                        ? '💡 يمكنك ترك أي حقل فارغاً إذا لم يكن لديك النتيجة'
                        : '💡 You can leave any field empty if you don\'t have the result'}
                    </p>
                  </div>

                  {/* Organized by Condition */}
                  {Object.entries(
                    Object.values(MedicalKB.CLINICAL_THRESHOLDS).reduce((acc, threshold) => {
                      if (!acc[threshold.condition]) acc[threshold.condition] = [];
                      acc[threshold.condition].push(threshold);
                      return acc;
                    }, {} as Record<string, typeof MedicalKB.CLINICAL_THRESHOLDS[string][]>)
                  ).map(([conditionId, thresholds]) => {
                    const condition = MedicalKB.CONDITIONS[conditionId];
                    if (!condition) return null;

                    return (
                      <div key={conditionId} className="space-y-4">
                        <h4 className="font-bold text-brand-pink-dark flex items-center gap-2">
                          <span>{conditionId === 'preeclampsia' ? '🩸' : conditionId === 'gdm' ? '🔬' : '💉'}</span>
                          <span>{lang === 'ar' ? condition.nameAr : condition.nameEn}</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {thresholds.map(threshold => (
                            <Input
                              key={threshold.parameter}
                              id={threshold.parameter}
                              label={`${lang === 'ar' ? threshold.labelAr : threshold.labelEn} (${threshold.unit})`}
                              type="number"
                              step={threshold.parameter === 'hb' ? '0.1' : '1'}
                              value={(formData.labResults as any)[threshold.parameter] || ''}
                              onChange={e => handleChange<LabResults>('labResults', threshold.parameter as keyof LabResults, e.target.value)}
                              placeholder={`${lang === 'ar' ? 'طبيعي' : 'Normal'}: ${threshold.normalRange.min}-${threshold.normalRange.max}`}
                              min={threshold.normalRange.min}
                            />
                          ))}
                        </div>

                        {/* KB-Driven Real-time Assessment */}
                        {thresholds.map(threshold => {
                          const value = (formData.labResults as any)[threshold.parameter];
                          if (!value) return null;

                          const assessment = MedicalKB.assessClinicalParameter(
                            Object.keys(MedicalKB.CLINICAL_THRESHOLDS).find(
                              k => MedicalKB.CLINICAL_THRESHOLDS[k].parameter === threshold.parameter
                            ) || '',
                            value
                          );

                          if (!assessment || assessment.status === 'normal') return null;

                          return (
                            <div
                              key={threshold.parameter}
                              className={`p-3 rounded-lg border-r-4 ${assessment.status === 'severe'
                                ? 'bg-red-50 border-red-500'
                                : 'bg-yellow-50 border-yellow-400'
                                }`}
                            >
                              <p className={`text-sm font-semibold ${assessment.status === 'severe' ? 'text-red-800' : 'text-yellow-800'
                                }`}>
                                {lang === 'ar' ? threshold.labelAr : threshold.labelEn}: {value} {threshold.unit}
                                {' '}({lang === 'ar'
                                  ? assessment.status === 'severe' ? 'مرتفع' : 'مرتفع قليلاً'
                                  : assessment.status === 'severe' ? 'High' : 'Slightly elevated'})
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-purple-50 border-r-4 border-purple-400 p-4 rounded-lg">
                    <p className="text-sm text-purple-800">
                      {lang === 'ar'
                        ? '📸 ارفعي صورة واضحة لتقرير المختبر - سنستخرج البيانات تلقائياً'
                        : '📸 Upload a clear image of the lab report - we\'ll extract data automatically'}
                    </p>
                  </div>

                  <div className="border-4 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-brand-pink hover:bg-pink-50 transition-all cursor-pointer">
                    <input
                      id="lab-upload"
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="lab-upload" className="cursor-pointer">
                      <div className="text-8xl mb-4">📋</div>
                      <p className="text-brand-pink font-bold text-xl mb-2">
                        {lang === 'ar' ? 'اضغطي لاختيار ملف' : 'Click to select file'}
                      </p>
                      <p className="text-gray-500">
                        {lang === 'ar' ? 'أو اسحبي الملف هنا' : 'or drag file here'}
                      </p>
                      <p className="text-xs text-gray-400 mt-3">
                        PNG, JPG, PDF ({lang === 'ar' ? 'حتى 5 ميجابايت' : 'up to 5MB'})
                      </p>
                    </label>
                  </div>

                  {uploadedFile && (
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 border-r-4 border-green-500 p-5 rounded-xl flex items-center gap-4 animate-fade-in">
                      <span className="text-5xl">✅</span>
                      <div className="flex-1">
                        <p className="text-green-800 font-bold text-lg">
                          {lang === 'ar' ? 'تم اختيار الملف بنجاح!' : 'File selected successfully!'}
                        </p>
                        <p className="text-green-700 text-sm mt-1">{uploadedFile.name}</p>
                        <p className="text-green-600 text-xs mt-1">
                          {lang === 'ar' ? 'الحجم: ' : 'Size: '}
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)}
                          {lang === 'ar' ? ' ميجابايت' : ' MB'}
                        </p>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="text-red-500 hover:text-red-700 text-2xl"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg animate-shake">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      {validationErrors.map((err, idx) => (
                        <p key={idx} className="text-red-700 text-sm font-medium">{err}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );

      case 7:
        // PREVIOUSLY STEP 6 - Full UI Restored
        return (
          <Card title={lang === 'ar' ? "🔬 الخطوة 7: نتائج التحليل الذكي" : "🔬 Step 7: AI Analysis Results"}>
            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner message={lang === 'ar'
                  ? "يقوم الذكاء الاصطناعي بتحليل بياناتك بعناية..."
                  : "AI is carefully analyzing your data..."}
                />
                <div className="mt-6 text-center space-y-2">
                  <p className="text-gray-600">
                    {lang === 'ar' ? '⏱️ قد يستغرق هذا من 5-10 ثوان' : '⏱️ This may take 5-10 seconds'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {lang === 'ar' ? 'نحن نحلل أكثر من 20 معياراً طبياً' : 'Analyzing 20+ clinical parameters'}
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-8xl mb-6 animate-bounce">⚠️</div>
                <div className="bg-red-50 border-2 border-red-500 p-6 rounded-xl max-w-2xl mx-auto">
                  <p className="font-bold text-red-800 text-xl mb-3">
                    {lang === 'ar' ? 'حدث خطأ' : 'An error occurred'}
                  </p>
                  <p className="text-red-700 mb-4">{error}</p>
                  <Button
                    onClick={() => {
                      setError(null);
                      setStep(6); // Go back to labs step
                    }}
                    variant="secondary"
                  >
                    {lang === 'ar' ? 'العودة للتعديل' : 'Go back to edit'}
                  </Button>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-8">
                {showSuccessAnimation && (
                  <div className="text-center text-8xl animate-bounce">✨🎉✨</div>
                )}

                {/* KB-Driven Overall Risk Card */}
                <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8 rounded-2xl shadow-2xl border-2 border-gray-200">
                  <h3 className="text-2xl font-bold text-center text-brand-gray-dark mb-6 flex items-center justify-center gap-3">
                    <span className="text-4xl">
                      {MedicalKB.getRiskDisplay(analysisResult.riskScores.overallRisk).icon}
                    </span>
                    <span>{lang === 'ar' ? 'مستوى الخطورة العام' : 'Overall Risk Level'}</span>
                  </h3>
                  <div className="text-center">
                    <div className={`inline-block text-4xl font-bold p-6 rounded-2xl px-12 transform transition-transform hover:scale-110 ${MedicalKB.getRiskDisplay(analysisResult.riskScores.overallRisk).className
                      } ${MedicalKB.getRiskDisplay(analysisResult.riskScores.overallRisk).pulse ? 'animate-pulse' : ''
                      }`}>
                      {lang === 'ar'
                        ? MedicalKB.getRiskDisplay(analysisResult.riskScores.overallRisk).text
                        : MedicalKB.getRiskDisplay(analysisResult.riskScores.overallRisk).textEn}
                      <br />
                      <span className="text-2xl">({(analysisResult.riskScores.overallRisk * 100).toFixed(0)}%)</span>
                    </div>
                    <p className="mt-6 text-lg font-semibold text-gray-700">
                      {lang === 'ar'
                        ? MedicalKB.getRiskDisplay(analysisResult.riskScores.overallRisk).recommendation
                        : MedicalKB.getRiskDisplay(analysisResult.riskScores.overallRisk).recommendationEn}
                    </p>
                  </div>
                </div>
                {/* NEW: Antepartum Risk Score Card */}
                <div className={`p-6 rounded-2xl shadow-lg border-2 ${antepartumRiskLevel.level === 'high' ? 'bg-red-50 border-red-400' :
                    antepartumRiskLevel.level === 'moderate' ? 'bg-yellow-50 border-yellow-400' :
                      'bg-green-50 border-green-400'
                  }`}>
                  <h3 className="text-xl font-bold text-center mb-4 flex items-center justify-center gap-2">
                    <span className="text-3xl">{antepartumRiskLevel.emoji}</span>
                    <span>{lang === 'ar' ? 'تقييم عوامل الخطورة أثناء الحمل' : 'Antepartum Risk Assessment'}</span>
                  </h3>
                  <div className="text-center">
                    <p className="text-5xl font-bold mb-2">
                      {antepartumScore} {lang === 'ar' ? 'نقطة' : 'points'}
                    </p>
                    <p className={`text-2xl font-semibold mb-4 ${antepartumRiskLevel.level === 'high' ? 'text-red-600' :
                        antepartumRiskLevel.level === 'moderate' ? 'text-yellow-600' :
                          'text-green-600'
                      }`}>
                      {lang === 'ar' ? antepartumRiskLevel.titleAr : antepartumRiskLevel.titleEn}
                    </p>
                    <p className="text-gray-700 mb-4">
                      {lang === 'ar' ? antepartumRiskLevel.interpretationAr : antepartumRiskLevel.interpretationEn}
                    </p>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="font-semibold mb-2">
                        {lang === 'ar' ? 'عوامل الخطورة المحددة:' : 'Identified Risk Factors:'}
                      </p>
                      <p className="text-gray-600">
                        {formData.antepartumRiskFactors.length} {lang === 'ar' ? 'عامل' : 'factors'}
                      </p>
                    </div>
                  </div>
                </div>


                {/* KB-Driven Detailed Risk Scores by Condition */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(MedicalKB.CONDITIONS).map(([conditionId, condition]) => {
                    const riskKey = `${conditionId}Risk` as keyof typeof analysisResult.riskScores;
                    const riskScore = analysisResult.riskScores[riskKey] as number || 0;
                    const colorClass = riskScore >= 0.5 ? 'red' : riskScore >= 0.25 ? 'yellow' : 'green';

                    return (
                      <div key={conditionId} className={`bg-gradient-to-br from-${colorClass}-50 to-${colorClass}-100 p-5 rounded-xl border-2 border-${colorClass}-300 text-center`}>
                        <p className={`text-sm text-${colorClass}-700 font-medium mb-2`}>
                          {lang === 'ar' ? condition.nameAr : condition.nameEn}
                        </p>
                        <p className={`text-4xl font-bold text-${colorClass}-700`}>
                          {(riskScore * 100).toFixed(0)}%
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Brief Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-r-4 border-blue-500 p-6 rounded-xl shadow-md">
                  <h3 className="text-2xl font-bold text-brand-gray-dark mb-4 flex items-center gap-3">
                    <span className="text-3xl">📋</span>
                    <span>{lang === 'ar' ? 'ملخص سريع' : 'Brief Summary'}</span>
                  </h3>
                  <p className="text-lg leading-relaxed text-gray-800">{analysisResult.brief_summary}</p>
                </div>

                {/* Detailed Report */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
                  <h3 className="text-2xl font-bold text-brand-gray-dark mb-6 flex items-center gap-3 border-b-2 pb-4">
                    <span className="text-3xl">📊</span>
                    <span>{lang === 'ar' ? 'التقرير الطبي المفصل' : 'Detailed Medical Report'}</span>
                  </h3>
                  <div className="prose prose-lg max-w-none">
                    <ReportRenderer markdown={analysisResult.detailed_report} />
                  </div>
                </div>

                {/* Admin Debug View */}
                {user?.role === Role.Admin && (
                  <div className="bg-gray-900 rounded-xl p-6 shadow-2xl">
                    <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
                      <span>🔧</span>
                      <span>Admin Debug View</span>
                    </h3>
                    <pre className="bg-gray-800 text-green-400 p-4 rounded-lg text-sm overflow-x-auto font-mono" dir="ltr">
                      {JSON.stringify(analysisResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-8xl mb-6">🔍</div>
                <p className="text-xl text-gray-500">
                  {lang === 'ar' ? 'لا توجد نتائج لعرضها' : 'No results to display'}
                </p>
              </div>
            )}
          </Card>
        );

      case 8:
        // PREVIOUSLY STEP 7 - Full UI Restored
        return (
          <Card title={lang === 'ar' ? "📝 الخطوة 8: استبيان قصير" : "📝 Step 8: Brief Questionnaire"}>
            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner message={lang === 'ar'
                  ? "جاري حفظ السجل الطبي..."
                  : "Saving medical record..."}
                />
                <p className="text-center text-gray-600 mt-4">
                  {lang === 'ar' ? 'يتم تشفير بياناتك بأمان' : 'Your data is being securely encrypted'}
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-8xl mb-6">⚠️</div>
                <div className="bg-red-50 border-2 border-red-500 p-6 rounded-xl max-w-2xl mx-auto">
                  <p className="font-bold text-red-800 text-xl mb-3">
                    {lang === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error while saving'}
                  </p>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-8">
                {/* Context Card */}
                <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 rounded-2xl border-r-4 border-brand-pink shadow-lg">
                  <h4 className="text-lg font-bold text-brand-pink-dark mb-3">
                    {lang === 'ar' ? 'بناءً على التقرير الطبي:' : 'Based on the medical report:'}
                  </h4>
                  <p className="text-xl text-brand-gray-dark font-semibold italic">
                    "{analysisResult.brief_summary}"
                  </p>
                </div>

                {/* Question Card */}
                <div className="bg-white border-2 border-gray-300 rounded-2xl p-8 shadow-xl">
                  <label className="block text-2xl font-bold text-center text-brand-gray-dark mb-6">
                    💭 {lang === 'ar'
                      ? 'هل كنت على علم مسبق بهذه الحالة أو التشخيص؟'
                      : 'Were you previously aware of this condition or diagnosis?'}
                  </label>

                  <p className="text-center text-gray-600 mb-8">
                    {lang === 'ar'
                      ? 'هذه المعلومة تساعدنا في تحسين دقة نظام الكشف المبكر'
                      : 'This information helps us improve the accuracy of our early detection system'}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label
                      className={`group cursor-pointer p-8 rounded-2xl border-3 transition-all hover:shadow-2xl transform hover:-translate-y-1 ${postAnalysisData.knownDiagnosis === true
                        ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500 shadow-xl scale-105'
                        : 'bg-gray-50 border-gray-300 hover:border-green-400'
                        }`}
                    >
                      <input
                        type="radio"
                        name="knownDiagnosis"
                        checked={postAnalysisData.knownDiagnosis === true}
                        onChange={() => setPostAnalysisData({ knownDiagnosis: true })}
                        className="hidden"
                      />
                      <div className="text-center space-y-4">
                        <span className="text-6xl block group-hover:scale-110 transition-transform">✅</span>
                        <span className="text-2xl font-bold block">
                          {lang === 'ar' ? 'نعم، كنت أعرف' : 'Yes, I knew'}
                        </span>
                        <p className="text-sm text-gray-600">
                          {lang === 'ar'
                            ? 'تم تشخيصي سابقاً بهذه الحالة'
                            : 'I was previously diagnosed with this condition'}
                        </p>
                      </div>
                    </label>

                    <label
                      className={`group cursor-pointer p-8 rounded-2xl border-3 transition-all hover:shadow-2xl transform hover:-translate-y-1 ${postAnalysisData.knownDiagnosis === false
                        ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-500 shadow-xl scale-105'
                        : 'bg-gray-50 border-gray-300 hover:border-blue-400'
                        }`}
                    >
                      <input
                        type="radio"
                        name="knownDiagnosis"
                        checked={postAnalysisData.knownDiagnosis === false}
                        onChange={() => setPostAnalysisData({ knownDiagnosis: false })}
                        className="hidden"
                      />
                      <div className="text-center space-y-4">
                        <span className="text-6xl block group-hover:scale-110 transition-transform">💡</span>
                        <span className="text-2xl font-bold block">
                          {lang === 'ar' ? 'لا، معلومة جديدة' : 'No, new information'}
                        </span>
                        <p className="text-sm text-gray-600">
                          {lang === 'ar'
                            ? 'هذا أول علم لي بهذه الحالة'
                            : 'This is the first I\'m learning about this condition'}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-yellow-50 border-r-4 border-yellow-400 p-5 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">💡</span>
                    <div className="flex-1">
                      <p className="text-yellow-800 font-semibold mb-2">
                        {lang === 'ar' ? 'لماذا نسأل هذا السؤال؟' : 'Why do we ask this question?'}
                      </p>
                      <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
                        <li>
                          {lang === 'ar'
                            ? 'يساعدنا في قياس فعالية نظام الكشف المبكر'
                            : 'Helps us measure the effectiveness of our early detection system'}
                        </li>
                        <li>
                          {lang === 'ar'
                            ? 'يحسن دقة التشخيص للمرضى المستقبليين'
                            : 'Improves diagnostic accuracy for future patients'}
                        </li>
                        <li>
                          {lang === 'ar'
                            ? 'يساهم في البحث العلمي لتحسين صحة الأمهات'
                            : 'Contributes to research for improving maternal health'}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-8xl mb-6">❌</div>
                <p className="text-red-600 text-xl font-semibold">
                  {lang === 'ar'
                    ? 'حدث خطأ، لا يوجد تحليل لعرض السؤال.'
                    : 'An error occurred, no analysis available to show the question.'}
                </p>
                <Button
                  onClick={() => setStep(6)}
                  variant="secondary"
                  className="mt-4"
                >
                  {lang === 'ar' ? 'العودة للخطوة السابقة' : 'Go back to previous step'}
                </Button>
              </div>
            )}
          </Card>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen pb-12" ref={formRef}>
      <BackButton navigate={navigate} />

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-12 shadow-2xl transform animate-scale-in">
            <div className="text-center">
              <div className="text-9xl mb-6 animate-bounce">✅</div>
              <p className="text-3xl font-bold text-green-600 mb-2">
                {lang === 'ar' ? 'تم بنجاح!' : 'Success!'}
              </p>
              <p className="text-gray-600">
                {lang === 'ar' ? 'جاري المتابعة...' : 'Processing...'}
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <StepIndicator steps={steps} currentStep={step} />

        {/* Enhanced Progress Bar */}
        <div className="mt-6 mb-6">
          <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-pink via-purple-500 to-blue-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
            <div
              className="absolute top-0 left-0 h-full bg-white opacity-30 rounded-full transition-all duration-700 ease-out animate-pulse"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-sm font-semibold text-gray-700">
              {lang === 'ar' ? `الخطوة ${step} من ${steps.length}` : `Step ${step} of ${steps.length}`}
            </p>
            <p className="text-sm text-gray-500">
              {Math.round((step / steps.length) * 100)}% {lang === 'ar' ? 'مكتمل' : 'Complete'}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="mt-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-10 flex justify-between items-center gap-4 border-t-2 border-gray-200 pt-8">
          {step > 1 && step <= steps.length && (
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={isLoading}
              className="flex items-center gap-2 hover:scale-105 transition-transform px-8 py-3"
            >
              <span className="text-xl">←</span>
              <span className="font-semibold">{lang === 'ar' ? 'السابق' : 'Previous'}</span>
            </Button>
          )}

          {step < steps.length - 2 && (
            <Button
              onClick={handleNext}
              className="mr-auto flex items-center gap-2 hover:scale-105 transition-transform px-8 py-3"
              disabled={isLoading}
            >
              <span className="font-semibold">{lang === 'ar' ? 'التالي' : 'Next'}</span>
              <span className="text-xl">→</span>
            </Button>
          )}

          {step === steps.length - 2 && (
            <Button
              onClick={handleAnalyze}
              className="mr-auto flex items-center gap-3 bg-gradient-to-r from-brand-pink via-purple-500 to-blue-500 hover:from-brand-pink-dark hover:via-purple-600 hover:to-blue-600 hover:scale-105 transition-all px-8 py-4 text-lg shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin text-2xl">⚙️</span>
                  <span className="font-bold">
                    {lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl">🔍</span>
                  <span className="font-bold">
                    {lang === 'ar' ? 'تحليل البيانات بالذكاء الاصطناعي' : 'Analyze with AI'}
                  </span>
                </>
              )}
            </Button>
          )}

          {step === steps.length - 1 && analysisResult && !isLoading && (
            <Button
              onClick={handleNext}
              className="mr-auto flex items-center gap-2 hover:scale-105 transition-transform px-8 py-3"
            >
              <span className="font-semibold">
                {lang === 'ar' ? 'متابعة للاستبيان' : 'Continue to questionnaire'}
              </span>
              <span className="text-xl">→</span>
            </Button>
          )}

          {step === steps.length && !isLoading && (
            <Button
              onClick={handleFinalSave}
              className="mr-auto flex items-center gap-3 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 hover:scale-105 transition-all px-8 py-4 text-lg shadow-lg"
              disabled={isLoading}
            >
              <span className="text-2xl">💾</span>
              <span className="font-bold">
                {lang === 'ar' ? 'حفظ السجل وإنهاء' : 'Save record and finish'}
              </span>
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && !isLoading && (
          <div className="mt-8 bg-red-50 border-r-4 border-red-500 p-6 rounded-xl animate-shake shadow-lg">
            <div className="flex items-start gap-4">
              <span className="text-4xl">⚠️</span>
              <div className="flex-1">
                <p className="font-bold text-red-800 text-lg mb-2">
                  {lang === 'ar' ? 'تنبيه' : 'Warning'}
                </p>
                <p className="text-red-700">{error}</p>
                <Button
                  onClick={() => setError(null)}
                  variant="secondary"
                  className="mt-4"
                >
                  {lang === 'ar' ? 'حسناً، فهمت' : 'OK, got it'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Custom Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default AssessmentPage;
