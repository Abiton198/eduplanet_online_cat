// ─── tierConfig.js ────────────────────────────────────────────────────────────
// Single source of truth for tier definitions, limits, and feature flags.
// Imported by: PrincipalDashboard, PaymentManager, TierSelection, tierEnforcer.

export const TIERS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        period: null,
        tagline: 'Get started at no cost',
        limits: { students: 30, teachers: 3, exams: 10 },
        features: { auditLog: false, advancedAnalytics: false, customBranding: false, prioritySupport: false, multiSchool: false, aiMarking: true, basicAnalytics: true, pdfExport: true },
    },
    {
        id: 'starter',
        name: 'Starter',
        price: 499,
        period: 'month',
        tagline: 'Perfect for small schools',
        limits: { students: 150, teachers: 10, exams: 50 },
        features: { auditLog: true, advancedAnalytics: false, customBranding: false, prioritySupport: false, multiSchool: false, aiMarking: true, basicAnalytics: true, pdfExport: true },
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 1299,
        period: 'month',
        tagline: 'Full power for growing schools',
        popular: true,
        limits: { students: 500, teachers: 30, exams: null },
        features: { auditLog: true, advancedAnalytics: true, customBranding: true, prioritySupport: true, multiSchool: false, aiMarking: true, basicAnalytics: true, pdfExport: true },
    },
    {
        id: 'platinum',
        name: 'Platinum',
        price: 2499,
        period: 'month',
        tagline: 'Premium plan for ultimate flexibility',
        popular: true,
        limits: { students: 1000, teachers: 100, exams: null },
        features: { auditLog: true, advancedAnalytics: true, customBranding: true, prioritySupport: true, multiSchool: false, aiMarking: true, basicAnalytics: true, pdfExport: true },
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        period: null,
        tagline: 'Tailored for districts & groups',
        limits: { students: null, teachers: null, exams: null },
        features: { auditLog: true, advancedAnalytics: true, customBranding: true, prioritySupport: true, multiSchool: true, aiMarking: true, basicAnalytics: true, pdfExport: true },
    },
];

export const TIER_ORDER = ['free', 'starter', 'professional', 'platinum', 'enterprise'];

export function getTierConfig(tierId) {
    return TIERS.find((t) => t.id === tierId) ?? TIERS[0];
}

export const getTier = getTierConfig;

/**
 * Calculates dynamic tier price based on subscription cycle
 * Yearly cycles grant a 1-month discount (Price * 11)
 * * @param {object} tier 
 * @param {string} billingCycle 'monthly' | 'yearly'
 * @returns {number|null}
 */
export function getTierPrice(tier, billingCycle) {
    if (!tier || tier.price === null || tier.price === undefined) return null;
    if (tier.id === 'free') return 0;
    return billingCycle === 'yearly' ? tier.price * 11 : tier.price;
}

// ─── EXTRACTED UNCHANGED HELPER CODES FOR CONTEXT ─────────────────────────────
export function isUpgrade(currentTier, newTier) { return TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(currentTier); }
export function isFeatureAllowed(tierId, featureKey) { return getTierConfig(tierId).features[featureKey] === true; }
export function isAtLimit(tierId, limitKey, currentCount) { const l = getTierConfig(tierId).limits[limitKey]; return (l === null || l === undefined) ? false : currentCount >= l; }
export function getUsagePercent(tierId, limitKey, currentCount) { const l = getTierConfig(tierId).limits[limitKey]; return (l === null || l === undefined) ? null : Math.min(Math.round((currentCount / l) * 100), 100); }