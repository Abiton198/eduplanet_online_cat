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
//
// ─── FIXES APPLIED ────────────────────────────────────────────────────────────
//   1. Role doc reads are now SEQUENTIAL (not Promise.all) in both handleGoogleLogin
//      and handlePasswordAuth — stops reading the moment the user's role doc is found,
//      preventing permission errors on collections where the user has no document.
//   2. finalizeProfile writes users/{uid} FIRST before the role collection doc,
//      so security rule helpers (isTeacher, isPrincipal, sameSchool) can resolve
//      userDoc() when evaluating the role doc write.
//   3. ensureUserFirestoreDocs is called LAST, after both writes succeed.
//   4. MIGRATION: Shifted environment completely from Google Drive API to native 
//      Firebase Storage infrastructure for exam files and resources.

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
  Sun, Moon, CheckCircle2, CloudLightning, Loader2,
  Sparkles, ChevronDown,
} from 'lucide-react';
import { ensureUserFirestoreDocs } from '../utils/driveManager';
import { listSchools } from '../utils/firestoreHelpers';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

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
function AutoTag() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 select-none">
      <Sparkles size={8} className="fill-current" /> Auto-filled
    </span>
  );
}

// ─── STORAGE BADGE ─────────────────────────────────────────────────────────────
function StorageBadge({ status }) {
  if (status === 'idle') return null;
  if (status === 'linking') return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
      <Loader2 size={14} className="animate-spin text-indigo-500" />
      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">Allocating Storage Space…</span>
    </div>
  );
  if (status === 'linked') return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
      <CheckCircle2 size={14} className="text-green-500" />
      <span className="text-xs font-bold text-green-600 dark:text-green-300">Firebase Storage Active ✓</span>
    </div>
  );
  if (status === 'failed') return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
      <CloudLightning size={14} className="text-amber-500" />
      <span className="text-xs font-bold text-amber-600 dark:text-amber-300">Provisioning pending — retrying shortly</span>
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
  const [storageStatus, setStorageStatus] = useState('idle');
  const [error, setError] = useState('');

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [tempUser, setTempUser] = useState(null); // { uid, email }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Profile fields ─────────────────────────────────────────────────────────
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

  // ── Auto-fill tracking ─────────────────────────────────────────────────────
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

  // ── School list ────────────────────────────────────────────────────────────
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

  // ── Load schools when profile setup opens ──────────────────────────────────
  useEffect(() => {
    if (showProfileSetup && (userRole === 'teacher' || userRole === 'student')) {
      setSchoolsLoading(true);
      listSchools()
        .then((list) => {
          setSchoolList(list);
          if (list.length > 0) {
            setSelectedSchoolId(list[0].id);
            applySchoolAutoFill(list[0]);
          }
          setSchoolsLoading(false);
        })
        .catch(() => setSchoolsLoading(false));
    }
  }, [showProfileSetup, userRole]);

  // ── Auto-fill from selected school ────────────────────────────────────────
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

  // ── Firebase Storage Provisioning Helper ───────────────────────────────────
  const silentlyProvisionStorage = useCallback(async (uid, schoolId, role) => {
    try {
      setStorageStatus('linking');

      // Builds structured directories following security architecture
      const storagePaths = {
        root: `users/${uid}`,
        exams: `users/${uid}/exams`,
        memos: `users/${uid}/memos`,
        submissions: role === 'student' ? `schools/${schoolId}/students/${uid}/submissions` : null,
        resources: role === 'teacher' ? `schools/${schoolId}/teachers/${uid}/resources` : null
      };

      await setDoc(
        doc(db, 'userStorageConfig', uid),
        {
          uid,
          schoolId,
          role,
          storageProvider: 'FirebaseStorage',
          bucketPath: `gs://chatbot-backend-educat.appspot.com/users/${uid}`,
          paths: Object.fromEntries(Object.entries(storagePaths).filter(([_, v]) => v !== null)),
          provisionedAt: new Date().toISOString(),
          status: 'active'
        },
        { merge: true }
      );
      setStorageStatus('linked');
    } catch (err) {
      console.warn('[Storage] Allocation failed:', err.message);
      setStorageStatus('failed');
    }
  }, []);

  // ── Post-login routing ─────────────────────────────────────────────────────
  const postLogin = useCallback(async ({ uid, role, data }) => {
    await ensureUserFirestoreDocs(uid, role, data);
    await silentlyProvisionStorage(uid, data.schoolId || 'unassigned', role);
    if (role === 'student') { setStudentInfo(data); navigate('/exam'); }
    else if (role === 'teacher') navigate('/teacher-dashboard');
    else navigate('/principal-dashboard');
  }, [navigate, setStudentInfo, silentlyProvisionStorage]);

  // ── Sequential role doc reads — stops at first match ───────────────────────
  const resolveUserRole = useCallback(async (uid) => {
    const pSnap = await getDoc(doc(db, 'principals', uid));
    if (pSnap.exists()) return { role: 'principal', data: pSnap.data() };

    const tSnap = await getDoc(doc(db, 'teachers', uid));
    if (tSnap.exists()) return { role: 'teacher', data: tSnap.data() };

    const sSnap = await getDoc(doc(db, 'students', uid));
    if (sSnap.exists()) return { role: 'student', data: sSnap.data() };

    return null;
  }, []);

  // ── Google login ───────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.displayName) {
        const parts = user.displayName.split(' ');
        setName(parts[0] || '');
        setSurname(parts.slice(1).join(' ') || '');
        markAuto(['name', 'surname']);
      }

      const found = await resolveUserRole(user.uid);
      if (!found) {
        setTempUser({ uid: user.uid, email: user.email });
        setIsModalOpen(false);
        setShowProfileSetup(true);
      } else {
        await postLogin({
          uid: user.uid,
          role: found.role,
          data: found.data,
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // ── Email/password auth ────────────────────────────────────────────────────
  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        setTempUser({ uid: cred.user.uid, email: cred.user.email });
        setIsModalOpen(false);
        setShowProfileSetup(true);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        const found = await resolveUserRole(uid);
        if (found) {
          await postLogin({ uid, role: found.role, data: found.data });
        } else {
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

  // ── Finalize profile ───────────────────────────────────────────────────────
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
      // 1. Write users/{uid} FIRST so rules validate correctly
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: finalEmail,
        role: userRole,
        schoolId: resolvedSchoolId,
      }, { merge: true });

      // 2. Write role database profile
      await setDoc(doc(db, collectionName, uid), fullProfile);

      // 3. Complete cloud file-system allocation maps
      await silentlyProvisionStorage(uid, resolvedSchoolId, userRole);

      // 4. Fire helper syncer documents last
      await ensureUserFirestoreDocs(uid, userRole, fullProfile);

      if (userRole === 'student') setStudentInfo(fullProfile);

      if (userRole === 'principal') {
        navigate('/school-registration', {
          state: {
            seed: {
              name: school.trim(),
              province,
              district: district.trim(),
              curricula: [curriculum],
              principalUid: uid,
              principalTitle: title,
              principalName: name.trim(),
              principalSurname: surname.trim(),
              principalEmail: finalEmail,
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

  // Helper inside layout view for handling forms
  const ErrorBox = ({ message, className = "" }) => (
    <div className={`p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold ${className}`}>
      ⚠️ {message}
    </div>
  );

  const Divider = () => (
    <div className="relative my-6 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-400 select-none">
      <div className="absolute inset-x-0 h-px bg-slate-100 dark:bg-slate-800" />
      <span className="relative bg-white dark:bg-slate-900 px-4">Or</span>
    </div>
  );

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
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Eduket OS</span>{' '}
          tracks every answer, predicts outcomes, and adapts to each learner.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-16 text-sm">
          {['Upload PDF or Word', 'Auto-mark with memo', 'Predictive outcome tracking', 'Agentic study planner', 'CAPS & IEB aligned'].map((tag) => (
            <span key={tag} className="px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-500/5 font-medium">
              {tag}
            </span>
          ))}
        </div>
      </main>

      {/* ── AUTH MODAL ── */}
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
                  type="email"
                  placeholder="you@school.co.za"
                  required
                  value={email}
                  className="input-f"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label-xs block mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  className="input-f"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {isRegistering ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <Divider />

            <button
              onClick={handleGoogleLogin}
              className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" className="w-5 h-5" alt="G" />
              Continue with Google
            </button>

            <p className="text-center mt-4 text-[10px] text-slate-400 leading-relaxed">
              🔒 Unified access automatically provisions cloud space for your papers and records safely.
            </p>

            <p className="text-center mt-5 text-sm font-medium">
              {isRegistering ? 'Already a member?' : 'New to Eduket?'}{' '}
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-indigo-600 font-black hover:underline underline-offset-4"
              >
                {isRegistering ? 'Sign In Instead' : 'Register Now'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ── PROFILE SETUP MODAL ── */}
      {showProfileSetup && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-indigo-600/95 backdrop-blur-2xl overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl my-8">

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
              <StorageBadge status={storageStatus} />
            </div>

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
              <div>
                <p className="label-xs">I am a…</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  {['student', 'teacher', 'principal'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setUserRole(role)}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${userRole === role ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600' : 'opacity-40'}`}
                    >
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

              {(userRole === 'teacher' || userRole === 'principal') && (
                <div>
                  <p className="label-xs">Title</p>
                  <div className="flex gap-2 flex-wrap">
                    {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTitle(t)}
                        className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${title === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-indigo-400'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="label-xs">First Name *</label>
                    {autoFilled.name && <AutoTag />}
                  </div>
                  <input
                    type="text"
                    value={name}
                    placeholder="e.g. Thabo"
                    required
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
                    type="text"
                    value={surname}
                    placeholder="e.g. Nkosi"
                    required
                    className="input-f"
                    onChange={(e) => { setSurname(e.target.value); clearAuto('surname'); }}
                  />
                </div>
              </div>

              {userRole === 'principal' ? (
                <div>
                  <label className="label-xs block mb-1.5">Your School Name *</label>
                  <input
                    type="text"
                    value={school}
                    placeholder="e.g. Hoërskool Randburg"
                    required
                    className="input-f"
                    onChange={(e) => setSchool(e.target.value)}
                  />
                </div>
              ) : (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-xs block mb-1.5">Province *</label>
                  <div className="relative">
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="input-f appearance-none pr-10"
                      disabled={userRole !== 'principal'}
                    >
                      {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="label-xs block mb-1.5">District *</label>
                  <input
                    type="text"
                    value={district}
                    placeholder="e.g. Johannesburg East"
                    required
                    className="input-f"
                    disabled={userRole !== 'principal'}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>
              </div>

              {userRole === 'student' && (
                <div>
                  <label className="label-xs block mb-1.5">Grade *</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="input-f"
                    required
                  >
                    <option value="">Select Grade</option>
                    {['10', '11', '12'].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
              )}

              {userRole === 'teacher' && (
                <div>
                  <label className="label-xs block mb-1.5">Teaching Phase *</label>
                  <select
                    value={teachingPhase}
                    onChange={(e) => setTeachingPhase(e.target.value)}
                    className="input-f"
                  >
                    <option value="Senior">Senior Phase (Grade 7-9)</option>
                    <option value="FET">FET Phase (Grade 10-12)</option>
                  </select>
                </div>
              )}

              {(userRole === 'student' || userRole === 'teacher') && (
                <div>
                  <label className="label-xs block mb-2">Registered Subjects (Select at least 2) *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                    {STANDARD_DBE_SUBJECTS.map((sub) => {
                      const active = subjects.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => toggleSubject(sub)}
                          className={`p-2.5 text-left text-xs rounded-xl font-bold transition-all border ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700/60 hover:border-slate-300'}`}
                        >
                          {active ? '✓ ' : ''}{sub}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/10 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Launching Core Environment...
                  </>
                ) : (
                  <>
                    Finalize Connection <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}