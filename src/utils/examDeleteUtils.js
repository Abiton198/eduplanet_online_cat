/**
 * examDeleteUtils.js
 * ------------------
 * All deletion helpers for the Teacher Dashboard.
 * Import what you need and call from handleDelete().
 *
 * Usage:
 *   import { deleteExamRecord, deleteExamFromAudit, deleteExamFromDrive } from '@/utils/examDeleteUtils';
 */

import {
    doc,
    deleteDoc,
    collection,
    getDocs,
    writeBatch,
} from 'firebase/firestore';
import { db } from './firebase'; // ← firebase config path

// ---------------------------------------------------------------------------
// 1. DELETE FIRESTORE RECORD
//    Removes the exam document + any subcollections (questions, submissions…)
//    Firestore does NOT cascade-delete subcollections automatically.
// ---------------------------------------------------------------------------
export const deleteExamRecord = async (uid, examId) => {
    if (!uid || !examId) throw new Error('deleteExamRecord: uid and examId are required.');

    const examRef = doc(db, 'users', uid, 'exams', examId);

    // Add or remove subcollection names that live under each exam doc
    const SUBCOLLECTIONS = ['questions', 'submissions', 'results'];

    const batch = writeBatch(db);

    for (const sub of SUBCOLLECTIONS) {
        const subRef = collection(db, 'users', uid, 'exams', examId, sub);
        const snap = await getDocs(subRef);
        snap.forEach((d) => batch.delete(d.ref));
    }

    batch.delete(examRef); // delete the parent doc last
    await batch.commit();
};

// ---------------------------------------------------------------------------
// 2. DELETE AUDIT TRAIL
//    Removes activity/audit log entries linked to this exam.
//    Adjust the collection path to match your audit schema.
// ---------------------------------------------------------------------------
export const deleteExamFromAudit = async (uid, examId) => {
    if (!uid || !examId) throw new Error('deleteExamFromAudit: uid and examId are required.');

    // Option A — single audit doc per exam
    const auditRef = doc(db, 'users', uid, 'auditTrail', examId);
    await deleteDoc(auditRef);

    // Option B — audit is a subcollection of the exam (uncomment if needed)
    // const auditRef = collection(db, 'users', uid, 'exams', examId, 'auditTrail');
    // const snap = await getDocs(auditRef);
    // const batch = writeBatch(db);
    // snap.forEach((d) => batch.delete(d.ref));
    // await batch.commit();
};

// ---------------------------------------------------------------------------
// 3. DELETE GOOGLE DRIVE FILE
//    Calls the Drive REST API v3.
//    Requires a valid Google OAuth access token with 'drive.file' scope.
//
//    permanent = false → moves to trash (recoverable, safer default)
//    permanent = true  → hard delete, cannot be undone
//
//    Store the access token at sign-in:
//      const credential = GoogleAuthProvider.credentialFromResult(result);
//      window.__googleAccessToken = credential.accessToken;
// ---------------------------------------------------------------------------
export const deleteExamFromDrive = async (driveFileId, permanent = false) => {
    if (!driveFileId) throw new Error('deleteExamFromDrive: driveFileId is required.');

    const accessToken = window.__googleAccessToken;
    if (!accessToken) throw new Error('No Google access token found. Please re-authenticate.');

    const base = `https://www.googleapis.com/drive/v3/files/${driveFileId}`;
    const url = permanent ? base : `${base}/trash`;
    const method = permanent ? 'DELETE' : 'POST';

    const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 204 No Content = success for DELETE; 200 = success for trash POST
    if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Drive delete failed (HTTP ${res.status})`);
    }
};

// ---------------------------------------------------------------------------
// 4. COMBINED RUNNER
//    Pass the `selected` object from Swal preConfirm and let this handle all.
//    Returns a summary string of what was deleted (for the success toast).
//
//    selected = { firestore: bool, trail: bool, drive: bool }
// ---------------------------------------------------------------------------
export const runExamDeletion = async ({ uid, examId, driveFileId, selected }) => {
    if (!uid || !examId) throw new Error('runExamDeletion: uid and examId are required.');
    if (!selected.firestore && !selected.trail && !selected.drive) {
        throw new Error('Nothing selected to delete.');
    }

    const tasks = [];
    const labels = [];

    if (selected.firestore) {
        tasks.push(deleteExamRecord(uid, examId));
        labels.push('Firestore record');
    }
    if (selected.trail) {
        tasks.push(deleteExamFromAudit(uid, examId));
        labels.push('Audit trail');
    }
    if (selected.drive) {
        tasks.push(deleteExamFromDrive(driveFileId));
        labels.push('Drive files');
    }

    await Promise.all(tasks);
    return labels.join(', '); // e.g. "Firestore record, Drive files"
};