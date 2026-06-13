import React from 'react';
import {
    Building2,
    UserCheck,
    FileUp,
    ShieldCheck,
    BarChart3,
    MessageSquareDiff,
    Printer,
} from 'lucide-react';

const steps = [
    {
        number: '01',
        icon: Building2,
        title: 'Institution Enrols',
        badge: 'Admin',
        color: 'indigo',
        bullets: [
            'School, college, or university registers on Eduket OS through Access Portal button',
            'Activates Google Sign-In for staff and students — no passwords needed',
            'Works from any country or time zone',
            'Teachers and students then self-onboard under the institution',
        ],
    },
    {
        number: '02',
        icon: UserCheck,
        title: 'Teacher Signs Up & Configures',
        badge: 'Teacher',
        color: 'violet',
        bullets: [
            'Signs in with Google and selects one or more subjects',
            'Multi-subject selection supported in a single account',
            'Teacher dashboard activates instantly — classes, exams, and reports in one place',
        ],
    },
    {
        number: '03',
        icon: FileUp,
        title: 'Teacher Uploads Exam & Memo',
        badge: 'Teacher',
        color: 'purple',
        bullets: [
            'Uploads MS Word (.docx) exam paper and marking memo',
            'Sets exam duration timer before publishing',
            'Exam is only visible to students enrolled in that subject',
        ],
    },
    {
        number: '04',
        icon: ShieldCheck,
        title: 'Student Attempts Exam',
        badge: 'Student',
        color: 'sky',
        bullets: [
            'Student signs in and selects their institution and enrolled subjects',
            'Sees available exams and starts attempt with one click',
            'AI Proctoring active — no copy/paste, no tab switching',
            'Anti-cheating flags are logged and visible to the teacher',
        ],
    },
    {
        number: '05',
        icon: BarChart3,
        title: 'Results, Feedback & Reports',
        badge: 'All Roles',
        color: 'emerald',
        bullets: [
            'Student sees marked results and feedback analysis within ~1 minute of submission',
            'Teacher receives a per-student attempt report instantly',
            'Principal dashboard shows class-wide results and performance analysis',
        ],
    },
    {
        number: '06',
        icon: MessageSquareDiff,
        title: 'AI Remark or Manual Adjustment',
        badge: 'Teacher',
        color: 'amber',
        bullets: [
            'Teacher can request an AI remark for context-sensitive answers outside the memo',
            'Manual mark adjustment available with a reason field for transparency',
            'Adjusted results update the student and principal dashboards automatically',
        ],
    },
    {
        number: '07',
        icon: Printer,
        title: 'Print or Download Reports',
        badge: 'Teacher',
        color: 'rose',
        bullets: [
            'One-click PDF or Word export of any student report',
            'Formatted for filing, moderation, or further assessment',
            'Batch download available for full class reports',
        ],
    },
];

const colorMap = {
    indigo: {
        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
        number: 'text-indigo-200 dark:text-indigo-900',
        icon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400',
        border: 'border-indigo-100 dark:border-indigo-900/60',
        dot: 'bg-indigo-500',
        bullet: 'text-indigo-500 dark:text-indigo-400',
    },
    violet: {
        badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
        number: 'text-violet-200 dark:text-violet-900',
        icon: 'bg-violet-50 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400',
        border: 'border-violet-100 dark:border-violet-900/60',
        dot: 'bg-violet-500',
        bullet: 'text-violet-500 dark:text-violet-400',
    },
    purple: {
        badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        number: 'text-purple-200 dark:text-purple-900',
        icon: 'bg-purple-50 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
        border: 'border-purple-100 dark:border-purple-900/60',
        dot: 'bg-purple-500',
        bullet: 'text-purple-500 dark:text-purple-400',
    },
    sky: {
        badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
        number: 'text-sky-200 dark:text-sky-900',
        icon: 'bg-sky-50 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400',
        border: 'border-sky-100 dark:border-sky-900/60',
        dot: 'bg-sky-500',
        bullet: 'text-sky-500 dark:text-sky-400',
    },
    emerald: {
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        number: 'text-emerald-200 dark:text-emerald-900',
        icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
        border: 'border-emerald-100 dark:border-emerald-900/60',
        dot: 'bg-emerald-500',
        bullet: 'text-emerald-500 dark:text-emerald-400',
    },
    amber: {
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        number: 'text-amber-200 dark:text-amber-900',
        icon: 'bg-amber-50 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
        border: 'border-amber-100 dark:border-amber-900/60',
        dot: 'bg-amber-500',
        bullet: 'text-amber-500 dark:text-amber-400',
    },
    rose: {
        badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
        number: 'text-rose-200 dark:text-rose-900',
        icon: 'bg-rose-50 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400',
        border: 'border-rose-100 dark:border-rose-900/60',
        dot: 'bg-rose-500',
        bullet: 'text-rose-500 dark:text-rose-400',
    },
};

export default function StepGuide() {
    return (
        <section className="relative py-24 px-4 bg-white dark:bg-gray-950 overflow-hidden">
            {/* subtle background grid */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                style={{
                    backgroundImage:
                        'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                }}
            />

            <div className="relative max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="inline-block text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-3">
                        How it works
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
                        From enrolment to insight —{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-rose-500">
                            in seven steps.
                        </span>
                    </h2>
                    <p className="text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
                        Eduket OS is built for any institution, anywhere. Here is the complete journey from
                        first login to filed report.
                    </p>
                </div>

                {/* Steps */}
                <div className="flex flex-col gap-5">
                    {steps.map((step, i) => {
                        const c = colorMap[step.color];
                        const Icon = step.icon;
                        const isEven = i % 2 === 0;

                        return (
                            <div
                                key={step.number}
                                className={`relative flex ${isEven ? 'justify-start' : 'justify-end'}`}
                            >
                                {/* connector line — skip last */}
                                {i < steps.length - 1 && (
                                    <div
                                        className={`absolute ${isEven ? 'left-8' : 'right-8'} top-full w-px h-5 bg-gray-200 dark:bg-gray-800 z-10`}
                                    />
                                )}

                                <div
                                    className={`
                    relative w-full md:w-[88%]
                    rounded-2xl border ${c.border}
                    bg-white dark:bg-gray-900
                    shadow-sm hover:shadow-md transition-shadow duration-200
                    p-6
                  `}
                                >
                                    {/* Big ghost number */}
                                    <span
                                        className={`absolute top-3 ${isEven ? 'right-5' : 'left-5'} text-7xl font-black leading-none select-none ${c.number} transition-colors`}
                                    >
                                        {step.number}
                                    </span>

                                    <div className="relative z-10">
                                        {/* Top row */}
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${c.badge}`}>
                                                        {step.badge}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                                                    {step.title}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Bullets */}
                                        <ul className="space-y-2 pl-1">
                                            {step.bullets.map((b) => (
                                                <li key={b} className="flex items-start gap-2.5">
                                                    <span className={`mt-[7px] flex-shrink-0 w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                        {b}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer CTA */}
                <div className="mt-16 text-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                        Ready to run your first AI-marked exam?
                    </p>
                    <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors shadow-lg shadow-indigo-500/20">
                        Get started — it's free
                    </button>
                </div>
            </div>
        </section>
    );
}