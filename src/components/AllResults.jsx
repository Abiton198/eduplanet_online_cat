import React, { useEffect, useState } from "react";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../utils/firebase";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function AllResults() {
  // ✅ State management
  const [mainExamData, setMainExamData] = useState({});
  const [generalExamData, setGeneralExamData] = useState([]);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [generalDate, setGeneralDate] = useState("");
  const [generalExam, setGeneralExam] = useState("");
  const [generalName, setGeneralName] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const navigate = useNavigate();

  // ✅ Authenticate admin automatically or via password
  useEffect(() => {
    let unsubscribeMain = null;
    let unsubscribeGeneral = null;

    const checkAccess = async () => {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        const snapshot = await getDocs(collection(db, "admins"));
        const adminEmails = snapshot.docs.map((doc) => doc.data().email);
        if (user?.email && adminEmails.includes(user.email)) {
          setAccessGranted(true);
          setAccessChecked(true);
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
      });
    };

    const subscribeToData = () => {
      unsubscribeMain = onSnapshot(collection(db, "studentResults"), (snap) => {
        const temp = {};
        snap.forEach((doc) => (temp[doc.id] = doc.data()));
        setMainExamData(temp);
      });
      unsubscribeGeneral = onSnapshot(collection(db, "examResults"), (snap) => {
        const sorted = snap.docs
          .map((doc) => doc.data())
          .sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
        setGeneralExamData(sorted);
      });
    };

    checkAccess();

    return () => {
      if (unsubscribeMain) unsubscribeMain();
      if (unsubscribeGeneral) unsubscribeGeneral();
    };
  }, []);

  // ✅ Loading and access handling
  if (!accessChecked)
    return (
      <div className="text-center pt-28 text-lg text-gray-500">
        Checking admin access...
      </div>
    );
  if (!accessGranted)
    return (
      <div className="text-center pt-28 text-red-600 text-lg">
        Access denied.
      </div>
    );

  // ✅ Format Main Students for Table
  const mainStudents = Object.keys(mainExamData)
    .map((name) => {
      const entry = mainExamData[name];
      const grade =
        entry?.grade ||
        entry?.theory?.grade ||
        entry?.practical?.grade ||
        "Unknown";
      const practical =
        entry.practical?.results?.reduce(
          (sum, r) => sum + Number(r.score || 0),
          0
        ) || 0;
      const theory =
        entry.theory?.results?.reduce(
          (sum, r) => sum + Number(r.score || 0),
          0
        ) || 0;
      const practicalPercent = ((practical / 150) * 100).toFixed(2);
      const theoryPercent = ((theory / 150) * 100).toFixed(2);
      const grand = Math.round(
        (Number(practicalPercent) + Number(theoryPercent)) / 2
      );
      const feedback =
        entry?.theory?.comment || entry?.practical?.comment || "";

      return {
        name,
        grade,
        practical,
        practicalPercent,
        theory,
        theoryPercent,
        grand,
        feedback,
      };
    })
    .sort((a, b) => b.grand - a.grand);

  const grades = ["Grade 10", "Grade 11", "Grade 12"];

  // ✅ Export Functions
  const exportMainResults = (format) => {
    const rows = mainStudents.filter((s) => s.grade === selectedGrade);
    if (format === "excel" || format === "csv") {
      const ws = XLSX.utils.json_to_sheet(
        rows.map((s) => ({
          Name: s.name,
          "Theory %": s.theoryPercent + "%",
          "Practical %": s.practicalPercent + "%",
          "Grand %": s.grand + "%",
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "MainResults");
      XLSX.writeFile(
        wb,
        `MainResults_${selectedGrade.replace(" ", "")}.${format === "csv" ? "csv" : "xlsx"}`
      );
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(`Main Results - ${selectedGrade}`, 14, 20);
      doc.autoTable({
        head: [["Name", "Theory %", "Practical %", "Grand %"]],
        body: rows.map((s) => [
          s.name,
          s.theoryPercent + "%",
          s.practicalPercent + "%",
          s.grand + "%",
        ]),
        startY: 30,
      });
      doc.save(`MainResults_${selectedGrade.replace(" ", "")}.pdf`);
    }
  };

  const exportGeneralResults = (format) => {
    const rows = generalExamData.filter(
      (r) =>
        r.grade === selectedGrade &&
        (generalDate === "" || r.completedDate === generalDate) &&
        (generalExam === "" ||
          r.exam?.toLowerCase().includes(generalExam.toLowerCase())) &&
        (generalName === "" ||
          r.name?.toLowerCase().includes(generalName.toLowerCase()))
    );
    if (format === "excel" || format === "csv") {
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Date: r.completedDate,
          Name: r.name,
          Exam: r.exam,
          Score: r.score,
          Percentage: r.percentage + "%",
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "GeneralResults");
      XLSX.writeFile(
        wb,
        `GeneralResults_${selectedGrade.replace(" ", "")}.${format === "csv" ? "csv" : "xlsx"}`
      );
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(`General Results - ${selectedGrade}`, 14, 20);
      doc.autoTable({
        head: [["Date", "Name", "Exam", "Score", "Percentage"]],
        body: rows.map((r) => [
          r.completedDate,
          r.name,
          r.exam,
          r.score,
          r.percentage + "%",
        ]),
        startY: 30,
      });
      doc.save(`GeneralResults_${selectedGrade.replace(" ", "")}.pdf`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-6">
        📊 All Results Dashboard
      </h2>

      {/* Navigation */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button
          onClick={() => {
            setActiveSection("main");
            setSelectedGrade(null);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          🏆 Main Exams
        </button>
        <button
          onClick={() => {
            setActiveSection("general");
            setSelectedGrade(null);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          📝 General Exams
        </button>
        <button
          onClick={() => navigate("/analysis-component")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          📈 Analysis
        </button>
      </div>

      {/* Grade Selection */}
      {activeSection && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-4 py-2 rounded ${
                selectedGrade === grade
                  ? "bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-800 hover:bg-gray-400"
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
      )}

      {/* Main Exam Table */}
      {activeSection === "main" && selectedGrade && (
        <div className="bg-white shadow p-4 rounded-lg overflow-x-auto">
          <h3 className="text-lg font-semibold mb-2">
            {selectedGrade} - Main Exam Results
          </h3>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => exportMainResults("excel")}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Export Excel
            </button>
            <button
              onClick={() => exportMainResults("csv")}
              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportMainResults("pdf")}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Export PDF
            </button>
          </div>
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Name</th>
                <th className="border p-2">Theory %</th>
                <th className="border p-2">Practical %</th>
                <th className="border p-2">Grand %</th>
                <th className="border p-2">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {mainStudents
                .filter((s) => s.grade === selectedGrade)
                .map((s, idx) => (
                  <tr key={idx} className="text-center hover:bg-gray-50">
                    <td className="border p-2">{s.name}</td>
                    <td
                      className={`border p-2 ${
                        s.theoryPercent >= 30
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {s.theoryPercent}%
                    </td>
                    <td
                      className={`border p-2 ${
                        s.practicalPercent >= 30
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {s.practicalPercent}%
                    </td>
                    <td
                      className={`border p-2 font-bold ${
                        s.grand >= 30 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {s.grand}%
                    </td>
                    <td className="border p-2">
                      {s.feedback ? (
                        <button
                          onClick={() => setSelectedFeedback(s.feedback)}
                          className="text-blue-600 underline"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Feedback Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-4 max-w-md w-full">
            <h4 className="text-lg font-semibold mb-2">Student Feedback</h4>
            <p className="text-sm whitespace-pre-wrap">{selectedFeedback}</p>
            <button
              onClick={() => setSelectedFeedback(null)}
              className="mt-4 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
