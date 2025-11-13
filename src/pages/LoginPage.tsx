import React, { useState, FormEvent, useCallback } from 'react';
import { useUser } from '../hooks/useUser';
import { Page, Role } from '../types';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  AuthError 
} from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// -----------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------
interface LoginPageProps {
  navigate: (page: Page) => void;
}

enum AuthMode {
  Login = 'login',
  Register = 'register',
  ForgotPassword = 'forgot'
}

interface ValidationRules {
  email: RegExp;
  password: {
    minLength: number;
    maxLength: number;
  };
  name: {
    minLength: number;
    maxLength: number;
  };
}

const VALIDATION: ValidationRules = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: {
    minLength: 6,
    maxLength: 128
  },
  name: {
    minLength: 2,
    maxLength: 100
  }
};

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
  'auth/user-not-found': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'auth/wrong-password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'auth/email-already-in-use': 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.',
  'auth/weak-password': 'كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى.',
  'auth/too-many-requests': 'تم تجاوز عدد المحاولات المسموحة. يرجى المحاولة لاحقاً.',
  'auth/network-request-failed': 'فشل الاتصال بالشبكة. تحقق من اتصالك بالإنترنت.',
  'auth/user-disabled': 'تم تعطيل هذا الحساب. يرجى التواصل مع الدعم.',
  'default': 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
};

