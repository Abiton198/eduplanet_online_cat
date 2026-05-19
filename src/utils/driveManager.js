/**
 * driveManager.js - CLEAN VERSION
 */
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// ─────────────────────────────
// CONSTANTS
// ─────────────────────────────

export const DRIVE_SCOPE =
    "https://www.googleapis.com/auth/drive";

const FOLDER_NAMES = {
    root: "AI Exam Agent",
    papers: "Past Papers",
    uploaded: "Uploaded Exams",
    feedback: "Feedback Reports",
};

// ─────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────

export function getStoredToken() {
    try {
        const token = localStorage.getItem("drive_access_token");
        const expiry = Number(localStorage.getItem("drive_token_expiry"));

        if (!token || !expiry || Date.now() > expiry) {
            clearStoredToken();
            return null;
        }

        return token;
    } catch {
        return null;
    }
}

export function storeToken(token) {
    localStorage.setItem("drive_access_token", token);
    localStorage.setItem(
        "drive_token_expiry",
        String(Date.now() + 55 * 60 * 1000)
    );
}

export function clearStoredToken() {
    localStorage.removeItem("drive_access_token");
    localStorage.removeItem("drive_token_expiry");
}

// ─────────────────────────────
// DRIVE AUTH
// ─────────────────────────────

export async function requestDrivePermission() {
    const provider = new GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    const token = credential?.accessToken;
    if (!token) throw new Error("No Drive token received");

    storeToken(token);
    return token;
}

export async function hasDrivePermission(uid) {
    const snap = await getDoc(doc(db, "userDriveConfig", uid));
    return snap.exists() && snap.data()?.drivePermissionGranted;
}

// ─────────────────────────────
// DRIVE API CHECK
// ─────────────────────────────

export async function isDriveApiAvailable(token) {
    const res = await fetch(
        "https://www.googleapis.com/drive/v3/about?fields=user",
        { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.ok;
}

export async function getValidDriveToken(uid) {
    try {
        // 1. Try cached token
        const stored = getStoredToken();
        if (stored) return stored;

        // 2. Check if user ever granted Drive permission
        const snap = await getDoc(doc(db, "userDriveConfig", uid));

        if (!snap.exists() || !snap.data()?.drivePermissionGranted) {
            console.warn("[Drive] No Drive permission granted");
            return null;
        }

        // 3. Re-request permission (user prompt fallback)
        const token = await requestDrivePermission();

        if (!token) {
            console.warn("[Drive] Failed to refresh token");
            return null;
        }

        return token;
    } catch (err) {
        console.warn("[Drive] getValidDriveToken failed:", err);
        return null;
    }
}

// ─────────────────────────────
// INITIALIZE DRIVE
// ─────────────────────────────

export async function initializeDriveForUser(uid, token) {
    if (!uid || !token) return null;

    storeToken(token);

    const ok = await isDriveApiAvailable(token);
    if (!ok) return null;

    const folderIds = await ensureAppFolders(token);

    await setDoc(
        doc(db, "userDriveConfig", uid),
        {
            uid,
            drivePermissionGranted: true,
            driveApiEnabled: true,
            folderIds,
            createdAt: new Date().toISOString(),
        },
        { merge: true }
    );

    return folderIds;
}

// ─────────────────────────────
// FOLDER CREATION (FIXED)
// ─────────────────────────────

export async function ensureAppFolders(token) {
    if (!token) throw new Error("Missing Drive token");

    const headers = {
        Authorization: `Bearer ${token}`,
    };

    const createOrGet = async (name, parentId = null) => {
        const q =
            `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false` +
            (parentId ? ` and '${parentId}' in parents` : "");

        const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
            { headers }
        );

        const data = await searchRes.json();

        if (data?.files?.length > 0 && data.files[0]?.id) {
            return data.files[0].id;
        }

        const createRes = await fetch(
            "https://www.googleapis.com/drive/v3/files?fields=id",
            {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: parentId ? [parentId] : undefined,
                }),
            }
        );

        const folder = await createRes.json();

        if (!folder?.id) {
            throw new Error(`Failed to create folder: ${name}`);
        }

        return folder.id;
    };

    const rootId = await createOrGet("AI Exam Agent");
    const papersId = await createOrGet("Past Papers", rootId);
    const uploadedId = await createOrGet("Uploaded Exams", rootId);
    const feedbackId = await createOrGet("Feedback Reports", rootId);

    // ✅ FINAL SAFETY CHECK (IMPORTANT)
    if (!rootId || !papersId || !uploadedId || !feedbackId) {
        throw new Error("Drive folder creation failed (missing IDs)");
    }

    return {
        rootId,
        papersId,
        uploadedId,
        feedbackId,
    };
}

