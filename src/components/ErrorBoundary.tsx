import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from './Button'; // (نفترض وجود مكون الزر)

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // تحديث الحالة لعرض واجهة المستخدم الاحتياطية
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // يمكنك تسجيل الخطأ هنا في خدمة مراقبة
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    // إعادة تعيين الحالة ومحاولة إعادة العرض
    this.setState({ hasError: false });
    // (اختياري) يمكنك إضافة window.location.reload() إذا كنت تفضل إعادة تحميل كامل
  };

  public render() {
    if (this.state.hasError) {
      // الواجهة الاحتياطية عند حدوث خطأ
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-pink-light p-4 text-center">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md">
            <h1 className="text-4xl font-bold text-red-600 mb-4">💔</h1>
            <h2 className="text-2xl font-bold text-brand-gray-dark mb-3">
              عذراً، حدث خطأ ما
            </h2>
            <p className="text-brand-gray mb-6">
              واجه التطبيق مشكلة غير متوقعة. يرجى محاولة تحديث الصفحة.
            </p>
            <Button onClick={this.handleReset} className="bg-brand-pink text-white">
              إعادة تحميل الصفحة
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;