// services/billingApi.js
//
// The backend (pricing_engine.py + billing_routes.py) is the source of
// truth for what a school actually gets charged - it derives the caller's
// schoolId from their verified Firebase auth token (never from anything
// this file sends), looks up their country/institution type itself,
// applies the region/institution multipliers, and returns the amount to
// send to PayFast. Every call here needs a valid ID token attached.
//
// ASSUMPTION: imports `auth` from '../utils/firebase' alongside the `db`
// export your other files already use - if your actual Firebase Auth
// instance is exported under a different name, adjust the one import line
// below.
//
// ASSUMPTION: API_BASE points at your Flask backend via VITE_API_BASE_URL -
// swap in your actual env var name if different.

import { auth } from '../utils/firebase';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function getAuthHeaders() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('You need to be signed in to view or change billing.');
    }
    const token = await user.getIdToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

async function handleResponse(res) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with status ${res.status}`);
    }
    const data = await res.json();
    // ↓ add this — Flask jsonify(None) returns HTTP 200 with body `null`
    if (data === null || data === undefined) {
        throw new Error('Empty response from billing service — please try again.');
    }
    return data;
}

// Shared display formatter - lets Intl handle currency-correct symbols and
// decimal places (R1,399 vs $226.64 vs ¥503,832 with no decimals) instead
// of hand-rolling it in every component that shows a price.
export function formatCurrency(amount, currencyCode) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currencyCode || 'ZAR',
            maximumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2,
        }).format(amount);
    } catch {
        // Intl throws on a currency code it doesn't recognize - fall back
        // to a plain number rather than crashing whatever's rendering it.
        return `${currencyCode} ${amount.toLocaleString()}`;
    }
}

// Quote for a single tier - used right before showing the payment step.
// `schoolId` is accepted for call-site compatibility but ignored - the
// backend derives it from your auth token instead.
export async function fetchPriceQuote({ tierId, billingCycle }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/billing/quote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tierId, billingCycle }),
    });
    return handleResponse(res);
}

// Quotes for ALL tiers at once, for the signed-in user's own school - used
// on the tier-selection screen so it doesn't need 5 separate round trips.
export async function fetchAllTierQuotes({ billingCycle }) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ billingCycle });
    const res = await fetch(`${API_BASE}/api/billing/quotes?${params}`, { headers });
    return handleResponse(res);
}

// Call this ONLY when the user clicks "Pay" - it creates the authoritative
// pending transaction record server-side (so the ITN handler has something
// real to verify against) and returns the exact fields to put in the
// hidden PayFast form. Don't construct that form data yourself anymore.
export async function initiatePayment({ tierId, billingCycle }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/billing/initiate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tierId, billingCycle }),
    });
    return handleResponse(res);
}