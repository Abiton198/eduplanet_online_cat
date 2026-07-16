/**
 * AIMentor.jsx — Dynamic AI Academic Mentor
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop this component into your ExamPage or StudentDashboard wherever
 * the chat currently lives.
 *
 * Props:
 *   studentId    — student identifier (for avatar initial)
 *   examResults  — array of the student's exam attempt documents from Firestore
 *                  Each should have: { examId, title, subject, score, total,
 *                    percentage, conceptGaps, feedback, uploadedAt }
 *   apiUrl       — your Flask backend URL (import.meta.env.VITE_API_URL)
 *   authToken    — Firebase ID token for the Authorization header
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, ChevronDown, Sparkles, Send, Trash2 } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────

function getGrade(pct) {
    if (pct >= 80) return { label: 'Distinction', color: 'text-emerald-400' };
    if (pct >= 70) return { label: 'Merit', color: 'text-blue-400' };
    if (pct >= 60) return { label: 'Pass', color: 'text-yellow-400' };
    if (pct >= 50) return { label: 'Pass', color: 'text-yellow-500' };
    return { label: 'Below Pass', color: 'text-red-400' };
}

function formatDate(ts) {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Build dynamic prompt suggestions based on selected exam
function buildPrompts(result) {
    if (!result) return [
        'What is my weakest concept?',
        'Am I improving overall?',
        'Explain my recent mistakes',
        'Create a full study guide',
        'Give me practice questions',
        'Test my understanding now',
    ];

    const subject = result.subject || 'this subject';
    const pct = result.percentage ?? 0;
    const gaps = result.conceptGaps || [];
    const weak = gaps[0] || `key concepts in ${subject}`;
    const weak2 = gaps[1] || `related topics`;

    return [
        // Performance-aware prompts
        pct < 50
            ? `I failed ${subject} — where do I start to improve?`
            : pct < 70
                ? `I passed ${subject} but want to do better — help me`
                : `I did well in ${subject} — how do I get a distinction?`,

        // Concept-specific prompts from actual gaps
        gaps.length > 0
            ? `Explain ${weak} in simple terms`
            : `What are the most important concepts in ${subject}?`,

        gaps.length > 1
            ? `Teach me ${weak2} step by step`
            : `Give me exam tips for ${subject}`,

        // Practice
        `Create 5 practice questions on ${weak}`,
        `Test my understanding of ${subject} now`,
        `Build me a study plan for ${subject}`,
    ];
}

// Build the system context sent to the AI on every message
function buildSystemContext(result, allResults) {
    if (!result) {
        return `You are a helpful AI academic mentor for a student using the Eduket OS platform.
Help the student understand their subjects, fill knowledge gaps, and improve their exam performance.
Be encouraging, clear, and use simple language appropriate for school learners.`;
    }

    const pct = result.percentage ?? 0;
    const grade = getGrade(pct);
    const gaps = (result.conceptGaps || []).join(', ') || 'none identified';
    const subject = result.subject || 'Unknown subject';
    const title = result.title || subject;

    // Build brief history of all results for context
    const history = allResults
        .slice(0, 5)
        .map(r => `  - ${r.subject || r.title}: ${r.percentage ?? 0}%`)
        .join('\n');

    return `You are an AI academic mentor on the Eduket OS platform, helping a student improve.

CURRENT FOCUS — EXAM SELECTED BY STUDENT:
  Exam:        ${title}
  Subject:     ${subject}
  Score:       ${result.score ?? 0} / ${result.total ?? 0} (${pct}%)
  Grade:       ${grade.label}
  Date:        ${formatDate(result.uploadedAt)}
  Concept gaps identified: ${gaps}
  AI feedback: ${result.feedback || 'Not available'}

STUDENT PERFORMANCE HISTORY (recent exams):
${history || '  No previous results available'}

YOUR ROLE:
- Answer all questions specifically about THIS exam and subject
- When explaining concepts, reference the student's actual gaps listed above
- If asked about other subjects, use the history above for context
- Be encouraging — celebrate progress and frame gaps as opportunities
- Use simple, clear language for school learners
- When giving practice questions, match the difficulty of the exam they wrote
- Do not give away exam answers — teach the concepts instead

Always personalise your response using the student's actual performance data above.`;
}


// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════

export function AIMentor({ studentId, examResults = [], apiUrl, authToken }) {
    const [selectedResult, setSelectedResult] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [agentQ, setAgentQ] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatScrollRef = useRef(null);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Sort results newest first
    const sortedResults = [...examResults].sort((a, b) => {
        const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(a.uploadedAt || 0);
        const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(b.uploadedAt || 0);
        return dateB - dateA;
    });

    // Auto-select the most recent result
    useEffect(() => {
        if (sortedResults.length > 0 && !selectedResult) {
            setSelectedResult(sortedResults[0]);
        }
    }, [examResults]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatHistory, isTyping]);

    // Close dropdown on outside click
    useEffect(() => {
        const fn = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    // Reset chat when exam selection changes
    const handleSelectResult = (result) => {
        setSelectedResult(result);
        setDropdownOpen(false);
        setChatHistory([]);
        setAgentQ('');
    };

    // Send message to Flask /agent-chat
    const sendMessage = useCallback(async (question) => {
        const q = (question || agentQ).trim();
        if (!q || isTyping) return;

        const userMsg = { role: 'user', content: q };
        setChatHistory(prev => [...prev, userMsg]);
        setAgentQ('');
        setIsTyping(true);

        // ── REPLACE the try block in sendMessage ─────────────────────────────

        try {
            const res = await fetch(`${apiUrl}/agent-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    // ── Fields Flask actually reads ──────────────────────────────────────
                    student_id: studentId,
                    message: q,
                    history: chatHistory,

                    // learningProfile → Flask extracts subjects, overallAverage, weakAreas
                    learningProfile: selectedResult ? {
                        subjects: [selectedResult.subject || 'General'],
                        overallAverage: selectedResult.percentage ?? 0,
                        weakAreas: (selectedResult.conceptGaps || []).map((gap) => ({
                            key: gap,
                            question: gap,
                            timesWrong: 1,
                            count: 1,
                        })),
                    } : {
                        // No exam selected — build from all results
                        subjects: [...new Set(sortedResults.map(r => r.subject).filter(Boolean))],
                        overallAverage: sortedResults.length
                            ? Math.round(
                                sortedResults.reduce((sum, r) => sum + (r.percentage ?? 0), 0)
                                / sortedResults.length
                            )
                            : 0,
                        weakAreas: sortedResults
                            .flatMap(r => r.conceptGaps || [])
                            .filter(Boolean)
                            .slice(0, 8)
                            .map(gap => ({ key: gap, question: gap, timesWrong: 1 })),
                    },

                    // latestAttempt → Flask extracts examTitle, percentage, markedResults
                    latestAttempt: selectedResult ? {
                        examTitle: selectedResult.title || selectedResult.subject || 'Exam',
                        subject: selectedResult.subject || '',
                        percentage: selectedResult.percentage ?? 0,
                        score: selectedResult.score ?? 0,
                        total: selectedResult.total ?? 0,
                        markedResults: (selectedResult.markedResults || []).slice(0, 10).map(r => ({
                            question_number: r.question_number || r.questionNumber || '',
                            status: r.status || '',
                            question: (r.question || r.text || r.questionText || '').slice(0, 100),
                        })),
                    } : (sortedResults[0] ? {
                        examTitle: sortedResults[0].title || 'Most recent exam',
                        percentage: sortedResults[0].percentage ?? 0,
                        markedResults: [],
                    } : {}),
                }),
            });

            // Read raw text first — never call .json() on an empty body
            const raw = await res.text();

            if (!raw || !raw.trim()) {
                throw new Error(`Empty response from server (HTTP ${res.status})`);
            }

            let data;
            try {
                data = JSON.parse(raw);
            } catch {
                // Server returned non-JSON (HTML error page, plain text, etc.)
                console.error('[AIMentor] Non-JSON response:', raw.slice(0, 200));
                throw new Error(`Server returned unexpected format (HTTP ${res.status})`);
            }

            if (!res.ok) {
                // Server returned an error status with a JSON error message
                throw new Error(data?.error || data?.message || `Server error ${res.status}`);
            }

            const reply = data.response
                || data.reply
                || data.message
                || data.answer
                || 'I could not generate a response. Please try again.';


            setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);

        } catch (err) {
            console.error('[AIMentor]', err.message);
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: err.message.includes('Empty response')
                    ? 'The AI server returned no response. It may be waking up — please try again in 30 seconds.'
                    : err.message.includes('fetch')
                        ? 'Connection error. Please check your internet and try again.'
                        : `Something went wrong: ${err.message}`,
            }]);
        } finally {
            setIsTyping(false);
            inputRef.current?.focus();
        }
    }, [agentQ, chatHistory, selectedResult, sortedResults, apiUrl, authToken, studentId, isTyping]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const prompts = buildPrompts(selectedResult);
    const pct = selectedResult?.percentage ?? null;
    const grade = pct !== null ? getGrade(pct) : null;
    const hasMultiple = sortedResults.length > 1;

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800
                    rounded-2xl overflow-hidden border border-white/10">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3
                      border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center
                          justify-center flex-shrink-0">
                        <Sparkles size={15} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-white text-sm">AI Academic Mentor</h3>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                            Personalised Coaching Based On Your Results
                        </p>
                    </div>
                </div>

                {chatHistory.length > 0 && (
                    <button
                        onClick={() => setChatHistory([])}
                        className="flex items-center gap-1 text-[10px] text-slate-400
                       hover:text-red-400 transition-colors px-2 py-1 rounded
                       border border-white/10 hover:border-red-400"
                    >
                        <Trash2 size={11} /> Clear
                    </button>
                )}
            </div>

            {/* ── Exam selector ───────────────────────────────────────────── */}
            {sortedResults.length > 0 && (
                <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest
                         text-slate-500 mb-2">
                        {hasMultiple ? 'Select exam to focus on' : 'Focused on'}
                    </p>

                    {hasMultiple ? (
                        /* Dropdown — multiple results */
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(v => !v)}
                                className="w-full flex items-center justify-between gap-2
                           bg-white/5 hover:bg-white/10 border border-white/10
                           hover:border-indigo-500 rounded-xl px-3 py-2.5
                           transition-all text-left"
                            >
                                {selectedResult ? (
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-white truncate">
                                                {selectedResult.title || selectedResult.subject}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {selectedResult.subject} · {formatDate(selectedResult.uploadedAt)}
                                            </p>
                                        </div>
                                        {pct !== null && (
                                            <span className={`text-xs font-black flex-shrink-0 ${grade.color}`}>
                                                {pct}%
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400">Choose an exam...</span>
                                )}
                                <ChevronDown
                                    size={14}
                                    className={`text-slate-400 flex-shrink-0 transition-transform
                              ${dropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50
                                bg-slate-900 border border-white/10 rounded-xl
                                shadow-2xl overflow-hidden
                                animate-in fade-in zoom-in-95 duration-150">
                                    {sortedResults.map((result, i) => {
                                        const rPct = result.percentage ?? 0;
                                        const rGrade = getGrade(rPct);
                                        const isSelected = selectedResult?.examId === result.examId;
                                        return (
                                            <button
                                                key={result.examId || i}
                                                onClick={() => handleSelectResult(result)}
                                                className={`w-full flex items-center gap-3 px-3 py-3
                                    text-left border-b border-white/5 last:border-0
                                    transition-colors
                                    ${isSelected
                                                        ? 'bg-indigo-600/30 border-l-2 border-l-indigo-500'
                                                        : 'hover:bg-white/5'
                                                    }`}
                                            >
                                                {/* Score ring */}
                                                <div className={`w-9 h-9 rounded-xl flex items-center
                                         justify-center flex-shrink-0 text-[11px]
                                         font-black border
                                         ${rPct >= 50
                                                        ? 'bg-emerald-900/40 border-emerald-700 text-emerald-400'
                                                        : 'bg-red-900/40 border-red-700 text-red-400'
                                                    }`}>
                                                    {rPct}%
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-white truncate">
                                                        {result.title || result.subject}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {result.subject} · {formatDate(result.uploadedAt)}
                                                    </p>
                                                    {(result.conceptGaps || []).length > 0 && (
                                                        <p className="text-[10px] text-amber-400 mt-0.5 truncate">
                                                            Gaps: {result.conceptGaps.slice(0, 2).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-black flex-shrink-0 ${rGrade.color}`}>
                                                    {rGrade.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    ) : (
                        /* Single result — just show the card */
                        selectedResult && (
                            <div className="flex items-center gap-3 bg-white/5 rounded-xl
                              border border-white/10 px-3 py-2.5">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                                 flex-shrink-0 text-[11px] font-black border
                                 ${pct >= 50
                                        ? 'bg-emerald-900/40 border-emerald-700 text-emerald-400'
                                        : 'bg-red-900/40 border-red-700 text-red-400'
                                    }`}>
                                    {pct}%
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">
                                        {selectedResult.title || selectedResult.subject}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {selectedResult.subject} · {formatDate(selectedResult.uploadedAt)}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-black ${grade.color}`}>
                                    {grade.label}
                                </span>
                            </div>
                        )
                    )}

                    {/* Concept gaps strip */}
                    {selectedResult && (selectedResult.conceptGaps || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedResult.conceptGaps.slice(0, 4).map((gap, i) => (
                                <span
                                    key={i}
                                    onClick={() => sendMessage(`Explain ${gap} in simple terms`)}
                                    className="text-[10px] px-2 py-0.5 rounded-full
                             bg-amber-900/30 text-amber-400 border border-amber-700/50
                             cursor-pointer hover:bg-amber-600 hover:text-white
                             transition-colors"
                                >
                                    📌 {gap}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Conversation window ─────────────────────────────────────── */}
            <div
                ref={chatScrollRef}
                className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto min-h-0"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
                {chatHistory.length === 0 ? (
                    /* Dynamic prompt suggestions */
                    <div>
                        <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-widest font-bold">
                            {selectedResult
                                ? `Suggested for ${selectedResult.subject}`
                                : 'Suggested questions'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {prompts.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(prompt)}
                                    className="bg-white/5 hover:bg-indigo-600 border border-white/10
                             hover:border-indigo-500 transition-all rounded-xl p-2.5
                             text-[11px] text-left text-slate-300 hover:text-white
                             leading-snug"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    chatHistory.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center
                                justify-center flex-shrink-0 mt-1">
                                    <Bot size={13} />
                                </div>
                            )}
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[12px]
                               leading-relaxed whitespace-pre-wrap
                               ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                    : 'bg-white/10 text-white border border-white/10 rounded-bl-sm'
                                }`}>
                                {msg.content}
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center
                                justify-center flex-shrink-0 mt-1 text-[11px] font-black
                                text-white">
                                    {studentId?.charAt(0)?.toUpperCase() || 'S'}
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Typing indicator */}
                {isTyping && (
                    <div className="flex gap-2 justify-start">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center
                            justify-center flex-shrink-0">
                            <Bot size={13} />
                        </div>
                        <div className="bg-white/10 border border-white/10 rounded-2xl
                            rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                            {[0, 1, 2].map(j => (
                                <span
                                    key={j}
                                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                                    style={{ animationDelay: `${j * 150}ms` }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Input bar ──────────────────────────────────────────────── */}
            <div className="px-4 pb-4 pt-2 border-t border-white/10">
                <div className="flex gap-2 items-end">
                    <textarea
                        ref={inputRef}
                        value={agentQ}
                        onChange={(e) => setAgentQ(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            selectedResult
                                ? `Ask about ${selectedResult.subject}...`
                                : 'Ask your AI mentor anything...'
                        }
                        rows={1}
                        className="flex-1 bg-white/10 border border-white/10 hover:border-white/20
                       focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs
                       text-white placeholder-slate-500 outline-none resize-none
                       transition-colors leading-relaxed"
                        style={{ maxHeight: 120 }}
                        onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!agentQ.trim() || isTyping}
                        className="w-9 h-9 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                       disabled:cursor-not-allowed rounded-xl flex items-center
                       justify-center flex-shrink-0 transition-colors"
                    >
                        <Send size={15} className="text-white" />
                    </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5 text-center">
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}

export default AIMentor;