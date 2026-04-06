"use client";

import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function AIExamMocker({ student }) {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);

 
  const API = "https://abitonp.pythonanywhere.com"

  // =========================
  // 📄 LOAD EXAMS
  // =========================
  const loadExams = async () => {
    const res = await fetch(`${API}/exams`);
    const data = await res.json();
    setExams(data.exams || []);
  };

  useEffect(() => {
    loadExams();
  }, []);

  // =========================
  // 🚀 START EXAM
  // =========================
  const startExam = async () => {
    const res = await fetch(`${API}/start_exam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam: selectedExam }),
    });

    const data = await res.json();
    setSessionId(data.session_id);
    setStarted(true);
    loadQuestion(data.session_id, 0);
  };

  // =========================
  // 📥 LOAD QUESTION
  // =========================
  const loadQuestion = async (sid, i) => {
    const res = await fetch(`${API}/question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sid, index: i }),
    });

    const data = await res.json();
    setQuestion(data);
    setIndex(i);
  };

  // =========================
  // 💾 SAVE ANSWER
  // =========================
  const saveAnswer = (value) => {
    setAnswers((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  // =========================
  // ➡️ NAVIGATION
  // =========================
  const next = () => loadQuestion(sessionId, index + 1);
  const prev = () => loadQuestion(sessionId, index - 1);

  // =========================
  // 🧠 DETECT QUESTION TYPE
  // =========================
  const renderQuestion = () => {
    if (!question) return null;

    const q = question;
    const saved = answers[index] || "";

    // MCQ
    if (q.options && q.options.length > 0) {
      return (
        <div>
          {q.options.map((opt, i) => (
            <label key={i} className="block my-2">
              <input
                type="radio"
                name="mcq"
                value={opt}
                checked={saved === opt}
                onChange={() => saveAnswer(opt)}
              />{" "}
              <b>{String.fromCharCode(65 + i)}.</b> {opt}
            </label>
          ))}
        </div>
      );
    }

    // TRUE/FALSE
    if (q.question.toLowerCase().includes("true or false")) {
      return (
        <div>
          {["True", "False"].map((opt) => (
            <label key={opt} className="block my-2">
              <input
                type="radio"
                name="tf"
                value={opt}
                checked={saved === opt}
                onChange={() => saveAnswer(opt)}
              />{" "}
              {opt}
            </label>
          ))}
        </div>
      );
    }

    // MATCHING (basic version)
    if (q.question.toLowerCase().includes("match")) {
      return (
        <textarea
          className="w-full border p-2 mt-2"
          rows={4}
          placeholder="Type your matching answers..."
          value={saved}
          onChange={(e) => saveAnswer(e.target.value)}
        />
      );
    }

    // STRUCTURED
    return (
      <textarea
        className="w-full border p-2 mt-2"
        rows={5}
        placeholder="Write your answer..."
        value={saved}
        onChange={(e) => saveAnswer(e.target.value)}
      />
    );
  };

  // =========================
  // 📤 SUBMIT EXAM
  // =========================
  const submitExam = async () => {
    await addDoc(collection(db, "exam_attempts"), {
      studentId: student?.id || "demo",
      exam: selectedExam,
      answers,
      createdAt: serverTimestamp(),
    });

    alert("✅ Exam submitted!");
  };

  // =========================
  // 🎨 UI
  // =========================
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white text-black shadow">
      <h1 className="text-2xl font-bold mb-4">📝 AI Exam Mocker</h1>

      {!started && (
        <div>
          <select
            className="border p-2 w-full mb-4"
            onChange={(e) => setSelectedExam(e.target.value)}
          >
            <option>Select Exam</option>
            {exams.map((ex, i) => (
              <option key={i} value={ex}>
                {ex}
              </option>
            ))}
          </select>

          <button
            onClick={startExam}
            className="bg-black text-white px-4 py-2"
          >
            Start Exam
          </button>
        </div>
      )}

      {started && question && (
        <div>
          <div className="mb-4 border-b pb-2">
            <p className="text-sm">{question.section}</p>
            <h2 className="font-semibold">
              {question.number}. {question.question}
            </h2>
            <p className="text-xs">[{question.marks} marks]</p>
          </div>

          {renderQuestion()}

          <div className="flex justify-between mt-6">
            <button onClick={prev} className="border px-3 py-1">
              Back
            </button>
            <button onClick={next} className="border px-3 py-1">
              Next
            </button>
          </div>

          <button
            onClick={submitExam}
            className="mt-6 bg-black text-white px-4 py-2 w-full"
          >
            Submit Exam
          </button>
        </div>
      )}
    </div>
  );
}