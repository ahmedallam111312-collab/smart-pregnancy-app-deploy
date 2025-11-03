import React, { useState, useCallback } from 'react';
import { Page, PersonalInfo, PregnancyHistory, MeasurementData, LabResults, PatientRecord, AIResponse, SymptomLevel, Symptoms } from '../types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import StepIndicator from '../components/StepIndicator';
import { analyzePatientData, mockOcrService } from '../services/geminiService';
import { useUser } from '../hooks/useUser';
import LoadingSpinner from '../components/LoadingSpinner';
import { patientRecordsDB } from '../services/mockDB';

const ReportRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
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
                if (trimmedLine === '') {
                    return null; // Don't render empty lines, allows for paragraph breaks
                }
                return <p key={index}>{trimmedLine}</p>;
            }).filter(Boolean)}
        </div>
    );
};


const AssessmentPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    personalInfo: { name: '', age: 0 },
    pregnancyHistory: { g: 0, p: 0, a: 0 },
    measurementData: { height: 0, prePregnancyWeight: 0, currentWeight: 0 },
    symptoms: { nausea: 'None' as SymptomLevel, vomiting: 'None' as SymptomLevel, other: ''},
    labResults: {},
    ocrText: '',
  });
  const [labInputMethod, setLabInputMethod] = useState<'manual' | 'upload'>('manual');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIResponse | null>(null);

  const steps = ["المعلومات الشخصية", "تاريخ الحمل", "القياسات", "الأعراض", "الفحوصات المخبرية", "النتيجة"];

  const handleNext = () => setStep(prev => Math.min(prev + 1, steps.length));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
  
  const handleChange = <T,>(section: keyof typeof formData, field: keyof T, value: string | number) => {
    setFormData(prev => ({
        ...prev,
        [section]: {
            ...(prev[section] as object),
            [field]: typeof value === 'string' ? value : Number(value) || 0,
        },
    }));
  };
  
   const handleSymptomChange = (field: keyof Symptoms, value: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: {
        ...prev.symptoms,
        [field]: value,
      },
    }));
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!user) {
        setError("User not found.");
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
        setError("فشل في قراءة الصورة. يرجى المحاولة مرة أخرى أو إدخال البيانات يدويًا.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const dataToAnalyze = {
        userId: user.id,
        ...formData,
        ocrText: ocrResult || formData.ocrText,
      };
      const userHistory = patientRecordsDB.filter(r => r.userId === user.id);
      const result = await analyzePatientData(dataToAnalyze, userHistory);
      setAnalysisResult(result);

       // Add the new record to our mock DB
      const newRecord: PatientRecord = {
          id: `rec_${Date.now()}`,
          timestamp: new Date(),
          userId: user.id,
          personalInfo: formData.personalInfo,
          pregnancyHistory: formData.pregnancyHistory,
          measurementData: formData.measurementData,
          symptoms: formData.symptoms,
          labResults: {
              ...formData.labResults,
              ...result.extracted_labs
          },
          ocrText: ocrResult || formData.ocrText,
          aiResponse: result
      };
      patientRecordsDB.push(newRecord);


      handleNext();
    } catch (e: any) {
      setError(e.message || "حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  }, [formData, uploadedFile, labInputMethod, user]);
  
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Card title="الخطوة 1: المعلومات الشخصية">
            <div className="space-y-4">
              <Input id="name" label="الاسم الكامل" type="text" value={formData.personalInfo.name} onChange={e => handleChange<PersonalInfo>('personalInfo', 'name', e.target.value)} />
              <Input id="age" label="العمر" type="number" value={formData.personalInfo.age || ''} onChange={e => handleChange<PersonalInfo>('personalInfo', 'age', e.target.value)} />
            </div>
          </Card>
        );
      case 2:
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
      case 3:
        return (
          <Card title="الخطوة 3: القياسات الحيوية">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input id="height" label="الطول (سم)" type="number" value={formData.measurementData.height || ''} onChange={e => handleChange<MeasurementData>('measurementData', 'height', e.target.value)} />
              <Input id="preWeight" label="الوزن قبل الحمل (كجم)" type="number" value={formData.measurementData.prePregnancyWeight || ''} onChange={e => handleChange<MeasurementData>('measurementData', 'prePregnancyWeight', e.target.value)} />
              <Input id="currentWeight" label="الوزن الحالي (كجم)" type="number" value={formData.measurementData.currentWeight || ''} onChange={e => handleChange<MeasurementData>('measurementData', 'currentWeight', e.target.value)} />
            </div>
          </Card>
        );
      case 4:
         return (
            <Card title="الخطوة 4: الأعراض الحالية">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="nausea" className="block text-right text-md font-medium text-brand-gray-dark mb-2">مستوى الغثيان</label>
                            <select id="nausea" value={formData.symptoms.nausea} onChange={e => handleSymptomChange('nausea', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
                                <option value="None">لا يوجد</option>
                                <option value="Mild">خفيف</option>
                                <option value="Moderate">متوسط</option>
                                <option value="Severe">شديد</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="vomiting" className="block text-right text-md font-medium text-brand-gray-dark mb-2">مستوى التقيؤ</label>
                            <select id="vomiting" value={formData.symptoms.vomiting} onChange={e => handleSymptomChange('vomiting', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink">
                                <option value="None">لا يوجد</option>
                                <option value="Mild">خفيف</option>
                                <option value="Moderate">متوسط</option>
                                <option value="Severe">شديد</option>
                            </select>
                        </div>
                    </div>

                    <div>
                      <label htmlFor="symptoms-other" className="block text-right text-md font-medium text-brand-gray-dark mb-2">
                        صفي أي أعراض أخرى (مثل صداع، تورم، ...إلخ)
                      </label>
                      <textarea
                        id="symptoms-other"
                        rows={4}
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent text-right"
                        value={formData.symptoms.other}
                        onChange={e => handleSymptomChange('other', e.target.value)}
                      ></textarea>
                    </div>
                </div>
            </Card>
        );
      case 5:
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
      case 6:
        return (
          <Card title="نتائج التحليل">
            {isLoading ? (
                <LoadingSpinner message="يقوم الذكاء الاصطناعي بتحليل بياناتك..." />
            ) : error ? (
                <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">
                    <p className="font-bold">حدث خطأ</p>
                    <p>{error}</p>
                </div>
            ) : analysisResult ? (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-brand-gray-dark mb-2">مستوى الأهمية</h3>
                        <p className={`text-2xl font-bold p-2 rounded-lg inline-block px-4 ${
                            analysisResult.urgency === 'High' ? 'bg-red-500 text-white' :
                            analysisResult.urgency === 'Medium' ? 'bg-yellow-400 text-black' :
                            analysisResult.urgency === 'Low' ? 'bg-blue-400 text-white' : 'bg-green-500 text-white'
                        }`}>
                            {analysisResult.urgency === 'High' ? 'عالي' : analysisResult.urgency === 'Medium' ? 'متوسط' : analysisResult.urgency === 'Low' ? 'منخفض' : 'طبيعي'}
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
                </div>
            ) : null}
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
          {step > 1 && step < steps.length && (
            <Button variant="secondary" onClick={handleBack}>السابق</Button>
          )}
          {step < steps.length - 1 ? (
            <Button onClick={handleNext} className="mr-auto">التالي</Button>
          ) : step === steps.length - 1 ? (
             <Button onClick={handleAnalyze} className="mr-auto" disabled={isLoading}>
                {isLoading ? '...جاري التحليل' : 'تحليل البيانات'}
            </Button>
          ) : null }
        </div>
      </Card>
    </div>
  );
};

export default AssessmentPage;