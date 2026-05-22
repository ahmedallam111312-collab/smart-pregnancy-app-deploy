// src/services/aiService.ts
// Updated to work with NVIDIA Nemotron Nano via OpenRouter API (Free tier with reasoning)

import { PatientRecord, LabResults, AIResponse, RiskScores, SymptomsPayload } from '../types';
import MedicalKB from '../constants/medicalKB';
import { searchIcd11 } from './icdService';

// -----------------------------------------------------------------
// Configuration & Initialization
// -----------------------------------------------------------------
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';

if (!API_KEY) {
  console.error("❌ CRITICAL: VITE_OPENROUTER_API_KEY environment variable not set.");
  throw new Error("OpenRouter API key is missing. Please check your .env file.");
}

// -----------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------

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
 * Formats symptoms for AI analysis using KB
 */
const formatSymptomsForAI = (symptoms: SymptomsPayload): string => {
  const symptomsList: string[] = [];

  Object.entries(symptoms).forEach(([key, value]) => {
    if (key === 'otherSymptoms') {
      if (value) {
        symptomsList.push(`Other: ${value}`);
      }
      return;
    }

    if (value === true) {
      const symptom = MedicalKB.SYMPTOMS[key];
      if (symptom) {
        symptomsList.push(`${symptom.labelEn} (${symptom.severity} severity)`);
      }
    }
  });

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

/**
 * Call OpenRouter API (OpenAI-compatible format)
 */
const callOpenRouterAPI = async (
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
    enableReasoning?: boolean;
  } = {}
): Promise<string> => {
  const requestBody: any = {
    model: MODEL,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4000,
    stream: false
  };

  // Add reasoning configuration for Nemotron
  if (options.enableReasoning !== false) {
    requestBody.reasoning = { enabled: true };
  }

  // Add response format if specified
  if (options.responseFormat) {
    requestBody.response_format = options.responseFormat;
  }

  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': window.location.origin, // Optional but recommended
      'X-Title': 'Pregnancy Care App' // Optional but recommended
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API Error:', errorText);
    throw new Error(`OpenRouter API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

/**
 * Call OpenRouter API with streaming
 */
const callOpenRouterAPIStream = async (
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number;
    maxTokens?: number;
    enableReasoning?: boolean;
  } = {}
): Promise<ReadableStream> => {
  const requestBody: any = {
    model: MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
    stream: true
  };

  // Add reasoning configuration for Nemotron
  if (options.enableReasoning !== false) {
    requestBody.reasoning = { enabled: true };
  }

  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Pregnancy Care App'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API Error:', errorText);
    throw new Error(`OpenRouter API request failed: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  return response.body;
};

// -----------------------------------------------------------------
// Mock OCR Service
// -----------------------------------------------------------------
export const mockOcrService = async (file: File): Promise<string> => {
  console.log(`📄 Simulating OCR extraction for file: ${file.name}`);

  await new Promise(resolve => setTimeout(resolve, 1500));

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
  personalInfo: { name: string; age: number; pregnancyWeek?: number };
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
 * Analyzes patient data using DeepSeek V3 via OpenRouter
 */
export const analyzePatientData = async (
  currentData: AnalysisInput,
  history: PatientRecord[]
): Promise<AIResponse> => {
  console.log('🔬 Starting KB-driven patient data analysis with NVIDIA Nemotron Nano (with reasoning) via OpenRouter...');

  try {
    // Generate context using KB functions
    const historySummary = generateHistorySummary(history);
    const symptomsText = formatSymptomsForAI(currentData.symptoms);
    
    // Use KB BMI calculation
    const bmi = MedicalKB.calculateBMI(
      currentData.measurementData.height,
      currentData.measurementData.currentWeight
    );
    const preBMI = MedicalKB.calculateBMI(
      currentData.measurementData.height,
      currentData.measurementData.prePregnancyWeight
    );

    // Get BMI categories from KB
    const currentBMICategory = bmi ? MedicalKB.getBMICategory(bmi) : null;
    const preBMICategory = preBMI ? MedicalKB.getBMICategory(preBMI) : null;

    // Get pregnancy week info from KB
    const weekInfo = currentData.personalInfo.pregnancyWeek 
      ? MedicalKB.getPregnancyWeekInfo(currentData.personalInfo.pregnancyWeek)
      : null;

    // Calculate weight gain
    const weightGain =
      currentData.measurementData.currentWeight -
      currentData.measurementData.prePregnancyWeight;

    // Calculate KB-driven risk scores
    const preeclampsiaRisk = MedicalKB.calculateConditionRisk('preeclampsia', {
      personalInfo: currentData.personalInfo,
      pregnancyHistory: currentData.pregnancyHistory,
      measurementData: currentData.measurementData,
      symptoms: currentData.symptoms,
      labResults: currentData.labResults
    });

    const gdmRisk = MedicalKB.calculateConditionRisk('gdm', {
      personalInfo: currentData.personalInfo,
      pregnancyHistory: currentData.pregnancyHistory,
      measurementData: currentData.measurementData,
      symptoms: currentData.symptoms,
      labResults: currentData.labResults
    });

    const anemiaRisk = MedicalKB.calculateConditionRisk('anemia', {
      personalInfo: currentData.personalInfo,
      pregnancyHistory: currentData.pregnancyHistory,
      measurementData: currentData.measurementData,
      symptoms: currentData.symptoms,
      labResults: currentData.labResults
    });

    // Get red flag symptoms from KB
    const redFlagSymptoms = MedicalKB.getRedFlagSymptoms()
      .filter(s => currentData.symptoms[s.key as keyof SymptomsPayload])
      .map(s => s.labelEn);

    // Assess lab results using KB
    const labAssessments: string[] = [];
    Object.entries(MedicalKB.CLINICAL_THRESHOLDS).forEach(([key, threshold]) => {
      const value = currentData.labResults[threshold.parameter as keyof LabResults];
      if (value) {
        const assessment = MedicalKB.assessClinicalParameter(key, value);
        if (assessment && assessment.status !== 'normal') {
          labAssessments.push(
            `${threshold.labelEn}: ${value} ${threshold.unit} (${assessment.status})`
          );
        }
      }
    });

    // Build comprehensive prompt
    const userPrompt = `
**CONTEXT:** Analyze the health record of a pregnant patient. Base your analysis STRICTLY on the provided data and medical knowledge base. Provide risk assessment and recommendations.

**MEDICAL KNOWLEDGE BASE:**
${MedicalKB.MEDICAL_KB_TEXT}

**PATIENT'S CURRENT DATA:**

1. Personal Information:
   - Name: ${currentData.personalInfo.name}
   - Age: ${currentData.personalInfo.age} years
   - Pregnancy Week: ${currentData.personalInfo.pregnancyWeek || 'Not specified'}
   ${weekInfo ? `- Trimester: ${weekInfo.trimester}` : ''}
   ${weekInfo ? `- Fetal Development: ${weekInfo.fetalDevelopmentEn}` : ''}
   - Known Diagnosis: ${currentData.knownDiagnosis ? 'Yes' : 'No'}

2. Pregnancy History:
   - Gravida (G): ${currentData.pregnancyHistory.g}
   - Para (P): ${currentData.pregnancyHistory.p}
   - Abortions (A): ${currentData.pregnancyHistory.a}

3. Physical Measurements:
   - Height: ${currentData.measurementData.height} cm
   - Pre-pregnancy Weight: ${currentData.measurementData.prePregnancyWeight} kg
   - Pre-pregnancy BMI: ${preBMI?.toFixed(1)} (${preBMICategory?.labelEn || 'Unknown'})
   - Current Weight: ${currentData.measurementData.currentWeight} kg
   - Current BMI: ${bmi?.toFixed(1)} (${currentBMICategory?.labelEn || 'Unknown'})
   - Weight Gain: ${weightGain > 0 ? '+' : ''}${weightGain.toFixed(1)} kg

4. Reported Symptoms (${Object.values(currentData.symptoms).filter(v => v === true).length} total):
   ${symptomsText}
   ${redFlagSymptoms.length > 0 ? `\n⚠️ RED FLAG SYMPTOMS: ${redFlagSymptoms.join(', ')}` : ''}

5. Laboratory Results (Manual Input):
   - Blood Pressure: ${currentData.labResults.systolicBp || 'N/A'}/${currentData.labResults.diastolicBp || 'N/A'} mmHg
   - Fasting Glucose: ${currentData.labResults.fastingGlucose || 'N/A'} mg/dL
   - Hemoglobin: ${currentData.labResults.hb || 'N/A'} g/dL
   ${labAssessments.length > 0 ? `\n⚠️ ABNORMAL FINDINGS:\n${labAssessments.map(a => `   - ${a}`).join('\n')}` : ''}

6. Laboratory Results (OCR Extracted):
   ${currentData.ocrText || 'No OCR data available'}

**KNOWLEDGE-BASE CALCULATED RISK SCORES:**
- Preeclampsia Risk: ${(preeclampsiaRisk.score * 100).toFixed(0)}% (${preeclampsiaRisk.level})
  Factors: ${preeclampsiaRisk.factors.join(', ') || 'None identified'}
- Gestational Diabetes Risk: ${(gdmRisk.score * 100).toFixed(0)}% (${gdmRisk.level})
  Factors: ${gdmRisk.factors.join(', ') || 'None identified'}
- Anemia Risk: ${(anemiaRisk.score * 100).toFixed(0)}% (${anemiaRisk.level})
  Factors: ${anemiaRisk.factors.join(', ') || 'None identified'}

**PATIENT'S HISTORICAL RECORDS:**
${historySummary}

**ANALYSIS REQUIREMENTS:**

1. Use the KB-calculated risk scores as a baseline, but adjust based on:
   - Clinical judgment
   - Combination of risk factors
   - Severity of symptoms
   - Lab result patterns
   - Historical trends

2. Your risk scores should be close to the KB calculations unless there's clinical justification to adjust them.

3. Consider ALL risk factors:
   - Maternal age (${currentData.personalInfo.age} years)
   - BMI and weight gain patterns
   - Blood pressure trends
   - Blood glucose levels
   - Hemoglobin levels
   - Reported symptoms (especially red flags)
   - Pregnancy history
   - Previous visit trends

4. Provide:
   - Brief summary (2-3 sentences) in ARABIC
   - Detailed report with recommendations in ARABIC, using markdown formatting (##, *, -)
   - Extracted lab values from all sources
5. Map each identified clinical finding (preeclampsia, gestational diabetes, anemia, or other
   conditions) to the most appropriate WHO ICD-11 MMS code. Use the standard 2024-01 release.
   Common codes for reference:
   - Pre-eclampsia: O14.1 (Severe pre-eclampsia) / O14.0 (Moderate pre-eclampsia)
   - Gestational Diabetes: O24.4
   - Iron-deficiency Anemia in pregnancy: O99.0
   Include only codes that are clinically relevant based on the patient's data.

**OUTPUT FORMAT:**
Return ONLY a valid JSON object with this exact structure:
{
  "riskScores": {
    "overallRisk": <number between 0.0 and 1.0>,
    "preeclampsiaRisk": <number between 0.0 and 1.0>,
    "gdmRisk": <number between 0.0 and 1.0>,
    "anemiaRisk": <number between 0.0 and 1.0>
  },
  "brief_summary": "<2-3 sentences in Arabic>",
  "detailed_report": "<detailed report in Arabic with markdown formatting>",
  "extracted_labs": {
    "systolicBp": <number or null>,
    "diastolicBp": <number or null>,
    "fastingGlucose": <number or null>,
    "hb": <number or null>
  },
  "icd11_codes": [
    { "code": "<ICD-11 code e.g. O14.1>", "diagnosis": "<short diagnosis name in Arabic>" }
  ]
}
**CRITICAL:** 
- Ensure risk scores are realistic and evidence-based
- Higher scores should only be given when clear risk factors are present
- Reference the KB definitions and thresholds in your assessment
- If red flag symptoms are present, emphasize urgency in your report
- Return ONLY valid JSON, no additional text
`;

    const systemPrompt = "You are an expert Obstetrician AI Assistant specializing in high-risk pregnancy assessment. You provide evidence-based medical analysis in Arabic.";

    let response = "";
    let result: AIResponse | null = null;
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts && !result) {
      try {
        attempt++;
        if (attempt > 1) console.log(`🔄 Retrying API call... (Attempt ${attempt}/${maxAttempts})`);

        // Call OpenRouter API with reasoning enabled
        response = await callOpenRouterAPI(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          {
            temperature: 0.3,
            maxTokens: 4000,
            responseFormat: { type: 'json_object' },
            enableReasoning: true
          }
        );

        // Parse response
        console.log('📊 Received NVIDIA Nemotron response from OpenRouter, parsing...');

        // Clean JSON output to prevent SyntaxErrors from trailing reasoning or markdown blocks
        let cleanedResponse = response.trim();
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }

        try {
          result = JSON.parse(cleanedResponse) as AIResponse;
        } catch (parseErr) {
          console.error(`❌ JSON Parse Error on attempt ${attempt}:`, parseErr);
          if (attempt >= maxAttempts) throw parseErr;
          continue; // Retry
        }

        // Validate response structure
        if (!result || !result.riskScores || !result.brief_summary || !result.detailed_report) {
          console.error(`❌ Invalid AI response structure on attempt ${attempt}:`, result);
          if (attempt >= maxAttempts) throw new Error('AI response missing required fields');
          result = null; // Reset and retry
        }
      } catch (err) {
        console.error(`❌ Error on attempt ${attempt}:`, err);
        if (attempt >= maxAttempts) throw err;
      }
    }

    if (!result) {
      throw new Error('Failed to retrieve a valid response after multiple attempts.');
    }

    // Validate risk scores
    if (!validateRiskScores(result.riskScores)) {
      console.error('❌ Invalid risk score values:', result.riskScores);
      throw new Error('Risk scores contain invalid values');
    }

    // Ensure icd11_codes is at least an empty array if missing
    if (!result.icd11_codes) {
      result.icd11_codes = [];
    }

    // Validate and correct ICD-11 codes using the ICD API
    if (result.icd11_codes.length > 0) {
      console.log('🔍 Validating ICD-11 codes via WHO API...');
      const correctedCodes = await Promise.all(
        result.icd11_codes.map(async (item) => {
          try {
            // Search by diagnosis text since AI might hallucinate the exact code
            const query = item.diagnosis || item.code;
            const searchResults = await searchIcd11(query);

            if (searchResults && searchResults.length > 0) {
              const bestMatch = searchResults[0];
              console.log(`✅ Corrected ICD-11 for "${query}": ${item.code} -> ${bestMatch.code} (${bestMatch.title})`);
              return {
                code: bestMatch.code,
                diagnosis: bestMatch.title,
                isWhoValidated: true
              };
            }
          } catch (err) {
            console.error(`⚠️ Failed to validate ICD-11 code for ${item.code}:`, err);
          }
          // If search fails or returns nothing, keep the AI's original code
          return { ...item, isWhoValidated: false };
        })
      );
      result.icd11_codes = correctedCodes;
    }

    console.log('✅ Analysis completed successfully');
    console.log('📈 Final Risk Scores:', {
      overall: (result.riskScores.overallRisk * 100).toFixed(1) + '%',
      preeclampsia: (result.riskScores.preeclampsiaRisk * 100).toFixed(1) + '%',
      gdm: (result.riskScores.gdmRisk * 100).toFixed(1) + '%',
      anemia: (result.riskScores.anemiaRisk * 100).toFixed(1) + '%'
    });
    console.log('📊 KB Risk Scores (baseline):', {
      preeclampsia: (preeclampsiaRisk.score * 100).toFixed(1) + '%',
      gdm: (gdmRisk.score * 100).toFixed(1) + '%',
      anemia: (anemiaRisk.score * 100).toFixed(1) + '%'
    });

    return result;

  } catch (error) {
    console.error('❌ Error analyzing patient data:', error);

    if (error instanceof SyntaxError) {
      throw new Error('فشل في تحليل استجابة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.');
    }

    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        throw new Error('مفتاح API غير صالح. يرجى التحقق من الإعدادات.');
      }
      if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error('تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.');
      }
      if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('fetch')) {
        throw new Error('فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.');
      }
    }

    throw new Error('حدث خطأ غير متوقع أثناء تحليل البيانات. يرجى المحاولة مرة أخرى.');
  }
};

