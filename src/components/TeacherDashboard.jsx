import React, { useState } from 'react';
import { studentList } from '../data/studentData';
import { db } from '../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function TeacherDashboard() {
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [examType, setExamType] = useState('theory');
  const [examDate, setExamDate] = useState('');
  const [comment, setComment] = useState('');
  const [rows, setRows] = useState([{ question: '', type: '', score: '' }]);

  const typeOptions = [
    'MCQ', 'MATCHING ITEMS', 'T/F', 'WORD PROCESSING', 'SPREADSHEETS',
    'DATABASES', 'HTML', 'SYSTEMS TECHNOLOGIES', 'INTERNET & NETWORK TECH',
    'INFORMATION MANAGEMENT', 'SOCIAL IMPLICATIONS', 'SOLUTION DEVELOPMENT',
    'APPLICATION SCENARIO', 'TASK SCENARIO', 'GENERAL'
  ];
  const questionOptions = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

  // ✅ Map UI grade labels to your studentList keys
  const gradeKeyMap = {
    "Grade 10": ["10A"],
    "Grade 11": ["11"],
    "Grade 12": ["12A", "12B"],
  };

  // ✅ Dynamically load students based on grade selection
  const gradeStudents = selectedGrade
    ? gradeKeyMap[selectedGrade]
        .flatMap(key => studentList[key] || [])
    : [];

  const addRow = () => {
    setRows([...rows, { question: '', type: '', score: '' }]);
  };

  const removeRow = (index) => {
    const updated = [...rows];
    updated.splice(index, 1);
    setRows(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const handleSubmit = async () => {
    if (!selectedGrade || !selectedStudent || !examType) {
      alert('Please select grade, student, and exam type.');
      return;
    }

    try {
      const docRef = doc(db, 'studentResults', selectedStudent);
      const snap = await getDoc(docRef);
      const existing = snap.exists() ? snap.data()[examType] || {} : {};

      const payload = {
        examTitle: examType === 'theory' ? 'Theory Exam' : 'Practical Exam',
        examDate: examDate || existing.examDate || '',
        results: rows.filter(r => r.question),
        comment: comment.trim() || existing.comment || '',
        grade: selectedGrade,
      };

      await setDoc(docRef, { [examType]: payload }, { merge: true });

      alert(`${examType} results & comment saved!`);
      setRows([{ question: '', type: '', score: '' }]);
      setComment('');
      setExamDate('');
    } catch (err) {
      console.error(err);
      alert('Error saving. Check console.');
    }
  };

  const totalScore = rows.reduce((sum, r) => sum + Number(r.score || 0), 0);

  let possibleTotal = 150;
  if (selectedGrade === 'Grade 10') {
    possibleTotal = examType === 'practical' ? 50 : 100;
  } else if (selectedGrade === 'Grade 11') {
    possibleTotal = examType === 'practical' ? 100 : 120;
  }

  const percent = possibleTotal ? ((totalScore / possibleTotal) * 100).toFixed(2) : 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Teacher Dashboard - Post Results</h2>

      {/* Grade Selection */}
      <label>Select Grade:</label>
      <select
        value={selectedGrade}
        onChange={(e) => {
          setSelectedGrade(e.target.value);
          setSelectedStudent('');
        }}
        className="border p-2 mb-4 w-full"
      >
        <option value="">-- Select Grade --</option>
        <option value="Grade 10">Grade 10</option>
        <option value="Grade 11">Grade 11</option>
        <option value="Grade 12">Grade 12</option>
      </select>

      {/* Student Selection */}
      <label>Select Student:</label>
      <select
        value={selectedStudent}
        onChange={(e) => setSelectedStudent(e.target.value)}
        className="border p-2 mb-4 w-full"
        disabled={!selectedGrade}
      >
        <option value="">-- Select Student --</option>
        {gradeStudents.map((s, idx) => (
          <option key={idx} value={s.name}>{s.name}</option>
        ))}
      </select>

      {/* Exam Type */}
      <label>Exam Type:</label>
      <select
        value={examType}
        onChange={(e) => setExamType(e.target.value)}
        className="border p-2 mb-4 w-full"
      >
        <option value="theory">Theory</option>
        <option value="practical">Practical</option>
      </select>

      {/* Exam Date */}
      <label>Date:</label>
      <input
        type="date"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
        className="border p-2 mb-4 w-full"
      />

      {/* Comment */}
      <label>Teacher Comment:</label>
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
                  onChange={(e) => handleChange(idx, 'question', e.target.value)}
                  className="border p-1 w-full"
                >
                  <option value="">--</option>
                  {questionOptions.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </td>
              <td className="border p-2">
                <select
                  value={row.type}
                  onChange={(e) => handleChange(idx, 'type', e.target.value)}
                  className="border p-1 w-full"
                >
                  <option value="">--</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td className="border p-2">
                <input
                  type="number"
                  value={row.score}
                  onChange={(e) => handleChange(idx, 'score', e.target.value)}
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
            <td className="border p-2"></td>
          </tr>
          <tr className="font-bold bg-gray-100">
            <td className="border p-2">PERCENTAGE</td>
            <td className="border p-2">-</td>
            <td className="border p-2">{percent}%</td>
            <td className="border p-2"></td>
          </tr>
        </tbody>
      </table>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          onClick={addRow}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Question
        </button>
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Post Results & Comment
        </button>
      </div>
    </div>
  );
}
