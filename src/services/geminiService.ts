import { GoogleGenAI, Type, Chat } from "@google/genai";
import { PatientRecord, LabResults, AIResponse } from '../types';
import { MEDICAL_KB } from '../constants/medicalKB';

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

/**
 * Mocks an OCR service that extracts text from an image.
 * In a real application, this would involve a server-side process.
 */
export const mockOcrService = async (file: File): Promise<string> => {
  console.log(`Simulating OCR for file: ${file.name}`);
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
  return `
    --- LAB RESULTS ---
    Fasting Blood Sugar: 95 mg/dL
    Hemoglobin (Hb): 10.8 g/dL
    Systolic Blood Pressure: 125 mmHg
    Diastolic Blood Pressure: 82 mmHg
  `;
};

/**
 * Analyzes patient data using the Gemini API to provide a comprehensive report.
 */
export const analyzePatientData = async (
  currentData: Omit<PatientRecord, 'id' | 'timestamp' | 'aiResponse'>,
  history: PatientRecord[]
): Promise<AIResponse> => {
  const historySummary = history.length > 0
    ? `Patient History Summary:
      ${history.map(rec => `- On ${rec.timestamp.toLocaleDateString()}: Weight was ${rec.measurementData.currentWeight}kg. Key symptom: ${rec.symptoms.other}. Urgency: ${rec.aiResponse.urgency}`).join('\n')}`
    : 'This is the patient\'s first visit.';

  const prompt = `
    **ROLE: Expert Obstetrician AI Assistant**

    **CONTEXT:**
    You are analyzing the health record of a pregnant patient. Your analysis must be based *only* on the provided medical knowledge base and the patient's data.

    **MEDICAL KNOWLEDGE BASE:**
    ${MEDICAL_KB}

    **PATIENT'S CURRENT DATA:**
    - Personal Info: Name: ${currentData.personalInfo.name}, Age: ${currentData.personalInfo.age}
    - Pregnancy History: G: ${currentData.pregnancyHistory.g}, P: ${currentData.pregnancyHistory.p}, A: ${currentData.pregnancyHistory.a}
    - Measurements: Height: ${currentData.measurementData.height}cm, Pre-pregnancy Weight: ${currentData.measurementData.prePregnancyWeight}kg, Current Weight: ${currentData.measurementData.currentWeight}kg
    - Reported Symptoms (Structured): Nausea - ${currentData.symptoms.nausea}, Vomiting - ${currentData.symptoms.vomiting}
    - Reported Symptoms (Other): ${currentData.symptoms.other || 'N/A'}
    - Lab Results (Manual Input): ${JSON.stringify(currentData.labResults, null, 2)}
    - Lab Results (from OCR if available): ${currentData.ocrText || 'N/A'}

    **PATIENT'S PREVIOUS RECORDS SUMMARY:**
    ${historySummary}

    **TASK:**
    Analyze all the provided information. You MUST return a JSON object with the following structure. Do not include any text or markdown formatting outside of the JSON object.
    Your entire response should be only the JSON object.

    The JSON structure MUST be:
    {
      "urgency": "string", // "High", "Medium", "Low", "Normal"
      "brief_summary": "string", // A one-sentence summary in Arabic.
      "detailed_report": "string", // A detailed, multi-paragraph report in Arabic. The report MUST be comprehensive, at least two paragraphs long, and include recommendations. Use markdown for formatting: use '##' for headings, '*' for list items, and separate paragraphs with a double newline.
      "extracted_labs": { // Extract and normalize lab values from all inputs. If a value is not present, omit the key.
        "systolicBp": number,
        "diastolicBp": number,
        "fastingGlucose": number,
        "hb": number
      }
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
            urgency: { type: Type.STRING, description: "Urgency level: High, Medium, Low, or Normal" },
            brief_summary: { type: Type.STRING, description: "One-sentence summary in Arabic." },
            detailed_report: { type: Type.STRING, description: "Detailed report in Arabic with markdown. Use '##' for headings and '*' for list items." },
            extracted_labs: {
              type: Type.OBJECT,
              properties: {
                systolicBp: { type: Type.NUMBER, nullable: true },
                diastolicBp: { type: Type.NUMBER, nullable: true },
                fastingGlucose: { type: Type.NUMBER, nullable: true },
                hb: { type: Type.NUMBER, nullable: true },
              },
            },
          },
          required: ["urgency", "brief_summary", "detailed_report", "extracted_labs"],
        },
      },
    });

    let jsonText = response.text.trim();
    
    // Clean potential markdown wrapping
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }
    
    const result = JSON.parse(jsonText);

    // **Stricter Validation:** Check for a meaningful, non-placeholder report.
    if (
        !result || typeof result !== 'object' || 
        !result.urgency || 
        !result.brief_summary || 
        !result.detailed_report || result.detailed_report.trim().length < 50
    ) {
        console.error("Invalid or incomplete AI response structure:", result);
        throw new Error("فشل الذكاء الاصطناعي في توليد تقرير متكامل. قد تكون البيانات المدخلة غير كافية أو غير واضحة. يرجى مراجعة المدخلات والمحاولة مرة أخرى.");
    }

    return result;

  } catch (error) {
    console.error("Error analyzing patient data:", error);
    if (error instanceof Error && error.message.includes('JSON')) {
        throw new Error("فشل في تحليل استجابة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.");
    }
     // Re-throw custom error messages from the validation step
    if (error instanceof Error && error.message.startsWith("فشل الذكاء الاصطناعي")) {
        throw error;
    }
    throw new Error("حدث خطأ غير متوقع أثناء تحليل البيانات. يرجى المحاولة مرة أخرى.");
  }
};


let chatInstances: { [userId: string]: Chat } = {};

export const getChatResponse = async (userId: string, message: string, historySummary: string) => {
    if (!chatInstances[userId]) {
        const systemInstruction = `
            You are a helpful and compassionate AI assistant for pregnant women, named 'رفيقة'.
            Your knowledge is strictly limited to the provided MEDICAL KNOWLEDGE BASE.
            You MUST NOT provide any medical advice beyond this knowledge base.
            If asked about a topic not in the knowledge base, you must state that you cannot answer.
            You will be given a summary of the user's health history for context.
            Your answers must be in Arabic.

            MEDICAL KNOWLEDGE BASE:
            ${MEDICAL_KB}

            USER'S HISTORY SUMMARY:
            ${historySummary}
        `;
        chatInstances[userId] = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
            },
        });
    }

    try {
        const stream = await chatInstances[userId].sendMessageStream({ message });
        return stream;
    } catch (error) {
        console.error("Error getting chat response:", error);
        // Reset chat instance on error in case it's a session issue
        delete chatInstances[userId];
        throw new Error("حدث خطأ أثناء التواصل مع المساعد. يرجى المحاولة مرة أخرى.");
    }
};