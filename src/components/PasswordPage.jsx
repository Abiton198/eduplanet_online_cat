import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, provider, db } from '../utils/firebase';
import {
  X, Eye, EyeOff, Sun, Moon, School, Sparkles,
  FileText, BarChart3, User, Briefcase, GraduationCap,
  Globe, ShieldCheck, CheckCircle2, Library, Zap, BrainCircuit, Target, UserCheck
} from 'lucide-react';

export default function AuthPage({ setStudentInfo }) {
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [userRole, setUserRole] = useState('student');

  // Form & Auth States
  const [tempUser, setTempUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // South African Curricula State
  const [curriculum, setCurriculum] = useState('CAPS');
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');

  // Teacher/Principal Specific
  const [title, setTitle] = useState('Mr');
  const [surname, setSurname] = useState('');
  const [subject, setSubject] = useState('CAT');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem('eduplanet-theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('eduplanet-theme', newMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newMode);
  };

  // ─── AUTH LOGIC: GOOGLE INTERCEPT ───────────────────────────────────────
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const [pSnap, tSnap, sSnap] = await Promise.all([
        getDoc(doc(db, 'principals', user.uid)),
        getDoc(doc(db, 'teachers', user.uid)),
        getDoc(doc(db, 'users', user.uid))
      ]);

      if (pSnap.exists()) navigate('/principal-dashboard');
      else if (tSnap.exists()) navigate('/teacher-dashboard');
      else if (sSnap.exists()) {
        setStudentInfo(sSnap.data());
        navigate('/exam');
      } else {
        // NEW USER DETECTED
        setTempUser(user);
        setName(user.displayName?.split(' ')[0] || '');
        setShowProfileSetup(true);
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    }
  };

  // ─── AUTH LOGIC: FINALIZE PROFILE ──────────────────────────────────────
  const finalizeProfile = async (e) => {
    if (e) e.preventDefault();
    if (!school) {
      setError("Please specify your school to initialize your dashboard.");
      return;
    }

    const uid = tempUser ? tempUser.uid : auth.currentUser.uid;
    const finalEmail = tempUser ? tempUser.email : email;

    const metadata = {
      uid,
      name,
      surname,
      email: finalEmail,
      school,
      curriculum,
      role: userRole,
      updatedAt: new Date(),
      ...(userRole === 'teacher' ? { title, surname, subject } : {}),
      ...(userRole === 'principal' ? { title, surname, department: 'Administration' } : {}),
      ...(userRole === 'student' ? { grade } : {})
    };

    const collection = userRole === 'principal' ? 'principals' : (userRole === 'teacher' ? 'teachers' : 'users');

    try {
      await setDoc(doc(db, collection, uid), metadata, { merge: true });
      if (userRole === 'principal') navigate('/principal-dashboard');
      else if (userRole === 'teacher') navigate('/teacher-dashboard');
      else {
        setStudentInfo(metadata);
        navigate('/exam');
      }
    } catch (err) {
      setError("Error saving profile details.");
    }
  };

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await finalizeProfile();
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const [pSnap, tSnap] = await Promise.all([
          getDoc(doc(db, 'principals', cred.user.uid)),
          getDoc(doc(db, 'teachers', cred.user.uid))
        ]);
        if (pSnap.exists()) navigate('/principal-dashboard');
        else if (tSnap.exists()) navigate('/teacher-dashboard');
        else navigate('/exam');
      }
    } catch (err) { setError('Invalid credentials.'); }
  };

  return (
    <div className={`min-h-screen transition-all duration-700 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

      {/* Navigation */}
      <header className="p-6 flex justify-between items-center max-w-7xl mx-auto relative z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-2xl rotate-3">
            <BrainCircuit className="text-white w-7 h-7" />
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">EduCAT <span className="text-indigo-600 font-light not-italic">OS</span></span>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">
          Enter Portal
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center pt-24 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-200 dark:border-indigo-800 mb-8 animate-pulse">
          <Zap className="w-3 h-3 fill-current" /> Agentic AI v3.0 Live
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-8 max-w-6xl leading-[1.1] tracking-tight">
          The Future of <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-rose-500">Self-Directed Learning.</span>
        </h1>
        <p className="text-xl opacity-60 max-w-3xl mb-16 leading-relaxed">
          South Africa's first <b>Agentic AI</b> ecosystem for <b>CAPS, IEB, & SACAI</b>. We don't just host exams; we build active learning agents that guide every learner toward a Distinction.
        </p>

        {/* Agentic Learning Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl w-full pb-32">
          <div className="relative group p-10 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left transition-all hover:scale-[1.02] hover:shadow-2xl">
            <div className="absolute top-8 right-8 bg-indigo-600/10 text-indigo-600 p-2 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div className="mb-6 p-4 bg-indigo-600 text-white rounded-3xl w-fit shadow-lg shadow-indigo-200">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black mb-4">Agentic AI Tutor</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Not a chatbot—an <b>Agent</b>. It monitors your weak points in Mathematics or Physical Science and automatically generates a custom revision roadmap.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Proactive Support <div className="h-1 w-1 bg-indigo-600 rounded-full"></div> Real-time Analysis
            </div>
          </div>

          {/* Smart Exam Intelligence Card */}
          <div className="relative group p-10 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left transition-all hover:scale-[1.02] hover:shadow-2xl">
            <div className="mb-6 p-4 bg-purple-600 text-white rounded-3xl w-fit shadow-lg shadow-purple-200">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black mb-4">Precision Mastery</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Our AI predicts your final Grade 12 results by analyzing patterns in your CAPS, IEB & SACAI mock exams. Identify "Critical Success Zones" before you sit for finals.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase tracking-widest">
              Predictive Scoring <div className="h-1 w-1 bg-purple-600 rounded-full"></div> Pattern Recognition
            </div>
          </div>

          {/* Universal Content Card */}
          <div className="relative group p-10 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left transition-all hover:scale-[1.02] hover:shadow-2xl">
            <div className="mb-6 p-4 bg-emerald-600 text-white rounded-3xl w-fit shadow-lg shadow-emerald-200">
              <Library className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black mb-4">Omni-Subject Core</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              One unified logic for all <b>20+ DBE Subjects</b>. From Accounting to Life Sciences, every paper is indexed by AI to align with the latest 2026 ATP guidelines.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest">
              20+ Subjects <div className="h-1 w-1 bg-emerald-600 rounded-full"></div> ATP Aligned
            </div>
          </div>
        </div>
      </main>


      {/* Main Auth Modal */}
      {isModalOpen && !showProfileSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border border-slate-200 dark:border-slate-800">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-indigo-600"><X size={24} /></button>
            <h2 className="text-3xl font-black mb-2">{isRegistering ? 'Join Us' : 'Welcome'}</h2>
            <p className="text-slate-500 text-sm mb-8">Access South Africa's most powerful learning OS.</p>

            <form onSubmit={handlePasswordAuth} className="space-y-4">
              <input type="email" placeholder="Email" required className="w-full p-4 rounded-2xl border dark:bg-slate-800" onChange={(e) => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" required className="w-full p-4 rounded-2xl border dark:bg-slate-800" onChange={(e) => setPassword(e.target.value)} />
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">{isRegistering ? 'Create Account' : 'Sign In'}</button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t dark:border-slate-800"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-900 px-4 text-slate-400">Secure Entry</span></div>
            </div>

            <button onClick={handleGoogleLogin} className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" className="w-5 h-5" alt="Google" />
              <span className="font-bold">Continue with Google</span>
            </button>

            <p className="text-center mt-6 text-sm">
              <button onClick={() => setIsRegistering(!isRegistering)} className="text-indigo-600 font-bold underline">
                {isRegistering ? 'Switch to Login' : 'Need an account? Register'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Profile Customization Modal (First-time users) */}
      {showProfileSetup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-indigo-600/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-xl"><UserCheck className="text-indigo-600" /></div>
              <h2 className="text-2xl font-black">Initialize Your OS</h2>
            </div>

            <form onSubmit={finalizeProfile} className="space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4">
                {['student', 'teacher', 'principal'].map((role) => (
                  <button key={role} type="button" onClick={() => setUserRole(role)}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${userRole === role ? 'bg-white shadow-sm text-indigo-600' : 'opacity-40'}`}>
                    {role}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Name" value={name} className="p-4 rounded-2xl border dark:bg-slate-800" onChange={e => setName(e.target.value)} required />
                <input type="text" placeholder="Surname" className="p-4 rounded-2xl border dark:bg-slate-800" onChange={e => setSurname(e.target.value)} required />
              </div>

              <input type="text" placeholder="School Name" className="w-full p-4 rounded-2xl border dark:bg-slate-800" onChange={e => setSchool(e.target.value)} required />

              <div className="grid grid-cols-2 gap-3">
                <select value={curriculum} onChange={e => setCurriculum(e.target.value)} className="p-4 rounded-2xl border dark:bg-slate-800 font-bold text-indigo-600">
                  <option>CAPS</option><option>IEB</option><option>SACAI</option>
                </select>
                {userRole === 'student' ? (
                  <select className="p-4 rounded-2xl border dark:bg-slate-800" onChange={e => setGrade(e.target.value)} required>
                    <option value="">Grade</option>
                    {[10, 11, 12].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <input type="text" placeholder="Subject" className="p-4 rounded-2xl border dark:bg-slate-800" onChange={e => setSubject(e.target.value)} required />
                )}
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl mt-4 flex items-center justify-center gap-2">
                Initialize Dashboard <Zap size={20} className="fill-current" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}