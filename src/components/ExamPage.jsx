  import React, { useEffect, useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import Swal from 'sweetalert2';
  import { questions } from '../utils/Questions';
  import { addDoc, collection } from 'firebase/firestore';
  import { auth, db, signInAnonymously } from '../utils/firebase';
  import ExamResultsCard from '../utils/ExamResultCard';
  import {termExams}  from '../data/termExams';
  
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  
  export default function ExamPage({ studentInfo, addResult }) {
    const navigate = useNavigate();
    const [selectedExam, setSelectedExam] = useState(null);
    const [authenticated, setAuthenticated] = useState(false);
    const [timeLeft, setTimeLeft] = useState(1500);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [expandedTerm, setExpandedTerm] = useState(null);
  
    const currentQuestions =
      selectedExam && questions[selectedExam.title]
        ? questions[selectedExam.title]
        : [];
  
    useEffect(() => {
      signInAnonymously(auth)
        .then(() => console.log('Signed in anonymously'))
        .catch((error) => console.error('Anonymous sign-in error:', error));
    }, []);
  
    useEffect(() => {
      if (!studentInfo) {
        navigate('/');
        return;
      }
  
      localStorage.setItem('studentName', studentInfo.name);
      localStorage.setItem('studentGrade', studentInfo.grade);
      localStorage.setItem('examStartTime', new Date().toISOString());
    }, [studentInfo, navigate]);
  
    const handleSelectExam = (exam) => {
      const studentName = localStorage.getItem('studentName') || 'Unknown';
      const attemptsKey = `${studentName}_${exam.title}_attempts`;
      const lastAttemptKey = `${studentName}_${exam.title}_lastAttempt`;
  
      const attempts = parseInt(localStorage.getItem(attemptsKey)) || 0;
      const lastAttemptTime = localStorage.getItem(lastAttemptKey);
      const now = new Date();
  
      if (attempts >= 3) {
        Swal.fire({
          icon: 'error',
          title: 'Maximum Attempts Reached',
          text: `You have already attempted this exam 3 times.`,
        });
        return;
      }
  
      if (lastAttemptTime) {
        const lastAttemptDate = new Date(lastAttemptTime);
        const hoursSinceLastAttempt = (now - lastAttemptDate) / (1000 * 60 * 60);
        if (hoursSinceLastAttempt < 48) {
          const hoursLeft = Math.ceil(48 - hoursSinceLastAttempt);
          Swal.fire({
            icon: 'warning',
            title: 'Too Soon to Retry',
            text: `Please wait ${hoursLeft} more hour(s) before attempting this exam again.`,
          });
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
            Swal.fire({
              icon: 'info',
              title: 'Attempt Allowed',
              text: `This is your attempt #${attempts + 1}.`,
              confirmButtonColor: '#28a745',
            });
            return true;
          } else {
            Swal.showValidationMessage('Incorrect password');
            return false;
          }
        },
      });
    };
  
    const handleChange = (id, answer) => {
      setAnswers(prev => ({ ...prev, [id]: answer }));
    };
  
    useEffect(() => {
      if (authenticated) {
        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              handleSubmitExam();
              return 0;
            }
            if (prev === 300) {
              alert("⚠️ 5 minutes left! Please finish up!");
            }
            return prev - 1;
          });
        }, 1000);
  
        return () => clearInterval(timer);
      }
    }, [authenticated]);
  
    const handleSubmitExam = async () => {
      const endTime = new Date();
      const startTime = new Date(localStorage.getItem('examStartTime') || new Date());
      const timeSpentInSeconds = Math.round((endTime - startTime) / 1000);
      const timeSpentFormatted = `${Math.floor(timeSpentInSeconds / 60)}m ${timeSpentInSeconds % 60}s`;
  
      const studentName = localStorage.getItem('studentName') || 'Unknown';
      const studentGrade = localStorage.getItem('studentGrade') || 'N/A';
      const examTitle = localStorage.getItem('examTitle') || 'Unnamed Exam';
      const attemptsKey = `${studentName}_${examTitle}_attempts`;
  
      const previousAttempts = parseInt(localStorage.getItem(attemptsKey)) || 0;
      const updatedAttempts = previousAttempts + 1;
  
      const unansweredCount = currentQuestions.filter(q => !answers[q.id]).length;
      const score = currentQuestions.reduce(
        (acc, q) => acc + (answers[q.id] === q.correctAnswer ? 1 : 0),
        0
      );
      const percentage = ((score / currentQuestions.length) * 100).toFixed(2);
  
      const newResult = {
        completedDate: endTime.toISOString().split('T')[0],
        completedTimeOnly: `${endTime.getHours()}:${endTime.getMinutes()}`,
        completedTime: endTime.toISOString(),
        name: studentName,
        grade: studentGrade,
        exam: examTitle,
        score,
        percentage,
        unanswered: unansweredCount,
        attempts: updatedAttempts,
        timeSpent: timeSpentFormatted,
        answers: currentQuestions.map(q => ({
          question: q.question,
          answer: answers[q.id],
          correctAnswer: q.correctAnswer,
        })),
      };
  
      try {
        await signInAnonymously(auth);
        await addDoc(collection(db, "examResults"), newResult);
        console.log("Result saved to Firebase.");
      } catch (error) {
        console.error("Error saving result to Firebase:", error);
      }
  
      addResult(newResult);
      navigate('/results');
    };
  
   
    // selection of grades
    const cleanedGrade = studentInfo.grade.trim().toLowerCase();
