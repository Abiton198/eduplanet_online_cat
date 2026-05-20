/**
 * driveManager.js - CLEAN VERSION
 */
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// ─────────────────────────────
// CONSTANTS
// ─────────────────────────────

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

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
    localStorage.setItem("drive_token_expiry", String(Date.now() + 55 * 60 * 1000));
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
    try {
        const snap = await getDoc(doc(db, "userDriveConfig", uid));
        return snap.exists() && snap.data()?.drivePermissionGranted;
    } catch {
        return false;
    }
}

// ─────────────────────────────
// DRIVE API CHECK
// ─────────────────────────────

export async function isDriveApiAvailable(token) {
    try {
        const res = await fetch(
            "https://www.googleapis.com/drive/v3/about?fields=user",
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.ok;
    } catch {
        return false;
    }
}

export async function getValidDriveToken(uid) {
    try {
        const stored = getStoredToken();
        if (stored) return stored;

        const snap = await getDoc(doc(db, "userDriveConfig", uid));
        if (!snap.exists() || !snap.data()?.drivePermissionGranted) {
            console.warn("[Drive] No Drive permission granted");
            return null;
        }

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
        { uid, drivePermissionGranted: true, driveApiEnabled: true, folderIds, createdAt: new Date().toISOString() },
        { merge: true }
    );

    return folderIds;
}

// ─────────────────────────────
// FOLDER CREATION
// ─────────────────────────────

export async function ensureAppFolders(token) {
    if (!token) throw new Error("Missing Drive token");

    const headers = { Authorization: `Bearer ${token}` };

    const createOrGet = async (name, parentId = null) => {
        const q =
            `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false` +
            (parentId ? ` and '${parentId}' in parents` : "");

        const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
            { headers }
        );
        const searchData = await searchRes.json();

        if (searchData?.files?.length > 0 && searchData.files[0]?.id) {
            return searchData.files[0].id;
        }

        const createRes = await fetch(
            "https://www.googleapis.com/drive/v3/files?fields=id",
            {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: parentId ? [parentId] : undefined,
                }),
            }
        );
        const folder = await createRes.json();
        if (!folder?.id) throw new Error(`Failed to create folder: ${name}`);
        return folder.id;
    };

    const rootId = await createOrGet("AI Exam Agent");
    const papersId = await createOrGet("Past Papers", rootId);
    const uploadedId = await createOrGet("Uploaded Exams", rootId);
    const feedbackId = await createOrGet("Feedback Reports", rootId);

    if (!rootId || !papersId || !uploadedId || !feedbackId) {
        throw new Error("Drive folder creation failed (missing IDs)");
    }

    return { rootId, papersId, uploadedId, feedbackId };
}

// ─────────────────────────────
// FIND EXISTING FILE IN DRIVE
// ─────────────────────────────

export async function findExistingFile(filename, folderId, token) {
    try {
        const q = `name='${filename}' and '${folderId}' in parents and trashed=false`;
        const res = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return null;
        const result = await res.json();
        return result.files?.[0] ?? null;
    } catch {
        return null;
    }
}

// ─────────────────────────────
// GET FOLDER IDS
// ─────────────────────────────

export async function getFolderIds(uid, token) {
    const snap = await getDoc(doc(db, "userDriveConfig", uid));

    if (snap.exists() && snap.data()?.folderIds) {
        return snap.data().folderIds;
    }

    const folderIds = await ensureAppFolders(token);
    await setDoc(doc(db, "userDriveConfig", uid), { folderIds }, { merge: true });
    return folderIds;
}

// ─────────────────────────────
// UPLOAD FILE (skip if exists)
// ─────────────────────────────

export async function uploadFileToDrive(file, folderId, token) {
    // Check if file already exists in this folder — skip upload if so
    const existing = await findExistingFile(file.name, folderId, token);
    if (existing) {
        console.log(`[Drive] File already exists — skipping upload: ${file.name}`);
        return existing;
    }

    const metadata = { name: file.name, parents: [folderId] };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const res = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
    );

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Upload failed");
    }

    return res.json();
}

