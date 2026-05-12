import React, { useState, useMemo } from 'react';
import { Page } from '../types';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import { WEEKLY_GUIDE_DATA } from '../constants/weeklyGuideData';

// -----------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------
interface WeekData {
  fetus: string;
  mother: string;
  tips: string[];
}

interface TrimesterInfo {
  name: string;
  range: string;
  color: string;
  icon: string;
  description: string;
}

const TRIMESTERS: Record<number, TrimesterInfo> = {
  1: {
    name: 'الثلث الأول',
    range: 'الأسبوع 1-13',
    color: 'from-pink-100 to-pink-200',
    icon: '🌱',
    description: 'فترة التكوين الأولى للجنين'
  },
  2: {
    name: 'الثلث الثاني',
    range: 'الأسبوع 14-27',
    color: 'from-blue-100 to-blue-200',
    icon: '🌸',
    description: 'فترة النمو السريع والحركة'
  },
  3: {
    name: 'الثلث الثالث',
    range: 'الأسبوع 28-40',
    color: 'from-purple-100 to-purple-200',
    icon: '🌺',
    description: 'فترة الاستعداد للولادة'
  }
};

const MIN_WEEK = 4;
const MAX_WEEK = 40;

// -----------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------
const getTrimester = (week: number): number => {
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
};

const getProgressPercentage = (week: number): number => {
  return ((week - MIN_WEEK) / (MAX_WEEK - MIN_WEEK)) * 100;
};

const getClosestWeek = (targetWeek: number, availableWeeks: number[]): number => {
  return availableWeeks.reduce((prev, curr) =>
    Math.abs(curr - targetWeek) < Math.abs(prev - targetWeek) ? curr : prev
  );
};

// -----------------------------------------------------------------
// Sub Components
// -----------------------------------------------------------------
interface WeekNavigatorProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
}

const WeekNavigator: React.FC<WeekNavigatorProps> = ({ currentWeek, onWeekChange }) => {
  const handlePrevious = () => {
    if (currentWeek > MIN_WEEK) onWeekChange(currentWeek - 1);
  };

  const handleNext = () => {
    if (currentWeek < MAX_WEEK) onWeekChange(currentWeek + 1);
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={handlePrevious}
        disabled={currentWeek <= MIN_WEEK}
        className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        aria-label="الأسبوع السابق"
      >
        <span className="text-2xl">◀️</span>
      </button>
      
      <div className="text-center min-w-[200px]">
        <p className="text-sm text-gray-600 mb-1">أنتِ الآن في</p>
        <p className="text-5xl font-bold text-brand-pink">
          {currentWeek}
        </p>
        <p className="text-sm text-gray-600 mt-1">أسبوع</p>
      </div>

      <button
        onClick={handleNext}
        disabled={currentWeek >= MAX_WEEK}
        className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        aria-label="الأسبوع التالي"
      >
        <span className="text-2xl">▶️</span>
      </button>
    </div>
  );
};

