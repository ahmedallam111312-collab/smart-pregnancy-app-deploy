import { db } from './firebase';
import {
  PatientRecord,
  SubmissionTracker,
  UserTrustScore,
  ReviewQueueItem,
  RateLimitResult,
  PhoneVerification,
  ReviewStatus,
  TrustScoreChange,
  DEFAULT_VALIDATION_CONFIG
} from '../types';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  limit as firestoreLimit
} from 'firebase/firestore';

// ============================================================================
// COLLECTION NAMES
// ============================================================================
const PATIENT_RECORDS_COLLECTION = 'patientRecords';
const SUBMISSION_TRACKER_COLLECTION = 'submissionTrackers';
const TRUST_SCORES_COLLECTION = 'trustScores';
const REVIEW_QUEUE_COLLECTION = 'reviewQueue';
const PHONE_VERIFICATIONS_COLLECTION = 'phoneVerifications';

// ============================================================================
// EXISTING FUNCTIONS (Enhanced)
// ============================================================================

/**
 * Save new patient record with security checks
 */
export const saveNewPatientRecord = async (record: PatientRecord): Promise<string> => {
  if (!record.userId) {
    throw new Error("Cannot save record: User ID is missing.");
  }

  try {
    // Update submission tracker
    await updateSubmissionTracker(record.userId);

    // Save record
    const docRef = await addDoc(collection(db, PATIENT_RECORDS_COLLECTION), {
      ...record,
      timestamp: Timestamp.now(),
      reviewStatus: record.reviewStatus || ReviewStatus.Pending,
      createdAt: Timestamp.now()
    });

    // Update trust score if record is clean
    if (!record.flaggedReasons || record.flaggedReasons.length === 0) {
      await incrementTrustScore(record.userId, 5, 'Successful clean submission');
    }

    return docRef.id;
  } catch (e) {
    console.error('Error saving patient record:', e);
    throw new Error("فشل في حفظ السجل الصحي في قاعدة البيانات.");
  }
};

/**
 * Get patient records by user ID
 */
export const getPatientRecordsByUserId = async (userId: string): Promise<PatientRecord[]> => {
  try {
    const q = query(
      collection(db, PATIENT_RECORDS_COLLECTION),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const records: PatientRecord[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as PatientRecord;
    });

    return records;
  } catch (e) {
    console.error('Error fetching records:', e);
    return [];
  }
};

/**
 * Delete patient record
 */
export const deletePatientRecord = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, PATIENT_RECORDS_COLLECTION, id));
    return true;
  } catch (e) {
    console.error('Error deleting record:', e);
    return false;
  }
};

/**
 * Get all patient records for admin
 */
export const getAllPatientRecordsForAdmin = async (): Promise<PatientRecord[]> => {
  try {
    const q = query(
      collection(db, PATIENT_RECORDS_COLLECTION),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);

    const records: PatientRecord[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as PatientRecord;
    });

    return records;
  } catch (e) {
    console.error("Error fetching all records for admin:", e);
    return [];
  }
};

// ============================================================================
// 🚨 NEW: RATE LIMITING FUNCTIONS
// ============================================================================

/**
 * Check if user can submit (rate limiting)
 */
