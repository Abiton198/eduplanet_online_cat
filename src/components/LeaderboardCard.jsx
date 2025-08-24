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

  // ===== Collapsible + Draggable state =====
  const cardRef = useRef(null);
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const getPoint = (e) =>
    e.touches?.[0]
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("leaderboardCollapsed") || "true"); // default collapsed
    } catch {
      return true;
    }
  });

  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { x: 24, y: 96 };
    try {
      const saved = JSON.parse(localStorage.getItem("leaderboardPos") || "null");
      if (saved) return saved;
    } catch {}
    // Default near top-right
    const defaultWidth = 352; // ~22rem
    return { x: Math.max(16, window.innerWidth - defaultWidth - 16), y: 96 };
  });

  useEffect(() => {
    try {
      localStorage.setItem("leaderboardCollapsed", JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem("leaderboardPos", JSON.stringify(pos));
    } catch {}
  }, [pos]);

  // Keep within viewport on resize
  useEffect(() => {
    const handleResize = () => {
      if (!cardRef.current) return;
      const w = cardRef.current.offsetWidth || (collapsed ? 160 : 352);
      const h = cardRef.current.offsetHeight || (collapsed ? 48 : 300);
      setPos((p) => ({
        x: clamp(p.x, 8, window.innerWidth - w - 8),
        y: clamp(p.y, 8, window.innerHeight - h - 8),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [collapsed]);

  const onDragStart = (e) => {
    if (!cardRef.current) return;
    draggingRef.current = true;
    const pt = getPoint(e);
    const rect = cardRef.current.getBoundingClientRect();
    offsetRef.current = { x: pt.x - rect.left, y: pt.y - rect.top };
  };

  const onDrag = (e) => {
    if (!draggingRef.current || !cardRef.current) return;
    e.preventDefault(); // avoid scroll on touch
    const pt = getPoint(e);
    const w = cardRef.current.offsetWidth || (collapsed ? 160 : 352);
    const h = cardRef.current.offsetHeight || (collapsed ? 48 : 300);
    const x = clamp(pt.x - offsetRef.current.x, 8, window.innerWidth - w - 8);
    const y = clamp(pt.y - offsetRef.current.y, 8, window.innerHeight - h - 8);
    setPos({ x, y });
  };

  const onDragEnd = () => {
    draggingRef.current = false;
  };

  useEffect(() => {
    const move = (e) => onDrag(e);
    const up = () => onDragEnd();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Firestore logic (unchanged) =====
  const { raw, year, gradeKey } = useMemo(() => parseGradeBits(grade), [grade]);

  useEffect(() => {
    setStudents([]);
    setErr("");
    setSource("");

    if (!grade) return;

    const col = collection(db, "students");

    // Primary: by gradeYear (number) + orderBy
    const q1 =
      year != null
        ? query(col, where("gradeYear", "==", year), orderBy("totalPoints", "desc"))
        : null;

    // Fallback A: by gradeKey (e.g. "11a")
    const q2 = query(col, where("gradeKey", "==", gradeKey), orderBy("totalPoints", "desc"));

    // Fallback B: by exact grade string (e.g. "11A" or "Grade 11")
    const q3 = query(col, where("grade", "==", raw), orderBy("totalPoints", "desc"));

    let unsub1 = null;
    let unsub2 = null;
    let unsub3 = null;

    const startFallback3 = () => {
      if (unsub3) return;
      unsub3 = onSnapshot(
        q3,
        (snap) => {
          if (snap.empty) {
            setSource((s) => s || "grade (empty)");
            setStudents([]);
            return;
          }
          setSource("grade");
          setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setErr("");
        },
        (e) => setErr(e.message || "Failed to load leaderboard.")
      );
    };

    const startFallback2 = () => {
      if (unsub2) return;
      unsub2 = onSnapshot(
        q2,
        (snap) => {
          if (snap.empty) {
            setSource((s) => s || "gradeKey (empty)");
            startFallback3();
            return;
          }
          setSource("gradeKey");
          setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setErr("");
        },
        (e) => {
          setErr(e.message || "Failed to load leaderboard.");
        }
      );
    };

    if (q1) {
      unsub1 = onSnapshot(
        q1,
        (snap) => {
          if (snap.empty) {
            setSource("gradeYear (empty)");
            startFallback2();
            return;
          }
          setSource("gradeYear");
          setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setErr("");
        },
        (e) => {
          setErr(e.message || "Failed to load leaderboard.");
          startFallback2();
        }
      );
    } else {
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

  const myRowRef = useRef(null);
  useEffect(() => {
    if (open && myRowRef.current) {
      setTimeout(() => myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [open]);

  return (
    <>
      {/* Floating, collapsible, draggable card */}
      <div
        ref={cardRef}
        className={[
          "fixed z-[9999] select-none",
          "rounded-xl border bg-white shadow-xl",
          collapsed ? "w-auto" : "w-[22rem]"
        ].join(" ")}
        style={{ left: pos.x, top: pos.y }}
      >
        {/* Header (drag handle) */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-50 border-b rounded-t-xl cursor-grab active:cursor-grabbing"
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <span className="font-semibold">Leaderboard</span>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-md px-2 py-1 text-xs font-medium bg-slate-200 hover:bg-slate-300"
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>

        {/* Body (hidden when collapsed) */}
        {!collapsed && (
          <div className="p-5">
            <p className="text-xs text-center text-gray-500 mb-3">
              Grade: {raw} • source: {source || "…"}
            </p>

            {err ? (
              <div className="text-sm text-red-600">{err}</div>
            ) : students.length === 0 ? (
              <div className="text-sm text-gray-600">
                No students found for <b>{raw}</b>.{" "}
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
