// src/pages/ExamPage.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../utils/firebase";
import { signOut } from "firebase/auth";
// import ExamResultsCard from "../utils/ExamResultCard";
import ExamResultsDisplay from "./ExamResultsDisplay";
import { termExams } from "../data/termExams";
import { questions } from "../utils/Questions";
import { ensureStudentProfile } from "../utils/pointsSystem/ensureStudentProfile";
import { awardPointsFromExamHistory } from "../utils/pointsSystem/awardPointsFromExamHistory";
import FloatingStudyHub from "../utils/FloatingStudyHub";
import { Sun, Moon, LogOut, Clock, BookOpen, MessageSquare, Sparkles, X } from "lucide-react";
import CATTutor from '../utils/CATTutor';
import AIExamMocker from '../utils/AIExamMocker';
import { tr } from "framer-motion/client";


// SweetAlert2 with consistent styling
const swal = Swal.mixin({
  confirmButtonColor: "#10b981", // emerald-500
  cancelButtonColor: "#ef4444",  // red-500
});

// Format seconds → MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function ExamPage({ studentInfo, addResult, setStudentInfo ,isDark}) {
  const navigate = useNavigate();

  // Exam State
  const [selectedExam, setSelectedExam] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [expandedTerm, setExpandedTerm] = useState(null);

  // Firebase & User
  const [user, setUser] = useState(null);
  const [didAward, setDidAward] = useState(false);

  // UI & Anti-Cheat
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [unansweredIds, setUnansweredIds] = useState(new Set());
  const [focusStrikes, setFocusStrikes] = useState(0);
  const [disqualified, setDisqualified] = useState(false);

  const questionRefs = useRef({});
  const isSubmittingRef = useRef(false);
  const lastFocusEventTsRef = useRef(0);
  const formRef = useRef(null);
    const [showTutor, setShowTutor] = useState(false);

  const examActive = authenticated && selectedExam && !submitted;
  // const isDark = document.documentElement.classList.contains("dark");

  // ──────────────────────────────────────────────
  // Theme Toggle & Logout
  // ──────────────────────────────────────────────
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("educat-theme", isDark ? "light" : "dark");
  };

   const handleTutorAccess = () => {
    const isDark = document.documentElement.classList.contains('dark');
    Swal.fire({
      title: "Access AI Tutor?",
      text: "Get personalized help and exam mockers! This will not affect your current exam session.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Show Me!",
      cancelButtonText: "No, Maybe Later",
      confirmButtonColor: "#ef4444", // Red
      cancelButtonColor: "#22c55e",  // Green
      background: isDark ? '#111827' : '#fff', // Use the local 'isDark' variable
      color: isDark ? '#fff' : '#000',
    }).then((result) => {
      if (result.isConfirmed) {
        setShowTutor(true);
      }
    });
  };
  
  const handleLogout = () => {
    const isDark = document.documentElement.classList.contains('dark');
  // Detect dark mode from the document root

  Swal.fire({
    title: "Logout?",
    text: "You will be signed out of your session.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Logout",
    cancelButtonText: "Stay",
    confirmButtonColor: "#ef4444", // Red
    cancelButtonColor: "#22c55e",  // Green
    background: isDark ? '#111827' : '#fff', // Use the local 'isDark' variable
    color: isDark ? '#fff' : '#000',
  }).then((result) => {
    if (result.isConfirmed) {
      signOut(auth);
      setStudentInfo(null);
      localStorage.clear();
      navigate("/");
    }
  });
};


  // ──────────────────────────────────────────────
  // Firebase Auth + Profile Setup
  // ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u && studentInfo) {
        await ensureStudentProfile({
          uid: u.uid,
          name: studentInfo.name,
          grade: studentInfo.grade,
        });
        if (!didAward) {
          await awardPointsFromExamHistory(u.uid, studentInfo.name);
          setDidAward(true);
        }
      }
    });
    return () => unsub();
  }, [studentInfo, didAward]);

  // Redirect if no student info
  useEffect(() => {
    if (!studentInfo) navigate("/");
  }, [studentInfo, navigate]);

  // ──────────────────────────────────────────────
  // Exam Timer (25 minutes)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!examActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          actuallySubmitExam(false); // Auto-submit on time end
          return 0;
        }
        if (prev === 300) {
          swal.fire("5 Minutes Left!", "Finish strong!", "warning");
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examActive]);

  // ──────────────────────────────────────────────
  // Exam Selection with Password + Attempt Limit
  // ──────────────────────────────────────────────
  const handleSelectExam = (exam) => {
  // 1. Check for max attempts
  const attemptsKey = `${studentInfo.name}_${exam.title}_attempts`;
  const attempts = parseInt(localStorage.getItem(attemptsKey) || "0", 10);

  if (attempts >= 3) {
    swal.fire({
      title: "Max Attempts Reached",
      text: "You've used all 3 available attempts for this revision test.",
      icon: "error",
      buttonsStyling: true,
      showCancelButton: true,
      confirmButtonText: "OK",
      confirmButtonColor: "#ef4444", // Red to match the error
      background: isDark ? '#111827' : '#fff',
      color: isDark ? '#fff' : '#000',
    });
    return;
  }

  // 2. Direct Start (No Password Required)
  Swal.fire({
    title: `Start ${exam.title}?`,
    text: `Ready to begin? This is a 15-minute timed session.`,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "Begin Now",
    cancelButtonText: "Not Yet",
    
    // 1. MUST BE TRUE for confirmButtonColor to work
    buttonsStyling: true, 
    
    // 2. Explicit Hex Colors
    confirmButtonColor: "#22c55e", // Bright Green
    cancelButtonColor: "#ef4444",  // Bright Red
    
    // 3. Force Visibility with Custom Classes
    customClass: {
      confirmButton: 'swal-force-show !bg-green-500 !text-white !opacity-100 !visible px-8 py-3 rounded-xl font-bold shadow-lg',
      cancelButton: 'swal-force-show !bg-red-500 !text-white !opacity-100 !visible px-8 py-3 rounded-xl font-bold shadow-lg',
      actions: 'flex gap-4 items-center justify-center mt-6'
    },
    
    background: isDark ? '#111827' : '#ffffff',
    color: isDark ? '#ffffff' : '#111827',
  }).then((result) => {
    if (result.isConfirmed) {
      // Set all necessary states to launch the exam
      setSelectedExam(exam);
      setAuthenticated(true); // Still set to true so UI knows exam is active
      setTimeLeft(15 * 60);
      setAnswers({});
      setSubmitted(false);
      setFocusStrikes(0);
      setDisqualified(false);
      
      // Store start time for proctoring/persistence
      localStorage.setItem("examStartTime", new Date().toISOString());
    }
  });
};

  // ──────────────────────────────────────────────
  // Answer Handling
  // ──────────────────────────────────────────────
  const handleChange = (id, answer) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }));
    if (unansweredIds.has(id)) {
      const newSet = new Set(unansweredIds);
      newSet.delete(id);
      setUnansweredIds(newSet);
    }
  };
  
 

  // ──────────────────────────────────────────────
  // Anti-Cheat: Block Copy/Paste, Tab Switch, etc.
  // ──────────────────────────────────────────────
  const preventCheat = useCallback((e) => e.preventDefault(), []);

  const handleFocusViolation = useCallback(() => {
    if (!examActive) return;
    const now = Date.now();
    if (now - lastFocusEventTsRef.current < 1500) return;
    lastFocusEventTsRef.current = now;

    setFocusStrikes((s) => {
      const next = s + 1;
      if (next === 1) {
        swal.fire("Warning", "Tab/window switch detected. One more = ZERO.", "warning");
      } else if (next >= 2) {
        setDisqualified(true);
        actuallySubmitExam(true);
      }
      return next;
    });
  }, [examActive]);

  useEffect(() => {
    if (!examActive) return;

    const events = [
      "contextmenu", "copy", "cut", "paste", "selectstart",
    ];
    events.forEach((ev) => document.addEventListener(ev, preventCheat));

    document.addEventListener("visibilitychange", handleFocusViolation);
    window.addEventListener("blur", handleFocusViolation);

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, preventCheat));
      document.removeEventListener("visibilitychange", handleFocusViolation);
      window.removeEventListener("blur", handleFocusViolation);
    };
  }, [examActive, preventCheat, handleFocusViolation]);

  // ──────────────────────────────────────────────
  // Submit Exam (Core Logic)
  // ──────────────────────────────────────────────
  const handleSubmitExam = () => {
    const qs = questions[selectedExam.title] || [];
    const missing = qs.filter((q) => !answers[q.id]);

    if (missing.length > 0) {
      setTriedSubmit(true);
      setUnansweredIds(new Set(missing.map((q) => q.id)));

      swal
        .fire({
          icon: "warning",
          title: "Unanswered Questions",
          text: `You have ${missing.length} unanswered question(s). Review?`,
          showCancelButton: true,
          confirmButtonText: "Review",
          cancelButtonText: "Submit Anyway",
        })
        .then((res) => {
          if (res.isConfirmed && missing[0]) {
            questionRefs.current[missing[0].id]?.scrollIntoView({ behavior: "smooth" });
          } else if (res.dismiss === Swal.DismissReason.cancel) {
            actuallySubmitExam(false);
          }
        });
      return;
    }
    actuallySubmitExam(false);
  };

  const actuallySubmitExam = async (forceZero = false) => {
    if (isSubmittingRef.current || submitted) return;
    isSubmittingRef.current = true;
    setSubmitted(true);

    const qs = questions[selectedExam.title] || [];
    let score = 0;
    const answersArray = qs.map((q) => {
      const ans = answers[q.id] || "";
      if (!forceZero && ans === q.correctAnswer) score++;
      return { question: q.question, answer: ans, correctAnswer: q.correctAnswer };
    });

    const result = {
      studentId: user?.uid,
      name: studentInfo.name,
      grade: studentInfo.grade,
      exam: selectedExam.title,
      score: forceZero ? 0 : score,
      total: qs.length,
      percentage: qs.length ? ((score / qs.length) * 100).toFixed(1) : 0,
      timeSpent: formatTime(25 * 60 - timeLeft),
      completedTime: new Date().toISOString(),
      disqualified: forceZero,
      focusStrikes,
      answers: answersArray,
    };

    try {
      await addDoc(collection(db, "examResults"), result);
      addResult?.(result);

      // Update attempt count
      const key = `${studentInfo.name}_${selectedExam.title}_attempts`;
      localStorage.setItem(key, String((parseInt(localStorage.getItem(key) || "0") + 1)));
    } catch (err) {
      console.error("Save failed:", err);
    }

    swal
      .fire({
        icon: forceZero ? "error" : "success",
        title: forceZero ? "Disqualified" : "Exam Submitted!",
        text: forceZero ? "Cheating detected." : `Score: ${score}/${qs.length}`,
      })
      .then(() => navigate("/results"));
  };

  // Grade detection
  const cleanedGrade = (studentInfo?.grade || "").toLowerCase();
  const gradeKey =
    cleanedGrade.includes("12") ? "Grade 12" :
    cleanedGrade.includes("11") ? "Grade 11" :
    cleanedGrade.includes("10") ? "Grade 10" : null;
  const gradeData = gradeKey ? termExams[gradeKey] : {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
      {/* Top Navigation Bar */}
            <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              
              {/* LEFT SECTION: Profile Info (Width: 1/3) */}
              <div className="flex items-center gap-4 w-1/3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
                  {studentInfo?.name?.[0]?.toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <h1 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
                    Hi, {studentInfo?.name}
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Grade {studentInfo?.grade}
                  </p>
                </div>
              </div>

              {/* CENTER SECTION: AI Tutor Button (Width: 1/3) */}
              <div className="flex justify-center w-1/3">
                <button
                  onClick={handleTutorAccess}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm font-bold border border-indigo-200 dark:border-indigo-800/50"
                >
                  <Sparkles size={20} className="animate-pulse" />
                  <span className="text-sm tracking-wide">AI Tutor</span>
                </button>
              </div>

              {/* RIGHT SECTION: Controls (Width: 1/3) */}
              <div className="flex items-center justify-end gap-3 w-1/3">
                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:scale-110 transition-transform duration-200"
                >
                  {isDark ? <Sun className="text-yellow-400" size={20} /> : <Moon className="text-indigo-600" size={20} />}
                </button>

                {studentInfo && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-600 text-red-600 hover:text-white transition-all duration-300 font-bold border border-red-100 dark:border-red-900/30"
                  >
                    <LogOut size={18} />
                    <span className="hidden lg:inline text-sm">Logout</span>
                  </button>
                )}
              </div>

            </div>
          </header>



 {/* AI TUTOR OVERLAY */}
    {showTutor && (
  <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex flex-col animate-in fade-in zoom-in duration-200">
    {/* Header Section */}
    <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
          <Sparkles className="text-indigo-600 dark:text-indigo-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold dark:text-white leading-none">AI Learning Hub</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-bold">Tutor & Exam Mocker</p>
        </div>
      </div>
      <button 
        onClick={() => setShowTutor(false)} 
        className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors"
      >
        <X size={32} />
      </button>
    </div>

    {/* Responsive Side-by-Side Grid */}
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        
        {/* Left Column: AI Tutor */}
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b dark:border-gray-800 bg-indigo-50/30 dark:bg-indigo-900/10 flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-500" />
            <span className="font-bold text-sm uppercase">Interactive AI Tutor</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <CATTutor />
          </div>
        </div>

        {/* Right Column: Exam Mocker */}
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b dark:border-gray-800 bg-purple-50/30 dark:bg-purple-900/10 flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" />
            <span className="font-bold text-sm uppercase">AI Exam Study Mocker</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <AIExamMocker />
          </div>
        </div>

      </div>
    </div>
  </div>
)}





      {/* Dashboard (When No Exam Active) */}
      {!examActive && (
        <div className=" px-6 max-w-7xl mx-auto">         

          {/* Study Hub - Fully Working! */}
<FloatingStudyHub 
  grade={studentInfo?.grade} 
  currentStudentId={user?.uid} 
  selectedExam={selectedExam}  
/>

          {/* Results Cards */}
         <div className="w-full my-12">
    <ExamResultsDisplay />
</div>


          {/* Term Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-10">
            <h2 className="text-3xl font-bold text-center mb-10 text-gray-800 dark:text-white">Choose Exam Term</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Object.keys(gradeData).map((term) => (
                <button
                  key={term}
                  onClick={() => setExpandedTerm(expandedTerm === term ? null : term)}
                  className="group p-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl hover:scale-105 transition-all shadow-xl"
                >
                  <BookOpen size={48} className="mx-auto mb-4" />
                  <span className="text-xl font-bold">{term}</span>
                </button>
              ))}
            </div>

            {/* Exam List */}
            {expandedTerm && (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gradeData[expandedTerm].map((exam) => (
                  <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{exam.title}</h3>
                    <button
                      onClick={() => handleSelectExam(exam)}
                      className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-2xl hover:scale-105 transition shadow-lg"
                    >
                      Start Exam
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Exam Mode */}
      {examActive && (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white overflow-y-auto">
          {/* Floating Timer */}
          <div className="fixed top-8 right-8 z-50 bg-black/60 backdrop-blur-xl rounded-3xl px-10 py-6 shadow-2xl border border-white/20">
            <div className="flex items-center gap-5">
              <Clock size={48} />
              <div>
                <p className="text-lg opacity-90">Time Remaining</p>
                <p className="text-5xl font-bold">{formatTime(timeLeft)}</p>
              </div>
            </div>
            <div className="mt-4 h-4 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-1000"
                style={{ width: `${(timeLeft / (15 * 60)) * 100}%` }}
              />
            </div>
          </div>

          <div className="max-w-4xl mx-auto pt-32 pb-20 px-6">
            <h1 className="text-5xl font-extrabold text-center mb-12">{selectedExam.title}</h1>

            <form className="space-y-10">
              {(questions[selectedExam.title] || []).map((q, idx) => {
                const selected = answers[q.id];
                const isUnanswered = triedSubmit && !selected;

                return (
                  <section
                    key={q.id}
                    ref={(el) => (questionRefs.current[q.id] = el)}
                    className={`rounded-3xl overflow-hidden shadow-2xl transition-all ${
                      isUnanswered ? "ring-4 ring-red-500" : ""
                    }`}
                  >
                    <header className="bg-white/10 backdrop-blur-md p-6 border-b border-white/20">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                          {idx + 1}
                        </div>
                        <h3 className="text-xl font-semibold leading-relaxed">{q.question}</h3>
                      </div>
                    </header>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {q.options.map((opt) => {
                        const isChecked = selected === opt;
                        return (
                          <label
                            key={opt}
                            className={`block cursor-pointer rounded-2xl border-2 p-6 transition-all ${
                              isChecked
                                ? "border-white bg-white/20 shadow-xl"
                                : "border-white/30 hover:border-white/60 hover:bg-white/10"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={opt}
                              checked={isChecked}
                              onChange={() => handleChange(q.id, opt)}
                              className="sr-only"
                            />
                            <span className="text-lg">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {/* Submit Button */}
              <div className="text-center pt-10">
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="px-16 py-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-2xl font-bold rounded-3xl hover:scale-105 transition shadow-2xl"
                >
                  Submit Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}