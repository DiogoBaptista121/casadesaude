// ─────────────────────────────────────────────────────────────────
// Exam validity utilities — shared between FuncionariosTab and Dashboard
// Rule: validity = 1 year if age >= 50 years; otherwise 2 years
// ─────────────────────────────────────────────────────────────────

export type ExamStatus = 'vencido' | 'a_vencer' | 'em_dia' | 'sem_data';

/** Calculates the exact age based on today's date. Returns null if no birth date. */
export const calculateAge = (birthDateStr: string | null): number | null => {
    if (!birthDateStr) return null;
    const today = new Date();
    const birthDate = new Date(birthDateStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

/** Calculates the date of the next exam. >= 50 years old = +1 year, < 50 years = +2 years. */
export const calculateNextExam = (lastExamStr: string | null, birthDateStr: string | null): Date | null => {
    if (!lastExamStr) return null;
    const age = calculateAge(birthDateStr) ?? 0; // Assume <50 if no birth date → 2 years
    const lastExam = new Date(lastExamStr);
    const yearsToAdd = age >= 50 ? 1 : 2;
    const nextExam = new Date(lastExam);
    nextExam.setFullYear(nextExam.getFullYear() + yearsToAdd);
    return nextExam;
};

/** Classifies the exam status for a single employee. */
export const getExamStatus = (lastExamStr: string | null, birthDateStr: string | null): ExamStatus => {
    if (!lastExamStr) return 'sem_data';

    const nextExam = calculateNextExam(lastExamStr, birthDateStr);
    if (!nextExam) return 'sem_data';

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ignore time for day-precision comparison

    const warningDate = new Date(today);
    warningDate.setDate(warningDate.getDate() + 30); // Warn 30 days before

    if (nextExam < today) return 'vencido';
    if (nextExam <= warningDate) return 'a_vencer';
    return 'em_dia';
};

// Legacy aliases for backward compatibility
/** @deprecated Use calculateNextExam instead */
export const getNextExamDate = calculateNextExam as (u: string, d: string | null) => Date | null;
