// // ─── AuthPage.jsx ─────────────────────────────────────────────────────────────
// // Auto-fill strategy:
// //   • Google sign-in  → name, surname pre-filled from displayName
// //   • Email sign-up   → email pre-filled throughout
// //   • Role = teacher/student + school selection
// //                     → curriculum, province, district auto-inherited from school doc
// //   • Role = principal → on finalizeProfile, all collected data is forwarded
// //                        via navigation state to SchoolRegistration so those fields
// //                        never need re-entry (school name, province, district,
// //                        curriculum, principal title/name)
// //   • Any field that was auto-filled is visually tagged with a ✦ "Auto-filled" chip
// //     and is still editable.
// //
// // SchoolRegistration.jsx should read `location.state.seed` to pre-populate its form.
// //
// // ─── FIXES APPLIED ────────────────────────────────────────────────────────────
// //   1. Role doc reads are now SEQUENTIAL (not Promise.all) in both handleGoogleLogin
// //      and handlePasswordAuth — stops reading the moment the user's role doc is found,
// //      preventing permission errors on collections where the user has no document.
// //   2. finalizeProfile writes users/{uid} FIRST before the role collection doc,
// //      so security rule helpers (isTeacher, isPrincipal, sameSchool) can resolve
// //      userDoc() when evaluating the role doc write.
// //   3. ensureUserFirestoreDocs is called LAST, after both writes succeed.
// //   4. MIGRATION: Shifted environment completely from Google Drive API to native 
// //      Firebase Storage infrastructure for exam files and resources.

// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   signInWithPopup,
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   GoogleAuthProvider,
// } from 'firebase/auth';
// import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
// import { auth, db } from '../utils/firebase';
// import {
//   X, Zap, BrainCircuit, UserCheck, ArrowRight,
//   Sun, Moon, CheckCircle2, CloudLightning, Loader2,
//   Sparkles, ChevronDown,
// } from 'lucide-react';
// import { ensureUserFirestoreDocs } from '../utils/driveManager';
// import StepGuide from './StepGuide';
// import { fetchProvinces, fetchDistricts, fetchCountryCurriculumOptions, fetchLevels, fetchTeachingPhases, fetchSubjects } from '../utils/academicResolver';
// import { listSchools, getSchoolUserCount } from '../utils/firestoreHelpers';
// import { getTierConfig } from '../utils/tierConfig';



// // ─── AUTO-FILL TAG ────────────────────────────────────────────────────────────
// function AutoTag() {
//   return (
//     <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 select-none">
//       <Sparkles size={8} className="fill-current" /> Auto-filled
//     </span>
//   );
// }

// // ─── STORAGE BADGE ─────────────────────────────────────────────────────────────
// function StorageBadge({ status }) {
//   if (status === 'idle') return null;
//   if (status === 'linking') return (
//     <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
//       <Loader2 size={14} className="animate-spin text-indigo-500" />
//       <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">Allocating Storage Space…</span>
//     </div>
//   );
//   if (status === 'linked') return (
//     <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
//       <CheckCircle2 size={14} className="text-green-500" />
//       <span className="text-xs font-bold text-green-600 dark:text-green-300">Firebase Storage Active ✓</span>
//     </div>
//   );
//   if (status === 'failed') return (
//     <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
//       <CloudLightning size={14} className="text-amber-500" />
//       <span className="text-xs font-bold text-amber-600 dark:text-amber-300">Provisioning pending — retrying shortly</span>
//     </div>
//   );
//   return null;
// }

// // ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// export default function AuthPage({ setStudentInfo }) {
//   const navigate = useNavigate();

//   // ── UI ─────────────────────────────────────────────────────────────────────
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isRegistering, setIsRegistering] = useState(false);
//   const [isDarkMode, setIsDarkMode] = useState(false);
//   const [showProfileSetup, setShowProfileSetup] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [storageStatus, setStorageStatus] = useState('idle');
//   const [error, setError] = useState('');

//   // ── Auth ───────────────────────────────────────────────────────────────────
//   const [tempUser, setTempUser] = useState(null); // { uid, email }
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   // ── Profile fields ─────────────────────────────────────────────────────────
//   const [userRole, setUserRole] = useState('student');
//   const [name, setName] = useState('');
//   const [surname, setSurname] = useState('');
//   const [title, setTitle] = useState('Mr');
//   const [province, setProvince] = useState('Gauteng');
//   const [district, setDistrict] = useState('');
//   const [school, setSchool] = useState('');
//   const [curriculum, setCurriculum] = useState('CAPS');
//   const [grade, setGrade] = useState('');
//   const [teachingPhase, setTeachingPhase] = useState('FET');
//   const [subjects, setSubjects] = useState([]);


//   // ── Auto-fill tracking ─────────────────────────────────────────────────────
//   const [autoFilled, setAutoFilled] = useState({});
//   const markAuto = useCallback((fields) => {
//     setAutoFilled((prev) => {
//       const next = { ...prev };
//       fields.forEach((f) => { next[f] = true; });
//       return next;
//     });
//   }, []);
//   const clearAuto = useCallback((field) => {
//     setAutoFilled((prev) => ({ ...prev, [field]: false }));
//   }, []);

//   // ── School list ────────────────────────────────────────────────────────────
//   const [schoolList, setSchoolList] = useState([]);
//   const [selectedSchoolId, setSelectedSchoolId] = useState('');
//   const [schoolsLoading, setSchoolsLoading] = useState(false);

//   const [country, setCountry] = useState('South Africa');
//   const [availableCurricula, setAvailableCurricula] = useState(['CAPS']); // Default SA
//   const [isFetchingCurricula, setIsFetchingCurricula] = useState(false);
//   const [provinces, setProvinces] = useState([]);
//   const [isFetchingProvinces, setIsFetchingProvinces] = useState(false);
//   const [districts, setDistricts] = useState([]);
//   const [isFetchingDistricts, setIsFetchingDistricts] = useState(false);
//   const [levels, setLevels] = useState([]);
//   const [isFetchingLevels, setIsFetchingLevels] = useState(false);
//   const [teachingPhases, setTeachingPhases] = useState([]);
//   const [isFetchingPhases, setIsFetchingPhases] = useState(false);
//   const [subjectList, setSubjectList] = useState([]);
//   const [isFetchingSubjects, setIsFetchingSubjects] = useState(false);
//   const [countries, setCountries] = useState([]);
//   const [isFetchingCountries, setIsFetchingCountries] = useState(false);
//   const [showPassword, setShowPassword] = useState(true);




//   // Handle Country Change and curriculum and provinces 
//   const handleCountryChange = async (newCountry) => {
//     setCountry(newCountry);
//     setIsFetchingCurricula(true);
//     setIsFetchingProvinces(true);

//     try {
//       const [currOptions, provOptions] = await Promise.all([
//         fetchCountryCurriculumOptions(newCountry),
//         fetchProvinces(newCountry)
//       ]);

//       setAvailableCurricula(currOptions);
//       setProvinces(provOptions);
//       setCurriculum(currOptions[0] || '');
//       setProvince(provOptions[0] || '');
//     } catch (err) {
//       console.error("Failed to fetch regions", err);
//     } finally {
//       setIsFetchingCurricula(false);
//       setIsFetchingProvinces(false);
//     }
//   };

//   const toggleShowPassword = () => {
//     setShowPassword(!showPassword);
//   };
//   // Password validation helper

//   // Load countries in the dropdown list of all countries -  used in signup page when principal selects country
//   useEffect(() => {
//     const loadCountries = async () => {
//       setIsFetchingCountries(true);
//       try {
//         // Because it's in the public folder, this path works
//         const response = await fetch('/countries.json');
//         const data = await response.json();
//         setCountries(data);
//       } catch (err) {
//         console.error("Failed to load countries:", err);
//       } finally {
//         setIsFetchingCountries(false);
//       }
//     };
//     loadCountries();
//   }, []);

//   // Districts
//   useEffect(() => {
//     const loadDistricts = async () => {
//       if (province && country) {
//         setIsFetchingDistricts(true);
//         try {
//           const dOptions = await fetchDistricts(country, province);
//           setDistricts(dOptions);
//         } catch (err) {
//           console.error("Failed to fetch districts", err);
//         } finally {
//           setIsFetchingDistricts(false);
//         }
//       }
//     };
//     loadDistricts();
//   }, [province, country]);

//   // Academic Levels
//   useEffect(() => {
//     const loadLevels = async () => {
//       if (curriculum && country) {
//         setIsFetchingLevels(true);
//         try {
//           const lOptions = await fetchLevels(country, curriculum);
//           setLevels(lOptions);
//         } catch (err) {
//           console.error("Failed to fetch levels", err);
//         } finally {
//           setIsFetchingLevels(false);
//         }
//       }
//     };
//     loadLevels();
//   }, [curriculum, country]);

//   // Teaching Phases
//   useEffect(() => {
//     const loadPhases = async () => {
//       if (curriculum && country) {
//         setIsFetchingPhases(true);
//         try {
//           const pOptions = await fetchTeachingPhases(country, curriculum);
//           setTeachingPhases(pOptions);
//         } catch (err) {
//           console.error("Failed to fetch phases", err);
//         } finally {
//           setIsFetchingPhases(false);
//         }
//       }
//     };
//     loadPhases();
//   }, [curriculum, country]);

