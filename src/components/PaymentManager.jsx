import React, { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './../utils/firebase';
import { TIERS, getTierPrice, getTierConfig } from './../utils/tierConfig'; // Updated Imports
import TierSelection from './TierSelection';
import {
    X, CreditCard, CheckCircle2, Loader2, Receipt,
    ArrowRight, Shield, RefreshCw
} from 'lucide-react';

const MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID;
const MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;
const PAYFAST_URL = "https://www.payfast.co.za/eng/process";

// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────

function PaymentForm({ tier, billingCycle, schoolId, schoolName, onSuccess, onCancel }) {
    const [step, setStep] = useState('confirm');
    const computedPrice = getTierPrice(tier, billingCycle);

    const handlePayfastPayment = async (e) => {
        e.preventDefault();
        setStep('paying');

        try {
            const transactionRef = `PAY-${Date.now()}`;

            // Save pending transaction
            await addDoc(collection(db, 'billing'), {
                schoolId,
                tierId: tier.id,
                billingCycle,
                amount: computedPrice,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            // PAYFAST FORM DATA
            const paymentData = {
                merchant_id: MERCHANT_ID,
                merchant_key: MERCHANT_KEY,
                return_url: `${window.location.origin}/payment-success`,
                m_payment_id: transactionRef,
                amount: computedPrice.toFixed(2),
                item_name: `${tier.label} Plan`,
                item_description: `${tier.label} Subscription (${billingCycle})`,
                custom_str1: schoolId,
                custom_str2: schoolName,
                custom_str3: currentTier,
                custom_str4: billingCycle,
            };

            const form = document.createElement("form");
            form.method = "POST";
            form.action = PAYFAST_URL;
            Object.entries(paymentData).forEach(([key, value]) => {
                const input = document.createElement("input");
                input.type = "hidden"; input.name = key; input.value = value;
                form.appendChild(input);
            });
            document.body.appendChild(form);
            form.submit();
        } catch (err) {
            console.error('[PayFast Error]', err);
            setStep('error');
        }
    };


    return (
        <form onSubmit={handlePayfastPayment} className="space-y-5">
            <div className="rounded-2xl p-4 flex items-center gap-4 bg-slate-50 dark:bg-slate-800 border border-slate-100">
                <div className="flex-1">
                    <p className="font-black text-slate-800">{tier.label} Plan</p>
                    <p className="text-xs text-slate-500 capitalize">{billingCycle} subscription</p>
                </div>
                <div className="text-right">
                    <p className="font-black text-2xl">R{computedPrice}</p>
                </div>
            </div>
            <button type="submit" className="w-full py-4 rounded-2xl font-black text-white bg-emerald-600">
                Pay R{computedPrice}
            </button>
        </form>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PaymentManager({ schoolId, schoolName, currentTier, onClose, onTierChange }) {
    const [view, setView] = useState('plans');
    const [selectedTier, setSelectedTier] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly');

    const currentConfig = getTierConfig(currentTier);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">

                {/* Header */}
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
                            {/* Billing Cycle Toggle */}
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
                            billingCycle={billingCycle}
                            schoolId={schoolId}
                            onCancel={() => setView('plans')}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}