import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { questions } from '../utils/Questions';

export default function ExamPage({ studentInfo, addResult }) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

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
  
    // Block certain actions during the exam
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
  
    return () => {
      clearInterval(timer);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [studentInfo, navigate]);

  const handleChange = (id, answer) => {
    setAnswers(prev => ({ ...prev, [String(id)]: answer }));
  };

  const handleSubmit = () => {
    if (submitted) return;
  
    let correct = 0;
    let unanswered = 0;
  
    questions.forEach(q => {
      const userAnswer = answers[String(q.id)]; // Get the selected answer text (e.g., "Google Drive")
      if (!userAnswer) {
        unanswered++;
      } else if (userAnswer === q.correctAnswer) {
        correct++;
      }
    });
  
    const total = questions.length;
    const percentage = (correct / total) * 100;
    const examResult = {
      name: studentInfo.name,
      score: correct,
      percentage: percentage.toFixed(2),
      unanswered,
      time: new Date().toLocaleString()
    };
  
    // Add result to your result list (assuming you have an addResult function)
    addResult(examResult);
  
    // Save to localStorage
    localStorage.setItem('examResult', JSON.stringify(examResult));
  
    setSubmitted(true);
  
    Swal.fire({
      icon: 'success',
      title: '🎉 Exam Submitted Successfully!',
      html: `You scored <b>${correct}/${total}</b>.<br>Unanswered: <b>${unanswered}</b>.<br>Redirecting to your results...`,
      timer: 3000,
      showConfirmButton: false
    });
  
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
      <h2 className="text-2xl font-bold mb-4">
  Welcome {studentInfo.name} from {studentInfo.grade}! Just vomit the data!
</h2>


      <h2 className="text-xl font-bold text-center text-blue-700 mb-4">Exam in Progress</h2>
      <div className="text-center text-2xl mb-6 font-mono text-red-600">
        Time Left: {formatTime(timeLeft)}
      </div>
      {!submitted ? (
        <form className="space-y-6">
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
          <button
            type="button"
            onClick={() => {
              Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to change your answers after submitting.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0000',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, submit it!',
                cancelButtonText: 'No, stay'
              }).then((result) => {
                if (result.isConfirmed) {
                  Swal.fire({
                    title: 'Submitting...',
                    text: 'Please wait while we process your exam.',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => {
                      Swal.showLoading();
                    }
                  });
                  setTimeout(() => {
                    handleSubmit();
                    Swal.close();
                  }, 1500);
                }
              });
            }}
            className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-800"
          >
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
