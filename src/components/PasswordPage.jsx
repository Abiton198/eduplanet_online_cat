import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExamRules from '../utils/ExamRules';

const validPasswords = {
  "PASS123": "John Doe",
  "PASS456": "Jane Smith",
  "PASS789": "Mike Johnson"
};

export default function PasswordPage({ setStudentInfo }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validPasswords[password]) {
      const studentName = validPasswords[password];
      setStudentInfo({ name: studentName, password: password });
      delete validPasswords[password]; // Password used, delete!
      navigate('/exam');
    } else {
      setError("Invalid or used password. Contact your teacher.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
        <ExamRules/>

      <h1 className="text-2xl font-bold mb-4">Enter Exam Password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded-md w-72"
          placeholder="Enter your unique password"
          required
        />
        {error && <div className="text-red-500">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-800">
          Start Exam
        </button>
      </form>
    </div>
  );
}
