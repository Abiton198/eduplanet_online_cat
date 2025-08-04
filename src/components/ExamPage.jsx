import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { questions } from '../utils/Questions';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db, signInAnonymously } from '../utils/firebase';
import ExamResultsCard from '../utils/ExamResultCard';
import { termExams } from '../data/termExams';

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function ExamPage({ studentInfo, addResult }) {
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1500); // 25 mins
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [expandedTerm, setExpandedTerm] = useState(null);
  const formRef = useRef(null);

  // Get current questions
  const currentQuestions =
    selectedExam && questions[selectedExam.title]
      ? questions[selectedExam.title]
      : [];

  // Anonymous login for Firebase
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error('Firebase Error:', err));
  }, []);

  // Redirect if no student info
  useEffect(() => {
    if (!studentInfo) {
      navigate('/');
      return;
    }
    localStorage.setItem('studentName', studentInfo.name);
    localStorage.setItem('studentGrade', studentInfo.grade);
    localStorage.setItem('examStartTime', new Date().toISOString());
  }, [studentInfo, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!authenticated || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        if (prev === 300) Swal.fire('⚠️ 5 minutes left!', '', 'info');
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [authenticated, submitted]);

  // Exam selection with password and attempt limits
  const handleSelectExam = (exam) => {
    const studentName = localStorage.getItem('studentName') || 'Unknown';
    const attemptsKey = `${studentName}_${exam.title}_attempts`;
    const lastAttemptKey = `${studentName}_${exam.title}_lastAttempt`;

    const attempts = parseInt(localStorage.getItem(attemptsKey)) || 0;
    const lastAttemptTime = localStorage.getItem(lastAttemptKey);
    const now = new Date();

    if (attempts >= 3) {
      Swal.fire('Maximum Attempts Reached', '', 'error');
      return;
    }

    if (lastAttemptTime) {
      const lastAttemptDate = new Date(lastAttemptTime);
      const hoursSinceLastAttempt = (now - lastAttemptDate) / (1000 * 60 * 60);
      if (hoursSinceLastAttempt < 48) {
        Swal.fire('Too Soon', 'Wait 48hrs after attempt before trying again.', 'warning');
        return;
      }
    }

    Swal.fire({
      title: `Enter Password for ${exam.title}`,
      input: 'password',
      showCancelButton: true,
      confirmButtonText: 'Enter',
      preConfirm: (inputPassword) => {
        if (inputPassword === exam.password) {
          setSelectedExam(exam);
          setAuthenticated(true);
          localStorage.setItem('examTitle', exam.title);
          return true;
        } else {
          Swal.showValidationMessage('Incorrect password');
          return false;
        }
      },
    });
  };

  // Track answers
  const handleChange = (id, answer) => {
    setAnswers(prev => ({ ...prev, [id]: answer }));
  };

  // Submit exam
  const handleSubmitExam = async () => {
    if (submitted) return;
    setSubmitted(true);
  
    const endTime = new Date();
    const startTime = new Date(localStorage.getItem('examStartTime'));
    const timeSpentS = Math.round((endTime - startTime) / 1000);
    const timeSpent = `${Math.floor(timeSpentS / 60)}m ${timeSpentS % 60}s`;
  
    const studentName = studentInfo.name;
    const studentGrade = studentInfo.grade;
    const examTitle = selectedExam.title;
  
    const attemptsKey = `${studentName}_${examTitle}_attempts`;
    const prevAtt = parseInt(localStorage.getItem(attemptsKey)) || 0;
    localStorage.setItem(attemptsKey, prevAtt + 1);
    localStorage.setItem(`${studentName}_${examTitle}_lastAttempt`, new Date().toISOString());
  
    // ✅ Calculate score
    let score = 0;
    const answersArray = currentQuestions.map(q => {
      const studentAnswer = answers[q.id] || "";
      if (studentAnswer === q.correctAnswer) score++;
      return {
        question: q.question,
        answer: studentAnswer,
        correctAnswer: q.correctAnswer,
      };
    });
  
    const percentage = ((score / currentQuestions.length) * 100).toFixed(2);
    const unanswered = currentQuestions.filter(q => !answers[q.id]).length;
  
    // ✅ Save full result with answers array
    const result = {
      name: studentName,
      grade: studentGrade,
      exam: examTitle,
      score,
      percentage,
      unanswered,
      timeSpent,
      completedDate: endTime.toISOString().split('T')[0],
      completedTimeOnly: `${endTime.getHours()}:${endTime.getMinutes()}`,
      completedTime: endTime.toISOString(),
      attempts: prevAtt + 1,
      answers: answersArray,  // 🔥 Save all questions and answers
    };
  
    try {
      await addDoc(collection(db, 'examResults'), result);
      console.log("✅ Exam saved with answers:", result);
    } catch (err) {
      console.error('❌ Error saving result:', err);
    }
  
    addResult(result);
    Swal.fire('Submitted!', `You scored ${score}`, 'success').then(() => {
      navigate('/results');
    });
  };
  

  // Grade selection
  const cleanedGrade = studentInfo.grade.trim().toLowerCase();
  let gradeKey = null;
  if (cleanedGrade.includes('grade 12') || cleanedGrade.startsWith('12')) {
    gradeKey = 'Grade 12';
  } else if (cleanedGrade.includes('grade 11') || cleanedGrade.startsWith('11')) {
    gradeKey = 'Grade 11';
  } else if (cleanedGrade.includes('grade 10') || cleanedGrade.startsWith('10')) {
    gradeKey = 'Grade 10';
  }
  const gradeData = gradeKey ? termExams[gradeKey] : {};

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <h2 className="text-2xl font-bold mb-6">
        Welcome {studentInfo.name} ({studentInfo.grade})
      </h2>

  
      {!selectedExam && (
        <>
          <ExamResultsCard studentName={studentInfo.name} />
          <h3 className="text-xl mb-4">Select a Term</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.keys(gradeData).map(term => (
              <div
                key={term}
                onClick={() => setExpandedTerm(x => (x === term ? null : term))}
                className="p-4 bg-blue-100 rounded shadow cursor-pointer"
              >
                <h4>{term}</h4>
              </div>
            ))}
          </div>

          {expandedTerm && (
            <div className="mt-4 bg-white p-4 rounded shadow">
              {gradeData[expandedTerm].map(ex => (
                <div
                  key={ex.id}
                  onClick={() => handleSelectExam(ex)}
                  className="border p-3 rounded mb-2 cursor-pointer hover:bg-gray-50"
                >
                  {ex.title}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {authenticated && selectedExam && (
        <div className="mt-6" ref={formRef}>
          <h3 className="text-xl mb-2">{selectedExam.title}</h3>
           {/* Floating Timer */}
              <div style={{
                position: 'fixed',
                top: '40px',
                right: '20px',
                zIndex: 9999,
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                padding: '15px 25px',
                borderRadius: '12px',
                fontSize: '2rem',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(0,0,0,0.5)',
              }}>
                ⏱ {formatTime(timeLeft)}
              </div>

          {submitted ? (
            <p className="text-center">Submitting your answers…</p>
          ) : (
            <form>
              {currentQuestions.map((q, idx) => (
                <div key={q.id} className="p-4 mb-4 border rounded bg-white">
                  <h4>Q{idx + 1}: {q.question}</h4>
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, i) => (
                      <label key={i} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => handleChange(q.id, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  Swal.fire({
                    title: 'Submit now?',
                    showCancelButton: true,
                    confirmButtonText: 'Yes',
                  }).then(r => r.isConfirmed && handleSubmitExam())
                }
                className="w-full py-2 bg-green-600 text-white rounded"
              >
                Submit Exam
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
