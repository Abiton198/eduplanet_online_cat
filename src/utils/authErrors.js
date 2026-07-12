/**
 * authErrors.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts raw Firebase Auth error codes into user-friendly messages.
 * Keeps all error text in one place — easy to update, translate, or extend.
 *
 * Usage:
 *   import { getFriendlyAuthError } from '../utils/authErrors';
 *   const message = getFriendlyAuthError(err.code);
 */

const AUTH_ERRORS = {
    // Sign-in
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Contact your school admin.',
    'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes and try again.',

    // Registration
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Contact support.',

    // Google sign-in
    'auth/popup-closed-by-user': '', // Silent — user closed the popup intentionally
    'auth/popup-blocked': 'Sign-in popup was blocked. Please allow popups for this site.',
    'auth/account-exists-with-different-credential':
        'An account already exists with a different sign-in method for this email.',

    // Network
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/timeout': 'The request timed out. Please try again.',

    // Generic
    'auth/internal-error': 'An internal error occurred. Please try again.',
};

const DEFAULT_ERROR = 'Something went wrong. Please try again or contact your school admin.';

/**
 * Returns a human-readable message for a given Firebase Auth error code.
 * Returns an empty string for errors that should be shown silently (e.g. popup closed).
 */
export function getFriendlyAuthError(code = '') {
    return AUTH_ERRORS[code] ?? DEFAULT_ERROR;
}