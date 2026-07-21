
// src/components/ActivityFeed.jsx

import { useState, useEffect } from 'react';
import {
    Users, GraduationCap, BookOpen, AlertTriangle,
    CheckCircle, Clock, Bell
} from 'lucide-react';

const ACTIVITY_ICONS = {
    user_joined: Users,
    exam_uploaded: BookOpen,
    exam_submitted: GraduationCap,
    default: Bell,
};

const ACTIVITY_COLOURS = {
    teacher: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    student: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    principal: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
    default: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-400', dot: 'bg-slate-400' },
};

function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export function ActivityFeed({ schoolId, apiUrl }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!schoolId || !apiUrl) {
            console.log('[Activity] Missing schoolId or apiUrl:', { schoolId, apiUrl });
            return;
        }

        console.log('[Activity] Fetching:', `${apiUrl}/school-activity?schoolId=${schoolId}`);

        fetch(`${apiUrl}/school-activity?schoolId=${schoolId}`)
            .then(r => {
                console.log('[Activity] Response status:', r.status);
                return r.json();
            })
            .then(data => {
                console.log('[Activity] Data received:', data);
                if (data.indexBuilding) {
                    setLoading(false);
                    return;
                }
                const evts = data.events || [];
                setEvents(evts);
                setUnread(evts.filter(e => !e.read).length);
            })
            .catch(err => {
                console.error('[Activity] Fetch failed:', err);
            })
            .finally(() => setLoading(false));   // ← CRITICAL: must always run
    }, [schoolId, apiUrl]);

    const markAllRead = async () => {
        const unreadIds = events.filter(e => !e.read).map(e => e.id);
        if (!unreadIds.length) return;
        try {
            await fetch(`${apiUrl}/school-activity/mark-read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventIds: unreadIds }),
            });
            setEvents(prev => prev.map(e => ({ ...e, read: true })));
            setUnread(0);
        } catch (err) {
            console.error('[Activity] Mark read failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border
                      border-slate-200 dark:border-slate-800 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border
                    border-slate-200 dark:border-slate-800 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4
                      border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Bell size={16} className="text-slate-500" />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                        School Activity
                    </h3>
                    {unread > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-black
                             px-2 py-0.5 rounded-full">
                            {unread} new
                        </span>
                    )}
                </div>
                {unread > 0 && (
                    <button
                        onClick={markAllRead}
                        className="text-[10px] text-indigo-500 hover:text-indigo-700
                       font-bold flex items-center gap-1"
                    >
                        <CheckCircle size={11} /> Mark all read
                    </button>
                )}
            </div>

            {/* Events */}
            <div className="divide-y divide-slate-50 dark:divide-slate-800
                      max-h-[480px] overflow-y-auto">
                {events.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Clock size={32} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No activity yet</p>
                        <p className="text-xs text-slate-300 mt-1">
                            Activity will appear here when teachers and students join
                        </p>
                    </div>
                ) : (
                    events.map((event) => {
                        const Icon = ACTIVITY_ICONS[event.type] || ACTIVITY_ICONS.default;
                        const colours = ACTIVITY_COLOURS[event.actorRole] || ACTIVITY_COLOURS.default;
                        const isNew = !event.read;

                        return (
                            <div
                                key={event.id}
                                className={`flex items-start gap-3 px-6 py-4 transition-colors
                            ${isNew ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                            >
                                {/* Avatar */}
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                                 flex-shrink-0 ${colours.bg}`}>
                                    <Icon size={16} className={colours.text} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                {event.actorName}
                                                {isNew && (
                                                    <span className={`ml-2 w-1.5 h-1.5 rounded-full
                                           inline-block ${colours.dot}`} />
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {event.actorEmail}
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                                            {timeAgo(event.timestamp)}
                                        </span>
                                    </div>

                                    {/* Role badge */}
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <span className={`text-[10px] font-black px-2 py-0.5
                                      rounded-full capitalize ${colours.bg} ${colours.text}`}>
                                            {event.actorRole}
                                        </span>
                                        {event.grade && (
                                            <span className="text-[10px] text-slate-400">
                                                Grade {event.grade}
                                            </span>
                                        )}
                                        {event.subjects?.length > 0 && (
                                            <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
                                                {event.subjects.slice(0, 2).join(', ')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Unknown user warning */}
                                    {event.type === 'user_joined' && (
                                        <a
                                            href={`mailto:support@eduket.tech?subject=Unknown user: ${event.actorEmail}&body=Unknown user registered: ${event.actorName} (${event.actorEmail})`}
                                            className="mt-2 flex items-center gap-1.5 text-[10px]
                                 text-amber-600 hover:text-amber-700 font-bold"
                                        >
                                            <AlertTriangle size={11} />
                                            Don't recognise this person? Report to support
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}