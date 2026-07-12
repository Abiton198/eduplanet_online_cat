/**
 * AuthForm.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Email + password fields, reCAPTCHA v2 checkbox, and submit button.
 * Purely presentational — all logic lives in useAuthModal + useRecaptcha.
 *
 * Props: all sourced from useAuthModal() and useRecaptcha() in AuthModal.jsx
 */

import { Eye, EyeOff } from 'lucide-react';
import { CaptchaField } from './CaptchaField';

export function AuthForm({
    // useAuthModal state
    isRegistering,
    email,
    password,
    showPassword,
    error,
    isSubmitting,
    onEmailChange,
    onPasswordChange,
    onTogglePassword,
    onSubmit,
    // useRecaptcha state
    captchaRef,
    captchaToken,
    onCaptchaVerify,
    onCaptchaExpire,
    onCaptchaError,
}) {
    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>

            {/* Error banner */}
            {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40
                        border border-red-100 dark:border-red-900
                        text-sm text-red-600 dark:text-red-400 font-medium">
                    {error}
                </div>
            )}

            {/* Email */}
            <div>
                <label
                    htmlFor="auth-email"
                    className="block text-xs font-bold uppercase tracking-widest
                     text-slate-500 dark:text-slate-400 mb-1.5"
                >
                    Email address
                </label>
                <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@school.co.za"
                    required
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className="w-full border-2 border-slate-200 dark:border-slate-700
                     dark:bg-slate-800 dark:text-white
                     p-4 rounded-2xl outline-none text-sm
                     focus:border-indigo-500 transition-colors"
                />
            </div>

            {/* Password */}
            <div>
                <label
                    htmlFor="auth-password"
                    className="block text-xs font-bold uppercase tracking-widest
                     text-slate-500 dark:text-slate-400 mb-1.5"
                >
                    Password
                </label>
                <div className="relative">
                    <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={isRegistering ? 'new-password' : 'current-password'}
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        className="w-full border-2 border-slate-200 dark:border-slate-700
                       dark:bg-slate-800 dark:text-white
                       p-4 pr-12 rounded-2xl outline-none text-sm
                       focus:border-indigo-500 transition-colors"
                    />
                    <button
                        type="button"
                        onClick={onTogglePassword}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-4 top-1/2 -translate-y-1/2
                       text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {/* reCAPTCHA v2 — visible security check */}
            <CaptchaField
                captchaRef={captchaRef}
                onVerify={onCaptchaVerify}
                onExpire={onCaptchaExpire}
                onError={onCaptchaError}
                verified={!!captchaToken}
            />

            {/* Submit — disabled until captcha is verified */}
            <button
                type="submit"
                disabled={!captchaToken || isSubmitting}
                className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest
                   transition-all shadow-lg
                   bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20
                   disabled:bg-slate-200 dark:disabled:bg-slate-700
                   disabled:text-slate-400 dark:disabled:text-slate-500
                   disabled:shadow-none disabled:cursor-not-allowed"
            >
                {isSubmitting
                    ? 'Verifying…'
                    : !captchaToken
                        ? 'Complete security check first'
                        : isRegistering
                            ? 'Create account'
                            : 'Sign in'}
            </button>
        </form>
    );
}