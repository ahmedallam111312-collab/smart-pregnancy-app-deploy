import { GoogleGenAI, Type, Chat } from "@google/genai";
import { PatientRecord, LabResults, AIResponse, RiskScores, SymptomsPayload } from '../types';
import { MEDICAL_KB } from '../constants/medicalKB';

// -----------------------------------------------------------------
// Configuration & Initialization
// -----------------------------------------------------------------
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.error("❌ CRITICAL: VITE_API_KEY environment variable not set.");
  throw new Error("Google AI API key is missing. Please check your .env file.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// -----------------------------------------------------------------
// Type Definitions & Schemas
// -----------------------------------------------------------------
const RiskScoresSchema = {
  type: Type.OBJECT,
  properties: {
    overallRisk: {
      type: Type.NUMBER,
      description: "Overall pregnancy risk score from 0.0 (no risk) to 1.0 (high risk)."
    },
    preeclampsiaRisk: {
      type: Type.NUMBER,
      description: "Preeclampsia-specific risk score from 0.0 to 1.0."
    },
    gdmRisk: {
      type: Type.NUMBER,
      description: "Gestational Diabetes Mellitus (GDM) risk score from 0.0 to 1.0."
    },
    anemiaRisk: {
      type: Type.NUMBER,
      description: "Anemia risk score from 0.0 to 1.0."
    }
  },
  required: ["overallRisk", "preeclampsiaRisk", "gdmRisk", "anemiaRisk"]
};

const LabResultsSchema = {
  type: Type.OBJECT,
  properties: {
    systolicBp: {
      type: Type.NUMBER,
      nullable: true,
      description: "Systolic blood pressure in mmHg"
    },
    diastolicBp: {
      type: Type.NUMBER,
      nullable: true,
      description: "Diastolic blood pressure in mmHg"
    },
    fastingGlucose: {
      type: Type.NUMBER,
      nullable: true,
      description: "Fasting blood glucose in mg/dL"
    },
    hb: {
      type: Type.NUMBER,
      nullable: true,
      description: "Hemoglobin level in g/dL"
    }
  }
};

const AnalysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    riskScores: RiskScoresSchema,
    brief_summary: {
      type: Type.STRING,
      description: "Brief summary in Arabic (2-3 sentences)"
    },
    detailed_report: {
      type: Type.STRING,
      description: "Detailed medical report in Arabic with recommendations"
    },
    extracted_labs: LabResultsSchema
  },
  required: ["riskScores", "brief_summary", "detailed_report", "extracted_labs"]
};

// -----------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------

/**
 * Calculates BMI (Body Mass Index)
 */
const calculateBMI = (weight: number, heightInCm: number): number => {
  const heightInM = heightInCm / 100;
  return weight / (heightInM * heightInM);
};

/**
 * Generates patient history summary for AI context
 */
const generateHistorySummary = (history: PatientRecord[]): string => {
  if (history.length === 0) {
    return 'This is the patient\'s first visit. No previous records available.';
  }

  const sortedHistory = [...history].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  const summaryLines = sortedHistory.map((rec, index) => {
    const date = rec.timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const riskInfo = rec.aiResponse.riskScores
      ? `Overall Risk: ${(rec.aiResponse.riskScores.overallRisk * 100).toFixed(0)}%, ` +
        `Preeclampsia: ${(rec.aiResponse.riskScores.preeclampsiaRisk * 100).toFixed(0)}%, ` +
        `GDM: ${(rec.aiResponse.riskScores.gdmRisk * 100).toFixed(0)}%, ` +
        `Anemia: ${(rec.aiResponse.riskScores.anemiaRisk * 100).toFixed(0)}%`
      : `Legacy Urgency: ${(rec.aiResponse as any).urgency || 'N/A'}`;

    const weight = rec.measurementData.currentWeight;
    const bp = rec.labResults
      ? `${rec.labResults.systolicBp}/${rec.labResults.diastolicBp}`
      : 'N/A';

    return `  ${index + 1}. ${date}:\n     Weight: ${weight}kg, BP: ${bp}\n     ${riskInfo}`;
  });

  return `Patient History (${history.length} previous visit${history.length > 1 ? 's' : ''}):\n${summaryLines.join('\n')}`;
};

