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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA00FF", "#FF4081"];

const QUESTION_MAX_SCORES = {
  "WORD PROCESSING": 40,
  "SPREADSHEETS": 33,
  "DATABASES": 40,
  "HTML": 33,
  "GENERAL": 9,
  "MCQ": 10,
  "MATCHING ITEMS": 10,
  "T/F": 5,
  "SYSTEMS TECHNOLOGIES": 20,
  "INTERNET & NETWORK TECH": 15,
  "INFORMATION MANAGEMENT": 20,
  "SOCIAL IMPLICATIONS": 10,
  "SOLUTION DEVELOPMENT": 20,
  "APPLICATION SCENARIO": 25,
  "TASK SCENARIO": 25,
};


export default function AnalysisComponent({ studentName, grade, onClose }) {
  const [mainExamData, setMainExamData] = useState({});
  const [chartType, setChartType] = useState("pie");
  const [chartData, setChartData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const chartRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "studentResults"), (snap) => {
      const temp = {};
      snap.forEach(doc => temp[doc.id] = doc.data());
      setMainExamData(temp);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!studentName || Object.keys(mainExamData).length === 0) return;
  
    const student = mainExamData[studentName];
    if (!student) return;
  
    const allResults = [
      ...(student?.theory?.results || []),
      ...(student?.practical?.results || [])
    ];
  
    const typeScores = {};
  
    allResults.forEach(r => {
      const type = r.type || "Unknown";
      const score = Number(r.score || 0);
  
      if (!typeScores[type]) {
        typeScores[type] = { total: 0, maxTotal: QUESTION_MAX_SCORES[type] || 30 };
      }
      typeScores[type].total += score;
    });
  
    const data = [];
    const recs = [];
  
    Object.keys(typeScores).forEach(type => {
      const total = typeScores[type].total;
      const maxTotal = typeScores[type].maxTotal;
      const percent = (total / maxTotal) * 100;
  
      data.push({
        name: type,
        value: parseFloat(percent.toFixed(1)),
      });
  
      if (percent < 50) {
        recs.push(`⚠️ Needs improvement in ${type} (${percent.toFixed(1)}%)`);
      } else {
        recs.push(`✅ Good mastery in ${type} (${percent.toFixed(1)}%)`);
      }
    });
  
    setChartData(data);
    setRecommendations(recs);
  }, [mainExamData, studentName]);
  

  const exportToPDF = async () => {
    const canvas = await html2canvas(chartRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`analysis_${studentName}.pdf`);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analysis");
    XLSX.writeFile(wb, `analysis_${studentName}.xlsx`);
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analysis_${studentName}.csv`;
    link.click();
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📊 Personal Analysis for {studentName} (Per Question Type)</h2>
        {onClose && (
          <button onClick={onClose} className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700">
            ← Back
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="mr-2">Chart Type:</label>
        <select value={chartType} onChange={e => setChartType(e.target.value)} className="border rounded p-1">
          <option value="pie">Pie</option>
          <option value="bar">Bar</option>
          <option value="line">Line</option>
        </select>
      </div>

      <div ref={chartRef} className="bg-gray-50 p-4 rounded">
        {chartData.length > 0 ? (
          <>
            {chartType === "pie" && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {chartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            {chartType === "bar" && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4C51BF" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {chartType === "line" && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#4C51BF" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}

            <div className="mt-4">
              <h4 className="font-semibold text-lg">📌 Recommendations:</h4>
              <ul className="list-disc list-inside mt-2">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className={rec.includes("⚠️") ? "text-red-600" : "text-green-700"}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">Loading personalized analysis...</p>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="flex gap-3 mt-4 justify-center">
          <button onClick={exportToPDF} className="bg-blue-600 text-white px-3 py-1 rounded">Export PDF</button>
          <button onClick={exportToExcel} className="bg-green-600 text-white px-3 py-1 rounded">Export Excel</button>
          <button onClick={exportToCSV} className="bg-yellow-600 text-white px-3 py-1 rounded">Export CSV</button>
        </div>
      )}
    </div>
  );
}
