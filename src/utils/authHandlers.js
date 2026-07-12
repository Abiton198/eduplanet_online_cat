/**
 * authHandlers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All Firebase Auth operations in one place.
 * These are pure async functions — no hooks, no UI state.
 * Components call these and handle the result in their own state.
 *
 * Usage:
 *   import { signInWithEmail, registerWithEmail, signInWithGoogle }
 *     from '../utils/authHandlers';
 */

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';


/**
 * Sign in an existing user with email and password.
 * Returns the Firebase UserCredential on success.
 * Throws a Firebase AuthError on failure — caller should catch and
 * pass err.code to getFriendlyAuthError().
 */
export async function signInWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}


/**
 * Register a new user with email and password.
 * Creates the Firebase Auth account only — the Firestore profile is
 * written separately once the user completes the onboarding wizard.
 * Returns the Firebase UserCredential on success.
 */
export async function registerWithEmail(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}


/**
 * Sign in (or register) with Google.
 * Google's own popup is the human-verification step — no reCAPTCHA v2 needed.
 * Returns the Firebase UserCredential on success.
 * Throws silently when the user closes the popup (code: auth/popup-closed-by-user).
 */
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
}


/**
 * Sign out the current user and clear any persisted session state.
 */
export async function signOut() {
    return firebaseSignOut(auth);
}


/**
 * Send a password reset email.
 */
export async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
}


/**
 * Fetch the Firestore profile document for a given uid.
 * Returns { role, schoolId, ...profileData } or null if no profile exists.
 * Used after sign-in to determine which dashboard to load.
 */
export async function fetchUserProfile(uid) {
    try {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (!userSnap.exists()) return null;

        const { role, schoolId } = userSnap.data();
        const profileCol =
            role === 'principal' ? 'principals' :
                role === 'teacher' ? 'teachers' :
                    'students';

        const profSnap = await getDoc(doc(db, profileCol, uid));
        return profSnap.exists()
            ? { ...profSnap.data(), role, schoolId, uid }
            : { role, schoolId, uid };
    } catch (err) {
        console.error('[authHandlers] fetchUserProfile failed:', err);
        return null;
    }
}