//   // Subjects
//   useEffect(() => {
//     const loadSubjects = async () => {
//       // Determine the phase based on role (student grade/level or teacher phase)
//       const activePhase = userRole === 'student' ? grade : teachingPhase;

//       if (activePhase && curriculum && country) {
//         setIsFetchingSubjects(true);
//         try {
//           const sOptions = await fetchSubjects(country, curriculum, activePhase);
//           setSubjectList(sOptions);
//         } catch (err) {
//           console.error("Failed to fetch subjects", err);
//         } finally {
//           setIsFetchingSubjects(false);
//         }
//       }
//     };
//     loadSubjects();
//   }, [grade, teachingPhase, curriculum, country, userRole]);

//   // ── Theme ──────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const saved = localStorage.getItem('eduplanet-theme');
//     const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
//     setIsDarkMode(isDark);
//     document.documentElement.classList.toggle('dark', isDark);
//   }, []);

//   const toggleTheme = () => {
//     const next = !isDarkMode;
//     setIsDarkMode(next);
//     localStorage.setItem('eduplanet-theme', next ? 'dark' : 'light');
//     document.documentElement.classList.toggle('dark', next);
//   };

//   // ── Load schools when profile setup opens ──────────────────────────────────
//   useEffect(() => {
//     if (showProfileSetup && (userRole === 'teacher' || userRole === 'student')) {
//       setSchoolsLoading(true);
//       listSchools()
//         .then((list) => {
//           setSchoolList(list);
//           if (list.length > 0) {
//             setSelectedSchoolId(list[0].id);
//             applySchoolAutoFill(list[0]);
//           }
//           setSchoolsLoading(false);
//         })
//         .catch(() => setSchoolsLoading(false));
//     }
//   }, [showProfileSetup, userRole]);

//   // ── Auto-fill from selected school ────────────────────────────────────────
//   const applySchoolAutoFill = useCallback((schoolDoc) => {
//     if (!schoolDoc) return;
//     const filled = [];
//     if (schoolDoc.province) { setProvince(schoolDoc.province); filled.push('province'); }
//     if (schoolDoc.district) { setDistrict(schoolDoc.district); filled.push('district'); }
//     if (schoolDoc.curricula?.[0]) { setCurriculum(schoolDoc.curricula[0]); filled.push('curriculum'); }
//     if (filled.length) markAuto(filled);
//   }, [markAuto]);

//   const handleSchoolSelect = useCallback((schoolId) => {
//     setSelectedSchoolId(schoolId);
//     const found = schoolList.find((s) => s.id === schoolId);
//     if (found) applySchoolAutoFill(found);
//   }, [schoolList, applySchoolAutoFill]);

//   // ── Firebase Storage Provisioning Helper ───────────────────────────────────
//   const silentlyProvisionStorage = useCallback(async (uid, schoolId, role) => {
//     try {
//       setStorageStatus('linking');

//       // Builds structured directories following security architecture
//       const storagePaths = {
//         root: `users/${uid}`,
//         exams: `users/${uid}/exams`,
//         memos: `users/${uid}/memos`,
//         submissions: role === 'student' ? `schools/${schoolId}/students/${uid}/submissions` : null,
//         resources: role === 'teacher' ? `schools/${schoolId}/teachers/${uid}/resources` : null
//       };

//       await setDoc(
//         doc(db, 'userStorageConfig', uid),
//         {
//           uid,
//           schoolId,
//           role,
//           storageProvider: 'FirebaseStorage',
//           bucketPath: `gs://chatbot-backend-educat.appspot.com/users/${uid}`,
//           paths: Object.fromEntries(Object.entries(storagePaths).filter(([_, v]) => v !== null)),
//           provisionedAt: new Date().toISOString(),
//           status: 'active'
//         },
//         { merge: true }
//       );
//       setStorageStatus('linked');
//     } catch (err) {
//       console.warn('[Storage] Allocation failed:', err.message);
//       setStorageStatus('failed');
//     }
//   }, []);

//   // ── Post-login routing ─────────────────────────────────────────────────────
//   const postLogin = useCallback(async ({ uid, role, data }) => {
//     await ensureUserFirestoreDocs(uid, role, data);
//     await silentlyProvisionStorage(uid, data.schoolId || 'unassigned', role);
//     if (role === 'student') { setStudentInfo(data); navigate('/exam'); }
//     else if (role === 'teacher') navigate('/teacher-dashboard');
//     else navigate('/principal-dashboard');
//   }, [navigate, setStudentInfo, silentlyProvisionStorage]);

//   // ── Sequential role doc reads — stops at first match ───────────────────────
//   const resolveUserRole = useCallback(async (uid) => {
//     const pSnap = await getDoc(doc(db, 'principals', uid));
//     if (pSnap.exists()) return { role: 'principal', data: pSnap.data() };

//     const tSnap = await getDoc(doc(db, 'teachers', uid));
//     if (tSnap.exists()) return { role: 'teacher', data: tSnap.data() };

//     const sSnap = await getDoc(doc(db, 'students', uid));
//     if (sSnap.exists()) return { role: 'student', data: sSnap.data() };

//     return null;
//   }, []);

//   // ── Google login ───────────────────────────────────────────────────────────
//   const handleGoogleLogin = async () => {
//     setError('');
//     try {
//       const provider = new GoogleAuthProvider();
//       provider.addScope('profile');
//       provider.addScope('email');

//       const result = await signInWithPopup(auth, provider);
//       const user = result.user;

//       if (user.displayName) {
//         const parts = user.displayName.split(' ');
//         setName(parts[0] || '');
//         setSurname(parts.slice(1).join(' ') || '');
//         markAuto(['name', 'surname']);
//       }

//       const found = await resolveUserRole(user.uid);
//       if (!found) {
//         setTempUser({ uid: user.uid, email: user.email });
//         setIsModalOpen(false);
//         setShowProfileSetup(true);
//       } else {
//         await postLogin({
//           uid: user.uid,
//           role: found.role,
//           data: found.data,
//         });
//       }
//     } catch (err) {
//       console.error(err);
//       setError(err.message);
//     }
//   };

//   // ── Email/password auth ────────────────────────────────────────────────────
//   const handlePasswordAuth = async (e) => {
//     e.preventDefault();
//     setError('');
//     try {
//       if (isRegistering) {
//         const cred = await createUserWithEmailAndPassword(auth, email, password);
//         setTempUser({ uid: cred.user.uid, email: cred.user.email });
//         setIsModalOpen(false);
//         setShowProfileSetup(true);
//       } else {
//         const cred = await signInWithEmailAndPassword(auth, email, password);
//         const uid = cred.user.uid;

//         const found = await resolveUserRole(uid);
//         if (found) {
//           await postLogin({ uid, role: found.role, data: found.data });
//         } else {
//           setTempUser({ uid, email, driveToken: null });
//           setIsModalOpen(false);
//           setShowProfileSetup(true);
//         }
//       }
//     } catch (err) {
//       console.error(err);
//       setError(isRegistering
//         ? 'Could not create account. Email may already be in use.'
//         : 'Invalid email or password.');
//     }
//   };

// // ── Finalize profile ───────────────────────────────────────────────────────
// const finalizeProfile = async (e) => {
//   if (e) e.preventDefault();

//   // ── Validation ──
//   if (!name.trim()) { setError('First name is required.'); return; }
//   if (userRole === 'principal' && !school.trim()) { setError('School name is required.'); return; }
//   if ((userRole === 'teacher' || userRole === 'student') && !selectedSchoolId) {
//     setError('Please select your school.'); return;
//   }
//   if (userRole === 'student' && !grade) { setError('Please select your grade.'); return; }
//   if (userRole === 'student' && subjects.length < 2) {
//     setError('Please select at least 2 subjects.'); return;
//   }

//   setIsSubmitting(true);
//   setError('');

//   const uid = tempUser?.uid || auth.currentUser?.uid;
//   const finalEmail = tempUser?.email || email;

//   // ── Data Resolution ──
//   const resolvedSchoolId = userRole === 'principal' ? uid : selectedSchoolId;
//   const selectedSchoolDoc = schoolList.find((s) => s.id === selectedSchoolId);

//   const resolvedSchool = userRole === 'principal' ? school.trim() : selectedSchoolDoc?.name || '';
//   const resolvedCurriculum = userRole === 'principal' ? curriculum : (selectedSchoolDoc?.curricula?.[0] || curriculum);
//   const resolvedProvince = userRole === 'principal' ? province : (selectedSchoolDoc?.province || province);
//   const resolvedDistrict = userRole === 'principal' ? district.trim() : (selectedSchoolDoc?.district || district.trim());

//   const baseProfile = {
//     uid,
//     name: name.trim(),
//     surname: surname.trim(),
//     email: finalEmail,
//     school: resolvedSchool,
//     schoolId: resolvedSchoolId,
//     province: resolvedProvince,
//     district: resolvedDistrict,
//     country: country,
//     role: userRole,
//     curriculum: resolvedCurriculum,
//     createdAt: serverTimestamp(),
//     updatedAt: new Date().toISOString(),
//   };

//   const roleData =
//     userRole === 'principal' ? { title, department: 'Administration' } :
//       userRole === 'teacher' ? { title, teachingPhase, subjects } :
//         { grade, subjects };

//   const fullProfile = { ...baseProfile, ...roleData };
//   const collectionName = userRole === 'principal' ? 'principals' : userRole === 'teacher' ? 'teachers' : 'students';

