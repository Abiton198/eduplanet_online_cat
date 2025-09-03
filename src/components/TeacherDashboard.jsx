// src/pages/TeacherDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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

/** Make N random positive integers that sum to `total`. Min per item = minEach */
function randomPartition(total, count, minEach = 1) {
  const base = Math.max(0, Math.floor(minEach));
  const minSum = base * count;
  const remainder = Math.max(0, total - minSum);
  if (count <= 0) return [];
  if (remainder === 0) return Array(count).fill(base);

  const cuts = Array.from({ length: count - 1 }, () => Math.random()).sort((a, b) => a - b);
  const portions = [];
  let prev = 0;
  for (let i = 0; i < cuts.length; i++) {
    portions.push(cuts[i] - prev);
    prev = cuts[i];
  }
  portions.push(1 - prev);

  let ints = portions.map((p) => Math.floor(p * remainder));
  let used = ints.reduce((a, b) => a + b, 0);
  let left = remainder - used;

  const fracs = portions
    .map((p, i) => ({ i, frac: p * remainder - ints[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < left; k++) ints[fracs[k % fracs.length].i]++;

  return ints.map((x) => x + base);
}

// ===============================================
// === YOU CAN EDIT THESE TOTALS (IN THE CODE) ===
// ===============================================

// THEORY must sum to 150. Edit these 10 numbers to your exact blueprint.
const THEORY_POSSIBLE = [
  10, 10, 5, 25, 15, 10, 10, 15, 25, 25, // sums to 150
];

// PRACTICAL per grade: arrays should sum to grade total (50 / 100 / 150).
// You can change counts and values; UI still allows editing/removal later.
const PRACTICAL_POSSIBLE = {
  "Grade 10": [8, 6, 5, 6, 8, 7, 5, 5],                     // sum 50
  "Grade 11": [12, 10, 8, 12, 14, 16, 12, 16],             // sum 100
  "Grade 12": [10, 10, 5, 25, 15, 10, 10, ,15,25,25],            // sum 150
};
// ===============================================

const DEFAULT_THEORY_TYPES = [
  "MCQ",
  "MATCHING ITEMS",
  "T/F",
  "WORD PROCESSING",
  "SPREADSHEETS",
  "DATABASES",
  "HTML",
  "SYSTEMS TECHNOLOGIES",
  "INFORMATION MANAGEMENT",
  "SOCIAL IMPLICATIONS",
];

const DEFAULT_PRACTICAL_TYPES = [
  "WORD PROCESSING",
  "SPREADSHEETS",
  "DATABASES",
  "HTML",
  "INTERNET & NETWORK TECH",
  "APPLICATION SCENARIO",
  "TASK SCENARIO",
  "GENERAL",
];

export default function TeacherDashboard() {
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [examSeries, setExamSeries] = useState("prelim"); // 'june' | 'prelim'
  const [examType, setExamType] = useState("theory");     // 'theory' | 'practical'
  const [examDate, setExamDate] = useState("");
  const [comment, setComment] = useState("");
  const [score, setScore] = useState("")
  const [rows, setRows] = useState([]); // each: { question, type, possible, score }

  // Move focus on Enter
  const scoreRefs = useRef([]);

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
  const questionOptions = Array.from({ length: 30 }, (_, i) => String(i + 1));

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

  // -------- Helpers for totals --------
  const theoryTotal = 150;
  const practicalTotalForGrade = (grade) => {
    if (grade === "Grade 10") return 50;
    if (grade === "Grade 11") return 100;
    return 150; // Grade 12 or default
  };

  // -------- Generators that consume the editable arrays --------
  const populateTheoryFromConfig = () => {
    const sum = THEORY_POSSIBLE.reduce((a, b) => a + b, 0);
    if (THEORY_POSSIBLE.length !== 10 || sum !== theoryTotal) {
      // fallback to random if config invalid
      const distribution = randomPartition(theoryTotal, 10, 5);
      const generated = Array.from({ length: 10 }, (_, i) => ({
        question: String(i + 1),
        type: DEFAULT_THEORY_TYPES[i] || typeOptions[i % typeOptions.length],
        possible: distribution[i],
        score: "",
      }));
      setRows(generated);
    } else {
      const generated = Array.from({ length: 10 }, (_, i) => ({
        question: String(i + 1),
        type: DEFAULT_THEORY_TYPES[i] || typeOptions[i % typeOptions.length],
        possible: THEORY_POSSIBLE[i],
        score: "",
      }));
      setRows(generated);
    }
    scoreRefs.current = scoreRefs.current.slice(0, 10);
  };

  const populatePracticalFromConfig = () => {
    const gradeTotal = practicalTotalForGrade(selectedGrade);
    const cfg = PRACTICAL_POSSIBLE[selectedGrade] || [];
    const cfgSum = cfg.reduce((a, b) => a + b, 0);

    let generated;
    if (cfg.length > 0 && cfgSum === gradeTotal) {
      generated = cfg.map((p, i) => ({
        question: String(i + 1),
        type: DEFAULT_PRACTICAL_TYPES[i] || DEFAULT_PRACTICAL_TYPES[i % DEFAULT_PRACTICAL_TYPES.length],
        possible: p,
        score: "",
      }));
    } else {
      // fallback to random if config invalid for that grade
      const cnt = Math.max(DEFAULT_PRACTICAL_TYPES.length, 6); // at least 6 tasks
      const distribution = randomPartition(gradeTotal, cnt, 3);
      generated = Array.from({ length: cnt }, (_, i) => ({
        question: String(i + 1),
        type: DEFAULT_PRACTICAL_TYPES[i] || DEFAULT_PRACTICAL_TYPES[i % DEFAULT_PRACTICAL_TYPES.length],
        possible: distribution[i],
        score: "",
      }));
    }
    setRows(generated);
    scoreRefs.current = scoreRefs.current.slice(0, generated.length);
  };

  // -------- React effects --------
  useEffect(() => {
    if (examType === "theory") {
      populateTheoryFromConfig();
    } else {
      populatePracticalFromConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examType, selectedGrade]);

  // -------- Table handlers --------
  const addRow = () =>
    setRows((r) => {
      const next = [...r, { question: "", type: "", possible: "", score: "" }];
      return next;
    });

  const removeRow = (index) =>
    setRows((prev) => prev.filter((_, i) => i !== index));

  const handleChange = (index, field, value) => {
    setRows((prev) => {
      const copy = [...prev];
      let val = value;
      if (field === "possible" || field === "score") {
        val = val === "" ? "" : String(val).replace(/[^\d.]/g, "");
      }
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleScoreKeyDown = (e, idx) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextIdx = idx + 1;
      if (scoreRefs.current[nextIdx]) {
        scoreRefs.current[nextIdx].focus();
      } else {
        // At the end: add a row for flow (practical only; theory stays fixed)
        if (examType === "practical") {
          addRow();
          setTimeout(() => {
            const last = scoreRefs.current[scoreRefs.current.length - 1];
            last && last.focus();
          }, 0);
        }
      }
    }
  };

  const numeric = (v) => (v === "" || v == null ? 0 : Number(v));
  const totalScore = rows.reduce((sum, r) => sum + numeric(r.score), 0);
  const possibleSum = rows.reduce((sum, r) => sum + numeric(r.possible), 0);

  const finalPossibleTotal =
    examType === "theory" ? theoryTotal : (possibleSum || practicalTotalForGrade(selectedGrade));

  const percent =
    finalPossibleTotal > 0 ? ((totalScore / finalPossibleTotal) * 100).toFixed(2) : "0.00";

  // -------- Submit --------
  const handleSubmit = async () => {
    if (!selectedGrade || !selectedStudent || !examType) {
      alert("Please select grade, student, and exam type.");
      return;
    }

    const cleanedRows = rows
      .map((r) => ({
        question: String(r.question || "").trim(),
        type: String(r.type || "").trim(),
        possible: Number(r.possible || 0),
        score: Number(r.score || 0),
      }))
      .filter((r) => r.question !== "" && !Number.isNaN(r.score));

    for (const r of cleanedRows) {
      if (r.score < 0) {
        alert("Scores cannot be negative.");
        return;
      }
      if (r.possible < 0) {
        alert("Possible marks cannot be negative.");
        return;
      }
    }

    // Guards
    if (examType === "theory") {
      const sumPossible = cleanedRows.reduce((s, r) => s + (r.possible || 0), 0);
      if (sumPossible !== theoryTotal) {
        alert(`Theory "Possible" must sum to ${theoryTotal} (currently ${sumPossible}).`);
        return;
      }
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;

    const name = selectedStudent.trim();
    const nameLower = normalizeNameLower(name);

    const keysForGrade = {
      "Grade 10": ["10A"],
      "Grade 11": ["11", "11A"],
      "Grade 12": ["12A", "12B"],
    };
    const keys = keysForGrade[selectedGrade] || [];
    const candidates = keys.flatMap((k) => studentList[k] || []);
    const selectedObj = candidates.find((s) => normalizeNameLower(s.name) === nameLower);
    const studentUid = selectedObj?.uid || null;

    const collectionName = examSeries === "prelim" ? "prelimResults" : "studentResults";
    const docRef = doc(db, collectionName, name);

    try {
      const snap = await getDoc(docRef);
      const existing = snap.exists() ? snap.data()[examType] || {} : {};

      const payload = {
        examTitle: examType === "theory" ? "Theory Exam" : "Practical Exam",
        examDate: examDate || existing.examDate || "",
        results: cleanedRows,                // includes possible & score per row
        comment: comment.trim() || existing.comment || "",
        grade: selectedGrade,
        percentage: percent,
        totalScore,
        possibleTotal: finalPossibleTotal,   // for quick reads
      };

      const rootUpserts = {
        name,
        nameLower,
        grade: selectedGrade,
        gradeYear: parseGradeYear(selectedGrade),
        series: examSeries, // 'june' | 'prelim'
        ...(studentUid ? { studentUid } : {}),
        createdBy: currentUser?.uid || null,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(
        docRef,
        {
          ...rootUpserts,
          [examType]: payload,
        },
        { merge: true }
      );

      alert(`${examSeries === "prelim" ? "Prelim" : "June"} ${examType} results saved!`);

      // Reset UX: keep config "possible" values for convenience, clear only scores
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          score: "",
        }))
      );
      setComment("");
      setExamDate("");
    } catch (err) {
      console.error(err);
      alert("Error saving. Check console.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
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
      <div className="flex items-center gap-3 mb-3">
        {examType === "theory" ? (
          <>
            <button
              type="button"
              onClick={populateTheoryFromConfig}
              className="bg-indigo-600 text-white px-3 py-2 rounded"
            >
              Use Config (150)
            </button>
            <button
              type="button"
              onClick={() => setRows(randomPartition(150, 10, 5).map((p, i) => ({
                question: String(i + 1),
                type: DEFAULT_THEORY_TYPES[i] || "GENERAL",
                possible: p,
                score: "",
              })))}
              className="bg-gray-600 text-white px-3 py-2 rounded"
            >
              Total 150
            </button>
          
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={populatePracticalFromConfig}
              className="bg-teal-600 text-white px-3 py-2 rounded"
            >
              Use Config ({practicalTotalForGrade(selectedGrade)})
            </button>
            <button
              type="button"
              onClick={() => {
                const total = practicalTotalForGrade(selectedGrade);
                const cnt = Math.max(DEFAULT_PRACTICAL_TYPES.length, 6);
                const dist = randomPartition(total, cnt, 3);
                setRows(Array.from({ length: cnt }, (_, i) => ({
                  question: String(i + 1),
                  type: DEFAULT_PRACTICAL_TYPES[i] || "GENERAL",
                  possible: dist[i],
                  score: "",
                })));
              }}
              className="bg-gray-600 text-white px-3 py-2 rounded"
            >
              Random Practical
            </button>
            
          </>
        )}
      </div>

      <table className="w-full border mb-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Question</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Possible</th>
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
                  {(examType === "theory" ? DEFAULT_THEORY_TYPES : DEFAULT_PRACTICAL_TYPES).map((t) => (
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
                  value={row.possible}
                  onChange={(e) => handleChange(idx, "possible", e.target.value)}
                  className="border p-1 w-full"
                  disabled={examType === "theory"} // theory possible is code-driven
                />
              </td>
              <td className="border p-2">
                <input
                  type="number"
                  min="0"
                  value={row.score}
                  onChange={(e) => handleChange(idx, "score", e.target.value)}
                  onKeyDown={(e) => handleScoreKeyDown(e, idx)}
                  className="border p-1 w-full"
                  ref={(el) => (scoreRefs.current[idx] = el)}
                />
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => removeRow(idx)}
                  className="bg-red-500 text-white px-2 rounded"
                  disabled={examType === "theory" && rows.length <= 10}
                  title={
                    examType === "theory"
                      ? "Theory keeps 10 questions; use Config/Random instead."
                      : "Remove row"
                  }
                >
                  X
                </button>
              </td>
            </tr>
          ))}
          <tr className="font-bold bg-gray-50">
            <td className="border p-2">TOTAL</td>
            <td className="border p-2">-</td>
            <td className="border p-2">{finalPossibleTotal}</td>
            <td className="border p-2">{totalScore}</td>
            <td className="border p-2" />
          </tr>
          <tr className="font-bold bg-gray-100">
            <td className="border p-2">PERCENTAGE</td>
            <td className="border p-2">-</td>
            <td className="border p-2" colSpan={2}>
              {percent}%
            </td>
            <td className="border p-2" />
          </tr>
        </tbody>
      </table>

      {/* Buttons */}
      <div className="flex gap-4">
        {examType === "practical" && (
          <button onClick={addRow} className="bg-green-600 text-white px-4 py-2 rounded">
            Add Row
          </button>
        )}
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2 rounded">
          Post Results & Comment
        </button>
      </div>
    </div>
  );
}
