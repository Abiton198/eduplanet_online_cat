// pages/StudentGoogleLogin.jsx

import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider, db } from "../utils/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { studentList } from "../data/studentData";

export default function StudentGoogleLogin({ setStudentInfo }) {
  const [grade, setGrade] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      const selectedStudent = studentList[grade]?.find(
        s => s.name.trim().toLowerCase() === name.trim().toLowerCase()
      );

      if (!selectedStudent) {
        setError("Name not found for selected grade.");
        return;
      }

      const docRef = doc(db, "students", `${grade}_${name}`);
      const docSnap = await getDoc(docRef);

      // === Check if user is admin ===
      const adminRef = doc(db, "admins", email);
      const adminSnap = await getDoc(adminRef);
      const isAdmin = adminSnap.exists();

      if (!docSnap.exists()) {
        // First time login: save student email
        await setDoc(docRef, {
          name,
          grade,
          email
        });
        setStudentInfo({ name, grade, email });
        navigate("/exam");
      } else {
        const savedEmail = docSnap.data().email;
        if (savedEmail === email || isAdmin) {
          setStudentInfo({
            name,
            grade,
            email: savedEmail // ✅ always use student's email for context
          });
          navigate("/exam");
        } else {
          setError("This student name is linked to a different Google account.");
        }
      }

    } catch (err) {
      console.error(err);
      setError("Google sign-in failed.");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-2xl font-bold text-center mb-4">Student Google Login</h2>

      <select
        value={grade}
        onChange={e => { setGrade(e.target.value); setName(""); }}
        className="w-full mb-3 p-2 border rounded"
      >
        <option value="">Select Grade</option>
        {Object.keys(studentList).map(g => (
          <option key={g} value={g}>Grade {g}</option>
        ))}
      </select>

      {grade && (
        <select
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        >
          <option value="">Select Name</option>
          {studentList[grade].map(s => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      )}

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <button
        onClick={handleGoogleLogin}
        className="w-full bg-blue-600 text-white p-3 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}
