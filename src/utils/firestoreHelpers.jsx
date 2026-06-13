// ─── firestoreHelpers.js ──────────────────────────────────────────────────────

import {
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, query, where, orderBy, limit,
    getDocs, onSnapshot, serverTimestamp, addDoc, arrayUnion,
} from 'firebase/firestore';
import { db } from '../utils/firebase';

// ── Exam Audit ────────────────────────────────────────────────────────────────

export async function updateExamStatusInAudit(examId, status, updatedBy) {
    const examRef = doc(db, 'exams', examId);
    return await updateDoc(examRef, {
        status,
        updatedAt: serverTimestamp(),
        auditLog: arrayUnion({
            status,
            timestamp: new Date().toISOString(),
            actionedBy: updatedBy,
            message: `Exam status transitioned to ${status}`,
        }),
    });
}

export async function updateExamInAudit(examId, status, operatorInfo = {}, customMessage = '') {
    if (!examId) throw new Error('[FirestoreHelpers] Cannot update audit logs without a valid examId.');
    const examRef = doc(db, 'exams', examId);
    const operatorUid = operatorInfo.uid || 'system-fallback';
    const operatorName = operatorInfo.name || 'Anonymous Staff';
    const displayMessage = customMessage || `Exam status transitioned to ${status}.`;
    return await updateDoc(examRef, {
        status,
        updatedAt: serverTimestamp(),
        auditLog: arrayUnion({
            status,
            timestamp: new Date().toISOString(),
            actionedBy: operatorName,
            operatorId: operatorUid,
            message: displayMessage,
        }),
    });
}

// ── School ────────────────────────────────────────────────────────────────────

export async function registerSchool(principalUid, schoolData) {
    const schoolRef = doc(db, 'schools', principalUid);
    await setDoc(schoolRef, {
        ...schoolData,
        principalUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }, { merge: true });

    await setDoc(doc(db, 'users', principalUid), {
        uid: principalUid,
        role: 'principal',
        schoolId: principalUid,
        updatedAt: serverTimestamp(),
    }, { merge: true });

    return principalUid;
}

