"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const API = "https://abitonp.pythonanywhere.com";

// ─── Persistent student ID (same logic as CATTutor) ───────────────────────────
const getStudentId = () => {
  let sid = localStorage.getItem("educat_sid");
  if (!sid) {
    sid = "stu_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("educat_sid", sid);
  }
  return sid;
};
const STUDENT_ID = getStudentId();

// ─── Status colours ───────────────────────────────────────────────────────────
const STATUS_COLOR = {
  correct:   { bg: "#d1fae5", border: "#6ee7b7", icon: "✅" },
  partial:   { bg: "#fef9c3", border: "#fde68a", icon: "⚠️" },
  incorrect: { bg: "#fee2e2", border: "#fca5a5", icon: "❌" },
  missing:   { bg: "#f3f4f6", border: "#d1d5db", icon: "—"  },
  no_memo:   { bg: "#ede9fe", border: "#c4b5fd", icon: "ℹ️" },
};

// ─── Style tokens ─────────────────────────────────────────────────────────────
const S = {
  wrap:      { fontFamily: "'DM Sans', sans-serif", maxWidth: 800, margin: "0 auto", padding: "24px 16px", color: "#1a1a2e", minHeight: "100vh", background: "#f4f6fb" },
  wrapFull:  { fontFamily: "'DM Sans', sans-serif", width: "100vw", height: "100vh", margin: 0, padding: 0, color: "#1a1a2e", background: "#f4f6fb", display: "flex", flexDirection: "column", overflow: "hidden" },
  card:      { background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 16px rgba(30,30,60,.08)", marginBottom: 20 },
  cardFull:  { background: "#fff", borderRadius: 0, padding: "20px 32px", boxShadow: "none", flex: 1, overflowY: "auto", marginBottom: 0 },
  title:     { fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "#1a1a2e", margin: 0 },
  subtitle:  { fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 0 },

  secBadge:  { display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", background: "#e0e7ff", color: "#3730a3", borderRadius: 6, padding: "3px 10px", marginBottom: 8 },
  parentHd:  { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, color: "#9ca3af", marginBottom: 6 },
  context:   { background: "#fffbeb", borderLeft: "3px solid #f59e0b", padding: "8px 14px", borderRadius: 6, fontSize: 13, color: "#78350f", marginBottom: 14 },
  qRow:      { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 18 },
  qNum:      { fontWeight: 800, fontSize: 15, color: "#3730a3", minWidth: 36, paddingTop: 2 },
  qText:     { flex: 1, fontSize: 15, lineHeight: 1.65, color: "#1a1a2e" },
  qMark:     { fontWeight: 700, fontSize: 13, color: "#dc2626", whiteSpace: "nowrap", paddingTop: 2 },

  optLabel:  { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, marginBottom: 8, cursor: "pointer", transition: "all .15s", fontSize: 14 },
  optSel:    { borderColor: "#6366f1", background: "#eef2ff" },
  optKey:    { fontWeight: 700, color: "#6366f1", minWidth: 20 },

  tfBtn:     { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", border: "1.5px solid #e5e7eb", borderRadius: 10, marginRight: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all .15s", background: "#fff" },
  tfSel:     { borderColor: "#6366f1", background: "#eef2ff", color: "#3730a3" },

  table:     { width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 14 },
  th:        { textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e5e7eb", background: "#f9fafb", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: .5, color: "#6b7280" },
  td:        { padding: "9px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  sel:       { width: "100%", padding: "7px 10px", borderRadius: 8, border: "1.5px solid #d1d5db", fontSize: 13, background: "#fff" },

  textarea:  { width: "100%", minHeight: 110, padding: "10px 14px", border: "1.5px solid #d1d5db", borderRadius: 10, fontSize: 14, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", marginTop: 8, outline: "none", boxSizing: "border-box" },
  corrInput: { width: "100%", padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 14, fontFamily: "inherit", marginTop: 8, boxSizing: "border-box" },

  navBar:    { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 20 },
  btn:       { padding: "9px 18px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "opacity .15s" },
  btnPri:    { background: "#6366f1", color: "#fff" },
  btnSec:    { background: "#f3f4f6", color: "#374151" },
  btnDanger: { background: "#dc2626", color: "#fff" },
  btnWarn:   { background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fed7aa" },
  btnGhost:  { background: "transparent", color: "#6b7280", border: "1.5px solid #e5e7eb" },
  btnSkip:   { background: "#fff", color: "#6b7280", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },

  progress:  { fontSize: 13, color: "#9ca3af", marginTop: 10 },

  topBar:    { background: "#1a1a2e", color: "#fff", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 12 },
  topBarTitle: { fontWeight: 800, fontSize: 15, letterSpacing: "-.3px", flex: 1 },

  drawer:    { position: "fixed", top: 0, right: 0, height: "100vh", width: 300, background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,.12)", zIndex: 200, overflowY: "auto", padding: 20 },
  drawerHd:  { fontWeight: 800, fontSize: 16, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" },
  qDot:      { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", margin: 4, border: "1.5px solid #e5e7eb" },

  resultCard: { borderRadius: 12, padding: "14px 18px", marginBottom: 12, border: "1.5px solid", fontSize: 14, lineHeight: 1.7 },
  feedBox:    { background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 14, lineHeight: 1.7 },
  pill:       { display: "inline-block", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, marginRight: 6 },

  // Score banner
  scoreBanner: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 16, padding: "28px 32px", marginBottom: 20, color: "#fff", textAlign: "center" },
  scoreNum:    { fontSize: 52, fontWeight: 800, letterSpacing: "-2px", lineHeight: 1 },
  scorePct:    { fontSize: 20, fontWeight: 700, opacity: .85, marginTop: 6 },
  scoreSub:    { fontSize: 13, opacity: .7, marginTop: 4 },

  // Post-submit agent panel
  agentPanel:  { background: "#eef2ff", border: "1.5px solid #c7d2fe", borderRadius: 12, padding: "16px 20px", marginBottom: 20, fontSize: 14 },
  agentInput:  { width: "100%", padding: "10px 14px", border: "1.5px solid #c7d2fe", borderRadius: 10, fontSize: 14, fontFamily: "inherit", marginTop: 10, boxSizing: "border-box" },

  select:    { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", fontSize: 14, background: "#fff", marginBottom: 14, fontFamily: "inherit" },
  startBtn:  { width: "100%", padding: "13px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: "-.3px" },
  memoTag:   { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "4px 10px" },

  overlay:   { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:     { background: "#fff", borderRadius: 18, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.2)", textAlign: "center" },
  modalIcon: { fontSize: 42, marginBottom: 12 },
  modalTitle:{ fontWeight: 800, fontSize: 20, color: "#1a1a2e", marginBottom: 8 },
  modalSub:  { fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 },
  modalBtns: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
};

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
    * { box-sizing: border-box; }
    button:disabled { opacity: .5; cursor: not-allowed; }
  `}</style>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function AIExamMocker({ student }) {
  const containerRef = useRef(null);

  // ── Exam list & setup ──────────────────────────────────────────────────────
  const [exams, setExams]             = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [sessionId, setSessionId]     = useState(null);
  const [totalQ, setTotalQ]           = useState(0);
  const [memoMerged, setMemoMerged]   = useState(false);

  // ── Exam state ─────────────────────────────────────────────────────────────
  const [question, setQuestion] = useState(null);
  const [index, setIndex]       = useState(0);
  const [answers, setAnswers]   = useState({});
  const [skipped, setSkipped]   = useState(new Set());

  // ── UI state ───────────────────────────────────────────────────────────────
  const [started, setStarted]         = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [results, setResults]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [tfCorrection, setTfCorrection]   = useState("");

  // ── Post-submit agent chat (ask about results) ─────────────────────────────
  const [agentQuestion, setAgentQuestion] = useState("");
  const [agentReply, setAgentReply]       = useState("");
  const [agentLoading, setAgentLoading]   = useState(false);

  // ── Load exams on mount ────────────────────────────────────────────────────
  useEffect(() => { loadExams(); }, []);

  // ── Sync TF correction when navigating ────────────────────────────────────
  useEffect(() => {
    if (!question) return;
    const saved = answers[index] || "";
    if (question.type === "true_false" && saved.startsWith("False — ")) {
      setTfCorrection(saved.replace("False — ", ""));
    } else {
      setTfCorrection("");
    }
  }, [question, index]);

  // ── Fullscreen API ─────────────────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    const el = containerRef.current || document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    setIsFullscreen(true);
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    const h = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement)
        setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", h);
    document.addEventListener("webkitfullscreenchange", h);
    return () => {
      document.removeEventListener("fullscreenchange", h);
      document.removeEventListener("webkitfullscreenchange", h);
    };
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!started || submitted) return;
    const h = (e) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") next();
      if (e.key === "ArrowLeft"  || e.key === "PageUp")   prev();
      if (e.key === "Escape" && isFullscreen) exitFullscreen();
      if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        isFullscreen ? exitFullscreen() : enterFullscreen();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [started, submitted, index, totalQ, isFullscreen]);

  // ── API: load exam list ────────────────────────────────────────────────────
  const loadExams = async () => {
    try {
      const res  = await fetch(`${API}/exams`);
      const data = await res.json();
      setExams(data.exams || []);
      if (data.exams?.length) setSelectedExam(data.exams[0]);
    } catch (e) { console.error("loadExams:", e); }
  };

  // ── API: start exam — NOW sends student_id ─────────────────────────────────
  const startExam = async () => {
    if (!selectedExam) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/start-exam`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          exam:       selectedExam,
          student_id: STUDENT_ID,          // ← wired in
        }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setSessionId(data.session_id);
      setTotalQ(data.total_questions);
      setMemoMerged(data.memo_merged || false);
      setStarted(true);
      setIndex(0);
      setAnswers({});
      setSkipped(new Set());
      setAgentReply("");
      await fetchQuestion(data.session_id, 0);
    } finally { setLoading(false); }
  };

  // ── API: get question ──────────────────────────────────────────────────────
  const fetchQuestion = async (sid, i) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/question`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sid, index: i }),
      });
      const data = await res.json();
      setQuestion(data);
      setIndex(i);
    } finally { setLoading(false); }
  };

  // ── API: save answer ───────────────────────────────────────────────────────
  const saveAnswer = async (value) => {
    setAnswers(prev => ({ ...prev, [index]: value }));
    try {
      await fetch(`${API}/answer`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: sessionId, index, answer: value }),
      });
    } catch (e) { console.error("saveAnswer:", e); }
  };

  // ── API: submit — NOW sends student_id so agent updates study plan ─────────
  const submitExam = async () => {
    const unanswered = totalQ - Object.keys(answers).length;
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
    }
    setSaving(true);
    if (isFullscreen) exitFullscreen();
    try {
      // 1. Submit to backend first — get marked results + AI feedback
      const res  = await fetch(`${API}/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          session_id: sessionId,
          student_id: STUDENT_ID,
        }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }

      // 2. Save full attempt + marked results to Firestore so
      //    ExamResultsDisplay can read everything from one doc.
      await addDoc(collection(db, "exam_attempts"), {
        studentId:      STUDENT_ID,
        exam:           selectedExam,
        answers,
        skipped:        [...skipped],
        answeredCount:  Object.keys(answers).length,
        score:          data.score,
        total:          data.total,
        percentage:     data.percentage,
        markedResults:  data.results || [],   // per-question breakdown
        aiFeedback:     data.feedback || "",  // AI summary feedback
        completedAt:    serverTimestamp(),
        createdAt:      serverTimestamp(),
      });

      setResults(data);
      setSubmitted(true);
    } finally { setSaving(false); }
  };

  // ── API: post-submit agent question ───────────────────────────────────────
  const askAgent = async () => {
    const q = agentQuestion.trim();
    if (!q || agentLoading) return;
    setAgentLoading(true);
    setAgentReply("");
    try {
      const res  = await fetch(`${API}/agent-chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_id: STUDENT_ID, message: q }),
      });
      const data = await res.json();
      setAgentReply(data.response || data.answer || "No response.");
    } catch (e) {
      setAgentReply("⚠️ Could not reach the agent.");
    } finally {
      setAgentLoading(false);
      setAgentQuestion("");
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goTo = (i) => fetchQuestion(sessionId, i);
  const next  = () => { if (index < totalQ - 1) goTo(index + 1); };
  const prev  = () => { if (index > 0) goTo(index - 1); };
  const skipQuestion = () => {
    setSkipped(prev => new Set([...prev, index]));
    if (index < totalQ - 1) goTo(index + 1);
  };

  // ── Cancel / exit exam ─────────────────────────────────────────────────────
  const cancelExam = () => {
    if (isFullscreen) exitFullscreen();
    setShowExitModal(false);
    setStarted(false); setSubmitted(false); setResults(null);
    setQuestion(null); setAnswers({}); setSkipped(new Set());
    setSessionId(null); setIndex(0); setAgentReply("");
  };

  // ── Question navigator dot style ───────────────────────────────────────────
  const dotStyle = (i) => {
    const isCurrent  = i === index;
    const isAnswered = !!answers[i];
    const isSkip     = skipped.has(i);
    return {
      ...S.qDot,
      background:  isCurrent ? "#6366f1" : isSkip ? "#fef9c3" : isAnswered ? "#d1fae5" : "#f9fafb",
      color:       isCurrent ? "#fff"    : isSkip ? "#92400e" : isAnswered ? "#065f46" : "#374151",
      borderColor: isCurrent ? "#6366f1" : isSkip ? "#fde68a" : isAnswered ? "#6ee7b7" : "#e5e7eb",
      transform:   isCurrent ? "scale(1.15)" : "scale(1)",
      transition:  "all .15s",
    };
  };

  // ── Answer input renderer ──────────────────────────────────────────────────
  const renderInput = () => {
    if (!question) return null;
    const q     = question;
    const saved = answers[index] || "";

    // MCQ
    if (q.type === "mcq" && Array.isArray(q.options) && q.options.length > 0) {
      return (
        <div>
          {q.options.map((opt) => {
            const sel = saved === opt.key;
            return (
              <label key={opt.key} style={{ ...S.optLabel, ...(sel ? S.optSel : {}) }}
                onClick={() => saveAnswer(opt.key)}>
                <input type="radio" name="mcq" value={opt.key} checked={sel}
                  onChange={() => saveAnswer(opt.key)} style={{ accentColor: "#6366f1" }} />
                <span style={S.optKey}>{opt.key}.</span>
                <span>{opt.value}</span>
              </label>
            );
          })}
        </div>
      );
    }

    // True/False
    if (q.type === "true_false") {
      const isFalse = saved.startsWith("False");
      return (
        <div>
          <div style={{ display: "flex", gap: 0, marginBottom: 14 }}>
            {["True", "False"].map((v) => {
              const sel = v === "True" ? saved === "True" : isFalse;
              return (
                <button key={v} style={{ ...S.tfBtn, ...(sel ? S.tfSel : {}) }}
                  onClick={() => {
                    if (v === "True") { setTfCorrection(""); saveAnswer("True"); }
                    else { saveAnswer(tfCorrection ? `False — ${tfCorrection}` : "False"); }
                  }}>
                  {v === "True" ? "✅" : "❌"} {v}
                </button>
              );
            })}
          </div>
          {isFalse && (
            <div>
              <label style={{ fontSize: 13, color: "#555" }}>Correct the underlined word/phrase:</label>
              <input type="text" style={S.corrInput}
                placeholder="e.g. secondary memory"
                value={tfCorrection}
                onChange={(e) => {
                  setTfCorrection(e.target.value);
                  saveAnswer(`False — ${e.target.value}`);
                }} />
            </div>
          )}
        </div>
      );
    }

    // Matching
    if (q.type === "matching" && Array.isArray(q.column_a) && q.column_a.length > 0) {
      let savedMap = {};
      try { savedMap = JSON.parse(saved || "{}"); } catch (_) {}
      const updateMatch = (item, value) =>
        saveAnswer(JSON.stringify({ ...savedMap, [item]: value }));
      return (
        <div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
            Match each item in <b>COLUMN A</b> to the correct answer in <b>COLUMN B</b>.
          </p>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>COLUMN A</th>
                <th style={S.th}>COLUMN B — Your Match</th>
              </tr>
            </thead>
            <tbody>
              {q.column_a.map((item, i) => (
                <tr key={i}>
                  <td style={S.td}>{item}</td>
                  <td style={S.td}>
                    <select style={S.sel} value={savedMap[item] || ""}
                      onChange={(e) => updateMatch(item, e.target.value)}>
                      <option value="">— Select —</option>
                      {q.column_b.map((b, j) => <option key={j} value={b}>{b}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Open
    return (
      <textarea style={S.textarea} placeholder="Write your answer here..."
        value={saved} onChange={(e) => saveAnswer(e.target.value)} />
    );
  };

  // ── Navigator drawer ───────────────────────────────────────────────────────
  const NavigatorDrawer = () => (
    <div style={S.drawer}>
      <div style={S.drawerHd}>
        <span>Questions</span>
        <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
          onClick={() => setDrawerOpen(false)}>✕</button>
      </div>
      {question && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f9fafb", borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>
            CURRENT SECTION: {question.section || "—"}
          </div>
          <button style={{ ...S.btnSkip, width: "100%" }}
            onClick={() => {
              const nxt = [...Array(totalQ).keys()].find(i => i > index && !answers[i]);
              goTo(nxt !== undefined ? nxt : Math.min(index + 1, totalQ - 1));
              setDrawerOpen(false);
            }}>
            ⏭ Skip to Next Unanswered
          </button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, fontSize: 11 }}>
        {[["#d1fae5","Answered"],["#fef9c3","Skipped"],["#f9fafb","Not answered"],["#6366f1","Current"]].map(([c,l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: "inline-block", border: "1px solid #e5e7eb" }} />{l}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {[...Array(totalQ)].map((_, i) => (
          <span key={i} style={dotStyle(i)}
            onClick={() => { goTo(i); setDrawerOpen(false); }}
            title={`Q${i+1}${answers[i]?" ✓":""}${skipped.has(i)?" (skipped)":""}`}>
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );

  // ── Exit confirm modal ─────────────────────────────────────────────────────
  const ExitModal = () => (
    <div style={S.overlay} onClick={() => setShowExitModal(false)}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalIcon}>⚠️</div>
        <div style={S.modalTitle}>Exit Exam?</div>
        <div style={S.modalSub}>
          You have answered <b>{Object.keys(answers).length}</b> of <b>{totalQ}</b> questions.
          <br />Your progress will be <b>lost</b> if you exit now.
        </div>
        <div style={S.modalBtns}>
          <button style={{ ...S.btn, ...S.btnSec, minWidth: 120 }} onClick={() => setShowExitModal(false)}>
            ← Keep Going
          </button>
          <button style={{ ...S.btn, ...S.btnDanger, minWidth: 120 }} onClick={cancelExam}>
            🚪 Exit Exam
          </button>
        </div>
      </div>
    </div>
  );

  // ── Question card (shared between normal + fullscreen) ─────────────────────
  const QuestionContent = ({ cardStyle }) => {
    const q        = question;
    const answered = Object.keys(answers).length;
    const isSkip   = skipped.has(index);

    return (
      <div style={cardStyle}>
        <div>
          <span style={S.secBadge}>
            Section {q?.section}{q?.section_title ? ` — ${q.section_title}` : ""}
          </span>
          {q?.section_instructions && (
            <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 10px" }}>{q.section_instructions}</p>
          )}
          {q?.section_total_marks && (
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>
              Section total: <b>{q.section_total_marks} marks</b>
            </p>
          )}
        </div>

        {q?.parent_question && <div style={S.parentHd}>{q.parent_question}</div>}
        {q?.parent_context  && <div style={S.context}>📌 {q.parent_context}</div>}

        <div style={S.qRow}>
          <span style={S.qNum}>{q?.question_number}.</span>
          <span style={S.qText}>{q?.question}</span>
          <span style={S.qMark}>({q?.marks})</span>
        </div>

        {isSkip && (
          <div style={{ background: "#fef9c3", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#92400e", marginBottom: 10 }}>
            ⏭ You skipped this question — you can still answer it.
          </div>
        )}

        {renderInput()}

        <div style={S.navBar}>
          <button style={{ ...S.btn, ...S.btnSec }} onClick={prev} disabled={index === 0}>⬅ Back</button>
          <button style={S.btnSkip} onClick={skipQuestion} disabled={index >= totalQ - 1}>Skip ⏭</button>
          <button style={{ ...S.btn, ...S.btnSec }} onClick={next} disabled={index >= totalQ - 1}>Next ➡</button>
          <button style={{ ...S.btn, ...S.btnWarn, marginLeft: "auto" }} onClick={() => setShowExitModal(true)}>
            🚪 Exit
          </button>
          <button style={{ ...S.btn, ...S.btnDanger, opacity: saving ? .7 : 1 }}
            onClick={submitExam} disabled={saving}>
            {saving ? "Submitting…" : "✅ Submit"}
          </button>
        </div>

        <p style={S.progress}>
          Q {index + 1} of {totalQ} &nbsp;|&nbsp; {totalQ - answered} remaining
          {skipped.size > 0 ? ` | ${skipped.size} skipped` : ""}
          &nbsp;|&nbsp;
          <kbd style={{ fontSize: 11, background: "#f3f4f6", padding: "1px 5px", borderRadius: 4 }}>← →</kbd> navigate
        </p>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RESULTS VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (submitted && results) {
    const pct = results.percentage || 0;
    const pctColor = pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";

    return (
      <div style={S.wrap} ref={containerRef}>
        <FontLoader />

        {/* Score banner */}
        <div style={S.scoreBanner}>
          <div style={S.scoreNum}>{results.score} / {results.total}</div>
          <div style={{ ...S.scorePct, color: pct >= 70 ? "#bbf7d0" : pct >= 50 ? "#fef08a" : "#fca5a5" }}>
            {pct}%
          </div>
          <div style={S.scoreSub}>
            {pct >= 70 ? "🎉 Great work!" : pct >= 50 ? "📈 Good effort — keep practising" : "💪 Keep going — review your weak areas"}
          </div>
          <div style={{ fontSize: 11, opacity: .5, marginTop: 8 }}>
            Student: {STUDENT_ID}
          </div>
        </div>

        {/* AI feedback */}
        {results.feedback && (
          <div style={S.feedBox}>
            🤖 <b>AI Feedback:</b><br />{results.feedback}
          </div>
        )}

        {/* Agent follow-up panel */}
        <div style={S.agentPanel}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#3730a3", marginBottom: 6 }}>
            🤖 Ask the AI Agent about your results
          </div>
          <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 8px" }}>
            E.g. "Explain question 4.1" · "What should I study?" · "Give me a hint for Q3.2"
          </p>
          {agentReply && (
            <div style={{ background: "#fff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "12px 16px", fontSize: 13, lineHeight: 1.7, marginBottom: 10, color: "#1a1a2e", whiteSpace: "pre-wrap" }}>
              {agentReply}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              style={S.agentInput}
              placeholder="Ask the agent anything about this exam…"
              value={agentQuestion}
              onChange={(e) => setAgentQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") askAgent(); }}
            />
            <button
              style={{ ...S.btn, ...S.btnPri, whiteSpace: "nowrap", opacity: agentLoading || !agentQuestion.trim() ? .6 : 1 }}
              onClick={askAgent}
              disabled={agentLoading || !agentQuestion.trim()}>
              {agentLoading ? "…" : "Ask"}
            </button>
          </div>
        </div>

        {/* Per-question results */}
        {(results.results || []).map((r, i) => {
          const st = STATUS_COLOR[r.status] || STATUS_COLOR.missing;

          // Format student answer for display
          let studentDisplay = r.student_answer || "No answer";
          if (r.type === "matching" && r.student_answer && r.student_answer !== "No answer") {
            try {
              const obj = JSON.parse(r.student_answer);
              studentDisplay = Object.entries(obj).map(([k,v]) => `${k} → ${v}`).join("\n");
            } catch (_) {}
          }

          return (
            <div key={i} style={{ ...S.resultCard, background: st.bg, borderColor: st.border }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 800 }}>
                  {st.icon} {r.question_number}&nbsp;
                  <span style={{ fontWeight: 400, fontSize: 13 }}>{r.question}</span>
                </span>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#374151", whiteSpace: "nowrap", marginLeft: 8 }}>
                  {r.earned}/{r.marks}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#374151" }}>
                <b>Your answer:</b>{" "}
                <span style={{ whiteSpace: "pre-wrap" }}>{studentDisplay}</span>
                <br />
                <b>Correct answer:</b> {r.correct_answer || <i>Not available</i>}
                <br />
                {r.feedback && <><b>Feedback:</b> {r.feedback}</>}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ ...S.pill, background: st.bg, color: "#374151", border: `1px solid ${st.border}` }}>
                  {r.status}
                </span>
                <span style={{ ...S.pill, background: "#f3f4f6", color: "#374151" }}>{r.type}</span>
                {/* Quick hint button for incorrect/partial */}
                {(r.status === "incorrect" || r.status === "partial") && (
                  <button
                    style={{ ...S.btnSkip, fontSize: 12, padding: "3px 10px", background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" }}
                    onClick={() => {
                      setAgentQuestion(`Give me a Socratic hint for question ${r.question_number}: "${r.question}"`);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}>
                    💡 Get hint
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button style={{ ...S.btn, ...S.btnPri, width: "100%", marginTop: 8 }}
          onClick={() => {
            setSubmitted(false); setStarted(false); setResults(null);
            setAnswers({}); setSkipped(new Set()); setAgentReply("");
          }}>
          🔄 Try Another Exam
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div style={S.wrap} ref={containerRef}>
        <FontLoader />
        <div style={S.card}>
          <h1 style={S.title}>📝 Exam Mocker</h1>
          <p style={S.subtitle}>Select a paper and start practising</p>
          <div style={{ marginTop: 12, marginBottom: 16, fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
            Student: {STUDENT_ID}
          </div>
          <select style={{ ...S.select, marginTop: 8 }} value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}>
            <option value="">— Select Exam —</option>
            {exams.map((ex, i) => (
              <option key={i} value={ex}>{ex.replace("_exam.json","").replace(/_/g," ")}</option>
            ))}
          </select>
          <button style={{ ...S.startBtn, opacity: loading || !selectedExam ? 0.6 : 1 }}
            onClick={startExam} disabled={loading || !selectedExam}>
            {loading ? "Loading…" : "▶ Start Exam"}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXAM VIEW — FULLSCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div style={S.wrapFull} ref={containerRef}>
        <FontLoader />
        {showExitModal && <ExitModal />}
        {drawerOpen    && <NavigatorDrawer />}

        <div style={S.topBar}>
          <span style={S.topBarTitle}>
            📝 {selectedExam.replace("_exam.json","").replace(/_/g," ")}
          </span>
          <span style={{ ...S.memoTag, background: memoMerged ? "#d1fae5" : "#fef9c3", color: memoMerged ? "#065f46" : "#92400e" }}>
            {memoMerged ? "✅ Memo" : "⚠️ No Memo"}
          </span>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>
            {Object.keys(answers).length}/{totalQ} answered
          </span>
          <button style={{ ...S.btn, ...S.btnGhost, fontSize: 13, color: "#e5e7eb", borderColor: "#374151" }}
            onClick={() => setDrawerOpen(true)}>
            ☰ Questions
          </button>
          <button style={{ ...S.btn, background: "#374151", color: "#fff", fontSize: 13 }}
            onClick={exitFullscreen}>
            ⛶ Exit Fullscreen
          </button>
          <button style={{ ...S.btn, ...S.btnWarn, fontSize: 13 }}
            onClick={() => setShowExitModal(true)}>
            🚪 Exit Exam
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 16 }}>
            Loading question…
          </div>
        ) : question ? (
          <QuestionContent cardStyle={{ ...S.cardFull, maxWidth: 760, margin: "0 auto", width: "100%", padding: "28px 40px" }} />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}>
            ⚠️ Failed to load question.
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXAM VIEW — NORMAL
  // ─────────────────────────────────────────────────────────────────────────
  const answered = Object.keys(answers).length;

  return (
    <div style={S.wrap} ref={containerRef}>
      <FontLoader />
      {showExitModal && <ExitModal />}
      {drawerOpen    && <NavigatorDrawer />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ ...S.title, fontSize: 18 }}>
            📝 {selectedExam.replace("_exam.json","").replace(/_/g," ")}
          </h1>
          <p style={S.subtitle}>{answered} of {totalQ} answered</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button style={{ ...S.btn, ...S.btnSec, fontSize: 13 }} onClick={() => setDrawerOpen(true)}>
            ☰ Questions
          </button>
          <button style={{ ...S.btn, background: "#1a1a2e", color: "#fff", fontSize: 13 }}
            onClick={enterFullscreen}>
            ⛶ Fullscreen
          </button>
          <button style={{ ...S.btn, ...S.btnWarn, fontSize: 13 }} onClick={() => setShowExitModal(true)}>
            🚪 Exit Exam
          </button>
        </div>
      </div>

      <div style={{ ...S.memoTag, background: memoMerged ? "#d1fae5" : "#fef9c3", color: memoMerged ? "#065f46" : "#92400e", marginBottom: 14 }}>
        {memoMerged ? "✅ Memo loaded — AI marking enabled" : "⚠️ No memo — AI feedback only"}
      </div>

      {loading ? (
        <div style={{ ...S.card, textAlign: "center", color: "#9ca3af", padding: 40 }}>Loading question…</div>
      ) : question ? (
        <QuestionContent cardStyle={S.card} />
      ) : (
        <div style={{ ...S.card, color: "#ef4444" }}>⚠️ Failed to load question.</div>
      )}
    </div>
  );
}