/**
 * SecurityTrust.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Two sub-components:
 *
 *   <SecurityBanner />   — compact badge row for top of auth modal
 *   <SecurityFooter />   — reCAPTCHA policy links for bottom of auth modal
 *   <SecurityBadges />   — larger trust badges for the landing page
 *
 * All are purely presentational — no logic, no state.
 */

import { Shield, Lock, Eye } from 'lucide-react';

// ── Top-of-modal trust banner ──────────────────────────────────────────────
export function SecurityBanner() {
    return (
        <div className="flex items-center justify-center gap-2 mb-6 py-2.5 px-4
                    rounded-xl bg-green-50 dark:bg-green-950/40
                    border border-green-100 dark:border-green-900">
            <Shield size={15} className="text-green-600 dark:text-green-400" />
            <span className="text-xs font-bold text-green-700 dark:text-green-300">
                Protected by Firebase + reCAPTCHA
            </span>
            <Lock size={13} className="text-green-500 dark:text-green-400" />
        </div>
    );
}

// ── Bottom-of-modal reCAPTCHA policy text (required by Google ToS) ─────────
export function SecurityFooter() {
    return (
        <div className="mt-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50
                    border border-slate-100 dark:border-slate-800">
            <p className="text-center text-[10px] text-slate-400 leading-relaxed">
                This site is protected by reCAPTCHA and the Google{' '}
                <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-indigo-500 transition-colors"
                >
                    Privacy Policy
                </a>{' '}
                and{' '}
                <a
                    href="https://policies.google.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-indigo-500 transition-colors"
                >
                    Terms of Service
                </a>{' '}
                apply. Your data is encrypted and stored securely on Firebase.
            </p>
        </div>
    );
}

// ── Landing-page trust badge strip ─────────────────────────────────────────
export function SecurityBadges() {
    const badges = [
        { icon: Shield, label: 'Protected by reCAPTCHA', color: 'green' },
        { icon: Lock, label: 'Firebase encrypted', color: 'blue' },
        { icon: Eye, label: 'POPIA compliant', color: 'purple' },
    ];

    const colorMap = {
        green: 'bg-green-50  dark:bg-green-950/40  border-green-200  dark:border-green-800  text-green-700  dark:text-green-300',
        blue: 'bg-blue-50   dark:bg-blue-950/40   border-blue-200   dark:border-blue-800   text-blue-700   dark:text-blue-300',
        purple: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    };

    return (
        <div className="flex flex-wrap justify-center gap-3 my-6">
            {badges.map(({ icon: Icon, label, color }) => (
                <div
                    key={label}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border
                      text-xs font-bold ${colorMap[color]}`}
                >
                    <Icon size={14} />
                    {label}
                </div>
            ))}
        </div>
    );
}