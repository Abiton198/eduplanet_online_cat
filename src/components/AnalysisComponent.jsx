// import React, { useEffect, useState, useRef } from "react";
// import { db } from "../utils/firebase";
// import { collection, onSnapshot } from "firebase/firestore";
// // import GroupWeakStudents from '../utils/GroupWeakStudents';
// import { useNavigate } from "react-router-dom";

// import {
//   PieChart, Pie, Cell, Tooltip,
//   BarChart, Bar, XAxis, YAxis, CartesianGrid,
//   LineChart, Line, ResponsiveContainer,
// } from "recharts";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";
// import * as XLSX from "xlsx";

// // Chart colors
// const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF", "#FF4081"];


// // Grade 11 theory max scores
// const GRADE_11_MAX_SCORES = {
//   "MCQ": 10,
//   "MATCHING ITEMS": 5,
//   "T/F": 5,
//   "SPREADSHEETS": 20,
//   "DATABASES": 20,
//   "INTERNET & NETWORK TECH": 20,
//   "INTERNET & TECHNOLOGY SCENARIO": 20,
//   "DATABASES SCENARIO": 20,
// };

// // Grade 11 practical max scores
// const GRADE_11_PRACTICAL = {
//   "WORD PROCESSING": 33,
//   "SPREADSHEETS": 21,
//   "DATABASES": 26,
//   "HTML": 20,
// };

// // Grade 12 practical scores
// const GRADE_12_PRAC_SCORES = {
//   "WORD PROCESSING Q1": 25,
//   "WORD PROCESSING Q2": 19,
//   "SPREADSHEETS": 24,
//   "DATABASES": 40,
//   "HTML": 33,
//   "GENERAL": 9,
// };

// // Grade 12 theory scores
// const GRADE_12_THEORY_SCORES = {
//   "MCQ": 10,
//   "MATCHING ITEMS": 10,
//   "T/F": 5,
//   "SYSTEMS TECHNOLOGIES": 20,
//   "INTERNET & NETWORKS": 15,
//   "INTERNET & NETWORK TECH": 15,
//   "INFORMATION MANAGEMENT": 10,
//   "SOCIAL IMPLICATIONS": 10,
//   "SOLUTION DEVELOPMENT": 20,
//   "APPLICATION SCENARIO": 25,
//   "TASK SCENARIO": 25,
// };

// // Default fallback
// const DEFAULT_MAX_SCORES = {
//   "WORD PROCESSING": 25,
//   "SPREADSHEETS": 24,
//   "DATABASES": 40,
//   "HTML": 33,
//   "GENERAL": 9,
// };

// export default function AnalysisComponent() {
//   const [mainExamData, setMainExamData] = useState({});
//   const [analysisType, setAnalysisType] = useState("overall");
//   const [chartType, setChartType] = useState("pie");
//   const [selectedGrade, setSelectedGrade] = useState("All Grades");
//   const [selectedStudent, setSelectedStudent] = useState("");
//   const [chartData, setChartData] = useState([]);
//   const [recommendations, setRecommendations] = useState([]);
//   const chartRef = useRef(null);
//   const navigate = useNavigate();

//   // Fetch student results
//   useEffect(() => {
//     const unsub = onSnapshot(collection(db, "studentResults"), (snap) => {
//       const temp = {};
//       snap.forEach(doc => temp[doc.id] = doc.data());
//       setMainExamData(temp);
//     });
//     return () => unsub();
//   }, []);

//   // Core analysis logic
//   useEffect(() => {
//     let data = [];
//     let recs = [];

//     const filtered = Object.keys(mainExamData).filter(name => {
//       const g = mainExamData[name].grade || mainExamData[name].theory?.grade || mainExamData[name].practical?.grade || "";
//       return selectedGrade === "All Grades" || g.toLowerCase().includes(selectedGrade.toLowerCase());
//     });

//     const isGrade11 = selectedGrade.includes("11");
//     const isGrade12 = selectedGrade.includes("12");

//     if (analysisType === "individual" && selectedStudent) {
//       const entry = mainExamData[selectedStudent];
//       const grade = entry.grade || entry.theory?.grade || entry.practical?.grade || "Unknown";
//       const practical = entry.practical?.results?.reduce((sum, r) => sum + Number(r.score || 0), 0) || 0;
//       const theory = entry.theory?.results?.reduce((sum, r) => sum + Number(r.score || 0), 0) || 0;

