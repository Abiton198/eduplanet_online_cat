/**
 * useAuthModal.js  v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages auth modal state and business logic.
 *
 * New in v2:
 *   After registration Firebase marks the user as NEW. We detect this
 *   and instead of routing to a dashboard, we call onNeedsSetup(uid)
 *   so the parent can show the ProfileSetupWizard.
 *
 *   Existing users who sign in follow the normal path: fetch profile
 *   from Firestore and route by role.
 *
 * How new-user detection works:
 *   createUserWithEmailAndPassword → user._tokenResponse.isNewUser = true
 *   signInWithEmailAndPassword     → isNewUser = false
 *   signInWithPopup (Google)       → check if Firestore users/{uid} exists
 */

import { useState, useCallback } from 'react';
import {
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    fetchUserProfile,
} from '../utils/authHandlers';
import { getFriendlyAuthError } from '../utils/authErrors';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

/**
 * @param {object}   options
 * @param {function} options.onSuccess      — (profile) → void, called after existing-user sign-in
 * @param {function} options.onNeedsSetup   — (uid, email) → void, called after NEW user registers
 * @param {function} options.setStudentInfo — App-level student session setter
 * @param {function} options.onClose        — closes the modal
 */
export function useAuthModal({
    onSuccess,
    onNeedsSetup,
    setStudentInfo,
    onClose,
} = {}) {

    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = useCallback(() => {
        setEmail('');
        setPassword('');
        setError('');
        setIsSubmitting(false);
    }, []);

    const handleClose = useCallback(() => {
        resetForm();
        onClose?.();
    }, [resetForm, onClose]);

    const toggleMode = useCallback(() => {
        setIsRegistering(v => !v);
        setError('');
    }, []);

    // ── Route an EXISTING user who already has a Firestore profile ────────────
    const handleExistingUser = useCallback(async (uid) => {
        const profile = await fetchUserProfile(uid);
        if (profile?.role === 'student') {
            setStudentInfo?.(profile);
            localStorage.setItem('user-session', JSON.stringify(profile));
        }
        resetForm();
        onSuccess?.(profile);
    }, [setStudentInfo, onSuccess, resetForm]);


    // ── Email / password submit ────────────────────────────────────────────────
    const handleEmailSubmit = useCallback(async (email, password, captchaToken, resetCaptcha) => {
        if (!captchaToken) {
            setError('Please complete the security check first.');
            return;
        }

        setError('');
        setIsSubmitting(true);

        try {
            if (isRegistering) {
                // ── REGISTER — use the imported registerWithEmail from authHandlers
                const credential = await registerWithEmail(email, password);
                const uid = credential.user.uid;
                resetForm();
                onClose?.();
                onNeedsSetup?.(uid, email);

            } else {
                // ── SIGN IN — use the imported signInWithEmail from authHandlers
                const credential = await signInWithEmail(email, password);
                const uid = credential.user.uid;
                await handleExistingUser(uid);
            }

        } catch (err) {
            console.error('[Auth]', err.code, err.message);
            const msg = getFriendlyAuthError(err.code);
            setError(msg || 'An unexpected error occurred. Please try again.');
            resetCaptcha?.();
        } finally {
            setIsSubmitting(false);
        }
    }, [isRegistering, onNeedsSetup, onClose, resetForm, handleExistingUser]);

    // ── Google sign-in ─────────────────────────────────────────────────────────
    // Google can be used for both new and returning users.
    // We check Firestore to determine if profile setup is needed.
    // Inside useAuthModal.js
    // Inside useAuthModal.js

    const handleGoogleSignIn = useCallback(async (captchaToken, resetCaptcha) => {
    if (!captchaToken) {
        setError('Please complete the security check first.');
        return;
    }

    setError('');
    setIsSubmitting(true);

    try {
        const credential = await signInWithGoogle();
        const uid = credential.user.uid;
        const email = credential.user.email;

        // Fetch profile across your role collections (teachers/students/users)
        const profile = await fetchUserProfile(uid);

        if (profile) {
            // Returning user found -> Route to dashboard / check approval
            await handleExistingUser(uid);
        } else {
            // Brand new user -> Hand off to ProfileSetupWizard
            resetForm();
            onClose?.();
            onNeedsSetup?.(uid, email);
        }
    } catch (err) {
        console.error('[Google Auth Error]:', err);
        const msg = getFriendlyAuthError(err.code);
        if (msg) setError(msg);
        resetCaptcha?.();
    } finally {
        setIsSubmitting(false);
    }
}, [fetchUserProfile, handleExistingUser, onNeedsSetup, onClose, resetForm]);

    return {
        isRegistering,
        email,
        password,
        showPassword,
        error,
        isSubmitting,
        setEmail,
        setPassword,
        setShowPassword,
        toggleMode,
        handleClose,
        handleEmailSubmit,
        handleGoogleSignIn,
    };
}