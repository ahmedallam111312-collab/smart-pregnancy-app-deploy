import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, PatientRecord } from '../types';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import { useUser } from '../hooks/useUser';
import LoadingSpinner from '../components/LoadingSpinner';
import { getChatResponse } from '../services/geminiService';
import { getPatientRecordsByUserId } from '../services/mockDB';

// -----------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------
interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  id: string;
}

interface TypingIndicatorProps {
  message?: string;
}

interface QuickActionProps {
  icon: string;
  text: string;
  prompt: string;
  onClick: (prompt: string) => void;
}

// -----------------------------------------------------------------
// Quick Actions Configuration
// -----------------------------------------------------------------
const QUICK_ACTIONS = [
  {
    icon: '🤰',
    text: 'كيف أهتم بصحتي؟',
    prompt: 'ما هي النصائح الأساسية للعناية بصحتي خلال الحمل؟'
  },
  {
    icon: '🍎',
    text: 'التغذية السليمة',
    prompt: 'ما هي الأطعمة المفيدة والممنوعة خلال فترة الحمل؟'
  },
  {
    icon: '💊',
    text: 'الأدوية والفيتامينات',
    prompt: 'ما هي الفيتامينات والمكملات الضرورية خلال الحمل؟'
  },
  {
    icon: '🏃‍♀️',
    text: 'التمارين الآمنة',
    prompt: 'ما هي التمارين الرياضية الآمنة للحامل؟'
  },
  {
    icon: '😴',
    text: 'النوم المريح',
    prompt: 'كيف أحصل على نوم أفضل خلال الحمل؟'
  },
  {
    icon: '⚠️',
    text: 'علامات التحذير',
    prompt: 'ما هي علامات الخطر التي يجب أن أنتبه لها؟'
  }
];

// -----------------------------------------------------------------
// Helper Components
// -----------------------------------------------------------------
const TypingIndicator: React.FC<TypingIndicatorProps> = ({ message = 'رفيقة تكتب' }) => (
  <div className="flex items-center gap-2 text-gray-600">
    <div className="flex gap-1">
      <span className="w-2 h-2 bg-brand-pink rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
      <span className="w-2 h-2 bg-brand-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
      <span className="w-2 h-2 bg-brand-pink rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
    </div>
    <span className="text-sm">{message}</span>
  </div>
);

const QuickAction: React.FC<QuickActionProps> = ({ icon, text, prompt, onClick }) => (
  <button
    onClick={() => onClick(prompt)}
    className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-brand-pink hover:shadow-lg transition-all duration-300 group"
  >
    <span className="text-3xl group-hover:scale-110 transition-transform">{icon}</span>
    <span className="text-sm font-medium text-gray-700 text-center">{text}</span>
  </button>
);

const WelcomeMessage: React.FC<{ userName?: string }> = ({ userName }) => (
  <div className="text-center py-12 space-y-4">
    <div className="text-6xl mb-4">🤖💕</div>
    <h3 className="text-2xl font-bold text-brand-pink-dark">
      مرحباً {userName ? `${userName}` : 'بك'}!
    </h3>
    <p className="text-gray-600 max-w-lg mx-auto">
      أنا رفيقة، مساعدتك الذكية للحمل الصحي. يمكنني الإجابة على أسئلتك ومساعدتك في فهم حالتك الصحية بشكل أفضل.
    </p>
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
      <span>✓</span>
      <span>متصلة ومستعدة للمساعدة</span>
    </div>
  </div>
);

// -----------------------------------------------------------------
// Message Formatting
// -----------------------------------------------------------------
const formatMessageContent = (content: string): React.ReactNode => {
  // Split by newlines and handle formatting
  const lines = content.split('\n');
  return lines.map((line, index) => {
    // Bold text **text**
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic text *text*
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return (
      <span key={index}>
        <span dangerouslySetInnerHTML={{ __html: line }} />
        {index < lines.length - 1 && <br />}
      </span>
    );
  });
};

// -----------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------
interface ChatbotPageProps {
  navigate: (page: Page) => void;
}

