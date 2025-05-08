import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PasswordPage({ setStudentInfo }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({ name: false, grade: false, password: false });

  const navigate = useNavigate();

  const handleLogin = () => {
    let hasError = false;
    const newErrors = { name: false, grade: false, password: false };
    setError('');

    if (name.length < 5) {
      newErrors.name = true;
      hasError = true;
    }

    if (!['12A', '12B', '11', '10', 'Admin'].includes(grade)) {
      newErrors.grade = true;
      hasError = true;
    }

    if (password !== 'student123') {
      newErrors.password = true;
      setError('Incorrect password. Please try again.');
      hasError = true;
    }

    setErrors(newErrors);

    if (!hasError) {
      setStudentInfo({ name, grade, password });
      navigate('/exam');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
          Welcome to EduPlanet CAT Exams
        </h1>

        <input
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full p-3 mb-2 border ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          } rounded`}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mb-2">Name must be at least 5 characters.</p>
        )}

        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className={`w-full p-3 mb-2 border ${
            errors.grade ? 'border-red-500' : 'border-gray-300'
          } rounded text-black`}
        >
          <option value="">Select your grade</option>
          <option value="12A">Grade 12A</option>
          <option value="12B">Grade 12B</option>
          <option value="11">Grade 11</option>
          <option value="10A">Grade 10A</option>
          <option value="Admin">Admin</option>
        </select>
        {errors.grade && (
          <p className="text-red-500 text-sm mb-2">Please select a valid grade.</p>
        )}

        <div className="relative mb-2">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your unique password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-3 border ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            } rounded text-black`}
          />
          <label className="flex items-center mt-2 text-sm">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
              className="mr-2"
            />
            Show password
          </label>
        </div>
        {errors.password && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded font-semibold"
        >
          Enter Exam
        </button>
      </div>
    </div>
  );
}
