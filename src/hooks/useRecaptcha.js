/**
 * useRecaptcha.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages reCAPTCHA v2 widget state: token, ref, and reset helper.
 * Decoupled from auth logic so it can be used on any form.
 *
 * Usage:
 *   const captcha = useRecaptcha();
 *   <CaptchaField ref={captcha.ref} onChange={captcha.onVerify} ... />
 *   // captcha.token is null until user ticks the box
 *   // captcha.reset() clears the widget (call on form error / submit)
 */

import { useRef, useState, useCallback } from 'react';

export function useRecaptcha() {
    const ref = useRef(null);
    const [token, setToken] = useState(null);

    // Called by <ReCAPTCHA onChange={}> when user successfully ticks the box.
    // Token is valid for 2 minutes — if it expires, onExpire fires instead.
    const onVerify = useCallback((captchaToken) => {
        setToken(captchaToken);
    }, []);

    // Called when the token expires (user was too slow to submit)
    const onExpire = useCallback(() => {
        setToken(null);
    }, []);

    // Called if the widget fails to load (network error, ad blocker etc.)
    const onError = useCallback(() => {
        setToken(null);
    }, []);

    // Programmatically reset the widget — call after a failed submission
    // so the user must re-verify before trying again.
    const reset = useCallback(() => {
        setToken(null);
        ref.current?.reset();
    }, []);

    return { ref, token, onVerify, onExpire, onError, reset };
}