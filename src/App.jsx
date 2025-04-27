import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import PasswordPage from './components/PasswordPage';
import ExamPage from './components/ExamPage';
import ResultPage from './components/ResultPage';
import ExamRules from './utils/ExamRules'; // ✅ Import your Exam Rules Page
import ProtectedRoute from './utils/ProtectedRoute';
import ReviewPage from './components/ReviewPage';

function App() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [results, setResults] = useState([]);

  const addResult = (result) => {
    setResults([...results, result]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Section */}
      <header className="flex justify-between items-center p-6 bg-blue-600 text-white shadow-md">
        <Link to="/" className="text-2xl font-bold hover:text-gray-300 transition">EduPlanet CAT Exam</Link>
        <div className="flex space-x-6">
          <Link to="/exam-rules" className="hover:text-gray-300 transition">Exam Rules</Link>
          <Link to="/exam" className="hover:text-gray-300 transition">Take Exam</Link>
          <Link to="/results" className="hover:text-gray-300 transition">Results</Link>
        </div>
      </header>

      {/* Main Content Section */}
      <div className="p-6">
        <Routes>
          {/* Landing Page with Password Input */}
          <Route path="/" element={<PasswordPage setStudentInfo={setStudentInfo} />} />
          <Route path="/review" element={<ReviewPage />} />

          {/* Protected Exam Page */}
          <Route
            path="/exam"
            element={
              <ProtectedRoute studentInfo={studentInfo}>
                <ExamPage studentInfo={studentInfo} addResult={addResult} />
              </ProtectedRoute>
            }
          />

          {/* Protected Result Page */}
          <Route
            path="/results"
            element={
              <ProtectedRoute studentInfo={studentInfo}>
                <ResultPage results={results} />
              </ProtectedRoute>
            }
          />

          {/* Public Exam Rules Page */}
          <Route
            path="/exam-rules"
            element={<ExamRules />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
