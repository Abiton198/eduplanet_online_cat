import React, { useEffect, useState, useRef } from "react";
import { db } from "../utils/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";


// 🎨 Chart colors
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF", "#FF4081"];

// ✅ Config: MAX possible mark per question (by type + Q# for Word Processing)
const QUESTION_MAX_SCORES = {
    "WORD PROCESSING": 19,
    "WORD PROCESSING": 25,
  "SPREADSHEETS": 24,
  "DATABASES": 40,
  "HTML": 33,
  "GENERAL": 9,
};

export default function AnalysisComponent() {
  const [mainExamData, setMainExamData] = useState({});
  const [analysisType, setAnalysisType] = useState("overall");
  const [chartType, setChartType] = useState("pie");
  const [selectedGrade, setSelectedGrade] = useState("Grade 12");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [chartData, setChartData] = useState([]);
  const chartRef = useRef(null);
  const navigate = useNavigate();


  // 📥 Load all studentResults live from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "studentResults"), (snap) => {
      const temp = {};
      snap.forEach(doc => temp[doc.id] = doc.data());
      setMainExamData(temp);
    });
    return () => unsub();
  }, []);

  // 🔍 Compute chartData for the selected mode
  useEffect(() => {
    let data = [];

    // 🎓 Filter students by selected grade
    const gradeFiltered = Object.keys(mainExamData).filter(name => {
      const g = mainExamData[name].grade || mainExamData[name].theory?.grade || mainExamData[name].practical?.grade || "";
      return g.toLowerCase().includes(selectedGrade.toLowerCase());
    });

    // 1️⃣ Overall per student
    if (analysisType === "overall") {
      data = gradeFiltered.map(name => {
        const theory = mainExamData[name].theory?.results?.reduce((s, r) => s + Number(r.score || 0), 0) || 0;
        const practical = mainExamData[name].practical?.results?.reduce((s, r) => s + Number(r.score || 0), 0) || 0;
        const percent = ((theory + practical) / 300) * 100;
        return { name, value: parseFloat(percent.toFixed(2)) };
      });

    // 2️⃣ Overall per QUESTION across students (clean)
    } else if (analysisType === "overallQuestions") {
      const allResults = [];
      gradeFiltered.forEach(name => {
        const theory = mainExamData[name].theory?.results || [];
        const practical = mainExamData[name].practical?.results || [];
        allResults.push(...theory, ...practical);
      });

      // Group by TYPE + Q# to avoid duplicates
      const grouped = {};
      allResults.forEach(r => {
        const qType = r.type || "Unknown";
        const qNum = r.question || "X";
        const key = `${qType}-${qNum}`;
        if (!grouped[key]) grouped[key] = {
          total: 0,
          count: 0,
          type: qType,
          question: qNum
        };
        grouped[key].total += Number(r.score || 0);
        grouped[key].count += 1;
      });

      data = Object.entries(grouped).map(([key, val]) => {
        let max;
        if (val.type === "WORD_PROCESSING") {
          max = QUESTION_MAX_SCORES[`WORD_PROCESSING-${val.question}`] || 10;
        } else {
          max = QUESTION_MAX_SCORES[val.type] || 10;
        }
        const avg = val.total / val.count;
        const percent = (avg / max) * 100;
        return {
          name: `${val.type} - Q${val.question}`,
          value: parseFloat(avg.toFixed(2)),
          max,
          percent: parseFloat(percent.toFixed(1)),
        };
      });

    // 3️⃣ One student: detailed question breakdown
    } else if (analysisType === "question" && selectedStudent) {
      const student = mainExamData[selectedStudent];
      const results = [
        ...(student?.theory?.results || []),
        ...(student?.practical?.results || []),
      ];

      const seen = new Set();
      data = [];
      results.forEach(r => {
        const qType = r.type || "Unknown";
        const qNum = r.question || "X";
        const key = `${qType}-${qNum}`;
        if (!seen.has(key)) {
          seen.add(key);
          let max;
          if (qType === "WORD_PROCESSING") {
            max = QUESTION_MAX_SCORES[`WORD_PROCESSING-${qNum}`] || 10;
          } else {
            max = QUESTION_MAX_SCORES[qType] || 10;
          }
          const percent = (Number(r.score || 0) / max) * 100;
          data.push({
            name: `${qType} - Q${qNum}`,
            type: qType,
            value: Number(r.score || 0),
            max,
            percent: parseFloat(percent.toFixed(1)),
          });
        }
      });

    // 4️⃣ Single student: summary (theory, practical, grand)
    } else if (analysisType === "individual" && selectedStudent) {
      const s = mainExamData[selectedStudent];
      const t = s?.theory?.results?.reduce((s, r) => s + Number(r.score || 0), 0) || 0;
      const p = s?.practical?.results?.reduce((s, r) => s + Number(r.score || 0), 0) || 0;
      const g = ((t + p) / 300) * 100;
      data = [
        { name: "Theory", value: parseFloat(((t / 150) * 100).toFixed(2)) },
        { name: "Practical", value: parseFloat(((p / 150) * 100).toFixed(2)) },
        { name: "Grand Total %", value: parseFloat(g.toFixed(2)) },
      ];
    }

    setChartData(data);
  }, [analysisType, selectedStudent, selectedGrade, mainExamData]);

  const hasData = chartData && chartData.length > 0;

  // 📤 Export helpers
  const exportToPDF = async () => {
    const element = chartRef.current;
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`analysis_${selectedStudent || selectedGrade}.pdf`);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analysis");
    XLSX.writeFile(wb, `analysis_${selectedStudent || selectedGrade}.xlsx`);
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analysis_${selectedStudent || selectedGrade}.csv`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-6">📊 Exam Analysis Dashboard</h2>

{/* return button */}
      <div className="mt-6">
  <button
    onClick={() => navigate(-1)}
    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
  >
    ← Return to Main Page
  </button>
</div>


      {/* 🔘 Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="font-medium mr-2">Grade:</label>
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="border rounded px-3 py-1">
            <option>Grade 10</option>
            <option>Grade 11</option>
            <option>Grade 12</option>
          </select>
        </div>

        <div>
          <label className="font-medium mr-2">Analysis:</label>
          <select value={analysisType} onChange={e => setAnalysisType(e.target.value)} className="border rounded px-3 py-1">
            <option value="overall">Overall Student Performance</option>
            <option value="overallQuestions">Overall Per Question (Focus Areas)</option>
            <option value="question">Performance per Question (1 Student)</option>
            <option value="individual">Individual Summary</option>
          </select>
        </div>

        {(analysisType === "question" || analysisType === "individual") && (
          <div>
            <label className="font-medium mr-2">Student:</label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="border rounded px-3 py-1">
              <option value="">Select</option>
              {Object.keys(mainExamData).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="font-medium mr-2">Chart Type:</label>
          <select value={chartType} onChange={e => setChartType(e.target.value)} className="border rounded px-3 py-1">
            <option value="pie">Pie</option>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
          </select>
        </div>
      </div>

      {/* 📊 Chart & Recommendations */}
      <div ref={chartRef} className="bg-white p-4 rounded shadow">
        {hasData ? (
          <>
            {chartType === "pie" && (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} label>
                    {chartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            {chartType === "bar" && (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {chartType === "line" && (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* ✅ Recommendations */}
            {analysisType === "overallQuestions" && (
              <div className="mt-6">
                <h4 className="text-xl font-semibold mb-2">📌 Focus Areas (Overall Questions)</h4>
                <ul className="list-disc list-inside space-y-1">
                  {chartData.map((q, idx) => (
                    <li key={idx} className={q.percent < 50 ? "text-red-600" : ""}>
                      {q.name}: Avg {q.value}/{q.max} → {q.percent}% →{" "}
                      {q.percent < 50 ? "Needs focus." : "Good mastery."}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysisType === "question" && selectedStudent && (
              <div className="mt-6">
                <h4 className="text-xl font-semibold mb-2">📌 Recommendations for {selectedStudent}</h4>
                <ul className="list-disc list-inside space-y-1">
                  {chartData.map((q, idx) => (
                    <li key={idx} className={q.percent < 50 ? "text-red-600" : ""}>
                      {q.name}: {q.value}/{q.max} → {q.percent}% →{" "}
                      {q.percent < 50 ? "Needs improvement." : "Good."}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-500">No data for selected options.</p>
        )}
      </div>

      {hasData && (
        <div className="mt-4 flex flex-wrap gap-4">
          <button onClick={exportToPDF} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">📄 PDF</button>
          <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">📊 Excel</button>
          <button onClick={exportToCSV} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">📁 CSV</button>
        </div>
      )}
    </div>
  );
}