//   // ── Subscription Limit Validation ──
//   if (userRole !== 'principal' && selectedSchoolDoc) {
//     const tierConfig = getTierConfig(selectedSchoolDoc.tier || 'free');
//     const limits = tierConfig.limits || { teachers: 5, students: 50 };
//     const roleKey = userRole === 'teacher' ? 'teachers' : 'students';
//     const limit = limits[roleKey] || 50;

//     try {
//       const currentCount = await getSchoolUserCount(selectedSchoolId, userRole);
//       if (currentCount >= limit) {
//         setError(`This school is on the ${tierConfig.label} plan and has reached its limit for ${userRole}s (${limit} max).`);
//         setIsSubmitting(false);
//         return;
//       }
//     } catch (err) {
//       console.error("Count check failed:", err);
//     }
//   }

//   // ── Persistence ──
//   try {
//     await setDoc(doc(db, 'users', uid), {
//       uid,
//       email: finalEmail,
//       role: userRole,
//       schoolId: resolvedSchoolId,
//     }, { merge: true });

//     await setDoc(doc(db, collectionName, uid), fullProfile);
//     await silentlyProvisionStorage(uid, resolvedSchoolId, userRole);
//     await ensureUserFirestoreDocs(uid, userRole, fullProfile);

//     if (userRole === 'student') setStudentInfo(fullProfile);

//     if (userRole === 'principal') {
//       navigate('/school-registration', {
//         state: {
//           seed: {
//             name: school.trim(),
//             province,
//             district: district.trim(),
//             curricula: [curriculum],
//             country,
//             principalUid: uid,
//             principalTitle: title,
//             principalName: name.trim(),
//             principalSurname: surname.trim(),
//             principalEmail: finalEmail,
//             principalProfile: fullProfile,
//             tier: 'free',
//             limits: { teachers: 5, students: 50 }
//           },
//         },
//       });
//     } else {
//       navigate(userRole === 'teacher' ? '/teacher-dashboard' : '/exam');
//     }
//   } catch (err) {
//     console.error(err);
//     setError('Initialization failed. Please try again.');
//   } finally {
//     setIsSubmitting(false);
//   }
// };

//   // ── Subject toggle ─────────────────────────────────────────────────────────
//   const toggleSubject = (s) => {
//     setSubjects((prev) =>
//       prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
//     );
//   };

//   // Helper inside layout view for handling forms
//   const ErrorBox = ({ message, className = "" }) => (
//     <div className={`p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold ${className}`}>
//       ⚠️ {message}
//     </div>
//   );

//   const Divider = () => (
//     <div className="relative my-6 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-400 select-none">
//       <div className="absolute inset-x-0 h-px bg-slate-100 dark:bg-slate-800" />
//       <span className="relative bg-white dark:bg-slate-900 px-4">Or</span>
//     </div>
//   );

//   return (
//     <div className={`min-h-screen transition-all duration-700 relative overflow-hidden ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

//       {/* ── Header ── */}
//       <header className="mt-30 p-6 flex justify-between items-center max-w-7xl mx-auto relative z-20">

//         <div className="flex items-center gap-4">
//           <button onClick={toggleTheme} className="p-3 rounded-xl bg-white dark:bg-slate-900 border dark:border-slate-800 transition-transform active:scale-95">
//             {isDarkMode ? <Sun className="text-amber-400 w-5 h-5" /> : <Moon className="text-indigo-600 w-5 h-5" />}
//           </button>
//           <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors">
//             Portal Access
//           </button>
//         </div>
//       </header>

//       {/* ── Hero ── */}
//       <main className="relative z-10 flex flex-col items-center pt-12 px-4 text-center">

//         {/* Badge */}
//         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase border border-blue-200 dark:border-blue-800 mb-8 tracking-wide">
//           <Zap className="w-3 h-3 fill-current" /> Built for Africa. It just works
//         </div>

//         {/* Headline */}
//         <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1] tracking-tighter">
//           Smart marking.<br />
//           <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-rose-500">
//             Smart teaching.
//           </span>
//         </h1>

//         {/* Sub */}
//         <p className="text-lg md:text-xl opacity-70 max-w-2xl mb-10 leading-relaxed font-medium mx-auto">
//           <span className="text-indigo-600 dark:text-indigo-400 font-bold">Eduket OS</span>{' '}
//           turns any Word document into a fully marked, individually analysed assessment — in minutes.
//           Homework, class tests, practicals, exams. Every learner. Every subject. Any curriculum.
//         </p>

//         {/* CTAs */}
//         <div className="flex flex-wrap justify-center gap-3 mb-4">
//           <button
//             onClick={() => setIsModalOpen(true)}
//             className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors"
//           >
//             Start for free →
//           </button>

//           <a href="https://share.synthesia.io/9c45a63c-5bd7-4767-b288-a7938f9d7c5a"
//             target="_blank"
//             rel="noopener noreferrer"
//             className="px-7 py-3.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl font-black text-sm transition-colors"
//           >
//             Watch full video ↗
//           </a>
//         </div>
//         <p className="text-xs text-slate-400 mb-12">No credit card needed · 5 free assessments to start</p>

//         {/* Feature tags */}
//         <div className="flex flex-wrap justify-center gap-2 mb-12 text-xs">
//           {[
//             'Upload any Word doc',
//             'Auto-mark with memo',
//             'AI marks without memo',
//             'Timed exams & tests',
//             'Predict performance',
//             'Per-learner concept gaps',
//             'AI study coach',
//             'Any curriculum, anywhere',
//           ].map((tag) => (
//             <span
//               key={tag}
//               className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 font-medium"
//             >
//               {tag}
//             </span>
//           ))}
//         </div>

//         {/* ── VIDEO EMBED ───────────────────────────────────────────────────── */}
//         <div className="w-full max-w-4xl mb-16">

//           {/* Label */}
//           <div className="flex items-center justify-center gap-2 mb-4">
//             <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
//             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3">
//               See Eduket OS in action
//             </span>
//             <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
//           </div>

//           {/* Video container */}
//           <div className="relative rounded-[1.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-500/10 bg-slate-900">

//             {/* Thin accent line top */}
//             <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 via-purple-500 to-rose-500 z-10" />

//             {/* Iframe — 16:9 ratio */}
//             <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '1920/1080' }}>
//               <iframe
//                 src="https://share.synthesia.io/embeds/videos/9c45a63c-5bd7-4767-b288-a7938f9d7c5a"
//                 loading="lazy"
//                 title="Eduket OS — Smart learning for Africa"
//                 allowFullScreen
//                 allow="encrypted-media; fullscreen; microphone; screen-wake-lock;"
//                 style={{
//                   position: 'absolute',
//                   width: '100%',
//                   height: '100%',
//                   top: 0,
//                   left: 0,
//                   border: 'none',
//                   padding: 0,
//                   margin: 0,
//                   overflow: 'hidden',
//                 }}
//               />
//             </div>
//           </div>

//           {/* Caption under video */}
//           <p className="text-xs text-slate-400 mt-3 text-center">
//             3-minute introduction · AI in Education for Africa.
//           </p>
//         </div>
//         {/* ── END VIDEO ─────────────────────────────────────────────────────── */}

//         {/* How it works strip */}
//         <div className="w-full max-w-5xl mb-16">
//           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">How it works</p>
//           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
//             {[
//               { n: '01', title: 'Teacher uploads', body: 'Drop any assignment, test, exam or classwork — with or without a memo.' },
//               { n: '02', title: 'AI extracts', body: 'Questions are structured automatically.' },
//               { n: '03', title: 'Learner completes', body: 'Any device, any browser. Timed or open.' },
//               { n: '04', title: 'Instant marking', body: 'Partial credit, spelling forgiven, concept feedback.' },
//               { n: '05', title: 'Teacher sees all', body: 'Class overview, gaps, no data entry.' },
//               { n: '06', title: 'Learner improves', body: 'AI coach teaches the exact concepts missed.' },
//             ].map(({ n, title, body }) => (
//               <div key={n} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-left">
//                 <p className="text-[10px] font-black text-indigo-500 mb-2">{n}</p>
//                 <p className="text-xs font-black text-slate-800 dark:text-slate-100 mb-1">{title}</p>
//                 <p className="text-[11px] text-slate-400 leading-relaxed">{body}</p>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Bottom CTA */}
//         <div className="w-full max-w-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-[2rem] p-10 mb-8">
//           <p className="text-xs font-black text-green-600 dark:text-green-400 uppercase tracking-widest mb-3">
//             Focus on building learners, not on admin
//           </p>
//           <h2 className="text-2xl font-black mb-3 tracking-tighter">Every learner, seen. Every gap, closed.</h2>
//           <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
//             Real-time performance tracking, AI-predicted outcomes, and a personal study coach — on a simple computer, online.
//           </p>
//           <button
//             onClick={() => setIsModalOpen(true)}
//             className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors"
//           >
//             Start for free → no credit card needed
//           </button>
//         </div>

//         {/* Curriculum line */}
//         <p className="text-[11px] text-slate-400 pb-12">
//           CAPS · Cambridge · IEB · National Curriculum · ZIMSEC and many more
//         </p>

//       </main >

//       <StepGuide />

//       {/* ── AUTH MODAL ── */}
//       {
//         isModalOpen && !showProfileSetup && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
//             <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border border-slate-200 dark:border-slate-800">
//               <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500">
//                 <X size={24} />
//               </button>