export const checkSubmissionLimit = async (userId: string): Promise<RateLimitResult> => {
  try {
    const trackerRef = doc(db, SUBMISSION_TRACKER_COLLECTION, userId);
    const trackerDoc = await getDoc(trackerRef);

    const now = new Date();
    const config = DEFAULT_VALIDATION_CONFIG.rateLimit;

    if (!trackerDoc.exists()) {
      // First submission - allowed
      return {
        allowed: true,
        currentCount: 0,
        limit: config.maxSubmissionsPerDay,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      };
    }

    const tracker = trackerDoc.data() as SubmissionTracker;

    // Check if blocked
    if (tracker.blocked) {
      return {
        allowed: false,
        reason: tracker.blockReason || 'حسابك محظور مؤقتاً',
        currentCount: tracker.submissionCount,
        limit: config.maxSubmissionsPerDay,
        resetTime: tracker.cooldownUntil || now
      };
    }

    // Check cooldown
    if (tracker.cooldownUntil && tracker.cooldownUntil > now) {
      const hoursLeft = Math.ceil(
        (tracker.cooldownUntil.getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      return {
        allowed: false,
        reason: `يمكنك إجراء تقييم جديد بعد ${hoursLeft} ساعة`,
        nextAllowedTime: tracker.cooldownUntil,
        currentCount: tracker.submissionsLast24h,
        limit: config.maxSubmissionsPerDay,
        resetTime: tracker.cooldownUntil
      };
    }

    // Check 24-hour limit
    const hoursSinceLastSubmission =
      (now.getTime() - tracker.lastSubmission.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastSubmission < config.cooldownHours) {
      const hoursLeft = Math.ceil(config.cooldownHours - hoursSinceLastSubmission);
      return {
        allowed: false,
        reason: `يمكنك إجراء تقييم جديد بعد ${hoursLeft} ساعة`,
        nextAllowedTime: new Date(
          tracker.lastSubmission.getTime() + config.cooldownHours * 60 * 60 * 1000
        ),
        currentCount: tracker.submissionsLast24h,
        limit: config.maxSubmissionsPerDay,
        resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      };
    }

    // Check weekly limit
    if (tracker.submissionsLast7d >= config.maxSubmissionsPerWeek) {
      return {
        allowed: false,
        reason: `لقد وصلت إلى الحد الأسبوعي (${config.maxSubmissionsPerWeek} تقييمات)`,
        currentCount: tracker.submissionsLast7d,
        limit: config.maxSubmissionsPerWeek,
        resetTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      };
    }

    // Allowed
    return {
      allowed: true,
      currentCount: tracker.submissionsLast24h,
      limit: config.maxSubmissionsPerDay,
      resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
    };

  } catch (e) {
    console.error('Error checking submission limit:', e);
    // On error, allow but log
    return {
      allowed: true,
      currentCount: 0,
      limit: 1,
      resetTime: new Date()
    };
  }
};

/**
 * Update submission tracker after successful submission
 */
export const updateSubmissionTracker = async (userId: string): Promise<void> => {
  try {
    const trackerRef = doc(db, SUBMISSION_TRACKER_COLLECTION, userId);
    const trackerDoc = await getDoc(trackerRef);

    const now = new Date();
    const cooldownUntil = new Date(
      now.getTime() + DEFAULT_VALIDATION_CONFIG.rateLimit.cooldownHours * 60 * 60 * 1000
    );

    if (!trackerDoc.exists()) {
      // Create new tracker
      await setDoc(trackerRef, {
        userId,
        lastSubmission: Timestamp.fromDate(now),
        submissionCount: 1,
        submissionsLast24h: 1,
        submissionsLast7d: 1,
        cooldownUntil: Timestamp.fromDate(cooldownUntil),
        blocked: false,
        createdAt: Timestamp.now()
      });
    } else {
      // Update existing tracker
      const tracker = trackerDoc.data() as SubmissionTracker;

      // Reset counters if needed
      const hoursSinceLast =
        (now.getTime() - tracker.lastSubmission.getTime()) / (1000 * 60 * 60);
      const daysSinceLast = hoursSinceLast / 24;

      const submissionsLast24h = hoursSinceLast < 24 ? tracker.submissionsLast24h + 1 : 1;
      const submissionsLast7d = daysSinceLast < 7 ? tracker.submissionsLast7d + 1 : 1;

      await updateDoc(trackerRef, {
        lastSubmission: Timestamp.fromDate(now),
        submissionCount: tracker.submissionCount + 1,
        submissionsLast24h,
        submissionsLast7d,
        cooldownUntil: Timestamp.fromDate(cooldownUntil),
        updatedAt: Timestamp.now()
      });

      // Flag if suspicious pattern (too many submissions)
      if (submissionsLast7d > 5) {
        await flagSuspiciousUser(userId, 'عدد كبير من التقييمات في وقت قصير');
      }
    }
  } catch (e) {
    console.error('Error updating submission tracker:', e);
  }
};

// ============================================================================
// 🚨 NEW: TRUST SCORE FUNCTIONS
// ============================================================================

/**
 * Get or create user trust score
 */
export const getUserTrustScore = async (userId: string): Promise<UserTrustScore> => {
  try {
    const scoreRef = doc(db, TRUST_SCORES_COLLECTION, userId);
    const scoreDoc = await getDoc(scoreRef);

    if (!scoreDoc.exists()) {
      // Create default trust score
      const defaultScore: UserTrustScore = {
        userId,
        score: 50, // Start at 50
        lastUpdated: new Date(),
        factors: {
          phoneVerified: false,
          emailVerified: false,
          documentUploaded: false,
          consistentHistory: false,
          longTermUser: false,
          flaggedCount: 0,
          successfulSubmissions: 0
        },
        history: []
      };

      await setDoc(scoreRef, {
        ...defaultScore,
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now()
      });

      return defaultScore;
    }

    const data = scoreDoc.data();
    return {
      ...data,
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
      history: data.history?.map((h: any) => ({
        ...h,
        date: h.date?.toDate() || new Date()
      })) || []
    } as UserTrustScore;

  } catch (e) {
    console.error('Error getting trust score:', e);
    // Return default on error
    return {
      userId,
      score: 50,
      lastUpdated: new Date(),
      factors: {
        phoneVerified: false,
        emailVerified: false,
        documentUploaded: false,
        consistentHistory: false,
        longTermUser: false,
        flaggedCount: 0,
        successfulSubmissions: 0
      },
      history: []
    };
  }
};

/**
 * Update user trust score
 */
export const updateTrustScore = async (
  userId: string,
  updates: Partial<UserTrustScore['factors']>
): Promise<number> => {
  try {
    const currentScore = await getUserTrustScore(userId);
    let newScore = currentScore.score;
    const config = DEFAULT_VALIDATION_CONFIG.trustScore;

    // Apply bonuses
    if (updates.phoneVerified && !currentScore.factors.phoneVerified) {
      newScore += config.phoneVerificationBonus;
    }
    if (updates.documentUploaded && !currentScore.factors.documentUploaded) {
      newScore += config.documentUploadBonus;
    }
    if (updates.successfulSubmissions) {
      newScore += 2; // Small bonus per submission
    }

    // Apply penalties
    if (updates.flaggedCount && updates.flaggedCount > currentScore.factors.flaggedCount) {
      newScore -= config.flagPenalty;
    }

    // Clamp between 0-100
    newScore = Math.max(0, Math.min(100, newScore));

    // Create history entry
    const historyEntry: TrustScoreChange = {
      date: new Date(),
      oldScore: currentScore.score,
      newScore,
      reason: generateScoreChangeReason(updates)
    };

    // Update Firestore
    const scoreRef = doc(db, TRUST_SCORES_COLLECTION, userId);
    await updateDoc(scoreRef, {
      score: newScore,
      'factors': { ...currentScore.factors, ...updates },
      lastUpdated: Timestamp.now(),
      history: [
        ...currentScore.history.map(h => ({
          ...h,
          date: Timestamp.fromDate(h.date)
        })),
        {
          ...historyEntry,
          date: Timestamp.fromDate(historyEntry.date)
        }
      ]
    });

    return newScore;

  } catch (e) {
    console.error('Error updating trust score:', e);
    return 50;
  }
};

/**
 * Increment trust score (helper)
 */
export const incrementTrustScore = async (
  userId: string,
  amount: number,
  reason: string
): Promise<void> => {
  const currentScore = await getUserTrustScore(userId);
  const newFactors = {
    ...currentScore.factors,
    successfulSubmissions: currentScore.factors.successfulSubmissions + 1
  };
  await updateTrustScore(userId, newFactors);
};

/**
 * Generate reason for score change
 */
const generateScoreChangeReason = (updates: Partial<UserTrustScore['factors']>): string => {
  const reasons: string[] = [];
  if (updates.phoneVerified) reasons.push('Phone verified');
  if (updates.documentUploaded) reasons.push('Document uploaded');
  if (updates.successfulSubmissions) reasons.push('Successful submission');
  if (updates.flaggedCount) reasons.push('Record flagged');
  return reasons.join(', ') || 'Score updated';
};

// ============================================================================
// 🚨 NEW: REVIEW QUEUE FUNCTIONS
// ============================================================================

/**
 * Add record to review queue
 */
export const addToReviewQueue = async (item: Omit<ReviewQueueItem, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, REVIEW_QUEUE_COLLECTION), {
      ...item,
      submissionDate: Timestamp.fromDate(item.submissionDate),
      reviewedAt: item.reviewedAt ? Timestamp.fromDate(item.reviewedAt) : null,
      createdAt: Timestamp.now()
    });

    return docRef.id;
  } catch (e) {
    console.error('Error adding to review queue:', e);
    throw new Error('Failed to add to review queue');
  }
};

