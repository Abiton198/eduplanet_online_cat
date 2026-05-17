// ─── PrincipalDashboard.jsx ───────────────────────────────────────────────────
// Scoped entirely to the principal's school. No cross-school data.
// Features: KPI cards, student/teacher tables, exam analysis, audit log,
//           per-student attempt drill-down, filter panel, print/PDF export.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import {
    Users, BookOpen, FileText, TrendingUp, Award, AlertTriangle,
    ChevronDown, ChevronRight, Filter, Download, Printer, LogOut,
    Search, X, Eye, BarChart2, CheckCircle2, Clock, RefreshCw,
    School, Settings, Moon, Sun, Menu,
} from 'lucide-react';
import {
    subscribeToSchoolTeachers, subscribeToSchoolStudents,
    subscribeToSchoolExams, subscribeToSchoolAttempts, subscribeToAuditLog,
    countByGrade, averageScore, groupBySubject, passRate,
} from '../utils/firestoreHelpers';
import { useSchool } from '../utils/schoolContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── GRADE ORDER ──────────────────────────────────────────────────────────────
const GRADE_ORDER = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

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
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${palette[color]}`}>
                <Icon size={22} />
            </div>
            <div>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{value ?? '—'}</p>
                <p className="text-xs font-bold text-slate-500">{label}</p>
                {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PrincipalDashboard({ principal }) {
    const navigate = useNavigate();
    const { school } = useSchool();
    const primary = school?.primary || '#4f46e5';

    // Data
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [auditLog, setAuditLog] = useState([]);

    // UI
    const [activeTab, setActiveTab] = useState('overview'); // overview|students|exams|audit
    const [isDark, setIsDark] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

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

    // ── Subscribe to live data ─────────────────────────────────────────────────
    useEffect(() => {
        if (!schoolId) return;
        const unsubs = [
            subscribeToSchoolTeachers(schoolId, setTeachers),
            subscribeToSchoolStudents(schoolId, setStudents),
            subscribeToSchoolExams(schoolId, setExams),
            subscribeToSchoolAttempts(schoolId, setAttempts),
            subscribeToAuditLog(schoolId, setAuditLog),
        ];
        return () => unsubs.forEach((u) => u());
    }, [schoolId]);

    // ── Derived data ──────────────────────────────────────────────────────────
    const gradeCounts = countByGrade(students);
    const avgScore = averageScore(attempts);
    const overallPassRate = passRate(attempts);
    const subjectGroups = groupBySubject(attempts);
    const allSubjects = [...new Set(students.flatMap((s) => s.subjects || []))].sort();

    // Filtered students
    const filteredStudents = students.filter((s) => {
        const matchGrade = filterGrade === 'All' || s.grade === filterGrade;
        const matchSubject = filterSubject === 'All' || (s.subjects || []).includes(filterSubject);
        const matchSearch = !search ||
            `${s.name} ${s.surname}`.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase());
        return matchGrade && matchSubject && matchSearch;
    });

    // Attempts for selected student
    const studentAttempts = (studentUid) =>
        attempts.filter((a) => a.studentUid === studentUid);

    // Attempts for selected exam
    const examAttempts = (examId) =>
        attempts.filter((a) => a.examId === examId);

    // ── Export PDF ────────────────────────────────────────────────────────────
    const exportPDF = useCallback(() => {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const logoUrl = school?.logoUrl;

        // Header
        pdf.setFontSize(18);
        pdf.setTextColor(40, 40, 40);
        pdf.text(school?.name || 'School Report', 20, 20);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, 20, 27);
        pdf.text(`Principal: ${principal?.title || ''} ${principal?.name || ''} ${principal?.surname || ''}`, 20, 33);

        let y = 42;

        // KPIs
        pdf.setFontSize(12);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Summary', 20, y);
        y += 6;
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

        // Students table
        pdf.setFontSize(12);
        pdf.text('Students', 20, y);
        y += 6;
        autoTable(pdf, {
            startY: y,
            head: [['Name', 'Surname', 'Grade', 'Subjects', 'Avg Score']],
            body: filteredStudents.map((s) => {
                const stuAttempts = studentAttempts(s.uid);
                return [
                    s.name, s.surname, s.grade,
                    (s.subjects || []).slice(0, 3).join(', ') + ((s.subjects || []).length > 3 ? '...' : ''),
                    averageScore(stuAttempts) != null ? `${averageScore(stuAttempts)}%` : '—',
                ];
            }),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229] },
        });
        y = pdf.lastAutoTable.finalY + 10;

        // Exams table
        if (y > 250) { pdf.addPage(); y = 20; }
        pdf.setFontSize(12);
        pdf.text('Exams', 20, y);
        y += 6;
        autoTable(pdf, {
            startY: y,
            head: [['Title', 'Subject', 'Grade', 'Attempts', 'Avg Score']],
            body: exams.map((ex) => {
                const att = examAttempts(ex.id);
                return [ex.title, ex.subject, ex.grade, att.length, averageScore(att) != null ? `${averageScore(att)}%` : '—'];
            }),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229] },
        });

        pdf.save(`${school?.name || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`);
    }, [school, principal, teachers, students, exams, attempts, filteredStudents, avgScore, overallPassRate]);

    // ── Print ─────────────────────────────────────────────────────────────────
    const handlePrint = () => window.print();

    // ── Sign out ──────────────────────────────────────────────────────────────
    const handleSignOut = async () => {
        await signOut(auth);
        navigate('/');
    };

    // ── SIDEBAR TABS ──────────────────────────────────────────────────────────
    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart2 },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'exams', label: 'Exams', icon: FileText },
        { id: 'audit', label: 'Audit Log', icon: AlertTriangle },
        { id: 'settings', label: 'School Settings', icon: Settings },
    ];

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div className={`min-h-screen flex ${isDark ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

            {/* ── Sidebar ── */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-all duration-300 print:hidden`}
            >
                {/* School brand */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
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
                        {sidebarOpen && (
                            <div className="overflow-hidden">
                                <p className="text-xs font-black text-slate-800 dark:text-white truncate">{school?.name || 'School'}</p>
                                <p className="text-[10px] text-slate-400 truncate">{principal?.title} {principal?.surname}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black transition-all ${activeTab === t.id
                                    ? 'text-white'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                style={activeTab === t.id ? { backgroundColor: primary } : {}}
                            >
                                <Icon size={16} className="flex-shrink-0" />
                                {sidebarOpen && <span>{t.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom actions */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <button
                        onClick={() => setIsDark((d) => !d)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        {sidebarOpen && (isDark ? 'Light Mode' : 'Dark Mode')}
                    </button>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                        <LogOut size={16} />
                        {sidebarOpen && 'Sign Out'}
                    </button>
                </div>
            </aside>

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Top bar */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center gap-4 print:hidden">
                    <button onClick={() => setSidebarOpen((o) => !o)} className="text-slate-400 hover:text-slate-600">
                        <Menu size={20} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-black text-slate-800 dark:text-white">Principal Dashboard</h1>
                        <p className="text-xs text-slate-400">{school?.name} · {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button
                        onClick={exportPDF}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <Download size={14} /> Export PDF
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <Printer size={14} /> Print
                    </button>
                </header>

                {/* Page content */}
                <div ref={printRef} className="flex-1 p-6 overflow-y-auto space-y-6">

                    {/* ── OVERVIEW TAB ── */}
                    {activeTab === 'overview' && (
                        <>
                            {/* KPI grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard label="Teachers" value={teachers.length} icon={Users} color="indigo" />
                                <StatCard label="Students" value={students.length} icon={Users} color="emerald" />
                                <StatCard label="Exams Uploaded" value={exams.length} icon={FileText} color="amber" />
                                <StatCard label="Avg Score" value={avgScore != null ? `${avgScore}%` : '—'} icon={TrendingUp} color="rose" sub={`Pass rate: ${overallPassRate}%`} />
                            </div>

                            {/* Students per grade */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                <h2 className="text-sm font-black text-slate-700 dark:text-white mb-4">Students per Grade</h2>
                                <div className="flex items-end gap-3 h-32">
                                    {GRADE_ORDER.map((g) => {
                                        const count = gradeCounts[g] || 0;
                                        const max = Math.max(...GRADE_ORDER.map((gr) => gradeCounts[gr] || 0), 1);
                                        const pct = (count / max) * 100;
                                        return (
                                            <div key={g} className="flex-1 flex flex-col items-center gap-1">
                                                <span className="text-xs font-black text-slate-600 dark:text-slate-300">{count}</span>
                                                <div
                                                    className="w-full rounded-t-xl transition-all duration-700"
                                                    style={{ height: `${pct}%`, backgroundColor: primary, minHeight: count ? 8 : 0 }}
                                                />
                                                <span className="text-[10px] text-slate-400 font-bold">{g.replace('Grade ', 'Gr ')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Subject performance */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                <h2 className="text-sm font-black text-slate-700 dark:text-white mb-4">Performance by Subject</h2>
                                {Object.keys(subjectGroups).length === 0 ? (
                                    <p className="text-xs text-slate-400">No attempts recorded yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {Object.entries(subjectGroups).sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([sub, atts]) => {
                                            const avg = averageScore(atts);
                                            const pr = passRate(atts);
                                            return (
                                                <div key={sub} className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-36 truncate">{sub}</span>
                                                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                                        <div
                                                            className="h-2 rounded-full transition-all duration-700"
                                                            style={{ width: `${avg || 0}%`, backgroundColor: primary }}
                                                        />
                                                    </div>
                                                    <ScoreBadge score={avg} />
                                                    <span className="text-[10px] text-slate-400 w-16 text-right">{atts.length} attempts</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Recent audit highlights */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                                <h2 className="text-sm font-black text-slate-700 dark:text-white mb-4">Recent Activity Highlights</h2>
                                {auditLog.length === 0 ? (
                                    <p className="text-xs text-slate-400">No activity recorded yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {auditLog.slice(0, 5).map((ev) => (
                                            <div key={ev.id} className="flex items-start gap-3 text-xs">
                                                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    {ev.type === 'ai_mark' ? <Award size={10} className="text-indigo-500" /> :
                                                        ev.type === 'remark' ? <RefreshCw size={10} className="text-amber-500" /> :
                                                            <CheckCircle2 size={10} className="text-emerald-500" />}
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
                            {/* Filter bar */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3">
                                <div className="relative flex-1 min-w-48">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text" value={search} placeholder="Search by name or email..."
                                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 outline-none focus:border-indigo-500"
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
                                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 outline-none font-bold">
                                    <option value="All">All Grades</option>
                                    {GRADE_ORDER.map((g) => <option key={g}>{g}</option>)}
                                </select>
                                <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
                                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-700 outline-none font-bold">
                                    <option value="All">All Subjects</option>
                                    {allSubjects.map((s) => <option key={s}>{s}</option>)}
                                </select>
                                <span className="text-xs text-slate-400 font-bold">{filteredStudents.length} students</span>
                            </div>

                            {/* Student table */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700">
                                            {['Name', 'Grade', 'Subjects', 'Attempts', 'Avg Score', 'Pass Rate', ''].map((h) => (
                                                <th key={h} className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-8 text-slate-400">No students found.</td></tr>
                                        ) : filteredStudents.map((s) => {
                                            const atts = studentAttempts(s.uid);
                                            const avg = averageScore(atts);
                                            const pr = passRate(atts);
                                            return (
                                                <tr
                                                    key={s.uid}
                                                    className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                                                    onClick={() => setSelectedStudent(selectedStudent?.uid === s.uid ? null : s)}
                                                >
                                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">
                                                        {s.name} {s.surname}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">{s.grade}</td>
                                                    <td className="px-4 py-3 text-slate-500">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(s.subjects || []).slice(0, 3).map((sub) => (
                                                                <span key={sub} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold">{sub}</span>
                                                            ))}
                                                            {(s.subjects || []).length > 3 && (
                                                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] text-slate-400">+{s.subjects.length - 3}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">{atts.length}</td>
                                                    <td className="px-4 py-3"><ScoreBadge score={avg} /></td>
                                                    <td className="px-4 py-3">
                                                        {atts.length > 0 && (
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${pr >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                                                {pr}%
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Eye size={14} className="text-slate-400" />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Student drill-down */}
                            {selectedStudent && (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
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

                                    {studentAttempts(selectedStudent.uid).length === 0 ? (
                                        <p className="text-xs text-slate-400">No attempts yet.</p>
                                    ) : (
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100 dark:border-slate-700">
                                                    {['Exam', 'Subject', 'Score', 'Pass/Fail', 'Marked By', 'Date', 'Modified'].map((h) => (
                                                        <th key={h} className="text-left px-3 py-2 font-black text-slate-400 uppercase text-[10px]">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentAttempts(selectedStudent.uid).map((a) => (
                                                    <tr key={a.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                                        <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{a.examTitle || 'Exam'}</td>
                                                        <td className="px-3 py-2 text-slate-500">{a.subject || '—'}</td>
                                                        <td className="px-3 py-2"><ScoreBadge score={a.score} /></td>
                                                        <td className="px-3 py-2">
                                                            <span className={`text-[10px] font-black ${(a.score || 0) >= 40 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                {(a.score || 0) >= 40 ? 'PASS' : 'FAIL'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-400">{a.markedBy || 'AI'}</td>
                                                        <td className="px-3 py-2 text-slate-400">{a.submittedAt?.toDate?.().toLocaleDateString('en-ZA') || '—'}</td>
                                                        <td className="px-3 py-2">
                                                            {a.remarked && <span className="text-[10px] text-amber-600 font-black">REMARKED</span>}
                                                            {a.aiModified && <span className="text-[10px] text-indigo-500 font-black ml-1">AI MOD</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── EXAMS TAB ── */}
                    {activeTab === 'exams' && (
                        <>
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-black text-slate-700 dark:text-white">All Exams — {school?.name}</h2>
                                <select value={filterExam} onChange={(e) => setFilterExam(e.target.value)}
                                    className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 outline-none font-bold">
                                    <option value="All">All Subjects</option>
                                    {allSubjects.map((s) => <option key={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="space-y-3">
                                {exams
                                    .filter((ex) => filterExam === 'All' || ex.subject === filterExam)
                                    .map((ex) => {
                                        const atts = examAttempts(ex.id);
                                        const avg = averageScore(atts);
                                        const pr = passRate(atts);
                                        const isOpen = selectedExam === ex.id;
                                        return (
                                            <div key={ex.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                                <button
                                                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                                    onClick={() => setSelectedExam(isOpen ? null : ex.id)}
                                                >
                                                    <div className="flex-1 text-left">
                                                        <p className="text-xs font-black text-slate-800 dark:text-white">{ex.title}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">{ex.subject} · {ex.grade} · by {ex.teacherName || 'Teacher'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] text-slate-400">{atts.length} attempts</span>
                                                        <ScoreBadge score={avg} />
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${pr >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                                            {pr}% pass
                                                        </span>
                                                        {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                                    </div>
                                                </button>

                                                {isOpen && (
                                                    <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4">
                                                        {atts.length === 0 ? (
                                                            <p className="text-xs text-slate-400">No attempts yet.</p>
                                                        ) : (
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="border-b border-slate-100 dark:border-slate-700">
                                                                        {['Student', 'Score', 'Pass/Fail', 'Marked By', 'Remarks', 'Date'].map((h) => (
                                                                            <th key={h} className="text-left px-3 py-2 font-black text-slate-400 uppercase text-[10px]">{h}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {atts.map((a) => (
                                                                        <tr key={a.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                                                            <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{a.studentName || a.studentUid}</td>
                                                                            <td className="px-3 py-2"><ScoreBadge score={a.score} /></td>
                                                                            <td className="px-3 py-2">
                                                                                <span className={`text-[10px] font-black ${(a.score || 0) >= 40 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                                    {(a.score || 0) >= 40 ? 'PASS' : 'FAIL'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-3 py-2 text-slate-400">{a.markedBy || 'AI'}</td>
                                                                            <td className="px-3 py-2">
                                                                                {a.remarks && <span className="text-[10px] text-amber-600 font-bold">{a.remarks}</span>}
                                                                                {a.remarked && <span className="ml-1 text-[10px] bg-amber-100 text-amber-600 px-1.5 rounded font-black">REMARKED</span>}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-slate-400">{a.submittedAt?.toDate?.().toLocaleDateString('en-ZA') || '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
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
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <h2 className="text-sm font-black text-slate-700 dark:text-white">Audit Log — AI Marks, Remarks & Modifications</h2>
                                <span className="text-xs text-slate-400">{auditLog.length} entries</span>
                            </div>
                            {auditLog.length === 0 ? (
                                <div className="p-10 text-center">
                                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400">No audit events yet.</p>
                                </div>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700">
                                            {['Type', 'Description', 'Actor', 'Student', 'Exam', 'Timestamp'].map((h) => (
                                                <th key={h} className="text-left px-4 py-3 font-black text-slate-400 uppercase text-[10px]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLog.map((ev) => (
                                            <tr key={ev.id} className="border-b border-slate-50 dark:border-slate-700/50">
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${ev.type === 'ai_mark' ? 'bg-indigo-50 text-indigo-600' :
                                                        ev.type === 'remark' ? 'bg-amber-50 text-amber-600' :
                                                            ev.type === 'modification' ? 'bg-rose-50 text-rose-600' :
                                                                'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {ev.type || 'event'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 max-w-xs truncate">{ev.description || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">{ev.actorName || 'System'}</td>
                                                <td className="px-4 py-3 text-slate-500">{ev.studentName || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">{ev.examTitle || '—'}</td>
                                                <td className="px-4 py-3 text-slate-400">
                                                    {ev.timestamp?.toDate?.().toLocaleString('en-ZA') || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* ── SETTINGS TAB ── */}
                    {activeTab === 'settings' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
                            <h2 className="text-sm font-black text-slate-800 dark:text-white mb-4">School Settings</h2>
                            <p className="text-xs text-slate-500 mb-6">Update your school's branding and information at any time.</p>
                            <button
                                className="px-6 py-3 rounded-xl text-white text-xs font-black"
                                style={{ backgroundColor: primary }}
                                onClick={() => navigate('/school-registration')}
                            >
                                Edit School Profile →
                            </button>

                            <div className="mt-6 grid grid-cols-2 gap-4">
                                {[
                                    ['School Name', school?.name],
                                    ['Motto', school?.motto],
                                    ['Established', school?.established],
                                    ['Province', school?.province],
                                    ['District', school?.district],
                                    ['Curricula', (school?.curricula || []).join(', ')],
                                ].map(([label, value]) => (
                                    <div key={label} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{value || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Print styles */}
            <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
        </div>
    );
}