//               <h2 className="text-3xl font-black mb-2">{isRegistering ? 'Join Us' : 'Welcome'}</h2>
//               <p className="text-slate-500 text-sm mb-8">
//                 {isRegistering
//                   ? 'Create an account to start your AI journey.'
//                   : "Access the world's most powerful learning OS."}
//               </p>

//               {error && <ErrorBox message={error} />}

//               <form onSubmit={handlePasswordAuth} className="space-y-4">
//                 <div>
//                   <label className="label-xs block mb-1.5 text-black">Email Address</label>
//                   <input
//                     type="email"
//                     placeholder="you@school.co.za"
//                     required
//                     value={email}
//                     className="input-f text-black"
//                     onChange={(e) => setEmail(e.target.value)}
//                   />
//                 </div>
//                 <div>
//                   <label className="label-xs block mb-1.5 text-black">Password</label>
//                   <input
//                     type={showPassword ? 'text' : 'password'}
//                     placeholder="••••••••"
//                     required
//                     value={password}
//                     className="input-f text-black"
//                     onChange={(e) => setPassword(e.target.value)}
//                     showPassword={showPassword}
//                     toggleShowPassword={toggleShowPassword}

//                   />
//                 </div>
//                 <button
//                   type="submit"
//                   disabled={isSubmitting}
//                   className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 uppercase tracking-widest text-xs disabled:opacity-50"
//                 >
//                   {isRegistering ? 'Create Account' : 'Sign In'}
//                 </button>
//               </form>

//               <Divider />

//               <button
//                 onClick={handleGoogleLogin}
//                 className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm"
//               >
//                 <img src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" className="w-5 h-5" alt="G" />
//                 Continue with Google
//               </button>

//               <p className="text-center mt-4 text-[10px] text-slate-400 leading-relaxed">
//                 🔒 Unified access automatically provisions cloud space for your papers and records safely.
//               </p>

//               <p className="text-center mt-5 text-sm font-medium">
//                 {isRegistering ? 'Already a member?' : 'New to Eduket?'}{' '}
//                 <button
//                   onClick={() => setIsRegistering(!isRegistering)}
//                   className="text-indigo-600 font-black hover:underline underline-offset-4"
//                 >
//                   {isRegistering ? 'Sign In Instead' : 'Register Now'}
//                 </button>
//               </p>
//             </div>
//           </div>
//         )
//       }

// {/* ── PROFILE SETUP MODAL ── */}
// {
//   showProfileSetup && (
//     <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-indigo-600/95 backdrop-blur-2xl overflow-y-auto">
//       <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl my-8">

//         <div className="flex items-start justify-between mb-6">
//           <div className="flex items-center gap-3">
//             <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl">
//               <UserCheck className="text-indigo-600 dark:text-indigo-400" />
//             </div>
//             <div>
//               <h2 className="text-2xl font-black">Initialize Your OS</h2>
//               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
//                 Complete your profile to access your dashboard
//               </p>
//             </div>
//           </div>
//           <StorageBadge status={storageStatus} />
//         </div>

//         {Object.values(autoFilled).some(Boolean) && (
//           <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
//             <Sparkles size={14} className="text-indigo-500 flex-shrink-0" />
//             <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
//               Some fields were auto-filled from your account or school — review and edit as needed.
//             </p>
//           </div>
//         )}

//         {error && <ErrorBox message={error} className="mb-5" />}

//         <form onSubmit={finalizeProfile} className="space-y-6">
//           <div>
//             <p className="label-xs">I am a…</p>
//             <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
//               {['student', 'teacher', 'principal'].map((role) => (
//                 <button
//                   key={role}
//                   type="button"
//                   onClick={() => setUserRole(role)}
//                   className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${userRole === role ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600' : 'opacity-40'}`}
//                 >
//                   {role === 'student' ? '🎓 Student' : role === 'teacher' ? '📚 Teacher' : '🏫 Principal'}
//                 </button>
//               ))}
//             </div>
//             {userRole === 'principal' && (
//               <p className="mt-2 text-[10px] text-indigo-500 font-bold">
//                 ℹ️ As a principal, your details will be carried forward — no need to re-enter in the next step.
//               </p>
//             )}
//           </div>

//           {/* country and curriculum */}
//           <div>
//             <label className="label-xs block mb-1.5">Country *</label>
//             <div className="relative">
//               <select
//                 value={country}
//                 onChange={(e) => handleCountryChange(e.target.value)}
//                 className="input-f appearance-none pr-10 text-black"
//                 disabled={isFetchingCountries}
//                 required
//               >
//                 {isFetchingCountries ? (
//                   <option>Loading countries...</option>
//                 ) : (
//                   <>
//                     <option value="">Select your country...</option>
//                     {countries.map((c) => (
//                       <option key={c} value={c}>{c}</option>
//                     ))}
//                   </>
//                 )}
//               </select>
//               <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
//             </div>
//           </div>

//           {(userRole === 'teacher' || userRole === 'principal') && (
//             <div>
//               <p className="label-xs">Title</p>
//               <div className="flex gap-2 flex-wrap">
//                 {['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'].map((t) => (
//                   <button
//                     key={t}
//                     type="button"
//                     onClick={() => setTitle(t)}
//                     className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${title === t ? 'bg-indigo-600 text-black border-indigo-600' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-indigo-400'}`}
//                   >
//                     {t}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           )}

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <div className="flex items-center gap-2 mb-1.5">
//                 <label className="label-xs">First Name *</label>
//                 {autoFilled.name && <AutoTag />}
//               </div>
//               <input
//                 type="text"
//                 value={name}
//                 placeholder="e.g. Thabo"
//                 required
//                 className="input-f text-black"
//                 onChange={(e) => { setName(e.target.value); clearAuto('name'); }}
//               />
//             </div>
//             <div>
//               <div className="flex items-center gap-2 mb-1.5">
//                 <label className="label-xs">Surname *</label>
//                 {autoFilled.surname && <AutoTag />}
//               </div>
//               <input
//                 type="text"
//                 value={surname}
//                 placeholder="e.g. Nkosi"
//                 required
//                 className="input-f text-black"
//                 onChange={(e) => { setSurname(e.target.value); clearAuto('surname'); }}
//               />
//             </div>
//           </div>

//           {userRole === 'principal' ? (
//             <div>
//               <label className="label-xs block mb-1.5">Your School Name *</label>
//               <input
//                 type="text"
//                 value={school}
//                 placeholder="e.g. Hoërskool Randburg"
//                 required
//                 className="input-f text-black"
//                 onChange={(e) => setSchool(e.target.value)}
//               />
//             </div>
//           ) : (
//             <div>
//               <label className="label-xs block mb-1.5">Select Your School *</label>
//               {schoolsLoading ? (
//                 <div className="input-f flex items-center gap-2 text-slate-400">
//                   <Loader2 size={14} className="animate-spin" /> Loading schools…
//                 </div>
//               ) : schoolList.length === 0 ? (
//                 <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold">
//                   No schools registered yet. Ask your principal to register the school first.
//                 </div>
//               ) : (
//                 <div className="relative">
//                   <select
//                     value={selectedSchoolId}
//                     onChange={(e) => handleSchoolSelect(e.target.value)}
//                     className="input-f text-black appearance-none pr-10"
//                   >
//                     {schoolList.map((s) => (
//                       <option key={s.id} value={s.id}>{s.name} — {s.province}</option>
//                     ))}
//                   </select>
//                   <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
//                 </div>
//               )}
//             </div>
//           )}



//           {userRole === 'student' && (
//             <div>
//               <label className="label-xs block mb-1.5">Grade / Academic Level *</label>
//               <div className="relative">
//                 <select
//                   value={grade}
//                   onChange={(e) => setGrade(e.target.value)}
//                   className="input-f text-black appearance-none pr-10"
//                   disabled={isFetchingLevels || levels.length === 0}
//                   required
//                 >
//                   {isFetchingLevels ? (
//                     <option>Loading levels...</option>
//                   ) : levels.length > 0 ? (
//                     <>
//                       <option value="">Select Level</option>
//                       {levels.map((l) => (
//                         <option key={l} value={l}>{l}</option>
//                       ))}
//                     </>
//                   ) : (
//                     <option value="">No levels available</option>
//                   )}
//                 </select>
//                 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
//               </div>
//             </div>
//           )}

//           {userRole === 'teacher' && (
//             <div>
//               <label className="label-xs block mb-1.5">Specialization / Phase *</label>
//               <div className="relative">
//                 <select
//                   value={teachingPhase}
//                   onChange={(e) => setTeachingPhase(e.target.value)}
//                   className="input-f text-black appearance-none pr-10"
//                   disabled={isFetchingPhases || teachingPhases.length === 0}
//                   required
//                 >
//                   {isFetchingPhases ? (
//                     <option>Loading specializations...</option>
//                   ) : teachingPhases.length > 0 ? (
//                     <>
//                       <option value="">Select Phase</option>
//                       {teachingPhases.map((p) => (
//                         <option key={p} value={p}>{p}</option>
//                       ))}
//                     </>
//                   ) : (
//                     <option value="">No phases available</option>
//                   )}
//                 </select>
//                 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
//               </div>
//             </div>
//           )}

//           {(userRole === 'student' || userRole === 'teacher') && (
//             <div>
//               <label className="label-xs block mb-2">
//                 {userRole === 'student' ? 'Registered Subjects' : 'Subjects Taught'} (Select at least 2) *
//               </label>

