// ─── tierConfig.js ────────────────────────────────────────────────────────────
// Single source of truth for all subscription tiers.
// Import this everywhere — never hardcode limits or feature access inline.

export const TIERS = {
    free: {
        id: 'free',
        name: 'Starter',
        tagline: 'Get started at no cost',
        price: 0,
        priceLabel: 'Free forever',
        currency: 'ZAR',
        billingCycle: null,
        color: '#64748b',
        badge: '🆓',

        limits: {
            teachers: 3,
            students: 50,
            exams: 5, // renamed from examUploads
            storageGB: 0.5,
            aiMarksPerMonth: 20,
            subjectsPerTeacher: 2,
        },

        features: [
            '3 teacher accounts',
            '50 student accounts',
            '5 exam uploads / month',
            '500 MB storage',
            '20 AI auto-marks / month',
            'Basic result reports',
            'Manual marking support',
        ],

        unavailable: [
            'Advanced analytics',
            'Google Drive integration',
            'PDF export',
            'Audit log',
            'Priority support',
            'Custom branding',
        ],

        recommended: false,
        ctaLabel: 'Start Free',
    },

    basic: {
        id: 'basic',
        name: 'Basic',
        tagline: 'Perfect for small schools',
        price: 299,
        priceLabel: 'R299 / month',
        currency: 'ZAR',
        billingCycle: 'monthly',
        color: '#0ea5e9',
        badge: '⚡',

        limits: {
            teachers: 10,
            students: 200,
            exams: 30,
            storageGB: 5,
            aiMarksPerMonth: 200,
            subjectsPerTeacher: 10,
        },

        features: [
            '10 teacher accounts',
            '200 student accounts',
            '30 exam uploads / month',
            '5 GB storage',
            '200 AI auto-marks / month',
            'Full result reports',
            'Google Drive integration',
            'Basic analytics dashboard',
            'PDF export',
        ],

        unavailable: [
            'Advanced predictive analytics',
            'Priority support',
            'Custom branding',
            'Audit log',
        ],

        recommended: false,
        ctaLabel: 'Upgrade to Basic',
    },

    professional: {
        id: 'professional',
        name: 'Professional',
        tagline: 'The complete teaching OS',
        price: 799,
        priceLabel: 'R799 / month',
        currency: 'ZAR',
        billingCycle: 'monthly',
        color: '#8b5cf6',
        badge: '🚀',

        limits: {
            teachers: 40,
            students: 800,
            exams: 150,
            storageGB: 25,
            aiMarksPerMonth: 2000,
            subjectsPerTeacher: 999,
        },

        features: [
            '40 teacher accounts',
            '800 student accounts',
            '150 exam uploads / month',
            '25 GB storage',
            '2 000 AI auto-marks / month',
            'Advanced predictive analytics',
            'Full audit log',
            'Priority email support',
            'Custom school branding',
            'Google Drive integration',
            'PDF export & print',
            'Agentic study planner',
        ],

        unavailable: [
            'Dedicated account manager',
            'On-site training',
        ],

        recommended: true,
        ctaLabel: 'Go Professional',
    },

    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        tagline: 'For large schools & circuits',
        price: 1999,
        priceLabel: 'R1 999 / month',
        currency: 'ZAR',
        billingCycle: 'monthly',
        color: '#f59e0b',
        badge: '🏆',

        limits: {
            teachers: 9999,
            students: 9999,
            exams: 9999,
            storageGB: 200,
            aiMarksPerMonth: 9999,
            subjectsPerTeacher: 999,
        },

        features: [
            'Unlimited teacher accounts',
            'Unlimited student accounts',
            'Unlimited exam uploads',
            '200 GB storage',
            'Unlimited AI auto-marks',
            'All Professional features',
            'Dedicated account manager',
            'On-site training & onboarding',
            'SLA uptime guarantee',
            'Multi-campus support',
            'Circuit / district reporting',
            'API access',
        ],

        unavailable: [],

        recommended: false,
        ctaLabel: 'Contact Sales',
    },
};

// ─── ORDER ────────────────────────────────────────────────────────────────────

