// ─── payfast-itn.js ────────────────────────────────────────────────────────────
// PayFast Instant Transaction Notification (ITN) webhook handler.
// Deploy as a Cloud Function or Express route at:
//   POST /api/payfast/notify
//
// This is the server-side counterpart to PaymentManager.jsx / billing_routes.py.
// It verifies the payment and upgrades the school's tier in Firestore.
//
// WHAT CHANGED AND WHY:
//
// 1. BUG FOUND: your old PaymentManager.jsx put `schoolName` in custom_str2,
//    but this file reads custom_str2 as `toTier`. That mismatch meant a real
//    payment would have tried to set a school's `tier` field to its own NAME
//    string, not a valid tier id. The new /api/billing/initiate endpoint
//    (billing_routes.py) sends custom_str2 = tierId, which fixes this - but
//    more importantly, this file no longer trusts custom_str fields for the
//    upgrade decision at all (see #2).
//
// 2. AMOUNT/TIER VERIFICATION: previously this handler upgraded the tier
//    unconditionally once payment_status === 'COMPLETE', regardless of how
//    much was actually paid. Since the price now depends on region and
//    institution type (and can be tampered with client-side before hitting
//    PayFast), this handler now looks up the pending `paymentTransactions/
//    {paymentId}` record created by /api/billing/initiate and refuses to
//    upgrade unless the amount PayFast reports paid matches what we expected
//    for that school/tier/cycle. schoolId/tierId/billingCycle for the actual
//    upgrade now come from that verified record, not from custom_str fields.
//
// 3. IDEMPOTENCY: PayFast can resend the same ITN. If this transaction is
//    already marked 'complete', this now no-ops instead of re-running the
//    upgrade (which previously could push nextBillingDate forward twice).
//
// DEPLOY NOTE: any checkout session started under the OLD flow (before you
// deploy /api/billing/initiate) won't have a matching paymentTransactions
// record, and this version will refuse to upgrade it rather than fall back
// to trusting custom_str fields - a fallback there would just reopen the
// hole this closes. Avoid having checkouts in flight across the deploy.
//
// Required env vars (same as client):
//   PAYFAST_MERCHANT_ID
//   PAYFAST_MERCHANT_KEY
//   PAYFAST_PASSPHRASE   (if set in your PayFast account)
//
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const admin = require('firebase-admin');
const express = require('express');
const router = express.Router();

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';

// Tolerance scales with the amount instead of a flat number, since amounts
// now span currencies from JPY (no decimals) to KWD (3 decimals): 1% of the
// expected amount, with a small floor so tiny/free-tier amounts don't get a
// near-zero tolerance.
function amountTolerance(expectedAmount) {
    return Math.max(0.5, expectedAmount * 0.01);
}

// ── Build the signature string exactly as PayFast does ───────────────────────
function buildSignatureString(data) {
    return Object.keys(data)
        .filter((k) => k !== 'signature' && data[k] !== '' && data[k] != null)
        .sort()
        .map((k) => `${k}=${encodeURIComponent(String(data[k])).replace(/%20/g, '+')}`)
        .join('&');
}

// ── Verify PayFast signature ──────────────────────────────────────────────────
function verifySignature(data) {
    let paramString = buildSignatureString(data);
    if (PASSPHRASE) {
        paramString += `&passphrase=${encodeURIComponent(PASSPHRASE).replace(/%20/g, '+')}`;
    }
    const computed = crypto.createHash('md5').update(paramString).digest('hex');
    return computed === data.signature;
}