// -----------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------
const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>(AuthMode.Login);
  
  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useUser();

  // -----------------------------------------------------------------
  // Validation Functions
  // -----------------------------------------------------------------
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return 'يرجى إدخال البريد الإلكتروني.';
    }
    if (!VALIDATION.email.test(email)) {
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    }
    return null;
  };

  const validatePassword = (password: string, isRegistering: boolean): string | null => {
    if (!password) {
      return 'يرجى إدخال كلمة المرور.';
    }
    if (isRegistering) {
      if (password.length < VALIDATION.password.minLength) {
        return `كلمة المرور يجب أن تكون ${VALIDATION.password.minLength} أحرف على الأقل.`;
      }
      if (password.length > VALIDATION.password.maxLength) {
        return `كلمة المرور طويلة جداً (الحد الأقصى ${VALIDATION.password.maxLength} حرف).`;
      }
      if (!/[a-zA-Z]/.test(password)) {
        return 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل.';
      }
      if (!/\d/.test(password)) {
        return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.';
      }
    }
    return null;
  };

  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return 'يرجى إدخال الاسم الكامل.';
    }
    if (name.trim().length < VALIDATION.name.minLength) {
      return `الاسم قصير جداً (${VALIDATION.name.minLength} أحرف على الأقل).`;
    }
    if (name.trim().length > VALIDATION.name.maxLength) {
      return `الاسم طويل جداً (الحد الأقصى ${VALIDATION.name.maxLength} حرف).`;
    }
    if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(name)) {
      return 'الاسم يجب أن يحتوي على حروف فقط.';
    }
    return null;
  };

  // -----------------------------------------------------------------
  // Firebase Operations
  // -----------------------------------------------------------------
  const fetchUserDataAndLogin = useCallback(async (userId: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      let userName: string | undefined = undefined;
      let userRole: Role = Role.Patient;

      if (userDoc.exists()) {
        const data = userDoc.data();
        userName = data.name;
        userRole = data.role as Role;
      }

      login(userId, userRole, userName);
    } catch (err) {
      console.error('Error fetching user data:', err);
      throw new Error('فشل تحميل بيانات المستخدم.');
    }
  }, [login]);

  const handleRegister = async (email: string, password: string, name: string) => {
    // Create Firebase Authentication account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Save user data to Firestore
    await setDoc(doc(db, 'users', userId), {
      name: name.trim(),
      email: email.toLowerCase(),
      role: Role.Patient.toLowerCase(),
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });

    // Login to the app
    await fetchUserDataAndLogin(userId);
  };

  const handleLogin = async (email: string, password: string) => {
    // Sign in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Update last login timestamp
    try {
      await setDoc(
        doc(db, 'users', userId),
        { lastLogin: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to update last login:', err);
    }

    // Fetch user data and login
    await fetchUserDataAndLogin(userId);
  };

  const handlePasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
  };

  // -----------------------------------------------------------------
  // Form Handlers
  // -----------------------------------------------------------------
  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (authMode === AuthMode.ForgotPassword) {
      setIsLoading(true);
      try {
        await handlePasswordReset(email);
      } catch (err: any) {
        const errorMessage = ERROR_MESSAGES[err.code] || ERROR_MESSAGES.default;
        setError(errorMessage);
        console.error('Password reset error:', err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const passwordError = validatePassword(password, authMode === AuthMode.Register);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (authMode === AuthMode.Register) {
      const nameError = validateName(name);
      if (nameError) {
        setError(nameError);
        return;
      }
    }

    // Authentication
    setIsLoading(true);
    try {
      if (authMode === AuthMode.Register) {
        await handleRegister(email, password, name);
      } else {
        await handleLogin(email, password);
      }
    } catch (err: any) {
      const errorMessage = ERROR_MESSAGES[err.code] || ERROR_MESSAGES.default;
      setError(errorMessage);
      console.error('Authentication error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError('');
    setSuccess('');
    setPassword('');
    if (mode !== AuthMode.Register) {
      setName('');
    }
  };

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  const getTitle = () => {
    switch (authMode) {
      case AuthMode.Register:
        return 'إنشاء حساب جديد';
      case AuthMode.ForgotPassword:
        return 'إعادة تعيين كلمة المرور';
      default:
        return 'تسجيل الدخول';
    }
  };

  const getSubmitButtonText = () => {
    if (isLoading) return 'جارِ التحميل...';
    switch (authMode) {
      case AuthMode.Register:
        return 'إنشاء حساب';
      case AuthMode.ForgotPassword:
        return 'إرسال رابط إعادة التعيين';
      default:
        return 'تسجيل الدخول';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-brand-pink-dark">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🤰</div>
          <h2 className="text-3xl font-bold text-brand-pink-dark">
            {getTitle()}
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            {authMode === AuthMode.Register && 'انضمي إلينا لمتابعة رحلتك الصحية'}
            {authMode === AuthMode.Login && 'نحن سعداء بعودتك'}
            {authMode === AuthMode.ForgotPassword && 'سنساعدك على استعادة حسابك'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-sm flex-1">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded mb-4 flex items-start gap-3">
            <span className="text-xl">✅</span>
            <p className="text-sm flex-1">{success}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {/* Name Field - Register Only */}
          {authMode === AuthMode.Register && (
            <div>
              <label className="block text-sm font-semibold text-brand-gray-dark mb-2">
                الاسم الكامل *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-brand-pink transition-all"
                placeholder="مثلاً: سارة أحمد محمد"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-brand-gray-dark mb-2">
              البريد الإلكتروني *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-brand-pink transition-all"
              placeholder="name@example.com"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          {/* Password Field */}
          {authMode !== AuthMode.ForgotPassword && (
            <div>
              <label className="block text-sm font-semibold text-brand-gray-dark mb-2">
                كلمة المرور *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-brand-pink transition-all pr-12"
                  placeholder={authMode === AuthMode.Register ? 'لا تقل عن 6 أحرف (حروف وأرقام)' : 'أدخل كلمة المرور'}
                  disabled={isLoading}
                  autoComplete={authMode === AuthMode.Register ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {authMode === AuthMode.Register && (
                <p className="text-xs text-gray-500 mt-1">
                  يجب أن تحتوي على حروف وأرقام
                </p>
              )}
            </div>
          )}

          {/* Forgot Password Link */}
          {authMode === AuthMode.Login && (
            <div className="text-left">
              <button
                type="button"
                onClick={() => switchAuthMode(AuthMode.ForgotPassword)}
                className="text-sm text-brand-pink hover:underline font-medium"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {getSubmitButtonText()}
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="mt-6 text-center space-y-2">
          {authMode === AuthMode.Login && (
            <p className="text-sm text-gray-600">
              لا تملك حسابًا؟{' '}
              <button
                type="button"
                onClick={() => switchAuthMode(AuthMode.Register)}
                className="text-brand-pink font-semibold hover:underline"
              >
                انشئ حساب الآن
              </button>
            </p>
          )}

          {authMode === AuthMode.Register && (
            <p className="text-sm text-gray-600">
              لديك حساب بالفعل؟{' '}
              <button
                type="button"
                onClick={() => switchAuthMode(AuthMode.Login)}
                className="text-brand-pink font-semibold hover:underline"
              >
                تسجيل الدخول
              </button>
            </p>
          )}

          {authMode === AuthMode.ForgotPassword && (
            <p className="text-sm text-gray-600">
              تذكرت كلمة المرور؟{' '}
              <button
                type="button"
                onClick={() => switchAuthMode(AuthMode.Login)}
                className="text-brand-pink font-semibold hover:underline"
              >
                تسجيل الدخول
              </button>
            </p>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            🔒 بياناتك محمية بتشفير عالي المستوى
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-500 mt-6 text-center max-w-md">
        باستخدام هذا التطبيق، أنت توافق على{' '}
        <button className="text-brand-pink hover:underline">شروط الخدمة</button>
        {' '}و{' '}
        <button className="text-brand-pink hover:underline">سياسة الخصوصية</button>
      </p>
    </div>
  );
};

export default LoginPage;