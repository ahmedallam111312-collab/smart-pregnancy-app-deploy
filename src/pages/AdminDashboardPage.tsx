import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Page, PatientRecord, Role, RiskScores, SymptomsPayload, AIResponse } from '../types';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import { useUser } from '../hooks/useUser';
import Input from '../components/Input';
import { deletePatientRecord, getAllPatientRecordsForAdmin } from '../services/mockDB';
import TrashIcon from '../components/icons/TrashIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import DownloadIcon from '../components/icons/DownloadIcon';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

import MedicalKB from '../constants/medicalKB';

// -----------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------
type RiskCategory = 'All' | 'High' | 'Medium' | 'Low' | 'Normal';

interface RiskDisplay {
  text: string;
  className: string;
  scoreText: string;
  icon: string;
}

const RISK_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-blue-100 text-blue-800 border-blue-300',
  normal: 'bg-green-100 text-green-800 border-green-300',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300'
};

const RISK_ICONS = {
  high: '🚨',
  medium: '⚠️',
  low: 'ℹ️',
  normal: '✅',
  unknown: '❓'
};

// -----------------------------------------------------------------
// Risk Assessment Helpers
// -----------------------------------------------------------------
const getRiskDisplay = (aiResponse: AIResponse | undefined): RiskDisplay => {
  if (!aiResponse) {
    return {
      text: 'غير متوفر',
      className: RISK_COLORS.unknown,
      scoreText: '',
      icon: RISK_ICONS.unknown
    };
  }

  // New system: riskScores
  if (aiResponse.riskScores) {
    const score = aiResponse.riskScores.overallRisk;
    const percentage = Math.round(score * 100);
    
    if (score >= 0.75) {
      return {
        text: 'عالي',
        className: RISK_COLORS.high,
        scoreText: `(${percentage}%)`,
        icon: RISK_ICONS.high
      };
    }
    if (score >= 0.5) {
      return {
        text: 'متوسط',
        className: RISK_COLORS.medium,
        scoreText: `(${percentage}%)`,
        icon: RISK_ICONS.medium
      };
    }
    if (score >= 0.25) {
      return {
        text: 'منخفض',
        className: RISK_COLORS.low,
        scoreText: `(${percentage}%)`,
        icon: RISK_ICONS.low
      };
    }
    return {
      text: 'طبيعي',
      className: RISK_COLORS.normal,
      scoreText: `(${percentage}%)`,
      icon: RISK_ICONS.normal
    };
  }

  // Legacy system: urgency
  const urgency = (aiResponse as any).urgency;
  if (urgency) {
    const legacyMap: Record<string, RiskDisplay> = {
      'High': { text: 'عالي (قديم)', className: RISK_COLORS.high, scoreText: '', icon: RISK_ICONS.high },
      'Medium': { text: 'متوسط (قديم)', className: RISK_COLORS.medium, scoreText: '', icon: RISK_ICONS.medium },
      'Low': { text: 'منخفض (قديم)', className: RISK_COLORS.low, scoreText: '', icon: RISK_ICONS.low }
    };
    return legacyMap[urgency] || {
      text: 'طبيعي (قديم)',
      className: RISK_COLORS.normal,
      scoreText: '',
      icon: RISK_ICONS.normal
    };
  }

  return {
    text: 'غير متوفر',
    className: RISK_COLORS.unknown,
    scoreText: '',
    icon: RISK_ICONS.unknown
  };
};

const getRiskCategory = (aiResponse: AIResponse | undefined): RiskCategory => {
  if (!aiResponse) return 'All';

  if (aiResponse.riskScores) {
    const score = aiResponse.riskScores.overallRisk;
    if (score >= 0.75) return 'High';
    if (score >= 0.5) return 'Medium';
    if (score >= 0.25) return 'Low';
    return 'Normal';
  }

  const urgency = (aiResponse as any).urgency;
  if (urgency) return urgency as RiskCategory;

  return 'All';
};

