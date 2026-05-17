// ─── PrincipalDashboard.jsx ───────────────────────────────────────────────────
// Complete working version with safe fallbacks and runtime protection.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
    Users,
    FileText,
    TrendingUp,
    Award,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Download,
    Printer,
    LogOut,
    Search,
    X,
    Eye,
    BarChart2,
    CheckCircle2,
    Clock,
    RefreshCw,
    School,
    Settings,
    Moon,
    Sun,
    Menu,
    Zap,
    Lock,
    ArrowUpRight,
    Sparkles,
    Crown,
    Star,
} from 'lucide-react';

import { auth } from '../utils/firebase';

import {
    subscribeToSchoolTeachers,
    subscribeToSchoolStudents,
    subscribeToSchoolExams,
    subscribeToSchoolAttempts,
    subscribeToAuditLog,
    countByGrade,
    averageScore,
    groupBySubject,
    passRate,
} from '../utils/firestoreHelpers';

import { useSchool } from '../utils/schoolContext';

import {
    getTier,
    checkLimit,
    isAtLimit,
    isFeatureAllowed,
} from '../utils/tierConfig';

// ─── GRADE ORDER ──────────────────────────────────────────────────────────────
const GRADE_ORDER = [
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
];

// ─── TIER VISUALS ─────────────────────────────────────────────────────────────
const TIER_VISUAL = {
    free: {
        label: 'Free',
        icon: Star,
        gradient: 'from-slate-400 to-slate-500',
        badge:
            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    },
    starter: {
        label: 'Starter',
        icon: Zap,
        gradient: 'from-blue-500 to-cyan-500',
        badge:
            'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    professional: {
        label: 'Professional',
        icon: Sparkles,
        gradient: 'from-violet-500 to-purple-600',
        badge:
            'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    },
    enterprise: {
        label: 'Enterprise',
        icon: Crown,
        gradient: 'from-amber-400 to-orange-500',
        badge:
            'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
};

// ─── SAFE HELPERS ─────────────────────────────────────────────────────────────
const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

const formatDate = (value) => {
    try {
        if (!value) return '—';

        if (value?.toDate) {
            return value.toDate().toLocaleDateString('en-ZA');
        }

        return new Date(value).toLocaleDateString('en-ZA');
    } catch {
        return '—';
    }
};

const formatDateTime = (value) => {
    try {
        if (!value) return '—';

        if (value?.toDate) {
            return value.toDate().toLocaleString('en-ZA');
        }

        return new Date(value).toLocaleString('en-ZA');
    } catch {
        return '—';
    }
};

// ─── SCORE BADGE ──────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
    if (score == null || Number.isNaN(score)) {
        return (
            <span className="text-slate-400 text-xs font-bold">
                —
            </span>
        );
    }

    const color =
        score >= 70
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
            : score >= 50
                ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                : score >= 40
                    ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
                    : 'text-red-600 bg-red-50 dark:bg-red-900/20';

    return (
        <span
            className={`text-xs font-black px-2 py-1 rounded-lg ${color}`}
        >
            {score}%
        </span>
    );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    color = 'indigo',
}) {
    const palette = {
        indigo:
            'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20',
        emerald:
            'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
        amber:
            'bg-amber-50 text-amber-600 dark:bg-amber-900/20',
        rose:
            'bg-rose-50 text-rose-600 dark:bg-rose-900/20',
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${palette[color]}`}
            >
                <Icon size={22} />
            </div>

            <div>
                <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {value ?? '—'}
                </p>

                <p className="text-xs font-bold text-slate-500">
                    {label}
                </p>

                {sub && (
                    <p className="text-[10px] text-slate-400 mt-1">
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── USAGE METER ──────────────────────────────────────────────────────────────
function UsageMeter({
    label,
    used,
    limit,
    color = '#4f46e5',
}) {
    if (limit == null) return null;

    const pct = Math.min((used / limit) * 100, 100);

    const isNear = pct >= 80;
    const isFull = pct >= 100;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {label}
                </span>

                <span
                    className={`text-[10px] font-black ${isFull
                            ? 'text-red-500'
                            : isNear
                                ? 'text-amber-500'
                                : 'text-slate-400'
                        }`}
                >
                    {used}/{limit}
                </span>
            </div>

            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                        width: `${pct}%`,
                        backgroundColor: isFull
                            ? '#ef4444'
                            : isNear
                                ? '#f59e0b'
                                : color,
                    }}
                />
            </div>
        </div>
    );
}

// ─── TIER BADGE ───────────────────────────────────────────────────────────────
function TierBadge({ tier, collapsed }) {
    const vis = TIER_VISUAL[tier] || TIER_VISUAL.free;
    const Icon = vis.icon;

    if (collapsed) {
        return (
            <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br ${vis.gradient} mx-auto`}
            >
                <Icon size={14} className="text-white" />
            </div>
        );
    }

    return (
        <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl ${vis.badge}`}
        >
            <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center bg-gradient-to-br ${vis.gradient}`}
            >
                <Icon size={10} className="text-white" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider">
                {vis.label} Plan
            </span>
        </div>
    );
}

