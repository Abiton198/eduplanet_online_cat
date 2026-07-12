/**
 * ProfileSetupWizard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen, 4-step profile setup shown immediately after registration.
 * Collects role, personal details, and school info, then writes to Firestore.
 *
 * Steps:
 *   1 — Choose role       (Student / Teacher / Principal)
 *   2 — Personal details  (name, title, grade or subjects)
 *   3 — School            (join existing or register new)
 *   4 — Done              (welcome screen → dashboard)
 *
 * Props:
 *   uid          — Firebase Auth uid of the newly registered user
 *   email        — user's email address
 *   onComplete   — called with the saved profile after setup finishes
 *
 * Firestore writes:
 *   users/{uid}              — role index (used by App.jsx routing)
 *   students/{uid}           — student profile
 *   teachers/{uid}           — teacher profile
 *   principals/{uid}         — principal profile
 */

import { useState } from 'react';
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
} from 'firebase/firestore';
import {
    GraduationCap, BookOpen, LayoutDashboard,
    ArrowRight, ArrowLeft, CheckCircle2,
    Search, Building2, Sparkles,
} from 'lucide-react';
import { db } from '../utils/firebase';

// ── Constants ─────────────────────────────────────────────────────────────
const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Rev'];
const GRADES = ['Grade R', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
    'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
    'Grade 10', 'Grade 11', 'Grade 12',
    'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5',
    'Form 6', 'Year 1', 'Year 2', 'Year 3', 'Year 4'];
const SUBJECTS = [
    'Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences',
    'Geography', 'History', 'Accounting', 'Business Studies', 'Economics',
    'English Home Language', 'English First Additional',
    'Afrikaans Home Language', 'Afrikaans First Additional',
    'Computer Applications Technology', 'Information Technology',
    'Life Orientation', 'Tourism', 'Consumer Studies', 'Engineering Graphics',
    'Visual Arts', 'Music', 'Drama', 'Agricultural Sciences',
];
const CURRICULA = ['CAPS', 'ZIMSEC', 'Cambridge', 'IEB', 'National Curriculum', 'Other'];
const INST_TYPES = [
    'Primary School', 'Secondary / High School', 'College',
    'University', 'Private College', 'Other',
];


// ── Reusable form elements ─────────────────────────────────────────────────
function Label({ children }) {
    return (
        <label className="block text-xs font-black uppercase tracking-widest
                       text-slate-500 dark:text-slate-400 mb-1.5">
            {children}
        </label>
    );
}

function Input({ ...props }) {
    return (
        <input
            {...props}
            className="w-full border-2 border-slate-200 dark:border-slate-700
                 dark:bg-slate-800 dark:text-white p-4 rounded-2xl
                 outline-none text-sm focus:border-indigo-500
                 transition-colors placeholder-slate-400"
        />
    );
}

function Select({ children, ...props }) {
    return (
        <select
            {...props}
            className="w-full border-2 border-slate-200 dark:border-slate-700
                 dark:bg-slate-800 dark:text-white p-4 rounded-2xl
                 outline-none text-sm focus:border-indigo-500
                 transition-colors bg-white"
        >
            {children}
        </select>
    );
}

function ErrorBox({ message }) {
    if (!message) return null;
    return (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40
                    border border-red-100 dark:border-red-900
                    text-sm text-red-600 dark:text-red-400 font-medium">
            {message}
        </div>
    );
}

function NextButton({ onClick, disabled, children = 'Continue', loading }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2
                 px-8 py-4 rounded-2xl font-black text-sm text-white
                 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20
                 transition-all"
        >
            {loading ? 'Saving…' : children}
            {!loading && <ArrowRight size={16} />}
        </button>
    );
}

function BackButton({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-sm
                 text-slate-500 dark:text-slate-400
                 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
            <ArrowLeft size={16} />
            Back
        </button>
    );
}

