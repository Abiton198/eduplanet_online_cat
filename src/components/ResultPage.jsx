import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, query as firestoreQuery } from "firebase/firestore";
import { db } from "../utils/firebase";


export default function ResultPage({ studentInfo }) {
  const [user, setUser] = useState(null);
  const [generalResults, setGeneralResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);

  // 1. Get the name from props (e.g., "Abiton_11" or "Hayley")
  const rawName = studentInfo?.name || "";
  const tidyName = rawName.trim();
  const lowerName = rawName.toLowerCase().trim();

  useEffect(() => {
    const auth = getAuth();
    const off = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => off();
  }, []);

  useEffect(() => {
    if (!rawName && !user?.uid) return;

    setLoading(true);

    const attemptsRef = collection(db, "exam_attempts");

    const listeners = [];

    // Query by Firebase UID
    if (user?.uid) {
      listeners.push(
        onSnapshot(
          query(
            attemptsRef,
            where("studentUid", "==", user.uid)
          ),
          (snap) => {
            handleResults(snap, "studentUid");
          }
        )
      );
    }

    // Query by studentId
    if (tidyName) {
      listeners.push(
        onSnapshot(
          query(
            attemptsRef,
            where("studentId", "==", tidyName)
          ),
          (snap) => {
            handleResults(snap, "studentId");
          }
        )
      );
    }

    function handleResults(snapshot, source) {
      console.log(
        `[Results] ${source}:`,
        snapshot.docs.length
      );

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const sorted = data.sort((a, b) => {
        const aTime =
          a.completedAt?.seconds || 0;

        const bTime =
          b.completedAt?.seconds || 0;

        return bTime - aTime;
      });

      setGeneralResults(sorted);
      setLoading(false);
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      listeners.forEach((u) => u());
      clearTimeout(timer);
    };
  }, [rawName, tidyName, user?.uid]);

  if (loading) return <div className="p-10 text-center">Searching for results...</div>;

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📊 Performance History</h2>
        <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-600">
          {generalResults.length} Tests Found
        </span>
      </div>

      {generalResults.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed rounded-lg">
          <p className="text-gray-500 font-medium">No results found for student: "{rawName}"</p>
          <p className="text-xs text-gray-400 mt-2">Checking studentUid: {user?.uid || "Not Logged In"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {generalResults.map((res) => (
            <div
              key={res.id}
              onClick={() => setSelectedResult(res)}
              className="p-5 border rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {res.exam}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${res.grade === "11" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                    Grade {res.grade}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-gray-900">{res.percentage}%</p>
                    <p className="text-xs text-gray-500 italic">
                      {res.completedTime ? new Date(res.completedTime).toLocaleDateString() : res.completedDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">{res.score} / {res.total || 30}</p>
                    <p className="text-xs text-gray-400">Score</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl">
            <button
              onClick={() => setSelectedResult(null)}
              className="absolute top-6 right-6 hover:rotate-90 transition-transform bg-gray-100 p-2 rounded-full"
            >✕</button>
            <StudentSummaryCard examResult={selectedResult} />
          </div>
        </div>
      )}
    </div>
  );
}