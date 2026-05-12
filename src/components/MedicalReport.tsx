import React from 'react';
import { PatientRecord } from '../types';

interface MedicalReportProps {
    record: PatientRecord;
}

const MedicalReport: React.FC<MedicalReportProps> = ({ record }) => {
    const { personalInfo, measurementData, labResults, aiResponse, timestamp, pregnancyHistory } = record;

    const bmi = measurementData.height && measurementData.currentWeight
        ? (measurementData.currentWeight / Math.pow(measurementData.height / 100, 2)).toFixed(1)
        : null;

    const weightGain = measurementData.currentWeight - measurementData.prePregnancyWeight;

    const overallRisk = aiResponse.riskScores.overallRisk;
    const overallLabel = overallRisk >= 0.7 ? 'عالي' : overallRisk >= 0.4 ? 'متوسط' : 'منخفض';
    const overallBg = overallRisk >= 0.7 ? '#FEF2F2' : overallRisk >= 0.4 ? '#FFFBEB' : '#F0FDF4';
    const overallBorder = overallRisk >= 0.7 ? '#C0392B' : overallRisk >= 0.4 ? '#E67E22' : '#27AE60';
    const overallColor = overallRisk >= 0.7 ? '#C0392B' : overallRisk >= 0.4 ? '#D97706' : '#15803D';

    return (
        <div
            dir="rtl"
            style={{
                fontFamily: "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif",
                background: '#F7F5F0',
                minHeight: '100vh',
                padding: '40px 24px',
                color: '#1A1A2E',
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&display=swap');
                * { box-sizing: border-box; }
                .report-sec-title {
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: #8A8880;
                    margin-bottom: 14px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #E0DDD6;
                }
                .report-card {
                    background: #fff;
                    border: 1px solid #E0DDD6;
                    border-radius: 14px;
                    padding: 20px 24px;
                    margin-bottom: 18px;
                }
                .stat-chip {
                    background: #F7F5F0;
                    border: 1px solid #E0DDD6;
                    border-radius: 10px;
                    padding: 11px 13px;
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }
                .stat-chip-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: #8A8880;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }
                .stat-chip-value {
                    font-size: 18px;
                    font-weight: 600;
                    color: #1A1A2E;
                    line-height: 1.2;
                }
                .report-prose {
                    font-size: 14px;
                    line-height: 1.85;
                    color: #3A3A4E;
                    white-space: pre-wrap;
                }
                .icd-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: #EEF2FF;
                    border: 1px solid #C7D2FE;
                    border-radius: 8px;
                    padding: 7px 13px;
                    margin: 3px;
                }
                .icd-code-badge {
                    font-family: 'IBM Plex Mono', monospace;
                    font-size: 11px;
                    font-weight: 600;
                    color: #4338CA;
                    background: #C7D2FE;
                    padding: 2px 7px;
                    border-radius: 5px;
                }
                .icd-code-name {
                    font-size: 12px;
                    color: #3730A3;
                }
                @media print {
                    body { background: white !important; }
                    .report-wrapper { box-shadow: none !important; }
                }
            `}</style>

            <div
                className="report-wrapper"
                style={{
                    maxWidth: 860,
                    margin: '0 auto',
                    background: '#fff',
                    borderRadius: 20,
                    boxShadow: '0 2px 32px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                }}
            >
                {/* ── HEADER ── */}
                <div style={{ background: '#1A1A2E', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 26, height: 26, background: '#E63946', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <span style={{ color: '#E63946', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Smart Pregnancy Assistant</span>
                        </div>
                        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 600, lineHeight: 1.2, margin: '0 0 6px' }}>تقرير التقييم الطبي</h1>
                        <p style={{ color: '#8A8FA8', fontSize: 13, margin: 0 }}>Medical Screening Report · AI-Assisted Analysis</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '13px 18px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', flexShrink: 0 }}>
                        <p style={{ color: '#8A8FA8', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>التاريخ</p>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{timestamp.toLocaleDateString('en-GB')}</p>
                        <p style={{ color: '#8A8FA8', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>المرجع</p>
                        <p style={{ color: '#C0C4D6', fontSize: 11, fontFamily: 'monospace' }}>{record.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>

                {/* ── OVERALL RISK BANNER ── */}
                <div style={{ background: overallBg, borderBottom: `3px solid ${overallBorder}`, padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
                    <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: overallColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>مستوى الخطورة الإجمالية</p>
                        <p style={{ fontSize: 20, fontWeight: 600, color: overallColor, margin: 0 }}>{overallLabel} · {(overallRisk * 100).toFixed(0)}%</p>
                    </div>
                    <p style={{ fontSize: 13, color: '#4A4A5A', lineHeight: 1.75, maxWidth: 380, margin: 0, textAlign: 'center' }}>
                        {aiResponse.brief_summary}
                    </p>
                </div>

                <div style={{ padding: '32px 40px' }}>

                    {/* ── PATIENT INFO + VITALS ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                        <div className="report-card" style={{ margin: 0 }}>
                            <p className="report-sec-title">بيانات المريضة</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, color: '#E63946', flexShrink: 0 }}>
                                    {personalInfo.name.charAt(0)}
                                </div>
                                <div>
                                    <p style={{ fontSize: 17, fontWeight: 600, color: '#1A1A2E', margin: '0 0 3px' }}>{personalInfo.name}</p>
                                    <p style={{ fontSize: 13, color: '#8A8880', margin: 0 }}>
                                        {personalInfo.age} سنة{personalInfo.pregnancyWeek ? ` · أسبوع ${personalInfo.pregnancyWeek}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                <div className="stat-chip">
                                    <span className="stat-chip-label">Gravida</span>
                                    <span className="stat-chip-value">{pregnancyHistory.g}</span>
                                </div>
                                <div className="stat-chip">
                                    <span className="stat-chip-label">Para</span>
                                    <span className="stat-chip-value">{pregnancyHistory.p}</span>
                                </div>
                                <div className="stat-chip">
                                    <span className="stat-chip-label">Abortus</span>
                                    <span className="stat-chip-value">{pregnancyHistory.a}</span>
                                </div>
                            </div>
                        </div>

                        <div className="report-card" style={{ margin: 0 }}>
                            <p className="report-sec-title">المقاييس الحيوية</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div className="stat-chip">
                                    <span className="stat-chip-label">الوزن الحالي</span>
                                    <span className="stat-chip-value">{measurementData.currentWeight} <span style={{ fontSize: 11, fontWeight: 400, color: '#8A8880' }}>كجم</span></span>
                                </div>
                                <div className="stat-chip">
                                    <span className="stat-chip-label">الطول</span>
                                    <span className="stat-chip-value">{measurementData.height} <span style={{ fontSize: 11, fontWeight: 400, color: '#8A8880' }}>سم</span></span>
                                </div>
                                <div className="stat-chip">
                                    <span className="stat-chip-label">مؤشر الكتلة BMI</span>
                                    <span className="stat-chip-value">{bmi ?? '—'}</span>
                                </div>
                                <div className="stat-chip">
                                    <span className="stat-chip-label">زيادة الوزن</span>
                                    <span className="stat-chip-value" style={{ color: weightGain > 15 ? '#DC2626' : '#1A1A2E' }}>
                                        {weightGain > 0 ? '+' : ''}{weightGain.toFixed(1)} <span style={{ fontSize: 11, fontWeight: 400, color: '#8A8880' }}>كجم</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── LAB RESULTS ── */}
                    <div className="report-card">
                        <p className="report-sec-title">نتائج المختبر</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                            <LabCard
                                label="ضغط الدم"
                                value={labResults.systolicBp && labResults.diastolicBp ? `${labResults.systolicBp}/${labResults.diastolicBp}` : '—'}
                                unit="mmHg"
                                status={labResults.systolicBp && labResults.systolicBp >= 140 ? 'danger' : labResults.systolicBp && labResults.systolicBp >= 130 ? 'warning' : 'normal'}
                            />
                            <LabCard
                                label="سكر صائم"
                                value={labResults.fastingGlucose ? String(labResults.fastingGlucose) : '—'}
                                unit="mg/dL"
                                status={labResults.fastingGlucose && labResults.fastingGlucose >= 126 ? 'danger' : labResults.fastingGlucose && labResults.fastingGlucose >= 92 ? 'warning' : 'normal'}
                            />
                            <LabCard
                                label="الهيموغلوبين"
                                value={labResults.hb ? String(labResults.hb) : '—'}
                                unit="g/dL"
                                status={labResults.hb && labResults.hb < 9 ? 'danger' : labResults.hb && labResults.hb < 11 ? 'warning' : 'normal'}
                            />
                            <LabCard
                                label="أسبوع الحمل"
                                value={personalInfo.pregnancyWeek ? String(personalInfo.pregnancyWeek) : '—'}
                                unit="أسبوع"
                                status="normal"
                            />
                        </div>
                    </div>

                    {/* ── RISK ASSESSMENT ── */}
                    <div className="report-card">
                        <p className="report-sec-title">تقييم المخاطر · Risk Assessment</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                            <div>
                                <RiskBar label="تسمم الحمل" labelEn="Preeclampsia" score={aiResponse.riskScores.preeclampsiaRisk} />
                                <RiskBar label="سكري الحمل" labelEn="GDM" score={aiResponse.riskScores.gdmRisk} />
                                <RiskBar label="فقر الدم" labelEn="Anemia" score={aiResponse.riskScores.anemiaRisk} />
                            </div>
                            <div>
                                <RiskBadgeRow label="تسمم الحمل" score={aiResponse.riskScores.preeclampsiaRisk} />
                                <RiskBadgeRow label="سكري الحمل" score={aiResponse.riskScores.gdmRisk} />
                                <RiskBadgeRow label="فقر الدم" score={aiResponse.riskScores.anemiaRisk} />
                            </div>
                        </div>
                    </div>

                    {/* ── DETAILED REPORT ── */}
                    <div className="report-card">
                        <p className="report-sec-title">التقرير الطبي والتوصيات</p>
                        <div className="report-prose">{aiResponse.detailed_report}</div>
                    </div>

                    {/* ── ICD-11 ── */}
                    {aiResponse.icd11_codes && aiResponse.icd11_codes.length > 0 && (
                        <div className="report-card">
                            <p className="report-sec-title">تصنيف الأمراض · WHO ICD-11</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {aiResponse.icd11_codes.map((item, i) => (
                                    <div key={i} className="icd-pill">
                                        <span className="icd-code-badge">{item.code}</span>
                                        <span className="icd-code-name">{item.diagnosis}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: 11, color: '#A0A0B0', marginTop: 12 }}>
                                المصدر: WHO ICD-11 MMS 2024-01 · id.who.int
                            </p>
                        </div>
                    )}

                    {/* ── DISCLAIMER ── */}
                    <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                            <path d="M9 1.5L16.5 15H1.5L9 1.5Z" stroke="#E67E22" strokeWidth="1.5" strokeLinejoin="round" />
                            <path d="M9 7v3.5M9 12.5v.5" stroke="#E67E22" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#C05E00', marginBottom: 4 }}>تنويه طبي هام / Medical Disclaimer</p>
                            <p style={{ fontSize: 12, color: '#92400E', lineHeight: 1.7, margin: 0 }}>
                                هذا التقرير أُنشئ بواسطة نظام ذكاء اصطناعي للمساعدة في الفرز الأولي فقط.
                                لا تعتبر هذه النتائج تشخيصاً طبياً نهائياً ولا تُغني عن استشارة الطبيب المختص.
                                في حال وجود أعراض خطيرة، توجّه فوراً لأقرب طوارئ.
                            </p>
                        </div>
                    </div>

                    {/* ── FOOTER ── */}
                    <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #E0DDD6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: 11, color: '#A0A0B0', fontFamily: 'monospace', margin: 0 }}>
                            Smart Pregnancy Assistant v1.0 · {timestamp.toLocaleDateString('en-GB')}
                        </p>
                        <p style={{ fontSize: 11, color: '#A0A0B0', margin: 0 }}>
                            رقم السجل: {record.id.slice(0, 8).toUpperCase()}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

/* ─── Sub-components ─── */

const LabCard: React.FC<{ label: string; value: string; unit: string; status: 'normal' | 'warning' | 'danger' }> = ({ label, value, unit, status }) => {
    const styles = {
        normal:  { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', badgeBg: '#DCFCE7', badgeText: '#166534', statusLabel: 'طبيعي' },
        warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', badgeBg: '#FEF3C7', badgeText: '#92400E', statusLabel: 'مراقبة' },
        danger:  { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', badgeBg: '#FEE2E2', badgeText: '#991B1B', statusLabel: 'مرتفع' },
    }[status];

    return (
        <div style={{ background: styles.bg, border: `1px solid ${styles.border}`, borderRadius: 12, padding: '13px 15px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#6B6B80', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>{label}</p>
            <p style={{ fontSize: 19, fontWeight: 600, color: styles.text, lineHeight: 1, marginBottom: 8 }}>
                {value}
                <span style={{ fontSize: 10, fontWeight: 400, color: '#8A8880', marginRight: 3 }}>{unit}</span>
            </p>
            <span style={{ display: 'inline-flex', alignItems: 'center', background: styles.badgeBg, color: styles.badgeText, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100 }}>
                {styles.statusLabel}
            </span>
        </div>
    );
};

const RiskBar: React.FC<{ label: string; labelEn: string; score: number }> = ({ label, labelEn, score }) => {
    const color = score >= 0.7 ? '#DC2626' : score >= 0.4 ? '#D97706' : '#16A34A';
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#3A3A4E' }}>{label}</span>
                <span style={{ fontSize: 11, color: '#8A8880' }}>{labelEn}</span>
            </div>
            <div style={{ background: '#E8E5DE', borderRadius: 3, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${(score * 100).toFixed(0)}%`, height: '100%', background: color, borderRadius: 3 }} />
            </div>
        </div>
    );
};

const RiskBadgeRow: React.FC<{ label: string; score: number }> = ({ label, score }) => {
    const isHigh = score >= 0.7;
    const isMid  = score >= 0.4;
    const bg     = isHigh ? '#FEF2F2' : isMid ? '#FFFBEB' : '#F0FDF4';
    const border = isHigh ? '#FECACA' : isMid ? '#FDE68A' : '#BBF7D0';
    const color  = isHigh ? '#DC2626' : isMid ? '#D97706' : '#16A34A';
    const text   = isHigh ? 'عالي'    : isMid ? 'متوسط'   : 'منخفض';

    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#3A3A4E' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color }}>{text}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color, minWidth: 42, textAlign: 'left' }}>{(score * 100).toFixed(0)}%</span>
            </div>
        </div>
    );
};

export default MedicalReport;