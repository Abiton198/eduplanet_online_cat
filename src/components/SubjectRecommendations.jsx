/**
 * SubjectRecommendations.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in replacement for the recommendations section.
 *
 * - One subject → shows recommendations directly (no tabs)
 * - Multiple subjects → shows clickable subject pills, each with its
 *   own stats (avg, trend, weak areas, fail count) and recommendations
 *
 * Props:
 *   aiAttempts — array of exam_attempt documents from Firestore
 *                Each needs: { subject, percentage, markedResults,
 *                              uploadedAt, score, total }
 */

import { useState, useMemo } from 'react';

// ── Per-subject stats ─────────────────────────────────────────────────────

function buildSubjectStats(attempts) {
    if (!attempts.length) return { avg: 0, trend: null, failing: 0, total: 0 };

    const sorted = [...attempts].sort((a, b) => {
        const da = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(a.uploadedAt || 0);
        const db = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(b.uploadedAt || 0);
        return da - db;
    });

    const scores = sorted.map(a => a.percentage ?? 0);
    const avg = Math.round(scores.reduce((s, x) => s + x, 0) / scores.length);
    const failing = attempts.filter(a => (a.percentage ?? 0) < 50).length;

    // Trend = difference between average of last half vs first half
    let trend = null;
    if (scores.length >= 2) {
        const mid = Math.floor(scores.length / 2);
        const first = scores.slice(0, mid).reduce((s, x) => s + x, 0) / mid;
        const last = scores.slice(mid).reduce((s, x) => s + x, 0) / (scores.length - mid);
        trend = Math.round(last - first);
    }

    return { avg, trend, failing, total: attempts.length };
}

function buildWeakAreas(attempts) {
    const map = {};
    attempts.forEach(a => {
        (a.markedResults || []).forEach(r => {
            if (r.status === 'incorrect' || r.status === 'partial') {
                const key = r.topic || r.concept || r.question?.slice(0, 40) || 'Unknown';
                map[key] = (map[key] || 0) + 1;
            }
        });
        // Also pull concept gaps if stored directly on the attempt
        (a.conceptGaps || []).forEach(gap => {
            map[gap] = (map[gap] || 0) + 1;
        });
    });

    return Object.entries(map)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count);
}

function buildRecommendations(stats, weakAreas, subject) {
    const recs = [];
    const { avg, trend, failing, total } = stats;
    if (total === 0) return [];

    // Overall performance — count = assessments this verdict is based on
    if (avg >= 80)
        recs.push({
            icon: '🌟', type: 'success',
            title: `Excellent performance in ${subject}`,
            body: 'You consistently demonstrate strong understanding. Challenge yourself with past exam papers at distinction level.',
            count: total,
        });
    else if (avg >= 60)
        recs.push({
            icon: '📈', type: 'info',
            title: `Good progress in ${subject} — room to grow`,
            body: `Your average is ${avg}%. Targeting your weak concepts could push you to distinction level.`,
            count: total,
        });
    else if (avg >= 50)
        recs.push({
            icon: '⚠️', type: 'warning',
            title: `Borderline pass in ${subject}`,
            body: `Your average of ${avg}% is just above the pass mark. Consistent daily revision will make a significant difference.`,
            count: total,
        });
    else
        recs.push({
            icon: '🔴', type: 'danger',
            title: `${subject} requires urgent attention`,
            body: `Your average is ${avg}%. Focus on rebuilding foundational concepts before attempting advanced questions.`,
            count: total,
        });

    // Trend — count = points moved, since that's the actual signal here
    if (trend !== null) {
        if (trend > 5)
            recs.push({
                icon: '🚀', type: 'success',
                title: 'Improving trajectory',
                body: `Your recent ${subject} results are ${trend} points higher than your earlier ones. Your study plan is working.`,
                count: trend,
            });
        else if (trend < -5)
            recs.push({
                icon: '📉', type: 'danger',
                title: 'Performance declining recently',
                body: `Your last few ${subject} results dropped by ${Math.abs(trend)} points. Review the concepts from your most recent exam before moving forward.`,
                count: Math.abs(trend),
            });
    }

    // Weak areas — count = total concepts flagged, not just the top 3 shown
    if (weakAreas.length > 0) {
        const top3 = weakAreas.slice(0, 3).map(w => w.key).join(', ');
        recs.push({
            icon: '🧠', type: 'warning',
            title: 'Concepts to prioritise',
            body: `Recurring gaps in: ${top3}. Revise these before starting new ${subject} material.`,
            count: weakAreas.length,
        });
    }

    // Failed exams — count = number of assessments below pass mark
    if (failing > 0)
        recs.push({
            icon: '📝', type: 'danger',
            title: `${failing} ${subject} assessment${failing > 1 ? 's' : ''} below pass mark`,
            body: 'Revisit those assessments, identify where marks were lost, and redo similar questions until confident.',
            count: failing,
        });

    // First assessment — count = total (will be 1)
    if (total === 1)
        recs.push({
            icon: '🎯', type: 'info',
            title: 'First assessment recorded',
            body: `Complete more ${subject} assessments to unlock trend analysis and richer personalised recommendations.`,
            count: total,
        });

    return recs;
}