export async function updateSchool(schoolId, data) {
    await updateDoc(doc(db, 'schools', schoolId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function getSchool(schoolId) {
    const snap = await getDoc(doc(db, 'schools', schoolId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listSchools() {
    const snap = await getDocs(collection(db, 'schools'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function saveUserProfile(uid, role, profile) {
    const col = role === 'principal' ? 'principals' : role === 'teacher' ? 'teachers' : 'students';
    await setDoc(doc(db, col, uid), {
        ...profile,
        uid,
        role,
        updatedAt: serverTimestamp(),
    }, { merge: true });
    await setDoc(doc(db, 'users', uid), { uid, role, schoolId: profile.schoolId }, { merge: true });
}

export async function getUserProfile(uid, role) {
    const col = role === 'principal' ? 'principals' : role === 'teacher' ? 'teachers' : 'students';
    const snap = await getDoc(doc(db, col, uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getUserRole(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data().role : null;
}

// ── School Members ────────────────────────────────────────────────────────────

/** All teachers belonging to a school */
export function subscribeToSchoolTeachers(schoolId, callback) {
    const q = query(
        collection(db, 'teachers'),
        where('schoolId', '==', schoolId)
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

/** All students belonging to a school */
export function subscribeToSchoolStudents(schoolId, callback) {
    const q = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId)
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

export async function getStudentsByGrade(schoolId, grade) {
    const q = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        where('grade', '==', grade)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getStudentsBySubject(schoolId, subject) {
    const q = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        where('subjects', 'array-contains', subject)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Exams ─────────────────────────────────────────────────────────────────────

export async function createExam(teacherUid, schoolId, examData) {
    const ref = await addDoc(collection(db, 'exams'), {
        ...examData,
        teacherUid,
        schoolId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'published',
    });
    return ref.id;
}

export function subscribeToSchoolExams(schoolId, callback) {
    const q = query(
        collection(db, 'exams'),
        where('schoolId', '==', schoolId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

export function subscribeToStudentExams(schoolId, subjects, callback) {
    const q = query(
        collection(db, 'exams'),
        where('schoolId', '==', schoolId),
        where('subject', 'in', subjects.slice(0, 10)),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

export function subscribeToTeacherExams(teacherUid, callback) {
    const q = query(
        collection(db, 'exams'),
        where('teacherUid', '==', teacherUid),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

// ── Attempts ──────────────────────────────────────────────────────────────────

export async function saveAttempt(studentUid, examId, schoolId, attemptData) {
    const ref = doc(db, 'exam_attempts', `${studentUid}_${examId}`);
    await setDoc(ref, {
        ...attemptData,
        studentUid,
        schoolId,
        examId,
        submittedAt: serverTimestamp(),
    }, { merge: true });
}

export async function getStudentAttempt(studentUid, examId) {
    const snap = await getDoc(doc(db, 'exam_attempts', `${studentUid}_${examId}`));
    return snap.exists() ? snap.data() : null;
}

export async function getExamAttempts(examId, schoolId) {
    const q = query(
        collection(db, 'exam_attempts'),
        where('examId', '==', examId),
        where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeToStudentAttempts(studentUid, callback) {
    const q = query(
        collection(db, 'exam_attempts'),
        where('studentUid', '==', studentUid),
        orderBy('submittedAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

/**
 * Fetches attempts for a school by matching examIds.
 * Uses a live listener on exams, then one-time fetch of attempts.
 * Falls back gracefully when no exams exist.
 */
export function subscribeToSchoolAttempts(schoolId, callback) {
    const examUnsub = onSnapshot(
        query(collection(db, 'exams'), where('schoolId', '==', schoolId)),
        async (examSnap) => {
            const examIds = examSnap.docs.map((d) => d.id);
            if (examIds.length === 0) { callback([]); return; }

            // Also try fetching by schoolId directly for backfilled docs
            const [byExamId, bySchoolId] = await Promise.all([
                Promise.all(
                    chunkArray(examIds, 10).map(chunk =>
                        getDocs(query(collection(db, 'exam_attempts'), where('examId', 'in', chunk)))
                    )
                ),
                getDocs(query(collection(db, 'exam_attempts'), where('schoolId', '==', schoolId)))
            ]);

            // Merge and deduplicate by doc id
            const seen = new Set();
            const attempts = [];
            [...byExamId.flat(), bySchoolId].forEach(snap => {
                snap.docs?.forEach(d => {
                    if (!seen.has(d.id)) {
                        seen.add(d.id);
                        attempts.push({ id: d.id, ...d.data() });
                    }
                });
            });

            callback(attempts);
        }
    );
    return examUnsub;
}

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export async function logMarkingEvent(schoolId, event) {
    await addDoc(collection(db, 'auditLog'), {
        ...event,
        schoolId,
        timestamp: serverTimestamp(),
    });
}

export function subscribeToAuditLog(schoolId, callback) {
    const q = query(
        collection(db, 'auditLog'),
        where('schoolId', '==', schoolId),
        limit(200)
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

// ── Analytics Helpers ─────────────────────────────────────────────────────────

export function countByGrade(students) {
    return students.reduce((acc, s) => {
        acc[s.grade] = (acc[s.grade] || 0) + 1;
        return acc;
    }, {});
}

export function averageScore(attempts) {
    const scored = attempts.filter((a) => typeof a.score === 'number');
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, a) => sum + a.score, 0) / scored.length);
}

export function groupBySubject(attempts) {
    return attempts.reduce((acc, a) => {
        const s = a.subject || 'Unknown';
        if (!acc[s]) acc[s] = [];
        acc[s].push(a);
        return acc;
    }, {});
}

export function passRate(attempts) {
    if (!attempts.length) return 0;
    const passed = attempts.filter((a) => (a.score || 0) >= 40).length;
    return Math.round((passed / attempts.length) * 100);
}