// -----------------------------------------------------------------
// Export Helpers - UPDATED WITH ANTEPARTUM
// -----------------------------------------------------------------
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const generateCSV = (records: PatientRecord[]): string => {
  // 1. Get all questions dynamically from your Knowledge Base
  // By flattening the categories, we get a single array of all possible factors
  const antepartumFactors = MedicalKB.ANTEPARTUM_RISK_FACTORS.flatMap(cat => cat.factors);
  const antepartumHeaders = antepartumFactors.map(f => f.questionAr);

  const headers = [
    'ID', 'User ID', 'Timestamp', 'Name', 'Age',
    'G', 'P', 'A', 'Height (cm)', 'Pre-Pregnancy Weight (kg)', 'Current Weight (kg)',
    'Headache', 'Vision Changes', 'Upper Abdominal Pain', 'Swelling',
    'Excessive Thirst', 'Frequent Urination', 'Fatigue', 'Dizziness',
    'Shortness of Breath', 'Other Symptoms',
    'Systolic BP', 'Diastolic BP', 'Fasting Glucose', 'Hemoglobin',
    'Overall Risk Score', 'Preeclampsia Risk', 'GDM Risk', 'Anemia Risk',
    'Antepartum Score', 'Antepartum Risk Level',
    
    // 🚨 INSERT ALL DYNAMIC RISK FACTOR QUESTIONS HERE
    ...antepartumHeaders,
    
    'Brief Summary', 'Detailed Report', 'Known Diagnosis', 'OCR Text'
  ];

  const rows = records.map(rec => {
    const symptoms = rec.symptoms || {} as SymptomsPayload;
    const labs = rec.labResults || {};
    const riskScores = rec.aiResponse?.riskScores || {} as RiskScores;
    const aiResponse = rec.aiResponse || {} as AIResponse;

    // 🚨 Get the patient's saved choices (fallback to empty array if none)
    const savedFactors = rec.antepartumRiskFactors || [];

    // 🚨 Loop through all possible questions and check if the patient's array includes the ID
    const factorAnswers = antepartumFactors.map(factor => 
      savedFactors.includes(factor.id) ? 'نعم (Yes)' : 'لا (No)'
    );

    return [
      rec.id,
      rec.userId,
      rec.timestamp.toISOString(),
      rec.personalInfo.name,
      rec.personalInfo.age,
      rec.pregnancyHistory.g,
      rec.pregnancyHistory.p,
      rec.pregnancyHistory.a,
      rec.measurementData.height,
      rec.measurementData.prePregnancyWeight,
      rec.measurementData.currentWeight,
      symptoms.headache ? 'Yes' : 'No',
      symptoms.visionChanges ? 'Yes' : 'No',
      symptoms.upperAbdominalPain ? 'Yes' : 'No',
      symptoms.swelling ? 'Yes' : 'No',
      symptoms.excessiveThirst ? 'Yes' : 'No',
      symptoms.frequentUrination ? 'Yes' : 'No',
      symptoms.fatigue ? 'Yes' : 'No',
      symptoms.dizziness ? 'Yes' : 'No',
      symptoms.shortnessOfBreath ? 'Yes' : 'No',
      symptoms.otherSymptoms || '',
      labs.systolicBp ?? '',
      labs.diastolicBp ?? '',
      labs.fastingGlucose ?? '',
      labs.hb ?? '',
      riskScores.overallRisk ?? '',
      riskScores.preeclampsiaRisk ?? '',
      riskScores.gdmRisk ?? '',
      riskScores.anemiaRisk ?? '',
      (riskScores as any).antepartumScore ?? 'N/A',
      (riskScores as any).antepartumRiskLevel ?? 'N/A',
      
      // 🚨 INSERT THE "YES/NO" ANSWERS HERE
      ...factorAnswers,
      
      aiResponse.brief_summary || '',
      aiResponse.detailed_report || '',
      rec.knownDiagnosis ? 'Yes' : 'No',
      rec.ocrText || ''
    ].map(escapeCSV);
  });

  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  return '\uFEFF' + csvContent; // UTF-8 BOM for Excel
};

