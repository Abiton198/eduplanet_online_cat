// ─── SchoolRegistration.jsx (Global Edition — fixed navigation) ──────────────
// Layout fix: the card now uses flex-col with a scrollable middle section.
// Nav buttons are STICKY at the bottom — always visible regardless of content height.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../utils/firebase';
import {
    School, Palette, BookOpen, CheckCircle2, ArrowRight,
    Loader2, X, Image as ImageIcon, Layers, Search, ChevronDown, Save
} from 'lucide-react';
import TierSelection from './TierSelection';
import PaymentManager from './PaymentManager';
import { COUNTRIES, getCountry, getRegions, detectDefaultCountry } from '../utils/countries';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CURRICULA_GLOBAL = [
    'National Curriculum', 'Cambridge International', 'IB (International Baccalaureate)',
    'CAPS (South Africa)', 'IEB (South Africa)', 'SACAI (South Africa)',
    'Common Core (USA)', 'A-Levels (UK)', 'GCSE (UK)',
    'Australian Curriculum', 'CBE (Kenya)', 'Montessori', 'Waldorf / Steiner', 'Other',
];

const PRESET_COLORS = [
    '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    '#1d4ed8', '#065f46', '#7c2d12', '#1e3a5f', '#4a1942',
];

const STEPS = [
    { num: 1, label: 'Identity', icon: School },
    { num: 2, label: 'Branding', icon: Palette },
    { num: 3, label: 'Academics', icon: BookOpen },
    { num: 4, label: 'Plan', icon: Layers },
];

// ─── COUNTRY SEARCH DROPDOWN ──────────────────────────────────────────────────

function CountryPicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapRef = useRef();
    const inputRef = useRef();
    const selected = getCountry(value);

    const filtered = useMemo(() =>
        COUNTRIES.filter((c) =>
            !query ||
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.dial.includes(query) ||
            c.code.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 80),
        [query]);

    useEffect(() => {
        const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="if flex items-center gap-3 cursor-pointer text-left"
            >
                <span className="text-2xl leading-none">{selected?.flag || '🌍'}</span>
                <span className="flex-1 text-sm font-medium text-slate-800 dark:text-white">
                    {selected?.name || 'Select country'}
                </span>
                <span className="text-xs text-slate-400 font-bold">{selected?.dial}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <Search size={14} className="text-slate-400 flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            placeholder="Search country..."
                            className="flex-1 bg-transparent text-sm outline-none text-slate-800 dark:text-white placeholder:text-slate-400"
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && <button type="button" onClick={() => setQuery('')}><X size={12} className="text-slate-400" /></button>}
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                        {filtered.length === 0
                            ? <p className="text-xs text-slate-400 text-center py-6">No countries found</p>
                            : filtered.map((c) => (
                                <button key={c.code} type="button"
                                    onClick={() => { onChange(c.code); setOpen(false); setQuery(''); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${value === c.code ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                                    <span className="text-xl leading-none w-7 flex-shrink-0">{c.flag}</span>
                                    <span className="flex-1 text-sm text-slate-800 dark:text-white font-medium">{c.name}</span>
                                    <span className="text-xs text-slate-400 font-bold">{c.dial}</span>
                                    {value === c.code && <CheckCircle2 size={12} className="text-indigo-500 flex-shrink-0" />}
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── PHONE INPUT WITH DIAL CODE ────────────────────────────────────────────────

function PhoneInput({ countryCode, value, onChange }) {
    const country = getCountry(countryCode);
    return (
        <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-shrink-0 select-none">
                <span className="text-base leading-none">{country?.flag || '🌍'}</span>
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 whitespace-nowrap">{country?.dial || ''}</span>
            </div>
            <input
                type="tel"
                value={value}
                placeholder="Phone number"
                inputMode="numeric"
                className="if flex-1"
                onChange={(e) => onChange(e.target.value.replace(/[^\d\s\-()]/g, ''))}
            />
        </div>
    );
}

// ─── REGION FIELD ─────────────────────────────────────────────────────────────

function RegionField({ countryCode, value, onChange, primary }) {
    const country = getCountry(countryCode);
    const regions = getRegions(countryCode);
    const label = country?.regionLabel || 'State / Region';

    if (regions.length > 0) {
        return (
            <div>
                <label className="lx">{label}</label>
                <select value={value} className="if" onChange={(e) => onChange(e.target.value)}>
                    <option value="">Select {label}...</option>
                    <option value="">Select {label}...</option>
                    {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
        );
    }
    return (
        <div>
            <label className="lx">{label}</label>
            <input type="text" value={value} placeholder={`Enter ${label}`} className="if" onChange={(e) => onChange(e.target.value)} />
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function SchoolRegistration({ principalProfile, onComplete }) {
    const navigate = useNavigate();
    const { state } = useLocation();
    const seed = state?.seed || {};

    // Step 1
    const [countryCode, setCountryCode] = useState(seed.countryCode || detectDefaultCountry());
    const [schoolName, setSchoolName] = useState(seed.name || principalProfile?.school || '');
    const [motto, setMotto] = useState('');
    const [established, setEstablished] = useState('');
    const [region, setRegion] = useState(seed.province || principalProfile?.province || '');
    const [district, setDistrict] = useState(seed.district || principalProfile?.district || '');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState(seed.principalEmail || principalProfile?.email || '');

    // Step 2
    const [primary, setPrimary] = useState('#4f46e5');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const logoInputRef = useRef();

    // Step 3
    const [curricula, setCurricula] = useState(seed.curricula || []);
    const [customCurriculum, setCustomCurriculum] = useState('');

    // Step 4
    const [selectedTier, setSelectedTier] = useState('free');
    const [showPayment, setShowPayment] = useState(false);
    const [pendingUpgradeTier, setPendingUpgradeTier] = useState(null);

    // UI
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [error, setError] = useState('');

    // Reset region when country changes
    useEffect(() => { setRegion(''); }, [countryCode]);

    const country = getCountry(countryCode);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2 MB.'); return; }
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const removeLogo = () => {
        setLogoFile(null); setLogoPreview(null);
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

    const toggleCurriculum = (c) =>
        setCurricula((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

    const addCustomCurriculum = () => {
        const val = customCurriculum.trim();
        if (!val) return;
        if (!curricula.includes(val)) setCurricula((p) => [...p, val]);
        setCustomCurriculum('');
    };

    const handleTierSelect = (tierId) => {
        if (tierId === 'free') { setSelectedTier('free'); return; }
        setPendingUpgradeTier(tierId);
        setShowPayment(true);
    };

    const handlePaymentSuccess = (tierId) => {
        setSelectedTier(tierId);
        setShowPayment(false);
        setPendingUpgradeTier(null);
    };

    const canProceed = () => {
        if (step === 1) return schoolName.trim().length > 0 && !!countryCode;
        if (step === 3) return curricula.length > 0;
        return true;
    };

    const goNext = () => { if (canProceed()) setStep((s) => s + 1); };
    const goBack = () => setStep((s) => s - 1);

    // Combined payload helper used for save-and-exit or complete submission
    const buildRegistrationPayload = async (uid) => {
        let logoUrl = null;
        if (logoFile && storage) {
            const lr = storageRef(storage, `schoolLogos/${uid}/${logoFile.name}`);
            const snap = await uploadBytes(lr, logoFile);
            logoUrl = await getDownloadURL(snap.ref);
        }

        const fullPhone = phone ? `${country?.dial || ''} ${phone}`.trim() : '';

        return {
            name: schoolName.trim(),
            motto: motto.trim(),
            established: established || null,
            countryCode,
            country: country?.name || '',
            countryFlag: country?.flag || '',
            region: region.trim(),
            district: district.trim(),
            address: address.trim(),
            phone: fullPhone,
            email: email.trim(),
            primary,
            logoUrl: logoUrl || logoPreview,
            curricula,
            tier: selectedTier,
            tierUpdatedAt: serverTimestamp(),
            principalUid: uid,
            updatedAt: serverTimestamp(),
        };
    };

    // Intermediate Action: Save draft data and send back to dashboard
    const handleSaveAndCompleteLater = async () => {
        const uid = auth.currentUser?.uid || principalProfile?.uid || seed.principalUid;
        if (!uid) { setError('User state validation failed. Cannot save draft.'); return; }
        if (!schoolName.trim()) { setError('A School Name is required to save an application entry.'); return; }

        setIsSavingDraft(true);
        setError('');

        try {
            const draftPayload = await buildRegistrationPayload(uid);
            const partialData = {
                ...draftPayload,
                registrationStatus: 'DRAFT',
                createdAt: serverTimestamp()
            };

            await setDoc(doc(db, 'schools', uid), partialData, { merge: true });
            await setDoc(doc(db, 'principals', uid), { schoolId: uid, school: schoolName.trim(), updatedAt: serverTimestamp() }, { merge: true });

            navigate('/principal-dashboard');
        } catch (err) {
            console.error(err);
            setError('Failed to securely save setup progress.');
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSubmit = async () => {
        if (!schoolName.trim()) { setError('School name is required.'); return; }
        if (!countryCode) { setError('Please select a country.'); return; }
        if (!curricula.length) { setError('Select at least one curriculum.'); return; }

        setIsSubmitting(true);
        setError('');

        try {
            const uid = auth.currentUser?.uid || principalProfile?.uid || seed.principalUid;
            const schoolData = await buildRegistrationPayload(uid);

            const finalPayload = {
                ...schoolData,
                registrationStatus: 'COMPLETED',
                createdAt: serverTimestamp()
            };

            await setDoc(doc(db, 'schools', uid), finalPayload);
            await setDoc(doc(db, 'principals', uid), { schoolId: uid, school: schoolName.trim(), updatedAt: serverTimestamp() }, { merge: true });
            await setDoc(doc(db, 'users', uid), { schoolId: uid }, { merge: true });

            if (onComplete) onComplete(uid);
            navigate('/principal-dashboard');
        } catch (err) {
            console.error(err);
            setError('Failed to register school. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Full-page background */}
            <div
                className="fixed inset-0 w-screen h-screen flex items-center justify-center p-4 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${primary}15 0%, ${primary}30 100%)` }}
            >
                {/* Top color bar */}
                <div className="fixed top-0 left-0 right-0 h-1.5 z-50 transition-all duration-500" style={{ background: primary }} />

                {/* ── COMPACT SCROLL BOUNDARY LAYOUT ──
          Enforcing strict flex management rules ensures the bottom action cluster 
          can never get pushed down past the display viewport bounds.
        */}
                <div
                    className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative"
                >

                    {/* ── 1. HEADER (never scrolls) ── */}
                    <div
                        className="flex-shrink-0 p-6 md:p-8 text-white relative overflow-hidden rounded-t-[2.5rem]"
                        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}
                    >
                        <div className="absolute inset-0 opacity-10" style={{
                            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                                radial-gradient(circle at 80% 50%, white 1px, transparent 1px)`,
                            backgroundSize: '40px 40px',
                        }} />

                        <div className="relative flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-white/40">
                                {logoPreview
                                    ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
                                    : country?.flag
                                        ? <span className="text-3xl">{country.flag}</span>
                                        : <School className="w-7 h-7 text-white/60" />}
                            </div>
                            <div>
                                <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-0.5 flex items-center gap-2">
                                    School Registration
                                    {country && <span className="text-white/80 normal-case font-bold">· {country.flag} {country.name}</span>}
                                </p>
                                <h1 className="text-xl font-black leading-tight truncate max-w-md">{schoolName || 'Your School Name'}</h1>
                                {motto && <p className="text-white/70 text-sm italic line-clamp-1">" {motto} "</p>}
                            </div>
                        </div>

                        {/* Step pills */}
                        <div className="relative mt-5 flex items-center gap-2 overflow-x-auto no-scrollbar">
                            {STEPS.map((s, i) => {
                                const Icon = s.icon;
                                const done = step > s.num;
                                const active = step === s.num;
                                return (
                                    <React.Fragment key={s.num}>
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-all flex-shrink-0 ${active ? 'bg-white text-slate-800 shadow-sm' :
                                            done ? 'bg-white/30 text-white' :
                                                'bg-white/10 text-white/40'}`}>
                                            {done ? <CheckCircle2 size={11} /> : <Icon size={11} />}
                                            {s.label}
                                        </div>
                                        {i < STEPS.length - 1 && (
                                            <div className={`flex-1 min-w-[15px] h-px ${done ? 'bg-white/60' : 'bg-white/20'}`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── 2. SCROLLABLE INNER BODY ── */}
                    <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 focus:outline-none">

                        {error && (
                            <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        {/* ══ STEP 1: IDENTITY ══ */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <h2 className="text-base font-black text-slate-800 dark:text-white">School Identity</h2>

                                <div>
                                    <label className="lx">Country *</label>
                                    <CountryPicker value={countryCode} onChange={(code) => setCountryCode(code)} />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="lx mb-0">School Name *</label>
                                        {seed.name && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">✦ Auto-filled</span>}
                                    </div>
                                    <input type="text" value={schoolName} required placeholder="e.g. Greenfield Academy" className="if" onChange={(e) => setSchoolName(e.target.value)} />
                                </div>

                                <div>
                                    <label className="lx">School Motto</label>
                                    <input type="text" value={motto} placeholder="e.g. Excellence Through Integrity" className="if" onChange={(e) => setMotto(e.target.value)} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="lx">Established Year</label>
                                        <input type="number" value={established} min="1800" max={new Date().getFullYear()} placeholder="e.g. 1972" className="if" onChange={(e) => setEstablished(e.target.value)} />
                                    </div>
                                    <RegionField countryCode={countryCode} value={region} onChange={setRegion} primary={primary} />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="lx mb-0">District / City</label>
                                        {seed.district && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">✦ Auto-filled</span>}
                                    </div>
                                    <input type="text" value={district} placeholder="e.g. New Brighton" className="if" onChange={(e) => setDistrict(e.target.value)} />
                                </div>

                                <div>
                                    <label className="lx">Street Address</label>
                                    <input type="text" value={address} placeholder="123 Main Street" className="if" onChange={(e) => setAddress(e.target.value)} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="lx">Phone</label>
                                        <PhoneInput countryCode={countryCode} value={phone} onChange={setPhone} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <label className="lx mb-0">School Email</label>
                                            {seed.principalEmail && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">✦ Auto-filled</span>}
                                        </div>
                                        <input type="email" value={email} placeholder="info@school.edu" className="if" onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ STEP 2: BRANDING ══ */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <h2 className="text-base font-black text-slate-800 dark:text-white">School Branding</h2>

                                <div>
                                    <label className="lx">School Logo</label>
                                    <div
                                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                                        onClick={() => logoInputRef.current?.click()}
                                    >
                                        {logoPreview ? (
                                            <div className="relative inline-block">
                                                <img src={logoPreview} alt="preview" className="h-24 w-24 object-contain mx-auto rounded-xl" />
                                                <button type="button" onClick={(e) => { e.stopPropagation(); removeLogo(); }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                                <p className="text-sm text-slate-500 font-medium">Click to upload school logo</p>
                                                <p className="text-xs text-slate-400 mt-1">PNG, JPG or SVG • Max 2 MB</p>
                                            </>
                                        )}
                                    </div>
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                </div>

                                <div>
                                    <label className="lx">Primary School Color</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {PRESET_COLORS.map((c) => (
                                            <button key={c} type="button" onClick={() => setPrimary(c)}
                                                className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                                                style={{
                                                    backgroundColor: c,
                                                    borderColor: primary === c ? '#0f172a' : 'transparent',
                                                    transform: primary === c ? 'scale(1.2)' : undefined,
                                                    boxShadow: primary === c ? `0 0 0 3px ${c}40` : undefined,
                                                }} />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer p-1" />
                                        <div>
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300">{primary.toUpperCase()}</p>
                                            <p className="text-[10px] text-slate-400">Custom hex or pick a preset</p>
                                        </div>
                                        <div className="ml-auto px-4 py-2 rounded-xl text-white text-xs font-black" style={{ backgroundColor: primary }}>Preview</div>
                                    </div>
                                </div>

                                {/* Live preview */}
                                <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                    <div className="p-4 text-white text-sm font-bold flex items-center gap-3" style={{ backgroundColor: primary }}>
                                        {country?.flag && <span className="text-xl">{country.flag}</span>}
                                        <span>Dashboard header preview</span>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
                                        {logoPreview
                                            ? <img src={logoPreview} alt="" className="w-10 h-10 object-contain rounded-lg" />
                                            : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: primary + '20' }}>{country?.flag || '🏫'}</div>}
                                        <div>
                                            <p className="text-xs font-black text-slate-800 dark:text-white">{schoolName || 'School Name'}</p>
                                            <p className="text-[10px] text-slate-400 italic">{motto || 'Your motto'}</p>
                                            {region && <p className="text-[10px] text-slate-400">{region}{country ? `, ${country.name}` : ''}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ STEP 3: ACADEMICS ══ */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <h2 className="text-base font-black text-slate-800 dark:text-white">Academics</h2>

                                <div>
                                    <label className="lx">Curricula Offered * — select all that apply</label>
                                    {seed.curricula?.length > 0 && (
                                        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-black">
                                            ✦ Curriculum data mapped
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        {CURRICULA_GLOBAL.map((c) => {
                                            const active = curricula.includes(c);
                                            return (
                                                <button key={c} type="button" onClick={() => toggleCurriculum(c)}
                                                    className={`p-3 rounded-2xl border-2 text-xs font-bold text-left transition-all ${active ? 'border-transparent text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}
                                                    style={active ? { backgroundColor: primary, borderColor: primary } : {}}>
                                                    {active && '✓ '}{c}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Custom curriculum input */}
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text" value={customCurriculum}
                                            placeholder="Add custom curriculum..."
                                            className="if flex-1 !py-3"
                                            onChange={(e) => setCustomCurriculum(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCurriculum(); } }}
                                        />
                                        <button type="button" onClick={addCustomCurriculum}
                                            className="px-4 py-3 rounded-2xl text-white text-xs font-black whitespace-nowrap"
                                            style={{ backgroundColor: primary }}>
                                            + Add
                                        </button>
                                    </div>

                                    {/* Custom chips */}
                                    {curricula.filter((c) => !CURRICULA_GLOBAL.includes(c)).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {curricula.filter((c) => !CURRICULA_GLOBAL.includes(c)).map((c) => (
                                                <span key={c} className="flex items-center gap-1 px-3 py-1 rounded-full text-white text-xs font-bold" style={{ backgroundColor: primary }}>
                                                    {c}
                                                    <button type="button" onClick={() => toggleCurriculum(c)} className="ml-1 opacity-70 hover:opacity-100"><X size={10} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {!curricula.length && (
                                        <p className="text-xs text-red-500 mt-2 font-bold">Please select or add at least one curriculum.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ══ STEP 4: PLAN ══ */}
                        {step === 4 && (
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-base font-black text-slate-800 dark:text-white">Choose Your Plan</h2>
                                    <p className="text-xs text-slate-500 mt-1">Start free and upgrade any time. Paid plans unlock immediately after payment.</p>
                                </div>
                                <TierSelection selected={selectedTier} current={null} onSelect={handleTierSelect} compact={true} />
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs text-slate-500">
                                    💳 Selecting a paid plan opens a secure payment step. You can always start free and upgrade later from your principal dashboard.
                                </div>
                            </div>
                        )}

                    </div>

                    {/* ── 3. LOCKED BOTTOM NAV CLUSTER (Guaranteed Visibility) ── */}
                    <div className="flex-shrink-0 px-6 md:px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-[2.5rem] flex items-center justify-between gap-3">

                        {/* Action Left: Back Controls */}
                        <div className="flex items-center gap-2 flex-1">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={goBack}
                                    className="px-5 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xs md:text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                >
                                    ← Back
                                </button>
                            ) : (
                                <div className="text-xs font-bold text-slate-400 italic hidden md:block">
                                    Step 1 of 4
                                </div>
                            )}

                            {/* Action Middle: Save Progress Action Hook */}
                            {schoolName.trim().length > 0 && (
                                <button
                                    type="button"
                                    disabled={isSavingDraft || isSubmitting}
                                    onClick={handleSaveAndCompleteLater}
                                    className="px-4 py-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-black flex items-center gap-2 rounded-xl transition-colors disabled:opacity-40"
                                >
                                    {isSavingDraft ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Save size={14} />
                                    )}
                                    <span className="hidden sm:inline">Save Draft</span>
                                </button>
                            )}
                        </div>

                        {/* Action Right: Forward Progression / Finish Registration */}
                        <div className="flex-1 flex justify-end">
                            {step < 4 ? (
                                <button
                                    type="button"
                                    disabled={!canProceed()}
                                    onClick={goNext}
                                    className="w-full sm:max-w-[200px] py-3.5 rounded-2xl font-black text-xs md:text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95 shadow-md"
                                    style={{ backgroundColor: primary }}
                                >
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isSubmitting || isSavingDraft || !curricula.length}
                                    onClick={handleSubmit}
                                    className="w-full sm:max-w-[240px] py-3.5 rounded-2xl font-black text-xs md:text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95 shadow-md"
                                    style={{ backgroundColor: primary }}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={16} className="animate-spin" /> Registering...</>
                                    ) : (
                                        <><CheckCircle2 size={16} /> Complete Registration</>
                                    )}
                                </button>
                            )}
                        </div>

                    </div>

                </div>
            </div>

            {/* Payment modal hook */}
            {showPayment && pendingUpgradeTier && (
                <PaymentManager
                    schoolId={auth.currentUser?.uid || principalProfile?.uid || seed.principalUid}
                    schoolName={schoolName}
                    currentTier="free"
                    onClose={() => { setShowPayment(false); setPendingUpgradeTier(null); }}
                    onTierChange={handlePaymentSuccess}
                />
            )}

            <style>{`
        .lx {
          display: block;
          font-size: 10px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: .1em;
          margin-bottom: 6px;
        }
        .if {
          width: 100%;
          padding: 12px 16px;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 14px;
          outline: none;
          color: #0f172a;
          transition: border-color .2s;
        }
        .dark .if {
          background: #1e293b;
          border-color: #334155;
          color: white;
        }
        .if:focus { border-color: ${primary}; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </>
    );
}