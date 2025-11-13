// ملف لجمع دوال التحقق من صحة المدخلات

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const createError = (isValid: boolean, errors: string[]): ValidationResult => ({
  isValid,
  errors,
});

/**
 * التحقق من المعلومات الشخصية (الخطوة 1)
 */
export const validatePersonalInfo = (name: string, age: number): ValidationResult => {
  const errors: string[] = [];
  if (name.trim().length < 2) {
    errors.push("يجب إدخال الاسم الكامل.");
  }
  if (!age || age <= 10 || age > 60) {
    errors.push("يرجى إدخال عمر صحيح (بين 10 و 60).");
  }
  return createError(errors.length === 0, errors);
};

/**
 * التحقق من تاريخ الحمل (الخطوة 2)
 */
export const validatePregnancyHistory = (g: number, p: number, a: number): ValidationResult => {
  const errors: string[] = [];
  if (g < 0 || p < 0 || a < 0) {
    errors.push("لا يمكن أن تكون قيم تاريخ الحمل سلبية.");
  }
  if (p + a > g) {
    errors.push("يجب أن يكون مجموع الولادات والإجهاض مساوياً أو أقل من عدد مرات الحمل.");
  }
  return createError(errors.length === 0, errors);
};

/**
 * التحقق من القياسات (الخطوة 3)
 */
export const validateMeasurements = (height: number, preWeight: number, currentWeight: number): ValidationResult => {
  const errors: string[] = [];
  if (!height || height < 100 || height > 250) {
    errors.push("يرجى إدخال طول صحيح (بين 100 و 250 سم).");
  }
  if (!preWeight || preWeight < 30 || preWeight > 200) {
    errors.push("يرجى إدخال وزن صحيح قبل الحمل (بين 30 و 200 كجم).");
  }
   if (!currentWeight || currentWeight < 30 || currentWeight > 250) {
    errors.push("يرجى إدخال وزن حالي صحيح (بين 30 و 250 كجم).");
  }
  return createError(errors.length === 0, errors);
};

/**
 * التحقق من الفحوصات المخبرية (الخطوة 5 - إدخال يدوي)
 * نجعلها اختيارية ولكن نتحقق من المنطق إذا تم إدخالها
 */
export const validateLabResults = (systolic?: number, diastolic?: number, glucose?: number, hb?: number): ValidationResult => {
  const errors: string[] = [];
  
  if (systolic && (systolic < 70 || systolic > 250)) {
    errors.push("ضغط الدم الانقباضي غير منطقي (يجب أن يكون بين 70 و 250).");
  }
  if (diastolic && (diastolic < 40 || diastolic > 150)) {
    errors.push("ضغط الدم الانبساطي غير منطقي (يجب أن يكون بين 40 و 150).");
  }
  if (systolic && diastolic && systolic < diastolic) {
      errors.push("ضغط الدم الانقباضي يجب أن يكون أعلى من الانبساطي.");
  }
  if (glucose && (glucose < 50 || glucose > 500)) {
    errors.push("مستوى سكر الدم غير منطقي (يجب أن يكون بين 50 و 500).");
  }
  if (hb && (hb < 5 || hb > 20)) {
    errors.push("مستوى الهيموجلوبين غير منطقي (يجب أن يكون بين 5 و 20).");
  }
  
  return createError(errors.length === 0, errors);
};