// -----------------------------------------------------------------
// Chat Service
// -----------------------------------------------------------------
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatInstance {
  messages: ChatMessage[];
  lastActivity: Date;
}

const chatInstances: Map<string, ChatInstance> = new Map();
const CHAT_TIMEOUT = 30 * 60 * 1000;

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

setInterval(cleanupInactiveChats, 10 * 60 * 1000);

const getChatInstance = (userId: string, history: PatientRecord[]): ChatInstance => {
  const existing = chatInstances.get(userId);

  if (existing) {
    existing.lastActivity = new Date();
    return existing;
  }

  const historySummary = generateHistorySummary(history);

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `
**ROLE:** You are 'رفيقة' (Rafeeqa), a caring and knowledgeable AI health assistant specialized in pregnancy care.

**PERSONALITY:**
- Warm, empathetic, and supportive
- Professional but friendly
- Always encourages seeking professional medical help when needed
- Provides evidence-based information

**KNOWLEDGE BASE:**
Your medical knowledge is based STRICTLY on the following information:
${MedicalKB.MEDICAL_KB_TEXT}

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
`
  };

  const instance: ChatInstance = {
    messages: [systemMessage],
    lastActivity: new Date()
  };

  chatInstances.set(userId, instance);
  console.log(`💬 Created new KB-driven chat instance for user: ${userId}`);
  
  return instance;
};

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
    const chatInstance = getChatInstance(userId, history);
    
    // Add user message to history
    chatInstance.messages.push({
      role: 'user',
      content: message.trim()
    });

    // Get streaming response with reasoning enabled
    const stream = await callOpenRouterAPIStream(chatInstance.messages, {
      temperature: 0.7,
      maxTokens: 2000,
      enableReasoning: true
    });

    // Create a custom async iterator for the stream
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = '';

    const customStream = {
      async *[Symbol.asyncIterator]() {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content;
                  if (content) {
                    assistantMessage += content;
                    yield { text: content };
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }
        } finally {
          // Add assistant's complete message to history
          if (assistantMessage) {
            chatInstance.messages.push({
              role: 'assistant',
              content: assistantMessage
            });
          }
          reader.releaseLock();
        }
      }
    };

    return customStream;

  } catch (error) {
    console.error('❌ Error getting chat response:', error);

    chatInstances.delete(userId);

    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        throw new Error('خطأ في مفتاح الوصول. يرجى التواصل مع الدعم الفني.');
      }
      if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error('تم تجاوز حد الاستخدام. يرجى المحاولة بعد قليل.');
      }
      if (error.message.includes('safety')) {
        throw new Error('تم حظر الرسالة لأسباب تتعلق بالسلامة. يرجى إعادة صياغة سؤالك.');
      }
    }

    throw new Error('حدث خطأ أثناء التواصل مع المساعد. يرجى المحاولة مرة أخرى.');
  }
};

export const clearChatHistory = (userId: string): boolean => {
  const deleted = chatInstances.delete(userId);
  if (deleted) {
    console.log(`🗑️ Cleared chat history for user: ${userId}`);
  }
  return deleted;
};

export const getActiveChatCount = (): number => {
  return chatInstances.size;
};

export type { AnalysisInput };