// ─────────────────────────────
// GET FOLDER IDS
// ─────────────────────────────
// ✅ setDoc with merge:true creates OR updates
export async function getFolderIds(uid, token) {
    const snap = await getDoc(doc(db, "userDriveConfig", uid));

    if (snap.exists() && snap.data()?.folderIds) {
        return snap.data().folderIds;
    }

    const folderIds = await ensureAppFolders(token);
    await setDoc(doc(db, "userDriveConfig", uid), { folderIds }, { merge: true }); // ✅

    return folderIds;
}

// ─────────────────────────────
// UPLOAD FILE
// ─────────────────────────────

export async function uploadFileToDrive(file, folderId, token) {
    const metadata = {
        name: file.name,
        parents: [folderId],
    };

    const form = new FormData();
    form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", file);

    const res = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
        {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        }
    );

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || "Upload failed");
    }

    return res.json();
}

// ─────────────────────────────
// SAVE EXAM METADATA
// ─────────────────────────────
export async function saveExamMetadata(data) {
    const examId = `${data.uid}_${Date.now()}`;

    const record = {
        examId,
        uploadedBy: data.uid,
        teacherName: data.teacherName,
        schoolId: data.schoolId ?? null,
        title: data.title,
        year: data.year,
        subject: data.subject,
        curriculum: data.curriculum,
        grade: data.grade,
        examDuration: data.examDuration ?? null,
        examFileType: data.examFileType ?? null,
        memoFileType: data.memoFileType ?? null,
        examDriveFileId: data.examDriveFile.id,
        memoDriveFileId: data.memoDriveFile.id,
        examDriveLink: data.examDriveFile.webViewLink,
        memoDriveLink: data.memoDriveFile.webViewLink,
        examFileName: data.examDriveFile.name,
        memoFileName: data.memoDriveFile.name,
        status: "pending_extraction",
        uploadedAt: new Date().toISOString(),
    };

    // Write primary exam record
    await setDoc(doc(db, "exams", examId), record);

    // ✅ Write to teacherExamUploads — this is what the onSnapshot listener reads
    const auditRef = doc(db, "teacherExamUploads", data.uid);
    const auditSnap = await getDoc(auditRef);
    const existing = auditSnap.exists() ? (auditSnap.data().uploads || []) : [];

    await setDoc(
        auditRef,
        { teacher: data.uid, uploads: [{ ...record, id: examId }, ...existing] },
        { merge: true }
    );

    return examId;
}
// ─────────────────────────────
// ✅ REQUIRED EXPORT (FIXED ERROR)
// ─────────────────────────────

export async function ensureUserFirestoreDocs(uid, role, profile = {}) {
    const driveRef = doc(db, "userDriveConfig", uid);
    const roleCollection =
        role === "principal"
            ? "principals"
            : role === "teacher"
                ? "teachers"
                : "students";

    const roleRef = doc(db, roleCollection, uid);

    const batch = [];

    const driveSnap = await getDoc(driveRef);
    if (!driveSnap.exists()) {
        batch.push(
            setDoc(driveRef, {
                uid,
                drivePermissionGranted: false,
                driveApiEnabled: false,
                folderIds: null,
                createdAt: new Date().toISOString(),
            })
        );
    }

    const roleSnap = await getDoc(roleRef);
    if (!roleSnap.exists()) {
        batch.push(
            setDoc(roleRef, {
                uid,
                ...profile,
                createdAt: new Date().toISOString(),
            })
        );
    }

    await Promise.all(batch);
}

// ─────────────────────────────
// AUDIT TRAIL OPERATIONS (RESTORED)
// ─────────────────────────────

export async function deleteExamFromAudit(uid, examId) {
    try {
        await deleteDoc(doc(db, "exams", examId));

        const auditRef = doc(db, "teacherExamUploads", uid);
        const snap = await getDoc(auditRef);

        if (!snap.exists()) return false;

        const uploads = snap.data()?.uploads || [];

        const updated = uploads.filter(
            (u) => u.examId !== examId && u.id !== examId
        );

        await updateDoc(auditRef, {
            uploads: updated,
            updatedAt: new Date().toISOString(),
        });

        return true;
    } catch (err) {
        console.warn("[Drive] deleteExamFromAudit failed:", err);
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

        const uploads = snap.data()?.uploads || [];

        const updated = uploads.map((u) =>
            u.examId === examId || u.id === examId
                ? { ...u, ...changes, updatedAt: new Date().toISOString() }
                : u
        );

        await updateDoc(auditRef, {
            uploads: updated,
            updatedAt: new Date().toISOString(),
        });

        return true;
    } catch (err) {
        console.warn("[Drive] updateExamInAudit failed:", err);
        return false;
    }
}