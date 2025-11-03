import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // لخدمة تسجيل الدخول
import { getFirestore } from 'firebase/firestore'; // لخدمة قاعدة البيانات

// مفاتيح الربط التي أرسلتها
const firebaseConfig = {
  apiKey: "AIzaSyB-10vXz8qQEt0v6yLREqGSMqVh_XccTsI",
  authDomain: "smart-pregnancy-app.firebaseapp.com",
  projectId: "smart-pregnancy-app",
  storageBucket: "smart-pregnancy-app.firebasestorage.app",
  messagingSenderId: "937706081037",
  appId: "1:937706081037:web:2cc9ef2122610969fdbe44",
  measurementId: "G-21SRYE81GN"
};

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// تصدير خدمات Firebase التي سيستخدمها تطبيقنا
export const auth = getAuth(app); // خدمة التوثيق (Authentication)
export const db = getFirestore(app); // خدمة قاعدة البيانات (Firestore)