// ── ITN endpoint ──────────────────────────────────────────────────────────────
router.post('/api/payfast/notify', express.urlencoded({ extended: false }), async (req, res) => {
    try {
        const data = req.body;

        // 1. Verify signature
        if (!verifySignature(data)) {
            console.error('[ITN] Signature mismatch', data);
            return res.status(400).send('Bad signature');
        }

        // 2. Verify merchant ID
        if (data.merchant_id !== MERCHANT_ID) {
            console.error('[ITN] Wrong merchant ID');
            return res.status(400).send('Unknown merchant');
        }

        // 3. Verify payment status
        if (data.payment_status !== 'COMPLETE') {
            console.warn('[ITN] Non-complete status:', data.payment_status);
            // Still 200 so PayFast stops retrying; just don't upgrade
            return res.status(200).send('OK');
        }

        const paymentId = data.m_payment_id;
        const pfPaymentId = data.pf_payment_id;

        if (!paymentId) {
            console.error('[ITN] Missing m_payment_id');
            return res.status(400).send('Missing fields');
        }

        const db = admin.firestore();

        // 4. Look up the pending transaction /api/billing/initiate created.
        //    This - not custom_str1/2/3/4 - is now the source of truth for
        //    who gets upgraded to what.
        const txnRef = db.doc(`paymentTransactions/${paymentId}`);
        const txnSnap = await txnRef.get();

        if (!txnSnap.exists) {
            console.error(`[ITN] No pending transaction found for ${paymentId} - refusing to upgrade. ` +
                `(Expected if this checkout started before /api/billing/initiate was deployed.)`);
            return res.status(200).send('OK');
        }

        const txn = txnSnap.data();

        // 5. Idempotency - PayFast can resend the same ITN.
        if (txn.status === 'complete') {
            console.log(`[ITN] ${paymentId} already processed - no-op`);
            return res.status(200).send('OK');
        }

        const { schoolId, tierId: toTier, fromTier, billingCycle, expectedAmount, expectedCurrency } = txn;

        if (!schoolId || !toTier) {
            console.error('[ITN] Pending transaction missing schoolId/tierId', txn);
            return res.status(400).send('Malformed transaction record');
        }

        // Sanity cross-check against PayFast's own custom fields - logged
        // only, the stored record (not these) drives the actual upgrade.
        if (data.custom_str1 && data.custom_str1 !== schoolId) {
            console.warn(`[ITN] custom_str1 (${data.custom_str1}) != stored schoolId (${schoolId}) for ${paymentId}`);
        }

        // 6. Verify the amount actually paid matches what we quoted.
        const paidAmount = parseFloat(data.amount_gross);
        const tolerance = amountTolerance(expectedAmount);
        const amountOk = Number.isFinite(paidAmount) && Math.abs(paidAmount - expectedAmount) <= tolerance;

        if (!amountOk) {
            console.error(
                `[ITN] Amount mismatch for ${paymentId} (school=${schoolId} tier=${toTier}): ` +
                `paid=${paidAmount} expected=${expectedAmount} ${expectedCurrency}`
            );
            await txnRef.set({
                status: 'amount_mismatch',
                paidAmount,
                pfPaymentId,
                flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            // Don't touch schools/principals - no upgrade on a mismatch.
            return res.status(200).send('OK');
        }

        const batch = db.batch();

        // 7. Update school tier & calculate next billing date.
        const nextBilling = new Date();
        if (billingCycle === 'annual') {
            nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        } else {
            nextBilling.setMonth(nextBilling.getMonth() + 1);
        }

        batch.set(db.doc(`schools/${schoolId}`), {
            tier: toTier,
            nextBillingDate: admin.firestore.Timestamp.fromDate(nextBilling),
            tierUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            pfPaymentId,
        }, { merge: true });

        // 8. Update principals collection
        batch.set(db.doc(`principals/${schoolId}`), {
            tier: toTier,
            nextBillingDate: admin.firestore.Timestamp.fromDate(nextBilling),
            tierUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // 9. Mark transaction as complete (expectedAmount/expectedCurrency
        //    are left untouched so the comparison above stays auditable).
        batch.set(txnRef, {
            status: 'complete',
            pfPaymentId,
            paidAmount,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            toTier,
            fromTier,
        }, { merge: true });

        // Keep the 'billing' collection record in sync too (read by
        // SubscriptionManager), matched on transactionRef.
        const billingQuery = await db.collection('billing')
            .where('transactionRef', '==', paymentId)
            .limit(1)
            .get();
        if (!billingQuery.empty) {
            batch.set(billingQuery.docs[0].ref, {
                status: 'complete',
                pfPaymentId,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        await batch.commit();

        console.log(`[ITN] ✓ School ${schoolId} upgraded ${fromTier} → ${toTier}`);
        res.status(200).send('OK');

    } catch (err) {
        console.error('[ITN] Error:', err);
        res.status(500).send('Internal error');
    }
});

module.exports = router;