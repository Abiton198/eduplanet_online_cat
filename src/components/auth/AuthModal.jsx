import { X } from 'lucide-react';
import { useAuthModal } from '../../hooks/useAuthModal';
import { useRecaptcha } from '../../hooks/useRecaptcha';
import { AuthForm } from './AuthForm';
import { GoogleButton } from './GoogleButton';
import { SecurityBanner, SecurityFooter } from './SecurityTrust';

function Divider() {
    return (
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 font-medium">
                    or continue with
                </span>
            </div>
        </div>
    );
}

// ── Added onNeedsSetup directly to incoming props here ──────────────────────
export function AuthModal({ isOpen, onClose, onSuccess, setStudentInfo, onNeedsSetup }) {

    const captcha = useRecaptcha();

    // ── Safe reference now that it exists in scope ───────────────────────────
    const auth = useAuthModal({
        onSuccess,
        onNeedsSetup,
        setStudentInfo,
        onClose,
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (auth.isRegistering) {
            // Pass email, password, AND the captcha token + reset callback
            auth.handleEmailSubmit(auth.email, auth.password, captcha.token, captcha.reset);
        } else {
            auth.handleEmailSignIn(auth.email, auth.password, captcha.token, captcha.reset);
        }
    };

    const handleGoogleSubmit = () => {
        auth.handleGoogleSignIn(captcha.token, captcha.reset);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-slate-900/80 backdrop-blur-md"
            onClick={(e) => e.target === e.currentTarget && auth.handleClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-title"
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem]
                   p-10 shadow-2xl relative
                   border border-slate-200 dark:border-slate-800
                   animate-in zoom-in-95 duration-200"
            >
                <button
                    onClick={auth.handleClose}
                    aria-label="Close sign-in modal"
                    className="absolute top-6 right-6 text-slate-400
                     hover:text-rose-500 transition-colors"
                >
                    <X size={22} />
                </button>

                <SecurityBanner />

                <h2 id="auth-title" className="text-3xl font-black mb-1 dark:text-white">
                    {auth.isRegistering ? 'Create account' : 'Welcome back'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                    {auth.isRegistering
                        ? 'Join Eduket OS to get started.'
                        : 'Access your school dashboard securely.'}
                </p>

                <AuthForm
                    isRegistering={auth.isRegistering}
                    email={auth.email}
                    password={auth.password}
                    showPassword={auth.showPassword}
                    error={auth.error}
                    isSubmitting={auth.isSubmitting}
                    onEmailChange={auth.setEmail}
                    onPasswordChange={auth.setPassword}
                    onTogglePassword={() => auth.setShowPassword(v => !v)}
                    onSubmit={handleSubmit}
                    captchaRef={captcha.ref}
                    captchaToken={captcha.token}
                    onCaptchaVerify={captcha.onVerify}
                    onCaptchaExpire={captcha.onExpire}
                    onCaptchaError={captcha.onError}
                />

                <Divider />

                <GoogleButton
                    onClick={handleGoogleSubmit}
                    disabled={!captcha.token || auth.isSubmitting}
                />

                <SecurityFooter />

                <p className="text-center mt-5 text-sm font-medium dark:text-slate-300">
                    {auth.isRegistering ? 'Already have an account?' : 'New to Eduket?'}{' '}
                    <button
                        type="button"
                        onClick={auth.toggleMode}
                        className="text-indigo-600 font-black hover:underline
                       underline-offset-4 transition-colors"
                    >
                        {auth.isRegistering ? 'Sign in instead' : 'Register now'}
                    </button>
                </p>
            </div>
        </div>
    );
}