import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Page, Role, PatientRecord } from '../types';
import Button from '../components/Button';
import Card from '../components/Card';
import { useUser } from '../hooks/useUser';
import { getPatientRecordsByUserId } from '../services/mockDB';
import LoadingSpinner from '../components/LoadingSpinner';

// -----------------------------------------------------------------
// Risk Assessment Configuration
// -----------------------------------------------------------------
interface RiskLevel {
    text: string;
    className: string;
    icon: string;
    description: string;
}

const RISK_LEVELS: Record<string, RiskLevel> = {
    high: {
        text: 'عالي',
        className: 'bg-red-100 text-red-800 border-red-300',
        icon: '🚨',
        description: 'يتطلب استشارة طبية عاجلة'
    },
    moderate: {
        text: 'متوسط',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '⚠️',
        description: 'يحتاج إلى متابعة دقيقة'
    },
    low: {
        text: 'منخفض',
        className: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: 'ℹ️',
        description: 'حالة مستقرة مع متابعة منتظمة'
    },
    normal: {
        text: 'طبيعي',
        className: 'bg-green-100 text-green-800 border-green-300',
        icon: '✅',
        description: 'حالة صحية جيدة'
    }
};

const getRiskLevel = (score: number): RiskLevel => {
    if (score >= 0.75) return RISK_LEVELS.high;
    if (score >= 0.5) return RISK_LEVELS.moderate;
    if (score >= 0.25) return RISK_LEVELS.low;
    return RISK_LEVELS.normal;
};

// -----------------------------------------------------------------
// Tool Configuration
// -----------------------------------------------------------------
interface Tool {
    name: string;
    page: Page;
    icon: string;
    description: string;
    roles: Role[];
    featured?: boolean;
}

const TOOLS: Tool[] = [
    {
        name: "التقييم الشامل",
        page: Page.Assessment,
        icon: "📝",
        description: "تقييم شامل لحالتك الصحية",
        roles: [Role.Patient],
        featured: true
    },
    {
        name: "المساعد الذكي",
        page: Page.Chatbot,
        icon: "💬",
        description: "استشارة فورية على مدار الساعة",
        roles: [Role.Patient],
        featured: true
    },
    {
        name: "لوحة المتابعة",
        page: Page.Dashboard,
        icon: "📊",
        description: "تتبع رحلتك الصحية بالكامل",
        roles: [Role.Patient]
    },
    {
        name: "عداد حركة الجنين",
        page: Page.FetalMovement,
        icon: "👣",
        description: "راقبي حركة جنينك بسهولة",
        roles: [Role.Patient]
    },
    {
        name: "الدليل الأسبوعي",
        page: Page.WeeklyGuide,
        icon: "📅",
        description: "معلومات أسبوعية لكل مرحلة",
        roles: [Role.Patient]
    },
    {
        name: "لوحة تحكم المسؤول",
        page: Page.AdminDashboard,
        icon: "👑",
        description: "إدارة شاملة للنظام",
        roles: [Role.Admin]
    }
];

// -----------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------
interface HomePageProps {
    navigate: (page: Page) => void;
}

