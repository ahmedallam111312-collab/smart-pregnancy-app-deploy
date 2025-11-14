import React, { useState, useCallback, Suspense } from 'react';
import { Page, Role } from './types';
import { UserProvider, useUser } from './context/UserContext';
import LoadingSpinner from './components/LoadingSpinner';

// (هذه الملفات من خطة الأسبوع 3، ولكن سنستخدمها هنا)
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const AssessmentPage = React.lazy(() => import('./pages/AssessmentPage'));
const ChatbotPage = React.lazy(() => import('./pages/ChatbotPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const FetalMovementCounterPage = React.lazy(() => import('./pages/FetalMovementCounterPage'));
const WeeklyGuidePage = React.lazy(() => import('./pages/WeeklyGuidePage'));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'));

// ---------------------------------
// 🚨 (1.4) المكون الجديد الذي يعالج التحميل
// ---------------------------------
const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Home);
  const { user, logout, authLoading } = useUser(); // <-- إضافة authLoading

  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(Page.Login);
  };

  // 🚨 (1.4) عرض شاشة تحميل أثناء التحقق من المستخدم
  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-pink-light flex items-center justify-center">
        <LoadingSpinner message="جارٍ التحقق من المستخدم..." />
      </div>
    );
  }

  // 🚨 (1.4) عرض صفحة الدخول إذا لم يكن هناك مستخدم
  if (!user) {
    // استخدام Suspense لصفحة الدخول
    return (
      <Suspense fallback={<LoadingSpinner message="جارٍ التحميل..." />}>
        <LoginPage navigate={navigate} /> 
      </Suspense>
    );
  }
  
  // ... (هذا الكود يبقى كما هو)
  const renderPage = () => {
    switch (currentPage) {
      case Page.Home:
        return <HomePage navigate={navigate} />;
      case Page.Assessment:
        return <AssessmentPage navigate={navigate} />;
      case Page.Chatbot:
        return <ChatbotPage navigate={navigate} />;
      case Page.Dashboard:
        return <DashboardPage navigate={navigate} />;
      case Page.FetalMovement:
        return <FetalMovementCounterPage navigate={navigate} />;
      case Page.WeeklyGuide:
        return <WeeklyGuidePage navigate={navigate} />;
      case Page.AdminDashboard:
        return <AdminDashboardPage navigate={navigate} />;
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  return (
    <div className="bg-brand-pink-light min-h-screen font-sans">
      <header className="bg-brand-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-pink-dark">مساعد الحمل الذكي</h1>
        <button 
          onClick={handleLogout} 
          className="bg-brand-pink text-white py-2 px-4 rounded-lg hover:bg-brand-pink-dark transition-colors"
        >
          تسجيل الخروج
        </button>
      </header>
      <main className="p-4 sm:p-6 md:p-8">
        {/* (Task 3.5) استخدام Suspense لتحميل الصفحات */}
        <Suspense fallback={<LoadingSpinner message="جارٍ تحميل الصفحة..." />}>
          {renderPage()}
        </Suspense>
      </main>
    </div>
  );
};
// ---------------------------------

// المكون الرئيسي App (الآن يغلف فقط)
const App: React.FC = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};

export default App;