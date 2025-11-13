import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Page, PatientRecord } from '../types';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  Bar
} from 'recharts';
import { useUser } from '../hooks/useUser';
import { getPatientRecordsByUserId } from "../services/mockDB";
import LoadingSpinner from '../components/LoadingSpinner';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface ChartDataPoint {
  date: string;
  fullDate: Date;
  weight: number;
  systolicBp?: number;
  diastolicBp?: number;
  glucose?: number;
  hb?: number;
  overallRisk?: number;
}

interface StatCard {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: string;
  color: string;
  bgColor: string;
}

type TimeRange = '7days' | '30days' | '90days' | 'all';
type ChartView = 'line' | 'area';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getRiskColor = (score?: number) => {
  if (!score) return '#9CA3AF';
  if (score >= 0.75) return '#EF4444';
  if (score >= 0.5) return '#F59E0B';
  if (score >= 0.25) return '#3B82F6';
  return '#10B981';
};

const getRiskLabel = (score?: number) => {
  if (!score) return 'غير متوفر';
  if (score >= 0.75) return 'عالي';
  if (score >= 0.5) return 'متوسط';
  if (score >= 0.25) return 'منخفض';
  return 'طبيعي';
};

const calculateTrend = (data: number[]): { trend: 'up' | 'down' | 'stable'; percentage: number } => {
  if (data.length < 2) return { trend: 'stable', percentage: 0 };
  
  const recent = data[data.length - 1];
  const previous = data[data.length - 2];
  const diff = recent - previous;
  const percentage = Math.abs((diff / previous) * 100);
  
  if (Math.abs(diff) < 0.01) return { trend: 'stable', percentage: 0 };
  return { trend: diff > 0 ? 'up' : 'down', percentage };
};

const getHealthStatus = (latestRecord?: PatientRecord): string => {
  if (!latestRecord?.aiResponse?.riskScores) return 'غير متوفر';
  
  const risk = latestRecord.aiResponse.riskScores.overallRisk;
  if (risk >= 0.75) return '⚠️ يُنصح بمراجعة الطبيب فوراً';
  if (risk >= 0.5) return '⚡ يُنصح بالمتابعة الدورية';
  if (risk >= 0.25) return 'ℹ️ متابعة عادية';
  return '✅ حالة طبيعية';
};

const isValueNormal = (type: string, value?: number): boolean => {
  if (!value) return true;
  
  switch (type) {
    case 'systolicBp': return value >= 90 && value <= 140;
    case 'diastolicBp': return value >= 60 && value <= 90;
    case 'glucose': return value >= 70 && value <= 100;
    case 'hb': return value >= 11 && value <= 15;
    case 'weight': return true; // Weight is relative
    default: return true;
  }
};

// ============================================================================
// CUSTOM TOOLTIP COMPONENT
// ============================================================================
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4" dir="rtl">
      <p className="font-bold text-gray-800 mb-2 border-b pb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-4 py-1">
          <span className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">{entry.name}:</span>
          </span>
          <span className="font-bold text-gray-900">
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
const StatCardComponent: React.FC<{ stat: StatCard }> = ({ stat }) => (
  <div className={`${stat.bgColor} rounded-xl p-5 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-4xl">{stat.icon}</span>
      <div className="text-right">
        <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
          {stat.unit && <span className="text-sm text-gray-500">{stat.unit}</span>}
        </div>
      </div>
    </div>
    {stat.trend && stat.trendValue && (
      <div className="flex items-center justify-end gap-2 text-sm">
        <span className="text-gray-600">{stat.trendValue}</span>
        <span className={stat.trend === 'up' ? 'text-red-500' : stat.trend === 'down' ? 'text-green-500' : 'text-gray-500'}>
          {stat.trend === 'up' ? '↗' : stat.trend === 'down' ? '↘' : '→'}
        </span>
      </div>
    )}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const DashboardPage: React.FC<{ navigate: (page: Page) => void }> = ({ navigate }) => {
  const { user } = useUser();
  const [userRecords, setUserRecords] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [chartView, setChartView] = useState<ChartView>('line');
  const [selectedMetrics, setSelectedMetrics] = useState({
    weight: true,
    bp: true,
    glucose: true,
    hb: true,
    risk: true
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const fetchRecords = useCallback(async () => {
    if (user?.id) {
      setIsLoading(true);
      setError(null);
      try {
        const records = await getPatientRecordsByUserId(user.id);
        setUserRecords(records);
      } catch (err) {
        console.error("Failed to fetch user records:", err);
        setError("فشل في تحميل البيانات. يرجى المحاولة مرة أخرى.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      setUserRecords([]);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ============================================================================
  // DATA PROCESSING
  // ============================================================================
  const filteredRecords = useMemo(() => {
    if (timeRange === 'all') return userRecords;
    
    const now = new Date();
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
    const cutoffDate = new Date(now.setDate(now.getDate() - days));
    
    return userRecords.filter(record => record.timestamp >= cutoffDate);
  }, [userRecords, timeRange]);

  const chartData = useMemo((): ChartDataPoint[] => {
    return filteredRecords.map(record => ({
      date: record.timestamp.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
      fullDate: record.timestamp,
      weight: record.measurementData.currentWeight,
      systolicBp: record.labResults.systolicBp,
      diastolicBp: record.labResults.diastolicBp,
      glucose: record.labResults.fastingGlucose,
      hb: record.labResults.hb,
      overallRisk: record.aiResponse?.riskScores?.overallRisk ? record.aiResponse.riskScores.overallRisk * 100 : undefined,
    }));
  }, [filteredRecords]);

  const latestRecord = useMemo(() => userRecords[userRecords.length - 1], [userRecords]);

  // ============================================================================
  // STATISTICS CALCULATIONS
  // ============================================================================
  const statistics = useMemo((): StatCard[] => {
    if (!latestRecord) return [];

    const weights = chartData.map(d => d.weight).filter(Boolean);
    const weightTrend = calculateTrend(weights);

    const systolicBps = chartData.map(d => d.systolicBp).filter((v): v is number => v !== undefined);
    const bpTrend = calculateTrend(systolicBps);

    const glucoses = chartData.map(d => d.glucose).filter((v): v is number => v !== undefined);
    const glucoseTrend = calculateTrend(glucoses);

    const hbs = chartData.map(d => d.hb).filter((v): v is number => v !== undefined);
    const hbTrend = calculateTrend(hbs);

    return [
      {
        title: 'الوزن الحالي',
        value: latestRecord.measurementData.currentWeight.toFixed(1),
        unit: 'كجم',
        trend: weightTrend.trend,
        trendValue: `${weightTrend.percentage.toFixed(1)}%`,
        icon: '⚖️',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      },
      {
        title: 'ضغط الدم',
        value: latestRecord.labResults.systolicBp && latestRecord.labResults.diastolicBp 
          ? `${latestRecord.labResults.systolicBp}/${latestRecord.labResults.diastolicBp}` 
          : 'غير متوفر',
        unit: '',
        trend: bpTrend.trend,
        trendValue: `${bpTrend.percentage.toFixed(1)}%`,
        icon: '❤️',
        color: isValueNormal('systolicBp', latestRecord.labResults.systolicBp) ? 'text-green-600' : 'text-red-600',
        bgColor: isValueNormal('systolicBp', latestRecord.labResults.systolicBp) ? 'bg-green-50' : 'bg-red-50'
      },
      {
        title: 'سكر الدم',
        value: latestRecord.labResults.fastingGlucose?.toFixed(1) || 'غير متوفر',
        unit: 'mg/dL',
        trend: glucoseTrend.trend,
        trendValue: `${glucoseTrend.percentage.toFixed(1)}%`,
        icon: '🩸',
        color: isValueNormal('glucose', latestRecord.labResults.fastingGlucose) ? 'text-blue-600' : 'text-orange-600',
        bgColor: isValueNormal('glucose', latestRecord.labResults.fastingGlucose) ? 'bg-blue-50' : 'bg-orange-50'
      },
      {
        title: 'الهيموجلوبين',
        value: latestRecord.labResults.hb?.toFixed(1) || 'غير متوفر',
        unit: 'g/dL',
        trend: hbTrend.trend,
        trendValue: `${hbTrend.percentage.toFixed(1)}%`,
        icon: '🔬',
        color: isValueNormal('hb', latestRecord.labResults.hb) ? 'text-teal-600' : 'text-yellow-600',
        bgColor: isValueNormal('hb', latestRecord.labResults.hb) ? 'bg-teal-50' : 'bg-yellow-50'
      }
    ];
  }, [latestRecord, chartData]);

  // ============================================================================
  // RENDER: LOADING STATE
  // ============================================================================
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="جارِ تحميل سجل المتابعة الصحية..." />
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <div>
        <BackButton navigate={navigate} />
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-xl font-bold text-red-600 mb-2">حدث خطأ</p>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={fetchRecords} className="inline-flex items-center gap-2">
              <span>🔄</span>
              <span>إعادة المحاولة</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: EMPTY STATE
  // ============================================================================
  if (userRecords.length === 0) {
    return (
      <div>
        <BackButton navigate={navigate} />
        <Card title="لوحة المتابعة الصحية">
          <div className="text-center py-12">
            <div className="text-8xl mb-6 animate-bounce">📊</div>
            <p className="text-2xl font-bold text-gray-800 mb-3">لا توجد بيانات لعرضها بعد</p>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              يرجى إكمال تقييم أولاً من خلال أداة "التقييم الشامل" لعرض مخططاتك الصحية والبدء في متابعة حالتك.
            </p>
            <Button 
              onClick={() => navigate(Page.Assessment)} 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-pink to-purple-500"
            >
              <span>📝</span>
              <span>ابدئي التقييم الآن</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: DASHBOARD
  // ============================================================================
  return (
    <div className="space-y-6 pb-8">
      <BackButton navigate={navigate} />

      {/* Header Section */}
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <span>📊</span>
              <span>لوحة المتابعة الصحية</span>
            </h1>
            <p className="text-gray-600">
              آخر تحديث: {latestRecord?.timestamp.toLocaleDateString('ar-EG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <Button 
            onClick={fetchRecords} 
            variant="secondary"
            className="inline-flex items-center gap-2"
          >
            <span>🔄</span>
            <span>تحديث</span>
          </Button>
        </div>
      </Card>

      {/* Health Status Alert */}
      {latestRecord && (
        <Card>
          <div className={`p-5 rounded-xl border-r-4 ${
            (latestRecord.aiResponse?.riskScores?.overallRisk || 0) >= 0.75 
              ? 'bg-red-50 border-red-500' 
              : (latestRecord.aiResponse?.riskScores?.overallRisk || 0) >= 0.5
              ? 'bg-yellow-50 border-yellow-500'
              : 'bg-green-50 border-green-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-lg font-bold text-gray-800 mb-1">الحالة الصحية الحالية</p>
                <p className="text-2xl font-bold">
                  {getHealthStatus(latestRecord)}
                </p>
              </div>
              <div className="text-5xl">
                {(latestRecord.aiResponse?.riskScores?.overallRisk || 0) >= 0.75 ? '⚠️' : 
                 (latestRecord.aiResponse?.riskScores?.overallRisk || 0) >= 0.5 ? '⚡' : '✅'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statistics.map((stat, index) => (
          <StatCardComponent key={index} stat={stat} />
        ))}
      </div>

      {/* Controls Section */}
      <Card>
        <div className="space-y-4">
          {/* Time Range Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
              📅 الفترة الزمنية
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: '7days' as TimeRange, label: '7 أيام' },
                { value: '30days' as TimeRange, label: '30 يوم' },
                { value: '90days' as TimeRange, label: '90 يوم' },
                { value: 'all' as TimeRange, label: 'الكل' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    timeRange === option.value
                      ? 'bg-brand-pink text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Type Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
              📈 نوع العرض
            </label>
            <div className="flex gap-2">
              {[
                { value: 'line' as ChartView, label: 'خطي', icon: '📈' },
                { value: 'area' as ChartView, label: 'مساحي', icon: '📊' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setChartView(option.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    chartView === option.value
                      ? 'bg-brand-pink text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Weight Chart */}
      {selectedMetrics.weight && (
        <Card title="⚖️ متابعة الوزن">
          <ResponsiveContainer width="100%" height={350}>
            {chartView === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  reversed={true}
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                />
                <YAxis 
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  name="الوزن الحالي (كجم)" 
                  stroke="#9333EA" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#9333EA' }}
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            ) : (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333EA" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#9333EA" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" reversed={true} tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12 }} stroke="#6B7280" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  name="الوزن الحالي (كجم)"
                  stroke="#9333EA" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorWeight)" 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </Card>
      )}

      {/* Blood Pressure Chart */}
      {selectedMetrics.bp && (
        <Card title="❤️ متابعة ضغط الدم">
          <ResponsiveContainer width="100%" height={350}>
            {chartView === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" reversed={true} tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis domain={[60, 'dataMax + 10']} tick={{ fontSize: 12 }} stroke="#6B7280" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
                <Line 
                  type="monotone" 
                  dataKey="systolicBp" 
                  name="الانقباضي" 
                  stroke="#EC4899" 
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#EC4899' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="diastolicBp" 
                  name="الانبساطي" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#3B82F6' }}
                />
              </LineChart>
            ) : (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSystolic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorDiastolic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" reversed={true} tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis domain={[60, 'dataMax + 10']} tick={{ fontSize: 12 }} stroke="#6B7280" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
                <Area 
                  type="monotone" 
                  dataKey="systolicBp" 
                  name="الانقباضي"
                  stroke="#EC4899" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSystolic)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="diastolicBp" 
                  name="الانبساطي"
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorDiastolic)" 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-right">
              <span className="font-bold">المعدل الطبيعي:</span> الانقباضي: 90-140، الانبساطي: 60-90
            </p>
          </div>
        </Card>
      )}

      {/* Glucose & Hemoglobin Chart */}
      {(selectedMetrics.glucose || selectedMetrics.hb) && (
        <Card title="🩸 متابعة سكر الدم والهيموجلوبين">
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" reversed={true} tick={{ fontSize: 12 }} stroke="#6B7280" />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                stroke="#10B981" 
                domain={['dataMin - 5', 'dataMax + 5']}
                tick={{ fontSize: 12 }}
                label={{ value: 'سكر الدم', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#F59E0B" 
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 12 }}
                label={{ value: 'الهيموجلوبين', angle: 90, position: 'insideRight' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
              {selectedMetrics.glucose && (
                chartView === 'line' ? (
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="glucose" 
                    name="سكر الدم (صائم)" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#10B981' }}
                  />
                ) : (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="glucose"
                    name="سكر الدم (صائم)"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="#10B98133"
                  />
                )
              )}
              {selectedMetrics.hb && (
                <Bar 
                  yAxisId="right" 
                  dataKey="hb" 
                  name="الهيموجلوبين" 
                  fill="#F59E0B"
                  radius={[8, 8, 0, 0]}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
            <p className="text-sm text-gray-600 text-right">
              <span className="font-bold">المعدل الطبيعي لسكر الدم (صائم):</span> 70-100 mg/dL
            </p>
            <p className="text-sm text-gray-600 text-right">
              <span className="font-bold">المعدل الطبيعي للهيموجلوبين:</span> 11-15 g/dL
            </p>
          </div>
        </Card>
      )}

      {/* Risk Score Trend Chart */}
      {selectedMetrics.risk && chartData.some(d => d.overallRisk !== undefined) && (
        <Card title="⚠️ تطور مستوى الخطورة">
          <ResponsiveContainer width="100%" height={350}>
            {chartView === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" reversed={true} tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }} 
                  stroke="#6B7280"
                  label={{ value: 'نسبة الخطورة (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
                <Line 
                  type="monotone" 
                  dataKey="overallRisk" 
                  name="مستوى الخطورة (%)" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const risk = payload.overallRisk / 100;
                    const color = getRiskColor(risk);
                    return <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            ) : (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" reversed={true} tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }} 
                  stroke="#6B7280"
                  label={{ value: 'نسبة الخطورة (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
                <Area 
                  type="monotone" 
                  dataKey="overallRisk" 
                  name="مستوى الخطورة (%)"
                  stroke="#EF4444" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRisk)" 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-green-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="text-xs font-semibold text-gray-700">طبيعي</p>
                <p className="text-xs text-gray-500">&lt; 25%</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="w-4 h-4 bg-blue-400 rounded-full mx-auto mb-2"></div>
                <p className="text-xs font-semibold text-gray-700">منخفض</p>
                <p className="text-xs text-gray-500">25-50%</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="w-4 h-4 bg-yellow-400 rounded-full mx-auto mb-2"></div>
                <p className="text-xs font-semibold text-gray-700">متوسط</p>
                <p className="text-xs text-gray-500">50-75%</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2"></div>
                <p className="text-xs font-semibold text-gray-700">عالي</p>
                <p className="text-xs text-gray-500">&gt; 75%</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Records Timeline */}
      <Card title="📋 سجل الزيارات">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {userRecords.slice().reverse().map((record, index) => (
            <div 
              key={record.id || index}
              className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">
                      {record.aiResponse?.riskScores?.overallRisk && record.aiResponse.riskScores.overallRisk >= 0.75 ? '🔴' :
                       record.aiResponse?.riskScores?.overallRisk && record.aiResponse.riskScores.overallRisk >= 0.5 ? '🟡' :
                       record.aiResponse?.riskScores?.overallRisk && record.aiResponse.riskScores.overallRisk >= 0.25 ? '🔵' : '🟢'}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">
                        {record.timestamp.toLocaleDateString('ar-EG', { 
                          weekday: 'long',
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {record.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">الوزن</p>
                      <p className="font-bold text-purple-600">{record.measurementData.currentWeight} كجم</p>
                    </div>
                    {record.labResults.systolicBp && record.labResults.diastolicBp && (
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">ضغط الدم</p>
                        <p className="font-bold text-pink-600">
                          {record.labResults.systolicBp}/{record.labResults.diastolicBp}
                        </p>
                      </div>
                    )}
                    {record.labResults.fastingGlucose && (
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">السكر</p>
                        <p className="font-bold text-green-600">{record.labResults.fastingGlucose}</p>
                      </div>
                    )}
                    {record.labResults.hb && (
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">الهيموجلوبين</p>
                        <p className="font-bold text-orange-600">{record.labResults.hb}</p>
                      </div>
                    )}
                  </div>

                  {record.aiResponse?.brief_summary && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border-r-4 border-blue-400">
                      <p className="text-sm text-gray-700">{record.aiResponse.brief_summary}</p>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    record.aiResponse?.riskScores?.overallRisk && record.aiResponse.riskScores.overallRisk >= 0.75 
                      ? 'bg-red-100 text-red-700'
                      : record.aiResponse?.riskScores?.overallRisk && record.aiResponse.riskScores.overallRisk >= 0.5
                      ? 'bg-yellow-100 text-yellow-700'
                      : record.aiResponse?.riskScores?.overallRisk && record.aiResponse.riskScores.overallRisk >= 0.25
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {getRiskLabel(record.aiResponse?.riskScores?.overallRisk)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary & Insights */}
      {userRecords.length >= 3 && (
        <Card title="💡 رؤى وملاحظات">
          <div className="space-y-4">
            {/* Weight Trend Insight */}
            {(() => {
              const weights = chartData.map(d => d.weight);
              const trend = calculateTrend(weights);
              const weightChange = weights[weights.length - 1] - weights[0];
              
              return (
                <div className="bg-purple-50 border-r-4 border-purple-500 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">⚖️</span>
                    <div>
                      <p className="font-bold text-gray-800 mb-1">تغير الوزن</p>
                      <p className="text-sm text-gray-700">
                        {Math.abs(weightChange) < 0.5 
                          ? 'وزنك مستقر تقريباً خلال الفترة المختارة.' 
                          : weightChange > 0
                          ? `زاد وزنك بمقدار ${weightChange.toFixed(1)} كجم خلال الفترة المختارة.`
                          : `انخفض وزنك بمقدار ${Math.abs(weightChange).toFixed(1)} كجم خلال الفترة المختارة.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Blood Pressure Insight */}
            {(() => {
              const systolicValues = chartData.map(d => d.systolicBp).filter((v): v is number => v !== undefined);
              if (systolicValues.length === 0) return null;
              
              const avgSystolic = systolicValues.reduce((a, b) => a + b, 0) / systolicValues.length;
              const isNormal = avgSystolic >= 90 && avgSystolic <= 140;
              
              return (
                <div className={`border-r-4 p-4 rounded-lg ${
                  isNormal ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">❤️</span>
                    <div>
                      <p className="font-bold text-gray-800 mb-1">ضغط الدم</p>
                      <p className="text-sm text-gray-700">
                        متوسط ضغطك الانقباضي خلال الفترة المختارة: {avgSystolic.toFixed(0)} {' '}
                        {isNormal 
                          ? '✅ ضمن المعدل الطبيعي.' 
                          : avgSystolic > 140 
                          ? '⚠️ أعلى من الطبيعي، يُنصح بمراجعة الطبيب.'
                          : '⚠️ أقل من الطبيعي، يُنصح بمراجعة الطبيب.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Glucose Insight */}
            {(() => {
              const glucoseValues = chartData.map(d => d.glucose).filter((v): v is number => v !== undefined);
              if (glucoseValues.length === 0) return null;
              
              const avgGlucose = glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length;
              const isNormal = avgGlucose >= 70 && avgGlucose <= 100;
              
              return (
                <div className={`border-r-4 p-4 rounded-lg ${
                  isNormal ? 'bg-blue-50 border-blue-500' : 'bg-orange-50 border-orange-500'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">🩸</span>
                    <div>
                      <p className="font-bold text-gray-800 mb-1">سكر الدم</p>
                      <p className="text-sm text-gray-700">
                        متوسط سكر الدم (صائم) خلال الفترة المختارة: {avgGlucose.toFixed(0)} mg/dL {' '}
                        {isNormal 
                          ? '✅ ضمن المعدل الطبيعي.' 
                          : avgGlucose > 100 
                          ? '⚠️ أعلى من الطبيعي، يُنصح بمراجعة الطبيب للمتابعة.'
                          : '⚠️ أقل من الطبيعي، يُنصح بمراجعة الطبيب.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Overall Risk Trend */}
            {(() => {
              const riskScores = chartData
                .map(d => d.overallRisk)
                .filter((v): v is number => v !== undefined)
                .map(v => v / 100);
              
              if (riskScores.length < 2) return null;
              
              const trend = calculateTrend(riskScores);
              const latestRisk = riskScores[riskScores.length - 1];
              
              return (
                <div className={`border-r-4 p-4 rounded-lg ${
                  trend.trend === 'down' ? 'bg-green-50 border-green-500' :
                  trend.trend === 'up' ? 'bg-red-50 border-red-500' :
                  'bg-gray-50 border-gray-500'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">
                      {trend.trend === 'down' ? '📉' : trend.trend === 'up' ? '📈' : '➡️'}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800 mb-1">اتجاه مستوى الخطورة</p>
                      <p className="text-sm text-gray-700">
                        {trend.trend === 'down' 
                          ? `تحسن ملحوظ! انخفض مستوى الخطورة بنسبة ${trend.percentage.toFixed(1)}% منذ آخر قراءة. استمري على هذا النهج! 🎉`
                          : trend.trend === 'up'
                          ? `ارتفع مستوى الخطورة بنسبة ${trend.percentage.toFixed(1)}% منذ آخر قراءة. يُنصح بمراجعة الطبيب للمتابعة. ⚠️`
                          : 'مستوى الخطورة مستقر. استمري في المتابعة الدورية.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Button 
          onClick={() => navigate(Page.Assessment)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-pink to-purple-500"
        >
          <span>📝</span>
          <span>إضافة تقييم جديد</span>
        </Button>
        <Button 
          onClick={() => navigate(Page.History)}
          variant="secondary"
          className="inline-flex items-center gap-2"
        >
          <span>📚</span>
          <span>عرض السجل الكامل</span>
        </Button>
      </div>
    </div>
  );
};

export default DashboardPage;