/**
 * useAuthModal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages all state and business logic for the auth modal.
 * Components consume this hook and render pure UI — no auth logic in JSX.
 *
 * Usage:
 *   const auth = useAuthModal({ onSuccess, setStudentInfo });
 *   <AuthForm onSubmit={auth.handleEmailSubmit} ... />
 */

import { useState, useCallback } from 'react';
import {
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    fetchUserProfile,
} from '../utils/authHandlers';
import { getFriendlyAuthError } from '../utils/authErrors';


/**
 * @param {object}   options
 * @param {function} options.onSuccess      — called after successful auth
 * @param {function} options.setStudentInfo — sets student session in App state
 * @param {function} options.onClose        — closes the modal
 */
export function useAuthModal({ onSuccess, setStudentInfo, onClose } = {}) {
    // ── Form state ─────────────────────────────────────────────────────────
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Reset ──────────────────────────────────────────────────────────────
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

    // ── Post-auth: load profile and route ─────────────────────────────────
    const handlePostAuth = useCallback(async (uid) => {
        const profile = await fetchUserProfile(uid);
        if (profile?.role === 'student') {
            setStudentInfo?.(profile);
            localStorage.setItem('user-session', JSON.stringify(profile));
        }
        resetForm();
        onSuccess?.(profile);
    }, [setStudentInfo, onSuccess, resetForm]);

    // ── Email / password submit ────────────────────────────────────────────
    const handleEmailSubmit = useCallback(async (e, captchaToken, resetCaptcha) => {
        e?.preventDefault();

        if (!captchaToken) {
            setError('Please complete the security check first.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const credential = isRegistering
                ? await registerWithEmail(email, password)
                : await signInWithEmail(email, password);

            await handlePostAuth(credential.user.uid);

        } catch (err) {
            const message = getFriendlyAuthError(err.code);
            if (message) setError(message);
            // Always reset captcha on failure — force re-verification
            resetCaptcha?.();
        } finally {
            setIsSubmitting(false);
        }
    }, [isRegistering, email, password, handlePostAuth]);

    // ── Google sign-in ─────────────────────────────────────────────────────
    const handleGoogleSignIn = useCallback(async () => {
        setError('');
        try {
            const credential = await signInWithGoogle();
            await handlePostAuth(credential.user.uid);
        } catch (err) {
            const message = getFriendlyAuthError(err.code);
            if (message) setError(message);
        }
    }, [handlePostAuth]);

    return {
        // State
        isRegistering,
        email,
        password,
        showPassword,
        error,
        isSubmitting,
        // Setters
        setEmail,
        setPassword,
        setShowPassword,
        // Handlers
        toggleMode,
        handleClose,
        handleEmailSubmit,
        handleGoogleSignIn,
    };
}