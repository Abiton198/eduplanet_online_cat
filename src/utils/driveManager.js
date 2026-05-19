/**
 * driveManager.js
 *
 * Google Drive Manager
 * ------------------------------------------------------------
 * Handles:
 *  - Google Drive token storage
 *  - Drive API validation
 *  - AI Exam Agent folder creation
 *  - File uploads to Google Drive
 *  - Firestore metadata storage
 *
 * IMPORTANT:
 * ------------------------------------------------------------
 * Drive permission MUST be requested during INITIAL GOOGLE LOGIN.
 *
 * Example:
 *
 * const provider = new GoogleAuthProvider();
 * provider.addScope("https://www.googleapis.com/auth/drive.file");
 *
 * const result = await signInWithPopup(auth, provider);
 *
 * const credential =
 *   GoogleAuthProvider.credentialFromResult(result);
 *
 * const token = credential?.accessToken;
 *
 * await initializeDriveForUser(user.uid, token);
 */

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";


// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

export const DRIVE_SCOPE =
    "https://www.googleapis.com/auth/drive.file";

const FOLDER_NAMES = {
    root: "AI Exam Agent",
    papers: "Past Papers",
    uploaded: "Uploaded Exams",
    feedback: "Feedback Reports",
};

// ─────────────────────────────────────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────────────────────────────────────

export function getStoredToken() {
    try {
        const token = localStorage.getItem("drive_access_token");
        const expiry = localStorage.getItem("drive_token_expiry");

        if (!token || !expiry) return null;

        const expiryNum = Number(expiry);

        if (Number.isNaN(expiryNum) || Date.now() > expiryNum) {
            localStorage.removeItem("drive_access_token");
            localStorage.removeItem("drive_token_expiry");
            return null;
        }

        return token;
    } catch (err) {
        console.warn("[Drive] Failed reading stored token:", err);
        return null;
    }
}

export function storeToken(accessToken) {
    try {
        localStorage.setItem("drive_access_token", accessToken);

        localStorage.setItem(
            "drive_token_expiry",
            String(Date.now() + 55 * 60 * 1000)
        );
    } catch (err) {
        console.warn("[Drive] Failed storing token:", err);
    }
}

export function clearStoredToken() {
    try {
        localStorage.removeItem(
            "drive_access_token"
        );

        localStorage.removeItem(
            "drive_token_expiry"
        );
    } catch { }
}

// ─────────────────────────────────────────────────────────────
// DRIVE PERMISSION CHECK
// ─────────────────────────────────────────────────────────────
export async function requestDrivePermission(uid) {
    try {
        const provider = new GoogleAuthProvider();
        provider.addScope(DRIVE_SCOPE);

        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);

        if (!credential?.accessToken) {
            throw new Error("No access token received.");
        }

        return credential.accessToken;
    } catch (err) {
        console.error("[Drive] Permission request failed:", err);
        throw err;
    }
}


export async function hasDrivePermission(uid) {
    try {
        if (!uid) return false;

        const snap = await getDoc(doc(db, "userDriveConfig", uid));

        if (!snap.exists()) return false;

        return snap.data()?.drivePermissionGranted === true;
    } catch (err) {
        console.warn("[Drive] hasDrivePermission failed:", err);
        return false;
    }
}


export async function isDriveApiAvailable(
    accessToken
) {
    try {
        const res = await fetch(
            "https://www.googleapis.com/drive/v3/about?fields=user",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!res.ok) {
            const err = await res
                .json()
                .catch(() => ({}));

            console.warn(
                "[Drive] API check failed:",
                err?.error?.message || res.statusText
            );

            return false;
        }

        return true;
    } catch (err) {
        console.warn(
            "[Drive] API unavailable:",
            err.message
        );

        return false;
    }
}

// ─────────────────────────────────────────────────────────────
// INITIALIZE DRIVE
// ─────────────────────────────────────────────────────────────

