import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import PasswordPage from './components/PasswordPage';
import ExamPage from './components/ExamPage';
import ResultPage from './components/ResultPage';
import ExamRules from './utils/ExamRules';
import ProtectedRoute from './utils/ProtectedRoute';
import ReviewPage from './components/ReviewPage';
import AllResults from './components/AllResults';
import logo from './img/edu_logo.jpg';
import Chatbot from './utils/Chatbot';
import TeacherDashboard from './components/TeacherDashboard';
import { AnalysisComponent } from './components';
import StudentGoogleLogin from './components/StudentGoogleLogin';
import GroupWeakStudents from './utils/GroupWeakStudents';

function App() {
  const [studentInfo, setStudentInfo] = useState(null);   // Student session
  const [adminInfo, setAdminInfo] = useState(null);       // Admin session
  const [results, setResults] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const addResult = (result) => {
    setResults([...results, result]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full flex justify-between items-center p-4 bg-blue-600 text-white shadow-md z-50">
        <Link to="/" className="flex items-center space-x-2">
          <img src={logo} alt="Eduplanet Logo" className="h-14 w-auto rounded-md shadow-md" />
          <span className="text-xl font-bold">CAT Online</span>
        </Link>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white focus:outline-none text-3xl"
          >
            ☰
          </button>
        </div>

        {/* Desktop Menu */}
        <nav className="hidden md:flex space-x-6">
          <Link to="/exam-rules" className="hover:text-gray-300 transition">Exam Rules</Link>
          <Link to="/exam" className="hover:text-gray-300 transition">Exam</Link>
          <Link to="/results" className="hover:text-gray-300 transition">Results</Link>
          <Link to="/all-results" className="hover:text-gray-300 transition">All Results</Link>
          <Link to="/teacher-dashboard" className="hover:text-gray-300 transition">Teacher</Link>
        </nav>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white/90 text-blue-900 px-4 py-4 space-y-3 shadow-xl z-50 backdrop-blur-md">
          <Link to="/exam-rules" onClick={() => setMenuOpen(false)} className="block hover:text-blue-500">Exam Rules</Link>
          <Link to="/exam" onClick={() => setMenuOpen(false)} className="block hover:text-blue-500">Exam</Link>
          <Link to="/results" onClick={() => setMenuOpen(false)} className="block hover:text-blue-500">Results</Link>
          <Link to="/all-results" onClick={() => setMenuOpen(false)} className="block hover:text-blue-500">All Results</Link>
          <Link to="/teacher-dashboard" onClick={() => setMenuOpen(false)} className="block hover:text-blue-500">Teacher</Link>
        </div>
      )}

      <Chatbot />

      {/* Routes */}
      <div className="pt-28">
        <Routes>
          {/* Login Page: student selects grade & name */}
          <Route path="/" element={<PasswordPage setStudentInfo={setStudentInfo} />} />

          {/* Review Page (open access) */}
          <Route path="/review" element={<ReviewPage />} />

          {/* Protected Student Exam Route */}
          <Route
            path="/exam"
            element={
              <ProtectedRoute studentInfo={studentInfo} adminInfo={adminInfo}>
                <ExamPage studentInfo={studentInfo} addResult={addResult} />
              </ProtectedRoute>
            }
          />

          {/* Protected Results Route */}
          <Route
            path="/results"
            element={
              <ProtectedRoute studentInfo={studentInfo} adminInfo={adminInfo}>
                <ResultPage results={results} studentInfo={studentInfo} />
              </ProtectedRoute>
            }
          />

          {/* Open Routes */}
          <Route path="/exam-rules" element={<ExamRules />} />
          <Route path="/all-results" element={<AllResults />} />
          <Route path="/analysis-component" element={<AnalysisComponent />} /> 
          <Route path="/group-weak-students" element={<GroupWeakStudents />}/>
          {/* Protected Teacher Dashboard (admin only) */}
          <Route
            path="/teacher-dashboard"
            element={
              <ProtectedRoute studentInfo={studentInfo} adminInfo={adminInfo}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

<Route path="/" element={<StudentGoogleLogin setStudentInfo={setStudentInfo} />} />

        </Routes>
      </div>
    </div>
  );
}

export default App;
