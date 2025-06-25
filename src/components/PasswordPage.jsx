// src/components/PasswordPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { studentList } from '../data/studentData';
import { auth, provider, db } from '../utils/firebase';

export default function PasswordPage({ setStudentInfo }) {
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    if (!grade || !name) {
      setError('Please select both grade and name.');
      return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      // Document ID format: Grade 12_John Doe
      const studentId = `${grade}_${name}`;
      const studentRef = doc(db, 'students', studentId);
      const snapshot = await getDoc(studentRef);

      if (snapshot.exists()) {
        const savedEmail = snapshot.data().email;
        if (savedEmail === email) {
          // ✅ Email matches → allow login
          setStudentInfo({ name, grade, email });
          navigate('/exam');
        } else {
          // ❌ Email mismatch
          setError('This student name is linked to a different Google account.');
        }
      } else {
        // ✅ First-time login → save the email
        await setDoc(studentRef, {
          name,
          grade,
          email
        });
        setStudentInfo({ name, grade, email });
        navigate('/exam');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google sign-in failed. Please try again.');
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
            setName('');
          }}
          className="w-full p-3 mb-3 border border-gray-300 rounded text-black"
        >
          <option value="">Select your grade</option>
          {Object.keys(studentList).map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>

        {/* Name selector */}
        {grade && (
          <select
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 mb-3 border border-gray-300 rounded text-black"
          >
            <option value="">Select your name</option>
            {studentList[grade]?.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {/* Error message */}
        {error && (
          <p className="text-red-600 text-sm mb-3 text-center">{error}</p>
        )}

        {/* Google Sign-In button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-semibold"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