/**
 * Formats symptoms for AI analysis
 */
const formatSymptomsForAI = (symptoms: SymptomsPayload): string => {
  const symptomsList: string[] = [];

  if (symptoms.headache) symptomsList.push('Headache');
  if (symptoms.visionChanges) symptomsList.push('Vision changes');
  if (symptoms.upperAbdominalPain) symptomsList.push('Upper abdominal pain');
  if (symptoms.swelling) symptomsList.push('Swelling/edema');
  if (symptoms.excessiveThirst) symptomsList.push('Excessive thirst');
  if (symptoms.frequentUrination) symptomsList.push('Frequent urination');
  if (symptoms.fatigue) symptomsList.push('Fatigue');
  if (symptoms.dizziness) symptomsList.push('Dizziness');
  if (symptoms.shortnessOfBreath) symptomsList.push('Shortness of breath');

  if (symptoms.otherSymptoms) {
    symptomsList.push(`Other: ${symptoms.otherSymptoms}`);
  }

  return symptomsList.length > 0
    ? symptomsList.join(', ')
    : 'No symptoms reported';
};

/**
 * Validates risk scores to ensure they're within valid range
 */
const validateRiskScores = (scores: RiskScores): boolean => {
  const values = [
    scores.overallRisk,
    scores.preeclampsiaRisk,
    scores.gdmRisk,
    scores.anemiaRisk
  ];

  return values.every(
    score => typeof score === 'number' && score >= 0 && score <= 1
  );
};

// -----------------------------------------------------------------
// Mock OCR Service
// -----------------------------------------------------------------
export const mockOcrService = async (file: File): Promise<string> => {
  console.log(`📄 Simulating OCR extraction for file: ${file.name}`);

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock extracted text - in production, this would be real OCR
  const mockResults = [
    'Laboratory Results Report',
    'Date: ' + new Date().toLocaleDateString(),
    'Patient Blood Tests:',
    'Fasting Blood Sugar: 95 mg/dL',
    'Hemoglobin (Hb): 10.8 g/dL',
    'Blood Pressure: 125/82 mmHg',
    'Additional Notes: All values within normal range for pregnancy'
  ];

  return mockResults.join('\n');
};

// -----------------------------------------------------------------
// Patient Data Analysis
// -----------------------------------------------------------------
interface AnalysisInput {
  personalInfo: { name: string; age: number };
  pregnancyHistory: { g: number; p: number; a: number };
  measurementData: {
    height: number;
    prePregnancyWeight: number;
    currentWeight: number;
  };
  symptoms: SymptomsPayload;
  labResults: LabResults;
  ocrText?: string;
  knownDiagnosis: boolean;
}

/**
 * Analyzes patient data using Gemini AI
 */
