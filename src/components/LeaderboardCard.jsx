import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../utils/firebase";

function parseGradeBits(grade) {
  const raw = String(grade ?? "").trim();
  // matches "11", "11A", "Grade 11", "11 A"
  const m = raw.match(/(\d{1,2})\s*([A-Za-z])?/);
  const year = m ? Number(m[1]) : null;
  const section = m && m[2] ? m[2].toUpperCase() : null;
  const gradeKey = raw.toLowerCase().replace(/\s+/g, ""); // "11", "11a", "grade11a"
  return { raw, year, section, gradeKey };
}

const LeaderboardCard = ({ grade, currentStudentId }) => {
  const [students, setStudents] = useState([]);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(""); // which query matched
  const myRowRef = useRef(null);

  const { raw, year, gradeKey } = useMemo(() => parseGradeBits(grade), [grade]);

  useEffect(() => {
    setStudents([]);
    setErr("");
    setSource("");

    if (!grade) return;

    const col = collection(db, "students");

    // Primary: by gradeYear (number) + orderBy
    const q1 = year != null
      ? query(col, where("gradeYear", "==", year), orderBy("totalPoints", "desc"))
      : null;

    // Fallback A: by gradeKey (e.g. "11a")
    const q2 = query(col, where("gradeKey", "==", gradeKey), orderBy("totalPoints", "desc"));

    // Fallback B: by exact grade string (e.g. "11A" or "Grade 11")
    const q3 = query(col, where("grade", "==", raw), orderBy("totalPoints", "desc"));

    let unsub1 = null;
    let unsub2 = null;
    let unsub3 = null;

    // We’ll try q1 first; if empty on the first emission, we switch to q2; then q3.
    const startFallback2 = () => {
      if (unsub2) return;
      unsub2 = onSnapshot(q2, (snap) => {
        if (snap.empty) {
          setSource((s) => (s || "gradeKey (empty)"));
          startFallback3();
          return;
        }
        setSource("gradeKey");
        setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setErr("");
      }, (e) => {
        setErr(e.message || "Failed to load leaderboard.");
      });
    };

    const startFallback3 = () => {
      if (unsub3) return;
      unsub3 = onSnapshot(q3, (snap) => {
        if (snap.empty) {
          setSource((s) => (s || "grade (empty)"));
          setStudents([]);
          return;
        }
        setSource("grade");
        setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setErr("");
      }, (e) => {
        setErr(e.message || "Failed to load leaderboard.");
      });
    };

    if (q1) {
      unsub1 = onSnapshot(q1, (snap) => {
        if (snap.empty) {
          setSource("gradeYear (empty)");
          startFallback2();
          return;
        }
        setSource("gradeYear");
        setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setErr("");
      }, (e) => {
        // If q1 fails (e.g. missing index), jump straight to q2
        setErr(e.message || "Failed to load leaderboard.");
        startFallback2();
      });
    } else {
      // No year parsed → go straight to fallbacks
      startFallback2();
    }

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
      if (unsub3) unsub3();
    };
  }, [grade, year, gradeKey]);

  const currentIndex = students.findIndex((s) => s.id === currentStudentId);
  const me = currentIndex >= 0 ? students[currentIndex] : null;
  const top5 = students.slice(0, 5);

  const rankIcon = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

  useEffect(() => {
    if (open && myRowRef.current) {
      setTimeout(() => myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [open]);

  return (
    <>
      {/* Compact floating card */}
      <div className="fixed top-24 right-6 w-[22rem] bg-white shadow-xl z-[9999] rounded-xl p-5 border">
        <h3 className="text-lg font-bold text-center mb-1">🏆 Leaderboard</h3>
        <p className="text-xs text-center text-gray-500 mb-3">Grade: {raw} • source: {source || "…"}</p>

        {err ? (
          <div className="text-sm text-red-600">{err}</div>
        ) : students.length === 0 ? (
          <div className="text-sm text-gray-600">
            No students found for <b>{raw}</b>.  
            Ask your app to store <code>gradeYear</code> and <code>gradeKey</code> on student docs.
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {top5.map((s, idx) => (
                <li
                  key={s.id}
                  className={`p-2 ${s.id === currentStudentId ? "bg-yellow-100 font-semibold" : ""}`}
                >
                  {rankIcon(idx)} • {Number(s.totalPoints || 0)} pts — {s.name || "Unnamed"}
                  {s.gradeSection ? ` (${s.gradeSection})` : ""}
                </li>
              ))}
              {currentIndex > 4 && me && (
                <li className="p-2 bg-blue-100 font-semibold">
                  #{currentIndex + 1} • {Number(me.totalPoints || 0)} pts — You
                  {me.gradeSection ? ` (${me.gradeSection})` : ""}
                </li>
              )}
            </ul>

            <div className="text-center mt-2">
              <button onClick={() => setOpen(true)} className="text-blue-600 underline text-sm">
                Read more…
              </button>
            </div>
          </>
        )}
      </div>

      {/* Full list drawer */}
      {open && (
        <div className="fixed inset-0 z-[10000] bg-black/40 flex justify-end">
          <div className="h-full w-full max-w-xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h4 className="font-bold">Full Leaderboard — {raw}</h4>
              <button onClick={() => setOpen(false)} className="rounded px-3 py-1 border hover:bg-gray-50">
                Close
              </button>
            </div>

            <div className="p-4 overflow-auto">
              {students.length === 0 ? (
                <div className="text-sm text-gray-600">No students found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left border-b">
                      <th className="py-2 pr-2 w-16">Rank</th>
                      <th className="py-2 pr-2">Student</th>
                      <th className="py-2 pr-2">Section</th>
                      <th className="py-2 pr-2 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const isMe = s.id === currentStudentId;
                      return (
                        <tr
                          key={s.id}
                          ref={isMe ? myRowRef : undefined}
                          className={`${isMe ? "bg-blue-50 font-semibold" : ""} border-b`}
                        >
                          <td className="py-2 pr-2">{idx < 3 ? rankIcon(idx) : `#${idx + 1}`}</td>
                          <td className="py-2 pr-2">{isMe ? "You" : (s.name || "Unnamed")}</td>
                          <td className="py-2 pr-2">{s.gradeSection || "-"}</td>
                          <td className="py-2 pr-2 text-right">{Number(s.totalPoints || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {currentIndex > 4 && me && (
              <div className="border-t p-3 text-sm bg-blue-50">
                Your current position: <b>#{currentIndex + 1}</b> with <b>{Number(me.totalPoints || 0)} pts</b>.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LeaderboardCard;
