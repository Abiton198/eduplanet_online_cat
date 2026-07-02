import React, { useState, useEffect } from 'react';
import { getTierConfig } from './../utils/tierConfig';
import { fetchPriceQuote, initiatePayment, formatCurrency } from './../services/billingApi';
import TierSelection from './TierSelection';
import { X, Loader2, AlertTriangle } from 'lucide-react';

const PAYFAST_URL = "https://www.payfast.co.za/eng/process";

// ─── PAYMENT FORM COMPONENT ──────────────────────────────────────────────────

// PaymentManager.jsx — PaymentForm component
//
// Two backend calls now do what this component used to do entirely on its
// own:
//  - fetchPriceQuote (read-only) shows a price preview as soon as this
//    screen mounts.
//  - initiatePayment (mutating) runs ONLY when the user clicks "Pay". It
//    creates the authoritative pending transaction in Firestore and
//    returns the exact fields for the PayFast redirect form - merchant_id/
//    merchant_key included, so they no longer need to live in frontend env
//    vars at all. payfast-itn.js verifies against that same record before
//    upgrading anything, so nothing here needs to be trusted blindly.

function PaymentForm({ tier, billingCycle, schoolId, schoolName, currentTier, onCancel }) {
    const [step, setStep] = useState('confirm'); // 'confirm' | 'paying' | 'error'
    const [quote, setQuote] = useState(null);
    const [quoteLoading, setQuoteLoading] = useState(true);
    const [quoteError, setQuoteError] = useState(null);

    useEffect(() => {
        let active = true; // guards against setting state after unmount / stale requests

        async function loadQuote() {
            setQuoteLoading(true);
            setQuoteError(null);
            try {
                const result = await fetchPriceQuote({
                    schoolId,
                    tierId: tier.id,
                    billingCycle,
                });
                if (active) setQuote(result);
            } catch (err) {
                console.error('[Billing Quote Error]', err);
                if (active) setQuoteError(err.message || 'Could not load pricing for your region.');
            } finally {
                if (active) setQuoteLoading(false);
            }
        }

        loadQuote();
        return () => { active = false; };
    }, [schoolId, tier.id, billingCycle]);

    const hasAdjustment = quote && (quote.institutionMultiplier !== 1 || quote.currencyMultiplier !== 1);

    const handlePayfastPayment = async (e) => {
        e.preventDefault();
        if (quoteLoading || quoteError) return; // button is disabled in this state anyway
        setStep('paying');

        try {
            // Recomputed fresh server-side rather than reusing the earlier
            // preview, and this call is what actually creates the pending
            // transaction the ITN handler will check against.
            const { paymentData } = await initiatePayment({
                schoolId,
                schoolName,
                tierId: tier.id,
                billingCycle,
                currentTier,
            });

            // Build form in raw DOM — completely outside React's tree
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = PAYFAST_URL;

            Object.entries(paymentData).forEach(([key, value]) => {
                if (value === undefined || value === null) return;
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
                    {hasAdjustment && !quoteLoading && (
                        <p className="text-xs text-slate-400 mt-1">
                            Includes {quote.institutionType} institution and regional pricing
                        </p>
                    )}
                </div>
                <div className="text-right">
                    {quoteLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400 ml-auto" />
                    ) : quoteError ? (
                        <p className="text-xs text-red-500 font-bold">Pricing unavailable</p>
                    ) : (
                        <p className="font-black text-2xl text-slate-800 dark:text-white">
                            {formatCurrency(quote.chargeAmount, quote.chargeCurrency)}
                        </p>
                    )}
                </div>
            </div>

            {quoteError && (
                <div className="rounded-xl p-3 bg-red-50 dark:bg-red-900/20 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-600 dark:text-red-400">
                        {quoteError} — please refresh and try again, or contact support if this persists.
                    </p>
                </div>
            )}

            {step === 'error' && (
                <p className="text-xs text-red-500 text-center font-bold">
                    Something went wrong. Please try again.
                </p>
            )}

            <button
                onClick={handlePayfastPayment}
                disabled={step === 'paying' || quoteLoading || !!quoteError}
                className="w-full py-4 rounded-2xl font-black text-white bg-emerald-600 transition-opacity hover:opacity-90 disabled:opacity-60"
            >
                {step === 'paying'
                    ? 'Redirecting to PayFast...'
                    : quoteLoading
                        ? 'Calculating price...'
                        : `Pay ${formatCurrency(quote.chargeAmount, quote.chargeCurrency)}`}
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
                            schoolId={schoolId}
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