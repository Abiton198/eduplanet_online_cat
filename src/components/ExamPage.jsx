import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { questions } from '../utils/Questions';
import { addDoc, collection } from 'firebase/firestore'; // ✅ Import Firestore functions
import { auth, db, signInAnonymously } from '../utils/firebase';


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
  const currentQuestions = selectedExam && questions[selectedExam.title] ? questions[selectedExam.title] : [];
  const [activeGrade, setActiveGrade] = useState(null);

  const endTime = new Date();
  const hours = endTime.getHours().toString().padStart(2, '0');
  const minutes = endTime.getMinutes().toString().padStart(2, '0');

  const gradeExams = {
    "Grade 12": [
      { id: 1, title: "Networks & Internet Technologies", password: "grade12pass" },
      { id: 2, title: "HTML & Web Design", password: "grade12pass2" },
      { id: 3, title: "HTML & Web Design 2", password: "grade12pass3" }, 
      { id: 4, title: "Spreadsheets & Word Processing", password: "grade12pass4" },
      { id: 5, title: "Spreadsheets", password: "grade12pass5" },
      { id: 6, title: "Word Processing & Databases", password: "grade12pass5" },
      { id: 7, title: "Information Management & PAT 1", password: "grade12pass5" },
      { id: 8, title: "Information Management & PAT 2", password: "grade12pass5" },
    ],
    "Grade 11": [
      { id: 1, title: "Databases - Grade 11", password: "grade11pass" },
      { id: 2, title: "SPREADSHEETS - Grade 11", password: "grade11pass1" },
      { id: 3, title: "NETWORKS - Grade 11", password: "grade11pass1" },
      { id: 4, title: "Internet & WWW - Grade 11", password: "grade11pass1" },
      {id: 5, title: "Social Implications", password: "grade11pass1" },
      { id: 6, title: "Information Management", password: "grade11pass1" },
      { id: 7, title: "Word Processing", password: "grade11pass1" },
      { id: 8, title: "Spreadsheets (Advanced Functions and Charts)", password: "grade11pass1" },
      { id: 9, title: "Database (Advanced Functions)", password: "grade11pass1" },
      { id: 10, title: "HTML & Web Design", password: "grade11pass1" },
      

      
    ],
    "Grade 10": [
      { id: 1, title: "NETWORK TECHNOLOGIES - Grade 10", password: "grade10pass" },
      { id: 2, title: "SOCIAL IMPLICATIONS & INFORMATION MANAGEMENT - Grade 10", password: "grade10pass1" },
      { id: 3, title: "Introduction to Networks - Grade 10", password: "grade10pass1" },
      { id: 4, title: "Solution Development - Spreadsheets", password: "grade10pass1" },
      { id: 5, title: "Advanced Spreadsheet Functions & Data Analysis", password: "grade10pass1" },
      { id: 6, title: "Information Management & Social Implications", password: "grade10pass1" },
      { id: 7, title: "Networks & Internet Technology", password: "grade10pass1" },
      { id: 8, title: "Word Processing & Social Implications", password: "grade10pass1" },
      { id: 9, title: "Spreadsheet Review & Consolidation", password: "grade10pass1" },
      { id: 10, title: "Consolidation & Control Test Preparation", password: "grade10pass1" },
    ]
  };

  const gradeGroups = {
    "Grade 10": gradeExams["Grade 10"],
    "Grade 11": gradeExams["Grade 11"],
    "Grade 12": gradeExams["Grade 12"],
  };

  useEffect(() => {
    // Automatically sign in anonymously when component loads
    signInAnonymously(auth)
      .then(() => {
        console.log('Signed in anonymously');
      })
      .catch((error) => {
        console.error('Anonymous sign-in error:', error);
      });
  }, []);

  useEffect(() => {
    if (!studentInfo) {
      navigate('/');
      return;
    }

    localStorage.setItem('studentName', studentInfo.name);
    localStorage.setItem('studentGrade', studentInfo.grade);
  }, [studentInfo, navigate]);

  useEffect(() => {
    localStorage.setItem('examStartTime', new Date().toISOString());
  }, []);

  useEffect(() => {
    if (studentInfo?.grade && gradeGroups[studentInfo.grade]) {
      setActiveGrade(studentInfo.grade);
    }
  }, [studentInfo]);
  useEffect(() => {
    console.log('Student Info:', studentInfo);
    console.log('Available Grade Groups:', Object.keys(gradeGroups));
  }, [studentInfo]);
    

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

  const unansweredQuestions = currentQuestions.filter(q => !answers[q.id]);
  const unansweredCount = unansweredQuestions.length;
  const totalQuestions = currentQuestions.length;

  let score = 0;
  currentQuestions.forEach((q) => {
    if (answers[q.id] === q.correctAnswer) score++;
  });

  const percentage = ((score / totalQuestions) * 100).toFixed(2);

  const newResult = {
    completedDate: endTime.toISOString().split('T')[0],
    completedTimeOnly: `${endTime.getHours()}:${endTime.getMinutes()}`,
    completedTime: endTime.toISOString(),
    name: studentName,
    grade: studentGrade,
    exam: examTitle,
    score: score,
    percentage: percentage,
    unanswered: unansweredCount,
    attempts: updatedAttempts,
    timeSpent: timeSpentFormatted,
    answers: currentQuestions.map(q => ({
      question: q.question,
      answer: answers[q.id],
      correctAnswer: q.correctAnswer
    }))
  };

  try {
    // 👇 Authenticate anonymously first
    const userCredential = await signInAnonymously(auth);
    console.log("Anonymous user ID:", userCredential.user.uid);

    // 👇 Now you're authenticated — save result
    await addDoc(collection(db, "examResults"), newResult);
    console.log("Result saved to Firebase.");
  } catch (error) {
    console.error("Error saving result to Firebase:", error);
  }

  localStorage.setItem('examResult', JSON.stringify(newResult));
  const allResults = JSON.parse(localStorage.getItem('allResults')) || [];
  allResults.push(newResult);
  localStorage.setItem('allResults', JSON.stringify(allResults));
  localStorage.setItem(attemptsKey, updatedAttempts.toString());
  localStorage.setItem(`${studentName}_${examTitle}_lastAttempt`, endTime.toISOString());

  addResult(newResult);
  navigate('/results');
};

  // ...rest of your code remains unchanged, including:
  // - handleSelectExam
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
  
    // RESTRICTING TIME FOR SECOND ATTEMPT
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
  
    // Continue to password prompt if passed time check
    Swal.fire({
      title: `Enter Password for ${exam.title}`,
      input: 'password',
      inputAttributes: {
        autocapitalize: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Enter',
      showLoaderOnConfirm: true,

      didOpen: () => {
        const confirmBtn = document.querySelector('.swal2-confirm');
        const cancelBtn = document.querySelector('.swal2-cancel');
    
        if (confirmBtn) {
          confirmBtn.style.backgroundColor = '#28a745'; // Green
          confirmBtn.style.color = 'white';
          confirmBtn.style.border = 'none';
        }
    
        if (cancelBtn) {
          cancelBtn.style.backgroundColor = '#dc3545'; // Red
          cancelBtn.style.color = 'white';
          cancelBtn.style.border = 'none';
        }
      },            
      preConfirm: (inputPassword) => {
        if (inputPassword === exam.password) {
          setSelectedExam(exam);
          setAuthenticated(true);
          localStorage.setItem('examTitle', exam.title);
  
          Swal.fire({
            icon: 'info',
            title: 'Attempt Allowed',
            text: `This is your attempt #${attempts + 1}. You have ${2 - attempts} more after this.`,
            confirmButtonColor: '#28a745' 
          });
  
          return true;
        } else {
          Swal.showValidationMessage('Incorrect password');
          return false;
        }
      }
    });
  };
  

  // - handleChange
  const handleChange = (id, answer) => {
    setAnswers(prev => ({ ...prev, [id]: answer }));
  };
  // - Timer & Anti-cheating useEffect
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
        if ((e.ctrlKey && ['r', 'R', 'c', 'C', 'v', 'V', 'x', 'X'].includes(e.key)) || e.key === 'F5') {
          e.preventDefault();
          alert("Action blocked during exam!");
        }
      };

      const handleRightClick = (e) => e.preventDefault();
      const disableSelection = (e) => e.preventDefault();
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
      };
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          alert('⚠️ You switched tabs or minimized. Please return to the exam.');
        }
      };

      document.addEventListener('contextmenu', handleRightClick);
      document.addEventListener('selectstart', disableSelection);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(timer);
        document.removeEventListener('contextmenu', handleRightClick);
        document.removeEventListener('selectstart', disableSelection);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [authenticated]);

  // -Handle submit before end of exam
  const handleSubmit = async () => {
    if (Object.keys(answers).length < currentQuestions.length) {
      alert("❗ You must answer all questions before submitting.");
      return;
    }
  
    setSubmitted(true);
    await handleSubmitExam(); // ✅ This is where handleSubmitExam gets called
  };
  

  return (
    // Your existing JSX stays as-is.    
    <div className="min-h-screen p-4 bg-gray-50">
      <h2 className="text-2xl font-bold mb-6">Welcome {studentInfo.name} from {studentInfo.grade}</h2>

{/* Exam cards per grade */}
      {!selectedExam && (
  <div className="max-w-4xl mx-auto">
    <h3 className="text-xl font-bold mb-4 text-gray-700">Select Your Grade:</h3>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {Object.keys(gradeGroups).map((grade) => (
        <div
          key={grade}
          onClick={() => setActiveGrade(activeGrade === grade ? null : grade)}
          className="bg-blue-100 hover:bg-blue-200 rounded-xl p-6 shadow-md cursor-pointer text-center transition-transform transform hover:scale-105"
        >
          <h4 className="text-lg font-bold text-blue-900">{grade}</h4>
        </div>
      ))}
    </div>

    {activeGrade && (
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">{activeGrade} Exams:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gradeGroups[activeGrade].map((exam) => (
            <div
              key={exam.id}
              className="bg-white border border-gray-200 rounded-md p-5 shadow-sm hover:shadow-lg transition cursor-pointer"
              onClick={() => handleSelectExam(exam)}
            >
              <h5 className="text-md font-semibold text-center">{exam.title}</h5>
              <p className="text-sm text-gray-500 text-center mt-2">Click to attempt</p>
            </div>
          ))}
        </div>
      </div>
    )}
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
              <div className="text-xl font-bold mb-4">
                Total Questions: {currentQuestions.length}
              </div>


              {currentQuestions.map((q, index) => (
  <div key={q.id} className="bg-white p-4 rounded-md shadow mb-4">
    <h3 className="text-lg font-semibold">
      Question {index + 1}: {q.question}
    </h3>
    <div className="space-y-2 mt-2">
      {q.options.map((opt, i) => (
        <label key={i} className="flex items-center space-x-2">
          <input
            type="radio"
            name={`question-${q.id}`}  // Important: unique group name per question
            value={opt}
            onChange={() => handleChange(q.id, opt)}
            required={index === 0} // optional: only require first question to prevent mass HTML5 alerts
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
                    didOpen: () => {
                      const confirmBtn = document.querySelector('.swal2-confirm');
                      const cancelBtn = document.querySelector('.swal2-cancel');
                  
                      if (confirmBtn) {
                        confirmBtn.style.backgroundColor = '#28a745'; // Green
                        confirmBtn.style.color = 'white';
                        confirmBtn.style.border = 'none';
                      }
                  
                      if (cancelBtn) {
                        cancelBtn.style.backgroundColor = '#dc3545'; // Red
                        cancelBtn.style.color = 'white';
                        cancelBtn.style.border = 'none';
                      }
                    },                                
                  }).then((result) => {
                    if (result.isConfirmed) {

                      Swal.fire({
                        title: 'Submitting...',
                        text: 'Please wait while we process your exam.',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: () => {
                          Swal.showLoading();
                          setTimeout(() => {
                            handleSubmit();

                            Swal.close();
                          }, 1500); // Simulate delay, then submit
                        }
                      });
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
