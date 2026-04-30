import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../utils/firebase";
import { signOut } from "firebase/auth";
import ExamResultsDisplay from "./ExamResultsDisplay";
import { termExams } from "../data/termExams";
import { questions } from "../utils/Questions";
import { ensureStudentProfile } from "../utils/pointsSystem/ensureStudentProfile";
import { awardPointsFromExamHistory } from "../utils/pointsSystem/awardPointsFromExamHistory";
import FloatingStudyHub from "../utils/FloatingStudyHub";
import { Sun, Moon, LogOut, Clock, BookOpen, MessageSquare, Sparkles, X } from "lucide-react";
import CATTutor from '../utils/CATTutor';
import AIExamMocker from '../utils/AIExamMocker';

// SweetAlert2 Configuration
const swal = Swal.mixin({
  confirmButtonColor: "#10b981",
  cancelButtonColor: "#ef4444",
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function ExamPage({ studentInfo, addResult, setStudentInfo, isDark, toggleTheme }) {
  const navigate = useNavigate();

  // Exam Logic State
  const [selectedExam, setSelectedExam] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [expandedTerm, setExpandedTerm] = useState(null);

  // User & Points State
  const [user, setUser] = useState(null);
  const [didAward, setDidAward] = useState(false);

  // Anti-Cheat & UI
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [unansweredIds, setUnansweredIds] = useState(new Set());
  const [focusStrikes, setFocusStrikes] = useState(0);
  const [disqualified, setDisqualified] = useState(false);
  const [showTutor, setShowTutor] = useState(false);

  const questionRefs = useRef({});
  const isSubmittingRef = useRef(false);
  const lastFocusEventTsRef = useRef(0);

  const examActive = authenticated && selectedExam && !submitted;
  // ─── MERGE STATIC & DYNAMIC EXAMS ───
  const staticGradeData = termExams[gradeKey] || {};
  const [dynamicExams, setDynamicExams] = useState([]);
  const [hasNotified, setHasNotified] = useState(false);
  // Grade Filtering Logic
  const cleanedGrade = (studentInfo?.grade || "").toLowerCase();
  const gradeKey = cleanedGrade.includes("12") ? "Grade 12" : cleanedGrade.includes("11") ? "Grade 11" : "Grade 10";
  const gradeData = termExams[gradeKey] || {};


  // ─── AUTH & PROFILE SYNC ──────────────────────────────────────────────
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

  useEffect(() => {
    if (!studentInfo) navigate("/");
  }, [studentInfo, navigate]);

  // ─── TIMER LOGIC ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!examActive) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          actuallySubmitExam(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examActive]);

  // ─── EXAM SELECTION & PERMISSIONS ─────────────────────────────────────
  const handleSelectExam = (exam) => {
    const attemptsKey = `${studentInfo.name}_${exam.title}_attempts`;
    const attempts = parseInt(localStorage.getItem(attemptsKey) || "0", 10);

    if (attempts >= 3) {
      swal.fire({
        title: "Limit Reached",
        text: "You have already completed the maximum of 3 attempts for this revision test.",
        icon: "error",
        background: isDark ? '#111827' : '#fff',
        color: isDark ? '#fff' : '#000',
      });
      return;
    }

    swal.fire({
      title: `Start ${exam.title}?`,
      text: "Warning: Switching tabs or closing this window will result in disqualification.",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Start Now",
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#ef4444",
      background: isDark ? '#111827' : '#fff',
      color: isDark ? '#fff' : '#000',
    }).then((result) => {
      if (result.isConfirmed) {
        setSelectedExam(exam);
        setAuthenticated(true);
        setTimeLeft(15 * 60);
        setAnswers({});
        setSubmitted(false);
        setFocusStrikes(0);
        setDisqualified(false);
      }
    });
  };

  // ─── ANTI-CHEAT ───────────────────────────────────────────────────────
  const handleFocusViolation = useCallback(() => {
    if (!examActive) return;
    const now = Date.now();
    if (now - lastFocusEventTsRef.current < 2000) return;
    lastFocusEventTsRef.current = now;

    setFocusStrikes((s) => {
      const next = s + 1;
      if (next === 1) {
        swal.fire("Warning", "Tab switch detected. One more switch = 0%.", "warning");
      } else if (next >= 2) {
        setDisqualified(true);
        actuallySubmitExam(true);
      }
      return next;
    });
  }, [examActive]);

  useEffect(() => {
    if (!examActive) return;
    const block = (e) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("visibilitychange", handleFocusViolation);
    window.addEventListener("blur", handleFocusViolation);

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("visibilitychange", handleFocusViolation);
      window.removeEventListener("blur", handleFocusViolation);
    };
  }, [examActive, handleFocusViolation]);

  // ─── SUBMISSION LOGIC ─────────────────────────────────────────────────
  const handleChange = (id, answer) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }));
  };

  const handleSubmitExam = () => {
    const qs = questions[selectedExam.title] || [];
    const missing = qs.filter((q) => !answers[q.id]);

    if (missing.length > 0) {
      setTriedSubmit(true);
      setUnansweredIds(new Set(missing.map(q => q.id)));
      swal.fire({
        title: "Unfinished!",
        text: `You have ${missing.length} questions left. Submit anyway?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Submit Anyway",
        cancelButtonText: "Review Questions",
      }).then((res) => {
        if (res.isConfirmed) actuallySubmitExam(false);
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
    const finalAnswers = qs.map((q) => {
      const isCorrect = answers[q.id] === q.correctAnswer;
      if (!forceZero && isCorrect) score++;
      return { question: q.question, answer: answers[q.id] || "No Answer", correct: isCorrect };
    });

    const result = {
      studentId: user?.uid,
      name: studentInfo.name,
      grade: studentInfo.grade,
      exam: selectedExam.title,
      score: forceZero ? 0 : score,
      total: qs.length,
      percentage: ((score / qs.length) * 100).toFixed(1),
      timeSpent: formatTime(15 * 60 - timeLeft),
      completedTime: new Date().toISOString(),
      disqualified: forceZero,
    };

    try {
      await addDoc(collection(db, "examResults"), result);
      const key = `${studentInfo.name}_${selectedExam.title}_attempts`;
      localStorage.setItem(key, String(parseInt(localStorage.getItem(key) || "0") + 1));

      swal.fire({
        title: forceZero ? "Disqualified" : "Great Job!",
        text: forceZero ? "Test submitted with 0% due to cheating." : `Final Score: ${score}/${qs.length}`,
        icon: forceZero ? "error" : "success"
      }).then(() => navigate("/results"));
    } catch (e) {
      console.error("Save Error:", e);
    }
  };

  const handleLogout = () => {
    swal.fire({
      title: "Logout?",
      text: "Ready to take a break?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Logout",
      background: isDark ? '#111827' : '#fff',
      color: isDark ? '#fff' : '#000',
    }).then((res) => {
      if (res.isConfirmed) {
        signOut(auth);
        setStudentInfo(null);
        localStorage.clear();
        navigate("/");
      }
    });
  };

  // ─── LISTEN FOR TEACHER UPLOADS ───────────────────────────────────────
  useEffect(() => {
    if (!user || !studentInfo) return;

    // Filter exams by the student's Grade and Subject
    const q = query(
      collection(db, "exams"),
      where("grade", "==", studentInfo.grade),
      where("subject", "==", studentInfo.subject),
      orderBy("uploadedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const exams = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), isDynamic: true }));
      setDynamicExams(exams);

      // ─── POPUP NOTIFICATION FOR NEW EXAMS ───
      if (exams.length > 0 && !hasNotified) {
        const latestExam = exams[0];

        // Only notify if uploaded in the last 24 hours to prevent old spam
        const isRecent = new Date() - new Date(latestExam.uploadedAt) < 86400000;

        if (isRecent) {
          swal.fire({
            title: "New Exam Available!",
            text: `Teacher ${latestExam.teacherName} just uploaded: ${latestExam.title}`,
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "View Now",
            cancelButtonText: "Later",
            toast: true,
            position: 'top-end',
            timer: 10000,
            background: isDark ? '#1e1b4b' : '#fff',
            color: isDark ? '#fff' : '#000',
          }).then((res) => {
            if (res.isConfirmed) {
              // Direct the user to the exam or open the Drive link
              window.open(latestExam.examDriveLink, "_blank");
            }
          });
          setHasNotified(true);
        }
      }
    });

    return () => unsub();
  }, [user, studentInfo, isDark]);


  // Helper to handle both Static (Quiz) and Dynamic (PDF) exams
  const handleStartExam = (exam) => {
    if (exam.isDynamic) {
      // It's a teacher upload (PDF/Drive)
      swal.fire({
        title: exam.title,
        text: `This is a past paper uploaded by ${exam.teacherName}. Would you like to open the PDF?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Open Paper",
        cancelButtonText: "Cancel"
      }).then(res => {
        if (res.isConfirmed) window.open(exam.examDriveLink, "_blank");
      });
    } else {
      // It's a static interactive quiz
      handleSelectExam(exam);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">

      {/* ─── HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 w-1/3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
              {studentInfo?.name?.[0]}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Student Portal</p>
              <h2 className="text-sm font-black dark:text-white leading-none">{studentInfo?.name} (Gr. {studentInfo?.grade})</h2>
            </div>
          </div>

          <div className="w-1/3 flex justify-center">
            <button onClick={() => setShowTutor(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-all">
              <Sparkles size={18} />
              <span className="text-sm">AI Learning Hub</span>
            </button>
          </div>

          <div className="w-1/3 flex justify-end gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 dark:text-white">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── AI TUTOR OVERLAY ─── */}
      {showTutor && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col animate-in fade-in duration-300">
          <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Sparkles className="text-indigo-600" size={24} />
              <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">AI Learning Hub</h2>
            </div>
            <button onClick={() => setShowTutor(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white">
              <X size={32} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 overflow-y-auto border dark:border-gray-800 shadow-inner">
              <CATTutor />
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 overflow-y-auto border dark:border-gray-800 shadow-inner">
              <AIExamMocker />
            </div>
          </div>
        </div>
      )}

      {/* ─── DASHBOARD ─── */}
      {!examActive && (
        <main className="max-w-7xl mx-auto pt-28 px-6 pb-20">
          <FloatingStudyHub grade={studentInfo?.grade} currentStudentId={user?.uid} />

          <div className="my-10">
            <ExamResultsDisplay />
          </div>

          <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black dark:text-white tracking-tight mb-2">Available Revision Tests</h2>
              <p className="text-gray-500 font-medium">Select a term to view specific curriculum papers.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.keys(gradeData).map((term) => (
                <button
                  key={term}
                  onClick={() => setExpandedTerm(expandedTerm === term ? null : term)}
                  className={`p-8 rounded-3xl border-2 transition-all group ${expandedTerm === term ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-gray-800 hover:border-indigo-300'}`}
                >
                  <BookOpen size={40} className={`mx-auto mb-4 ${expandedTerm === term ? 'text-indigo-600' : 'text-gray-300'}`} />
                  <span className={`text-xl font-black block text-center ${expandedTerm === term ? 'text-indigo-600' : 'dark:text-gray-400'}`}>{term}</span>
                </button>
              ))}
            </div>

            {expandedTerm && (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4">
                {gradeData[expandedTerm].map((exam) => (
                  <div key={exam.id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700 hover:scale-[1.02] transition-transform">
                    <h3 className="text-lg font-bold dark:text-white mb-4">{exam.title}</h3>
                    <button
                      onClick={() => handleSelectExam(exam)}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors"
                    >
                      Enter Assessment
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ─── NEW: TEACHER UPLOAD SECTION ─── */}
      {dynamicExams.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500 rounded-lg text-white">
              <BookOpen size={20} />
            </div>
            <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">Teacher Uploads</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dynamicExams.map((exam) => (
              <div key={exam.id} className="p-6 bg-white dark:bg-gray-900 rounded-3xl border-2 border-amber-100 dark:border-amber-900/30 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] font-black rounded-full uppercase">
                    {exam.subject}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">{new Date(exam.uploadedAt).toLocaleDateString()}</span>
                </div>
                <h3 className="text-lg font-bold dark:text-white mb-1">{exam.title}</h3>
                <p className="text-xs text-gray-500 mb-6">Uploaded by {exam.teacherName}</p>
                <button
                  onClick={() => handleStartExam(exam)}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl font-black shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                >
                  VIEW PAPER
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── ACTIVE EXAM UI ─── */}
      {examActive && (
        <div className="fixed inset-0 z-[60] bg-indigo-950 text-white overflow-y-auto">
          {/* Timer Strip */}
          <div className="sticky top-0 z-[70] bg-black/40 backdrop-blur-md p-4 border-b border-white/10 flex justify-between items-center px-10">
            <h2 className="text-xl font-black italic">{selectedExam.title}</h2>
            <div className="flex items-center gap-4 bg-white/10 px-6 py-2 rounded-2xl border border-white/20">
              <Clock size={20} className={timeLeft < 180 ? 'text-red-400 animate-pulse' : ''} />
              <span className={`text-2xl font-mono font-bold ${timeLeft < 180 ? 'text-red-400' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="max-w-3xl mx-auto py-20 px-6">
            <div className="space-y-8">
              {(questions[selectedExam.title] || []).map((q, idx) => (
                <div key={q.id} className={`p-8 rounded-3xl bg-white/5 border-2 transition-all ${unansweredIds.has(q.id) ? 'border-red-500 bg-red-500/5' : 'border-white/10'}`}>
                  <p className="text-sm font-black text-indigo-400 uppercase mb-2">Question {idx + 1}</p>
                  <h3 className="text-xl font-bold mb-8 leading-snug">{q.question}</h3>
                  <div className="grid gap-4">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleChange(q.id, opt)}
                        className={`p-5 rounded-2xl text-left font-bold transition-all border-2 ${answers[q.id] === opt ? 'bg-indigo-600 border-indigo-400 shadow-xl scale-[1.02]' : 'bg-white/5 border-white/5 hover:bg-white/10'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmitExam}
              className="w-full mt-12 py-6 bg-emerald-500 text-white rounded-[2rem] text-2xl font-black shadow-2xl hover:bg-emerald-600 transition-all hover:scale-[1.02]"
            >
              FINALIZE SUBMISSION
            </button>
          </div>
        </div>
      )}
    </div>
  );
}