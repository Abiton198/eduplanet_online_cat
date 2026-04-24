import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../utils/firebase';
import { useNavigate } from 'react-router-dom';

import {
  User,
  BookOpen,
  School,
  ShieldCheck,
  Upload,
  ClipboardList,
  FileText,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import Swal from 'sweetalert2';

export default function TeacherDashboard() {
  // ─── STATE MANAGEMENT ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('results'); // 'results' or 'upload'
  const [teacherProfile, setTeacherProfile] = useState(null);

  // Upload Wizard State
  const [uploadStep, setUploadStep] = useState(1);
  const [examFile, setExamFile] = useState(null);
  const [memoFile, setMemoFile] = useState(null);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperYear, setPaperYear] = useState('');
  const [paperSubject, setPaperSubject] = useState('CAT');
  const [curriculum, setCurriculum] = useState('CAPS');
  const [uploadedExams, setUploadedExams] = useState([]);
  const navigate = useNavigate();
  const auth = getAuth();

  // ─── EFFECTS ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadInitialData() {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Load Profile
      const profileRef = doc(db, 'teachers', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setTeacherProfile(profileSnap.data());
      }

      // Load Upload History (Audit Trail)
      const uploadRef = doc(db, 'teacherExamUploads', user.uid);
      const uploadSnap = await getDoc(uploadRef);
      if (uploadSnap.exists()) {
        setUploadedExams(uploadSnap.data().uploads || []);
      }
    }
    loadInitialData();
  }, []);

  // ─── HANDLERS ──────────────────────────────────────────────────────────
  const handleExamUpload = async () => {
    if (!examFile || !memoFile || !paperTitle) {
      alert('Please complete all fields and upload both files.');
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    const record = {
      id: Date.now(),
      title: paperTitle,
      year: paperYear,
      curriculum,
      subject: paperSubject,
      examFileName: examFile.name,
      memoFileName: memoFile.name,
      uploadedBy: user.uid,
      uploadedAt: new Date().toISOString(),
      status: 'Processed for AI Marking'
    };

    const updated = [record, ...uploadedExams];

    try {
      await setDoc(doc(db, 'teacherExamUploads', user.uid), {
        teacher: user.uid,
        uploads: updated
      }, { merge: true });

      setUploadedExams(updated);
      alert('Exam uploaded. AI extraction pipeline queued.');

      // Reset Form
      setUploadStep(1);
      setExamFile(null);
      setMemoFile(null);
      setPaperTitle('');
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Error uploading exam. Check console.");
    }
  };

  const handleLogout = () => {
    const isDark = document.documentElement.classList.contains('dark');
    // Detect dark mode from the document root

    Swal.fire({
      title: "Logout?",
      text: "You will be signed out of your session.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Stay",
      confirmButtonColor: "#ef4444", // Red
      cancelButtonColor: "#22c55e",  // Green
      background: isDark ? '#111827' : '#fff', // Use the local 'isDark' variable
      color: isDark ? '#fff' : '#000',
    }).then((result) => {
      if (result.isConfirmed) {
        signOut(auth);
        setTeacherProfile(null);
        localStorage.clear();
        navigate("/");
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">

      {/* 1. PERSONALIZED PROFILE HEADER */}
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 text-white rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold mb-2">
            Welcome! {teacherProfile?.title || 'Mr/Ms'} {teacherProfile?.surname || teacherProfile?.fullName || 'Teacher'}
          </h1>
          <p className="opacity-90 mb-6">Your EduCAT Professional Portal</p>


          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/20">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-indigo-300" />
              <div>
                <p className="text-xs opacity-70 uppercase tracking-wider">Subject</p>
                <p className="font-bold">{teacherProfile?.subject || 'CAT'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <School className="w-5 h-5 text-indigo-300" />
              <div>
                <p className="text-xs opacity-70 uppercase tracking-wider">School</p>
                <p className="font-bold">{teacherProfile?.school || 'Care Academy'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-5 h-5 text-indigo-300" />
              <div>
                <p className="text-xs opacity-70 uppercase tracking-wider">Department</p>
                <p className="font-bold">{teacherProfile?.department || 'IT'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
              <div>
                <p className="text-xs opacity-70 uppercase tracking-wider">Role</p>
                <p className="font-bold">Exam Moderator</p>
              </div>
            </div>
          </div>
        </div>
        {/* Abstract background shape */}
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* 2. DASHBOARD TABS */}
      <div className="flex p-1 bg-gray-200 rounded-2xl w-fit mb-8 shadow-inner">
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'results' ? 'bg-white text-indigo-700 shadow-md scale-105' : 'text-gray-600 hover:text-indigo-600'
            }`}
        >
          <ClipboardList className="w-5 h-5" />
          Post Results
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'upload' ? 'bg-white text-indigo-700 shadow-md scale-105' : 'text-gray-600 hover:text-indigo-600'
            }`}
        >
          <Upload className="w-5 h-5" />
          AI Exam Upload Center
        </button>
      </div>

      {/* ─── TAB 1: POST RESULTS (Original UI) ────────────────────────── */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Results Management</h2>
            <div className="text-sm text-gray-500">Last synced: {new Date().toLocaleTimeString()}</div>
          </div>

          {/* PLACE YOUR ORIGINAL GRADING FORM / TABLE COMPONENT HERE */}
          <div className="p-12 border-2 border-dashed border-gray-200 rounded-2xl text-center">
            <p className="text-gray-400">Your existing Marks Capture Form will render here...</p>
          </div>
        </div>
      )}

      {/* ─── TAB 2: AI EXAM UPLOAD CENTER ─────────────────────────────── */}
      {activeTab === 'upload' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

          {/* WIZARD CARD */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-indigo-900">AI Exam Upload Wizard</h2>
              <span className="text-indigo-600 font-mono text-sm bg-white px-3 py-1 rounded-full shadow-sm">
                Step {uploadStep} of 3
              </span>
            </div>

            <div className="p-8">
              {/* STEP 1: METADATA */}
              {uploadStep === 1 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl">1</div>
                    <h3 className="text-xl font-bold">Exam Identity</h3>
                  </div>

                  <div className="grid gap-4">
                    <input
                      type="text"
                      placeholder="Exam Title (e.g. Grade 12 Preliminary Paper 1)"
                      value={paperTitle}
                      onChange={e => setPaperTitle(e.target.value)}
                      className="w-full border-2 border-gray-100 p-4 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all outline-none text-lg"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={curriculum}
                        onChange={e => setCurriculum(e.target.value)}
                        className="border-2 border-gray-100 p-4 rounded-xl bg-white"
                      >
                        <option value="CAPS">CAPS (DBE)</option>
                        <option value="IEB">IEB</option>
                        <option value="Cambridge">Cambridge</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Year"
                        value={paperYear}
                        onChange={e => setPaperYear(e.target.value)}
                        className="border-2 border-gray-100 p-4 rounded-xl"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setUploadStep(2)}
                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    Next: Upload Paper <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* STEP 2: EXAM PAPER */}
              {uploadStep === 2 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl">2</div>
                    <h3 className="text-xl font-bold">Upload Question Paper</h3>
                  </div>

                  <div className="border-2 border-dashed border-indigo-200 rounded-3xl p-12 text-center bg-indigo-50/30">
                    <input
                      type="file"
                      id="examFile"
                      accept=".pdf"
                      onChange={(e) => setExamFile(e.target.files[0])}
                      className="hidden"
                    />
                    <label htmlFor="examFile" className="cursor-pointer">
                      <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                        <FileText className="w-8 h-8 text-indigo-600" />
                      </div>
                      <p className="text-lg font-semibold text-indigo-900">
                        {examFile ? examFile.name : "Select Question Paper (PDF)"}
                      </p>
                    </label>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setUploadStep(1)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                      <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    <button onClick={() => setUploadStep(3)} className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg">
                      Next: Upload Memo
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: MEMO */}
              {uploadStep === 3 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-green-600 text-white rounded-2xl">3</div>
                    <h3 className="text-xl font-bold">Upload Marking Memo</h3>
                  </div>

                  <div className="border-2 border-dashed border-green-200 rounded-3xl p-12 text-center bg-green-50/30">
                    <input
                      type="file"
                      id="memoFile"
                      accept=".pdf"
                      onChange={(e) => setMemoFile(e.target.files[0])}
                      className="hidden"
                    />
                    <label htmlFor="memoFile" className="cursor-pointer">
                      <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-lg font-semibold text-green-900">
                        {memoFile ? memoFile.name : "Select Memo (PDF)"}
                      </p>
                    </label>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setUploadStep(2)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                      <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    <button
                      onClick={handleExamUpload}
                      className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700"
                    >
                      Process & Finalize Exam
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AUDIT TRAIL */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
              <h3 className="text-2xl font-bold">Uploaded Exams Audit Trail</h3>
            </div>

            <div className="grid gap-4">
              {uploadedExams.length === 0 ? (
                <p className="text-center py-10 text-gray-400">No exams uploaded yet.</p>
              ) : (
                uploadedExams.map(exam => (
                  <div key={exam.id} className="group hover:border-indigo-400 border-2 border-gray-50 rounded-2xl p-6 bg-gray-50/50 transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2">
                        <h4 className="font-bold text-xl text-indigo-900">{exam.title}</h4>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {exam.curriculum}</span>
                          <span className="flex items-center gap-1"><School className="w-4 h-4" /> {exam.year}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                          <div className="text-xs bg-white p-2 rounded-lg border border-gray-200 truncate">
                            📄 {exam.examFileName}
                          </div>
                          <div className="text-xs bg-white p-2 rounded-lg border border-gray-200 truncate">
                            ✅ {exam.memoFileName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-4">
                        <span className="inline-block bg-green-100 text-green-700 font-bold px-4 py-1 rounded-full text-sm">
                          {exam.status}
                        </span>
                        <p className="text-xs text-gray-400 block">
                          Uploaded: {new Date(exam.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-600 text-red-600 hover:text-white transition-all duration-300 font-bold border border-red-100 dark:border-red-900/30 mt-4"
      >
        <LogOut size={18} />
        <span className="hidden lg:inline text-sm">Logout</span>
      </button>
    </div>
  );
}