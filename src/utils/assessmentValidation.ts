import { z } from 'zod';

export const assessmentSchema = z.object({
    personalInfo: z.object({
        name: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
        age: z.coerce.number().min(15, "العمر يجب أن يكون أكبر من 15").max(50, "العمر يجب أن يكون أقل من 50"),
        pregnancyWeek: z.coerce.number().min(4).max(42).optional(),
    }),
    pregnancyHistory: z.object({
        g: z.coerce.number().min(0),
        p: z.coerce.number().min(0),
        a: z.coerce.number().min(0),
    }).refine((data) => data.p + data.a <= data.g, {
        message: "مجموع الولادات والإجهاض لا يمكن أن يتجاوز عدد مرات الحمل (P + A <= G)",
        path: ['p'], // Show error on P field
    }),
    measurementData: z.object({
        height: z.coerce.number().min(140).max(200),
        prePregnancyWeight: z.coerce.number().min(35).max(150),
        currentWeight: z.coerce.number().min(35).max(200),
    }),
    labResults: z.object({
        systolicBp: z.coerce.number().min(80).max(200).optional().or(z.literal(0)),
        diastolicBp: z.coerce.number().min(50).max(140).optional().or(z.literal(0)),
        fastingGlucose: z.coerce.number().min(50).max(300).optional().or(z.literal(0)),
        hb: z.coerce.number().min(5).max(20).optional().or(z.literal(0)),
    }),
});

export type AssessmentSchema = z.infer<typeof assessmentSchema>;