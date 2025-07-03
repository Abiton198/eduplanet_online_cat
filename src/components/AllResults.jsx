import React, { useEffect, useState } from "react";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../utils/firebase";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function AllResults() {
  // 🔹 State
  const [mainExamData, setMainExamData] = useState({});
  const [generalExamData, setGeneralExamData] = useState([]);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState("All Grades");
  const [generalDate, setGeneralDate] = useState("");
  const [generalExam, setGeneralExam] = useState("");
  const [generalName, setGeneralName] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const navigate = useNavigate();

  // 🔹 Auth & Data Subscription
  useEffect(() => {
    const auth = getAuth();
    let unsubMain = null;
    let unsubGeneral = null;

    const subscribeToData = () => {
      unsubMain = onSnapshot(collection(db, "studentResults"), (snap) => {
        const data = {};
        snap.forEach((doc) => (data[doc.id] = doc.data()));
        setMainExamData(data);
      });

      unsubGeneral = onSnapshot(collection(db, "examResults"), (snap) => {
        const data = snap.docs.map((doc) => doc.data());
        setGeneralExamData(data);
      });
    };

    const checkAccess = async () => {
      onAuthStateChanged(auth, async (user) => {
        const snapshot = await getDocs(collection(db, "admins"));
        const adminEmails = snapshot.docs.map((doc) => doc.data().email);
        if (user?.email && adminEmails.includes(user.email)) {
          setAccessGranted(true);
          subscribeToData();
        } else {
          const { value: password, isConfirmed } = await Swal.fire({
            title: "Admin Access Required",
            input: "password",
            inputLabel: "Enter admin password",
            showCancelButton: true,
            confirmButtonText: "Enter",
          });
          if (isConfirmed && password === "admin123") {
            setAccessGranted(true);
            subscribeToData();
          }
          setAccessChecked(true);
        }
        setAccessChecked(true);
      });
    };

    checkAccess();

    return () => {
      if (unsubMain) unsubMain();
      if (unsubGeneral) unsubGeneral();
    };
  }, []);

  if (!accessChecked)
    return <div className="text-center pt-28 text-gray-500">Checking admin access...</div>;
  if (!accessGranted)
    return <div className="text-center pt-28 text-red-600">Access denied.</div>;

  // 🔹 Grades
  const grades = ["All Grades", "10A", "11", "12A","12B"];

  // 🔹 Process Main Exams
  const mainStudents = Object.keys(mainExamData).map((name) => {
    const entry = mainExamData[name];
    const grade = entry?.grade || entry?.theory?.grade || entry?.practical?.grade || "Unknown";
    const practical = entry.practical?.results?.reduce((sum, r) => sum + Number(r.score || 0), 0) || 0;
    const theory = entry.theory?.results?.reduce((sum, r) => sum + Number(r.score || 0), 0) || 0;
    const practicalPercent = ((practical / 150) * 100).toFixed(2);
    const theoryPercent = ((theory / 150) * 100).toFixed(2);
    const grand = Math.round((Number(practicalPercent) + Number(theoryPercent)) / 2);
    const feedback = entry?.theory?.comment || entry?.practical?.comment || "";
    return { name, grade, practical, practicalPercent, theory, theoryPercent, grand, feedback };
  });

  // 🔹 Export Helpers
  const exportResults = (data, fileName, format, headers, bodyData) => {
    if (format === "excel" || format === "csv") {
      const ws = XLSX.utils.json_to_sheet(bodyData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, fileName);
      XLSX.writeFile(wb, `${fileName}.${format === "csv" ? "csv" : "xlsx"}`);
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(fileName, 14, 20);
      doc.autoTable({
        head: [headers],
        body: bodyData.map((row) => headers.map((h) => row[h] || "-")),
        startY: 30,
      });
      doc.save(`${fileName}.pdf`);
    }
  };

  const exportMainResults = (format) => {
    const filtered = mainStudents.filter((s) =>
      selectedGrade === "All Grades" ? true : s.grade === selectedGrade
    );

    const bodyData = filtered.map((s) => ({
      Name: s.name,
      "Theory %": s.theoryPercent + "%",
      "Practical %": s.practicalPercent + "%",
      "Grand %": s.grand + "%",
    }));

    exportResults(filtered, `MainResults_${selectedGrade.replace(" ", "")}`, format,
      ["Name", "Theory %", "Practical %", "Grand %"], bodyData);
  };

  const exportGeneralResults = (format) => {
    const filtered = generalExamData.filter((r) => {
      const gradeMatch = selectedGrade === "All Grades" || (r.grade?.toLowerCase() === selectedGrade.toLowerCase());
      const dateMatch = generalDate === "" || r.completedDate === generalDate;
      const examMatch = generalExam === "" || r.exam?.toLowerCase().includes(generalExam.toLowerCase());
      const nameMatch = generalName === "" || r.name?.toLowerCase().includes(generalName.toLowerCase());
      return gradeMatch && dateMatch && examMatch && nameMatch;
    });

    const bodyData = filtered.map((r) => ({
      Date: r.completedDate || "-",
      Name: r.name || "-",
      Exam: r.exam || "-",
      Score: r.score || "-",
      Percentage: (Number(r.percentage) || 0).toFixed(1) + "%",
    }));

    exportResults(filtered, `GeneralResults_${selectedGrade.replace(" ", "")}`, format,
      ["Date", "Name", "Exam", "Score", "Percentage"], bodyData);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-4">📊 All Results Dashboard</h2>

      {/* Navigation */}
      <div className="flex justify-center gap-4 mb-6">
        <button onClick={() => { setActiveSection("main"); setSelectedGrade("All Grades"); }}
          className="bg-purple-600 text-white px-4 py-2 rounded">🏆 Main Exams</button>
        <button onClick={() => { setActiveSection("general"); setSelectedGrade("All Grades"); }}
          className="bg-green-600 text-white px-4 py-2 rounded">📝 General Exams</button>
        <button onClick={() => navigate("/analysis-component")}
          className="bg-blue-600 text-white px-4 py-2 rounded">📈 Analysis</button>
      </div>

      {/* Grade Filter */}
      {activeSection && (
        <div className="flex justify-center flex-wrap gap-2 mb-4">
          {grades.map((grade) => (
            <button key={grade} onClick={() => setSelectedGrade(grade)}
              className={`px-4 py-2 rounded ${selectedGrade === grade ? "bg-blue-600 text-white" : "bg-gray-300"}`}>
              {grade}
            </button>
          ))}
        </div>
      )}

      {/* Filters for General Exams */}
      {activeSection === "general" && (
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <input type="date" value={generalDate} onChange={(e) => setGeneralDate(e.target.value)}
            className="border rounded px-3 py-1" placeholder="Date" />
          <input type="text" value={generalExam} onChange={(e) => setGeneralExam(e.target.value)}
            className="border rounded px-3 py-1" placeholder="Exam Name" />
          <input type="text" value={generalName} onChange={(e) => setGeneralName(e.target.value)}
            className="border rounded px-3 py-1" placeholder="Student Name" />
        </div>
      )}

      {/* Main Exam Table */}
      {activeSection === "main" && (
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <h3 className="text-lg font-semibold mb-2">{selectedGrade} - Main Exam Results</h3>
          <div className="flex gap-2 mb-2">
            <button onClick={() => exportMainResults("excel")} className="bg-green-600 text-white px-3 py-1 rounded">Excel</button>
            <button onClick={() => exportMainResults("csv")} className="bg-yellow-500 text-white px-3 py-1 rounded">CSV</button>
            <button onClick={() => exportMainResults("pdf")} className="bg-red-600 text-white px-3 py-1 rounded">PDF</button>
          </div>
          <table className="min-w-full border text-sm">
            <thead><tr><th className="border p-2">Name</th><th className="border p-2">Theory %</th>
              <th className="border p-2">Practical %</th><th className="border p-2">Grand %</th><th className="border p-2">Feedback</th></tr></thead>
            <tbody>
              {mainStudents.filter((s) => selectedGrade === "All Grades" || s.grade === selectedGrade)
                .map((s, idx) => (
                  <tr key={idx} className="text-center hover:bg-gray-50">
                    <td className="border p-2">{s.name}</td>
                    <td className={`border p-2 ${s.theoryPercent >= 30 ? "text-green-600" : "text-red-600"}`}>{s.theoryPercent}%</td>
                    <td className={`border p-2 ${s.practicalPercent >= 30 ? "text-green-600" : "text-red-600"}`}>{s.practicalPercent}%</td>
                    <td className={`border p-2 font-bold ${s.grand >= 30 ? "text-green-700" : "text-red-700"}`}>{s.grand}%</td>
                    <td className="border p-2">
                      {s.feedback ? (<button onClick={() => setSelectedFeedback(s.feedback)} className="text-blue-600 underline">View</button>)
                        : <span className="text-gray-400">None</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* General Exam Table */}
      {activeSection === "general" && (
        <div className="bg-white p-4 rounded shadow overflow-x-auto mt-6">
          <h3 className="text-lg font-semibold mb-2">{selectedGrade} - General Exam Results</h3>
          <div className="flex gap-2 mb-2">
            <button onClick={() => exportGeneralResults("excel")} className="bg-green-600 text-white px-3 py-1 rounded">Excel</button>
            <button onClick={() => exportGeneralResults("csv")} className="bg-yellow-500 text-white px-3 py-1 rounded">CSV</button>
            <button onClick={() => exportGeneralResults("pdf")} className="bg-red-600 text-white px-3 py-1 rounded">PDF</button>
          </div>
          <table className="min-w-full border text-sm">
            <thead><tr><th className="border p-2">Date</th><th className="border p-2">Name</th>
              <th className="border p-2">Exam</th><th className="border p-2">Score</th><th className="border p-2">Percentage</th></tr></thead>
            <tbody>
              
                      {generalExamData
            .filter((r) => {
              const gradeMatch =
                selectedGrade === "All Grades"
                  ? true
                  : r.grade
                    ? r.grade.replace(/\s+/g, "").toLowerCase() === selectedGrade.replace(/\s+/g, "").toLowerCase()
                    : false;
              const dateMatch = generalDate === "" || r.completedDate === generalDate;
              const examMatch = generalExam === "" || r.exam?.toLowerCase().includes(generalExam.toLowerCase());
              const nameMatch = generalName === "" || r.name?.toLowerCase().includes(generalName.toLowerCase());
              return gradeMatch && dateMatch && examMatch && nameMatch;
            })
            .map((r, idx) => (
              <tr key={idx} className="text-center hover:bg-gray-50">
                <td className="border p-2">{r.completedDate || "-"}</td>
                <td className="border p-2">{r.name || "-"}</td>
                <td className="border p-2">{r.exam || "-"}</td>
                <td className="border p-2">{r.score || "-"}</td>
                <td className={`border p-2 font-bold ${(Number(r.percentage) || 0) < 30 ? "text-red-600" : "text-green-700"}`}>
                  {(Number(r.percentage) || 0).toFixed(1)}%
                </td>
              </tr>
          ))}

                          </tbody>
          </table>
        </div>
      )}

      {/* Feedback Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded p-4 max-w-md w-full">
            <h4 className="text-lg font-semibold mb-2">Student Feedback</h4>
            <p className="text-sm whitespace-pre-wrap">{selectedFeedback}</p>
            <button onClick={() => setSelectedFeedback(null)}
              className="mt-4 bg-blue-600 text-white px-3 py-1 rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
