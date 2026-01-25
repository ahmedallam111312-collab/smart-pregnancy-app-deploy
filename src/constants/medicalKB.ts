// src/constants/medicalKB.ts
// Structured Medical Knowledge Base for Pregnancy Care AI Assistant

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type RiskLevel = 'high' | 'moderate' | 'low';

export interface SymptomDefinition {
  key: string;
  labelAr: string;
  labelEn: string;
  icon: string;
  severity: SeverityLevel;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  relatedConditions: string[];
  actionRequired?: string;
}

export interface RiskFactorDefinition {
  key: string;
  labelAr: string;
  labelEn: string;
  riskLevel: RiskLevel;
  descriptionAr: string;
  descriptionEn: string;
  condition: string; // 'preeclampsia' | 'gdm' | 'anemia'
  weight: number; // 0-1 for scoring
}

export interface ValidationRule {
  field: string;
  min?: number;
  max?: number;
  required?: boolean;
  messageAr: string;
  messageEn: string;
  customValidation?: (value: any, formData?: any) => boolean;
}

export interface ClinicalThreshold {
  condition: string;
  parameter: string;
  normalRange: { min: number; max: number };
  mildRange?: { min: number; max: number };
  severeRange?: { min: number; max: number };
  unit: string;
  labelAr: string;
  labelEn: string;
}

export interface ConditionDefinition {
  id: string;
  nameAr: string;
  nameEn: string;
  definitionAr: string;
  definitionEn: string;
  riskFactors: string[]; // keys from RISK_FACTORS
  symptoms: string[]; // keys from SYMPTOMS
  diagnosticCriteria: ClinicalThreshold[];
  redFlags: string[]; // keys from SYMPTOMS
  managementSteps: string[];
  preventionStrategies: string[];
}

export interface BMICategory {
  range: { min: number; max: number };
  labelAr: string;
  labelEn: string;
  colorClass: string;
  weightGainRecommendation: { min: number; max: number }; // kg
}

export interface PregnancyWeekInfo {
  weekRange: { min: number; max: number };
  trimester: 1 | 2 | 3;
  fetalDevelopmentAr: string;
  fetalDevelopmentEn: string;
  maternalChangesAr: string[];
  maternalChangesEn: string[];
  keyTestsAr: string[];
  keyTestsEn: string[];
}

// ============================================================================
// SYMPTOM DEFINITIONS
// ============================================================================

export const SYMPTOMS: Record<string, SymptomDefinition> = {
  headache: {
    key: 'headache',
    labelAr: 'صداع مستمر أو شديد',
    labelEn: 'Persistent or severe headache',
    icon: '🤕',
    severity: 'high',
    category: 'critical',
    descriptionAr: 'قد يشير إلى ارتفاع ضغط الدم أو تسمم الحمل',
    descriptionEn: 'May indicate high blood pressure or preeclampsia',
    relatedConditions: ['preeclampsia'],
    actionRequired: 'immediate_medical_attention'
  },
  visionChanges: {
    key: 'visionChanges',
    labelAr: 'تغيرات في الرؤية (زغللة، رؤية بقع)',
    labelEn: 'Vision changes (blurred vision, seeing spots)',
    icon: '👁️',
    severity: 'high',
    category: 'critical',
    descriptionAr: 'علامة مهمة لتسمم الحمل',
    descriptionEn: 'Important sign of preeclampsia',
    relatedConditions: ['preeclampsia'],
    actionRequired: 'immediate_medical_attention'
  },
  swelling: {
    key: 'swelling',
    labelAr: 'تورم مفاجئ في الوجه أو اليدين أو القدمين',
    labelEn: 'Sudden swelling of face, hands, or feet',
    icon: '🫸',
    severity: 'high',
    category: 'critical',
    descriptionAr: 'قد يشير إلى احتباس السوائل المفرط',
    descriptionEn: 'May indicate excessive fluid retention',
    relatedConditions: ['preeclampsia'],
    actionRequired: 'immediate_medical_attention'
  },
  upperAbdominalPain: {
    key: 'upperAbdominalPain',
    labelAr: 'ألم في الجزء العلوي من البطن (تحت الأضلاع)',
    labelEn: 'Upper abdominal pain (under ribs)',
    icon: '🤰',
    severity: 'high',
    category: 'critical',
    descriptionAr: 'قد يرتبط بمشاكل في الكبد',
    descriptionEn: 'May be related to liver problems',
    relatedConditions: ['preeclampsia'],
    actionRequired: 'immediate_medical_attention'
  },
  shortnessOfBreath: {
    key: 'shortnessOfBreath',
    labelAr: 'ضيق شديد في التنفس',
    labelEn: 'Severe shortness of breath',
    icon: '💨',
    severity: 'high',
    category: 'critical',
    descriptionAr: 'قد يشير إلى مشاكل قلبية أو رئوية',
    descriptionEn: 'May indicate cardiac or pulmonary problems',
    relatedConditions: ['preeclampsia', 'anemia'],
    actionRequired: 'immediate_medical_attention'
  },
  excessiveThirst: {
    key: 'excessiveThirst',
    labelAr: 'عطش شديد ومستمر',
    labelEn: 'Excessive persistent thirst',
    icon: '💧',
    severity: 'medium',
    category: 'moderate',
    descriptionAr: 'قد يشير إلى سكري الحمل',
    descriptionEn: 'May indicate gestational diabetes',
    relatedConditions: ['gdm'],
    actionRequired: 'schedule_appointment'
  },
  fatigue: {
    key: 'fatigue',
    labelAr: 'تعب شديد أو إرهاق غير مبرر',
    labelEn: 'Severe or unexplained fatigue',
    icon: '😴',
    severity: 'medium',
    category: 'moderate',
    descriptionAr: 'قد يرتبط بالأنيميا أو نقص الفيتامينات',
    descriptionEn: 'May be related to anemia or vitamin deficiency',
    relatedConditions: ['anemia'],
    actionRequired: 'schedule_appointment'
  },
  dizziness: {
    key: 'dizziness',
    labelAr: 'دوخة أو دوار متكرر',
    labelEn: 'Frequent dizziness or vertigo',
    icon: '😵',
    severity: 'medium',
    category: 'moderate',
    descriptionAr: 'قد يشير إلى انخفاض ضغط الدم أو انخفاض السكر',
    descriptionEn: 'May indicate low blood pressure or low blood sugar',
    relatedConditions: ['anemia', 'gdm'],
    actionRequired: 'schedule_appointment'
  },
  frequentUrination: {
    key: 'frequentUrination',
    labelAr: 'تبول متكرر أكثر من المعتاد',
    labelEn: 'More frequent urination than usual',
    icon: '🚻',
    severity: 'low',
    category: 'common',
    descriptionAr: 'عرض طبيعي في الحمل لكن قد يشير إلى عدوى بولية إذا صاحبه ألم',
    descriptionEn: 'Normal pregnancy symptom but may indicate UTI if painful',
    relatedConditions: ['gdm'],
    actionRequired: 'monitor'
  },
  blurredVision: {
    key: 'blurredVision',
    labelAr: 'رؤية مشوشة',
    labelEn: 'Blurred vision',
    icon: '👓',
    severity: 'medium',
    category: 'moderate',
    descriptionAr: 'قد يكون علامة لارتفاع السكر أو ضغط الدم',
    descriptionEn: 'May be a sign of high blood sugar or blood pressure',
    relatedConditions: ['gdm', 'preeclampsia'],
    actionRequired: 'schedule_appointment'
  },
  recurrentInfections: {
    key: 'recurrentInfections',
    labelAr: 'عدوى متكررة (خاصة فطرية)',
    labelEn: 'Recurrent infections (especially yeast)',
    icon: '🦠',
    severity: 'medium',
    category: 'moderate',
    descriptionAr: 'قد تكون مرتبطة بارتفاع السكر',
    descriptionEn: 'May be related to high blood sugar',
    relatedConditions: ['gdm'],
    actionRequired: 'schedule_appointment'
  },
  paleSkin: {
    key: 'paleSkin',
    labelAr: 'شحوب في البشرة والأظافر',
    labelEn: 'Pale skin and nails',
    icon: '👋',
    severity: 'medium',
    category: 'moderate',
    descriptionAr: 'قد يشير إلى فقر الدم',
    descriptionEn: 'May indicate anemia',
    relatedConditions: ['anemia'],
    actionRequired: 'schedule_appointment'
  },
  rapidHeartbeat: {
    key: 'rapidHeartbeat',
    labelAr: 'خفقان أو تسارع نبضات القلب',
    labelEn: 'Palpitations or rapid heartbeat',
    icon: '💓',
    severity: 'medium',
    category: 'moderate',
    descriptionAr: 'قد يرتبط بفقر الدم أو مشاكل القلب',
    descriptionEn: 'May be related to anemia or cardiac issues',
    relatedConditions: ['anemia', 'preeclampsia'],
    actionRequired: 'schedule_appointment'
  },
  coldHandsFeet: {
    key: 'coldHandsFeet',
    labelAr: 'برودة اليدين والقدمين',
    labelEn: 'Cold hands and feet',
    icon: '🥶',
    severity: 'low',
    category: 'common',
    descriptionAr: 'قد يكون علامة لفقر الدم',
    descriptionEn: 'May be a sign of anemia',
    relatedConditions: ['anemia'],
    actionRequired: 'monitor'
  }
};

