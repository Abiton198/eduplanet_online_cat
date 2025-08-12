// import React, { useEffect, useState } from 'react';
// import { db } from '../utils/firebase';
// import {
//   collection,
//   query,
//   where,
//   orderBy,
//   onSnapshot,
//   doc,
//   getDocs,
//   limit
// } from 'firebase/firestore';
// import StudentSummaryCard from "../utils/StudentSummaryCard";
// import { getAuth } from "firebase/auth";


// export default function ResultPage({ studentInfo }) {
//   const [generalResults, setGeneralResults] = useState([]);
//   const [mainExamResults, setMainExamResults] = useState(null);
//   const [selectedResult, setSelectedResult] = useState(null);
//   const [activeTab, setActiveTab] = useState("general");

//   useEffect(() => {
//     if (!studentInfo?.name) return;

//     const studentName = studentInfo.name.trim();
//     const studentNameLower = studentName.toLowerCase();
//     console.log("🔍 Querying Firestore for student:", studentName);  

//     const q = query(
//       collection(db, 'examResults'),
//       where('name', 'in', [studentName, studentNameLower]),
//       orderBy('completedTime', 'desc')
//     );

//     const unsub = onSnapshot(q, (snap) => {
//       const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//       console.log("✅ Live General Results:", data);
//       setGeneralResults(data);
//     });

//     // ✅ Fetch main exam results (using original capitalization for doc ID)
//   const fetchMain = async () => {
//     const auth = getAuth();
//     const uid = auth.currentUser?.uid;
//     if (!uid) return;
  
//     const q = query(
//       collection(db, "studentResults"),
//       where("studentUid", "==", uid),
//       limit(1)
//     );
  
//     const snap = await getDocs(q);
//     if (!snap.empty) {
//       const docSnap = snap.docs[0];
//       console.log("✅ Main Exam Results:", docSnap.data());
//       setMainExamResults({ id: docSnap.id, ...docSnap.data() });
//     } else {
//       setMainExamResults(null);
//     }
//   };
//    fetchMain();
//     return () => unsub();
//   }, [studentInfo]);


//   // ✅ Helper to calculate total score for exam tables
//   const sum = (rows) => rows.reduce((a, b) => a + Number(b.score || 0), 0);

//   return (
//     <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-6">
//       {/* ✅ Display original student name with capitalization */}
//       <h2 className="text-2xl font-bold">📊 Results for {studentInfo?.name}</h2>

//       {/* ✅ Tab Switcher */}
//       <div className="flex gap-4 mt-4">
//         <button
//           onClick={() => setActiveTab("general")}
//           className={`px-4 py-2 rounded ${activeTab === "general" ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
//         >
//           General Tests
//         </button>
//         <button
//           onClick={() => setActiveTab("main")}
//           className={`px-4 py-2 rounded ${activeTab === "main" ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
//         >
//           Main Exams
//         </button>
//       </div>

//       {/* 🔹 GENERAL TESTS TAB */}
//       {activeTab === "general" && (
//         <div>
//           {selectedResult ? (
//             <>
//               {/* ✅ Back button */}
//               <button
//                 onClick={() => setSelectedResult(null)}
//                 className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
//               >
//                 ← Back to General Tests
//               </button>

//               {/* ✅ Detailed result view */}
//               <StudentSummaryCard examResult={selectedResult} />
//             </>
//           ) : (
//             <div>
//               <h3 className="text-xl font-semibold mb-4">🧠 Your General Test Attempts</h3>

//               {generalResults.length === 0 ? (
//                 <p className="text-gray-500">No general test results found.</p>
//               ) : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {generalResults.map(result => {
//                     const percentage = parseInt(result.percentage, 10);

//                     // ✅ Color coding and comments based on percentage
//                     let bgColor = 'bg-red-100';
//                     let hoverColor = 'hover:bg-red-200';
//                     let comment = 'Needs a lot of improvement. Keep practicing!';

