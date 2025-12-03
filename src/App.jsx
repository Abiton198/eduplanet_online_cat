// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, FileText, BarChart3, Users, LogIn, School } from 'lucide-react';
import PasswordPage from './components/PasswordPage';
import ExamPage from './components/ExamPage';
import ResultPage from './components/ResultPage';
import ExamRules from './utils/ExamRules';
import ProtectedRoute from './utils/ProtectedRoute';
import ReviewPage from './components/ReviewPage';
import AllResults from './components/AllResults';
import Chatbot from './utils/Chatbot';
import TeacherDashboard from './components/TeacherDashboard';
import { AnalysisComponent } from './components';
import StudentGoogleLogin from './components/StudentGoogleLogin';
import GroupWeakStudents from './utils/GroupWeakStudents';
import logo from './img/edu_logo.jpg';

function App() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [results, setResults] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const addResult = (result) => {
    setResults(prev => [...prev, result]);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const isDark = document.documentElement.classList.contains('dark');

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
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
                EduPlanet CAT
              </h1>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Online Exam Portal</p>
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
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-md shadow-md hover:scale-110 transition-all duration-300"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} className="text-gray-700 dark:text-gray-300" />}
          </button>
        </div>

        {/* Mobile Slide-In Menu */}
        <div className={`fixed inset-0 z-40 transition-all duration-500 lg:hidden ${
          menuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}>
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${
              menuOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className={`absolute top-0 right-0 h-full w-80 max-w-full bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-500 ease-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="p-6 border-b dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Logo" className="h-12 w-12 rounded-xl shadow-md" />
                  <div>
                    <h2 className="font-bold text-xl text-gray-800 dark:text-white">EduPlanet CAT</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Navigation Menu</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <X size={24} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <nav className="p-6 space-y-3">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-medium transition-all durationomber-300 ${
                    currentPath === to
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={24} />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="absolute bottom-8 left-6 right-6">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center py-4 rounded-2xl font-semibold shadow-lg">
                Welcome, {studentInfo?.name || 'Student'}!
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chatbot */}
      <Chatbot studentInfo={studentInfo} />

      {/* Main Content */}
      <main className="pt-24 pb-10 px-6 max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<PasswordPage setStudentInfo={setStudentInfo} />} />
          <Route path="/review" element={<ReviewPage />} />
          
          <Route
            path="/exam"
            element={
              <ProtectedRoute studentInfo={studentInfo} adminInfo={adminInfo}>
                <ExamPage studentInfo={studentInfo} addResult={addResult} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/results"
            element={
              <ProtectedRoute studentInfo={studentInfo} adminInfo={adminInfo}>
                <ResultPage results={results} studentInfo={studentInfo} />
              </ProtectedRoute>
            }
          />

          <Route path="/exam-rules" element={<ExamRules />} />
          <Route path="/all-results" element={<AllResults />} />
          <Route path="/analysis-component" element={<AnalysisComponent />} />
          <Route path="/group-weak-students" element={<GroupWeakStudents />} />

          <Route
            path="/teacher-dashboard"
            element={
              <ProtectedRoute studentInfo={studentInfo} adminInfo={adminInfo}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<StudentGoogleLogin setStudentInfo={setStudentInfo} />} />
        </Routes>
      </main>

      {/* Optional Footer */}
      <footer className="mt-20 py-8 text-center text-gray-500 dark:text-gray-400 text-sm border-t dark:border-gray-800">
        © 2025 EduPlanet CAT • Secure Online Study & Exam Platform
      </footer>
    </div>
  );
}

export default App;