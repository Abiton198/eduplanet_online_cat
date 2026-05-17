// ─── TierSelection.jsx ────────────────────────────────────────────────────────
// Shown as Step 4 in SchoolRegistration.
// Also used standalone inside PaymentManager for upgrades.

import React, { useState } from 'react';
import { Check, X, Zap, Star, Crown, Gift } from 'lucide-react';
import { TIERS, TIER_ORDER } from '../utils/tierConfig';

const TIER_ICONS = {
    free: <Gift size={22} />,
    basic: <Zap size={22} />,
    professional: <Star size={22} />,
    enterprise: <Crown size={22} />,
};

// ── Individual card ────────────────────────────────────────────────────────────
function TierCard({ tier, selected, current, onSelect, compact = false }) {
    const isSelected = selected === tier.id;
    const isCurrent = current === tier.id;
    const isDowngrade = TIER_ORDER.indexOf(tier.id) < TIER_ORDER.indexOf(current);

    return (
        <div
            onClick={() => !isDowngrade && onSelect(tier.id)}
            className={`
        relative rounded-3xl border-2 transition-all duration-300 flex flex-col
        ${compact ? 'p-5' : 'p-7'}
        ${isSelected
                    ? 'border-transparent shadow-2xl scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
        ${isDowngrade ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
            style={isSelected ? {
                background: `linear-gradient(135deg, ${tier.color}18 0%, ${tier.color}08 100%)`,
                borderColor: tier.color,
                boxShadow: `0 20px 60px ${tier.color}25`,
            } : {}}
        >
            {/* Recommended badge */}
            {tier.recommended && (
                <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                    style={{ backgroundColor: tier.color }}
                >
                    ⭐ Most Popular
                </div>
            )}

            {/* Current plan badge */}
            {isCurrent && (
                <div className="absolute -top-3 right-5 px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">
                    Current
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: tier.color }}
                >
                    {TIER_ICONS[tier.id]}
                </div>
                <div>
                    <p className="font-black text-slate-800 dark:text-white text-lg leading-tight">{tier.name}</p>
                    <p className="text-xs text-slate-500">{tier.tagline}</p>
                </div>
                {isSelected && (
                    <div className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: tier.color }}>
                        <Check size={14} />
                    </div>
                )}
            </div>

            {/* Price */}
            <div className="mb-5">
                {tier.price === 0 ? (
                    <p className="text-3xl font-black text-slate-800 dark:text-white">Free</p>
                ) : (
                    <div className="flex items-end gap-1">
                        <p className="text-3xl font-black text-slate-800 dark:text-white">R{tier.price.toLocaleString()}</p>
                        <p className="text-slate-400 text-sm mb-1">/month</p>
                    </div>
                )}
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                    ['Teachers', tier.limits.teachers >= 9999 ? '∞' : tier.limits.teachers],
                    ['Students', tier.limits.students >= 9999 ? '∞' : tier.limits.students],
                    ['Exams/mo', tier.limits.examUploads >= 9999 ? '∞' : tier.limits.examUploads],
                    ['AI Marks', tier.limits.aiMarksPerMonth >= 9999 ? '∞' : tier.limits.aiMarksPerMonth],
                ].map(([label, val]) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
                        <p className="font-black text-slate-800 dark:text-white text-sm">{val}</p>
                    </div>
                ))}
            </div>

            {/* Features */}
            {!compact && (
                <div className="space-y-1.5 flex-1">
                    {tier.features.map((f) => (
                        <div key={f} className="flex items-start gap-2 text-xs">
                            <Check size={12} className="mt-0.5 flex-shrink-0" style={{ color: tier.color }} />
                            <span className="text-slate-600 dark:text-slate-300">{f}</span>
                        </div>
                    ))}
                    {tier.unavailable.slice(0, 3).map((f) => (
                        <div key={f} className="flex items-start gap-2 text-xs opacity-40">
                            <X size={12} className="mt-0.5 flex-shrink-0 text-slate-400" />
                            <span className="text-slate-400 line-through">{f}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* CTA */}
            <button
                type="button"
                disabled={isDowngrade || isCurrent}
                onClick={(e) => { e.stopPropagation(); !isDowngrade && onSelect(tier.id); }}
                className="mt-5 w-full py-3 rounded-2xl font-black text-sm transition-all disabled:opacity-40"
                style={isSelected
                    ? { backgroundColor: tier.color, color: 'white' }
                    : { backgroundColor: tier.color + '15', color: tier.color }
                }
            >
                {isCurrent ? '✓ Current Plan' : isDowngrade ? 'Cannot Downgrade' : tier.ctaLabel}
            </button>
        </div>
    );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function TierSelection({
    selected,
    current = null,   // currently active tier (for upgrade mode)
    onSelect,
    compact = false,  // compact mode for upgrade modal
}) {
    return (
        <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'}`}>
            {TIER_ORDER.map((id) => (
                <TierCard
                    key={id}
                    tier={TIERS[id]}
                    selected={selected}
                    current={current}
                    onSelect={onSelect}
                    compact={compact}
                />
            ))}
        </div>
    );
}

// ── Compact inline tier badge (for sidebar / navbar) ──────────────────────────
export function TierBadge({ tierId, onClick }) {
    const tier = TIERS[tierId] || TIERS.free;
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all hover:opacity-80"
            style={{ borderColor: tier.color + '50', backgroundColor: tier.color + '15' }}
        >
            <span className="text-sm">{tier.badge}</span>
            <span className="text-xs font-black" style={{ color: tier.color }}>{tier.name}</span>
        </button>
    );
}