//       let practicalMax = 150, theoryMax = 150;
//       if (grade.includes("10")) { practicalMax = 50; theoryMax = 100; }
//       else if (grade.includes("11")) { practicalMax = 100; theoryMax = 120; }
//       else if (grade.includes("12")) { practicalMax = 150; theoryMax = 150; }

//       const grand = ((practical + theory) / (practicalMax + theoryMax)) * 100;

//       const categories = [
//         { name: "Theory", value: (theory / theoryMax) * 100 },
//         { name: "Practical", value: (practical / practicalMax) * 100 },
//         { name: "Grand Total %", value: grand },
//       ];

//       data = categories.map(c => ({ name: c.name, value: parseFloat(c.value.toFixed(2)) }));
//       recs = categories.map(c => {
//         if (c.value < 40) return `${c.name}: Needs improvement (below 50%).`;
//         if (c.value < 70) return `${c.name}: Fair, but can improve (50-70%).`;
//         return `${c.name}: Good mastery (above 70%).`;
//       });
//     }

//     else if (analysisType === "question" && selectedStudent) {
//       const student = mainExamData[selectedStudent];
//       const results = [...(student?.theory?.results || []), ...(student?.practical?.results || [])];

//       const seen = new Set();
//       results.forEach(r => {
//         const qType = r.type || "Unknown";
//         const qNum = r.question || "X";
//         const key = `${qType}-${qNum}`;
//         if (!seen.has(key)) {
//           seen.add(key);

//           let max = 10; // fallback

//           if (isGrade11) {
//             max = GRADE_11_MAX_SCORES[qType] || GRADE_11_PRACTICAL[qType] || DEFAULT_MAX_SCORES[qType] || 10;
//           } else if (isGrade12) {
//             max = GRADE_12_THEORY_SCORES[qType] || GRADE_12_PRAC_SCORES[qType] || DEFAULT_MAX_SCORES[qType] || 10;
//           } else {
//             max = DEFAULT_MAX_SCORES[qType] || 10;
//           }

//           const score = Number(r.score || 0);
//           const percent = (score / max) * 100;

//           data.push({
//             name: `${qType} - Q${qNum}`,
//             type: qType,
//             value: score,
//             max,
//             percent: parseFloat(percent.toFixed(1)),
//           });

//           if (percent < 50) recs.push(`${qType} - Q${qNum}: Needs improvement (${percent.toFixed(1)}%).`);
//           else if (percent < 70) recs.push(`${qType} - Q${qNum}: Fair, can improve (${percent.toFixed(1)}%).`);
//           else recs.push(`${qType} - Q${qNum}: Good mastery (${percent.toFixed(1)}%).`);
//         }
//       });
//     }

//     setChartData(data);
//     setRecommendations(recs);
//   }, [analysisType, selectedStudent, selectedGrade, mainExamData]);

//   const hasData = chartData && chartData.length > 0;

//   // Export handlers
//   const exportToPDF = async () => {
//     const canvas = await html2canvas(chartRef.current);
//     const imgData = canvas.toDataURL("image/png");
//     const pdf = new jsPDF("p", "mm", "a4");
//     const imgProps = pdf.getImageProperties(imgData);
//     const pdfWidth = pdf.internal.pageSize.getWidth();
//     const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
//     pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
//     pdf.save(`analysis_${selectedStudent || selectedGrade}.pdf`);
//   };

//   const exportToExcel = () => {
//     const ws = XLSX.utils.json_to_sheet(chartData);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Analysis");
//     XLSX.writeFile(wb, `analysis_${selectedStudent || selectedGrade}.xlsx`);
//   };

//   const exportToCSV = () => {
//     const ws = XLSX.utils.json_to_sheet(chartData);
//     const csv = XLSX.utils.sheet_to_csv(ws);
//     const blob = new Blob([csv], { type: "text/csv" });
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.download = `analysis_${selectedStudent || selectedGrade}.csv`;
//     link.click();
//   };

//   return (
//     <div className="max-w-6xl mx-auto p-6">
//       <h2 className="text-3xl font-bold text-center mb-6">📊 Exam Analysis Dashboard</h2>

//       {/* ✅ Return to All Results Button */}
//       <button
//         onClick={() => navigate("/all-results")}
//         className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
//       >
//         ← Return to All Results
//       </button>

//       {/* Filters */}
//       <div className="flex flex-wrap gap-4 mb-6">
//         <div>
//           <label className="font-medium mr-2">Grade:</label>
//           <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="border rounded px-3 py-1">
//             <option>All Grades</option>
//             <option>Grade 10</option>
//             <option>Grade 11</option>
//             <option>Grade 12</option>
//           </select>
//         </div>