//               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
//                 {isFetchingSubjects ? (
//                   <div className="col-span-full flex items-center justify-center p-4 text-xs text-slate-400">
//                     <Loader2 size={14} className="animate-spin mr-2" /> Loading subjects...
//                   </div>
//                 ) : subjectList.length > 0 ? (
//                   subjectList.map((sub) => {
//                     const active = subjects.includes(sub);
//                     return (
//                       <button
//                         key={sub}
//                         type="button"
//                         onClick={() => toggleSubject(sub)}
//                         className={`p-2.5 text-left text-xs rounded-xl font-bold transition-all border ${active
//                           ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
//                           : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700/60 hover:border-slate-300'
//                           }`}
//                       >
//                         {active ? '✓ ' : ''}{sub}
//                       </button>
//                     );
//                   })
//                 ) : (
//                   <p className="col-span-full text-center text-xs text-slate-400 p-4">Select level to see subjects</p>
//                 )}
//               </div>
//             </div>
//           )}

//           <button
//             type="submit"
//             disabled={isSubmitting}
//             className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/10 uppercase tracking-widest text-xs disabled:opacity-50"
//           >
//             {isSubmitting ? (
//               <>
//                 <Loader2 size={16} className="animate-spin" /> Launching Core Environment...
//               </>
//             ) : (
//               <>
//                 Finalize Connection <ArrowRight size={14} />
//               </>
//             )}
//           </button>
//         </form>
//       </div>
//     </div>
//   )
// }
//     </div >
//   );
// }

/**
 * PasswordPage.jsx  — Eduket OS  v4  (complete)
 * ══════════════════════════════════════════════════════════════════════════════
 * Single-file landing page.  Every feature from v1–v3 is preserved here plus
 * all new additions from the latest sessions.
 *
 * FEATURES INCLUDED
 * ─────────────────
 * Original:
 *   ✓ Full auth modal  (email/password + Google sign-in)
 *   ✓ isRegistering toggle  (Sign in ↔ Register)
 *   ✓ showPassword eye toggle
 *   ✓ Firebase error → human-readable message
 *   ✓ Swal success/error feedback
 *   ✓ Student session → localStorage
 *   ✓ Video embed (Synthesia)
 *   ✓ Feature tags strip
 *   ✓ How-it-works 6-step grid
 *   ✓ Bottom CTA section
 *   ✓ Curriculum footer
 *
 * New in v4:
 *   ✓ Sticky navbar with scroll shadow
 *   ✓ ProfileChip dropdown  (avatar + name + role + school + sign-out)
 *   ✓ "Access Portal" button in navbar + hero
 *   ✓ Animated hero badge with live dot and glow ring
 *   ✓ reCAPTCHA v2 checkbox on email/password form
 *   ✓ reCAPTCHA v3 badge shown (not hidden)
 *   ✓ Security trust badges below hero CTAs
 *   ✓ Security banner + footer inside modal
 *   ✓ Mobile-first navbar with hamburger slide-down
 *   ✓ ProfileSetupWizard triggered after registration
 *   ✓ New-user detection  (Google + email/password)
 *   ✓ StepGuide enrollment section (Institution / Teacher / Student tracks)
 *   ✓ Stats row (0 papers / < 2 min / 100% / Any)
 *   ✓ Background gradient blobs on hero
 *
 * External deps used:
 *   react-google-recaptcha   →  npm install react-google-recaptcha
 *   firebase v9+, react-router-dom v6, lucide-react, sweetalert2
 *
 * Env vars required:
 *   VITE_RECAPTCHA_SITE_KEY      — v3  (App Check, invisible)
 *   VITE_RECAPTCHA_SITE_KEY_V2   — v2  (visible checkbox on auth form)
 *
 * Import this file in App.jsx exactly as before:
 *   import PasswordPage from './PasswordPage';
 *   <Route path="/" element={<PasswordPage setStudentInfo={setStudentInfo}
 *                                          userProfile={userProfile} />} />
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc,
  collection, query,
  where, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import ReCAPTCHA from 'react-google-recaptcha';
import Swal from 'sweetalert2';
import {
  Zap, ArrowRight, ArrowLeft, Shield, Lock, Eye, EyeOff,
  CheckCircle2, KeyRound, Menu, X as XIcon, LogOut,
  LayoutDashboard, GraduationCap, BookOpen, User,
  ChevronDown, Sparkles, Building2, Search,
} from 'lucide-react';
import { auth, db } from '../utils/firebase';
// import logoSrc from './img/eduket.png';
import { ProfileSetupWizard } from './ProfileSetupWizard';


// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const AUTH_ERRORS = {
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact your school admin.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/popup-closed-by-user': '',
  'auth/popup-blocked': 'Popup blocked. Please allow popups for this site.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};
const AUTH_DEFAULT_ERROR = 'Something went wrong. Please try again.';
const getFriendlyError = (code) => AUTH_ERRORS[code] ?? AUTH_DEFAULT_ERROR;


// ══════════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════════

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40
                    border border-red-100 dark:border-red-900
                    text-sm text-red-600 dark:text-red-400 font-medium mb-4">
      {message}
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200 dark:border-slate-700" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 font-medium">
          or continue with
        </span>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// PROFILE CHIP (navbar — signed-in users)
// ══════════════════════════════════════════════════════════════════════════════

const ROLE_CHIP = {
  teacher: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  student: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  principal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

function Avatar({ profile, size = 'md' }) {
  const initials = (profile?.displayName || profile?.name || profile?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return profile?.photoURL
    ? <img src={profile.photoURL} alt="avatar"
      className={`${sz} rounded-full object-cover ring-2 ring-indigo-400/30 flex-shrink-0`} />
    : <div className={`${sz} rounded-full bg-gradient-to-br from-indigo-500
                       to-purple-600 text-white font-black flex items-center
                       justify-center flex-shrink-0`}>
      {initials || <User size={14} />}
    </div>;
}

function ProfileChip({ profile, onDashboard, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const name = profile?.displayName || profile?.name || profile?.email?.split('@')[0] || 'User';
  const role = profile?.role || 'student';
  const school = profile?.schoolName || profile?.school || '';

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative z-50" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl
                   bg-white dark:bg-slate-800
                   border border-slate-200 dark:border-slate-700
                   hover:border-indigo-300 shadow-sm hover:shadow-md transition-all"
      >
        <Avatar profile={profile} size="sm" />
        <span className="hidden sm:block text-sm font-bold
                          text-slate-700 dark:text-slate-200 max-w-[110px] truncate">{name}</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72
                        bg-white dark:bg-slate-900
                        border border-slate-200 dark:border-slate-800
                        rounded-2xl shadow-2xl overflow-hidden
                        animate-in fade-in zoom-in-95 duration-150">

          <div className="flex items-center gap-3 p-4
                          border-b border-slate-100 dark:border-slate-800">
            <Avatar profile={profile} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-800 dark:text-white truncate">{name}</p>
              <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
              <span className={`inline-block mt-1.5 text-[10px] font-black
                                uppercase tracking-wider px-2 py-0.5 rounded-full
                                ${ROLE_CHIP[role] || ROLE_CHIP.student}`}>
                {role}
              </span>
            </div>
          </div>

          {school && (
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                Institution
              </p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{school}</p>
            </div>
          )}

          <div className="p-2">
            <button onClick={() => { setOpen(false); onDashboard?.(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                               text-sm font-bold text-slate-700 dark:text-slate-200
                               hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                               hover:text-indigo-600 transition-colors text-left">
              <LayoutDashboard size={15} /> Go to my dashboard
            </button>
            <button onClick={() => { setOpen(false); onSignOut?.(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                               text-sm font-bold text-slate-500 dark:text-slate-400
                               hover:bg-red-50 dark:hover:bg-red-900/30
                               hover:text-red-500 transition-colors text-left">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// STICKY NAVBAR
// ══════════════════════════════════════════════════════════════════════════════

function LandingNavbar({ profile, onOpenModal, onDashboard, onSignOut }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
      ? 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 border-b border-slate-200/60 dark:border-slate-800/60'
      : 'bg-transparent'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          {/* <img src={logoSrc} alt="Eduket OS"
            className="h-9 w-auto rounded-xl shadow-sm group-hover:scale-105
                          transition-transform duration-300 dark:invert dark:hue-rotate-180" />
          <span className="hidden sm:block text-lg font-black text-slate-800
                           dark:text-white tracking-tight">
            Eduket <span className="text-indigo-600">OS</span>
          </span> */}
        </a>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3">
          {profile
            ? <ProfileChip profile={profile} onDashboard={onDashboard} onSignOut={onSignOut} />
            : <>
              <button onClick={onOpenModal}
                className="text-sm font-bold text-slate-600 dark:text-slate-300
                                   hover:text-indigo-600 px-3 py-2 transition-colors">
                Sign up
              </button>
              <button onClick={onOpenModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl
                                   bg-indigo-600 hover:bg-indigo-500 text-white
                                   font-black text-sm shadow-lg shadow-indigo-500/30
                                   hover:-translate-y-0.5 transition-all">
                <KeyRound size={15} /> Access Portal
              </button>
            </>
          }
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(v => !v)}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300
                           hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {mobileOpen ? <XIcon size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile slide-down */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-slate-950
                        border-t border-slate-200 dark:border-slate-800
                        px-4 py-4 space-y-3 shadow-lg">
          {profile
            ? <>
              <div className="flex items-center gap-3 p-3
                                bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <Avatar profile={profile} size="sm" />
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-white">
                    {profile?.displayName || profile?.name}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
                </div>
              </div>
              <button onClick={() => { setMobileOpen(false); onDashboard(); }}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600
                                   text-white font-black text-sm">
                Go to Dashboard
              </button>
              <button onClick={() => { setMobileOpen(false); onSignOut(); }}
                className="w-full py-3 px-4 rounded-2xl border border-slate-200
                                   dark:border-slate-700 text-slate-600 dark:text-slate-300
                                   font-bold text-sm">
                Sign out
              </button>
            </>
            : <>
              <button onClick={() => { setMobileOpen(false); onOpenModal(); }}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 text-white
                                   font-black text-sm flex items-center justify-center gap-2">
                <KeyRound size={15} /> Access Portal
              </button>
              <button onClick={() => { setMobileOpen(false); onOpenModal(); }}
                className="w-full py-3 px-4 rounded-2xl border border-slate-200
                                   dark:border-slate-700 text-slate-600 dark:text-slate-300
                                   font-bold text-sm">
                Sign in
              </button>
            </>
          }
        </div>
      )}
    </header>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// AUTH MODAL  (email/password + Google + reCAPTCHA v2)
