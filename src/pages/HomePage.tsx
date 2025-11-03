import React, { useState, useEffect } from 'react';
import { Page, Role, PatientRecord } from '../types';
import Button from '../components/Button';
import Card from '../components/Card';
import { useUser } from '../hooks/useUser';
import { getPatientRecordsByUserId } from '../services/mockDB'; 
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
    const { user } = useUser();
    const [latestRecord, setLatestRecord] = useState<PatientRecord | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    // دالة جلب آخر سجل للمستخدم
    const fetchLatestRecord = async () => {
        if (user?.id && user.role === Role.Patient) {
            setIsLoading(true);
            try {
                const records = await getPatientRecordsByUserId(user.id);
                setLatestRecord(records[0]); 
            } catch (error) {
                console.error("Error fetching latest record:", error);
                setLatestRecord(undefined);
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLatestRecord();
    }, [user?.id]); 

    // -----------------------------------------------------------------
    // 🚨 التعديل الحاسم: الاعتماد على الاسم من Context أولاً، ثم UID
    // -----------------------------------------------------------------
    const welcomeName = user?.name || latestRecord?.personalInfo.name || user?.id;
    // -----------------------------------------------------------------
    
    const tools = [
        { name: "التقييم الشامل", page: Page.Assessment, icon: "📝" },
        { name: "المساعد الذكي (شات)", page: Page.Chatbot, icon: "💬" },
        { name: "لوحة المتابعة الصحية", page: Page.Dashboard, icon: "📊" },
        { name: "عداد حركة الجنين", page: Page.FetalMovement, icon: "👣" },
        { name: "الدليل الأسبوعي", page: Page.WeeklyGuide, icon: "📅" },
    ];
    
    if (user?.role === Role.Admin) {
        tools.push({ name: "لوحة تحكم المسؤول", page: Page.AdminDashboard, icon: "👑" });
    }

    if (isLoading) {
        return (
            <div className="pt-20">
                <LoadingSpinner message="جارِ تحميل بياناتك..." />
            </div>
        );
    }


    return (
        <div className="space-y-8">
            <div className="text-center">
                {/* 🚨 عرض الاسم المحفوظ أو الـ UID إذا لم يتم إدخال الاسم */}
                <h1 className="text-4xl font-bold text-brand-pink-dark">أهلاً بكِ، {welcomeName}!</h1>
                <p className="text-lg text-brand-gray-dark mt-2">نحن هنا لدعمك في كل خطوة من رحلتكِ</p>
            </div>

            {user?.role === Role.Patient && latestRecord && (
                <Card title="آخر تقييم لصحتك" className="border-t-4 border-brand-pink">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-right">
                           <p className="text-sm text-gray-500">تاريخ التقييم: {latestRecord.timestamp.toLocaleDateString('ar-EG')}</p>
                           <p className="text-lg mt-2">{latestRecord.aiResponse.brief_summary}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <p className="font-semibold">مستوى الأهمية</p>
                                <span className={`px-3 py-1 rounded-full text-md font-semibold ${
                                    latestRecord.aiResponse.urgency === 'High' ? 'bg-red-200 text-red-800' :
                                    latestRecord.aiResponse.urgency === 'Medium' ? 'bg-yellow-200 text-yellow-800' :
                                    latestRecord.aiResponse.urgency === 'Low' ? 'bg-blue-200 text-blue-800' : 'bg-green-200 text-green-800'
                                }`}>
                                    {latestRecord.aiResponse.urgency === 'High' ? 'عالي' : latestRecord.aiResponse.urgency === 'Medium' ? 'متوسط' : latestRecord.aiResponse.urgency === 'Low' ? 'منخفض' : 'طبيعي'}
                                </span>
                            </div>
                            <Button onClick={() => navigate(Page.Dashboard)}>عرض التفاصيل</Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map((tool) => (
                    <Card key={tool.name} className="flex flex-col items-center justify-center p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <div className="text-6xl mb-4">{tool.icon}</div>
                        <h2 className="text-2xl font-semibold text-brand-gray-dark mb-4">{tool.name}</h2>
                        <Button onClick={() => navigate(tool.page)}>
                            إبدأ الآن
                        </Button>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default HomePage;
