/**
 * driveManager.js
 *
 * Handles everything Google Drive:
 *  - Storing / refreshing the OAuth access token
 *  - Ensuring the AI Exam Agent folder tree exists
 *  - Uploading files to the correct Drive folder
 *  - Requesting Drive permission mid-session (existing users)
 */

import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth, provider } from "./firebase";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
// drive.file = only files YOUR app created — safest, least intrusive scope

const FOLDER_NAMES = {
    root: "AI Exam Agent",
    papers: "Past Papers",
    uploaded: "Uploaded Exams",
    feedback: "Feedback Reports",
};

// ─── TOKEN MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * Returns the stored Drive access token for the current user.
 * Tokens expire after 1 hour — we store the expiry time to detect staleness.
 */
export function getStoredToken() {
    const token = sessionStorage.getItem("drive_access_token");
    const expiry = sessionStorage.getItem("drive_token_expiry");
    if (!token || !expiry) return null;
    if (Date.now() > parseInt(expiry)) {
        sessionStorage.removeItem("drive_access_token");
        sessionStorage.removeItem("drive_token_expiry");
        return null;
    }
    return token;
}

function storeToken(accessToken) {
    sessionStorage.setItem("drive_access_token", accessToken);
    // Google tokens last 1 hour; store expiry 5 min early to be safe
    sessionStorage.setItem("drive_token_expiry", String(Date.now() + 55 * 60 * 1000));
}

/**
 * Returns true if the current user has previously granted Drive permission.
 * We store a flag in Firestore so we know without re-prompting every session.
 */
export async function hasDrivePermission(uid) {
    const snap = await getDoc(doc(db, "userDriveConfig", uid));
    return snap.exists() && snap.data()?.drivePermissionGranted === true;
}

// ─── REQUEST DRIVE PERMISSION ─────────────────────────────────────────────────

/**
 * Re-opens the Google popup specifically to add the Drive scope.
 * Called either at first sign-up OR when an existing user tries to upload
 * without having granted permission yet.
 *
 * Returns the access token string on success, null on failure/cancel.
 */
