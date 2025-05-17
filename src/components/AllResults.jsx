import React, { useEffect, useState } from 'react';
import { collection, addDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase"; // path to your firebase.js
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

export default function AllResults() {
  const [results, setResults] = useState([]);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedName, setSelectedName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const handleQuizComplete = () => {
    const score = 4; // Example
    const scorePercentage = 80;
    const studentId = "abc123";
    const exam = "Term 2 Exam";
    const grade = "Grade 10";
    const name = "John Doe";
    const timespent = 300; // in seconds
  
    submitExamResult({
      score,
      scorePercentage,
      studentId,
      exam,
      grade,
      name,
      timespent
    });
  };
  
  const submitExamResult = async ({ score, scorePercentage, studentId, exam, grade, name, timespent }) => {
    try {
      const now = new Date();
      await addDoc(collection(db, "examResults"), {
        score,
        scorePercentage,
        studentId,
        exam,
        grade,
        name,
        timespent,
        submittedBy: "student",
        completedTime: now.toISOString(),  // <-- This is what you're trying to access
        action: ""
      });
      console.log("Result submitted to Firestore ✅");
    } catch (error) {
      console.error("Error saving result:", error);
    }
  }
  
  useEffect(() => {
    let unsubscribe = null;
    const checkAdminPassword = async () => {
      const { value: password, isConfirmed } = await Swal.fire({ 
              title: 'Admin Access Required',
              input: 'password',
              inputLabel: 'Enter admin password',
              inputPlaceholder: 'Password',
              showCancelButton: true,
              confirmButtonText: 'Enter',
              allowOutsideClick: false

      });
  
      if (isConfirmed && password === 'admin123') {
        setAccessGranted(true);
  
        unsubscribe = onSnapshot(collection(db, "examResults"), (snapshot) => {
          const fetchedResults = snapshot.docs.map(doc => {
            const data = doc.data();
            const dateObj = new Date(data.completedTime);
            return {
              ...data,
              completedDate: !isNaN(dateObj.getTime()) ? dateObj.toISOString().split("T")[0] : '',
              completedTimeOnly: !isNaN(dateObj.getTime()) ? dateObj.toTimeString().split(" ")[0] : ''
            };
          });
          setResults(fetchedResults);
        });
      }
  
      setAccessChecked(true);
    };
  
    checkAdminPassword();
  
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  

  const uniqueGrades = [...new Set(results.map(r => r.grade))];
  const uniqueNames = [...new Set(results.map(r => r.name))];
  const uniqueTopics = [...new Set(results.flatMap(r => r.answers?.map(a => a.topic)))];
  const uniqueMonths = [...new Set(results.map(r => {
    const date = new Date(r.completedDate);
    return !isNaN(date) ? date.toLocaleString('default', { month: 'long' }) : null;
  }).filter(Boolean))].sort((a, b) =>
    new Date(`${a} 1, 2000`) - new Date(`${b} 1, 2000`)
  );

  const exportToExcel = (result) => {
    const data = result.answers?.map(item => ({
      Question: item.question,
      "Student's Answer": item.answer,
      "Correct Answer": item.correctAnswer,
    })) || [];

    const info = [
      { Label: 'Name', Value: result.name },
      { Label: 'Grade', Value: result.grade },
      { Label: 'Exam', Value: result.exam },
      { Label: 'Score', Value: result.score },
      { Label: 'Percentage', Value: result.percentage },
      { Label: 'Attempts', Value: result.attempts },
      { Label: 'Time Spent', Value: result.timeSpent },
      { Label: 'Completed Date', Value: result.completedDate },
      { Label: 'Completed Time', Value: result.completedTimeOnly },
    ];

    const sheetData = [...info, {}, ...data];
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'StudentResult');
    XLSX.writeFile(workbook, `${result.name}_Result.xlsx`);
  };

  const exportFilteredResults = () => {
    const filteredResults = results.filter(r =>
      (selectedGrade === 'All' || r.grade === selectedGrade) &&
      (selectedName === '' || r.name?.toLowerCase().includes(selectedName.toLowerCase())) &&
      (selectedMonth === '' || new Date(r.completedDate).toLocaleString('default', { month: 'long' }) === selectedMonth) &&
      (selectedTopic === '' || r.answers?.some(a => a.topic === selectedTopic)) &&
      (selectedDate === '' || r.completedDate === selectedDate)
    );

    const flatData = [];
    filteredResults.forEach(result => {
      console.log("Completed Date:", result.completedDate);  // Log the completed date
      console.log("Completed Time:", result.completedTimeOnly);
      result.answers?.forEach(a => {
        flatData.push({
          Name: result.name,
          Grade: result.grade,
          Exam: result.exam,
          Score: result.score,
          Percentage: result.percentage,
          Attempts: result.attempts,
          "Time Spent": result.timeSpent,
          "Completed Date": result.completedDate || "Invalid Date",  // Handle missing date
          "Completed Time": result.completedTime || "Invalid Time",  // Handle missing time
          Question: a.question,
          "Student's Answer": a.answer,
          "Correct Answer": a.correctAnswer,
        });
      });
    });
    console.log(flatData);


    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered_Results');
    XLSX.writeFile(workbook, 'Filtered_Results.xlsx');
  };

  if (!accessChecked) return <div className="text-center pt-28 text-lg text-gray-500">Checking admin access...</div>;
  if (!accessGranted) return <div className="text-center pt-28 text-red-600 text-lg">Access denied. Admin password is required.</div>;

  const filteredResults = results.filter(r =>
    (selectedGrade === 'All' || r.grade === selectedGrade) &&
    (selectedName === '' || r.name?.toLowerCase().includes(selectedName.toLowerCase())) &&
    (selectedMonth === '' || new Date(r.completedDate).toLocaleString('default', { month: 'long' }) === selectedMonth) &&
    (selectedTopic === '' || r.answers?.some(a => a.topic === selectedTopic)) &&
    (selectedDate === '' || r.completedDate === selectedDate)
  );
  
  // Count how many *unique* students wrote tests on selected topic
  const topicStudentCount = selectedTopic
    ? new Set(
        filteredResults
          .filter(r => r.answers?.some(a => a.topic === selectedTopic))
          .map(r => r.studentId || r.name)
      ).size
    : 0;

    


  return (
    <div className="max-w-6xl mx-auto pt-18 px-4">
      <h2 className="text-2xl font-bold text-center mb-6">All Student Results</h2>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="mr-2 font-medium">Filter by Grade:</label>
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="border rounded px-3 py-1">
            <option value="All">All</option>
            {uniqueGrades.map((grade, i) => <option key={i} value={grade}>{grade}</option>)}
          </select>
        </div>

        <div>
          <label className="mr-2 font-medium">Filter by Name:</label>
          <input type="text" value={selectedName} onChange={e => setSelectedName(e.target.value)} placeholder="Search by name" className="border rounded px-3 py-1" />
        </div>

        <div>
          <label className="mr-2 font-medium">Filter by Month:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border rounded px-3 py-1">
            <option value="">All</option>
            {uniqueMonths.map((month, i) => <option key={i} value={month}>{month}</option>)}
          </select>
        </div>

        <div>
          <label className="mr-2 font-medium">Filter by Topic:</label>
          <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} className="border rounded px-3 py-1">
            <option value="">All</option>
            {uniqueTopics.map((topic, i) => <option key={i} value={topic}>{topic}</option>)}
          </select>
        </div>

        <div>
          <label className="mr-2 font-medium">Filter by Date:</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded px-3 py-1" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <button onClick={exportFilteredResults} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Download Filtered Results</button>
        <button onClick={() => {
          setSelectedGrade('All');
          setSelectedName('');
          setSelectedMonth('');
          setSelectedTopic('');
          setSelectedDate('');
        }} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">Reset All Filters</button>
      </div>

      {/* Results Table */}
<div className="overflow-x-auto">
  <table className="min-w-full border border-gray-300">
    <thead className="bg-blue-600 text-white">
      <tr>
        <th className="p-3 border">Date</th>
        <th className="p-3 border">Time</th>
        <th className="p-3 border">Name</th>
        <th className="p-3 border">Grade</th>
        <th className="p-3 border">Exam</th>
        <th className="p-3 border">Score</th>
        <th className="p-3 border">%</th>
        <th className="p-3 border">Attempts</th>
        <th className="p-3 border">Time Spent</th>
        <th className="p-3 border">Action</th>
      </tr>
    </thead>
    <tbody>
      {results.filter(r =>
        (selectedGrade === 'All' || r.grade === selectedGrade) &&
        (selectedName === '' || r.name?.toLowerCase().includes(selectedName.toLowerCase())) &&
        (selectedMonth === '' || new Date(r.completedDate).toLocaleString('default', { month: 'long' }) === selectedMonth) &&
        (selectedTopic === '' || r.answers?.some(a => a.topic === selectedTopic)) &&
        (selectedDate === '' || r.completedDate === selectedDate)
      ).map((res, index) => (
        <tr key={index} className="text-center hover:bg-gray-100">
          <td className="p-3 border">
            {res.completedDate
              ? new Date(res.completedDate + "T00:00:00").toLocaleDateString()
              : "Invalid Date"}
          </td>

          <td className="p-3 border">
          {res.completedTimeOnly || "Invalid Time"}
          </td>
          <td className="p-3 border">{res.name}</td>
          <td className="p-3 border">{res.grade}</td>
          <td className="p-3 border">{res.exam}</td>
          <td className="p-3 border">{res.score}</td>
          <td className={`p-3 border ${parseFloat(res.percentage) >= 50 ? 'text-green-600' : 'text-red-600'}`}>{res.percentage}%</td>
          <td className="p-3 border">{res.attempts}</td>
          <td className="p-3 border">{res.timeSpent}</td>
          <td className="p-3 border space-x-2">
            <button onClick={() => setSelectedResult(res)} className="text-blue-600 underline">View</button>
            <button onClick={() => exportToExcel(res)} className="text-green-600 underline">Download</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

      {/* View Modal */}
      {selectedResult && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 overflow-y-auto max-h-[90vh] relative">
            <h3 className="text-xl font-semibold mb-4">Answers by {selectedResult.name}</h3>
            {Array.isArray(selectedResult.answers) && selectedResult.answers.length > 0 ? (
              <ul className="space-y-3">
                {selectedResult.answers.map((a, idx) => (
                  <li key={idx} className="border p-3 rounded shadow-sm">
                    <p><strong>Q{idx + 1}:</strong> {a.question}</p>
                    <p><strong>Student's Answer:</strong> {a.answer}</p>
                    <p><strong>Correct Answer:</strong> {a.correctAnswer}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-red-500">No answers found for this student.</p>}
            <button onClick={() => setSelectedResult(null)} className="absolute top-2 right-4 text-xl font-bold text-gray-500 hover:text-red-600">×</button>
          </div>
        </div>
      )}
    </div>
  );
}