// ============================================================================
// SYMPTOM CATEGORIES
// ============================================================================

export const SYMPTOM_CATEGORIES = {
  critical: {
    labelAr: 'أعراض خطيرة تحتاج انتباه فوري',
    labelEn: 'Critical symptoms requiring immediate attention',
    icon: '🚨',
    color: 'red'
  },
  moderate: {
    labelAr: 'أعراض متوسطة الأهمية',
    labelEn: 'Moderately important symptoms',
    icon: '⚠️',
    color: 'yellow'
  },
  common: {
    labelAr: 'أعراض شائعة في الحمل',
    labelEn: 'Common pregnancy symptoms',
    icon: '📝',
    color: 'blue'
  }
};

// ============================================================================
// RISK FACTORS
// ============================================================================

export const RISK_FACTORS: Record<string, RiskFactorDefinition> = {
  firstPregnancy: {
    key: 'firstPregnancy',
    labelAr: 'الحمل الأول',
    labelEn: 'First pregnancy',
    riskLevel: 'high',
    descriptionAr: 'أول حمل يزيد من خطر تسمم الحمل',
    descriptionEn: 'First pregnancy increases preeclampsia risk',
    condition: 'preeclampsia',
    weight: 0.15
  },
  advancedAge: {
    key: 'advancedAge',
    labelAr: 'عمر 35 سنة أو أكثر',
    labelEn: 'Age 35 or older',
    riskLevel: 'high',
    descriptionAr: 'زيادة خطر مضاعفات الحمل',
    descriptionEn: 'Increased risk of pregnancy complications',
    condition: 'preeclampsia',
    weight: 0.2
  },
  youngAge: {
    key: 'youngAge',
    labelAr: 'عمر أقل من 18 سنة',
    labelEn: 'Age under 18',
    riskLevel: 'moderate',
    descriptionAr: 'زيادة خطر مضاعفات الحمل',
    descriptionEn: 'Increased risk of pregnancy complications',
    condition: 'preeclampsia',
    weight: 0.1
  },
  obesity: {
    key: 'obesity',
    labelAr: 'السمنة (BMI ≥ 30)',
    labelEn: 'Obesity (BMI ≥ 30)',
    riskLevel: 'high',
    descriptionAr: 'عامل خطر رئيسي لسكري الحمل وتسمم الحمل',
    descriptionEn: 'Major risk factor for GDM and preeclampsia',
    condition: 'gdm',
    weight: 0.25
  },
  overweight: {
    key: 'overweight',
    labelAr: 'زيادة الوزن (BMI 25-29.9)',
    labelEn: 'Overweight (BMI 25-29.9)',
    riskLevel: 'moderate',
    descriptionAr: 'عامل خطر لسكري الحمل',
    descriptionEn: 'Risk factor for GDM',
    condition: 'gdm',
    weight: 0.15
  },
  previousGDM: {
    key: 'previousGDM',
    labelAr: 'سكري حمل سابق',
    labelEn: 'Previous gestational diabetes',
    riskLevel: 'high',
    descriptionAr: 'خطر عالي للتكرار',
    descriptionEn: 'High risk of recurrence',
    condition: 'gdm',
    weight: 0.3
  },
  familyDiabetes: {
    key: 'familyDiabetes',
    labelAr: 'تاريخ عائلي للسكري',
    labelEn: 'Family history of diabetes',
    riskLevel: 'high',
    descriptionAr: 'زيادة خطر سكري الحمل',
    descriptionEn: 'Increased GDM risk',
    condition: 'gdm',
    weight: 0.2
  },
  multiplePregnancy: {
    key: 'multiplePregnancy',
    labelAr: 'حمل متعدد (توأم)',
    labelEn: 'Multiple pregnancy (twins)',
    riskLevel: 'high',
    descriptionAr: 'خطر أعلى للمضاعفات',
    descriptionEn: 'Higher complication risk',
    condition: 'preeclampsia',
    weight: 0.2
  },
  closelySpacedPregnancies: {
    key: 'closelySpacedPregnancies',
    labelAr: 'حمل متقارب (أقل من سنتين)',
    labelEn: 'Closely spaced pregnancies (<2 years)',
    riskLevel: 'moderate',
    descriptionAr: 'خطر فقر الدم',
    descriptionEn: 'Anemia risk',
    condition: 'anemia',
    weight: 0.15
  },
  poorDiet: {
    key: 'poorDiet',
    labelAr: 'نظام غذائي ضعيف',
    labelEn: 'Poor diet',
    riskLevel: 'moderate',
    descriptionAr: 'نقص الحديد والفيتامينات',
    descriptionEn: 'Iron and vitamin deficiency',
    condition: 'anemia',
    weight: 0.1
  }
};

