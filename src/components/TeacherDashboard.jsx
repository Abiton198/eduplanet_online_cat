import React, { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, collection, getDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../utils/firebase';
import {
  BookOpen, School, ShieldCheck, Upload, ClipboardList,
  FileText, CheckCircle, ArrowRight, ArrowLeft, LayoutDashboard,
  LogOut, HardDrive, AlertCircle, Loader2, ExternalLink,
  CheckCircle2, MapPin, GraduationCap, Trash2, Pencil,
  X, Save, Clock, Filter, Search, ChevronDown, ChevronUp,
  CalendarDays, Tag, Layers,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  hasDrivePermission, requestDrivePermission, getValidDriveToken,
  getFolderIds, uploadFileToDrive, saveExamMetadata, ensureUserFirestoreDocs,
  deleteExamFromAudit, updateExamInAudit,
} from '../utils/driveManager';
import { runExamDeletion } from '../utils/examDeleteUtils';
import { validateExamFile, getFileTypeLabel, isOpenDocumentFormat } from '../utils/examUploadUtils';
import { ResultsTab } from './ResultsTab';


// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DBE_SUBJECTS = [
  "CAT", "IT", "Mathematics", "Mathematical Literacy",
  "English HL", "English FAL", "Physical Sciences", "Life Sciences",
  "Accounting", "Business Studies", "Economics", "History", "Geography",
  "Life Orientation", "Consumer Studies", "Afrikaans HL", "Afrikaans FAL",
  "isiXhosa HL", "isiZulu HL",
];

const GRADES = [8, 9, 10, 11, 12];
const CURRICULA = ['CAPS', 'IEB', 'SACAI', 'Cambridge'];

