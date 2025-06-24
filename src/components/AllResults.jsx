import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from "docx";
import { saveAs } from "file-saver";

export default function AllResults() {
  const [mainExamData, setMainExamData] = useState({});
  const [generalExamData, setGeneralExamData] = useState([]);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [generalDate, setGeneralDate] = useState("");
  const [generalExam, setGeneralExam] = useState("");
  const [generalName, setGeneralName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeMain = null;
    let unsubscribeGeneral = null;

    const checkAccess = async () => {
      const { value: password, isConfirmed } = await Swal.fire({
        title: "Admin Access Required",
        input: "password",
        inputLabel: "Enter admin password",
        showCancelButton: true,
        confirmButtonText: "Enter",
      });

      if (isConfirmed && password === "admin123") {
        setAccessGranted(true);

        unsubscribeMain = onSnapshot(collection(db, "studentResults"), (snap) => {
          const temp = {};
          snap.forEach((doc) => (temp[doc.id] = doc.data()));
          setMainExamData(temp);
        });

        unsubscribeGeneral = onSnapshot(collection(db, "examResults"), (snap) => {
          setGeneralExamData(snap.docs.map((doc) => doc.data()));
        });
      }

      setAccessChecked(true);
    };

    checkAccess();
    return () => {
      if (unsubscribeMain) unsubscribeMain();
      if (unsubscribeGeneral) unsubscribeGeneral();
    };
  }, []);

  if (!accessChecked) return <div className="text-center pt-28 text-lg text-gray-500">Checking admin access...</div>;
  if (!accessGranted) return <div className="text-center pt-28 text-red-600 text-lg">Access denied.</div>;

  const mainStudents = Object.keys(mainExamData).map((name) => {
    const entry = mainExamData[name];
    const grade = entry?.grade || entry?.theory?.grade || entry?.practical?.grade || "Unknown";
    const practical = entry.practical?.results?.reduce((sum, r) => sum + Number(r.score || 0), 0) || 0;
    const theory = entry.theory?.results?.reduce((sum, r) => sum + Number(r.score || 0), 0) || 0;
    const practicalPercent = ((practical / 150) * 100).toFixed(2);
    const theoryPercent = ((theory / 150) * 100).toFixed(2);
    const grand = ((Number(practicalPercent) + Number(theoryPercent)) / 2).toFixed(2);
    return { name, grade, practical, practicalPercent, theory, theoryPercent, grand };
  });

  const grades = ["Grade 10", "Grade 11", "Grade 12"];

  const exportMainResults = (format) => {
    const rows = mainStudents.filter((s) => s.grade === selectedGrade);

    if (format === "excel" || format === "csv") {
      const ws = XLSX.utils.json_to_sheet(
        rows.map((s) => ({
          Name: s.name,
          "Theory %": s.theoryPercent + "%",
          "Practical %": s.practicalPercent + "%",
          "Grand Total %": s.grand + "%",
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "MainResults");
      XLSX.writeFile(wb, `MainExamResults_${selectedGrade}.${format === "csv" ? "csv" : "xlsx"}`);
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(`Main Exam Results - ${selectedGrade}`, 14, 20);
      doc.autoTable({
        head: [["Name", "Theory %", "Practical %", "Grand Total %"]],
        body: rows.map((s) => [s.name, s.theoryPercent + "%", s.practicalPercent + "%", s.grand + "%"]),
        startY: 30,
      });
      doc.save(`MainExamResults_${selectedGrade}.pdf`);
    } else if (format === "word") {
      const tableRows = [
        new TableRow({
          children: ["Name", "Theory %", "Practical %", "Grand Total %"].map((col) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: col, bold: true })] })],
            })
          ),
        }),
        ...rows.map(
          (s) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(s.name)] }),
                new TableCell({ children: [new Paragraph(s.theoryPercent + "%")] }),
                new TableCell({ children: [new Paragraph(s.practicalPercent + "%")] }),
                new TableCell({ children: [new Paragraph(s.grand + "%")] }),
              ],
            })
        ),
      ];
      const docx = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: `Main Exam Results - ${selectedGrade}`, bold: true, size: 28 })],
                spacing: { after: 400 },
              }),
              new Table({ rows: tableRows }),
            ],
          },
        ],
      });
      Packer.toBlob(docx).then((blob) => saveAs(blob, `MainExamResults_${selectedGrade}.docx`));
    }
  };

  const exportGeneralResults = (format) => {
    const rows = generalExamData.filter(
      (r) =>
        r.grade?.toLowerCase().includes(selectedGrade.split(" ")[1].toLowerCase()) &&
        (generalDate === "" || r.completedDate === generalDate) &&
        (generalExam === "" || r.exam?.toLowerCase().includes(generalExam.toLowerCase())) &&
        (generalName === "" || r.name?.toLowerCase().includes(generalName.toLowerCase()))
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
      XLSX.writeFile(wb, `GeneralExamResults_${selectedGrade}.${format === "csv" ? "csv" : "xlsx"}`);
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(`General Exam Results - ${selectedGrade}`, 14, 20);
      doc.autoTable({
        head: [["Date", "Name", "Exam", "Score", "Percentage"]],
        body: rows.map((r) => [r.completedDate, r.name, r.exam, r.score, r.percentage + "%"]),
        startY: 30,
      });
      doc.save(`GeneralExamResults_${selectedGrade}.pdf`);
    } else if (format === "word") {
      const tableRows = [
        new TableRow({
          children: ["Date", "Name", "Exam", "Score", "Percentage"].map((col) =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col, bold: true })] })] })
          ),
        }),
        ...rows.map(
          (r) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(r.completedDate || "-")] }),
                new TableCell({ children: [new Paragraph(r.name || "-")] }),
                new TableCell({ children: [new Paragraph(r.exam || "-")] }),
                new TableCell({ children: [new Paragraph((r.score || "-").toString())] }),
                new TableCell({ children: [new Paragraph((r.percentage || 0) + "%")] }),
              ],
            })
        ),
      ];
      const docx = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: `General Exam Results - ${selectedGrade}`, bold: true, size: 28 })],
                spacing: { after: 400 },
              }),
              new Table({ rows: tableRows }),
            ],
          },
        ],
      });
      Packer.toBlob(docx).then((blob) => saveAs(blob, `GeneralExamResults_${selectedGrade}.docx`));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-8">📊 All Results Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div onClick={() => { setActiveSection("main"); setSelectedGrade(null); }} className="bg-purple-500 text-white rounded-xl shadow p-8 cursor-pointer hover:scale-105 transition">
          <h3 className="text-2xl font-bold mb-2">🏆 Main Exams</h3>
          <p>Click to choose a grade</p>
        </div>
        <div onClick={() => { setActiveSection("general"); setSelectedGrade(null); }} className="bg-green-500 text-white rounded-xl shadow p-8 cursor-pointer hover:scale-105 transition">
          <h3 className="text-2xl font-bold mb-2">📝 General Exams</h3>
          <p>Click to choose a grade</p>
        </div>
        <div onClick={() => navigate("/analysis-component")} className="bg-blue-600 text-white rounded-xl shadow p-8 cursor-pointer hover:scale-105 transition md:col-span-2">
          <h3 className="text-2xl font-bold mb-2">📈 Results Analysis</h3>
          <p>Click to view in-depth analysis</p>
        </div>
      </div>

      {activeSection && (
        <div className="mt-8">
          <h4 className="text-xl font-bold mb-4">{activeSection === "main" ? "Select Grade for Main Exams" : "Select Grade for General Exams"}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {grades.map((g, i) => (
              <div key={i} onClick={() => setSelectedGrade(g)} className="p-6 rounded-xl shadow cursor-pointer bg-blue-400 text-white hover:scale-105 transition">
                <h5 className="text-xl font-bold">{g}</h5>
                <p className="text-sm">Click to view results</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === "main" && selectedGrade && (
        <div className="mt-6 bg-white shadow p-6 rounded-xl overflow-x-auto">
          <h4 className="text-lg font-bold mb-4">{selectedGrade} - Main Exams</h4>
          <div className="my-4 flex flex-wrap gap-4">
            <button onClick={() => exportMainResults("excel")} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Download Excel</button>
            <button onClick={() => exportMainResults("csv")} className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">Download CSV</button>
            <button onClick={() => exportMainResults("pdf")} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Download PDF</button>
            <button onClick={() => exportMainResults("word")} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Download Word</button>
          </div>
          <table className="min-w-full border text-sm">
            <thead className="bg-purple-100">
              <tr>
                <th className="border p-3">Name</th>
                <th className="border p-3">Theory</th>
                <th className="border p-3">Theory %</th>
                <th className="border p-3">Practical</th>
                <th className="border p-3">Practical %</th>
                <th className="border p-3">Grand %</th>
              </tr>
            </thead>
            <tbody>
              {mainStudents.filter((s) => s.grade === selectedGrade).map((s, idx) => (
                <tr key={idx} className="text-center hover:bg-gray-50">
                  <td className="border p-2">{s.name}</td>
                  <td className="border p-2">{s.theory}</td>
                  <td className={`border p-2 ${s.theoryPercent >= 50 ? "text-green-600" : "text-red-600"}`}>{s.theoryPercent}%</td>
                  <td className="border p-2">{s.practical}</td>
                  <td className={`border p-2 ${s.practicalPercent >= 35 ? "text-green-600" : "text-red-600"}`}>{s.practicalPercent}%</td>
                  <td className={`border p-2 font-bold ${s.grand >= 50 ? "text-green-700" : "text-red-700"}`}>{s.grand}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSection === "general" && selectedGrade && (
        <div className="mt-6 bg-white shadow p-6 rounded-xl overflow-x-auto">
          <h4 className="text-lg font-bold mb-4">{selectedGrade} - General Exams</h4>
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="mr-2 font-medium">Date:</label>
              <input type="date" value={generalDate} onChange={(e) => setGeneralDate(e.target.value)} className="border rounded px-3 py-1" />
            </div>
            <div>
              <label className="mr-2 font-medium">Exam:</label>
              <input type="text" value={generalExam} onChange={(e) => setGeneralExam(e.target.value)} placeholder="Exam Title" className="border rounded px-3 py-1" />
            </div>
            <div>
              <label className="mr-2 font-medium">Name:</label>
              <input type="text" value={generalName} onChange={(e) => setGeneralName(e.target.value)} placeholder="Student Name" className="border rounded px-3 py-1" />
            </div>
            <button onClick={() => { setGeneralDate(""); setGeneralExam(""); setGeneralName(""); }} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">Clear</button>
          </div>
          <div className="my-4 flex flex-wrap gap-4">
            <button onClick={() => exportGeneralResults("excel")} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Download Excel</button>
            <button onClick={() => exportGeneralResults("csv")} className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">Download CSV</button>
            <button onClick={() => exportGeneralResults("pdf")} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Download PDF</button>
            <button onClick={() => exportGeneralResults("word")} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Download Word</button>
          </div>
          <table className="min-w-full border text-sm">
            <thead className="bg-green-100">
              <tr>
                <th className="border p-3">Date</th>
                <th className="border p-3">Name</th>
                <th className="border p-3">Exam</th>
                <th className="border p-3">Score</th>
                <th className="border p-3">%</th>
              </tr>
            </thead>
            <tbody>
              {generalExamData.filter(
                (r) =>
                  r.grade?.toLowerCase().includes(selectedGrade.split(" ")[1].toLowerCase()) &&
                  (generalDate === "" || r.completedDate === generalDate) &&
                  (generalExam === "" || r.exam?.toLowerCase().includes(generalExam.toLowerCase())) &&
                  (generalName === "" || r.name?.toLowerCase().includes(generalName.toLowerCase()))
              ).map((r, idx) => (
                <tr key={idx} className="text-center hover:bg-gray-50">
                  <td className="border p-2">{r.completedDate || "-"}</td>
                  <td className="border p-2">{r.name}</td>
                  <td className="border p-2">{r.exam}</td>
                  <td className="border p-2">{r.score}</td>
                  <td className={`border p-2 ${r.percentage >= 50 ? "text-green-600" : "text-red-600"}`}>{r.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
