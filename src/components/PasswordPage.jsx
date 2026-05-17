// ─── AuthPage.jsx ─────────────────────────────────────────────────────────────
// Auto-fill strategy:
//   • Google sign-in  → name, surname pre-filled from displayName
//   • Email sign-up   → email pre-filled throughout
//   • Role = teacher/student + school selection
//                     → curriculum, province, district auto-inherited from school doc
//   • Role = principal → on finalizeProfile, all collected data is forwarded
//                        via navigation state to SchoolRegistration so those fields
//                        never need re-entry (school name, province, district,
//                        curriculum, principal title/name)
//   • Any field that was auto-filled is visually tagged with a ✦ "Auto-filled" chip
//     and is still editable.
//
// SchoolRegistration.jsx should read `location.state.seed` to pre-populate its form.

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Sun, Moon, CheckCircle2, HardDrive, Loader2, School,
  Sparkles, ChevronDown,
} from 'lucide-react';
import { ensureUserFirestoreDocs, ensureAppFolders, hasDrivePermission } from '../utils/driveManager';
import { listSchools } from '../utils/firestoreHelpers';

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

// ─── AUTO-FILL TAG ────────────────────────────────────────────────────────────
// Shown next to any field that was populated automatically.
function AutoTag() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 select-none">
      <Sparkles size={8} className="fill-current" /> Auto-filled
    </span>
  );
}

