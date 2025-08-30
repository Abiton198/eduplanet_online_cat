// ResultPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import StudentSummaryCard from "../utils/StudentSummaryCard";

export default function ResultPage({ studentInfo }) {
  const [user, setUser] = useState(null);
  const [generalResults, setGeneralResults] = useState([]);
  const [mainExamResults, setMainExamResults] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [error, setError] = useState("");
  const [usingLegacyFallback, setUsingLegacyFallback] = useState(false);

  // Name variants (stable across renders)
  const nameOriginal = useMemo(
    () => (studentInfo?.name || "").trim(),
    [studentInfo?.name]
  );
  const nameLower = useMemo(() => nameOriginal.toLowerCase(), [nameOriginal]);
  const nameTidy = useMemo(
    () => nameOriginal.replace(/\s+/g, " ").trim(),
    [nameOriginal]
  );

  // Keep snapshot unsubscribers
  const unsubsRef = useRef([]);

  // ---- Auth subscription ----
  useEffect(() => {
    const auth = getAuth();
    const off = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => off();
  }, []);

  // ---- Live listeners: General test results ----
  useEffect(() => {
    // clear previous listeners
    unsubsRef.current.forEach((fn) => fn && fn());
    unsubsRef.current = [];
    setError("");
    setUsingLegacyFallback(false);
    setGeneralResults([]);

    if (!nameOriginal) return;

    const resultsMap = new Map();
    const upsert = (docs) => {
      docs.forEach((d) => resultsMap.set(d.id, d));
      const arr = Array.from(resultsMap.values()).sort((a, b) => {
        const at = Number(a.completedTime ?? 0);
        const bt = Number(b.completedTime ?? 0);
        if (bt !== at) return bt - at;
        const aKey = `${a.completedDate ?? ""} ${a.completedTimeOnly ?? ""}`;
        const bKey = `${b.completedDate ?? ""} ${b.completedTimeOnly ?? ""}`;
        return bKey.localeCompare(aKey);
      });
      setGeneralResults(arr);
    };

    const unsubs = [];
    let scopedDeliveredAny = false;

    // Helper to wire a listener
    const listen = (q, label) =>
      onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (label.includes("SCOPED") && docs.length > 0) {
            scopedDeliveredAny = true;
          }
          if (docs.length > 0) {
            console.log(`✅ ${label}:`, docs);
          } else {
            console.log(`ℹ️ ${label}: no docs`);
          }
          upsert(docs);
        },
        (err) => {
          console.warn(`${label} listener error:`, err);
          setError((prev) =>
            prev
              ? prev
              : "Load general test results failed: " + (err?.message || err)
          );
        }
      );

    // ---- 1) Try SCOPED listeners first (requires studentUid on docs)
    if (user?.uid) {
      const qScopedLower = query(
        collection(db, "examResults"),
        where("studentUid", "==", user.uid),
        where("nameLower", "==", nameLower)
      );
      unsubs.push(listen(qScopedLower, "SCOPED nameLower"));

      if (nameTidy) {
        const qScopedExact = query(
          collection(db, "examResults"),
          where("studentUid", "==", user.uid),
          where("name", "==", nameTidy)
        );
        unsubs.push(listen(qScopedExact, "SCOPED exact name"));
      }
    } else {
      console.log("⏳ No user yet; waiting to attach scoped listeners.");
    }

    // ---- 2) After initial tick, if scoped returned nothing, add LEGACY fallback
    // This handles older docs that don't have studentUid but are still readable under your rules.
    const fallbackTimer = setTimeout(() => {
      if (!scopedDeliveredAny) {
        console.log("↩️ Enabling LEGACY fallback listeners (no studentUid filter).");
        setUsingLegacyFallback(true);

        const qLegacyLower = query(
          collection(db, "examResults"),
          where("nameLower", "==", nameLower)
        );
        unsubs.push(listen(qLegacyLower, "LEGACY nameLower"));

        if (nameTidy) {
          const qLegacyExact = query(
            collection(db, "examResults"),
            where("name", "==", nameTidy)
          );
          unsubs.push(listen(qLegacyExact, "LEGACY exact name"));
        }
      }
    }, 300); // small delay to let scoped listeners fire first

    unsubsRef.current = unsubs;

    return () => {
      clearTimeout(fallbackTimer);
      unsubs.forEach((fn) => fn && fn());
    };
  }, [db, user?.uid, nameOriginal, nameLower, nameTidy]);

  // ---- One-off fetch: Main exam results (scoped to studentUid) ----
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    const fetchMain = async () => {
      try {
        const q = query(
          collection(db, "studentResults"),
          where("studentUid", "==", user.uid),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!cancelled) {
          if (!snap.empty) {
            const docSnap = snap.docs[0];
            setMainExamResults({ id: docSnap.id, ...docSnap.data() });
          } else {
            setMainExamResults(null);
          }
        }
      } catch (e) {
        console.warn("Load main exam results failed:", e);
        if (!cancelled) setError("Load main exam results failed: " + e.message);
      }
    };

    fetchMain();
    return () => {
      cancelled = true;
    };
  }, [db, user?.uid]);

  // ---- Helpers ----
  const sum = (rows) => rows.reduce((a, b) => a + Number(b.score || 0), 0);

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-6">
      <h2 className="text-2xl font-bold">📊 Results for {studentInfo?.name}</h2>

      {error && (
        <div className="p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
      )}

      {usingLegacyFallback && (
        <div className="p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
          Showing results via legacy fallback (docs without <code>studentUid</code>).
          Consider backfilling <code>studentUid</code> on <code>examResults</code> for stricter privacy rules.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 rounded ${
            activeTab === "general" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          General Tests
        </button>
        <button
          onClick={() => setActiveTab("main")}
          className={`px-4 py-2 rounded ${
            activeTab === "main" ? "bg-green-600 text-white" : "bg-gray-200"
          }`}
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
                  {generalResults.map((result) => {
                    const percentage = parseInt(result.percentage ?? 0, 10);

                    let bgColor = "bg-red-100";
                    let hoverColor = "hover:bg-red-200";
                    let comment = "Needs a lot of improvement. Keep practicing!";

                    if (percentage >= 80) {
                      bgColor = "bg-green-100";
                      hoverColor = "hover:bg-green-200";
                      comment = "Excellent work! Keep up the great performance!";
                    } else if (percentage >= 60) {
                      bgColor = "bg-blue-100";
                      hoverColor = "hover:bg-blue-200";
                      comment = "Good job! A bit more effort can get you to the top!";
                    } else if (percentage >= 40) {
                      bgColor = "bg-yellow-100";
                      hoverColor = "hover:bg-yellow-200";
                      comment = "You’re getting there. Keep practicing to improve!";
                    }

                    return (
                      <div
                        key={result.id}
                        onClick={() => setSelectedResult(result)}
                        className={`cursor-pointer p-4 rounded-lg border transition ${bgColor} ${hoverColor}`}
                      >
                        <h4 className="font-bold">{result.exam}</h4>
                        <p className="text-sm">
                          Date: {result.completedDate} | Time: {result.completedTimeOnly}
                        </p>
                        <p className="text-sm">
                          Score: {result.score} |{" "}
                          <span className="font-semibold">{result.percentage}%</span>
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
                    <td className="border p-2">
                      {sum(mainExamResults.practical.results || [])}
                    </td>
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
