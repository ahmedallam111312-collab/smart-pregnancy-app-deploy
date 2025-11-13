import React, { createContext, useState, ReactNode, useMemo, useEffect, useContext } from 'react';
import { User, Role } from '../types';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '../services/firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 

interface UserContextType {
  user: User | null;
  login: (id: string, role: Role, name?: string) => void;
  logout: () => void;
  authLoading: boolean; // 🚨 (1.4) الحالة الجديدة
}

// 🚨 (مهم) تعديل useUser ليستخدم السياق
export const UserContext = createContext<UserContextType | undefined>(undefined);
export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
// ---------------------------------

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
    return { name: undefined, role: Role.Patient }; 
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // 🚨 (1.4) البدء بـ true

  const login = (id: string, role: Role, name?: string) => {
    setUser({ id, role, name });
  };

  const handleLogout = async () => {
    try {
        await signOut(auth); 
        setUser(null);
    } catch (error) {
        console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userData = await fetchUserData(firebaseUser.uid);
            setUser({
                id: firebaseUser.uid,
                role: userData.role,
                name: userData.name,
            });
        } else {
            setUser(null);
        }
        setAuthLoading(false); // 🚨 (1.4) إيقاف التحميل بعد التحقق
    });
    return () => unsubscribe();
  }, []); 

  const value = useMemo(() => ({ user, login, logout: handleLogout, authLoading }), [user, authLoading]);

  // 🚨 (ملاحظة) سنقوم بإزالة شاشة التحميل من هنا ونقلها إلى App.tsx
  // if (authLoading) { ... }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};