// ══════════════════════════════════════════════════════════════════════════════

function AuthModal({ isOpen, onClose, onSuccess, onNeedsSetup, setStudentInfo }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const captchaRef = useRef(null);

  const resetForm = useCallback(() => {
    setEmail(''); setPassword(''); setError('');
    setCaptchaToken(null); captchaRef.current?.reset();
  }, []);

  const handleClose = () => { resetForm(); onClose(); };

  const toggleMode = () => { setIsRegistering(v => !v); setError(''); };

  // Load profile from Firestore and route existing user
  const routeExistingUser = async (uid) => {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) { onNeedsSetup?.(uid, email); return; }
    const { role, schoolId } = userSnap.data();
    const col = role === 'principal' ? 'principals' : role === 'teacher' ? 'teachers' : 'students';
    const profSnap = await getDoc(doc(db, col, uid));
    const profile = profSnap.exists()
      ? { ...profSnap.data(), role, schoolId, uid }
      : { role, schoolId, uid };
    if (role === 'student') {
      setStudentInfo?.(profile);
      localStorage.setItem('user-session', JSON.stringify(profile));
    }
    resetForm();
    onSuccess?.(profile);
  };

  // Email / password submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!captchaToken) { setError('Please complete the security check first.'); return; }
    setIsSubmitting(true); setError('');
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        resetForm(); onClose();
        onNeedsSetup?.(cred.user.uid, cred.user.email);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await routeExistingUser(cred.user.uid);
      }
    } catch (err) {
      const msg = getFriendlyError(err.code);
      if (msg) setError(msg);
      setCaptchaToken(null); captchaRef.current?.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google sign-in
  const handleGoogle = async () => {
    setError(''); setIsSubmitting(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const uid = cred.user.uid;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        await routeExistingUser(uid);
      } else {
        resetForm(); onClose();
        onNeedsSetup?.(uid, cred.user.email);
      }
    } catch (err) {
      const msg = getFriendlyError(err.code);
      if (msg) setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4
                    bg-slate-900/80 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div role="dialog" aria-modal="true"
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem]
                      p-8 sm:p-10 shadow-2xl relative
                      border border-slate-200 dark:border-slate-800
                      max-h-[90vh] overflow-y-auto
                      animate-in zoom-in-95 duration-200">

        {/* Close */}
        <button onClick={handleClose} aria-label="Close"
          className="absolute top-5 right-5 p-1.5 text-slate-400
                           hover:text-rose-500 transition-colors rounded-lg
                           hover:bg-red-50 dark:hover:bg-red-900/20">
          <XIcon size={20} />
        </button>

        {/* Security banner */}
        <div className="flex items-center justify-center gap-2 mb-6 py-2.5 px-4
                        rounded-xl bg-green-50 dark:bg-green-950/40
                        border border-green-100 dark:border-green-900">
          <Shield size={14} className="text-green-600 dark:text-green-400" />
          <span className="text-xs font-bold text-green-700 dark:text-green-300">
            Protected by Firebase + reCAPTCHA
          </span>
          <Lock size={12} className="text-green-500" />
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black mb-1 dark:text-white">
          {isRegistering ? 'Create account' : 'Welcome back'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-7">
          {isRegistering
            ? 'Join Eduket OS to get started.'
            : 'Access your school dashboard securely.'}
        </p>

        <ErrorBox message={error} />

        {/* Email / password form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>

          <div>
            <label htmlFor="auth-email"
              className="block text-xs font-black uppercase tracking-widest
                              text-slate-500 dark:text-slate-400 mb-1.5">
              Email address
            </label>
            <input id="auth-email" type="email" autoComplete="email"
              placeholder="you@school.co.za" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-slate-200 dark:border-slate-700
                              dark:bg-slate-800 dark:text-white p-4 rounded-2xl
                              outline-none text-sm focus:border-indigo-500 transition-colors" />
          </div>

          <div>
            <label htmlFor="auth-password"
              className="block text-xs font-black uppercase tracking-widest
                              text-slate-500 dark:text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                placeholder="••••••••" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-slate-200 dark:border-slate-700
                                dark:bg-slate-800 dark:text-white p-4 pr-12 rounded-2xl
                                outline-none text-sm focus:border-indigo-500 transition-colors" />
              <button type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2
                                 text-slate-400 hover:text-slate-600 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* reCAPTCHA v2 — visible security check */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest
                               text-slate-500 dark:text-slate-400 mb-2">
              Security check
            </label>
            <div className="border-2 border-slate-200 dark:border-slate-700
                            rounded-2xl p-3 flex items-center justify-center
                            bg-slate-50 dark:bg-slate-800/50">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY_V2}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
                onErrored={() => setCaptchaToken(null)}
                theme="light"
              />
            </div>
            <p className={`mt-1.5 text-[11px] text-center ${captchaToken
              ? 'text-green-600 dark:text-green-400'
              : 'text-slate-400'
              }`}>
              {captchaToken ? '✓ Security check passed' : 'Verify you are human to continue.'}
            </p>
          </div>

          {/* Submit */}
          <button type="submit"
            disabled={!captchaToken || isSubmitting}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase
                             tracking-widest transition-all shadow-lg
                             bg-indigo-600 hover:bg-indigo-500 text-white
                             shadow-indigo-500/20
                             disabled:bg-slate-200 dark:disabled:bg-slate-700
                             disabled:text-slate-400 disabled:shadow-none
                             disabled:cursor-not-allowed">
            {isSubmitting ? 'Please wait…'
              : !captchaToken ? 'Complete security check first'
                : isRegistering ? 'Create account'
                  : 'Sign in'}
          </button>
        </form>

        <Divider />

        {/* Google button */}
        <button type="button" onClick={handleGoogle} disabled={isSubmitting}
          className="w-full py-4 border-2 border-slate-100 dark:border-slate-800
                           hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl
                           flex items-center justify-center gap-3 transition-all
                           font-bold text-sm dark:text-white disabled:opacity-50">
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png"
            className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>

        {/* reCAPTCHA policy footer — required by Google ToS */}
        <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50
                        border border-slate-100 dark:border-slate-800">
          <p className="text-center text-[10px] text-slate-400 leading-relaxed">
            Protected by reCAPTCHA ·{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-indigo-500">Privacy</a>{' '}
            &{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-indigo-500">Terms</a>{' '}
            apply. Data encrypted on Firebase.
          </p>
        </div>

        {/* Toggle register / sign-in */}
        <p className="text-center mt-5 text-sm font-medium dark:text-slate-300">
          {isRegistering ? 'Already have an account?' : 'New to Eduket?'}{' '}
          <button type="button" onClick={toggleMode}
            className="text-indigo-600 font-black hover:underline underline-offset-4">
            {isRegistering ? 'Sign in instead' : 'Register now'}
          </button>
        </p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE SECTIONS
// ══════════════════════════════════════════════════════════════════════════════

// ── Animated hero badge ────────────────────────────────────────────────────
function HeroBadge() {
  return (
    <div className="relative mb-8 inline-flex items-center">
      <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
      <div className="relative flex items-center gap-2.5 px-5 py-2.5 rounded-full
                      bg-white dark:bg-slate-900
                      border border-indigo-200 dark:border-indigo-800
                      shadow-lg shadow-indigo-500/10">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full
                           rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <Zap size={14} className="text-indigo-600 fill-current" />
        <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200">
          Africa's first AI-powered school OS
        </span>
        <span className="hidden sm:flex items-center gap-1 text-[10px] font-black
                         uppercase tracking-wider px-2 py-0.5 rounded-full
                         bg-indigo-100 text-indigo-700
                         dark:bg-indigo-900/60 dark:text-indigo-300">
          <Sparkles size={9} /> Live
        </span>
      </div>
    </div>
  );
}

// ── Security trust badges (landing page) ──────────────────────────────────
function SecurityBadges() {
  const items = [
    { icon: Shield, label: 'reCAPTCHA protected' },
    { icon: Lock, label: 'Firebase encrypted' },
    { icon: Eye, label: 'POPIA compliant' },
    { icon: CheckCircle2, label: 'No credit card' },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {items.map(({ icon: Icon, label }) => (
        <div key={label}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                        text-[11px] sm:text-xs font-bold
                        bg-white/80 dark:bg-slate-900/80
                        border border-slate-200 dark:border-slate-800
                        text-slate-600 dark:text-slate-400
                        shadow-sm backdrop-blur-sm">
          <Icon size={12} className="text-green-500" />
          {label}
        </div>
      ))}
    </div>
  );
}

// ── Hero section ────────────────────────────────────────────────────────────
function HeroSection({ onOpenModal }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center
                        justify-center text-center px-4 pt-24 pb-16">
      {/* Gradient blobs */}
      <div aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] rounded-full
                        bg-indigo-500/8 dark:bg-indigo-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full
                        bg-purple-500/6 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full
                        bg-rose-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl w-full">
        <HeroBadge />

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black
                       leading-[1.05] tracking-tighter mb-6
                       text-slate-900 dark:text-white">
          Stop marking.<br />
          <span className="text-transparent bg-clip-text
                           bg-gradient-to-r from-indigo-600 via-purple-500 to-rose-500">
            Start teaching.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-500 dark:text-slate-400
                      max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Eduket OS</span>{' '}
          turns any Word document into a fully marked, individually analysed
          assessment — in minutes. Homework, class tests, practicals, exams.
          Every learner. Every subject. Any curriculum.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center
                        justify-center gap-3 mb-8">
          <button onClick={onOpenModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2
                             px-8 py-4 rounded-2xl font-black text-sm text-white
                             bg-indigo-600 hover:bg-indigo-500
                             shadow-xl shadow-indigo-500/30 hover:-translate-y-0.5
                             transition-all">
            Start for free <ArrowRight size={16} />
          </button>

          <button onClick={onOpenModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2
                             px-8 py-4 rounded-2xl font-black text-sm
                             text-slate-700 dark:text-slate-200
                             bg-white dark:bg-slate-900
                             border-2 border-slate-200 dark:border-slate-700
                             hover:border-indigo-400 hover:-translate-y-0.5
                             shadow-lg transition-all">
            <KeyRound size={15} className="text-indigo-600" /> Access Portal
          </button>

          <a href="https://share.synthesia.io/9c45a63c-5bd7-4767-b288-a7938f9d7c5a"
            target="_blank" rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-1
                        px-5 py-4 rounded-2xl font-black text-sm
                        text-slate-500 dark:text-slate-400
                        hover:text-indigo-600 transition-colors">
            Watch demo ↗
          </a>
        </div>

        <SecurityBadges />
      </div>
    </section>
  );
}

// ── Feature tags strip ──────────────────────────────────────────────────────
function FeatureStrip() {
  const tags = [
    'Upload any Word doc', 'Auto-mark with memo', 'AI marks without memo',
    'Timed exams and tests', 'Predict performance', 'Per-learner concept gaps',
    'AI study coach', 'Any curriculum, anywhere',
  ];
  return (
    <section className="py-6 px-4 bg-slate-50 dark:bg-slate-900/50
                        border-y border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-2">
        {tags.map(t => (
          <span key={t}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                           text-xs font-bold
                           bg-white dark:bg-slate-900
                           border border-slate-200 dark:border-slate-800
                           text-slate-600 dark:text-slate-400 shadow-sm">
            <CheckCircle2 size={11} className="text-indigo-500" />
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Video section ───────────────────────────────────────────────────────────
function VideoSection({ onOpenModal }) {
  return (
    <section className="py-16 sm:py-24 px-4 bg-white dark:bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            See it in action
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>

        <div className="relative rounded-2xl sm:rounded-[2rem] overflow-hidden
                        border border-slate-200 dark:border-slate-800
                        shadow-2xl shadow-indigo-500/10 bg-slate-900">
          <div className="absolute top-0 left-0 right-0 h-1 z-10
                          bg-gradient-to-r from-indigo-600 via-purple-500 to-rose-500" />
          <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '1920/1080' }}>
            <iframe
              src="https://share.synthesia.io/embeds/videos/9c45a63c-5bd7-4767-b288-a7938f9d7c5a"
              loading="lazy"
              title="Eduket OS — Smart learning for Africa"
              allowFullScreen
              allow="encrypted-media; fullscreen; microphone; screen-wake-lock;"
              style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, border: 'none' }}
            />
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3 text-center">
          3-minute introduction · Teacher uploads, student completes, results appear instantly
        </p>

        <div className="flex justify-center mt-8">
          <button onClick={onOpenModal}
            className="flex items-center gap-2 px-7 py-3.5 rounded-2xl
                             bg-indigo-600 hover:bg-indigo-500 text-white
                             font-black text-sm shadow-lg shadow-indigo-500/25
                             hover:-translate-y-0.5 transition-all">
            <KeyRound size={15} /> Access Portal
          </button>
        </div>
      </div>
    </section>
  );
}

// ── How it works ────────────────────────────────────────────────────────────
function HowItWorksSection({ onOpenModal }) {
  const steps = [
    { n: '01', title: 'Institution registers', body: 'School signs up in 5 minutes. Google account only — no passwords, no IT.' },
    { n: '02', title: 'Teacher uploads', body: 'Drop any Word document. With or without a marking memo.' },
    { n: '03', title: 'AI extracts', body: 'Questions, diagrams, equations, and tables structured automatically.' },
    { n: '04', title: 'Learner completes', body: 'Any device, any browser. Timed or open. All question types supported.' },
    { n: '05', title: 'Instant marking', body: 'Partial credit. Spelling forgiven. Concept-level feedback per question.' },
    { n: '06', title: 'Everyone sees results', body: 'Student: gaps + study plan. Teacher: class overview. Principal: school trends.' },
  ];

  const stats = [
    { value: '0', label: 'Papers to carry home' },
    { value: '< 2min', label: 'From upload to questions' },
    { value: '100%', label: 'Learners get feedback' },
    { value: 'Any', label: 'Curriculum supported' },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[10px] font-black uppercase tracking-widest
                           text-indigo-500 dark:text-indigo-400 block mb-3">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900
                         dark:text-white tracking-tighter">
            From upload to results
            <span className="text-transparent bg-clip-text bg-gradient-to-r
                             from-indigo-600 to-purple-500">
              {' '}in under ten minutes.
            </span>
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {steps.map(({ n, title, body }) => (
            <div key={n}
              className="bg-white dark:bg-slate-900
                            border border-slate-200 dark:border-slate-800
                            rounded-2xl p-6 hover:border-indigo-300
                            dark:hover:border-indigo-700 hover:shadow-lg
                            transition-all group">
              <p className="text-xs font-black text-indigo-500 mb-2">{n}</p>
              <p className="text-base font-black text-slate-800 dark:text-white mb-2">{title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {stats.map(({ value, label }) => (
            <div key={label}
              className="bg-white dark:bg-slate-900
                            border border-slate-200 dark:border-slate-800
                            rounded-2xl p-5 text-center">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">
                {value}
              </p>
              <p className="text-xs text-slate-400 leading-snug">{label}</p>
            </div>
          ))}
        </div>

        {/* Inline CTA banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6
                        bg-gradient-to-br from-indigo-600 to-purple-700
                        rounded-2xl sm:rounded-[2rem] p-8 sm:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-2">
              Ready to get started?
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
              Your school's AI assistant is waiting.
            </h3>
            <p className="text-sm text-indigo-200 max-w-sm">
              5 free assessments. No credit card. No IT setup.
            </p>
          </div>
          <div className="flex-shrink-0">
            <button onClick={onOpenModal}
              className="flex items-center justify-center gap-2 px-8 py-3.5
                               rounded-2xl bg-white text-indigo-700 font-black text-sm
                               hover:bg-indigo-50 shadow-xl hover:-translate-y-0.5 transition-all">
              <KeyRound size={15} /> Access Portal
            </button>
            <p className="text-[10px] text-indigo-300 text-center mt-2">
              Free · Google sign-in only
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Enrollment step guide ───────────────────────────────────────────────────
function EnrollmentSection({ onOpenModal }) {
  const tracks = [
    {
      icon: Building2,
      role: 'Institution',
      color: 'indigo',
      tagline: 'Register once. Your whole school is ready.',
      steps: [
        { action: 'Register your institution', detail: 'Click "Access Portal", enter your school name and country. Takes 2 minutes.' },
        { action: 'Enable Google Sign-In', detail: 'No passwords. Teachers and students sign in with their Google accounts automatically.' },
        { action: 'Choose your plan', detail: 'Start free with 5 assessments. Upgrade when your school is ready.' },
      ],
      cta: 'Register your institution',
    },
    {
      icon: BookOpen,
      role: 'Teacher',
      color: 'violet',
      tagline: 'Upload a Word doc. Everything else is handled.',
      steps: [
        { action: 'Sign in and select subjects', detail: 'Log in with Google, pick your subjects. Dashboard ready instantly.' },
        { action: 'Upload your exam', detail: 'Drop any Word document — with or without a marking memo.' },
        { action: 'Review results in real time', detail: 'See every learner\'s results, concept gaps, and trends as they submit.' },
      ],
      cta: 'Start as a teacher',
    },
    {
      icon: GraduationCap,
      role: 'Student',
      color: 'emerald',
      tagline: "Sign in, attempt, improve. That's it.",
      steps: [
        { action: 'Sign in with Google', detail: 'No account setup. Use your school Google account — you\'re in.' },
        { action: 'Start an available exam', detail: 'Pick from your active assessments. Timer starts when you begin.' },
        { action: 'Get instant feedback', detail: 'Results and concept gaps appear within a minute of submitting.' },
      ],
      cta: 'Start as a student',
    },
  ];

  const colors = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-100 dark:border-indigo-900', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300', icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400', num: 'bg-indigo-600 text-white', line: 'bg-indigo-200 dark:bg-indigo-800', cta: 'bg-indigo-600 hover:bg-indigo-500 text-white' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-100 dark:border-violet-900', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300', icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900/60 dark:text-violet-400', num: 'bg-violet-600 text-white', line: 'bg-violet-200 dark:bg-violet-800', cta: 'bg-violet-600 hover:bg-violet-500 text-white' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-100 dark:border-emerald-900', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300', icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400', num: 'bg-emerald-600 text-white', line: 'bg-emerald-200 dark:bg-emerald-800', cta: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
  };

  return (
    <section className="py-16 sm:py-24 px-4 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-[10px] font-black uppercase tracking-widest
                           text-indigo-500 dark:text-indigo-400 block mb-3">
            Get started
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900
                         dark:text-white tracking-tighter">
            Enrol and run your first exam
            <span className="text-transparent bg-clip-text bg-gradient-to-r
                             from-indigo-600 via-violet-500 to-emerald-500">
              {' '}in under ten minutes.
            </span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-lg mx-auto">
            Three paths — one for your institution, one for teachers, one for students.
            Follow the steps for your role and you're live.
          </p>
        </div>

        {/* Quick facts */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['Free to start', 'No IT setup', 'Google Sign-In only',
            'Any device, any browser', 'Results in under a minute'].map(l => (
              <span key={l} className="flex items-center gap-1.5 text-xs font-bold
                                      text-slate-600 dark:text-slate-400
                                      bg-white dark:bg-slate-900
                                      border border-slate-200 dark:border-slate-800
                                      px-3 py-1.5 rounded-full">
                <CheckCircle2 size={12} className="text-emerald-500" />
                {l}
              </span>
            ))}
        </div>

        {/* Track cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {tracks.map((t) => {
            const c = colors[t.color];
            const Icon = t.icon;
            return (
              <div key={t.role}
                className={`rounded-[2rem] border ${c.border} ${c.bg} p-7 flex flex-col`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest
                                    px-3 py-1 rounded-full ${c.badge}`}>
                    {t.role}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white mb-5 leading-snug">
                  {t.tagline}
                </p>
                <div className="flex-1 mb-6">
                  {t.steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center
                                         text-[11px] font-black flex-shrink-0 ${c.num}`}>
                          {i + 1}
                        </div>
                        {i < t.steps.length - 1 && (
                          <div className={`w-px flex-1 min-h-[16px] my-1 ${c.line}`} />
                        )}
                      </div>
                      <div style={{ paddingBottom: i < t.steps.length - 1 ? 14 : 0 }}>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">
                          {step.action}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={onOpenModal}
                  className={`inline-flex items-center justify-center gap-2
                                    w-full py-3.5 rounded-2xl font-black text-sm
                                    shadow-lg transition-all hover:-translate-y-0.5 ${c.cta}`}>
                  {t.cta} <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-slate-400">
          Institution registers first — teachers and students join under it.
        </p>
      </div>
    </section>
  );
}

// ── Bottom CTA ──────────────────────────────────────────────────────────────
function BottomCTA({ onOpenModal }) {
  return (
    <section className="py-16 sm:py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-2xl mx-auto text-center">
        <span className="text-[10px] font-black uppercase tracking-widest
                         text-green-600 dark:text-green-400 block mb-4">
          Focus on building learners, not on admin
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900
                       dark:text-white tracking-tighter mb-4">
          Every learner, seen.<br />
          <span className="text-transparent bg-clip-text
                           bg-gradient-to-r from-indigo-600 to-purple-500">
            Every gap, closed.
          </span>
        </h2>
        <p className="text-base text-slate-500 dark:text-slate-400 mb-10
                      max-w-md mx-auto leading-relaxed">
          Real-time performance tracking, AI-predicted outcomes, and a personal
          study coach — on a simple computer, online. All learner inclusive.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={onOpenModal}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl
                             bg-indigo-600 hover:bg-indigo-500 text-white
                             font-black text-sm shadow-xl shadow-indigo-500/30
                             hover:-translate-y-0.5 transition-all">
            Start for free →
          </button>
          <button onClick={onOpenModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2
                             px-8 py-4 rounded-2xl border-2 border-slate-200
                             dark:border-slate-700 text-slate-700 dark:text-slate-200
                             font-black text-sm hover:border-indigo-400 transition-all">
            <KeyRound size={15} className="text-indigo-600" /> Access Portal
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer className="bg-white dark:bg-slate-950
                       border-t border-slate-200 dark:border-slate-800 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-xs text-slate-400 mb-4 font-medium">
          CAPS · SACAI · Cambridge · IEB · National Curriculum and more
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-between
                        gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Eduket OS · Nextgen Skills Development
          </p>
          <div className="flex items-center gap-4">
            <a href="/privacy"
              className="text-xs text-slate-400 hover:text-indigo-500 transition-colors">
              Privacy Policy
            </a>
            <a href="/terms"
              className="text-xs text-slate-400 hover:text-indigo-500 transition-colors">
              Terms
            </a>
            <a href="/contact"
              className="text-xs text-slate-400 hover:text-indigo-500 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — thin orchestrator
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Props:
 *   setStudentInfo  — from App.jsx, sets student session in global state
 *   userProfile     — from App.jsx, the currently signed-in user's profile
 *                     (null when unauthenticated)
 */
export default function PasswordPage({ setStudentInfo, userProfile }) {
  const navigate = useNavigate();

  // ── Three UI modes ─────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [setupPending, setSetupPending] = useState(false);
  const [newUserUid, setNewUserUid] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  // ── After sign-in (EXISTING user) ─────────────────────────────────────────
  const handleAuthSuccess = (profile) => {
    setModalOpen(false);
    if (!profile) return;
    if (profile.role === 'teacher') return navigate('/teacher-dashboard');
    if (profile.role === 'principal') return navigate('/principal-dashboard');
    // Students: App.jsx onAuthStateChanged handles the redirect
  };

  // ── After registration (NEW user) → open wizard ───────────────────────────
  const handleNeedsSetup = (uid, email) => {
    setModalOpen(false);
    setNewUserUid(uid);
    setNewUserEmail(email);
    setSetupPending(true);
  };

  // ── After wizard completes ─────────────────────────────────────────────────
  const handleSetupComplete = async (profile) => {
    setSetupPending(false);
    if (!profile) return;
    if (profile.role === 'student') {
      setStudentInfo?.(profile);
      localStorage.setItem('user-session', JSON.stringify(profile));
      await Swal.fire({
        icon: 'success', title: 'Welcome to Eduket OS!',
        text: 'Your student profile is ready. Find your first exam below.',
        confirmButtonColor: '#6366f1', timer: 4000, timerProgressBar: true,
      });
      navigate('/exam');
    } else if (profile.role === 'teacher') {
      await Swal.fire({
        icon: 'success', title: 'Welcome, Teacher!',
        text: 'Your profile is set up. Start by uploading your first exam.',
        confirmButtonColor: '#6366f1', timer: 4000, timerProgressBar: true,
      });
      navigate('/teacher-dashboard');
    } else if (profile.role === 'principal') {
      await Swal.fire({
        icon: 'success', title: 'School registered!',
        text: 'Your school is live. Invite teachers and students to join.',
        confirmButtonColor: '#6366f1', timer: 4000, timerProgressBar: true,
      });
      navigate('/principal-dashboard');
    }
  };

  // ── Signed-in user helpers ─────────────────────────────────────────────────
  const handleDashboard = () => {
    if (!userProfile) { setModalOpen(true); return; }
    if (userProfile.role === 'teacher') return navigate('/teacher-dashboard');
    if (userProfile.role === 'principal') return navigate('/principal-dashboard');
    navigate('/exam');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user-session');
      setStudentInfo?.(null);
    } catch (err) {
      console.error('[PasswordPage] Sign out error:', err);
    }
  };

  return (
    <>
      {/* ── Auth modal ─────────────────────────────────────────────────── */}
      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAuthSuccess}
        setStudentInfo={setStudentInfo}
        onNeedsSetup={(uid, email) => {
          // Logic to trigger your ProfileSetupWizard component modal or page view
          setSetupUser({ uid, email });
          setShowSetupWizard(true);
        }}
      />

      {/* ── Profile setup wizard (NEW users only) ──────────────────────── */}
      {setupPending && (
        <ProfileSetupWizard
          uid={newUserUid}
          email={newUserEmail}
          onComplete={handleSetupComplete}
        />
      )}

      {/* ── Sticky navbar ─────────────────────────────────────────────── */}
      <LandingNavbar
        profile={userProfile}
        onOpenModal={() => setModalOpen(true)}
        onDashboard={handleDashboard}
        onSignOut={handleSignOut}
      />

      {/* ── Page content ──────────────────────────────────────────────── */}
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <HeroSection onOpenModal={() => setModalOpen(true)} />
        <FeatureStrip />
        <VideoSection onOpenModal={() => setModalOpen(true)} />
        <HowItWorksSection onOpenModal={() => setModalOpen(true)} />
        <EnrollmentSection onOpenModal={() => setModalOpen(true)} />
        <BottomCTA onOpenModal={() => setModalOpen(true)} />
        <LandingFooter />
      </div>
    </>
  );
}