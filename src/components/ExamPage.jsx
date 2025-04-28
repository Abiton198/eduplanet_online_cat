import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {questions} from '../utils/Questions'; // You may later make different questions per exam

export default function ExamPage({ studentInfo, addResult }) {
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

// Later when you load or select exam:
// const questions = selectedExam ? questions[selectedExam] : [];
const currentQuestions = selectedExam ? questions[selectedExam.title] : [];



  const exams = [
    { id: 1, title: "Exam 1 - Grade 12", password: "grade12pass" },
    { id: 2, title: "Exam 2 - Grade 11", password: "grade11pass" },
    { id: 3, title: "Exam 3 - Grade 10", password: "grade10pass" },
    // Add more exams here
  ];

  useEffect(() => {
    if (!studentInfo) {
      navigate('/');
      return;
    }
  }, [studentInfo, navigate]);

  useEffect(() => {
    if (authenticated) {
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
    }
  }, [authenticated]);

  const handleSelectExam = (exam) => {
    Swal.fire({
      title: `Enter Password for ${exam.title}`,
      input: 'password',
      inputAttributes: {
        autocapitalize: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Enter',
      showLoaderOnConfirm: true,
      preConfirm: (inputPassword) => {
        if (inputPassword === exam.password) {
          setSelectedExam(exam);
          setAuthenticated(true);
          return true;
        } else {
          Swal.showValidationMessage('Incorrect password');
          return false;
        }
      }
    });
  };

  const handleChange = (id, answer) => {
    setAnswers(prev => ({ ...prev, [String(id)]: answer }));
  };

  const handleSubmit = () => {
    let score = 0;
    let unanswered = 0;
    const detailedAnswers = [];

    currentQuestions.forEach((q) => {
      const selected = answers[String(q.id)];
      const isCorrect = selected === q.correctAnswer;
      if (selected === undefined) {
        unanswered++;
      } else if (isCorrect) {
        score++;
      }
      detailedAnswers.push({
        question: q.question,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect: isCorrect,
      });
    });

    const percentage = ((score / currentQuestions.length) * 100).toFixed(2);

    const result = {
      name: studentInfo.name,
      exam: selectedExam.title,
      score: `${score} / ${currentQuestions.length}`,
      percentage: percentage,
      unanswered: unanswered,
      time: new Date().toLocaleString(),
    };

    localStorage.setItem('examResult', JSON.stringify(result));
    localStorage.setItem('examAnswers', JSON.stringify(detailedAnswers));

    const allResults = JSON.parse(localStorage.getItem('allResults')) || [];
    allResults.push(result);
    localStorage.setItem('allResults', JSON.stringify(allResults));

    addResult(result);
    navigate('/results');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <h2 className="text-2xl font-bold mb-6">Welcome {studentInfo.name} from {studentInfo.grade}</h2>

      {!selectedExam && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white shadow-md rounded-md p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => handleSelectExam(exam)}
            >
              <h3 className="text-xl font-semibold text-center">{exam.title}</h3>
              <p className="text-center mt-2 text-gray-600">Click to Attempt</p>
            </div>
          ))}
        </div>
      )}

      {authenticated && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-center text-blue-700 mb-4">{selectedExam.title}</h2>
          <div className="text-center text-2xl mb-6 font-mono text-red-600">
            Time Left: {formatTime(timeLeft)}
          </div>
          {!submitted ? (
            <form className="space-y-6">
              {currentQuestions.map((q) => (
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
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes, submit it!',
                    cancelButtonText: 'No, stay',
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
      )}
    </div>
  );
}
