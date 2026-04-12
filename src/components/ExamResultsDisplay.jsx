import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, or, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
  ChevronDown, ChevronUp, Clock, BookOpen, Archive,
  Inbox, Target, CheckCircle, XCircle, Bot, Brain, TrendingUp
} from 'lucide-react';

const API = "https://abitonp.pythonanywhere.com";

// Same key as CATTutor + AIExamMocker — reads the same persistent ID
const getStudentId = () => {
  if (typeof window === "undefined") return null;
  let sid = localStorage.getItem("educat_sid");
  if (!sid) { sid = "stu_" + Math.random().toString(36).slice(2,10); localStorage.setItem("educat_sid", sid); }
  return sid;
};

/* ── Grade normaliser ───────────────────────────────────────────────────── */
const extractGradeNumber = (data = {}) => {
  if (data.grade)     { const g = parseInt(String(data.grade).replace(/\D/g,''),10);     if (!isNaN(g)) return g; }
  if (data.gradeYear) { const g = parseInt(String(data.gradeYear),10);                   if (!isNaN(g)) return g; }
  if (data.exam)      { const m = String(data.exam).match(/grade\s*(\d+)/i);             if (m) return parseInt(m[1],10); }
  return null;
};

/* ── Score colour theme ─────────────────────────────────────────────────── */
const getTheme = (pct) => {
  const p = parseFloat(pct);
  if (p >= 75) return { bg:'bg-green-50 border-green-200', accent:'bg-green-600', text:'text-green-700', bar:'bg-green-500' };
  if (p >= 50) return { bg:'bg-blue-50 border-blue-200',   accent:'bg-blue-600',  text:'text-blue-700',  bar:'bg-blue-500'  };
  return         { bg:'bg-red-50 border-red-200',     accent:'bg-red-500',   text:'text-red-700',   bar:'bg-red-500'   };
};

/* ── Small helpers ──────────────────────────────────────────────────────── */
const Stat = ({ label, value }) => (
  <div className="bg-gray-50 p-2 rounded border text-center">
    <p className="text-[8px] uppercase font-black text-gray-400">{label}</p>
    <p className="text-xs font-bold text-gray-800">{value ?? '—'}</p>
  </div>
);

