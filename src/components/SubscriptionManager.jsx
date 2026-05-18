// ─── SubscriptionManager.jsx ──────────────────────────────────────────────────
// Full subscription management panel: plan overview, upgrade/downgrade,
// billing history, account statement, countdown to next billing date.

import React, { useState, useEffect, useMemo } from 'react';
import {
    Crown, Zap, Sparkles, Star, ChevronDown, ChevronUp,
    ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle,
    Clock, CreditCard, Receipt, FileText, Download,
    AlertTriangle, RefreshCw, CalendarClock, TrendingUp,
    Shield, Infinity, Lock, ChevronRight, ExternalLink,
} from 'lucide-react';

// ─── TIER CONFIG (mirrors tierConfig.js) ─────────────────────────────────────
const TIER_PLANS = [
    {
        id: 'free',
        label: 'Free',
        icon: Star,
        monthlyPrice: 0,
        annualPrice: 0,
        gradient: 'from-slate-400 to-slate-500',
        gradientBg: 'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-750',
        accentColor: '#64748b',
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        ring: 'ring-2 ring-slate-300 dark:ring-slate-600',
        features: [
            '30 students',
            '5 exams',
            '2 teachers',
            'Basic AI marking',
            'Email support',
        ],
        limits: { students: 30, exams: 5, teachers: 2 },
    },
    {
        id: 'starter',
        label: 'Starter',
        icon: Zap,
        monthlyPrice: 299,
        annualPrice: 2868,
        gradient: 'from-blue-500 to-cyan-500',
        gradientBg: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
        accentColor: '#3b82f6',
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        ring: 'ring-2 ring-blue-400',
        features: [
            '150 students',
            '30 exams',
            '10 teachers',
            'Audit log',
            'Advanced AI marking',
            'Priority email support',
        ],
        limits: { students: 150, exams: 30, teachers: 10 },
        popular: false,
    },
    {
        id: 'professional',
        label: 'Professional',
        icon: Sparkles,
        monthlyPrice: 699,
        annualPrice: 6708,
        gradient: 'from-violet-500 to-purple-600',
        gradientBg: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
        accentColor: '#8b5cf6',
        badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
        ring: 'ring-2 ring-violet-400',
        features: [
            '500 students',
            'Unlimited exams',
            '30 teachers',
            'Full audit log',
            'Advanced analytics',
            'Custom branding',
            'Priority phone support',
        ],
        limits: { students: 500, exams: null, teachers: 30 },
        popular: true,
    },
    {
        id: 'enterprise',
        label: 'Enterprise',
        icon: Crown,
        monthlyPrice: 1499,
        annualPrice: 14388,
        gradient: 'from-amber-400 to-orange-500',
        gradientBg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
        accentColor: '#f59e0b',
        badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        ring: 'ring-2 ring-amber-400',
        features: [
            'Unlimited students',
            'Unlimited exams',
            'Unlimited teachers',
            'Multi-school management',
            'SLA support',
            'Custom branding',
            'Dedicated account manager',
            'On-site training',
        ],
        limits: { students: null, exams: null, teachers: null },
    },
];