// ── Subject pill ──────────────────────────────────────────────────────────

function SubjectPill({ subject, avg, isSelected, onClick }) {
    const color =
        avg >= 80 ? 'emerald' :
            avg >= 60 ? 'blue' :
                avg >= 50 ? 'amber' : 'red';

    const styles = {
        emerald: {
            active: 'bg-emerald-600 text-white border-emerald-600',
            inactive: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
            dot: 'bg-emerald-500',
        },
        blue: {
            active: 'bg-blue-600 text-white border-blue-600',
            inactive: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
            dot: 'bg-blue-500',
        },
        amber: {
            active: 'bg-amber-500 text-white border-amber-500',
            inactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
            dot: 'bg-amber-400',
        },
        red: {
            active: 'bg-red-600 text-white border-red-600',
            inactive: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
            dot: 'bg-red-500',
        },
    }[color];

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  text-[11px] font-bold border transition-all
                  ${isSelected ? styles.active : styles.inactive}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                        ${isSelected ? 'bg-white' : styles.dot}`} />
            {subject}
            <span className={`text-[10px] font-black
                        ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                {avg}%
            </span>
        </button>
    );
}


// ── Recommendation card ───────────────────────────────────────────────────

const REC_STYLES = {
    success: 'bg-green-50 border-green-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
};

const typeStyles = {
    success: 'border-green-200 bg-green-50',
    info: 'border-blue-200 bg-blue-50',
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50',
};

function RecCard({ icon, type, title, body }) {
    return (
        <div className={`border rounded-xl p-3 ${REC_STYLES[type] || REC_STYLES.info}`}>
            <p className="font-black text-[11px] mb-0.5">{icon} {title}</p>
            <p className="text-[11px] opacity-80 leading-relaxed">{body}</p>
        </div>
    );
}

