import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { studentList } from '../data/studentData';
import { auth, provider, db } from '../utils/firebase';
import { X, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { signInAnonymously } from 'firebase/auth';

export default function PasswordPage({ setStudentInfo }) {
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  // Load saved theme or detect system preference
  useEffect(() => {
    const saved = localStorage.getItem('eduplanet-theme');
    if (saved) {
      setIsDarkMode(saved === 'dark');
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // Apply theme to body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('eduplanet-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('eduplanet-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const openModal = () => {
    setIsModalOpen(true);
    setError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setGrade('');
    setName('');
    setPassword('');
    setError('');
  };


const handlePasswordLogin = async () => {
  try {
    // 1. Sign in anonymously so Firebase Rules recognize the user
    await signInAnonymously(auth); 
    
    // 2. Then proceed with your logic
    if (password === `${name}#`) {
      setStudentInfo({ name, grade, email: null });
      navigate('/exam');
    }
  } catch (error) {
    setError("Auth failed");
  }
};

  const handleGoogleLogin = async () => {
    if (!grade || !name) {
      setError('Please select grade and name.');
      return;
    }
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      const studentId = `${grade}_${name}`;
      const studentRef = doc(db, 'students', studentId);
      const snapshot = await getDoc(studentRef);

      if (snapshot.exists() && snapshot.data().email !== email) {
        setError('This name is linked to another Google account.');
      } else {
        if (!snapshot.exists()) {
          await setDoc(studentRef, { name, grade, email });
        }
        setStudentInfo({ name, grade, email });
        closeModal();
        navigate('/exam');
      }
    } catch (err) {
      setError('Google sign-in failed. Try again.');
    }
  };

  return (
    <>
      {/* Tailwind Dark Mode + Background */}
      <div className={`min-h-screen bg-cover bg-center bg-fixed transition-all duration-500 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        style={!isDarkMode ? {
          backgroundImage: `url('https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&q=80')`,
        } : {}}
      >
        <div className="min-h-screen bg-black bg-opacity-40 dark:bg-black dark:bg-opacity-70 flex flex-col">

          {/* Top Bar: Theme Toggle + Start Button */}
          <header className="p-6 flex justify-between items-center z-10">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-yellow-400 shadow-lg hover:scale-110 transition-all duration-300"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            {/* Start Exam Button */}
            <button
              onClick={openModal}
              className="bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold px-8 py-4 rounded-full shadow-2xl hover:shadow-indigo-500/50 transform hover:scale-110 transition-all duration-300 text-lg flex items-center gap-3"
            >
              Start Exam
            </button>
          </header>

          {/* Hero */}
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <div className="max-w-4xl">
              <h1 className="text-5xl md:text-7xl font-extrabold text-white dark:text-gray-100 mb-6 drop-shadow-2xl">
                EduPlanet CAT Exams
              </h1>
              <p className="text-xl md:text-2xl text-gray-100 dark:text-gray-300 mb-12 font-light">
                Secure • Proctored • Trusted 
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { icon: "Lock", text: "Secure Login" },
                  { icon: "Eye", text: "Full Proctoring" },
                  { icon: "Trophy", text: "Instant Results" }
                ].map((item, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 bg-opacity-20 backdrop-blur-lg rounded-3xl p-8 border border-white dark:border-gray-700 border-opacity-30">
                    <div className="text-5xl mb-4">{item.icon}</div>
                    <p className="text-white dark:text-gray-200 font-bold text-xl">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-lg w-full p-10 relative overflow-hidden">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
            >
              <X size={32} />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Welcome Back!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">Sign in to begin your exam</p>
            </div>

            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setName('');
                setError('');
              }}
              className="w-full p-4 mb-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none text-lg text-gray-900 dark:text-gray-100"
            >
              <option value="">Select Your Grade</option>
              {Object.keys(studentList).map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>

            {grade && (
              <select
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                className="w-full p-4 mb-6 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none text-lg text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Your Name</option>
                {studentList[grade]?.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            )}

            {grade && name && (
              <>
                {['10', '11', '12'].includes(grade) ? (
                  <div className="space-y-5">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password (e.g. John#)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 pr-14 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none text-lg font-mono text-gray-900 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-4 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                      </button>
                    </div>

                    <button
                      onClick={handlePasswordLogin}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transform hover:scale-105 transition shadow-lg"
                    >
                      Sign In with Password
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transform hover:scale-105 transition shadow-lg flex items-center justify-center gap-3"
                  >
                    Sign In with Google
                  </button>
                )}
              </>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-8">
              Your exam session is fully secure and proctored
            </p>
          </div>
        </div>
      )}
    </>
  );
}