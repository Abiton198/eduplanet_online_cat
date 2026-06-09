import React, { useState, useEffect, useMemo } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, where, getDocs, doc, getDoc,
  or, onSnapshot,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
  ChevronDown, ChevronUp, Clock, BookOpen, Archive,
  Inbox, Target, CheckCircle, XCircle, Bot, Brain,
  BarChart2, Star, Zap,
} from 'lucide-react';

const API = 'https://chatbot-backend-educat.onrender.com';
import { useStudentId, getCachedStudentId } from '../utils/StudentId';

/* ── Grade normaliser ──────────────────────────────────────────────────────── */
const extractGradeNumber = (data = {}) => {
  if (data.grade) { const g = parseInt(String(data.grade).replace(/\D/g, ''), 10); if (!isNaN(g)) return g; }
  if (data.gradeYear) { const g = parseInt(String(data.gradeYear), 10); if (!isNaN(g)) return g; }
  if (data.exam) { const m = String(data.exam).match(/grade\s*(\d+)/i); if (m) return parseInt(m[1], 10); }
  return null;
};

/* ── Score theme ───────────────────────────────────────────────────────────── */
const getTheme = (pct) => {
  const p = parseFloat(pct);
  if (p >= 75) return { bg: 'bg-green-50 border-green-200', accent: 'bg-green-600', text: 'text-green-700', bar: 'bg-green-500' };
  if (p >= 50) return { bg: 'bg-blue-50 border-blue-200', accent: 'bg-blue-600', text: 'text-blue-700', bar: 'bg-blue-500' };
  return { bg: 'bg-red-50 border-red-200', accent: 'bg-red-500', text: 'text-red-700', bar: 'bg-red-500' };
};

const pctBg = (p) =>
  p >= 75 ? 'bg-green-100 text-green-800' : p >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800';