export async function requestDrivePermission() {
    try {
        const driveProvider = new GoogleAuthProvider();
        driveProvider.addScope(DRIVE_SCOPE);
        // Force account chooser so user can confirm they're granting Drive access
        driveProvider.setCustomParameters({ prompt: "consent" });

        const result = await signInWithPopup(auth, driveProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        if (!token) throw new Error("No access token returned");

        storeToken(token);

        const uid = result.user.uid;

        // Create Drive folders — throws with a clear message if any ID is missing
        const folderIds = await ensureAppFolders(token);

        // Only write to Firestore once we have all valid folder IDs
        await setDoc(
            doc(db, "userDriveConfig", uid),
            {
                drivePermissionGranted: true,
                driveScope: DRIVE_SCOPE,
                folderIds,                          // all four IDs validated before reaching here
                permissionGrantedAt: new Date().toISOString(),
            },
            { merge: true }
        );

        return token;
    } catch (err) {
        console.error("Drive permission request failed:", err);
        return null;
    }
}

/**
 * Gets a valid token — uses stored token if still fresh,
 * otherwise triggers the permission popup again.
 */
export async function getValidDriveToken(uid) {
    const stored = getStoredToken();
    if (stored) return stored;

    // Token expired — re-request silently if already granted
    const hasPermission = await hasDrivePermission(uid);
    if (hasPermission) {
        return await requestDrivePermission();
    }
    return null;
}

// ─── FOLDER MANAGEMENT ────────────────────────────────────────────────────────

/**
 * Creates the AI Exam Agent folder tree in the user's Drive if it doesn't exist.
 * Safe to call multiple times — checks before creating.
 *
 * Returns: { rootId, papersId, uploadedId, feedbackId }
 */
export async function ensureAppFolders(accessToken) {
    const authHeader = { Authorization: `Bearer ${accessToken}` };
    const jsonHeaders = { ...authHeader, "Content-Type": "application/json" };

    const createOrGet = async (name, parentId = null) => {
        // Build query — use encodeURIComponent to avoid quote issues in URL
        const nameEscaped = name.replace(/'/g, "\\'");
        const parentClause = parentId ? ` and '${parentId}' in parents` : "";
        const q = `name='${nameEscaped}' and mimeType='application/vnd.google-apps.folder'${parentClause} and trashed=false`;

        const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
            { headers: authHeader }
        );

        if (!searchRes.ok) {
            const errBody = await searchRes.json().catch(() => ({}));
            throw new Error(`Drive search failed (${searchRes.status}): ${errBody?.error?.message || searchRes.statusText}`);
        }

        const { files } = await searchRes.json();
        if (files?.length > 0) return files[0].id;

        // Folder not found — create it
        const body = {
            name,
            mimeType: "application/vnd.google-apps.folder",
            ...(parentId ? { parents: [parentId] } : {}),
        };

        const createRes = await fetch(
            "https://www.googleapis.com/drive/v3/files?fields=id",
            { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) }
        );

        if (!createRes.ok) {
            const errBody = await createRes.json().catch(() => ({}));
            throw new Error(`Drive folder creation failed (${createRes.status}): ${errBody?.error?.message || createRes.statusText}`);
        }

        const folder = await createRes.json();

        if (!folder.id) {
            throw new Error(`Drive returned no folder ID for "${name}". Response: ${JSON.stringify(folder)}`);
        }

        return folder.id;
    };

    const rootId = await createOrGet(FOLDER_NAMES.root);
    const papersId = await createOrGet(FOLDER_NAMES.papers, rootId);
    const uploadedId = await createOrGet(FOLDER_NAMES.uploaded, rootId);
    const feedbackId = await createOrGet(FOLDER_NAMES.feedback, rootId);

    // Validate all IDs before returning — prevents undefined from reaching Firestore
    const ids = { rootId, papersId, uploadedId, feedbackId };
    for (const [key, val] of Object.entries(ids)) {
        if (!val) throw new Error(`Folder ID missing for "${key}" — Drive API may have failed silently.`);
    }

    return ids;
}

/**
 * Gets the stored folder IDs from Firestore (set during permission grant).
 * Falls back to re-creating them if missing.
 */
export async function getFolderIds(uid, accessToken) {
    const snap = await getDoc(doc(db, "userDriveConfig", uid));
    if (snap.exists() && snap.data()?.folderIds?.rootId) {
        return snap.data().folderIds;
    }
    // Rebuild if missing
    const folderIds = await ensureAppFolders(accessToken);
    await updateDoc(doc(db, "userDriveConfig", uid), { folderIds });
    return folderIds;
}

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────

/**
 * Uploads a file to a specific Google Drive folder.
 * Uses multipart upload for files under 5MB (typical PDF).
 *
 * Returns: { id, name, webViewLink } or throws on failure.
 */
export async function uploadFileToDrive(file, folderId, accessToken) {
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
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size",
        {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
        }
    );

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || "Drive upload failed");
    }

    return res.json(); // { id, name, webViewLink, size }
}

// ─── FIRESTORE EXAM RECORD ────────────────────────────────────────────────────

/**
 * Creates or updates the exam metadata record in Firestore after upload.
 * This is the single source of truth for the backend extraction pipeline.
 */
export async function saveExamMetadata({
    uid,
    teacherName,
    title,
    year,
    subject,
    curriculum,
    grade,
    examDriveFile,   // { id, name, webViewLink }
    memoDriveFile,   // { id, name, webViewLink }
}) {
    const examId = `${uid}_${Date.now()}`;

    const record = {
        examId,
        uploadedBy: uid,
        teacherName,
        title,
        year,
        subject,
        curriculum,
        grade,
        // Drive references — backend uses these IDs to fetch files
        examDriveFileId: examDriveFile.id,
        examDriveLink: examDriveFile.webViewLink,
        examFileName: examDriveFile.name,
        memoDriveFileId: memoDriveFile.id,
        memoDriveLink: memoDriveFile.webViewLink,
        memoFileName: memoDriveFile.name,
        // Pipeline status
        status: "pending_extraction",  // → extracted → indexed → ready
        uploadedAt: new Date().toISOString(),
        extractedAt: null,
        indexedAt: null,
    };

    // Primary exam record
    await setDoc(doc(db, "exams", examId), record);

    // Also update teacher's upload audit trail
    const auditRef = doc(db, "teacherExamUploads", uid);
    const auditSnap = await getDoc(auditRef);
    const existing = auditSnap.exists() ? auditSnap.data().uploads || [] : [];
    await setDoc(
        auditRef,
        { teacher: uid, uploads: [{ ...record, id: examId }, ...existing] },
        { merge: true }
    );

    return examId;
}

