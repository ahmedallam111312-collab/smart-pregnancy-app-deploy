import { db } from './firebase'; 
import { PatientRecord } from '../types';
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore'; 

const PATIENT_RECORDS_COLLECTION = 'patientRecords';

// 🚨 تأكد أن كلمة 'export' موجودة هنا
export const saveNewPatientRecord = async (record: PatientRecord): Promise<string> => {
    if (!record.userId) { throw new Error("Cannot save record: User ID is missing."); }
    try {
        const docRef = await addDoc(collection(db, PATIENT_RECORDS_COLLECTION), {
            ...record,
            timestamp: new Date(), 
        });
        return docRef.id;
    } catch (e) {
        throw new Error("فشل في حفظ السجل الصحي في قاعدة البيانات.");
    }
};

// 🚨 تأكد أن كلمة 'export' موجودة هنا
export const getPatientRecordsByUserId = async (userId: string): Promise<PatientRecord[]> => {
    try {
        const q = query(
            collection(db, PATIENT_RECORDS_COLLECTION),
            where("userId", "==", userId),
            orderBy("timestamp", "desc")
        );
        // ... (باقي كود الجلب)
        const querySnapshot = await getDocs(q);
        const records: PatientRecord[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp.toDate(), 
            } as PatientRecord;
        });
        return records;
    } catch (e) {
        return []; 
    }
};

// 🚨 تأكد أن كلمة 'export' موجودة هنا
export const deletePatientRecord = async (id: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, PATIENT_RECORDS_COLLECTION, id));
        return true;
    } catch (e) {
        return false;
    }
};
// (في نهاية ملف src/services/mockDB.ts)

/**
 * 🚨 (النقطة 7) دالة مخصصة للمسؤول: تجلب جميع السجلات من جميع المستخدمين.
 * (تتطلب قواعد أمان تسمح للمسؤول بالقراءة)
 * @returns قائمة بكل السجلات (PatientRecord[])
 */

// في ملف src/services/mockDB.ts (بعد الدوال الموجودة)

/**
 * 🚨 دالة مخصصة للمسؤول: تجلب جميع السجلات من جميع المستخدمين.
 * (تتطلب قواعد أمان تسمح للمسؤول بالقراءة)
 * @returns قائمة بكل السجلات (PatientRecord[])
 */
export const getAllPatientRecordsForAdmin = async (): Promise<PatientRecord[]> => {
    try {
        const q = query(
            collection(db, PATIENT_RECORDS_COLLECTION),
            orderBy("timestamp", "desc") // الترتيب حسب الأحدث
        );
        
        const querySnapshot = await getDocs(q);
        
        const records: PatientRecord[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                // تحويل Firestore Timestamp إلى JavaScript Date
                timestamp: data.timestamp.toDate(), 
            } as PatientRecord;
        });

        return records;

    } catch (e) {
        console.error("Error fetching ALL records for admin: ", e);
        return []; // إرجاع قائمة فارغة عند الفشل
    }
};
