// src/pages/TeacherDashboard.jsx
import React, { useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import { studentList } from "../data/studentData";
import { db } from "../utils/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

function normalizeNameLower(name) {
  return (name || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function parseGradeYear(grade) {
  const m = String(grade || "").match(/\d{1,2}/);
  return m ? Number(m[0]) : null;
}

export default function TeacherDashboard() {
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [examSeries, setExamSeries] = useState("prelim"); // 'june' | 'prelim'
  const [examType, setExamType] = useState("theory");     // 'theory' | 'practical'
  const [examDate, setExamDate] = useState("");
  const [comment, setComment] = useState("");
  const [rows, setRows] = useState([{ question: "", type: "", score: "" }]);

  const typeOptions = [
    "MCQ",
    "MATCHING ITEMS",
    "T/F",
    "WORD PROCESSING",
    "SPREADSHEETS",
    "DATABASES",
    "HTML",
    "SYSTEMS TECHNOLOGIES",
    "INTERNET & NETWORK TECH",
    "INFORMATION MANAGEMENT",
    "SOCIAL IMPLICATIONS",
    "SOLUTION DEVELOPMENT",
    "APPLICATION SCENARIO",
    "TASK SCENARIO",
    "GENERAL",
  ];
  const questionOptions = Array.from({ length: 10 }, (_, i) => String(i + 1));

  // ⚠️ Ensure these keys match your studentList structure.
  const gradeKeyMap = {
    "Grade 10": ["10A"],
    "Grade 11": ["11", "11A"],
    "Grade 12": ["12A", "12B"],
  };

  const gradeStudents = useMemo(() => {
    if (!selectedGrade) return [];
    const keys = gradeKeyMap[selectedGrade] || [];
    return keys.flatMap((k) => studentList[k] || []);
  }, [selectedGrade]);

  const addRow = () => setRows((r) => [...r, { question: "", type: "", score: "" }]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));
  const handleChange = (index, field, value) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const totalScore = rows.reduce((sum, r) => sum + Number(r.score || 0), 0);

  // Customize totals per grade/exam type if needed
  let possibleTotal = 150;
  if (selectedGrade === "Grade 10") {
    possibleTotal = examType === "practical" ? 50 : 100;
  } else if (selectedGrade === "Grade 11") {
    possibleTotal = examType === "practical" ? 100 : 120;
  }
  const percent = possibleTotal ? ((totalScore / possibleTotal) * 100).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!selectedGrade || !selectedStudent || !examType) {
      alert("Please select grade, student, and exam type.");
      return;
    }

    // sanitize rows
    const cleanedRows = rows
      .map((r) => ({
        question: String(r.question || "").trim(),
        type: String(r.type || "").trim(),
        score: Number(r.score || 0),
      }))
      .filter((r) => r.question !== "" && !Number.isNaN(r.score));

    for (const r of cleanedRows) {
      if (r.score < 0) {
        alert("Scores cannot be negative.");
        return;
      }
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;

    const name = selectedStudent.trim();
    const nameLower = normalizeNameLower(name);

    // Try to get the student's UID from studentList, if present
    const selectedObj = gradeStudents.find((s) => normalizeNameLower(s.name) === nameLower);
    const studentUid = selectedObj?.uid || null; // ✅ fill this if your data has uid

    // Choose the correct collection
    const collectionName = examSeries === "prelim" ? "prelimResults" : "studentResults";
    const docRef = doc(db, collectionName, name);

    try {
      const snap = await getDoc(docRef);
      const existing = snap.exists() ? snap.data()[examType] || {} : {};

      const payload = {
        examTitle: examType === "theory" ? "Theory Exam" : "Practical Exam",
        examDate: examDate || existing.examDate || "",
        results: cleanedRows,
        comment: comment.trim() || existing.comment || "",
        grade: selectedGrade,
        percentage: percent,
        totalScore,
      };

      const rootUpserts = {
        // fields for reads + rules
        name,
        nameLower,
        grade: selectedGrade,
        gradeYear: parseGradeYear(selectedGrade),
        series: examSeries, // 'june' | 'prelim'
        // include studentUid if known (helps student reads by UID)
        ...(studentUid ? { studentUid } : {}),
        createdBy: currentUser?.uid || null,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(
        docRef,
        {
          ...rootUpserts,
          [examType]: payload, // theory | practical
        },
        { merge: true }
      );

      alert(`${examSeries === "prelim" ? "Prelim" : "June"} ${examType} results saved!`);

      // reset form bits
      setRows([{ question: "", type: "", score: "" }]);
      setComment("");
      setExamDate("");
    } catch (err) {
      console.error(err);
      alert("Error saving. Check console.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Teacher Dashboard - Post Results</h2>

      {/* Exam Series */}
      <label className="block mb-1">Exam Series:</label>
      <select
        value={examSeries}
        onChange={(e) => setExamSeries(e.target.value)}
        className="border p-2 mb-4 w-full"
      >
        <option value="june">June (Main Exams)</option>
        <option value="prelim">Prelim Exams</option>
      </select>

      {/* Grade Selection */}
      <label className="block mb-1">Select Grade:</label>
      <select
        value={selectedGrade}
        onChange={(e) => {
          setSelectedGrade(e.target.value);
          setSelectedStudent("");
        }}
        className="border p-2 mb-4 w-full"
      >
        <option value="">-- Select Grade --</option>
        <option value="Grade 10">Grade 10</option>
        <option value="Grade 11">Grade 11</option>
        <option value="Grade 12">Grade 12</option>
      </select>

      {/* Student Selection */}
      <label className="block mb-1">Select Student:</label>
      <select
        value={selectedStudent}
        onChange={(e) => setSelectedStudent(e.target.value)}
        className="border p-2 mb-4 w-full"
        disabled={!selectedGrade}
      >
        <option value="">-- Select Student --</option>
        {gradeStudents.map((s, idx) => (
          <option key={`${s.name}-${idx}`} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>

      {/* Exam Type */}
      <label className="block mb-1">Exam Type:</label>
      <select
        value={examType}
        onChange={(e) => setExamType(e.target.value)}
        className="border p-2 mb-4 w-full"
      >
        <option value="theory">Theory</option>
        <option value="practical">Practical</option>
      </select>

      {/* Exam Date */}
      <label className="block mb-1">Date:</label>
      <input
        type="date"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
        className="border p-2 mb-4 w-full"
      />

      {/* Comment */}
      <label className="block mb-1">Teacher Comment:</label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a comment for the student..."
        className="border p-2 mb-4 w-full"
        rows={3}
      />

      {/* Results Table */}
      <table className="w-full border mb-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Question</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Score</th>
            <th className="border p-2">Remove</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td className="border p-2">
                <select
                  value={row.question}
                  onChange={(e) => handleChange(idx, "question", e.target.value)}
                  className="border p-1 w-full"
                >
                  <option value="">--</option>
                  {questionOptions.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border p-2">
                <select
                  value={row.type}
                  onChange={(e) => handleChange(idx, "type", e.target.value)}
                  className="border p-1 w-full"
                >
                  <option value="">--</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border p-2">
                <input
                  type="number"
                  min="0"
                  value={row.score}
                  onChange={(e) => handleChange(idx, "score", e.target.value)}
                  className="border p-1 w-full"
                />
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => removeRow(idx)}
                  className="bg-red-500 text-white px-2 rounded"
                >
                  X
                </button>
              </td>
            </tr>
          ))}
          <tr className="font-bold bg-gray-50">
            <td className="border p-2">TOTAL</td>
            <td className="border p-2">-</td>
            <td className="border p-2">{totalScore}</td>
            <td className="border p-2" />
          </tr>
          <tr className="font-bold bg-gray-100">
            <td className="border p-2">PERCENTAGE</td>
            <td className="border p-2">-</td>
            <td className="border p-2">{percent}%</td>
            <td className="border p-2" />
          </tr>
        </tbody>
      </table>

      {/* Buttons */}
      <div className="flex gap-4">
        <button onClick={addRow} className="bg-green-600 text-white px-4 py-2 rounded">
          Add Question
        </button>
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded">
          Post Results & Comment
        </button>
      </div>
    </div>
  );
}
