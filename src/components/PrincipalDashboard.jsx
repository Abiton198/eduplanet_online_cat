// ─── PrincipalDashboard.jsx (UPDATED) ────────────────────────────────────────
// ✦ Mobile-first responsive layout
// ✦ Bottom tab bar on mobile, collapsible sidebar on desktop
// ✦ New "Subscriptions" tab above Settings
// ✦ All existing features preserved

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../utils/firebase';

import {
    Users, BookOpen, FileText, TrendingUp, Award, AlertTriangle,
    ChevronDown, ChevronRight, Filter, Download, Printer, LogOut,
    Search, X, Eye, BarChart2, CheckCircle2, Clock, RefreshCw,
    School, Settings, Moon, Sun, Menu, Zap, Lock, ArrowUpRight,
    Sparkles, Crown, Star, CreditCard, ChevronLeft,
} from 'lucide-react';
import PaymentManager from './PaymentManager';
import SubscriptionManager from './SubscriptionManager';
import {
    subscribeToSchoolTeachers, subscribeToSchoolStudents,
    subscribeToSchoolExams, subscribeToSchoolAttempts, subscribeToAuditLog,
    countByGrade, averageScore, groupBySubject, passRate,
} from '../utils/firestoreHelpers';
import { useSchool } from '../utils/schoolContext';
import { TIERS, getTierConfig, isFeatureAllowed, isAtLimit, getUsagePercent } from '../utils/tierConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { onSnapshot, collection, getDoc, getDocs, query, where } from 'firebase/firestore';


// ─── GRADE ORDER ──────────────────────────────────────────────────────────────
const GRADE_ORDER = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

// ─── TIER VISUAL META ─────────────────────────────────────────────────────────
const TIER_VISUAL = {
    free: {
        label: 'Free',
        icon: Star,
        gradient: 'from-slate-400 to-slate-500',
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        ring: 'ring-slate-300',
    },
    starter: {
        label: 'Starter',
        icon: Zap,
        gradient: 'from-blue-500 to-cyan-500',
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        ring: 'ring-blue-400',
    },
    professional: {
        label: 'Professional',
        icon: Sparkles,
        gradient: 'from-violet-500 to-purple-600',
        badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
        ring: 'ring-violet-400',
    },
    enterprise: {
        label: 'Enterprise',
        icon: Crown,
        gradient: 'from-amber-400 to-orange-500',
        badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        ring: 'ring-amber-400',
    },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
    if (score == null) return <span className="text-slate-400 text-xs">—</span>;
    const color = score >= 70 ? 'text-emerald-600 bg-emerald-50' :
        score >= 50 ? 'text-amber-600 bg-amber-50' :
            score >= 40 ? 'text-orange-600 bg-orange-50' :
                'text-red-600 bg-red-50';
    return (
        <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${color}`}>{score}%</span>
    );
}

function StatCard({ label, value, sub, icon: Icon, color = 'indigo' }) {
    const palette = {
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20',
        rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20',
    };
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${palette[color]}`}>
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="text-xl font-black text-slate-800 dark:text-white leading-none">{value ?? '—'}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">{label}</p>
                {sub && <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function UsageMeter({ label, used, limit, color = '#4f46e5' }) {
    if (limit == null) return null;
    const pct = Math.min((used / limit) * 100, 100);
    const isNear = pct >= 80;
    const isFull = pct >= 100;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{label}</span>
                <span className={`text-[10px] font-black ${isFull ? 'text-red-500' : isNear ? 'text-amber-500' : 'text-slate-400'}`}>
                    {used}/{limit}
                </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: isFull ? '#ef4444' : isNear ? '#f59e0b' : color }}
                />
            </div>
        </div>
    );
}

