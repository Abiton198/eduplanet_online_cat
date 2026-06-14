// ─── PaymentManager.jsx ───────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './../utils/firebase';
import { TIERS, getTierPrice, getTier, getTierConfig } from './../utils/tierConfig';
import TierSelection from './TierSelection';
import {
    X, CreditCard, Lock, CheckCircle2, Loader2, Receipt,
    ArrowRight, AlertTriangle, Shield, Zap, RefreshCw
} from 'lucide-react';


const MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID;
const MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;
const PAYFAST_URL = "https://www.payfast.co.za/eng/process";


// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────

function PaymentForm({ tier, billingCycle, schoolId, schoolName, onSuccess, onCancel }) {
    const [step, setStep] = useState('confirm');
    const [error, setError] = useState('');

    const isYearly = billingCycle === 'yearly';
    const computedPrice = getTierPrice(tier, billingCycle);

    const handlePayfastPayment = async (e) => {
        e.preventDefault();

        setStep('paying');
        setError('');

        try {
            const transactionRef = `PAY-${Date.now()}`;

            // Save pending transaction first
            await addDoc(collection(db, 'billing'), {
                schoolId,
                schoolName,
                tier: tier.id,
                tierName: tier.name,
                billingCycle,
                amount: computedPrice,
                currency: 'ZAR',
                transactionRef,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            // Update school billing state
            await updateDoc(doc(db, 'schools', schoolId), {
                pendingTier: tier.id,
                pendingBillingCycle: billingCycle,
                lastTransactionRef: transactionRef,
                paymentStatus: 'pending',
                tierUpdatedAt: serverTimestamp(),
            });

            // PAYFAST FORM DATA
            const paymentData = {
                merchant_id: MERCHANT_ID,
                merchant_key: MERCHANT_KEY,

                return_url: `${window.location.origin}/payment-success`,
                cancel_url: `${window.location.origin}/payment-cancel`,
                notify_url: `${window.location.origin}/api/payfast-notify`,

                name_first: schoolName || "School",
                email_address: "billing@school.edu.za",

                m_payment_id: transactionRef,

                amount: computedPrice.toFixed(2),

                item_name: `${tier.name} Plan`,
                item_description: `${tier.name} Subscription (${billingCycle}) for ${schoolName}`,
            };

            console.log("Submitting PayFast Payment:", paymentData);

            // CREATE FORM
            const form = document.createElement("form");
            form.method = "POST";
            form.action = PAYFAST_URL;
            form.target = "_self";

            Object.entries(paymentData).forEach(([key, value]) => {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

        } catch (err) {
            console.error('[PayFast Error]', err);

            setStep('error');

            setError(
                err?.message || 'Failed to initialize PayFast payment.'
            );
        }
    };

    if (tier.id === 'enterprise') {
        return (
            <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto text-3xl" style={{ backgroundColor: tier.color + '20' }}>👑</div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Enterprise Plan</h3>
                    <p className="text-slate-500 text-sm mt-1">Pricing is negotiated based on your needs.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm">Cancel</button>
                    <a href="mailto:sales@eduket.co.za" className="flex-1 py-3 rounded-2xl font-black text-white text-sm flex items-center justify-center bg-violet-600">Contact Sales <ArrowRight size={16} /></a>
                </div>
            </div>
        );
    }

    if (step === 'paying') return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 size={40} className="animate-spin text-violet-600" />
            <p className="font-black text-slate-700 dark:text-white">Opening Secure Payfast Window...</p>
        </div>
    );

    if (step === 'success') return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-100">
                <CheckCircle2 size={36} className="text-emerald-500" />
            </div>
            <p className="font-black text-lg text-slate-800 dark:text-white">Payment Successful!</p>
        </div>
    );

    return (
        <form onSubmit={handlePayfastPayment} className="space-y-5">
            <div className="rounded-2xl p-4 flex items-center gap-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <div className="flex-1">
                    <p className="font-black text-slate-800 dark:text-white">{tier.name} Plan</p>
                    <p className="text-xs text-slate-500 capitalize">{billingCycle} subscription</p>
                    {isYearly && <span className="inline-block mt-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">1 Month Free Applied</span>}
                </div>
                <div className="text-right">
                    <p className="font-black text-2xl text-slate-800 dark:text-white">R{computedPrice}</p>
                    <p className="text-xs text-slate-400">{isYearly ? '/year' : '/month'}</p>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl text-xs space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">🔒 Payfast Payment Engine</p>
                <p className="text-slate-500">Pay via Instant EFT, Debit/Credit Cards, QR Codes or SnapScan instantly.</p>
            </div>

            <div className="flex gap-3">
                <button type="button" onClick={onCancel} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-4 rounded-2xl font-black text-white text-sm bg-emerald-600 flex items-center justify-center gap-2">
                    Pay R{computedPrice} <Shield size={16} />
                </button>
            </div>
        </form>
    );
}

// ─── BILLING HISTORY ──────────────────────────────────────────────────────────

function BillingHistory({ schoolId }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!schoolId) return;
        getDocs(query(collection(db, 'billing'), where('schoolId', '==', schoolId), orderBy('paidAt', 'desc')))
            .then((snap) => {
                setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            }).catch(() => setLoading(false));
    }, [schoolId]);

    if (loading) return <div className="text-xs text-slate-400 py-4 text-center"><Loader2 size={16} className="animate-spin inline mr-2" />Loading...</div>;
    if (!records.length) return <p className="text-xs text-slate-400 py-4 text-center">No billing history yet.</p>;

    return (
        <div className="space-y-2">
            {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
                    <Receipt size={14} className="text-slate-400" />
                    <div className="flex-1">
                        <p className="font-bold text-slate-700 dark:text-slate-200">{r.tierName} Plan <span className="text-[10px] text-slate-400">({r.billingCycle || 'monthly'})</span></p>
                        <p className="text-slate-400 text-[10px]">{r.transactionRef}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-slate-800 dark:text-white">R{r.amount}</p>
                        <p className="text-slate-400">{r.paidAt?.toDate?.().toLocaleDateString('en-ZA') || '—'}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PaymentManager({ schoolId, schoolName, currentTier, onClose, onTierChange }) {
    const [view, setView] = useState('plans');
    const [selectedTier, setSelectedTier] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly');

    const handleSelectTier = (tierId) => {
        if (tierId === currentTier) return;
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
                        <h2 className="text-2xl font-black text-white">Subscription Billing Control</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setView(view === 'history' ? 'plans' : 'history')} className="text-white/70 hover:text-white text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10">
                            <Receipt size={14} /> {view === 'history' ? 'View Plans' : 'Billing History'}
                        </button>
                        <button onClick={onClose} className="text-white/70 hover:text-white"><X size={24} /></button>
                    </div>
                </div>

                <div className="p-8">
                    {view !== 'history' && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                Current Tier: {getTier(currentTier).name}
                            </div>

                            {/* Cycle Toggle Input Controls */}
                            {view === 'plans' && (
                                <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Yearly <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded">2 Month Free</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {view === 'plans' && (
                        <>
                            {/* Make sure TierSelection reads 'billingCycle' to calculate card prices */}
                            <TierSelection
                                selected={selectedTier || currentTier}
                                current={currentTier}
                                onSelect={handleSelectTier}
                                compact={false}
                                billingCycle={billingCycle}
                            />
                            <div className="mt-8 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-500">
                                <RefreshCw size={16} className="text-violet-500 flex-shrink-0" />
                                <div><strong>Flexible Architecture:</strong> Upgrades and downgrades process dynamically. Yearly options offer lower long-term pricing structures.</div>
                            </div>
                        </>
                    )}

                    {view === 'payment' && selectedTier && (
                        <div className="max-w-md mx-auto">
                            <button onClick={() => setView('plans')} className="mb-6 text-xs font-bold text-slate-400 flex items-center gap-1">← Back to plans</button>
                            <PaymentForm
                                tier={getTier(selectedTier)}
                                billingCycle={billingCycle}
                                schoolId={schoolId}
                                schoolName={schoolName}
                                onSuccess={handleSuccess}
                                onCancel={() => setView('plans')}
                            />
                        </div>
                    )}

                    {view === 'history' && <BillingHistory schoolId={schoolId} />}
                </div>
            </div>
        </div>
    );
}