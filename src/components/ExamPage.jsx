import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ExamPage({ studentInfo, addResult }) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const questions = [
    { id: 1, question: "What is 2+2?", options: ["3", "4", "5"], correctAnswer: "4" },
    { id: 2, question: "What is the capital of France?", options: ["Paris", "London", "Rome"], correctAnswer: "Paris" }
  ];

  useEffect(() => {
    if (!studentInfo) {
      navigate('/');
      return;
    }
  
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        if (prev === 300) {
          alert("⚠️ 5 minutes left! Please finish up!");
        }
        return prev - 1;
      });
    }, 1000);
  
    // REMOVE handleClick
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && (e.key === 'r' || e.key === 'R')) ||
        e.key === 'F5' ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'v' || e.key === 'V')) ||
        (e.ctrlKey && (e.key === 'x' || e.key === 'X'))
      ) {
        e.preventDefault();
        alert("Action blocked during exam!");
      }
    };
  
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
  
    // 🔥 NO document.addEventListener('click', handleClick);
  
    return () => {
      clearInterval(timer);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      // 🔥 NO document.removeEventListener('click', handleClick);
    };
  }, [studentInfo, navigate]);
  
  const handleChange = (id, answer) => {
    setAnswers({ ...answers, [id]: answer });
  };

  const handleSubmit = () => {
    if (submitted) return;
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) correct++;
    });
    const total = questions.length;
    const percentage = (correct / total) * 100;

    addResult({
      name: studentInfo.name,
      score: correct,
      percentage: percentage.toFixed(2),
      time: new Date().toLocaleString()
    });

    setSubmitted(true);

    setTimeout(() => {
      navigate('/results');
    }, 3000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50" style={{ userSelect: "none" }}>
      <h2 className="text-xl font-bold text-center text-blue-700 mb-4">Exam in Progress</h2>
      <div className="text-center text-2xl mb-6 font-mono text-red-600">
        Time Left: {formatTime(timeLeft)}
      </div>
      {!submitted ? (
        <form onSubmit={(e) => {
          e.preventDefault();
          if (window.confirm("Are you sure you want to submit? You won't be able to change your answers.")) {
            handleSubmit();
          }
        }} className="space-y-6">
      
          {questions.map((q) => (
            <div key={q.id} className="bg-white p-4 rounded-md shadow">
              <h3 className="text-lg font-semibold">{q.question}</h3>
              <div className="space-y-2 mt-2">
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      onChange={() => handleChange(q.id, opt)}
                      required
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-800">
            Submit Exam
          </button>
        </form>
      ) : (
        <div className="text-center text-2xl font-bold text-gray-700 mt-10 animate-pulse">
          Exam submitted! Calculating results...
        </div>
      )}
    </div>
  );
}
