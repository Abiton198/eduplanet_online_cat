// ─── tierEnforcer.js ──────────────────────────────────────────────────────────
// Call these before any action that is restricted by tier.
// All functions return { allowed, message, upgradeRequired } so the UI
// can show a consistent "upgrade" prompt rather than a silent failure.

import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { checkLimit, getTier } from './tierConfig';
import Swal from 'sweetalert2';

// ─── Fetch current school tier ────────────────────────────────────────────────

export async function getSchoolTier(schoolId) {
    if (!schoolId) return 'free';
    const snap = await getDoc(doc(db, 'schools', schoolId));
    return snap.exists() ? (snap.data().tier || 'free') : 'free';
}

// ─── Count helpers ────────────────────────────────────────────────────────────

async function countCollection(collectionName, schoolId) {
    const q = query(
        collection(db, collectionName),
        where('schoolId', '==', schoolId)
    );
    const snap = await getCountFromServer(q);
    return snap.data().count;
}

async function countMonthlyExams(schoolId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const q = query(
        collection(db, 'exams'),
        where('schoolId', '==', schoolId),
        where('createdAt', '>=', startOfMonth)
    );
    const snap = await getCountFromServer(q);
    return snap.data().count;
}

async function countMonthlyAiMarks(schoolId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const q = query(
        collection(db, 'auditLog'),
        where('schoolId', '==', schoolId),
        where('type', '==', 'ai_mark'),
        where('timestamp', '>=', startOfMonth)
    );
    const snap = await getCountFromServer(q);
    return snap.data().count;
}

// ─── Enforcement functions ────────────────────────────────────────────────────

/**
 * Can this school add another teacher?
 */
export async function canAddTeacher(schoolId) {
    const [tier, current] = await Promise.all([
        getSchoolTier(schoolId),
        countCollection('teachers', schoolId),
    ]);
    return { ...checkLimit(tier, 'teachers', current), tier };
}

/**
 * Can this school add another student?
 */
export async function canAddStudent(schoolId) {
    const [tier, current] = await Promise.all([
        getSchoolTier(schoolId),
        countCollection('students', schoolId),
    ]);
    return { ...checkLimit(tier, 'students', current), tier };
}

/**
 * Can this school upload another exam this month?
 */
export async function canUploadExam(schoolId) {
    const [tier, current] = await Promise.all([
        getSchoolTier(schoolId),
        countMonthlyExams(schoolId),
    ]);
    return { ...checkLimit(tier, 'examUploads', current), tier };
}

/**
 * Can this school run another AI mark this month?
 */
export async function canRunAiMark(schoolId) {
    const [tier, current] = await Promise.all([
        getSchoolTier(schoolId),
        countMonthlyAiMarks(schoolId),
    ]);
    return { ...checkLimit(tier, 'aiMarksPerMonth', current), tier };
}

// ─── Feature gate checks (non-async, based on tier string) ───────────────────

export function featureAllowed(tierId, feature) {
    const gates = {
        googleDrive: ['basic', 'professional', 'enterprise'],
        pdfExport: ['basic', 'professional', 'enterprise'],
        auditLog: ['professional', 'enterprise'],
        advancedAnalytics: ['professional', 'enterprise'],
        customBranding: ['professional', 'enterprise'],
        studyPlanner: ['professional', 'enterprise'],
        apiAccess: ['enterprise'],
        multiCampus: ['enterprise'],
        circuitReporting: ['enterprise'],
    };
    return (gates[feature] || []).includes(tierId);
}

// ─── UI helper — show Swal upgrade prompt ────────────────────────────────────

/**
 * Run a guard check and show an upgrade Swal if blocked.
 * Returns true if the action is allowed, false if blocked.
 *
 * @param {Function} checkFn  - async function returning { allowed, message }
 * @param {Function} onUpgrade - callback to open upgrade UI
 */
export async function guardedAction(checkFn, onUpgrade) {
    const result = await checkFn();
    if (result.allowed) return true;

    await Swal.fire({
        title: '⚠️ Plan Limit Reached',
        text: result.message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '🚀 Upgrade Plan',
        cancelButtonText: 'Maybe Later',
        confirmButtonColor: '#8b5cf6',
        cancelButtonColor: '#64748b',
    }).then((res) => {
        if (res.isConfirmed && onUpgrade) onUpgrade();
    });

    return false;
}

/**
 * Feature gate with Swal prompt.
 * @param {string} tierId
 * @param {string} feature
 * @param {Function} onUpgrade
 */
export function guardFeature(tierId, feature, onUpgrade) {
    if (featureAllowed(tierId, feature)) return true;

    const tierName = getTier(tierId).name;
    Swal.fire({
        title: '🔒 Feature Locked',
        html: `<b>${feature.replace(/([A-Z])/g, ' $1')}</b> is not available on the <b>${tierName}</b> plan.<br/><br/>Upgrade to unlock this feature.`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '🚀 View Upgrade Options',
        cancelButtonText: 'Close',
        confirmButtonColor: '#8b5cf6',
    }).then((res) => {
        if (res.isConfirmed && onUpgrade) onUpgrade();
    });

    return false;
}

// ─── Usage summary for dashboard display ─────────────────────────────────────

/**
 * Returns live usage numbers for a school.
 * Used by PrincipalDashboard to show limit bars.
 */
export async function getSchoolUsage(schoolId) {
    const [tier, teachers, students, exams, aiMarks] = await Promise.all([
        getSchoolTier(schoolId),
        countCollection('teachers', schoolId),
        countCollection('students', schoolId),
        countMonthlyExams(schoolId),
        countMonthlyAiMarks(schoolId),
    ]);

    return { tier, teachers, students, exams, aiMarks };
}