// ============================================================================
// CLINICAL THRESHOLDS
// ============================================================================

export const CLINICAL_THRESHOLDS: Record<string, ClinicalThreshold> = {
  systolicBP: {
    condition: 'preeclampsia',
    parameter: 'systolicBp',
    normalRange: { min: 90, max: 120 },
    mildRange: { min: 140, max: 159 },
    severeRange: { min: 160, max: 200 },
    unit: 'mmHg',
    labelAr: 'ضغط الدم الانقباضي',
    labelEn: 'Systolic Blood Pressure'
  },
  diastolicBP: {
    condition: 'preeclampsia',
    parameter: 'diastolicBp',
    normalRange: { min: 60, max: 80 },
    mildRange: { min: 90, max: 109 },
    severeRange: { min: 110, max: 140 },
    unit: 'mmHg',
    labelAr: 'ضغط الدم الانبساطي',
    labelEn: 'Diastolic Blood Pressure'
  },
  fastingGlucose: {
    condition: 'gdm',
    parameter: 'fastingGlucose',
    normalRange: { min: 70, max: 92 },
    severeRange: { min: 92, max: 300 },
    unit: 'mg/dL',
    labelAr: 'سكر الدم الصائم',
    labelEn: 'Fasting Blood Glucose'
  },
  hemoglobin: {
    condition: 'anemia',
    parameter: 'hb',
    normalRange: { min: 11, max: 15 },
    mildRange: { min: 10, max: 10.9 },
    severeRange: { min: 5, max: 9.9 },
    unit: 'g/dL',
    labelAr: 'الهيموجلوبين',
    labelEn: 'Hemoglobin'
  }
};

// ============================================================================
// BMI CATEGORIES
// ============================================================================

export const BMI_CATEGORIES: BMICategory[] = [
  {
    range: { min: 0, max: 18.5 },
    labelAr: 'نحيف',
    labelEn: 'Underweight',
    colorClass: 'blue',
    weightGainRecommendation: { min: 12.5, max: 18 }
  },
  {
    range: { min: 18.5, max: 25 },
    labelAr: 'طبيعي',
    labelEn: 'Normal',
    colorClass: 'green',
    weightGainRecommendation: { min: 11.5, max: 16 }
  },
  {
    range: { min: 25, max: 30 },
    labelAr: 'زيادة وزن',
    labelEn: 'Overweight',
    colorClass: 'yellow',
    weightGainRecommendation: { min: 7, max: 11.5 }
  },
  {
    range: { min: 30, max: 100 },
    labelAr: 'سمنة',
    labelEn: 'Obese',
    colorClass: 'red',
    weightGainRecommendation: { min: 5, max: 9 }
  }
];

// ============================================================================
// PREGNANCY WEEK INFORMATION
// ============================================================================

export const PREGNANCY_WEEKS: PregnancyWeekInfo[] = [
  {
    weekRange: { min: 4, max: 13 },
    trimester: 1,
    fetalDevelopmentAr: 'تكوين الأعضاء الأساسية، بداية نبضات القلب',
    fetalDevelopmentEn: 'Formation of major organs, heart begins beating',
    maternalChangesAr: ['غثيان صباحي', 'تعب', 'تغيرات في الثدي'],
    maternalChangesEn: ['Morning sickness', 'Fatigue', 'Breast changes'],
    keyTestsAr: ['تأكيد الحمل', 'فحوصات الدم الأولية', 'فحص الموجات فوق الصوتية'],
    keyTestsEn: ['Pregnancy confirmation', 'Initial blood tests', 'Ultrasound scan']
  },
  {
    weekRange: { min: 14, max: 27 },
    trimester: 2,
    fetalDevelopmentAr: 'نمو سريع، بداية الحركة، تطور الحواس',
    fetalDevelopmentEn: 'Rapid growth, movement begins, senses develop',
    maternalChangesAr: ['زيادة الطاقة', 'بروز البطن', 'الشعور بحركة الجنين'],
    maternalChangesEn: ['Increased energy', 'Visible bump', 'Feel baby movement'],
    keyTestsAr: ['فحص التشوهات', 'فحص السكري (24-28 أسبوع)'],
    keyTestsEn: ['Anatomy scan', 'Glucose screening (24-28 weeks)']
  },
  {
    weekRange: { min: 28, max: 42 },
    trimester: 3,
    fetalDevelopmentAr: 'نضوج الأعضاء، اكتمال نمو الرئتين، الاستعداد للولادة',
    fetalDevelopmentEn: 'Organ maturation, lung development, preparing for birth',
    maternalChangesAr: ['ضيق التنفس', 'كثرة التبول', 'آلام الظهر', 'انقباضات براكستون'],
    maternalChangesEn: ['Shortness of breath', 'Frequent urination', 'Back pain', 'Braxton Hicks'],
    keyTestsAr: ['فحص البكتيريا العقدية', 'مراقبة نمو الجنين', 'فحوصات أسبوعية'],
    keyTestsEn: ['Group B Strep test', 'Growth monitoring', 'Weekly checkups']
  }
];

