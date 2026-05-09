import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import {
  X, Zap, BrainCircuit, UserCheck, ArrowRight,
  Sun, Moon, CheckCircle2, HardDrive, Loader2,
} from 'lucide-react';
import { ensureUserFirestoreDocs, ensureAppFolders, hasDrivePermission } from '../utils/driveManager';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const SA_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
];

const STANDARD_DBE_SUBJECTS = [
  "CAT", "IT", "Mathematics", "Mathematical Literacy",
  "English HL", "English FAL", "Physical Sciences", "Life Sciences",
  "Accounting", "Business Studies", "Economics", "History", "Geography",
  "Life Orientation", "Consumer Studies", "Afrikaans HL", "Afrikaans FAL",
  "isiXhosa HL", "isiXhosa FAL", "isiZulu HL", "isiZulu FAL",
  "Sepedi HL", "Sepedi FAL", "Sesotho HL", "Sesotho FAL",
  "Setswana HL", "Setswana FAL", "siSwati HL", "siSwati FAL",
  "Tshivenda HL", "Tshivenda FAL", "Xitsonga HL", "Xitsonga FAL",
];

// ─── DRIVE BADGE ─────────────────────────────────────────────────────────────

function DriveBadge({ status }) {
  // status: 'idle' | 'linking' | 'linked' | 'failed'
  if (status === 'idle') return null;
  if (status === 'linking') return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
      <Loader2 size={14} className="animate-spin text-indigo-500" />
      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">Linking Google Drive...</span>
    </div>
  );
  if (status === 'linked') return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
      <CheckCircle2 size={14} className="text-green-500" />
      <span className="text-xs font-bold text-green-600 dark:text-green-300">Google Drive linked ✓</span>
    </div>
  );
  if (status === 'failed') return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
      <HardDrive size={14} className="text-amber-500" />
      <span className="text-xs font-bold text-amber-600 dark:text-amber-300">Drive link pending — will retry on next login</span>
    </div>
  );
  return null;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AuthPage({ setStudentInfo }) {
  const navigate = useNavigate();

  // UI states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driveStatus, setDriveStatus] = useState('idle'); // 'idle'|'linking'|'linked'|'failed'
  const [error, setError] = useState('');

  // Auth
  const [tempUser, setTempUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Profile fields
  const [userRole, setUserRole] = useState('student');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [title, setTitle] = useState('Mr');
  const [province, setProvince] = useState('Gauteng');
  const [district, setDistrict] = useState('');
  const [school, setSchool] = useState('');
  const [curriculum, setCurriculum] = useState('CAPS');
  const [grade, setGrade] = useState('');
  const [teachingPhase, setTeachingPhase] = useState('FET');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('eduplanet-theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('eduplanet-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  // ─── DRIVE SETUP ─────────────────────────────────────────────────────────
  /**
   * Silently sets up Google Drive for the user.
   * - Uses the token already in sessionStorage if present (Google login path).
   * - Checks Firestore first — if already linked, skips entirely.
   * - Never blocks navigation; failures are non-fatal.
   *
   * @param {string} uid
   * @param {string|null} freshToken  token from the current sign-in result, if available
   */
  const silentlyLinkDrive = useCallback(async (uid, freshToken = null) => {
    try {
      // 1. Already linked in Firestore? Skip entirely — show tick immediately.
      const alreadyLinked = await hasDrivePermission(uid);
      if (alreadyLinked) {
        setDriveStatus('linked');
        return;
      }

      // 2. Get a token — use the fresh one first, then fall back to session.
      const token =
        freshToken ||
        (sessionStorage.getItem('drive_token_expiry') > Date.now()
          ? sessionStorage.getItem('drive_access_token')
          : null);

      if (!token) {
        // No token available (email/password user who hasn't granted Drive yet).
        // Don't pop a new window unprompted — mark as pending, link on next
        // Google sign-in or when they visit the upload page.
        setDriveStatus('idle');
        return;
      }

      setDriveStatus('linking');

      // 3. Create/verify Drive folders.
      const folderIds = await ensureAppFolders(token);

      // 4. Persist to Firestore.
      await setDoc(
        doc(db, 'userDriveConfig', uid),
        {
          uid,
          drivePermissionGranted: true,
          driveScope: DRIVE_SCOPE,
          folderIds,
          permissionGrantedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setDriveStatus('linked');
    } catch (err) {
      console.warn('[Drive] Silent link failed:', err.message);
      setDriveStatus('failed');
    }
  }, []);

  // ─── NAVIGATE AFTER LOGIN ─────────────────────────────────────────────────
  /**
   * After any successful login, ensure Firestore docs exist,
   * attempt Drive link silently, then navigate.
   */
  const postLogin = useCallback(async ({ uid, role, data, token = null }) => {
    await ensureUserFirestoreDocs(uid, role, data);

    // Fire Drive setup in background — don't await, don't block navigation.
    silentlyLinkDrive(uid, token);

    if (role === 'student') {
      setStudentInfo(data);
      navigate('/exam');
    } else if (role === 'teacher') {
      navigate('/teacher-dashboard');
    } else {
      navigate('/principal-dashboard');
    }
  }, [navigate, setStudentInfo, silentlyLinkDrive]);

  // ─── GOOGLE LOGIN ─────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError('');
    try {
      const driveProvider = new GoogleAuthProvider();
      driveProvider.addScope(DRIVE_SCOPE);

      const result = await signInWithPopup(auth, driveProvider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken ?? null;

      // Store token so postLogin / silentlyLinkDrive can use it
      if (token) {
        sessionStorage.setItem('drive_access_token', token);
        sessionStorage.setItem('drive_token_expiry', String(Date.now() + 55 * 60 * 1000));
      }

      const [pSnap, tSnap, sSnap] = await Promise.all([
        getDoc(doc(db, 'principals', user.uid)),
        getDoc(doc(db, 'teachers', user.uid)),
        getDoc(doc(db, 'students', user.uid)),
      ]);

      if (pSnap.exists()) {
        await postLogin({ uid: user.uid, role: 'principal', data: pSnap.data(), token });
      } else if (tSnap.exists()) {
        await postLogin({ uid: user.uid, role: 'teacher', data: tSnap.data(), token });
      } else if (sSnap.exists()) {
        await postLogin({ uid: user.uid, role: 'student', data: sSnap.data(), token });
      } else {
        // New Google user — show profile setup
        setTempUser({ uid: user.uid, email: user.email, driveToken: token });
        setName(user.displayName?.split(' ')[0] || '');
        setSurname(user.displayName?.split(' ').slice(1).join(' ') || '');
        setIsModalOpen(false);
        setShowProfileSetup(true);
      }
    } catch (err) {
      console.error(err);
      setError('Authentication failed. Please try again.');
    }
  };

  // ─── EMAIL/PASSWORD AUTH ──────────────────────────────────────────────────
  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        setTempUser({ uid: cred.user.uid, email: cred.user.email, driveToken: null });
        setIsModalOpen(false);
        setShowProfileSetup(true);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        const [pSnap, tSnap, sSnap] = await Promise.all([
          getDoc(doc(db, 'principals', uid)),
          getDoc(doc(db, 'teachers', uid)),
          getDoc(doc(db, 'students', uid)),
        ]);

        if (pSnap.exists()) {
          await postLogin({ uid, role: 'principal', data: pSnap.data() });
        } else if (tSnap.exists()) {
          await postLogin({ uid, role: 'teacher', data: tSnap.data() });
        } else if (sSnap.exists()) {
          await postLogin({ uid, role: 'student', data: sSnap.data() });
        } else {
          // Has auth account but no profile — go to wizard
          setTempUser({ uid, email, driveToken: null });
          setIsModalOpen(false);
          setShowProfileSetup(true);
        }
      }
    } catch (err) {
      console.error(err);
      setError(isRegistering
        ? 'Could not create account. Email may already be in use.'
        : 'Invalid email or password.');
    }
  };

  // ─── FINALIZE PROFILE (new users only) ───────────────────────────────────
  const finalizeProfile = async (e) => {
    if (e) e.preventDefault();
    if (!school.trim() || !name.trim()) {
      setError('Please complete all required fields.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    const uid = tempUser?.uid || auth.currentUser?.uid;
    const finalEmail = tempUser?.email || email;
    const driveToken = tempUser?.driveToken || sessionStorage.getItem('drive_access_token');

    const baseProfile = {
      uid,
      name: name.trim(),
      surname: surname.trim(),
      email: finalEmail,
      school: school.trim(),
      province,
      district: district.trim(),
      role: userRole,
      curriculum,
      createdAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    };

    const roleData =
      userRole === 'principal' ? { title, department: 'Administration' } :
        userRole === 'teacher' ? { title, teachingPhase, subjects } :
      /* student */              { grade, subjects };

    const fullProfile = { ...baseProfile, ...roleData };
    const collectionName =
      userRole === 'principal' ? 'principals' :
        userRole === 'teacher' ? 'teachers' : 'students';

    try {
      // Save profile document
      await setDoc(doc(db, collectionName, uid), fullProfile);

      // Cross-reference in /users for quick role lookups
      await setDoc(doc(db, 'users', uid), { uid, email: finalEmail, role: userRole }, { merge: true });

      // Ensure all required Firestore sub-documents exist
      await ensureUserFirestoreDocs(uid, userRole, fullProfile);

      // Start Drive linking in background — non-blocking
      if (driveToken) {
        setDriveStatus('linking');
        silentlyLinkDrive(uid, driveToken); // intentionally not awaited
      }

      if (userRole === 'student') setStudentInfo(fullProfile);
      navigate(
        userRole === 'principal' ? '/principal-dashboard' :
          userRole === 'teacher' ? '/teacher-dashboard' : '/exam'
      );
    } catch (err) {
      console.error(err);
      setError('Initialization failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── SUBJECT TOGGLE ───────────────────────────────────────────────────────
  const toggleSubject = (s) => {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen transition-all duration-700 relative overflow-hidden ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-7xl mx-auto relative z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-2xl rotate-3 shadow-lg">
            <BrainCircuit className="text-white w-7 h-7" />
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">
            Eduket <span className="text-indigo-600 font-light not-italic">OS</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-3 rounded-xl bg-white dark:bg-slate-900 border dark:border-slate-800 transition-transform active:scale-95">
            {isDarkMode ? <Sun className="text-amber-400 w-5 h-5" /> : <Moon className="text-indigo-600 w-5 h-5" />}
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors">
            Enter Portal
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center pt-24 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase border border-indigo-200 dark:border-indigo-800 mb-8 animate-bounce">
          <Zap className="w-3 h-3 fill-current" /> Agentic AI v3.0 Live
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[1.1]">
          The Future of <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-rose-500">
            Self-Directed Learning.
          </span>
        </h1>
        <p className="text-xl md:text-2xl opacity-70 max-w-3xl mb-16 leading-relaxed font-medium mx-auto">
          Bridge the gap between curriculum and capability.
          <span className="text-indigo-600 dark:text-indigo-400 font-bold"> Eduket OS </span>
          empowers learners to master CAPS & IEB standards through an intelligent,
          agentic ecosystem designed for the modern South African classroom.
        </p>
      </main>

      {/* ── AUTH MODAL ──────────────────────────────────────────────────────── */}
      {isModalOpen && !showProfileSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500">
              <X size={24} />
            </button>

            <h2 className="text-3xl font-black mb-2">{isRegistering ? 'Join Us' : 'Welcome'}</h2>
            <p className="text-slate-500 text-sm mb-8">
              {isRegistering
                ? 'Create an account to start your AI journey.'
                : "Access South Africa's most powerful learning OS."}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordAuth} className="space-y-4">
              <input type="email" placeholder="Email Address" required
                className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 ring-indigo-500/20"
                onChange={(e) => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" required
                className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:ring-2 ring-indigo-500/20"
                onChange={(e) => setPassword(e.target.value)} />
              <button type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-widest text-xs">
                {isRegistering ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-white dark:bg-slate-900 px-4 text-slate-400">or</span>
              </div>
            </div>

            {/* Google — requests Drive scope automatically */}
            <button onClick={handleGoogleLogin}
              className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm">
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" className="w-5 h-5" alt="G" />
              Continue with Google
            </button>

            {/* Tiny Drive notice */}
            <p className="text-center mt-4 text-[10px] text-slate-400 leading-relaxed">
              🔒 Google sign-in automatically links your Drive for secure file storage.
            </p>

            <p className="text-center mt-5 text-sm font-medium">
              {isRegistering ? 'Already a member?' : 'New to Eduket?'}{' '}
              <button onClick={() => setIsRegistering(!isRegistering)}
                className="text-indigo-600 font-black hover:underline underline-offset-4">
                {isRegistering ? 'Sign In Instead' : 'Register Now'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── PROFILE SETUP MODAL ─────────────────────────────────────────────── */}
      {showProfileSetup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-indigo-600/95 backdrop-blur-2xl overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl my-8">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl">
                  <UserCheck className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Initialize Your OS</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    Complete your profile to access your dashboard
                  </p>
                </div>
              </div>

              {/* Drive status badge — shown once linking starts */}
              <DriveBadge status={driveStatus} />
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}

            <form onSubmit={finalizeProfile} className="space-y-5">

              {/* Role selector */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">I am a...</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  {['student', 'teacher', 'principal'].map((role) => (
                    <button key={role} type="button" onClick={() => setUserRole(role)}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${userRole === role ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600' : 'opacity-40'
                        }`}>
                      {role === 'student' ? '🎓 Student' : role === 'teacher' ? '📚 Teacher' : '🏫 Principal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title (staff only) */}
              {(userRole === 'teacher' || userRole === 'principal') && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Title</p>
                  <div className="flex gap-2 flex-wrap">
                    {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'].map((t) => (
                      <button key={t} type="button" onClick={() => setTitle(t)}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${title === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-indigo-400'
                          }`}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">First Name *</label>
                  <input type="text" value={name} placeholder="e.g. Thabo" required
                    className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                    onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Surname *</label>
                  <input type="text" value={surname} placeholder="e.g. Nkosi" required
                    className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                    onChange={(e) => setSurname(e.target.value)} />
                </div>
              </div>

              {/* Province + District */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Province *</label>
                  <select value={province} onChange={(e) => setProvince(e.target.value)}
                    className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold outline-none focus:border-indigo-500">
                    {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">District *</label>
                  <input type="text" value={district} placeholder="e.g. Johannesburg East" required
                    className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                    onChange={(e) => setDistrict(e.target.value)} />
                </div>
              </div>

              {/* School */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">School Name *</label>
                <input type="text" value={school} placeholder="e.g. Hoërskool Randburg" required
                  className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  onChange={(e) => setSchool(e.target.value)} />
              </div>

              {/* Curriculum */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Curriculum</label>
                <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold text-indigo-600 outline-none focus:border-indigo-500">
                  {['CAPS', 'IEB', 'SACAI', 'Cambridge'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Grade (students) */}
              {userRole === 'student' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Grade *</label>
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} required
                    className="w-full p-4 rounded-2xl border dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold outline-none focus:border-indigo-500">
                    <option value="" disabled>Select your grade</option>
                    {['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}

              {/* Teaching Phase (teachers) */}
              {userRole === 'teacher' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">DBE Teaching Phase *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'Foundation', label: 'Foundation Phase', grades: 'Grades R–3' },
                      { value: 'Intermediate', label: 'Intermediate Phase', grades: 'Grades 4–6' },
                      { value: 'Senior', label: 'Senior Phase', grades: 'Grades 7–9' },
                      { value: 'FET', label: 'FET Phase', grades: 'Grades 10–12' },
                    ].map((ph) => (
                      <button key={ph.value} type="button" onClick={() => setTeachingPhase(ph.value)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all ${teachingPhase === ph.value
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-100 dark:border-slate-700 hover:border-indigo-300'
                          }`}>
                        <p className="font-black text-xs text-slate-800 dark:text-white leading-tight">{ph.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{ph.grades}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects (students + teachers) */}
              {(userRole === 'student' || userRole === 'teacher') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {userRole === 'student' ? 'My Subjects *' : 'Subjects I Teach *'}
                    </label>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${subjects.length >= (userRole === 'student' ? 5 : 1)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                      }`}>
                      {subjects.length} selected{userRole === 'student' ? ' / min 5' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-1">
                    {STANDARD_DBE_SUBJECTS.map((s) => {
                      const active = subjects.includes(s);
                      return (
                        <button key={s} type="button" onClick={() => toggleSubject(s)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                            }`}>
                          {active && '✓ '}{s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drive status inside form (only shows when active) */}
              {driveStatus !== 'idle' && (
                <div className="pt-1">
                  <DriveBadge status={driveStatus} />
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isSubmitting}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? (
                  <><Loader2 size={20} className="animate-spin" /> Setting up dashboard...</>
                ) : (
                  <>START DASHBOARD <ArrowRight /></>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}