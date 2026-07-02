// App.jsx
import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home, FileText, BarChart3, School, Sparkles, LayoutDashboard } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { auth, db } from './utils/firebase';


// ── Existing components ────────────────────────────────────────────────────────
import PasswordPage from './components/PasswordPage';
import ExamPage from './components/ExamPage';
import ResultPage from './components/ResultPage';
import ExamRules from './utils/ExamRules';
import ProtectedRoute from './utils/ProtectedRoute';
import ReviewPage from './components/ReviewPage';
import TeacherDashboard from './components/TeacherDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';

// ── New school-scoped components ──────────────────────────────────────────────
import SchoolRegistration from './components/SchoolRegistration';
import PrincipalDashboard from './components/PrincipalDashboard';
import { SchoolProvider } from './utils/schoolContext';

import logo from './img/eduket.png';
import Swal from 'sweetalert2';

// ─── Auth guard ────────────────────────────────────────────────────────────────
function RequireAuth({ children, user, loading }) {
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  return children;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
function App() {
  // ── Legacy student state (kept for existing ExamPage / ProtectedRoute) ─────
  const [studentInfo, setStudentInfo] = useState(null);
  const [results, setResults] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showTutor, setShowTutor] = useState(false);

  // ── New Firebase auth state ────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  // ── Keep Render backend alive ──────────────────────────────────────────
  useEffect(() => {
    const BACKEND = "https://chatbot-backend-educat.onrender.com";

    // Wake immediately on app load
    fetch(`${BACKEND}/`).catch(() => { });

    // Ping every 10 minutes to prevent sleep
    const interval = setInterval(() => {
      fetch(`${BACKEND}/`).catch(() => { });
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);


  // ── Load legacy session from localStorage, but only if it matches the live user ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        localStorage.removeItem('user-session');
        return;
      }
      const savedUser = localStorage.getItem('user-session');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.uid === firebaseUser.uid) {
            setStudentInfo(parsed);
          } else {
            localStorage.removeItem('user-session');
          }
        } catch (_) {
          localStorage.removeItem('user-session');
        }
      }
    });
    return () => unsub();
  }, []);

  // ── Firebase auth listener — loads role + full profile for all user types ──


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      await firebaseUser.getIdToken(true);

      // ── TEMPORARY DEBUG ──────────────────────────────────────
      const testCols = ['teachers', 'students', 'exams', 'exam_attempts', 'auditLog'];
      for (const c of testCols) {
        try {
          const snap = await getDocs(
            query(collection(db, c), where('schoolId', '==', firebaseUser.uid))
          );
          console.log(`✅ ${c}: ${snap.size} docs`);
        } catch (e) {
          console.log(`❌ ${c}: DENIED —`, e.message);
        }
      }
      // ── END DEBUG ────────────────────────────────────────────

      setUser(firebaseUser);

      try {
        const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userSnap.exists()) {
          const { role, schoolId } = userSnap.data();
          const profileCol =
            role === 'principal' ? 'principals' :
              role === 'teacher' ? 'teachers' : 'students';

          const profSnap = await getDoc(doc(db, profileCol, firebaseUser.uid));

          const profile = profSnap.exists()
            ? { ...profSnap.data(), role, schoolId, uid: firebaseUser.uid }
            : { role, schoolId, uid: firebaseUser.uid };

          setUserProfile(profile);

          if (role === 'student') {
            setStudentInfo(profile);
            localStorage.setItem('user-session', JSON.stringify(profile));
          }
        }
      } catch (err) {
        console.error('[App] Profile load error:', err);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ── Close menu on route change ─────────────────────────────────────────────
  useEffect(() => { setMenuOpen(false); }, [location]);

  // ── Prevent background scroll when tutor is open ──────────────────────────
  useEffect(() => {
    document.body.style.overflow = showTutor ? 'hidden' : 'unset';
  }, [showTutor]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const schoolId = userProfile?.schoolId || userProfile?.uid || null;
  const isPrincipal = userProfile?.role === 'principal';
  const isTeacher = userProfile?.role === 'teacher';
  const isStudent = userProfile?.role === 'student' || (!!studentInfo && !userProfile);

  // ── Navigation links — shown per role ─────────────────────────────────────
  const navLinks = [
    { to: '/exam', label: 'Take Exam', icon: Home, show: isStudent },
    { to: '/results', label: 'My Results', icon: BarChart3, show: isStudent },
    { to: '/teacher-dashboard', label: 'Teacher', icon: School, show: isTeacher },
    { to: '/principal-dashboard', label: 'Dashboard', icon: LayoutDashboard, show: isPrincipal },
    { to: '/exam-rules', label: 'Rules', icon: FileText, show: true },
  ];

  const currentPath = location.pathname;

  // ── AI Tutor guard ─────────────────────────────────────────────────────────
  const handleTutorAccess = () => {
    if (studentInfo || user) { setShowTutor(true); return; }
    Swal.fire({
      title: '<strong>Access Protected</strong>',
      icon: 'lock',
      text: 'Please sign in or register to access the AI Tutor.',
      showCancelButton: true,
      confirmButtonText: 'Sign In / Register',
      cancelButtonText: 'Maybe Later',
      buttonsStyling: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      customClass: {
        confirmButton: '!bg-[#4f46e5] !text-white !opacity-100 !visible px-6 py-2 rounded-xl font-bold shadow-md',
        cancelButton: '!bg-[#ef4444] !text-white !opacity-100 !visible px-6 py-2 rounded-xl font-bold shadow-md',
        actions: 'flex gap-3 justify-center mt-4',
      },
      background: isDark ? '#111827' : '#fff',
      color: isDark ? '#fff' : '#000',
    }).then((result) => {
      if (result.isConfirmed) navigate('/', { state: { openModal: true } });
    });
  };

  // ── Display name / role chip ───────────────────────────────────────────────
  const displayName = userProfile?.name || studentInfo?.name || null;
  const displayGrade = userProfile?.grade || studentInfo?.grade || null;
  const displayRole = userProfile?.role || (studentInfo ? 'student' : null);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    // SchoolProvider wraps everything — all pages get school branding via useSchool()
    <SchoolProvider schoolId={schoolId}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">

        {/* ── Glassmorphism Navbar ── */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

            {/* Logo + Brand */}
            <Link to="/" className="flex items-center gap-4 group">
              <div className="relative">
                <img
                  src={logo} alt="Eduket"
                  className="h-10 w-15 rounded-xl shadow-lg ring-4 ring-white/50 dark:ring-gray-800/50 group-hover:scale-110 transition-transform duration-300 dark:invert dark:hue-rotate-180"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-30 blur-xl group-hover:opacity-60 transition" />
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks
                .filter((l) => l.show)
                .map(({ to, label, icon: Icon }) => (
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

            {/* Right side */}
            <div className="flex items-center gap-3">

              {/* AI Tutor button */}
              <button
                onClick={handleTutorAccess}
                title={!user && !studentInfo ? 'Sign in to access AI Tutor' : ''}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm font-semibold border border-transparent hover:border-indigo-400"
              >
                <Sparkles
                  size={20}
                  className={`${!user && !studentInfo ? 'opacity-70' : 'animate-pulse'}`}
                />
                <span className="hidden sm:inline text-sm">AI Tutor</span>
              </button>

              {/* User identity chip */}
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

        {/* ── Main Content ── */}
        <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto">
          <Routes>

            {/* Landing / Auth — redirect by role once signed in */}
            <Route
              path="/"
              element={
                isPrincipal ? <Navigate to="/principal-dashboard" replace /> :
                  isTeacher ? <Navigate to="/teacher-dashboard" replace /> :
                    (studentInfo || isStudent) ? <Navigate to="/exam" replace /> :
                      <PasswordPage setStudentInfo={setStudentInfo} />
              }
            />

            {/* Student: Exam */}
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
                        addResult={(res) => setResults((prev) => [...prev, res])}
                        isDark={isDark}
                      />
                    </section>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Student: Results */}
            <Route
              path="/results"
              element={
                <ProtectedRoute studentInfo={studentInfo}>
                  <ResultPage results={results} studentInfo={studentInfo} />
                </ProtectedRoute>
              }
            />

            {/* Existing utility routes — untouched */}
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/exam-rules" element={<ExamRules />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />

            {/* Teacher Dashboard */}
            <Route
              path="/teacher-dashboard"
              element={
                <RequireAuth user={user} loading={loading}>
                  <TeacherDashboard />
                </RequireAuth>
              }
            />

            {/* Principal: School Registration Wizard */}
            <Route
              path="/school-registration"
              element={
                <RequireAuth user={user} loading={loading}>
                  <SchoolRegistration
                    principalProfile={userProfile}
                    onComplete={(sid) => {
                      console.log('School registered:', sid);
                      navigate('/principal-dashboard');
                    }}
                  />
                </RequireAuth>
              }
            />

            {/* Principal: Full Dashboard */}
            <Route
              path="/principal-dashboard"
              element={
                <RequireAuth user={user} loading={loading}>
                  <PrincipalDashboard principal={userProfile} />
                </RequireAuth>
              }
            />

            {/* Fallback */}
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