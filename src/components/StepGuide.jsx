import React from 'react';
import {
    Building2, UserCheck, FileUp, BookOpen,
    BarChart3, ArrowRight, CheckCircle2,
} from 'lucide-react';

// ── Three role tracks, each with simple numbered steps ────────────────────────

const tracks = [
    {
        role: 'Institution',
        color: 'indigo',
        icon: Building2,
        tagline: 'Register once. Your whole school is ready.',
        steps: [
            {
                action: 'Register your institution',
                detail: 'Click "Access Portal", enter your school name and country. Takes 2 minutes.',
            },
            {
                action: 'Enable Google Sign-In',
                detail: 'No passwords. Teachers and students sign in with their Google accounts automatically.',
            },
            {
                action: 'Choose your plan',
                detail: 'Start free with 5 assessments. Upgrade when your school is ready to scale.',
            },
        ],
        cta: { label: 'Register your institution', href: '/register' },
    },
    {
        role: 'Teacher',
        color: 'violet',
        icon: UserCheck,
        tagline: 'Upload a Word doc. Everything else is handled.',
        steps: [
            {
                action: 'Sign in and select your subjects',
                detail: 'Log in with Google, pick one or more subjects. Your dashboard is ready instantly.',
            },
            {
                action: 'Upload your exam or worksheet',
                detail: 'Drop any Word document — with or without a marking memo. Set the time limit and publish.',
            },
            {
                action: 'Review results in real time',
                detail: 'See every learner\'s marked results, concept gaps, and performance trends as they submit.',
            },
            {
                action: 'Adjust or remark if needed',
                detail: 'Override any mark with a reason. Request an AI remark for context-sensitive answers.',
            },
            {
                action: 'Download reports',
                detail: 'One-click PDF export for any student, your whole class, or for moderation filing.',
            },
        ],
        cta: { label: 'Start as a teacher', href: '/register?role=teacher' },
    },
    {
        role: 'Student',
        color: 'emerald',
        icon: BookOpen,
        tagline: 'Sign in, attempt, improve. That\'s it.',
        steps: [
            {
                action: 'Sign in with Google',
                detail: 'No account setup. Use your school Google account — you\'re in.',
            },
            {
                action: 'Join your institution and subjects',
                detail: 'Select your school and the subjects your teacher has enrolled you in.',
            },
            {
                action: 'Start an available exam',
                detail: 'Pick from your active assessments. The timer starts when you begin.',
            },
            {
                action: 'Get instant feedback',
                detail: 'Results, per-question feedback, and your concept gaps appear within a minute of submitting.',
            },
            {
                action: 'Study with your AI coach',
                detail: 'Your coach knows your results and teaches you exactly what you missed — in real time.',
            },
        ],
        cta: { label: 'Start as a student', href: '/register?role=student' },
    },
];

const colors = {
    indigo: {
        ring: 'ring-indigo-200 dark:ring-indigo-800',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        border: 'border-indigo-100 dark:border-indigo-900',
        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
        icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400',
        num: 'bg-indigo-600 text-white',
        cta: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20',
        line: 'bg-indigo-200 dark:bg-indigo-800',
    },
    violet: {
        ring: 'ring-violet-200 dark:ring-violet-800',
        bg: 'bg-violet-50 dark:bg-violet-950/40',
        border: 'border-violet-100 dark:border-violet-900',
        badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
        icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900/60 dark:text-violet-400',
        num: 'bg-violet-600 text-white',
        cta: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20',
        line: 'bg-violet-200 dark:bg-violet-800',
    },
    emerald: {
        ring: 'ring-emerald-200 dark:ring-emerald-800',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        border: 'border-emerald-100 dark:border-emerald-900',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
        icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400',
        num: 'bg-emerald-600 text-white',
        cta: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20',
        line: 'bg-emerald-200 dark:bg-emerald-800',
    },
};

// ── Single track card ─────────────────────────────────────────────────────────

function TrackCard({ track }) {
    const c = colors[track.color];
    const Icon = track.icon;

    return (
        <div className={`rounded-[2rem] border ${c.border} ${c.bg} p-8 flex flex-col`}>

            {/* Track header */}
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${c.badge}`}>
                    {track.role}
                </span>
            </div>

            <p className="text-lg font-black text-slate-900 dark:text-white mb-6 leading-snug">
                {track.tagline}
            </p>

            {/* Steps */}
            <div className="flex-1 space-y-0 mb-8">
                {track.steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                        {/* Number + connector line */}
                        <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${c.num}`}>
                                {i + 1}
                            </div>
                            {i < track.steps.length - 1 && (
                                <div className={`w-px flex-1 min-h-[20px] mt-1 mb-1 ${c.line}`} />
                            )}
                        </div>

                        {/* Content */}
                        <div className={`pb-${i < track.steps.length - 1 ? '4' : '0'}`}
                            style={{ paddingBottom: i < track.steps.length - 1 ? 16 : 0 }}>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug mb-1">
                                {step.action}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {step.detail}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* CTA */}
            <a
                href={track.cta.href}
                className={`inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-sm transition-colors shadow-lg ${c.cta}`}
            >
                {track.cta.label} <ArrowRight className="w-4 h-4" />
            </a>
        </div>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function StepGuide() {
    return (
        <section className="relative py-24 px-4 bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="text-center mb-16">
                    <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors">
                        Get Started

                    </button>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 leading-tight tracking-tighter">
                        Enrol and run your first exam<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-500 to-emerald-500">
                            in under ten minutes.
                        </span>
                    </h2>
                    <p className="text-base text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                        Three paths — one for your institution, one for teachers, one for students.
                        Follow the steps for your role and you're live.
                    </p>
                </div>

                {/* Quick-start summary strip */}
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    {[
                        { icon: CheckCircle2, label: 'Free to start' },
                        { icon: CheckCircle2, label: 'No IT setup' },
                        { icon: CheckCircle2, label: 'Google Sign-In only' },
                        { icon: CheckCircle2, label: 'Any device, any browser' },
                        { icon: CheckCircle2, label: 'Results in under a minute' },
                    ].map(({ icon: Icon, label }) => (
                        <span key={label} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full">
                            <Icon className="w-3.5 h-3.5 text-emerald-500" />
                            {label}
                        </span>
                    ))}
                </div>

                {/* Three track cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {tracks.map((track) => (
                        <TrackCard key={track.role} track={track} />
                    ))}
                </div>

                {/* Bottom note */}
                <div className="text-center">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                        Institution registers first — then teachers and students follow under it.
                        <br className="hidden md:block" />
                        All three roles can be active on the same school in the same day.
                    </p>
                </div>

            </div>
        </section>
    );
}