//         <div>
//           <label className="font-medium mr-2">Analysis:</label>
//           <select value={analysisType} onChange={e => setAnalysisType(e.target.value)} className="border rounded px-3 py-1">
//             <option value="overall">Overall Student Performance</option>
//             <option value="overallQuestions">Overall Per Question (Focus Areas)</option>
//             <option value="question">Performance per Question (1 Student)</option>
//             <option value="individual">Individual Summary</option>
//           </select>
//         </div>

//         {(analysisType === "question" || analysisType === "individual") && (
//           <div>
//             <label className="font-medium mr-2">Student:</label>
//             <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="border rounded px-3 py-1">
//               <option value="">Select</option>
//               {Object.keys(mainExamData).map(name => (
//                 <option key={name} value={name}>{name}</option>
//               ))}
//             </select>
//           </div>
//         )}

//         <div>
//           <label className="font-medium mr-2">Chart Type:</label>
//           <select value={chartType} onChange={e => setChartType(e.target.value)} className="border rounded px-3 py-1">
//             <option value="pie">Pie</option>
//             <option value="bar">Bar</option>
//             <option value="line">Line</option>
//           </select>
//         </div>
//       </div>

//       {/* Chart */}
//       <div ref={chartRef} className="bg-white p-4 rounded shadow">
//         {hasData ? (
//           <>
//             {chartType === "pie" && (
//               <ResponsiveContainer width="100%" height={400}>
//                 <PieChart>
//                   <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} label>
//                     {chartData.map((entry, idx) => (
//                       <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
//                     ))}
//                   </Pie>
//                   <Tooltip />
//                 </PieChart>
//               </ResponsiveContainer>
//             )}
//             {chartType === "bar" && (
//               <ResponsiveContainer width="100%" height={400}>
//                 <BarChart data={chartData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="name" />
//                   <YAxis />
//                   <Tooltip />
//                   <Bar dataKey="value" fill="#0088FE" /> 
//                   </BarChart>
//               </ResponsiveContainer>
//             )}
//             {chartType === "line" && (
//               <ResponsiveContainer width="100%" height={400}>
//                 <LineChart data={chartData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="name" />
//                   <YAxis />
//                   <Tooltip />
//                   <Line
//                       type="monotone"
//                       dataKey="value"
//                       stroke="#8884d8"
//                       dot={{ stroke: "black", strokeWidth: 1, fill: entry => entry.value < 30 ? "#FF4C4C" : "#8884d8" }} // red dot if <30
//                       activeDot={{ r: 8 }}
//                     />

//                 </LineChart>
//               </ResponsiveContainer>
//             )}

//           <ul className="list-disc list-inside space-y-1">
//             {recommendations.map((rec, idx) => {
//               const isLow = rec.includes("below 30") || rec.match(/(\d+(\.\d+)?)%/g)?.some(p => parseFloat(p) < 30);
//               return (
//                 <li key={idx} className={isLow ? "text-red-600 font-semibold" : ""}>
//                   {rec}
//                 </li>
//               );
//             })}
//           </ul>

//           </>
//         ) : (
//           <p className="text-center text-gray-500">No data for selected options.</p>
//         )}
//       </div>

// src/components/AnalysisComponent.jsx
import React, { useEffect, useState, useRef } from "react";
import { db } from "../utils/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

// Chart colors
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF", "#FF4081"];

// Grade 11 theory max scores
const GRADE_11_MAX_SCORES = {
  "MCQ": 10,
  "MATCHING ITEMS": 5,
  "T/F": 5,
  "SPREADSHEETS": 20,
  "DATABASES": 20,
  "INTERNET & NETWORK TECH": 20,
  "INTERNET & TECHNOLOGY SCENARIO": 20,
  "DATABASES SCENARIO": 20,
};

// Grade 11 practical max scores
const GRADE_11_PRACTICAL = {
  "WORD PROCESSING": 33,
  "SPREADSHEETS": 21,
  "DATABASES": 26,
  "HTML": 20,
};

// Grade 12 practical scores
const GRADE_12_PRAC_SCORES = {
  "WORD PROCESSING Q1": 25,
  "WORD PROCESSING Q2": 19,
  "SPREADSHEETS": 24,
  "DATABASES": 40,
  "HTML": 33,
  "GENERAL": 9,
};

