import React, { useState } from 'react';
import { studentList } from '../data/studentData';
import { db } from '../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';


export default function TeacherDashboard() {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [examType, setExamType] = useState('theory'); // theory or practical
  const [examDate, setExamDate] = useState('');
  const [comment, setComment] = useState(''); // ✅ NEW comment input
  const [rows, setRows] = useState([{ question: '', type: '', score: '' }]);

  const typeOptions = ['WORD PROCESSING', 'SPREADSHEETS', 'DATABASES', 'HTML', 'GENERAL'];
  const questionOptions = Array.from({ length: 7 }, (_, i) => (i + 1).toString());

  const addRow = () => {
    setRows([...rows, { question: '', type: '', score: '' }]);
  };

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !examType) {
      alert('Please select student and exam type.');
      return;
    }
  
    try {
      const docRef = doc(db, 'studentResults', selectedStudent);
  
      // 1️⃣ Get current data for this exam type
      const currentDataSnap = await getDoc(docRef);
      let existing = {};
      if (currentDataSnap.exists()) {
        existing = currentDataSnap.data()[examType] || {};
      }
  
      // 2️⃣ Use existing rows & date if not re-provided
      const payload = {
        examTitle: examType === 'theory' ? 'Theory Exam' : 'Practical Exam',
        examDate: examDate || existing.examDate || '',
        results: rows.length && rows[0].question ? rows : existing.results || [],
        comment: comment.trim() || existing.comment || '',
      };
  
      // 3️⃣ Save
      await setDoc(docRef, { [examType]: payload }, { merge: true });
  
      alert(`${examType} results & comment updated!`);
      // Reset form
      setRows([{ question: '', type: '', score: '' }]);
      setComment('');
    } catch (err) {
      console.error(err);
      alert('Error saving. See console.');
    }
  };
  
  const totalScore = rows.reduce((sum, r) => sum + Number(r.score || 0), 0);
  const possibleTotal = examType === 'theory' ? 150 : 150; // practical possible mark can differ
  const percent = ((totalScore / possibleTotal) * 100).toFixed(2);

  const grade12Students = [...(studentList['12A'] || []), ...(studentList['12B'] || [])];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Teacher Dashboard - Post Results</h2>

      <label>Select Student:</label>
      <select
        value={selectedStudent}
        onChange={(e) => setSelectedStudent(e.target.value)}
        className="border p-2 mb-4 w-full"
      >
        <option value="">-- Select --</option>
        {grade12Students.map((s, i) => (
          <option key={i} value={s.name}>{s.name}</option>
        ))}
      </select>

      <label>Exam Type:</label>
      <select
        value={examType}
        onChange={(e) => setExamType(e.target.value)}
        className="border p-2 mb-4 w-full"
      >
        <option value="theory">Theory</option>
        <option value="practical">Practical</option>
      </select>

      <label>Date:</label>
      <input
        type="date"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
        className="border p-2 mb-4 w-full"
      />

      <label>Teacher Comment:</label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a comment for the student..."
        className="border p-2 mb-4 w-full"
        rows={3}
      />

      <table className="w-full border mb-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Question</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Score</th>
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
            </tr>
          ))}
          <tr className="font-bold bg-gray-50">
            <td className="border p-2">TOTAL</td>
            <td className="border p-2">-</td>
            <td className="border p-2">{totalScore}</td>
          </tr>
          <tr className="font-bold bg-gray-100">
            <td className="border p-2">PERCENTAGE</td>
            <td className="border p-2">-</td>
            <td className="border p-2">{percent}%</td>
          </tr>
        </tbody>
      </table>

      <button
        onClick={addRow}
        className="bg-green-600 text-white px-4 py-2 rounded mr-4"
      >
        Add Row
      </button>
      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-6 py-3 rounded"
      >
        Post Result & Comment
      </button>
    </div>
  );
}
