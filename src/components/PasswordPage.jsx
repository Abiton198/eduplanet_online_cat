import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc, getDoc
} from 'firebase/firestore';
import ReCAPTCHA from 'react-google-recaptcha';
import Swal from 'sweetalert2';
import {
  Shield, Lock, Eye,
  X as XIcon, EyeOff,
} from 'lucide-react';
import { auth, db } from '../utils/firebase';
import { ProfileSetupWizard } from './ProfileSetupWizard';
import Navbar from './landing/Navbar';
import Hero from './landing/Hero';
import FeatureStrip from './landing/FeatureStrip';
import VideoSection from './landing/VideoSection';
import Demosection from './landing/Demosection';
import HowItWorks from './landing/HowItWorks';
import CTA from './landing/CTA';
import ThreePaths from './landing/ThreePaths';
import Mission from './landing/Mission';
import Footer from './landing/Footer';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const AUTH_ERRORS = {
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact your school admin.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/popup-closed-by-user': '',
  'auth/popup-blocked': 'Popup blocked. Please allow popups for this site.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/password-does-not-meet-requirements': null,
};
const AUTH_DEFAULT_ERROR = 'Something went wrong. Please try again.';
const getFriendlyError = (code) => AUTH_ERRORS[code] ?? AUTH_DEFAULT_ERROR;