// ── Progress dots ──────────────────────────────────────────────────────────
function StepDots({ current, total }) {
    return (
        <div className="flex items-center gap-2 justify-center mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${i < current
                            ? 'w-6 h-2 bg-indigo-600'
                            : i === current
                                ? 'w-8 h-2 bg-indigo-600'
                                : 'w-2 h-2 bg-slate-300 dark:bg-slate-700'
                        }`}
                />
            ))}
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Choose your role
// ══════════════════════════════════════════════════════════════════════════════

function StepRole({ role, onSelect }) {
    const roles = [
        {
            id: 'student',
            icon: GraduationCap,
            label: 'Student',
            desc: 'Complete exams and assignments. Track your progress and learn from your AI coach.',
            color: 'emerald',
        },
        {
            id: 'teacher',
            icon: BookOpen,
            label: 'Teacher',
            desc: 'Upload exams and worksheets. See class results and per-learner concept gaps.',
            color: 'violet',
        },
        {
            id: 'principal',
            icon: LayoutDashboard,
            label: 'Principal / Admin',
            desc: 'Register your school and see school-wide performance analytics.',
            color: 'indigo',
        },
    ];

    const colorMap = {
        emerald: {
            border: 'border-emerald-400 dark:border-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
            badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
        },
        violet: {
            border: 'border-violet-400 dark:border-violet-600',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
            icon: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
            badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
        },
        indigo: {
            border: 'border-indigo-400 dark:border-indigo-600',
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
            icon: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
            badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
        },
    };

    return (
        <div className="space-y-4">
            {roles.map(({ id, icon: Icon, label, desc, color }) => {
                const c = colorMap[color];
                const selected = role === id;

                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onSelect(id)}
                        className={`w-full text-left flex items-center gap-4 p-5 rounded-2xl
                        border-2 transition-all duration-200 group
                        ${selected
                                ? `${c.border} ${c.bg} shadow-md`
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                             flex-shrink-0 transition-colors
                             ${selected ? c.icon : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            <Icon size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-black text-slate-800 dark:text-white text-sm">
                                    {label}
                                </p>
                                {selected && (
                                    <span className={`text-[10px] font-black uppercase tracking-wider
                                    px-2 py-0.5 rounded-full ${c.badge}`}>
                                        Selected
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {desc}
                            </p>
                        </div>
                        {selected && (
                            <CheckCircle2 size={20}
                                className={`flex-shrink-0 ${color === 'emerald' ? 'text-emerald-500' :
                                        color === 'violet' ? 'text-violet-500' : 'text-indigo-500'
                                    }`}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Personal details (varies by role)
// ══════════════════════════════════════════════════════════════════════════════

function StepDetails({ role, details, onChange }) {
    const set = (field, value) => onChange({ ...details, [field]: value });

    return (
        <div className="space-y-4">

            {/* Title — teachers and principals only */}
            {(role === 'teacher' || role === 'principal') && (
                <div>
                    <Label>Title</Label>
                    <Select
                        value={details.title || ''}
                        onChange={(e) => set('title', e.target.value)}
                    >
                        <option value="">Select title</option>
                        {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label>First name</Label>
                    <Input
                        placeholder="First name"
                        value={details.firstName || ''}
                        onChange={(e) => set('firstName', e.target.value)}
                    />
                </div>
                <div>
                    <Label>Last name</Label>
                    <Input
                        placeholder="Last name"
                        value={details.lastName || ''}
                        onChange={(e) => set('lastName', e.target.value)}
                    />
                </div>
            </div>

            {/* Grade — students only */}
            {role === 'student' && (
                <div>
                    <Label>Grade / Year</Label>
                    <Select
                        value={details.grade || ''}
                        onChange={(e) => set('grade', e.target.value)}
                    >
                        <option value="">Select your grade</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </Select>
                </div>
            )}

            {/* Subjects — teachers only */}
            {role === 'teacher' && (
                <div>
                    <Label>Subjects you teach</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52
                          overflow-y-auto pr-1">
                        {SUBJECTS.map(s => {
                            const selected = (details.subjects || []).includes(s);
                            return (
                                <label
                                    key={s}
                                    className={`flex items-center gap-2.5 p-3 rounded-xl
                               border-2 cursor-pointer transition-colors text-sm
                               ${selected
                                            ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => {
                                            const prev = details.subjects || [];
                                            set('subjects', selected
                                                ? prev.filter(x => x !== s)
                                                : [...prev, s]
                                            );
                                        }}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded flex items-center justify-center
                                   flex-shrink-0 border-2 transition-colors
                                   ${selected
                                            ? 'border-violet-500 bg-violet-500'
                                            : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                        {selected && <CheckCircle2 size={10} className="text-white" />}
                                    </div>
                                    <span className="font-medium leading-snug">{s}</span>
                                </label>
                            );
                        })}
                    </div>
                    {(details.subjects || []).length > 0 && (
                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 font-bold">
                            {details.subjects.length} subject{details.subjects.length !== 1 ? 's' : ''} selected
                        </p>
                    )}
                </div>
            )}

            {/* Institution type — principals only */}
            {role === 'principal' && (
                <div>
                    <Label>Institution type</Label>
                    <Select
                        value={details.institutionType || ''}
                        onChange={(e) => set('institutionType', e.target.value)}
                    >
                        <option value="">Select institution type</option>
                        {INST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                </div>
            )}

        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — School details
// ══════════════════════════════════════════════════════════════════════════════

function StepSchool({ role, school, onChange, uid }) {
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [query, setQuery] = useState('');
    const [searchDone, setSearchDone] = useState(false);

    const set = (field, value) => onChange({ ...school, [field]: value });

    const searchSchools = async () => {
        if (!query.trim()) return;
        setSearching(true);
        setSearchDone(false);
        try {
            // Search by school name prefix (case-insensitive via Firestore)
            const q = query_fs(
                collection(db, 'schools'),
                where('searchName', '>=', query.toLowerCase()),
                where('searchName', '<=', query.toLowerCase() + '\uf8ff'),
            );
            const snap = await getDocs(q);
            setResults(snap.docs.map(d => ({ id: d.id, ...d.to_dict() })));
        } catch (err) {
            // Search index may not exist — show manual entry
            setResults([]);
        } finally {
            setSearching(false);
            setSearchDone(true);
        }
    };

    return (
        <div className="space-y-4">

            {/* Students and teachers — join an existing school */}
            {(role === 'student' || role === 'teacher') && (
                <>
                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30
                          border border-blue-100 dark:border-blue-900">
                        <p className="text-xs font-black text-blue-700 dark:text-blue-300 mb-1">
                            Find your school
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                            Enter your school name below. If your school is not registered,
                            ask your principal to register first.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Label>School name</Label>
                            <Input
                                placeholder="e.g. Prince Edward High School"
                                value={school.name || ''}
                                onChange={(e) => { set('name', e.target.value); setQuery(e.target.value); }}
                            />
                        </div>
                        <div className="pt-6">
                            <button
                                type="button"
                                onClick={searchSchools}
                                disabled={searching || !(school.name || '').trim()}
                                className="flex items-center gap-2 px-4 py-4 rounded-2xl
                           bg-slate-100 dark:bg-slate-800 font-bold text-sm
                           text-slate-600 dark:text-slate-300
                           hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                           hover:text-indigo-600 disabled:opacity-50
                           transition-colors"
                            >
                                <Search size={16} />
                                {searching ? '…' : 'Find'}
                            </button>
                        </div>
                    </div>

                    {/* Search results */}
                    {searchDone && results.length > 0 && (
                        <div className="space-y-2">
                            {results.map(r => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => set('schoolId', r.id)}
                                    className={`w-full text-left flex items-center gap-3 p-4
                               rounded-2xl border-2 transition-colors
                               ${school.schoolId === r.id
                                            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                                        }`}
                                >
                                    <Building2 size={18} className="text-indigo-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-white">
                                            {r.schoolName}
                                        </p>
                                        <p className="text-xs text-slate-400">{r.country} · {r.curriculum}</p>
                                    </div>
                                    {school.schoolId === r.id && (
                                        <CheckCircle2 size={18} className="text-indigo-500 ml-auto" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {searchDone && results.length === 0 && (
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30
                            border border-amber-200 dark:border-amber-800">
                            <p className="text-xs font-black text-amber-700 dark:text-amber-300 mb-1">
                                School not found
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                Your school may not be registered yet. Ask your principal to
                                register the school first, then come back to complete setup.
                                You can still continue — your school name will be saved.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Principals — register a new school */}
            {role === 'principal' && (
                <>
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30
                          border border-indigo-100 dark:border-indigo-900">
                        <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 mb-1">
                            Register your school
                        </p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400">
                            Your school is the hub for all teachers and students. Fill in
                            the details below — this takes 2 minutes.
                        </p>
                    </div>

                    <div>
                        <Label>School name</Label>
                        <Input
                            placeholder="e.g. Prince Edward High School"
                            value={school.name || ''}
                            onChange={(e) => set('name', e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Country</Label>
                        <Input
                            placeholder="e.g. Zimbabwe"
                            value={school.country || ''}
                            onChange={(e) => set('country', e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Curriculum</Label>
                        <Select
                            value={school.curriculum || ''}
                            onChange={(e) => set('curriculum', e.target.value)}
                        >
                            <option value="">Select curriculum</option>
                            {CURRICULA.map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>
                    </div>

                    <div>
                        <Label>Physical address</Label>
                        <Input
                            placeholder="Street, City"
                            value={school.address || ''}
                            onChange={(e) => set('address', e.target.value)}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

// Alias — Firestore query needs to be imported properly in real code
// Replace with: import { query as query_fs, collection, where, getDocs } from 'firebase/firestore'
const query_fs = query;


// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Writing to Firestore + Welcome screen
// ══════════════════════════════════════════════════════════════════════════════

function StepDone({ role }) {
    const icons = {
        student: GraduationCap,
        teacher: BookOpen,
        principal: LayoutDashboard,
    };
    const Icon = icons[role] || Sparkles;
    const messages = {
        student: 'Your student profile is ready. Complete your first exam to get started.',
        teacher: 'Your teacher profile is ready. Upload your first exam to get started.',
        principal: 'Your school is registered. Invite teachers and students to join.',
    };

    return (
        <div className="text-center py-6">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-indigo-500
                      to-purple-600 text-white flex items-center justify-center
                      mx-auto mb-6 shadow-2xl shadow-indigo-500/30">
                <Icon size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
                You're all set! 🎉
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto
                    leading-relaxed">
                {messages[role] || 'Your profile is ready.'}
            </p>
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD — assembles the 4 steps
// ══════════════════════════════════════════════════════════════════════════════

export function ProfileSetupWizard({ uid, email, onComplete }) {
    const [step, setStep] = useState(0);   // 0-3
    const [role, setRole] = useState('');
    const [details, setDetails] = useState({});
    const [school, setSchool] = useState({});
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const STEP_TITLES = [
        'Who are you?',
        'Your details',
        'Your school',
        'All set!',
    ];

    // ── Validation per step ───────────────────────────────────────────────────
    const canProceed = () => {
        if (step === 0) return !!role;
        if (step === 1) {
            if (!details.firstName?.trim() || !details.lastName?.trim()) return false;
            if (role === 'teacher' && !(details.subjects || []).length) return false;
            if (role === 'student' && !details.grade) return false;
            return true;
        }
        if (step === 2) {
            if (!school.name?.trim()) return false;
            if (role === 'principal' && !school.curriculum) return false;
            return true;
        }
        return true;
    };

    // ── Save to Firestore ─────────────────────────────────────────────────────
    const saveProfile = async () => {
        setSaving(true);
        setError('');
        try {
            const displayName = `${details.title ? details.title + ' ' : ''}${details.firstName} ${details.lastName}`.trim();
            const profileCol = role === 'principal' ? 'principals' :
                role === 'teacher' ? 'teachers' : 'students';

            // Generate school id for principals
            let schoolId = school.schoolId || '';

            if (role === 'principal' && !schoolId) {
                // Create the school document
                schoolId = `${uid}_${school.name.replace(/\s+/g, '_').substring(0, 30)}`;
                await setDoc(doc(db, 'schools', schoolId), {
                    schoolId,
                    schoolName: school.name,
                    searchName: school.name.toLowerCase(),
                    country: school.country || '',
                    curriculum: school.curriculum || '',
                    address: school.address || '',
                    institutionType: details.institutionType || '',
                    tier: 'free',
                    registeredBy: uid,
                    createdAt: serverTimestamp(),
                });
            }

            // Write the role-specific profile
            const profileData = {
                uid,
                email,
                displayName,
                name: displayName,
                firstName: details.firstName,
                lastName: details.lastName,
                role,
                schoolId: schoolId || '',
                schoolName: school.name || '',
                createdAt: serverTimestamp(),
                ...(details.title && { title: details.title }),
                ...(details.grade && { grade: details.grade }),
                ...(details.subjects && { subjects: details.subjects }),
                ...(details.institutionType && { institutionType: details.institutionType }),
            };

            // Write to role-specific collection
            await setDoc(doc(db, profileCol, uid), profileData);

            // Write to users index (used by App.jsx routing)
            await setDoc(doc(db, 'users', uid), {
                uid,
                email,
                displayName,
                role,
                schoolId: schoolId || '',
                createdAt: serverTimestamp(),
            });

            // Advance to done screen
            setStep(3);

        } catch (err) {
            console.error('[ProfileSetup] Save failed:', err);
            setError('Could not save your profile. Please check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Next / back handlers ──────────────────────────────────────────────────
    const handleNext = async () => {
        if (step === 2) {
            // Step 3 → save before showing done screen
            await saveProfile();
        } else if (step < 3) {
            setStep(s => s + 1);
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(s => s - 1);
    };

    const handleFinish = () => {
        const profile = {
            uid,
            email,
            role,
            displayName: `${details.title ? details.title + ' ' : ''}${details.firstName} ${details.lastName}`.trim(),
            firstName: details.firstName,
            lastName: details.lastName,
            grade: details.grade || '',
            subjects: details.subjects || [],
            schoolName: school.name || '',
            schoolId: school.schoolId || '',
        };
        onComplete?.(profile);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4
                    bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg
                      rounded-[2.5rem] shadow-2xl
                      border border-slate-200 dark:border-slate-800
                      max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-900
                        rounded-t-[2.5rem] px-8 pt-8 pb-4 z-10">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest
                             text-indigo-500 dark:text-indigo-400">
                            Step {step + 1} of 4
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest
                             text-slate-400">
                            Profile setup
                        </span>
                    </div>

                    <StepDots current={step} total={4} />

                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">
                        {STEP_TITLES[step]}
                    </h2>
                    {step < 3 && (
                        <p className="text-sm text-slate-400">
                            {step === 0 && 'Choose how you will use Eduket OS.'}
                            {step === 1 && 'Tell us a bit about yourself.'}
                            {step === 2 && (role === 'principal' ? 'Register your school.' : 'Find and join your school.')}
                        </p>
                    )}
                </div>

                {/* Content */}
                <div className="px-8 pb-4">
                    <ErrorBox message={error} />

                    {step === 0 && <StepRole role={role} onSelect={setRole} />}
                    {step === 1 && <StepDetails role={role} details={details} onChange={setDetails} />}
                    {step === 2 && <StepSchool role={role} school={school} onChange={setSchool} uid={uid} />}
                    {step === 3 && <StepDone role={role} />}
                </div>

                {/* Footer buttons */}
                <div className="sticky bottom-0 bg-white dark:bg-slate-900
                        rounded-b-[2.5rem] px-8 py-6 pt-4
                        border-t border-slate-100 dark:border-slate-800">
                    {step < 3 ? (
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                {step > 0 && <BackButton onClick={handleBack} />}
                            </div>
                            <NextButton
                                onClick={handleNext}
                                disabled={!canProceed()}
                                loading={saving}
                                children={step === 2 ? 'Save and finish' : 'Continue'}
                            />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleFinish}
                            className="w-full flex items-center justify-center gap-2
                         py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500
                         text-white font-black text-sm shadow-lg
                         shadow-indigo-500/20 transition-all
                         hover:-translate-y-0.5"
                        >
                            <Sparkles size={16} />
                            Go to my dashboard
                            <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}