const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
    const { user } = useUser();
    const [latestRecord, setLatestRecord] = useState<PatientRecord | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch latest patient record
    const fetchLatestRecord = useCallback(async () => {
        if (!user?.id || user.role !== Role.Patient) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const records = await getPatientRecordsByUserId(user.id);
            setLatestRecord(records[0]);
        } catch (err) {
            console.error("Error fetching latest record:", err);
            setError("حدث خطأ أثناء تحميل البيانات");
            setLatestRecord(undefined);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, user?.role]);

    useEffect(() => {
        fetchLatestRecord();
    }, [fetchLatestRecord]);

    // Filtered tools based on user role
    const availableTools = useMemo(() => {
        if (!user?.role) return [];
        return TOOLS.filter(tool => tool.roles.includes(user.role));
    }, [user?.role]);

    // Welcome message
    const welcomeName = useMemo(() => {
        return user?.name || latestRecord?.personalInfo.name || user?.id || 'ضيفنا العزيز';
    }, [user?.name, user?.id, latestRecord?.personalInfo.name]);

    // Risk assessment display
    const riskAssessment = useMemo(() => {
        if (!latestRecord?.aiResponse) return null;

        const { riskScores, urgency } = latestRecord.aiResponse;
        
        if (riskScores?.overallRisk !== undefined) {
            const risk = getRiskLevel(riskScores.overallRisk);
            return {
                level: risk,
                score: riskScores.overallRisk,
                percentage: Math.round(riskScores.overallRisk * 100)
            };
        }

        // Fallback for legacy records
        if (urgency) {
            return {
                level: RISK_LEVELS.normal,
                score: 0,
                percentage: 0,
                legacy: urgency
            };
        }

        return null;
    }, [latestRecord]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center pt-20">
                <LoadingSpinner message="جارِ تحميل بياناتك..." />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Hero Section */}
            <section className="text-center space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-brand-pink-dark">
                    أهلاً بكِ، {welcomeName}!
                </h1>
                <p className="text-lg md:text-xl text-brand-gray-dark max-w-2xl mx-auto">
                    نحن هنا لدعمك في كل خطوة من رحلتكِ نحو أمومة صحية وسعيدة
                </p>
            </section>

            {/* Error State */}
            {error && (
                <Card className="border-red-300 bg-red-50">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                            <p className="text-red-800 font-semibold">{error}</p>
                            <Button
                                onClick={fetchLatestRecord}
                                className="mt-2 bg-red-600 hover:bg-red-700"
                            >
                                إعادة المحاولة
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Latest Assessment Card - Patient Only */}
            {user?.role === Role.Patient && latestRecord && (
                <Card
                    title="آخر تقييم لصحتك"
                    className="border-t-4 border-brand-pink shadow-lg"
                >
                    <div className="space-y-4">
                        {/* Assessment Date */}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-xl">📅</span>
                            <span>
                                تاريخ التقييم:{' '}
                                {latestRecord.timestamp.toLocaleDateString('ar-EG', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>

                        {/* Summary */}
                        <p className="text-base md:text-lg leading-relaxed text-gray-700">
                            {latestRecord.aiResponse.brief_summary}
                        </p>

                        {/* Risk Assessment */}
                        {riskAssessment && (
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                        <span className="text-2xl">{riskAssessment.level.icon}</span>
                                        مستوى الخطورة العام
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {riskAssessment.level.description}
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    {riskAssessment.legacy ? (
                                        <span className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-200 text-gray-800 border-2 border-gray-300">
                                            {riskAssessment.legacy}
                                        </span>
                                    ) : (
                                        <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${riskAssessment.level.className}`}>
                                            {riskAssessment.level.text} ({riskAssessment.percentage}%)
                                        </span>
                                    )}
                                    
                                    <Button
                                        onClick={() => navigate(Page.Dashboard)}
                                        className="whitespace-nowrap"
                                    >
                                        عرض التفاصيل
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* No Assessment CTA - Patient Only */}
            {user?.role === Role.Patient && !latestRecord && !error && (
                <Card className="border-t-4 border-brand-pink-light bg-gradient-to-br from-pink-50 to-purple-50">
                    <div className="text-center space-y-4 py-6">
                        <span className="text-6xl">🌸</span>
                        <h3 className="text-2xl font-bold text-brand-pink-dark">
                            ابدأي رحلتك الصحية معنا
                        </h3>
                        <p className="text-gray-700 max-w-md mx-auto">
                            قومي بإجراء أول تقييم شامل للحصول على متابعة دقيقة لحالتك الصحية
                        </p>
                        <Button
                            onClick={() => navigate(Page.Assessment)}
                            className="text-lg px-8 py-3"
                        >
                            إجراء التقييم الأول
                        </Button>
                    </div>
                </Card>
            )}

            {/* Tools Grid */}
            <section>
                <h2 className="text-2xl md:text-3xl font-bold text-brand-gray-dark mb-6 text-center">
                    الأدوات المتاحة
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableTools.map((tool) => (
                        <Card
                            key={tool.name}
                            className={`
                                group relative overflow-hidden
                                flex flex-col items-center justify-center 
                                p-6 md:p-8 
                                hover:shadow-2xl hover:-translate-y-2 
                                transition-all duration-300 cursor-pointer
                                ${tool.featured ? 'border-2 border-brand-pink' : ''}
                            `}
                            onClick={() => navigate(tool.page)}
                        >
                            {tool.featured && (
                                <div className="absolute top-2 right-2 bg-brand-pink text-white text-xs px-2 py-1 rounded-full font-semibold">
                                    مميز
                                </div>
                            )}
                            
                            <div className="text-6xl md:text-7xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                {tool.icon}
                            </div>
                            
                            <h3 className="text-xl md:text-2xl font-semibold text-brand-gray-dark mb-2 text-center">
                                {tool.name}
                            </h3>
                            
                            <p className="text-sm text-gray-600 text-center mb-4 flex-1">
                                {tool.description}
                            </p>
                            
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(tool.page);
                                }}
                                className="w-full"
                            >
                                ابدأ الآن
                            </Button>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Quick Stats - Patient Only */}
            {user?.role === Role.Patient && latestRecord && (
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="text-center bg-gradient-to-br from-blue-50 to-blue-100">
                        <div className="text-4xl mb-2">📊</div>
                        <p className="text-sm text-gray-600">إجمالي التقييمات</p>
                        <p className="text-3xl font-bold text-blue-600">1+</p>
                    </Card>
                    
                    <Card className="text-center bg-gradient-to-br from-green-50 to-green-100">
                        <div className="text-4xl mb-2">✅</div>
                        <p className="text-sm text-gray-600">الحالة الحالية</p>
                        <p className="text-lg font-bold text-green-600">تحت المتابعة</p>
                    </Card>
                    
                    <Card className="text-center bg-gradient-to-br from-purple-50 to-purple-100">
                        <div className="text-4xl mb-2">💪</div>
                        <p className="text-sm text-gray-600">استمري بالمتابعة</p>
                        <Button
                            onClick={() => navigate(Page.Assessment)}
                            className="mt-2 w-full bg-purple-600 hover:bg-purple-700"
                        >
                            تقييم جديد
                        </Button>
                    </Card>
                </section>
            )}
        </div>
    );
};

export default HomePage;