// ─────────────────────────────
// SHARE FILE WITH SERVICE ACCOUNT
// ─────────────────────────────

export async function shareFileWithServiceAccount(fileId, accessToken) {
    const serviceAccountEmail = import.meta.env.VITE_DRIVE_SERVICE_ACCOUNT_EMAIL;

    if (!serviceAccountEmail) {
        console.warn("[Drive] VITE_DRIVE_SERVICE_ACCOUNT_EMAIL not set — skipping share");
        return;
    }

    try {
        const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    role: "reader",
                    type: "user",
                    emailAddress: serviceAccountEmail,
                }),
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn("[Drive] Share with service account failed:", err?.error?.message);
        }
    } catch (err) {
        console.warn("[Drive] shareFileWithServiceAccount error:", err.message);
    }
}

// ─────────────────────────────
// SAVE EXAM METADATA
// ─────────────────────────────

export async function saveExamMetadata(data) {
    const auditRef = doc(db, "teacherExamUploads", data.uid);
    const auditSnap = await getDoc(auditRef);

    // Check if this exact exam file was already saved — skip if so
    if (auditSnap.exists()) {
        const uploads = auditSnap.data().uploads || [];
        const duplicate = uploads.find(
            (u) =>
                u.examDriveFileId === data.examDriveFile.id ||
                u.memoDriveFileId === data.memoDriveFile.id
        );
        if (duplicate) {
            console.log("[Firestore] Exam already exists — skipping:", duplicate.examId);
            return duplicate.examId;
        }
    }

    // New exam — generate ID inside the function
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

    await setDoc(doc(db, "exams", examId), record);

    const existingUploads = auditSnap.exists() ? (auditSnap.data().uploads || []) : [];
    await setDoc(
        auditRef,
        { teacher: data.uid, uploads: [{ ...record, id: examId }, ...existingUploads] },
        { merge: true }
    );

    return examId;
}

// ─────────────────────────────
// ENSURE USER FIRESTORE DOCS
// ─────────────────────────────

export async function ensureUserFirestoreDocs(uid, role, profile = {}) {
    try {
        const driveRef = doc(db, "userDriveConfig", uid);
        const roleCollection =
            role === "principal" ? "principals" :
                role === "teacher" ? "teachers" : "students";
        const roleRef = doc(db, roleCollection, uid);

        const batch = [];

        const driveSnap = await getDoc(driveRef);
        if (!driveSnap.exists()) {
            batch.push(setDoc(driveRef, {
                uid,
                drivePermissionGranted: false,
                driveApiEnabled: false,
                folderIds: null,
                createdAt: new Date().toISOString(),
            }));
        }

        const roleSnap = await getDoc(roleRef);
        if (!roleSnap.exists()) {
            batch.push(setDoc(roleRef, { uid, ...profile, createdAt: new Date().toISOString() }));
        }

        await Promise.all(batch);
    } catch (err) {
        console.warn("[ensureUserFirestoreDocs] Non-fatal error:", err.message);
    }
}

// ─────────────────────────────
// AUDIT TRAIL OPERATIONS
// ─────────────────────────────

export async function deleteExamFromAudit(uid, examId) {
    try {
        await deleteDoc(doc(db, "exams", examId));

        const auditRef = doc(db, "teacherExamUploads", uid);
        const snap = await getDoc(auditRef);
        if (!snap.exists()) return false;

        const updated = (snap.data()?.uploads || []).filter(
            (u) => u.examId !== examId && u.id !== examId
        );

        await updateDoc(auditRef, { uploads: updated, updatedAt: new Date().toISOString() });
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

        const updated = (snap.data()?.uploads || []).map((u) =>
            u.examId === examId || u.id === examId
                ? { ...u, ...changes, updatedAt: new Date().toISOString() }
                : u
        );

        await updateDoc(auditRef, { uploads: updated, updatedAt: new Date().toISOString() });
        return true;
    } catch (err) {
        console.warn("[Drive] updateExamInAudit failed:", err);
        return false;
    }
}