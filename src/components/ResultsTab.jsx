import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { ClipboardList, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle } from "lucide-react";

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS = {
    correct: { color: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800", icon: <CheckCircle size={14} className="text-green-500" />, pill: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    partial: { color: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800", icon: <AlertCircle size={14} className="text-yellow-500" />, pill: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
    incorrect: { color: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800", icon: <XCircle size={14} className="text-red-500" />, pill: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
    no_memo: { color: "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800", icon: <AlertCircle size={14} className="text-purple-400" />, pill: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
    missing: { color: "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700", icon: <AlertCircle size={14} className="text-slate-400" />, pill: "bg-slate-100 text-slate-500" },
};

const pctColor = (p) =>
    p >= 70 ? "text-green-600 dark:text-green-400"
        : p >= 50 ? "text-yellow-600 dark:text-yellow-400"
            : "text-red-600 dark:text-red-400";

const pctBg = (p) =>
    p >= 70 ? "from-green-500 to-emerald-600"
        : p >= 50 ? "from-yellow-500 to-orange-500"
            : "from-red-500 to-rose-600";

// ── Single attempt card ───────────────────────────────────────────────────────
function AttemptCard({ attempt, teacherMode }) {
    const [expanded, setExpanded] = useState(false);
    const pct = attempt.percentage ?? 0;
    const date = attempt.completedAt?.toDate?.()?.toLocaleDateString("en-ZA", {
        day: "numeric", month: "short", year: "numeric",
    }) ?? "—";

    // resolvedTitle is injected by ResultsTab via the exams collection lookup
    const title = attempt.resolvedTitle || attempt.examTitle || attempt.exam || "Exam";

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden mb-4">

            {/* Teacher mode — student name banner */}
            {teacherMode && attempt.studentId && (
                <div className="flex items-center gap-2 px-5 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
                    <div className="w-5 h-5 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-[9px] font-black text-indigo-700 dark:text-indigo-200 flex-shrink-0">
                        {attempt.studentId[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">{attempt.studentId}</span>
                </div>
            )}

            {/* Summary row */}
            <div
                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                {/* Score circle */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pctBg(pct)} flex flex-col items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-black text-lg leading-none">{pct}%</span>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{date}</p>
                    <div className="flex gap-3 mt-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500">
                            Score: <span className={`font-black ${pctColor(pct)}`}>{attempt.score}/{attempt.total}</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                            Answered: {attempt.answeredCount}/{attempt.total}
                        </span>
                        {attempt.skipped?.length > 0 && (
                            <span className="text-xs font-semibold text-yellow-500">
                                Skipped: {attempt.skipped.length}
                            </span>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="hidden sm:block w-28">
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${pctBg(pct)}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-right">{pct}%</p>
                </div>

                {expanded
                    ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" />
                    : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
                }
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-700 p-5 space-y-4">

                    {/* AI Feedback */}
                    {attempt.aiFeedback && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">
                            🤖 <span className="font-bold">AI Feedback:</span> {attempt.aiFeedback}
                        </div>
                    )}

                    {/* Per-question breakdown */}
                    <div className="space-y-2">
                        {(attempt.markedResults || []).map((r, i) => {
                            const st = STATUS[r.status] || STATUS.missing;
                            return (
                                <div key={i} className={`border rounded-xl p-3 ${st.color}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {st.icon}
                                            <span className="font-bold text-xs text-slate-500 flex-shrink-0">{r.question_number}</span>
                                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{r.question}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 flex-shrink-0">
                                            {r.earned}/{r.marks}
                                        </span>
                                    </div>

                                    <div className="mt-2 pl-6 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                        <p><span className="font-semibold">Your answer:</span> {r.student_answer || "No answer"}</p>
                                        {r.correct_answer && r.correct_answer !== "Not available" && (
                                            <p><span className="font-semibold">Correct:</span> {r.correct_answer}</p>
                                        )}
                                        {r.feedback && (
                                            <p className="italic text-slate-500 dark:text-slate-400">{r.feedback}</p>
                                        )}
                                    </div>

                                    <div className="mt-2 pl-6 flex gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.pill}`}>{r.status}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{r.type}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main results tab ──────────────────────────────────────────────────────────
// Props:
//   studentId   {string}  — student's name/id for student mode
//   teacherMode {boolean} — if true, loads ALL students' attempts (teacher view)
export function ResultsTab({ studentId, teacherMode = false }) {
    const [attempts, setAttempts] = useState([]);
    const [examTitles, setExamTitles] = useState({}); // { examId → "Human readable title" }
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // ── 1. Live exam title map ────────────────────────────────────────────────
    // Subscribes to the exams collection and builds an id→title lookup map.
    // Stays live so a newly uploaded exam's title appears without a page refresh.
    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, "exams"),
            (snap) => {
                const map = {};
                snap.docs.forEach(d => {
                    map[d.id] = d.data().title || d.id;
                });
                setExamTitles(map);
            },
            (err) => console.error("ResultsTab [examTitles]:", err)
        );
        return () => unsub();
    }, []);

    // ── 2. Live attempts query ────────────────────────────────────────────────
    useEffect(() => {
        if (!teacherMode && !studentId) {
            setLoading(false);
            return;
        }

        const q = teacherMode
            ? query(
                collection(db, "exam_attempts"),
                orderBy("completedAt", "desc")
            )
            : query(
                collection(db, "exam_attempts"),
                where("studentId", "==", studentId),
                orderBy("completedAt", "desc")
            );

        const unsub = onSnapshot(
            q,
            (snap) => {
                setAttempts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("ResultsTab [attempts]:", err);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [studentId, teacherMode]);

    // ── 3. Enrich with resolved human-readable title ──────────────────────────
    // attempt.exam holds the raw Firestore exam ID — look it up in examTitles
    const enriched = attempts.map(a => ({
        ...a,
        resolvedTitle: examTitles[a.exam] || a.examTitle || a.exam || "Exam",
    }));

    // ── 4. Search filter ──────────────────────────────────────────────────────
    const filtered = enriched.filter(a => {
        if (!searchTerm.trim()) return true;
        const t = searchTerm.toLowerCase();
        return (
            a.resolvedTitle.toLowerCase().includes(t) ||
            (teacherMode && a.studentId?.toLowerCase().includes(t))
        );
    });

    // ── 5. Summary stats (always from filtered so search updates counts) ──────
    const avgPct = filtered.length
        ? Math.round(filtered.reduce((s, a) => s + (a.percentage ?? 0), 0) / filtered.length)
        : 0;
    const best = filtered.length ? Math.max(...filtered.map(a => a.percentage ?? 0)) : 0;
    const passing = filtered.filter(a => (a.percentage ?? 0) >= 50).length;

    if (loading) return (
        <div className="p-20 text-center text-slate-400 text-sm animate-pulse">Loading results…</div>
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm p-8 border border-slate-200 dark:border-slate-800 animate-in fade-in">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
                <div>
                    <h2 className="text-2xl font-black">
                        {teacherMode ? "Student Performance Overview" : "Academic Performance Hub"}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {teacherMode
                            ? `${attempts.length} submission${attempts.length !== 1 ? "s" : ""} across all students`
                            : "Your exam history and AI-marked results."}
                    </p>
                </div>

                {/* Search bar — visible whenever there is data */}
                {attempts.length > 0 && (
                    <input
                        type="text"
                        placeholder={teacherMode ? "Search student or exam…" : "Search exam…"}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 w-56"
                    />
                )}
            </div>

            {filtered.length === 0 ? (
                <div className="p-20 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-center mt-8">
                    <ClipboardList className="text-slate-200 dark:text-slate-700 mx-auto mb-3" size={40} />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                        {searchTerm
                            ? "No results match your search"
                            : teacherMode ? "No student submissions yet" : "No exams submitted yet"}
                    </p>
                </div>
            ) : (
                <>
                    {/* Stats strip */}
                    <div className={`grid gap-4 mb-8 mt-6 ${teacherMode ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}>
                        {[
                            { label: teacherMode ? "Total Submissions" : "Exams Taken", value: filtered.length, suffix: "" },
                            { label: "Average Score", value: avgPct, suffix: "%" },
                            { label: "Best Score", value: best, suffix: "%" },
                            ...(teacherMode ? [{ label: "Passing (≥50%)", value: passing, suffix: "" }] : []),
                        ].map(({ label, value, suffix }) => (
                            <div key={label} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                    {value}{suffix}
                                </p>
                                <p className="text-xs text-slate-400 font-semibold mt-1">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Attempt cards */}
                    {filtered.map(a => (
                        <AttemptCard key={a.id} attempt={a} teacherMode={teacherMode} />
                    ))}
                </>
            )}
        </div>
    );
}