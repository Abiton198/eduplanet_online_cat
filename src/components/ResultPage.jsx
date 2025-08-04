import React, { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import StudentSummaryCard from "../utils/StudentSummaryCard";

export default function ResultPage({ studentInfo }) {
  const [generalResults, setGeneralResults] = useState([]);
  const [mainExamResults, setMainExamResults] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (!studentInfo?.name) return;

    const studentName = studentInfo.name.trim();
    const studentNameLower = studentName.toLowerCase();
    console.log("🔍 Querying Firestore for student:", studentName);

    /**
     * ✅ Hybrid case-insensitive query:
     * Matches exact case, lowercase, and uppercase versions of the student's name.
     * This ensures results show even if the DB has mixed casing.
     */
    // const q = query(
    //   collection(db, 'examResults'),
    //   where('name', 'in', [
    //     studentName,
    //     studentName.toLowerCase(),
    //     studentName.toUpperCase()
    //   ]),
    //   orderBy('completedTime', 'desc')
    // );

    // const unsub = onSnapshot(q, (snap) => {
    //   const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    //   console.log("✅ Live General Results:", data);
    //   setGeneralResults(data);
    // });

    const q = query(
      collection(db, 'examResults'),
      where('name', 'in', [studentName, studentNameLower]),
      orderBy('completedTime', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("✅ Live General Results:", data);
      setGeneralResults(data);
    });

    // ✅ Fetch main exam results (using original capitalization for doc ID)
    const fetchMain = async () => {
      const ref = doc(db, 'studentResults', studentInfo.name.trim());
      const snap = await getDoc(ref);
      if (snap.exists()) {
        console.log("✅ Main Exam Results:", snap.data());
        setMainExamResults(snap.data());
      }
    };

    fetchMain();
    return () => unsub();
  }, [studentInfo]);

  // ✅ Helper to calculate total score for exam tables
  const sum = (rows) => rows.reduce((a, b) => a + Number(b.score || 0), 0);

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-6">
      {/* ✅ Display original student name with capitalization */}
      <h2 className="text-2xl font-bold">📊 Results for {studentInfo?.name}</h2>

      {/* ✅ Tab Switcher */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 rounded ${activeTab === "general" ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          General Tests
        </button>
        <button
          onClick={() => setActiveTab("main")}
          className={`px-4 py-2 rounded ${activeTab === "main" ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Main Exams
        </button>
      </div>

      {/* 🔹 GENERAL TESTS TAB */}
      {activeTab === "general" && (
        <div>
          {selectedResult ? (
            <>
              {/* ✅ Back button */}
              <button
                onClick={() => setSelectedResult(null)}
                className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                ← Back to General Tests
              </button>

              {/* ✅ Detailed result view */}
              <StudentSummaryCard examResult={selectedResult} />
            </>
          ) : (
            <div>
              <h3 className="text-xl font-semibold mb-4">🧠 Your General Test Attempts</h3>

              {generalResults.length === 0 ? (
                <p className="text-gray-500">No general test results found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generalResults.map(result => {
                    const percentage = parseInt(result.percentage, 10);

                    // ✅ Color coding and comments based on percentage
                    let bgColor = 'bg-red-100';
                    let hoverColor = 'hover:bg-red-200';
                    let comment = 'Needs a lot of improvement. Keep practicing!';

                    if (percentage >= 80) {
                      bgColor = 'bg-green-100';
                      hoverColor = 'hover:bg-green-200';
                      comment = 'Excellent work! Keep up the great performance!';
                    } else if (percentage >= 60) {
                      bgColor = 'bg-blue-100';
                      hoverColor = 'hover:bg-blue-200';
                      comment = 'Good job! A bit more effort can get you to the top!';
                    } else if (percentage >= 40) {
                      bgColor = 'bg-yellow-100';
                      hoverColor = 'hover:bg-yellow-200';
                      comment = 'You’re getting there. Keep practicing to improve!';
                    }

                    return (
                      <div
                        key={result.id}
                        onClick={() => setSelectedResult(result)}
                        className={`cursor-pointer p-4 rounded-lg border transition ${bgColor} ${hoverColor}`}
                      >
                        <h4 className="font-bold">{result.exam}</h4>
                        <p className="text-sm">Date: {result.completedDate} | Time: {result.completedTimeOnly}</p>
                        <p className="text-sm">
                          Score: {result.score} | 
                          <span className="font-semibold"> {result.percentage}%</span>
                        </p>
                        <p className="text-xs text-gray-500">Attempts: {result.attempts || 1}</p>

                        {/* ✅ Dynamic comment */}
                        <p className="mt-2 text-sm font-medium">{comment}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🔹 MAIN EXAMS TAB */}
      {activeTab === "main" && (
        <div>
          <h3 className="text-xl font-semibold mb-4">📘 Main Exams (Theory + Practical)</h3>

          {/* === THEORY RESULTS === */}
          {mainExamResults?.theory ? (
            <div className="mb-6">
              <h4 className="font-semibold">{mainExamResults.theory.examTitle}</h4>
              <p className="text-sm text-gray-500">Date: {mainExamResults.theory.examDate}</p>
              <table className="w-full border mt-2">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Question</th>
                    <th className="border p-2">Type</th>
                    <th className="border p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {mainExamResults.theory.results.map((r, i) => (
                    <tr key={i}>
                      <td className="border p-2">{r.question}</td>
                      <td className="border p-2">{r.type}</td>
                      <td className="border p-2">{r.score}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="border p-2">TOTAL</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">{sum(mainExamResults.theory.results)}</td>
                  </tr>
                  <tr className="font-bold bg-gray-100">
                    <td className="border p-2">PERCENTAGE</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">
                      {((sum(mainExamResults.theory.results) / 150) * 100).toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Theory exam results not available.</p>
          )}

          {/* === PRACTICAL RESULTS === */}
          {mainExamResults?.practical ? (
            <div>
              <h4 className="font-semibold">{mainExamResults.practical.examTitle}</h4>
              <p className="text-sm text-gray-500">Date: {mainExamResults.practical.examDate}</p>
              <table className="w-full border mt-2">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Question</th>
                    <th className="border p-2">Type</th>
                    <th className="border p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {mainExamResults.practical.results.map((r, i) => (
                    <tr key={i}>
                      <td className="border p-2">{r.question}</td>
                      <td className="border p-2">{r.type}</td>
                      <td className="border p-2">{r.score}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="border p-2">TOTAL</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">{sum(mainExamResults.practical.results)}</td>
                  </tr>
                  <tr className="font-bold bg-gray-100">
                    <td className="border p-2">PERCENTAGE</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">
                      {((sum(mainExamResults.practical.results) / 150) * 100).toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Practical exam results not available.</p>
          )}
        </div>
      )}
    </div>
  );
}
