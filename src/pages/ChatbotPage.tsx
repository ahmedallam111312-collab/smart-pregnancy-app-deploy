import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, PatientRecord } from '../types'; // 🚨 تأكد من استيراد PatientRecord
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import { useUser } from '../hooks/useUser';
import LoadingSpinner from '../components/LoadingSpinner';
import { getChatResponse } from '../services/geminiService';
import { getPatientRecordsByUserId } from '../services/mockDB'; // 🚨 جلب الهيستوري من Firestore
// (قد تحتاج لإنشاء هذا الأيقونة أو استخدام نص "ارسال")
// import SendIcon from '../components/icons/SendIcon'; 

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// 🚨 دالة مساعدة لإنشاء ملخص الهيستوري (نفس الدالة في geminiService)
const generateHistorySummary = (history: PatientRecord[]): string => {
  if (history.length === 0) return 'This is the patient\'s first visit.';
  
  return `Patient History Summary:
    ${history.map(rec => {
        // التحقق من وجود النظام القديم (urgency) أو الجديد (riskScores)
        const riskDisplay = rec.aiResponse.riskScores
            ? `(Risk Score: ${(rec.aiResponse.riskScores.overallRisk || 0).toFixed(2)})`
            // 🚨 إضافة تحقق إضافي للسجلات القديمة جداً
            : (rec.aiResponse as any).urgency 
                ? `(Old Urgency: ${(rec.aiResponse as any).urgency})`
                : '(Risk Score: N/A)'; 
        return `- On ${rec.timestamp.toLocaleDateString()}: Weight: ${rec.measurementData.currentWeight}kg. ${riskDisplay}`;
    }).join('\n')}`;
};


const ChatbotPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
    const { user } = useUser();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<PatientRecord[]>([]); // 🚨 حالة لحفظ الهيستوري
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. جلب هيستوري المريض عند تحميل الصفحة
    useEffect(() => {
        const fetchHistory = async () => {
            if (user?.id) {
                try {
                    const records = await getPatientRecordsByUserId(user.id);
                    setHistory(records);
                } catch (e) {
                    console.error("Failed to fetch history for chatbot:", e);
                }
            }
        };
        fetchHistory();
    }, [user?.id]);

    // 2. دالة إرسال الرسالة
    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading || !user) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // 🚨 إنشاء ملخص الهيستوري الحقيقي
            //const historySummary = generateHistorySummary(history);
            
            // 🚨 إرسال الرسالة والملخص للـ AI
            const stream = await getChatResponse(user!.id, input, history);
            
            let modelResponse = '';
            setMessages(prev => [...prev, { role: 'model', content: '...' }]);

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    // التأكد من أن newMessages[newMessages.length - 1] موجود
                    if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'model') {
                        newMessages[newMessages.length - 1].content = modelResponse;
                    }
                    return newMessages;
                });
            }

        } catch (e: any) {
            setError(e.message || "حدث خطأ أثناء التواصل مع المساعد.");
            // إزالة رسالة "..." عند حدوث خطأ
            setMessages(prev => prev.filter(msg => msg.content !== '...'));
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, user, history]);

    // 3. التمرير لأسفل عند وصول رسالة جديدة
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    return (
        <div>
            <BackButton navigate={navigate} />
            <Card title="المساعد الذكي (شات)">
                <div className="flex flex-col h-[60vh]">
                    {/* منطقة عرض الرسائل */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`p-3 rounded-lg max-w-xs ${
                                        msg.role === 'user' ? 'bg-brand-pink text-white' : 'bg-gray-200 text-gray-800'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-200 text-gray-800 p-3 rounded-lg">
                                    <LoadingSpinner message="رفيقة تكتب..." />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {error && (
                        <p className="text-red-600 text-center mt-2">{error}</p>
                    )}

                    {/* منطقة الإدخال */}
                    <div className="mt-4 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="اسألي رفيقة أي سؤال..."
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-brand-pink focus:border-brand-pink"
                            disabled={isLoading}
                        />
                        <button onClick={handleSend} disabled={isLoading} className="bg-brand-pink text-white py-3 px-5 rounded-lg font-semibold hover:bg-brand-pink-dark transition-colors disabled:bg-gray-400">
                            {/* <SendIcon className="w-5 h-5" /> */}
                            ارسال
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ChatbotPage;