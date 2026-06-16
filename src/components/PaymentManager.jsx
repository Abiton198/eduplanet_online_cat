import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './../utils/firebase';
import { getTierPrice, getTierConfig } from './../utils/tierConfig';
import TierSelection from './TierSelection';
import { X } from 'lucide-react';

const MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID;
const MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;
const PAYFAST_URL = "https://www.payfast.co.za/eng/process";

// ─── PAYMENT FORM COMPONENT ──────────────────────────────────────────────────

// PaymentManager.jsx — PaymentForm component

function PaymentForm({ tier, billingCycle, schoolId, schoolName, currentTier, onCancel }) {
    const [step, setStep] = useState('confirm');
    const computedPrice = getTierPrice(tier, billingCycle);

    const paymentData = {
        merchant_id: MERCHANT_ID,
        merchant_key: MERCHANT_KEY,
        return_url: `${window.location.origin}/payment-success`,
        m_payment_id: `PAY-${Date.now()}`,
        amount: computedPrice.toFixed(2),
        item_name: `${tier.label} Plan`,
        item_description: `${tier.label} Subscription (${billingCycle})`,
        custom_str1: schoolId,
        custom_str2: schoolName,
        custom_str3: currentTier,
        custom_str4: billingCycle,
    };

    const handlePayfastPayment = async (e) => {
        e.preventDefault();
        setStep('paying');

        try {
            await addDoc(collection(db, 'billing'), {
                schoolId,
                tierId: tier.id,
                billingCycle,
                amount: computedPrice,
                status: 'pending',
                transactionRef: paymentData.m_payment_id,
                createdAt: serverTimestamp(),
            });

            // Build form in raw DOM — completely outside React's tree
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = PAYFAST_URL;

            Object.entries(paymentData).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();                    // native submit, no React involvement
            // no need to remove — page navigates away

        } catch (err) {
            console.error('[PayFast Error]', err);
            setStep('error');
        }
    };

    return (
        <div className="space-y-5">
            {/* NO <form> tag here at all */}

            <div className="rounded-2xl p-4 flex items-center gap-4 bg-slate-50 dark:bg-slate-800 border border-slate-100">
                <div className="flex-1">
                    <p className="font-black text-slate-800 dark:text-white">{tier.label} Plan</p>
                    <p className="text-xs text-slate-500 capitalize">{billingCycle} subscription</p>
                </div>
                <div className="text-right">
                    <p className="font-black text-2xl text-slate-800 dark:text-white">R{computedPrice}</p>
                </div>
            </div>

            {step === 'error' && (
                <p className="text-xs text-red-500 text-center font-bold">
                    Something went wrong. Please try again.
                </p>
            )}

            <button
                onClick={handlePayfastPayment}
                disabled={step === 'paying'}
                className="w-full py-4 rounded-2xl font-black text-white bg-emerald-600 transition-opacity hover:opacity-90 disabled:opacity-60"
            >
                {step === 'paying' ? 'Redirecting to PayFast...' : `Pay R${computedPrice}`}
            </button>
            <button onClick={onCancel} className="w-full text-xs text-slate-400 hover:text-slate-600">
                Cancel
            </button>
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PaymentManager({ schoolId, schoolName, currentTier, onClose, initialTier = null }) {
    const [view, setView] = useState(initialTier ? 'payment' : 'plans');
    const [selectedTier, setSelectedTier] = useState(initialTier?.id || null);
    const [billingCycle, setBillingCycle] = useState('monthly');

    const currentConfig = getTierConfig(currentTier);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 bg-gradient-to-r from-violet-600 to-indigo-600 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-white">Subscription Billing</h2>
                    <button onClick={onClose} className="text-white"><X /></button>
                </div>

                <div className="p-8">
                    {view === 'plans' && (
                        <div className="mb-8 flex justify-between items-center">
                            <div className="text-sm font-black px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                Current Tier: {currentConfig.label}
                            </div>
                            <div className="p-1 bg-slate-100 rounded-2xl flex">
                                <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 text-xs font-black rounded-xl ${billingCycle === 'monthly' ? 'bg-white shadow' : ''}`}>Monthly</button>
                                <button onClick={() => setBillingCycle('annual')} className={`px-4 py-2 text-xs font-black rounded-xl ${billingCycle === 'annual' ? 'bg-white shadow' : ''}`}>Yearly</button>
                            </div>
                        </div>
                    )}

                    {view === 'plans' && (
                        <TierSelection
                            selected={selectedTier || currentTier}
                            current={currentTier}
                            onSelect={(id) => { setSelectedTier(id); setView('payment'); }}
                            billingCycle={billingCycle}
                        />
                    )}

                    {view === 'payment' && selectedTier && (
                        <PaymentForm
                            tier={getTierConfig(selectedTier)}
                            currentTier={currentTier}
                            billingCycle={billingCycle}
                            schoolId={schoolId}
                            schoolName={schoolName}
                            onCancel={() => setView('plans')}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}