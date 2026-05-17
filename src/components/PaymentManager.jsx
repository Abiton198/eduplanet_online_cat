// ─── PaymentManager.jsx ───────────────────────────────────────────────────────
// Handles tier upgrades, payment capture, and billing history.
// Called from PrincipalDashboard sidebar "Upgrade" button.
//
// Payment integration: Payfast (SA) is shown as the provider.
// Swap the handlePayment function for your actual payment gateway.
// On success, writes new tier to /schools/{schoolId}.

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './../utils/firebase';
import { TIERS, TIER_ORDER, getTier, isUpgrade } from './../utils/tierConfig';
import TierSelection from './TierSelection';
import {
    X, CreditCard, Lock, CheckCircle2, Loader2, Receipt,
    ArrowRight, AlertTriangle, Shield, Zap,
} from 'lucide-react';

// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────

function PaymentForm({ tier, schoolId, schoolName, onSuccess, onCancel }) {
    const [step, setStep] = useState('confirm'); // confirm | paying | success | error
    const [cardName, setCardName] = useState('');
    const [cardNum, setCardNum] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [error, setError] = useState('');

    // Format card number with spaces
    const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    const formatExpiry = (v) => {
        const d = v.replace(/\D/g, '').slice(0, 4);
        return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!cardName || cardNum.replace(/\s/g, '').length < 16 || expiry.length < 5 || cvv.length < 3) {
            setError('Please complete all card details.');
            return;
        }

        setStep('paying');
        setError('');

        try {
            // ── PAYMENT GATEWAY INTEGRATION POINT ────────────────────────────────
            // Replace this block with your real gateway (Payfast, Peach Payments, etc.)
            // The gateway should return a transaction reference on success.
            //
            // Example Payfast flow:
            //   const { transactionRef } = await payfastCharge({ amount: tier.price, ... });
            //
            // For now we simulate a 2-second processing delay:
            await new Promise((res) => setTimeout(res, 2000));
            const transactionRef = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
            // ── END GATEWAY BLOCK ─────────────────────────────────────────────────

            // 1. Update school tier in Firestore
            await updateDoc(doc(db, 'schools', schoolId), {
                tier: tier.id,
                tierUpdatedAt: serverTimestamp(),
                lastTransactionRef: transactionRef,
            });

            // 2. Write billing record
            await addDoc(collection(db, 'billing'), {
                schoolId,
                schoolName,
                tier: tier.id,
                tierName: tier.name,
                amount: tier.price,
                currency: 'ZAR',
                transactionRef,
                status: 'paid',
                paidAt: serverTimestamp(),
            });

            setStep('success');
            setTimeout(() => onSuccess(tier.id), 2000);
        } catch (err) {
            console.error('[Payment] Error:', err);
            setStep('error');
            setError('Payment failed. Please try again or contact support.');
        }
    };

    if (tier.id === 'enterprise') {
        return (
            <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-3xl" style={{ backgroundColor: tier.color + '20' }}>
                    👑
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Enterprise Plan</h3>
                    <p className="text-slate-500 text-sm mt-1">Tailored for large schools and circuits. Pricing is negotiated based on your needs.</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 text-left space-y-2">
                    {['Unlimited accounts', 'Custom SLA', 'Dedicated account manager', 'On-site training', 'Multi-campus & circuit reporting'].map((f) => (
                        <div key={f} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 size={14} className="text-amber-500 flex-shrink-0" />
                            <span className="text-slate-700 dark:text-slate-200">{f}</span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm">
                        Cancel
                    </button>
                    <a
                        href="mailto:sales@eduket.co.za?subject=Enterprise%20Plan%20Enquiry"
                        className="flex-1 py-3 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2"
                        style={{ backgroundColor: tier.color }}
                    >
                        Contact Sales <ArrowRight size={16} />
                    </a>
                </div>
            </div>
        );
    }

    if (step === 'paying') return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 size={40} className="animate-spin" style={{ color: tier.color }} />
            <p className="font-black text-slate-700 dark:text-white">Processing payment...</p>
            <p className="text-xs text-slate-400">Do not close this window</p>
        </div>
    );

    if (step === 'success') return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-100">
                <CheckCircle2 size={36} className="text-emerald-500" />
            </div>
            <p className="font-black text-lg text-slate-800 dark:text-white">Payment Successful!</p>
            <p className="text-sm text-slate-500">Upgrading your plan to <strong>{tier.name}</strong>...</p>
        </div>
    );

    if (step === 'error') return (
        <div className="space-y-4">
            <div className="flex flex-col items-center py-6 gap-3">
                <AlertTriangle size={36} className="text-red-500" />
                <p className="font-black text-slate-800 dark:text-white">Payment Failed</p>
                <p className="text-xs text-slate-500 text-center">{error}</p>
            </div>
            <button onClick={() => setStep('confirm')} className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold text-sm">
                Try Again
            </button>
        </div>
    );

    // ── Confirm step ──────────────────────────────────────────────────────────
    return (
        <form onSubmit={handlePayment} className="space-y-5">
            {/* Order summary */}
            <div
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{ background: `linear-gradient(135deg, ${tier.color}15, ${tier.color}08)`, border: `1px solid ${tier.color}30` }}
            >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: tier.color + '20' }}>
                    {tier.badge}
                </div>
                <div className="flex-1">
                    <p className="font-black text-slate-800 dark:text-white">{tier.name} Plan</p>
                    <p className="text-xs text-slate-500">{tier.billingCycle === 'monthly' ? 'Monthly subscription' : 'Annual subscription'}</p>
                </div>
                <div className="text-right">
                    <p className="font-black text-2xl text-slate-800 dark:text-white">R{tier.price}</p>
                    <p className="text-xs text-slate-400">/month</p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:border-red-800">
                    {error}
                </div>
            )}

            {/* Card details */}
            <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={12} /> Card Details
                </p>
                <input
                    type="text" value={cardName} required
                    placeholder="Cardholder Name"
                    className="pay-input"
                    onChange={(e) => setCardName(e.target.value)}
                />
                <input
                    type="text" value={cardNum} required
                    placeholder="1234 5678 9012 3456"
                    inputMode="numeric"
                    className="pay-input"
                    onChange={(e) => setCardNum(formatCard(e.target.value))}
                />
                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="text" value={expiry} required
                        placeholder="MM/YY"
                        inputMode="numeric"
                        className="pay-input"
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    />
                    <input
                        type="text" value={cvv} required
                        placeholder="CVV"
                        inputMode="numeric"
                        maxLength={4}
                        className="pay-input"
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                </div>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <Lock size={12} className="flex-shrink-0 text-emerald-500" />
                <span>256-bit SSL encrypted. Your card details are never stored on our servers.</span>
            </div>

            <div className="flex gap-3">
                <button type="button" onClick={onCancel}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    Cancel
                </button>
                <button type="submit"
                    className="flex-1 py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ backgroundColor: tier.color }}>
                    Pay R{tier.price} <Shield size={16} />
                </button>
            </div>

            <style>{`
        .pay-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          color: #0f172a;
        }
        .dark .pay-input {
          background: #1e293b;
          border-color: #334155;
          color: white;
        }
        .pay-input:focus { border-color: ${tier.color}; }
      `}</style>
        </form>
    );
}

