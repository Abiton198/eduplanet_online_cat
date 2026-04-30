import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../utils/firebase';
import {
  User, BookOpen, School, ShieldCheck, Upload,
  ClipboardList, FileText, CheckCircle, ArrowRight,
  ArrowLeft, LayoutDashboard, LogOut, HardDrive,
  AlertCircle, Loader2, ExternalLink, CheckCircle2, MapPin, GraduationCap
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  hasDrivePermission,
  requestDrivePermission,
  getValidDriveToken,
  getFolderIds,
  uploadFileToDrive,
  saveExamMetadata,
  ensureUserFirestoreDocs,
} from '../utils/driveManager';

export default function TeacherDashboard() {
  const auth = getAuth();

  // ─── CONSTANTS (Synced with Signup) ───────────────────────────────────
  const standardDBESubjects = [
    "CAT", "IT", "Mathematics", "Mathematical Literacy", "English HL", "English FAL",
    "Physical Sciences", "Life Sciences", "Accounting", "Business Studies",
    "Economics", "History", "Geography", "Life Orientation", "Consumer Studies"
  ];

  // ─── STATE ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('results');
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [uploadedExams, setUploadedExams] = useState([]);
  const [driveLinked, setDriveLinked] = useState(false);
  const [driveChecked, setDriveChecked] = useState(false);
  const [isRequestingDrive, setIsRequestingDrive] = useState(false);

  // Upload wizard
  const [uploadStep, setUploadStep] = useState(1);
  const [examFile, setExamFile] = useState(null);
  const [memoFile, setMemoFile] = useState(null);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperYear, setPaperYear] = useState(new Date().getFullYear().toString());
  const [paperSubject, setPaperSubject] = useState('');
  const [paperGrade, setPaperGrade] = useState('12');
  const [curriculum, setCurriculum] = useState('CAPS');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');


  // ─── LOAD PROFILE + DRIVE STATUS ────────────────────────────────────────
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Run initialization
    ensureUserFirestoreDocs(user.uid, 'teacher').catch(console.error);

    // 2. Set up Snapshots (Sync)
    const profileUnsub = onSnapshot(doc(db, 'teachers', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTeacherProfile(data);
        // Default the upload subject to their primary subject
        // Check if subjects is an array before accessing [0]
        if (Array.isArray(data.subjects) && data.subjects.length > 0) {
          setPaperSubject(data.subjects[0]);
        } else if (typeof data.subjects === 'string') {
          setPaperSubject(data.subjects);
        }
        if (data.curriculum) setCurriculum(data.curriculum);
      }
    });

    const uploadUnsub = onSnapshot(doc(db, 'teacherExamUploads', user.uid), (snap) => {
      if (snap.exists()) setUploadedExams(snap.data().uploads || []);
    });

    // 3. Define Async logic separately
    const initDrive = async () => {
      const has = await hasDrivePermission(user.uid);
      setDriveLinked(has);
      setDriveChecked(true);
    };

    initDrive();

    // 4. CLEANUP: Return the unsubs
    return () => {
      profileUnsub();
      uploadUnsub();
    };
  }, []); // Empty dependency array means this runs once on mount

  // ─── REQUEST DRIVE PERMISSION ──────
  const handleRequestDrivePermission = async () => {
    setIsRequestingDrive(true);
    try {
      const token = await requestDrivePermission();
      if (token) {
        setDriveLinked(true);
        Swal.fire({
          icon: 'success',
          title: 'Google Drive Linked!',
          text: 'Your secure exam storage is ready.',
          confirmButtonColor: '#4F46E5',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRequestingDrive(false);
    }
  };

  const handleUploadTabClick = async () => {
    if (driveLinked) {
      setActiveTab('upload');
      return;
    }
    const result = await Swal.fire({
      title: 'Link Google Drive',
      html: `<p class="text-gray-600 mb-4">Drive access is required to host your exam PDFs securely.</p>`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Link My Drive',
      confirmButtonColor: '#4F46E5',
    });
    if (result.isConfirmed) {
      await handleRequestDrivePermission();
      if (driveLinked) setActiveTab('upload');
    }
  };

  const handleExamUpload = async () => {
    if (!examFile || !memoFile || !paperTitle || !paperSubject) {
      Swal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please complete all fields.', confirmButtonColor: '#4F46E5' });
      return;
    }

    const user = auth.currentUser;
    if (!user) return;
    setIsUploading(true);
    setUploadProgress('Preparing Drive...');

    try {
      const token = await getValidDriveToken(user.uid);
      const folderIds = await getFolderIds(user.uid, token);

      setUploadProgress('Uploading Question Paper...');
      const examDriveFile = await uploadFileToDrive(examFile, folderIds.uploadedId, token);

      setUploadProgress('Uploading Marking Memo...');
      const memoDriveFile = await uploadFileToDrive(memoFile, folderIds.uploadedId, token);

      setUploadProgress('Syncing to EduCAT AI...');
      const examId = await saveExamMetadata({
        uid: user.uid,
        teacherName: `${teacherProfile?.title || ''} ${teacherProfile?.surname || 'Teacher'}`.trim(),
        title: paperTitle,
        year: paperYear,
        subject: paperSubject,
        curriculum,
        grade: paperGrade,
        examDriveFile,
        memoDriveFile,
      });

      Swal.fire({ icon: 'success', title: 'Upload Complete', text: 'AI processing has started.', confirmButtonColor: '#4F46E5' });
      setUploadStep(1); setExamFile(null); setMemoFile(null); setPaperTitle(''); setActiveTab('results');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message });
    } finally { setIsUploading(false); setUploadProgress(''); }
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      sessionStorage.clear();
      window.location.href = '/';
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gray-50 dark:bg-slate-950 min-h-screen transition-colors duration-500">

      {/* ─── ENHANCED HEADER (Matches Signup Logic) ─── */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-[2.5rem] p-8 mb-8 shadow-2xl relative overflow-hidden border border-white/10">
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  {teacherProfile?.teachingPhase || 'FET'} Phase
                </span>
                {teacherProfile?.province === 'Eastern Cape' && (
                  <span className="bg-rose-500/40 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-400/30 flex items-center gap-1">
                    <MapPin size={10} /> {teacherProfile?.district} District
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-1 tracking-tighter">
                Hello, {teacherProfile?.title || 'Mr'} {teacherProfile?.surname || 'Teacher'}
              </h1>
              <p className="opacity-70 text-sm font-medium flex items-center gap-2">
                <School size={14} /> {teacherProfile?.school || 'South African Educator'}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {driveChecked && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black border transition-all ${driveLinked ? 'bg-green-500/20 border-green-400/30 text-green-200' : 'bg-amber-500/20 border-amber-400/30 text-amber-200'}`}>
                  <HardDrive size={14} />
                  {driveLinked ? "Cloud Active" : "Cloud Disconnected"}
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl text-xs font-bold border border-white/5">
                <GraduationCap size={14} /> {teacherProfile?.curriculum || 'CAPS'} Accredited
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/10 mt-8">
            <InfoItem
              icon={BookOpen}
              label="Core Subjects"
              value={
                Array.isArray(teacherProfile?.subjects)
                  ? teacherProfile.subjects.join(', ')
                  : (teacherProfile?.subjects || '—')
              }
            />
            <InfoItem icon={MapPin} label="Province" value={teacherProfile?.province || 'South Africa'} />
            <InfoItem icon={LayoutDashboard} label="Role" value="Portal Moderator" />
            <InfoItem icon={ShieldCheck} label="Verification" value="Agentic AI v3" />
          </div>
        </div>
        {/* Decorative background shape */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* TABS */}
      <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl w-fit mb-8 shadow-sm border border-slate-200 dark:border-slate-800 gap-1">
        <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<ClipboardList size={18} />} label="Mark Analysis" />
        <TabButton active={activeTab === 'upload'} onClick={handleUploadTabClick} icon={<Upload size={18} />} label="AI Exam Loader" badge={!driveLinked && driveChecked ? '!' : null} />
      </div>

      {/* ── TAB: RESULTS ─────────────────────────────────────────────────── */}
      {activeTab === 'results' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm p-10 border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-2xl font-black mb-2">Academic Performance Hub</h2>
          <p className="text-slate-500 text-sm mb-10">Capture and analyze student results using the agentic marking engine.</p>
          <div className="p-20 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-center">
            <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Analytics Module Loading...</p>
          </div>
        </div>
      )}

      {/* ── TAB: UPLOAD (Updated for new Subject Logic) ──────────────────── */}
      {activeTab === 'upload' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-indigo-600 p-8 flex justify-between items-center text-white">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">AI Exam Factory</h2>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-80">Phase {uploadStep} of 3</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black">
                {uploadStep}
              </div>
            </div>

            <div className="p-10">
              {uploadStep === 1 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <StepHeader num={1} title="Identity & Metadata" />
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Exam Name (e.g. Grade 12 CAT March Test)"
                      value={paperTitle}
                      onChange={(e) => setPaperTitle(e.target.value)}
                      className="w-full border-2 dark:bg-slate-800 dark:border-slate-700 p-5 rounded-2xl outline-none focus:border-indigo-600 font-bold"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Updated to use Standard Subject List */}
                      <select
                        value={paperSubject}
                        onChange={(e) => setPaperSubject(e.target.value)}
                        className="p-5 border-2 dark:bg-slate-800 dark:border-slate-700 rounded-2xl font-bold"
                      >
                        <option value="">Select DBE Subject</option>
                        {standardDBESubjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>

                      <select
                        value={paperGrade}
                        onChange={(e) => setPaperGrade(e.target.value)}
                        className="p-5 border-2 dark:bg-slate-800 dark:border-slate-700 rounded-2xl font-bold"
                      >
                        {[8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setUploadStep(2)}
                    disabled={!paperTitle || !paperSubject}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all disabled:opacity-30"
                  >
                    CONTINUE TO ASSETS <ArrowRight size={20} />
                  </button>
                </div>
              )}

              {/* Step 2 & 3 remain largely similar but styled for v3 */}
              {uploadStep === 2 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <StepHeader num={2} title="Upload Question Paper" />
                  <FileDropZone id="examFile" file={examFile} onChange={setExamFile} icon={<FileText size={32} />} label="Click to Select PDF" />
                  <div className="flex gap-4">
                    <button onClick={() => setUploadStep(1)} className="flex-1 bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl font-bold">Back</button>
                    <button onClick={() => setUploadStep(3)} disabled={!examFile} className="flex-[2] bg-indigo-600 text-white p-5 rounded-2xl font-black disabled:opacity-30">Next: Marking Memo</button>
                  </div>
                </div>
              )}

              {uploadStep === 3 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <StepHeader num={3} title="Upload Marking Memo" />
                  <FileDropZone id="memoFile" file={memoFile} onChange={setMemoFile} icon={<CheckCircle size={32} />} label="Finalize with Memo PDF" accentColor="green" />

                  {isUploading && (
                    <div className="flex items-center gap-3 p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl animate-pulse">
                      <Loader2 size={20} className="animate-spin text-indigo-600" />
                      <p className="text-sm font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">{uploadProgress}</p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button onClick={() => setUploadStep(2)} className="flex-1 bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl font-bold">Back</button>
                    <button
                      onClick={handleExamUpload}
                      disabled={isUploading || !memoFile}
                      className="flex-[2] bg-green-600 hover:bg-green-700 text-white p-5 rounded-2xl font-black shadow-lg shadow-green-500/20"
                    >
                      {isUploading ? 'PROCESSOR BUSY...' : 'FINALIZE UPLOAD'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-600 transition-all font-black border border-slate-200 dark:border-slate-800 mt-12 text-xs uppercase tracking-widest"
      >
        <LogOut size={16} /> Close Session
      </button>
    </div>
  );
}

// ─── REUSABLE COMPONENTS (Updated Styling) ───

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-white/10 p-2 rounded-xl border border-white/5">
        <Icon className="w-4 h-4 text-indigo-300" />
      </div>
      <div>
        <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">{label}</p>
        <p className="font-bold text-sm truncate max-w-[120px]">{value}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${active
        ? 'bg-indigo-600 text-white shadow-lg scale-105'
        : 'text-slate-400 hover:text-indigo-600'
        }`}
    >
      {icon} {label}
      {badge && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center animate-pulse">{badge}</span>}
    </button>
  );
}

function StepHeader({ num, title }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg">
        {num}
      </div>
      <h3 className="text-xl font-black">{title}</h3>
    </div>
  );
}

function FileDropZone({ id, file, onChange, icon, label, accentColor = 'indigo' }) {
  const colors = {
    indigo: 'border-indigo-200 bg-indigo-50/30 text-indigo-600',
    green: 'border-green-200 bg-green-50/30 text-green-600'
  };
  return (
    <div className={`border-4 border-dashed rounded-[2rem] p-12 text-center transition-all ${file ? 'border-indigo-500 bg-indigo-50' : colors[accentColor]}`}>
      <input type="file" id={id} accept=".pdf" onChange={(e) => onChange(e.target.files[0])} className="hidden" />
      <label htmlFor={id} className="cursor-pointer block">
        <div className="bg-white dark:bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-slate-100 dark:border-slate-700">
          {file ? <CheckCircle2 className="text-green-500" size={40} /> : icon}
        </div>
        <p className="text-lg font-black">{file ? file.name : label}</p>
        <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mt-2">PDF FORMAT ONLY · MAX 20MB</p>
      </label>
    </div>
  );
}