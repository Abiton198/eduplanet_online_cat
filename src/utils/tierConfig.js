// ─── tierConfig.js ────────────────────────────────────────────────────────────
// Single source of truth for tier definitions, limits, and feature flags.
// Imported by: PrincipalDashboard, PaymentManager, TierSelection, tierEnforcer.
//
// Exports:
//   TIERS            — array of tier definition objects
//   getTierConfig    — (tierId) → tier object | null
//   isFeatureAllowed — (tierId, featureKey) → boolean
//   isAtLimit        — (tierId, limitKey, currentCount) → boolean
//   getUsagePercent  — (tierId, limitKey, currentCount) → 0–100 | null
// ─────────────────────────────────────────────────────────────────────────────

// ─── TIER DEFINITIONS ────────────────────────────────────────────────────────
// limits:   null = unlimited
// features: boolean flags checked by isFeatureAllowed()

export const TIERS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        period: null,
        tagline: 'Get started at no cost',
        limits: {
            students: 30,
            teachers: 3,
            exams: 10,
        },
        features: {
            auditLog: false,
            advancedAnalytics: false,
            customBranding: false,
            prioritySupport: false,
            multiSchool: false,
            aiMarking: true,
            basicAnalytics: true,
            pdfExport: true,
        },
    },
    {
        id: 'starter',
        name: 'Starter',
        price: 499,
        period: 'month',
        tagline: 'Perfect for small schools',
        limits: {
            students: 150,
            teachers: 10,
            exams: 50,
        },
        features: {
            auditLog: true,
            advancedAnalytics: false,
            customBranding: false,
            prioritySupport: false,
            multiSchool: false,
            aiMarking: true,
            basicAnalytics: true,
            pdfExport: true,
        },
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 1299,
        period: 'month',
        tagline: 'Full power for growing schools',
        popular: true,
        limits: {
            students: 500,
            teachers: 30,
            exams: null,       // unlimited
        },
        features: {
            auditLog: true,
            advancedAnalytics: true,
            customBranding: true,
            prioritySupport: true,
            multiSchool: false,
            aiMarking: true,
            basicAnalytics: true,
            pdfExport: true,
        },
    },
    {
        id: 'platinum',
        name: 'Platinum',
        price: 2499,
        period: 'month',
        tagline: 'Premium plan for ultimate flexibility',
        popular: true,
        limits: {
            students: 1000,
            teachers: 100,
            exams: null,       // unlimited
        },
        features: {
            auditLog: true,
            advancedAnalytics: true,
            customBranding: true,
            prioritySupport: true,
            multiSchool: false,
            aiMarking: true,
            basicAnalytics: true,
            pdfExport: true,
        },
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,           // custom / contact sales
        period: null,
        tagline: 'Tailored for districts & groups',
        limits: {
            students: null,    // unlimited
            teachers: null,
            exams: null,
        },
        features: {
            auditLog: true,
            advancedAnalytics: true,
            customBranding: true,
            prioritySupport: true,
            multiSchool: true,
            aiMarking: true,
            basicAnalytics: true,
            pdfExport: true,
        },
    },
];

// ─── TIER ORDER ───────────────────────────────────────────────────────────────
// Ordered from lowest to highest — use for upgrade/downgrade comparisons.
export const TIER_ORDER = ['free', 'starter', 'professional', 'platinum', 'enterprise'];

// ─── LOOKUP ───────────────────────────────────────────────────────────────────

/**
 * Returns the full tier config object for a given tier id.
 * Falls back to 'free' if the id is unrecognised.
 *
 * @param {string} tierId  e.g. 'free' | 'starter' | 'professional' | 'enterprise'
 * @returns {object}
 */
export function getTierConfig(tierId) {
    return TIERS.find((t) => t.id === tierId) ?? TIERS[0];
}

/** Alias for getTierConfig — use either name interchangeably. */
export const getTier = getTierConfig;

/**
 * Returns true if newTier is a higher plan than currentTier.
 * @param {string} currentTier
 * @param {string} newTier
 * @returns {boolean}
 *
 * @example
 * isUpgrade('free', 'starter')       // true
 * isUpgrade('professional', 'free')  // false
 */
export function isUpgrade(currentTier, newTier) {
    return TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(currentTier);
}

// ─── FEATURE GATE ─────────────────────────────────────────────────────────────

/**
 * Returns true if the given feature is enabled on this tier.
 *
 * @param {string} tierId       e.g. 'starter'
 * @param {string} featureKey   e.g. 'auditLog' | 'advancedAnalytics' | 'customBranding'
 * @returns {boolean}
 *
 * @example
 * isFeatureAllowed('free', 'auditLog')        // false
 * isFeatureAllowed('starter', 'auditLog')     // true
 * isFeatureAllowed('professional', 'multiSchool') // false
 */
export function isFeatureAllowed(tierId, featureKey) {
    const tier = getTierConfig(tierId);
    return tier.features[featureKey] === true;
}

// ─── LIMIT CHECK ──────────────────────────────────────────────────────────────

/**
 * Returns true if the school has hit (or exceeded) the limit for a resource.
 * Always returns false when the limit is null (unlimited).
 *
 * @param {string} tierId       e.g. 'free'
 * @param {string} limitKey     e.g. 'students' | 'teachers' | 'exams'
 * @param {number} currentCount actual count from Firestore
 * @returns {boolean}
 *
 * @example
 * isAtLimit('free', 'students', 30)  // true  (free cap = 30)
 * isAtLimit('free', 'students', 29)  // false
 * isAtLimit('professional', 'exams', 999) // false (unlimited)
 */
export function isAtLimit(tierId, limitKey, currentCount) {
    const tier = getTierConfig(tierId);
    const limit = tier.limits[limitKey];
    if (limit === null || limit === undefined) return false;
    return currentCount >= limit;
}

// ─── USAGE PERCENT ────────────────────────────────────────────────────────────

/**
 * Returns how full a resource slot is as a 0–100 percentage.
 * Returns null when the limit is null (unlimited) — callers should hide the meter.
 *
 * @param {string} tierId
 * @param {string} limitKey
 * @param {number} currentCount
 * @returns {number|null}
 *
 * @example
 * getUsagePercent('free', 'students', 15)   // 50
 * getUsagePercent('free', 'students', 30)   // 100
 * getUsagePercent('professional', 'exams', 999) // null
 */
export function getUsagePercent(tierId, limitKey, currentCount) {
    const tier = getTierConfig(tierId);
    const limit = tier.limits[limitKey];
    if (limit === null || limit === undefined) return null;
    return Math.min(Math.round((currentCount / limit) * 100), 100);
}