// ==============================
// File: src/utils/ResultsAnalysisHub.jsx
// Floating round button (like Study Hub) that opens a compact
// Prelim-vs-June analysis panel with charts + filters.
// Zero-dependency (React + Tailwind + recharts + framer-motion + lucide-react)
// ==============================

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { LayoutGrid, X, ChevronDown, SlidersHorizontal } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export default function ResultsAnalysisHub({
  position = "bottom-right", // or "bottom-left"
  passThreshold = 50,
}) {
  const [open, setOpen] = React.useState(false);
  const [gradeFilter, setGradeFilter] = React.useState("All Grades");
  const [studentFilter, setStudentFilter] = React.useState("");
  const [topicFilter, setTopicFilter] = React.useState("All Topics");
  const [chartType, setChartType] = React.useState("bar"); // "bar" | "line"
  const [chartData, setChartData] = React.useState([]);
  const [topics, setTopics] = React.useState(["All Topics"]);
  const [students, setStudents] = React.useState([]);

  const isRight = position === "bottom-right";

  // --- Live data: June (studentResults) + Prelim (prelimResults) ---
  const juneRef = React.useRef([]);
  const prelimRef = React.useRef([]);

  React.useEffect(() => {
    const unsubs = [];

    // studentResults (June)
    try {
      const unsubJune = onSnapshot(collection(db, "studentResults"), (snap) => {
        juneRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        recompute();
      });
      unsubs.push(unsubJune);
    } catch (e) {}

    // prelimResults (Prelims)
    try {
      const unsubPrelim = onSnapshot(collection(db, "prelimResults"), (snap) => {
        prelimRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        recompute();
      });
      unsubs.push(unsubPrelim);
    } catch (e) {}

    return () => unsubs.forEach((fn) => fn && fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Build comparison data ---
  const recompute = React.useCallback(() => {
    const normalizeGrade = (g = "") => String(g).trim().toLowerCase();

    // Index prelim by student name
    const prelimByName = new Map();
    prelimRef.current.forEach((r) => {
      const name = r?.name || r?.studentName || r?.theory?.name || "Unknown";
      prelimByName.set(name, r);
    });

    const topicSet = new Set();
    const studentsSet = new Set();

    // Build rows per student with June vs Prelim theory % and optional topic filter
    const rows = [];

    juneRef.current.forEach((j) => {
      const name = j?.name || j?.studentName || j?.theory?.name || "Unknown";
      const grade = j?.grade || j?.theory?.grade || "";

      // grade filter
      if (
        gradeFilter !== "All Grades" &&
        !normalizeGrade(grade).includes(normalizeGrade(gradeFilter))
      ) {
        return;
      }

      const p = prelimByName.get(name);
      const juneTheory = safeTheoryResults(j);
      const prelimTheory = safeTheoryResults(p);

      // harvest topics for filter dropdown
      juneTheory.forEach((t) => topicSet.add(t.type || t.topic || "Unknown"));
      prelimTheory.forEach((t) => topicSet.add(t.type || t.topic || "Unknown"));
      studentsSet.add(name);

      const byTopic = mergeByTopic(juneTheory, prelimTheory);
      if (topicFilter !== "All Topics") {
        // only this topic
        const t = byTopic.find((x) => x.topic === topicFilter);
        const pctJune = t ? pct(t.june.score, t.june.max) : 0;
        const pctPrelim = t ? pct(t.prelim.score, t.prelim.max) : 0;
        rows.push({ name, June: pctJune, Prelim: pctPrelim });
      } else {
        // overall theory
        const sumJune = byTopic.reduce(
          (a, b) => ({ score: a.score + b.june.score, max: a.max + b.june.max }),
          { score: 0, max: 0 }
        );
        const sumPre = byTopic.reduce(
          (a, b) => ({ score: a.score + b.prelim.score, max: a.max + b.prelim.max }),
          { score: 0, max: 0 }
        );
        rows.push({ name, June: pct(sumJune.score, sumJune.max), Prelim: pct(sumPre.score, sumPre.max) });
      }
    });

    setChartData(
      rows
        .filter((r) => !studentFilter || r.name.toLowerCase().includes(studentFilter.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setTopics(["All Topics", ...Array.from(topicSet).sort()]);
    setStudents(Array.from(studentsSet).sort());
  }, [gradeFilter, studentFilter, topicFilter]);

  React.useEffect(() => {
    recompute();
  }, [recompute]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className={`fixed z-50 ${isRight ? "right-4" : "left-4"} bottom-4 flex items-end gap-3`}
      >
        {/* Panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="results-analysis-panel"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-[min(96vw,950px)] max-h-[78vh] overflow-hidden rounded-2xl shadow-xl border bg-white"
              role="dialog"
              aria-modal="true"
              aria-label="Prelim vs June Analysis"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-sm font-medium">Prelim vs June — Theory</span>
                </div>
                <button className="p-2 rounded hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3 p-3 border-b">
                <div className="flex items-center gap-2 text-sm text-gray-700"><SlidersHorizontal className="h-4 w-4"/>Filters</div>
                <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  {['All Grades','Grade 10','Grade 11','Grade 12','12A','12B'].map((g)=> <option key={g}>{g}</option>)}
                </select>
                <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  {topics.map((t)=> <option key={t}>{t}</option>)}
                </select>
                <input value={studentFilter} onChange={(e)=>setStudentFilter(e.target.value)} placeholder="Filter student..." className="border rounded px-2 py-1 text-sm"/>
                <select value={chartType} onChange={(e)=>setChartType(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                </select>
              </div>

              {/* Chart */}
              <div className="p-3">
                {chartData.length ? (
                  <ResponsiveContainer width="100%" height={400}>
                    {chartType === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={60} />
                        <YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} />
                        <Tooltip formatter={(v)=>`${Number(v).toFixed(1)}%`} />
                        <Legend />
                        <Bar dataKey="Prelim" fill="#8884d8" />
                        <Bar dataKey="June" fill="#00C49F" />
                      </BarChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} />
                        <YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} />
                        <Tooltip formatter={(v)=>`${Number(v).toFixed(1)}%`} />
                        <Legend />
                        <Line type="monotone" dataKey="Prelim" stroke="#8884d8" dot />
                        <Line type="monotone" dataKey="June" stroke="#00C49F" dot />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-10">No matching data.</p>
                )}
              </div>

              {/* Grouping by need (below threshold) */}
              <NeedsGroups data={chartData} passThreshold={passThreshold} topicSelected={topicFilter} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.button
          type="button"
          aria-label={open ? "Collapse analysis" : "Expand analysis"}
          onClick={() => setOpen((v) => !v)}
          className="group relative grid h-14 w-14 place-items-center rounded-full border bg-white shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          whileTap={{ scale: 0.98 }}
        >
          <LayoutGrid className={`h-6 w-6 transition-transform ${open ? "rotate-90" : "rotate-0"}`} />
          <span className="pointer-events-none absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full border bg-purple-600 text-white text-[10px] font-semibold shadow-sm">A</span>
          <span className="sr-only">Analysis</span>
          <ChevronDown className={`pointer-events-none absolute bottom-1 h-3 w-3 opacity-70 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}

// -------- helpers ---------
function pct(score, max) {
  const s = Number(score || 0);
  const m = Number(max || 0);
  return m > 0 ? (s / m) * 100 : 0;
}

function safeTheoryResults(entry) {
  // Accepts various shapes: entry.theory.results OR entry.results with type,score,max OR arrays
  if (!entry) return [];
  const arr = entry?.theory?.results || entry?.results || entry?.theory || [];
  return Array.isArray(arr) ? arr.filter(Boolean) : [];
}

function mergeByTopic(juneTheory, prelimTheory) {
  const map = new Map();
  const add = (list, key) => {
    list.forEach((r) => {
      const topic = r.type || r.topic || "Unknown";
      const score = Number(r.score || 0);
      const max = Number(r.max || r.total || r.outOf || 0) || guessMaxForTopic(topic, score);
      if (!map.has(topic)) map.set(topic, { topic, june: { score: 0, max: 0 }, prelim: { score: 0, max: 0 } });
      const bucket = map.get(topic)[key];
      bucket.score += score;
      bucket.max += max || 0;
    });
  };
  add(juneTheory, "june");
  add(prelimTheory, "prelim");
  return Array.from(map.values());
}

function guessMaxForTopic(topic, fallbackScore) {
  // heuristic if max is missing
  const T = String(topic).toLowerCase();
  if (T.includes("mcq")) return 10;
  if (T.includes("matching")) return 10;
  if (T.includes("t/" ) || T.includes("true")) return 5;
  if (T.includes("scenario")) return 25;
  if (T.includes("systems") || T.includes("technology")) return 20;
  if (T.includes("internet")) return 20;
  if (T.includes("information management")) return 10;
  if (T.includes("social")) return 10;
  if (T.includes("solution") || T.includes("development")) return 20;
  // fallback: assume at least the score
  return Math.max(10, Number(fallbackScore || 10));
}

function NeedsGroups({ data, passThreshold, topicSelected }) {
  // data row: { name, Prelim, June }
  const weakPrelim = [];
  const weakJune = [];
  const improved = [];
  const regressed = [];

  data.forEach((r) => {
    if ((r.Prelim || 0) < passThreshold) weakPrelim.push(r.name);
    if ((r.June || 0) < passThreshold) weakJune.push(r.name);
    const delta = (r.June || 0) - (r.Prelim || 0);
    if (delta >= 5) improved.push({ name: r.name, by: delta.toFixed(1) });
    if (delta <= -5) regressed.push({ name: r.name, by: Math.abs(delta).toFixed(1) });
  });

  return (
    <div className="border-t p-3 grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-3 bg-gray-50">
      <Group title={`< ${passThreshold}% in Prelim ${topicSelected !== 'All Topics' ? `(${topicSelected})` : ''}`} items={weakPrelim} badge="P"/>
      <Group title={`< ${passThreshold}% in June ${topicSelected !== 'All Topics' ? `(${topicSelected})` : ''}`} items={weakJune} badge="J"/>
      <Group title="Improved ≥ 5%" items={improved.map(i=>`${i.name} (+${i.by}%)`)} badge="↑"/>
      <Group title="Regressed ≥ 5%" items={regressed.map(i=>`${i.name} (-${i.by}%)`)} badge="↓"/>
    </div>
  );
}

function Group({ title, items, badge }) {
  return (
    <div className="rounded-xl bg-white border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="inline-grid place-items-center h-6 w-6 text-xs rounded-full bg-indigo-600 text-white">{badge}</span>
      </div>
      {items && items.length ? (
        <ul className="text-sm space-y-1 max-h-44 overflow-auto pr-1">
          {items.map((s, i) => (
            <li key={i} className="truncate">{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">— none —</p>
      )}
    </div>
  );
}

