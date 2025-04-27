import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PasswordPage({ setStudentInfo }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    // Basic validation: you can customize your password rules here
    if (password === 'student123') {  // Replace with your password logic or database check
      setStudentInfo({ name, grade, password });
      navigate('/exam'); // Redirect to exam page after successful login
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">Welcome to EduPlanet CAT Exams</h1>

        <input
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded"
        />

        <input
          type="text"
          placeholder="Enter your grade (e.g. Grade 12A)"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-full p-3 mb-4 border border-gray-300 rounded text-black"
        />

        <input
          type="password"
          placeholder="Enter your unique password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-6 border border-gray-300 rounded text-black"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded font-semibold"
        >
          Enter Exam
        </button>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}
