import React from 'react';
import { Check, ArrowRight, Lock, RefreshCw } from 'lucide-react';
import { TIERS, TIER_ORDER, getTierPrice } from '../utils/tierConfig';

function TierCard({ tier, selected, current, billingCycle, onSelect, compact }) {
    if (!tier || !tier.id) return null;

    const Icon = tier.icon; // Now sourced directly from config
    const isSelected = selected === tier.id;
    const isCurrent = current === tier.id;

    // Use our utility formula to calculate the actual dynamic cost
    const computedPrice = getTierPrice(tier, billingCycle);

    // Downgrade logic using unified TIER_ORDER
    const isDowngrade = current && TIER_ORDER.indexOf(tier.id) < TIER_ORDER.indexOf(current);

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
                    ? `border-transparent ring-2 ring-slate-400 shadow-xl scale-[1.02]`
                    : isCurrent
                        ? 'border-transparent ring-2 ring-emerald-400 shadow-md'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg cursor-pointer'}
                bg-white dark:bg-slate-800
            `}
        >
            {/* Most Popular badge */}
            {tier.popular && !isCurrent && (
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

            {/* Downgrade alert */}
            {!isCurrent && isDowngrade && !compact && (
                <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        <RefreshCw size={9} /> Downgrade
                    </span>
                </div>
            )}

            <div className={`flex items-center gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${tier.gradient} shadow-lg flex-shrink-0`}>
                    <Icon size={18} className="text-white" />
                </div>
                <div>
                    <p className="font-black text-slate-800 dark:text-white text-sm">{tier.label}</p>
                </div>
            </div>

            <div className={compact ? 'mb-3' : 'mb-5'}>
                {computedPrice === 0 ? (
                    <p className="text-2xl font-black text-slate-800 dark:text-white">Free</p>
                ) : (
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-400">R</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-white">
                            {computedPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            {billingCycle === 'annual' ? '/year' : '/month'}
                        </span>
                    </div>
                )}
            </div>

            {!compact && (
                <ul className="space-y-1.5 flex-1 mb-5">
                    {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={12} className="flex-shrink-0 mt-0.5" style={{ color: tier.accentColor }} />
                            {f}
                        </li>
                    ))}
                </ul>
            )}

            <button
                type="button"
                disabled={isCurrent}
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                className={`w-full py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${isCurrent ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 dark:bg-slate-700'
                    }`}
            >
                {isCurrent ? <><Check size={12} /> Active</> : <>Select {tier.label} <ArrowRight size={11} /></>}
            </button>
        </div>
    );
}

export default function TierSelection({ selected, current, billingCycle = 'monthly', onSelect, compact = false }) {
    return (
        <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
            {TIERS.map((tier) => (
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