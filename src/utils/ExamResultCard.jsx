// /utils/ExamResultsCard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../utils/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

function tidyName(s) {
  return (s || '').trim();
}
function toLowerKey(s) {
  // optional helper if you maintain nameLower in Firestore
  return tidyName(s).toLowerCase().replace(/\s+/g, ' ');
}

export default function ExamResultsCard({
  studentName,                       // optional (staff lookup)
  title = '📊 JUNE Exam Results',
  collectionName = 'studentResults', // 'studentResults' | 'prelimResults'
  headerGradientFrom = 'from-blue-200',
  headerGradientTo = 'to-blue-400',
}) {
  const [data, setData] = useState({ theory: null, practical: null });
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [user, setUser] = useState(null);

  const nameTidy = useMemo(() => tidyName(studentName), [studentName]);
  const nameLowerProp = useMemo(() => toLowerKey(studentName || ''), [studentName]);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => setUser(u || null));
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

        // ---- Role detection (matches rules) ----
        let isAdmin = false;
        let isTeacher = false;
        try {
          if (user.email) {
            // /admins/{email} is case-sensitive per current rules
            const adminSnap = await getDoc(doc(db, 'admins', user.email));
            isAdmin = adminSnap.exists();
          }
          const token = await user.getIdTokenResult(true);
          const claims = token?.claims || {};
          // Supports role: "teacher" OR roles: ["teacher"]
          isTeacher =
            claims.role === 'teacher' ||
            (Array.isArray(claims.roles) && claims.roles.includes('teacher'));
        } catch {
          /* ignore claim/admin lookup errors */
        }

        // ---------- STAFF LOOKUP (by name) ----------
        if (isAdmin || isTeacher) {
          if (!nameTidy) {
            setErrMsg('Enter/select a student name to view results.');
            return;
          }

          // Try docId = name (rules allow name vs docId match)
          {
            const byName = await getDoc(doc(db, collectionName, nameTidy));
            if (byName.exists()) {
              const d = byName.data();
              if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
              return;
            }
          }

          // Try field 'name' == provided name
          {
            const q1 = query(
              collection(db, collectionName),
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

          // Optional: if you maintain nameLower, try it too
          if (nameLowerProp) {
            const q2 = query(
              collection(db, collectionName),
              where('nameLower', '==', nameLowerProp),
              limit(1)
            );
            const s2 = await getDocs(q2);
            if (!s2.empty) {
              const d = s2.docs[0].data();
              if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
              return;
            }
          }

          if (!cancelled) setErrMsg('No results found for this student.');
          return;
        }

        // ---------- STUDENT LOOKUP (aligns with rules) ----------
        const uid = user.uid;

        // 1) Preferred: match by studentUid
        {
          const qByUid = query(
            collection(db, collectionName),
            where('studentUid', '==', uid),
            limit(1)
          );
          const sByUid = await getDocs(qByUid);
          if (!sByUid.empty) {
            const d = sByUid.docs[0].data();
            if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
            return;
          }
        }

        // 2) Get profile display name from students/{uid}
        let profileName = '';
        let profileLower = '';
        try {
          const prof = await getDoc(doc(db, 'students', uid));
          if (prof.exists()) {
            profileName = tidyName(prof.data().name || '');
            // optional lower variant if you maintain it
            profileLower = prof.data().nameLower || '';
          }
        } catch { /* ignore */ }

        // 2a) Try docId == profile display name (rules allow this fallback)
        if (profileName) {
          const byDocId = await getDoc(doc(db, collectionName, profileName));
          if (byDocId.exists()) {
            const d = byDocId.data();
            if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
            return;
          }
        }

        // 2b) Try field 'name' == profile display name
        if (profileName) {
          const qByProfileNameField = query(
            collection(db, collectionName),
            where('name', '==', profileName),
            limit(1)
          );
          const sByProfileNameField = await getDocs(qByProfileNameField);
          if (!sByProfileNameField.empty) {
            const d = sByProfileNameField.docs[0].data();
            if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
            return;
          }
        }

        // 2c) Optional: if you maintain nameLower, try that too
        if (profileLower) {
          const qByProfileNameLower = query(
            collection(db, collectionName),
            where('nameLower', '==', profileLower),
            limit(1)
          );
          const sByProfileNameLower = await getDocs(qByProfileNameLower);
          if (!sByProfileNameLower.empty) {
            const d = sByProfileNameLower.docs[0].data();
            if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
            return;
          }
        }

        // 3) Last-resort: if a studentName prop was passed, try its nameLower
        if (nameLowerProp) {
          const qByProp = query(
            collection(db, collectionName),
            where('nameLower', '==', nameLowerProp),
            limit(1)
          );
          const sByProp = await getDocs(qByProp);
          if (!sByProp.empty) {
            const d = sByProp.docs[0].data();
            if (!cancelled) setData({ theory: d.theory || null, practical: d.practical || null });
            return;
          }
        }

        if (!cancelled) setErrMsg('Your results are not available yet.');
      } catch (e) {
        console.error('ExamResultsCard load error:', e);
        if (!cancelled) {
          const msg =
            e && typeof e === 'object' && 'code' in e && e.code === 'permission-denied'
              ? 'Missing or insufficient permissions.'
              : 'Could not load results.';
          setErrMsg(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (user) load();
    return () => { cancelled = true; };
  }, [user, nameTidy, nameLowerProp, collectionName]);

  const calcPercent = (rows, possible) =>
    rows && rows.length > 0
      ? ((rows.reduce((sum, r) => sum + Number(r.score || 0), 0) / possible) * 100).toFixed(2)
      : 0;

  const theoryPercent = data.theory ? calcPercent(data.theory.results, 150) : 0;
  const practicalPercent = data.practical ? calcPercent(data.practical.results, 150) : 0;
  const grandTotal = ((Number(theoryPercent) + Number(practicalPercent)) / 2).toFixed(2);

  return (
    <div className="w-full">
      <div
        className={`p-6 rounded shadow-lg bg-gradient-to-br ${headerGradientFrom} ${headerGradientTo} cursor-pointer transition hover:scale-105`}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
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
            <h4 className="font-bold text-blue-700 mb-2">Theory Exam 2</h4>
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
