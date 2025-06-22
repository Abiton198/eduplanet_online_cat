import React, { useState, useEffect } from 'react';
import { db } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ExamResultsCard({ studentName }) {
  const [teacherResult, setTeacherResult] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchTeacherResult = async () => {
      if (studentName) {
        const ref = doc(db, 'studentResults', studentName);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setTeacherResult(snap.data());
        }
      }
    };
    fetchTeacherResult();
  }, [studentName]);

  const sum = (rows) => rows.reduce((acc, r) => acc + Number(r.score || 0), 0);

  const theoryScore = teacherResult?.theory ? sum(teacherResult.theory.results) : 0;
  const practicalScore = teacherResult?.practical ? sum(teacherResult.practical.results) : 0;

  const theoryPercent = teacherResult?.theory ? (theoryScore / 150) * 100 : null;
  const practicalPercent = teacherResult?.practical ? (practicalScore / 150) * 100 : null;

  let grandPercent = null;
  if (theoryPercent !== null && practicalPercent !== null) {
    grandPercent = ((theoryPercent + practicalPercent) / 2).toFixed(2);
  } else if (theoryPercent !== null) {
    grandPercent = theoryPercent.toFixed(2);
  } else if (practicalPercent !== null) {
    grandPercent = practicalPercent.toFixed(2);
  }

  const grandColor = grandPercent >= 50 ? 'bg-green-600' : 'bg-red-600';

  if (!teacherResult) return null;

  return (
    <div className="max-w-3xl mx-auto mb-10">
      {/* === Card header === */}
      <div
        onClick={() => setShowDetails(!showDetails)}
        className="cursor-pointer bg-gradient-to-r from-green-400 to-blue-500 rounded-xl p-6 shadow-lg text-white transition hover:scale-105"
      >
        <h3 className="text-2xl font-bold mb-1">📊 Exam Results</h3>
        <p className="text-sm">Click to {showDetails ? 'hide' : 'view'} your detailed teacher-marked results.</p>
      </div>

      {showDetails && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md text-gray-800">
          {/* === GRAND TOTAL === */}
          {grandPercent && (
            <div className="flex justify-center mb-6">
              <button
                className={`animate-pulse ${grandColor} text-white text-3xl font-extrabold px-10 py-6 rounded-full shadow-lg transition`}
              >
                🎓 GRAND TOTAL: {grandPercent}% <br/>
              <p className='text-sm'>Result for both exams</p>
              </button>
            </div>
          )}

          {/* === THEORY === */}
          {teacherResult.theory ? (
            <div className="mb-10">
              <h4 className="text-xl font-bold mb-2">{teacherResult.theory.examTitle}</h4>
              <p className="text-sm text-gray-600 mb-2">Date: {teacherResult.theory.examDate}</p>
              <table className="w-full border mb-2">
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
                    <td className="border p-2">{theoryScore}</td>
                  </tr>
                  <tr className="font-bold bg-gray-100">
                    <td className="border p-2">PERCENTAGE</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">{theoryPercent.toFixed(2)}%</td>
                  </tr>
                </tbody>
              </table>
              <p className="italic text-green-700 mt-1">
                📝 <b>Teacher's Comment:</b> {teacherResult.theory.comment || 'No comment provided.'}
              </p>
            </div>
          ) : (
            <p className="text-gray-600">Theory results not available yet. Please be patient.</p>
          )}

          {/* === PRACTICAL === */}
          {teacherResult.practical ? (
            <div className="mb-4">
              <h4 className="text-xl font-bold mb-2">{teacherResult.practical.examTitle}</h4>
              <p className="text-sm text-gray-600 mb-2">Date: {teacherResult.practical.examDate}</p>
              <table className="w-full border mb-2">
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
                    <td className="border p-2">{practicalScore}</td>
                  </tr>
                  <tr className="font-bold bg-gray-100">
                    <td className="border p-2">PERCENTAGE</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">{practicalPercent.toFixed(2)}%</td>
                  </tr>
                </tbody>
              </table>
              <p className="italic text-blue-700 mt-1">
                📝 <b>Teacher's Comment:</b> {teacherResult.practical.comment || 'No comment provided.'}
              </p>
            </div>
          ) : (
            <p className="text-gray-600">Practical results not available yet. Please be patient.</p>
          )}
        </div>
      )}
    </div>
  );
}