interface ProgressBarProps {
  week: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ week }) => {
  const percentage = getProgressPercentage(week);
  const trimester = getTrimester(week);
  const trimesterInfo = TRIMESTERS[trimester];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>الأسبوع {MIN_WEEK}</span>
        <div className="text-center">
          <span className="text-2xl">{trimesterInfo.icon}</span>
          <p className="font-semibold text-brand-pink-dark">{trimesterInfo.name}</p>
          <p className="text-xs">{trimesterInfo.description}</p>
        </div>
        <span>الأسبوع {MAX_WEEK}</span>
      </div>
      
      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${trimesterInfo.color} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute top-0 h-full w-1 bg-brand-pink-dark shadow-lg transition-all duration-500"
          style={{ left: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>🌱 الثلث الأول</span>
        <span>🌸 الثلث الثاني</span>
        <span>🌺 الثلث الثالث</span>
      </div>
    </div>
  );
};

interface InfoCardProps {
  title: string;
  icon: string;
  content: string | string[];
  bgColor: string;
  titleColor: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, icon, content, bgColor, titleColor }) => (
  <div className={`p-6 ${bgColor} rounded-xl shadow-sm border-2 border-transparent hover:border-gray-300 transition-all`}>
    <h3 className={`text-2xl font-bold ${titleColor} mb-4 flex items-center gap-3`}>
      <span className="text-3xl">{icon}</span>
      <span>{title}</span>
    </h3>
    {Array.isArray(content) ? (
      <ul className="space-y-3">
        {content.map((item, index) => (
          <li key={index} className="flex items-start gap-3 text-gray-700 leading-relaxed">
            <span className="text-xl mt-1 flex-shrink-0">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-lg text-gray-700 leading-relaxed">{content}</p>
    )}
  </div>
);

// -----------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------
interface WeeklyGuidePageProps {
  navigate: (page: Page) => void;
}

const WeeklyGuidePage: React.FC<WeeklyGuidePageProps> = ({ navigate }) => {
  const [selectedWeek, setSelectedWeek] = useState<number>(12);
  const [inputValue, setInputValue] = useState<string>('12');

  // Get available weeks
  const availableWeeks = useMemo(() => {
    return Object.keys(WEEKLY_GUIDE_DATA).map(k => parseInt(k, 10)).sort((a, b) => a - b);
  }, []);

  // Get closest available week data
  const displayData = useMemo(() => {
    const closestWeek = getClosestWeek(selectedWeek, availableWeeks);
    return WEEKLY_GUIDE_DATA[closestWeek];
  }, [selectedWeek, availableWeeks]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const week = parseInt(e.target.value, 10);
    setSelectedWeek(week);
    setInputValue(week.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const week = parseInt(value, 10);
    if (!isNaN(week) && week >= MIN_WEEK && week <= MAX_WEEK) {
      setSelectedWeek(week);
    }
  };

  const handleWeekNavigation = (week: number) => {
    setSelectedWeek(week);
    setInputValue(week.toString());
  };

  const trimesterInfo = TRIMESTERS[getTrimester(selectedWeek)];

  return (
    <div className="space-y-6 pb-12">
      <BackButton navigate={navigate} />

      {/* Header Card */}
      <Card className="border-t-4 border-brand-pink-dark">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-brand-pink-dark flex items-center justify-center gap-3">
            <span className="text-5xl">📅</span>
            دليل الحمل الأسبوعي
          </h1>
          <p className="text-gray-600 text-lg">
            تابعي رحلتك أسبوعاً بأسبوع مع معلومات شاملة عن تطور جنينك وصحتك
          </p>
        </div>
      </Card>

      {/* Week Selector Card */}
      <Card className={`bg-gradient-to-br ${trimesterInfo.color} border-2 border-gray-300`}>
        <div className="space-y-6">
          {/* Week Navigator */}
          <WeekNavigator 
            currentWeek={selectedWeek} 
            onWeekChange={handleWeekNavigation}
          />

          {/* Slider */}
          <div className="space-y-2">
            <label htmlFor="week-slider" className="block text-center text-sm font-medium text-gray-700">
              اسحبي لاختيار الأسبوع
            </label>
            <input
              type="range"
              id="week-slider"
              min={MIN_WEEK}
              max={MAX_WEEK}
              value={selectedWeek}
              onChange={handleSliderChange}
              className="w-full h-3 bg-white/50 rounded-lg appearance-none cursor-pointer slider-thumb"
              style={{ 
                accentColor: '#FF69B4',
              }}
            />
          </div>

          {/* Direct Input */}
          <div className="flex items-center justify-center gap-3">
            <label htmlFor="week-input" className="font-medium text-gray-700">
              أو أدخلي الأسبوع مباشرة:
            </label>
            <input
              type="number"
              id="week-input"
              min={MIN_WEEK}
              max={MAX_WEEK}
              value={inputValue}
              onChange={handleInputChange}
              className="w-20 p-2 text-center text-xl font-bold border-2 border-brand-pink rounded-lg focus:ring-2 focus:ring-brand-pink-dark"
            />
          </div>

          {/* Progress Bar */}
          <ProgressBar week={selectedWeek} />
        </div>
      </Card>

      {/* Content Cards */}
      {displayData ? (
        <div className="space-y-6">
          {/* Fetal Development */}
          <InfoCard
            title="تطور الجنين"
            icon="👶"
            content={displayData.fetus}
            bgColor="bg-gradient-to-br from-pink-50 to-pink-100"
            titleColor="text-pink-800"
          />

          {/* Mother's Changes */}
          <InfoCard
            title="تغيرات الأم"
            icon="🤰"
            content={displayData.mother}
            bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
            titleColor="text-blue-800"
          />

          {/* Important Tips */}
          <InfoCard
            title="نصائح هامة"
            icon="💡"
            content={displayData.tips}
            bgColor="bg-gradient-to-br from-green-50 to-green-100"
            titleColor="text-green-800"
          />

          {/* Milestone Card */}
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300">
            <div className="text-center space-y-3">
              <span className="text-5xl">{trimesterInfo.icon}</span>
              <h3 className="text-2xl font-bold text-orange-800">
                {trimesterInfo.name}
              </h3>
              <p className="text-gray-700">{trimesterInfo.range}</p>
              <p className="text-gray-600 italic">{trimesterInfo.description}</p>
              <div className="pt-3 border-t border-orange-200">
                <p className="text-sm text-gray-600">
                  {MAX_WEEK - selectedWeek === 0 
                    ? '🎉 لقد وصلتِ إلى نهاية رحلة الحمل! استعدي للقاء طفلك' 
                    : `باقي ${MAX_WEEK - selectedWeek} أسبوع على الموعد المتوقع للولادة`}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📭</span>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              لا توجد معلومات متاحة
            </h3>
            <p className="text-gray-500">
              يرجى اختيار أسبوع آخر لعرض المعلومات.
            </p>
          </div>
        </Card>
      )}

      {/* Help Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300">
        <div className="flex items-start gap-4">
          <span className="text-4xl">ℹ️</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-brand-pink-dark mb-2">معلومات مهمة</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>كل حمل فريد من نوعه - قد تختلف تجربتك عن المعلومات المذكورة</li>
              <li>استخدمي هذا الدليل كمرجع عام وليس كبديل عن استشارة الطبيب</li>
              <li>إذا لاحظتِ أي أعراض غير طبيعية، استشيري طبيبك فوراً</li>
              <li>احفظي هذه الصفحة في المفضلة لمتابعة تطورك الأسبوعي</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WeeklyGuidePage;