// ============================================================================
// CONDITIONS
// ============================================================================

export const CONDITIONS: Record<string, ConditionDefinition> = {
  preeclampsia: {
    id: 'preeclampsia',
    nameAr: 'تسمم الحمل',
    nameEn: 'Preeclampsia',
    definitionAr: 'حالة خطيرة تتميز بارتفاع ضغط الدم وأضرار في أجهزة الجسم، عادة الكبد والكلى',
    definitionEn: 'Serious condition characterized by high blood pressure and organ damage, usually liver and kidneys',
    riskFactors: ['firstPregnancy', 'advancedAge', 'youngAge', 'obesity', 'multiplePregnancy'],
    symptoms: ['headache', 'visionChanges', 'swelling', 'upperAbdominalPain', 'shortnessOfBreath'],
    diagnosticCriteria: ['systolicBP', 'diastolicBP'],
    redFlags: ['headache', 'visionChanges', 'upperAbdominalPain', 'shortnessOfBreath'],
    managementSteps: [
      'مراقبة ضغط الدم بانتظام',
      'فحوصات مخبرية متكررة',
      'مراقبة نمو الجنين',
      'أدوية خافضة للضغط إذا لزم الأمر',
      'النظر في الولادة المبكرة في الحالات الشديدة'
    ],
    preventionStrategies: [
      'أسبرين بجرعة منخفضة (للحالات عالية الخطورة)',
      'مكملات الكالسيوم',
      'نظام غذائي صحي',
      'ممارسة التمارين الرياضية بانتظام',
      'المتابعة الدورية مع الطبيب'
    ]
  },
  gdm: {
    id: 'gdm',
    nameAr: 'سكري الحمل',
    nameEn: 'Gestational Diabetes',
    definitionAr: 'عدم تحمل الجلوكوز الذي يُكتشف لأول مرة أثناء الحمل',
    definitionEn: 'Glucose intolerance first recognized during pregnancy',
    riskFactors: ['obesity', 'overweight', 'previousGDM', 'familyDiabetes', 'advancedAge'],
    symptoms: ['excessiveThirst', 'frequentUrination', 'fatigue', 'blurredVision', 'recurrentInfections'],
    diagnosticCriteria: ['fastingGlucose'],
    redFlags: ['blurredVision'],
    managementSteps: [
      'نظام غذائي متوازن مع حساب الكربوهيدرات',
      'ممارسة الرياضة المعتدلة يوميًا',
      'قياس السكر 4 مرات يوميًا',
      'الأنسولين إذا لم يكفِ النظام الغذائي',
      'مراقبة نمو الجنين بالموجات فوق الصوتية'
    ],
    preventionStrategies: [
      'الحفاظ على وزن صحي قبل الحمل',
      'نشاط بدني منتظم',
      'نظام غذائي متوازن',
      'تجنب زيادة الوزن المفرطة أثناء الحمل'
    ]
  },
  anemia: {
    id: 'anemia',
    nameAr: 'فقر الدم',
    nameEn: 'Anemia',
    definitionAr: 'انخفاض مستوى الهيموجلوبين عن المعدل الطبيعي مما يقلل قدرة الدم على حمل الأكسجين',
    definitionEn: 'Hemoglobin level below normal, reducing oxygen-carrying capacity',
    riskFactors: ['closelySpacedPregnancies', 'poorDiet', 'multiplePregnancy'],
    symptoms: ['fatigue', 'dizziness', 'paleSkin', 'rapidHeartbeat', 'coldHandsFeet', 'shortnessOfBreath'],
    diagnosticCriteria: ['hemoglobin'],
    redFlags: ['shortnessOfBreath'],
    managementSteps: [
      'مكملات الحديد (325mg 3 مرات يوميًا)',
      'فيتامين C لتحسين الامتصاص',
      'نظام غذائي غني بالحديد',
      'حديد وريدي في الحالات الشديدة',
      'متابعة مستوى الهيموجلوبين شهريًا'
    ],
    preventionStrategies: [
      'فيتامينات ما قبل الولادة مع حديد',
      'نظام غذائي غني بالحديد',
      'تناول فيتامين C مع الوجبات',
      'تجنب الشاي والقهوة مع الوجبات'
    ]
  }
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES: Record<string, ValidationRule[]> = {
  step1: [
    {
      field: 'name',
      required: true,
      messageAr: '❌ الاسم مطلوب',
      messageEn: '❌ Name is required',
      customValidation: (value: string) => value.trim().length >= 3
    },
    {
      field: 'age',
      min: 15,
      max: 50,
      required: true,
      messageAr: '❌ العمر يجب أن يكون بين 15 و 50 سنة',
      messageEn: '❌ Age must be between 15 and 50'
    },
    {
      field: 'pregnancyWeek',
      min: 4,
      max: 42,
      required: true,
      messageAr: '❌ أسبوع الحمل يجب أن يكون بين 4 و 42',
      messageEn: '❌ Pregnancy week must be between 4 and 42'
    }
  ],
  step2: [
    {
      field: 'g',
      min: 0,
      required: true,
      messageAr: '❌ عدد مرات الحمل يجب أن يكون صفر أو أكثر',
      messageEn: '❌ Gravida must be zero or more',
      customValidation: (value: number, formData: any) => {
        return formData.pregnancyHistory.p <= value && formData.pregnancyHistory.a <= value;
      }
    },
    {
      field: 'p',
      min: 0,
      required: true,
      messageAr: '❌ عدد الولادات لا يمكن أن يكون أكبر من عدد مرات الحمل',
      messageEn: '❌ Para cannot be greater than gravida'
    },
    {
      field: 'a',
      min: 0,
      required: true,
      messageAr: '❌ عدد حالات الإجهاض لا يمكن أن يكون أكبر من عدد مرات الحمل',
      messageEn: '❌ Abortions cannot be greater than gravida'
    }
  ],
  step3: [
    {
      field: 'height',
      min: 140,
      max: 200,
      required: true,
      messageAr: '❌ الطول يجب أن يكون بين 140 و 200 سم',
      messageEn: '❌ Height must be between 140 and 200 cm'
    },
    {
      field: 'prePregnancyWeight',
      min: 35,
      max: 150,
      required: true,
      messageAr: '❌ الوزن قبل الحمل يجب أن يكون بين 35 و 150 كجم',
      messageEn: '❌ Pre-pregnancy weight must be between 35 and 150 kg'
    },
    {
      field: 'currentWeight',
      min: 35,
      max: 200,
      required: true,
      messageAr: '❌ الوزن الحالي يجب أن يكون بين 35 و 200 كجم',
      messageEn: '❌ Current weight must be between 35 and 200 kg'
    }
  ],
  step5: [
    {
      field: 'systolicBp',
      min: 80,
      max: 200,
      messageAr: '❌ ضغط الدم الانقباضي يجب أن يكون بين 80 و 200',
      messageEn: '❌ Systolic BP must be between 80 and 200'
    },
    {
      field: 'diastolicBp',
      min: 50,
      max: 140,
      messageAr: '❌ ضغط الدم الانبساطي يجب أن يكون بين 50 و 140',
      messageEn: '❌ Diastolic BP must be between 50 and 140'
    },
    {
      field: 'fastingGlucose',
      min: 50,
      max: 300,
      messageAr: '❌ سكر الدم يجب أن يكون بين 50 و 300 mg/dL',
      messageEn: '❌ Glucose must be between 50 and 300 mg/dL'
    },
    {
      field: 'hb',
      min: 5,
      max: 20,
      messageAr: '❌ الهيموجلوبين يجب أن يكون بين 5 و 20 g/dL',
      messageEn: '❌ Hemoglobin must be between 5 and 20 g/dL'
    }
  ]
};

// ============================================================================
// RISK SCORING HELPERS
// ============================================================================

export interface RiskScoreResult {
  score: number; // 0-1
  level: 'normal' | 'low' | 'moderate' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
}

export function calculateBMI(height: number, weight: number): number {
  if (!height || !weight || height < 100 || weight < 30) return 0;
  const heightInM = height / 100;
  return weight / (heightInM * heightInM);
}

export function getBMICategory(bmi: number): BMICategory | null {
  return BMI_CATEGORIES.find(cat => bmi >= cat.range.min && bmi < cat.range.max) || null;
}

export function getPregnancyWeekInfo(week: number): PregnancyWeekInfo | null {
  return PREGNANCY_WEEKS.find(pw => week >= pw.weekRange.min && week <= pw.weekRange.max) || null;
}

export function assessClinicalParameter(
  parameter: string,
  value: number
): { status: 'normal' | 'mild' | 'severe'; threshold: ClinicalThreshold } | null {
  const threshold = CLINICAL_THRESHOLDS[parameter];
  if (!threshold || !value) return null;

  if (value >= threshold.normalRange.min && value <= threshold.normalRange.max) {
    return { status: 'normal', threshold };
  }

  if (threshold.mildRange && value >= threshold.mildRange.min && value <= threshold.mildRange.max) {
    return { status: 'mild', threshold };
  }

  if (threshold.severeRange && value >= threshold.severeRange.min && value <= threshold.severeRange.max) {
    return { status: 'severe', threshold };
  }

  return { status: 'severe', threshold };
}

export function calculateConditionRisk(
  conditionId: string,
  formData: any
): RiskScoreResult {
  const condition = CONDITIONS[conditionId];
  if (!condition) {
    return {
      score: 0,
      level: 'normal',
      factors: [],
      recommendations: []
    };
  }

  let riskScore = 0;
  const identifiedFactors: string[] = [];

  // Check risk factors
  condition.riskFactors.forEach(factorKey => {
    const factor = RISK_FACTORS[factorKey];
    if (!factor) return;

    let hasRiskFactor = false;

    // Age-based risk factors
    if (factorKey === 'advancedAge' && formData.personalInfo.age >= 35) {
      hasRiskFactor = true;
    } else if (factorKey === 'youngAge' && formData.personalInfo.age < 18) {
      hasRiskFactor = true;
    }
    // First pregnancy
    else if (factorKey === 'firstPregnancy' && formData.pregnancyHistory.g === 1) {
      hasRiskFactor = true;
    }
    // BMI-based
    else if (factorKey === 'obesity' || factorKey === 'overweight') {
      const bmi = calculateBMI(formData.measurementData.height, formData.measurementData.prePregnancyWeight);
      if (factorKey === 'obesity' && bmi >= 30) hasRiskFactor = true;
      if (factorKey === 'overweight' && bmi >= 25 && bmi < 30) hasRiskFactor = true;
    }
    // Multiple pregnancy (would need additional data)
    else if (factorKey === 'multiplePregnancy' && formData.pregnancyHistory.multipleGestation) {
      hasRiskFactor = true;
    }
    // Closely spaced pregnancies
    else if (factorKey === 'closelySpacedPregnancies' && formData.pregnancyHistory.p > 0) {
      // This would need more detailed data about spacing
      hasRiskFactor = false;
    }

    if (hasRiskFactor) {
      riskScore += factor.weight;
      identifiedFactors.push(factor.labelAr);
    }
  });

  // Check symptoms
  condition.symptoms.forEach(symptomKey => {
    if (formData.symptoms[symptomKey]) {
      const symptom = SYMPTOMS[symptomKey];
      if (symptom) {
        if (symptom.severity === 'high') {
          riskScore += 0.2;
        } else if (symptom.severity === 'medium') {
          riskScore += 0.1;
        }
        identifiedFactors.push(symptom.labelAr);
      }
    }
  });

  // Check lab results against diagnostic criteria
  condition.diagnosticCriteria.forEach(criterionKey => {
    const threshold = CLINICAL_THRESHOLDS[criterionKey];
    if (!threshold) return;

    const value = formData.labResults[threshold.parameter];
    if (!value) return;

    const assessment = assessClinicalParameter(criterionKey, value);
    if (assessment) {
      if (assessment.status === 'severe') {
        riskScore += 0.3;
        identifiedFactors.push(`${threshold.labelAr} مرتفع`);
      } else if (assessment.status === 'mild') {
        riskScore += 0.15;
        identifiedFactors.push(`${threshold.labelAr} مرتفع قليلاً`);
      }
    }
  });

  // Normalize score to 0-1
  riskScore = Math.min(riskScore, 1);

  // Determine level
  let level: RiskScoreResult['level'] = 'normal';
  if (riskScore >= 0.75) level = 'critical';
  else if (riskScore >= 0.5) level = 'high';
  else if (riskScore >= 0.25) level = 'moderate';
  else if (riskScore > 0) level = 'low';

  return {
    score: riskScore,
    level,
    factors: identifiedFactors,
    recommendations: level === 'normal' ? [] : condition.managementSteps
  };
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

export function getRiskDisplay(score: number) {
  if (score >= 0.75) return {
    text: 'عالي',
    textEn: 'High',
    className: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl',
    icon: '🚨',
    pulse: true,
    recommendation: 'يرجى مراجعة الطبيب فوراً',
    recommendationEn: 'Please see a doctor immediately'
  };
  if (score >= 0.5) return {
    text: 'متوسط',
    textEn: 'Moderate',
    className: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg',
    icon: '⚠️',
    pulse: false,
    recommendation: 'يُنصح بمتابعة دقيقة مع الطبيب',
    recommendationEn: 'Close monitoring with doctor recommended'
  };
  if (score >= 0.25) return {
    text: 'منخفض',
    textEn: 'Low',
    className: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg',
    icon: 'ℹ️',
    pulse: false,
    recommendation: 'متابعة منتظمة مع الالتزام بالنصائح',
    recommendationEn: 'Regular monitoring and follow recommendations'
  };
  return {
    text: 'طبيعي',
    textEn: 'Normal',
    className: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg',
    icon: '✅',
    pulse: false,
    recommendation: 'حالة ممتازة، استمري بالعناية الصحية',
    recommendationEn: 'Excellent condition, continue healthy care'
  };
}

export function getSymptomsByCategory() {
  const grouped: Record<string, SymptomDefinition[]> = {
    critical: [],
    moderate: [],
    common: []
  };

  Object.values(SYMPTOMS).forEach(symptom => {
    if (grouped[symptom.category]) {
      grouped[symptom.category].push(symptom);
    }
  });

  return grouped;
}

export function getRedFlagSymptoms(): SymptomDefinition[] {
  return Object.values(SYMPTOMS).filter(s => s.actionRequired === 'immediate_medical_attention');
}

// ============================================================================
// EXPORT ORIGINAL TEXT KB (for AI prompts)
// ============================================================================

export const MEDICAL_KB_TEXT = `
═══════════════════════════════════════════════════════════════
                  COMPREHENSIVE MEDICAL KNOWLEDGE BASE
                     FOR PREGNANCY CARE AI ASSISTANT
═══════════════════════════════════════════════════════════════

This knowledge base contains evidence-based medical information for pregnancy care,
including diagnostic criteria, risk assessment, and management guidelines for:
- Preeclampsia (Pre-eclampsia / تسمم الحمل)
- Gestational Diabetes Mellitus (GDM / سكري الحمل)
- Anemia in Pregnancy (فقر الدم)

All information is based on WHO guidelines, ACOG recommendations, and current
medical literature. This is for informational purposes only and does not replace
professional medical advice.

${Object.values(CONDITIONS).map(condition => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${condition.nameAr} / ${condition.nameEn}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEFINITION:
${condition.definitionAr}
${condition.definitionEn}

RISK FACTORS:
${condition.riskFactors.map(rf => {
  const factor = RISK_FACTORS[rf];
  return factor ? `- ${factor.labelEn}: ${factor.descriptionEn}` : '';
}).join('\n')}

SYMPTOMS:
${condition.symptoms.map(sk => {
  const symptom = SYMPTOMS[sk];
  return symptom ? `- ${symptom.labelEn}: ${symptom.descriptionEn}` : '';
}).join('\n')}

RED FLAGS (Require Immediate Medical Attention):
${condition.redFlags.map(sk => {
  const symptom = SYMPTOMS[sk];
  return symptom ? `- ${symptom.labelEn}` : '';
}).join('\n')}

DIAGNOSTIC CRITERIA:
${condition.diagnosticCriteria.map(dc => {
  const threshold = CLINICAL_THRESHOLDS[dc];
  return threshold ? `- ${threshold.labelEn}: Normal ${threshold.normalRange.min}-${threshold.normalRange.max} ${threshold.unit}` : '';
}).join('\n')}

MANAGEMENT:
${condition.managementSteps.join('\n')}

PREVENTION:
${condition.preventionStrategies.join('\n')}
`).join('\n')}

