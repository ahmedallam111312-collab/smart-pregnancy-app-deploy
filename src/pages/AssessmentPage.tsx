import React, { useState, useCallback } from 'react';
// 🚨 (النقطة 1) استيراد الأنواع الجديدة
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

// -------------------------------------------------------------------
// 🚨 (النقطة 1) تعريف الأعراض الجديدة (Checklist)
// -------------------------------------------------------------------
const symptomDefinitions: { [key: string]: { key: keyof SymptomsPayload; label: string }[] } = {
  "أعراض عامة وشائعة": [
    { key: 'fatigue', label: 'تعب شديد أو إرهاق غير مبرر' },
    { key: 'dizziness', label: 'دوخة أو دوار' },
  ],
  "أعراض مرتبطة بالضغط والرؤية": [
    { key: 'headache', label: 'صداع مستمر أو شديد' },
    { key: 'visionChanges', label: 'تغيرات في الرؤية (زغللة، رؤية بقع)' },
    { key: 'swelling', label: 'تورم مفاجئ في الوجه أو اليدين' },
  ],
  "أعراض أخرى": [
    { key: 'upperAbdominalPain', label: 'ألم في الجزء العلوي من البطن (تحت الأضلاع)' },
    { key: 'excessiveThirst', label: 'عطش شديد ومستمر' },
    { key: 'frequentUrination', label: 'تبول متكرر أكثر من المعتاد' },
    { key: 'shortnessOfBreath', label: 'ضيق في التنفس' },
  ],
};
// -------------------------------------------------------------------


const ReportRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
    // ... (يبقى كما هو)
    return (
        <div className="space-y-3 text-right">
            {markdown.split('\n').map((line, index) => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('## ')) {
                    return <h3 key={index} className="text-xl font-bold mt-4 mb-2 text-brand-pink-dark border-r-4 border-brand-pink pr-2">{trimmedLine.substring(3)}</h3>;
                }
                if (trimmedLine.startsWith('* ')) {
                    return <p key={index} className="flex items-start"><span className="text-brand-pink font-bold ml-2">•</span><span>{trimmedLine.substring(2)}</span></p>;
                }
                if (trimmedLine === '') { return null; }
                return <p key={index}>{trimmedLine}</p>;
            }).filter(Boolean)}
        </div>
    );
};

// 🚨 (النقطة 7) دالة مساعدة لترجمة السكور
const getRiskDisplay = (score: number) => {
    if (score >= 0.75) return { text: 'عالي', className: 'bg-red-500 text-white' };
    if (score >= 0.5) return { text: 'متوسط', className: 'bg-yellow-400 text-black' };
    if (score >= 0.25) return { text: 'منخفض', className: 'bg-blue-400 text-white' };
    return { text: 'طبيعي', className: 'bg-green-500 text-white' };
};


const AssessmentPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  
  // 🚨 (النقطة 1) تحديث الحالة الأولية للأعراض
  const [formData, setFormData] = useState({
    personalInfo: { name: '', age: 0 } as PersonalInfo,
    pregnancyHistory: { g: 0, p: 0, a: 0 } as PregnancyHistory,
    measurementData: { height: 0, prePregnancyWeight: 0, currentWeight: 0 } as MeasurementData,
    symptoms: {
      headache: false, visionChanges: false, upperAbdominalPain: false, swelling: false,
      excessiveThirst: false, frequentUrination: false,
      fatigue: false, dizziness: false, shortnessOfBreath: false,
      otherSymptoms: ''
    } as SymptomsPayload,
    labResults: {} as LabResults,
    ocrText: '',
  });
  
  const [postAnalysisData, setPostAnalysisData] = useState({
    knownDiagnosis: false,
  });

  const [labInputMethod, setLabInputMethod] = useState<'manual' | 'upload'>('manual');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIResponse | null>(null);

  const steps = ["المعلومات الشخصية", "تاريخ الحمل", "القياسات", "الأعراض", "الفحوصات", "التحليل", "استبيان"];

  const handleNext = () => setStep(prev => Math.min(prev + 1, steps.length));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
  
  const handleChange = <T,>(section: keyof typeof formData, field: keyof T, value: string | number) => {
    // ... (يبقى كما هو)
    setFormData(prev => ({ ...prev, [section]: { ...(prev[section] as object), [field]: typeof value === 'string' ? value : Number(value) || 0, }, }));
  };
  
  // 🚨 (النقطة 1) دالة جديدة للتعامل مع قوائم الاختيار (Checkboxes)
  const handleSymptomCheck = (key: keyof SymptomsPayload) => {
      setFormData(prev => ({
          ...prev,
          symptoms: {
              ...prev.symptoms,
              [key]: !prev.symptoms[key as keyof SymptomsPayload],
          },
      }));
  };
  
  const handleOtherSymptoms = (value: string) => {
      setFormData(prev => ({
          ...prev,
          symptoms: {
              ...prev.symptoms,
              otherSymptoms: value,
          },
      }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (يبقى كما هو)
    if (e.target.files && e.target.files[0]) { setUploadedFile(e.target.files[0]); }
  };

  const handleAnalyze = useCallback(async () => {
    // ... (يبقى كما هو، يرسل النقاط ويستقبل السكور)
    if (!user) { setError("خطأ: يجب تسجيل الدخول لحفظ البيانات."); return; }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    let ocrResult = '';
    if (labInputMethod === 'upload' && uploadedFile) {
      try {
        ocrResult = await mockOcrService(uploadedFile);
        setFormData(prev => ({ ...prev, ocrText: ocrResult }));
      } catch (e) { setError("فشل في قراءة الصورة."); setIsLoading(false); return; }
    }

    try {
      const dataToAnalyze = {
        userId: user.id,
        personalInfo: formData.personalInfo,
        pregnancyHistory: formData.pregnancyHistory,
        measurementData: formData.measurementData,
        symptoms: formData.symptoms, // 🚨 إرسال كائن الأعراض الجديد
        labResults: formData.labResults,
        ocrText: ocrResult || formData.ocrText,
      };
      
      const userHistory = await getPatientRecordsByUserId(user.id);
      
      const result = await analyzePatientData(dataToAnalyze, userHistory);
      setAnalysisResult(result);

      handleNext(); 
    } catch (e: any) {
      setError(e.message || "حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  }, [formData, uploadedFile, labInputMethod, user]);
  
  const handleFinalSave = async () => {
    // ... (يبقى كما هو، يحفظ 'knownDiagnosis')
      if (!user || !analysisResult) { setError("خطأ: لا يوجد تحليل للحفظ."); return; }
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
              symptoms: formData.symptoms, // 🚨 حفظ كائن الأعراض الجديد
              labResults: { ...formData.labResults, ...analysisResult.extracted_labs },
              ocrText: formData.ocrText,
              aiResponse: analysisResult, 
              knownDiagnosis: postAnalysisData.knownDiagnosis, 
          };

          await saveNewPatientRecord(newRecord as PatientRecord);
          navigate(Page.Home); 
      } catch (e: any) {
          setError("حدث خطأ أثناء حفظ السجل النهائي: " + e.message);
      } finally {
          setIsLoading(false);
      }
  };
  

  const renderStepContent = () => {
    switch (step) {
      case 1: // المعلومات الشخصية
        return (
          <Card title="الخطوة 1: المعلومات الشخصية">
            <div className="space-y-4">
              <Input id="name" label="الاسم الكامل" type="text" value={formData.personalInfo.name} onChange={e => handleChange<PersonalInfo>('personalInfo', 'name', e.target.value)} />
              <Input id="age" label="العمر" type="number" value={formData.personalInfo.age || ''} onChange={e => handleChange<PersonalInfo>('personalInfo', 'age', e.target.value)} />
            </div>
          </Card>
        );
      case 2: // تاريخ الحمل
        return (
          <Card title="الخطوة 2: تاريخ الحمل">
            <p className="mb-4 text-gray-600 text-right">يرجى إدخال عدد مرات الحمل والولادة والإجهاض السابقة.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input id="g" label="الحمل (G)" type="number" value={formData.pregnancyHistory.g || ''} onChange={e => handleChange<PregnancyHistory>('pregnancyHistory', 'g', e.target.value)} />
              <Input id="p" label="الولادة (P)" type="number" value={formData.pregnancyHistory.p || ''} onChange={e => handleChange<PregnancyHistory>('pregnancyHistory', 'p', e.target.value)} />
              <Input id="a" label="الإجهاض (A)" type="number" value={formData.pregnancyHistory.a || ''} onChange={e => handleChange<PregnancyHistory>('pregnancyHistory', 'a', e.target.value)} />
            </div>
          </Card>
        );
      case 3: // القياسات
        return (
          <Card title="الخطوة 3: القياسات الحيوية">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input id="height" label="الطول (سم)" type="number" value={formData.measurementData.height || ''} onChange={e => handleChange<MeasurementData>('measurementData', 'height', e.target.value)} />
              <Input id="preWeight" label="الوزن قبل الحمل (كجم)" type="number" value={formData.measurementData.prePregnancyWeight || ''} onChange={e => handleChange<MeasurementData>('measurementData', 'prePregnancyWeight', e.target.value)} />
              <Input id="currentWeight" label="الوزن الحالي (كجم)" type="number" value={formData.measurementData.currentWeight || ''} onChange={e => handleChange<MeasurementData>('measurementData', 'currentWeight', e.target.value)} />
            </div>
          </Card>
        );

      // -----------------------------------------------------------------
      // 🚨 (النقطة 1) تعديل الخطوة 4 (الأعراض) - استخدام Checklist
      // -----------------------------------------------------------------
      case 4: 
          return (
            <Card title="الخطوة 4: الأعراض الحالية (اختيارية)">
                <div className="space-y-6">
                    {/* تكرار لكل فئة من الأعراض */}
                    {Object.entries(symptomDefinitions).map(([category, symptoms]) => (
                        <div key={category}>
                            <h3 className="text-lg font-semibold text-brand-pink-dark mb-2 border-r-4 border-brand-pink pr-2">{category}</h3>
                            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                                {symptoms.map((symptom) => (
                                    <label key={symptom.key} className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                                        <input
                                            type="checkbox"
                                            // 🚨 التأكد من أن القيمة ليست undefined قبل تمريرها
                                            checked={!!formData.symptoms[symptom.key as keyof SymptomsPayload]}
                                            onChange={() => handleSymptomCheck(symptom.key as keyof SymptomsPayload)}
                                            className="form-checkbox h-5 w-5 text-brand-pink focus:ring-brand-pink rounded"
                                        />
                                        <span>{symptom.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {/* (النقطة 3) أعراض أخرى */}
                    <div>
                      <label htmlFor="symptoms-other" className="block text-right text-md font-medium text-brand-gray-dark mb-2">
                        أعراض أخرى (اختياري)
                      </label>
                      <textarea
                        id="symptoms-other"
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent text-right"
                        value={formData.symptoms.otherSymptoms}
                        onChange={e => handleOtherSymptoms(e.target.value)}
                      ></textarea>
                    </div>
                </div>
            </Card>
          );
      case 5: // الفحوصات المخبرية (يبقى كما هو)
        return (
          <Card title="الخطوة 5: الفحوصات المخبرية">
            <div className="flex justify-center gap-4 mb-6 border-b border-gray-200">
              <button onClick={() => setLabInputMethod('manual')} className={`py-2 px-4 font-semibold ${labInputMethod === 'manual' ? 'border-b-2 border-brand-pink text-brand-pink' : 'text-gray-500'}`}>
                إدخال يدوي
              </button>
              <button onClick={() => setLabInputMethod('upload')} className={`py-2 px-4 font-semibold ${labInputMethod === 'upload' ? 'border-b-2 border-brand-pink text-brand-pink' : 'text-gray-500'}`}>
                رفع صورة
              </button>
            </div>
            {labInputMethod === 'manual' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="systolicBp" label="ضغط الدم الانقباضي" type="number" onChange={e => handleChange<LabResults>('labResults', 'systolicBp', e.target.value)} />
                <Input id="diastolicBp" label="ضغط الدم الانبساطي" type="number" onChange={e => handleChange<LabResults>('labResults', 'diastolicBp', e.target.value)} />
                <Input id="fastingGlucose" label="سكر الدم (صائم)" type="number" onChange={e => handleChange<LabResults>('labResults', 'fastingGlucose', e.target.value)} />
                <Input id="hb" label="الهيموجلوبين (Hb)" type="number" step="0.1" onChange={e => handleChange<LabResults>('labResults', 'hb', e.target.value)} />
              </div>
            ) : (
              <div>
                <label htmlFor="lab-upload" className="block text-right text-md font-medium text-brand-gray-dark mb-2">
                  ارفعي صورة واضحة لتقرير المختبر (JPG, PNG)
                </label>
                <input id="lab-upload" type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-pink-light file:text-brand-pink hover:file:bg-pink-100" />
                {uploadedFile && <p className="mt-2 text-green-600">تم اختيار الملف: {uploadedFile.name}</p>}
              </div>
            )}
          </Card>
        );
        
      // -----------------------------------------------------------------
      // 🚨 (النقطة 7) التعديل الحاسم: عرض نظام النقاط الجديد
      // -----------------------------------------------------------------
      case 6: // نتائج التحليل
        return (
          <Card title="الخطوة 6: نتائج التحليل">
            {isLoading ? ( <LoadingSpinner message="يقوم الذكاء الاصطناعي بتحليل بياناتك..." /> ) 
             : error ? ( <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg"><p className="font-bold">حدث خطأ</p><p>{error}</p></div> ) 
             : analysisResult ? (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-brand-gray-dark mb-2">مستوى الخطورة العام</h3>
                        <p className={`text-2xl font-bold p-2 rounded-lg inline-block px-4 ${
                            getRiskDisplay(analysisResult.riskScores.overallRisk).className
                        }`}>
                            {getRiskDisplay(analysisResult.riskScores.overallRisk).text} ({(analysisResult.riskScores.overallRisk * 100).toFixed(0)}%)
                        </p>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-brand-gray-dark mb-2">ملخص سريع</h3>
                        <p className="text-lg bg-gray-100 p-3 rounded-lg">{analysisResult.brief_summary}</p>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-brand-gray-dark mb-2">التقرير المفصل</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <ReportRenderer markdown={analysisResult.detailed_report} />
                        </div>
                    </div>
                    {user?.role === Role.Admin && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-600 mb-2">Scores (Admin View)</h3>
                            <pre className="bg-gray-800 text-white p-2 rounded-lg text-left" dir="ltr">
                                {JSON.stringify(analysisResult.riskScores, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            ) : ( <p>لا توجد نتائج لعرضها.</p> )}
          </Card>
        );
      // -----------------------------------------------------------------
        
      case 7: // الاستبيان (يبقى كما هو)
        return (
            <Card title="الخطوة 7: استبيان قصير">
                {isLoading ? (
                    <LoadingSpinner message="جارِ حفظ السجل..." />
                ) : error ? (
                    <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">
                        <p className="font-bold">حدث خطأ أثناء الحفظ</p><p>{error}</p>
                    </div>
                ) : analysisResult ? (
                    <div className="space-y-6 text-right">
                        <p className="text-lg font-semibold">بناءً على التقرير (الذي أشار إلى: "{analysisResult.brief_summary}")،</p>
                        <label className="block text-md font-medium text-brand-gray-dark mb-2">هل كنتِ على علم مسبق بهذه الحالة أو التشخيص؟</label>
                        <div className="flex justify-center gap-6 bg-gray-100 p-4 rounded-lg">
                            <label className="flex items-center space-x-2 space-x-reverse cursor-pointer p-2">
                                <input
                                    type="radio"
                                    name="knownDiagnosis"
                                    checked={postAnalysisData.knownDiagnosis === true}
                                    onChange={() => setPostAnalysisData({ knownDiagnosis: true })}
                                    className="form-radio text-brand-pink focus:ring-brand-pink"
                                />
                                <span>نعم، كنت أعرف</span>
                            </label>
                            <label className="flex items-center space-x-2 space-x-reverse cursor-pointer p-2">
                                <input
                                    type="radio"
                                    name="knownDiagnosis"
                                    checked={postAnalysisData.knownDiagnosis === false}
                                    onChange={() => setPostAnalysisData({ knownDiagnosis: false })}
                                    className="form-radio text-brand-pink focus:ring-brand-pink"
                                />
                                <span>لا، هذه معلومة جديدة</span>
                            </label>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-red-500">حدث خطأ، لا يوجد تحليل لعرض السؤال.</p>
                )}
            </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <BackButton navigate={navigate} />
      <Card>
        <StepIndicator steps={steps} currentStep={step} />
        <div className="mt-8">
            {renderStepContent()}
        </div>
          <div className="mt-8 flex justify-between">
          
          {step > 1 && step <= steps.length && (
            <Button variant="secondary" onClick={handleBack} disabled={isLoading}>السابق</Button>
          )}
          {step < steps.length - 2 && (
            <Button onClick={handleNext} className="mr-auto">التالي</Button>
          )}
          {step === steps.length - 2 && (
            <Button onClick={handleAnalyze} className="mr-auto" disabled={isLoading}>
              {isLoading ? '...جاري التحليل' : 'تحليل البيانات'}
            </Button>
          )}
          {step === steps.length - 1 && analysisResult && !isLoading && (
               <Button onClick={handleNext} className="mr-auto">متابعة للاستبيان</Button>
          )}
          {step === steps.length && !isLoading && (
               <Button onClick={handleFinalSave} className="mr-auto">حفظ وإنهاء</Button>
          )}

        </div>
      </Card>
    </div>
  );
};

export default AssessmentPage;