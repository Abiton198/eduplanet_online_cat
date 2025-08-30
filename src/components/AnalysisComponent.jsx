// src/components/AnalysisComponent.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../utils/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Chart colors
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF", "#FF4081"];

// Grade 11 theory max scores
const GRADE_11_MAX_SCORES = {
  MCQ: 10,
  "MATCHING ITEMS": 5,
  "T/F": 5,
  SPREADSHEETS: 20,
  DATABASES: 20,
  "INTERNET & NETWORK TECH": 20,
  "INTERNET & TECHNOLOGY SCENARIO": 20,
  "DATABASES SCENARIO": 20,
};

// Grade 11 practical max scores
const GRADE_11_PRACTICAL = {
  "WORD PROCESSING": 33,
  SPREADSHEETS: 21,
  DATABASES: 26,
  HTML: 20,
};

// Grade 12 practical scores
const GRADE_12_PRAC_SCORES = {
  "WORD PROCESSING Q1": 25,
  "WORD PROCESSING Q2": 19,
  SPREADSHEETS: 24,
  DATABASES: 40,
  HTML: 33,
  GENERAL: 9,
};

// Grade 12 theory scores
const GRADE_12_THEORY_SCORES = {
  MCQ: 10,
  "MATCHING ITEMS": 10,
  "T/F": 5,
  "SYSTEMS TECHNOLOGIES": 20,
  "INTERNET & NETWORKS": 15,
  "INTERNET & NETWORK TECH": 15,
  "INFORMATION MANAGEMENT": 10,
  "SOCIAL IMPLICATIONS": 10,
  "SOLUTION DEVELOPMENT": 20,
  "APPLICATION SCENARIO": 25,
  "TASK SCENARIO": 25,
};

// Default fallback
const DEFAULT_MAX_SCORES = {
  "WORD PROCESSING": 25,
  SPREADSHEETS: 24,
  DATABASES: 40,
  HTML: 33,
  GENERAL: 9,
};

