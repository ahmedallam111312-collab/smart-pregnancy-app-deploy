import React, { useState, useEffect, useRef } from 'react';
import { Page } from '../types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Card from '../components/Card';
import { getChatResponse } from '../services/geminiService';
import { useUser } from '../hooks/useUser';
//import { patientRecordsDB } from '../services/mockDB';

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

const ChatbotPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
     setMessages([{ sender: 'ai', text: 'أهلاً بكِ، أنا "رفيقة"، مساعدتك الذكية. كيف يمكنني مساعدتك اليوم؟' }]);
  }, []);

  const generateHistorySummary = () => {
    if (!user) return 'المستخدم غير معروف.';
    
    const userRecords = patientRecordsDB.filter(r => r.userId === user.id);
    if (userRecords.length === 0) {
        return 'لا يوجد تاريخ مرضي مسجل للمستخدم بعد.';
    }
    const latestRecord = userRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    return `
      ملخص آخر سجل للمستخدم:
      - التاريخ: ${latestRecord.timestamp.toLocaleDateString()}
      - التشخيص: ${latestRecord.aiResponse.brief_summary}
      - مستوى الأهمية: ${latestRecord.aiResponse.urgency}
    `;
  };


  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMessage: Message = { text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const historySummary = generateHistorySummary();
      const stream = await getChatResponse(user.id, input, historySummary);
      let aiResponseText = '';
      setMessages(prev => [...prev, { text: '', sender: 'ai' }]); // Add placeholder for streaming

      for await (const chunk of stream) {
        aiResponseText += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = aiResponseText;
          return newMessages;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { text: 'عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.', sender: 'ai' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <BackButton navigate={navigate} />
      <Card title="المساعد الذكي (شات)" className="max-w-4xl mx-auto">
        <div className="h-[60vh] bg-gray-50 rounded-lg p-4 overflow-y-auto flex flex-col space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-brand-pink text-white rounded-br-none' : 'bg-white text-gray-800 shadow-sm rounded-bl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex justify-start">
                <div className="max-w-lg p-3 rounded-2xl bg-white text-gray-800 shadow-sm rounded-bl-none">
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
                    </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="اكتبي سؤالك هنا..."
            className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading}>
            إرسال
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChatbotPage;
