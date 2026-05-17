// ─── firestoreHelpers.js ──────────────────────────────────────────────────────
// All data reads/writes go through here so no user ever sees another user's data.
// Every query is scoped: schoolId + userId where applicable.

import {
    doc, getDoc, setDoc, updateDoc, deleteDoc,
    collection, query, where, orderBy, limit,
    getDocs, onSnapshot, serverTimestamp, addDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ── School ────────────────────────────────────────────────────────────────────

/**
 * Register a new school.
 * The principal's uid becomes the schoolId (1-to-1 ownership).
 */
export async function registerSchool(principalUid, schoolData) {
    const schoolRef = doc(db, 'schools', principalUid);
    await setDoc(schoolRef, {
        ...schoolData,
        principalUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }, { merge: true });
    return principalUid; // schoolId === principalUid
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

/**
 * List all schools (for teacher/student registration dropdowns).
 * Returns [{id, name, province, district, curricula}]
 */
export async function listSchools() {
    const snap = await getDocs(collection(db, 'schools'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Users ─────────────────────────────────────────────────────────────────────

/**
 * Save or update a user profile in the correct collection.
 * Also writes a cross-reference in /users for role lookups.
 */
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

// ── School Members ─────────────────────────────────────────────────────────────

/** All teachers belonging to a school — scoped by schoolId */
export function subscribeToSchoolTeachers(schoolId, callback) {
    const q = query(
        collection(db, 'teachers'),
        where('schoolId', '==', schoolId),
        orderBy('surname')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

/** All students belonging to a school — scoped by schoolId */
export function subscribeToSchoolStudents(schoolId, callback) {
    const q = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        orderBy('grade'),
        orderBy('surname')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

/** Students filtered by grade */
export async function getStudentsByGrade(schoolId, grade) {
    const q = query(
        collection(db, 'students'),
        where('schoolId', '==', schoolId),
        where('grade', '==', grade)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Students filtered by subject */
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

/**
 * Upload exam metadata (teacher-scoped).
 * storagePath references Firebase Storage; marking is done server-side.
 */
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

/** All exams for a school — for principal dashboard */
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

/** Exams visible to a student — matches their subjects + school */
export function subscribeToStudentExams(schoolId, subjects, callback) {
    const q = query(
        collection(db, 'exams'),
        where('schoolId', '==', schoolId),
        where('subject', 'in', subjects.slice(0, 10)), // Firestore 'in' limit = 10
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

/** Exams uploaded by a specific teacher */
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

/**
 * Save a student's exam attempt.
 * Scoped to studentUid + examId — no cross-student visibility.
 */
export async function saveAttempt(studentUid, examId, attemptData) {
    const ref = doc(db, 'attempts', `${studentUid}_${examId}`);
    await setDoc(ref, {
        ...attemptData,
        studentUid,
        examId,
        submittedAt: serverTimestamp(),
    }, { merge: true });
}

/** A student's own attempt for one exam */
export async function getStudentAttempt(studentUid, examId) {
    const snap = await getDoc(doc(db, 'attempts', `${studentUid}_${examId}`));
    return snap.exists() ? snap.data() : null;
}

/** All attempts for a specific exam — for teacher/principal analysis */
export async function getExamAttempts(examId, schoolId) {
    const q = query(
        collection(db, 'attempts'),
        where('examId', '==', examId),
        where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** All attempts by a student — for their personal history */
export function subscribeToStudentAttempts(studentUid, callback) {
    const q = query(
        collection(db, 'attempts'),
        where('studentUid', '==', studentUid),
        orderBy('submittedAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

/** All attempts within a school — for principal reporting */
export function subscribeToSchoolAttempts(schoolId, callback) {
    const q = query(
        collection(db, 'attempts'),
        where('schoolId', '==', schoolId),
        orderBy('submittedAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

// ── Audit / Remarks ───────────────────────────────────────────────────────────

/**
 * Log a marking event (AI mark, teacher remark, modification).
 * Scoped by schoolId for principal visibility.
 */
export async function logMarkingEvent(schoolId, event) {
    await addDoc(collection(db, 'auditLog'), {
        ...event,
        schoolId,
        timestamp: serverTimestamp(),
    });
}

/** All audit events for a school */
export function subscribeToAuditLog(schoolId, callback) {
    const q = query(
        collection(db, 'auditLog'),
        where('schoolId', '==', schoolId),
        orderBy('timestamp', 'desc'),
        limit(200)
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}

// ── Analytics Helpers ─────────────────────────────────────────────────────────

/** Compute per-grade student counts from a students array */
export function countByGrade(students) {
    return students.reduce((acc, s) => {
        acc[s.grade] = (acc[s.grade] || 0) + 1;
        return acc;
    }, {});
}

/** Compute average score from attempts array */
export function averageScore(attempts) {
    const scored = attempts.filter((a) => typeof a.score === 'number');
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, a) => sum + a.score, 0) / scored.length);
}

/** Group attempts by subject */
export function groupBySubject(attempts) {
    return attempts.reduce((acc, a) => {
        const s = a.subject || 'Unknown';
        if (!acc[s]) acc[s] = [];
        acc[s].push(a);
        return acc;
    }, {});
}

/** Pass rate (score >= 40) */
export function passRate(attempts) {
    if (!attempts.length) return 0;
    const passed = attempts.filter((a) => (a.score || 0) >= 40).length;
    return Math.round((passed / attempts.length) * 100);
}