// ─── UPGRADE BANNER ───────────────────────────────────────────────────────────
function UpgradeBanner({ tier, onUpgrade, onDismiss }) {
    if (tier === 'enterprise') return null;

    const messages = {
        free:
            "You're on the Free plan. Upgrade to unlock more students, exams & AI marking.",
        starter:
            'Upgrade to Professional for advanced analytics and unlimited exams.',
        professional:
            'Upgrade to Enterprise for multi-school support and SLA support.',
    };

    return (
        <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 flex items-center gap-4 overflow-hidden print:hidden">
            <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white" />
            </div>

            <div className="relative z-10 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap size={18} className="text-white" />
            </div>

            <div className="relative z-10 flex-1">
                <p className="text-xs font-black text-white">
                    {messages[tier]}
                </p>
            </div>

            <button
                onClick={onUpgrade}
                className="relative z-10 flex items-center gap-2 bg-white text-indigo-700 text-xs font-black px-4 py-2 rounded-xl hover:bg-indigo-50"
            >
                Upgrade
                <ArrowUpRight size={12} />
            </button>

            <button
                onClick={onDismiss}
                className="relative z-10 text-white/70 hover:text-white"
            >
                <X size={14} />
            </button>
        </div>
    );
}

// ─── LOCKED FEATURE ───────────────────────────────────────────────────────────
function LockedFeature({
    featureName,
    requiredTier,
    onUpgrade,
}) {
    const vis =
        TIER_VISUAL[requiredTier] || TIER_VISUAL.starter;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Lock size={22} className="text-slate-400" />
                </div>

                <div>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                        {featureName}
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                        Available on the{' '}
                        <span
                            className={`font-black bg-gradient-to-r ${vis.gradient} bg-clip-text text-transparent`}
                        >
                            {vis.label}
                        </span>{' '}
                        plan and above.
                    </p>
                </div>

                <button
                    onClick={onUpgrade}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600"
                >
                    <Zap size={12} />
                    Upgrade
                </button>
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PrincipalDashboard({
    principal = {},
}) {
    const navigate = useNavigate();
    const { school } = useSchool();

    const schoolId =
        principal?.schoolId || principal?.uid || '';

    const primary = school?.primary || '#4f46e5';

    const currentTier = school?.tier || 'free';

    const tierConfig = getTier(currentTier);

    // ─── STATE ────────────────────────────────────────────────────────────────
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [auditLog, setAuditLog] = useState([]);

    const [activeTab, setActiveTab] =
        useState('overview');

    const [isDark, setIsDark] = useState(false);

    const [sidebarOpen, setSidebarOpen] =
        useState(true);

    const [bannerDismissed, setBannerDismissed] =
        useState(false);

    const [filterGrade, setFilterGrade] =
        useState('All');

    const [filterSubject, setFilterSubject] =
        useState('All');

    const [filterExam, setFilterExam] =
        useState('All');

    const [search, setSearch] = useState('');

    const [selectedStudent, setSelectedStudent] =
        useState(null);

    const [selectedExam, setSelectedExam] =
        useState(null);

    const printRef = useRef(null);

    // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!schoolId) return;

        const unsubs = [
            subscribeToSchoolTeachers(
                schoolId,
                (data) => setTeachers(safeArray(data)),
            ),

            subscribeToSchoolStudents(
                schoolId,
                (data) => setStudents(safeArray(data)),
            ),

            subscribeToSchoolExams(
                schoolId,
                (data) => setExams(safeArray(data)),
            ),

            subscribeToSchoolAttempts(
                schoolId,
                (data) => setAttempts(safeArray(data)),
            ),

            subscribeToAuditLog(
                schoolId,
                (data) => setAuditLog(safeArray(data)),
            ),
        ];

        return () => {
            unsubs.forEach((u) => {
                if (typeof u === 'function') {
                    u();
                }
            });
        };
    }, [schoolId]);

    // ─── DERIVED DATA ─────────────────────────────────────────────────────────
    const gradeCounts = useMemo(
        () => countByGrade(students || []),
        [students],
    );

    const avgScore = useMemo(
        () => averageScore(attempts || []),
        [attempts],
    );

    const overallPassRate = useMemo(
        () => passRate(attempts || []),
        [attempts],
    );

    const subjectGroups = useMemo(
        () => groupBySubject(attempts || []),
        [attempts],
    );

    const allSubjects = useMemo(() => {
        return [
            ...new Set(
                safeArray(students).flatMap(
                    (s) => s.subjects || [],
                ),
            ),
        ].sort();
    }, [students]);

    const studentAttempts = useCallback(
        (uid) =>
            attempts.filter(
                (a) => a.studentUid === uid,
            ),
        [attempts],
    );

    const examAttempts = useCallback(
        (id) =>
            attempts.filter(
                (a) => a.examId === id,
            ),
        [attempts],
    );

    const filteredStudents = useMemo(() => {
        return students.filter((s) => {
            const matchGrade =
                filterGrade === 'All' ||
                s.grade === filterGrade;

            const matchSubject =
                filterSubject === 'All' ||
                (s.subjects || []).includes(
                    filterSubject,
                );

            const term = search.toLowerCase();

            const matchSearch =
                !search ||
                `${s.name || ''} ${s.surname || ''}`
                    .toLowerCase()
                    .includes(term) ||
                (s.email || '')
                    .toLowerCase()
                    .includes(term);

            return (
                matchGrade &&
                matchSubject &&
                matchSearch
            );
        });
    }, [
        students,
        filterGrade,
        filterSubject,
        search,
    ]);

    // ─── UPGRADE ──────────────────────────────────────────────────────────────
    const handleUpgrade = useCallback(() => {
        navigate('/upgrade', {
            state: {
                currentTier,
            },
        });
    }, [navigate, currentTier]);

    // ─── EXPORT PDF ───────────────────────────────────────────────────────────
    const exportPDF = useCallback(() => {
        const pdf = new jsPDF();

        pdf.setFontSize(18);

        pdf.text(
            school?.name || 'School Report',
            20,
            20,
        );

        pdf.setFontSize(10);

        pdf.text(
            `Generated: ${new Date().toLocaleDateString(
                'en-ZA',
            )}`,
            20,
            28,
        );

        autoTable(pdf, {
            startY: 38,
            head: [['Metric', 'Value']],
            body: [
                ['Teachers', teachers.length],
                ['Students', students.length],
                ['Exams', exams.length],
                [
                    'Average Score',
                    avgScore != null
                        ? `${avgScore}%`
                        : '—',
                ],
                [
                    'Pass Rate',
                    `${overallPassRate}%`,
                ],
            ],
        });

        autoTable(pdf, {
            startY:
                pdf.lastAutoTable.finalY + 10,
            head: [
                [
                    'Student',
                    'Grade',
                    'Subjects',
                    'Attempts',
                ],
            ],
            body: filteredStudents.map((s) => [
                `${s.name || ''} ${s.surname || ''}`,
                s.grade || '—',
                (s.subjects || []).join(', '),
                studentAttempts(s.uid).length,
            ]),
        });

        pdf.save(
            `${school?.name || 'report'}.pdf`,
        );
    }, [
        school,
        teachers,
        students,
        exams,
        avgScore,
        overallPassRate,
        filteredStudents,
        studentAttempts,
    ]);

    // ─── PRINT ────────────────────────────────────────────────────────────────
    const handlePrint = () => {
        window.print();
    };

    // ─── SIGN OUT ─────────────────────────────────────────────────────────────
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error(error);
        }
    };

    // ─── TABS ─────────────────────────────────────────────────────────────────
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: BarChart2,
        },
        {
            id: 'students',
            label: 'Students',
            icon: Users,
        },
        {
            id: 'exams',
            label: 'Exams',
            icon: FileText,
        },
        {
            id: 'audit',
            label: 'Audit Log',
            icon: AlertTriangle,
            locked: !isFeatureAllowed(
                currentTier,
                'auditLog',
            ),
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
        },
    ];

    // ─── RENDER ───────────────────────────────────────────────────────────────
    return (
        <div
            className={`min-h-screen flex ${isDark
                    ? 'dark bg-slate-950 text-white'
                    : 'bg-slate-50 text-slate-900'
                }`}
        >
            {/* ─── SIDEBAR ─────────────────────────────────────────────────────── */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-all duration-300 print:hidden`}
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                backgroundColor:
                                    primary + '20',
                            }}
                        >
                            {school?.logoUrl ? (
                                <img
                                    src={school.logoUrl}
                                    alt="School"
                                    className="w-8 h-8 object-contain"
                                />
                            ) : (
                                <School
                                    size={20}
                                    style={{
                                        color: primary,
                                    }}
                                />
                            )}
                        </div>

                        {sidebarOpen && (
                            <div className="overflow-hidden">
                                <p className="text-xs font-black truncate">
                                    {school?.name ||
                                        'School'}
                                </p>

                                <p className="text-[10px] text-slate-400 truncate">
                                    {principal?.title}{' '}
                                    {principal?.surname}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <TierBadge
                            tier={currentTier}
                            collapsed={!sidebarOpen}
                        />
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;

                        const active =
                            activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.locked) {
                                        handleUpgrade();
                                        return;
                                    }

                                    setActiveTab(tab.id);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black transition-all ${active
                                        ? 'text-white'
                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                style={
                                    active
                                        ? {
                                            backgroundColor:
                                                primary,
                                        }
                                        : {}
                                }
                            >
                                <Icon size={16} />

                                {sidebarOpen && (
                                    <span className="flex-1 text-left">
                                        {tab.label}
                                    </span>
                                )}

                                {tab.locked &&
                                    sidebarOpen && (
                                        <Lock
                                            size={12}
                                        />
                                    )}
                            </button>
                        );
                    })}
                </nav>

                {/* Usage */}
                {sidebarOpen && (
                    <div className="px-3 pb-3 space-y-3">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Usage
                            </p>

                            <UsageMeter
                                label="Students"
                                used={students.length}
                                limit={
                                    tierConfig?.limits
                                        ?.students
                                }
                                color={primary}
                            />

                            <UsageMeter
                                label="Teachers"
                                used={teachers.length}
                                limit={
                                    tierConfig?.limits
                                        ?.teachers
                                }
                                color={primary}
                            />

                            <UsageMeter
                                label="Exams"
                                used={exams.length}
                                limit={
                                    tierConfig?.limits
                                        ?.exams
                                }
                                color={primary}
                            />
                        </div>

                        {currentTier !==
                            'enterprise' && (
                                <button
                                    onClick={
                                        handleUpgrade
                                    }
                                    className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[10px] font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600"
                                >
                                    <Zap size={12} />
                                    Upgrade Plan
                                </button>
                            )}
                    </div>
                )}

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <button
                        onClick={() =>
                            setIsDark((d) => !d)
                        }
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {isDark ? (
                            <Sun size={16} />
                        ) : (
                            <Moon size={16} />
                        )}

                        {sidebarOpen &&
                            (isDark
                                ? 'Light Mode'
                                : 'Dark Mode')}
                    </button>

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                        <LogOut size={16} />

                        {sidebarOpen &&
                            'Sign Out'}
                    </button>
                </div>
            </aside>

            {/* ─── MAIN ────────────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 print:hidden">
                    <button
                        onClick={() =>
                            setSidebarOpen(
                                (o) => !o,
                            )
                        }
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex-1">
                        <h1 className="text-lg font-black">
                            Principal Dashboard
                        </h1>

                        <p className="text-xs text-slate-400">
                            {school?.name}
                        </p>
                    </div>

                    <button
                        onClick={exportPDF}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700"
                    >
                        <Download size={14} />
                        Export PDF
                    </button>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700"
                    >
                        <Printer size={14} />
                        Print
                    </button>
                </header>

                {/* Content */}
                <div
                    ref={printRef}
                    className="flex-1 p-6 overflow-y-auto space-y-6"
                >
                    {/* Upgrade Banner */}
                    {activeTab ===
                        'overview' &&
                        !bannerDismissed &&
                        currentTier !==
                        'enterprise' && (
                            <UpgradeBanner
                                tier={
                                    currentTier
                                }
                                onUpgrade={
                                    handleUpgrade
                                }
                                onDismiss={() =>
                                    setBannerDismissed(
                                        true,
                                    )
                                }
                            />
                        )}

                    {/* OVERVIEW */}
                    {activeTab ===
                        'overview' && (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        label="Teachers"
                                        value={
                                            teachers.length
                                        }
                                        icon={Users}
                                    />

                                    <StatCard
                                        label="Students"
                                        value={
                                            students.length
                                        }
                                        icon={Users}
                                        color="emerald"
                                    />

                                    <StatCard
                                        label="Exams"
                                        value={
                                            exams.length
                                        }
                                        icon={FileText}
                                        color="amber"
                                    />

                                    <StatCard
                                        label="Average Score"
                                        value={
                                            avgScore !=
                                                null
                                                ? `${avgScore}%`
                                                : '—'
                                        }
                                        icon={
                                            TrendingUp
                                        }
                                        color="rose"
                                        sub={`Pass Rate: ${overallPassRate}%`}
                                    />
                                </div>

                                {/* Grades */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                    <h2 className="text-sm font-black mb-5">
                                        Students per
                                        Grade
                                    </h2>

                                    <div className="flex items-end gap-3 h-40">
                                        {GRADE_ORDER.map(
                                            (grade) => {
                                                const count =
                                                    gradeCounts[
                                                    grade
                                                    ] || 0;

                                                const max =
                                                    Math.max(
                                                        ...GRADE_ORDER.map(
                                                            (
                                                                g,
                                                            ) =>
                                                                gradeCounts[
                                                                g
                                                                ] ||
                                                                0,
                                                        ),
                                                        1,
                                                    );

                                                const pct =
                                                    (count /
                                                        max) *
                                                    100;

                                                return (
                                                    <div
                                                        key={
                                                            grade
                                                        }
                                                        className="flex-1 flex flex-col items-center gap-2"
                                                    >
                                                        <span className="text-xs font-black">
                                                            {
                                                                count
                                                            }
                                                        </span>

                                                        <div
                                                            className="w-full rounded-t-xl"
                                                            style={{
                                                                height: `${pct}%`,
                                                                minHeight:
                                                                    count
                                                                        ? 8
                                                                        : 0,
                                                                backgroundColor:
                                                                    primary,
                                                            }}
                                                        />

                                                        <span className="text-[10px] text-slate-400">
                                                            {grade.replace(
                                                                'Grade ',
                                                                'Gr ',
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                    {/* STUDENTS */}
                    {activeTab ===
                        'students' && (
                            <>
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex flex-wrap gap-3">
                                    <div className="relative flex-1 min-w-[220px]">
                                        <Search
                                            size={14}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={search}
                                            onChange={(e) =>
                                                setSearch(
                                                    e.target
                                                        .value,
                                                )
                                            }
                                            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 outline-none"
                                        />
                                    </div>

                                    <select
                                        value={
                                            filterGrade
                                        }
                                        onChange={(e) =>
                                            setFilterGrade(
                                                e.target
                                                    .value,
                                            )
                                        }
                                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700"
                                    >
                                        <option value="All">
                                            All Grades
                                        </option>

                                        {GRADE_ORDER.map(
                                            (g) => (
                                                <option
                                                    key={g}
                                                    value={g}
                                                >
                                                    {g}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-700">
                                                {[
                                                    'Name',
                                                    'Grade',
                                                    'Attempts',
                                                    'Average',
                                                    '',
                                                ].map(
                                                    (
                                                        h,
                                                    ) => (
                                                        <th
                                                            key={
                                                                h
                                                            }
                                                            className="text-left px-4 py-3 font-black text-slate-400 uppercase text-[10px]"
                                                        >
                                                            {h}
                                                        </th>
                                                    ),
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {filteredStudents.map(
                                                (s) => {
                                                    const atts =
                                                        studentAttempts(
                                                            s.uid,
                                                        );

                                                    const avg =
                                                        averageScore(
                                                            atts,
                                                        );

                                                    return (
                                                        <tr
                                                            key={
                                                                s.uid
                                                            }
                                                            className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                                        >
                                                            <td className="px-4 py-3 font-bold">
                                                                {
                                                                    s.name
                                                                }{' '}
                                                                {
                                                                    s.surname
                                                                }
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {
                                                                    s.grade
                                                                }
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {
                                                                    atts.length
                                                                }
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <ScoreBadge
                                                                    score={
                                                                        avg
                                                                    }
                                                                />
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <button
                                                                    onClick={() =>
                                                                        setSelectedStudent(
                                                                            s,
                                                                        )
                                                                    }
                                                                >
                                                                    <Eye
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                },
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Drilldown */}
                                {selectedStudent && (
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                                        <div className="flex items-center justify-between mb-5">
                                            <div>
                                                <h3 className="text-sm font-black">
                                                    {
                                                        selectedStudent.name
                                                    }{' '}
                                                    {
                                                        selectedStudent.surname
                                                    }
                                                </h3>

                                                <p className="text-xs text-slate-400">
                                                    {
                                                        selectedStudent.email
                                                    }
                                                </p>
                                            </div>

                                            <button
                                                onClick={() =>
                                                    setSelectedStudent(
                                                        null,
                                                    )
                                                }
                                            >
                                                <X
                                                    size={18}
                                                />
                                            </button>
                                        </div>

                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                                    {[
                                                        'Exam',
                                                        'Subject',
                                                        'Score',
                                                        'Date',
                                                    ].map(
                                                        (
                                                            h,
                                                        ) => (
                                                            <th
                                                                key={
                                                                    h
                                                                }
                                                                className="text-left px-3 py-2 font-black text-slate-400 uppercase text-[10px]"
                                                            >
                                                                {h}
                                                            </th>
                                                        ),
                                                    )}
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {studentAttempts(
                                                    selectedStudent.uid,
                                                ).map(
                                                    (
                                                        a,
                                                    ) => (
                                                        <tr
                                                            key={
                                                                a.id
                                                            }
                                                            className="border-b border-slate-50 dark:border-slate-700/50"
                                                        >
                                                            <td className="px-3 py-2 font-bold">
                                                                {a.examTitle ||
                                                                    'Exam'}
                                                            </td>

                                                            <td className="px-3 py-2">
                                                                {a.subject ||
                                                                    '—'}
                                                            </td>

                                                            <td className="px-3 py-2">
                                                                <ScoreBadge
                                                                    score={
                                                                        a.score
                                                                    }
                                                                />
                                                            </td>

                                                            <td className="px-3 py-2">
                                                                {formatDate(
                                                                    a.submittedAt,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}

                    {/* EXAMS */}
                    {activeTab ===
                        'exams' && (
                            <div className="space-y-3">
                                {exams.map((ex) => {
                                    const atts =
                                        examAttempts(
                                            ex.id,
                                        );

                                    const avg =
                                        averageScore(
                                            atts,
                                        );

                                    const isOpen =
                                        selectedExam ===
                                        ex.id;

                                    return (
                                        <div
                                            key={ex.id}
                                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
                                        >
                                            <button
                                                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                                onClick={() =>
                                                    setSelectedExam(
                                                        isOpen
                                                            ? null
                                                            : ex.id,
                                                    )
                                                }
                                            >
                                                <div className="flex-1 text-left">
                                                    <p className="text-xs font-black">
                                                        {
                                                            ex.title
                                                        }
                                                    </p>

                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {
                                                            ex.subject
                                                        }{' '}
                                                        ·{' '}
                                                        {
                                                            ex.grade
                                                        }
                                                    </p>
                                                </div>

                                                <ScoreBadge
                                                    score={
                                                        avg
                                                    }
                                                />

                                                {isOpen ? (
                                                    <ChevronDown
                                                        size={
                                                            14
                                                        }
                                                    />
                                                ) : (
                                                    <ChevronRight
                                                        size={
                                                            14
                                                        }
                                                    />
                                                )}
                                            </button>

                                            {isOpen && (
                                                <div className="border-t border-slate-100 dark:border-slate-700 p-5">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-slate-100 dark:border-slate-700">
                                                                {[
                                                                    'Student',
                                                                    'Score',
                                                                    'Date',
                                                                ].map(
                                                                    (
                                                                        h,
                                                                    ) => (
                                                                        <th
                                                                            key={
                                                                                h
                                                                            }
                                                                            className="text-left px-3 py-2 font-black text-slate-400 uppercase text-[10px]"
                                                                        >
                                                                            {
                                                                                h
                                                                            }
                                                                        </th>
                                                                    ),
                                                                )}
                                                            </tr>
                                                        </thead>

                                                        <tbody>
                                                            {atts.map(
                                                                (
                                                                    a,
                                                                ) => (
                                                                    <tr
                                                                        key={
                                                                            a.id
                                                                        }
                                                                        className="border-b border-slate-50 dark:border-slate-700/50"
                                                                    >
                                                                        <td className="px-3 py-2 font-bold">
                                                                            {a.studentName ||
                                                                                'Student'}
                                                                        </td>

                                                                        <td className="px-3 py-2">
                                                                            <ScoreBadge
                                                                                score={
                                                                                    a.score
                                                                                }
                                                                            />
                                                                        </td>

                                                                        <td className="px-3 py-2">
                                                                            {formatDate(
                                                                                a.submittedAt,
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ),
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                    {/* AUDIT */}
                    {activeTab ===
                        'audit' &&
                        (isFeatureAllowed(
                            currentTier,
                            'auditLog',
                        ) ? (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                                    <h2 className="text-sm font-black">
                                        Audit Log
                                    </h2>
                                </div>

                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700">
                                            {[
                                                'Type',
                                                'Description',
                                                'Actor',
                                                'Timestamp',
                                            ].map(
                                                (
                                                    h,
                                                ) => (
                                                    <th
                                                        key={
                                                            h
                                                        }
                                                        className="text-left px-4 py-3 font-black text-slate-400 uppercase text-[10px]"
                                                    >
                                                        {h}
                                                    </th>
                                                ),
                                            )}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {auditLog.map(
                                            (
                                                ev,
                                            ) => (
                                                <tr
                                                    key={
                                                        ev.id
                                                    }
                                                    className="border-b border-slate-50 dark:border-slate-700/50"
                                                >
                                                    <td className="px-4 py-3">
                                                        {
                                                            ev.type
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {
                                                            ev.description
                                                        }
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {ev.actorName ||
                                                            'System'}
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        {formatDateTime(
                                                            ev.timestamp,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <LockedFeature
                                featureName="Audit Log"
                                requiredTier="starter"
                                onUpgrade={
                                    handleUpgrade
                                }
                            />
                        ))}

                    {/* SETTINGS */}
                    {activeTab ===
                        'settings' && (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                                    <h2 className="text-sm font-black mb-4">
                                        School Settings
                                    </h2>

                                    <button
                                        className="px-6 py-3 rounded-xl text-white text-xs font-black"
                                        style={{
                                            backgroundColor:
                                                primary,
                                        }}
                                        onClick={() =>
                                            navigate(
                                                '/school-registration',
                                            )
                                        }
                                    >
                                        Edit School
                                        Profile
                                    </button>

                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            [
                                                'School Name',
                                                school?.name,
                                            ],
                                            [
                                                'Motto',
                                                school?.motto,
                                            ],
                                            [
                                                'Province',
                                                school?.province,
                                            ],
                                            [
                                                'District',
                                                school?.district,
                                            ],
                                        ].map(
                                            (
                                                [
                                                    label,
                                                    value,
                                                ],
                                            ) => (
                                                <div
                                                    key={
                                                        label
                                                    }
                                                    className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl"
                                                >
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        {
                                                            label
                                                        }
                                                    </p>

                                                    <p className="text-sm font-bold mt-1">
                                                        {value ||
                                                            '—'}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                </div>
            </main>

            {/* Print styles */}
            <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }

          body {
            background: white !important;
          }
        }
      `}</style>
        </div>
    );
}