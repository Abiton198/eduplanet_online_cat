import { Star, Zap, Sparkles, Crown, Gem } from 'lucide-react';
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "./firebase";
import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────
// NOTE ON PRICING (read this before touching monthlyPrice/annualPrice)
//
// The numbers below are BASE ZAR rates for a PRIMARY-school customer paying
// in ZAR (or any currency that isn't "stronger" than ZAR). They are no
// longer the final chargeable amount on their own.
//
// Two multipliers now apply on top of these base prices, computed
// authoritatively on the BACKEND (see services/billingApi.js +
// backend/pricing_engine.py):
//   1. Institution type  - secondary = 1.5x, tertiary (university/college) = 2.25x
//   2. Registrant currency strength - 3x if the school's local currency is
//      stronger than ZAR (USD/GBP/EUR/etc.), 1x otherwise
//
// getEstimatedPrice() below is for INSTANT UI feedback only (e.g. showing a
// rough number while a real quote is still loading). The amount actually
// sent to PayFast must come from fetchPriceQuote() in billingApi.js, not
// from this file - that keeps a user from tampering with the price by
// editing client-side JS before checkout.
// ─────────────────────────────────────────────────────────────────────────

export const TIERS = [
    {
        id: 'free',
        label: 'Free',
        monthlyPrice: 0,
        annualPrice: 0,
        icon: Star,
        gradient: 'from-slate-400 to-slate-500',
        gradientBg: 'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-750',
        accentColor: '#64748b',
        limits: { students: 10, teachers: 2, exams: 4 },
        features: ['10 students', '4 exams', '2 teachers', 'Basic AI marking'],
    },
    {
        id: 'silver',
        label: 'Silver',
        monthlyPrice: 999,
        annualPrice: 9990,
        icon: Zap,
        gradient: 'from-blue-500 to-cyan-500',
        gradientBg: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
        accentColor: '#3b82f6',
        limits: { students: 50, teachers: 3, exams: 15 },
        features: ['50 students', '15 exams', '3 teachers', 'Audit log', 'Advanced AI marking'],
    },
    {
        id: 'gold',
        label: 'Gold',
        monthlyPrice: 1999,
        annualPrice: 19990,
        icon: Sparkles,
        gradient: 'from-violet-500 to-purple-600',
        gradientBg: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
        accentColor: '#8b5cf6',
        limits: { students: 150, teachers: 5, exams: 30 },
        features: ['150 students', '30 exams', '5 teachers', 'Full audit log', 'Advanced analytics'],
        popular: true,
    },
    {
        id: 'platinum',
        label: 'Platinum',
        monthlyPrice: 4999,
        annualPrice: 49990,
        icon: Crown,
        gradient: 'from-amber-400 to-orange-500',
        gradientBg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
        accentColor: '#f59e0b',
        limits: { students: 500, teachers: 15, exams: 80 },
        features: ['500 students', '80 exams', '15 teachers', 'Full audit log', 'Advanced analytics', 'Email support'],
    },
    {
        // Price is double Platinum's, per your instruction. Limits are also
        // doubled for consistency since you didn't specify them - plain
        // numbers, change freely. Parent dashboard is the headline feature;
        // see canAccessParentDashboard() below for the gating helper to use
        // once that route/component exists.
        id: 'diamond',
        label: 'Diamond',
        monthlyPrice: 9998,
        annualPrice: 99980,
        icon: Gem,
        gradient: 'from-cyan-400 to-indigo-600',
        gradientBg: 'from-cyan-50 to-indigo-50 dark:from-cyan-900/20 dark:to-indigo-900/20',
        accentColor: '#22d3ee',
        limits: { students: 1000, teachers: 20, exams: 150 },
        features: ['1000 students', '150 exams', '20 teachers', 'Parent dashboard', 'Full audit log', 'Advanced analytics', 'Email support'],
    }
];

export const TIER_ORDER = ['free', 'silver', 'gold', 'platinum', 'diamond'];

// ─── Tier-gated feature flags (decoupled from the display `features` list
// above on purpose - gating logic shouldn't depend on exact wording match) ──
export const TIER_FEATURE_FLAGS = {
    diamond: { parentDashboard: true },
};

export function hasFeature(tierId, flagKey) {
    return Boolean(TIER_FEATURE_FLAGS[tierId]?.[flagKey]);
}

