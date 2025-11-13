// دالة للتحقق مما إذا كان المستخدم متصلاً بالإنترنت
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * يترجم أخطاء الشبكة المعقدة إلى رسالة واضحة باللغة العربية
 */
export const handleNetworkError = (error: any): string => {
  if (!isOnline()) {
    return 'لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى.';
  }
  
  // أخطاء Firebase
  if (error.code === 'unavailable') {
    return 'الخدمة غير متوفرة حالياً. يرجى المحاولة لاحقاً.';
  }
  if (error.code === 'permission-denied') {
    return 'غير مصرح لك بالوصول إلى هذه البيانات. (خطأ في قواعد الأمان)';
  }
  
  // أخطاء Gemini (من الكود المخصص)
  if (error.message && error.message.includes("API key not valid")) {
     return "مفتاح API الخاص بـ Gemini غير صالح. يرجى مراجعة الإعدادات.";
  }
  
  // رسالة الخطأ الافتراضية
  return error.message || 'حدث خطأ غير متوقع أثناء الاتصال بالخادم.';
};

/**
 * دالة "تغليف" للعمليات التي تتصل بالشبكة
 * @param operation الدالة التي نريد تنفيذها (مثل analyzePatientData)
 * @param errorSetter دالة (useState) لوضع رسالة الخطأ
 * @returns T | null
 */
export const withNetworkErrorHandling = async <T,>(
  operation: () => Promise<T>,
  errorSetter: (error: string) => void
): Promise<T | null> => {
  try {
    // محاولة تنفيذ العملية
    return await operation();
  } catch (error: any) {
    // إذا فشلت، قم بمعالجة الخطأ وضعه في الـ state
    errorSetter(handleNetworkError(error));
    return null;
  }
};