const Header = ({ icon: Icon, title, sub }) => (
  <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl text-white bg-slate-800">
    <Icon size={18} />
    <div>
      <h2 className="font-black uppercase tracking-widest text-xs">{title}</h2>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const Empty = ({ icon: Icon, text }) => (
  <div className="text-center py-16 border-2 border-dashed rounded-3xl bg-gray-50">
    <Icon size={32} className="mx-auto text-gray-200 mb-2" />
    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{text}</p>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   AI EXAM RESULT CARD
   Shows one attempt from exam_attempts (Firestore) merged with the
   marked results returned by the EduCAT backend at submit time.
   The marked results are stored in the Firestore doc under `markedResults`.
══════════════════════════════════════════════════════════════════════════ */
const AIResultCard = ({ res, expandedId, setExpandedId }) => {
  const open  = expandedId === res.id;
  const pct   = res.percentage ?? 0;
  const theme = getTheme(pct);

  // Agent follow-up state (ask about this specific result)
  const [agentQ, setAgentQ]           = useState("");
  const [agentReply, setAgentReply]   = useState("");
  const [agentLoading, setAgentLoading] = useState(false);

  const askAgent = async () => {
    const q = agentQ.trim();
    if (!q || agentLoading) return;
    setAgentLoading(true);
    setAgentReply("");
    try {
      const sid = getStudentId();
      const r   = await fetch(`${API}/agent-chat`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ student_id: sid, message: q })
      });
      const d = await r.json();
      setAgentReply(d.response || d.answer || "No response.");
    } catch { setAgentReply("⚠️ Could not reach the agent."); }
    finally  { setAgentLoading(false); setAgentQ(""); }
  };

  const examLabel = (res.exam || "Unknown Exam").replace(/_exam\.json$/,"").replace(/_/g," ");
  const dateLabel = res.completedAt
    ? new Date(res.completedAt.seconds ? res.completedAt.seconds*1000 : res.completedAt).toLocaleString()
    : res.createdAt?.seconds
      ? new Date(res.createdAt.seconds*1000).toLocaleString()
      : "—";

  return (
    <div className={`mb-3 border rounded-xl overflow-hidden shadow-sm ${theme.bg}`}>
      {/* Header row */}
      <div className="p-4 flex justify-between cursor-pointer hover:bg-white/40"
        onClick={() => setExpandedId(open ? null : res.id)}>
        <div className="flex gap-3">
          <div className={`p-2 rounded-lg ${theme.accent} text-white flex items-center`}>
            <Bot size={16} />
          </div>
          <div>
            <h3 className="font-black text-[11px] text-gray-900">{examLabel}</h3>
            <p className="text-[9px] uppercase font-bold text-gray-400">AI Exam · {dateLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className={`font-black text-sm ${theme.text}`}>{pct}%</span>
            <p className="text-[9px] text-gray-400">{res.score ?? "?"}/{res.total ?? "?"}</p>
          </div>
          {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1 bg-gray-100">
        <div className={`h-1 ${theme.bar} transition-all`} style={{ width:`${Math.min(pct,100)}%` }} />
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="bg-white border-t p-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Score"      value={`${res.score ?? "?"}/${res.total ?? "?"}`} />
            <Stat label="Percentage" value={`${pct}%`} />
            <Stat label="Answered"   value={res.answeredCount ?? Object.keys(res.answers||{}).length} />
          </div>

          {/* Per-question marked results */}
          {res.markedResults?.length > 0 ? (
            <div className="space-y-2 mb-4">
              <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Question Breakdown</p>
              {res.markedResults.map((r, idx) => {
                const correct = r.status === "correct";
                const partial = r.status === "partial";
                const borderCol = correct ? "border-green-500" : partial ? "border-yellow-400" : "border-red-500";
                const bgCol     = correct ? "bg-green-50"      : partial ? "bg-yellow-50"     : "bg-red-50";
                return (
                  <div key={idx} className={`p-3 rounded border-l-4 ${bgCol} ${borderCol}`}>
                    <div className="flex gap-2 items-start">
                      {correct
                        ? <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0"/>
                        : <XCircle    size={14} className="text-red-600   mt-0.5 flex-shrink-0"/>
                      }
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-800">
                          {r.question_number}. {r.question}
                        </p>
                        <p className="text-[10px] mt-1">
                          <span className="text-gray-400">Your answer: </span>
                          <span className={correct ? "text-green-700" : "text-red-700 font-bold"}>
                            {r.student_answer || "No answer"}
                          </span>
                        </p>
                        {!correct && (
                          <p className="text-[10px]">
                            <span className="text-gray-400">Correct: </span>
                            <span className="text-green-700 font-bold">{r.correct_answer || "—"}</span>
                          </p>
                        )}
                        {r.feedback && (
                          <p className="text-[10px] text-gray-500 mt-1 italic">{r.feedback}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {r.earned ?? r.score ?? 0}/{r.marks} marks · {r.status}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 italic mb-4">
              Detailed question breakdown not available for this attempt.
            </p>
          )}

          {/* AI feedback summary */}
          {res.aiFeedback && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 text-[11px] text-indigo-800">
              🤖 <b>AI Feedback:</b> {res.aiFeedback}
            </div>
          )}

          {/* Agent follow-up */}
          <div className="bg-gray-50 border rounded-lg p-3">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Ask Agent About This Exam</p>
            {agentReply && (
              <div className="bg-white border border-indigo-100 rounded p-2 mb-2 text-[11px] text-gray-700 whitespace-pre-wrap">
                {agentReply}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={agentQ}
                onChange={e => setAgentQ(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter") askAgent(); }}
                placeholder={`e.g. "Explain Q4.1" or "What should I revise?"`}
                className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-indigo-300"
              />
              <button
                onClick={askAgent}
                disabled={agentLoading || !agentQ.trim()}
                className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded disabled:opacity-40">
                {agentLoading ? "…" : "Ask"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   LEGACY FIRESTORE RESULT CARD (examResults collection)
   Unchanged from your original, just pulled out cleanly.
══════════════════════════════════════════════════════════════════════════ */
const LegacyResultCard = ({ res, expandedId, setExpandedId }) => {
  const theme = getTheme(res.percentage);
  const open  = expandedId === res.id;

  return (
    <div className={`mb-3 border rounded-xl overflow-hidden shadow-sm ${theme.bg}`}>
      <div className="p-4 flex justify-between cursor-pointer hover:bg-white/40"
        onClick={() => setExpandedId(open ? null : res.id)}>
        <div className="flex gap-3">
          <div className={`p-2 rounded-lg ${theme.accent} text-white`}><BookOpen size={16}/></div>
          <div>
            <h3 className="font-black text-[11px] text-gray-900">{res.exam}</h3>
            <p className="text-[9px] uppercase font-bold text-gray-400">
              Grade {res.grade || res.gradeYear} · {res.completedTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-black text-sm ${theme.text}`}>{res.percentage}%</span>
          {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </div>
      </div>

      {open && (
        <div className="bg-white border-t p-5">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Stat label="Total Questions" value={res.totalQuestions}/>
            <Stat label="Time"            value={res.timeSpent}/>
            <Stat label="Score"           value={res.score}/>
            <Stat label="Attempt"         value={res.attempts||1}/>
            <Stat label="Unanswered"      value={res.unanswered||0}/>
          </div>
          <div className="space-y-2">
            {res.answers?.map((ans,idx)=>{
              const correct = String(ans.answer).trim().toLowerCase() === String(ans.correctAnswer).trim().toLowerCase();
              return (
                <div key={idx} className={`p-3 rounded border-l-4 ${correct?'bg-green-50 border-green-500':'bg-red-50 border-red-500'}`}>
                  <div className="flex gap-2 items-start">
                    {correct
                      ? <CheckCircle size={14} className="text-green-600 mt-0.5"/>
                      : <XCircle    size={14} className="text-red-600   mt-0.5"/>
                    }
                    <div>
                      <p className="text-[11px] font-bold text-gray-800">{idx+1}. {ans.question}</p>
                      <p className="text-[10px] mt-1">
                        <span className="text-gray-400">Answered: </span>
                        <span className={correct?'text-green-700':'text-red-700 font-bold'}>{ans.answer||"No Answer"}</span>
                      </p>
                      {!correct && (
                        <p className="text-[10px]">
                          <span className="text-gray-400">Correct: </span>
                          <span className="text-green-700 font-bold">{ans.correctAnswer}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   AGENT DASHBOARD PANEL
   Shows weak topics + study plan from the EduCAT SQLite backend.
══════════════════════════════════════════════════════════════════════════ */
const AgentDashboard = ({ studentId }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    fetch(`${API}/dashboard`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ student_id: studentId })
    })
    .then(r => r.json())
    .then(d => { setData(d); setLoading(false); })
    .catch(() => setLoading(false));
  }, [studentId]);

  if (loading) return <p className="text-[10px] text-gray-400 animate-pulse p-4">Loading AI insights…</p>;
  if (!data)   return <p className="text-[10px] text-gray-400 p-4">No AI data available.</p>;

  const weak     = data.weak || [];
  const sessions = data.sessions || [];
  const plan     = data.study_plan;
  const maxWrong = Math.max(1, ...weak.map(w => w.wrong_count));

  return (
    <div className="space-y-4">
      {/* Weak topics */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase text-gray-400 mb-3 flex items-center gap-2">
          <Brain size={12}/> Weak Areas (tracked by AI)
        </p>
        {weak.length === 0
          ? <p className="text-[11px] text-gray-400 italic">No weak areas recorded — take some AI exams first.</p>
          : weak.map((w,i) => {
              const pct = Math.round((w.wrong_count/maxWrong)*100);
              const col = pct > 66 ? "bg-red-500" : pct > 33 ? "bg-yellow-400" : "bg-blue-400";
              return (
                <div key={i} className="mb-2">
                  <div className="flex justify-between text-[10px] text-gray-600 mb-0.5">
                    <span className="font-bold">Q{w.question_number} <span className="font-normal text-gray-400">({w.q_type})</span></span>
                    <span className="text-red-500 font-bold">{w.wrong_count}× wrong</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded">
                    <div className={`h-1.5 rounded ${col} transition-all`} style={{width:`${pct}%`}}/>
                  </div>
                  {w.question_text && (
                    <p className="text-[9px] text-gray-400 mt-0.5 truncate">{w.question_text}</p>
                  )}
                </div>
              );
            })
        }
      </div>

      {/* Recent AI sessions */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase text-gray-400 mb-3 flex items-center gap-2">
          <TrendingUp size={12}/> Recent AI Exam Sessions
        </p>
        {sessions.length === 0
          ? <p className="text-[11px] text-gray-400 italic">No sessions yet.</p>
          : sessions.map((s,i) => {
              const col = s.percentage >= 70 ? "text-green-600" : s.percentage >= 50 ? "text-yellow-600" : "text-red-600";
              return (
                <div key={i} className="flex justify-between items-center py-1.5 border-b last:border-0 text-[11px]">
                  <span className="text-gray-700 truncate max-w-[60%]">
                    {(s.exam_name||"").replace("_exam.json","").replace(/_/g," ")}
                  </span>
                  <span className={`font-black ${col}`}>{s.score}/{s.total} ({s.percentage}%)</span>
                </div>
              );
            })
        }
      </div>

      {/* Study plan */}
      {plan && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-indigo-400 mb-2">📋 AI Study Plan</p>
          <p className="text-[9px] text-indigo-300 mb-2">Updated: {plan.updated_at}</p>
          <p className="text-[11px] text-indigo-800 whitespace-pre-wrap leading-relaxed">{plan.plan}</p>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function ExamResultsDisplay() {
  const [legacyHistory, setLegacyHistory] = useState([]);  // examResults, grade < current
  const [legacyCurrent, setLegacyCurrent] = useState([]);  // examResults, grade === current
  const [aiAttempts,    setAiAttempts]    = useState([]);  // exam_attempts (AI mocker)
  const [loading,       setLoading]       = useState(true);
  const [expandedId,    setExpandedId]    = useState(null);
  const [currentGrade,  setCurrentGrade]  = useState(null);
  const [activeTab,     setActiveTab]     = useState("ai"); // "ai" | "history" | "current"

  const studentId = getStudentId(); // localStorage persistent ID

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }

      try {
        /* ── Student profile ──────────────────────────────── */
        const profileSnap = await getDoc(doc(db, 'students', user.uid));
        const profileData = profileSnap.exists() ? profileSnap.data() : {};
        const studentName  = (profileData.name || user.displayName || "").trim();
        const studentGrade = extractGradeNumber(profileData) || 12;
        setCurrentGrade(studentGrade);

        /* ── Legacy examResults ───────────────────────────── */
        const legacyQ = query(
          collection(db, 'examResults'),
          or(
            where('studentId', '==', user.uid),
            where('name',      '==', studentName)
          )
        );
        const legacySnap = await getDocs(legacyQ);
        const hist = [], curr = [];
        legacySnap.forEach(d => {
          const data  = d.data();
          const grade = extractGradeNumber(data);
          if (!grade) return;
          const rec = { id: d.id, ...data };
          if (grade <  studentGrade) hist.push(rec);
          if (grade === studentGrade) curr.push(rec);
        });
        const sortDate = arr => arr.sort((a,b) =>
          new Date(b.completedTime||b.completedDate) - new Date(a.completedTime||a.completedDate));
        setLegacyHistory(sortDate(hist));
        setLegacyCurrent(sortDate(curr));

        /* ── AI exam_attempts ─────────────────────────────── */
        // Query by Firebase UID and by localStorage student ID so both match
        const aiQueries = [
          getDocs(query(collection(db,'exam_attempts'), where('studentId','==',user.uid),     orderBy('createdAt','desc'))),
          getDocs(query(collection(db,'exam_attempts'), where('studentId','==',studentId || ""), orderBy('createdAt','desc'))),
        ];
        const [byUid, bySid] = await Promise.all(aiQueries);

        const aiMap = new Map();
        [...byUid.docs, ...bySid.docs].forEach(d => {
          if (!aiMap.has(d.id)) aiMap.set(d.id, { id: d.id, ...d.data() });
        });
        setAiAttempts([...aiMap.values()].sort((a,b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        }));

      } catch(e) { console.error("ExamResultsDisplay fetch error:", e); }
      finally    { setLoading(false); }
    });
    return () => unsub();
  }, [studentId]);

  /* ── Tabs ──────────────────────────────────────────────────────────────── */
  const tabs = [
    { id:"ai",      label:"🤖 AI Exams",        count: aiAttempts.length    },
    { id:"current", label:`📈 Grade ${currentGrade||12}`, count: legacyCurrent.length },
    { id:"history", label:"📦 History",          count: legacyHistory.length },
    { id:"insights",label:"🧠 AI Insights",      count: null                 },
  ];

  if (loading) {
    return (
      <div className="p-20 text-center font-black text-indigo-600 animate-pulse text-[10px] tracking-[0.4em]">
        ACCESSING ACADEMIC RECORDS…
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4" style={{ fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');`}</style>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              activeTab===t.id
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
            }`}>
            {t.label}
            {t.count !== null && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                activeTab===t.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── AI Exams tab ──────────────────────────────────────────────── */}
      {activeTab === "ai" && (
        <div>
          <Header icon={Bot} title="AI Exam Mocker Results"
            sub={`Student ID: ${studentId || "not set"}`} />
          {aiAttempts.length === 0
            ? <Empty icon={Clock} text="No AI exam attempts yet — try the Exam Mocker!" />
            : aiAttempts.map(r => (
                <AIResultCard key={r.id} res={r}
                  expandedId={expandedId} setExpandedId={setExpandedId} />
              ))
          }
        </div>
      )}

      {/* ── Current grade tab ─────────────────────────────────────────── */}
      {activeTab === "current" && (
        <div>
          <Header icon={Target} title={`Grade ${currentGrade} Progress`} />
          {legacyCurrent.length === 0
            ? <Empty icon={Clock} text={`Waiting for Grade ${currentGrade} Results`} />
            : legacyCurrent.map(r => (
                <LegacyResultCard key={r.id} res={r}
                  expandedId={expandedId} setExpandedId={setExpandedId} />
              ))
          }
        </div>
      )}

      {/* ── History tab ───────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div>
          <Header icon={Archive} title="Previous Grade History" />
          {legacyHistory.length === 0
            ? <Empty icon={Inbox} text="No Archived Records" />
            : legacyHistory.map(r => (
                <LegacyResultCard key={r.id} res={r}
                  expandedId={expandedId} setExpandedId={setExpandedId} />
              ))
          }
        </div>
      )}

      {/* ── AI Insights tab ───────────────────────────────────────────── */}
      {activeTab === "insights" && (
        <div>
          <Header icon={Brain} title="AI Agent Insights"
            sub="Weak areas and study plan from your AI exam sessions" />
          <AgentDashboard studentId={studentId} />
        </div>
      )}
    </div>
  );
}