// ─── BILLING HISTORY ──────────────────────────────────────────────────────────

function BillingHistory({ schoolId }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!schoolId) return;
        getDocs(
            query(collection(db, 'billing'), where('schoolId', '==', schoolId), orderBy('paidAt', 'desc'))
        ).then((snap) => {
            setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [schoolId]);

    if (loading) return <div className="text-xs text-slate-400 py-4 text-center"><Loader2 size={16} className="animate-spin inline mr-2" />Loading history...</div>;
    if (!records.length) return <p className="text-xs text-slate-400 py-4 text-center">No billing history yet.</p>;

    return (
        <div className="space-y-2">
            {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
                    <Receipt size={14} className="text-slate-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold text-slate-700 dark:text-slate-200">{r.tierName} Plan</p>
                        <p className="text-slate-400">{r.transactionRef}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-slate-800 dark:text-white">R{r.amount}</p>
                        <p className="text-slate-400">{r.paidAt?.toDate?.().toLocaleDateString('en-ZA') || '—'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 font-black text-[10px]">PAID</span>
                </div>
            ))}
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PaymentManager({ schoolId, schoolName, currentTier, onClose, onTierChange }) {
    const [view, setView] = useState('plans');    // plans | payment | history
    const [selectedTier, setSelectedTier] = useState(null);

    const handleSelectTier = (tierId) => {
        if (tierId === currentTier) return;
        if (!isUpgrade(currentTier, tierId)) return; // no downgrades
        setSelectedTier(tierId);
        setView('payment');
    };

    const handleSuccess = (newTierId) => {
        onTierChange(newTierId);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600">
                    <div>
                        <p className="text-white/60 text-xs font-black uppercase tracking-widest">Eduket OS</p>
                        <h2 className="text-2xl font-black text-white">
                            {view === 'history' ? 'Billing History' : view === 'payment' ? 'Complete Upgrade' : 'Choose Your Plan'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setView(view === 'history' ? 'plans' : 'history')}
                            className="text-white/70 hover:text-white text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                        >
                            <Receipt size={14} />
                            {view === 'history' ? 'View Plans' : 'Billing History'}
                        </button>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-8">

                    {/* Current plan chip */}
                    {view !== 'history' && (
                        <div className="flex items-center gap-3 mb-6">
                            <div
                                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black"
                                style={{
                                    backgroundColor: getTier(currentTier).color + '15',
                                    color: getTier(currentTier).color,
                                    border: `1.5px solid ${getTier(currentTier).color}40`,
                                }}
                            >
                                <span>{getTier(currentTier).badge}</span>
                                Current: {getTier(currentTier).name}
                            </div>
                            {currentTier !== 'free' && (
                                <p className="text-xs text-slate-400">You can only upgrade, not downgrade.</p>
                            )}
                            {currentTier === 'enterprise' && (
                                <p className="text-xs text-emerald-500 font-bold">✓ You're on the highest plan.</p>
                            )}
                        </div>
                    )}

                    {/* Plan selection */}
                    {view === 'plans' && (
                        <>
                            <TierSelection
                                selected={selectedTier || currentTier}
                                current={currentTier}
                                onSelect={handleSelectTier}
                                compact={false}
                            />

                            {/* Feature comparison note */}
                            <div className="mt-8 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-start gap-3">
                                <Zap size={16} className="text-violet-500 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    <strong className="text-slate-700 dark:text-slate-200">All upgrades are instant.</strong>{' '}
                                    Your new limits apply immediately after payment. Billing is monthly and can be managed from this screen. Downgrades are not supported — contact support if you need to adjust your plan.
                                </div>
                            </div>
                        </>
                    )}

                    {/* Payment form */}
                    {view === 'payment' && selectedTier && (
                        <div className="max-w-md mx-auto">
                            <button
                                onClick={() => setView('plans')}
                                className="mb-6 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                            >
                                ← Back to plans
                            </button>
                            <PaymentForm
                                tier={getTier(selectedTier)}
                                schoolId={schoolId}
                                schoolName={schoolName}
                                onSuccess={handleSuccess}
                                onCancel={() => setView('plans')}
                            />
                        </div>
                    )}

                    {/* Billing history */}
                    {view === 'history' && (
                        <BillingHistory schoolId={schoolId} />
                    )}
                </div>
            </div>
        </div>
    );
}