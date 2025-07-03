import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Grade-specific score mappings
const GRADE_11_MAX_SCORES = {
  "MCQ": 10, "MATCHING ITEMS": 5, "T/F": 5,
  "SPREADSHEETS": 20, "DATABASES": 20,
  "INTERNET & NETWORK TECH": 20,
  "INTERNET & TECHNOLOGY SCENARIO": 20,
  "DATABASES SCENARIO": 20,
};
const GRADE_11_PRACTICAL = {
  "WORD PROCESSING": 33, "SPREADSHEETS": 21,
  "DATABASES": 26, "HTML": 20,
};
const GRADE_12_PRAC_SCORES = {
  "WORD PROCESSING Q1": 25, "WORD PROCESSING Q2": 19,
  "SPREADSHEETS": 24, "DATABASES": 40, "HTML": 33, "GENERAL": 9,
};
const GRADE_12_THEORY_SCORES = {
  "MCQ": 10, "MATCHING ITEMS": 10, "T/F": 5,
  "SYSTEMS TECHNOLOGIES": 20, "INTERNET & NETWORK TECHNOLOGIES": 15,
  "INFORMATION MANAGEMENT": 10, "SOCIAL IMPLICATIONS": 10,
  "SOLUTION DEVELOPMENT": 20, "APPLICATION SCENARIOS": 25,
  "ADVANCED TASK SCENARIOS": 25,
};

// Utility: normalize grade string
const normalizeGrade = (str) =>
  (str || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("grade", "");

export default function GroupWeakStudents() {
  const [mainExamData, setMainExamData] = useState({});
  const [groupedStudents, setGroupedStudents] = useState({});
  const [selectedGrade, setSelectedGrade] = useState("All Grades");

  const navigate = useNavigate();

  // Live Firestore listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "studentResults"), (snap) => {
      const data = {};
      snap.forEach((doc) => (data[doc.id] = doc.data()));
      setMainExamData(data);
    });
    return () => unsub();
  }, []);

  // Process students by grade
  useEffect(() => {
    const groups = {};

    Object.entries(mainExamData).forEach(([name, student]) => {
      const grade = student.grade || student.theory?.grade || student.practical?.grade || "Unknown";

      // Normalized filtering: only skip if grades don't match
      if (
        selectedGrade !== "All Grades" &&
        normalizeGrade(grade) !== normalizeGrade(selectedGrade)
      ) {
        return;
      }

      const results = [
        ...(student.theory?.results || []),
        ...(student.practical?.results || []),
      ];

      results.forEach((r) => {
        const topic = r.type || "Unknown";
        const score = Number(r.score || 0);
        let maxScore = 10;

        if (grade.includes("11")) {
          maxScore = GRADE_11_MAX_SCORES[topic] || GRADE_11_PRACTICAL[topic] || 10;
        } else if (grade.includes("12")) {
          maxScore = GRADE_12_THEORY_SCORES[topic] || GRADE_12_PRAC_SCORES[topic] || 10;
        }

        const percent = (score / maxScore) * 100;

        if (percent < 40) {
          if (!groups[topic]) groups[topic] = [];
          groups[topic].push({
            name, grade, score, maxScore,
            percent: percent.toFixed(1),
          });
        }
      });
    });

    setGroupedStudents(groups);
  }, [mainExamData, selectedGrade]);

  // EXPORT XLSX
  const handleExportExcel = () => {
    const exportData = [];
    Object.entries(groupedStudents).forEach(([topic, students]) => {
      students.forEach((s) => {
        exportData.push({
          Topic: topic,
          Name: s.name,
          Grade: s.grade,
          Score: s.score,
          MaxScore: s.maxScore,
          Percentage: s.percent + "%",
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WeakStudents");
    XLSX.writeFile(wb, `WeakStudents_${selectedGrade.replace(/\s+/g, "")}.xlsx`);
  };

  // EXPORT CSV
  const handleExportCSV = () => {
    const exportData = [];
    Object.entries(groupedStudents).forEach(([topic, students]) => {
      students.forEach((s) => {
        exportData.push({
          Topic: topic,
          Name: s.name,
          Grade: s.grade,
          Score: s.score,
          MaxScore: s.maxScore,
          Percentage: s.percent + "%",
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `WeakStudents_${selectedGrade.replace(/\s+/g, "")}.csv`;
    link.click();
  };

  // EXPORT PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Weak Students - ${selectedGrade}`, 14, 20);
    const tableData = [];
    Object.entries(groupedStudents).forEach(([topic, students]) => {
      students.forEach((s) => {
        tableData.push([
          topic, s.name, s.grade, s.score, s.maxScore, s.percent + "%",
        ]);
      });
    });
    doc.autoTable({
      head: [["Topic", "Name", "Grade", "Score", "Max Score", "Percentage"]],
      body: tableData,
      startY: 30,
    });
    doc.save(`WeakStudents_${selectedGrade.replace(/\s+/g, "")}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">
        📊 Group Students for Extra Lessons
      </h2>

      {/* Grade Select */}
      <div className="mb-4">
        <label className="font-medium mr-2">Select Grade:</label>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option>All Grades</option>
          <option>Grade 10</option>
          <option>Grade 11</option>
          <option>Grade 12</option>
          {/* <option>Grade 12B</option> */}
        </select>
      </div>

      {/* Return Home */}
      <button
        onClick={() => navigate("/all-results")}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ← Return Home
      </button>

      {/* Export Buttons */}
      {Object.keys(groupedStudents).length > 0 && (
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

      {/* Results Table */}
      {Object.keys(groupedStudents).length === 0 ? (
        <p className="text-center text-gray-500">
          No students need extra lessons based on current filters.
        </p>
      ) : (
        Object.entries(groupedStudents).map(([topic, students], idx) => (
          <div key={idx} className="bg-white p-4 rounded shadow mb-4">
            <h3 className="text-lg font-bold mb-2">
              {topic} - Students Needing Help
            </h3>
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Name</th>
                  <th className="border p-2">Grade</th>
                  <th className="border p-2">Score</th>
                  <th className="border p-2">Max</th>
                  <th className="border p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i} className="text-center">
                    <td className="border p-2">{s.name}</td>
                    <td className="border p-2">{s.grade}</td>
                    <td className="border p-2">{s.score}</td>
                    <td className="border p-2">{s.maxScore}</td>
                    <td
                      className={`border p-2 font-semibold ${
                        s.percent < 30 ? "text-red-600" : "text-yellow-600"
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