export const analyzePatientData = async (
  currentData: AnalysisInput,
  history: PatientRecord[]
): Promise<AIResponse> => {
  console.log('🔬 Starting patient data analysis...');

  try {
    // Generate context
    const historySummary = generateHistorySummary(history);
    const symptomsText = formatSymptomsForAI(currentData.symptoms);
    const bmi = calculateBMI(
      currentData.measurementData.currentWeight,
      currentData.measurementData.height
    );
    const preBMI = calculateBMI(
      currentData.measurementData.prePregnancyWeight,
      currentData.measurementData.height
    );

    // Calculate weight gain
    const weightGain =
      currentData.measurementData.currentWeight -
      currentData.measurementData.prePregnancyWeight;

    // Build comprehensive prompt
    const prompt = `
**ROLE:** Expert Obstetrician AI Assistant specializing in high-risk pregnancy assessment

**CONTEXT:** Analyze the health record of a pregnant patient. Base your analysis STRICTLY on the provided data and medical knowledge base. Provide risk assessment and recommendations.

**MEDICAL KNOWLEDGE BASE:**
${MEDICAL_KB}

**PATIENT'S CURRENT DATA:**

1. Personal Information:
   - Name: ${currentData.personalInfo.name}
   - Age: ${currentData.personalInfo.age} years
   - Known Diagnosis: ${currentData.knownDiagnosis ? 'Yes' : 'No'}

2. Pregnancy History:
   - Gravida (G): ${currentData.pregnancyHistory.g}
   - Para (P): ${currentData.pregnancyHistory.p}
   - Abortions (A): ${currentData.pregnancyHistory.a}

3. Physical Measurements:
   - Height: ${currentData.measurementData.height} cm
   - Pre-pregnancy Weight: ${currentData.measurementData.prePregnancyWeight} kg (BMI: ${preBMI.toFixed(1)})
   - Current Weight: ${currentData.measurementData.currentWeight} kg (BMI: ${bmi.toFixed(1)})
   - Weight Gain: ${weightGain > 0 ? '+' : ''}${weightGain.toFixed(1)} kg

4. Reported Symptoms:
   ${symptomsText}

5. Laboratory Results (Manual Input):
   - Blood Pressure: ${currentData.labResults.systolicBp || 'N/A'}/${currentData.labResults.diastolicBp || 'N/A'} mmHg
   - Fasting Glucose: ${currentData.labResults.fastingGlucose || 'N/A'} mg/dL
   - Hemoglobin: ${currentData.labResults.hb || 'N/A'} g/dL

6. Laboratory Results (OCR Extracted):
   ${currentData.ocrText || 'No OCR data available'}

**PATIENT'S HISTORICAL RECORDS:**
${historySummary}

**ANALYSIS REQUIREMENTS:**

1. Calculate risk scores (0.0 to 1.0) for:
   - Overall pregnancy risk
   - Preeclampsia
   - Gestational Diabetes (GDM)
   - Anemia

2. Consider ALL risk factors:
   - Maternal age (${currentData.personalInfo.age} years)
   - BMI and weight gain patterns
   - Blood pressure trends
   - Blood glucose levels
   - Hemoglobin levels
   - Reported symptoms
   - Pregnancy history
   - Previous visit trends

3. Provide:
   - Brief summary (2-3 sentences) in ARABIC
   - Detailed report with recommendations in ARABIC
   - Extracted lab values from all sources

**OUTPUT FORMAT:**
Return ONLY a JSON object. No additional text outside JSON.
All text fields (brief_summary, detailed_report) MUST be in Arabic.

**CRITICAL:** Ensure risk scores are realistic and evidence-based. Higher scores should only be given when clear risk factors are present.
`;

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: AnalysisResponseSchema,
        temperature: 0.3, // Lower temperature for more consistent medical analysis
        topP: 0.8,
        topK: 40
      }
    });

    // Parse response
    const jsonText = response.text.trim();
    console.log('📊 Received AI response, parsing...');

    const result = JSON.parse(jsonText) as AIResponse;

    // Validate response structure
    if (!result || !result.riskScores || !result.brief_summary || !result.detailed_report) {
      console.error('❌ Invalid AI response structure:', result);
      throw new Error('AI response missing required fields');
    }

    // Validate risk scores
    if (!validateRiskScores(result.riskScores)) {
      console.error('❌ Invalid risk score values:', result.riskScores);
      throw new Error('Risk scores contain invalid values');
    }

    console.log('✅ Analysis completed successfully');
    console.log('📈 Risk Scores:', {
      overall: (result.riskScores.overallRisk * 100).toFixed(1) + '%',
      preeclampsia: (result.riskScores.preeclampsiaRisk * 100).toFixed(1) + '%',
      gdm: (result.riskScores.gdmRisk * 100).toFixed(1) + '%',
      anemia: (result.riskScores.anemiaRisk * 100).toFixed(1) + '%'
    });

    return result;

  } catch (error) {
    console.error('❌ Error analyzing patient data:', error);

    // Enhanced error handling
    if (error instanceof SyntaxError) {
      throw new Error('فشل في تحليل استجابة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.');
    }

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('مفتاح API غير صالح. يرجى التحقق من الإعدادات.');
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.');
      }
      if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new Error('فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.');
      }
    }

    throw new Error('حدث خطأ غير متوقع أثناء تحليل البيانات. يرجى المحاولة مرة أخرى.');
  }
};

// -----------------------------------------------------------------
// Chat Service
// -----------------------------------------------------------------
interface ChatInstance {
  chat: Chat;
  lastActivity: Date;
}

