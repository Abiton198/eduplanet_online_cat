// ─── TierSelection.jsx ────────────────────────────────────────────────────────
import React from 'react';
import { Check, Zap, Star, Sparkles, Crown, ArrowRight, Lock, RefreshCw } from 'lucide-react';
import { TIERS, TIER_ORDER, getTierPrice } from '../utils/tierConfig';

const TIER_ICONS = {
    free: Star, starter: Zap, professional: Sparkles, platinum: Crown, enterprise: Crown,
};
const TIER_GRADIENTS = {
    free: 'from-slate-400 to-slate-500',
    starter: 'from-blue-500 to-cyan-500',
    professional: 'from-violet-500 to-purple-600',
    platinum: 'from-yellow-400 to-amber-500',   // gold
    enterprise: 'from-amber-400 to-orange-500',
};
const TIER_ACCENTS = {
    free: '#64748b',
    starter: '#3b82f6',
    professional: '#7c3aed',
    platinum: '#d97706',                         // gold
    enterprise: '#f59e0b',
};
const TIER_RINGS = {
    free: 'ring-slate-300',
    starter: 'ring-blue-400',
    professional: 'ring-violet-400',
    platinum: 'ring-yellow-400',                 // gold ring
    enterprise: 'ring-amber-400',
};
const TIER_FEATURES = {
    free: ['30 students', '3 teachers', '10 exams', 'AI auto-marking', 'Basic analytics'],
    starter: ['150 students', '10 teachers', '50 exams', 'AI auto-marking', 'Audit log', 'Standard analytics', 'Email support'],
    professional: ['500 students', '30 teachers', 'Unlimited exams', 'AI auto-marking', 'Full audit log', 'Advanced analytics', 'Custom branding', 'Priority support'],
    platinum: ['1000 students', '100 teachers', 'Unlimited exams', 'AI auto-marking', 'Full audit log', 'Advanced analytics', 'Custom branding', 'Priority support'],
    enterprise: ['Unlimited everything', 'Multi-school management', 'Full audit log', 'Advanced analytics', 'Custom branding', 'SLA support', 'Dedicated account manager'],
};
const TIER_MISSING = {
    free: ['Audit log', 'Advanced analytics', 'Priority support'],
    starter: ['Advanced analytics', 'Priority support', 'Custom branding'],
    professional: ['Multi-school management'],
    platinum: ['Multi-school management'],
    enterprise: [],
};

function TierCard({ tier, selected, current, billingCycle, onSelect, compact }) {
    if (!tier || !tier.id) return null;

    const Icon = TIER_ICONS[tier.id] || Star;
    const gradient = TIER_GRADIENTS[tier.id] || 'from-slate-400 to-slate-500';
    const accent = TIER_ACCENTS[tier.id] || '#64748b';
    const ring = TIER_RINGS[tier.id] || 'ring-slate-300';
    const features = TIER_FEATURES[tier.id] || [];
    const missing = TIER_MISSING[tier.id] || [];

    const isSelected = selected === tier.id;
    const isCurrent = current === tier.id;

    // Calculate if shifting to this card is a downgrade
    const isDowngrade = current && TIER_ORDER
        ? TIER_ORDER.indexOf(tier.id) < TIER_ORDER.indexOf(current)
        : false;

    // Use our utility formula to calculate the actual dynamic cost to present
    const computedPrice = getTierPrice(tier, billingCycle);

    const showPopularBadge = tier.popular && tier.id !== 'platinum' && !compact;

    const handleClick = () => {
        if (!isCurrent) onSelect(tier.id);
    };

    return (
        <div
            onClick={handleClick}
            className={`
                relative flex flex-col rounded-3xl border-2 transition-all duration-200 overflow-hidden
                ${compact ? 'p-4' : 'p-6'}
                ${isSelected
                    ? `border-transparent ring-2 ${ring} shadow-xl scale-[1.02]`
                    : isCurrent
                        ? 'border-transparent ring-2 ring-emerald-400 shadow-md'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg cursor-pointer'}
                bg-white dark:bg-slate-800
            `}
        >
            {/* Most Popular badge */}
            {showPopularBadge && (
                <div className="absolute top-0 right-0">
                    <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl rounded-tr-3xl tracking-wider uppercase">
                        Most Popular
                    </div>
                </div>
            )}

            {/* Current status badge */}
            {isCurrent && (
                <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={9} /> Current Plan
                    </span>
                </div>
            )}

            {/* Downgrade alert layout indicator */}
            {!isCurrent && isDowngrade && !compact && (
                <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        <RefreshCw size={9} className="animate-spin-slow" /> Downgrade
                    </span>
                </div>
            )}

            {/* Icon + name */}
            <div className={`flex items-center gap-3 ${isCurrent || (isDowngrade && !compact) ? 'mt-5' : ''} ${compact ? 'mb-3' : 'mb-4'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg flex-shrink-0`}>
                    <Icon size={18} className="text-white" />
                </div>
                <div>
                    <p className="font-black text-slate-800 dark:text-white text-sm">{tier.name}</p>
                    {!compact && <p className="text-[10px] text-slate-400 font-medium">{tier.tagline}</p>}
                </div>
            </div>

            {/* Price Calculations output interface */}
            <div className={compact ? 'mb-3' : 'mb-5'}>
                {computedPrice === 0 ? (
                    <p className="text-2xl font-black text-slate-800 dark:text-white">Free</p>
                ) : computedPrice === null ? (
                    <p className="text-lg font-black text-slate-800 dark:text-white">Custom</p>
                ) : (
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-400">R</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-white">
                            {computedPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            {billingCycle === 'yearly' ? '/year' : '/month'}
                        </span>
                    </div>
                )}
            </div>

            {/* Features layout checklist list item fields */}
            {!compact && (
                <ul className="space-y-1.5 flex-1 mb-5">
                    {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: accent }} />
                            {f}
                        </li>
                    ))}
                    {missing.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-300 dark:text-slate-600 line-through">
                            <Lock size={11} className="flex-shrink-0 mt-0.5" />
                            {f}
                        </li>
                    ))}
                </ul>
            )}

            {/* Dynamic CTA Selection Buttons */}
            <button
                type="button"
                disabled={isCurrent}
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                className={`
                    w-full py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5
                    ${isCurrent
                        ? 'bg-emerald-50 text-emerald-700 cursor-default'
                        : isSelected
                            ? 'text-white shadow-lg'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-90'
                    }
                `}
                style={isSelected && !isCurrent ? { background: `linear-gradient(135deg, ${accent}, ${accent}cc)` } : {}}
            >
                {isCurrent ? (
                    <><Check size={12} /> Active</>
                ) : tier.price === null ? (
                    <>Contact Sales <ArrowRight size={11} /></>
                ) : isDowngrade ? (
                    <>Downgrade to {tier.name} <ArrowRight size={11} /></>
                ) : (
                    <>Select {tier.name} <ArrowRight size={11} /></>
                )}
            </button>
        </div>
    );
}

export default function TierSelection({ selected, current, billingCycle = 'monthly', onSelect, compact = false }) {
    const tiers = Array.isArray(TIERS) ? TIERS.filter(Boolean) : [];

    return (
        <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
            {tiers.map((tier) => (
                <TierCard
                    key={tier.id}
                    tier={tier}
                    selected={selected}
                    current={current}
                    billingCycle={billingCycle}
                    onSelect={onSelect}
                    compact={compact}
                />
            ))}
        </div>
    );
}