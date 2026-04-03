// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Menu, X, Home, FileText, BarChart3, Users, School, Sparkles, LayoutDashboard } from 'lucide-react';
import PasswordPage from './components/PasswordPage'; // This is your refactored Auth/Refactor page
import ExamPage from './components/ExamPage';
import ResultPage from './components/ResultPage';
import ExamRules from './utils/ExamRules';
import ProtectedRoute from './utils/ProtectedRoute';
import ReviewPage from './components/ReviewPage';
import AllResults from './components/AllResults';
import TeacherDashboard from './components/TeacherDashboard';
import { AnalysisComponent } from './components';
import GroupWeakStudents from './utils/GroupWeakStudents';
import logo from './img/logo_home.png';
import CATTutor from './utils/CATTutor';

function App() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [results, setResults] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [isDark, setIsDark] = useState(false);
  
  const location = useLocation();

  // Load student session from local storage on mount if needed
  useEffect(() => {
    const savedUser = localStorage.getItem('user-session');
    if (savedUser) setStudentInfo(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Prevent background scrolling when tutor is open
  useEffect(() => {
    document.body.style.overflow = showTutor ? 'hidden' : 'unset';
  }, [showTutor]);

  // Dynamic Navigation based on Auth status
  const navLinks = [
    // { to: "/", label: "Dashboard", icon: LayoutDashboard, protected: true },
    { to: "/exam", label: "Take Exam", icon: Home, protected: true },
    { to: "/results", label: "My Results", icon: BarChart3, protected: true },
    { to: "/exam-rules", label: "Rules", icon: FileText, protected: false },
    { to: "/teacher-dashboard", label: "Teacher", icon: School, protected: false },
  ];

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Modern Glassmorphism Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo + Brand */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
              <img src={logo} alt="EduCat" className="h-12 w-12 rounded-xl shadow-lg ring-4 ring-white/50 dark:ring-gray-800/50 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-30 blur-xl group-hover:opacity-60 transition"></div>
            </div>
            <div className="hidden md:block text-left">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight leading-none">Technology Oasis</h1>
              <p className="text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold">Smart Learning</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon, protected: isProt }) => (
              // Only show protected links if student is logged in
              (!isProt || studentInfo) && (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                    currentPath === to
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-indigo-600'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTutor(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm font-semibold"
            >
              <Sparkles size={20} />
              <span className="hidden sm:inline text-sm">AI Tutor</span>
            </button>

            {studentInfo && (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-gray-800 dark:text-white">{studentInfo.name}</span>
                <span className="text-[10px] text-gray-500">Grade {studentInfo.grade}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* AI TUTOR OVERLAY */}
      {showTutor && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col animate-in fade-in zoom-in duration-200">
          <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Sparkles className="text-indigo-500" />
              <h2 className="text-xl font-bold dark:text-white">CAT AI Tutor</h2>
            </div>
            <button onClick={() => setShowTutor(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <X size={28} className="text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
             <div className="max-w-4xl mx-auto h-full"><CATTutor /></div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
    <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto">
  <Routes>
    {/* Landing / Auth Page: If logged in, send straight to /exam */}
    <Route path="/" element={
      studentInfo ? <Navigate to="/exam" /> : <PasswordPage setStudentInfo={setStudentInfo} />
    } />

    <Route path="/exam" element={
      <ProtectedRoute studentInfo={studentInfo}>
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Personalized Dashboard Header */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-black dark:text-white">
                Welcome back, {studentInfo?.name}!
              </h2>
              <span className="hidden md:block px-4 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-widest border border-green-200 dark:border-green-800">
                System Online
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Registered School</p>
                <p className="text-xl font-bold dark:text-gray-100">{studentInfo?.school || 'Private Student'}</p>
              </div>
              
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
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

          {/* The Actual Exam Component */}
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
    } />

    {/* Other Routes */}
    <Route path="/results" element={<ProtectedRoute studentInfo={studentInfo}><ResultPage results={results} studentInfo={studentInfo} /></ProtectedRoute>} />
    <Route path="/review" element={<ReviewPage />} />
    <Route path="/exam-rules" element={<ExamRules />} />
    <Route path="/all-results" element={<AllResults />} />
    <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
    <Route path="/group-weak-students" element={<GroupWeakStudents />} />
  </Routes>
</main>

      <footer className="py-8 text-center text-gray-400 text-sm border-t dark:border-gray-800">
        © {new Date().getFullYear()} Abiton CAT Portal • Secure Personalized Learning
      </footer>
    </div>
  );
}

export default App;