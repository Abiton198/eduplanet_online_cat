
// ==============================
// File: src/components/AnalysisComponent.jsx (UPDATED)
// Adds: PRELIM vs JUNE comparisons (theory), per-student, per-topic,
// overall, grouping students by need, and extra chart mode.
// ==============================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../utils/firebase";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Legend
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF", "#FF4081"];

export default function AnalysisComponent() {
  const navigate = useNavigate();

  // ---------- Auth / Role ------------
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [selfNameLower, setSelfNameLower] = useState("");
  const [selfName, setSelfName] = useState("");

  // ---------- Data stores ------------
  const [mainExamData, setMainExamData] = useState({}); // studentResults per student
  const [generalExamData, setGeneralExamData] = useState([]); // examResults attempts
  const [prelimData, setPrelimData] = useState({}); // NEW: prelimResults per student

  // ---------- UI / Filters -----------
  const [dataset, setDataset] = useState("main");
  const [analysisType, setAnalysisType] = useState("overall");
  const [chartType, setChartType] = useState("pie");
  const [selectedGrade, setSelectedGrade] = useState("All Grades");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All Topics");

  const [chartData, setChartData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [groupings, setGroupings] = useState({});
  const chartRef = useRef(null);
  const unsubsRef = useRef([]);

  // ---------- Auth + Role Detection ----------
  useEffect(() => {
    const auth = getAuth();
    const stop = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setIsAdmin(false);
      setIsTeacher(false);
      setSelfNameLower("");
      setSelfName("");

      if (!u) return;

      try {
        let admin = false;
        if (u.email) {
          const adminSnap = await getDoc(doc(db, "admins", u.email));
          const isEmailPassword = (u.providerData || []).some((p) => p?.providerId === "password");
          admin = adminSnap.exists() && isEmailPassword;
        }
        let teacher = false;
        if (u.getIdTokenResult) {
          const token = await u.getIdTokenResult();
          teacher = token?.claims?.role === "teacher";
        }
        setIsAdmin(admin);
        setIsTeacher(teacher);
      } catch (e) {
        console.warn("Role detection failed:", e);
      }
    });
    return () => stop();
  }, []);

  // ---------- Subscriptions (studentResults + prelimResults + examResults) ----------
  useEffect(() => {
    unsubsRef.current.forEach((fn) => fn && fn());
    unsubsRef.current = [];
    if (!user?.uid) return;

    const unsubs = [];
    const canSeeAll = isAdmin || isTeacher;

    // studentResults
    try {
      const srRef = canSeeAll ? collection(db, "studentResults") : query(collection(db, "studentResults"), where("studentUid", "==", user.uid));
      const unsubMain = onSnapshot(srRef, (snap) => {
        const obj = {};
        snap.forEach((d) => (obj[d.id] = d.data()));
        setMainExamData(obj);
      });
      unsubs.push(unsubMain);
    } catch (e) {}

    // prelimResults (NEW)
    try {
      const prRef = canSeeAll ? collection(db, "prelimResults") : query(collection(db, "prelimResults"), where("studentUid", "==", user.uid));
      const unsubPre = onSnapshot(prRef, (snap) => {
        const obj = {};
        snap.forEach((d) => (obj[d.id] = d.data()));
        setPrelimData(obj);
      });
      unsubs.push(unsubPre);
    } catch (e) {}

    // examResults (general attempts)
    try {
      const resultsMap = new Map();
      const upsert = (docs) => {
        docs.forEach((d) => resultsMap.set(d.id, { id: d.id, ...d.data() }));
        setGeneralExamData(Array.from(resultsMap.values()));
      };
      if (canSeeAll) {
        unsubs.push(onSnapshot(collection(db, "examResults"), (snap) => upsert(snap.docs)));
      } else {
        unsubs.push(onSnapshot(query(collection(db, "examResults"), where("studentUid", "==", user.uid)), (snap) => upsert(snap.docs)));
      }
    } catch (e) {}

    unsubsRef.current = unsubs;
    return () => unsubs.forEach((fn) => fn && fn());
  }, [db, user?.uid, isAdmin, isTeacher]);

  const grades = useMemo(() => ["All Grades", "Grade 10", "Grade 11", "Grade 12", "12A", "12B"], []);
  const normalize = (s = "") => String(s).replace(/\s+/g, "").toLowerCase();

  // ---------- Analysis Options (now with comparisons) ----------
  const analysisOptions = useMemo(() => {
    if (dataset === "general") {
      return [
        { value: "g_overall", label: "General: Overall (Pass/Fail + Avg %)" },
        { value: "g_by_exam", label: "General: By Exam (Avg %)" },
        { value: "g_trend", label: "General: Trend by Date (Avg %)" },
        { value: "g_by_student", label: "General: By Student (Avg %)" },
      ];
    }
    return [
      { value: "overall", label: "Overall Performance" },
      { value: "overallQuestions", label: "Overall Per-Question Focus" },
      { value: "compare_overall", label: "COMPARE: Prelim vs June (Theory) — Overall" },
      { value: "compare_by_student", label: "COMPARE: Prelim vs June (Theory) — By Student" },
      { value: "compare_by_topic", label: "COMPARE: Prelim vs June (Theory) — By Topic" },
      { value: "needs_grouping", label: "Group Students by Need (Topic/Overall)" },
      { value: "individual", label: "Individual Summary" },
      { value: "question", label: "Per-Question (Single Student)" },
    ];
  }, [dataset]);

  // ---------- Utility to pull theory arrays ----------
  const grabTheory = (entry) => {
    if (!entry) return [];
    const arr = entry?.theory?.results || entry?.theory || entry?.results || [];
    return Array.isArray(arr) ? arr : [];
  };

  const pct = (s, m) => (m > 0 ? (Number(s || 0) / Number(m || 0)) * 100 : 0);

  // ---------- Core analysis (extended) ----------
  useEffect(() => {
    const isGradeMatch = (grade) =>
      selectedGrade === "All Grades" || (grade || "").toLowerCase().includes(selectedGrade.toLowerCase());

    let data = [];
    let recs = [];
    let groups = {};

    const mainEntries = Object.values(mainExamData).filter((e) => isGradeMatch(e?.grade || e?.theory?.grade));
    const prelimEntries = Object.values(prelimData).filter((e) => isGradeMatch(e?.grade || e?.theory?.grade));

    // Index prelim by name for quick join
    const prelimByName = new Map();
    prelimEntries.forEach((p) => {
      const key = (p?.name || p?.studentName || p?.theory?.name || "Unknown").trim();
      prelimByName.set(key, p);
    });

    // ------- COMPARISONS: June (main) vs Prelim (prelimData), theory only -------
    if (dataset === "main" && analysisType.startsWith("compare_")) {
      const byTopicAgg = new Map();
      const perStudent = [];

      mainEntries.forEach((j) => {
        const name = (j?.name || j?.studentName || j?.theory?.name || "Unknown").trim();
        if (selectedStudent && selectedStudent !== name) return;
        const p = prelimByName.get(name);

        const juneT = grabTheory(j);
        const preT = grabTheory(p);

        // Aggregate by topic for this student
        const merged = mergeByTopic(juneT, preT);

        // Per-student overall
        const js = merged.reduce((a, b) => ({ s: a.s + b.june.score, m: a.m + b.june.max }), { s: 0, m: 0 });
        const ps = merged.reduce((a, b) => ({ s: a.s + b.prelim.score, m: a.m + b.prelim.max }), { s: 0, m: 0 });
        perStudent.push({ name, June: pct(js.s, js.m), Prelim: pct(ps.s, ps.m) });

        // cohort by topic
        merged.forEach((row) => {
          if (selectedTopic !== "All Topics" && row.topic !== selectedTopic) return;
          if (!byTopicAgg.has(row.topic)) byTopicAgg.set(row.topic, { topic: row.topic, j: { s: 0, m: 0 }, p: { s: 0, m: 0 } });
          const agg = byTopicAgg.get(row.topic);
          agg.j.s += row.june.score; agg.j.m += row.june.max;
          agg.p.s += row.prelim.score; agg.p.m += row.prelim.max;
        });
      });

      if (analysisType === "compare_by_student") {
        data = perStudent.sort((a, b) => a.name.localeCompare(b.name));
        recs = buildCompareRecs(perStudent);
      }

      if (analysisType === "compare_overall") {
        const J = Array.from(byTopicAgg.values()).reduce((a, r) => ({ s: a.s + r.j.s, m: a.m + r.j.m }), { s: 0, m: 0 });
        const P = Array.from(byTopicAgg.values()).reduce((a, r) => ({ s: a.s + r.p.s, m: a.m + r.p.m }), { s: 0, m: 0 });
        data = [{ name: "Theory (Cohort)", Prelim: pct(P.s, P.m), June: pct(J.s, J.m) }];
        recs = buildCompareRecs(data);
      }

      if (analysisType === "compare_by_topic") {
        data = Array.from(byTopicAgg.values()).map((r) => ({ name: r.topic, Prelim: pct(r.p.s, r.p.m), June: pct(r.j.s, r.j.m) }));
        recs = data
          .slice()
          .sort((a, b) => a.June - b.June)
          .slice(0, 5)
          .map((r) => `${r.name}: June ${r.June.toFixed(1)}% vs Prelim ${r.Prelim.toFixed(1)}%`);
      }
    }

    // ------- Grouping by need (below 50%) -------
    if (dataset === "main" && analysisType === "needs_grouping") {
      const pass = 30;
      const buckets = { overall: { prelim: [], june: [] }, topics: {} };
      mainEntries.forEach((j) => {
        const name = (j?.name || j?.studentName || j?.theory?.name || "Unknown").trim();
        const p = prelimByName.get(name);
        const merged = mergeByTopic(grabTheory(j), grabTheory(p));
        const js = merged.reduce((a, b) => ({ s: a.s + b.june.score, m: a.m + b.june.max }), { s: 0, m: 0 });
        const ps = merged.reduce((a, b) => ({ s: a.s + b.prelim.score, m: a.m + b.prelim.max }), { s: 0, m: 0 });
        const jPct = pct(js.s, js.m);
        const pPct = pct(ps.s, ps.m);
        if (jPct < pass) buckets.overall.june.push({ name, pct: jPct });
        if (pPct < pass) buckets.overall.prelim.push({ name, pct: pPct });
        merged.forEach((row) => {
          const t = row.topic;
          if (!buckets.topics[t]) buckets.topics[t] = { prelim: [], june: [] };
          const jP = pct(row.june.score, row.june.max);
          const pP = pct(row.prelim.score, row.prelim.max);
          if (jP < pass) buckets.topics[t].june.push({ name, pct: jP });
          if (pP < pass) buckets.topics[t].prelim.push({ name, pct: pP });
        });
      });
      groups = buckets;
      data = Object.entries(buckets.topics).map(([t, v]) => ({ name: t, Prelim: v.prelim.length, June: v.june.length }));
      recs = [
        `Overall: Prelim <30% = ${groups.overall.prelim.length}, June <50% = ${groups.overall.june.length}.`,
        `Top topics with most students under 50% are shown in the chart.`,
      ];
    }

    setChartData(data);
    setRecommendations(recs);
    setGroupings(groups);
  }, [dataset, analysisType, selectedGrade, selectedStudent, selectedTopic, mainExamData, prelimData]);

  const hasData = chartData.length > 0;

  // ---------- Exports ----------
  const exportToPDF = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const props = pdf.getImageProperties(imgData);
    const height = (props.height * width) / props.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`analysis_${dataset}_${selectedStudent || selectedGrade || "all"}.pdf`);
  };
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analysis");
    XLSX.writeFile(wb, `analysis_${dataset}_${selectedStudent || selectedGrade || "all"}.xlsx`);
  };
  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analysis_${dataset}_${selectedStudent || selectedGrade || "all"}.csv`;
    link.click();
  };

  // ---------- UI ----------
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-6">📊 Exam Analysis Dashboard</h2>

      <button onClick={() => navigate("/all-results")} className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">← Return to All Results</button>

      {/* Top controls */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div>
          <label className="font-medium mr-2">Dataset:</label>
          <select value={dataset} onChange={(e) => { const next = e.target.value; setDataset(next); setAnalysisType(next === "general" ? "g_overall" : "overall"); }} className="border rounded px-3 py-1">
            <option value="main">Main Exams (Theory + Practical)</option>
            <option value="general">General Exams (Attempts)</option>
          </select>
        </div>

        <div>
          <label className="font-medium mr-2">Grade:</label>
          <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="border rounded px-3 py-1">
            { ["All Grades","Grade 10","Grade 11","Grade 12","12A","12B"].map((g) => (<option key={g}>{g}</option>)) }
          </select>
        </div>

        <div>
          <label className="font-medium mr-2">Analysis:</label>
          <select value={analysisType} onChange={(e) => setAnalysisType(e.target.value)} className="border rounded px-3 py-1">
            {analysisOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>

        {(analysisType === "compare_by_topic") && (
          <div>
            <label className="font-medium mr-2">Topic:</label>
            <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="border rounded px-3 py-1">
              <option>All Topics</option>
              <option>MCQ</option>
              <option>MATCHING ITEMS</option>
              <option>T/F</option>
              <option>SYSTEMS TECHNOLOGIES</option>
              <option>INTERNET & NETWORKS</option>
              <option>INTERNET & NETWORK TECH</option>
              <option>INFORMATION MANAGEMENT</option>
              <option>SOCIAL IMPLICATIONS</option>
              <option>SOLUTION DEVELOPMENT</option>
              <option>APPLICATION SCENARIO</option>
              <option>TASK SCENARIO</option>
            </select>
          </div>
        )}

        {(dataset === "main" && (analysisType === "question" || analysisType === "individual" || analysisType === "compare_by_student")) && (
          <div>
            <label className="font-medium mr-2">Student:</label>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="border rounded px-3 py-1">
              <option value="">Select</option>
              {Object.values(mainExamData).map((e) => {
                const nm = (e?.name || e?.studentName || e?.theory?.name || e?.id || "Unknown").trim();
                return <option key={nm} value={nm}>{nm}</option>;
              })}
            </select>
          </div>
        )}

        <div>
          <label className="font-medium mr-2">Chart Type:</label>
          <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="border rounded px-3 py-1">
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </select>
        </div>
      </div>

      {/* Chart + Recommendations */}
      <div ref={chartRef} className="bg-white p-4 rounded shadow">
        {hasData ? (
          <>
            {/* When comparing, prefer grouped Bar/Line */}
            {analysisType.startsWith("compare_") && (
              <ResponsiveContainer width="100%" height={420}>
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} />
                    <Tooltip formatter={(v)=>`${Number(v).toFixed(1)}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="Prelim" stroke="#8884d8" dot />
                    <Line type="monotone" dataKey="June" stroke="#00C49F" dot />
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} />
                    <Tooltip formatter={(v)=>`${Number(v).toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="Prelim" fill="#8884d8" />
                    <Bar dataKey="June" fill="#00C49F" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}

            {!analysisType.startsWith("compare_") && chartType === "pie" && (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} label>
                    {chartData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}

            {!analysisType.startsWith("compare_") && chartType === "bar" && (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {!analysisType.startsWith("compare_") && chartType === "line" && (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" dot />
                </LineChart>
              </ResponsiveContainer>
            )}

            <ul className="list-disc list-inside mt-4 space-y-1">
              {recommendations.map((rec, idx) => (<li key={idx}>{rec}</li>))}
            </ul>

            {analysisType === "needs_grouping" && (
              <NeedsTable groups={groupings} />
            )}
          </>
        ) : (
          <p className="text-center text-gray-500">No data for selected options.</p>
        )}
      </div>

      {/* Exports */}
      {hasData && (
        <div className="mt-4 flex gap-4">
          <button onClick={exportToPDF} className="bg-blue-600 text-white px-4 py-2 rounded">📄 PDF</button>
          <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded">📊 Excel</button>
          <button onClick={exportToCSV} className="bg-yellow-500 text-white px-4 py-2 rounded">📁 CSV</button>
        </div>
      )}

      {/* CTA */}
      <div onClick={() => navigate("/group-weak-students")} className="mt-6 cursor-pointer bg-pink-600 text-white rounded-xl shadow p-4 hover:scale-105 transition">
        <h3 className="text-xl font-bold">👥 Group Students Needing Attention</h3>
        <p className="text-center">Identify and plan extra lessons for students scoring less than 50%</p>
      </div>
    </div>
  );
}

// ----- local helpers (mirror those from ResultsAnalysisHub) -----
function pct(s, m) { return m > 0 ? (Number(s || 0) / Number(m || 0)) * 100 : 0; }
function mergeByTopic(juneTheory, prelimTheory) {
  const map = new Map();
  const add = (list, key) => {
    (list || []).forEach((r) => {
      const topic = r.type || r.topic || "Unknown";
      const score = Number(r.score || 0);
      const max = Number(r.max || r.total || r.outOf || 0) || guessMaxForTopic(topic, score);
      if (!map.has(topic)) map.set(topic, { topic, june: { score: 0, max: 0 }, prelim: { score: 0, max: 0 } });
      const bucket = map.get(topic)[key];
      bucket.score += score; bucket.max += max || 0;
    });
  };
  add(juneTheory, "june");
  add(prelimTheory, "prelim");
  return Array.from(map.values());
}
function guessMaxForTopic(topic, fallbackScore) {
  const T = String(topic).toLowerCase();
  if (T.includes("mcq")) return 10;
  if (T.includes("matching")) return 10;
  if (T.includes("t/")) return 5;
  if (T.includes("scenario")) return 25;
  if (T.includes("systems")) return 20;
  if (T.includes("internet")) return 20;
  if (T.includes("information management")) return 10;
  if (T.includes("social")) return 10;
  if (T.includes("solution") || T.includes("development")) return 20;
  return Math.max(10, Number(fallbackScore || 10));
}

function buildCompareRecs(rows) {
  const improving = rows.filter((r) => (r.June || 0) - (r.Prelim || 0) >= 5).length;
  const regressing = rows.filter((r) => (r.June || 0) - (r.Prelim || 0) <= -5).length;
  return [
    `${improving} improving (≥ +5%), ${regressing} regressing (≤ -5%).`,
    `Focus on students/topics below 50% and those regressing.`,
  ];
}

function NeedsTable({ groups }) {
  if (!groups?.topics) return null;
  const rows = Object.entries(groups.topics).map(([topic, v]) => ({ topic, prelim: v.prelim.length, june: v.june.length }));
  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">Students under 50% by Topic</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Topic</th>
              <th className="py-2 pr-4">{"#<50% (Prelim)"}</th>
              <th className="py-2 pr-4">{"#<50% (June)"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.topic} className="border-b">
                <td className="py-2 pr-4">{r.topic}</td>
                <td className="py-2 pr-4">{r.prelim}</td>
                <td className="py-2 pr-4">{r.june}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