// ─── ENSURE USER FIRESTORE DOCS EXIST ────────────────────────────────────────

/**
 * Called right after login / profile setup.
 * Creates any missing Firestore documents for the user so the dashboard
 * never hits undefined state.
 */
export async function ensureUserFirestoreDocs(uid, role, profileData = {}) {
    const batch = [];

    // userDriveConfig — always needed
    const driveRef = doc(db, "userDriveConfig", uid);
    const driveSnap = await getDoc(driveRef);
    if (!driveSnap.exists()) {
        batch.push(
            setDoc(driveRef, {
                uid,
                drivePermissionGranted: false,
                folderIds: null,
                createdAt: new Date().toISOString(),
            })
        );
    }

    // Role-specific collection doc
    const collectionName =
        role === "principal" ? "principals" :
            role === "teacher" ? "teachers" : "users";

    const roleRef = doc(db, collectionName, uid);
    const roleSnap = await getDoc(roleRef);
    if (!roleSnap.exists()) {
        batch.push(setDoc(roleRef, { uid, ...profileData, createdAt: new Date().toISOString() }, { merge: true }));
    }

    // Student exam history stub (students only)
    if (role === "student") {
        const histRef = doc(db, "studentExamHistory", uid);
        const histSnap = await getDoc(histRef);
        if (!histSnap.exists()) {
            batch.push(setDoc(histRef, { uid, exams: [], totalPoints: 0, createdAt: new Date().toISOString() }));
        }
    }

    await Promise.all(batch);
}

// ─── AUDIT TRAIL OPERATIONS ───────────────────────────────────────────────────

/**
 * Deletes an exam from both /exams collection and the teacher's audit trail.
 * Does NOT delete the Drive files (user keeps those in their own Drive).
 */
export async function deleteExamFromAudit(uid, examId) {
    const { deleteDoc } = await import("firebase/firestore");

    // Remove from primary exams collection
    try {
        await deleteDoc(doc(db, "exams", examId));
    } catch (e) {
        console.warn("Could not delete from /exams:", e.message);
    }

    // Remove from teacher's audit trail array
    const auditRef = doc(db, "teacherExamUploads", uid);
    const auditSnap = await getDoc(auditRef);
    if (!auditSnap.exists()) return;

    const updated = (auditSnap.data().uploads || []).filter(
        (u) => u.examId !== examId && u.id !== examId
    );
    await updateDoc(auditRef, { uploads: updated });
}

/**
 * Updates editable metadata for an exam in both /exams and the audit trail.
 * Editable fields: title, subject, grade, year, curriculum.
 */
export async function updateExamInAudit(uid, examId, changes) {
    // Update primary record
    try {
        await updateDoc(doc(db, "exams", examId), {
            ...changes,
            updatedAt: new Date().toISOString(),
        });
    } catch (e) {
        console.warn("Could not update /exams:", e.message);
    }

    // Update inside audit trail array
    const auditRef = doc(db, "teacherExamUploads", uid);
    const auditSnap = await getDoc(auditRef);
    if (!auditSnap.exists()) return;

    const updated = (auditSnap.data().uploads || []).map((u) =>
        (u.examId === examId || u.id === examId)
            ? { ...u, ...changes, updatedAt: new Date().toISOString() }
            : u
    );
    await updateDoc(auditRef, { uploads: updated });
}
