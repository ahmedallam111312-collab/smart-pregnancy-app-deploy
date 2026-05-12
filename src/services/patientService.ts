import { PatientRecord } from '../types';
import { saveNewPatientRecord, getPatientRecordsByUserId } from './mockDB';

// ============================================================================
// Service Interface
// ============================================================================

export interface IPatientService {
    saveRecord(record: PatientRecord): Promise<void>;
    getRecords(userId: string): Promise<PatientRecord[]>;
    getLatestRecord(userId: string): Promise<PatientRecord | null>;
}

// ============================================================================
// Mock Implementation (wraps mockDB)
// ============================================================================

class MockPatientService implements IPatientService {
    async saveRecord(record: PatientRecord): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        return saveNewPatientRecord(record);
    }

    async getRecords(userId: string): Promise<PatientRecord[]> {
        await new Promise(resolve => setTimeout(resolve, 500));
        return getPatientRecordsByUserId(userId);
    }

    async getLatestRecord(userId: string): Promise<PatientRecord | null> {
        const records = await this.getRecords(userId);
        return records.length > 0 ? records[0] : null;
    }
}

// ============================================================================
// Factory / Singleton
// ============================================================================

// In a real app, this would switch based on env vars (e.g. use FirebaseService)
export const patientService = new MockPatientService();
