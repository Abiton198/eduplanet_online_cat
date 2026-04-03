

// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
// Added MessageSquare and Sparkles for the tutor icon
import { Menu, X, Home, FileText, BarChart3, Users, School, MessageSquare, Sparkles } from 'lucide-react';
import PasswordPage from './components/PasswordPage';
import ExamPage from './components/ExamPage';
import ResultPage from './components/ResultPage';
import ExamRules from './utils/ExamRules';
import ProtectedRoute from './utils/ProtectedRoute';
import ReviewPage from './components/ReviewPage';
import AllResults from './components/AllResults';
import TeacherDashboard from './components/TeacherDashboard';
import { AnalysisComponent } from './components';
import StudentGoogleLogin from './components/StudentGoogleLogin';
import GroupWeakStudents from './utils/GroupWeakStudents';
import logo from './img/logo_home.png';
import CATTutor from './utils/CATTutor';

function App() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [results, setResults] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // New state for the Tutor Overlay
  const [showTutor, setShowTutor] = useState(false);
  
  const location = useLocation();

  const addResult = (result) => {
    setResults(prev => [...prev, result]);
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Prevent background scrolling when tutor is open
  useEffect(() => {
    if (showTutor) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showTutor]);

  const navLinks = [
    { to: "/exam-rules", label: "Exam Rules", icon: FileText },
    { to: "/exam", label: "Take Exam", icon: Home },
    { to: "/results", label: "My Results", icon: BarChart3 },
    { to: "/all-results", label: "All Results", icon: Users },
    { to: "/teacher-dashboard", label: "Teacher", icon: School },
  ];

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Glassmorphism Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo + Brand */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
              <img 
                src={logo} 
                alt="Eduplanet Logo" 
                className="h-12 w-12 rounded-xl shadow-lg ring-4 ring-white/50 dark:ring-gray-800/50 group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-30 blur-xl group-hover:opacity-60 transition"></div>
            </div>
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
                CAT Portal
              </h1>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Online Revision</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                  currentPath === to
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-indigo-600'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* ✨ CATTutor Toggle Button */}
            <button
              onClick={() => setShowTutor(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm font-semibold"
            >
              <Sparkles size={20} />
              <span className="hidden sm:inline">AI Tutor</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-md shadow-md hover:scale-110 transition-all"
            >
              {menuOpen ? <X size={28} /> : <Menu size={28} className="text-gray-700 dark:text-gray-300" />}
            </button>
          </div>
        </div>
      </header>

      {/* 🚀 FULL SCREEN TUTOR OVERLAY */}
      {showTutor && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col animate-in fade-in zoom-in duration-300">
          {/* Header for Overlay */}
          <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Sparkles className="text-indigo-500" />
              <h2 className="text-xl font-bold dark:text-white">CAT AI Tutor</h2>
            </div>
            <button 
              onClick={() => setShowTutor(false)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <X size={32} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
             <div className="max-w-4xl mx-auto h-full">
                <CATTutor />
             </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-24 pb-10 px-6 max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<PasswordPage setStudentInfo={setStudentInfo} />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/exam" element={<ProtectedRoute studentInfo={studentInfo} adminInfo={adminInfo}><ExamPage studentInfo={studentInfo} addResult={addResult} /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute studentInfo={studentInfo} adminInfo={adminInfo}><ResultPage results={results} studentInfo={studentInfo} /></ProtectedRoute>} />
          <Route path="/exam-rules" element={<ExamRules />} />
          <Route path="/all-results" element={<AllResults />} />
          <Route path="/analysis-component" element={<AnalysisComponent />} />
          <Route path="/group-weak-students" element={<GroupWeakStudents />} />
          <Route path="/teacher-dashboard" element={<ProtectedRoute studentInfo={studentInfo} adminInfo={adminInfo}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/login" element={<StudentGoogleLogin setStudentInfo={setStudentInfo} />} />
        </Routes>
      </main>

      <footer className="mt-20 py-8 text-center text-gray-500 dark:text-gray-400 text-sm border-t dark:border-gray-800">
        © {new Date().getFullYear()} Abiton - CAT • Secure Online Study & Exam Platform
        <span className="block mt-1 text-xs opacity-70">v{__APP_VERSION__}</span>
      </footer>
    </div>
  );
}

export default App;