// -----------------------------------------------------------------
// Statistics Component
// -----------------------------------------------------------------
interface StatsProps {
  records: PatientRecord[];
}

const Statistics: React.FC<StatsProps> = ({ records }) => {
  const stats = useMemo(() => {
    const total = records.length;
    const riskCounts = { high: 0, medium: 0, low: 0, normal: 0 };

    records.forEach(record => {
      const category = getRiskCategory(record.aiResponse);
      if (category === 'High') riskCounts.high++;
      else if (category === 'Medium') riskCounts.medium++;
      else if (category === 'Low') riskCounts.low++;
      else if (category === 'Normal') riskCounts.normal++;
    });

    return { total, ...riskCounts };
  }, [records]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card className="text-center bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300">
        <p className="text-sm text-gray-600 mb-1">إجمالي السجلات</p>
        <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
      </Card>
      <Card className="text-center bg-gradient-to-br from-red-50 to-red-100 border-red-300">
        <p className="text-sm text-gray-600 mb-1">عالي الخطورة</p>
        <p className="text-3xl font-bold text-red-600">{stats.high}</p>
      </Card>
      <Card className="text-center bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300">
        <p className="text-sm text-gray-600 mb-1">متوسط الخطورة</p>
        <p className="text-3xl font-bold text-yellow-600">{stats.medium}</p>
      </Card>
      <Card className="text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300">
        <p className="text-sm text-gray-600 mb-1">منخفض الخطورة</p>
        <p className="text-3xl font-bold text-blue-600">{stats.low}</p>
      </Card>
      <Card className="text-center bg-gradient-to-br from-green-50 to-green-100 border-green-300">
        <p className="text-sm text-gray-600 mb-1">طبيعي</p>
        <p className="text-3xl font-bold text-green-600">{stats.normal}</p>
      </Card>
    </div>
  );
};

// -----------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------
interface AdminDashboardPageProps {
  navigate: (page: Page) => void;
}

