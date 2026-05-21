import React, { FC } from 'react';
import { PatientRecord } from '../types';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [key: string]: any;
        }
    }
}

interface MedicalReportProps {
    record: PatientRecord;
}

const MedicalReport: React.FC<MedicalReportProps> = ({ record }) => {
    const { personalInfo, measurementData, labResults, aiResponse, timestamp } = record;

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto print:p-0 print:max-w-none text-right" dir="rtl">
            {/* Header */}
            <div className="border-b-2 border-gray-800 pb-6 mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">تقرير التقييم الطبي للحمل</h1>
                    <p className="text-gray-600 mt-2">Smart Pregnancy Assistant - AI Screening Report</p>
                </div>
                <div className="text-left">
                    <p className="text-sm text-gray-500">Date / التاريخ</p>
                    <p className="font-mono font-bold">{timestamp.toLocaleDateString('en-GB')}</p>
                    <p className="text-sm text-gray-500 mt-2">ID / الرقم المرجعي</p>
                    <p className="font-mono text-xs">{record.id.slice(0, 8)}</p>
                </div>
            </div>

            {/* Patient Info Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded-lg print:bg-transparent print:p-0 print:border print:border-gray-200">
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">بيانات المريضة</h3>
                    <p className="font-bold text-lg">{personalInfo.name}</p>
                    <p>العمر: {personalInfo.age} سنة</p>
                    <p>أسبوع الحمل: {personalInfo.pregnancyWeek || 'غير محدد'}</p>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">القياسات الحيوية</h3>
                    <p>الوزن: {measurementData.currentWeight} كجم</p>
                    <p>الطول: {measurementData.height} سم</p>
                    <p>ضغط الدم: {labResults.systolicBp}/{labResults.diastolicBp} mmHg</p>
                </div>
            </div>

            {/* Risk Assessment Section */}
            <div className="mb-8">
                <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 flex items-center gap-2">
                    <span>📊</span>
                    تقييم المخاطر (Risk Assessment)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <RiskBox
                        label="تسمم الحمل (Preeclampsia)"
                        score={aiResponse.riskScores.preeclampsiaRisk}
                    />
                    <RiskBox
                        label="سكري الحمل (GDM)"
                        score={aiResponse.riskScores.gdmRisk}
                    />
                    <RiskBox
                        label="فقر الدم (Anemia)"
                        score={aiResponse.riskScores.anemiaRisk}
                    />
                </div>
            </div>

            {/* AI Analysis Content */}
            <div className="mb-8">
                <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 flex items-center gap-2">
                    <span>📝</span>
                    التقرير الطبي والتوصيات
                </h2>
                <div className="prose max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {aiResponse.detailed_report}
                </div>
            </div>
            {/* ICD-11 Codes Section */}
            {aiResponse.icd11_codes && aiResponse.icd11_codes.length > 0 && (
                <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h2 className="text-xl font-bold border-b border-blue-300 pb-2 mb-4 flex items-center gap-2 text-blue-900">
                        <span>🏷️</span>
                        تصنيف الأمراض (ICD-11 WHO)
                    </h2>
                    <ul className="list-disc list-inside space-y-2">
                        {aiResponse.icd11_codes.map((item, index) => (
                            <li key={index} className="text-gray-800 flex items-center flex-wrap gap-2">
                                <span className="font-mono font-bold text-blue-700 bg-white px-2 py-1 rounded border border-blue-300">
                                    {item.code}
                                </span>
                                <span>{item.diagnosis}</span>
                                {item.isWhoValidated && (
                                    <span className="text-xs bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span>✅</span>
                                        معتمد من منظمة الصحة العالمية (WHO)
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Footer / Disclaimer */}
            <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
                <p className="font-bold text-red-600 mb-1">⚠️ تنويه طبي هام / Medical Disclaimer</p>
                <p>
                    هذا التقرير تم إنشاؤه بواسطة نظام ذكاء اصطناعي للمساعدة في الفرز الأولي.
                    هذه النتائج لا تعتبر تشخيصاً طبياً نهائياً ولا تغني عن استشارة الطبيب المختص.
                    في حالة وجود أعراض خطيرة، يرجى التوجه لأقرب طوارئ فوراً.
                </p>
                <p className="mt-2 font-mono">Generated by Smart Pregnancy Assistant v1.0</p>
            </div>
        </div>
    );
};

const RiskBox: React.FC<{ label: string; score: number }> = ({ label, score }) => {
    let color = 'bg-green-100 text-green-800 border-green-200';
    let text = 'منخفض / Low';

    if (score >= 0.7) {
        color = 'bg-red-100 text-red-800 border-red-200';
        text = 'عالي / High';
    } else if (score >= 0.4) {
        color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        text = 'متوسط / Moderate';
    }

    return (
        <div className={`p-4 rounded-lg border ${color} print:border-gray-300 print:bg-white print:text-black`}>
            <p className="text-sm font-semibold mb-1">{label}</p>
            <div className="flex justify-between items-end">
                <span className="text-xs font-bold uppercase">{text}</span>
                <span className="text-xl font-bold">{(score * 100).toFixed(0)}%</span>
            </div>
        </div>
    );
};

export default MedicalReport;