const chatInstances: Map<string, ChatInstance> = new Map();
const CHAT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Cleans up inactive chat instances
 */
const cleanupInactiveChats = () => {
  const now = Date.now();
  const toDelete: string[] = [];

  chatInstances.forEach((instance, userId) => {
    if (now - instance.lastActivity.getTime() > CHAT_TIMEOUT) {
      toDelete.push(userId);
    }
  });

  toDelete.forEach(userId => {
    console.log(`🧹 Cleaning up inactive chat for user: ${userId}`);
    chatInstances.delete(userId);
  });
};

// Run cleanup every 10 minutes
setInterval(cleanupInactiveChats, 10 * 60 * 1000);

/**
 * Gets or creates chat instance for user
 */
const getChatInstance = (userId: string, history: PatientRecord[]): Chat => {
  const existing = chatInstances.get(userId);

  if (existing) {
    existing.lastActivity = new Date();
    return existing.chat;
  }

  // Create new chat instance
  const historySummary = generateHistorySummary(history);

  const systemInstruction = `
**ROLE:** You are 'رفيقة' (Rafeeqa), a caring and knowledgeable AI health assistant specialized in pregnancy care.

**PERSONALITY:**
- Warm, empathetic, and supportive
- Professional but friendly
- Always encourages seeking professional medical help when needed
- Provides evidence-based information

**KNOWLEDGE BASE:**
Your medical knowledge is based STRICTLY on the following information:
${MEDICAL_KB}

**USER'S HEALTH CONTEXT:**
${historySummary}

**GUIDELINES:**
1. ALWAYS respond in Arabic (العربية)
2. Keep responses concise and easy to understand
3. Use simple medical terminology, explain complex terms
4. When uncertain, admit it and recommend consulting a doctor
5. Never diagnose conditions - only provide general information
6. Always prioritize patient safety
7. Encourage regular prenatal checkups
8. Be supportive of the patient's concerns and questions

**RESTRICTIONS:**
- Do NOT provide medical advice beyond the knowledge base
- Do NOT prescribe medications
- Do NOT diagnose medical conditions
- Do NOT provide advice that contradicts medical standards
- ALWAYS recommend seeing a doctor for serious symptoms

**RESPONSE FORMAT:**
- Start with empathy or acknowledgment
- Provide clear, structured information
- End with supportive encouragement or next steps
- Use bullet points for lists when helpful
`;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
      temperature: 0.7, // More natural conversation
      topP: 0.9,
      topK: 40
    }
  });

  chatInstances.set(userId, {
    chat,
    lastActivity: new Date()
  });

  console.log(`💬 Created new chat instance for user: ${userId}`);
  return chat;
};

/**
 * Sends message and gets streaming response
 */
export const getChatResponse = async (
  userId: string,
  message: string,
  history: PatientRecord[]
) => {
  if (!userId || !message.trim()) {
    throw new Error('User ID and message are required');
  }

  console.log(`💬 Processing chat message for user: ${userId}`);

  try {
    const chat = getChatInstance(userId, history);
    const stream = await chat.sendMessageStream({ message: message.trim() });

    return stream;

  } catch (error) {
    console.error('❌ Error getting chat response:', error);

    // Clean up failed instance
    chatInstances.delete(userId);

    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('خطأ في مفتاح الوصول. يرجى التواصل مع الدعم الفني.');
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw new Error('تم تجاوز حد الاستخدام. يرجى المحاولة بعد قليل.');
      }
      if (error.message.includes('safety')) {
        throw new Error('تم حظر الرسالة لأسباب تتعلق بالسلامة. يرجى إعادة صياغة سؤالك.');
      }
    }

    throw new Error('حدث خطأ أثناء التواصل مع المساعد. يرجى المحاولة مرة أخرى.');
  }
};

/**
 * Clears chat history for a user
 */
export const clearChatHistory = (userId: string): boolean => {
  const deleted = chatInstances.delete(userId);
  if (deleted) {
    console.log(`🗑️ Cleared chat history for user: ${userId}`);
  }
  return deleted;
};

/**
 * Gets active chat count (for monitoring)
 */
export const getActiveChatCount = (): number => {
  return chatInstances.size;
};

// Export types for use in other modules
export type { AnalysisInput };