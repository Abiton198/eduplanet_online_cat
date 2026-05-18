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

        // 5. Update school tier
        batch.set(db.doc(`schools/${schoolId}`), {
            tier: toTier,
            tierUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            pfPaymentId,
        }, { merge: true });

        // 6. Update principals collection
        batch.set(db.doc(`principals/${schoolId}`), {
            tier: toTier,
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


// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT RETURN PAGES
// Create these two routes in your React Router setup:
//
//   /payment/success?tier=starter&school=<uid>
//   /payment/cancel
//
// Example minimal components:
// ─────────────────────────────────────────────────────────────────────────────

/*
// src/pages/PaymentSuccess.jsx
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccess() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const tier = params.get('tier');

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white rounded-3xl p-12 shadow-xl text-center max-w-md">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h1 className="text-2xl font-black text-slate-800 mb-2">Payment Successful!</h1>
                <p className="text-slate-500 mb-6">
                    Your school has been upgraded to the <strong className="capitalize">{tier}</strong> plan.
                </p>
                <button
                    onClick={() => navigate('/principal-dashboard')}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-500 transition-colors"
                >
                    Go to Dashboard →
                </button>
            </div>
        </div>
    );
}

// src/pages/PaymentCancel.jsx
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function PaymentCancel() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white rounded-3xl p-12 shadow-xl text-center max-w-md">
                <XCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h1 className="text-2xl font-black text-slate-800 mb-2">Payment Cancelled</h1>
                <p className="text-slate-500 mb-6">No charge was made. You can try again any time from your dashboard.</p>
                <button
                    onClick={() => navigate('/principal-dashboard')}
                    className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black hover:bg-slate-700 transition-colors"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}
*/


// ─────────────────────────────────────────────────────────────────────────────
// .env variables needed
// ─────────────────────────────────────────────────────────────────────────────
/*
# Client-side (REACT_APP_ prefix required for CRA / Vite prefix for Vite)
REACT_APP_PAYFAST_MERCHANT_ID=your_merchant_id
REACT_APP_PAYFAST_MERCHANT_KEY=your_merchant_key
REACT_APP_PAYFAST_PASSPHRASE=your_passphrase_if_set
REACT_APP_PAYFAST_LIVE=false         # true for production
REACT_APP_BASE_URL=https://app.yourschool.co.za

# Server-side (cloud function / Express)
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase_if_set
*/