import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

/* -----------------------------
   Max scores per grade/topic
------------------------------*/
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
const GRADE_11_PRACTICAL = {
  "WORD PROCESSING": 33,
  SPREADSHEETS: 21,
  DATABASES: 26,
  HTML: 20,
};
const GRADE_12_PRAC_SCORES = {
  "WORD PROCESSING Q1": 25,
  "WORD PROCESSING Q2": 19,
  SPREADSHEETS: 24,
  DATABASES: 40,
  HTML: 33,
  GENERAL: 9,
};
const GRADE_12_THEORY_SCORES = {
  MCQ: 10,
  "MATCHING ITEMS": 10,
  "T/F": 5,
  "SYSTEMS TECHNOLOGIES": 20,
  "INTERNET & NETWORK TECHNOLOGIES": 15,
  "INFORMATION MANAGEMENT": 10,
  "SOCIAL IMPLICATIONS": 10,
  "SOLUTION DEVELOPMENT": 20,
  "APPLICATION SCENARIOS": 25,
  "ADVANCED TASK SCENARIOS": 25,
};

/* -----------------------------
   Utils
------------------------------*/
const normalizeGrade = (str) =>
  (str || "").toLowerCase().replace(/\s+/g, "").replace("grade", "");

const isGrade11 = (g) => /(^|[^0-9])11([^0-9]|$)/.test(String(g));
const isGrade12 = (g) => /(^|[^0-9])12([^0-9]|$)/.test(String(g));

// date helpers (handle string ISO "YYYY-MM-DD", Date, or Firestore Timestamp-like)
function toDateString(v) {
  if (!v) return null;
  try {
    if (typeof v === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      if (v.includes("T")) return v.slice(0, 10);
      return v; // fallback
    }
    if (typeof v === "object" && v.seconds && v.nanoseconds) {
      const d = new Date(v.seconds * 1000);
      return d.toISOString().slice(0, 10);
    }
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  } catch (_) {}
  return null;
}

function pickExamDate(obj = {}) {
  const candidates = [
    obj.examDate,
    obj.theory?.examDate,
    obj.practical?.examDate,
    obj.completedDate,
    obj.completedAt,
  ];
  for (const c of candidates) {
    const s = toDateString(c);
    if (s) return s;
  }
  return null;
}

