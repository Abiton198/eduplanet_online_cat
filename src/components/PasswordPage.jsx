// PasswordPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentList } from '../data/studentData';

export default function PasswordPage({ setStudentInfo }) {
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({ name: false, grade: false, password: false });

  const navigate = useNavigate();

  const handleLogin = () => {
    let hasError = false;
    const newErrors = { name: false, grade: false, password: false };
    setError('');

    // Validate grade
    if (!grade || !studentList[grade]) {
      newErrors.grade = true;
      hasError = true;
    }

    // Validate name
    if (!name) {
      newErrors.name = true;
      hasError = true;
    }

    // Find the student safely: trim + case-insensitive match
    const selectedStudent = studentList[grade]?.find(
      student =>
        student.name.trim().toLowerCase() === name.trim().toLowerCase()
    );

    console.log({
      grade,
      nameInput: name,
      selectedStudent,
      enteredPassword: password,
      studentPassword: selectedStudent?.password
    });

    // Check student and password
    if (!selectedStudent) {
      newErrors.name = true;
      setError('Student not found. Please check your name.');
      hasError = true;
    } else if (String(selectedStudent.password).trim() !== password.trim()) {
      newErrors.password = true;
      setError('Incorrect password. Please try again.');
      hasError = true;
    }

    setErrors(newErrors);

    // All good → proceed
    if (!hasError) {
      setStudentInfo({ name: selectedStudent.name, grade });
      navigate('/exam');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
          Welcome to EduPlanet CAT Exams
        </h1>

        {/* Grade selector */}
        <select
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setName(''); // reset name if grade changes
          }}
          className={`w-full p-3 mb-2 border ${
            errors.grade ? 'border-red-500' : 'border-gray-300'
          } rounded text-black`}
        >
          <option value="">Select your grade</option>
          {Object.keys(studentList).map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        {errors.grade && (
          <p className="text-red-500 text-sm mb-2">
            Please select a valid grade.
          </p>
        )}

        {/* Name selector */}
        {grade && studentList[grade] && (
          <select
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full p-3 mb-2 border ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            } rounded text-black`}
          >
            <option value="">Select your name</option>
            {studentList[grade].map((student) => (
              <option key={student.name} value={student.name}>
                {student.name}
              </option>
            ))}
          </select>
        )}
        {errors.name && (
          <p className="text-red-500 text-sm mb-2">
            {error || 'Please select your name.'}
          </p>
        )}

        {/* Password input */}
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

        {/* Submit button */}
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
