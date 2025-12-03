// src/components/ExamResultsDisplay.jsx
import React, { useState, useEffect } from 'react';
import ExamResultsCard from '../utils/ExamResultCard';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function ExamResultsDisplay() {
  const [grade, setGrade] = useState(null);
  const [studentName, setStudentName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;  // ← INSTANT, NO DELAY!

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, 'students', user.uid));
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setGrade(data.gradeYear || 10);
          setStudentName(data.name || user.displayName || "Student");
        } else {
          setGrade(10); // fallback
        }
      } catch (err) {
        console.error("Profile load error:", err);
        setGrade(10);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (!grade) {
    return (
      <div className="text-center py-20 bg-red-50 border border-red-300 rounded-xl">
        <p className="text-xl text-red-700 font-bold">Access Denied</p>
        <p className="text-gray-600 mt-2">Please sign in to view your results.</p>
      </div>
    );
  }

  const isGrade12 = grade === 12;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-12">
      {/* Header */}
      <div className="text-center mb-12 bg-gradient-to-r from-indigo-50 to-purple-50 py-10 rounded-3xl border-4 border-indigo-200">
        <h1 className="text-5xl font-black text-indigo-900">My CAT Results 2026</h1>
        <h2 className="text-3xl font-bold text-purple-700 mt-4">Grade {grade}</h2>
        <p className="text-lg text-gray-700 mt-2">Computer Applications Technology • DBE South Africa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-12">

        {/* MID-YEAR EXAM */}
        <div className="transform hover:scale-105 transition-all duration-300">
          <ExamResultsCard
            studentName={studentName}
            title="Mid-Year Exam (June 2026)"
            collectionName="midYearResults"
            headerGradientFrom="from-cyan-500"
            headerGradientTo="to-blue-700"
          />
          <div className="text-center mt-4 bg-cyan-100 py-3 rounded-b-2xl font-bold text-cyan-900">
            Theory 100 + Practical 100 = 200 marks
          </div>
        </div>

        {/* END-OF-YEAR EXAM */}
        <div className="transform hover:scale-105 transition-all duration-300">
          <ExamResultsCard
            studentName={studentName}
            title="End-of-Year Exam (November 2026)"
            collectionName="novemberResults"
            headerGradientFrom="from-purple-600"
            headerGradientTo="to-pink-700"
          />
          <div className="text-center mt-4 bg-purple-100 py-3 rounded-b-2xl font-bold text-purple-900">
            Paper 1 (120) + Paper 2 (120) = 240 marks
          </div>
        </div>

        {/* PRELIMINARY EXAM – Grade 12 ONLY */}
        {isGrade12 && (
          <div className="transform hover:scale-110 transition-all duration-500 relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 rounded-3xl blur-xl opacity-75 animate-pulse"></div>
            <div className="relative">
              <ExamResultsCard
                studentName={studentName}
                title="Preliminary Exam (September 2026)"
                collectionName="prelimResults"
                headerGradientFrom="from-yellow-500"
                headerGradientTo="to-red-600"
              />
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-800 text-white px-10 py-4 rounded-full font-black text-2xl shadow-2xl animate-bounce">
                MATRIC TRIAL
              </div>
            </div>
            <div className="text-center mt-6 bg-red-100 border-4 border-red-600 py-4 rounded-2xl font-bold text-red-900">
              Your Final Trial Before NSC • University Admission Impact
            </div>
          </div>
        )}
      </div>

      {/* Grade 12 Motivation */}
      {isGrade12 && (
        <div className="mt-20 bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 text-white p-12 rounded-3xl text-center shadow-2xl">
          <h3 className="text-5xl font-black mb-6">This Is Your Matric Year!</h3>
          <p className="text-2xl leading-relaxed max-w-4xl mx-auto">
            Your Preliminary Results are live. Use them to dominate your final NSC exam in November.
          </p>
          <div className="mt-10 text-7xl font-black animate-pulse">YOU'VE GOT THIS!</div>
        </div>
      )}
    </div>
  );
}