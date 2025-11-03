
import React, { useState } from 'react';
import { Page } from '../types';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import { WEEKLY_GUIDE_DATA } from '../constants/weeklyGuideData';

const WeeklyGuidePage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const [selectedWeek, setSelectedWeek] = useState<number>(12);

  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const week = parseInt(e.target.value, 10);
    if (week >= 4 && week <= 40) {
      setSelectedWeek(week);
    }
  };

  const weekData = WEEKLY_GUIDE_DATA[selectedWeek] || Object.values(WEEKLY_GUIDE_DATA).find((_, i) => {
    const weekKey = Object.keys(WEEKLY_GUIDE_DATA)[i];
    return selectedWeek <= parseInt(weekKey, 10);
  });
  
  const closestWeek = Object.keys(WEEKLY_GUIDE_DATA).reduce((prev, curr) => 
    (Math.abs(parseInt(curr, 10) - selectedWeek) < Math.abs(parseInt(prev, 10) - selectedWeek) ? curr : prev)
  );
  
  const displayData = WEEKLY_GUIDE_DATA[parseInt(closestWeek, 10)];


  return (
    <div>
      <BackButton navigate={navigate} />
      <Card title="دليل الحمل الأسبوعي" className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <label htmlFor="week-selector" className="block text-xl font-medium text-brand-gray-dark mb-4">
            اختاري أسبوع الحمل (4-40)
          </label>
          <input
            type="range"
            id="week-selector"
            min="4"
            max="40"
            value={selectedWeek}
            onChange={handleWeekChange}
            className="w-full max-w-lg h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: '#FF69B4' }}
          />
          <p className="text-3xl font-bold text-brand-pink mt-4">الأسبوع {selectedWeek}</p>
        </div>

        {displayData ? (
          <div className="space-y-6">
            <div className="p-4 bg-pink-50 rounded-lg">
              <h3 className="text-2xl font-semibold text-brand-pink-dark mb-2">👶 تطور الجنين</h3>
              <p className="text-lg text-gray-700">{displayData.fetus}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-2xl font-semibold text-blue-800 mb-2">🤰 تغيرات الأم</h3>
              <p className="text-lg text-gray-700">{displayData.mother}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-2xl font-semibold text-green-800 mb-2">💡 نصائح هامة</h3>
              <ul className="list-disc list-inside space-y-2 text-lg text-gray-700">
                {displayData.tips.map((tip, index) => <li key={index}>{tip}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">يرجى اختيار أسبوع لعرض المعلومات.</p>
        )}
      </Card>
    </div>
  );
};

export default WeeklyGuidePage;