// Once you build the actual parent-dashboard route/component, gate it with
// this - e.g. `if (!canAccessParentDashboard(school.tier)) return <Upsell />`
export function canAccessParentDashboard(tierId) {
    return hasFeature(tierId, 'parentDashboard');
}

// ─── Institution-level multipliers (mirrors backend/pricing_engine.py) ────
// secondary = +50% of primary, tertiary = +50% of secondary (i.e. 2.25x primary).
// If you actually meant a flat +50% of primary at every level instead
// (tertiary = 2.0x primary, not 2.25x), change TERTIARY here AND in
// pricing_engine.py's INSTITUTION_MULTIPLIERS.
export const INSTITUTION_TYPES = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    TERTIARY: 'tertiary', // university / college
};

export const INSTITUTION_MULTIPLIERS = {
    [INSTITUTION_TYPES.PRIMARY]: 1,
    [INSTITUTION_TYPES.SECONDARY]: 1.5,
    [INSTITUTION_TYPES.TERTIARY]: 2.25,
};

// Maps whatever free-text value you already store (e.g. from your
// teachingPhase resolver) to one of the 3 buckets above.
export function normalizeInstitutionType(raw) {
    if (!raw) return INSTITUTION_TYPES.PRIMARY;
    const v = raw.toString().toLowerCase();
    if (v.includes('university') || v.includes('college') || v.includes('tertiary') || v.includes('higher')) {
        return INSTITUTION_TYPES.TERTIARY;
    }
    if (v.includes('secondary') || v.includes('high')) {
        return INSTITUTION_TYPES.SECONDARY;
    }
    return INSTITUTION_TYPES.PRIMARY;
}

export function getInstitutionMultiplier(institutionType) {
    const normalized = normalizeInstitutionType(institutionType);
    return INSTITUTION_MULTIPLIERS[normalized] ?? 1;
}

// Calculates the BASE price (institution/region multipliers not applied)
// based on cycle using the unified structure. Kept for backward
// compatibility with any code that just wants the sticker price.
export function getTierPrice(tier, billingCycle) {
    if (!tier) return 0;
    return billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
}

// ESTIMATE ONLY - does not know the registrant's currency strength, only
// the institution multiplier (which is free to compute client-side since
// it isn't tied to FX data). Use this for instant UI feedback while a real
// quote loads; use fetchPriceQuote() from billingApi.js for anything that
// actually gets charged.
export function getEstimatedPrice(tier, billingCycle, institutionType) {
    return getTierPrice(tier, billingCycle) * getInstitutionMultiplier(institutionType);
}

// Logic helpers required by your components
export function isUpgrade(currentTierId, newTierId) {
    return TIER_ORDER.indexOf(newTierId) > TIER_ORDER.indexOf(currentTierId);
}

export function isAtLimit(tierId, limitKey, currentCount) {
    const limit = getTierConfig(tierId).limits[limitKey];
    return limit !== null && currentCount >= limit;
}

export function getUsagePercent(tierId, limitKey, currentCount) {
    const limit = getTierConfig(tierId).limits[limitKey];
    if (limit === null) return null;
    return Math.min(Math.round((currentCount / limit) * 100), 100);
}

export function isFeatureAllowed(tierId, featureKey) {
    const tier = getTierConfig(tierId);
    // If you add a "features" object to your tier definitions later, 
    // this will be the central gatekeeper
    return tier.features?.includes(featureKey) ?? false;
}

export function getStorageLimit(tierId) {
    const tier = getTierConfig(tierId);
    return tier.limits.storageGB || 1; // Default 1GB for free, check your definitions
}

export function getBandwidthLimit(tierId) {
    const tier = getTierConfig(tierId);
    return tier.limits.bandwidthGB || 1;
}

// Helper to get any tier by ID
export function getTierConfig(tierId) {
    return TIERS.find((t) => t.id === tierId) ?? TIERS[0];
}

export const getTier = getTierConfig;

export function useCurrentTier(schoolId) {
    const [tier, setTier] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!schoolId) return;

        const unsubscribe = onSnapshot(doc(db, 'schools', schoolId), (doc) => {
            setTier(doc.data()?.tier || 'free');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [schoolId]);

    return { tier, loading };
}