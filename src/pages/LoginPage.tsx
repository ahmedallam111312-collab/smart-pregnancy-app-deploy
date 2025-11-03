import React, { useState, FormEvent } from 'react';
import { useUser } from '../hooks/useUser';
import { Page, Role } from '../types';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
// 🚨 الإضافات الجديدة من Firestore
import { db, auth } from '../services/firebase'; // تأكد أن db مُصدر أيضاً
import { doc, setDoc, getDoc } from 'firebase/firestore'; 

interface LoginPageProps {
  navigate: (page: Page) => void;
}

const LoginPage: React.FC<LoginPageProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // 🚨 الحالة الجديدة للاسم
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useUser();

  // 🚨 دالة مساعدة لجلب البيانات والدور من Firestore
  const fetchUserDataAndLogin = async (userId: string) => {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    let userName: string | undefined = undefined;
    let userRole: Role = Role.Patient; // القيمة الافتراضية

    if (userDoc.exists()) {
        const data = userDoc.data();
        userName = data.name;
        userRole = data.role as Role; // نستخدم الدور المخزن في Firestore
    }

    // 🚨 تمرير الاسم والدور المسترجع إلى دالة login
    // يجب تعديل دالة login لاستقبال الاسم
    login(userId, userRole, userName); 
  }


  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    // ----------------------------------------------------
    // 🚨 1. شروط التحقق من صحة المدخلات (VALIDATION)
    // ----------------------------------------------------
    if (!email.trim() || !password.trim()) {
        setError('يرجى ملء حقلي البريد الإلكتروني وكلمة المرور.');
        return; 
    }
    
    if (isRegistering) {
        if (!name.trim()) { // 🚨 التحقق من الاسم
            setError('يرجى إدخال الاسم الكامل.');
            return;
        }
        if (password.length < 6) { 
            setError('يجب أن لا تقل كلمة المرور عن 6 أحرف عند التسجيل.');
            return; 
        }
    }
    // ----------------------------------------------------

    setIsLoading(true);

    try {
      if (isRegistering) {
        // 1. إنشاء حساب Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        
        // 🚨 2. الخطوة الجديدة: حفظ الاسم والدور في Firestore
        await setDoc(doc(db, "users", userId), {
            name: name,
            role: Role.Patient.toLowerCase(), 
        });

        // 3. تسجيل الدخول في التطبيق (باستخدام البيانات المسترجعة)
        await fetchUserDataAndLogin(userId);

      } else {
        // تسجيل الدخول العادي
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        
        // استرجاع الاسم والدور من Firestore ثم تسجيل الدخول
        await fetchUserDataAndLogin(userId);
      }
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      
      // 🚨 3. معالجة أخطاء Firebase المحددة وعرضها بوضوح
      if (err.code === 'auth/invalid-email') {
          setError('صيغة البريد الإلكتروني غير صحيحة.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (err.code === 'auth/email-already-in-use') {
          setError('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.');
      } else {
          setError('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.');
      }

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-brand-pink-dark">
        <h2 className="text-3xl font-bold text-center text-brand-pink-dark mb-6">
          {isRegistering ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
        </h2>
        
        {error && (
          <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm border border-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
            
            {/* 🚨 حقل الاسم يظهر فقط عند التسجيل */}
            {isRegistering && (
                <div>
                    <label className="block text-sm font-medium text-brand-gray-dark mb-1">الاسم الكامل</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full p-3 border border-brand-gray-light rounded-lg focus:ring-brand-pink focus:border-brand-pink"
                        placeholder="مثلاً: سارة أحمد"
                    />
                </div>
            )}

            {/* حقل البريد الإلكتروني */}
            <div>
              <label className="block text-sm font-medium text-brand-gray-dark mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 border border-brand-gray-light rounded-lg focus:ring-brand-pink focus:border-brand-pink"
                placeholder="name@example.com"
              />
            </div>
            {/* حقل كلمة المرور */}
            <div>
              <label className="block text-sm font-medium text-brand-gray-dark mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 border border-brand-gray-light rounded-lg focus:ring-brand-pink focus:border-brand-pink"
                placeholder="لا تقل عن 6 أحرف"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-pink text-white py-3 rounded-lg font-semibold hover:bg-brand-pink-dark transition-colors disabled:bg-gray-400"
            >
              {isLoading ? 'جارِ التحميل...' : isRegistering ? 'إنشاء وتسجيل الدخول' : 'تسجيل الدخول'}
            </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-gray">
          {isRegistering ? 'لديك حساب بالفعل؟' : 'لا تملك حسابًا؟'}
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-brand-pink font-medium hover:underline mr-1"
          >
            {isRegistering ? 'تسجيل الدخول' : 'انشئ حساب الآن'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
