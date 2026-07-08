/**
 * App.jsx — Eduket OS Root Application
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 *   • Firebase Auth state (Google + email/password)
 *   • Role-based routing  (student / teacher / principal)
 *   • School context provisioning via SchoolProvider
 *   • Legacy student session compatibility (localStorage)
 *   • Render backend keep-alive pings
 *
 * Routing rules:
 *   /                 → redirects by role once profile loads; shows landing if unauthenticated
 *   /exam             → student only
 *   /results          → student only
 *   /teacher-dashboard  → teacher only
 *   /school-registration → principal only
 *   /principal-dashboard → principal only
 *   *                 → redirects to /
 *
 * Role guard: RequireRole blocks cross-role navigation and redirects to the
 * correct dashboard — a student who somehow reaches /teacher-dashboard is
 * immediately sent to /exam, not left on a blank or broken page.
 */

import { useState, useEffect } from 'react';
import {
  Routes, Route, Link, useLocation,
  Navigate, useNavigate,
} from 'react-router-dom';
import {
  Home, FileText, BarChart3, School,
  Sparkles, LayoutDashboard,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './utils/firebase';
import Swal from 'sweetalert2';

// ── Page / component imports ───────────────────────────────────────────────────
import PasswordPage from './components/PasswordPage';
import ExamPage from './components/ExamPage';
import ResultPage from './components/ResultPage';
import ExamRules from './utils/ExamRules';
import ProtectedRoute from './utils/ProtectedRoute';
import ReviewPage from './components/ReviewPage';
import TeacherDashboard from './components/TeacherDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import SchoolRegistration from './components/SchoolRegistration';
import PrincipalDashboard from './components/PrincipalDashboard';
import { SchoolProvider } from './utils/schoolContext';
import logo from './img/eduket.png';


// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Full-screen spinner — used while auth / profile is resolving. */
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ROLE-AWARE ROUTE GUARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RequireRole — protects a route so only the specified role can access it.
 *
 * Behaviour matrix:
 *   loading        → spinner (never flash a wrong dashboard)
 *   not signed in  → redirect to /
 *   wrong role     → redirect to the user's own dashboard
 *   profile not yet loaded (null) → spinner (Firestore read in flight)
 *   correct role   → render children
 *
 * This replaces the original RequireAuth which only checked authentication,
 * not role — allowing a student to reach /teacher-dashboard if they typed
 * the URL directly.
 */
function RequireRole({ children, user, loading, userProfile, role }) {
  // Still resolving Firebase Auth
  if (loading) return <LoadingSpinner />;

  // Not signed in — go to landing
  if (!user) return <Navigate to="/" replace />;

  // Signed in but Firestore profile not yet loaded — wait rather than redirect
  if (!userProfile) return <LoadingSpinner />;

  // Signed in but wrong role — redirect to their correct dashboard
  if (userProfile.role !== role) {
    if (userProfile.role === 'student') return <Navigate to="/exam" replace />;
    if (userProfile.role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
    if (userProfile.role === 'principal') return <Navigate to="/principal-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}


// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

function App() {

  // ── Auth + profile state ───────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);  // true until first auth event resolves

  // ── Legacy student state — kept for ExamPage / ProtectedRoute ─────────────
  // New sessions store the full profile here; old sessions restore from localStorage.
  const [studentInfo, setStudentInfo] = useState(null);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [results, setResults] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showTutor, setShowTutor] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();


  // ── Render backend keep-alive ──────────────────────────────────────────────
  // Render's free tier spins down after 15 min of inactivity. This prevents
  // the first real request from cold-starting — critical for exam submissions.
  useEffect(() => {
    const BACKEND = import.meta.env.VITE_API_URL || 'https://chatbot-backend-educat.onrender.com';
    const ping = () => fetch(`${BACKEND}/`).catch(() => { });
    ping();
    const interval = setInterval(ping, 10 * 60 * 1000); // every 10 min
    return () => clearInterval(interval);
  }, []);


  // ── Legacy session restore ─────────────────────────────────────────────────
  // Restores studentInfo from localStorage only when the UID matches the live
  // Firebase user — prevents a cached teacher session from being misread as a
  // student session on a shared device.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        localStorage.removeItem('user-session');
        return;
      }
      const saved = localStorage.getItem('user-session');
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        if (parsed.uid === firebaseUser.uid && parsed.role === 'student') {
          setStudentInfo(parsed);
        } else {
          // UID mismatch or wrong role cached — discard
          localStorage.removeItem('user-session');
        }
      } catch {
        localStorage.removeItem('user-session');
      }
    });
    return () => unsub();
  }, []);


  // ── Primary Firebase auth listener ────────────────────────────────────────
  // Sequence: Firebase Auth resolves → read users/{uid} for role →
  // read role-specific profile doc → set state → setLoading(false).
  //
  // Critical: always call setLoading(false) even on error, otherwise the app
  // is stuck on the spinner indefinitely.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));

        if (!userSnap.exists()) {
          // User authenticated but no Firestore profile yet (registration in progress)
          setUserProfile(null);
          setLoading(false);
          return;
        }

        const { role, schoolId } = userSnap.data();

        // Determine which profile collection to read
        const profileCol =
          role === 'principal' ? 'principals' :
            role === 'teacher' ? 'teachers' :
              'students';

        const profSnap = await getDoc(doc(db, profileCol, firebaseUser.uid));

        const profile = profSnap.exists()
          ? { ...profSnap.data(), role, schoolId, uid: firebaseUser.uid }
          : { role, schoolId, uid: firebaseUser.uid };

        setUserProfile(profile);

        if (role === 'student') {
          // Persist student session for legacy ExamPage compatibility
          setStudentInfo(profile);
          localStorage.setItem('user-session', JSON.stringify(profile));
        } else {
          // Clear any stale student state — a teacher who previously had a
          // student session on the same device must not inherit it.
          setStudentInfo(null);
          localStorage.removeItem('user-session');
        }

      } catch (err) {
        console.error('[App] Profile load error:', err);
        // Don't leave the app stuck — allow landing page to render
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);


  // ── Side effects ──────────────────────────────────────────────────────────
  useEffect(() => { setMenuOpen(false); }, [location]);
  useEffect(() => {
    document.body.style.overflow = showTutor ? 'hidden' : 'unset';
  }, [showTutor]);


  // ── Derived role flags ────────────────────────────────────────────────────
  // Single source of truth for role. Never fall back to "truthy user" — wait
  // for the explicit role string from Firestore.
  const isPrincipal = userProfile?.role === 'principal';
  const isTeacher = userProfile?.role === 'teacher';
  const isStudent = userProfile?.role === 'student' || (!!studentInfo && !userProfile);

  // schoolId used by SchoolProvider for branding / context
  const schoolId = userProfile?.schoolId || null;


  // ── Navigation links — filtered by role ──────────────────────────────────
  const navLinks = [
    // { to: '/exam',                label: 'Take Exam',  icon: Home,            show: isStudent    },
    // { to: '/results',             label: 'My Results', icon: BarChart3,        show: isStudent    },
    { to: '/teacher-dashboard', label: 'Teacher', icon: School, show: isTeacher },
    { to: '/principal-dashboard', label: 'Dashboard', icon: LayoutDashboard, show: isPrincipal },
    { to: '/exam-rules', label: 'Rules', icon: FileText, show: true },
  ];

  const currentPath = location.pathname;


  // ── AI Tutor access guard ─────────────────────────────────────────────────
  const handleTutorAccess = () => {
    if (studentInfo || user) { setShowTutor(true); return; }
    Swal.fire({
      title: '<strong>Access Protected</strong>',
      icon: 'lock',
      text: 'Please sign in or register to access the AI Tutor.',
      showCancelButton: true,
      confirmButtonText: 'Sign In / Register',
      cancelButtonText: 'Maybe Later',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      background: isDark ? '#111827' : '#fff',
      color: isDark ? '#fff' : '#000',
    }).then((result) => {
      if (result.isConfirmed) navigate('/', { state: { openModal: true } });
    });
  };


  // ── Display chip values ───────────────────────────────────────────────────
  const displayName = userProfile?.name || studentInfo?.name || null;
  const displayGrade = userProfile?.grade || studentInfo?.grade || null;
  const displayRole = userProfile?.role || (studentInfo ? 'student' : null);


  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SchoolProvider schoolId={schoolId}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">

        {/* ── Navbar ──────────────────────────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-4 group">
              <div className="relative">
                <img
                  src={logo}
                  alt="Eduket"
                  className="h-10 w-15 rounded-xl shadow-lg ring-4 ring-white/50 dark:ring-gray-800/50 group-hover:scale-110 transition-transform duration-300 dark:invert dark:hue-rotate-180"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-30 blur-xl group-hover:opacity-60 transition" />
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.filter(l => l.show).map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${currentPath === to
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600'
                    }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right: AI Tutor + identity chip */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTutorAccess}
                title={!user && !studentInfo ? 'Sign in to access AI Tutor' : 'Open AI Tutor'}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm font-semibold border border-transparent hover:border-indigo-400"
              >
                <Sparkles
                  size={20}
                  className={!user && !studentInfo ? 'opacity-70' : 'animate-pulse'}
                />
                <span className="hidden sm:inline text-sm">AI Tutor</span>
              </button>

              {displayName && (
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-xs font-bold text-gray-800 dark:text-white">{displayName}</span>
                  <span className="text-[10px] text-gray-500 capitalize">
                    {displayRole === 'student' && displayGrade
                      ? `Grade ${displayGrade}`
                      : displayRole}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>


        {/* ── Routes ──────────────────────────────────────────────────────── */}
        <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto">
          <Routes>

            {/* ── Landing ────────────────────────────────────────────────── */}
            {/*
             * Wait for loading to resolve before redirecting.
             * Without this guard, the spinner from RequireRole fires AFTER a
             * brief flash of the landing page, and the role-based redirect
             * could race with the profile read, sending a newly-authenticated
             * teacher to /teacher-dashboard before userProfile has a role.
             */}
            <Route
              path="/"
              element={
                loading ? <LoadingSpinner /> :
                  isPrincipal ? <Navigate to="/principal-dashboard" replace /> :
                    isTeacher ? <Navigate to="/teacher-dashboard" replace /> :
                      (isStudent || studentInfo) ? <Navigate to="/exam" replace /> :
                        <PasswordPage setStudentInfo={setStudentInfo} />
              }
            />

            {/* ── Student: take exam ─────────────────────────────────────── */}
            <Route
              path="/exam"
              element={
                <ProtectedRoute studentInfo={studentInfo}>
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <section className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="hidden md:block px-4 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-widest border border-green-200 dark:border-green-800">
                          System Online
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Registered School</p>
                          <p className="text-xl font-bold dark:text-gray-100">{studentInfo?.school || 'Private Student'}</p>
                        </div>
                        <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Current Grade</p>
                          <p className="text-xl font-bold dark:text-gray-100">Grade {studentInfo?.grade}</p>
                        </div>
                        <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-3xl shadow-lg shadow-indigo-500/20 flex items-center justify-between group">
                          <div>
                            <p className="text-indigo-100 text-xs font-bold uppercase mb-1">Portal Status</p>
                            <p className="text-xl font-bold">Active Session</p>
                          </div>
                          <Sparkles className="group-hover:rotate-12 transition-transform" />
                        </div>
                      </div>
                    </section>

                    <hr className="border-gray-200 dark:border-gray-800" />

                    <section className="bg-white dark:bg-gray-900 rounded-3xl min-h-[400px]">
                      <ExamPage
                        studentInfo={studentInfo}
                        setStudentInfo={setStudentInfo}
                        addResult={(res) => setResults(prev => [...prev, res])}
                        isDark={isDark}
                      />
                    </section>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* ── Student: results ──────────────────────────────────────── */}
            <Route
              path="/results"
              element={
                <ProtectedRoute studentInfo={studentInfo}>
                  <ResultPage results={results} studentInfo={studentInfo} />
                </ProtectedRoute>
              }
            />

            {/* ── Utility routes (no auth required) ─────────────────────── */}
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/exam-rules" element={<ExamRules />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />

            {/* ── Teacher dashboard ─────────────────────────────────────── */}
            {/*
             * RequireRole enforces role="teacher" — a student who navigates
             * here manually is immediately redirected to /exam.
             */}
            <Route
              path="/teacher-dashboard"
              element={
                <RequireRole
                  user={user}
                  loading={loading}
                  userProfile={userProfile}
                  role="teacher"
                >
                  <TeacherDashboard />
                </RequireRole>
              }
            />

            {/* ── Principal: school registration wizard ─────────────────── */}
            <Route
              path="/school-registration"
              element={
                <RequireRole
                  user={user}
                  loading={loading}
                  userProfile={userProfile}
                  role="principal"
                >
                  <SchoolRegistration
                    principalProfile={userProfile}
                    onComplete={(sid) => navigate('/principal-dashboard')}
                  />
                </RequireRole>
              }
            />

            {/* ── Principal: main dashboard ─────────────────────────────── */}
            <Route
              path="/principal-dashboard"
              element={
                <RequireRole
                  user={user}
                  loading={loading}
                  userProfile={userProfile}
                  role="principal"
                >
                  <PrincipalDashboard principal={userProfile} />
                </RequireRole>
              }
            />

            {/* ── Catch-all ─────────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </main>

        <footer className="py-8 text-center text-gray-400 text-sm border-t dark:border-gray-800">
          © {new Date().getFullYear()} Eduket Smart Learning Portal • Developed by Nextgen Skills Development
        </footer>

      </div>
    </SchoolProvider>
  );
}

export default App;