// ─── MOCK BILLING HISTORY ─────────────────────────────────────────────────────
function generateMockBilling(tier, schoolName) {
    const now = new Date();
    const records = [];
    const planMap = { free: 0, starter: 299, professional: 699, enterprise: 1499 };
    const amount = planMap[tier] || 0;
    if (amount === 0) return [];

    for (let i = 0; i < 6; i++) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        records.push({
            id: `INV-${2025}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`,
            date: d,
            description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan — Monthly`,
            amount,
            status: i === 0 ? 'paid' : 'paid',
            method: 'Card •••• 4242',
        });
    }
    return records;
}

// ─── COUNTDOWN HOOK ───────────────────────────────────────────────────────────
function useCountdown(targetDate) {
    const [timeLeft, setTimeLeft] = useState({});

    useEffect(() => {
        const calc = () => {
            const diff = new Date(targetDate) - new Date();
            if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            setTimeLeft({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
            });
        };
        calc();
        const id = setInterval(calc, 1000);
        return () => clearInterval(id);
    }, [targetDate]);

    return timeLeft;
}

// ─── COUNTDOWN CARD ───────────────────────────────────────────────────────────
function CountdownCard({ nextBillingDate, tier, accentColor }) {
    const t = useCountdown(nextBillingDate);
    const plan = TIER_PLANS.find(p => p.id === tier);

    return (
        <div
            className="relative rounded-2xl p-5 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`, border: `1px solid ${accentColor}30` }}
        >
            {/* Decorative ring */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10"
                style={{ background: accentColor }} />

            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <CalendarClock size={14} style={{ color: accentColor }} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Next Billing
                        </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                        {new Date(nextBillingDate).toLocaleDateString('en-ZA', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold">Amount due</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">
                        R{plan?.monthlyPrice?.toLocaleString() ?? '0'}
                    </p>
                </div>
            </div>

            {/* Countdown */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { value: t.days ?? 0, label: 'Days' },
                    { value: t.hours ?? 0, label: 'Hours' },
                    { value: t.minutes ?? 0, label: 'Mins' },
                    { value: t.seconds ?? 0, label: 'Secs' },
                ].map(({ value, label }) => (
                    <div key={label} className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-2 text-center backdrop-blur-sm">
                        <p className="text-xl font-black tabular-nums text-slate-800 dark:text-white leading-none">
                            {String(value).padStart(2, '0')}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-wider mt-1"
                            style={{ color: accentColor }}>
                            {label}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── PLAN CARD ────────────────────────────────────────────────────────────────
function PlanCard({ plan, currentTier, onSelect, billingCycle }) {
    const isCurrent = plan.id === currentTier;
    const tiers = ['free', 'starter', 'professional', 'enterprise'];
    const currentIdx = tiers.indexOf(currentTier);
    const planIdx = tiers.indexOf(plan.id);
    const isUpgrade = planIdx > currentIdx;
    const isDowngrade = planIdx < currentIdx;
    const Icon = plan.icon;
    const price = billingCycle === 'annual' ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;

    return (
        <div
            className={`relative rounded-2xl p-5 border transition-all duration-200 ${isCurrent
                ? `${plan.ring} bg-gradient-to-br ${plan.gradientBg}`
                : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
        >
            {plan.popular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white"
                    style={{ background: plan.accentColor }}>
                    Most Popular
                </div>
            )}

            {isCurrent && (
                <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white bg-slate-800 dark:bg-slate-600">
                    Current Plan
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${plan.gradient} flex-shrink-0`}>
                    <Icon size={15} className="text-white" />
                </div>
                <div>
                    <p className="text-sm font-black text-slate-800 dark:text-white">{plan.label}</p>
                    <p className="text-[10px] text-slate-400">
                        {plan.monthlyPrice === 0 ? 'Free forever' : `R${price}/mo${billingCycle === 'annual' ? ' billed yearly' : ''}`}
                    </p>
                </div>
            </div>

            {/* Features */}
            <ul className="space-y-1.5 mb-5">
                {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <CheckCircle2 size={11} style={{ color: plan.accentColor }} className="flex-shrink-0" />
                        {f}
                    </li>
                ))}
            </ul>

            {/* CTA */}
            {!isCurrent && (
                <button
                    onClick={() => onSelect(plan)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black transition-all ${isUpgrade
                        ? 'text-white hover:opacity-90'
                        : 'text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    style={isUpgrade ? { background: `linear-gradient(135deg, ${plan.accentColor}, ${plan.accentColor}cc)` } : {}}
                >
                    {isUpgrade ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {isUpgrade ? `Upgrade to ${plan.label}` : `Downgrade to ${plan.label}`}
                </button>
            )}
            {isCurrent && (
                <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black text-white bg-gradient-to-r"
                    style={{ background: `linear-gradient(135deg, ${plan.accentColor}cc, ${plan.accentColor})` }}>
                    <CheckCircle2 size={12} />
                    Active Plan
                </div>
            )}
        </div>
    );
}

// ─── BILLING TABLE ────────────────────────────────────────────────────────────
function BillingHistory({ records, accentColor }) {
    const [expanded, setExpanded] = useState(false);
    const shown = expanded ? records : records.slice(0, 4);

    if (records.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
                <Receipt size={28} className="text-slate-200 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold">No billing history yet.</p>
                <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">You're on the Free plan.</p>
            </div>
        );
    }

    const total = records.reduce((s, r) => s + r.amount, 0);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CreditCard size={15} style={{ color: accentColor }} />
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">Billing History</h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-bold">
                        Total paid: <span className="font-black text-slate-700 dark:text-slate-200">R{total.toLocaleString()}</span>
                    </span>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => {/* trigger PDF export */ }}
                    >
                        <Download size={11} /> Statement
                    </button>
                </div>
            </div>

            {/* Table — scrollable on mobile */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                            {['Invoice', 'Description', 'Method', 'Amount', 'Status', ''].map(h => (
                                <th key={h} className="text-left px-4 py-3 font-black text-slate-400 uppercase tracking-wider text-[9px]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {shown.map((r) => (
                            <tr key={r.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-4 py-3">
                                    <span className="font-black text-slate-500 text-[10px] font-mono">{r.id}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="font-bold text-slate-700 dark:text-slate-200">{r.description}</p>
                                        <p className="text-slate-400 text-[10px]">{r.date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-500">{r.method}</td>
                                <td className="px-4 py-3">
                                    <span className="font-black text-slate-800 dark:text-white">R{r.amount.toLocaleString()}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${r.status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {r.status === 'paid'
                                            ? <CheckCircle2 size={9} />
                                            : <XCircle size={9} />}
                                        {r.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                        <Download size={13} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {records.length > 4 && (
                <button
                    onClick={() => setExpanded(e => !e)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-[11px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-t border-slate-100 dark:border-slate-700"
                >
                    {expanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show all {records.length} invoices</>}
                </button>
            )}
        </div>
    );
}

// ─── ACCOUNT STATEMENT ────────────────────────────────────────────────────────
function AccountStatement({ records, tier, schoolName, accentColor }) {
    const plan = TIER_PLANS.find(p => p.id === tier);
    const totalPaid = records.reduce((s, r) => s + r.amount, 0);
    const monthsActive = records.length;
    const avgMonthly = monthsActive ? Math.round(totalPaid / monthsActive) : 0;

    const stats = [
        { label: 'Total Paid (All Time)', value: `R${totalPaid.toLocaleString()}`, icon: TrendingUp, color: accentColor },
        { label: 'Months Active', value: monthsActive, icon: CalendarClock, color: '#10b981' },
        { label: 'Avg Monthly Spend', value: `R${avgMonthly.toLocaleString()}`, icon: Receipt, color: '#f59e0b' },
        { label: 'Next Payment', value: plan ? `R${plan.monthlyPrice.toLocaleString()}` : 'Free', icon: CreditCard, color: '#8b5cf6' },
    ];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4">
                <FileText size={15} style={{ color: accentColor }} />
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Account Statement</h3>
                <span className="ml-auto text-[10px] text-slate-400">{schoolName}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {stats.map(({ label, value, icon: Icon, color }) => (
                    <div key={label}
                        className="rounded-xl p-3 flex items-center gap-3"
                        style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${color}20` }}>
                            <Icon size={14} style={{ color }} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-800 dark:text-white leading-none">{value}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5 leading-tight">{label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── CHANGE PLAN MODAL ────────────────────────────────────────────────────────
function ChangePlanModal({ targetPlan, currentTier, onConfirm, onCancel }) {
    const tiers = ['free', 'starter', 'professional', 'enterprise'];
    const isUpgrade = tiers.indexOf(targetPlan.id) > tiers.indexOf(currentTier);
    const Icon = targetPlan.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full border border-slate-100 dark:border-slate-700 shadow-2xl">
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-5 bg-gradient-to-br ${targetPlan.gradient}`}>
                    <Icon size={28} className="text-white" />
                </div>

                <h2 className="text-lg font-black text-slate-800 dark:text-white text-center mb-1">
                    {isUpgrade ? 'Upgrade to' : 'Downgrade to'} {targetPlan.label}
                </h2>
                <p className="text-xs text-slate-400 text-center mb-6">
                    {isUpgrade
                        ? `You'll be billed R${targetPlan.monthlyPrice.toLocaleString()}/month starting today.`
                        : 'Your current plan remains active until the end of the billing period.'
                    }
                </p>

                {isUpgrade && (
                    <div className="rounded-xl p-4 mb-5"
                        style={{ background: `${targetPlan.accentColor}10`, border: `1px solid ${targetPlan.accentColor}25` }}>
                        <p className="text-[10px] font-black uppercase tracking-wider mb-2"
                            style={{ color: targetPlan.accentColor }}>
                            You'll gain access to
                        </p>
                        <ul className="space-y-1">
                            {targetPlan.features.slice(0, 4).map(f => (
                                <li key={f} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                                    <CheckCircle2 size={10} style={{ color: targetPlan.accentColor }} />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {!isUpgrade && (
                    <div className="rounded-xl p-4 mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                Downgrading may remove access to some features and restrict your limits. Data exceeding new limits won't be deleted.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(targetPlan)}
                        className="flex-1 py-3 rounded-xl text-xs font-black text-white transition-opacity hover:opacity-90"
                        style={{ background: `linear-gradient(135deg, ${targetPlan.accentColor}, ${targetPlan.accentColor}cc)` }}
                    >
                        {isUpgrade ? 'Confirm Upgrade' : 'Confirm Downgrade'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function SubscriptionManager({
    currentTier = 'free',
    schoolName = 'My School',
    schoolId,
    onTierChange,
    primary = '#4f46e5',
}) {
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [activeSection, setActiveSection] = useState('plan'); // 'plan' | 'billing' | 'statement'
    const [selectedPlan, setSelectedPlan] = useState(null);

    const plan = TIER_PLANS.find(p => p.id === currentTier) || TIER_PLANS[0];
    const accentColor = plan.accentColor;

    // Compute next billing date (1 month from today)
    const nextBillingDate = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d;
    }, []);

    const billingRecords = useMemo(
        () => generateMockBilling(currentTier, schoolName),
        [currentTier, schoolName]
    );

    const handlePlanSelect = (p) => setSelectedPlan(p);

    const handleConfirmChange = (p) => {
        onTierChange?.(p.id);
        setSelectedPlan(null);
    };

    const sections = [
        { id: 'plan', label: 'Plan', icon: Zap },
        { id: 'billing', label: 'Billing', icon: CreditCard },
        { id: 'statement', label: 'Statement', icon: FileText },
    ];

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Shield size={16} style={{ color: accentColor }} />
                        Subscriptions
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Manage your plan, billing history & account statement
                    </p>
                </div>

                {/* Billing cycle toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                    {['monthly', 'annual'].map(cycle => (
                        <button
                            key={cycle}
                            onClick={() => setBillingCycle(cycle)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all capitalize ${billingCycle === cycle
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-400'
                                }`}
                        >
                            {cycle}
                            {cycle === 'annual' && (
                                <span className="ml-1 text-emerald-500">-20%</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Current plan snapshot ── */}
            <div
                className="rounded-2xl p-5 flex items-center gap-4 flex-wrap"
                style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`, border: `1px solid ${accentColor}25` }}
            >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${plan.gradient} flex-shrink-0`}>
                    {React.createElement(plan.icon, { size: 20, className: 'text-white' })}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Plan</p>
                    <p className="text-base font-black text-slate-800 dark:text-white">{plan.label}</p>
                    <p className="text-[10px] text-slate-400">
                        {plan.monthlyPrice === 0 ? 'Free forever' : `R${plan.monthlyPrice.toLocaleString()}/month`}
                    </p>
                </div>
                {currentTier !== 'enterprise' && (
                    <button
                        onClick={() => setActiveSection('plan')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black text-white hover:opacity-90 transition-opacity"
                        style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
                    >
                        <ArrowUpRight size={12} /> Upgrade
                    </button>
                )}
            </div>

            {/* ── Countdown (only if paid) ── */}
            {currentTier !== 'free' && (
                <CountdownCard
                    nextBillingDate={nextBillingDate}
                    tier={currentTier}
                    accentColor={accentColor}
                />
            )}

            {/* ── Section tabs ── */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {sections.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveSection(id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black transition-all ${activeSection === id
                            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        <Icon size={11} />
                        {label}
                    </button>
                ))}
            </div>

            {/* ── PLAN SECTION ── */}
            {activeSection === 'plan' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {TIER_PLANS.map(p => (
                        <PlanCard
                            key={p.id}
                            plan={p}
                            currentTier={currentTier}
                            onSelect={handlePlanSelect}
                            billingCycle={billingCycle}
                        />
                    ))}
                </div>
            )}

            {/* ── BILLING SECTION ── */}
            {activeSection === 'billing' && (
                <BillingHistory records={billingRecords} accentColor={accentColor} />
            )}

            {/* ── STATEMENT SECTION ── */}
            {activeSection === 'statement' && (
                <AccountStatement
                    records={billingRecords}
                    tier={currentTier}
                    schoolName={schoolName}
                    accentColor={accentColor}
                />
            )}

            {/* ── Change plan modal ── */}
            {selectedPlan && (
                <ChangePlanModal
                    targetPlan={selectedPlan}
                    currentTier={currentTier}
                    onConfirm={handleConfirmChange}
                    onCancel={() => setSelectedPlan(null)}
                />
            )}
        </div>
    );
}