/**
 * Get review queue items
 */
export const getReviewQueue = async (status?: ReviewStatus): Promise<ReviewQueueItem[]> => {
  try {
    let q = query(
      collection(db, REVIEW_QUEUE_COLLECTION),
      orderBy('priority', 'desc'),
      orderBy('submissionDate', 'desc')
    );

    if (status) {
      q = query(q, where('status', '==', status));
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        submissionDate: data.submissionDate?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate()
      } as ReviewQueueItem;
    });

  } catch (e) {
    console.error('Error fetching review queue:', e);
    return [];
  }
};

/**
 * Update review queue item
 */
export const updateReviewQueueItem = async (
  id: string,
  updates: Partial<ReviewQueueItem>
): Promise<void> => {
  try {
    const itemRef = doc(db, REVIEW_QUEUE_COLLECTION, id);
    await updateDoc(itemRef, {
      ...updates,
      reviewedAt: updates.reviewedAt ? Timestamp.fromDate(updates.reviewedAt) : null,
      updatedAt: Timestamp.now()
    });
  } catch (e) {
    console.error('Error updating review queue item:', e);
  }
};

// ============================================================================
// 🚨 NEW: PHONE VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Save phone verification code
 */
export const savePhoneVerification = async (
  userId: string,
  phoneNumber: string,
  code: string
): Promise<void> => {
  try {
    const verificationRef = doc(db, PHONE_VERIFICATIONS_COLLECTION, userId);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await setDoc(verificationRef, {
      phoneNumber,
      code,
      expiresAt: Timestamp.fromDate(expiresAt),
      verified: false,
      attempts: 0,
      createdAt: Timestamp.now()
    });

  } catch (e) {
    console.error('Error saving phone verification:', e);
    throw new Error('Failed to save verification code');
  }
};

