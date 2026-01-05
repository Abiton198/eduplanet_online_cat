import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, or } from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  BookOpen,
  Archive,
  Inbox,
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react';

/* -------------------- GRADE NORMALIZER -------------------- */
const extractGradeNumber = (data = {}) => {
  if (data.grade) {
    const g = parseInt(String(data.grade).replace(/\D/g, ''), 10);
    if (!isNaN(g)) return g;
  }

  if (data.gradeYear) {
    const g = parseInt(String(data.gradeYear), 10);
    if (!isNaN(g)) return g;
  }

  if (data.exam) {
    const match = String(data.exam).match(/grade\s*(\d+)/i);
    if (match) return parseInt(match[1], 10);
  }

  return null;
};

/* -------------------- COMPONENT -------------------- */
export default function ExamResultsDisplay() {
  const [results, setResults] = useState({ history: [], current: [] });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [currentGrade, setCurrentGrade] = useState(null);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        /* ---- STUDENT PROFILE ---- */
        const profileSnap = await getDoc(doc(db, 'students', user.uid));
        const profileData = profileSnap.exists() ? profileSnap.data() : {};

        const studentName = (profileData.name || user.displayName || "").trim();
        const studentGrade = extractGradeNumber(profileData) || 12;
        setCurrentGrade(studentGrade);

        /* ---- FETCH RESULTS ---- */
        const resultsRef = collection(db, 'examResults');
        const q = query(
          resultsRef,
          or(
            where('studentId', '==', user.uid),
            where('name', '==', studentName)
          )
        );

        const snap = await getDocs(q);

        const history = [];
        const current = [];

        snap.forEach((d) => {
          const data = d.data();
          const grade = extractGradeNumber(data);
          if (!grade) return;

          const record = { id: d.id, ...data };

          if (grade < studentGrade) history.push(record);
          if (grade === studentGrade) current.push(record);
        });

        const sortByDate = (arr) =>
          arr.sort(
            (a, b) =>
              new Date(b.completedTime || b.completedDate) -
              new Date(a.completedTime || a.completedDate)
          );

        setResults({
          history: sortByDate(history),
          current: sortByDate(current),
        });
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /* -------------------- UI HELPERS -------------------- */
  const getTheme = (pct) => {
    const p = parseFloat(pct);
    if (p >= 75) return { bg: 'bg-green-50 border-green-200', accent: 'bg-green-600', text: 'text-green-700' };
    if (p >= 50) return { bg: 'bg-blue-50 border-blue-200', accent: 'bg-blue-600', text: 'text-blue-700' };
    return { bg: 'bg-red-50 border-red-200', accent: 'bg-red-500', text: 'text-red-700' };
  };

  /* -------------------- RESULT CARD -------------------- */
  const ResultCard = ({ res }) => {
    const theme = getTheme(res.percentage);
    const open = expandedId === res.id;

    return (
      <div className={`mb-3 border rounded-xl overflow-hidden shadow-sm ${theme.bg}`}>
        <div
          className="p-4 flex justify-between cursor-pointer hover:bg-white/40"
          onClick={() => setExpandedId(open ? null : res.id)}
        >
          <div className="flex gap-3">
            <div className={`p-2 rounded-lg ${theme.accent} text-white`}>
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="font-black text-[11px] text-gray-900">{res.exam}</h3>
              <p className="text-[9px] uppercase font-bold text-gray-400">
                Grade {res.grade || res.gradeYear} • {res.completedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`font-black text-sm ${theme.text}`}>
              {res.percentage}%
            </span>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {open && (
          <div className="bg-white border-t p-5 animate-in slide-in-from-top-1">
            {/* ---- STATS ---- */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Stat label="Time" value={res.timeSpent} />
              <Stat label="Score" value={res.score} />
              <Stat label="Attempt" value={res.attempts || 1} />
              <Stat label="Unanswered" value={res.unanswered || 0} />
            </div>

            {/* ---- ANSWERS ---- */}
            <div className="space-y-2">
              {res.answers?.map((ans, idx) => {
                const correct =
                  String(ans.answer).trim().toLowerCase() ===
                  String(ans.correctAnswer).trim().toLowerCase();

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded border-l-4 ${
                      correct
                        ? 'bg-green-50 border-green-500'
                        : 'bg-red-50 border-red-500'
                    }`}
                  >
                    <div className="flex gap-2 items-start">
                      {correct ? (
                        <CheckCircle size={14} className="text-green-600 mt-0.5" />
                      ) : (
                        <XCircle size={14} className="text-red-600 mt-0.5" />
                      )}
                      <div>
                        <p className="text-[11px] font-bold text-gray-800">
                          {idx + 1}. {ans.question}
                        </p>
                        <p className="text-[10px] mt-1">
                          <span className="text-gray-400">Answered:</span>{" "}
                          <span className={correct ? 'text-green-700' : 'text-red-700 font-bold'}>
                            {ans.answer || "No Answer"}
                          </span>
                        </p>
                        {!correct && (
                          <p className="text-[10px]">
                            <span className="text-gray-400">Correct:</span>{" "}
                            <span className="text-green-700 font-bold">
                              {ans.correctAnswer}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const Stat = ({ label, value }) => (
    <div className="bg-gray-50 p-2 rounded border text-center">
      <p className="text-[8px] uppercase font-black text-gray-400">{label}</p>
      <p className="text-xs font-bold text-gray-800">{value}</p>
    </div>
  );

  /* -------------------- RENDER -------------------- */
  if (loading) {
    return (
      <div className="p-20 text-center font-black text-indigo-600 animate-pulse text-[10px] tracking-[0.4em]">
        ACCESSING ACADEMIC RECORDS...
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-10">

      {/* -------- HISTORY -------- */}
      <section>
        <Header icon={Archive} title="Previous History" />
        {results.history.length ? (
          results.history.map(r => <ResultCard key={r.id} res={r} />)
        ) : (
          <Empty icon={Inbox} text="No Archived Records" />
        )}
      </section>

      {/* -------- CURRENT -------- */}
      <section>
        <Header icon={Target} title={`Grade ${currentGrade} Progress`} />
        {results.current.length ? (
          results.current.map(r => <ResultCard key={r.id} res={r} />)
        ) : (
          <Empty icon={Clock} text={`Waiting for Grade ${currentGrade} Results`} />
        )}
      </section>
    </div>
  );
}

/* -------------------- SMALL COMPONENTS -------------------- */
const Header = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl text-white bg-slate-800">
    <Icon size={18} />
    <h2 className="font-black uppercase tracking-widest text-xs">{title}</h2>
  </div>
);

const Empty = ({ icon: Icon, text }) => (
  <div className="text-center py-16 border-2 border-dashed rounded-3xl bg-gray-50">
    <Icon size={32} className="mx-auto text-gray-200 mb-2" />
    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
      {text}
    </p>
  </div>
);
