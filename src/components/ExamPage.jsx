import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { addDoc, collection, query, onSnapshot, where, orderBy, limit, getCountFromServer } from "firebase/firestore";
import { db, auth } from "../utils/firebase";
import { signOut } from "firebase/auth";
import ExamResultsDisplay from "./ExamResultsDisplay";
import { Sun, Moon, LogOut, Clock, BookOpen, Sparkles, X, FileText } from "lucide-react";
import CATTutor from '../utils/CATTutor';
import AIExamMocker from '../utils/AIExamMocker';
import { ResultsTab } from './ResultsTab';




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
  const [examView, setExamView] = useState("new");

  // User & Points State
  const [user, setUser] = useState(null);
  const [didAward, setDidAward] = useState(false);

  // Anti-Cheat & UI
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [unansweredIds, setUnansweredIds] = useState(new Set());
  const [focusStrikes, setFocusStrikes] = useState(0);
  const [disqualified, setDisqualified] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [activeTool, setActiveTool] = useState(null); // 'tutor' | 'exam' | null

  const questionRefs = useRef({});
  const isSubmittingRef = useRef(false);
  const lastFocusEventTsRef = useRef(0);

  const examActive = authenticated && selectedExam && !submitted;
  // Grade Filtering Logic
  const [dynamicExams, setDynamicExams] = useState([]);
  const [seenExams, setSeenExams] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("seenExams") || "[]");
    } catch {
      return [];
    }
  });
  const studentName = studentInfo?.name;


  // ─── AUTH & PROFILE SYNC ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);

      if (!u) {
        localStorage.removeItem('user-session');
        return;
      }

      if (studentInfo && studentInfo.uid && studentInfo.uid !== u.uid) {
        setStudentInfo(null);
        localStorage.removeItem('user-session');
        return;
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
    if (!user || !studentInfo?.grade || !studentInfo?.subject) return;

    const q = query(
      collection(db, "exams"),
      where("grade", "==", studentInfo.grade),
      where("subject", "==", studentInfo.subject),
      orderBy("uploadedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const exams = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));


      setDynamicExams(exams);

      if (exams.length === 0) return;

      const latestExam = exams[0];

      // ✅ Only show if NOT seen
      if (!seenExams.includes(latestExam.id)) {

        Swal.fire({
          title: "📢 New Exam Uploaded!",
          html: `
          <b>${latestExam.title}</b><br/>
          Subject: ${latestExam.subject}<br/>
          Teacher: ${latestExam.teacherName}
        `,
          icon: "info",
          showCancelButton: true,
          showCloseButton: true,
          confirmButtonText: "Start Now",
          cancelButtonText: "Later",
          allowOutsideClick: false,
          background: isDark ? '#1e1b4b' : '#fff',
          color: isDark ? '#fff' : '#000',
        }).then((result) => {
          // Save as seen
          const updatedSeen = [...seenExams, latestExam.id];
          setSeenExams(updatedSeen);
          localStorage.setItem("seenExams", JSON.stringify(updatedSeen));

          if (result.isConfirmed) {
            navigate(`/student/exam/${latestExam.id}`);
          }
        });
      }

    });

    return () => unsub();
  }, [user, studentInfo, isDark, seenExams]);

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
  const newExams = dynamicExams.filter(exam => !seenExams.includes(exam.id));


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
              <h2 className="text-sm font-black dark:text-white leading-none">{studentInfo?.name} - {studentInfo?.grade}</h2>
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

          {/* Header */}
          <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Sparkles className="text-indigo-600" size={24} />
              <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">
                AI Learning Hub
              </h2>
            </div>
            {/* Only allow closing if no active tool OR confirm exit */}
            <button
              onClick={() => {
                if (activeTool === 'exam') {
                  const confirm = window.confirm(
                    'You are currently in an exam. Closing this window will NOT submit your exam. Are you sure you want to exit?'
                  );
                  if (!confirm) return;
                }
                setActiveTool(null);
                setShowTutor(false);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white"
            >
              <X size={32} />
            </button>
          </div>

          {/* Tool selector — shown only when no tool is active */}
          {activeTool === null && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-black dark:text-white mb-2">
                  What would you like to do?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose one — you cannot switch between tools once you start.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">

                {/* Tutor Card */}
                <button
                  onClick={() => setActiveTool('tutor')}
                  className="group flex flex-col items-center gap-4 p-8 bg-indigo-50 dark:bg-indigo-900/30
                       border-2 border-indigo-200 dark:border-indigo-700 rounded-3xl
                       hover:border-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50
                       transition-all shadow-sm hover:shadow-lg text-left"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center">
                    <Sparkles size={32} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-indigo-700 dark:text-indigo-300 mb-1">
                      AI Tutor
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Study concepts, get explanations, and practise with your AI mentor step by step.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                    Start Tutoring →
                  </span>
                </button>

                {/* Exam Card */}
                <button
                  onClick={() => setActiveTool('exam')}
                  className="group flex flex-col items-center gap-4 p-8 bg-green-50 dark:bg-green-900/30
                       border-2 border-green-200 dark:border-green-700 rounded-3xl
                       hover:border-green-500 hover:bg-green-100 dark:hover:bg-green-900/50
                       transition-all shadow-sm hover:shadow-lg text-left"
                >
                  <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center">
                    <FileText size={32} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-green-700 dark:text-green-300 mb-1">
                      AI Exam
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      Attempt a teacher uploaded exam and AI-marked or memoised  exam under timed conditions.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-green-500 uppercase tracking-widest">
                    Start Exam →
                  </span>
                </button>

              </div>

              <p className="text-xs text-gray-400 dark:text-gray-600 text-center max-w-md">
                🔒 For academic integrity, the AI Tutor is completely disabled while you are in an exam,
                and the exam is disabled while you are using the tutor.
              </p>
            </div>
          )}

          {/* Active: Tutor only */}
          {activeTool === 'tutor' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Active tool bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border-b dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
                    AI Tutor — Active
                  </span>
                  <span className="text-[10px] bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                    🔒 Exam locked
                  </span>
                </div>
                <button
                  onClick={() => {
                    const confirm = window.confirm('Exit the AI Tutor and return to tool selection?');
                    if (confirm) setActiveTool(null);
                  }}
                  className="text-xs text-gray-500 hover:text-red-500 font-bold px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-300 transition-colors"
                >
                  ← Back to Menu
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 border dark:border-gray-800 shadow-inner min-h-full">
                  <CATTutor />
                </div>
              </div>
            </div>
          )}

          {/* Active: Exam only */}
          {activeTool === 'exam' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Active tool bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-green-50 dark:bg-green-900/30 border-b dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-green-600" />
                  <span className="text-sm font-black text-green-700 dark:text-green-300 uppercase tracking-widest">
                    AI Exam — Active
                  </span>
                  <span className="text-[10px] bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-bold">
                    🔒 Tutor locked
                  </span>
                </div>
                <button
                  onClick={() => {
                    const confirm = window.confirm(
                      '⚠️ Are you sure you want to exit the exam? Your current progress may be lost.'
                    );
                    if (confirm) setActiveTool(null);
                  }}
                  className="text-xs text-gray-500 hover:text-red-500 font-bold px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-300 transition-colors"
                >
                  ← Exit Exam
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 border dark:border-gray-800 shadow-inner min-h-full">
                  <AIExamMocker />
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ─── DASHBOARD ─── */}
      {!examActive && (
        <main className="max-w-7xl mx-auto pt-28 px-6 pb-20">

          <div className="my-10">
            <ExamResultsDisplay />
            <ResultsTab studentId={user?.uid} />
          </div>



        </main>
      )}

      {/* ─── NEW: TEACHER UPLOAD SECTION ─── */}
      {examView === "new" && newExams.length > 0 && (
        <section className="mb-12 animate-in fade-in">
          <h2 className="text-3xl font-black mb-6 text-indigo-600">
            🔔 New Exams Just Uploaded
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newExams.map((exam) => (
              <div
                key={exam.id}
                className="p-6 rounded-3xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-xl animate-pulse"
              >
                <span className="text-xs font-black text-indigo-600 uppercase">
                  NEW
                </span>

                <h3 className="text-lg font-bold mt-2 dark:text-white">
                  {exam.title}
                </h3>

                <p className="text-xs text-gray-500 mb-4">
                  {exam.subject} • {exam.teacherName}
                </p>

                <button
                  onClick={() => handleStartExam(exam)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700"
                >
                  Start / View
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