⚕️ MEDICAL DISCLAIMER:
This knowledge base is for INFORMATIONAL purposes only and should NOT 
replace professional medical advice, diagnosis, or treatment.
- Every pregnancy is unique
- Always consult healthcare provider for personalized medical advice
- When in doubt, seek medical attention
- Trust your instincts - if something feels wrong, get checked

═══════════════════════════════════════════════════════════════
                     END OF MEDICAL KNOWLEDGE BASE
═══════════════════════════════════════════════════════════════
`;

// ============================================================================
// EXPORTS
// ============================================================================
// ============================================================================
// ANTEPARTUM RISK ASSESSMENT (Add this section to medicalKB.ts)
// ============================================================================

export interface AntepartumRiskFactor {
  id: string;
  category: string;
  questionAr: string;
  questionEn: string;
  score: number;
}

export interface AntepartumCategory {
  name: string;
  nameAr: string;
  nameEn: string;
  factors: AntepartumRiskFactor[];
}

export const ANTEPARTUM_RISK_FACTORS: AntepartumCategory[] = [
  {
    name: "demographic",
    nameAr: "العوامل الديموغرافية والاجتماعية والاقتصادية",
    nameEn: "Demographic and Socioeconomic",
    factors: [
      {
        id: "maternal_age",
        category: "demographic",
        questionAr: "عمر الأم أقل من 17 أو أكثر من 35 سنة",
        questionEn: "Maternal age <17 or >35",
        score: 2
      },
      {
        id: "unmarried",
        category: "demographic",
        questionAr: "غير متزوجة أو بدون دعم",
        questionEn: "Unmarried or unsupported",
        score: 2
      },
      {
        id: "low_ses",
        category: "demographic",
        questionAr: "مستوى اجتماعي واقتصادي منخفض",
        questionEn: "Low socioeconomic status",
        score: 1
      },
      {
        id: "limited_education",
        category: "demographic",
        questionAr: "تعليم محدود (أقل من 8 سنوات)",
        questionEn: "Limited education (<8 years)",
        score: 1
      },
      {
        id: "poor_housing",
        category: "demographic",
        questionAr: "سكن سيء / صرف صحي سيء",
        questionEn: "Poor housing / sanitation",
        score: 1
      },
      {
        id: "cultural_barriers",
        category: "demographic",
        questionAr: "حواجز لغوية أو ثقافية في الرعاية",
        questionEn: "Language or cultural barriers to care",
        score: 1
      }
    ]
  },
  {
    name: "psychosocial",
    nameAr: "العوامل العاطفية والنفسية والاجتماعية",
    nameEn: "Emotional and Psychosocial",
    factors: [
      {
        id: "anxiety_depression",
        category: "psychosocial",
        questionAr: "قلق مفرط، اكتئاب، أو ضعف في التأقلم",
        questionEn: "Excessive anxiety, depression, or poor coping",
        score: 2
      },
      {
        id: "family_conflict",
        category: "psychosocial",
        questionAr: "صراع زوجي أو عائلي",
        questionEn: "Marital or family conflict",
        score: 2
      },
      {
        id: "emotional_illness_history",
        category: "psychosocial",
        questionAr: "تاريخ من الأمراض العاطفية",
        questionEn: "History of emotional illness",
        score: 2
      },
      {
        id: "substance_use",
        category: "psychosocial",
        questionAr: "تعاطي المواد (التبغ، الكحول، المخدرات)",
        questionEn: "Substance use (tobacco, alcohol, drugs)",
        score: 3
      }
    ]
  },
  {
    name: "obstetric_history",
    nameAr: "التاريخ التوليدي السابق",
    nameEn: "Past Obstetric History",
    factors: [
      {
        id: "stillbirth_neonatal_death",
        category: "obstetric_history",
        questionAr: "ولادة جنين ميت سابقة أو وفاة حديثي الولادة",
        questionEn: "Previous stillbirth or neonatal death",
        score: 4
      },
      {
        id: "preterm_low_birthweight",
        category: "obstetric_history",
        questionAr: "ولادة مبكرة سابقة أو طفل منخفض الوزن عند الولادة",
        questionEn: "Previous preterm or low birthweight infant",
        score: 3
      },
      {
        id: "recurrent_miscarriage",
        category: "obstetric_history",
        questionAr: "إجهاض متكرر",
        questionEn: "Recurrent miscarriage",
        score: 3
      },
      {
        id: "grand_multiparity",
        category: "obstetric_history",
        questionAr: "كثرة الولادات (≥5)",
        questionEn: "Grand multiparity (≥5)",
        score: 2
      },
      {
        id: "previous_cesarean",
        category: "obstetric_history",
        questionAr: "عملية قيصرية سابقة",
        questionEn: "Previous cesarean section",
        score: 2
      }
    ]
  },
  {
    name: "medical_history",
    nameAr: "التاريخ الطبي (الحالات الموجودة مسبقاً)",
    nameEn: "Medical History (Pre-existing Conditions)",
    factors: [
      {
        id: "hypertension_preexisting",
        category: "medical_history",
        questionAr: "ارتفاع ضغط الدم",
        questionEn: "Hypertension",
        score: 4
      },
      {
        id: "cardiac_disease",
        category: "medical_history",
        questionAr: "مرض القلب",
        questionEn: "Cardiac disease",
        score: 4
      },
      {
        id: "diabetes_preexisting",
        category: "medical_history",
        questionAr: "داء السكري",
        questionEn: "Diabetes mellitus",
        score: 4
      },
      {
        id: "renal_disease",
        category: "medical_history",
        questionAr: "مرض كلوي",
        questionEn: "Renal disease",
        score: 3
      },
      {
        id: "thyroid_disorder",
        category: "medical_history",
        questionAr: "اضطراب الغدة الدرقية",
        questionEn: "Thyroid disorder",
        score: 2
      },
      {
        id: "epilepsy",
        category: "medical_history",
        questionAr: "الصرع",
        questionEn: "Epilepsy",
        score: 2
      },
      {
        id: "chronic_infection",
        category: "medical_history",
        questionAr: "عدوى مزمنة (السل، التهاب الكبد، فيروس نقص المناعة البشرية)",
        questionEn: "Chronic infection (TB, hepatitis, HIV)",
        score: 3
      },
      {
        id: "anemia_severe",
        category: "medical_history",
        questionAr: "فقر الدم (Hb <10 g/dL)",
        questionEn: "Anemia (Hb <10 g/dL)",
        score: 2
      }
    ]
  },
  {
    name: "current_pregnancy",
    nameAr: "مضاعفات الحمل الحالي",
    nameEn: "Current Pregnancy Complications",
    factors: [
      {
        id: "bleeding_early",
        category: "current_pregnancy",
        questionAr: "نزيف قبل 20 أسبوعاً",
        questionEn: "Bleeding before 20 weeks",
        score: 3
      },
      {
        id: "persistent_vomiting",
        category: "current_pregnancy",
        questionAr: "قيء مستمر / قيء الحمل المفرط",
        questionEn: "Persistent vomiting / hyperemesis",
        score: 2
      },
      {
        id: "abnormal_uterine_size",
        category: "current_pregnancy",
        questionAr: "حجم الرحم غير طبيعي (صغير جداً / كبير جداً)",
        questionEn: "Abnormal uterine size (too small / large)",
        score: 2
      },
      {
        id: "multiple_pregnancy",
        category: "current_pregnancy",
        questionAr: "حمل متعدد (توأم، ثلاثة توائم)",
        questionEn: "Multiple pregnancy (twins, triplets)",
        score: 3
      },
      {
        id: "rh_negative",
        category: "current_pregnancy",
        questionAr: "عامل ريسس سالب أو تحسس مناعي",
        questionEn: "Rh negative or isoimmunization",
        score: 2
      },
      {
        id: "infection_current",
        category: "current_pregnancy",
        questionAr: "عدوى (التهاب المسالك البولية، الحصبة الألمانية، داء المقوسات، الزهري، إلخ)",
        questionEn: "Infection (UTI, rubella, toxoplasmosis, syphilis, etc.)",
        score: 3
      },
      {
        id: "preeclampsia_current",
        category: "current_pregnancy",
        questionAr: "تسمم الحمل / ارتفاع ضغط الدم",
        questionEn: "Preeclampsia / hypertension",
        score: 4
      },
      {
        id: "amniotic_fluid_abnormal",
        category: "current_pregnancy",
        questionAr: "زيادة السائل الأمنيوسي / نقص السائل الأمنيوسي",
        questionEn: "Polyhydramnios / oligohydramnios",
        score: 3
      },
      {
        id: "fetal_growth_restriction",
        category: "current_pregnancy",
        questionAr: "تقييد نمو الجنين المشتبه به",
        questionEn: "Suspected fetal growth restriction",
        score: 3
      },
      {
        id: "poor_weight_gain",
        category: "current_pregnancy",
        questionAr: "زيادة وزن الأم ضعيفة (<5 رطل بحلول 20 أسبوعاً)",
        questionEn: "Poor maternal weight gain (<5 lb by 20 wks)",
        score: 2
      }
    ]
  }
];

// Risk level interpretation
export interface AntepartumRiskLevel {
  level: "low" | "moderate" | "high";
  emoji: string;
  color: string;
  colorClass: string;
  titleAr: string;
  titleEn: string;
  interpretationAr: string;
  interpretationEn: string;
  recommendationsAr: string[];
  recommendationsEn: string[];
}

export function getAntepartumRiskLevel(totalScore: number): AntepartumRiskLevel {
  if (totalScore >= 0 && totalScore <= 9) {
    return {
      level: "low",
      emoji: "🟢",
      color: "green",
      colorClass: "bg-green-500",
      titleAr: "خطر منخفض",
      titleEn: "Low Risk",
      interpretationAr: "لم يتم تحديد عوامل خطر كبيرة. من المتوقع أن يتقدم الحمل بشكل طبيعي.",
      interpretationEn: "No significant risk factors identified. Pregnancy expected to progress normally.",
      recommendationsAr: [
        "الاستمرار في الرعاية السابقة للولادة الروتينية",
        "التأكيد على التغذية والراحة والاستعداد للولادة",
        "جدول الزيارات القياسي (كل 4-6 أسابيع حتى 28 أسبوعاً؛ كل أسبوعين بعد ذلك)"
      ],
      recommendationsEn: [
        "Continue routine antenatal care (ANC)",
        "Emphasize nutrition, rest, and birth preparedness",
        "Standard visit schedule (every 4-6 weeks until 28 weeks; every 2 weeks thereafter)"
      ]
    };
  } else if (totalScore >= 10 && totalScore <= 19) {
    return {
      level: "moderate",
      emoji: "🟡",
      color: "yellow",
      colorClass: "bg-yellow-500",
      titleAr: "خطر متوسط",
      titleEn: "Moderate Risk",
      interpretationAr: "وجود عامل خطر واحد أو أكثر خفيف إلى متوسط (مثل سن الأم الصغيرة أو المتقدمة، فقر الدم الخفيف، قيصرية سابقة، عدوى).",
      interpretationEn: "One or more mild-to-moderate risk factors present (e.g., young or advanced maternal age, mild anemia, previous cesarean, infection).",
      recommendationsAr: [
        "يتطلب مراقبة ومتابعة أكثر دقة",
        "زيادة تكرار زيارات الرعاية السابقة للولادة (كل 2-3 أسابيع)",
        "إجراء فحوصات إضافية حسب الإشارة (مثل الموجات فوق الصوتية، الفحوصات المخبرية)",
        "تقديم المشورة ومعالجة المخاطر القابلة للتعديل",
        "النظر في الإحالة المبكرة إذا ظهرت مضاعفات جديدة"
      ],
      recommendationsEn: [
        "Requires closer monitoring and follow-up",
        "Increase frequency of ANC visits (every 2-3 weeks)",
        "Conduct additional tests as indicated (e.g., ultrasound, labs)",
        "Provide counseling and address modifiable risks",
        "Consider early referral if new complications appear"
      ]
    };
  } else { // >= 20
    return {
      level: "high",
      emoji: "🔴",
      color: "red",
      colorClass: "bg-red-500",
      titleAr: "خطر عالٍ",
      titleEn: "High Risk",
      interpretationAr: "تم تحديد عوامل خطر طبية أو توليدية أو نفسية اجتماعية متعددة أو شديدة (مثل تسمم الحمل، السكري، أمراض القلب، تاريخ توليدي سيء). خطر عالٍ من حدوث مضاعفات للأم و/أو الجنين.",
      interpretationEn: "Multiple or severe medical, obstetric, or psychosocial risk factors identified (e.g., preeclampsia, diabetes, cardiac disease, poor obstetric history). High risk of maternal and/or fetal complications.",
      recommendationsAr: [
        "يتطلب رعاية توليدية متخصصة",
        "الإحالة إلى منشأة رعاية من مستوى أعلى أو مستوى ثالث",
        "زيارات رعاية سابقة للولادة أسبوعية أو أكثر تكراراً",
        "مراقبة مستمرة للجنين والأم",
        "وضع خطة ولادة وطوارئ فردية",
        "النظر في دخول المستشفى إذا كان مؤشراً"
      ],
      recommendationsEn: [
        "Requires specialist obstetric care",
        "Refer to a higher-level or tertiary care facility",
        "Weekly or more frequent ANC visits",
        "Continuous fetal and maternal monitoring",
        "Develop individualized birth and emergency plan",
        "Consider hospitalization if indicated"
      ]
    };
  }
}

// Calculate total antepartum score
export function calculateAntepartumScore(selectedFactors: string[]): number {
  let totalScore = 0;
  
  ANTEPARTUM_RISK_FACTORS.forEach(category => {
    category.factors.forEach(factor => {
      if (selectedFactors.includes(factor.id)) {
        totalScore += factor.score;
      }
    });
  });
  
  return totalScore;
}

// Get all factors as flat array
export function getAllAntepartumFactors(): AntepartumRiskFactor[] {
  const allFactors: AntepartumRiskFactor[] = [];
  ANTEPARTUM_RISK_FACTORS.forEach(category => {
    allFactors.push(...category.factors);
  });
  return allFactors;
}
export default {
  SYMPTOMS,
  SYMPTOM_CATEGORIES,
  RISK_FACTORS,
  CLINICAL_THRESHOLDS,
  BMI_CATEGORIES,
  PREGNANCY_WEEKS,
  CONDITIONS,
  VALIDATION_RULES,
  MEDICAL_KB_TEXT,
  
  // ADD THESE NEW EXPORTS:
  ANTEPARTUM_RISK_FACTORS,
  getAntepartumRiskLevel,
  calculateAntepartumScore,
  getAllAntepartumFactors,
  
  // Helper functions
  calculateBMI,
  getBMICategory,
  getPregnancyWeekInfo,
  assessClinicalParameter,
  calculateConditionRisk,
  getRiskDisplay,
  getSymptomsByCategory,
  getRedFlagSymptoms
};
