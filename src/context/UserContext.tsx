import React, { createContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { User, Role } from '../types';
// 🚨 الإضافات الجديدة من Firebase
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '../services/firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 

interface UserContextType {
  user: User | null;
  // 🚨 1. تعديل التوقيع لقبول 'name'
  login: (id: string, role: Role, name?: string) => void;
  logout: () => void;
  isLoadingAuth: boolean; 
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

// 🚨 دالة مساعدة لجلب بيانات المستخدم (الاسم والدور) من Firestore
const fetchUserData = async (userId: string) => {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const data = userDoc.data();
        return {
            name: data.name as string,
            role: (data.role as Role) || Role.Patient,
        };
    }
    // إذا لم يتم العثور على سجل في Firestore (مستخدم قديم)، نرجع دور المريض الافتراضي
    return { name: undefined, role: Role.Patient }; 
};


export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // 🚨 2. تعديل دالة login لحفظ الاسم
  const login = (id: string, role: Role, name?: string) => {
    setUser({ id, role, name });
  };

  // 🚨 3. دالة تسجيل الخروج باستخدام Firebase
  const handleLogout = async () => {
    try {
        await signOut(auth); 
        setUser(null);
    } catch (error) {
        console.error("Error signing out:", error);
    }
  };

  // 4. جلب البيانات عند تحميل التطبيق
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // جلب الاسم والدور من Firestore
            const userData = await fetchUserData(firebaseUser.uid);
            
            // تسجيل الدخول في السياق باستخدام البيانات المسترجعة
            setUser({
                id: firebaseUser.uid,
                role: userData.role,
                name: userData.name, // 🚨 حفظ الاسم
            });
        } else {
            setUser(null);
        }
        setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []); 

  const value = useMemo(() => ({ user, login, logout: handleLogout, isLoadingAuth }), [user, isLoadingAuth]);

  // شاشة تحميل مؤقتة
  if (isLoadingAuth) {
    return (
        <div className="flex justify-center items-center min-h-screen bg-brand-pink-light">
            <h1 className="text-xl text-brand-pink-dark">جارِ التحقق من جلسة المستخدم...</h1>
        </div>
    );
  }


  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