// ─── DRIVE BADGE ─────────────────────────────────────────────────────────────
function DriveBadge({ status }) {
  if (status === 'idle') return null;
  if (status === 'linking') return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
      <Loader2 size={14} className="animate-spin text-indigo-500" />
      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">Linking Google Drive…</span>
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

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driveStatus, setDriveStatus] = useState('idle');
  const [error, setError] = useState('');

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [tempUser, setTempUser] = useState(null);  // { uid, email, driveToken }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Profile fields ─────────────────────────────────────────────────────────
  const [userRole, setUserRole] = useState('student');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [title, setTitle] = useState('Mr');
  const [province, setProvince] = useState('Gauteng');
  const [district, setDistrict] = useState('');
  const [school, setSchool] = useState('');           // principal: manual entry
  const [curriculum, setCurriculum] = useState('CAPS');
  const [grade, setGrade] = useState('');
  const [teachingPhase, setTeachingPhase] = useState('FET');
  const [subjects, setSubjects] = useState([]);

  // ── Auto-fill tracking — which fields were set programmatically ────────────
  // Key: field name → true/false
  const [autoFilled, setAutoFilled] = useState({});
  const markAuto = useCallback((fields) => {
    setAutoFilled((prev) => {
      const next = { ...prev };
      fields.forEach((f) => { next[f] = true; });
      return next;
    });
  }, []);
  const clearAuto = useCallback((field) => {
    setAutoFilled((prev) => ({ ...prev, [field]: false }));
  }, []);

  // ── School list (teacher/student) ──────────────────────────────────────────
  const [schoolList, setSchoolList] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // ── Theme ──────────────────────────────────────────────────────────────────
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

  // ── Load school list when teacher/student profile setup opens ──────────────
  useEffect(() => {
    if (showProfileSetup && (userRole === 'teacher' || userRole === 'student')) {
      setSchoolsLoading(true);
      listSchools().then((list) => {
        setSchoolList(list);
        if (list.length > 0) {
          const firstId = list[0].id;
          setSelectedSchoolId(firstId);
          // Auto-fill location fields from the first school in the list
          applySchoolAutoFill(list[0]);
        }
        setSchoolsLoading(false);
      }).catch(() => setSchoolsLoading(false));
    }
  }, [showProfileSetup, userRole]);

  // ── Auto-fill location/curriculum from selected school ────────────────────
  const applySchoolAutoFill = useCallback((schoolDoc) => {
    if (!schoolDoc) return;
    const filled = [];
    if (schoolDoc.province) { setProvince(schoolDoc.province); filled.push('province'); }
    if (schoolDoc.district) { setDistrict(schoolDoc.district); filled.push('district'); }
    if (schoolDoc.curricula?.[0]) { setCurriculum(schoolDoc.curricula[0]); filled.push('curriculum'); }
    if (filled.length) markAuto(filled);
  }, [markAuto]);

  const handleSchoolSelect = useCallback((schoolId) => {
    setSelectedSchoolId(schoolId);
    const found = schoolList.find((s) => s.id === schoolId);
    if (found) applySchoolAutoFill(found);
  }, [schoolList, applySchoolAutoFill]);

  // ── Drive helpers ──────────────────────────────────────────────────────────
  const silentlyLinkDrive = useCallback(async (uid, freshToken = null) => {
    try {
      const alreadyLinked = await hasDrivePermission(uid);
      if (alreadyLinked) { setDriveStatus('linked'); return; }

      const token =
        freshToken ||
        (sessionStorage.getItem('drive_token_expiry') > Date.now()
          ? sessionStorage.getItem('drive_access_token')
          : null);

      if (!token) { setDriveStatus('idle'); return; }

      setDriveStatus('linking');
      const folderIds = await ensureAppFolders(token);
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

  // ── Post-login routing ─────────────────────────────────────────────────────
  const postLogin = useCallback(async ({ uid, role, data, token = null }) => {
    await ensureUserFirestoreDocs(uid, role, data);
    silentlyLinkDrive(uid, token);
    if (role === 'student') { setStudentInfo(data); navigate('/exam'); }
    else if (role === 'teacher') navigate('/teacher-dashboard');
    else navigate('/principal-dashboard');
  }, [navigate, setStudentInfo, silentlyLinkDrive]);

  // ── Google login ───────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError('');
    try {
      const driveProvider = new GoogleAuthProvider();
      driveProvider.addScope(DRIVE_SCOPE);
      const result = await signInWithPopup(auth, driveProvider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken ?? null;

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
        // New Google user — pre-fill name/surname from Google profile
        const parts = (user.displayName || '').trim().split(/\s+/);
        const autoName = parts[0] || '';
        const autoSurname = parts.slice(1).join(' ') || '';
        setName(autoName);
        setSurname(autoSurname);

        const autoFields = [];
        if (autoName) autoFields.push('name');
        if (autoSurname) autoFields.push('surname');
        if (autoFields.length) markAuto(autoFields);

        setTempUser({ uid: user.uid, email: user.email, driveToken: token });
        setIsModalOpen(false);
        setShowProfileSetup(true);
      }
    } catch (err) {
      console.error(err);
      setError('Authentication failed. Please try again.');
    }
  };

  // ── Email/password auth ────────────────────────────────────────────────────
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
        if (pSnap.exists()) await postLogin({ uid, role: 'principal', data: pSnap.data() });
        else if (tSnap.exists()) await postLogin({ uid, role: 'teacher', data: tSnap.data() });
        else if (sSnap.exists()) await postLogin({ uid, role: 'student', data: sSnap.data() });
        else {
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

  // ── Finalize profile ──────────────────────────────────────────────────────
  const finalizeProfile = async (e) => {
    if (e) e.preventDefault();

    if (!name.trim()) { setError('First name is required.'); return; }
    if (userRole === 'principal' && !school.trim()) { setError('School name is required.'); return; }
    if ((userRole === 'teacher' || userRole === 'student') && !selectedSchoolId) {
      setError('Please select your school.'); return;
    }
    if (userRole === 'student' && !grade) { setError('Please select your grade.'); return; }
    if (userRole === 'student' && subjects.length < 2) {
      setError('Please select at least 2 subjects.'); return;
    }

    setIsSubmitting(true);
    setError('');

    const uid = tempUser?.uid || auth.currentUser?.uid;
    const finalEmail = tempUser?.email || email;
    const driveToken = tempUser?.driveToken || sessionStorage.getItem('drive_access_token');

    const resolvedSchoolId = userRole === 'principal' ? uid : selectedSchoolId;
    const selectedSchoolDoc = schoolList.find((s) => s.id === selectedSchoolId);
    const resolvedSchool = userRole === 'principal'
      ? school.trim()
      : selectedSchoolDoc?.name || '';
    const resolvedCurriculum = userRole === 'principal'
      ? curriculum
      : (selectedSchoolDoc?.curricula?.[0] || curriculum);
    const resolvedProvince = userRole === 'principal'
      ? province
      : (selectedSchoolDoc?.province || province);
    const resolvedDistrict = userRole === 'principal'
      ? district.trim()
      : (selectedSchoolDoc?.district || district.trim());

    const baseProfile = {
      uid,
      name: name.trim(),
      surname: surname.trim(),
      email: finalEmail,
      school: resolvedSchool,
      schoolId: resolvedSchoolId,
      province: resolvedProvince,
      district: resolvedDistrict,
      role: userRole,
      curriculum: resolvedCurriculum,
      createdAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    };

    const roleData =
      userRole === 'principal' ? { title, department: 'Administration' } :
        userRole === 'teacher' ? { title, teachingPhase, subjects } :
          { grade, subjects };

    const fullProfile = { ...baseProfile, ...roleData };
    const collectionName =
      userRole === 'principal' ? 'principals' :
        userRole === 'teacher' ? 'teachers' : 'students';

    try {
      await setDoc(doc(db, collectionName, uid), fullProfile);
      await setDoc(doc(db, 'users', uid), {
        uid, email: finalEmail, role: userRole, schoolId: resolvedSchoolId,
      }, { merge: true });
      await ensureUserFirestoreDocs(uid, userRole, fullProfile);

      if (driveToken) {
        setDriveStatus('linking');
        silentlyLinkDrive(uid, driveToken);
      }

      if (userRole === 'student') setStudentInfo(fullProfile);

      if (userRole === 'principal') {
        // ── KEY: pass everything already collected as seed state ──────────
        // SchoolRegistration reads `location.state.seed` and pre-populates its form.
        navigate('/school-registration', {
          state: {
            seed: {
              // School basics — already typed in this form
              name: school.trim(),
              province,
              district: district.trim(),
              curricula: [curriculum],

              // Principal identity — already collected
              principalUid: uid,
              principalTitle: title,
              principalName: name.trim(),
              principalSurname: surname.trim(),
              principalEmail: finalEmail,

              // Profile snapshot so SchoolRegistration can write it back
              principalProfile: fullProfile,
            },
          },
        });
      } else {
        navigate(userRole === 'teacher' ? '/teacher-dashboard' : '/exam');
      }
    } catch (err) {
      console.error(err);
      setError('Initialization failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Subject toggle ─────────────────────────────────────────────────────────
  const toggleSubject = (s) => {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen transition-all duration-700 relative overflow-hidden ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* ── Header ── */}
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

      {/* ── Hero ── */}
      <main className="relative z-10 flex flex-col items-center pt-24 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase border border-indigo-200 dark:border-indigo-800 mb-8 animate-bounce">
          <Zap className="w-3 h-3 fill-current" /> Agentic AI v3.0 Live
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[1.1]">
          Know where every student<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-rose-500">
            stands, before the exam.
          </span>
        </h1>
        <p className="text-xl md:text-2xl opacity-70 max-w-3xl mb-10 leading-relaxed font-medium mx-auto">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Eduket OS</span>{" "}
          tracks every answer, predicts outcomes, and adapts to each learner.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-16 text-sm">
          {["Upload PDF or Word", "Auto-mark with memo", "Predictive outcome tracking", "Agentic study planner", "CAPS & IEB aligned"].map((tag) => (
            <span key={tag} className="px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-500/5 font-medium">
              {tag}
            </span>
          ))}
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          AUTH MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && !showProfileSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border border-slate-200 dark:border-slate-800">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500">
              <X size={24} />
            </button>

            <h2 className="text-3xl font-black mb-2">{isRegistering ? 'Join Us' : 'Welcome'}</h2>
            <p className="text-slate-500 text-sm mb-8">
              {isRegistering
                ? 'Create an account to start your AI journey.'
                : "Access South Africa's most powerful learning OS."}
            </p>

            {error && <ErrorBox message={error} />}

            <form onSubmit={handlePasswordAuth} className="space-y-4">
              <div>
                <label className="label-xs block mb-1.5">Email Address</label>
                <input
                  type="email" placeholder="you@school.co.za" required
                  value={email}
                  className="input-f"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label-xs block mb-1.5">Password</label>
                <input
                  type="password" placeholder="••••••••" required
                  className="input-f"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-widest text-xs">
                {isRegistering ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <Divider />

            <button onClick={handleGoogleLogin}
              className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm">
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" className="w-5 h-5" alt="G" />
              Continue with Google
            </button>

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

      {/* ══════════════════════════════════════════════════════════════════════
          PROFILE SETUP MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showProfileSetup && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-indigo-600/95 backdrop-blur-2xl overflow-y-auto">
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
              <DriveBadge status={driveStatus} />
            </div>

            {/* Auto-fill info bar */}
            {Object.values(autoFilled).some(Boolean) && (
              <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                <Sparkles size={14} className="text-indigo-500 flex-shrink-0" />
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  Some fields were auto-filled from your account or school — review and edit as needed.
                </p>
              </div>
            )}

            {error && <ErrorBox message={error} className="mb-5" />}

            <form onSubmit={finalizeProfile} className="space-y-6">

              {/* ── Role selector ── */}
              <div>
                <p className="label-xs">I am a…</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  {['student', 'teacher', 'principal'].map((role) => (
                    <button key={role} type="button" onClick={() => setUserRole(role)}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${userRole === role ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600' : 'opacity-40'}`}>
                      {role === 'student' ? '🎓 Student' : role === 'teacher' ? '📚 Teacher' : '🏫 Principal'}
                    </button>
                  ))}
                </div>
                {userRole === 'principal' && (
                  <p className="mt-2 text-[10px] text-indigo-500 font-bold">
                    ℹ️ As a principal, your details will be carried forward — no need to re-enter in the next step.
                  </p>
                )}
              </div>

              {/* ── Title (staff only) ── */}
              {(userRole === 'teacher' || userRole === 'principal') && (
                <div>
                  <p className="label-xs">Title</p>
                  <div className="flex gap-2 flex-wrap">
                    {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'].map((t) => (
                      <button key={t} type="button" onClick={() => setTitle(t)}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${title === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-indigo-400'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Name + Surname ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="label-xs">First Name *</label>
                    {autoFilled.name && <AutoTag />}
                  </div>
                  <input
                    type="text" value={name} placeholder="e.g. Thabo" required
                    className="input-f"
                    onChange={(e) => { setName(e.target.value); clearAuto('name'); }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="label-xs">Surname *</label>
                    {autoFilled.surname && <AutoTag />}
                  </div>
                  <input
                    type="text" value={surname} placeholder="e.g. Nkosi" required
                    className="input-f"
                    onChange={(e) => { setSurname(e.target.value); clearAuto('surname'); }}
                  />
                </div>
              </div>

              {/* ── School selection ── */}
              {userRole === 'principal' ? (
                /* Principal: type school name manually */
                <div>
                  <label className="label-xs block mb-1.5">Your School Name *</label>
                  <input
                    type="text" value={school}
                    placeholder="e.g. Hoërskool Randburg" required
                    className="input-f"
                    onChange={(e) => setSchool(e.target.value)}
                  />
                </div>
              ) : (
                /* Teacher / Student: pick from registered schools */
                <div>
                  <label className="label-xs block mb-1.5">Select Your School *</label>
                  {schoolsLoading ? (
                    <div className="input-f flex items-center gap-2 text-slate-400">
                      <Loader2 size={14} className="animate-spin" /> Loading schools…
                    </div>
                  ) : schoolList.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold">
                      No schools registered yet. Ask your principal to register the school first.
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedSchoolId}
                        onChange={(e) => handleSchoolSelect(e.target.value)}
                        className="input-f appearance-none pr-10"
                      >
                        {schoolList.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} — {s.province}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              )}

              {/* ── Province + District (principal only; auto-filled for teacher/student) ── */}
              {userRole === 'principal' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-xs block mb-1.5">Province *</label>
                    <div className="relative">
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="input-f appearance-none pr-10"
                      >
                        {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="label-xs block mb-1.5">District *</label>
                    <input
                      type="text" value={district}
                      placeholder="e.g. Johannesburg East" required
                      className="input-f"
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>
                </div>
              ) : (province || district) ? (
                /* Show read-only auto-filled location for teacher/student */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {province && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <label className="label-xs">Province</label>
                        {autoFilled.province && <AutoTag />}
                      </div>
                      <input
                        type="text" value={province} readOnly
                        className="input-f bg-slate-50 dark:bg-slate-800/50 cursor-default"
                      />
                    </div>
                  )}
                  {district && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <label className="label-xs">District</label>
                        {autoFilled.district && <AutoTag />}
                      </div>
                      <input
                        type="text" value={district} readOnly
                        className="input-f bg-slate-50 dark:bg-slate-800/50 cursor-default"
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {/* ── Curriculum (principal only; teachers/students inherit from school) ── */}
              {userRole === 'principal' && (
                <div>
                  <label className="label-xs block mb-1.5">Curriculum</label>
                  <div className="flex gap-2">
                    {['CAPS', 'IEB', 'Both'].map((c) => (
                      <button key={c} type="button" onClick={() => setCurriculum(c)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${curriculum === c ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-400'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Inherited curriculum badge for teacher/student ── */}
              {(userRole === 'teacher' || userRole === 'student') && curriculum && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-500">Curriculum:</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">{curriculum}</span>
                  {autoFilled.curriculum && <AutoTag />}
                  <span className="ml-auto text-[10px] text-slate-400">Inherited from school</span>
                </div>
              )}

              {/* ── Grade (students) ── */}
              {userRole === 'student' && (
                <div>
                  <label className="label-xs block mb-1.5">Grade *</label>
                  <div className="relative">
                    <select value={grade} onChange={(e) => setGrade(e.target.value)} required className="input-f appearance-none pr-10">
                      <option value="" disabled>Select your grade</option>
                      {['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* ── Teaching Phase (teachers) ── */}
              {userRole === 'teacher' && (
                <div>
                  <label className="label-xs block mb-2">DBE Teaching Phase *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'Foundation', label: 'Foundation Phase', grades: 'Grades R–3' },
                      { value: 'Intermediate', label: 'Intermediate Phase', grades: 'Grades 4–6' },
                      { value: 'Senior', label: 'Senior Phase', grades: 'Grades 7–9' },
                      { value: 'FET', label: 'FET Phase', grades: 'Grades 10–12' },
                    ].map((ph) => (
                      <button key={ph.value} type="button" onClick={() => setTeachingPhase(ph.value)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all ${teachingPhase === ph.value ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-300'}`}>
                        <p className="font-black text-xs text-slate-800 dark:text-white leading-tight">{ph.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{ph.grades}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Subjects (students + teachers) ── */}
              {(userRole === 'student' || userRole === 'teacher') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label-xs">
                      {userRole === 'student' ? 'My Subjects *' : 'Subjects I Teach *'}
                    </label>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${subjects.length >= (userRole === 'student' ? 2 : 1) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {subjects.length} selected{userRole === 'student' ? ' / min 2' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-1">
                    {STANDARD_DBE_SUBJECTS.map((s) => {
                      const active = subjects.includes(s);
                      return (
                        <button key={s} type="button" onClick={() => toggleSubject(s)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'}`}>
                          {active && '✓ '}{s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Drive status ── */}
              {driveStatus !== 'idle' && (
                <div className="pt-1"><DriveBadge status={driveStatus} /></div>
              )}

              {/* ── Profile summary (what will carry forward) ── */}
              <ProfileSummary
                role={userRole}
                name={name} surname={surname} title={title}
                email={tempUser?.email || email}
                school={userRole === 'principal' ? school : (schoolList.find(s => s.id === selectedSchoolId)?.name || '')}
                province={province} district={district} curriculum={curriculum}
              />

              {/* ── Submit ── */}
              <button type="submit" disabled={isSubmitting}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? (
                  <><Loader2 size={20} className="animate-spin" /> Setting up dashboard…</>
                ) : (
                  <>{userRole === 'principal' ? 'CONTINUE TO SCHOOL SETUP →' : 'START DASHBOARD'} {userRole !== 'principal' && <ArrowRight />}</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .label-xs {
          font-size: 10px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .input-f {
          width: 100%;
          padding: 14px 16px;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 14px;
          outline: none;
          color: #0f172a;
          transition: border-color 0.2s;
        }
        .dark .input-f {
          background: #1e293b;
          border-color: #334155;
          color: white;
        }
        .input-f:focus { border-color: #4f46e5; }
      `}</style>
    </div>
  );
}

// ─── PROFILE SUMMARY ──────────────────────────────────────────────────────────
// Collapsed review card shown at the bottom of the form so users can verify
// everything before submitting.
function ProfileSummary({ role, name, surname, title, email, school, province, district, curriculum }) {
  const [open, setOpen] = useState(false);
  const fields = [
    name && { label: 'Name', value: `${(role !== 'student' ? title + ' ' : '')}${name} ${surname}`.trim() },
    email && { label: 'Email', value: email },
    school && { label: 'School', value: school },
    province && { label: 'Province', value: province },
    district && { label: 'District', value: district },
    curriculum && { label: 'Curriculum', value: curriculum },
  ].filter(Boolean);

  if (fields.length < 2) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <span>📋 Review what will be saved</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          {fields.map(({ label, value }) => (
            <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-xs font-bold text-slate-800 dark:text-white mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SMALL SHARED COMPONENTS ──────────────────────────────────────────────────
function ErrorBox({ message, className = '' }) {
  return (
    <div className={`p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:border-red-800 ${className}`}>
      {message}
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-8">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t dark:border-slate-800" /></div>
      <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
        <span className="bg-white dark:bg-slate-900 px-4 text-slate-400">or</span>
      </div>
    </div>
  );
}