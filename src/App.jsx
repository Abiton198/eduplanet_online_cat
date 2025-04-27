import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import {PasswordPage, ExamPage, ResultPage} from './components'
import ProtectedRoute from './utils/ProtectedRoute'; //so student puts password to access exam

function App() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [results, setResults] = useState([]);

  const addResult = (result) => {
    setResults([...results, result]);
  };

  return (
    <Routes>
      <Route path="/" element={<PasswordPage setStudentInfo={setStudentInfo} />} />
      
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
    </Routes>  );
}

export default App;


