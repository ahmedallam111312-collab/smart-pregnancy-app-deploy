import React, { useState, useEffect, useCallback } from 'react'; // <--- تم إضافة useState, useEffect, useCallback
import { Page, PatientRecord } from '../types';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useUser } from '../hooks/useUser';
// تم حذف: import { patientRecordsDB } from '../services/mockDB';
// السطر القديم الذي يسبب الإيرور
// import { getPatientRecordsByUserId } from "../services/patientRecordService"; 

// ⬇️ الكود الصحيح: الاستيراد من mockDB
import { getPatientRecordsByUserId } from "../services/mockDB";import LoadingSpinner from '../components/LoadingSpinner'; // <--- نحتاج هذه المكتبة لعرض شاشة تحميل

const DashboardPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { user } = useUser();
  const [userRecords, setUserRecords] = useState<PatientRecord[]>([]); // <--- لحفظ البيانات المُحمّلة
  const [isLoading, setIsLoading] = useState(true); // <--- حالة التحميل

  // 1. جلب البيانات من Firestore عند تسجيل الدخول
  const fetchRecords = useCallback(async () => {
    if (user?.id) {
      setIsLoading(true);
      try {
        // استدعاء دالة جلب البيانات من Firestore
        const records = await getPatientRecordsByUserId(user.id);
        setUserRecords(records); // تحديث الـ state بالبيانات الجديدة
      } catch (error) {
        console.error("Failed to fetch user records:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      setUserRecords([]);
    }
  }, [user?.id]); // يُعاد التنفيذ فقط عند تغيير معرف المستخدم

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);


  // 2. معالجة وتنسيق البيانات للعرض في الرسوم البيانية
  // يتم عمل sort في دالة Firestore، لكن نستخدم map هنا
  const formattedData = userRecords.map(record => ({
    date: record.timestamp.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    weight: record.measurementData.currentWeight,
    systolicBp: record.labResults.systolicBp,
    diastolicBp: record.labResults.diastolicBp,
    glucose: record.labResults.fastingGlucose,
    hb: record.labResults.hb,
  }));
  
  // 3. عرض شاشة التحميل
  if (isLoading) {
    return (
        <div className="pt-10">
            <LoadingSpinner message="جارِ تحميل سجل المتابعة الصحية..." />
        </div>
    );
  }

  // 4. عرض رسالة "لا توجد بيانات"
  if (userRecords.length === 0) {
      return (
          <div>
              <BackButton navigate={navigate} />
              <Card title="لوحة المتابعة الصحية">
                  <div className="text-center text-gray-600 p-8">
                      <p className="text-2xl mb-4">📊</p>
                      <p className="text-xl font-semibold">لا توجد بيانات لعرضها بعد</p>
                      <p>يرجى إكمال تقييم أولاً من خلال أداة "التقييم الشامل" لعرض مخططاتك الصحية.</p>
                  </div>
              </Card>
          </div>
      )
  }

  // 5. عرض الرسوم البيانية
  return (
    <div>
      <BackButton navigate={navigate} />
      <div className="space-y-8">
        <Card title="متابعة الوزن (كجم)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" reversed={true} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="weight" name="الوزن الحالي" stroke="#C71585" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="متابعة ضغط الدم">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" reversed={true} />
              <YAxis domain={[60, 'dataMax + 10']}/>
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="systolicBp" name="الانقباضي" stroke="#FF69B4" strokeWidth={2} />
              <Line type="monotone" dataKey="diastolicBp" name="الانبساطي" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="متابعة سكر الدم والهيموجلوبين">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" reversed={true} />
              <YAxis yAxisId="left" orientation="left" stroke="#00C49F" domain={['dataMin - 5', 'dataMax + 5']} />
              <YAxis yAxisId="right" orientation="right" stroke="#FFBB28" domain={['dataMin - 1', 'dataMax + 1']}/>
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="glucose" name="سكر الدم (صائم)" stroke="#00C49F" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="hb" name="الهيموجلوبين" stroke="#FFBB28" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;