/* ── Shared UI atoms ───────────────────────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════════════════════
   AI RESULT CARD
══════════════════════════════════════════════════════════════════════════════ */
const AIResultCard = ({ res, expandedId, setExpandedId, examTitles }) => {
  const open = expandedId === res.id;
  const pct = res.percentage ?? 0;
  const theme = getTheme(pct);

  const [agentQ, setAgentQ] = useState('');
  const [agentReply, setAgentReply] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);

  const askAgent = async () => {
    const q = agentQ.trim();
    if (!q || agentLoading) return;
    setAgentLoading(true);
    setAgentReply('');
    try {
      const r = await fetch(`${API}/agent-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: getCachedStudentId(), message: q }),
      });
      const d = await r.json();
      setAgentReply(d.response || d.answer || 'No response.');
    } catch {
      setAgentReply('⚠️ Could not reach the agent.');
    } finally {
      setAgentLoading(false);
      setAgentQ('');
    }
  };

  const examLabel =
    (res.exam && examTitles[res.exam])
    || res.examTitle
    || (res.exam || 'Unknown Exam').replace(/_exam\.json$/, '').replace(/_/g, ' ');

  const dateLabel = res.completedAt
    ? new Date(res.completedAt.seconds ? res.completedAt.seconds * 1000 : res.completedAt).toLocaleString()
    : res.createdAt?.seconds
      ? new Date(res.createdAt.seconds * 1000).toLocaleString()
      : '—';

  return (
    <div className={`mb-3 border rounded-xl overflow-hidden shadow-sm ${theme.bg}`}>
      <div className="p-4 flex justify-between cursor-pointer hover:bg-white/40" onClick={() => setExpandedId(open ? null : res.id)}>
        <div className="flex gap-3">
          <div className={`p-2 rounded-lg ${theme.accent} text-white flex items-center`}><Bot size={16} /></div>
          <div>
            <h3 className="font-black text-[11px] text-gray-900">{examLabel}</h3>
            <p className="text-[9px] uppercase font-bold text-gray-400">AI Exam · {dateLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className={`font-black text-sm ${theme.text}`}>{pct}%</span>
            <p className="text-[9px] text-gray-400">{res.score ?? '?'}/{res.total ?? '?'}</p>
          </div>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      <div className="h-1 bg-gray-100">
        <div className={`h-1 ${theme.bar} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>

      {open && (
        <div className="bg-white border-t p-5">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Score" value={`${res.score ?? '?'}/${res.total ?? '?'}`} />
            <Stat label="Percentage" value={`${pct}%`} />
            <Stat label="Answered" value={res.answeredCount ?? Object.keys(res.answers || {}).length} />
          </div>

          {(res.markedResults ?? []).length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Question Breakdown</p>
              {res.markedResults.map((r, idx) => {
                const correct = r.status === 'correct';
                const partial = r.status === 'partial';
                const bc = correct ? 'border-green-500' : partial ? 'border-yellow-400' : 'border-red-500';
                const bg = correct ? 'bg-green-50' : partial ? 'bg-yellow-50' : 'bg-red-50';
                return (
                  <div key={idx} className={`p-3 rounded border-l-4 ${bg} ${bc}`}>
                    <div className="flex gap-2 items-start">
                      {correct
                        ? <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                        : <XCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-800">{r.question_number}. {r.question}</p>
                        <p className="text-[10px] mt-1">
                          <span className="text-gray-400">Your answer: </span>
                          <span className={correct ? 'text-green-700' : 'text-red-700 font-bold'}>{r.student_answer || 'No answer'}</span>
                        </p>
                        {!correct && (
                          <p className="text-[10px]">
                            <span className="text-gray-400">Correct: </span>
                            <span className="text-green-700 font-bold">{r.correct_answer || '—'}</span>
                          </p>
                        )}
                        {r.feedback && <p className="text-[10px] text-gray-500 mt-1 italic">{r.feedback}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">{r.earned ?? r.score ?? 0}/{r.marks} marks · {r.status}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {res.aiFeedback && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 text-[11px] text-indigo-800">
              🤖 <b>AI Feedback:</b> {res.aiFeedback}
            </div>
          )}

          <div className="bg-gray-50 border rounded-lg p-3">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Ask Agent About This Exam</p>
            {agentReply && (
              <div className="bg-white border border-indigo-100 rounded p-2 mb-2 text-[11px] text-gray-700 whitespace-pre-wrap">{agentReply}</div>
            )}
            <div className="flex gap-2">
              <input
                type="text" value={agentQ}
                onChange={e => setAgentQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') askAgent(); }}
                placeholder={`"Explain Q4.1" or "What should I revise?"`}
                className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-indigo-300"
              />
              <button onClick={askAgent} disabled={agentLoading || !agentQ.trim()}
                className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded disabled:opacity-40">
                {agentLoading ? '…' : 'Ask'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   LEGACY RESULT CARD
══════════════════════════════════════════════════════════════════════════════ */
const LegacyResultCard = ({ res, expandedId, setExpandedId }) => {
  const theme = getTheme(res.percentage);
  const open = expandedId === res.id;

  return (
    <div className={`mb-3 border rounded-xl overflow-hidden shadow-sm ${theme.bg}`}>
      <div className="p-4 flex justify-between cursor-pointer hover:bg-white/40" onClick={() => setExpandedId(open ? null : res.id)}>
        <div className="flex gap-3">
          <div className={`p-2 rounded-lg ${theme.accent} text-white`}><BookOpen size={16} /></div>
          <div>
            <h3 className="font-black text-[11px] text-gray-900">{res.exam}</h3>
            <p className="text-[9px] uppercase font-bold text-gray-400">Grade {res.grade || res.gradeYear} · {res.completedTime}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-black text-sm ${theme.text}`}>{res.percentage}%</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {open && (
        <div className="bg-white border-t p-5">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Stat label="Total Questions" value={res.totalQuestions} />
            <Stat label="Time" value={res.timeSpent} />
            <Stat label="Score" value={res.score} />
            <Stat label="Attempt" value={res.attempts || 1} />
          </div>
          <div className="space-y-2">
            {(res.answers ?? []).map((ans, idx) => {
              const correct = String(ans.answer || '').trim().toLowerCase() === String(ans.correctAnswer || '').trim().toLowerCase();
              return (
                <div key={idx} className={`p-3 rounded border-l-4 ${correct ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                  <div className="flex gap-2 items-start">
                    {correct ? <CheckCircle size={14} className="text-green-600 mt-0.5" /> : <XCircle size={14} className="text-red-600 mt-0.5" />}
                    <div>
                      <p className="text-[11px] font-bold text-gray-800">{idx + 1}. {ans.question}</p>
                      <p className="text-[10px] mt-1">
                        <span className="text-gray-400">Answered: </span>
                        <span className={correct ? 'text-green-700' : 'text-red-700 font-bold'}>{ans.answer || 'No Answer'}</span>
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

/* ══════════════════════════════════════════════════════════════════════════════
   PROGRESS DASHBOARD
══════════════════════════════════════════════════════════════════════════════ */
const ProgressDashboard = ({ studentId, aiAttempts, legacyCurrent, legacyHistory, examTitles }) => {
  const [agentData, setAgentData] = useState(null);
  const [agentQ, setAgentQ] = useState('');
  const [agentReply, setAgentReply] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    fetch(`${API}/dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId }),
    })
      .then(r => r.json())
      .then(d => setAgentData(d))
      .catch(() => { });
  }, [studentId]);

  const stats = useMemo(() => {
    const allScores = [];
    aiAttempts.forEach(a => {
      if (a.percentage == null) return;
      const title = (a.exam && examTitles[a.exam]) || a.examTitle || (a.exam || 'AI Exam').replace(/_/g, ' ');
      allScores.push({ pct: parseFloat(a.percentage), label: title, source: 'ai', date: a.createdAt?.seconds || 0 });
    });
    legacyCurrent.forEach(r => {
      if (r.percentage == null) return;
      allScores.push({ pct: parseFloat(r.percentage), label: r.exam, source: 'teacher', date: new Date(r.completedTime || 0).getTime() / 1000 });
    });
    legacyHistory.forEach(r => {
      if (r.percentage == null) return;
      allScores.push({ pct: parseFloat(r.percentage), label: r.exam, source: 'history', date: new Date(r.completedTime || 0).getTime() / 1000 });
    });
    allScores.sort((a, b) => a.date - b.date);
    const total = allScores.length;
    const avg = total ? Math.round(allScores.reduce((s, x) => s + x.pct, 0) / total) : null;
    const best = total ? Math.max(...allScores.map(x => x.pct)) : null;
    const latest = total ? allScores[allScores.length - 1] : null;
    const previous = total > 1 ? allScores[allScores.length - 2] : null;
    const trend = latest && previous ? latest.pct - previous.pct : null;
    const passing = allScores.filter(x => x.pct >= 50).length;
    const failing = allScores.filter(x => x.pct < 50).length;
    return { allScores, total, avg, best, latest, trend, passing, failing };
  }, [aiAttempts, legacyCurrent, legacyHistory, examTitles]);

  // Weak areas — from markedResults across all attempts
  const allWeakAreas = useMemo(() => {
    const map = new Map();
    aiAttempts.forEach(attempt => {
      (attempt.markedResults ?? []).forEach(r => {
        if (r.status === 'correct') return;
        const key = r.question_number || r.question?.slice(0, 40) || 'unknown';
        const existing = map.get(key);
        map.set(key, {
          key,
          count: (existing?.count || 0) + 1,
          text: existing?.text || r.question || '',
          type: r.type || 'open',
        });
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 12);
  }, [aiAttempts]);

  const recommendations = useMemo(() => {
    const recs = [];
    const { avg, trend, failing, total } = stats;
    if (total === 0) return [];
    if (avg >= 75) recs.push({ icon: '🌟', type: 'success', title: 'Excellent academic performance', body: 'You consistently demonstrate strong understanding. Keep challenging yourself with advanced questions.' });
    else if (avg >= 50) recs.push({ icon: '📈', type: 'info', title: 'Good progress with room for improvement', body: 'You have a solid foundation. Strengthening weaker concepts could push you to distinction level.' });
    else recs.push({ icon: '⚠️', type: 'danger', title: 'Foundational concepts require attention', body: 'Focus on rebuilding fundamental concepts before attempting advanced questions.' });
    if (trend !== null) {
      if (trend > 5) recs.push({ icon: '🚀', type: 'success', title: 'Learning trajectory is improving', body: 'Your recent performance shows measurable improvement. Keep up your study plan.' });
      if (trend < -5) recs.push({ icon: '📉', type: 'danger', title: 'Performance trend is declining', body: 'Recent assessments show a decrease. Review previous work before progressing.' });
    }
    if (allWeakAreas.length > 0) {
      const top3 = allWeakAreas.slice(0, 3).map(w => w.key).join(', ');
      recs.push({ icon: '🧠', type: 'warning', title: 'Concepts requiring revision', body: `Recurring gaps found in: ${top3}. Prioritise these before new material.` });
    }
    if (failing > 0) recs.push({ icon: '🔴', type: 'danger', title: `${failing} assessment${failing > 1 ? 's' : ''} below pass mark`, body: 'Revise the concepts identified and attempt similar questions again.' });
    return recs;
  }, [stats, allWeakAreas]);

  const askAgent = async () => {
    const q = agentQ.trim();
    if (!q || asking) return;
    setAsking(true);
    setAgentReply('');
    try {
      const r = await fetch(`${API}/agent-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, message: q }),
      });
      const d = await r.json();
      setAgentReply(d.response || d.answer || 'No response.');
    } catch {
      setAgentReply('⚠️ Could not reach the agent.');
    } finally {
      setAsking(false);
      setAgentQ('');
    }
  };

  const maxWrong = Math.max(1, ...allWeakAreas.map(w => w.count));

  return (
    <div className="space-y-5">

      {/* Score summary cards */}
      {stats.total > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Overall Average', value: stats.avg != null ? `${stats.avg}%` : '—', sub: `${stats.total} exam${stats.total !== 1 ? 's' : ''}`, color: pctBg(stats.avg || 0) },
              { label: 'Best Result', value: stats.best != null ? `${Math.round(stats.best)}%` : '—', sub: stats.allScores.find(x => x.pct === stats.best)?.label || '', color: 'bg-green-100 text-green-800' },
              { label: 'Latest Result', value: stats.latest ? `${Math.round(stats.latest.pct)}%` : '—', sub: stats.latest?.label || '', color: pctBg(stats.latest?.pct || 0) },
              { label: 'Trend', value: stats.trend != null ? (stats.trend > 0 ? `▲ +${Math.round(stats.trend)}%` : `▼ ${Math.round(stats.trend)}%`) : '—', sub: 'vs previous exam', color: stats.trend == null ? 'bg-gray-100 text-gray-600' : stats.trend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' },
            ].map((c, i) => (
              <div key={i} className={`rounded-xl p-4 ${c.color}`}>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">{c.label}</p>
                <p className="text-2xl font-black leading-none">{c.value}</p>
                <p className="text-[10px] mt-1 opacity-60 truncate">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Timeline bar */}
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-3 flex items-center gap-2">
              <BarChart2 size={12} /> All Exam Results Timeline
            </p>
            <div className="flex items-end gap-1.5 h-20">
              {stats.allScores.map((s, i) => {
                const h = Math.max(4, Math.round((s.pct / 100) * 80));
                const col = s.pct >= 75 ? 'bg-green-500' : s.pct >= 50 ? 'bg-blue-500' : 'bg-red-400';
                const src = s.source === 'ai' ? '🤖' : s.source === 'teacher' ? '📝' : '📦';
                return (
                  <div key={i} className="flex flex-col items-center flex-1 min-w-0" title={`${s.label}: ${Math.round(s.pct)}%`}>
                    <span className="text-[8px] text-gray-500 mb-0.5">{Math.round(s.pct)}%</span>
                    <div className={`w-full rounded-t ${col}`} style={{ height: h }} />
                    <span className="text-[7px] mt-0.5">{src}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-[9px] text-gray-400">
              <span>🤖 AI exam</span><span>📝 Teacher</span><span>📦 History</span>
            </div>
          </div>

          {/* Pass/fail */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-green-700">{stats.passing}</p>
              <p className="text-[9px] font-black uppercase text-green-500">Passed (≥50%)</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-600">{stats.failing}</p>
              <p className="text-[9px] font-black uppercase text-red-400">Below 50%</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-indigo-700">{stats.total}</p>
              <p className="text-[9px] font-black uppercase text-indigo-400">Total Exams</p>
            </div>
          </div>
        </>
      ) : (
        <Empty icon={Clock} text="No exam results yet — complete some exams to see your progress" />
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-3">💡 Personalised Recommendations</p>
          <div className="space-y-3">
            {recommendations.map((r, i) => {
              const styles = { success: 'bg-green-50 border-green-200', info: 'bg-blue-50 border-blue-200', warning: 'bg-amber-50 border-amber-200', danger: 'bg-red-50 border-red-200' };
              return (
                <div key={i} className={`border rounded-lg p-3 ${styles[r.type] || styles.info}`}>
                  <p className="font-black text-[11px] mb-0.5">{r.icon} {r.title}</p>
                  <p className="text-[11px] opacity-80 leading-relaxed">{r.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weak areas */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase text-gray-400 mb-3 flex items-center gap-2">
          <Brain size={12} /> Weak Areas — All Exams Combined
        </p>
        {allWeakAreas.length === 0 ? (
          <div className="text-center py-6">
            <Star size={24} className="mx-auto text-green-400 mb-2" />
            <p className="text-[11px] text-green-600 font-bold">No significant weak areas detected — excellent work!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {allWeakAreas.map((w, i) => {
              const barPct = Math.round((w.count / maxWrong) * 100);
              const col = barPct > 66 ? 'bg-red-500' : barPct > 33 ? 'bg-amber-400' : 'bg-blue-400';
              return (
                <div key={i}>
                  <div className="flex justify-between text-[10px] text-gray-600 mb-0.5">
                    <span className="font-black">{w.key} <span className="font-normal text-gray-400">({w.type})</span></span>
                    <span className="text-red-500 font-bold">{w.count}× wrong</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded">
                    <div className={`h-2 rounded ${col} transition-all`} style={{ width: `${barPct}%` }} />
                  </div>
                  {w.text && <p className="text-[9px] text-gray-400 mt-0.5 truncate">{w.text}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Study plan from /dashboard API */}
      {agentData?.study_plan && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-indigo-400 mb-1 flex items-center gap-2">
            <Zap size={12} /> AI Study Plan
          </p>
          <p className="text-[9px] text-indigo-300 mb-2">Updated: {agentData.study_plan.updated_at}</p>
          <p className="text-[11px] text-indigo-800 whitespace-pre-wrap leading-relaxed">{agentData.study_plan.plan}</p>
        </div>
      )}

      {/* AI Academic Mentor — INSIDE ProgressDashboard */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl p-5 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-black">AI Academic Mentor</h3>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Personalised Coaching Based On All Your Assessments</p>
          </div>
        </div>

        {agentReply && (
          <div className="bg-white/10 rounded-xl p-4 mb-4 border border-white/10 whitespace-pre-wrap text-[12px] leading-relaxed">
            {agentReply}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {[
            "What is my weakest concept?",
            "Create today's study plan",
            "Explain my last mistakes",
            "Generate practice questions",
            "Am I improving?",
            "Prepare me for my next exam",
            "How can I reach distinction?",
            "Test my understanding",
          ].map((prompt, index) => (
            <button key={index} onClick={() => setAgentQ(prompt)}
              className="bg-white/10 hover:bg-indigo-500 transition-all rounded-lg p-2 text-[10px] text-left">
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={agentQ}
            onChange={e => setAgentQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') askAgent(); }}
            placeholder="Ask your AI Mentor anything about your learning..."
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-sm placeholder-slate-400 outline-none"
          />
          <button onClick={askAgent} disabled={asking}
            className="bg-indigo-600 hover:bg-indigo-700 px-5 rounded-lg font-bold">
            {asking ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </div>

    </div>
  );
};  // ← ProgressDashboard ends here

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — ExamResultsDisplay (single export, defined once)
══════════════════════════════════════════════════════════════════════════════ */
export default function ExamResultsDisplay() {
  const [legacyHistory, setLegacyHistory] = useState([]);
  const [legacyCurrent, setLegacyCurrent] = useState([]);
  const [aiAttempts, setAiAttempts] = useState([]);
  const [examTitles, setExamTitles] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [currentGrade, setCurrentGrade] = useState(null);
  const [activeTab, setActiveTab] = useState('insights');
  const studentId = useStudentId();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'exams'), snap => {
      const map = {};
      snap.forEach(d => { map[d.id] = d.data().title || d.id; });
      setExamTitles(map);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      try {
        setLoading(true);
        const profileSnap = await getDoc(doc(db, 'students', user.uid));
        const profile = profileSnap.exists() ? profileSnap.data() : {};
        const studentName = (profile.name || user.displayName || '').trim();
        const grade = extractGradeNumber(profile) || 12;
        setCurrentGrade(grade);

        const legacySnap = await getDocs(query(
          collection(db, 'examResults'),
          or(where('studentId', '==', user.uid), where('name', '==', studentName))
        ));
        const hist = [], curr = [];
        legacySnap.forEach(docSnap => {
          const data = docSnap.data();
          const g = extractGradeNumber(data);
          if (!g) return;
          const rec = { id: docSnap.id, ...data };
          g === grade ? curr.push(rec) : g < grade && hist.push(rec);
        });
        const sortDate = arr => arr.sort((a, b) => new Date(b.completedTime || 0) - new Date(a.completedTime || 0));
        setLegacyCurrent(sortDate(curr));
        setLegacyHistory(sortDate(hist));

        const sid = studentId || '';
        const [uidDocs, sidDocs] = await Promise.all([
          getDocs(query(collection(db, 'exam_attempts'), where('studentId', '==', user.uid))),
          sid ? getDocs(query(collection(db, 'exam_attempts'), where('studentId', '==', sid))) : Promise.resolve({ docs: [] }),
        ]);

        const map = new Map();
        [...uidDocs.docs, ...sidDocs.docs].forEach(docSnap => {
          if (map.has(docSnap.id)) return;
          const d = docSnap.data();
          map.set(docSnap.id, { id: docSnap.id, ...d, examTitle: examTitles[d.exam] || d.examTitle || d.exam });
        });
        setAiAttempts([...map.values()].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      } catch (err) {
        console.error('ExamResultsDisplay:', err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [studentId, examTitles]);

  const totalExams = aiAttempts.length + legacyCurrent.length + legacyHistory.length;
  const overallAverage = totalExams
    ? Math.round([...aiAttempts, ...legacyCurrent, ...legacyHistory].reduce((s, x) => s + Number(x.percentage || 0), 0) / totalExams)
    : 0;

  const tabs = [
    { id: 'insights', label: '🧠 My Progress', count: totalExams },
    { id: 'ai', label: '🤖 AI Exams', count: aiAttempts.length },
    { id: 'current', label: `📈 Grade ${currentGrade || 12}`, count: legacyCurrent.length },
    { id: 'history', label: '📦 History', count: legacyHistory.length },
  ];

  if (loading) return (
    <div className="p-20 text-center font-black text-indigo-600 animate-pulse">
      ACCESSING AI ACADEMIC RECORDS...
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4">

      {studentId && (
        <div className="flex items-center gap-3 mb-5 p-4 bg-slate-800 rounded-xl text-white">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-black">
            {studentId.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-black">{studentId}</p>
            <p className="text-xs text-slate-400">{totalExams} Exams • {overallAverage}% Average</p>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            {!!aiAttempts.length && <span className="px-2 py-1 rounded bg-indigo-600 text-xs">{aiAttempts.length} AI</span>}
            {!!legacyCurrent.length && <span className="px-2 py-1 rounded bg-blue-600 text-xs">{legacyCurrent.length} Current</span>}
            {!!legacyHistory.length && <span className="px-2 py-1 rounded bg-slate-600 text-xs">{legacyHistory.length} History</span>}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-5">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black ${activeTab === tab.id ? 'bg-slate-800 text-white' : 'bg-white border text-gray-500'}`}>
            {tab.label} <span className="ml-2">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'insights' && (
        <ProgressDashboard
          studentId={studentId}
          aiAttempts={aiAttempts}
          legacyCurrent={legacyCurrent}
          legacyHistory={legacyHistory}
          examTitles={examTitles}
        />
      )}

      {activeTab === 'ai' && (
        <>
          <Header icon={Bot} title="AI Exam Intelligence" sub={`Student: ${studentId}`} />
          {!aiAttempts.length ? <Empty icon={Clock} text="No AI exams yet" /> :
            aiAttempts.map(r => (
              <AIResultCard key={r.id} res={r} expandedId={expandedId} setExpandedId={setExpandedId} examTitles={examTitles} />
            ))}
        </>
      )}

      {activeTab === 'current' && (
        <>
          <Header icon={Target} title={`Grade ${currentGrade} Results`} />
          {!legacyCurrent.length ? <Empty icon={Clock} text="No Current Results" /> :
            legacyCurrent.map(r => (
              <LegacyResultCard key={r.id} res={r} expandedId={expandedId} setExpandedId={setExpandedId} />
            ))}
        </>
      )}

      {activeTab === 'history' && (
        <>
          <Header icon={Archive} title="Academic History" />
          {!legacyHistory.length ? <Empty icon={Inbox} text="No History" /> :
            legacyHistory.map(r => (
              <LegacyResultCard key={r.id} res={r} expandedId={expandedId} setExpandedId={setExpandedId} />
            ))}
        </>
      )}

    </div>
  );
}