//                     if (percentage >= 80) {
//                       bgColor = 'bg-green-100';
//                       hoverColor = 'hover:bg-green-200';
//                       comment = 'Excellent work! Keep up the great performance!';
//                     } else if (percentage >= 60) {
//                       bgColor = 'bg-blue-100';
//                       hoverColor = 'hover:bg-blue-200';
//                       comment = 'Good job! A bit more effort can get you to the top!';
//                     } else if (percentage >= 40) {
//                       bgColor = 'bg-yellow-100';
//                       hoverColor = 'hover:bg-yellow-200';
//                       comment = 'You’re getting there. Keep practicing to improve!';
//                     }

//                     return (
//                       <div
//                         key={result.id}
//                         onClick={() => setSelectedResult(result)}
//                         className={`cursor-pointer p-4 rounded-lg border transition ${bgColor} ${hoverColor}`}
//                       >
//                         <h4 className="font-bold">{result.exam}</h4>
//                         <p className="text-sm">Date: {result.completedDate} | Time: {result.completedTimeOnly}</p>
//                         <p className="text-sm">
//                           Score: {result.score} | 
//                           <span className="font-semibold"> {result.percentage}%</span>
//                         </p>
//                         <p className="text-xs text-gray-500">Attempts: {result.attempts || 1}</p>

//                         {/* ✅ Dynamic comment */}
//                         <p className="mt-2 text-sm font-medium">{comment}</p>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       )}

//       {/* 🔹 MAIN EXAMS TAB */}
//       {activeTab === "main" && (
//         <div>
//           <h3 className="text-xl font-semibold mb-4">📘 Main Exams (Theory + Practical)</h3>

//           {/* === THEORY RESULTS === */}
//           {mainExamResults?.theory ? (
//             <div className="mb-6">
//               <h4 className="font-semibold">{mainExamResults.theory.examTitle}</h4>
//               <p className="text-sm text-gray-500">Date: {mainExamResults.theory.examDate}</p>
//               <table className="w-full border mt-2">
//                 <thead className="bg-gray-100">
//                   <tr>
//                     <th className="border p-2">Question</th>
//                     <th className="border p-2">Type</th>
//                     <th className="border p-2">Score</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {mainExamResults.theory.results.map((r, i) => (
//                     <tr key={i}>
//                       <td className="border p-2">{r.question}</td>
//                       <td className="border p-2">{r.type}</td>
//                       <td className="border p-2">{r.score}</td>
//                     </tr>
//                   ))}
//                   <tr className="font-bold bg-gray-50">
//                     <td className="border p-2">TOTAL</td>
//                     <td className="border p-2">-</td>
//                     <td className="border p-2">{sum(mainExamResults.theory.results)}</td>
//                   </tr>
//                   <tr className="font-bold bg-gray-100">
//                     <td className="border p-2">PERCENTAGE</td>
//                     <td className="border p-2">-</td>
//                     <td className="border p-2">
//                       {((sum(mainExamResults.theory.results) / 150) * 100).toFixed(2)}%
//                     </td>
//                   </tr>
//                 </tbody>
//               </table>
//             </div>
//           ) : (
//             <p className="text-gray-500">Theory exam results not available.</p>
//           )}

//           {/* === PRACTICAL RESULTS === */}
//           {mainExamResults?.practical ? (
//             <div>
//               <h4 className="font-semibold">{mainExamResults.practical.examTitle}</h4>
//               <p className="text-sm text-gray-500">Date: {mainExamResults.practical.examDate}</p>
//               <table className="w-full border mt-2">
//                 <thead className="bg-gray-100">
//                   <tr>
//                     <th className="border p-2">Question</th>
//                     <th className="border p-2">Type</th>
//                     <th className="border p-2">Score</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {mainExamResults.practical.results.map((r, i) => (
//                     <tr key={i}>
//                       <td className="border p-2">{r.question}</td>
//                       <td className="border p-2">{r.type}</td>
//                       <td className="border p-2">{r.score}</td>
//                     </tr>
//                   ))}
//                   <tr className="font-bold bg-gray-50">
//                     <td className="border p-2">TOTAL</td>
//                     <td className="border p-2">-</td>
//                     <td className="border p-2">{sum(mainExamResults.practical.results)}</td>
//                   </tr>
//                   <tr className="font-bold bg-gray-100">
//                     <td className="border p-2">PERCENTAGE</td>
//                     <td className="border p-2">-</td>
//                     <td className="border p-2">
//                       {((sum(mainExamResults.practical.results) / 150) * 100).toFixed(2)}%
//                     </td>
//                   </tr>
//                 </tbody>
//               </table>
//             </div>
//           ) : (
//             <p className="text-gray-500">Practical exam results not available.</p>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../utils/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import StudentSummaryCard from "../utils/StudentSummaryCard";
import { getAuth } from "firebase/auth";