function RecommendationsGrid({ recs }) {
    const [selected, setSelected] = useState(null);

    return (
        <>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2">
                {recs.map((r, i) => (
                    <button
                        key={i}
                        onClick={() => setSelected(r)}
                        className={`flex flex-col items-center justify-between text-center px-3 py-2 rounded-xl border transition hover:scale-[1.03] active:scale-[0.98] ${typeStyles[r.type] || 'border-gray-200 bg-gray-50'}`}
                    >
                        <span className="text-[11px] font-medium leading-tight text-black line-clamp-2">
                            {r.title}
                        </span>
                        <span className="text-xl my-1">{r.icon}</span>
                        <span className="flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-black text-white text-[10px] font-semibold">
                            {r.count}
                        </span>
                    </button>
                ))}
            </div>

            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className={`w-full max-w-sm rounded-2xl border p-4 bg-white ${typeStyles[selected.type] || 'border-gray-200'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-2">
                            <span className="text-2xl">{selected.icon}</span>
                            <div>
                                <h3 className="text-sm font-semibold text-black">{selected.title}</h3>
                                <p className="text-xs text-gray-700 mt-1 leading-relaxed">{selected.body}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelected(null)}
                            className="mt-3 w-full text-xs font-medium text-gray-500 py-1.5 rounded-lg border border-gray-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — drop-in replacement for the recommendations section
// ══════════════════════════════════════════════════════════════════════════

export function SubjectRecommendations({ aiAttempts = [] }) {

    // Group attempts by subject
    const subjectMap = useMemo(() => {
        const map = {};
        aiAttempts.forEach(a => {
            const subj = a.subject || 'General';
            if (!map[subj]) map[subj] = [];
            map[subj].push(a);
        });
        return map;
    }, [aiAttempts]);

    const subjects = Object.keys(subjectMap).sort();

    // Build per-subject stats (for pill colours and averages)
    const subjectStats = useMemo(() => {
        const result = {};
        subjects.forEach(s => {
            result[s] = buildSubjectStats(subjectMap[s]);
        });
        return result;
    }, [subjectMap, subjects]);

    // Selected subject — default to lowest average (needs most attention)
    const defaultSubject = useMemo(() => {
        if (!subjects.length) return null;
        return subjects.reduce((worst, s) =>
            subjectStats[s].avg < (subjectStats[worst]?.avg ?? Infinity) ? s : worst
            , subjects[0]);
    }, [subjects, subjectStats]);

    const [selectedSubject, setSelectedSubject] = useState(null);
    const active = selectedSubject || defaultSubject;

    // Build recommendations for the active subject
    const { recs, weakAreas } = useMemo(() => {
        if (!active) return { recs: [], weakAreas: [] };
        const attempts = subjectMap[active] || [];
        const stats = subjectStats[active];
        const weakAreas = buildWeakAreas(attempts);
        const recs = buildRecommendations(stats, weakAreas, active);
        return { recs, weakAreas };
    }, [active, subjectMap, subjectStats]);

    if (!subjects.length) return null;

    const activeStats = active ? subjectStats[active] : null;

    return (
        <div className="bg-white border rounded-xl p-4 shadow-sm space-y-4">

            {/* Header */}
            <p className="text-[10px] font-black uppercase text-gray-400">
                💡 Personalised Recommendations
            </p>

            {/* Subject switcher — only shown when more than one subject */}
            {subjects.length > 1 && (
                <div>
                    <p className="text-[10px] text-gray-400 mb-2 font-medium">
                        Select a subject to view recommendations
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {subjects.map(s => (
                            <SubjectPill
                                key={s}
                                subject={s}
                                avg={subjectStats[s].avg}
                                isSelected={active === s}
                                onClick={() => setSelectedSubject(s)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Active subject summary bar */}
            {active && activeStats && (
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-800 truncate">{active}</p>
                        <p className="text-[10px] text-gray-400">
                            {activeStats.total} assessment{activeStats.total !== 1 ? 's' : ''} ·
                            Average {activeStats.avg}%
                            {activeStats.trend !== null && (
                                <span className={activeStats.trend > 0 ? ' text-emerald-600' : ' text-red-500'}>
                                    {' '}{activeStats.trend > 0 ? '▲' : '▼'} {Math.abs(activeStats.trend)}pts trend
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Mini performance bar */}
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${activeStats.avg >= 80 ? 'bg-emerald-500' :
                                activeStats.avg >= 60 ? 'bg-blue-500' :
                                    activeStats.avg >= 50 ? 'bg-amber-400' : 'bg-red-500'
                                }`}
                            style={{ width: `${Math.min(activeStats.avg, 100)}%` }}
                        />
                    </div>
                    <span className={`text-sm font-black ${activeStats.avg >= 80 ? 'text-emerald-600' :
                        activeStats.avg >= 60 ? 'text-blue-600' :
                            activeStats.avg >= 50 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                        {activeStats.avg}%
                    </span>
                </div>
            )}

            {/* Top weak areas chips */}
            {weakAreas.length > 0 && (
                <div>
                    <p className="text-[10px] text-gray-400 mb-1.5 font-medium">
                        Recurring gaps
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {weakAreas.slice(0, 5).map((w, i) => (
                            <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded-full
                           bg-amber-50 text-amber-700 border border-amber-200
                           font-medium"
                            >
                                📌 {w.key}
                                {w.count > 1 && (
                                    <span className="ml-1 opacity-60">×{w.count}</span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendation cards */}
            <div className="space-y-2.5 text-black">
                <RecommendationsGrid recs={recs} />
            </div>

            {/* Footer note when multiple subjects */}
            {subjects.length > 1 && (
                <p className="text-[10px] text-gray-400 text-center pt-1">
                    Showing recommendations for <strong>{active}</strong> ·{' '}
                    {subjects.length - 1} other subject{subjects.length > 2 ? 's' : ''} available above
                </p>
            )}
        </div>
    );
}

export default SubjectRecommendations;