import React, { useEffect, useMemo, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from './firebase'; // keep your path
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

export default function ExamResultsCard({ studentName }) {
  const [data, setData] = useState({ theory: null, practical: null });
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [user, setUser] = useState(null);       // ✅ track auth user

  const nameTidy = useMemo(() => (studentName || '').trim(), [studentName]);
  const nameLower = useMemo(() => nameTidy.toLowerCase(), [nameTidy]);

  // ✅ keep user state in sync with Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), u => setUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrMsg('');
      setData({ theory: null, practical: null });

      try {
        if (!user) {
          setErrMsg('Please sign in to view results.');
          return;
        }

        // --- detect staff (admin/teacher) ---
        let isAdmin = false;
        let isTeacher = false;

        try {
          if (user.email) {
            const adminSnap = await getDoc(doc(db, 'admins', user.email));
            isAdmin = adminSnap.exists();
          }
          const token = await user.getIdTokenResult();
          isTeacher = token?.claims?.role === 'teacher';
        } catch {
          // ignore; defaults to false
        }

        // --- load data depending on role ---
        if (isAdmin || isTeacher) {
          // STAFF: try by name as docId first
          if (nameTidy) {
            const byName = await getDoc(doc(db, 'studentResults', nameTidy));
            if (byName.exists()) {
              const d = byName.data();
              if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
              return;
            }
          }
          // Fallback 1: query by exact 'name' field if stored
          if (nameTidy) {
            const q1 = query(
              collection(db, 'studentResults'),
              where('name', '==', nameTidy),
              limit(1)
            );
            const s1 = await getDocs(q1);
            if (!s1.empty) {
              const d = s1.docs[0].data();
              if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
              return;
            }
          }
          // Fallback 2: query by 'nameLower' if you store it
          if (nameLower) {
            const q2 = query(
              collection(db, 'studentResults'),
              where('nameLower', '==', nameLower),
              limit(1)
            );
            const s2 = await getDocs(q2);
            if (!s2.empty) {
              const d = s2.docs[0].data();
              if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
              return;
            }
          }
          if (!cancelled) setErrMsg('No main exam results found for this student.');
          return;
        } else {
          // STUDENT: must read by own UID (ensure your docs store studentUid)
          const uid = user.uid;
          const qMe = query(
            collection(db, 'studentResults'),
            where('studentUid', '==', uid),
            limit(1)
          );
          const sMe = await getDocs(qMe);
          if (!sMe.empty) {
            const d = sMe.docs[0].data();
            if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
          } else {
            if (!cancelled) setErrMsg('Your main exam results are not available yet.');
          }
        }
      } catch (e) {
        console.error('ExamResultsCard load error:', e);
        if (!cancelled) setErrMsg('Missing or insufficient permissions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (nameTidy) load();
    return () => { cancelled = true; };
  }, [nameTidy, nameLower, user]); // ✅ rerun when auth state changes

  const calcPercent = (rows, possible) =>
    rows && rows.length > 0
      ? ((rows.reduce((sum, r) => sum + Number(r.score || 0), 0) / possible) * 100).toFixed(2)
      : 0;

  const theoryPercent = data.theory ? calcPercent(data.theory.results, 150) : 0;
  const practicalPercent = data.practical ? calcPercent(data.practical.results, 150) : 0;
  const grandTotal = ((Number(theoryPercent) + Number(practicalPercent)) / 2).toFixed(2);

  return (
    <div className="max-w-xl mx-auto mb-8">
      <div
        className="p-6 rounded shadow-lg bg-gradient-to-br from-blue-200 to-blue-400 cursor-pointer transition hover:scale-105"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-xl font-bold mb-2 text-white">📊 JUNE Exam Results</h3>
        <p className="text-white">Click to {expanded ? 'hide' : 'view'} details</p>

        {loading && <p className="mt-2 text-white">Loading...</p>}
        {!loading && errMsg && <p className="mt-2 text-white italic">{errMsg}</p>}
        {!loading && !errMsg && !data.theory && !data.practical && (
          <p className="mt-2 text-white italic">No results posted yet. Please wait for your teacher.</p>
        )}
      </div>

      {expanded && !loading && !errMsg && (
        <div className="bg-white shadow border p-6 mt-2 rounded">
          {/* Theory */}
          <div className="mb-6">
            <h4 className="font-bold text-blue-700 mb-2">Theory Exam</h4>
            {data.theory ? (
              <>
                <p className="text-sm text-gray-500 mb-1">Date: {data.theory.examDate}</p>
                <table className="w-full border mb-2 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Question</th>
                      <th className="border p-2">Type</th>
                      <th className="border p-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.theory.results?.map((r, idx) => (
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
                        {data.theory.results?.reduce((s, r) => s + Number(r.score || 0), 0) ?? 0}
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
              </>
            ) : (
              <p className="italic text-gray-500">Theory result not posted yet.</p>
            )}
          </div>

          {/* Practical */}
          <div>
            <h4 className="font-bold text-green-700 mb-2">Practical Exam</h4>
            {data.practical ? (
              <>
                <p className="text-sm text-gray-500 mb-1">Date: {data.practical.examDate}</p>
                <table className="w-full border mb-2 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Question</th>
                      <th className="border p-2">Type</th>
                      <th className="border p-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.practical.results?.map((r, idx) => (
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
                        {data.practical.results?.reduce((s, r) => s + Number(r.score || 0), 0) ?? 0}
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
              </>
            ) : (
              <p className="italic text-gray-500">Practical result not posted yet.</p>
            )}
          </div>

          {/* Grand Total */}
          <div
            className={`mt-6 p-4 text-center font-bold rounded ${
              Number(grandTotal) >= 50 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
            }`}
          >
            🎓 Grand Total: {grandTotal}%
          </div>
        </div>
      )}
    </div>
  );
}
