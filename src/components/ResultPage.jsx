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
  // 🔹 State for general test attempts
  const [generalResults, setGeneralResults] = useState([]);
  // 🔹 State for main exam results (theory + practical)
  const [mainExamResults, setMainExamResults] = useState(null);
  // 🔹 Stores selected attempt for review
  const [selectedResult, setSelectedResult] = useState(null);
  // 🔹 Active tab: "general" or "main"
  const [activeTab, setActiveTab] = useState("general");

  /**
   * ✅ Fetch student's general tests & main exam results from Firestore.
   */
  useEffect(() => {
    if (!studentInfo?.name) return;

    // Normalize student name exactly how you save it in Firestore
    const studentName = studentInfo.name.trim();

    console.log("🔍 Querying Firestore for student:", studentName);

    // ✅ Fetch general test attempts from `examResults`
    const q = query(
      collection(db, 'examResults'),
      where('name', '==', studentName),           // filter by student name
      orderBy('completedTime', 'desc')            // sort latest first
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("✅ Live General Results:", data);
      setGeneralResults(data);
    });

    // ✅ Fetch main exam results from `studentResults`
    const fetchMain = async () => {
      const ref = doc(db, 'studentResults', studentName);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        console.log("✅ Main Exam Results:", snap.data());
        setMainExamResults(snap.data());
      }
    };

    fetchMain();
    return () => unsub();
  }, [studentInfo]);

  /**
   * ✅ Helper to calculate total score for main exam tables.
   */
  const sum = (rows) => rows.reduce((a, b) => a + Number(b.score || 0), 0);

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-6">
      <h2 className="text-2xl font-bold">📊 Results for {studentInfo?.name}</h2>

      {/* 🔹 Tab Switcher */}
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
              {/* Back button to return to all results */}
              <button
                onClick={() => setSelectedResult(null)}
                className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                ← Back to General Tests
              </button>

              {/* ✅ Pass selected attempt to summary card */}
              <StudentSummaryCard examResult={selectedResult} />
            </>
          ) : (
            <div>
              <h3 className="text-xl font-semibold mb-4">🧠 Your General Test Attempts</h3>
              {generalResults.length === 0 ? (
                <p className="text-gray-500">No general test results found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generalResults.map(result => (
                    <div
                      key={result.id}
                      onClick={() => setSelectedResult(result)}   // ✅ Open detail view
                      className="cursor-pointer p-4 bg-blue-50 rounded-lg border hover:bg-blue-100 transition"
                    >
                      <h4 className="font-bold">{result.exam}</h4>
                      <p className="text-sm">Date: {result.completedDate} | Time: {result.completedTimeOnly}</p>
                      <p className="text-sm">
                        Score: {result.score} | {result.percentage}%
                      </p>
                      <p className="text-xs text-gray-500">Attempts: {result.attempts || 1}</p>
                    </div>
                  ))}
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

          {/* === THEORY === */}
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

          {/* === PRACTICAL === */}
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