/**
 * Verify phone code
 */
export const verifyPhoneCode = async (
  userId: string,
  code: string
): Promise<boolean> => {
  try {
    const verificationRef = doc(db, PHONE_VERIFICATIONS_COLLECTION, userId);
    const verificationDoc = await getDoc(verificationRef);

    if (!verificationDoc.exists()) {
      return false;
    }

    const verification = verificationDoc.data() as PhoneVerification;

    // Check expiration
    if (verification.expiresAt < new Date()) {
      return false;
    }

    // Check attempts (max 3)
    if (verification.attempts >= 3) {
      return false;
    }

    // Check code
    if (verification.code !== code) {
      await updateDoc(verificationRef, {
        attempts: verification.attempts + 1
      });
      return false;
    }

    // Success - mark as verified
    await updateDoc(verificationRef, {
      verified: true,
      verifiedAt: Timestamp.now()
    });

    // Update trust score
    await updateTrustScore(userId, { phoneVerified: true });

    return true;

  } catch (e) {
    console.error('Error verifying phone code:', e);
    return false;
  }
};

// ============================================================================
// 🚨 NEW: SECURITY HELPER FUNCTIONS
// ============================================================================

/**
 * Flag suspicious user
 */
export const flagSuspiciousUser = async (
  userId: string,
  reason: string
): Promise<void> => {
  try {
    const currentScore = await getUserTrustScore(userId);
    await updateTrustScore(userId, {
      flaggedCount: currentScore.factors.flaggedCount + 1
    });

    // Add to tracker
    const trackerRef = doc(db, SUBMISSION_TRACKER_COLLECTION, userId);
    await updateDoc(trackerRef, {
      flagged: true,
      flagReason: reason,
      flaggedAt: Timestamp.now()
    });

  } catch (e) {
    console.error('Error flagging user:', e);
  }
};

/**
 * Block user temporarily
 */
export const blockUser = async (
  userId: string,
  reason: string,
  durationHours: number = 48
): Promise<void> => {
  try {
    const trackerRef = doc(db, SUBMISSION_TRACKER_COLLECTION, userId);
    const cooldownUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    await updateDoc(trackerRef, {
      blocked: true,
      blockReason: reason,
      cooldownUntil: Timestamp.fromDate(cooldownUntil),
      blockedAt: Timestamp.now()
    });

  } catch (e) {
    console.error('Error blocking user:', e);
  }
};