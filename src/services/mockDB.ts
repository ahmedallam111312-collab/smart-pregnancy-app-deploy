import { PatientRecord } from '../types';

// This acts as a simple in-memory database for the application.
export let patientRecordsDB: PatientRecord[] = [
    {
        id: 'rec3', userId: 'patient_123', timestamp: new Date('2023-03-15'),
        personalInfo: { name: 'سارة أحمد', age: 30 },
        pregnancyHistory: { g: 2, p: 1, a: 0 },
        measurementData: { height: 165, prePregnancyWeight: 60, currentWeight: 67 },
        symptoms: { nausea: 'Mild', vomiting: 'None', other: 'تعب عام' },
        labResults: { systolicBp: 121, diastolicBp: 78, fastingGlucose: 91, hb: 10.9 },
        ocrText: '',
        aiResponse: { urgency: 'Low', brief_summary: 'بداية فقر دم بسيط.', detailed_report: '## تقرير مفصل\n\n* الهيموجلوبين منخفض قليلاً عن المعدل الطبيعي لهذه المرحلة من الحمل.\n* ينصح بالتركيز على الأطعمة الغنية بالحديد ومتابعة الطبيب.', extracted_labs: {systolicBp: 121, diastolicBp: 78, fastingGlucose: 91, hb: 10.9} }
    },
    {
        id: 'rec1', userId: 'patient_123', timestamp: new Date('2023-04-15'),
        personalInfo: { name: 'سارة أحمد', age: 30 },
        pregnancyHistory: { g: 2, p: 1, a: 0 },
        measurementData: { height: 165, prePregnancyWeight: 60, currentWeight: 70 },
        symptoms: { nausea: 'None', vomiting: 'None', other: 'صداع خفيف وتورم في القدمين' },
        labResults: { systolicBp: 125, diastolicBp: 82, fastingGlucose: 93, hb: 10.6 },
        ocrText: '',
        aiResponse: { urgency: 'Medium', brief_summary: 'ارتفاع طفيف في ضغط الدم وسكر الدم.', detailed_report: '## تقرير مفصل\n\n* يوجد ارتفاع طفيف في ضغط الدم الانقباضي والانبساطي.\n* مستوى سكر الدم الصائم مرتفع قليلاً عن المعدل الطبيعي.\n\n**التوصيات:**\n* متابعة قياسات ضغط الدم بانتظام.\n* استشارة الطبيب بخصوص قراءات سكر الدم.', extracted_labs: {systolicBp: 125, diastolicBp: 82, fastingGlucose: 93, hb: 10.6} }
    },
    {
        id: 'rec2', userId: 'patient_789', timestamp: new Date('2023-04-16'),
        personalInfo: { name: 'فاطمة علي', age: 28 },
        pregnancyHistory: { g: 1, p: 0, a: 0 },
        measurementData: { height: 160, prePregnancyWeight: 55, currentWeight: 65 },
        symptoms: { nausea: 'None', vomiting: 'None', other: 'لا توجد أعراض' },
        labResults: { systolicBp: 110, diastolicBp: 70, fastingGlucose: 85, hb: 11.5 },
        ocrText: '',
        aiResponse: { urgency: 'Normal', brief_summary: 'الحالة طبيعية ومستقرة.', detailed_report: '## تقرير مفصل\n\nجميع المؤشرات الحيوية ضمن النطاق الطبيعي للحمل. لا توجد أي علامات مقلقة حالياً.', extracted_labs: {systolicBp: 110, diastolicBp: 70, fastingGlucose: 85, hb: 11.5} }
    },
    {
        id: 'rec4', userId: 'patient_xyz', timestamp: new Date('2023-04-18'),
        personalInfo: { name: 'مريم خالد', age: 34 },
        pregnancyHistory: { g: 3, p: 1, a: 1 },
        measurementData: { height: 170, prePregnancyWeight: 70, currentWeight: 82 },
        symptoms: { nausea: 'Moderate', vomiting: 'Mild', other: 'صداع حاد وتشوش في الرؤية' },
        labResults: { systolicBp: 145, diastolicBp: 95, fastingGlucose: 90, hb: 11.2 },
        ocrText: `
        --- LAB RESULTS (IMAGE SCAN) ---
        Date: 2023-04-18
        Patient: Mariam Khaled
        Fasting Blood Sugar: 90 mg/dL
        Hemoglobin (Hb): 11.2 g/dL
        Blood Pressure: 145/95 mmHg
        Notes: Patient reports severe headache.
        `,
        aiResponse: { urgency: 'High', brief_summary: 'اشتباه في تسمم الحمل.', detailed_report: '## تقرير مفصل\n\n**خطر مرتفع!**\n\n* ضغط الدم مرتفع بشكل كبير (145/95)، وهو مؤشر قوي على تسمم الحمل.\n* الأعراض المبلغ عنها (صداع حاد وتشوش الرؤية) تدعم هذا التشخيص.\n\n**التوصيات:**\n* **يجب التوجه إلى الطوارئ فوراً لتقييم الحالة.**\n* هذا الوضع يتطلب تدخلاً طبياً عاجلاً.', extracted_labs: {systolicBp: 145, diastolicBp: 95, fastingGlucose: 90, hb: 11.2} }
    }
];

export const deletePatientRecord = (id: string): boolean => {
    const initialLength = patientRecordsDB.length;
    patientRecordsDB = patientRecordsDB.filter(record => record.id !== id);
    return patientRecordsDB.length < initialLength;
};