const STATUS_CONFIG = {
  pending_extraction: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  extracted: { label: 'Extracted', cls: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-300' },
  indexed: { label: 'Indexed', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  ready: { label: 'Ready', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────

function EditExamModal({ exam, onSave, onClose }) {
  const [title, setTitle] = useState(exam.title || '');
  const [subject, setSubject] = useState(exam.subject || '');
  const [grade, setGrade] = useState(exam.grade || '12');
  const [year, setYear] = useState(exam.year || '');
  const [curriculum, setCurriculum] = useState(exam.curriculum || 'CAPS');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim() || !subject) {
      setError('Title and subject are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ title: title.trim(), subject, grade, year, curriculum });
      onClose();
    } catch (e) {
      setError(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl">
              <Pencil size={16} className="text-indigo-600" />
            </div>
            <h3 className="font-black text-lg">Edit Exam Details</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-8 py-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold rounded-xl border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Exam Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Subject *</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 text-sm outline-none focus:border-indigo-500">
                <option value="">Select</option>
                {DBE_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Grade</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)}
                className="w-full p-3.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 text-sm outline-none focus:border-indigo-500">
                {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Year</label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2024"
                className="w-full p-3.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Curriculum</label>
              <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)}
                className="w-full p-3.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 text-sm outline-none focus:border-indigo-500">
                {CURRICULA.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-8 pb-8">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-700 font-black text-xs text-slate-500 dark:text-slate-400 hover:border-slate-300 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
              : <><Save size={14} /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AUDIT ROW ────────────────────────────────────────────────────────────────
// ─── AUDIT ROW ────────────────────────────────────────────────────────────────
// Drop-in replacement for the existing AuditRow component.
// Adds examDuration to the row summary chip and the expanded detail panel,
// matching the structure of the upload wizard.

function AuditRow({ exam, onEdit, onDelete, expanded, onToggle }) {
  const statusCfg = STATUS_CONFIG[exam.status] || { label: exam.status || 'Processing', cls: 'bg-slate-100 text-slate-500' };

  const uploadDate = exam.uploadedAt
    ? new Date(exam.uploadedAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const uploadTime = exam.uploadedAt
    ? new Date(exam.uploadedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    : '';

  // Format duration exactly as the upload wizard labels it
  const formatDuration = (mins) => {
    if (!mins) return null;
    const m = Number(mins);
    if (m < 60) return `${m} min`;
    return `${m / 60} hr${m >= 120 ? 's' : ''}`;
  };
  const durationLabel = formatDuration(exam.examDuration);

  return (
    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">

      {/* ── Row summary — always visible ────────────────────────────────── */}
      <div
        className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
        onClick={onToggle}
      >
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${exam.status === 'ready' ? 'bg-green-500' :
            exam.status === 'pending_extraction' ? 'bg-amber-400 animate-pulse' :
              exam.status === 'indexed' ? 'bg-purple-500' : 'bg-blue-500'
          }`} />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800 dark:text-white text-sm truncate">{exam.title}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Tag size={9} /> {exam.subject || '—'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Layers size={9} /> Grade {exam.grade}
            </span>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <CalendarDays size={9} /> {exam.year || '—'}
            </span>
            <span className="text-[10px] font-bold text-slate-400">{exam.curriculum}</span>
            {/* Duration chip — shown inline when present */}
            {durationLabel && (
              <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-lg">
                <Clock size={9} /> {durationLabel}
              </span>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-right hidden sm:block shrink-0">
          <p className="text-xs font-black text-slate-600 dark:text-slate-300">{uploadDate}</p>
          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 justify-end">
            <Clock size={9} /> {uploadTime}
          </p>
        </div>

        {/* Status badge */}
        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide shrink-0 hidden md:block ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onEdit(exam)}
            className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Edit details">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(exam)}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
            title="Delete">
            <Trash2 size={14} />
          </button>
          <div className="text-slate-300 dark:text-slate-600 ml-1">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </div>

      {/* ── Expanded detail panel ────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-800/20 space-y-4">

          {/* File links row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Question paper */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">📄 Question Paper</p>
              {exam.examDriveLink ? (
                <a href={exam.examDriveLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline truncate">
                  <ExternalLink size={12} /> {exam.examFileName || 'Open in Drive'}
                </a>
              ) : (
                <p className="text-xs text-slate-400 font-bold">{exam.examFileName || 'No file linked'}</p>
              )}
              {exam.examFileType && (
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{exam.examFileType}</p>
              )}
            </div>

            {/* Marking memo */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">✅ Marking Memo</p>
              {exam.memoDriveLink ? (
                <a href={exam.memoDriveLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-bold text-green-600 hover:underline truncate">
                  <ExternalLink size={12} /> {exam.memoFileName || 'Open in Drive'}
                </a>
              ) : (
                <p className="text-xs text-slate-400 font-bold">{exam.memoFileName || 'No file linked'}</p>
              )}
              {exam.memoFileType && (
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{exam.memoFileType}</p>
              )}
            </div>
          </div>

          {/* Metadata summary — mirrors the upload wizard's "Ready to upload" summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">📋 Exam Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              <DetailItem label="Title" value={exam.title} />
              <DetailItem label="Subject" value={exam.subject} />
              <DetailItem label="Grade" value={exam.grade ? `Grade ${exam.grade}` : null} />
              <DetailItem label="Year" value={exam.year} />
              <DetailItem label="Curriculum" value={exam.curriculum} />
              {/* ── Exam Duration — new field ── */}
              <DetailItem
                label="Time Allocation"
                value={durationLabel}
                highlight={!!durationLabel}
              />
            </div>
          </div>

          {/* Footer metadata */}
          <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-400">
            {exam.examId && (
              <span>ID: <span className="font-black text-slate-500 dark:text-slate-300">{exam.examId}</span></span>
            )}
            {exam.updatedAt && (
              <span>Last edited: <span className="font-black text-slate-500 dark:text-slate-300">
                {new Date(exam.updatedAt).toLocaleString('en-ZA')}
              </span></span>
            )}
            <span className={`px-2 py-0.5 rounded-lg ${statusCfg.cls}`}>{statusCfg.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DETAIL ITEM — used inside the expanded panel ─────────────────────────────
function DetailItem({ label, value, highlight = false }) {
  if (!value) return null;
  return (
    <div className="py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-black mt-0.5 ${highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>
        {value}
      </p>
    </div>
  );
}



// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const auth = getAuth();

  // Profile & Drive
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [driveLinked, setDriveLinked] = useState(false);
  const [driveChecked, setDriveChecked] = useState(false);
  const [isRequestingDrive, setIsRequestingDrive] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState('results');

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


  // Audit trail
  const [uploadedExams, setUploadedExams] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingExam, setEditingExam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortDir, setSortDir] = useState('desc'); // newest first
  const [user, setUser] = useState(auth.currentUser);
  const [examDuration, setExamDuration] = useState(60); // default 60 minutes

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  // ─── INIT ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    ensureUserFirestoreDocs(user.uid, 'teacher').catch(console.error);

    const profileUnsub = onSnapshot(doc(db, 'teachers', user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setTeacherProfile(data);
      if (Array.isArray(data.subjects) && data.subjects.length > 0) setPaperSubject(data.subjects[0]);
      else if (typeof data.subjects === 'string' && data.subjects) setPaperSubject(data.subjects);
      if (data.curriculum) setCurriculum(data.curriculum);
    });

    const uploadUnsub = onSnapshot(doc(db, 'teacherExamUploads', user.uid), (snap) => {
      setUploadedExams(snap.exists() ? (snap.data().uploads || []) : []);
    });

    hasDrivePermission(user.uid).then((has) => {
      setDriveLinked(has);
      setDriveChecked(true);
    });

    return () => { profileUnsub(); uploadUnsub(); };
  }, []);

  // ─── FILTERED + SORTED AUDIT LIST ────────────────────────────────────────
  const filteredExams = uploadedExams
    .filter((e) => {
      const term = searchTerm.toLowerCase();
      const matchSearch = !term ||
        e.title?.toLowerCase().includes(term) ||
        e.subject?.toLowerCase().includes(term);
      const matchSubject = !filterSubject || e.subject === filterSubject;
      const matchGrade = !filterGrade || String(e.grade) === filterGrade;
      const matchStatus = !filterStatus || e.status === filterStatus;
      return matchSearch && matchSubject && matchGrade && matchStatus;
    })
    .sort((a, b) => {
      const aTime = new Date(a.uploadedAt || 0).getTime();
      const bTime = new Date(b.uploadedAt || 0).getTime();
      return sortDir === 'desc' ? bTime - aTime : aTime - bTime;
    });

  // ─── DRIVE ───────────────────────────────────────────────────────────────
  const handleRequestDrivePermission = async () => {
    setIsRequestingDrive(true);
    try {
      const token = await requestDrivePermission();
      if (token) {
        setDriveLinked(true);
        Swal.fire({ icon: 'success', title: 'Drive Linked!', text: 'Secure exam storage is ready.', confirmButtonColor: '#4F46E5' });
      }
    } catch (err) { console.error(err); }
    finally { setIsRequestingDrive(false); }
  };

  const handleUploadTabClick = async () => {
    if (driveLinked) { setActiveTab('upload'); return; }
    const res = await Swal.fire({
      title: 'Link Google Drive',
      html: `<p class="text-gray-600">Drive access is required to store exam PDFs securely in your own account.</p>`,
      icon: 'info', showCancelButton: true,
      confirmButtonText: 'Link My Drive', confirmButtonColor: '#4F46E5',
    });
    if (res.isConfirmed) {
      await handleRequestDrivePermission();
      setActiveTab('upload');
    }
  };

  // ─── UPLOAD ──────────────────────────────────────────────────────────────
  const handleExamUpload = async () => {

    // --- Validate all fields including file types ---
    const examFileError = validateExamFile(examFile, 'Question paper');
    const memoFileError = validateExamFile(memoFile, 'Marking memo');

    if (!paperTitle.trim() || !paperSubject) {
      Swal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please complete all fields.', confirmButtonColor: '#4F46E5' });
      return;
    }
    if (examFileError) {
      Swal.fire({ icon: 'warning', title: 'Invalid File', text: examFileError, confirmButtonColor: '#4F46E5' });
      return;
    }
    if (memoFileError) {
      Swal.fire({ icon: 'warning', title: 'Invalid File', text: memoFileError, confirmButtonColor: '#4F46E5' });
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsUploading(true);
    setUploadProgress('Preparing Drive...');

    try {
      const token = await getValidDriveToken(user.uid);
      const folderIds = await getFolderIds(user.uid, token);

      setUploadProgress(`Uploading question paper (${getFileTypeLabel(examFile)})...`);
      const examDriveFile = await uploadFileToDrive(examFile, folderIds.uploadedId, token);

      setUploadProgress(`Uploading marking memo (${getFileTypeLabel(memoFile)})...`);
      const memoDriveFile = await uploadFileToDrive(memoFile, folderIds.uploadedId, token);

      setUploadProgress('Saving to Eduket AI...');
      const userDocSnap = await getDoc(doc(db, "users", user.uid));
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};

      const examId = await saveExamMetadata({
        uid: user.uid,
        teacherName: `${teacherProfile?.title || ''} ${teacherProfile?.surname || 'Teacher'}`.trim(),
        schoolId: userData.schoolId ?? teacherProfile?.schoolId ?? null,


        title: paperTitle.trim(),
        year: paperYear,
        subject: paperSubject,
        curriculum,
        grade: paperGrade,
        examFileType: getFileTypeLabel(examFile),
        memoFileType: getFileTypeLabel(memoFile),
        examDuration,

        examDriveFile,
        memoDriveFile,
      });

      setUploadProgress('Queuing AI extraction...');
      await fetch('https://chatbot-backend-educat.onrender.com/auto-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: examId,
          exam_file_type: getFileTypeLabel(examFile),
          memo_file_type: getFileTypeLabel(memoFile),
          exam_needs_conversion: isOpenDocumentFormat(examFile),  // ← tells backend to convert ODT→PDF first
          memo_needs_conversion: isOpenDocumentFormat(memoFile),
        }),
      });

      await Swal.fire({
        icon: 'success',
        title: 'Upload Complete!',
        text: 'AI extraction pipeline queued.',
        confirmButtonColor: '#4F46E5',
      });

      // Reset wizard
      setUploadStep(1);
      setExamFile(null);
      setMemoFile(null);
      setPaperTitle('');
      setActiveTab('audit');

    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message });
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };


  // ─── EDIT ────────────────────────────────────────────────────────────────
  const handleEdit = (exam) => setEditingExam(exam);

  const handleSaveEdit = async (changes) => {
    const user = auth.currentUser;
    if (!user || !editingExam) return;
    const examId = editingExam.examId || editingExam.id;
    await updateExamInAudit(user.uid, examId, changes);
  };

  // ─── DELETE ──────────────────────────────────────────────────────────────
  const handleDelete = async (exam) => {
    const examId = exam.examId || exam.id;

    const { isConfirmed, value: selected } = await Swal.fire({
      title: 'Delete this exam?',
      html: `
      <p style="color:#6B7280; margin-bottom:12px; font-size:14px;">
        Choose what to permanently remove for <strong style="color:#111">"${exam.title}"</strong>
      </p>
      <div style="text-align:left; display:flex; flex-direction:column; gap:10px; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:8px; padding:14px;">
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:14px;">
          <input type="checkbox" id="del-firestore" checked style="width:16px;height:16px;accent-color:#EF4444;" />
          <span>
            <span style="font-weight:500;">Firestore record</span>
            <span style="display:block; font-size:12px; color:#9CA3AF;">Removes the exam document from the database</span>
          </span>
        </label>
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:14px;">
          <input type="checkbox" id="del-trail" style="width:16px;height:16px;accent-color:#EF4444;" />
          <span>
            <span style="font-weight:500;">Audit trail</span>
            <span style="display:block; font-size:12px; color:#9CA3AF;">Clears activity logs associated with this exam</span>
          </span>
        </label>
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:14px;">
          <input type="checkbox" id="del-drive" style="width:16px;height:16px;accent-color:#EF4444;" />
          <span>
            <span style="font-weight:500;">Google Drive files</span>
            <span style="display:block; font-size:12px; color:#9CA3AF;">Permanently deletes linked files — cannot be undone</span>
          </span>
        </label>
      </div>
    `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete Selected',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      preConfirm: () => ({
        firestore: document.getElementById('del-firestore').checked,
        trail: document.getElementById('del-trail').checked,
        drive: document.getElementById('del-drive').checked,
      }),
    });

    if (!isConfirmed) return;
    if (!selected.firestore && !selected.trail && !selected.drive) {
      Swal.fire({ icon: 'info', title: 'Nothing selected', text: 'Please check at least one item to delete.' });
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      const deleted = await runExamDeletion({
        uid: user.uid,
        examId,
        driveFileId: exam.driveFileId,
        selected,                        // from Swal preConfirm
      });

      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: `Removed: ${deleted}`,
        confirmButtonColor: '#4F46E5',
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Delete Failed', text: err.message });
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => { sessionStorage.clear(); window.location.href = '/'; });
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gray-50 dark:bg-slate-950 min-h-screen transition-colors duration-500">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-[2.5rem] p-8 mb-8 shadow-2xl relative overflow-hidden border border-white/10">
        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  {teacherProfile?.teachingPhase || 'FET'} Phase
                </span>
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
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black border ${driveLinked ? 'bg-green-500/20 border-green-400/30 text-green-200' : 'bg-amber-500/20 border-amber-400/30 text-amber-200'
                  }`}>
                  <HardDrive size={14} />
                  {driveLinked ? 'Drive Active' : (
                    <button onClick={handleRequestDrivePermission} disabled={isRequestingDrive} className="underline underline-offset-2 flex items-center gap-1">
                      {isRequestingDrive ? <Loader2 size={12} className="animate-spin" /> : null}
                      Link Drive
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl text-xs font-bold border border-white/5">
                <GraduationCap size={14} /> {teacherProfile?.curriculum || 'CAPS'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/10 mt-8">
            <InfoItem icon={BookOpen} label="Subjects" value={Array.isArray(teacherProfile?.subjects) ? teacherProfile.subjects.join(', ') : (teacherProfile?.subjects || '—')} />
            <InfoItem icon={MapPin} label="Province" value={teacherProfile?.province || 'South Africa'} />
            <InfoItem icon={LayoutDashboard} label="Role" value="Portal Moderator" />
            <InfoItem icon={ShieldCheck} label="Uploaded" value={`${uploadedExams.length} paper${uploadedExams.length !== 1 ? 's' : ''}`} />
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* TABS */}
      <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-2xl w-fit mb-8 shadow-sm border border-slate-200 dark:border-slate-800 gap-1 flex-wrap">
        <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<ClipboardList size={16} />} label="Mark Analysis" />
        <TabButton active={activeTab === 'upload'} onClick={handleUploadTabClick} icon={<Upload size={16} />} label="Upload Exam" badge={!driveLinked && driveChecked ? '!' : null} />
        <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')} icon={<FileText size={16} />} label={`Audit Trail ${uploadedExams.length > 0 ? `(${uploadedExams.length})` : ''}`} />
      </div>

      {/* ── RESULTS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'results' && (
        <ResultsTab teacherMode={true} />
      )}

      {/* ── UPLOAD TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'upload' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-300">

          {!driveLinked && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={22} />
                <div>
                  <p className="font-black text-amber-800 dark:text-amber-300 text-sm">Google Drive not linked</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Files will be stored in your Drive — link it first.</p>
                </div>
              </div>
              <button onClick={handleRequestDrivePermission} disabled={isRequestingDrive}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs transition-colors shrink-0">
                {isRequestingDrive ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
                Link Drive
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-indigo-600 p-8 flex justify-between items-center text-white">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">AI Exam Factory</h2>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-80 mt-1">Step {uploadStep} of 3</p>
              </div>
              {/* Step progress */}
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-2 rounded-full transition-all duration-300 ${s < uploadStep ? 'bg-white w-8' : s === uploadStep ? 'bg-white w-10' : 'bg-white/30 w-4'
                    }`} />
                ))}
              </div>
            </div>

            <div className="p-10">
              {uploadStep === 1 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <StepHeader num={1} title="Identity & Metadata" />
                  <input type="text" placeholder="Exam Name (e.g. Grade 12 CAT March Test)" value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    className="w-full border-2 dark:bg-slate-800 dark:border-slate-700 p-5 rounded-2xl outline-none focus:border-indigo-600 font-bold text-sm" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select value={paperSubject} onChange={(e) => setPaperSubject(e.target.value)}
                      className="p-5 border-2 dark:bg-slate-800 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600">
                      <option value="">Select Subject</option>
                      {DBE_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={paperGrade} onChange={(e) => setPaperGrade(e.target.value)}
                      className="p-5 border-2 dark:bg-slate-800 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600">
                      {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                    <input type="number" value={paperYear} onChange={(e) => setPaperYear(e.target.value)} placeholder="Year"
                      className="p-5 border-2 dark:bg-slate-800 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600" />
                  </div>
                  <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)}
                    className="w-full p-5 border-2 dark:bg-slate-800 dark:border-slate-700 rounded-2xl font-bold text-indigo-600 text-sm outline-none focus:border-indigo-600">
                    {CURRICULA.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => setUploadStep(2)} disabled={!paperTitle.trim() || !paperSubject}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all disabled:opacity-30">
                    CONTINUE <ArrowRight size={20} />
                  </button>
                </div>
              )}

              {uploadStep === 2 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <StepHeader num={2} title="Upload Question Paper" />
                  <FileDropZone id="examFile" file={examFile} onChange={setExamFile} icon={<FileText size={32} className="text-indigo-400" />} label="Click to Select PDF" />
                  <div className="flex gap-4">
                    <button onClick={() => setUploadStep(1)} className="flex-1 bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button onClick={() => setUploadStep(3)} disabled={!examFile}
                      className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black text-sm disabled:opacity-30 transition-colors">
                      Next: Marking Memo →
                    </button>
                  </div>
                </div>
              )}

              {uploadStep === 3 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <StepHeader num={3} title="Upload Marking Memo" />
                  <FileDropZone id="memoFile" file={memoFile} onChange={setMemoFile} icon={<CheckCircle size={32} className="text-green-400" />} label="Click to Select Memo PDF" accentColor="green" />

                  {isUploading && (
                    <div className="flex items-center gap-3 p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                      <Loader2 size={20} className="animate-spin text-indigo-600" />
                      <p className="text-sm font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">{uploadProgress}</p>
                    </div>
                  )}

                  {/* Upload summary before final submit */}
                  {examFile && memoFile && !isUploading && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 space-y-2 text-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ready to upload</p>
                      <SummaryRow label="Title" value={paperTitle} />
                      <SummaryRow label="Subject" value={paperSubject} />
                      <SummaryRow label="Grade" value={`Grade ${paperGrade}`} />
                      <SummaryRow label="Year" value={paperYear} />
                      <SummaryRow label="Curriculum" value={curriculum} />
                      <SummaryRow label="Paper" value={examFile.name} />
                      <SummaryRow label="Memo" value={memoFile.name} />
                      <SummaryRow label="Exam Duration" value={examDuration} />
                    </div>
                  )}

                  <div className="flex gap-4">
                    {/* Exam Duration Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Exam Time Allocation
                      </label>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[30, 60, 90, 120, 180, 240].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => setExamDuration(mins)}
                            className={`p-4 rounded-2xl border-2 transition-all font-black text-sm ${examDuration === mins
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                              }`}
                          >
                            {mins < 60 ? `${mins} min` : `${mins / 60} hr${mins >= 120 ? "s" : ""}`}
                          </button>
                        ))}
                      </div>

                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Selected: <span className="font-bold text-indigo-500">{examDuration} minutes</span>
                      </p>
                    </div>


                    <button onClick={() => setUploadStep(2)} disabled={isUploading}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button onClick={handleExamUpload} disabled={isUploading || !memoFile || !driveLinked}
                      className="flex-[2] bg-green-600 hover:bg-green-700 text-white p-5 rounded-2xl font-black text-sm shadow-lg shadow-green-500/20 disabled:opacity-40 transition-colors">
                      {isUploading ? 'Uploading...' : '✓ FINALIZE UPLOAD'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT TRAIL TAB ──────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in">

          {/* Audit header + stats */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black">Exam Upload Audit Trail</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {uploadedExams.length} paper{uploadedExams.length !== 1 ? 's' : ''} uploaded · Live from Firestore
                </p>
              </div>
              <button onClick={() => setActiveTab('upload')}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs transition-colors">
                <Upload size={14} /> New Upload
              </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: uploadedExams.length, color: 'indigo' },
                { label: 'Ready', value: uploadedExams.filter((e) => e.status === 'ready').length, color: 'green' },
                { label: 'Pending', value: uploadedExams.filter((e) => e.status === 'pending_extraction').length, color: 'amber' },
                { label: 'Subjects', value: new Set(uploadedExams.map((e) => e.subject).filter(Boolean)).size, color: 'purple' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-2xl p-4 border border-${color}-100 dark:border-${color}-800`}>
                  <p className={`text-2xl font-black text-${color}-600 dark:text-${color}-400`}>{value}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest text-${color}-500 dark:text-${color}-400 mt-0.5`}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search exams..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 text-sm outline-none focus:border-indigo-500" />
            </div>

            {/* Subject filter */}
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 text-xs font-bold outline-none focus:border-indigo-500 min-w-32">
              <option value="">All Subjects</option>
              {[...new Set(uploadedExams.map((e) => e.subject).filter(Boolean))].sort().map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Grade filter */}
            <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 text-xs font-bold outline-none focus:border-indigo-500">
              <option value="">All Grades</option>
              {GRADES.map((g) => <option key={g} value={String(g)}>Grade {g}</option>)}
            </select>

            {/* Status filter */}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 text-xs font-bold outline-none focus:border-indigo-500">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            {/* Sort */}
            <button onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border dark:border-slate-700 text-xs font-black text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
              <Filter size={12} />
              {sortDir === 'desc' ? 'Newest First' : 'Oldest First'}
            </button>

            {/* Clear */}
            {(searchTerm || filterSubject || filterGrade || filterStatus) && (
              <button onClick={() => { setSearchTerm(''); setFilterSubject(''); setFilterGrade(''); setFilterStatus(''); }}
                className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-black hover:bg-red-100 transition-colors">
                <X size={12} /> Clear
              </button>
            )}

            <p className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {filteredExams.length} result{filteredExams.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Audit rows */}
          {filteredExams.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-20 border border-slate-100 dark:border-slate-800 text-center">
              <FileText className="text-slate-200 dark:text-slate-700 mx-auto mb-3" size={40} />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                {uploadedExams.length === 0 ? 'No exams uploaded yet' : 'No results match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExams.map((exam) => {
                const id = exam.examId || exam.id || exam.uploadedAt;
                return (
                  <AuditRow
                    key={id}
                    exam={exam}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    expanded={expandedRow === id}
                    onToggle={() => setExpandedRow(expandedRow === id ? null : id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editingExam && (
        <EditExamModal
          exam={editingExam}
          onSave={handleSaveEdit}
          onClose={() => setEditingExam(null)}
        />
      )}

      {/* Logout */}
      <button onClick={handleLogout}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-600 transition-all font-black border border-slate-200 dark:border-slate-800 mt-12 text-xs uppercase tracking-widest">
        <LogOut size={16} /> Close Session
      </button>
    </div>
  );
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-white/10 p-2 rounded-xl border border-white/5">
        <Icon className="w-4 h-4 text-indigo-300" />
      </div>
      <div>
        <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">{label}</p>
        <p className="font-bold text-sm truncate max-w-[130px]">{value}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
        }`}>
      {icon} {label}
      {badge && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center animate-pulse">{badge}</span>}
    </button>
  );
}

function StepHeader({ num, title }) {
  return (
    <div className="flex items-center gap-4 mb-2">
      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg">{num}</div>
      <h3 className="text-xl font-black">{title}</h3>
    </div>
  );
}

function FileDropZone({ id, file, onChange, icon, label, accentColor = 'indigo' }) {
  const border = accentColor === 'green' ? 'border-green-200 bg-green-50/30' : 'border-indigo-200 bg-indigo-50/30';
  return (
    <div className={`border-4 border-dashed rounded-[2rem] p-12 text-center transition-all ${file ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : border}`}>
      <input type="file" id={id} accept=".pdf" onChange={(e) => onChange(e.target.files[0])} className="hidden" />
      <label htmlFor={id} className="cursor-pointer block">
        <div className="bg-white dark:bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-slate-100 dark:border-slate-700">
          {file ? <CheckCircle2 className="text-green-500" size={40} /> : icon}
        </div>
        <p className="text-lg font-black">{file ? file.name : label}</p>
        <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mt-2">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF FORMAT ONLY · MAX 20MB'}</p>
      </label>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-slate-400 text-xs font-bold">{label}</span>
      <span className="font-black text-slate-700 dark:text-slate-200 text-xs">{value}</span>
    </div>
  );
}