const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ navigate }) => {
  const { user } = useUser();
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<RiskCategory>('All');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<PatientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all records
  const fetchAllRecords = useCallback(async () => {
    if (user?.role !== Role.Admin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allRecords = await getAllPatientRecordsForAdmin();
      setRecords(allRecords);
    } catch (err) {
      console.error('Error fetching admin records:', err);
      setError('حدث خطأ أثناء تحميل السجلات.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchAllRecords();
  }, [fetchAllRecords]);

  // Sorted data
  const sortedData = useMemo(() => {
    return [...records].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [records]);

  // Filtered data
  const filteredData = useMemo(() => {
    return sortedData.filter(record => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        record.personalInfo.name.toLowerCase().includes(searchLower) ||
        record.userId.toLowerCase().includes(searchLower) ||
        record.id.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Risk filter
      if (filterUrgency === 'All') return true;
      const riskCategory = getRiskCategory(record.aiResponse);
      return riskCategory === filterUrgency;
    });
  }, [searchTerm, filterUrgency, sortedData]);

  // Delete handlers
  const promptDelete = (record: PatientRecord) => {
    setRecordToDelete(record);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      const success = await deletePatientRecord(recordToDelete.id);
      if (success) {
        await fetchAllRecords();
      } else {
        setError('فشل حذف السجل من قاعدة البيانات.');
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
      setError('حدث خطأ أثناء حذف السجل.');
    } finally {
      setRecordToDelete(null);
    }
  };

  const toggleDetails = (recordId: string) => {
    setExpandedRecordId(prevId => (prevId === recordId ? null : recordId));
  };

  // CSV Export
  const downloadCSV = () => {
    const csvContent = generateCSV(filteredData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Patient_Records_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Access control
  if (user?.role !== Role.Admin) {
    return (
      <div className="max-w-2xl mx-auto mt-20">
        <Card className="border-t-4 border-red-500">
          <div className="text-center space-y-4">
            <span className="text-6xl">🚫</span>
            <h2 className="text-2xl font-bold text-red-600">غير مصرح بالدخول</h2>
            <p className="text-gray-600">هذه الصفحة مخصصة للمسؤولين فقط.</p>
            <BackButton navigate={navigate} />
          </div>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="جارِ تحميل سجلات المسؤول..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <BackButton navigate={navigate} />

      {/* Header */}
      <Card className="border-t-4 border-brand-pink-dark">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-pink-dark flex items-center gap-3">
              <span className="text-4xl">👑</span>
              لوحة تحكم المسؤول
            </h1>
            <p className="text-gray-600 mt-1">
              إدارة شاملة لجميع سجلات المرضى
            </p>
          </div>
          <button
            onClick={fetchAllRecords}
            className="px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink-dark transition-colors"
          >
            🔄 تحديث
          </button>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-300 bg-red-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-red-800 font-semibold flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </Card>
      )}

      {/* Statistics */}
      <Statistics records={records} />

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              id="search"
              label="بحث (الاسم، المعرف، أو رقم السجل)"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في السجلات..."
            />
          </div>

          <div>
            <label htmlFor="filter" className="block text-right text-sm font-semibold text-brand-gray-dark mb-2">
              تصفية حسب مستوى الخطورة
            </label>
            <select
              id="filter"
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value as RiskCategory)}
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink transition-all"
            >
              <option value="All">الكل ({records.length})</option>
              <option value="High">عالي الخطورة</option>
              <option value="Medium">متوسط الخطورة</option>
              <option value="Low">منخفض الخطورة</option>
              <option value="Normal">طبيعي</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            عرض <strong>{filteredData.length}</strong> من أصل <strong>{records.length}</strong> سجل
          </p>
          <button
            onClick={downloadCSV}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-5 h-5" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </Card>

      {/* Records Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gradient-to-r from-brand-pink-light to-purple-100 sticky top-0">
              <tr>
                <th className="py-4 px-6 border-b font-semibold text-brand-gray-dark">التاريخ</th>
                <th className="py-4 px-6 border-b font-semibold text-brand-gray-dark">المريضة</th>
                <th className="py-4 px-6 border-b font-semibold text-brand-gray-dark">مستوى الخطورة</th>
                <th className="py-4 px-6 border-b font-semibold text-brand-gray-dark">الملخص</th>
                <th className="py-4 px-6 border-b font-semibold text-brand-gray-dark text-center">التفاصيل</th>
                <th className="py-4 px-6 border-b font-semibold text-brand-gray-dark text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((record) => {
                const riskDisplay = getRiskDisplay(record.aiResponse);
                const isExpanded = expandedRecordId === record.id;

                return (
                  <React.Fragment key={record.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 border-b whitespace-nowrap text-sm">
                        {record.timestamp.toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6 border-b">
                        <div>
                          <p className="font-semibold">{record.personalInfo.name}</p>
                          <p className="text-xs text-gray-500">{record.personalInfo.age} سنة</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 border-b">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border-2 ${riskDisplay.className}`}>
                          <span>{riskDisplay.icon}</span>
                          <span>{riskDisplay.text}</span>
                          <span className="text-xs">{riskDisplay.scoreText}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 border-b max-w-md">
                        <p className="line-clamp-2 text-sm">{record.aiResponse?.brief_summary || 'لا يوجد ملخص'}</p>
                      </td>
                      <td className="py-4 px-6 border-b text-center">
                        <button
                          onClick={() => toggleDetails(record.id)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          aria-label={isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                        >
                          <ChevronDownIcon
                            className={`w-6 h-6 text-brand-pink transition-transform duration-300 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-4 px-6 border-b text-center">
                        <button
                          onClick={() => promptDelete(record)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          aria-label={`حذف سجل ${record.personalInfo.name}`}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-0 border-b">
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Detailed AI Report */}
                              <div className="lg:col-span-2">
                                <h4 className="font-bold text-lg text-brand-pink-dark mb-3 flex items-center gap-2">
                                  <span>🤖</span> التقرير المفصل من الذكاء الاصطناعي
                                </h4>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                  <p className="whitespace-pre-wrap leading-relaxed">
                                    {record.aiResponse?.detailed_report || 'لا يوجد تقرير مفصل'}
                                  </p>
                                </div>
                              </div>

                              {/* Personal & Measurement Data */}
                              <div>
                                <h4 className="font-bold text-lg text-brand-pink-dark mb-3 flex items-center gap-2">
                                  <span>👤</span> البيانات الشخصية والقياسات
                                </h4>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-2 text-sm">
                                  <p><strong>تاريخ الحمل:</strong> G{record.pregnancyHistory.g} P{record.pregnancyHistory.p} A{record.pregnancyHistory.a}</p>
                                  <p><strong>الطول:</strong> {record.measurementData.height} سم</p>
                                  <p><strong>الوزن قبل الحمل:</strong> {record.measurementData.prePregnancyWeight} كجم</p>
                                  <p><strong>الوزن الحالي:</strong> {record.measurementData.currentWeight} كجم</p>
                                  <p><strong>BMI قبل الحمل:</strong> {(record.measurementData.prePregnancyWeight / Math.pow(record.measurementData.height / 100, 2)).toFixed(1)}</p>
                                </div>
                              </div>

                              {/* Symptoms */}
                              <div>
                                <h4 className="font-bold text-lg text-brand-pink-dark mb-3 flex items-center gap-2">
                                  <span>🩺</span> الأعراض المسجلة
                                </h4>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-1 text-sm">
                                  {[
                                    { key: 'headache', label: 'صداع' },
                                    { key: 'visionChanges', label: 'تغيرات الرؤية' },
                                    { key: 'upperAbdominalPain', label: 'ألم البطن العلوي' },
                                    { key: 'swelling', label: 'تورم' },
                                    { key: 'excessiveThirst', label: 'عطش مفرط' },
                                    { key: 'frequentUrination', label: 'تبول متكرر' },
                                    { key: 'fatigue', label: 'تعب' },
                                    { key: 'dizziness', label: 'دوخة' },
                                    { key: 'shortnessOfBreath', label: 'ضيق تنفس' }
                                  ].map(({ key, label }) => (
                                    <p key={key}>
                                      <strong>{label}:</strong>{' '}
                                      <span className={record.symptoms?.[key as keyof SymptomsPayload] ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                                        {record.symptoms?.[key as keyof SymptomsPayload] ? '✓ نعم' : '✗ لا'}
                                      </span>
                                    </p>
                                  ))}
                                  {record.symptoms?.otherSymptoms && (
                                    <p><strong>أعراض أخرى:</strong> {record.symptoms.otherSymptoms}</p>
                                  )}
                                </div>
                              </div>

                              {/* Lab Results */}
                              <div>
                                <h4 className="font-bold text-lg text-brand-pink-dark mb-3 flex items-center gap-2">
                                  <span>🧪</span> التحاليل المخبرية
                                </h4>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-2 text-sm">
                                  <p><strong>ضغط الدم:</strong> {record.labResults?.systolicBp}/{record.labResults?.diastolicBp} mmHg</p>
                                  <p><strong>سكر الدم (صائم):</strong> {record.labResults?.fastingGlucose || 'N/A'} mg/dL</p>
                                  <p><strong>الهيموجلوبين:</strong> {record.labResults?.hb || 'N/A'} g/dL</p>
                                </div>
                              </div>
                              {/* Risk Scores Detail - WITH ANTEPARTUM */}
                              <div>
                                <h4 className="font-bold text-lg text-brand-pink-dark mb-3 flex items-center gap-2">
                                  <span>📈</span> تفاصيل مستوى الخطورة
                                </h4>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-2 text-sm">
                                  {record.aiResponse?.riskScores ? (
                                    <>
                                      <p><strong>الخطورة العامة:</strong> <span className="font-bold text-brand-pink">{(record.aiResponse.riskScores.overallRisk * 100).toFixed(1)}%</span></p>
                                      <p><strong>خطر تسمم الحمل:</strong> <span className="font-bold text-red-600">{(record.aiResponse.riskScores.preeclampsiaRisk * 100).toFixed(1)}%</span></p>
                                      <p><strong>خطر سكري الحمل:</strong> <span className="font-bold text-yellow-600">{(record.aiResponse.riskScores.gdmRisk * 100).toFixed(1)}%</span></p>
                                      <p><strong>خطر الأنيميا:</strong> <span className="font-bold text-blue-600">{(record.aiResponse.riskScores.anemiaRisk * 100).toFixed(1)}%</span></p>
                                      {(record.aiResponse.riskScores as any).antepartumScore !== undefined && (
                                        <>
                                          <hr className="my-2" />
                                          <p><strong>نقاط Antepartum:</strong> <span className="font-bold text-purple-600">{(record.aiResponse.riskScores as any).antepartumScore}</span></p>
                                          <p><strong>مستوى خطر Antepartum:</strong> <span className="font-bold text-purple-600">{(record.aiResponse.riskScores as any).antepartumRiskLevel || 'N/A'}</span></p>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-gray-500">لا توجد بيانات تفصيلية للخطورة</p>
                                  )}
                                </div>
                              </div>

                              {/* OCR Text */}
                              {record.ocrText && (
                                <div className="lg:col-span-2">
                                  <h4 className="font-bold text-lg text-brand-pink-dark mb-3 flex items-center gap-2">
                                    <span>📄</span> النص المستخرج من الصورة (OCR)
                                  </h4>
                                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{record.ocrText}</p>
                                  </div>
                                </div>
                              )}

                              {/* Metadata */}
                              <div className="lg:col-span-2">
                                <h4 className="font-bold text-lg text-brand-pink-dark mb-3 flex items-center gap-2">
                                  <span>ℹ️</span> معلومات إضافية
                                </h4>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-500 text-xs">رقم السجل</p>
                                    <p className="font-mono text-xs break-all">{record.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-xs">معرف المستخدم</p>
                                    <p className="font-mono text-xs break-all">{record.userId}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-xs">تشخيص معروف؟</p>
                                    <p className={`font-semibold ${record.knownDiagnosis ? 'text-orange-600' : 'text-green-600'}`}>
                                      {record.knownDiagnosis ? 'نعم' : 'لا'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-xs">تاريخ الإنشاء</p>
                                    <p className="text-xs">{record.timestamp.toLocaleString('ar-EG')}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🔍</span>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              لا توجد سجلات
            </h3>
            <p className="text-gray-500">
              {searchTerm || filterUrgency !== 'All'
                ? 'لم يتم العثور على سجلات تطابق معايير البحث'
                : 'لا توجد سجلات مرضى حتى الآن'}
            </p>
            {(searchTerm || filterUrgency !== 'All') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterUrgency('All');
                }}
                className="mt-4 px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink-dark transition-colors"
              >
                إعادة تعيين الفلاتر
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        confirmText="نعم، احذف السجل"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-red-800">
                هل أنت متأكد من حذف سجل المريضة "{recordToDelete?.personalInfo.name}"؟
              </p>
              <p className="text-sm text-red-600 mt-1">
                لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
          </div>

          {recordToDelete && (
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>رقم السجل:</strong> {recordToDelete.id}</p>
              <p><strong>التاريخ:</strong> {recordToDelete.timestamp.toLocaleDateString('ar-EG')}</p>
              <p><strong>مستوى الخطورة:</strong> {getRiskDisplay(recordToDelete.aiResponse).text}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Help Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300">
        <div className="flex items-start gap-4">
          <span className="text-4xl">💡</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-brand-pink-dark mb-2">نصائح للاستخدام</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>استخدم البحث للعثور بسرعة على سجلات محددة</li>
              <li>قم بتصفية السجلات حسب مستوى الخطورة لتحديد الحالات الحرجة</li>
              <li>اضغط على السهم لعرض تفاصيل كاملة لأي سجل</li>
              <li>استخدم زر التصدير لحفظ البيانات في ملف Excel</li>
              <li>احذف السجلات القديمة أو غير الصحيحة بحذر</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;

                            
    
