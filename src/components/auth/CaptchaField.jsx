/**
 * CaptchaField.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps react-google-recaptcha (reCAPTCHA v2 checkbox) with consistent styling.
 * The sign-in button must be disabled until this field emits a token.
 *
 * Props:
 *   captchaRef  — ref forwarded from useRecaptcha()
 *   onVerify    — called with token string when user ticks the box
 *   onExpire    — called when token expires (2 min timeout)
 *   onError     — called if widget fails to load
 *   verified    — boolean, true when token is held
 *
 * Install:  npm install react-google-recaptcha
 * Env var:  VITE_RECAPTCHA_SITE_KEY_V2
 */

import ReCAPTCHA from 'react-google-recaptcha';

export function CaptchaField({ captchaRef, onVerify, onExpire, onError, verified }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase tracking-widest
                         text-slate-500 dark:text-slate-400 mb-2">
                Security check
            </label>

            {/* Widget container */}
            <div className="border-2 border-slate-200 dark:border-slate-700
                      rounded-2xl p-3 flex items-center justify-center
                      bg-slate-50 dark:bg-slate-800/50 transition-colors
                      focus-within:border-indigo-400">
                <ReCAPTCHA
                    ref={captchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY_V2}
                    onChange={onVerify}
                    onExpired={onExpire}
                    onErrored={onError}
                    theme="light"
                />
            </div>

            {/* Status line below the widget */}
            <p className={`mt-1.5 text-[11px] text-center transition-colors ${verified
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-slate-400'
                }`}>
                {verified
                    ? '✓ Security check passed'
                    : 'Please verify you are human to continue.'}
            </p>
        </div>
    );
}