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

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface SymptomDefinition {
  key: keyof SymptomsPayload;
  label: string;
  icon: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface FormData {
  personalInfo: PersonalInfo & { pregnancyWeek?: number }; // 🚨 Added pregnancy week
  pregnancyHistory: PregnancyHistory;
  measurementData: MeasurementData;
  symptoms: SymptomsPayload;
  labResults: LabResults;
  ocrText: string;
}

// ============================================================================
// ENHANCED: Comprehensive Symptom Definitions
// ============================================================================
const SYMPTOM_CATEGORIES: Record<string, SymptomDefinition[]> = {
  "أعراض خطيرة تحتاج انتباه فوري": [
    { 
      key: 'headache', 
      label: 'صداع مستمر أو شديد', 
      icon: '🤕', 
      severity: 'high',
      description: 'قد يشير إلى ارتفاع ضغط الدم أو تسمم الحمل'
    },
    { 
      key: 'visionChanges', 
      label: 'تغيرات في الرؤية (زغللة، رؤية بقع)', 
      icon: '👁️', 
      severity: 'high',
      description: 'علامة مهمة لتسمم الحمل'
    },
    { 
      key: 'swelling', 
      label: 'تورم مفاجئ في الوجه أو اليدين أو القدمين', 
      icon: '🫸', 
      severity: 'high',
      description: 'قد يشير إلى احتباس السوائل المفرط'
    },
    { 
      key: 'upperAbdominalPain', 
      label: 'ألم في الجزء العلوي من البطن (تحت الأضلاع)', 
      icon: '🤰', 
      severity: 'high',
      description: 'قد يرتبط بمشاكل في الكبد'
    },
    { 
      key: 'shortnessOfBreath', 
      label: 'ضيق شديد في التنفس', 
      icon: '💨', 
      severity: 'high',
      description: 'قد يشير إلى مشاكل قلبية أو رئوية'
    },
  ],
  "أعراض متوسطة الأهمية": [
    { 
      key: 'excessiveThirst', 
      label: 'عطش شديد ومستمر', 
      icon: '💧', 
      severity: 'medium',
      description: 'قد يشير إلى سكري الحمل'
    },
    { 
      key: 'fatigue', 
      label: 'تعب شديد أو إرهاق غير مبرر', 
      icon: '😴', 
      severity: 'medium',
      description: 'قد يرتبط بالأنيميا أو نقص الفيتامينات'
    },
    { 
      key: 'dizziness', 
      label: 'دوخة أو دوار متكرر', 
      icon: '😵', 
      severity: 'medium',
      description: 'قد يشير إلى انخفاض ضغط الدم أو انخفاض السكر'
    },
  ],
  "أعراض شائعة في الحمل": [
    { 
      key: 'frequentUrination', 
      label: 'تبول متكرر أكثر من المعتاد', 
      icon: '🚻', 
      severity: 'low',
      description: 'عرض طبيعي في الحمل لكن قد يشير إلى عدوى بولية إذا صاحبه ألم'
    },
  ],
};

// ============================================================================
// ENHANCED: Risk Display with More Details
// ============================================================================
const getRiskDisplay = (score: number) => {
  if (score >= 0.75) return {
    text: 'عالي',
    className: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl',
    icon: '🚨',
    pulse: true,
    recommendation: 'يرجى مراجعة الطبيب فوراً'
  };
  if (score >= 0.5) return {
    text: 'متوسط',
    className: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg',
    icon: '⚠️',
    pulse: false,
    recommendation: 'يُنصح بمتابعة دقيقة مع الطبيب'
  };
  if (score >= 0.25) return {
    text: 'منخفض',
    className: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg',
    icon: 'ℹ️',
    pulse: false,
    recommendation: 'متابعة منتظمة مع الالتزام بالنصائح'
  };
  return {
    text: 'طبيعي',
    className: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg',
    icon: '✅',
    pulse: false,
    recommendation: 'حالة ممتازة، استمري بالعناية الصحية'
  };
};

// ============================================================================
// ENHANCED: Report Renderer with Better Styling
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
// ENHANCED: Form Validation with Better Messages
// ============================================================================
const validateStep = (step: number, formData: FormData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  switch (step) {
    case 1:
      if (!formData.personalInfo.name.trim()) {
        errors.push('❌ الاسم مطلوب');
      } else if (formData.personalInfo.name.trim().length < 3) {
        errors.push('❌ الاسم يجب أن يكون 3 أحرف على الأقل');
      }

      if (!formData.personalInfo.age || formData.personalInfo.age < 15 || formData.personalInfo.age > 50) {
        errors.push('❌ العمر يجب أن يكون بين 15 و 50 سنة');
      }

      // 🚨 Validate pregnancy week
      if (!formData.personalInfo.pregnancyWeek || formData.personalInfo.pregnancyWeek < 4 || formData.personalInfo.pregnancyWeek > 42) {
        errors.push('❌ أسبوع الحمل يجب أن يكون بين 4 و 42');
      }
      break;

    case 2:
      if (formData.pregnancyHistory.p > formData.pregnancyHistory.g) {
        errors.push('❌ عدد الولادات لا يمكن أن يكون أكبر من عدد مرات الحمل');
      }
      if (formData.pregnancyHistory.a > formData.pregnancyHistory.g) {
        errors.push('❌ عدد حالات الإجهاض لا يمكن أن يكون أكبر من عدد مرات الحمل');
      }
      if (formData.pregnancyHistory.g < 0 || formData.pregnancyHistory.p < 0 || formData.pregnancyHistory.a < 0) {
        errors.push('❌ جميع القيم يجب أن تكون أكبر من أو تساوي صفر');
      }
      break;

    case 3:
      if (!formData.measurementData.height || formData.measurementData.height < 140 || formData.measurementData.height > 200) {
        errors.push('❌ الطول يجب أن يكون بين 140 و 200 سم');
      }
      if (!formData.measurementData.prePregnancyWeight || formData.measurementData.prePregnancyWeight < 35 || formData.measurementData.prePregnancyWeight > 150) {
        errors.push('❌ الوزن قبل الحمل يجب أن يكون بين 35 و 150 كجم');
      }
      if (!formData.measurementData.currentWeight || formData.measurementData.currentWeight < 35 || formData.measurementData.currentWeight > 200) {
        errors.push('❌ الوزن الحالي يجب أن يكون بين 35 و 200 كجم');
      }
      if (formData.measurementData.currentWeight < formData.measurementData.prePregnancyWeight - 10) {
        errors.push('⚠️ تحذير: الوزن الحالي أقل بكثير من الوزن قبل الحمل - يرجى التحقق');
      }
      break;

    case 5:
      // Validate lab results if manual entry
      const labs = formData.labResults;
      if (labs.systolicBp && (labs.systolicBp < 80 || labs.systolicBp > 200)) {
        errors.push('❌ ضغط الدم الانقباضي يجب أن يكون بين 80 و 200');
      }
      if (labs.diastolicBp && (labs.diastolicBp < 50 || labs.diastolicBp > 140)) {
        errors.push('❌ ضغط الدم الانبساطي يجب أن يكون بين 50 و 140');
      }
      if (labs.fastingGlucose && (labs.fastingGlucose < 50 || labs.fastingGlucose > 300)) {
        errors.push('❌ سكر الدم يجب أن يكون بين 50 و 300 mg/dL');
      }
      if (labs.hb && (labs.hb < 5 || labs.hb > 20)) {
        errors.push('❌ الهيموجلوبين يجب أن يكون بين 5 و 20 g/dL');
      }
      break;
  }

  return { isValid: errors.length === 0, errors };
};

// ============================================================================
// 🚨 ENHANCED: BMI Calculator Component
// ============================================================================
const BMIIndicator: React.FC<{ height: number; weight: number }> = ({ height, weight }) => {
  const bmi = useMemo(() => {
    if (!height || !weight || height < 100 || weight < 30) return null;
    const heightInM = height / 100;
    return weight / (heightInM * heightInM);
  }, [height, weight]);

  if (!bmi) return null;

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'نحيف', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (bmi < 25) return { text: 'طبيعي', color: 'text-green-600', bg: 'bg-green-50' };
    if (bmi < 30) return { text: 'زيادة وزن', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { text: 'سمنة', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const category = getBMICategory(bmi);

  return (
    <div className={`${category.bg} border-r-4 border-${category.color.split('-')[1]}-500 p-4 rounded-lg mt-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">مؤشر كتلة الجسم (BMI)</p>
          <p className={`text-2xl font-bold ${category.color}`}>{bmi.toFixed(1)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">التصنيف</p>
          <p className={`text-lg font-semibold ${category.color}`}>{category.text}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const AssessmentPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLDivElement>(null);

  // ENHANCED: Form State
  const [formData, setFormData] = useState<FormData>({
    personalInfo: { name: '', age: 0, pregnancyWeek: 12 }, // 🚨 Added default week
    pregnancyHistory: { g: 0, p: 0, a: 0 },
    measurementData: { height: 0, prePregnancyWeight: 0, currentWeight: 0 },
    symptoms: {
      headache: false,
      visionChanges: false,
      upperAbdominalPain: false,
      swelling: false,
      excessiveThirst: false,
      frequentUrination: false,
      fatigue: false,
      dizziness: false,
      shortnessOfBreath: false,
      otherSymptoms: ''
    },
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

  const steps = useMemo(() => [
    "المعلومات الأساسية",
    "تاريخ الحمل",
    "القياسات الحيوية",
    "الأعراض",
    "الفحوصات المخبرية",
    "التحليل",
    "استبيان"
  ], []);

  // Auto-scroll on step change
  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Selected symptoms count
  const selectedSymptomsCount = useMemo(() => {
    return Object.entries(formData.symptoms)
      .filter(([key, value]) => key !== 'otherSymptoms' && value === true)
      .length;
  }, [formData.symptoms]);

  // High severity symptoms count
  const highSeveritySymptomsCount = useMemo(() => {
    const highSeverityKeys = Object.values(SYMPTOM_CATEGORIES)
      .flat()
      .filter(s => s.severity === 'high')
      .map(s => s.key);

    return Object.entries(formData.symptoms)
      .filter(([key, value]) => highSeverityKeys.includes(key as keyof SymptomsPayload) && value === true)
      .length;
  }, [formData.symptoms]);

  // Handle Next with Validation
  const handleNext = useCallback(() => {
    const validation = validateStep(step, formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setValidationErrors([]);
    setError(null);
    setStep(prev => Math.min(prev + 1, steps.length));
  }, [step, formData, steps.length]);

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
  const handleSymptomCheck = useCallback((key: keyof SymptomsPayload) => {
    setFormData(prev => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        [key]: !prev.symptoms[key],
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

  // File change handler
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('❌ حجم الملف يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(file.type)) {
      setError('❌ يرجى اختيار صورة (PNG/JPG) أو ملف PDF فقط');
      return;
    }

    setUploadedFile(file);
    setError(null);
  }, []);

  // Analysis handler
  const handleAnalyze = useCallback(async () => {
    if (!user) {
      setError("❌ خطأ: يجب تسجيل الدخول لحفظ البيانات.");
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
        setError("❌ فشل في قراءة الصورة. يرجى المحاولة مرة أخرى أو إدخال البيانات يدوياً.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const dataToAnalyze = {
        personalInfo: formData.personalInfo,
        pregnancyHistory: formData.pregnancyHistory,
        measurementData: formData.measurementData,
        symptoms: formData.symptoms,
        labResults: formData.labResults,
        ocrText: ocrResult || formData.ocrText,
        knownDiagnosis: false
      };

      const userHistory = await getPatientRecordsByUserId(user.id);
      const result = await analyzePatientData(dataToAnalyze, userHistory);

      setAnalysisResult(result);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);

      handleNext();
    } catch (e: any) {
      setError(e.message || "❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  }, [formData, uploadedFile, labInputMethod, user, handleNext]);

  // Final save handler
  const handleFinalSave = useCallback(async () => {
    if (!user || !analysisResult) {
      setError("❌ خطأ: لا يوجد تحليل للحفظ.");
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
      setError("❌ حدث خطأ أثناء حفظ السجل: " + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, analysisResult, formData, postAnalysisData, navigate]);

  // ============================================================================
  // RENDER STEP CONTENT
  // ============================================================================
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Card title="✨ الخطوة 1: المعلومات الأساسية">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg border-r-4 border-brand-pink">
                <p className="text-sm text-gray-700">
                  📝 دعينا نبدأ بمعلوماتك الأساسية لتقديم رعاية شخصية لكِ
                </p>
              </div>

              <Input
                id="name"
                label="الاسم الكامل *"
                type="text"
                value={formData.personalInfo.name}
                onChange={e => handleChange<PersonalInfo>('personalInfo', 'name', e.target.value)}
                placeholder="أدخلي اسمك الكامل"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="age"
                  label="العمر (سنوات) *"
                  type="number"
                  value={formData.personalInfo.age || ''}
                  onChange={e => handleChange<PersonalInfo>('personalInfo', 'age', e.target.value)}
                  placeholder="أدخلي عمرك"
                  min="15"
                  max="50"
                />

                {/* 🚨 NEW: Pregnancy Week Input */}
                <div>
                  <label htmlFor="pregnancyWeek" className="block text-right text-md font-medium text-brand-gray-dark mb-2">
                    أسبوع الحمل الحالي * 🤰
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
                      <span className="text-sm text-gray-600">الأسبوع {formData.personalInfo.pregnancyWeek || 12}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 يساعدنا معرفة أسبوع الحمل في تقديم تقييم أدق لحالتك
                  </p>
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
          <Card title="👶 الخطوة 2: تاريخ الحمل والولادة">
            <div className="space-y-6">
              <div className="bg-blue-50 border-r-4 border-blue-400 p-4 rounded-lg">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="text-xl">ℹ️</span>
                  <span>
                    G (Gravida): عدد مرات الحمل الكلي | 
                    P (Para): عدد الولادات | 
                    A (Abortus): عدد حالات الإجهاض
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  id="g"
                  label="الحمل (G) *"
                  type="number"
                  value={formData.pregnancyHistory.g || ''}
                  onChange={e => handleChange<PregnancyHistory>('pregnancyHistory', 'g', e.target.value)}
                  min="0"
                  placeholder="0"
                />
                <Input
                  id="p"
                  label="الولادة (P) *"
                  type="number"
                  value={formData.pregnancyHistory.p || ''}
                  onChange={e => handleChange<PregnancyHistory>('pregnancyHistory', 'p', e.target.value)}
                  min="0"
                  placeholder="0"
                />
                <Input
                  id="a"
                  label="الإجهاض (A) *"
                  type="number"
                  value={formData.pregnancyHistory.a || ''}
                  onChange={e => handleChange<PregnancyHistory>('pregnancyHistory', 'a', e.target.value)}
                  min="0"
                  placeholder="0"
                />
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

      case 3:
        return (
          <Card title="📏 الخطوة 3: القياسات الحيوية">
            <div className="space-y-6">
              <div className="bg-purple-50 border-r-4 border-purple-400 p-4 rounded-lg">
                <p className="text-sm text-purple-800">
                  📊 هذه المعلومات مهمة لحساب مؤشر كتلة الجسم (BMI) وتقييم زيادة الوزن خلال الحمل
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  id="height"
                  label="الطول (سم) *"
                  type="number"
                  value={formData.measurementData.height || ''}
                  onChange={e => handleChange<MeasurementData>('measurementData', 'height', e.target.value)}
                  min="140"
                  max="200"
                  placeholder="مثال: 165"
                />
                <Input
                  id="preWeight"
                  label="الوزن قبل الحمل (كجم) *"
                  type="number"
                  step="0.1"
                  value={formData.measurementData.prePregnancyWeight || ''}
                  onChange={e => handleChange<MeasurementData>('measurementData', 'prePregnancyWeight', e.target.value)}
                  min="35"
                  max="150"
                  placeholder="مثال: 65"
                />
                <Input
                  id="currentWeight"
                  label="الوزن الحالي (كجم) *"
                  type="number"
                  step="0.1"
                  value={formData.measurementData.currentWeight || ''}
                  onChange={e => handleChange<MeasurementData>('measurementData', 'currentWeight', e.target.value)}
                  min="35"
                  max="200"
                  placeholder="مثال: 70"
                />
              </div>

              {/* BMI Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.measurementData.height > 0 && formData.measurementData.prePregnancyWeight > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">BMI قبل الحمل</p>
                    <BMIIndicator 
                      height={formData.measurementData.height} 
                      weight={formData.measurementData.prePregnancyWeight} 
                    />
                  </div>
                )}
                {formData.measurementData.height > 0 && formData.measurementData.currentWeight > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">BMI الحالي</p>
                    <BMIIndicator 
                      height={formData.measurementData.height} 
                      weight={formData.measurementData.currentWeight} 
                    />
                  </div>
                )}
              </div>

              {/* Weight Gain Indicator */}
              {formData.measurementData.prePregnancyWeight > 0 && formData.measurementData.currentWeight > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-teal-50 border-r-4 border-green-400 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">زيادة الوزن خلال الحمل</p>
                      <p className="text-3xl font-bold text-green-600">
                        {(formData.measurementData.currentWeight - formData.measurementData.prePregnancyWeight).toFixed(1)} كجم
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
          <Card title="🩺 الخطوة 4: الأعراض الحالية">
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">إجمالي الأعراض</p>
                      <p className="text-4xl font-bold text-blue-700">{selectedSymptomsCount}</p>
                    </div>
                    <span className="text-5xl">📋</span>
                  </div>
                </div>
                <div className={`bg-gradient-to-br p-4 rounded-xl border-2 ${
                  highSeveritySymptomsCount > 0 
                    ? 'from-red-50 to-red-100 border-red-300' 
                    : 'from-green-50 to-green-100 border-green-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${highSeveritySymptomsCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        أعراض خطيرة
                      </p>
                      <p className={`text-4xl font-bold ${highSeveritySymptomsCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {highSeveritySymptomsCount}
                      </p>
                    </div>
                    <span className="text-5xl">{highSeveritySymptomsCount > 0 ? '⚠️' : '✅'}</span>
                  </div>
                </div>
              </div>

              {highSeveritySymptomsCount > 0 && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg animate-pulse">
                  <p className="text-red-800 font-semibold flex items-center gap-2">
                    <span className="text-2xl">🚨</span>
                    لديكِ {highSeveritySymptomsCount} من الأعراض الخطيرة - يُنصح بمراجعة الطبيب فوراً
                  </p>
                </div>
              )}

              {/* Symptoms Categories */}
              <div className="space-y-4">
                {Object.entries(SYMPTOM_CATEGORIES).map(([category, symptoms]) => (
                  <div key={category} className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all bg-white">
                    <h3 className="text-lg font-bold text-brand-pink-dark mb-4 border-r-4 border-brand-pink pr-3 flex items-center gap-2">
                      <span>{category === "أعراض خطيرة تحتاج انتباه فوري" ? '🚨' : category === "أعراض متوسطة الأهمية" ? '⚠️' : '📝'}</span>
                      <span>{category}</span>
                    </h3>
                    <div className="space-y-3">
                      {symptoms.map((symptom) => (
                        <div key={symptom.key}>
                          <label
                            className={`flex items-start space-x-3 space-x-reverse cursor-pointer p-4 rounded-xl transition-all hover:scale-[1.02] ${
                              formData.symptoms[symptom.key] 
                                ? symptom.severity === 'high' 
                                  ? 'bg-red-50 border-2 border-red-400 shadow-md' 
                                  : 'bg-pink-50 border-2 border-brand-pink shadow-md'
                                : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!formData.symptoms[symptom.key]}
                              onChange={() => handleSymptomCheck(symptom.key)}
                              className="form-checkbox h-6 w-6 text-brand-pink focus:ring-brand-pink rounded mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-3xl">{symptom.icon}</span>
                                <span className="font-semibold text-gray-800">{symptom.label}</span>
                                {symptom.severity === 'high' && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                                    مهم جداً
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mr-11">{symptom.description}</p>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Other Symptoms */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <label htmlFor="symptoms-other" className="block text-right text-lg font-bold text-brand-gray-dark mb-3 flex items-center gap-2">
                  <span>✍️</span>
                  <span>أعراض أخرى (اختياري)</span>
                </label>
                <textarea
                  id="symptoms-other"
                  rows={4}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent text-right resize-none"
                  value={formData.symptoms.otherSymptoms}
                  onChange={e => handleOtherSymptoms(e.target.value)}
                  placeholder="صفي بالتفصيل أي أعراض أخرى تشعرين بها..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-2 text-left">
                  {formData.symptoms.otherSymptoms.length}/500
                </p>
              </div>
            </div>
          </Card>
        );

      case 5:
        return (
          <Card title="🧪 الخطوة 5: الفحوصات المخبرية">
            <div className="space-y-6">
              {/* Method Selection */}
              <div className="flex justify-center gap-2 p-2 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setLabInputMethod('manual')}
                  className={`flex-1 py-4 px-6 font-semibold transition-all rounded-lg flex items-center justify-center gap-2 ${
                    labInputMethod === 'manual'
                      ? 'bg-white text-brand-pink shadow-lg scale-105'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">✍️</span>
                  <span>إدخال يدوي</span>
                </button>
                <button
                  onClick={() => setLabInputMethod('upload')}
                  className={`flex-1 py-4 px-6 font-semibold transition-all rounded-lg flex items-center justify-center gap-2 ${
                    labInputMethod === 'upload'
                      ? 'bg-white text-brand-pink shadow-lg scale-105'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">📸</span>
                  <span>رفع صورة</span>
                </button>
              </div>

              {labInputMethod === 'manual' ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 border-r-4 border-blue-400 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 يمكنك ترك أي حقل فارغاً إذا لم يكن لديك النتيجة
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-pink-dark flex items-center gap-2">
                        <span>🩸</span>
                        <span>ضغط الدم</span>
                      </h4>
                      <Input
                        id="systolicBp"
                        label="الانقباضي (Systolic)"
                        type="number"
                        value={formData.labResults.systolicBp || ''}
                        onChange={e => handleChange<LabResults>('labResults', 'systolicBp', e.target.value)}
                        placeholder="مثال: 120"
                        min="80"
                        max="200"
                      />
                      <Input
                        id="diastolicBp"
                        label="الانبساطي (Diastolic)"
                        type="number"
                        value={formData.labResults.diastolicBp || ''}
                        onChange={e => handleChange<LabResults>('labResults', 'diastolicBp', e.target.value)}
                        placeholder="مثال: 80"
                        min="50"
                        max="140"
                      />
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-brand-pink-dark flex items-center gap-2">
                        <span>🔬</span>
                        <span>التحاليل المخبرية</span>
                      </h4>
                      <Input
                        id="fastingGlucose"
                        label="سكر الدم (صائم) mg/dL"
                        type="number"
                        value={formData.labResults.fastingGlucose || ''}
                        onChange={e => handleChange<LabResults>('labResults', 'fastingGlucose', e.target.value)}
                        placeholder="مثال: 95"
                        min="50"
                        max="300"
                      />
                      <Input
                        id="hb"
                        label="الهيموجلوبين (Hb) g/dL"
                        type="number"
                        step="0.1"
                        value={formData.labResults.hb || ''}
                        onChange={e => handleChange<LabResults>('labResults', 'hb', e.target.value)}
                        placeholder="مثال: 12.5"
                        min="5"
                        max="20"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-purple-50 border-r-4 border-purple-400 p-4 rounded-lg">
                    <p className="text-sm text-purple-800">
                      📸 ارفعي صورة واضحة لتقرير المختبر - سنستخرج البيانات تلقائياً
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
                      <p className="text-brand-pink font-bold text-xl mb-2">اضغطي لاختيار ملف</p>
                      <p className="text-gray-500">أو اسحبي الملف هنا</p>
                      <p className="text-xs text-gray-400 mt-3">PNG, JPG, PDF (حتى 5 ميجابايت)</p>
                    </label>
                  </div>

                  {uploadedFile && (
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 border-r-4 border-green-500 p-5 rounded-xl flex items-center gap-4 animate-fade-in">
                      <span className="text-5xl">✅</span>
                      <div className="flex-1">
                        <p className="text-green-800 font-bold text-lg">تم اختيار الملف بنجاح!</p>
                        <p className="text-green-700 text-sm mt-1">{uploadedFile.name}</p>
                        <p className="text-green-600 text-xs mt-1">
                          الحجم: {(uploadedFile.size / 1024 / 1024).toFixed(2)} ميجابايت
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

      case 6:
        return (
          <Card title="🔬 الخطوة 6: نتائج التحليل الذكي">
            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner message="يقوم الذكاء الاصطناعي بتحليل بياناتك بعناية..." />
                <div className="mt-6 text-center space-y-2">
                  <p className="text-gray-600">⏱️ قد يستغرق هذا من 5-10 ثوانٍ</p>
                  <p className="text-sm text-gray-500">نحن نحلل أكثر من 20 معياراً طبياً</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-8xl mb-6 animate-bounce">⚠️</div>
                <div className="bg-red-50 border-2 border-red-500 p-6 rounded-xl max-w-2xl mx-auto">
                  <p className="font-bold text-red-800 text-xl mb-3">حدث خطأ</p>
                  <p className="text-red-700 mb-4">{error}</p>
                  <Button
                    onClick={() => {
                      setError(null);
                      setStep(5);
                    }}
                    variant="secondary"
                  >
                    العودة للتعديل
                  </Button>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-8">
                {showSuccessAnimation && (
                  <div className="text-center text-8xl animate-bounce">✨🎉✨</div>
                )}

                {/* Overall Risk Card */}
                <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8 rounded-2xl shadow-2xl border-2 border-gray-200">
                  <h3 className="text-2xl font-bold text-center text-brand-gray-dark mb-6 flex items-center justify-center gap-3">
                    <span className="text-4xl">{getRiskDisplay(analysisResult.riskScores.overallRisk).icon}</span>
                    <span>مستوى الخطورة العام</span>
                  </h3>
                  <div className="text-center">
                    <div className={`inline-block text-4xl font-bold p-6 rounded-2xl px-12 transform transition-transform hover:scale-110 ${
                      getRiskDisplay(analysisResult.riskScores.overallRisk).className
                    } ${
                      getRiskDisplay(analysisResult.riskScores.overallRisk).pulse ? 'animate-pulse' : ''
                    }`}>
                      {getRiskDisplay(analysisResult.riskScores.overallRisk).text}
                      <br />
                      <span className="text-2xl">({(analysisResult.riskScores.overallRisk * 100).toFixed(0)}%)</span>
                    </div>
                    <p className="mt-6 text-lg font-semibold text-gray-700">
                      {getRiskDisplay(analysisResult.riskScores.overallRisk).recommendation}
                    </p>
                  </div>
                </div>

                {/* Detailed Risk Scores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border-2 border-red-300 text-center">
                    <p className="text-sm text-red-600 font-medium mb-2">خطر تسمم الحمل</p>
                    <p className="text-4xl font-bold text-red-700">
                      {(analysisResult.riskScores.preeclampsiaRisk * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl border-2 border-yellow-300 text-center">
                    <p className="text-sm text-yellow-700 font-medium mb-2">خطر سكري الحمل</p>
                    <p className="text-4xl font-bold text-yellow-800">
                      {(analysisResult.riskScores.gdmRisk * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border-2 border-blue-300 text-center">
                    <p className="text-sm text-blue-600 font-medium mb-2">خطر الأنيميا</p>
                    <p className="text-4xl font-bold text-blue-700">
                      {(analysisResult.riskScores.anemiaRisk * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Brief Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-r-4 border-blue-500 p-6 rounded-xl shadow-md">
                  <h3 className="text-2xl font-bold text-brand-gray-dark mb-4 flex items-center gap-3">
                    <span className="text-3xl">📋</span>
                    <span>ملخص سريع</span>
                  </h3>
                  <p className="text-lg leading-relaxed text-gray-800">{analysisResult.brief_summary}</p>
                </div>

                {/* Detailed Report */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
                  <h3 className="text-2xl font-bold text-brand-gray-dark mb-6 flex items-center gap-3 border-b-2 pb-4">
                    <span className="text-3xl">📊</span>
                    <span>التقرير الطبي المفصل</span>
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
                <div className="text-8xl mb-6">📝</div>
                <p className="text-xl text-gray-500">لا توجد نتائج لعرضها</p>
              </div>
            )}
          </Card>
        );

      case 7:
        return (
          <Card title="📝 الخطوة 7: استبيان قصير">
            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner message="جارِ حفظ السجل الطبي..." />
                <p className="text-center text-gray-600 mt-4">يتم تشفير بياناتك بأمان</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-8xl mb-6">⚠️</div>
                <div className="bg-red-50 border-2 border-red-500 p-6 rounded-xl max-w-2xl mx-auto">
                  <p className="font-bold text-red-800 text-xl mb-3">حدث خطأ أثناء الحفظ</p>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-8">
                {/* Context Card */}
                <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 rounded-2xl border-r-4 border-brand-pink shadow-lg">
                  <h4 className="text-lg font-bold text-brand-pink-dark mb-3">بناءً على التقرير الطبي:</h4>
                  <p className="text-xl text-brand-gray-dark font-semibold italic">
                    "{analysisResult.brief_summary}"
                  </p>
                </div>

                {/* Question Card */}
                <div className="bg-white border-2 border-gray-300 rounded-2xl p-8 shadow-xl">
                  <label className="block text-2xl font-bold text-center text-brand-gray-dark mb-6">
                    💭 هل كنتِ على علم مسبق بهذه الحالة أو التشخيص؟
                  </label>

                  <p className="text-center text-gray-600 mb-8">
                    هذه المعلومة تساعدنا في تحسين دقة نظام الكشف المبكر
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label
                      className={`group cursor-pointer p-8 rounded-2xl border-3 transition-all hover:shadow-2xl transform hover:-translate-y-1 ${
                        postAnalysisData.knownDiagnosis === true
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
                        <span className="text-2xl font-bold block">نعم، كنت أعرف</span>
                        <p className="text-sm text-gray-600">
                          تم تشخيصي سابقاً بهذه الحالة
                        </p>
                      </div>
                    </label>

                    <label
                      className={`group cursor-pointer p-8 rounded-2xl border-3 transition-all hover:shadow-2xl transform hover:-translate-y-1 ${
                        postAnalysisData.knownDiagnosis === false
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
                        <span className="text-2xl font-bold block">لا، معلومة جديدة</span>
                        <p className="text-sm text-gray-600">
                          هذا أول علم لي بهذه الحالة
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
                      <p className="text-yellow-800 font-semibold mb-2">لماذا نسأل هذا السؤال؟</p>
                      <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
                        <li>يساعدنا في قياس فعالية نظام الكشف المبكر</li>
                        <li>يحسن دقة التشخيص للمرضى المستقبليين</li>
                        <li>يساهم في البحث العلمي لتحسين صحة الأمهات</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-8xl mb-6">❌</div>
                <p className="text-red-600 text-xl font-semibold">
                  حدث خطأ، لا يوجد تحليل لعرض السؤال.
                </p>
                <Button
                  onClick={() => setStep(5)}
                  variant="secondary"
                  className="mt-4"
                >
                  العودة للخطوة السابقة
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
              <p className="text-3xl font-bold text-green-600 mb-2">تم بنجاح!</p>
              <p className="text-gray-600">جارِ المتابعة...</p>
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
            {/* Animated Pulse */}
            <div
              className="absolute top-0 left-0 h-full bg-white opacity-30 rounded-full transition-all duration-700 ease-out animate-pulse"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-sm font-semibold text-gray-700">
              الخطوة {step} من {steps.length}
            </p>
            <p className="text-sm text-gray-500">
              {Math.round((step / steps.length) * 100)}% مكتمل
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
              <span className="font-semibold">السابق</span>
            </Button>
          )}

          {step < steps.length - 2 && (
            <Button
              onClick={handleNext}
              className="mr-auto flex items-center gap-2 hover:scale-105 transition-transform px-8 py-3"
              disabled={isLoading}
            >
              <span className="font-semibold">التالي</span>
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
                  <span className="font-bold">جاري التحليل...</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">🔍</span>
                  <span className="font-bold">تحليل البيانات بالذكاء الاصطناعي</span>
                </>
              )}
            </Button>
          )}

          {step === steps.length - 1 && analysisResult && !isLoading && (
            <Button
              onClick={handleNext}
              className="mr-auto flex items-center gap-2 hover:scale-105 transition-transform px-8 py-3"
            >
              <span className="font-semibold">متابعة للاستبيان</span>
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
              <span className="font-bold">حفظ السجل وإنهاء</span>
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && !isLoading && (
          <div className="mt-8 bg-red-50 border-r-4 border-red-500 p-6 rounded-xl animate-shake shadow-lg">
            <div className="flex items-start gap-4">
              <span className="text-4xl">⚠️</span>
              <div className="flex-1">
                <p className="font-bold text-red-800 text-lg mb-2">تنبيه</p>
                <p className="text-red-700">{error}</p>
                <Button
                  onClick={() => setError(null)}
                  variant="secondary"
                  className="mt-4"
                >
                  حسناً، فهمت
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