// ══════════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════════

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-xl bg-[#FF3B5C]/10 border border-[#FF3B5C]/20 text-sm text-[#FF3B5C] font-medium mb-4">
      {message}
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/10" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="px-3 bg-[#141822] text-[#AEB7C7] font-medium">or continue with</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH MODAL
// ══════════════════════════════════════════════════════════════════════════════

function AuthModal({ isOpen, onClose, onSuccess, onNeedsSetup, setStudentInfo }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const captchaRef = useRef(null);

  const resetForm = useCallback(() => {
    setEmail(''); setPassword(''); setError('');
    setCaptchaToken(null); captchaRef.current?.reset();
  }, []);

  const handleClose = () => { resetForm(); onClose(); };
  const toggleMode = () => { setIsRegistering(v => !v); setError(''); };

  const routeExistingUser = async (uid) => {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) { onNeedsSetup?.(uid, email); return; }
    const { role, schoolId } = userSnap.data();
    const col = role === 'principal' ? 'principals' : role === 'teacher' ? 'teachers' : 'students';
    const profSnap = await getDoc(doc(db, col, uid));
    const profile = profSnap.exists()
      ? { ...profSnap.data(), role, schoolId, uid }
      : { role, schoolId, uid };
    if (role === 'student') {
      setStudentInfo?.(profile);
      localStorage.setItem('user-session', JSON.stringify(profile));
    }
    resetForm();
    onSuccess?.(profile);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!captchaToken) { setError('Please complete the security check first.'); return; }
    setIsSubmitting(true); setError('');
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        resetForm(); onClose();
        onNeedsSetup?.(cred.user.uid, cred.user.email);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await routeExistingUser(cred.user.uid);
      }
    } catch (err) {
      console.error('[Auth] Registration failed:', err.code, err.message);

      let msg = '';

      if (err.code === 'auth/password-does-not-meet-requirements') {
        // Firebase message contains the exact requirements in square brackets
        // e.g. "[Password must contain an upper case character, ...]"
        const match = err.message.match(/\[([^\]]+)\]/);
        if (match) {
          const requirements = match[1]
            .split(',')
            .map(r => r.trim())
            .join('\n• ');
          msg = `Password does not meet requirements:\n• ${requirements}`;
        } else {
          msg = 'Password does not meet the required security standards.';
        }
      } else {
        msg = getFriendlyError(err.code) || err.message || 'Something went wrong. Please try again.';
      }

      setError(msg);
      setCaptchaToken(null);
      captchaRef.current?.reset();
    }
  };

  const handleGoogle = async () => {
    setError(''); setIsSubmitting(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const uid = cred.user.uid;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        await routeExistingUser(uid);
      } else {
        resetForm(); onClose();
        onNeedsSetup?.(uid, cred.user.email);
      }
    } catch (err) {
      const msg = getFriendlyError(err.code);
      if (msg) setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-[#141822] w-full max-w-md rounded-[2rem] p-8 sm:p-10 shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-1.5 text-[#AEB7C7] hover:text-[#FF3B5C] transition-colors rounded-lg hover:bg-white/5"
        >
          <XIcon size={20} />
        </button>

        <div className="flex items-center justify-center gap-2 mb-6 py-2.5 px-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20">
          <Shield size={14} className="text-[#22C55E]" />
          <span className="font-plex-sans text-xs font-bold text-[#22C55E]">
            Protected by Firebase + reCAPTCHA
          </span>
          <Lock size={12} className="text-[#22C55E]" />
        </div>

        <h2 className="font-zilla text-2xl sm:text-3xl font-bold mb-1 text-[#F3F6FB]">
          {isRegistering ? 'Create account' : 'Welcome back'}
        </h2>
        <p className="font-plex-sans text-sm text-[#AEB7C7] mb-7">
          {isRegistering ? 'Join Eduket OS to get started.' : 'Access your school dashboard securely.'}
        </p>

        <ErrorBox message={error} />

        <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="auth-email" className="font-plex-mono block text-[10px] font-semibold uppercase tracking-widest text-[#AEB7C7] mb-1.5">
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@school.co.za"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-white/10 bg-[#0A0D14] text-[#F3F6FB] p-4 rounded-xl outline-none text-sm focus:border-[#1EA1FE] transition-colors placeholder:text-[#AEB7C7]/50"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="font-plex-mono block text-[10px] font-semibold uppercase tracking-widest text-[#AEB7C7] mb-1.5">
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
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-white/10 bg-[#0A0D14] text-[#F3F6FB] p-4 pr-12 rounded-xl outline-none text-sm focus:border-[#1EA1FE] transition-colors placeholder:text-[#AEB7C7]/50"
              />
              {isRegistering && (
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Password must contain: uppercase letter, lowercase letter,
                  number, and a special character (e.g. !@#$%)
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AEB7C7] hover:text-[#F3F6FB] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="font-plex-mono block text-[10px] font-semibold uppercase tracking-widest text-[#AEB7C7] mb-2">
              Security check
            </label>
            <div className="border border-white/10 rounded-xl p-3 flex items-center justify-center bg-[#0A0D14]">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY_V2}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
                onErrored={() => setCaptchaToken(null)}
                theme="dark"
              />
            </div>
            <p className={`font-plex-sans mt-1.5 text-[11px] text-center ${captchaToken ? 'text-[#22C55E]' : 'text-[#AEB7C7]'}`}>
              {captchaToken ? '✓ Security check passed' : 'Verify you are human to continue.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={!captchaToken || isSubmitting}
            className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg bg-[#1EA1FE] hover:bg-[#4BB8FF] text-[#0A0D14] shadow-[#1EA1FE]/20 disabled:bg-white/5 disabled:text-[#AEB7C7]/50 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Please wait…'
              : !captchaToken ? 'Complete security check first'
                : isRegistering ? 'Create account'
                  : 'Sign in'}
          </button>
        </form>

        <Divider />

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isSubmitting}
          className="w-full py-4 border border-white/10 hover:bg-white/5 rounded-xl flex items-center justify-center gap-3 transition-all font-bold text-sm text-[#F3F6FB] disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>

        <div className="mt-5 p-3 rounded-xl bg-[#0A0D14] border border-white/5">
          <p className="font-plex-sans text-center text-[10px] text-[#AEB7C7] leading-relaxed">
            Protected by reCAPTCHA &middot;{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-[#1EA1FE]">Privacy</a>{' '}
            &{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-[#1EA1FE]">Terms</a>{' '}
            apply. Data encrypted on Firebase.
          </p>
        </div>

        <p className="font-plex-sans text-center mt-5 text-sm font-medium text-[#AEB7C7]">
          {isRegistering ? 'Already have an account?' : 'New to Eduket?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="text-[#1EA1FE] font-bold hover:underline underline-offset-4"
          >
            {isRegistering ? 'Sign in instead' : 'Register now'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function PasswordPage({ setStudentInfo, userProfile }) {
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [setupPending, setSetupPending] = useState(false);
  const [newUserUid, setNewUserUid] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  const handleAuthSuccess = (profile) => {
    setModalOpen(false);
    if (!profile) return;
    if (profile.role === 'teacher') return navigate('/teacher-dashboard');
    if (profile.role === 'principal') return navigate('/principal-dashboard');
  };

  const handleNeedsSetup = (uid, email) => {
    setModalOpen(false);
    setNewUserUid(uid);
    setNewUserEmail(email);
    setSetupPending(true);
  };

  // ── handleSetupComplete ──────────────────────────────────
  const notifyPrincipal = (profile) => {
    // Only notify for teachers and students — not principals (they ARE the principal)
    if (profile.role === 'principal') return;
    if (!profile.schoolId) return;

    // Fire and forget — never block navigation
    fetch(`${import.meta.env.VITE_API_URL}/notify-principal-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId: profile.schoolId,
        schoolName: profile.schoolName || '',
        uid: profile.uid || '',
        email: profile.email || '',
        displayName: profile.displayName || '',
        firstName: profile.firstName || '',
        role: profile.role,
        grade: profile.grade || '',
        subjects: profile.subjects || [],
      }),
    }).catch(err => console.warn('[Notify] Principal alert failed:', err));
  };

  // ── In handleSetupComplete — add notifyPrincipal call after welcome email ────
  const handleSetupComplete = async (profile) => {
    setSetupPending(false);
    if (!profile) return;

    try {
      const dashboardUrls = {
        principal: `${window.location.origin}/principal-dashboard`,
        teacher: `${window.location.origin}/teacher-dashboard`,
        student: `${window.location.origin}/exam`,
      };

      // Send welcome email to the new user (fire and forget)
      fetch(`${import.meta.env.VITE_API_URL}/send-welcome-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          displayName: profile.displayName,
          firstName: profile.firstName,
          role: profile.role,
          schoolName: profile.schoolName,
          grade: profile.grade || '',
          subjects: profile.subjects || [],
          dashboardUrl: dashboardUrls[profile.role] || window.location.origin,
        }),
      }).catch(err => console.warn('[Welcome Email] Send failed:', err));

      // Notify principal of new signup (fire and forget)
      notifyPrincipal(profile);

      // Navigate...
      if (profile.role === 'student') {
        setStudentInfo?.(profile);
        localStorage.setItem('user-session', JSON.stringify(profile));
        await Swal.fire({
          icon: 'success',
          title: 'Welcome to Eduket OS! 🎉',
          html: `
          <p style="margin-bottom:8px">Your student profile is ready.</p>
          <p style="font-size:13px;color:#6b7280">
            📧 A welcome email with your details has been sent to<br/>
            <strong>${profile.email}</strong>
          </p>
        `,
          confirmButtonText: 'Go to My Exams',
          confirmButtonColor: '#1d4ed8',
        });
        window.location.href = '/exam';

      } else if (profile.role === 'teacher') {
        await Swal.fire({
          icon: 'success',
          title: 'Welcome, Teacher! 📚',
          html: `
          <p style="margin-bottom:8px">Your profile is set up.</p>
          <p style="font-size:13px;color:#6b7280">
            📧 A welcome email has been sent to<br/>
            <strong>${profile.email}</strong>
          </p>
        `,
          confirmButtonText: 'Go to Dashboard',
          confirmButtonColor: '#059669',
        });
        window.location.href = '/teacher-dashboard';

      } else if (profile.role === 'principal') {
        await Swal.fire({
          icon: 'success',
          title: 'School Registered! 🏫',
          html: `
          <p style="margin-bottom:8px">
            <strong>${profile.schoolName}</strong> is now live on Eduket OS.
          </p>
          <p style="font-size:13px;color:#6b7280">
            📧 A welcome email has been sent to<br/>
            <strong>${profile.email}</strong>
          </p>
        `,
          confirmButtonText: 'Go to Dashboard',
          confirmButtonColor: '#7c3aed',
        });
        window.location.href = '/principal-dashboard';
      }

    } catch (err) {
      console.error('[ProfileSetup] Navigation failed:', err);
    }
  };

  const handleDashboard = () => {
    if (!userProfile) { setModalOpen(true); return; }
    if (userProfile.role === 'teacher') return navigate('/teacher-dashboard');
    if (userProfile.role === 'principal') return navigate('/principal-dashboard');
    navigate('/exam');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user-session');
      setStudentInfo?.(null);
    } catch (err) {
      console.error('[PasswordPage] Sign out error:', err);
    }
  };

  return (
    <>
      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAuthSuccess}
        setStudentInfo={setStudentInfo}
        onNeedsSetup={(uid, email) => {
          setNewUserUid(uid);
          setNewUserEmail(email);
          setSetupPending(true);
        }}
      />

      {setupPending && (
        <ProfileSetupWizard
          uid={newUserUid}
          email={newUserEmail}
          onComplete={handleSetupComplete}
        />
      )}

      <Navbar
        profile={userProfile}
        onOpenModal={() => setModalOpen(true)}
        onDashboard={handleDashboard}
        onSignOut={handleSignOut}
      />

      <div className="min-h-screen bg-[#0A0D14]">
        <Hero onOpenModal={() => setModalOpen(true)} />
        <FeatureStrip />
        <VideoSection onOpenModal={() => setModalOpen(true)} />
        <Demosection />
        <HowItWorks />
        <CTA />
        <ThreePaths onOpenModal={() => setModalOpen(true)} />
        <Mission onOpenModal={() => setModalOpen(true)} />
        <Footer />
      </div>
    </>
  );
}