export const TIER_ORDER = [
    'free',
    'basic',
    'professional',
    'enterprise',
];

// ─── FEATURE ACCESS MATRIX ────────────────────────────────────────────────────

export const FEATURE_ACCESS = {
    auditLog: ['basic', 'professional', 'enterprise'],
    pdfExport: ['basic', 'professional', 'enterprise'],
    advancedAnalytics: ['professional', 'enterprise'],
    aiPredictions: ['professional', 'enterprise'],
    customBranding: ['professional', 'enterprise'],
    prioritySupport: ['professional', 'enterprise'],
    apiAccess: ['enterprise'],
    multiCampus: ['enterprise'],
    districtReporting: ['enterprise'],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Get full tier object */
export function getTier(tierId = 'free') {
    return TIERS[tierId] || TIERS.free;
}

/** Compare upgrade hierarchy */
export function isUpgrade(fromTier, toTier) {
    return TIER_ORDER.indexOf(toTier) > TIER_ORDER.indexOf(fromTier);
}

/** Check whether a feature is available */
export function isFeatureAllowed(tierId, featureKey) {
    const allowedTiers = FEATURE_ACCESS[featureKey];

    // if feature not registered, default allow
    if (!allowedTiers) return true;

    return allowedTiers.includes(tierId);
}

/** Generic limit checker */
export function checkLimit(tierId, limitKey, currentCount = 0) {
    const tier = getTier(tierId);

    const limit = tier?.limits?.[limitKey];

    // if limit undefined treat as unlimited
    if (limit == null) {
        return {
            allowed: true,
            unlimited: true,
            limit: null,
            current: currentCount,
            message: null,
        };
    }

    const unlimited = limit >= 9999;
    const allowed = unlimited || currentCount < limit;

    return {
        allowed,
        unlimited,
        limit,
        current: currentCount,
        remaining: unlimited ? Infinity : Math.max(limit - currentCount, 0),

        message: allowed
            ? null
            : `Your ${tier.name} plan allows only ${limit} ${limitKey}. Upgrade to continue.`,
    };
}

/** Returns true when usage reached limit */
export function isAtLimit(tierId, limitKey, currentCount = 0) {
    const result = checkLimit(tierId, limitKey, currentCount);

    if (result.unlimited) return false;

    return currentCount >= result.limit;
}

/** Returns percentage usage */
export function limitUsagePct(tierId, limitKey, currentCount = 0) {
    const tier = getTier(tierId);

    const limit = tier?.limits?.[limitKey];

    if (!limit || limit >= 9999) return 0;

    return Math.min(
        100,
        Math.round((currentCount / limit) * 100)
    );
}

/** Remaining units before hitting limit */
export function remainingLimit(tierId, limitKey, currentCount = 0) {
    const tier = getTier(tierId);

    const limit = tier?.limits?.[limitKey];

    if (!limit || limit >= 9999) return Infinity;

    return Math.max(limit - currentCount, 0);
}

/** Human-readable storage formatting */
export function formatStorage(gb) {
    if (gb < 1) {
        return `${Math.round(gb * 1024)} MB`;
    }

    return `${gb} GB`;
}

/** Get next upgrade tier */
export function getNextTier(currentTier) {
    const currentIndex = TIER_ORDER.indexOf(currentTier);

    if (currentIndex === -1) return null;

    return TIER_ORDER[currentIndex + 1] || null;
}

/** Get upgrade config */
export function getUpgradeTier(currentTier) {
    const nextTierId = getNextTier(currentTier);

    if (!nextTierId) return null;

    return getTier(nextTierId);
}

/** Get tier badge color */
export function getTierColor(tierId) {
    return getTier(tierId)?.color || '#64748b';
}

/** Get tier badge emoji */
export function getTierBadge(tierId) {
    return getTier(tierId)?.badge || '🆓';
}

/** Get tier display label */
export function getTierLabel(tierId) {
    return getTier(tierId)?.name || 'Starter';
}

/** Get all tiers as array */
export function getAllTiers() {
    return TIER_ORDER.map((id) => TIERS[id]);
}