export async function initializeDriveForUser(
    uid,
    accessToken
) {
    try {
        if (!uid || !accessToken) {
            console.warn(
                "[Drive] Missing uid or access token."
            );

            return null;
        }

        storeToken(accessToken);

        const available =
            await isDriveApiAvailable(accessToken);

        if (!available) {
            console.warn(
                "[Drive] Google Drive API unavailable."
            );

            return null;
        }

        const folderIds =
            await ensureAppFolders(accessToken);

        await setDoc(
            doc(db, "userDriveConfig", uid),
            {
                uid,
                drivePermissionGranted: true,
                driveApiEnabled: true,
                driveScope: DRIVE_SCOPE,
                folderIds,
                initializedAt: new Date().toISOString(),
            },
            { merge: true }
        );

        return folderIds;
    } catch (err) {
        console.warn(
            "[Drive] Initialization failed:",
            err.message
        );

        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// VALID TOKEN RESOLUTION
// ─────────────────────────────────────────────────────────────

export async function getValidDriveToken(uid) {
    try {
        // Try stored token first
        const stored = getStoredToken();

        if (stored) {
            return stored;
        }

        // Check whether user already granted Drive permission
        const hasPermission = await hasDrivePermission(uid);

        if (!hasPermission) {
            console.warn("[Drive] User has not granted Drive permission.");
            return null;
        }

        // Re-request permission silently
        const freshToken = await requestDrivePermission(uid);


        if (!freshToken) {
            console.warn("[Drive] Could not refresh Drive token.");
            return null;
        }

        return freshToken;

    } catch (err) {
        console.warn("[Drive] getValidDriveToken failed:", err);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// FOLDER MANAGEMENT
// ─────────────────────────────────────────────────────────────

export async function ensureAppFolders(
    accessToken
) {
    const authHeader = {
        Authorization: `Bearer ${accessToken}`,
    };

    const jsonHeaders = {
        ...authHeader,
        "Content-Type": "application/json",
    };

    const createOrGet = async (
        name,
        parentId = null
    ) => {
        const escaped = name.replace(/'/g, "\\'");

        const parentClause = parentId
            ? ` and '${parentId}' in parents`
            : "";

        const q =
            `name='${escaped}' ` +
            `and mimeType='application/vnd.google-apps.folder' ` +
            `${parentClause} and trashed=false`;

        const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
                q
            )}&fields=files(id,name)`,
            {
                headers: authHeader,
            }
        );

        if (!searchRes.ok) {
            const err = await searchRes
                .json()
                .catch(() => ({}));

            throw new Error(
                err?.error?.message ||
                "Drive folder search failed"
            );
        }

        const data = await searchRes.json();

        if (data?.files?.length > 0) {
            return data.files[0].id;
        }

        const body = {
            name,
            mimeType:
                "application/vnd.google-apps.folder",
            ...(parentId
                ? { parents: [parentId] }
                : {}),
        };

        const createRes = await fetch(
            "https://www.googleapis.com/drive/v3/files?fields=id",
            {
                method: "POST",
                headers: jsonHeaders,
                body: JSON.stringify(body),
            }
        );

        if (!createRes.ok) {
            const err = await createRes
                .json()
                .catch(() => ({}));

            throw new Error(
                err?.error?.message ||
                "Drive folder creation failed"
            );
        }

        const folder = await createRes.json();

        if (!folder?.id) {
            throw new Error(
                `Folder ID missing for ${name}`
            );
        }

        return folder.id;
    };

    const rootId = await createOrGet(
        FOLDER_NAMES.root
    );

    const papersId = await createOrGet(
        FOLDER_NAMES.papers,
        rootId
    );

    const uploadedId = await createOrGet(
        FOLDER_NAMES.uploaded,
        rootId
    );

    const feedbackId = await createOrGet(
        FOLDER_NAMES.feedback,
        rootId
    );

    return {
        rootId,
        papersId,
        uploadedId,
        feedbackId,
    };
}

// ─────────────────────────────────────────────────────────────
// GET FOLDER IDS
// ─────────────────────────────────────────────────────────────

export async function getFolderIds(
    uid,
    accessToken
) {
    try {
        const snap = await getDoc(
            doc(db, "userDriveConfig", uid)
        );

        const existing =
            snap.data()?.folderIds;

        if (existing?.rootId) {
            return existing;
        }

        const folderIds =
            await ensureAppFolders(accessToken);

        await updateDoc(
            doc(db, "userDriveConfig", uid),
            {
                folderIds,
            }
        );

        return folderIds;
    } catch (err) {
        console.warn(
            "[Drive] Failed to get folders:",
            err.message
        );

        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// FILE UPLOAD
// ─────────────────────────────────────────────────────────────

export async function uploadFileToDrive(
    file,
    folderId,
    accessToken
) {
    try {
        const metadata = {
            name: file.name,
            parents: [folderId],
        };

        const form = new FormData();

        form.append(
            "metadata",
            new Blob([JSON.stringify(metadata)], {
                type: "application/json",
            })
        );

        form.append("file", file);

        const res = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            }
        );

        if (!res.ok) {
            const err = await res
                .json()
                .catch(() => ({}));

            throw new Error(
                err?.error?.message ||
                "Drive upload failed"
            );
        }

        return await res.json();
    } catch (err) {
        console.warn(
            "[Drive Upload Failed]:",
            err.message
        );

        throw err;
    }
}

// ─────────────────────────────────────────────────────────────
// SAVE EXAM METADATA
// ─────────────────────────────────────────────────────────────

export async function saveExamMetadata({
    uid,
    teacherName,
    title,
    year,
    subject,
    curriculum,
    grade,
    examDriveFile,
    memoDriveFile,
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

        examDriveFileId: examDriveFile.id,
        examDriveLink:
            examDriveFile.webViewLink,
        examFileName:
            examDriveFile.name,

        memoDriveFileId: memoDriveFile.id,
        memoDriveLink:
            memoDriveFile.webViewLink,
        memoFileName:
            memoDriveFile.name,

        status: "pending_extraction",

        uploadedAt:
            new Date().toISOString(),

        extractedAt: null,
        indexedAt: null,
    };

    await setDoc(
        doc(db, "exams", examId),
        record
    );

    const auditRef = doc(
        db,
        "teacherExamUploads",
        uid
    );

    const auditSnap =
        await getDoc(auditRef);

    const existing =
        auditSnap.exists()
            ? auditSnap.data().uploads || []
            : [];

    await setDoc(
        auditRef,
        {
            teacher: uid,
            uploads: [
                { ...record, id: examId },
                ...existing,
            ],
        },
        { merge: true }
    );

    return examId;
}

// ─────────────────────────────────────────────────────────────
// ENSURE FIRESTORE DOCS
// ─────────────────────────────────────────────────────────────

export async function ensureUserFirestoreDocs(
    uid,
    role,
    profileData = {}
) {
    try {
        const batch = [];

        const driveRef = doc(
            db,
            "userDriveConfig",
            uid
        );

        const driveSnap =
            await getDoc(driveRef);

        if (!driveSnap.exists()) {
            batch.push(
                setDoc(driveRef, {
                    uid,
                    drivePermissionGranted: false,
                    driveApiEnabled: false,
                    folderIds: null,
                    createdAt:
                        new Date().toISOString(),
                })
            );
        }

        const collectionName =
            role === "principal"
                ? "principals"
                : role === "teacher"
                    ? "teachers"
                    : "students";

        const roleRef = doc(
            db,
            collectionName,
            uid
        );

        const roleSnap =
            await getDoc(roleRef);

        if (!roleSnap.exists()) {
            batch.push(
                setDoc(
                    roleRef,
                    {
                        uid,
                        ...profileData,
                        createdAt:
                            new Date().toISOString(),
                    },
                    { merge: true }
                )
            );
        }

        if (role === "student") {
            const histRef = doc(
                db,
                "studentExamHistory",
                uid
            );

            const histSnap =
                await getDoc(histRef);

            if (!histSnap.exists()) {
                batch.push(
                    setDoc(histRef, {
                        uid,
                        exams: [],
                        totalPoints: 0,
                        createdAt:
                            new Date().toISOString(),
                    })
                );
            }
        }

        await Promise.all(batch);
    } catch (err) {
        console.warn(
            "[ensureUserFirestoreDocs]",
            err.message
        );
    }
}

// ─────────────────────────────────────────────────────────────
// AUDIT TRAIL OPERATIONS
// ─────────────────────────────────────────────────────────────

export async function deleteExamFromAudit(uid, examId) {
    try {
        const { deleteDoc } = await import("firebase/firestore");

        // Remove from exams collection
        try {
            await deleteDoc(doc(db, "exams", examId));
        } catch (err) {
            console.warn("[Drive] Could not delete /exams doc:", err);
        }

        // Remove from teacher audit trail
        const auditRef = doc(db, "teacherExamUploads", uid);

        const auditSnap = await getDoc(auditRef);

        if (!auditSnap.exists()) return;

        const uploads = auditSnap.data()?.uploads || [];

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
        // Update master exam record
        try {
            await updateDoc(doc(db, "exams", examId), {
                ...changes,
                updatedAt: new Date().toISOString(),
            });
        } catch (err) {
            console.warn("[Drive] Could not update /exams doc:", err);
        }

        // Update teacher audit record
        const auditRef = doc(db, "teacherExamUploads", uid);

        const auditSnap = await getDoc(auditRef);

        if (!auditSnap.exists()) return false;

        const uploads = auditSnap.data()?.uploads || [];

        const updated = uploads.map((u) => {
            if (u.examId === examId || u.id === examId) {
                return {
                    ...u,
                    ...changes,
                    updatedAt: new Date().toISOString(),
                };
            }

            return u;
        });

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