import React, { useEffect, useState } from 'react';
import { db } from './firebase'; 
import { doc, getDoc } from 'firebase/firestore';

export default function ExamResultsCard({ studentName }) {
  const [data, setData] = useState({ theory: null, practical: null });
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'studentResults', studentName));
        if (snap.exists()) {
          setData({
            theory: snap.data().theory || null,
            practical: snap.data().practical || null,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (studentName) load();
  }, [studentName]);

  const calcPercent = (rows, possible) =>
    rows ? ((rows.reduce((sum, r) => sum + Number(r.score || 0), 0) / possible) * 100).toFixed(2) : null;

  const theoryPercent = data.theory ? calcPercent(data.theory.results, 150) : null;
  const practicalPercent = data.practical ? calcPercent(data.practical.results, 150) : null;
  const grandTotal = theoryPercent && practicalPercent
    ? ((Number(theoryPercent) + Number(practicalPercent)) / 2).toFixed(2)
    : null;

  const toggleExpand = () => setExpanded(!expanded);

  return (
    <div className="max-w-xl mx-auto mb-8">
      <div
        className="p-6 rounded shadow-lg bg-gradient-to-br from-blue-200 to-blue-400 cursor-pointer transition hover:scale-105"
        onClick={toggleExpand}
      >
        <h3 className="text-xl font-bold mb-2 text-white">📊 JUNE Exam Results</h3>
        <p className="text-white">Click to {expanded ? 'hide' : 'view'} details</p>

        {loading && <p className="mt-2 text-white">Loading...</p>}
        {!loading && !data.theory && !data.practical && (
          <p className="mt-2 text-white italic">No results posted yet. Please wait for your teacher.</p>
        )}
      </div>

      {expanded && (data.theory || data.practical) && (
        <div className="bg-white shadow border p-6 mt-2 rounded">
          {data.theory && (
            <div className="mb-6">
              <h4 className="font-bold text-blue-700 mb-2">Theory Exam - {data.theory.examDate}</h4>
              <table className="w-full border mb-2 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Question</th>
                    <th className="border p-2">Type</th>
                    <th className="border p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.theory.results.map((r, idx) => (
                    <tr key={idx}>
                      <td className="border p-1 text-center">{r.question}</td>
                      <td className="border p-1 text-center">{r.type}</td>
                      <td className="border p-1 text-center">{r.score}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="border p-1">TOTAL</td>
                    <td className="border p-1">-</td>
                    <td className="border p-1 text-center">
                      {data.theory.results.reduce((sum, r) => sum + Number(r.score || 0), 0)}
                    </td>
                  </tr>
                  <tr className="font-bold bg-gray-100">
                    <td className="border p-1">PERCENTAGE</td>
                    <td className="border p-1">-</td>
                    <td className="border p-1 text-center">{theoryPercent}%</td>
                  </tr>
                </tbody>
              </table>
              <p className="italic text-sm text-gray-600">💬 {data.theory.comment}</p>
            </div>
          )}

          {data.practical && (
            <div>
              <h4 className="font-bold text-green-700 mb-2">Practical Exam - {data.practical.examDate}</h4>
              <table className="w-full border mb-2 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Question</th>
                    <th className="border p-2">Type</th>
                    <th className="border p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.practical.results.map((r, idx) => (
                    <tr key={idx}>
                      <td className="border p-1 text-center">{r.question}</td>
                      <td className="border p-1 text-center">{r.type}</td>
                      <td className="border p-1 text-center">{r.score}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="border p-1">TOTAL</td>
                    <td className="border p-1">-</td>
                    <td className="border p-1 text-center">
                      {data.practical.results.reduce((sum, r) => sum + Number(r.score || 0), 0)}
                    </td>
                  </tr>
                  <tr className="font-bold bg-gray-100">
                    <td className="border p-1">PERCENTAGE</td>
                    <td className="border p-1">-</td>
                    <td className="border p-1 text-center">{practicalPercent}%</td>
                  </tr>
                </tbody>
              </table>
              <p className="italic text-sm text-gray-600">💬 {data.practical.comment}</p>
            </div>
          )}

          {grandTotal && (
            <div className={`mt-6 p-4 text-center font-bold rounded ${grandTotal >= 50 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
              🎓 Grand Total: {grandTotal}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}