function TierBadge({ tier, collapsed }) {
    const vis = TIER_VISUAL[tier] || TIER_VISUAL.free;
    const Icon = vis.icon;
    if (collapsed) {
        return (
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br ${vis.gradient} mx-auto`}>
                <Icon size={14} className="text-white" />
            </div>
        );
    }
    return (
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${vis.badge}`}>
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center bg-gradient-to-br ${vis.gradient} flex-shrink-0`}>
                <Icon size={10} className="text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">{vis.label} Plan</span>
        </div>
    );
}

function UpgradeBanner({ tier, onUpgrade, onDismiss }) {
    if (tier === 'enterprise') return null;
    const messages = {
        free: "You're on the Free plan. Upgrade to unlock more students, exams & AI marking.",
        starter: 'Upgrade to Professional for unlimited exams, advanced analytics & priority support.',
        professional: 'Upgrade to Enterprise for multi-school management, SLA support & custom branding.',
    };
    return (
        <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 flex items-center gap-3 overflow-hidden print:hidden">
            <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white" />
                <div className="absolute -bottom-8 right-20 w-24 h-24 rounded-full bg-white" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-white leading-snug">{messages[tier] || messages.free}</p>
            </div>
            <button
                onClick={onUpgrade}
                className="flex-shrink-0 flex items-center gap-1 bg-white text-indigo-700 text-[10px] font-black px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
            >
                Upgrade <ArrowUpRight size={11} />
            </button>
            {onDismiss && (
                <button onClick={onDismiss} className="flex-shrink-0 text-white/60 hover:text-white">
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

function LockedFeature({ featureName, requiredTier, onUpgrade }) {
    const vis = TIER_VISUAL[requiredTier] || TIER_VISUAL.starter;
    return (
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center overflow-hidden">
            <div className="absolute inset-0 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-[2px] rounded-2xl" />
            <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Lock size={20} className="text-slate-400" />
                </div>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{featureName}</p>
                <p className="text-xs text-slate-400">
                    Available on the{' '}
                    <span className={`font-black bg-gradient-to-r ${vis.gradient} bg-clip-text text-transparent`}>
                        {TIER_VISUAL[requiredTier]?.label}
                    </span>{' '}
                    plan and above.
                </p>
                <button
                    onClick={onUpgrade}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-opacity"
                >
                    <Zap size={12} /> Unlock {TIER_VISUAL[requiredTier]?.label}
                </button>
            </div>
        </div>
    );
}

// ─── MOBILE DRAWER OVERLAY ────────────────────────────────────────────────────
function MobileDrawer({ open, onClose, children }) {
    if (!open) return null;
    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
                onClick={onClose}
            />
            <div className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col md:hidden transition-transform">
                {children}
            </div>
        </>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PrincipalDashboard({ principal }) {
    const navigate = useNavigate();
    const { school } = useSchool();
    const primary = school?.primary || '#4f46e5';

    const currentTier = school?.tier || 'free';
    const tierConfig = getTierConfig(currentTier);
    const [bannerDismissed, setBannerDismissed] = useState(false);

    // Data
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [auditLog, setAuditLog] = useState([]);

    // UI
    const [activeTab, setActiveTab] = useState('overview');
    const [isDark, setIsDark] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);       // desktop sidebar collapsed state
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false); // mobile drawer
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Filters
    const [filterGrade, setFilterGrade] = useState('All');
    const [filterSubject, setFilterSubject] = useState('All');
    const [filterExam, setFilterExam] = useState('All');
    const [search, setSearch] = useState('');

    // Drill-down
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedExam, setSelectedExam] = useState(null);

    const schoolId = principal?.schoolId || principal?.uid;
    const printRef = useRef();

    useEffect(() => {
        if (!schoolId) return;

        const unsub = onSnapshot(
            collection(db, "students"),
            (snap) => {
                const data = snap.docs.map(d => d.data());
                setStudents(data);
            }
        );

        return () => unsub();
    }, [schoolId]);

    useEffect(() => {
        if (!schoolId) return;

        const unsub = onSnapshot(
            collection(db, "exams"),
            (snap) => {
                const data = snap.docs.map(d => d.data());
                setExams(data);
            }
        );

        return () => unsub();
    }, [schoolId]);

    useEffect(() => {
        if (!schoolId) return;

        const unsub = onSnapshot(
            collection(db, "teachers"),
            (snap) => {
                const data = snap.docs.map(d => d.data());
                setTeachers(data);
            }
        );

        return () => unsub();
    }, [schoolId]);

    useEffect(() => {
        if (!schoolId) return;
        const unsubs = [
            subscribeToSchoolTeachers(schoolId, setTeachers),
            subscribeToSchoolStudents(schoolId, setStudents),
            subscribeToSchoolExams(schoolId, setExams),
            subscribeToSchoolAttempts(schoolId, setAttempts),
            subscribeToAuditLog(schoolId, setAuditLog),
        ];
        return () => unsubs.forEach(u => u());
    }, [schoolId]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const gradeCounts = countByGrade(students);
    const avgScore = averageScore(attempts);
    const overallPassRate = passRate(attempts);
    const subjectGroups = groupBySubject(attempts);
    const allSubjects = [...new Set(students.flatMap(s => s.subjects || []))].sort();

    const filteredStudents = students.filter(s => {
        const matchGrade = filterGrade === 'All' || s.grade === filterGrade;
        const matchSubject = filterSubject === 'All' || (s.subjects || []).includes(filterSubject);
        const matchSearch = !search ||
            `${s.name} ${s.surname}`.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase());
        return matchGrade && matchSubject && matchSearch;
    });

    const studentAttempts = uid => attempts.filter(a => a.studentUid === uid);
    const examAttempts = id => attempts.filter(a => a.examId === id);

    const handleUpgrade = useCallback(() => setShowUpgradeModal(true), []);

    const exportPDF = useCallback(() => {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.setFontSize(18);
        pdf.setTextColor(40, 40, 40);
        pdf.text(school?.name || 'School Report', 20, 20);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, 20, 27);
        pdf.text(`Principal: ${principal?.title || ''} ${principal?.name || ''} ${principal?.surname || ''}`, 20, 33);
        pdf.text(`Plan: ${TIER_VISUAL[currentTier]?.label || currentTier}`, 20, 39);

        let y = 48;
        autoTable(pdf, {
            startY: y,
            head: [['Metric', 'Value']],
            body: [
                ['Total Teachers', teachers.length],
                ['Total Students', students.length],
                ['Exams Uploaded', exams.length],
                ['Avg Score', avgScore != null ? `${avgScore}%` : '—'],
                ['Pass Rate', `${overallPassRate}%`],
            ],
            styles: { fontSize: 9 },
            headStyles: { fillColor: [79, 70, 229] },
        });
        y = pdf.lastAutoTable.finalY + 10;

        autoTable(pdf, {
            startY: y,
            head: [['Name', 'Surname', 'Grade', 'Subjects', 'Avg Score']],
            body: filteredStudents.map(s => {
                const atts = studentAttempts(s.uid);
                return [s.name, s.surname, s.grade,
                (s.subjects || []).slice(0, 3).join(', '),
                averageScore(atts) != null ? `${averageScore(atts)}%` : '—'];
            }),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229] },
        });

        pdf.save(`${school?.name || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`);
    }, [school, principal, teachers, students, exams, attempts, filteredStudents, avgScore, overallPassRate, currentTier]);

    const handlePrint = () => window.print();
    const handleSignOut = async () => { await signOut(auth); navigate('/'); };

    // ── TABS CONFIG ───────────────────────────────────────────────────────────
    // 'subscriptions' added above 'settings'
    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart2 },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'exams', label: 'Exams', icon: FileText },
        {
            id: 'audit',
            label: 'Audit Log',
            icon: AlertTriangle,
            locked: !isFeatureAllowed(currentTier, 'auditLog'),
            requiredTier: 'starter',
        },
        { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    // Bottom nav for mobile (only top 5 to keep it tight)
    const mobileBottomTabs = tabs.slice(0, 5);

    // ── SIDEBAR CONTENT (shared between desktop sidebar & mobile drawer) ──────
    const SidebarContent = ({ onNavClick }) => (
        <>
            {/* School brand */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: primary + '20' }}
                    >
                        {school?.logoUrl
                            ? <img src={school.logoUrl} alt="logo" className="w-8 h-8 object-contain" />
                            : <School size={20} style={{ color: primary }} />
                        }
                    </div>
                    {(sidebarOpen || onNavClick) && (
                        <div className="overflow-hidden">
                            <p className="text-xs font-black text-slate-800 dark:text-white truncate">{school?.name || 'School'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{principal?.title} {principal?.surname}</p>
                        </div>
                    )}
                </div>
                <div className={`mt-3 ${(sidebarOpen || onNavClick) ? '' : 'flex justify-center'}`}>
                    <TierBadge tier={currentTier} collapsed={!sidebarOpen && !onNavClick} />
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {tabs.map(t => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (t.locked) { handleUpgrade(); return; }
                                setActiveTab(t.id);
                                onNavClick?.();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black transition-all ${isActive
                                ? 'text-white'
                                : t.locked
                                    ? 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            style={isActive ? { backgroundColor: primary } : {}}
                        >
                            <Icon size={16} className="flex-shrink-0" />
                            {(sidebarOpen || onNavClick) && (
                                <span className="flex-1 text-left">{t.label}</span>
                            )}
                            {(sidebarOpen || onNavClick) && t.locked && (
                                <Lock size={11} className="text-slate-300 dark:text-slate-600" />
                            )}
                            {/* Subscriptions highlight pill */}
                            {t.id === 'subscriptions' && !isActive && (sidebarOpen || onNavClick) && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 uppercase">
                                    New
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Usage meters */}
            {(sidebarOpen || onNavClick) && (
                <div className="px-3 pb-2 space-y-3 flex-shrink-0">
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 space-y-2.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Usage</p>
                        <UsageMeter label="Students" used={students.length} limit={tierConfig?.limits?.students ?? null} color={primary} />
                        <UsageMeter label="Exams" used={exams.length} limit={tierConfig?.limits?.exams ?? null} color={primary} />
                        <UsageMeter label="Teachers" used={teachers.length} limit={tierConfig?.limits?.teachers ?? null} color={primary} />
                    </div>
                    {currentTier !== 'enterprise' && (
                        <button
                            onClick={handleUpgrade}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-opacity"
                        >
                            <Zap size={11} /> Upgrade Plan
                        </button>
                    )}
                </div>
            )}

            {/* Bottom actions */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1 flex-shrink-0">
                <button
                    onClick={() => setIsDark(d => !d)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                    {(sidebarOpen || onNavClick) && (isDark ? 'Light Mode' : 'Dark Mode')}
                </button>
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                >
                    <LogOut size={15} />
                    {(sidebarOpen || onNavClick) && 'Sign Out'}
                </button>
            </div>
        </>
    );

    return (
        <div className={`min-h-screen flex ${isDark ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

            {/* ── DESKTOP SIDEBAR ── */}
            <aside
                className={`hidden md:flex ${sidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex-col transition-all duration-300 print:hidden`}
            >
                <SidebarContent />
            </aside>

            {/* ── MOBILE DRAWER ── */}
            <MobileDrawer open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)}>
                <div className="flex flex-col h-full overflow-hidden">
                    <SidebarContent onNavClick={() => setMobileDrawerOpen(false)} />
                </div>
            </MobileDrawer>

            {/* ── MAIN CONTENT ── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Top bar */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-3 print:hidden sticky top-0 z-30">
                    <button
                        onClick={() => {
                            if (window.innerWidth < 768) {
                                setMobileDrawerOpen(o => !o);
                            } else {
                                setSidebarOpen(o => !o);
                            }
                        }}
                        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-black text-slate-800 dark:text-white truncate">Principal Dashboard</h1>
                        <p className="text-[9px] text-slate-400 hidden sm:block truncate">
                            {school?.name} · {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    {/* Tier chip */}
                    <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black ${TIER_VISUAL[currentTier]?.badge}`}>
                        {React.createElement(TIER_VISUAL[currentTier]?.icon || Star, { size: 10 })}
                        {TIER_VISUAL[currentTier]?.label}
                    </div>

                    <button
                        onClick={exportPDF}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <Download size={12} /> Export
                    </button>
                    <button
                        onClick={handlePrint}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <Printer size={12} /> Print
                    </button>

                    {/* Mobile: export icon only */}
                    <button onClick={exportPDF} className="sm:hidden text-slate-400 hover:text-slate-600">
                        <Download size={18} />
                    </button>
                </header>

                {/* Page content */}
                <div ref={printRef} className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 pb-24 md:pb-6">

                    {/* Upgrade banner */}
                    {activeTab === 'overview' && !bannerDismissed && currentTier !== 'enterprise' && (
                        <UpgradeBanner
                            tier={currentTier}
                            onUpgrade={handleUpgrade}
                            onDismiss={() => setBannerDismissed(true)}
                        />
                    )}

                    {/* ── OVERVIEW TAB ── */}
                    {activeTab === 'overview' && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <StatCard label="Teachers" value={teachers.length} icon={Users} color="indigo" />
                                <StatCard label="Students" value={students.length} icon={Users} color="emerald" />
                                <StatCard label="Exams" value={exams.length} icon={FileText} color="amber" />
                                <StatCard label="Avg Score" value={avgScore != null ? `${avgScore}%` : '—'} icon={TrendingUp} color="rose" sub={`Pass: ${overallPassRate}%`} />
                            </div>

                            {/* Grade chart */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                <h2 className="text-sm font-black text-slate-700 dark:text-white mb-4">Students per Grade</h2>
                                <div className="flex items-end gap-2 md:gap-3 h-28">
                                    {GRADE_ORDER.map(g => {
                                        const count = gradeCounts[g] || 0;
                                        const max = Math.max(...GRADE_ORDER.map(gr => gradeCounts[gr] || 0), 1);
                                        const pct = (count / max) * 100;
                                        return (
                                            <div key={g} className="flex-1 flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{count}</span>
                                                <div className="w-full rounded-t-xl transition-all duration-700"
                                                    style={{ height: `${pct}%`, backgroundColor: primary, minHeight: count ? 6 : 0 }} />
                                                <span className="text-[9px] text-slate-400 font-bold">{g.replace('Grade ', 'Gr ')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Subject performance */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                <h2 className="text-sm font-black text-slate-700 dark:text-white mb-4">Performance by Subject</h2>
                                {Object.keys(subjectGroups).length === 0
                                    ? <p className="text-xs text-slate-400">No attempts recorded yet.</p>
                                    : (
                                        <div className="space-y-2">
                                            {Object.entries(subjectGroups).sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([sub, atts]) => {
                                                const avg = averageScore(atts);
                                                return (
                                                    <div key={sub} className="flex items-center gap-2 md:gap-3">
                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-28 md:w-36 truncate">{sub}</span>
                                                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                                            <div className="h-2 rounded-full transition-all duration-700"
                                                                style={{ width: `${avg || 0}%`, backgroundColor: primary }} />
                                                        </div>
                                                        <ScoreBadge score={avg} />
                                                        <span className="text-[9px] text-slate-400 w-14 md:w-16 text-right">{atts.length} att.</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                            </div>

                            {/* Recent activity */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                <h2 className="text-sm font-black text-slate-700 dark:text-white mb-4">Recent Activity</h2>
                                {auditLog.length === 0
                                    ? <p className="text-xs text-slate-400">No activity recorded yet.</p>
                                    : (
                                        <div className="space-y-2">
                                            {auditLog.slice(0, 5).map(ev => (
                                                <div key={ev.id} className="flex items-start gap-3 text-xs">
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        {ev.type === 'ai_mark' ? <Award size={10} className="text-indigo-500" />
                                                            : ev.type === 'remark' ? <RefreshCw size={10} className="text-amber-500" />
                                                                : <CheckCircle2 size={10} className="text-emerald-500" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 dark:text-slate-200">{ev.description || ev.type}</p>
                                                        <p className="text-slate-400">{ev.actorName || 'System'} · {ev.timestamp?.toDate?.().toLocaleDateString('en-ZA') || '—'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>
                        </>
                    )}

                    {/* ── STUDENTS TAB ── */}
                    {activeTab === 'students' && (
                        <>
                            {isAtLimit(currentTier, 'students', students.length) && (
                                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
                                    <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex-1">
                                        Student limit reached on <span className="font-black">{TIER_VISUAL[currentTier]?.label}</span>.
                                    </p>
                                    <button onClick={handleUpgrade} className="text-xs font-black text-amber-700 dark:text-amber-300 underline underline-offset-2 flex-shrink-0">
                                        Upgrade →
                                    </button>
                                </div>
                            )}

                            {/* Filter bar */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-2">
                                <div className="relative flex-1 min-w-36">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text" value={search} placeholder="Search..."
                                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 outline-none focus:border-indigo-500"
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                                    className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 outline-none font-bold">
                                    <option value="All">All Grades</option>
                                    {GRADE_ORDER.map(g => <option key={g}>{g}</option>)}
                                </select>
                                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                                    className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 outline-none font-bold">
                                    <option value="All">All Subjects</option>
                                    {allSubjects.map(s => <option key={s}>{s}</option>)}
                                </select>
                                <span className="text-[10px] text-slate-400 font-bold">{filteredStudents.length} students</span>
                            </div>

                            {/* Mobile card list / desktop table */}
                            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700">
                                            {['Name', 'Grade', 'Subjects', 'Attempts', 'Avg', 'Pass Rate', ''].map(h => (
                                                <th key={h} className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider text-[9px]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.length === 0
                                            ? <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-xs">No students found.</td></tr>
                                            : filteredStudents.map(s => {
                                                const atts = studentAttempts(s.uid);
                                                const avg = averageScore(atts);
                                                const pr = passRate(atts);
                                                return (
                                                    <tr key={s.uid}
                                                        className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                                                        onClick={() => setSelectedStudent(selectedStudent?.uid === s.uid ? null : s)}>
                                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{s.name} {s.surname}</td>
                                                        <td className="px-4 py-3 text-slate-500">{s.grade}</td>
                                                        <td className="px-4 py-3 text-slate-500">
                                                            <div className="flex flex-wrap gap-1">
                                                                {(s.subjects || []).slice(0, 2).map(sub => (
                                                                    <span key={sub} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-bold">{sub}</span>
                                                                ))}
                                                                {(s.subjects || []).length > 2 && (
                                                                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] text-slate-400">+{s.subjects.length - 2}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500">{atts.length}</td>
                                                        <td className="px-4 py-3"><ScoreBadge score={avg} /></td>
                                                        <td className="px-4 py-3">
                                                            {atts.length > 0 && (
                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${pr >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{pr}%</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3"><Eye size={13} className="text-slate-400" /></td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile student cards */}
                            <div className="md:hidden space-y-2">
                                {filteredStudents.length === 0
                                    ? <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400 border border-slate-100 dark:border-slate-700">No students found.</div>
                                    : filteredStudents.map(s => {
                                        const atts = studentAttempts(s.uid);
                                        const avg = averageScore(atts);
                                        const pr = passRate(atts);
                                        const isSelected = selectedStudent?.uid === s.uid;
                                        return (
                                            <div key={s.uid}
                                                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                                <button
                                                    className="w-full flex items-center gap-3 px-4 py-3"
                                                    onClick={() => setSelectedStudent(isSelected ? null : s)}>
                                                    <div className="flex-1 text-left">
                                                        <p className="text-xs font-black text-slate-800 dark:text-white">{s.name} {s.surname}</p>
                                                        <p className="text-[10px] text-slate-400">{s.grade}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <ScoreBadge score={avg} />
                                                        {atts.length > 0 && (
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${pr >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{pr}%</span>
                                                        )}
                                                        {isSelected ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
                                                    </div>
                                                </button>
                                                {isSelected && (
                                                    <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 space-y-2">
                                                        <p className="text-[10px] text-slate-400">{s.email}</p>
                                                        {studentAttempts(s.uid).length === 0
                                                            ? <p className="text-xs text-slate-400">No attempts yet.</p>
                                                            : studentAttempts(s.uid).map(a => (
                                                                <div key={a.id} className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                                                                    <div>
                                                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{a.examTitle || 'Exam'}</p>
                                                                        <p className="text-[9px] text-slate-400">{a.submittedAt?.toDate?.().toLocaleDateString('en-ZA') || '—'}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <ScoreBadge score={a.score} />
                                                                        <span className={`text-[9px] font-black ${(a.score || 0) >= 40 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                            {(a.score || 0) >= 40 ? 'PASS' : 'FAIL'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>

                            {/* Desktop drill-down */}
                            {selectedStudent && (
                                <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 dark:text-white">
                                                {selectedStudent.name} {selectedStudent.surname} — Attempt History
                                            </h3>
                                            <p className="text-xs text-slate-400">{selectedStudent.grade} · {selectedStudent.email}</p>
                                        </div>
                                        <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    {studentAttempts(selectedStudent.uid).length === 0
                                        ? <p className="text-xs text-slate-400">No attempts yet.</p>
                                        : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs min-w-[500px]">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 dark:border-slate-700">
                                                            {['Exam', 'Subject', 'Score', 'Pass/Fail', 'Marked By', 'Date', 'Modified'].map(h => (
                                                                <th key={h} className="text-left px-3 py-2 font-black text-slate-400 uppercase text-[9px]">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {studentAttempts(selectedStudent.uid).map(a => (
                                                            <tr key={a.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                                                <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{a.examTitle || 'Exam'}</td>
                                                                <td className="px-3 py-2 text-slate-500">{a.subject || '—'}</td>
                                                                <td className="px-3 py-2"><ScoreBadge score={a.score} /></td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`text-[9px] font-black ${(a.score || 0) >= 40 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                        {(a.score || 0) >= 40 ? 'PASS' : 'FAIL'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-slate-400">{a.markedBy || 'AI'}</td>
                                                                <td className="px-3 py-2 text-slate-400">{a.submittedAt?.toDate?.().toLocaleDateString('en-ZA') || '—'}</td>
                                                                <td className="px-3 py-2">
                                                                    {a.remarked && <span className="text-[9px] text-amber-600 font-black">REMARKED</span>}
                                                                    {a.aiModified && <span className="text-[9px] text-indigo-500 font-black ml-1">AI MOD</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── EXAMS TAB ── */}
                    {activeTab === 'exams' && (
                        <>
                            {isAtLimit(currentTier, 'exams', exams.length) && (
                                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
                                    <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex-1">
                                        Exam limit reached on <span className="font-black">{TIER_VISUAL[currentTier]?.label}</span>.
                                    </p>
                                    <button onClick={handleUpgrade} className="text-xs font-black text-amber-700 dark:text-amber-300 underline underline-offset-2 flex-shrink-0">Upgrade →</button>
                                </div>
                            )}

                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <h2 className="text-sm font-black text-slate-700 dark:text-white">All Exams</h2>
                                <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
                                    className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none font-bold">
                                    <option value="All">All Subjects</option>
                                    {allSubjects.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="space-y-3">
                                {exams.filter(ex => filterExam === 'All' || ex.subject === filterExam).map(ex => {
                                    const atts = examAttempts(ex.id);
                                    const avg = averageScore(atts);
                                    const pr = passRate(atts);
                                    const isOpen = selectedExam === ex.id;
                                    return (
                                        <div key={ex.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                            <button
                                                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                                onClick={() => setSelectedExam(isOpen ? null : ex.id)}>
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="text-xs font-black text-slate-800 dark:text-white truncate">{ex.title}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5 truncate">{ex.subject} · {ex.grade} · {ex.teacherName || 'Teacher'}</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-[9px] text-slate-400 hidden sm:block">{atts.length} att.</span>
                                                    <ScoreBadge score={avg} />
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg hidden sm:block ${pr >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{pr}%</span>
                                                    {isOpen ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
                                                </div>
                                            </button>
                                            {isOpen && (
                                                <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-4">
                                                    {atts.length === 0
                                                        ? <p className="text-xs text-slate-400">No attempts yet.</p>
                                                        : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs min-w-[400px]">
                                                                    <thead>
                                                                        <tr className="border-b border-slate-100 dark:border-slate-700">
                                                                            {['Student', 'Score', 'Pass/Fail', 'Marked By', 'Date'].map(h => (
                                                                                <th key={h} className="text-left px-3 py-2 font-black text-slate-400 uppercase text-[9px]">{h}</th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {atts.map(a => (
                                                                            <tr key={a.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                                                                <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{a.studentName || a.studentUid}</td>
                                                                                <td className="px-3 py-2"><ScoreBadge score={a.score} /></td>
                                                                                <td className="px-3 py-2">
                                                                                    <span className={`text-[9px] font-black ${(a.score || 0) >= 40 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                                        {(a.score || 0) >= 40 ? 'PASS' : 'FAIL'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-3 py-2 text-slate-400">{a.markedBy || 'AI'}</td>
                                                                                <td className="px-3 py-2 text-slate-400">{a.submittedAt?.toDate?.().toLocaleDateString('en-ZA') || '—'}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {exams.length === 0 && (
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center">
                                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs text-slate-400">No exams uploaded yet.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── AUDIT LOG TAB ── */}
                    {activeTab === 'audit' && (
                        isFeatureAllowed(currentTier, 'auditLog')
                            ? (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                        <h2 className="text-sm font-black text-slate-700 dark:text-white">Audit Log</h2>
                                        <span className="text-xs text-slate-400">{auditLog.length} entries</span>
                                    </div>
                                    {auditLog.length === 0
                                        ? <div className="p-10 text-center"><Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-xs text-slate-400">No audit events yet.</p></div>
                                        : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs min-w-[560px]">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 dark:border-slate-700">
                                                            {['Type', 'Description', 'Actor', 'Student', 'Exam', 'Timestamp'].map(h => (
                                                                <th key={h} className="text-left px-4 py-3 font-black text-slate-400 uppercase text-[9px]">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {auditLog.map(ev => (
                                                            <tr key={ev.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                                                <td className="px-4 py-3">
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${ev.type === 'ai_mark' ? 'bg-indigo-50 text-indigo-600' : ev.type === 'remark' ? 'bg-amber-50 text-amber-600' : ev.type === 'modification' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                        {ev.type || 'event'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 max-w-[160px] truncate">{ev.description || '—'}</td>
                                                                <td className="px-4 py-3 text-slate-500">{ev.actorName || 'System'}</td>
                                                                <td className="px-4 py-3 text-slate-500">{ev.studentName || '—'}</td>
                                                                <td className="px-4 py-3 text-slate-500">{ev.examTitle || '—'}</td>
                                                                <td className="px-4 py-3 text-slate-400">{ev.timestamp?.toDate?.().toLocaleString('en-ZA') || '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                </div>
                            )
                            : <LockedFeature featureName="Audit Log" requiredTier="starter" onUpgrade={handleUpgrade} />
                    )}

                    {/* ── SUBSCRIPTIONS TAB ── */}
                    {activeTab === 'subscriptions' && (
                        <SubscriptionManager
                            currentTier={currentTier}
                            schoolName={school?.name || ''}
                            schoolId={schoolId}
                            primary={primary}
                            onTierChange={(newTier) => {
                                // Trigger PaymentManager if upgrading
                                setShowUpgradeModal(true);
                            }}
                        />
                    )}

                    {/* ── SETTINGS TAB ── */}
                    {activeTab === 'settings' && (
                        <div className="space-y-4">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                <h2 className="text-sm font-black text-slate-800 dark:text-white mb-1">School Settings</h2>
                                <p className="text-xs text-slate-500 mb-5">Update your school's branding and information.</p>
                                <button
                                    className="px-5 py-2.5 rounded-xl text-white text-xs font-black"
                                    style={{ backgroundColor: primary }}
                                    onClick={() => navigate('/school-registration')}
                                >
                                    Edit School Profile →
                                </button>
                                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        ['School Name', school?.name],
                                        ['Motto', school?.motto],
                                        ['Established', school?.established],
                                        ['Province', school?.province],
                                        ['District', school?.district],
                                        ['Curricula', (school?.curricula || []).join(', ')],
                                    ].map(([label, value]) => (
                                        <div key={label} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                                            <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{value || '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick plan card */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-sm font-black text-slate-800 dark:text-white">Plan & Billing</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">Manage subscription and usage.</p>
                                    </div>
                                    <TierBadge tier={currentTier} collapsed={false} />
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 mb-4">
                                    <UsageMeter label="Students" used={students.length} limit={tierConfig?.limits?.students ?? null} color={primary} />
                                    <UsageMeter label="Exams" used={exams.length} limit={tierConfig?.limits?.exams ?? null} color={primary} />
                                    <UsageMeter label="Teachers" used={teachers.length} limit={tierConfig?.limits?.teachers ?? null} color={primary} />
                                </div>
                                <button
                                    onClick={() => setActiveTab('subscriptions')}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-opacity"
                                >
                                    <CreditCard size={13} /> Manage Subscriptions
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── MOBILE BOTTOM NAV ── */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center print:hidden">
                    {mobileBottomTabs.map(t => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => {
                                    if (t.locked) { handleUpgrade(); return; }
                                    setActiveTab(t.id);
                                }}
                                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-black transition-colors ${isActive ? '' : 'text-slate-400'}`}
                                style={isActive ? { color: primary } : {}}
                            >
                                <div className="relative">
                                    <Icon size={18} />
                                    {t.locked && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                                            <Lock size={6} className="text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <span className="leading-none">{t.label}</span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ backgroundColor: primary }} />
                                )}
                            </button>
                        );
                    })}
                    {/* "More" button opens drawer on mobile */}
                    <button
                        onClick={() => setMobileDrawerOpen(true)}
                        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-black text-slate-400"
                    >
                        <Menu size={18} />
                        <span className="leading-none">More</span>
                    </button>
                </nav>
            </div>

            {/* ── Upgrade modal ── */}
            {showUpgradeModal && (
                <PaymentManager
                    schoolId={schoolId}
                    schoolName={school?.name || ''}
                    currentTier={currentTier}
                    onClose={() => setShowUpgradeModal(false)}
                    onTierChange={(newTier) => setShowUpgradeModal(false)}
                />
            )}

            <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
        </div>
    );
}