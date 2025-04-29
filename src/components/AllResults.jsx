import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

export default function AllResults() {
  const [results, setResults] = useState([]);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('All');

  // Get unique grades for filter dropdown
  const uniqueGrades = [...new Set(results.map(r => r.grade))];

  // Export single student's result
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
      { Label: 'Completed Time', Value: result.completedTime },
    ];

    const sheetData = [...info, {}, ...data];
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'StudentResult');
    XLSX.writeFile(workbook, `${result.name}_Result.xlsx`);
  };

  // Export all students in selected grade
  const exportGradeResults = (grade) => {
    const gradeResults = results.filter(r => r.grade === grade);
    const flatData = [];

    gradeResults.forEach(result => {
      result.answers?.forEach(a => {
        flatData.push({
          Name: result.name,
          Grade: result.grade,
          Exam: result.exam,
          Score: result.score,
          Percentage: result.percentage,
          Attempts: result.attempts,
          "Time Spent": result.timeSpent,
          "Completed Time": result.completedTime,
          Question: a.question,
          "Student's Answer": a.answer,
          "Correct Answer": a.correctAnswer,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Grade_${grade}_Results`);
    XLSX.writeFile(workbook, `Grade_${grade}_All_Results.xlsx`);
  };

  // Prompt for admin password on load
  useEffect(() => {
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
        const savedResults = JSON.parse(localStorage.getItem('allResults')) || [];
        setResults(savedResults);
      }

      setAccessChecked(true);
    };

    checkAdminPassword();
  }, []);

  // Show loading or access denied screen
  if (!accessChecked) {
    return <div className="text-center pt-28 text-lg text-gray-500">Checking admin access...</div>;
  }
  if (!accessGranted) {
    return <div className="text-center pt-28 text-red-600 text-lg">Access denied. Admin password is required.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto pt-28 px-4">
      <h2 className="text-2xl font-bold text-center mb-6">All Student Results</h2>

      {/* Grade filter */}
      <div className="mb-6">
        <label className="mr-2 font-medium">Filter by Grade:</label>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1"
        >
          <option value="All">All</option>
          {uniqueGrades.map((grade, idx) => (
            <option key={idx} value={grade}>{grade}</option>
          ))}
        </select>
      </div>

      {/* Download all for selected grade */}
      {selectedGrade !== 'All' && (
        <button
          onClick={() => exportGradeResults(selectedGrade)}
          className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Download All Results for Grade {selectedGrade}
        </button>
      )}

      {/* Results table */}
      {results.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="p-3 border">Completed Time</th>
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
              {results
                .filter(r => selectedGrade === 'All' || r.grade === selectedGrade)
                .map((res, index) => (
                  <tr
                    key={index}
                    className="text-center hover:bg-gray-100 cursor-pointer"
                  >
                    <td className="p-3 border">{res.completedTime}</td>
                    <td className="p-3 border">{res.name}</td>
                    <td className="p-3 border">{res.grade}</td>
                    <td className="p-3 border">{res.exam}</td>
                    <td className="p-3 border">{res.score}</td>
                    <td className={`p-3 border ${parseFloat(res.percentage) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {res.percentage}%
                    </td>
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
      ) : (
        <div className="text-center mt-6 text-gray-600">No results found.</div>
      )}

      {/* View answer modal */}
      {selectedResult && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 overflow-y-auto max-h-[90vh] relative">
            <h3 className="text-xl font-semibold mb-4">Answers by {selectedResult.name}</h3>

            {Array.isArray(selectedResult.answers) && selectedResult.answers.length > 0 ? (
              <ul className="space-y-3">
                {selectedResult.answers.map((a, idx) => (
                  <li key={idx} className="border p-3 rounded shadow-sm">
                    <p><strong>Q{idx + 1}:</strong> {a.question || 'No question text available'}</p>
                    <p><strong>Student's Answer:</strong> {a.answer || 'N/A'}</p>
                    <p><strong>Correct Answer:</strong> {a.correctAnswer || 'N/A'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-red-500">No answers found for this student.</p>
            )}

            <button
              onClick={() => setSelectedResult(null)}
              className="absolute top-2 right-4 text-xl font-bold text-gray-500 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