const ChatbotPage: React.FC<ChatbotPageProps> = ({ navigate }) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PatientRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate unique message ID
  const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Fetch patient history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) {
        setIsHistoryLoading(false);
        return;
      }

      setIsHistoryLoading(true);
      try {
        const records = await getPatientRecordsByUserId(user.id);
        setHistory(records);
      } catch (err) {
        console.error('Failed to fetch history for chatbot:', err);
        // Don't show error to user, just log it
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    
    if (!textToSend || isLoading || !user) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
      id: generateMessageId()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Add temporary model message for streaming
    const tempModelMessage: ChatMessage = {
      role: 'model',
      content: '',
      timestamp: new Date(),
      id: generateMessageId()
    };
    setMessages(prev => [...prev, tempModelMessage]);

    try {
      const stream = await getChatResponse(user.id, textToSend, history);
      let modelResponse = '';

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            lastMessage.content = modelResponse;
          }
          return newMessages;
        });
      }

    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage = err.message || 'حدث خطأ أثناء التواصل مع المساعد. يرجى المحاولة مرة أخرى.';
      setError(errorMessage);
      
      // Remove the temporary model message
      setMessages(prev => prev.slice(0, -1));
      
      // Add error message
      const errorChatMessage: ChatMessage = {
        role: 'system',
        content: `⚠️ ${errorMessage}`,
        timestamp: new Date(),
        id: generateMessageId()
      };
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, user, history]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle quick action click
  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => handleSend(prompt), 100);
  };

  // Clear chat
  const handleClearChat = () => {
    if (window.confirm('هل أنت متأكدة من حذف جميع الرسائل؟')) {
      setMessages([]);
      setError(null);
    }
  };

  // Show loading state while fetching history
  if (isHistoryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="جارِ تحميل بياناتك..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <BackButton navigate={navigate} />

      {/* Header Card */}
      <Card className="border-t-4 border-brand-pink-dark">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-pink-dark flex items-center gap-3">
              <span className="text-4xl">💬</span>
              المساعد الذكي - رفيقة
            </h1>
            <p className="text-gray-600 mt-1">
              مساعدتك الشخصية للحمل الصحي متوفرة على مدار الساعة
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              🗑️ مسح المحادثة
            </button>
          )}
        </div>
      </Card>

      {/* Chat Container */}
      <Card className="relative">
        <div className="flex flex-col h-[65vh]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
            {messages.length === 0 ? (
              <>
                <WelcomeMessage userName={user?.name} />
                
                {/* Quick Actions */}
                <div className="max-w-4xl mx-auto">
                  <h4 className="text-center font-semibold text-gray-700 mb-4">
                    أسئلة شائعة يمكنك البدء بها:
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {QUICK_ACTIONS.map((action, index) => (
                      <QuickAction
                        key={index}
                        {...action}
                        onClick={handleQuickAction}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  >
                    <div
                      className={`
                        max-w-[75%] p-4 rounded-2xl shadow-sm
                        ${msg.role === 'user' 
                          ? 'bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white rounded-tr-none' 
                          : msg.role === 'system'
                          ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                        }
                      `}
                    >
                      {msg.role !== 'user' && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                          <span className="text-xl">🤖</span>
                          <span className="text-sm font-semibold">رفيقة</span>
                        </div>
                      )}
                      <div className="leading-relaxed">
                        {formatMessageContent(msg.content)}
                      </div>
                      <div className={`text-xs mt-2 opacity-70 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp.toLocaleTimeString('ar-EG', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex justify-start animate-fadeIn">
                    <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-red-700 text-sm flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="mt-4 bg-white rounded-lg border-2 border-gray-200 focus-within:border-brand-pink transition-colors">
            <div className="flex gap-2 p-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اسألي رفيقة أي سؤال... (اضغطي Enter للإرسال)"
                className="flex-1 p-3 bg-transparent focus:outline-none text-gray-800 placeholder-gray-400"
                disabled={isLoading}
                maxLength={500}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                <span>إرسال</span>
                <span className="text-xl">📨</span>
              </button>
            </div>
            <div className="px-4 pb-2 flex justify-between items-center text-xs text-gray-500">
              <span>{input.length}/500</span>
              {history.length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  متصلة بسجلاتك ({history.length} تقييم)
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300">
        <div className="flex items-start gap-4">
          <span className="text-4xl">ℹ️</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-brand-pink-dark mb-2">نصائح للاستخدام الأمثل</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>اسألي أسئلة واضحة ومحددة للحصول على إجابات أفضل</li>
              <li>رفيقة تستطيع الوصول لسجلاتك الطبية لتقديم نصائح مخصصة</li>
              <li>لا تترددي في طلب التوضيح إذا لم تفهمي شيئاً</li>
              <li>استخدمي الأسئلة السريعة للبدء في مواضيع مهمة</li>
              <li><strong>تذكري:</strong> رفيقة مساعدة ولا تغني عن استشارة الطبيب المختص</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatbotPage;