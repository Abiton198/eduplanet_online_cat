// ─── SchoolRegistration.jsx (Updated — seed hook + Tier step) ───────────────
// 4-step wizard:
//   Step 1 → Identity (name, motto, province, address)
//   Step 2 → Branding (logo, color)
//   Step 3 → Academics (curricula)
//   Step 4 → Choose Tier (free default, upgrade available immediately)

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../utils/firebase';

import {
    School,
    Palette,
    BookOpen,
    CheckCircle2,
    ArrowRight,
    Loader2,
    X,
    Image,
    Layers,
} from 'lucide-react';

import TierSelection from './TierSelection';
import PaymentManager from './PaymentManager';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SA_PROVINCES = [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'Northern Cape',
    'North West',
    'Western Cape',
];

const CURRICULA = [
    'CAPS',
    'IEB',
    'SACAI',
    'Cambridge',
    'Montessori',
];

const PRESET_COLORS = [
    '#4f46e5',
    '#0ea5e9',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#6366f1',
    '#1d4ed8',
    '#065f46',
    '#7c2d12',
    '#1e3a5f',
    '#4a1942',
];

const STEPS = [
    { num: 1, label: 'Identity', icon: School },
    { num: 2, label: 'Branding', icon: Palette },
    { num: 3, label: 'Academics', icon: BookOpen },
    { num: 4, label: 'Plan', icon: Layers },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function SchoolRegistration({
    principalProfile,
    onComplete,
}) {

    const navigate = useNavigate();

    // ── Navigation seed data ────────────────────────────────────────────────
    const { state } = useLocation();
    const seed = state?.seed || {};

    // ── Step 1 fields ───────────────────────────────────────────────────────

    const [schoolName, setSchoolName] = useState(
        seed.name || principalProfile?.school || ''
    );

    const [motto, setMotto] = useState('');

    const [established, setEstablished] = useState('');

    const [province, setProvince] = useState(
        seed.province || principalProfile?.province || 'Gauteng'
    );

    const [district, setDistrict] = useState(
        seed.district || principalProfile?.district || ''
    );

    const [address, setAddress] = useState('');

    const [phone, setPhone] = useState('');

    const [email, setEmail] = useState(
        seed.principalEmail || principalProfile?.email || ''
    );

    // ── Step 2 fields ───────────────────────────────────────────────────────

    const [primary, setPrimary] = useState('#4f46e5');

    const [logoFile, setLogoFile] = useState(null);

    const [logoPreview, setLogoPreview] = useState(null);

    const logoInputRef = useRef();

    // ── Step 3 fields ───────────────────────────────────────────────────────

    const [curricula, setCurricula] = useState(
        seed.curricula || ['CAPS']
    );

    // ── Step 4 fields ───────────────────────────────────────────────────────

    const [selectedTier, setSelectedTier] = useState('free');

    const [showPayment, setShowPayment] = useState(false);

    const [pendingUpgradeTier, setPendingUpgradeTier] = useState(null);

    // ── UI ──────────────────────────────────────────────────────────────────

    const [step, setStep] = useState(1);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [error, setError] = useState('');

    // ── Seed auth-page data into registration form ─────────────────────────

    useEffect(() => {

        if (!seed) return;

        if (seed.name) {
            setSchoolName(seed.name);
        }

        if (seed.province) {
            setProvince(seed.province);
        }

        if (seed.district) {
            setDistrict(seed.district);
        }

        if (seed.curricula?.length) {
            setCurricula(seed.curricula);
        }

        if (seed.principalEmail) {
            setEmail(seed.principalEmail);
        }

    }, [seed]);

    // ── Logo ────────────────────────────────────────────────────────────────

    const handleLogoChange = (e) => {

        const file = e.target.files?.[0];

        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError('Logo must be under 2 MB.');
            return;
        }

        setLogoFile(file);

        const reader = new FileReader();

        reader.onloadend = () => setLogoPreview(reader.result);

        reader.readAsDataURL(file);
    };

    const removeLogo = () => {

        setLogoFile(null);

        setLogoPreview(null);

        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    // ── Curriculum toggle ───────────────────────────────────────────────────

    const toggleCurriculum = (c) => {

        setCurricula((prev) =>
            prev.includes(c)
                ? prev.filter((x) => x !== c)
                : [...prev, c]
        );
    };

    // ── Tier selection ──────────────────────────────────────────────────────

    const handleTierSelect = (tierId) => {

        if (tierId === 'free') {
            setSelectedTier('free');
            return;
        }

        setPendingUpgradeTier(tierId);
        setShowPayment(true);
    };

    const handlePaymentSuccess = (tierId) => {

        setSelectedTier(tierId);

        setShowPayment(false);

        setPendingUpgradeTier(null);
    };

    // ── Submit ──────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!schoolName.trim()) {
            setError('School name is required.');
            return;
        }

        if (!curricula.length) {
            setError('Select at least one curriculum.');
            return;
        }

        setIsSubmitting(true);

        setError('');

        try {

            const uid =
                auth.currentUser?.uid ||
                principalProfile?.uid ||
                seed.principalUid;

            let logoUrl = null;

            if (logoFile && storage) {

                const lr = storageRef(
                    storage,
                    `schoolLogos/${uid}/${logoFile.name}`
                );

                const snap = await uploadBytes(lr, logoFile);

                logoUrl = await getDownloadURL(snap.ref);
            }

            const schoolData = {
                name: schoolName.trim(),
                motto: motto.trim(),
                established: established || null,
                province,
                district: district.trim(),
                address: address.trim(),
                phone: phone.trim(),
                email: email.trim(),
                primary,
                logoUrl,
                curricula,

                tier: selectedTier,
                tierUpdatedAt: serverTimestamp(),

                principalUid: uid,

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(
                doc(db, 'schools', uid),
                schoolData
            );

            await setDoc(
                doc(db, 'principals', uid),
                {
                    schoolId: uid,
                    school: schoolName.trim(),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            await setDoc(
                doc(db, 'users', uid),
                {
                    schoolId: uid,
                },
                { merge: true }
            );

            if (onComplete) {
                onComplete(uid);
            }

            navigate('/principal-dashboard');

        } catch (err) {

            console.error(err);

            setError(
                'Failed to register school. Please try again.'
            );

        } finally {

            setIsSubmitting(false);
        }
    };

    // ── Step validation ─────────────────────────────────────────────────────

    const canProceed = () => {

        if (step === 1) {
            return schoolName.trim().length > 0;
        }

        if (step === 3) {
            return curricula.length > 0;
        }

        return true;
    };

    // ────────────────────────────────────────────────────────────────────────

    return (
        <>

            <div
                className="min-h-screen flex items-center justify-center p-4"
                style={{
                    background: `linear-gradient(135deg, ${primary}15 0%, ${primary}30 100%)`,
                }}
            >

                {/* Live color bar */}

                <div
                    className="fixed top-0 left-0 right-0 h-1.5 transition-all duration-500"
                    style={{ background: primary }}
                />

                <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden">

                    {/* Header */}

                    <div
                        className="p-8 text-white relative overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
                        }}
                    >

                        <div
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage:
                                    `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                                     radial-gradient(circle at 80% 50%, white 1px, transparent 1px)`,
                                backgroundSize: '40px 40px',
                            }}
                        />

                        <div className="relative flex items-center gap-4">

                            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-white/40">

                                {logoPreview ? (
                                    <img
                                        src={logoPreview}
                                        alt="logo"
                                        className="w-full h-full object-contain p-1"
                                    />
                                ) : (
                                    <School className="w-8 h-8 text-white/60" />
                                )}

                            </div>

                            <div>

                                <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">
                                    School Registration
                                </p>

                                <h1 className="text-2xl font-black leading-tight">
                                    {schoolName || 'Your School Name'}
                                </h1>

                                {motto && (
                                    <p className="text-white/70 text-sm italic mt-0.5">
                                        "{motto}"
                                    </p>
                                )}

                            </div>
                        </div>

                        {/* Step progress */}

                        <div className="relative mt-6 flex items-center gap-2">

                            {STEPS.map((s, i) => {

                                const Icon = s.icon;

                                const done = step > s.num;

                                const active = step === s.num;

                                return (
                                    <React.Fragment key={s.num}>

                                        <div
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black transition-all ${active
                                                    ? 'bg-white text-slate-800'
                                                    : done
                                                        ? 'bg-white/30 text-white'
                                                        : 'bg-white/10 text-white/40'
                                                }`}
                                        >

                                            {done
                                                ? <CheckCircle2 size={12} />
                                                : <Icon size={12} />
                                            }

                                            {s.label}

                                        </div>

                                        {i < STEPS.length - 1 && (
                                            <div
                                                className={`flex-1 h-px transition-all ${done
                                                        ? 'bg-white/60'
                                                        : 'bg-white/20'
                                                    }`}
                                            />
                                        )}

                                    </React.Fragment>
                                );
                            })}

                        </div>
                    </div>

                    {/* Form */}

                    <div className="p-8">

                        {error && (
                            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>

                            {/* ── STEP 1 ───────────────────────────────── */}

                            {step === 1 && (

                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">

                                    <h2 className="text-lg font-black text-slate-800 dark:text-white">
                                        School Identity
                                    </h2>

                                    {/* School Name */}

                                    <div>

                                        <div className="flex items-center gap-2 mb-1">

                                            <label className="lx mb-0">
                                                School Name *
                                            </label>

                                            {seed.name && (
                                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
                                                    ✦ Auto-filled
                                                </span>
                                            )}

                                        </div>

                                        <input
                                            type="text"
                                            value={schoolName}
                                            required
                                            placeholder="e.g. Hoërskool Randburg"
                                            className="if"
                                            onChange={(e) => setSchoolName(e.target.value)}
                                        />

                                    </div>

                                    {/* Motto */}

                                    <div>

                                        <label className="lx">
                                            School Motto
                                        </label>

                                        <input
                                            type="text"
                                            value={motto}
                                            placeholder="e.g. Excellence Through Integrity"
                                            className="if"
                                            onChange={(e) => setMotto(e.target.value)}
                                        />

                                    </div>

                                    <div className="grid grid-cols-2 gap-4">

                                        {/* Established */}

                                        <div>

                                            <label className="lx">
                                                Established Year
                                            </label>

                                            <input
                                                type="number"
                                                value={established}
                                                min="1800"
                                                max={new Date().getFullYear()}
                                                placeholder="e.g. 1972"
                                                className="if"
                                                onChange={(e) => setEstablished(e.target.value)}
                                            />

                                        </div>

                                        {/* Province */}

                                        <div>

                                            <div className="flex items-center gap-2 mb-1">

                                                <label className="lx mb-0">
                                                    Province *
                                                </label>

                                                {seed.province && (
                                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
                                                        ✦ Auto-filled
                                                    </span>
                                                )}

                                            </div>

                                            <select
                                                value={province}
                                                className="if"
                                                onChange={(e) => setProvince(e.target.value)}
                                            >

                                                {SA_PROVINCES.map((p) => (
                                                    <option key={p}>
                                                        {p}
                                                    </option>
                                                ))}

                                            </select>

                                        </div>
                                    </div>

                                    {/* District */}

                                    <div>

                                        <div className="flex items-center gap-2 mb-1">

                                            <label className="lx mb-0">
                                                District
                                            </label>

                                            {seed.district && (
                                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
                                                    ✦ Auto-filled
                                                </span>
                                            )}

                                        </div>

                                        <input
                                            type="text"
                                            value={district}
                                            placeholder="e.g. Johannesburg East"
                                            className="if"
                                            onChange={(e) => setDistrict(e.target.value)}
                                        />

                                    </div>

                                    {/* Address */}

                                    <div>

                                        <label className="lx">
                                            Address
                                        </label>

                                        <input
                                            type="text"
                                            value={address}
                                            placeholder="Street address"
                                            className="if"
                                            onChange={(e) => setAddress(e.target.value)}
                                        />

                                    </div>

                                    <div className="grid grid-cols-2 gap-4">

                                        {/* Phone */}

                                        <div>

                                            <label className="lx">
                                                Phone
                                            </label>

                                            <input
                                                type="tel"
                                                value={phone}
                                                placeholder="011 XXX XXXX"
                                                className="if"
                                                onChange={(e) => setPhone(e.target.value)}
                                            />

                                        </div>

                                        {/* Email */}

                                        <div>

                                            <div className="flex items-center gap-2 mb-1">

                                                <label className="lx mb-0">
                                                    School Email
                                                </label>

                                                {seed.principalEmail && (
                                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">
                                                        ✦ Auto-filled
                                                    </span>
                                                )}

                                            </div>

                                            <input
                                                type="email"
                                                value={email}
                                                placeholder="info@school.edu.za"
                                                className="if"
                                                onChange={(e) => setEmail(e.target.value)}
                                            />

                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 2 ───────────────────────────────── */}

                            {step === 2 && (

                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                                    <h2 className="text-lg font-black text-slate-800 dark:text-white">
                                        School Branding
                                    </h2>

                                    {/* Logo */}

                                    <div>

                                        <label className="lx">
                                            School Logo
                                        </label>

                                        <div
                                            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                                            onClick={() => logoInputRef.current?.click()}
                                        >

                                            {logoPreview ? (

                                                <div className="relative inline-block">

                                                    <img
                                                        src={logoPreview}
                                                        alt="logo"
                                                        className="h-24 w-24 object-contain mx-auto rounded-xl"
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeLogo();
                                                        }}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                                                    >
                                                        <X size={12} />
                                                    </button>

                                                </div>

                                            ) : (

                                                <>
                                                    <Image className="w-10 h-10 mx-auto text-slate-300 mb-2" />

                                                    <p className="text-sm text-slate-500 font-medium">
                                                        Click to upload school logo
                                                    </p>

                                                    <p className="text-xs text-slate-400 mt-1">
                                                        PNG, JPG or SVG • Max 2 MB
                                                    </p>
                                                </>
                                            )}

                                        </div>

                                        <input
                                            ref={logoInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleLogoChange}
                                        />

                                    </div>

                                    {/* Color */}

                                    <div>

                                        <label className="lx">
                                            Primary School Color
                                        </label>

                                        <div className="flex flex-wrap gap-2 mb-3">

                                            {PRESET_COLORS.map((c) => (

                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setPrimary(c)}
                                                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                                                    style={{
                                                        backgroundColor: c,
                                                        borderColor:
                                                            primary === c
                                                                ? '#0f172a'
                                                                : 'transparent',
                                                        transform:
                                                            primary === c
                                                                ? 'scale(1.2)'
                                                                : 'scale(1)',
                                                        boxShadow:
                                                            primary === c
                                                                ? `0 0 0 3px ${c}40`
                                                                : 'none',
                                                    }}
                                                />

                                            ))}

                                        </div>

                                        <div className="flex items-center gap-3">

                                            <input
                                                type="color"
                                                value={primary}
                                                onChange={(e) => setPrimary(e.target.value)}
                                                className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer p-1"
                                            />

                                            <div>

                                                <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                                                    {primary.toUpperCase()}
                                                </p>

                                                <p className="text-[10px] text-slate-400">
                                                    Custom color or pick from presets
                                                </p>

                                            </div>

                                            <div
                                                className="ml-auto px-4 py-2 rounded-xl text-white text-xs font-black"
                                                style={{ backgroundColor: primary }}
                                            >
                                                Preview
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 3 ───────────────────────────────── */}

                            {step === 3 && (

                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">

                                    <h2 className="text-lg font-black text-slate-800 dark:text-white">
                                        Academics
                                    </h2>

                                    <div>

                                        <label className="lx">
                                            Curricula Offered * (select all that apply)
                                        </label>

                                        {seed.curricula?.length > 0 && (
                                            <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-black">
                                                ✦ Curriculum auto-filled from signup
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-2 mt-2">

                                            {CURRICULA.map((c) => {

                                                const active = curricula.includes(c);

                                                return (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => toggleCurriculum(c)}
                                                        className={`p-3 rounded-2xl border-2 text-xs font-black transition-all ${active
                                                                ? 'border-transparent text-white'
                                                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                                                            }`}
                                                        style={
                                                            active
                                                                ? {
                                                                    backgroundColor: primary,
                                                                    borderColor: primary,
                                                                }
                                                                : {}
                                                        }
                                                    >
                                                        {active && '✓ '}
                                                        {c}
                                                    </button>
                                                );
                                            })}

                                        </div>

                                        {!curricula.length && (
                                            <p className="text-xs text-red-500 mt-2 font-bold">
                                                Please select at least one curriculum.
                                            </p>
                                        )}

                                    </div>
                                </div>
                            )}

                            {/* ── STEP 4 ───────────────────────────────── */}

                            {step === 4 && (

                                <div className="animate-in fade-in slide-in-from-right-4 duration-300">

                                    <div className="mb-6">

                                        <h2 className="text-lg font-black text-slate-800 dark:text-white">
                                            Choose Your Plan
                                        </h2>

                                        <p className="text-xs text-slate-500 mt-1">
                                            Start free and upgrade any time from your dashboard.
                                            Paid plans unlock immediately.
                                        </p>

                                    </div>

                                    <TierSelection
                                        selected={selectedTier}
                                        current={null}
                                        onSelect={handleTierSelect}
                                        compact={false}
                                    />

                                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs text-slate-500">
                                        💳 Paid plan? A secure payment step opens before your
                                        registration completes. You can always start free and
                                        upgrade later.
                                    </div>

                                </div>
                            )}

                            {/* Navigation */}

                            <div className="flex gap-3 mt-8">

                                {step > 1 && (

                                    <button
                                        type="button"
                                        onClick={() => setStep((s) => s - 1)}
                                        className="flex-1 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-600 dark:text-slate-300 hover:border-slate-400 transition-all"
                                    >
                                        ← Back
                                    </button>
                                )}

                                {step < 4 ? (

                                    <button
                                        type="button"
                                        disabled={!canProceed()}
                                        onClick={() => setStep((s) => s + 1)}
                                        className="flex-1 py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                                        style={{ backgroundColor: primary }}
                                    >
                                        Continue <ArrowRight size={18} />
                                    </button>

                                ) : (

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !curricula.length}
                                        className="flex-1 py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                                        style={{ backgroundColor: primary }}
                                    >

                                        {isSubmitting ? (
                                            <>
                                                <Loader2
                                                    size={18}
                                                    className="animate-spin"
                                                />
                                                Registering...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} />
                                                Complete Registration
                                            </>
                                        )}

                                    </button>
                                )}

                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Payment modal */}

            {showPayment && pendingUpgradeTier && (

                <PaymentManager
                    schoolId={
                        auth.currentUser?.uid ||
                        principalProfile?.uid ||
                        seed.principalUid
                    }
                    schoolName={schoolName}
                    currentTier="free"
                    onClose={() => {
                        setShowPayment(false);
                        setPendingUpgradeTier(null);
                    }}
                    onTierChange={handlePaymentSuccess}
                />
            )}

            <style>{`
                .lx {
                    display:block;
                    font-size:10px;
                    font-weight:900;
                    color:#94a3b8;
                    text-transform:uppercase;
                    letter-spacing:.1em;
                    margin-bottom:6px;
                }

                .if {
                    width:100%;
                    padding:14px 16px;
                    border-radius:1rem;
                    border:1px solid #e2e8f0;
                    background:white;
                    font-size:14px;
                    outline:none;
                    color:#0f172a;
                    transition:border-color .2s;
                }

                .dark .if {
                    background:#1e293b;
                    border-color:#334155;
                    color:white;
                }

                .if:focus {
                    border-color:${primary};
                }
            `}</style>
        </>
    );
}