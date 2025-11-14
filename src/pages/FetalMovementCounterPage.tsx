import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Page } from '../types';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import { useUser } from '../hooks/useUser';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface KickSession {
  id: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  kicks: KickRecord[];
  totalKicks: number;
  duration: number;
  completed: boolean;
  notes?: string;
}

interface KickRecord {
  timestamp: Date;
  count: number;
}

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  averageTime: number;
  fastestTime: number;
  todaySessions: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getSessionMessage = (kickCount: number, elapsedTime: number, timerActive: boolean) => {
  if (kickCount === 10) {
    const timeStr = formatTime(elapsedTime);
    let speedMessage = '';
    
    if (elapsedTime < 1800) {
      speedMessage = 'جنينك نشيط جداً! 🎉';
    } else if (elapsedTime < 3600) {
      speedMessage = 'حركة طبيعية ممتازة! 💚';
    } else {
      speedMessage = 'تم إكمال العد بنجاح! ✅';
    }
    
    return {
      type: 'success',
      title: 'ممتاز! لقد سجلتِ 10 حركات',
      message: `الوقت المستغرق: ${timeStr}`,
      subMessage: speedMessage,
      icon: '🎊',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-800'
    };
  }
  
  if (elapsedTime >= 7200 && kickCount < 10 && !timerActive) {
    return {
      type: 'warning',
      title: 'انتبهي!',
      message: 'مرت ساعتان ولم يتم تسجيل 10 حركات.',
      subMessage: 'يرجى استشارة طبيبكِ فوراً للاطمئنان على صحة الجنين.',
      icon: '⚠️',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-800'
    };
  }
  
  if (timerActive && elapsedTime > 5400 && kickCount < 10) {
    return {
      type: 'info',
      title: 'ملاحظة',
      message: `مضى ${Math.floor(elapsedTime / 60)} دقيقة وتم تسجيل ${kickCount} حركات`,
      subMessage: 'حاولي تحفيز الجنين بتناول وجبة خفيفة أو تغيير وضعيتك',
      icon: 'ℹ️',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-800'
    };
  }
  
  return null;
};

