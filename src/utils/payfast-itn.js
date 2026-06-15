// ─── payfast-itn.js ────────────────────────────────────────────────────────────
// PayFast Instant Transaction Notification (ITN) webhook handler.
// Deploy as a Cloud Function or Express route at:
//   POST /api/payfast/notify
//
// This is the server-side counterpart to PaymentManager.jsx.
// It verifies the payment and upgrades the school's tier in Firestore.
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

        // 4. Parse custom fields set in PaymentManager.jsx
        const schoolId = data.custom_str1;
        const toTier = data.custom_str2;
        const fromTier = data.custom_str3;
        const paymentId = data.m_payment_id;
        const pfPaymentId = data.pf_payment_id;


        if (!schoolId || !toTier) {
            console.error('[ITN] Missing custom fields');
            return res.status(400).send('Missing fields');
        }

        const db = admin.firestore();
        const batch = db.batch();

        // 5. Update school tier & Calculate next billing date
        // Since we are upgrading, we set the next payment date 30 days out (or 1 year for annual)
        const nextBilling = new Date();
        if (data.custom_str4 === 'annual') {
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

        // 6. Update principals collection
        batch.set(db.doc(`principals/${schoolId}`), {
            tier: toTier,
            nextBillingDate: admin.firestore.Timestamp.fromDate(nextBilling),
            tierUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // 7. Mark transaction as complete
        batch.set(db.doc(`paymentTransactions/${paymentId}`), {
            status: 'complete',
            pfPaymentId,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            toTier,
            fromTier,
            amount: parseFloat(data.amount_gross),
        }, { merge: true });

        await batch.commit();

        console.log(`[ITN] ✓ School ${schoolId} upgraded ${fromTier} → ${toTier}`);
        res.status(200).send('OK');

    } catch (err) {
        console.error('[ITN] Error:', err);
        res.status(500).send('Internal error');
    }
});

module.exports = router;

