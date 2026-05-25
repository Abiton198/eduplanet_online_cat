/**
 * storageManager.js - Firebase Storage Migration
 */
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";
import { serverTimestamp } from "firebase/firestore";

// ─────────────────────────────
// UPLOAD OPERATIONS
// ─────────────────────────────

/**
 * Uploads an exam or memo file to Firebase Storage under structured paths.
 * Path template: exams/{examId}/{type}_{filename}
 * 
 * @param {File} file - HTML5 File object
 * @param {string} examId - Generated structural unique tracking ID
 * @param {string} type - File role identification flag ('exam' or 'memo')
 * @returns {Promise<string>} Downloadable reference URL
 */
export async function uploadFileToStorage(file, examId, type) {
    if (!file) throw new Error("Missing file object payload");

    // Construct isolated folder hierarchy for individual exams
    const storageRef = ref(storage, `exams/${examId}/${type}_${file.name}`);

    // Upload bytes natively via Firebase SDK wrapper
    const snapshot = await uploadBytes(storageRef, file);

    // Return direct authenticated target web link
    return await getDownloadURL(snapshot.ref);
}

// ═══════════════════════════════════════════════
// SAVE EXAM METADATA + UPLOAD FILES
// ═══════════════════════════════════════════════

export async function saveExamMetadata(data) {
    try {
        const examId = data.examId || `${data.uid}_${Date.now()}`;
        const schoolId = data.schoolId || "unknown";
        const subject = data.subject || "General";

        // ── Firestore paths ────────────────────────────────────────────────
        // School document: teacherExamUploads/{schoolId}
        // Subject subdocument: teacherExamUploads/{schoolId}/subjects/{subject}
        const schoolRef = doc(db, "teacherExamUploads", schoolId);
        const subjectRef = doc(db, "teacherExamUploads", schoolId, "subjects", subject);

        // ── Check for duplicate by storage path ───────────────────────────
        const subjectSnap = await getDoc(subjectRef);
        if (subjectSnap.exists()) {
            const uploads = subjectSnap.data()?.uploads || [];
            const duplicate = uploads.find(
                (u) =>
                    u.examStoragePath === data.examStoragePath ||
                    u.memoStoragePath === data.memoStoragePath
            );
            if (duplicate) {
                console.log("[Firestore] Duplicate exam — skipping:", duplicate.examId);
                return { examId: duplicate.examId, duplicate: true };
            }
        }

        // ── Build record ───────────────────────────────────────────────────
        const record = {
            examId,
            uploadedBy: data.uid,
            teacherName: data.teacherName || "Teacher",
            schoolId,
            schoolName: data.schoolName || schoolId,
            schoolFolder: data.schoolFolder || schoolId,
            title: data.title || "",
            year: data.year || "",
            subject,
            curriculum: data.curriculum || "CAPS",
            grade: data.grade || "",
            examDuration: data.examDuration || 0,
            examFileType: data.examFileType || "",
            memoFileType: data.memoFileType || "",
            examFileName: data.examFileName || "",
            memoFileName: data.memoFileName || "",
            examStorageUrl: data.examStorageUrl || "",
            memoStorageUrl: data.memoStorageUrl || "",
            examStoragePath: data.examStoragePath || "",
            memoStoragePath: data.memoStoragePath || "",
            status: "pending_extraction",
            questionsExtracted: false,
            memoMerged: false,
            uploadedAt: new Date().toISOString(),
            extractedAt: null,
        };

        // ── 1. Write to /exams/{examId} — backend pipeline reads this ──────
        await setDoc(doc(db, "exams", examId), record);

        // ── 2. Write school document (top level — school metadata) ─────────
        await setDoc(schoolRef, {
            schoolId,
            schoolName: data.schoolName || schoolId,
            schoolFolder: data.schoolFolder || schoolId,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        // ── 3. Write subject subdocument with uploads array ────────────────
        const existingUploads = subjectSnap.exists()
            ? (subjectSnap.data()?.uploads || [])
            : [];

        await setDoc(subjectRef, {
            subject,
            schoolId,
            uploads: [{ ...record, id: examId }, ...existingUploads],
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        console.log(`[Firestore] Saved exam ${examId} → school:${schoolId} subject:${subject}`);
        return { examId, duplicate: false };

    } catch (err) {
        console.error("[saveExamMetadata]", err);
        throw err;
    }
}

// ─────────────────────────────
// ROLE BASE DOCUMENT INITIALIZATION
// ─────────────────────────────
export async function ensureUserFirestoreDocs(uid, role, profile = {}) {
    try {
        const roleCollection =
            role === "principal" ? "principals" :
                role === "teacher" ? "teachers" : "students";
        const roleRef = doc(db, roleCollection, uid);

        const roleSnap = await getDoc(roleRef);
        if (!roleSnap.exists()) {
            await setDoc(roleRef, {
                uid,
                ...profile,
                createdAt: new Date().toISOString()
            });
        }
    } catch (err) {
        console.warn("[ensureUserFirestoreDocs] Verification bypass error:", err.message);
    }
}

// ─────────────────────────────
// AUDIT TRAIL DATA AND STORAGE CLEANUP
// ─────────────────────────────
export async function deleteExamFromAudit(uid, examId) {
    try {
        // Fetch source document entries to locate active assets inside storage
        const examRef = doc(db, "exams", examId);
        const examSnap = await getDoc(examRef);

        if (examSnap.exists()) {
            const data = examSnap.data();

            // Delete Binary Objects from Storage Bucket using structural pointers
            if (data.examStorageUrl) {
                const eRef = ref(storage, `exams/${examId}/exam_${data.examFileName}`);
                await deleteObject(eRef).catch((e) => console.warn("Exam binary cleanup skipped:", e.message));
            }
            if (data.memoStorageUrl) {
                const mRef = ref(storage, `exams/${examId}/memo_${data.memoFileName}`);
                await deleteObject(mRef).catch((e) => console.warn("Memo binary cleanup skipped:", e.message));
            }
        }

        // Wipe Firestore master mapping record
        await deleteDoc(examRef);

        // Purge historical log item arrays inside user scopes
        const auditRef = doc(db, "teacherExamUploads", uid);
        const snap = await getDoc(auditRef);
        if (!snap.exists()) return false;

        const updated = (snap.data()?.uploads || []).filter(
            (u) => u.examId !== examId && u.id !== examId
        );

        await updateDoc(auditRef, { uploads: updated, updatedAt: new Date().toISOString() });
        return true;
    } catch (err) {
        console.warn("[Storage] deleteExamFromAudit failed execution:", err);
        return false;
    }
}

export async function updateExamInAudit(uid, examId, changes = {}) {
    try {
        await updateDoc(doc(db, "exams", examId), {
            ...changes,
            updatedAt: new Date().toISOString(),
        });

        const auditRef = doc(db, "teacherExamUploads", uid);
        const snap = await getDoc(auditRef);
        if (!snap.exists()) return false;

        const updated = (snap.data()?.uploads || []).map((u) =>
            u.examId === examId || u.id === examId
                ? { ...u, ...changes, updatedAt: new Date().toISOString() }
                : u
        );

        await updateDoc(auditRef, { uploads: updated, updatedAt: new Date().toISOString() });
        return true;
    } catch (err) {
        console.warn("[Storage] updateExamInAudit state change intercept failure:", err);
        return false;
    }
}