export default function ResultPage({ studentInfo }) {
  const [generalResults, setGeneralResults] = useState([]);
  const [mainExamResults, setMainExamResults] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  // --- helpers ---
  const auth = getAuth();
  const uid = auth.currentUser?.uid || null;
  const email = auth.currentUser?.email || null;

  const nameOriginal = useMemo(() => (studentInfo?.name || "").trim(), [studentInfo?.name]);
  const nameLower = useMemo(() => nameOriginal.toLowerCase(), [nameOriginal]);
  const nameTidy = useMemo(() => nameOriginal.replace(/\s+/g, " ").trim(), [nameOriginal]);

  // keep unsubs to clean up correctly
  const unsubsRef = useRef([]);

  useEffect(() => {
    // detect staff role (admin via /admins/{email}, teacher via custom claim)
    let cancelled = false;

    const detectRoles = async () => {
      try {
        let admin = false;
        let teacher = false;

        if (email) {
          const adminSnap = await getDoc(doc(db, "admins", email));
          admin = adminSnap.exists();
        }

        // prefer token claims if you set role there
        const token = await auth.currentUser?.getIdTokenResult?.();
        if (token?.claims?.role === "teacher") teacher = true;

        if (!cancelled) {
          setIsAdmin(admin);
          setIsTeacher(teacher);
        }
      } catch (e) {
        console.warn("Role detection failed:", e);
        if (!cancelled) {
          setIsAdmin(false);
          setIsTeacher(false);
        }
      }
    };

    detectRoles();
    return () => { cancelled = true; };
  }, [email]);

  useEffect(() => {
    // clear previous listeners
    unsubsRef.current.forEach((fn) => fn && fn());
    unsubsRef.current = [];

    if (!nameOriginal) return;

    // ---------- GENERAL TEST RESULTS ----------
    // Strategy:
    // 1) Prefer querying by a normalized field "nameLower" if it exists in your documents.
    // 2) Fallback: also query by exact "name" for legacy docs.
    // 3) Merge results and sort client-side by completedTime (desc).

    const unsubs = [];

    const resultsMap = new Map();

    const upsert = (docs) => {
      docs.forEach((d) => resultsMap.set(d.id, d));
      // sort by completedTime (timestamp/number) desc if present; else by completedDate/time strings
      const arr = Array.from(resultsMap.values()).sort((a, b) => {
        const at = Number(a.completedTime ?? 0);
        const bt = Number(b.completedTime ?? 0);
        if (bt !== at) return bt - at;
        // tiebreaker
        const aKey = `${a.completedDate ?? ""} ${a.completedTimeOnly ?? ""}`;
        const bKey = `${b.completedDate ?? ""} ${b.completedTimeOnly ?? ""}`;
        return bKey.localeCompare(aKey);
      });
      setGeneralResults(arr);
    };

    // A) nameLower query (best if you store nameLower)
    const qLower = query(
      collection(db, "examResults"),
      where("nameLower", "==", nameLower)
    );
    const unsubLower = onSnapshot(qLower, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      upsert(docs);
    }, (err) => console.warn("examResults nameLower listener error:", err));
    unsubs.push(unsubLower);

    // B) fallback: exact name (for legacy entries without nameLower)
    if (nameTidy) {
      const qExact = query(
        collection(db, "examResults"),
        where("name", "==", nameTidy)
      );
      const unsubExact = onSnapshot(qExact, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        upsert(docs);
      }, (err) => console.warn("examResults exact-name listener error:", err));
      unsubs.push(unsubExact);
    }

    // ---------- MAIN EXAM RESULTS ----------
    // Students must read by studentUid == auth.uid (per your rules).
    // Staff (admin/teacher) can read any doc; we’ll try by student’s name as docId first,
    // then fall back to studentUid query in case your doc IDs aren’t names.

    (async () => {
      try {
        if ((isAdmin || isTeacher) && nameTidy) {
          // Staff: try name-based doc first (matches your earlier storage pattern)
          const byNameSnap = await getDoc(doc(db, "studentResults", nameTidy));
          if (byNameSnap.exists()) {
            setMainExamResults({ id: byNameSnap.id, ...byNameSnap.data() });
            return;
          }
          // fallback: query by studentUid if staff path misses
          if (uid) {
            const staffQ = query(
              collection(db, "studentResults"),
              where("studentUid", "==", uid),
              limit(1)
            );
            const staffSnap = await getDocs(staffQ);
            if (!staffSnap.empty) {
              const d = staffSnap.docs[0];
              setMainExamResults({ id: d.id, ...d.data() });
              return;
            }
          }
          setMainExamResults(null);
        } else {
          // Student: must filter by own UID
          if (!uid) {
            setMainExamResults(null);
          } else {
            const studentQ = query(
              collection(db, "studentResults"),
              where("studentUid", "==", uid),
              limit(1)
            );
            const studentSnap = await getDocs(studentQ);
            if (!studentSnap.empty) {
              const d = studentSnap.docs[0];
              setMainExamResults({ id: d.id, ...d.data() });
            } else {
              setMainExamResults(null);
            }
          }
        }
      } catch (e) {
        console.warn("Load main exam results failed:", e);
        setMainExamResults(null);
      }
    })();

    // track unsubs for cleanup
    unsubsRef.current = unsubs;

    return () => {
      unsubs.forEach((fn) => fn && fn());
    };
  }, [nameOriginal, nameLower, nameTidy, uid, isAdmin, isTeacher]);

  // ✅ Helper to calculate total score for exam tables
  const sum = (rows) => rows.reduce((a, b) => a + Number(b.score || 0), 0);

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-6">
      <h2 className="text-2xl font-bold">📊 Results for {studentInfo?.name}</h2>

      {/* Tabs */}
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

      {/* GENERAL TESTS TAB */}
      {activeTab === "general" && (
        <div>
          {selectedResult ? (
            <>
              <button
                onClick={() => setSelectedResult(null)}
                className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                ← Back to General Tests
              </button>
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
                    const percentage = parseInt(result.percentage ?? 0, 10);

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

      {/* MAIN EXAMS TAB */}
      {activeTab === "main" && (
        <div>
          <h3 className="text-xl font-semibold mb-4">📘 Main Exams (Theory + Practical)</h3>

          {/* THEORY */}
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
                  {mainExamResults.theory.results?.map((r, i) => (
                    <tr key={i}>
                      <td className="border p-2">{r.question}</td>
                      <td className="border p-2">{r.type}</td>
                      <td className="border p-2">{r.score}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="border p-2">TOTAL</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">{sum(mainExamResults.theory.results || [])}</td>
                  </tr>
                  <tr className="font-bold bg-gray-100">
                    <td className="border p-2">PERCENTAGE</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">
                      {((sum(mainExamResults.theory.results || []) / 150) * 100).toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">Theory exam results not available.</p>
          )}

          {/* PRACTICAL */}
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
                  {mainExamResults.practical.results?.map((r, i) => (
                    <tr key={i}>
                      <td className="border p-2">{r.question}</td>
                      <td className="border p-2">{r.type}</td>
                      <td className="border p-2">{r.score}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="border p-2">TOTAL</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">{sum(mainExamResults.practical.results || [])}</td>
                  </tr>
                  <tr className="font-bold bg-gray-100">
                    <td className="border p-2">PERCENTAGE</td>
                    <td className="border p-2">-</td>
                    <td className="border p-2">
                      {((sum(mainExamResults.practical.results || []) / 150) * 100).toFixed(2)}%
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
