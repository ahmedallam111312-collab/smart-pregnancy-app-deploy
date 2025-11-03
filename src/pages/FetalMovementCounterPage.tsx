import React, { useState, useEffect, useRef } from 'react';
import { Page } from '../types';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';

const FetalMovementCounterPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const [kickCount, setKickCount] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  // Fix: The return type of setInterval in the browser is `number`, not `NodeJS.Timeout`.
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        if (startTime) {
          const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
          setElapsedTime(elapsed);
          if (elapsed >= 7200) { // 2 hours
            setTimerActive(false);
          }
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, startTime]);
  
  const startCounter = () => {
    resetCounter();
    setTimerActive(true);
    setStartTime(new Date());
  };

  const logKick = () => {
    if (timerActive && kickCount < 10) {
      setKickCount(prev => prev + 1);
      if(kickCount + 1 === 10){
        setTimerActive(false);
      }
    }
  };

  const resetCounter = () => {
    setKickCount(0);
    setTimerActive(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getStatusMessage = () => {
    if (kickCount === 10) {
      return (
        <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center">
          <p className="font-bold">ممتاز! لقد سجلتِ 10 حركات.</p>
          <p>الوقت المستغرق: {formatTime(elapsedTime)}</p>
        </div>
      );
    }
    if (elapsedTime >= 7200 && kickCount < 10) {
      return (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg text-center">
          <p className="font-bold">انتبهي!</p>
          <p>مرت ساعتان ولم يتم تسجيل 10 حركات. يرجى استشارة طبيبكِ.</p>
        </div>
      );
    }
    return null;
  };


  return (
    <div>
      <BackButton navigate={navigate} />
       <div className="flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto items-start">
        <Card title="عداد حركة الجنين" className="flex-1 text-center w-full">
            <p className="text-lg text-gray-600 mb-6">اضغطي على "بدء العد" وابدئي في تسجيل حركات جنينكِ.</p>
            
            <div className="bg-brand-pink-light p-8 rounded-full w-64 h-64 mx-auto flex flex-col items-center justify-center shadow-inner mb-6">
            <p className="text-xl text-gray-700">عدد الحركات</p>
            <p className="text-7xl font-bold text-brand-pink-dark my-2">{kickCount}</p>
            <p className="text-xl text-gray-700">الوقت: {formatTime(elapsedTime)}</p>
            </div>

            <div className="mb-6 min-h-[72px]">
                {getStatusMessage()}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
            {!timerActive && kickCount < 10 && (
                <Button onClick={startCounter} className="w-full sm:w-auto">
                {kickCount > 0 ? 'بدء عد جديد' : 'بدء العد'}
                </Button>
            )}

            {timerActive && (
                <Button onClick={logKick} className="w-full sm:w-auto text-xl" disabled={kickCount === 10}>
                تسجيل حركة 👣
                </Button>
            )}

            <Button onClick={resetCounter} variant="secondary" className="w-full sm:w-auto">
                إعادة الضبط
            </Button>
            </div>
        </Card>

        <Card title="تعليمات الاستخدام" className="flex-1 w-full">
            <div className="space-y-4 text-right">
                <div className="p-3 bg-pink-50 rounded-lg">
                    <p className="font-bold text-brand-pink-dark">١. استرخي</p>
                    <p className="text-gray-700">ابحثي عن وضعية مريحة، ويفضل الاستلقاء على جانبك الأيسر لتحسين الدورة الدموية للجنين.</p>
                </div>
                 <div className="p-3 bg-pink-50 rounded-lg">
                    <p className="font-bold text-brand-pink-dark">٢. ابدئي العد</p>
                    <p className="text-gray-700">اضغطي على زر "بدء العد" لبدء الجلسة التي تستمر لمدة ساعتين كحد أقصى.</p>
                </div>
                 <div className="p-3 bg-pink-50 rounded-lg">
                    <p className="font-bold text-brand-pink-dark">٣. سجلي الحركات</p>
                    <p className="text-gray-700">مع كل حركة واضحة تشعرين بها (ركلة، التفاف، دفعة)، اضغطي على زر "تسجيل حركة".</p>
                </div>
                 <div className="p-3 bg-green-50 rounded-lg">
                    <p className="font-bold text-green-800">الهدف</p>
                    <p className="text-gray-700">الوصول إلى 10 حركات. عند تسجيل الحركة العاشرة، ستنتهي الجلسة بنجاح.</p>
                </div>
                 <div className="p-3 bg-red-50 rounded-lg">
                    <p className="font-bold text-red-800">متى يجب القلق؟</p>
                    <p className="text-gray-700">إذا مرت ساعتان ولم تسجلي 10 حركات، فمن المستحسن الاتصال بطبيبك للاطمئنان.</p>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default FetalMovementCounterPage;
