import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, provider, db } from '../utils/firebase';
import { X, Eye, EyeOff, Sun, Moon, GraduationCap, School } from 'lucide-react';
import { Sparkles, FileText, BarChart3 } from 'lucide-react';

export default function AuthPage({ setStudentInfo }) {
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form States
  const [email, setEmail] = useState(''); // Used as "Username" or actual email
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // --- Theme Logic ---
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

  // --- Auth Handlers ---

 const handleGoogleLogin = async () => {
  if (isRegistering && (!grade || !school)) {
    setError("Please enter your Grade and School before signing up with Google.");
    return;
  }

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (isRegistering) {
      // Always update or set info during the registration flow
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        grade: grade,
        school: school.trim(),
        updatedAt: new Date()
      }, { merge: true }); // Use merge: true to avoid overwriting other data
    }
    
    const finalData = snapshot.exists() ? snapshot.data() : { name: user.displayName, grade, school };
    setStudentInfo(finalData);
    navigate('/exam');
  } catch (err) {
    setError('Google Sign-in failed.');
  }
};

  const handlePasswordAuth = async (e) => {
  e.preventDefault();
  setError('');
  
  try {
    if (isRegistering) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Save the user profile including the custom school name
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        grade,
        school: school.trim(), // Storing the typed string
        email,
        role: 'student',
        createdAt: new Date()
      });
      
      setStudentInfo({ name, grade, school, email });
    } else {
       const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const snapshot = await getDoc(doc(db, 'users', userCredential.user.uid));
        setStudentInfo(snapshot.data());
    }
    navigate('/exam');
  } catch (err) {
    setError(err.message.includes('auth/user-not-found') ? 'User not found.' : 'Invalid credentials.');
  }
};

  return (
  <div className={`min-h-screen w-full transition-colors duration-500 flex flex-col ${
  isDarkMode 
    ? 'bg-gray-950 text-slate-100' 
    : 'bg-white text-gray-900'
}`}>
  {/* Unified Background Layer */}
  <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-700 ${
    isDarkMode ? 'opacity-10' : 'opacity-20'
  }`} 
    style={{ 
      backgroundImage: `url('https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      // In dark mode, we add a grayscale filter to keep it professional
      filter: isDarkMode ? 'grayscale(100%)' : 'none' 
    }} 
  />

      <header className="relative z-10 p-6 flex justify-between items-center">
        <button onClick={toggleTheme} className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg transition-transform hover:scale-110">
          {isDarkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-indigo-600" />}
        </button>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition shadow-xl">
          Get Started
        </button>
      </header>

{/* Landing Page Content */}
     <main className="relative z-10 flex flex-col items-center justify-center pt-20 pb-20 text-center px-4">
  {/* Hero Header */}
  <div className="max-w-4xl mb-16">
    <h1 className="text-6xl md:text-7xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 dark:from-indigo-400 dark:to-purple-400">
      EduCAT Portal
    </h1>
    <p className="text-xl md:text-2xl opacity-90 font-medium text-gray-700 dark:text-gray-300">
      Your personalized learning journey starts here.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      <span className="px-4 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-bold border border-indigo-200 dark:border-indigo-800">
        CAPS Aligned
      </span>
      <span className="px-4 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-bold border border-purple-200 dark:border-purple-800">
        IT & CAT
      </span>
    </div>
  </div>

  {/* Feature Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full">
    {[
      {
        title: "AI Tutoring",
        desc: "24/7 AI-powered assistance for complex IT & CAT concepts.",
        icon: <Sparkles className="text-amber-500" />,
        color: "hover:border-amber-500"
      },
      {
        title: "Mock Exams",
        desc: "AI-generated study mocks tailored to your exam preparation.",
        icon: <FileText className="text-blue-500" />,
        color: "hover:border-blue-500"
      },
      {
        title: "Weekly ATP Tests",
        desc: "Stay on track with timed revision tests following the ATP.",
        icon: <BarChart3 className="text-emerald-500" />,
        color: "hover:border-emerald-500"
      },
      {
        title: "Secure Portal",
        desc: "Official proctored environment for CAPS assessment.",
        icon: <School className="text-indigo-500" />,
        color: "hover:border-indigo-500"
      }
    ].map((feature, idx) => (
      <div 
        key={idx} 
        className={`p-6 rounded-3xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl ${feature.color}`}
      >
        <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-2xl w-fit shadow-sm">
          {feature.icon}
        </div>
        <h3 className="text-lg font-bold mb-2 dark:text-white">{feature.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {feature.desc}
        </p>
      </div>
    ))}
  </div>
</main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>

            <h2 className="text-3xl font-bold text-center mb-2">{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-center text-gray-500 mb-6 text-sm">
              {isRegistering ? 'Join our community' : 'Sign in to access your dashboard'}
            </p>

            <form onSubmit={handlePasswordAuth} className="space-y-4">
              {isRegistering && (
                <>
                  <input 
                    type="text" placeholder="Full Name" required
                    className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700"
                    onChange={(e) => setName(e.target.value)}
                  />
            <div className="flex gap-2">
            <select 
              className="w-1/3 p-3 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={grade}
              onChange={(e) => setGrade(e.target.value)} 
              required
            >
              <option value="">Grade</option>
              {[10, 11, 12].map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <div className="relative w-2/3">
              <School className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Your School Name"
                className="w-full p-3 pl-10 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={school}
                onChange={(e) => setSchool(e.target.value)} 
                required
              />
            </div>
          </div>
                </>
              )}

              <input 
                type="email" placeholder="Email Address" required
                className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700"
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} placeholder="Password" required
                  className="w-full p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                {isRegistering ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t dark:border-gray-700"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or continue with</span></div>
            </div>

                      <button 
              onClick={handleGoogleLogin}
              className="w-full py-3 border border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 bg-white dark:bg-transparent"
            >
              <img 
                src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" 
                className="w-5 h-5" 
                alt="Google" 
              />
              <span className="font-bold text-gray-700 dark:text-gray-200">
                Continue with Google
              </span>
            </button>

            <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
              {isRegistering ? "Already have an account?" : "Don't have an account?"}{' '}
              <button 
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="text-indigo-600 font-bold underline hover:text-indigo-500"
              >
                {isRegistering ? 'Sign in here' : 'Register here'}
              </button>
            </p>

            {error && <p className="mt-4 text-red-500 text-center text-sm font-medium">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}