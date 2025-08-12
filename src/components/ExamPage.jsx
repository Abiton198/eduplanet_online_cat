// src/pages/ExamPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../utils/firebase";
import ExamResultsCard from "../utils/ExamResultCard";
import { termExams } from "../data/termExams";
import LeaderboardCard from "./LeaderboardCard";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { questions } from "../utils/Questions";
import { ensureStudentProfile } from "../utils/pointsSystem/ensureStudentProfile";
import { awardPointsFromExamHistory } from "../utils/pointsSystem/awardPointsFromExamHistory";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// helpers to normalize fields we rely on elsewhere
function makeNameKey(name) {
  return (name || "").toLowerCase().replace(/[,\s]+/g, " ").trim();
}
function parseGradeYear(grade) {
  const m = String(grade || "").match(/\d{1,2}/);
  return m ? Number(m[0]) : null;
}

export default function ExamPage({ studentInfo, addResult }) {
  const navigate = useNavigate();

  const [selectedExam, setSelectedExam] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [expandedTerm, setExpandedTerm] = useState(null);
  const [user, setUser] = useState(null);
  const [didAward, setDidAward] = useState(false);

  const formRef = useRef(null);

  // -------------------------------------------------
  // Auth + profile + auto-award (runs once per login)
  // -------------------------------------------------
  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          // sign in anonymously, then this callback will fire again with a user
          await signInAnonymously(auth);
          return;
        }

        setUser(u);

        if (studentInfo?.name && studentInfo?.grade) {
          // ensure the student profile exists & has normalized fields
          await ensureStudentProfile({
            uid: u.uid,
            name: studentInfo.name,
            grade: studentInfo.grade,
          });

          // run the awarder only once per mount/auth
          if (!didAward) {
            const res = await awardPointsFromExamHistory(u.uid, studentInfo.name);
            if (res?.error) {
              console.warn("awardPoints error:", res.message);
            } else {
              console.log(res?.message || "awardPoints: done");
            }
            setDidAward(true);
          }
        }
      } catch (e) {
        console.error("Auth/init flow failed:", e);
      }
    });

    return () => unsub();
  }, [studentInfo, didAward]);

  // ------------------------------------
  // Redirect if no student info provided
  // ------------------------------------
  useEffect(() => {
    if (!studentInfo) {
      navigate("/");
      return;
    }
    localStorage.setItem("studentName", studentInfo.name ?? "");
    localStorage.setItem("studentGrade", studentInfo.grade ?? "");
  }, [studentInfo, navigate]);

  // ---------------------------
  // Countdown timer for an exam
  // ---------------------------
  useEffect(() => {
    if (!authenticated || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        if (prev === 300) Swal.fire("⚠️ 5 minutes left!", "", "info");
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [authenticated, submitted]);

  // ---------------------------------------------
  // Exam selection with password and attempt caps
  // ---------------------------------------------
  const handleSelectExam = (exam) => {
    const studentName = localStorage.getItem("studentName") || "Unknown";
    const attemptsKey = `${studentName}_${exam.title}_attempts`;
    const lastAttemptKey = `${studentName}_${exam.title}_lastAttempt`;

    const attempts = parseInt(localStorage.getItem(attemptsKey) || "0", 10);
    const lastAttemptTime = localStorage.getItem(lastAttemptKey);
    const now = new Date();

    if (attempts >= 3) {
      Swal.fire("Maximum Attempts Reached", "", "error");
      return;
    }

    if (lastAttemptTime) {
      const lastAttemptDate = new Date(lastAttemptTime);
      const hoursSince = (now - lastAttemptDate) / (1000 * 60 * 60);
      if (hoursSince < 48) {
        Swal.fire("Too Soon", "Wait 48hrs after attempt before trying again.", "warning");
        return;
      }
    }

    Swal.fire({
      title: `Enter Password for ${exam.title}`,
      input: "password",
      showCancelButton: true,
      confirmButtonText: "Enter",
      preConfirm: (inputPassword) => {
        if (inputPassword === exam.password) {
          setSelectedExam(exam);
          setAuthenticated(true);
          setTimeLeft(25 * 60);
          // mark start time at exam start (more accurate)
          localStorage.setItem("examStartTime", new Date().toISOString());
          localStorage.setItem("examTitle", exam.title);
          return true;
        } else {
          Swal.showValidationMessage("Incorrect password");
          return false;
        }
      },
    });
  };

  // ----------------
  // Track answers UI
  // ----------------
  const handleChange = (id, answer) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }));
  };

  // ------------
  // Submit exam
  // ------------
  const handleSubmitExam = async () => {
    if (submitted) return;
    setSubmitted(true);

    const endTime = new Date();
    const startTimeStr = localStorage.getItem("examStartTime");
    const startTime = startTimeStr ? new Date(startTimeStr) : new Date();
    const timeSpentS = Math.round((endTime - startTime) / 1000);
    const timeSpent = `${Math.floor(timeSpentS / 60)}m ${timeSpentS % 60}s`;

    const studentName = studentInfo?.name || "Unknown";
    const studentGrade = studentInfo?.grade || "";
    const examTitle = selectedExam?.title || "Unknown";
    const uid = user?.uid || null;

    const attemptsKey = `${studentName}_${examTitle}_attempts`;
    const prevAtt = parseInt(localStorage.getItem(attemptsKey) || "0", 10);
    localStorage.setItem(attemptsKey, String(prevAtt + 1));
    localStorage.setItem(`${studentName}_${examTitle}_lastAttempt`, new Date().toISOString());

    // calculate score
    const qs = selectedExam ? questions[selectedExam.title] || [] : [];
    let score = 0;
    const answersArray = qs.map((q) => {
      const studentAnswer = answers[q.id] || "";
      if (studentAnswer === q.correctAnswer) score++;
      return {
        question: q.question,
        answer: studentAnswer,
        correctAnswer: q.correctAnswer,
      };
    });

    const totalQs = qs.length;
    const percentage = totalQs ? ((score / totalQs) * 100).toFixed(2) : "0.00";
    const unanswered = qs.filter((q) => !answers[q.id]).length;

    // normalized fields for downstream queries
    const nameKey = makeNameKey(studentName);
    const gradeYear = parseGradeYear(studentGrade);

    // save result
    const result = {
      studentId: uid,                 // ✅ link to student
      name: studentName,
      nameKey,                        // ✅ normalized name
      grade: studentGrade,
      gradeYear,                      // ✅ numeric grade year
      exam: examTitle,
      score,
      percentage,
      unanswered,
      timeSpent,
      completedDate: endTime.toISOString().split("T")[0],
      completedTimeOnly: `${String(endTime.getHours()).padStart(2, "0")}:${String(
        endTime.getMinutes()
      ).padStart(2, "0")}`,
      completedTime: endTime.toISOString(),
      attempts: prevAtt + 1,
      answers: answersArray,
    };

    try {
      const docRef = await addDoc(collection(db, "examResults"), result);
      // optional: persist examId back for uniqueness joins
      // await updateDoc(docRef, { examId: docRef.id });
      console.log("✅ Exam saved with answers:", result);
    } catch (err) {
      console.error("❌ Error saving result:", err);
    }

    if (typeof addResult === "function") addResult(result);

    Swal.fire("Submitted!", `You scored ${score}`, "success").then(() => {
      navigate("/results");
    });
  };

  // ---------------------------
  // Grade selection for the UI
  // ---------------------------
  const cleanedGrade = (studentInfo?.grade || "").trim().toLowerCase();
  let gradeKey = null;
  if (cleanedGrade.includes("grade 12") || cleanedGrade.startsWith("12")) {
    gradeKey = "Grade 12";
  } else if (cleanedGrade.includes("grade 11") || cleanedGrade.startsWith("11")) {
    gradeKey = "Grade 11";
  } else if (cleanedGrade.includes("grade 10") || cleanedGrade.startsWith("10")) {
    gradeKey = "Grade 10";
  }
  const gradeData = gradeKey ? termExams[gradeKey] : {};

  const currentStudentId = user?.uid || null;

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <h2 className="text-2xl font-bold mb-6">
        Welcome {studentInfo?.name} ({studentInfo?.grade})
      </h2>

      {/* 🏆 Floating leaderboard */}
      {currentStudentId && (
        <LeaderboardCard grade={studentInfo?.grade} currentStudentId={currentStudentId} />
      )}

      {/* Exam list / Results card */}
      {!selectedExam && (
        <>
          <ExamResultsCard studentName={studentInfo?.name} />

          <h3 className="text-xl mb-4">Select a Term</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.keys(gradeData).map((term) => (
              <div
                key={term}
                onClick={() => setExpandedTerm((x) => (x === term ? null : term))}
                className="p-4 bg-blue-100 rounded shadow cursor-pointer"
              >
                <h4>{term}</h4>
              </div>
            ))}
          </div>

          {expandedTerm && (
            <div className="mt-4 bg-white p-4 rounded shadow">
              {gradeData[expandedTerm].map((ex) => (
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

      {/* Exam taking view */}
      {authenticated && selectedExam && (
        <div className="mt-6" ref={formRef}>
          <h3 className="text-xl mb-2">{selectedExam.title}</h3>

          {/* Floating Timer */}
          <div
            style={{
              position: "fixed",
              top: "40px",
              right: "20px",
              zIndex: 9999,
              background: "rgba(0,0,0,0.8)",
              color: "#fff",
              padding: "15px 25px",
              borderRadius: "12px",
              fontSize: "2rem",
              fontWeight: "bold",
              boxShadow: "0 0 15px rgba(0,0,0,0.5)",
            }}
          >
            ⏱ {formatTime(timeLeft)}
          </div>

          {submitted ? (
            <p className="text-center">Submitting your answers…</p>
          ) : (
            <form>
              {(questions[selectedExam.title] || []).map((q, idx) => (
                <div key={q.id} className="p-4 mb-4 border rounded bg-white">
                  <h4>
                    Q{idx + 1}: {q.question}
                  </h4>
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
                    title: "Submit now?",
                    showCancelButton: true,
                    confirmButtonText: "Yes",
                  }).then((r) => r.isConfirmed && handleSubmitExam())
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
