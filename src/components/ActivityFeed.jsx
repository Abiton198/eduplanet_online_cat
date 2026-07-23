// src/components/ActivityFeed.jsx
import { useState, useEffect, useCallback } from 'react';
import {
    Users, GraduationCap, BookOpen, AlertTriangle,
    CheckCircle, XCircle, Clock, Bell, RefreshCw,
    ChevronDown, ChevronUp,
} from 'lucide-react';
import { collection, query, where, orderBy, limit,
         onSnapshot, updateDoc, doc, addDoc,
         serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';



// ── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(ts) {
    if (!ts) return '';
    const diff  = Date.now() - new Date(ts).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

const ROLE_STYLES = {
    teacher:   { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', icon: '👩‍🏫' },
    student:   { bg: 'bg-blue-100 dark:bg-blue-900/30',       text: 'text-blue-700 dark:text-blue-400',       dot: 'bg-blue-500',    icon: '🎓'  },
    principal: { bg: 'bg-purple-100 dark:bg-purple-900/30',   text: 'text-purple-700 dark:text-purple-400',   dot: 'bg-purple-500',  icon: '🏫'  },
    default:   { bg: 'bg-slate-100 dark:bg-slate-800',         text: 'text-slate-600 dark:text-slate-400',     dot: 'bg-slate-400',   icon: '👤'  },
};

// ── Single activity card ──────────────────────────────────────────────────
// ── ActivityCard — complete component ────────────────────────────────────
// Paste this inside ActivityFeed.jsx, replacing the existing ActivityCard

function ActivityCard({ event, onApprove, onDecline, processingId }) {
    const [expanded,         setExpanded]         = useState(false);
    const [showDeclineInput, setShowDeclineInput] = useState(false);
    const [declineReason,    setDeclineReason]    = useState('');

    const styles       = ROLE_STYLES[event.actorRole] || ROLE_STYLES.default;
    const isNew        = !event.read;
    const isPending    = event.type === 'user_joined' && !event.approvalStatus;
    const isProcessing = processingId === event.id;
    const status       = event.approvalStatus;

    // Type label
    const typeLabel = {
        user_joined:    'New Registration',
        user_approved:  'User Approved',
        user_declined:  'User Declined',
        exam_uploaded:  'Exam Uploaded',
        exam_submitted: 'Exam Submitted',
    }[event.type] || 'Activity';

    return (
        <div className={`border-b border-slate-100 dark:border-slate-800
                         last:border-0 transition-colors
                         ${isNew ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}>

            {/* ── Main content row ──────────────────────────────────────── */}
            <div className="flex items-start gap-3 px-5 py-4">

                {/* Role icon avatar */}
<div className={`w-10 h-10 rounded-xl flex items-center justify-center
                 flex-shrink-0 overflow-hidden ${styles.bg}`}>
  {event.actorPhoto ? (
    <img
      src={event.actorPhoto}
      alt={event.actorName}
      className="w-10 h-10 object-cover rounded-xl"
      onError={(e) => {
        // If photo fails to load — fall back to emoji
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
  ) : null}
  <span
    className={`text-lg select-none w-10 h-10 flex items-center justify-center
                ${event.actorPhoto ? 'hidden' : ''}`}
  >
    {event.type === 'user_approved' ? '✅' :
     event.type === 'user_declined' ? '❌' :
     styles.icon}
  </span>
</div>

                {/* Text content */}
                <div className="flex-1 min-w-0">

                    {/* Name + unread dot + time */}
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800
                                          dark:text-white truncate leading-snug">
                                {event.actorName || event.targetName || 'Unknown User'}
                                {isNew && (
                                    <span className={`ml-2 inline-block w-2 h-2 rounded-full
                                                      align-middle ${styles.dot}`} />
                                )}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                                {event.actorEmail || event.targetEmail || ''}
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0
                                         whitespace-nowrap pt-0.5">
                            {timeAgo(event.timestamp)}
                        </span>
                    </div>

                    {/* Type + description */}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                        <span className="font-bold">{typeLabel}</span>
                        {event.description && ` — ${event.description}`}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Role */}
                        {event.actorRole && (
                            <span className={`text-[10px] font-black px-2 py-0.5
                                              rounded-full capitalize
                                              ${styles.bg} ${styles.text}`}>
                                {event.actorRole}
                            </span>
                        )}

                        {/* Grade */}
                        {event.grade && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                             bg-slate-100 dark:bg-slate-800
                                             text-slate-600 dark:text-slate-400">
                                Gr {event.grade}
                            </span>
                        )}

                        {/* Subjects — first 2 */}
                        {(event.subjects || []).length > 0 && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                📚 {event.subjects.slice(0, 2).join(', ')}
                                {event.subjects.length > 2 &&
                                    <span className="font-bold"> +{event.subjects.length - 2}</span>
                                }
                            </span>
                        )}

                        {/* School */}
                        {event.schoolName && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                🏫 {event.schoolName}
                            </span>
                        )}

                        {/* Approval status badges */}
                        {isPending && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full
                                             bg-amber-100 text-amber-700
                                             dark:bg-amber-900/30 dark:text-amber-400">
                                ⏳ Pending
                            </span>
                        )}
                        {status === 'approved' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full
                                             bg-emerald-100 text-emerald-700
                                             dark:bg-emerald-900/30 dark:text-emerald-400">
                                ✓ Approved
                            </span>
                        )}
                        {status === 'declined' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full
                                             bg-red-100 text-red-700
                                             dark:bg-red-900/30 dark:text-red-400">
                                ✗ Declined
                            </span>
                        )}
                    </div>

                    {/* Expand / collapse toggle */}
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="mt-2 flex items-center gap-1 text-[10px]
                                   text-indigo-400 hover:text-indigo-600
                                   dark:text-indigo-500 dark:hover:text-indigo-400
                                   font-bold transition-colors"
                    >
                        {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        {expanded ? 'Hide details' : 'View full details'}
                    </button>

                    {/* ── Expanded detail panel ───────────────────────── */}
                    {expanded && (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60
                                        rounded-xl text-xs space-y-1.5
                                        border border-slate-100 dark:border-slate-700">
                            {event.actorName && (
                                <p className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold w-20 inline-block">Name</span>
                                    {event.actorName}
                                </p>
                            )}
                            {event.actorEmail && (
                                <p className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold w-20 inline-block">Email</span>
                                    {event.actorEmail}
                                </p>
                            )}
                            {event.actorRole && (
                                <p className="text-slate-600 dark:text-slate-300 capitalize">
                                    <span className="font-bold w-20 inline-block">Role</span>
                                    {event.actorRole}
                                </p>
                            )}
                            {event.grade && (
                                <p className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold w-20 inline-block">Grade</span>
                                    {event.grade}
                                </p>
                            )}
                            {event.schoolName && (
                                <p className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold w-20 inline-block">School</span>
                                    {event.schoolName}
                                </p>
                            )}
                            {(event.subjects || []).length > 0 && (
                                <p className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold w-20 inline-block">Subjects</span>
                                    {event.subjects.join(', ')}
                                </p>
                            )}
                            {event.approvedBy && (
                                <p className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold w-20 inline-block">
                                        {status === 'approved' ? 'Approved' : 'Declined'}
                                    </span>
                                    by {event.approvedBy}
                                </p>
                            )}
                            {event.declineReason && (
                                <p className="text-red-500 dark:text-red-400">
                                    <span className="font-bold w-20 inline-block">Reason</span>
                                    {event.declineReason}
                                </p>
                            )}
                            {event.timestamp && (
                                <p className="text-slate-400 dark:text-slate-500 pt-1
                                              border-t border-slate-100 dark:border-slate-700">
                                    <span className="font-bold w-20 inline-block">Time</span>
                                    {new Date(event.timestamp).toLocaleString('en-ZA', {
                                        dateStyle: 'medium', timeStyle: 'short'
                                    })}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Report unknown user link */}
                    {event.type === 'user_joined' && (
                        <a
                            href={`mailto:support@eduket.tech?subject=Unknown user: ${event.actorEmail}&body=School: ${event.schoolName || ''}%0AUser: ${event.actorName} (${event.actorEmail})`}
                            className="mt-2 flex items-center gap-1 text-[10px]
                                       text-amber-500 hover:text-amber-700 font-bold"
                        >
                            <AlertTriangle size={10} />
                            Don't recognise this person? Report to support
                        </a>
                    )}
                </div>
            </div>

            {/* ── Approve / Decline buttons ─────────────────────────────── */}
            {isPending && (
                <div className="px-5 pb-4 pt-0">
                    {!showDeclineInput ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onApprove(event)}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-1.5
                                           py-2.5 bg-emerald-600 hover:bg-emerald-700
                                           disabled:opacity-50 text-white text-xs font-black
                                           rounded-xl transition-colors"
                            >
                                {isProcessing
                                    ? <div className="w-3.5 h-3.5 border-2 border-white
                                                      border-t-transparent rounded-full
                                                      animate-spin" />
                                    : <CheckCircle size={13} />
                                }
                                Approve Access
                            </button>
                            <button
                                onClick={() => setShowDeclineInput(true)}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-1.5
                                           py-2.5 bg-red-600 hover:bg-red-700
                                           disabled:opacity-50 text-white text-xs font-black
                                           rounded-xl transition-colors"
                            >
                                <XCircle size={13} /> Decline
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <textarea
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                                placeholder="Reason for declining (optional)..."
                                rows={2}
                                className="w-full text-xs p-2.5 border border-red-200
                                           dark:border-red-800 rounded-xl bg-red-50
                                           dark:bg-red-900/20 text-slate-700
                                           dark:text-slate-300 resize-none outline-none
                                           focus:border-red-400"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onDecline(event, declineReason)}
                                    disabled={isProcessing}
                                    className="flex-1 py-2 bg-red-600 hover:bg-red-700
                                               disabled:opacity-50 text-white text-xs
                                               font-black rounded-xl transition-colors
                                               flex items-center justify-center gap-1.5"
                                >
                                    {isProcessing
                                        ? <div className="w-3.5 h-3.5 border-2 border-white
                                                          border-t-transparent rounded-full
                                                          animate-spin" />
                                        : <XCircle size={13} />
                                    }
                                    Confirm Decline
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeclineInput(false);
                                        setDeclineReason('');
                                    }}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800
                                               text-slate-600 dark:text-slate-400 text-xs
                                               font-bold rounded-xl hover:bg-slate-200
                                               dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Result banners ────────────────────────────────────────── */}
            {status === 'approved' && (
                <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2
                                bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                        Approved — user can now access the school
                    </p>
                </div>
            )}
            {status === 'declined' && (
                <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2
                                bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <XCircle size={13} className="text-red-500 flex-shrink-0" />
                    <div>
                        <p className="text-[11px] text-red-700 dark:text-red-400 font-bold">
                            Access declined
                        </p>
                        {event.declineReason && (
                            <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">
                                Reason: {event.declineReason}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════

export function ActivityFeed({ schoolId, apiUrl, authToken }) {
    const [events,       setEvents]       = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [refreshing,   setRefreshing]   = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [unread,       setUnread]       = useState(0);
    const [error,        setError]        = useState('');
    const [isOpen, setIsOpen] = useState(true);

    // ── Fetch with retry (handles Render cold starts) ─────────────────────
    // ── Fetch activity with retry and proper abort handling ──────────────
   
useEffect(() => {
    if (!schoolId) {
        setLoading(false);
        return;
    }

    setLoading(true);
    setError('');

    const q = query(
        collection(db, 'schoolActivity'),
        where('schoolId', '==', schoolId),
        orderBy('timestamp', 'desc'),
        limit(50)
    );

    const unsub = onSnapshot(q,
        (snap) => {
            const evts = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                // Convert Firestore timestamp to ISO string
                timestamp: d.data().timestamp?.toDate?.()?.toISOString() || '',
            }));
            setEvents(evts);
            setUnread(evts.filter(e => !e.read).length);
            setLoading(false);
        },
        (err) => {
            console.error('[Activity] Firestore error:', err);
            setError('Could not load activity. Check your connection.');
            setLoading(false);
        }
    );

    return () => unsub();   // ← cleanup on unmount

}, [schoolId]);


    // ── Mark all read ──────────────────────────────────────────────────────
    const markAllRead = async () => {
    const unreadIds = events.filter(e => !e.read).map(e => e.id);
    if (!unreadIds.length) return;
    try {
        await Promise.all(
            unreadIds.map(id =>
                updateDoc(doc(db, 'schoolActivity', id), { read: true })
            )
        );
        // onSnapshot updates automatically — no need to setEvents
    } catch (err) {
        console.error('[Activity] Mark read error:', err);
    }
};

    // ── Approve ────────────────────────────────────────────────────────────
    const handleApprove = async (event) => {
    setProcessingId(event.id);
    try {                          // ← was try:  (Python syntax — wrong)
        // Update activity document
        await updateDoc(doc(db, 'schoolActivity', event.id), {
            approvalStatus: 'approved',
            approvedBy:     'Principal',
            approvedAt:     serverTimestamp(),
            read:           true,
        });

        // Update teacher/student document directly
        if (event.actorUid) {
            const roleCol = event.actorRole === 'teacher' ? 'teachers'
                          : event.actorRole === 'student' ? 'students'
                          : 'users';

            await updateDoc(doc(db, roleCol, event.actorUid), {
                approved:       true,
                approvalStatus: 'approved',
                approvedBy:     'Principal',
                approvedAt:     serverTimestamp(),
            });

            await updateDoc(doc(db, 'users', event.actorUid), {
                approved:       true,
                approvalStatus: 'approved',
            });
        }

        // Log the principal's action
        await addDoc(collection(db, 'schoolActivity'), {
            schoolId:    schoolId,
            type:        'user_approved',
            actorName:   'Principal',
            targetName:  event.actorName,
            targetEmail: event.actorEmail,
            targetRole:  event.actorRole,
            description: `Principal approved ${event.actorName} as ${event.actorRole}`,
            timestamp:   serverTimestamp(),
            read:        true,
        });

    } catch (err) {
        console.error('[Activity] Approve error:', err);
        alert('Approval failed. Please try again.');
    } finally {
        setProcessingId(null);
    }
};

const handleDecline = async (event, reason) => {
    setProcessingId(event.id);
    try {
        // Update activity document
        await updateDoc(doc(db, 'schoolActivity', event.id), {
            approvalStatus: 'declined',
            approvedBy:     'Principal',
            declineReason:  reason || '',
            approvedAt:     serverTimestamp(),
            read:           true,
        });

        // ── Update teacher/student document directly ───────────────────────
        if (event.actorUid) {
            const roleCol = event.actorRole === 'teacher' ? 'teachers'
                          : event.actorRole === 'student' ? 'students'
                          : 'users';
            await updateDoc(doc(db, roleCol, event.actorUid), {
                approved:       false,
                approvalStatus: 'declined',
                declineReason:  reason || '',
                approvedBy:     'Principal',
                approvedAt:     serverTimestamp(),
            });
            await updateDoc(doc(db, 'users', event.actorUid), {
                approved:       false,
                approvalStatus: 'declined',
            });
        }

        // Log the action
        await addDoc(collection(db, 'schoolActivity'), {
            schoolId:      schoolId,
            type:          'user_declined',
            actorName:     'Principal',
            targetName:    event.actorName,
            targetEmail:   event.actorEmail,
            targetRole:    event.actorRole,
            declineReason: reason || '',
            description:   `Principal declined ${event.actorName}`,
            timestamp:     serverTimestamp(),
            read:          true,
        });

        // Fire-and-forget backend update for any server-side logic
        if (apiUrl && event.actorUid) {
            fetch(`${apiUrl.replace(/\/+$/, '')}/approve-school-user`, {
                method:  'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                    activityId:    event.id,
                    actorUid:      event.actorUid,
                    actorEmail:    event.actorEmail,
                    actorName:     event.actorName,
                    actorRole:     event.actorRole,
                    schoolId,
                    action:        'declined',
                    declineReason: reason || '',
                }),
            }).catch(err => console.warn('[Decline] Backend update failed:', err));
        }

    } catch (err) {
        console.error('[Activity] Decline error:', err);
        alert('Decline failed. Please try again.');
    } finally {
        setProcessingId(null);
    }
};

    // ── Counts ─────────────────────────────────────────────────────────────
    const pendingCount  = events.filter(e =>
        e.type === 'user_joined' && !e.approvalStatus
    ).length;
    const approvedCount = events.filter(e => e.approvalStatus === 'approved').length;
    const declinedCount = events.filter(e => e.approvalStatus === 'declined').length;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border
                        border-slate-200 dark:border-slate-800 overflow-hidden">

            {/* Header */}
            <button
    onClick={() => setIsOpen(v => !v)}
    className="w-full flex items-center justify-between px-5 py-4
               border-b border-slate-100 dark:border-slate-800
               bg-white dark:bg-slate-900 hover:bg-slate-50
               dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
>
    <div className="flex items-center gap-2">
        <Bell size={15} className="text-slate-500" />
        <h3 className="font-black text-sm text-slate-800 dark:text-white">
            School Activity
        </h3>
        {unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black
                             px-2 py-0.5 rounded-full">
                {unread} new
            </span>
        )}
        {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-black
                             px-2 py-0.5 rounded-full animate-pulse">
                {pendingCount} pending
            </span>
        )}
    </div>
    <div className="flex items-center gap-3">
        <span className="text-[10px] text-slate-400">{events.length} events</span>
        <ChevronUp
            size={14}
            className={`text-slate-400 transition-transform duration-200
                        ${isOpen ? '' : 'rotate-180'}`}
        />
    </div>
</button>

{isOpen && (
    <>
       
        {events.length > 0 && (
            <div className="grid grid-cols-3 divide-x divide-slate-100
                            dark:divide-slate-800 border-b border-slate-100
                            dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="px-4 py-2.5 text-center">
                    <p className="text-base font-black text-amber-500">{pendingCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Pending</p>
                </div>
                <div className="px-4 py-2.5 text-center">
                    <p className="text-base font-black text-emerald-500">{approvedCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Approved</p>
                </div>
                <div className="px-4 py-2.5 text-center">
                    <p className="text-base font-black text-red-500">{declinedCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Declined</p>
                </div>
            </div>
        )}

        {/* Content */}
        <div className="max-h-[520px] overflow-y-auto">
            {loading ? (
                <div className="p-5 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3 animate-pulse">
                            <div className="w-9 h-9 rounded-xl bg-slate-200
                                            dark:bg-slate-700 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                                <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded-xl w-full mt-2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="px-5 py-10 text-center">
                    <AlertTriangle size={28} className="text-amber-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button
                        onClick={() => fetchActivity()}
                        className="mt-3 text-xs text-indigo-500 font-bold hover:text-indigo-700"
                    >
                        Try again
                    </button>
                </div>
            ) : events.length === 0 ? (
                <div className="px-5 py-12 text-center">
                    <Clock size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-bold">No activity yet</p>
                    <p className="text-xs text-slate-300 mt-1">
                        Teachers and students joining your school will appear here
                    </p>
                </div>
            ) : (
                events.map(event => (
                    <ActivityCard
                        key={event.id}
                        event={event}
                        onApprove={handleApprove}
                        onDecline={handleDecline}
                        processingId={processingId}
                    />
                ))
            )}
        </div>
 </>
)}   
        </div>
    );
}

export default ActivityFeed;