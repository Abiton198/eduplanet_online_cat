import { Star, Zap, Sparkles, Crown } from 'lucide-react';
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "./firebase";
import { useState, useEffect } from "react";

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
        limits: { students: 30, teachers: 2, exams: 5 },
        features: ['30 students', '5 exams', '2 teachers', 'Basic AI marking', 'Email support'],
    },
    {
        id: 'silver',
        label: 'Silver',
        monthlyPrice: 799,
        annualPrice: 7990,
        icon: Zap,
        gradient: 'from-blue-500 to-cyan-500',
        gradientBg: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
        accentColor: '#3b82f6',
        limits: { students: 150, teachers: 10, exams: 30 },
        features: ['150 students', '30 exams', '10 teachers', 'Audit log', 'Advanced AI marking'],
    },
    {
        id: 'gold',
        label: 'Gold',
        monthlyPrice: 1399,
        annualPrice: 13990,
        icon: Sparkles,
        gradient: 'from-violet-500 to-purple-600',
        gradientBg: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
        accentColor: '#8b5cf6',
        limits: { students: 500, teachers: 30, exams: 120 },
        features: ['500 students', '120 exams', '30 teachers', 'Full audit log', 'Advanced analytics'],
        popular: true,
    },
    {
        id: 'platinum',
        label: 'Platinum',
        monthlyPrice: 2999,
        annualPrice: 29990,
        icon: Crown,
        gradient: 'from-amber-400 to-orange-500',
        gradientBg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
        accentColor: '#f59e0b',
        limits: { students: 1000, teachers: 100, exams: 500 },
        features: ['1000 students', '500 exams', '100 teachers', 'Full audit log', 'Advanced analytics'],
    }
];

export const TIER_ORDER = ['free', 'silver', 'gold', 'platinum'];


// Calculates price based on cycle using the new unified structure
export function getTierPrice(tier, billingCycle) {
    if (!tier) return 0;
    return billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
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