// Grade 12 theory scores
const GRADE_12_THEORY_SCORES = {
  "MCQ": 10,
  "MATCHING ITEMS": 10,
  "T/F": 5,
  "SYSTEMS TECHNOLOGIES": 20,
  "INTERNET & NETWORKS": 15,
  "INTERNET & NETWORK TECH": 15,
  "INFORMATION MANAGEMENT": 10,
  "SOCIAL IMPLICATIONS": 10,
  "SOLUTION DEVELOPMENT": 20,
  "APPLICATION SCENARIO": 25,
  "TASK SCENARIO": 25,
};

// Default fallback
const DEFAULT_MAX_SCORES = {
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
  const [selectedGrade, setSelectedGrade] = useState("All Grades");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [chartData, setChartData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const chartRef = useRef(null);
  const navigate = useNavigate();

  // load all studentResults
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "studentResults"), (snap) => {
      const temp = {};
      snap.forEach((doc) => (temp[doc.id] = doc.data()));
      setMainExamData(temp);
    });
    return () => unsub();
  }, []);

  // recalc on filter/selection change
  useEffect(() => {
    // clear student if not needed
    if (analysisType === "overall" || analysisType === "overallQuestions") {
      setSelectedStudent("");
    }

    // filter entries by grade
    const entries = Object.entries(mainExamData)
      .filter(([_, entry]) => {
        const grade =
          entry.grade ||
          entry.theory?.grade ||
          entry.practical?.grade ||
          "";
        return (
          selectedGrade === "All Grades" ||
          grade.toLowerCase().includes(selectedGrade.toLowerCase())
        );
      })
      .map(([name, entry]) => ({ name, entry }));

    const isGrade11 = selectedGrade === "Grade 11";
    const isGrade12 = selectedGrade === "Grade 12";

    let data = [];
    let recs = [];

    // 1) Cohort overall
    if (analysisType === "overall") {
      let sumTheory = 0,
        sumPrac = 0,
        sumGrand = 0;
      entries.forEach(({ entry }) => {
        const prac = entry.practical?.results?.reduce(
          (s, r) => s + Number(r.score || 0),
          0
        ) || 0;
        const theo = entry.theory?.results?.reduce(
          (s, r) => s + Number(r.score || 0),
          0
        ) || 0;

        let pracMax = isGrade12 ? 150 : isGrade11 ? 100 : 100;
        let theoMax = isGrade12 ? 150 : isGrade11 ? 120 : 120;

        sumPrac += (prac / pracMax) * 100;
        sumTheory += (theo / theoMax) * 100;
        sumGrand += ((prac + theo) / (pracMax + theoMax)) * 100;
      });
      const n = entries.length || 1;
      data = [
        { name: "Theory", value: parseFloat((sumTheory / n).toFixed(2)) },
        { name: "Practical", value: parseFloat((sumPrac / n).toFixed(2)) },
        { name: "Grand Total %", value: parseFloat((sumGrand / n).toFixed(2)) },
      ];
      recs = data.map((c) =>
        c.value < 50
          ? `${c.name} is ${c.value}% (below average).`
          : `${c.name} is ${c.value}%.`
      );
    }
    // 2) Cohort per-question
    else if (analysisType === "overallQuestions") {
      const agg = {};
      entries.forEach(({ entry }) => {
        const results = [
          ...(entry.theory?.results || []),
          ...(entry.practical?.results || []),
        ];
        results.forEach((r) => {
          const type = r.type || "Unknown";
          let max =
            isGrade11
              ? GRADE_11_MAX_SCORES[type] ||
                GRADE_11_PRACTICAL[type] ||
                DEFAULT_MAX_SCORES[type] ||
                10
              : isGrade12
              ? GRADE_12_THEORY_SCORES[type] ||
                GRADE_12_PRAC_SCORES[type] ||
                DEFAULT_MAX_SCORES[type] ||
                10
              : DEFAULT_MAX_SCORES[type] || 10;
          const pct = (Number(r.score || 0) / max) * 100;
          if (!agg[type]) agg[type] = { total: 0, count: 0 };
          agg[type].total += pct;
          agg[type].count += 1;
        });
      });
      data = Object.entries(agg).map(([type, { total, count }]) => ({
        name: type,
        value: parseFloat((total / count).toFixed(2)),
      }));
      recs = data.map((c) =>
        c.value < 50
          ? `${c.name}: ${c.value}% (focus here).`
          : `${c.name}: ${c.value}%.`
      );
    }
    // 3) Individual summary
    else if (analysisType === "individual" && selectedStudent) {
      const entry = mainExamData[selectedStudent] || {};
      const prac = entry.practical?.results?.reduce(
        (s, r) => s + Number(r.score || 0),
        0
      ) || 0;
      const theo = entry.theory?.results?.reduce(
        (s, r) => s + Number(r.score || 0),
        0
      ) || 0;

      let pracMax = isGrade12 ? 150 : isGrade11 ? 100 : 100;
      let theoMax = isGrade12 ? 150 : isGrade11 ? 120 : 120;
      const grand = ((prac + theo) / (pracMax + theoMax)) * 100;

      data = [
        { name: "Theory", value: parseFloat(((theo / theoMax) * 100).toFixed(2)) },
        { name: "Practical", value: parseFloat(((prac / pracMax) * 100).toFixed(2)) },
        { name: "Grand Total %", value: parseFloat(grand.toFixed(2)) },
      ];
      recs = data.map((c) =>
        c.value < 50
          ? `${c.name}: ${c.value}% (needs improvement).`
          : `${c.name}: ${c.value}%.`
      );
    }
    // 4) Question by question
    else if (analysisType === "question" && selectedStudent) {
      const entry = mainExamData[selectedStudent] || {};
      const results = [
        ...(entry.theory?.results || []),
        ...(entry.practical?.results || []),
      ];
      const seen = new Set();
      results.forEach((r) => {
        const key = `${r.type}-${r.question}`;
        if (!seen.has(key)) {
          seen.add(key);
          const type = r.type || "Unknown";
          let max =
            isGrade11
              ? GRADE_11_MAX_SCORES[type] ||
                GRADE_11_PRACTICAL[type] ||
                DEFAULT_MAX_SCORES[type] ||
                10
              : isGrade12
              ? GRADE_12_THEORY_SCORES[type] ||
                GRADE_12_PRAC_SCORES[type] ||
                DEFAULT_MAX_SCORES[type] ||
                10
              : DEFAULT_MAX_SCORES[type] || 10;
          const pct = (Number(r.score || 0) / max) * 100;
          data.push({
            name: `${type}-Q${r.question}`,
            value: parseFloat(pct.toFixed(1)),
          });
          recs.push(
            pct < 50
              ? `${type}-Q${r.question}: ${pct.toFixed(1)}% (work needed).`
              : `${type}-Q${r.question}: ${pct.toFixed(1)}%.`
          );
        }
      });
    }

    setChartData(data);
    setRecommendations(recs);
  }, [analysisType, selectedGrade, selectedStudent, mainExamData]);

  const hasData = chartData.length > 0;

  // Exports
  const exportToPDF = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const props = pdf.getImageProperties(imgData);
    const height = (props.height * width) / props.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
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
      <h2 className="text-3xl font-bold text-center mb-6">
        📊 Exam Analysis Dashboard
      </h2>

      <button
        onClick={() => navigate("/all-results")}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ← Return to All Results
      </button>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="font-medium mr-2">Grade:</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option>All Grades</option>
            <option>Grade 10</option>
            <option>Grade 11</option>
            <option>Grade 12</option>
          </select>
        </div>

        <div>
          <label className="font-medium mr-2">Analysis:</label>
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="overall">Overall Performance</option>
            <option value="overallQuestions">
              Overall Per‑Question Focus
            </option>
            <option value="question">
              Per‑Question (Single Student)
            </option>
            <option value="individual">Individual Summary</option>
          </select>
        </div>

        {(analysisType === "question" ||
          analysisType === "individual") && (
          <div>
            <label className="font-medium mr-2">Student:</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="">Select</option>
              {Object.keys(mainExamData).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="font-medium mr-2">Chart Type:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="pie">Pie</option>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
          </select>
        </div>
      </div>

      {/* Chart + recs */}
      <div ref={chartRef} className="bg-white p-4 rounded shadow">
        {hasData ? (
          <>
            {chartType === "pie" && (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    label
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
                  <Bar dataKey="value" fill="#0088FE" />
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
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            <ul className="list-disc list-inside mt-4">
              {recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-center text-gray-500">
            No data for selected filters.
          </p>
        )}
      </div>

      {/* Exports */}
      {hasData && (
        <div className="mt-4 flex gap-4">
          <button
            onClick={exportToPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            📄 PDF
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            📊 Excel
          </button>
          <button
            onClick={exportToCSV}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            📁 CSV
          </button>
        </div>
      )}
    <div
        onClick={() => navigate("/group-weak-students")}
        className="cursor-pointer bg-pink-600 text-white rounded-xl shadow p-1 hover:scale-105 transition border-t-8"
        >
        <h3 className="text-xl font-bold">👥 Group Students Needs Attention</h3>
        <p className="text-center">Identify and plan extra lessons for students scoring less than 50%</p>
        </div>
    </div>
    
  );
}