let gradeKey = null;
if (cleanedGrade.includes('grade 12') || cleanedGrade.startsWith('12')) {
  gradeKey = "Grade 12";
} else if (cleanedGrade.includes('grade 11') || cleanedGrade.startsWith('11')) {
  gradeKey = "Grade 11";
} else if (cleanedGrade.includes('grade 10') || cleanedGrade.startsWith('10')) {
  gradeKey = "Grade 10";
}

const gradeData = gradeKey ? termExams[gradeKey] : null;

  
    return (
      <div className="min-h-screen p-4 bg-gray-50">
        <h2 className="text-2xl font-bold mb-6">Welcome {studentInfo.name} from {studentInfo.grade}</h2>
  
        {studentInfo?.name && <ExamResultsCard studentName={studentInfo.name} />}
  
        {!selectedExam && (
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-700">Select a Term:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {gradeData &&
                Object.keys(gradeData).map((term) => (
                  <div
                    key={term}
                    onClick={() => setExpandedTerm(expandedTerm === term ? null : term)}
                    className="bg-blue-100 hover:bg-blue-200 rounded-xl p-4 shadow cursor-pointer text-center transition"
                  >
                    <h4 className="text-lg font-semibold">{term}</h4>
                  </div>
                ))}
            </div>
  
            {expandedTerm && (
              <div className="mt-6 bg-white rounded shadow p-4">
                <h4 className="text-lg font-bold mb-2">{expandedTerm} Exams</h4>
                {gradeData[expandedTerm] && gradeData[expandedTerm].length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gradeData[expandedTerm].map((exam) => (
                      <div
                        key={exam.id}
                        className="border p-4 rounded shadow hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectExam(exam)}
                      >
                        <h5 className="text-md font-semibold text-center">{exam.title}</h5>
                        <p className="text-sm text-gray-500 text-center">Click to attempt</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No exams for this term.</p>
                )}
              </div>
            )}
          </div>
        )}
  
        {authenticated && selectedExam && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-center text-blue-700 mb-4">{selectedExam.title}</h2>
            <div className="text-center text-2xl mb-6 font-mono text-red-600">
              Time Left: {formatTime(timeLeft)}
            </div>
            {!submitted ? (
              <form className="space-y-6">
                <div className="text-xl font-bold mb-4">
                  Total Questions: {currentQuestions.length}
                </div>
  
                {currentQuestions.map((q, index) => (
                  <div key={q.id} className="bg-white p-4 rounded-md shadow mb-4">
                    <h3 className="text-lg font-semibold">Question {index + 1}: {q.question}</h3>
                    <div className="space-y-2 mt-2">
                      {q.options.map((opt, i) => (
                        <label key={i} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`question-${q.id}`}
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
                      confirmButtonText: 'Yes, submit it!',
                      cancelButtonText: 'No, stay',
                    }).then((result) => {
                      if (result.isConfirmed) {
                        handleSubmitExam();
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
  