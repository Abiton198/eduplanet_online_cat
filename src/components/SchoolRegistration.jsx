// ─── SchoolRegistration.jsx ───────────────────────────────────────────────────
// Step shown to a principal after account creation.
// Collects: school name, logo, primary color, motto, established date, curricula.
// On save → writes to /schools/{principalUid} and redirects to principal dashboard.

import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../utils/firebase';
import {
    Upload, Palette, School, Calendar, BookOpen,
    CheckCircle2, ArrowRight, Loader2, X, Image,
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SA_PROVINCES = [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
];

const CURRICULA = ['CAPS', 'IEB', 'SACAI', 'Cambridge', 'Montessori'];

const PRESET_COLORS = [
    '#4f46e5', // indigo
    '#0ea5e9', // sky
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo lighter
    '#1d4ed8', // blue-700
    '#065f46', // green-900
    '#7c2d12', // red-900 (maroon)
    '#1e3a5f', // navy
    '#4a1942', // plum
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function SchoolRegistration({ principalProfile, onComplete }) {
    const navigate = useNavigate();

    // School identity
    const [schoolName, setSchoolName] = useState(principalProfile?.school || '');
    const [motto, setMotto] = useState('');
    const [established, setEstablished] = useState('');
    const [province, setProvince] = useState(principalProfile?.province || 'Gauteng');
    const [district, setDistrict] = useState(principalProfile?.district || '');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState(principalProfile?.email || '');

    // Branding
    const [primary, setPrimary] = useState('#4f46e5');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [curricula, setCurricula] = useState(['CAPS']);

    // UI
    const [step, setStep] = useState(1); // 1=Identity, 2=Branding, 3=Academics
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const logoInputRef = useRef();

    // ── Logo handler ──────────────────────────────────────────────────────────
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
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

    // ── Curriculum toggle ─────────────────────────────────────────────────────
    const toggleCurriculum = (c) => {
        setCurricula((prev) =>
            prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
        );
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!schoolName.trim()) { setError('School name is required.'); return; }
        if (!curricula.length) { setError('Select at least one curriculum.'); return; }

        setIsSubmitting(true);
        setError('');

        try {
            const uid = auth.currentUser?.uid || principalProfile?.uid;
            let logoUrl = null;

            // Upload logo if provided
            if (logoFile && storage) {
                const logoRef = storageRef(storage, `schoolLogos/${uid}/${logoFile.name}`);
                const snap = await uploadBytes(logoRef, logoFile);
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
                principalUid: uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // Write to /schools/{principalUid}
            await setDoc(doc(db, 'schools', uid), schoolData);

            // Update principal profile with schoolId
            await setDoc(doc(db, 'principals', uid), {
                schoolId: uid,
                school: schoolName.trim(),
                updatedAt: serverTimestamp(),
            }, { merge: true });

            // Update cross-reference
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

    // ── Step validation ───────────────────────────────────────────────────────
    const canProceed = () => {
        if (step === 1) return schoolName.trim().length > 0;
        if (step === 2) return true; // branding optional
        return curricula.length > 0;
    };

    const steps = [
        { num: 1, label: 'Identity', icon: School },
        { num: 2, label: 'Branding', icon: Palette },
        { num: 3, label: 'Academics', icon: BookOpen },
    ];

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: `linear-gradient(135deg, ${primary}15 0%, ${primary}30 100%)` }}
        >
            {/* Live color preview bar */}
            <div
                className="fixed top-0 left-0 right-0 h-1.5 transition-all duration-500"
                style={{ background: primary }}
            />

            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">

                {/* Header with preview */}
                <div
                    className="p-8 text-white relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}
                >
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                              radial-gradient(circle at 80% 50%, white 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }} />

                    <div className="relative flex items-center gap-4">
                        {/* Logo preview */}
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-white/40">
                            {logoPreview
                                ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" />
                                : <School className="w-8 h-8 text-white/60" />
                            }
                        </div>
                        <div>
                            <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">
                                School Registration
                            </p>
                            <h1 className="text-2xl font-black leading-tight">
                                {schoolName || 'Your School Name'}
                            </h1>
                            {motto && (
                                <p className="text-white/70 text-sm italic mt-0.5">"{motto}"</p>
                            )}
                        </div>
                    </div>

                    {/* Step progress */}
                    <div className="relative mt-6 flex items-center gap-2">
                        {steps.map((s, i) => {
                            const Icon = s.icon;
                            const done = step > s.num;
                            const active = step === s.num;
                            return (
                                <React.Fragment key={s.num}>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black transition-all ${active ? 'bg-white text-slate-800' :
                                            done ? 'bg-white/30 text-white' :
                                                'bg-white/10 text-white/40'
                                        }`}>
                                        {done ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                                        {s.label}
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className={`flex-1 h-px transition-all ${done ? 'bg-white/60' : 'bg-white/20'}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Form content */}
                <div className="p-8">
                    {error && (
                        <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>

                        {/* ── STEP 1: IDENTITY ── */}
                        {step === 1 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h2 className="text-lg font-black text-slate-800 dark:text-white">School Identity</h2>

                                <div>
                                    <label className="label-sm">School Name *</label>
                                    <input
                                        type="text" value={schoolName} required
                                        placeholder="e.g. Hoërskool Randburg"
                                        className="input-field"
                                        onChange={(e) => setSchoolName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="label-sm">School Motto</label>
                                    <input
                                        type="text" value={motto}
                                        placeholder="e.g. Excellence Through Integrity"
                                        className="input-field"
                                        onChange={(e) => setMotto(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-sm">Established Year</label>
                                        <input
                                            type="number" value={established} min="1800" max={new Date().getFullYear()}
                                            placeholder="e.g. 1972"
                                            className="input-field"
                                            onChange={(e) => setEstablished(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label-sm">Province *</label>
                                        <select value={province} className="input-field" onChange={(e) => setProvince(e.target.value)}>
                                            {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="label-sm">District</label>
                                    <input
                                        type="text" value={district}
                                        placeholder="e.g. Johannesburg East"
                                        className="input-field"
                                        onChange={(e) => setDistrict(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="label-sm">School Address</label>
                                    <input
                                        type="text" value={address}
                                        placeholder="Street address"
                                        className="input-field"
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-sm">Phone</label>
                                        <input type="tel" value={phone} placeholder="011 XXX XXXX" className="input-field" onChange={(e) => setPhone(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="label-sm">School Email</label>
                                        <input type="email" value={email} placeholder="info@school.edu.za" className="input-field" onChange={(e) => setEmail(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 2: BRANDING ── */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h2 className="text-lg font-black text-slate-800 dark:text-white">School Branding</h2>

                                {/* Logo upload */}
                                <div>
                                    <label className="label-sm">School Logo</label>
                                    <div
                                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                                        onClick={() => logoInputRef.current?.click()}
                                    >
                                        {logoPreview ? (
                                            <div className="relative inline-block">
                                                <img src={logoPreview} alt="logo preview" className="h-24 w-24 object-contain mx-auto rounded-xl" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeLogo(); }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <Image className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                                <p className="text-sm text-slate-500 font-medium">Click to upload school logo</p>
                                                <p className="text-xs text-slate-400 mt-1">PNG, JPG or SVG • Max 2 MB</p>
                                            </>
                                        )}
                                    </div>
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                </div>

                                {/* Color picker */}
                                <div>
                                    <label className="label-sm">Primary School Color</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {PRESET_COLORS.map((c) => (
                                            <button
                                                key={c} type="button"
                                                onClick={() => setPrimary(c)}
                                                className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                                                style={{
                                                    backgroundColor: c,
                                                    borderColor: primary === c ? '#0f172a' : 'transparent',
                                                    transform: primary === c ? 'scale(1.2)' : 'scale(1)',
                                                    boxShadow: primary === c ? `0 0 0 3px ${c}40` : 'none',
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="color" value={primary}
                                                onChange={(e) => setPrimary(e.target.value)}
                                                className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer p-1"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300">{primary.toUpperCase()}</p>
                                            <p className="text-[10px] text-slate-400">Custom color — or pick from presets above</p>
                                        </div>
                                        <div
                                            className="ml-auto px-4 py-2 rounded-xl text-white text-xs font-black"
                                            style={{ backgroundColor: primary }}
                                        >
                                            Preview
                                        </div>
                                    </div>
                                </div>

                                {/* Live preview card */}
                                <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                    <div className="p-4 text-white text-sm font-bold" style={{ backgroundColor: primary }}>
                                        Dashboard header preview
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
                                        {logoPreview
                                            ? <img src={logoPreview} alt="" className="w-10 h-10 object-contain rounded-lg" />
                                            : <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: primary + '20' }} />
                                        }
                                        <div>
                                            <p className="text-xs font-black text-slate-800 dark:text-white">{schoolName || 'School Name'}</p>
                                            <p className="text-[10px] text-slate-400 italic">{motto || 'Your motto here'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 3: ACADEMICS ── */}
                        {step === 3 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h2 className="text-lg font-black text-slate-800 dark:text-white">Academics</h2>

                                <div>
                                    <label className="label-sm">Curricula Offered * (select all that apply)</label>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {CURRICULA.map((c) => {
                                            const active = curricula.includes(c);
                                            return (
                                                <button
                                                    key={c} type="button"
                                                    onClick={() => toggleCurriculum(c)}
                                                    className={`p-3 rounded-2xl border-2 text-xs font-black transition-all ${active
                                                            ? 'border-transparent text-white'
                                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                                                        }`}
                                                    style={active ? { backgroundColor: primary, borderColor: primary } : {}}
                                                >
                                                    {active && '✓ '}{c}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {curricula.length === 0 && (
                                        <p className="text-xs text-red-500 mt-2 font-bold">Please select at least one curriculum.</p>
                                    )}
                                </div>

                                {/* Summary card */}
                                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-5 space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Registration Summary</p>
                                    {[
                                        ['School', schoolName],
                                        ['Motto', motto || '—'],
                                        ['Established', established || '—'],
                                        ['Province', province],
                                        ['District', district || '—'],
                                        ['Curricula', curricula.join(', ') || '—'],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex justify-between text-sm">
                                            <span className="text-slate-400 font-medium">{label}</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{value}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-sm items-center pt-1">
                                        <span className="text-slate-400 font-medium">Brand Color</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: primary }} />
                                            <span className="font-bold text-slate-800 dark:text-white">{primary.toUpperCase()}</span>
                                        </div>
                                    </div>
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

                            {step < 3 ? (
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
                                        <><Loader2 size={18} className="animate-spin" /> Registering...</>
                                    ) : (
                                        <>Register School <CheckCircle2 size={18} /></>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Inline styles */}
            <style>{`
        .label-sm {
          display: block;
          font-size: 10px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 6px;
        }
        .input-field {
          width: 100%;
          padding: 14px 16px;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          color: #0f172a;
        }
        .dark .input-field {
          background: #1e293b;
          border-color: #334155;
          color: white;
        }
        .input-field:focus {
          border-color: var(--school-primary, #4f46e5);
        }
      `}</style>
        </div>
    );
}