const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const playSound = (type: 'kick' | 'complete' | 'warning') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case 'kick':
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case 'complete':
        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'warning':
        oscillator.frequency.value = 400;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
    }
  } catch (e) {
    console.log('Audio not supported');
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const FetalMovementCounterPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { user } = useUser();
  
  const [kickCount, setKickCount] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentSession, setCurrentSession] = useState<KickSession | null>(null);
  const [kickHistory, setKickHistory] = useState<KickRecord[]>([]);
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [pastSessions, setPastSessions] = useState<KickSession[]>([]);
  const [notes, setNotes] = useState('');
  
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`fetal_sessions_${user.id}`);
      if (stored) {
        try {
          const sessions = JSON.parse(stored).map((s: any) => ({
            ...s,
            date: new Date(s.date),
            startTime: new Date(s.startTime),
            endTime: s.endTime ? new Date(s.endTime) : undefined,
            kicks: s.kicks.map((k: any) => ({
              ...k,
              timestamp: new Date(k.timestamp)
            }))
          }));
          setPastSessions(sessions);
        } catch (e) {
          console.error('Failed to load past sessions', e);
        }
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (timerActive && startTime) {
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
        
        if (elapsed >= 7200) {
          setTimerActive(false);
          if (soundEnabled) playSound('warning');
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, startTime, soundEnabled]);

  const sessionStats = useMemo((): SessionStats => {
    const completed = pastSessions.filter(s => s.completed);
    const today = new Date().toDateString();
    const todaySessions = pastSessions.filter(s => s.date.toDateString() === today);
    
    const avgTime = completed.length > 0
      ? completed.reduce((sum, s) => sum + s.duration, 0) / completed.length
      : 0;
    
    const fastestTime = completed.length > 0
      ? Math.min(...completed.map(s => s.duration))
      : 0;
    
    return {
      totalSessions: pastSessions.length,
      completedSessions: completed.length,
      averageTime: avgTime,
      fastestTime: fastestTime,
      todaySessions: todaySessions.length
    };
  }, [pastSessions]);

  const startCounter = useCallback(() => {
    const now = new Date();
    setKickCount(0);
    setTimerActive(true);
    setStartTime(now);
    setElapsedTime(0);
    setKickHistory([]);
    setShowCelebration(false);
    setNotes('');
    
    const newSession: KickSession = {
      id: generateId(),
      date: now,
      startTime: now,
      kicks: [],
      totalKicks: 0,
      duration: 0,
      completed: false
    };
    
    setCurrentSession(newSession);
  }, []);

  const logKick = useCallback(() => {
    if (!timerActive || kickCount >= 10) return;
    
    const now = new Date();
    const newCount = kickCount + 1;
    const newKickRecord: KickRecord = {
      timestamp: now,
      count: newCount
    };
    
    setKickCount(newCount);
    setKickHistory(prev => [...prev, newKickRecord]);
    
    if (soundEnabled) playSound('kick');
    
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        kicks: [...prev.kicks, newKickRecord],
        totalKicks: newCount
      } : null);
    }
    
    if (newCount === 10) {
      setTimerActive(false);
      setShowCelebration(true);
      if (soundEnabled) playSound('complete');
      
      if (currentSession && user?.id) {
        const completedSession: KickSession = {
          ...currentSession,
          endTime: now,
          kicks: [...currentSession.kicks, newKickRecord],
          totalKicks: 10,
          duration: elapsedTime,
          completed: true,
          notes: notes
        };
        
        const updatedSessions = [...pastSessions, completedSession];
        setPastSessions(updatedSessions);
        localStorage.setItem(`fetal_sessions_${user.id}`, JSON.stringify(updatedSessions));
      }
      
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [timerActive, kickCount, currentSession, elapsedTime, pastSessions, user?.id, soundEnabled, notes]);

  const resetCounter = useCallback(() => {
    setKickCount(0);
    setTimerActive(false);
    setStartTime(null);
    setElapsedTime(0);
    setCurrentSession(null);
    setKickHistory([]);
    setShowCelebration(false);
    setNotes('');
  }, []);

  const saveIncompleteSession = useCallback(() => {
    if (currentSession && user?.id && kickCount > 0) {
      const incompleteSession: KickSession = {
        ...currentSession,
        endTime: new Date(),
        kicks: kickHistory,
        totalKicks: kickCount,
        duration: elapsedTime,
        completed: false,
        notes: notes
      };
      
      const updatedSessions = [...pastSessions, incompleteSession];
      setPastSessions(updatedSessions);
      localStorage.setItem(`fetal_sessions_${user.id}`, JSON.stringify(updatedSessions));
    }
    resetCounter();
  }, [currentSession, kickCount, kickHistory, elapsedTime, notes, pastSessions, user?.id, resetCounter]);

  const statusMessage = getSessionMessage(kickCount, elapsedTime, timerActive);

  const renderKickProgress = () => {
    return (
      <div className="grid grid-cols-5 gap-2 mb-6">
        {Array.from({ length: 10 }).map((_, index) => {
          const isRecorded = index < kickCount;
          const isNext = index === kickCount;
          
          return (
            <div
              key={index}
              className={`aspect-square rounded-lg flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                isRecorded
                  ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg scale-100'
                  : isNext
                  ? 'bg-yellow-200 text-yellow-800 animate-pulse border-2 border-yellow-400'
                  : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
              }`}
            >
              {isRecorded ? '✓' : index + 1}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="pb-8">
      <BackButton navigate={navigate} />
      
      {showCelebration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 shadow-2xl transform animate-scale-in text-center">
            <div className="text-8xl mb-4 animate-bounce">🎉</div>
            <p className="text-3xl font-bold text-green-600 mb-2">أحسنتِ!</p>
            <p className="text-xl text-gray-700">لقد أكملتِ عد 10 حركات</p>
            <p className="text-lg text-gray-600 mt-2">في {formatTime(elapsedTime)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto items-start">
        <div className="flex-1 w-full space-y-6">
          <Card title="عداد حركة الجنين 👶" className="text-center">
            <p className="text-lg text-gray-600 mb-6">
              اضغطي على "بدء العد" وابدئي في تسجيل حركات جنينكِ حتى 10 حركات
            </p>
            
            <div className="relative bg-gradient-to-br from-pink-100 via-purple-100 to-pink-100 p-8 rounded-3xl w-72 h-72 mx-auto flex flex-col items-center justify-center shadow-2xl mb-6 border-4 border-pink-200">
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-pink-200 opacity-50"></div>
              </div>
              
              <div className="relative z-10">
                <p className="text-xl text-gray-700 mb-2">عدد الحركات</p>
                <p className="text-8xl font-bold text-brand-pink-dark my-3 drop-shadow-lg">
                  {kickCount}
                </p>
                <p className="text-2xl text-gray-700 font-mono bg-white bg-opacity-70 px-4 py-2 rounded-full">
                  {formatTime(elapsedTime)}
                </p>
              </div>
              
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#E0E0E0" strokeWidth="2" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="#EC4899" strokeWidth="3"
                  strokeDasharray={`${(kickCount / 10) * 283} 283`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>

            {renderKickProgress()}

            <div className="mb-6 min-h-[100px]">
              {statusMessage && (
                <div className={`${statusMessage.bgColor} border-r-4 ${statusMessage.borderColor} p-5 rounded-lg ${statusMessage.textColor} animate-fade-in`}>
                  <div className="flex items-start gap-3">
                    <span className="text-4xl">{statusMessage.icon}</span>
                    <div className="flex-1 text-right">
                      <p className="font-bold text-lg mb-1">{statusMessage.title}</p>
                      <p className="mb-1">{statusMessage.message}</p>
                      {statusMessage.subMessage && (
                        <p className="text-sm font-semibold">{statusMessage.subMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {timerActive && kickCount > 0 && (
              <div className="mb-6">
                <label className="block text-right text-sm font-medium text-gray-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات عن النشاط أو الوقت..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-right text-sm resize-none"
                  rows={2}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {!timerActive && kickCount < 10 && (
                <Button 
                  onClick={startCounter} 
                  className="w-full sm:w-auto bg-gradient-to-r from-brand-pink to-purple-500 hover:from-brand-pink-dark hover:to-purple-600 text-lg py-3 px-6"
                >
                  <span className="flex items-center gap-2">
                    <span>▶️</span>
                    <span>{kickCount > 0 ? 'بدء عد جديد' : 'بدء العد'}</span>
                  </span>
                </Button>
              )}

              {timerActive && kickCount < 10 && (
                <Button 
                  onClick={logKick} 
                  className="w-full sm:w-auto text-2xl py-4 px-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg transform hover:scale-105 transition-all"
                >
                  تسجيل حركة 👣
                </Button>
              )}

              {timerActive && kickCount > 0 && kickCount < 10 && (
                <Button 
                  onClick={saveIncompleteSession}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <span className="flex items-center gap-2">
                    <span>💾</span>
                    <span>حفظ وإنهاء</span>
                  </span>
                </Button>
              )}

              <Button 
                onClick={resetCounter} 
                variant="secondary" 
                className="w-full sm:w-auto"
              >
                <span className="flex items-center gap-2">
                  <span>🔄</span>
                  <span>إعادة الضبط</span>
                </span>
              </Button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-brand-pink rounded"
                />
                <span className="text-sm text-gray-700">🔊 تفعيل الأصوات</span>
              </label>
            </div>
          </Card>

          {pastSessions.length > 0 && (
            <Card title="📊 إحصائيات الجلسات">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600">{sessionStats.totalSessions}</p>
                  <p className="text-sm text-gray-600">إجمالي الجلسات</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">{sessionStats.completedSessions}</p>
                  <p className="text-sm text-gray-600">جلسات مكتملة</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-purple-600">{formatTime(Math.floor(sessionStats.averageTime))}</p>
                  <p className="text-sm text-gray-600">متوسط الوقت</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-yellow-600">{sessionStats.todaySessions}</p>
                  <p className="text-sm text-gray-600">جلسات اليوم</p>
                </div>
              </div>

              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="secondary"
                className="w-full"
              >
                {showHistory ? '▲ إخفاء السجل' : '▼ عرض السجل الكامل'}
              </Button>

              {showHistory && (
                <div className="mt-6 space-y-3 max-h-96 overflow-y-auto">
                  {pastSessions.slice().reverse().map((session, index) => (
                    <div
                      key={session.id || index}
                      className={`p-4 rounded-lg border-r-4 ${
                        session.completed 
                          ? 'bg-green-50 border-green-500' 
                          : 'bg-gray-50 border-gray-400'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 text-right">
                          <p className="font-bold text-gray-800">
                            {session.date.toLocaleDateString('ar-EG', { 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {session.startTime.toLocaleTimeString('ar-EG', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          <p className="text-sm mt-2">
                            <span className="font-semibold">{session.totalKicks}</span> حركات في{' '}
                            <span className="font-semibold">{formatTime(session.duration)}</span>
                          </p>
                          {session.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">"{session.notes}"</p>
                          )}
                        </div>
                        <span className="text-3xl">
                          {session.completed ? '✅' : '⏸️'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <Card title="📖 تعليمات الاستخدام" className="lg:w-96 w-full lg:sticky lg:top-4">
          <div className="space-y-4 text-right">
            <div className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200">
              <p className="font-bold text-brand-pink-dark mb-2 flex items-center gap-2">
                <span>١.</span>
                <span>استرخي وارتاحي</span>
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                ابحثي عن وضعية مريحة، ويفضل الاستلقاء على جانبك الأيسر لتحسين الدورة الدموية للجنين.
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
              <p className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                <span>٢.</span>
                <span>ابدئي العد</span>
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                اضغطي على زر بدء العد لبدء الجلسة. ستستمر الجلسة لمدة ساعتين كحد أقصى.
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <p className="font-bold text-green-700 mb-2 flex items-center gap-2">
                <span>٣.</span>
                <span>سجلي الحركات</span>
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                مع كل حركة واضحة تشعرين بها (ركلة، التفاف، دفعة)، اضغطي على زر تسجيل حركة.
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
              <p className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <span>🎯</span>
                <span>الهدف: 10 حركات</span>
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                عند تسجيل الحركة العاشرة، ستنتهي الجلسة تلقائياً بنجاح.
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border-2 border-red-300">
              <p className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <span>⚠️</span>
                <span>متى يجب القلق؟</span>
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                إذا مرت ساعتان ولم تسجلي 10 حركات، اتصلي بطبيبك فوراً للاطمئنان.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FetalMovementCounterPage;