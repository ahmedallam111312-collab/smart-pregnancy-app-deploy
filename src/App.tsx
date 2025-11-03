import React, { useState, useCallback } from 'react';
import { Page, User } from './types';
// Fix: Import useUser from its correct location in hooks/useUser.ts
import { UserProvider } from './context/UserContext';
import { useUser } from './hooks/useUser';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import AssessmentPage from './pages/AssessmentPage';
import ChatbotPage from './pages/ChatbotPage';
import DashboardPage from './pages/DashboardPage';
import FetalMovementCounterPage from './pages/FetalMovementCounterPage';
import WeeklyGuidePage from './pages/WeeklyGuidePage';
import AdminDashboardPage from './pages/AdminDashboardPage';

const PAGE_TITLES: { [key in Page]: string } = {
  [Page.Login]: 'تسجيل الدخول',
  [Page.Home]: 'الصفحة الرئيسية',
  [Page.Assessment]: 'التقييم الشامل',
  [Page.Chatbot]: 'المساعد الذكي (شات)',
  [Page.Dashboard]: 'لوحة المتابعة الصحية',
  [Page.FetalMovement]: 'عداد حركة الجنين',
  [Page.WeeklyGuide]: 'الدليل الأسبوعي',
  [Page.AdminDashboard]: 'لوحة تحكم المسؤول',
};


const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Home);
  const { user, logout } = useUser();

  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
  }, []);
  
  const handleLogout = () => {
    logout();
    navigate(Page.Login);
  };

  if (!user) {
    return <LoginPage />;
  }
  
  const pageTitle = PAGE_TITLES[currentPage] || 'مساعد الحمل الذكي';


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
    <div className="bg-brand-pink-light min-h-screen text-brand-gray-dark font-sans">
      <header className="bg-brand-white shadow-md p-4 flex justify-between items-center">
         <div>
          <h1 className="text-2xl font-bold text-brand-pink-dark">مساعد الحمل الذكي</h1>
          {currentPage !== Page.Home && <p className="text-sm text-gray-500">{pageTitle}</p>}
        </div>
        <button onClick={handleLogout} className="bg-brand-pink text-white py-2 px-4 rounded-lg hover:bg-brand-pink-dark transition-colors">
          تسجيل الخروج
        </button>
      </header>
      <main className="p-4 sm:p-6 md:p-8">
        {renderPage()}
      </main>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};

export default App;