export default function AnalysisComponent() {
  const navigate = useNavigate();

  // ---------- Auth / Role ------------
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [selfNameLower, setSelfNameLower] = useState("");
  const [selfName, setSelfName] = useState("");

  // ---------- Data stores ------------
  const [mainExamData, setMainExamData] = useState({}); // studentResults (per student)
  const [generalExamData, setGeneralExamData] = useState([]); // examResults (attempts)

  // ---------- UI / Filters -----------
  const [dataset, setDataset] = useState("main"); // "main" | "general"
  const [analysisType, setAnalysisType] = useState("overall"); // dynamic per dataset
  const [chartType, setChartType] = useState("pie");
  const [selectedGrade, setSelectedGrade] = useState("All Grades");
  const [selectedStudent, setSelectedStudent] = useState("");

  // General exam filters
  const [generalDateFrom, setGeneralDateFrom] = useState("");
  const [generalDateTo, setGeneralDateTo] = useState("");
  const [generalExamFilter, setGeneralExamFilter] = useState("");
  const [generalNameFilter, setGeneralNameFilter] = useState("");

  const [chartData, setChartData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
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
        // admin: /admins/{email} exists AND Email/Password sign-in
        let admin = false;
        if (u.email) {
          const adminSnap = await getDoc(doc(db, "admins", u.email));
          const isEmailPassword = (u.providerData || []).some(
            (p) => p?.providerId === "password"
          );
          admin = adminSnap.exists() && isEmailPassword;
        }

        // teacher via custom claim
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

  // ---------- Load self student profile (for legacy fallback on examResults) ----------
  useEffect(() => {
    let cancelled = false;
    const loadSelf = async () => {
      if (!user?.uid) return;
      try {
        const sSnap = await getDoc(doc(db, "students", user.uid));
        if (!cancelled && sSnap.exists()) {
          const data = sSnap.data() || {};
          const name = (data.name || "").trim();
          const lower = (data.nameLower || name.toLowerCase()).trim();
          setSelfName(name);
          setSelfNameLower(lower);
        }
      } catch (e) {
        console.warn("Load self student profile failed:", e?.message || e);
      }
    };
    loadSelf();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // ---------- Subscriptions (studentResults + examResults) ----------
  useEffect(() => {
    // cleanup old listeners
    unsubsRef.current.forEach((fn) => fn && fn());
    unsubsRef.current = [];
    if (!user?.uid) return;

    const unsubs = [];
    const canSeeAll = isAdmin || isTeacher;

    // studentResults (main)
    try {
      const srRef = canSeeAll
        ? collection(db, "studentResults")
        : query(collection(db, "studentResults"), where("studentUid", "==", user.uid));

      const unsubMain = onSnapshot(
        srRef,
        (snap) => {
          const obj = {};
          snap.forEach((d) => {
            obj[d.id] = d.data();
          });
          setMainExamData(obj);
        },
        (e) => console.error("studentResults listen failed:", e)
      );
      unsubs.push(unsubMain);
    } catch (e) {
      console.warn("Attach studentResults failed:", e);
    }

    // examResults (general attempts)
    try {
      const resultsMap = new Map();
      const upsert = (docs) => {
        docs.forEach((d) => resultsMap.set(d.id, { id: d.id, ...d.data() }));
        setGeneralExamData(Array.from(resultsMap.values()));
      };

      if (canSeeAll) {
        const unsubAll = onSnapshot(
          collection(db, "examResults"),
          (snap) => upsert(snap.docs),
          (e) => console.error("examResults listen failed:", e)
        );
        unsubs.push(unsubAll);
      } else {
        // primary: self-scoped by uid
        const unsubSelf = onSnapshot(
          query(collection(db, "examResults"), where("studentUid", "==", user.uid)),
          (snap) => upsert(snap.docs),
          (e) => console.error("examResults (self) listen failed:", e)
        );
        unsubs.push(unsubSelf);

        // legacy fallback by nameLower/name if no docs arrive initially
        const t = setTimeout(() => {
          if (resultsMap.size === 0) {
            if (selfNameLower) {
              unsubs.push(
                onSnapshot(
                  query(
                    collection(db, "examResults"),
                    where("nameLower", "==", selfNameLower)
                  ),
                  (snap) => upsert(snap.docs),
                  (e) => console.warn("legacy nameLower listen failed:", e)
                )
              );
            }
            if (selfName) {
              unsubs.push(
                onSnapshot(
                  query(collection(db, "examResults"), where("name", "==", selfName)),
                  (snap) => upsert(snap.docs),
                  (e) => console.warn("legacy name listen failed:", e)
                )
              );
            }
          }
        }, 300);
        unsubs.push(() => clearTimeout(t));
      }
    } catch (e) {
      console.warn("Attach examResults failed:", e);
    }

    unsubsRef.current = unsubs;
    return () => unsubs.forEach((fn) => fn && fn());
  }, [db, user?.uid, isAdmin, isTeacher, selfNameLower, selfName]);

  // ---------- Helpers ----------
  const grades = useMemo(
    () => ["All Grades", "Grade 10", "Grade 11", "Grade 12", "12A", "12B"],
    []
  );
  const normalize = (s = "") => String(s).replace(/\s+/g, "").toLowerCase();

  // ---------- Build analysis options per dataset ----------
  const analysisOptions = useMemo(() => {
    if (dataset === "general") {
      return [
        { value: "g_overall", label: "General: Overall (Pass/Fail + Avg %)" },
        { value: "g_by_exam", label: "General: By Exam (Avg %)" },
        { value: "g_trend", label: "General: Trend by Date (Avg %)" },
        { value: "g_by_student", label: "General: By Student (Avg %)" },
      ];
    }
    // main dataset
    return [
      { value: "overall", label: "Overall Performance" },
      { value: "overallQuestions", label: "Overall Per-Question Focus" },
      { value: "question", label: "Per-Question (Single Student)" },
      { value: "individual", label: "Individual Summary" },
    ];
  }, [dataset]);

  // ---------- Core analysis ----------
  useEffect(() => {
    // reset student picker if not needed
    if (dataset === "main") {
      if (analysisType === "overall" || analysisType === "overallQuestions") {
        setSelectedStudent("");
      }
    } else {
      // general dataset analysis doesn't need a specific student selection
      setSelectedStudent("");
    }

    const isGrade11 = selectedGrade === "Grade 11";
    const isGrade12 =
      selectedGrade === "Grade 12" ||
      selectedGrade === "12A" ||
      selectedGrade === "12B";

    let data = [];
    let recs = [];

    // ------------ MAIN (studentResults) ------------
    if (dataset === "main") {
      const entries = Object.entries(mainExamData)
        .filter(([_, entry]) => {
          const grade =
            entry?.grade || entry?.theory?.grade || entry?.practical?.grade || "";
          return (
            selectedGrade === "All Grades" ||
            grade.toLowerCase().includes(selectedGrade.toLowerCase())
          );
        })
        .map(([name, entry]) => ({ name, entry }));

      // 1) Cohort overall
      if (analysisType === "overall") {
        let sumTheory = 0,
          sumPrac = 0,
          sumGrand = 0;
        entries.forEach(({ entry }) => {
          const prac =
            entry.practical?.results?.reduce(
              (s, r) => s + Number(r.score || 0),
              0
            ) || 0;
          const theo =
            entry.theory?.results?.reduce(
              (s, r) => s + Number(r.score || 0),
              0
            ) || 0;

          let pracMax = isGrade12 ? 150 : isGrade11 ? 100 : 100;
          let theoMax = isGrade12 ? 150 : isGrade11 ? 120 : 120;

          sumPrac += (prac / pracMax) * 100;
          sumTheory += (theo / theoMax) * 100;
          sumGrand += ((prac + theo) / (pracMax + theoMax)) * 100;
        });
        const n = entries.length || 1;
        data = [
          { name: "Theory", value: parseFloat((sumTheory / n).toFixed(2)) },
          { name: "Practical", value: parseFloat((sumPrac / n).toFixed(2)) },
          {
            name: "Grand Total %",
            value: parseFloat((sumGrand / n).toFixed(2)),
          },
        ];
        recs = data.map((c) =>
          c.value < 50
            ? `${c.name} is ${c.value}% (below 50%).`
            : `${c.name} is ${c.value}%.`
        );
      }

      // 2) Cohort per-question (aggregated by type)
      else if (analysisType === "overallQuestions") {
        const agg = {};
        entries.forEach(({ entry }) => {
          const results = [
            ...(entry.theory?.results || []),
            ...(entry.practical?.results || []),
          ];
          // group each student's scores by type once
          const perStudentType = {};
          results.forEach((r) => {
            const type = r.type || "Unknown";
            const score = Number(r.score || 0);
            const max = isGrade11
              ? GRADE_11_MAX_SCORES[type] ||
                GRADE_11_PRACTICAL[type] ||
                DEFAULT_MAX_SCORES[type] ||
                10
              : isGrade12
              ? GRADE_12_THEORY_SCORES[type] ||
                GRADE_12_PRAC_SCORES[type] ||
                DEFAULT_MAX_SCORES[type] ||
                10
              : DEFAULT_MAX_SCORES[type] || 10;

            if (!perStudentType[type]) perStudentType[type] = { score: 0, max: 0 };
            perStudentType[type].score += score;
            perStudentType[type].max += max;
          });

          for (const [type, { score, max }] of Object.entries(perStudentType)) {
            if (!agg[type]) agg[type] = { score: 0, max: 0 };
            agg[type].score += Math.min(score, max);
            agg[type].max += max;
          }
        });

        data = Object.entries(agg).map(([type, { score, max }]) => ({
          name: type,
          value: parseFloat(((score / max) * 100).toFixed(2)),
        }));

        recs = data.map((c) =>
          c.value < 50 ? `${c.name}: ${c.value}% (focus).` : `${c.name}: ${c.value}%.`
        );
      }

      // 3) Individual summary
      else if (analysisType === "individual" && selectedStudent) {
        const entry = mainExamData[selectedStudent] || {};
        const prac =
          entry.practical?.results?.reduce(
            (s, r) => s + Number(r.score || 0),
            0
          ) || 0;
        const theo =
          entry.theory?.results?.reduce((s, r) => s + Number(r.score || 0), 0) ||
          0;

        let pracMax = isGrade12 ? 150 : isGrade11 ? 100 : 100;
        let theoMax = isGrade12 ? 150 : isGrade11 ? 120 : 120;
        const grand = ((prac + theo) / (pracMax + theoMax)) * 100;

        data = [
          {
            name: "Theory",
            value: parseFloat(((theo / theoMax) * 100).toFixed(2)),
          },
          {
            name: "Practical",
            value: parseFloat(((prac / pracMax) * 100).toFixed(2)),
          },
          { name: "Grand Total %", value: parseFloat(grand.toFixed(2)) },
        ];
        recs = data.map((c) =>
          c.value < 50
            ? `${c.name}: ${c.value}% (needs improvement).`
            : `${c.name}: ${c.value}%.`
        );
      }

      // 4) Per-question (single student)
      else if (analysisType === "question" && selectedStudent) {
        const entry = mainExamData[selectedStudent] || {};
        const results = [
          ...(entry.theory?.results || []),
          ...(entry.practical?.results || []),
        ];
        const seen = new Set();
        results.forEach((r) => {
          const key = `${r.type}-${r.question}`;
          if (seen.has(key)) return;
          seen.add(key);

          const type = r.type || "Unknown";
          const max = isGrade11
            ? GRADE_11_MAX_SCORES[type] ||
              GRADE_11_PRACTICAL[type] ||
              DEFAULT_MAX_SCORES[type] ||
              10
            : isGrade12
            ? GRADE_12_THEORY_SCORES[type] ||
              GRADE_12_PRAC_SCORES[type] ||
              DEFAULT_MAX_SCORES[type] ||
              10
            : DEFAULT_MAX_SCORES[type] || 10;

          const pct = (Number(r.score || 0) / max) * 100;
          data.push({
            name: `${type}-Q${r.question}`,
            value: parseFloat(pct.toFixed(1)),
          });
          recs.push(
            pct < 50
              ? `${type}-Q${r.question}: ${pct.toFixed(1)}% (work needed).`
              : `${type}-Q${r.question}: ${pct.toFixed(1)}%.`
          );
        });
      }
    }

    // ------------ GENERAL (examResults) ------------
    else if (dataset === "general") {
      // base filter
      const arr = generalExamData.filter((r) => {
        const g = r.grade ? normalize(r.grade) : "";
        const sel = normalize(selectedGrade);
        const gradeMatch = selectedGrade === "All Grades" || g.includes(sel);

        const date = r.completedDate || ""; // "YYYY-MM-DD"
        const fromOk = !generalDateFrom || (date && date >= generalDateFrom);
        const toOk = !generalDateTo || (date && date <= generalDateTo);

        const examMatch =
          !generalExamFilter ||
          (r.exam || "").toLowerCase().includes(generalExamFilter.toLowerCase());

        const nameMatch =
          !generalNameFilter ||
          (r.name || "")
            .toLowerCase()
            .includes(generalNameFilter.toLowerCase());

        return gradeMatch && fromOk && toOk && examMatch && nameMatch;
      });

      // A) Overall: pass/fail counts + average %
      if (analysisType === "g_overall") {
        const passThreshold = 50;
        let pass = 0;
        let fail = 0;
        let sumPct = 0;

        arr.forEach((r) => {
          const pct = Number(r.percentage) || 0;
          sumPct += pct;
          if (pct >= passThreshold) pass++;
          else fail++;
        });

        const avg = arr.length ? sumPct / arr.length : 0;

        data = [
          { name: "Pass", value: pass },
          { name: "Fail", value: fail },
        ];

        recs = [
          `Average percentage: ${avg.toFixed(1)}% across ${arr.length} attempt${arr.length === 1 ? "" : "s"}.`,
          `Pass rate: ${
            arr.length ? ((pass / arr.length) * 100).toFixed(1) : "0.0"
          }%. Focus on reducing fails.`,
        ];
      }

      // B) By Exam: average percentage per exam
      else if (analysisType === "g_by_exam") {
        const agg = {};
        arr.forEach((r) => {
          const exam = r.exam || "Unknown";
          const pct = Number(r.percentage) || 0;
          if (!agg[exam]) agg[exam] = { sum: 0, n: 0 };
          agg[exam].sum += pct;
          agg[exam].n += 1;
        });

        data = Object.entries(agg).map(([exam, { sum, n }]) => ({
          name: exam,
          value: parseFloat((sum / n).toFixed(2)),
        }));

        recs = data
          .sort((a, b) => a.value - b.value)
          .slice(0, 5)
          .map(
            (d) =>
              `${d.name}: ${d.value}% avg. ${
                d.value < 50 ? "⚠️ needs attention" : ""
              }`
          );
      }

      // C) Trend by Date: average % per date
      else if (analysisType === "g_trend") {
        const agg = {};
        arr.forEach((r) => {
          const date = r.completedDate || "Unknown";
          const pct = Number(r.percentage) || 0;
          if (!agg[date]) agg[date] = { sum: 0, n: 0 };
          agg[date].sum += pct;
          agg[date].n += 1;
        });

        data = Object.entries(agg)
          .map(([date, { sum, n }]) => ({
            name: date,
            value: parseFloat((sum / n).toFixed(2)),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (data.length >= 2) {
          const first = data[0].value;
          const last = data[data.length - 1].value;
          recs = [
            `Trend: ${last >= first ? "improving" : "declining"} (from ${first.toFixed(
              1
            )}% to ${last.toFixed(1)}%).`,
          ];
        } else {
          recs = ["Not enough data points to infer a trend."];
        }
      }

      // D) By Student: average % per student
      else if (analysisType === "g_by_student") {
        const agg = {};
        arr.forEach((r) => {
          const name = r.name || "Unknown";
          const pct = Number(r.percentage) || 0;
          if (!agg[name]) agg[name] = { sum: 0, n: 0 };
          agg[name].sum += pct;
          agg[name].n += 1;
        });

        data = Object.entries(agg).map(([student, { sum, n }]) => ({
          name: student,
          value: parseFloat((sum / n).toFixed(2)),
        }));

        // highlight bottom performers
        recs = data
          .sort((a, b) => a.value - b.value)
          .slice(0, 5)
          .map((d) => `${d.name}: ${d.value}% avg. ${d.value < 50 ? "⚠️" : ""}`);
      }
    }

    setChartData(data);
    setRecommendations(recs);
  }, [
    dataset,
    analysisType,
    selectedGrade,
    selectedStudent,
    mainExamData,
    generalExamData,
    generalDateFrom,
    generalDateTo,
    generalExamFilter,
    generalNameFilter,
  ]);

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
    pdf.save(
      `analysis_${dataset}_${selectedStudent || selectedGrade || "all"}.pdf`
    );
  };
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analysis");
    XLSX.writeFile(
      wb,
      `analysis_${dataset}_${selectedStudent || selectedGrade || "all"}.xlsx`
    );
  };
  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analysis_${dataset}_${
      selectedStudent || selectedGrade || "all"
    }.csv`;
    link.click();
  };

  const resetGeneralFilters = () => {
    setGeneralDateFrom("");
    setGeneralDateTo("");
    setGeneralExamFilter("");
    setGeneralNameFilter("");
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-6">
        📊 Exam Analysis Dashboard
      </h2>

      <button
        onClick={() => navigate("/all-results")}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ← Return to All Results
      </button>

      {/* Top controls */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div>
          <label className="font-medium mr-2">Dataset:</label>
          <select
            value={dataset}
            onChange={(e) => {
              const next = e.target.value;
              setDataset(next);
              // set sensible default analysis type per dataset
              setAnalysisType(next === "general" ? "g_overall" : "overall");
            }}
            className="border rounded px-3 py-1"
          >
            <option value="main">Main Exams (Theory + Practical)</option>
            <option value="general">General Exams (Attempts)</option>
          </select>
        </div>

        <div>
          <label className="font-medium mr-2">Grade:</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="border rounded px-3 py-1"
          >
            {grades.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-medium mr-2">Analysis:</label>
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            className="border rounded px-3 py-1"
          >
            {analysisOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {dataset === "main" &&
          (analysisType === "question" || analysisType === "individual") && (
            <div>
              <label className="font-medium mr-2">Student:</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="border rounded px-3 py-1"
              >
                <option value="">Select</option>
                {Object.keys(mainExamData).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

        <div>
          <label className="font-medium mr-2">Chart Type:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="pie">Pie</option>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
          </select>
        </div>
      </div>

      {/* General dataset filters */}
      {dataset === "general" && (
        <div className="grid md:grid-cols-5 sm:grid-cols-2 grid-cols-1 gap-3 mb-5">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Date from</label>
            <input
              type="date"
              value={generalDateFrom}
              onChange={(e) => setGeneralDateFrom(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Date to</label>
            <input
              type="date"
              value={generalDateTo}
              onChange={(e) => setGeneralDateTo(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Exam</label>
            <input
              value={generalExamFilter}
              onChange={(e) => setGeneralExamFilter(e.target.value)}
              placeholder="e.g. Algebra Quiz"
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Student name</label>
            <input
              value={generalNameFilter}
              onChange={(e) => setGeneralNameFilter(e.target.value)}
              placeholder="e.g. Sipho"
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={resetGeneralFilters}
              className="w-full border rounded px-3 py-2 hover:bg-gray-100"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      {/* Chart + Recommendations */}
      <div ref={chartRef} className="bg-white p-4 rounded shadow">
        {hasData ? (
          <>
            {chartType === "pie" && (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    label
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}

            {chartType === "bar" && (
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

            {chartType === "line" && (
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
              {recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-center text-gray-500">
            No data for selected options.
          </p>
        )}
      </div>

      {/* Exports */}
      {hasData && (
        <div className="mt-4 flex gap-4">
          <button
            onClick={exportToPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            📄 PDF
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            📊 Excel
          </button>
          <button
            onClick={exportToCSV}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            📁 CSV
          </button>
        </div>
      )}

      {/* CTA to weak-students grouping */}
      <div
        onClick={() => navigate("/group-weak-students")}
        className="mt-6 cursor-pointer bg-pink-600 text-white rounded-xl shadow p-4 hover:scale-105 transition"
      >
        <h3 className="text-xl font-bold">👥 Group Students Needing Attention</h3>
        <p className="text-center">
          Identify and plan extra lessons for students scoring less than 50%
        </p>
      </div>
    </div>
  );
}
