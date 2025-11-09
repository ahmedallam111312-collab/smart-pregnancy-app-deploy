import React, { useState, useMemo, useEffect, useCallback } from 'react';
// 🚨 استيراد الأنواع المحدثة
import { Page, PatientRecord, Role, RiskScores, SymptomsPayload } from '../types';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import { useUser } from '../hooks/useUser';
import Input from '../components/Input';
// 🚨 (النقطة 7) استيراد الدالة الصحيحة لجلب كل السجلات
import { deletePatientRecord, getAllPatientRecordsForAdmin } from '../services/mockDB'; 
import TrashIcon from '../components/icons/TrashIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import DownloadIcon from '../components/icons/DownloadIcon';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';

// -----------------------------------------------------------------
// 🚨 (النقطة 7) دوال مساعدة لترجمة السكور الجديد
// -----------------------------------------------------------------
const getRiskDisplay = (aiResponse: AIResponse | undefined) => {
    // التحقق من وجود 'aiResponse'
    if (!aiResponse) {
        return { text: 'N/A', className: 'bg-gray-200 text-gray-800' };
    }
    
    // 1. التحقق من النظام الجديد (riskScores)
    if (aiResponse.riskScores) {
        const score = aiResponse.riskScores.overallRisk;
        if (score >= 0.75) return { text: 'عالي', className: 'bg-red-200 text-red-800', scoreText: `(${(score * 100).toFixed(0)}%)` };
        if (score >= 0.5) return { text: 'متوسط', className: 'bg-yellow-200 text-yellow-800', scoreText: `(${(score * 100).toFixed(0)}%)` };
        if (score >= 0.25) return { text: 'منخفض', className: 'bg-blue-200 text-blue-800', scoreText: `(${(score * 100).toFixed(0)}%)` };
        return { text: 'طبيعي', className: 'bg-green-200 text-green-800', scoreText: `(${(score * 100).toFixed(0)}%)` };
    }
    
    // 2. التحقق من النظام القديم (urgency) - (as any) للتوافق
    if ((aiResponse as any).urgency) {
        const urgency = (aiResponse as any).urgency;
        if (urgency === 'High') return { text: 'عالي (قديم)', className: 'bg-red-200 text-red-800', scoreText: '' };
        if (urgency === 'Medium') return { text: 'متوسط (قديم)', className: 'bg-yellow-200 text-yellow-800', scoreText: '' };
        if (urgency === 'Low') return { text: 'منخفض (قديم)', className: 'bg-blue-200 text-blue-800', scoreText: '' };
        return { text: 'طبيعي (قديم)', className: 'bg-green-200 text-green-800', scoreText: '' };
    }

    // 3. حالة الطوارئ
    return { text: 'N/A', className: 'bg-gray-200 text-gray-800', scoreText: '' };
};

// دالة للفلترة (إنجليزي)
const getRiskCategory = (aiResponse: AIResponse | undefined) => {
    if (!aiResponse) return 'All';
    
    if (aiResponse.riskScores) {
        const score = aiResponse.riskScores.overallRisk;
        if (score >= 0.75) return 'High';
        if (score >= 0.5) return 'Medium';
        if (score >= 0.25) return 'Low';
        return 'Normal';
    }
    if ((aiResponse as any).urgency) {
        return (aiResponse as any).urgency; 
    }
    return 'All';
};
// -----------------------------------------------------------------


const AdminDashboardPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { user } = useUser();
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('All'); 
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<PatientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. تحميل البيانات من Firestore باستخدام الدالة الجديدة
  const fetchAllRecords = useCallback(async () => {
    if (user?.role === Role.Admin) {
        setIsLoading(true);
        try {
            const allRecords = await getAllPatientRecordsForAdmin(); 
            setRecords(allRecords);
        } catch (error) {
            console.error("Error fetching admin records:", error);
        } finally {
            setIsLoading(false);
        }
    }
  }, [user?.role]);
  
  useEffect(() => {
    if(user?.role === Role.Admin) {
        fetchAllRecords();
    } else {
        setIsLoading(false);
    }
  }, [fetchAllRecords, user?.role]);

  const sortedData = useMemo(() => {
    return [...records].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [records]);

  // 🚨 (النقطة 7) تعديل منطق الفلترة ليعمل مع السكور
  const filteredData = useMemo(() => {
    return sortedData
      .filter(record => {
        const searchLower = searchTerm.toLowerCase();
        return (
          record.personalInfo.name.toLowerCase().includes(searchLower) ||
          record.userId.toLowerCase().includes(searchLower)
        );
      })
      .filter(record => {
        if (filterUrgency === 'All') return true;
        const riskCategory = getRiskCategory(record.aiResponse);
        return riskCategory === filterUrgency;
      });
  }, [searchTerm, filterUrgency, sortedData]);
  
  const promptDelete = (record: PatientRecord) => {
    setRecordToDelete(record);
  };

  const confirmDelete = async () => {
    if (recordToDelete) {
        try {
            const success = await deletePatientRecord(recordToDelete.id); 
            if (success) {
                await fetchAllRecords(); 
            } else {
                console.error("Failed to delete record from Firestore."); 
            }
        } catch (error) {
            console.error("Failed to delete record:", error);
        } finally {
            setRecordToDelete(null);
        }
    }
  };

  const toggleDetails = (recordId: string) => {
    setExpandedRecordId(prevId => (prevId === recordId ? null : recordId));
  };
  
  // 🚨 (النقطة 4) تعديل دالة تصدير الإكسيل
  const downloadCSV = () => {
    const headers = [
      "ID", "UserID", "Timestamp", "Name", "Age",
      "G", "P", "A", "Height", "Pre-Pregnancy Weight", "Current Weight",
      // (النقطة 1) تعديل الأعراض لتطابق الهيكل الجديد
      "Headache", "Vision Changes", "Upper Abdominal Pain", "Swelling",
      "Excessive Thirst", "Frequent Urination",
      "Fatigue", "Dizziness", "Shortness of Breath", "Other Symptoms",
      "Systolic BP", "Diastolic BP", "Fasting Glucose", "Hb",
      // (النقطة 7) تعديل السكور
      "Overall Risk (0-1)", "Preeclampsia Risk (0-1)", "GDM Risk (0-1)", "Anemia Risk (0-1)",
      "AI Brief Summary", "AI Detailed Report", "Known Diagnosis"
    ];
    
    const rows = filteredData.map(rec => {
        // التحقق من وجود الهياكل قبل تصديرها
        const symptoms = rec.symptoms || {} as SymptomsPayload;
        const labs = rec.labResults || {};
        const riskScores = rec.aiResponse.riskScores || {} as RiskScores;
        const aiResponse = rec.aiResponse || {};

        return [
          rec.id, rec.userId, rec.timestamp.toISOString(), rec.personalInfo.name, rec.personalInfo.age,
          rec.pregnancyHistory.g, rec.pregnancyHistory.p, rec.pregnancyHistory.a,
          rec.measurementData.height, rec.measurementData.prePregnancyWeight, rec.measurementData.currentWeight,
          symptoms.headache, symptoms.visionChanges, symptoms.upperAbdominalPain, symptoms.swelling,
          symptoms.excessiveThirst, symptoms.frequentUrination,
          symptoms.fatigue, symptoms.dizziness, symptoms.shortnessOfBreath,
          `"${(symptoms.otherSymptoms || '').replace(/"/g, '""')}"`,
          labs.systolicBp ?? '', labs.diastolicBp ?? '', labs.fastingGlucose ?? '', labs.hb ?? '',
          riskScores.overallRisk ?? '',
          riskScores.preeclampsiaRisk ?? '',
          riskScores.gdmRisk ?? '',
          riskScores.anemiaRisk ?? '',
          `"${(aiResponse.brief_summary || '').replace(/"/g, '""')}"`, `"${(aiResponse.detailed_report || '').replace(/"/g, '""')}"`,
          rec.knownDiagnosis ? 'Yes' : 'No'
        ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "All_Patient_Records.csv"); // (النقطة 4) تغيير الاسم
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (user?.role !== Role.Admin) {
    return (
      <Card>
        <div className="text-center text-red-600">
          <h2 className="text-2xl font-bold">غير مصرح بالدخول</h2>
          <p>هذه الصفحة مخصصة للمسؤولين فقط.</p>
          <BackButton navigate={navigate} />
        </div>
      </Card>
    );
  }
  
  if (isLoading) {
      return (
          <div className="pt-10">
              <LoadingSpinner message="جارِ تحميل سجلات المسؤول..." />
          </div>
      );
  }

  return (
    <div>
      <BackButton navigate={navigate} />
      <Card title="لوحة تحكم المسؤول" className="overflow-x-auto">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input 
            id="search" 
            label="بحث بالاسم أو المعرف" 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.g.value)}
            className="flex-grow"
          />
          <div className="flex-grow">
            <label htmlFor="filter" className="block text-right text-md font-medium text-brand-gray-dark mb-2">
              تصفية حسب الأهمية
            </label>
            {/* (النقطة 7) الفلتر الآن يستخدم الفئات الجديدة */}
            <select
                id="filter"
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
            >
              <option value="All">الكل</option>
              <option value="High">عالي</option>
              <option value="Medium">متوسط</option>
              <option value="Low">منخفض</option>
              <option value="Normal">طبيعي</option>
            </select>
          </div>
            <div className="flex-shrink-0 self-end">
             {/* (النقطة 4) زر تحميل الإكسيل */}
             <button onClick={downloadCSV} className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors">
                <DownloadIcon className="w-5 h-5" />
                <span>تحميل كـ CSV</span>
            </button>
            </div>
        </div>

        <div className="w-full overflow-x-auto">
            <table className="min-w-full bg-white text-right">
            <thead className="bg-brand-pink-light">
                <tr>
                  <th className="py-3 px-4 border-b">التاريخ</th>
                  <th className="py-3 px-4 border-b">اسم المريضة</th>
                  <th className="py-3 px-4 border-b">الأهمية</th>
                  <th className="py-3 px-4 border-b">الملخص</th>
                  <th className="py-3 px-4 border-b text-center">التفاصيل</th>
                  <th className="py-3 px-4 border-b text-center">الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                {filteredData.map(record => {
                    // (النقطة 7) حساب العرض
                    const riskDisplay = getRiskDisplay(record.aiResponse);
                    
                    return (
                    <React.Fragment key={record.id}>
                      <tr className="hover:bg-gray-50">
                          <td className="py-3 px-4 border-b whitespace-nowrap">{record.timestamp.toLocaleDateString('ar-EG')}</td>
                          <td className="py-3 px-4 border-b whitespace-nowrap">{record.personalInfo.name} ({record.personalInfo.age} سنة)</td>
                          
                          {/* 🚨 (النقطة 7) عرض السكور الجديد */}
                          <td className="py-3 px-4 border-b">
                              <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                                  riskDisplay.className
                              }`}>
                                  {riskDisplay.text} {riskDisplay.scoreText}
                              </span>
                          </td>
                          
                          <td className="py-3 px-4 border-b max-w-xs truncate">{record.aiResponse.brief_summary}</td>
                          <td className="py-3 px-4 border-b text-center">
                              <button onClick={() => toggleDetails(record.id)} className="text-brand-pink hover:text-brand-pink-dark transition-colors">
                                  <ChevronDownIcon className={`w-6 h-6 transition-transform ${expandedRecordId === record.id ? 'rotate-180' : ''}`} />
                              </button>
                          </td>
                          <td className="py-3 px-4 border-b text-center whitespace-nowrap">
                              <button 
                                  onClick={() => promptDelete(record)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                  aria-label={`حذف سجل ${record.personalInfo.name}`}
                              >
                                  <TrashIcon className="w-5 h-5" />
                              </button>
                          </td>
                      </tr>
                      {expandedRecordId === record.id && (
                          <tr>
                            <td colSpan={6} className="p-0 border-b">
                              <div className="bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  <div className="lg:col-span-3">
                                      <h4 className="font-bold text-brand-pink-dark">التقرير المفصل من AI</h4>
                                      <p className="whitespace-pre-wrap bg-white p-2 rounded mt-1">{record.aiResponse.detailed_report}</p>
                                  </div>
                                  <div className="space-y-1">
                                      <h4 className="font-bold text-brand-pink-dark">البيانات الشخصية والقياسات</h4>
                                      <p><strong>تاريخ الحمل:</strong> G: {record.pregnancyHistory.g}, P: {record.pregnancyHistory.p}, A: {record.pregnancyHistory.a}</p>
                                      <p><strong>الطول:</strong> {record.measurementData.height} سم</p>
                                      <p><strong>الوزن قبل الحمل:</strong> {record.measurementData.prePregnancyWeight} كجم</p>
                                      <p><strong>الوزن الحالي:</strong> {record.measurementData.currentWeight} كجم</p>
                                  </div>
                                   <div className="space-y-1">
                                      <h4 className="font-bold text-brand-pink-dark">الأعراض المسجلة</h4>
                                      {/* (النقطة 1) عرض الأعراض الجديدة */}
                                      <p><strong>صداع:</strong> {record.symptoms.headache ? 'نعم' : 'لا'}</p>
                                      <p><strong>تغيرات الرؤية:</strong> {record.symptoms.visionChanges ? 'نعم' : 'لا'}</p>
                                      <p><strong>ألم البطن:</strong> {record.symptoms.upperAbdominalPain ? 'نعم' : 'لا'}</p>
                                      <p><strong>تورم:</strong> {record.symptoms.swelling ? 'نعم' : 'لا'}</p>
                                      <p><strong>عطش:</strong> {record.symptoms.excessiveThirst ? 'نعم' : 'لا'}</p>
                                      <p><strong>تبول متكرر:</strong> {record.symptoms.frequentUrination ? 'نعم' : 'لا'}</p>
                                      <p><strong>تعب:</strong> {record.symptoms.fatigue ? 'نعم' : 'لا'}</p>
                                      <p><strong>دوخة:</strong> {record.symptoms.dizziness ? 'نعم' : 'لا'}</p>
                                      <p><strong>ضيق تنفس:</strong> {record.symptoms.shortnessOfBreath ? 'نعم' : 'لا'}</p>
                                      <p><strong>أعراض أخرى:</strong> {record.symptoms.otherSymptoms || 'لا يوجد'}</p>
                                   </div>
                                   <div className="space-y-1">
                                      <h4 className="font-bold text-brand-pink-dark">التحاليل المخبرية</h4>
                                      <p><strong>ضغط الدم:</strong> {record.labResults.systolicBp}/{record.labResults.diastolicBp}</p>
                                      <p><strong>سكر الدم (صائم):</strong> {record.labResults.fastingGlucose}</p>
                                      <p><strong>الهيموجلوبين (Hb):</strong> {record.labResults.hb}</p>
                                   </div>
                                   {/* (النقطة 7) عرض السكور التفصيلي */}
                                   <div className="lg:col-span-3">
                                       <h4 className="font-bold text-brand-pink-dark">تفاصيل الخطورة (للمسؤول)</h4>
                                       <pre className="bg-white p-2 rounded mt-1 text-left" dir="ltr">
                                          {JSON.stringify(record.aiResponse.riskScores, null, 2)}
                                       </pre>
                                   </div>
                                   {record.ocrText && (
                                       <div className="lg:col-span-3">
                                            <h4 className="font-bold text-brand-pink-dark">النص المستخرج من الصورة (OCR)</h4>
                                            <p className="whitespace-pre-wrap bg-white p-2 rounded mt-1">{record.ocrText}</p>
                                       </div>
                                   )}
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
        {filteredData.length === 0 && (
            <p className="text-center text-gray-500 mt-6">لا توجد سجلات تطابق معايير البحث.</p>
        )}
      </Card>
      
      <Modal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        confirmText="نعم، احذف السجل"
      >
        <p>هل أنت متأكد من رغبتك في حذف سجل المريضة "{recordToDelete?.personalInfo.name}"؟</p>
        <p className="mt-2 text-sm text-red-600">لا يمكن التراجع عن هذا الإجراء.</p>
      </Modal>

    </div>
  );
};

export default AdminDashboardPage;