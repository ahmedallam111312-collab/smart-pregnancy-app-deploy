import { GoogleGenAI, Type, Chat } from "@google/genai";
import { PatientRecord, LabResults, AIResponse, RiskScores, SymptomsPayload } from '../types'; // 🚨 استيراد الأنواع الجديدة
import { MEDICAL_KB } from '../constants/medicalKB';

const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) { console.error("API_KEY environment variable not set."); }

const ai = new GoogleGenAI({ apiKey: API_KEY! }); 

// 🚨 (النقطة 7) تعريف هيكل (Schema) لنظام النقاط
const RiskScoresSchema = {
    type: Type.OBJECT,
    properties: {
        overallRisk: { type: Type.NUMBER, description: "Overall risk score (0.0 to 1.0)." },
        preeclampsiaRisk: { type: Type.NUMBER, description: "Preeclampsia risk score (0.0 to 1.0)." },
        gdmRisk: { type: Type.NUMBER, description: "Gestational Diabetes (GDM) risk score (0.0 to 1.0)." },
        anemiaRisk: { type: Type.NUMBER, description: "Anemia risk score (0.0 to 1.0)." },
    },
    required: ["overallRisk", "preeclampsiaRisk", "gdmRisk", "anemiaRisk"],
};

const LabResultsSchema = {
    type: Type.OBJECT,
    properties: {
        systolicBp: { type: Type.NUMBER, nullable: true },
        diastolicBp: { type: Type.NUMBER, nullable: true },
        fastingGlucose: { type: Type.NUMBER, nullable: true },
        hb: { type: Type.NUMBER, nullable: true },
    },
};

export const mockOcrService = async (file: File): Promise<string> => {
  console.log(`Simulating OCR for file: ${file.name}`);
  await new Promise(resolve => setTimeout(resolve, 1500)); 
  return `Fasting Blood Sugar: 95, Hb: 10.8, BP: 125/82`;
};

// 🚨 دالة مساعدة لإنشاء ملخص الهيستوري
const getHistorySummary = (history: PatientRecord[]): string => {
  if (history.length === 0) return 'This is the patient\'s first visit.';
  
  return `Patient History Summary:
    ${history.map(rec => {
        const riskDisplay = rec.aiResponse.riskScores
            ? `(Risk Score: ${(rec.aiResponse.riskScores.overallRisk || 0).toFixed(2)})`
            // (as any) للتوافق مع السجلات القديمة التي كانت تستخدم Urgency
            : `(Old Urgency: ${(rec.aiResponse as any).urgency || 'N/A'})`; 
        return `- On ${rec.timestamp.toLocaleDateString()}: Weight: ${rec.measurementData.currentWeight}kg. ${riskDisplay}`;
    }).join('\n')}`;
};

/**
 * Analyzes patient data using the Gemini API.
 */
export const analyzePatientData = async (
  currentData: (Omit<PatientRecord, 'id' | 'timestamp' | 'aiResponse' | 'symptoms'> & { symptoms: SymptomsPayload }), // 🚨 استخدام الهيكل الجديد
  history: PatientRecord[]
): Promise<AIResponse> => {

  const historySummary = getHistorySummary(history);

  const prompt = `
    **ROLE: Expert Obstetrician AI Assistant**
    **CONTEXT:** Analyze the health record of a pregnant patient based *only* on the provided data and medical knowledge.
    **MEDICAL KNOWLEDGE BASE:** ${MEDICAL_KB}

    **PATIENT'S CURRENT DATA:**
    - Personal Info: Name: ${currentData.personalInfo.name}, Age: ${currentData.personalInfo.age}
    - Pregnancy History: G: ${currentData.pregnancyHistory.g}, P: ${currentData.pregnancyHistory.p}, A: ${currentData.pregnancyHistory.a}
    - Measurements: Height: ${currentData.measurementData.height}cm, Pre-pregnancy Weight: ${currentData.measurementData.prePregnancyWeight}kg, Current Weight: ${currentData.measurementData.currentWeight}kg
    - 🚨 (النقطة 1) Reported Symptoms (Checklist): ${JSON.stringify(currentData.symptoms)}
    - Lab Results (Manual Input): ${JSON.stringify(currentData.labResults, null, 2)}
    - Lab Results (from OCR if available): ${currentData.ocrText || 'N/A'}

    **PATIENT'S PREVIOUS RECORDS SUMMARY:**
    ${historySummary}

    **TASK:**
    Analyze all information (Current Data, History, Risk Factors like Age, and Medical KB). 
    You MUST return a JSON object only. Do not include any text outside the JSON object.
  **IMPORTANT: The entire response, especially 'brief_summary' and 'detailed_report', MUST be in ARABIC.**
    
    Your entire response should be only the JSON object.
    The JSON structure MUST be:
    {
      "riskScores": { "overallRisk": number, "preeclampsiaRisk": number, "gdmRisk": number, "anemiaRisk": number },
      "brief_summary": "string",
      "detailed_report": "string",
      "extracted_labs": { "systolicBp": number | null, "diastolicBp": number | null, "fastingGlucose": number | null, "hb": number | null }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScores: RiskScoresSchema, // <-- 🚨 استخدام الـ Schema الجديد
            brief_summary: { type: Type.STRING },
            detailed_report: { type: Type.STRING },
            extracted_labs: LabResultsSchema, 
          },
          required: ["riskScores", "brief_summary", "detailed_report", "extracted_labs"],
        },
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    if (!result || !result.riskScores || result.riskScores.overallRisk == null || !result.brief_summary || !result.detailed_report) {
        console.error("Invalid or incomplete AI response structure:", result);
        throw new Error("فشل الذكاء الاصطناعي في توليد تقرير متكامل.");
    }
    return result as AIResponse;

  } catch (error) {
    console.error("Error analyzing patient data:", error);
    if (error instanceof Error && error.message.includes('JSON') || String(error).includes('API key not valid')) {
        throw new Error("فشل في تحليل استجابة الذكاء الاصطناعي (JSON Error or Invalid Key).");
    }
    throw new Error("حدث خطأ غير متوقع أثناء تحليل البيانات.");
  }
};


// ----------------------------------------------------
// 🚨 (النقطة 2) تحديث الشات بوت
// ----------------------------------------------------
let chatInstances: { [userId: string]: Chat } = {};

export const getChatResponse = async (userId: string, message: string, history: PatientRecord[]) => {
    // 🚨 جلب الهيستوري وتمريره بشكل صحيح
    const historySummary = getHistorySummary(history);

    if (!chatInstances[userId]) {
        const systemInstruction = `
            You are a helpful AI assistant 'رفيقة'.
            Your knowledge is STRICTLY limited to the MEDICAL KNOWLEDGE BASE.
            Do NOT provide medical advice beyond this base.
            You will be given the user's health history for context.
            Answers must be in Arabic.
            MEDICAL KNOWLEDGE BASE: ${MEDICAL_KB}
            USER'S HISTORY SUMMARY: ${historySummary} 
        `;
        chatInstances[userId] = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: systemInstruction },
        });
    }

    try {
        const stream = await chatInstances[userId].sendMessageStream({ message });
        return stream;
    } catch (error) {
        console.error("Error getting chat response:", error);
        delete chatInstances[userId];
        throw new Error("حدث خطأ أثناء التواصل مع المساعد.");
    }
};