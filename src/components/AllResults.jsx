// src/pages/AllResults.jsx
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

export default function AllResults() {
  const [mainExamData, setMainExamData] = useState({});
  const [generalExamData, setGeneralExamData] = useState([]);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  // Filters (shared / section-specific)
  const [selectedGrade, setSelectedGrade] = useState("All Grades");

  // Main section filters
  const [mainName, setMainName] = useState("");

  // General section filters
  const [generalDateFrom, setGeneralDateFrom] = useState("");
  const [generalDateTo, setGeneralDateTo] = useState("");
  const [generalExam, setGeneralExam] = useState("");
  const [generalName, setGeneralName] = useState("");

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    let unsubMain = null;
    let unsubGeneral = null;

    const subscribeToData = () => {
      unsubMain = onSnapshot(
        collection(db, "studentResults"),
        (snap) => {
          const data = {};
          snap.forEach((d) => (data[d.id] = d.data()));
          setMainExamData(data);
        },
        (e) => {
          console.error("studentResults listen failed:", e);
        }
      );

      unsubGeneral = onSnapshot(
        collection(db, "examResults"),
        (snap) => {
          setGeneralExamData(snap.docs.map((d) => d.data()));
        },
        (e) => {
          console.error("examResults listen failed:", e);
        }
      );
    };

    const askForPassword = async () => {
      const { value: password, isConfirmed } = await Swal.fire({
        title: "Admin Access",
        input: "password",
        inputLabel: "Enter admin password",
        inputPlaceholder: "••••••••",
        showCancelButton: true,
        confirmButtonText: "Enter",
      });
      return isConfirmed && password === "admin123"; // TODO: secure
    };

    const init = () => {
      const stop = onAuthStateChanged(auth, async (user) => {
        try {
          if (!user) {
            await signInAnonymously(auth);
            return;
          }

          let ok = false;

          if (user.email) {
            try {
              const adminSnap = await getDoc(doc(db, "admins", user.email));
              if (adminSnap.exists()) ok = true;
            } catch (e) {
              console.warn("Admin doc check failed:", e?.message);
            }
          }

          if (!ok) ok = await askForPassword();

          setAccessGranted(ok);
          if (ok) subscribeToData();
        } catch (e) {
          console.error("Access/init failed:", e);
          setAccessGranted(false);
        } finally {
          setAccessChecked(true);
        }
      });
      return stop;
    };

    const stopAuth = init();

    return () => {
      if (unsubMain) unsubMain();
      if (unsubGeneral) unsubGeneral();
      if (stopAuth) stopAuth();
    };
  }, []);

  if (!accessChecked)
    return <div className="text-center pt-28 text-gray-500">Checking admin access…</div>;
  if (!accessGranted)
    return <div className="text-center pt-28 text-red-600">Access denied.</div>;

  const grades = ["All Grades", "10A", "11", "Grade 12", "12A", "12B"];
  const normalize = (s = "") => String(s).replace(/\s+/g, "").toLowerCase();

  // ---------- Derived main results ----------
  const mainStudents = Object.keys(mainExamData).map((name) => {
    const entry = mainExamData[name];
    const grade =
      entry?.grade ||
      entry?.theory?.grade ||
      entry?.practical?.grade ||
      "Unknown";

    const practical =
      entry.practical?.results?.reduce((sum, r) => sum + Number(r.score || 0), 0) || 0;

    const theory =
      entry.theory?.results?.reduce((sum, r) => sum + Number(r.score || 0), 0) || 0;

    let practicalTotal = ["Grade 12", "Grade 12A", "Grade 12B"].includes(grade) ? 150 : 100;
    let theoryTotal = ["Grade 12", "Grade 12A", "Grade 12B"].includes(grade) ? 150 : 120;

    const practicalPercent = ((practical / practicalTotal) * 100).toFixed(2);
    const theoryPercent = ((theory / theoryTotal) * 100).toFixed(2);
    const grand = Math.round(
      (parseFloat(practicalPercent) + parseFloat(theoryPercent)) / 2
    );

    const feedback = entry?.theory?.comment || entry?.practical?.comment || "";

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
  });

  // ---------- Filtered data ----------
  const filteredMainStudents = mainStudents.filter((s) => {
    const gradeMatch =
      selectedGrade === "All Grades" ||
      normalize(s.grade) === normalize(selectedGrade);
    const nameMatch =
      !mainName || s.name?.toLowerCase().includes(mainName.toLowerCase());
    return gradeMatch && nameMatch;
  });

  const filteredGeneral = generalExamData.filter((r) => {
    const g = r.grade ? normalize(r.grade) : "";
    const sel = normalize(selectedGrade);
    const gradeMatch = selectedGrade === "All Grades" || g === sel;

    const date = r.completedDate || ""; // expect "YYYY-MM-DD"
    const fromOk = !generalDateFrom || (date && date >= generalDateFrom);
    const toOk = !generalDateTo || (date && date <= generalDateTo);

    const examMatch =
      !generalExam || r.exam?.toLowerCase().includes(generalExam.toLowerCase());
    const nameMatch =
      !generalName || r.name?.toLowerCase().includes(generalName.toLowerCase());

    return gradeMatch && fromOk && toOk && examMatch && nameMatch;
  });

  // ---------- Export helpers ----------
  const exportResults = (fileName, format, headers, bodyData) => {
    if (format === "excel" || format === "csv") {
      const ws = XLSX.utils.json_to_sheet(bodyData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, fileName);
      XLSX.writeFile(wb, `${fileName}.${format === "csv" ? "csv" : "xlsx"}`);
    } else if (format === "pdf") {
      const docx = new jsPDF();
      docx.text(fileName, 14, 20);
      autoTable(docx, {
        head: [headers],
        body: bodyData.map((row) => headers.map((h) => row[h] ?? "-")),
        startY: 30,
      });
      docx.save(`${fileName}.pdf`);
    }
  };

  const exportMainResults = (format) => {
    exportResults(
      `MainResults_${selectedGrade.replace(/\s+/g, "")}`,
      format,
      ["Name", "Theory %", "Practical %", "Grand %"],
      filteredMainStudents.map((s) => ({
        Name: s.name,
        "Theory %": s.theoryPercent + "%",
        "Practical %": s.practicalPercent + "%",
        "Grand %": s.grand + "%",
      }))
    );
  };

  const exportGeneralResults = (format) => {
    exportResults(
      `GeneralResults_${selectedGrade.replace(/\s+/g, "")}`,
      format,
      ["Date", "Name", "Exam", "Score", "Percentage"],
      filteredGeneral.map((r) => ({
        Date: r.completedDate || "-",
        Name: r.name || "-",
        Exam: r.exam || "-",
        Score: r.score || "-",
        Percentage: (Number(r.percentage) || 0).toFixed(1) + "%",
      }))
    );
  };

  const resetFilters = () => {
    setSelectedGrade("All Grades");
    setMainName("");
    setGeneralDateFrom("");
    setGeneralDateTo("");
    setGeneralExam("");
    setGeneralName("");
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-4">📊 All Results Dashboard</h2>

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => { setActiveSection("main"); setSelectedGrade("All Grades"); }}
          className={`px-4 py-2 rounded text-white ${activeSection === "main" ? "bg-purple-700" : "bg-purple-600"}`}
        >
          🏆 Main Exams
        </button>
        <button
          onClick={() => { setActiveSection("general"); setSelectedGrade("All Grades"); }}
          className={`px-4 py-2 rounded text-white ${activeSection === "general" ? "bg-green-700" : "bg-green-600"}`}
        >
          📝 General Exams
        </button>
        <button onClick={() => navigate("/analysis-component")} className="bg-blue-600 text-white px-4 py-2 rounded">📈 Analysis</button>
      </div>

      {activeSection && (
        <>
          <div className="flex justify-center flex-wrap gap-2 mb-3">
            {grades.map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-4 py-2 rounded ${selectedGrade === grade ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
              >
                {grade}
              </button>
            ))}
            <button onClick={resetFilters} className="px-4 py-2 rounded bg-gray-100 border hover:bg-gray-200">Reset</button>
          </div>

          {/* Section-specific filter bars */}
          {activeSection === "main" && (
            <div className="bg-white p-4 rounded shadow overflow-x-auto">
              <h3 className="text-lg font-semibold mb-3">{selectedGrade} - Main Exam Results</h3>

              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3 mb-3">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Student name</label>
                  <input
                    value={mainName}
                    onChange={(e) => setMainName(e.target.value)}
                    placeholder="e.g. Thandi"
                    className="border rounded px-3 py-2"
                  />
                </div>

                <div className="ml-auto flex gap-2">
                  <button onClick={() => exportMainResults("excel")} className="bg-green-600 text-white px-3 py-2 rounded">Excel</button>
                  <button onClick={() => exportMainResults("csv")} className="bg-yellow-500 text-white px-3 py-2 rounded">CSV</button>
                  <button onClick={() => exportMainResults("pdf")} className="bg-red-600 text-white px-3 py-2 rounded">PDF</button>
                </div>
              </div>

              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Theory %</th>
                    <th className="border p-2">Practical %</th>
                    <th className="border p-2">Grand %</th>
                    <th className="border p-2">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMainStudents.map((s, idx) => (
                    <tr key={idx} className="text-center hover:bg-gray-50">
                      <td className="border p-2">{s.name}</td>
                      <td className={`border p-2 ${s.theoryPercent >= 30 ? "text-green-600" : "text-red-600"}`}>{s.theoryPercent}%</td>
                      <td className={`border p-2 ${s.practicalPercent >= 30 ? "text-green-600" : "text-red-600"}`}>{s.practicalPercent}%</td>
                      <td className={`border p-2 font-bold ${s.grand >= 30 ? "text-green-700" : "text-red-700"}`}>{s.grand}%</td>
                      <td className="border p-2">
                        {s.feedback ? (
                          <button onClick={() => setSelectedFeedback(s.feedback)} className="text-blue-600 underline">View</button>
                        ) : <span className="text-gray-400">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSection === "general" && (
            <div className="bg-white p-4 rounded shadow overflow-x-auto mt-6">
              <h3 className="text-lg font-semibold mb-3">{selectedGrade} - General Exam Results</h3>

              {/* Filters */}
              <div className="grid md:grid-cols-5 sm:grid-cols-2 grid-cols-1 gap-3 mb-3">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Date from</label>
                  <input
                    type="date"
                    value={generalDateFrom}
                    onChange={(e) => setGeneralDateFrom(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Date to</label>
                  <input
                    type="date"
                    value={generalDateTo}
                    onChange={(e) => setGeneralDateTo(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Exam</label>
                  <input
                    value={generalExam}
                    onChange={(e) => setGeneralExam(e.target.value)}
                    placeholder="e.g. Algebra Quiz"
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Student name</label>
                  <input
                    value={generalName}
                    onChange={(e) => setGeneralName(e.target.value)}
                    placeholder="e.g. Sipho"
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={resetFilters} className="w-full border rounded px-3 py-2 hover:bg-gray-100">
                    Reset filters
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-2 justify-end">
                <button onClick={() => exportGeneralResults("excel")} className="bg-green-600 text-white px-3 py-2 rounded">Excel</button>
                <button onClick={() => exportGeneralResults("csv")} className="bg-yellow-500 text-white px-3 py-2 rounded">CSV</button>
                <button onClick={() => exportGeneralResults("pdf")} className="bg-red-600 text-white px-3 py-2 rounded">PDF</button>
              </div>

              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Exam</th>
                    <th className="border p-2">Score</th>
                    <th className="border p-2">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGeneral.map((r, idx) => (
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
        </>
      )}

      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded p-4 max-w-md w-full">
            <h4 className="text-lg font-semibold mb-2">Student Feedback</h4>
            <p className="text-sm whitespace-pre-wrap">{selectedFeedback}</p>
            <button onClick={() => setSelectedFeedback(null)} className="mt-4 bg-blue-600 text-white px-3 py-1 rounded">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
