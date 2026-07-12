/**
 * GoogleButton.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone Google sign-in button.
 * Google's own OAuth popup includes built-in bot protection —
 * reCAPTCHA v2 is NOT required for this path.
 *
 * Props:
 *   onClick    — calls handleGoogleSignIn from useAuthModal
 *   disabled   — optional, prevents double-click during async operation
 */

export function GoogleButton({ onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled} // 2. Pass it down to the native HTML element!
            className="w-full py-3.5 px-4 border-2 border-slate-200 dark:border-slate-700
                 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-200
                 flex items-center justify-center gap-3 transition-all
                 hover:bg-slate-50 dark:hover:bg-slate-800
                 disabled:opacity-50 disabled:cursor-not-allowed
                 disabled:hover:bg-transparent" >

            <img
                src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png"
                className="w-5 h-5"
                alt="Google logo"
            />
            <span>Continue with Google</span>
        </button>
    );
}