/* ------------------------------------------------
   Component
-------------------------------------------------*/
export default function GroupWeakStudents({ passThreshold = 50 }) {
  const navigate = useNavigate();

  // Raw data maps from Firestore
  const [juneData, setJuneData] = useState({}); // studentResults
  const [prelimData, setPrelimData] = useState({}); // prelimResults

  // View + filters
  const [view, setView] = useState("june"); // "june" | "prelim"
  const [selectedGrade, setSelectedGrade] = useState("All Grades");

  // Sorting inside each topic
  const [topicSortKey, setTopicSortKey] = useState("percent"); // "percent" | "score" | "name"
  const [topicSortDir, setTopicSortDir] = useState("asc"); // "asc" | "desc"

  // Load BOTH collections (live)
  useEffect(() => {
    const unsubJune = onSnapshot(collection(db, "studentResults"), (snap) => {
      const obj = {};
      snap.forEach((d) => (obj[d.id] = d.data()));
      setJuneData(obj);
    });

    const unsubPrelim = onSnapshot(collection(db, "prelimResults"), (snap) => {
      const obj = {};
      snap.forEach((d) => (obj[d.id] = d.data()));
      setPrelimData(obj);
    });

    return () => {
      unsubJune && unsubJune();
      unsubPrelim && unsubPrelim();
    };
  }, []);

  // Find the most recent prelim examDate (so "current results as per exam")
  const currentPrelimDate = useMemo(() => {
    const dates = Object.values(prelimData)
      .map((row) => pickExamDate(row))
      .filter(Boolean)
      .sort(); // lexicographic OK for YYYY-MM-DD
    return dates.length ? dates[dates.length - 1] : null;
  }, [prelimData]);

  // pick active dataset; for prelim, keep ONLY current examDate docs
  const activeData = useMemo(() => {
    if (view === "june") return juneData;
    if (!currentPrelimDate) return {};
    const filtered = {};
    Object.entries(prelimData).forEach(([id, row]) => {
      const d = pickExamDate(row);
      if (d === currentPrelimDate) filtered[id] = row;
    });
    return filtered;
  }, [view, juneData, prelimData, currentPrelimDate]);

  // Compute grouped students under threshold for the active dataset
  const groupedStudents = useMemo(() => {
    const groups = {};

    Object.entries(activeData).forEach(([name, student]) => {
      const grade =
        student?.grade ||
        student?.theory?.grade ||
        student?.practical?.grade ||
        "Unknown";

      if (
        selectedGrade !== "All Grades" &&
        normalizeGrade(grade) !== normalizeGrade(selectedGrade)
      ) {
        return;
      }

      const results = [
        ...(student?.theory?.results || []),
        ...(student?.practical?.results || []),
      ];

      const seen = new Set(); // avoid duplicate (type,question)
      results.forEach((r) => {
        const topic = r?.type || "Unknown";
        const q = r?.question ?? "";
        const key = `${topic}|${q}`;
        if (seen.has(key)) return;
        seen.add(key);

        const score = Number(r?.score || 0);
        let maxScore = 10;

        if (isGrade11(grade)) {
          maxScore =
            GRADE_11_MAX_SCORES[topic] ||
            GRADE_11_PRACTICAL[topic] ||
            10;
        } else if (isGrade12(grade)) {
          maxScore =
            GRADE_12_THEORY_SCORES[topic] ||
            GRADE_12_PRAC_SCORES[topic] ||
            10;
        }

        const percent = (score / maxScore) * 100;

        if (percent < passThreshold) {
          if (!groups[topic]) groups[topic] = [];
          groups[topic].push({
            name,
            grade,
            score,
            maxScore,
            percent: Number.isFinite(percent) ? Number(percent.toFixed(1)) : 0,
          });
        }
      });
    });

    // Sort each topic list with the chosen sort key/direction
    const dir = topicSortDir === "asc" ? 1 : -1;
    const val = (s) =>
      topicSortKey === "percent"
        ? Number(s.percent)
        : topicSortKey === "score"
        ? Number(s.score)
        : String(s.name || "").toLowerCase();

    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => {
        const av = val(a);
        const bv = val(b);
        if (av === bv) return 0;
        return av < bv ? -1 * dir : 1 * dir;
      })
    );

    // Sort topics by number of struggling students (desc)
    return Object.fromEntries(
      Object.entries(groups).sort(([, a], [, b]) => b.length - a.length)
    );
  }, [activeData, selectedGrade, passThreshold, topicSortKey, topicSortDir]);

  /* -----------------------------
     Exports (use active view)
  ------------------------------*/
  const exportSheetName = `${view === "june" ? "June" : "Prelim"}_WeakStudents_${selectedGrade.replace(
    /\s+/g,
    ""
  )}${view === "prelim" && currentPrelimDate ? `_on_${currentPrelimDate}` : ""}`;

  const exportRows = () => {
    const rows = [];
    Object.entries(groupedStudents).forEach(([topic, students]) => {
      students.forEach((s) => {
        rows.push({
          View: view === "june" ? "June" : "Prelim",
          Topic: topic,
          Name: s.name,
          Grade: s.grade,
          Score: s.score,
          MaxScore: s.maxScore,
          Percentage: `${s.percent}%`,
          ...(view === "prelim" && currentPrelimDate ? { ExamDate: currentPrelimDate } : {}),
        });
      });
    });
    return rows;
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeakStudents");
    XLSX.writeFile(wb, `${exportSheetName}.xlsx`);
  };

  const handleExportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${exportSheetName}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const title = `Weak Students (${view === "june" ? "June" : "Prelim"}) - ${selectedGrade}${
      view === "prelim" && currentPrelimDate ? ` [${currentPrelimDate}]` : ""
    }`;
    doc.text(title, 14, 20);

    const tableData = [];
    Object.entries(groupedStudents).forEach(([topic, students]) => {
      students.forEach((s) => {
        tableData.push([
          topic,
          s.name,
          s.grade,
          s.score,
          s.maxScore,
          `${s.percent}%`,
        ]);
      });
    });

    doc.autoTable({
      head: [["Topic", "Name", "Grade", "Score", "Max Score", "Percentage"]],
      body: tableData,
      startY: 30,
    });
    doc.save(`${exportSheetName}.pdf`);
  };

  const hasGroups = Object.keys(groupedStudents).length > 0;

  /* -----------------------------
     UI
  ------------------------------*/
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">📊 Group Students for Extra Lessons</h2>

        {/* Tiny toggle buttons (June / Prelim) */}
        <div className="inline-flex rounded-lg border overflow-hidden">
          <button
            onClick={() => setView("june")}
            className={`px-3 py-1 text-sm ${view === "june" ? "bg-indigo-600 text-white" : "bg-white hover:bg-gray-50"}`}
            title="Show June (studentResults)"
          >
            June
          </button>
          <button
            onClick={() => setView("prelim")}
            className={`px-3 py-1 text-sm ${view === "prelim" ? "bg-indigo-600 text-white" : "bg-white hover:bg-gray-50"}`}
            title="Show Prelim (prelimResults, latest exam only)"
          >
            Prelim
          </button>
        </div>
      </div>

      {/* Grade Select + current prelim badge */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="font-medium">Select Grade:</label>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option>All Grades</option>
          <option>Grade 10</option>
          <option>Grade 11</option>
          <option>Grade 12</option>
        </select>

        {view === "prelim" && (
          <span className="ml-2 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 border">
            Showing latest prelim only {currentPrelimDate ? `(${currentPrelimDate})` : ""}
          </span>
        )}

        <button
          onClick={() => navigate("/all-results")}
          className="ml-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ← Return Home
        </button>
      </div>

      {/* Per-topic sort controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-gray-600">Sort each topic by:</span>
        <div className="inline-flex rounded border overflow-hidden">
          <button
            className={`px-3 py-1 text-sm ${topicSortKey === "percent" ? "bg-gray-800 text-white" : "bg-white"}`}
            onClick={() => setTopicSortKey("percent")}
            title="Sort by Percentage"
          >
            %
          </button>
          <button
            className={`px-3 py-1 text-sm ${topicSortKey === "score" ? "bg-gray-800 text-white" : "bg-white"}`}
            onClick={() => setTopicSortKey("score")}
            title="Sort by Raw Score"
          >
            Score
          </button>
          <button
            className={`px-3 py-1 text-sm ${topicSortKey === "name" ? "bg-gray-800 text-white" : "bg-white"}`}
            onClick={() => setTopicSortKey("name")}
            title="Sort by Name"
          >
            Name
          </button>
        </div>

        <div className="inline-flex rounded border overflow-hidden">
          <button
            className={`px-2 py-1 text-sm ${topicSortDir === "asc" ? "bg-indigo-600 text-white" : "bg-white"}`}
            onClick={() => setTopicSortDir("asc")}
            title="Ascending"
          >
            ▲
          </button>
          <button
            className={`px-2 py-1 text-sm ${topicSortDir === "desc" ? "bg-indigo-600 text-white" : "bg-white"}`}
            onClick={() => setTopicSortDir("desc")}
            title="Descending"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Export Buttons */}
      {hasGroups && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleExportExcel}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Export Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Export PDF
          </button>
        </div>
      )}

      {/* Results */}
      {!hasGroups ? (
        <p className="text-center text-gray-500">
          No students under {passThreshold}% for {view === "june" ? "June" : "Prelim"}
          {view === "prelim" && currentPrelimDate ? ` (on ${currentPrelimDate})` : ""} with the current grade filter.
        </p>
      ) : (
        Object.entries(groupedStudents).map(([topic, students], idx) => (
          <div key={idx} className="bg-white p-4 rounded shadow mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">
                {topic} — Students Needing Help ({students.length})
              </h3>

              {/* Per-topic quick toggles (apply global state) */}
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">Sort:</div>
                <button
                  className={`px-2 py-1 text-xs rounded border ${topicSortDir === "asc" ? "bg-indigo-600 text-white" : "bg-white"}`}
                  onClick={() => setTopicSortDir("asc")}
                  title="Ascending"
                >
                  ▲
                </button>
                <button
                  className={`px-2 py-1 text-xs rounded border ${topicSortDir === "desc" ? "bg-indigo-600 text-white" : "bg-white"}`}
                  onClick={() => setTopicSortDir("desc")}
                  title="Descending"
                >
                  ▼
                </button>
              </div>
            </div>

            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Grade</th>
                  <th className="border p-2 text-right">Score</th>
                  <th className="border p-2 text-right">Max</th>
                  <th className="border p-2 text-right">% </th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border p-2">{s.name}</td>
                    <td className="border p-2">{s.grade}</td>
                    <td className="border p-2 text-right">{s.score}</td>
                    <td className="border p-2 text-right">{s.maxScore}</td>
                    <td
                      className={`border p-2 text-right font-semibold ${
                        Number(s.percent) < 30
                          ? "text-red-600"
                          : Number(s.percent) < passThreshold
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {s.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
