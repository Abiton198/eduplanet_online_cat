import React, { useEffect, useState } from 'react';
import AnalysisComponent from './AnalysisComponent';
import { db } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import StudentFeedbackCard from "../utils/StudentFeedbackCard";


export default function ResultPage({ studentInfo }) {
  const [teacherResult, setTeacherResult] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  useEffect(() => {
    const fetch = async () => {
      if (studentInfo?.name) {
        const ref = doc(db, 'studentResults', studentInfo.name);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setTeacherResult(snap.data());
        }
      }
    };
    fetch();
  }, [studentInfo]);

  const sum = (rows) => rows.reduce((a, b) => a + Number(b.score || 0), 0);


  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 space-y-10 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Hello {studentInfo?.name}</h2>

      {/* === THEORY === */}
      {teacherResult?.theory ? (
        <div>
          <h3 className="text-xl font-bold mb-2">{teacherResult.theory.examTitle}</h3>
          <p>Date: {teacherResult.theory.examDate}</p>
          <table className="w-full border my-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Question</th>
                <th className="border p-2">Type</th>
                <th className="border p-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {teacherResult.theory.results.map((r, i) => (
                <tr key={i}>
                  <td className="border p-2">{r.question}</td>
                  <td className="border p-2">{r.type}</td>
                  <td className="border p-2">{r.score}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="border p-2">TOTAL</td>
                <td className="border p-2">-</td>
                <td className="border p-2">{sum(teacherResult.theory.results)}</td>
              </tr>
              <tr className="font-bold bg-gray-100">
                <td className="border p-2">PERCENTAGE</td>
                <td className="border p-2">-</td>
                <td className="border p-2">{((sum(teacherResult.theory.results) / 150) * 100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Theory results not available yet, please be patient...</p>
      )}

      {/* === PRACTICAL === */}
      {teacherResult?.practical ? (
        <div>
          <h3 className="text-xl font-bold mb-2">{teacherResult.practical.examTitle}</h3>
          <p>Date: {teacherResult.practical.examDate}</p>
          <table className="w-full border my-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Question</th>
                <th className="border p-2">Type</th>
                <th className="border p-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {teacherResult.practical.results.map((r, i) => (
                <tr key={i}>
                  <td className="border p-2">{r.question}</td>
                  <td className="border p-2">{r.type}</td>
                  <td className="border p-2">{r.score}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="border p-2">TOTAL</td>
                <td className="border p-2">-</td>
                <td className="border p-2">{sum(teacherResult.practical.results)}</td>
              </tr>
              <tr className="font-bold bg-gray-100">
                <td className="border p-2">PERCENTAGE</td>
                <td className="border p-2">-</td>
                <td className="border p-2">{((sum(teacherResult.practical.results) / 150) * 100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">Practical results not available yet, please be patient...</p>
      )}

{/* Analysis card */}
{teacherResult && (
  <div
    onClick={() => setShowAnalysis(true)}
    className="cursor-pointer bg-blue-100 border border-blue-300 p-4 rounded-lg text-center hover:bg-blue-200 transition"
  >
    <p className="font-semibold text-lg">📊 View Personal Results Analysis</p>
    <p className="text-sm text-gray-600">Click to see your performance insights and recommendations</p>
  </div>
)}

{showAnalysis && (
  <div className="mt-6">
    <AnalysisComponent
      studentName={studentInfo?.name}
      grade={studentInfo?.grade}
      onClose={() => setShowAnalysis(false)}
    />
  </div>
)}

{/* FEEDBACK CARD */}
{teacherResult && !showFeedback && (
  <div
    onClick={() => setShowFeedback(true)}
    className="cursor-pointer bg-yellow-100 border border-yellow-300 p-4 rounded-lg text-center hover:bg-yellow-200 transition"
  >
    <p className="font-semibold text-lg">📝 FEEDBACK</p>
    <p className="text-sm text-gray-600">Click to give your personal feedback about your results</p>
  </div>
)}

{showFeedback && (
  <StudentFeedbackCard
    studentName={studentInfo?.name}
    onClose={() => setShowFeedback(false)}
  />
)}


    </div>
  );
}
