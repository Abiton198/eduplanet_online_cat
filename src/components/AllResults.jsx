// src/components/AllResults.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getAuth,
  onAuthStateChanged,
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import ResultsAnalysisHub from "../utils/ResultsAnalysisHub";
import AnalysisComponent from "./AnalysisComponent";

/* ---------------------------------------------
   Date / exam helpers (includes your examDate)
---------------------------------------------- */
function toDateString(v) {
  if (!v) return "-";
  try {
    if (typeof v === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      if (v.includes("T")) return v.slice(0, 10);
      return v;
    }
    if (typeof v === "object" && v.seconds && v.nanoseconds) {
      const d = new Date(v.seconds * 1000);
      return d.toISOString().slice(0, 10);
    }
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  } catch (_) {}
  return "-";
}
function pickCompletedDate(obj = {}) {
  const candidates = [
    obj.examDate,
    obj.theory?.examDate,
    obj.practical?.examDate,
    obj.completedDate,
    obj.completedTime,
    obj.completedAt,
    obj.date,
    obj.createdAt,
    obj.theory?.completedDate,
    obj.practical?.completedDate,
    obj.theory?.completedAt,
    obj.practical?.completedAt,
  ];
  for (const c of candidates) {
    const s = toDateString(c);
    if (s && s !== "-") return s;
  }
  return "-";
}
function pickExamName(obj = {}, fallback) {
  return (
    obj.examTitle ||
    obj.examName ||
    obj.theory?.examTitle ||
    obj.practical?.examTitle ||
    obj.theory?.examName ||
    obj.practical?.examName ||
    obj.exam ||
    fallback
  );
}

const G12_KEYS = ["Grade 12", "12A", "12B", "12"];

export default function AllResults() {
  const navigate = useNavigate();

  // -------- Data stores --------
  const [mainView, setMainView] = useState("june"); // "june" | "prelim"
  const [juneRows, setJuneRows] = useState([]);
  const [prelimRows, setPrelimRows] = useState([]);
  const [generalExamData, setGeneralExamData] = useState([]);

  // -------- Auth / roles --------
  const [user, setUser] = useState(null);
  const [adminDocExists, setAdminDocExists] = useState(false);
  const [signInProvider, setSignInProvider] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);

  // -------- Access / UI --------
  const [accessChecked, setAccessChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [activeSection, setActiveSection] = useState("main");
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // -------- Filters (Main) --------
  const [selectedGrade, setSelectedGrade] = useState("All Grades");
  const [mainName, setMainName] = useState("");
  const [mainDateFrom, setMainDateFrom] = useState("");
  const [mainDateTo, setMainDateTo] = useState("");
  const [mainExamName, setMainExamName] = useState("");

  // -------- Sorting (Main) --------
  const [sortField, setSortField] = useState(null); // "theory" | "practical" | "grand" | null
  const [sortDir, setSortDir] = useState("desc"); // "asc" | "desc"

  // -------- Filters (General) --------
  const [generalDateFrom, setGeneralDateFrom] = useState("");
  const [generalDateTo, setGeneralDateTo] = useState("");
  const [generalExam, setGeneralExam] = useState("");
  const [generalName, setGeneralName] = useState("");

  // -------- Sorting (General) --------
  const [gSortField, setGSortField] = useState(null); // "score" | "percentage" | null
  const [gSortDir, setGSortDir] = useState("desc"); // "asc" | "desc"

  // Admin quick-fix
  const [adminPwd1, setAdminPwd1] = useState("");
  const [adminPwd2, setAdminPwd2] = useState("");
  const [adminFixBusy, setAdminFixBusy] = useState(false);
  const [adminFixMsg, setAdminFixMsg] = useState("");

  const unsubsRef = useRef([]);

  /* ---------------------------------------------
     Auth + role detection
  ---------------------------------------------- */
  const refreshAdminStatus = async (u) => {
    if (!u) {
      setAdminDocExists(false);
      setIsTeacher(false);
      setSignInProvider("");
      return;
    }
    try {
      const token = await u.getIdTokenResult(true);
      setSignInProvider(token?.signInProvider || "");
      setIsTeacher(token?.claims?.role === "teacher");
      let exists = false;
      if (u.email) {
        const adminSnap = await getDoc(doc(db, "admins", u.email));
        exists = adminSnap.exists();
      }
      setAdminDocExists(exists);
    } catch (e) {
      console.warn("refreshAdminStatus failed:", e);
      setAdminDocExists(false);
      setIsTeacher(false);
      setSignInProvider("");
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const stop = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setAccessChecked(false);
      await refreshAdminStatus(u);
      setAccessChecked(true);
    });
    return () => stop();
  }, []);

  async function addPasswordProvider(password) {
    const auth = getAuth();
    const cu = auth.currentUser;
    if (!cu?.email) throw new Error("No signed-in user/email");
    await reauthenticateWithPopup(cu, new GoogleAuthProvider());
    const cred = EmailAuthProvider.credential(cu.email, password);
    await linkWithCredential(cu, cred);
    await cu.getIdToken(true);
  }

  const enableAdminViaPassword = async () => {
    setAdminFixMsg("");
    if (!user?.email) return setAdminFixMsg("No signed-in user/email detected.");
    if (adminPwd1.length < 8) return setAdminFixMsg("Password must be at least 8 characters.");
    if (adminPwd1 !== adminPwd2) return setAdminFixMsg("Passwords do not match.");

    setAdminFixBusy(true);
    try {
      await addPasswordProvider(adminPwd1).catch((e) => {
        if (e?.code && !String(e.code).includes("already")) throw e;
      });
      const auth = getAuth();
      await signOut(auth);
      await signInWithEmailAndPassword(auth, user.email, adminPwd1);
      await refreshAdminStatus(auth.currentUser);
      setAdminFixMsg("Re-signed with Email/Password. If your rules require provider=='password', you should now have admin access.");
    } catch (e) {
      const msg =
        e?.code === "auth/operation-not-allowed"
          ? "Email/Password sign-in is disabled in Firebase Auth. Enable it in the Firebase Console."
          : e?.message || "Failed to enable admin via password.";
      setAdminFixMsg(msg);
    } finally {
      setAdminFixBusy(false);
    }
  };

  /* ---------------------------------------------
     Live subscriptions
  ---------------------------------------------- */
  useEffect(() => {
    unsubsRef.current.forEach((fn) => fn && fn());
    unsubsRef.current = [];
    setErrorMsg("");
    setInfoMsg("");

    const u = user;
    if (!u?.uid) return;

    const canSeeAllClient = adminDocExists || isTeacher;
    const unsubs = [];

    // JUNE (studentResults)
    if (canSeeAllClient) {
      try {
        const unsubJune = onSnapshot(
          collection(db, "studentResults"),
          (snap) => {
            const rows = snap.docs.map((d) => {
              const data = d.data() || {};
              const grade = data.grade || data.theory?.grade || data.practical?.grade || "Unknown";
              const isGr12 = G12_KEYS.includes(String(grade));
              const prac = (data.practical?.results || []).reduce((s, r) => s + Number(r.score || 0), 0);
              const theo = (data.theory?.results || []).reduce((s, r) => s + Number(r.score || 0), 0);
              const pracMax = isGr12 ? 150 : 100;
              const theoMax = isGr12 ? 150 : 120;

              return {
                id: d.id,
                name: d.id || data.name || "Unknown",
                grade,
                examName: pickExamName(data, "June Exam"),
                completedDate: pickCompletedDate(data),
                theoryPercent: Number(((theo / theoMax) * 100).toFixed(2)),
                practicalPercent: Number(((prac / pracMax) * 100).toFixed(2)),
                grand: Math.round(((theo / theoMax) * 50 + (prac / pracMax) * 50)),
                feedback: data?.theory?.comment || data?.practical?.comment || "",
              };
            });
            setJuneRows(rows);
          },
          (e) => {
            console.error("studentResults listen failed:", e);
            setErrorMsg("Permission denied reading studentResults (June).");
          }
        );
        unsubs.push(unsubJune);
      } catch (e) {
        console.warn("Attach studentResults failed:", e);
      }
    } else {
      setInfoMsg("You don’t have staff privileges for main results. Ask an owner to add /admins/{yourEmail} or set role=teacher.");
      setJuneRows([]);
    }

    // PRELIM (prelimResults)
    if (canSeeAllClient) {
      try {
        const unsubPrelim = onSnapshot(
          collection(db, "prelimResults"),
          (snap) => {
            const rows = snap.docs.map((d) => {
              const data = d.data() || {};
              const grade = data.grade || data.theory?.grade || data.practical?.grade || "Unknown";
              const isGr12 = G12_KEYS.includes(String(grade));
              const prac = (data.practical?.results || []).reduce((s, r) => s + Number(r.score || 0), 0);
              const theo = (data.theory?.results || []).reduce((s, r) => s + Number(r.score || 0), 0);
              const pracMax = isGr12 ? 150 : 100;
              const theoMax = isGr12 ? 150 : 120;

              return {
                id: d.id,
                name: d.id || data.name || "Unknown",
                grade,
                examName: pickExamName(data, "Prelim Exam"),
                completedDate: pickCompletedDate(data),
                theoryPercent: Number(((theo / theoMax) * 100).toFixed(2)),
                practicalPercent: Number(((prac / pracMax) * 100).toFixed(2)),
                grand: Math.round(((theo / theoMax) * 50 + (prac / pracMax) * 50)),
                feedback: data?.theory?.comment || data?.practical?.comment || "",
              };
            });
            setPrelimRows(rows);
          },
          (e) => {
            console.error("prelimResults listen failed:", e);
            setErrorMsg("Permission denied reading prelimResults.");
          }
        );
        unsubs.push(unsubPrelim);
      } catch (e) {
        console.warn("Attach prelimResults failed:", e);
      }
    } else {
      setPrelimRows([]);
    }

    // GENERAL (examResults)
    try {
      const unsubGeneral = onSnapshot(
        collection(db, "examResults"),
        (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setGeneralExamData(arr);
        },
        (e) => {
          console.error("examResults listen failed:", e);
          setErrorMsg("Could not load general exam attempts.");
        }
      );
      unsubs.push(unsubGeneral);
    } catch (e) {
      console.warn("Attach examResults failed:", e);
    }

    unsubsRef.current = unsubs;
    return () => unsubs.forEach((fn) => fn && fn());
  }, [db, user?.uid, adminDocExists, isTeacher]);

  /* ---------------------------------------------
     Derived
  ---------------------------------------------- */
  const normalize = (s = "") => String(s).replace(/\s+/g, "").toLowerCase();
  const activeMainRows = mainView === "june" ? juneRows : prelimRows;

  const filteredMain = useMemo(() => {
    return activeMainRows.filter((s) => {
      const gradeMatch =
        selectedGrade === "All Grades" ||
        normalize(String(s.grade)) === normalize(selectedGrade);

      const nameMatch =
        !mainName || String(s.name || "").toLowerCase().includes(mainName.toLowerCase());

      const examMatch =
        !mainExamName || String(s.examName || "").toLowerCase().includes(mainExamName.toLowerCase());

      const d = String(s.completedDate || "");
      const fromOk = !mainDateFrom || (d && d >= mainDateFrom);
      const toOk = !mainDateTo || (d && d <= mainDateTo);

      return gradeMatch && nameMatch && examMatch && fromOk && toOk;
    });
  }, [activeMainRows, selectedGrade, mainName, mainDateFrom, mainDateTo, mainExamName]);

  const sortedMain = useMemo(() => {
    if (!sortField) return filteredMain;
    const key =
      sortField === "theory" ? "theoryPercent" :
      sortField === "practical" ? "practicalPercent" :
      "grand";
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredMain].sort((a, b) => {
      const av = Number(a[key] ?? -Infinity);
      const bv = Number(b[key] ?? -Infinity);
      if (av === bv) return 0;
      return av < bv ? -1 * dir : 1 * dir;
    });
  }, [filteredMain, sortField, sortDir]);

  const filteredGeneral = useMemo(() => {
    return generalExamData.filter((r) => {
      // Grade filter
      const g = r.grade ? normalize(String(r.grade)) : "";
      const sel = normalize(selectedGrade);
      const gradeMatch = selectedGrade === "All Grades" || g === sel;

      // Date filter — normalize all variants
      const date = toDateString(
        r.completedDate || r.examDate || r.completedTime || r.completedAt || r.date
      );
      const fromOk = !generalDateFrom || (date && date >= generalDateFrom);
      const toOk = !generalDateTo || (date && date <= generalDateTo);

      // Exam & name
      const examText = (r.exam || r.examTitle || "").toLowerCase();
      const examMatch = !generalExam || examText.includes(generalExam.toLowerCase());
      const nameMatch = !generalName || (r.name || "").toLowerCase().includes(generalName.toLowerCase());

      return gradeMatch && fromOk && toOk && examMatch && nameMatch;
    });
  }, [generalExamData, selectedGrade, generalDateFrom, generalDateTo, generalExam, generalName]);

  const sortedGeneral = useMemo(() => {
    if (!gSortField) return filteredGeneral;
    const dir = gSortDir === "asc" ? 1 : -1;
    const getVal = (row) => {
      if (gSortField === "score") {
        const n = Number(row.score);
        return Number.isFinite(n) ? n : -Infinity;
      }
      if (gSortField === "percentage") {
        const n = Number(row.percentage);
        return Number.isFinite(n) ? n : -Infinity;
      }
      return 0;
    };
    return [...filteredGeneral].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (av === bv) return 0;
      return av < bv ? -1 * dir : 1 * dir;
    });
  }, [filteredGeneral, gSortField, gSortDir]);

  /* ---------------------------------------------
     Exports
  ---------------------------------------------- */
  const exportResults = (fileName, format, body) => {
    if (format === "excel" || format === "csv") {
      const ws = XLSX.utils.json_to_sheet(body);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, fileName);
      XLSX.writeFile(wb, `${fileName}.${format === "csv" ? "csv" : "xlsx"}`);
    } else if (format === "pdf") {
      const docx = new jsPDF();
      docx.text(fileName, 14, 20);
      const headers = Object.keys(body[0] || {});
      autoTable(docx, {
        head: [headers],
        body: body.map((row) => headers.map((h) => row[h] ?? "-")),
        startY: 30,
      });
      docx.save(`${fileName}.pdf`);
    }
  };

  const exportMainResults = (format) => {
    const label = mainView === "june" ? "June" : "Prelim";
    const body = sortedMain.map((s) => ({
      Date: s.completedDate || "-",
      Exam: s.examName || "-",
      Name: s.name || "-",
      Grade: String(s.grade || "-"),
      "Theory %": Number.isFinite(s.theoryPercent) ? `${s.theoryPercent}%` : "-",
      "Practical %": Number.isFinite(s.practicalPercent) ? `${s.practicalPercent}%` : "-",
      "Grand %": Number.isFinite(s.grand) || s.grand === 0 ? `${s.grand}%` : "-",
    }));
    exportResults(`${label}MainResults_${selectedGrade.replace(/\s+/g, "")}`, format, body);
  };

  const exportGeneralResults = (format) => {
    const body = sortedGeneral.map((r) => ({
      Date: toDateString(r.completedDate || r.examDate || r.completedTime || r.completedAt || r.date) || "-",
      Name: r.name || "-",
      Exam: r.exam || r.examTitle || "-",
      Score: r.score ?? "-",
      Percentage: `${(Number(r.percentage) || 0).toFixed(1)}%`,
    }));
    exportResults(`GeneralResults_${selectedGrade.replace(/\s+/g, "")}`, format, body);
  };

  const resetMainFilters = () => {
    setSelectedGrade("All Grades");
    setMainName("");
    setMainDateFrom("");
    setMainDateTo("");
    setMainExamName("");
  };
  const resetGeneralFilters = () => {
    setSelectedGrade("All Grades"); // reset grade for General tab too
    setGeneralDateFrom("");
    setGeneralDateTo("");
    setGeneralExam("");
    setGeneralName("");
  };

  /* ---------------------------------------------
     Banners
  ---------------------------------------------- */
  if (!accessChecked) {
    return <div className="text-center pt-28 text-gray-500">Checking access…</div>;
  }

  const canSeeAllClient = adminDocExists || isTeacher;
  const statusLines = [
    `Signed in as: ${user?.email || "(no email on account)"}`,
    `sign_in_provider (token): ${signInProvider || "(unknown)"}`,
    `admins/${user?.email || "your-email"} exists: ${adminDocExists ? "yes" : "no"}`,
    `teacher claim: ${isTeacher ? "yes" : "no"}`,
    `Staff access (client): ${canSeeAllClient ? "ENABLED" : "DISABLED"}`,
  ];
  const showAdminQuickFix = adminDocExists && !isTeacher && signInProvider !== "password";

  /* ---------------------------------------------
     UI
  ---------------------------------------------- */
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-4">📊 All Results Dashboard</h2>

      {errorMsg && <div className="mb-3 p-3 rounded bg-red-100 text-red-800 text-sm">{errorMsg}</div>}
      {infoMsg && !errorMsg && <div className="mb-3 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">{infoMsg}</div>}

      <div className="mb-4 p-3 rounded bg-gray-50 border text-xs space-y-1">
        {statusLines.map((l, i) => <div key={i}>{l}</div>)}
        <div className="pt-2">
          <button
            onClick={() => user?.getIdTokenResult(true).then(() => refreshAdminStatus(user))}
            className="px-3 py-1 rounded bg-blue-600 text-white"
          >
            Re-check admin status
          </button>
        </div>
      </div>

      {showAdminQuickFix && (
        <div className="mb-6 p-4 rounded border bg-white">
          <h3 className="font-semibold mb-2">Quick fix: Enable Admin via Email/Password</h3>
          <p className="text-sm text-gray-700 mb-3">
            Your rules likely require <code>sign_in_provider == "password"</code>.
            Link a password to <b>{user?.email}</b> and sign back in with Email/Password.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <input type="password" placeholder="New password (min 8 chars)" className="border rounded px-3 py-2 flex-1" value={adminPwd1} onChange={(e) => setAdminPwd1(e.target.value)} />
            <input type="password" placeholder="Confirm password" className="border rounded px-3 py-2 flex-1" value={adminPwd2} onChange={(e) => setAdminPwd2(e.target.value)} />
          </div>
          <button onClick={enableAdminViaPassword} disabled={adminFixBusy} className={`px-4 py-2 rounded text-white ${adminFixBusy ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"}`}>
            {adminFixBusy ? "Working…" : "Enable Admin via Password"}
          </button>
          {adminFixMsg && <div className="mt-2 text-sm">{adminFixMsg}</div>}
        </div>
      )}

      <div className="flex justify-center gap-4 mb-6">
        <button onClick={() => { setActiveSection("main"); setSelectedGrade("All Grades"); }} className={`px-4 py-2 rounded text-white ${activeSection === "main" ? "bg-purple-700" : "bg-purple-600"}`}>🏆 Main Exams</button>
        <button onClick={() => { setActiveSection("general"); setSelectedGrade("All Grades"); }} className={`px-4 py-2 rounded text-white ${activeSection === "general" ? "bg-green-700" : "bg-green-600"}`}>📝 General Exams</button>
        <button onClick={() => { setActiveSection("analysis"); }} className={`px-4 py-2 rounded text-white ${activeSection === "analysis" ? "bg-blue-700" : "bg-blue-600"}`}>📈 Analysis</button>
      </div>

      {activeSection && (
        <>
          {/* ===== MAIN (June/Prelim Toggle) ===== */}
          {activeSection === "main" && (
            <div className="bg-white p-4 rounded shadow overflow-x-auto">
              {/* Toggle + Export */}
              <div className="flex flex-wrap justify-between items-end gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">View:</span>
                  <div className="inline-flex rounded-lg border overflow-hidden">
                    <button onClick={() => setMainView("june")} className={`px-3 py-2 text-sm ${mainView === "june" ? "bg-indigo-600 text-white" : "bg-white hover:bg-gray-50"}`}>June</button>
                    <button onClick={() => setMainView("prelim")} className={`px-3 py-2 text-sm ${mainView === "prelim" ? "bg-indigo-600 text-white" : "bg-white hover:bg-gray-50"}`}>Prelim</button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => exportMainResults("excel")} className="bg-green-600 text-white px-3 py-2 rounded">Excel</button>
                  <button onClick={() => exportMainResults("csv")} className="bg-yellow-500 text-white px-3 py-2 rounded">CSV</button>
                  <button onClick={() => exportMainResults("pdf")} className="bg-red-600 text-white px-3 py-2 rounded">PDF</button>
                </div>
              </div>

              {/* Main filters */}
              <div className="grid md:grid-cols-6 sm:grid-cols-2 grid-cols-1 gap-3 mb-3">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Grade</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="border rounded px-3 py-2"
                  >
                    {["All Grades", "11", "Grade 12", "12A", "12B"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Date from</label>
                  <input type="date" value={mainDateFrom} onChange={(e) => setMainDateFrom(e.target.value)} className="border rounded px-3 py-2" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Date to</label>
                  <input type="date" value={mainDateTo} onChange={(e) => setMainDateTo(e.target.value)} className="border rounded px-3 py-2" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Exam</label>
                  <input value={mainExamName} onChange={(e) => setMainExamName(e.target.value)} placeholder="e.g. Theory Exam" className="border rounded px-3 py-2" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Student (doc ID)</label>
                  <input value={mainName} onChange={(e) => setMainName(e.target.value)} placeholder="e.g. ZAKA, Zola" className="border rounded px-3 py-2" />
                </div>
                <div className="flex items-end">
                  <button onClick={resetMainFilters} className="w-full border rounded px-3 py-2 hover:bg-gray-100">
                    Reset filters
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="flex justify-between items-end mb-3">
                <h3 className="text-lg font-semibold">{selectedGrade} — {mainView === "june" ? "June" : "Prelim"} Results</h3>
              </div>

              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Exam</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Grade</th>

                    {/* Sortable headers (main) */}
                    <th className="border p-2">
                      <div className="flex items-center justify-center gap-1">
                        <span>Theory %</span>
                        <div className="flex flex-col">
                          <button title="Sort ascending" className={`leading-none text-xs ${sortField === "theory" && sortDir === "asc" ? "text-indigo-600" : "text-gray-500"}`} onClick={() => { setSortField("theory"); setSortDir("asc"); }}>▲</button>
                          <button title="Sort descending" className={`leading-none text-xs ${sortField === "theory" && sortDir === "desc" ? "text-indigo-600" : "text-gray-500"}`} onClick={() => { setSortField("theory"); setSortDir("desc"); }}>▼</button>
                        </div>
                      </div>
                    </th>
                    <th className="border p-2">
                      <div className="flex items-center justify-center gap-1">
                        <span>Practical %</span>
                        <div className="flex flex-col">
                          <button title="Sort ascending" className={`leading-none text-xs ${sortField === "practical" && sortDir === "asc" ? "text-indigo-600" : "text-gray-500"}`} onClick={() => { setSortField("practical"); setSortDir("asc"); }}>▲</button>
                          <button title="Sort descending" className={`leading-none text-xs ${sortField === "practical" && sortDir === "desc" ? "text-indigo-600" : "text-gray-500"}`} onClick={() => { setSortField("practical"); setSortDir("desc"); }}>▼</button>
                        </div>
                      </div>
                    </th>
                    <th className="border p-2">
                      <div className="flex items-center justify-center gap-1">
                        <span>Grand %</span>
                        <div className="flex flex-col">
                          <button title="Sort ascending" className={`leading-none text-xs ${sortField === "grand" && sortDir === "asc" ? "text-indigo-600" : "text-gray-500"}`} onClick={() => { setSortField("grand"); setSortDir("asc"); }}>▲</button>
                          <button title="Sort descending" className={`leading-none text-xs ${sortField === "grand" && sortDir === "desc" ? "text-indigo-600" : "text-gray-500"}`} onClick={() => { setSortField("grand"); setSortDir("desc"); }}>▼</button>
                        </div>
                      </div>
                    </th>

                    <th className="border p-2">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMain.map((s) => (
                    <tr key={`${mainView}-${s.id}`} className="text-center hover:bg-gray-50">
                      <td className="border p-2">{s.completedDate || "-"}</td>
                      <td className="border p-2">{s.examName || "-"}</td>
                      <td className="border p-2">{s.name || "-"}</td>
                      <td className="border p-2">{String(s.grade || "-")}</td>
                      <td className={`border p-2 ${Number(s.theoryPercent) >= 35 ? "text-green-600" : "text-red-600"}`}>
                        {Number.isFinite(s.theoryPercent) ? `${s.theoryPercent}%` : "-"}
                      </td>
                      <td className={`border p-2 ${Number(s.practicalPercent) >= 35 ? "text-green-600" : "text-red-600"}`}>
                        {Number.isFinite(s.practicalPercent) ? `${s.practicalPercent}%` : "-"}
                      </td>
                      <td className={`border p-2 font-bold ${Number(s.grand) >= 35 ? "text-green-700" : "text-red-700"}`}>
                        {Number.isFinite(s.grand) || s.grand === 0 ? `${s.grand}%` : "-"}
                      </td>
                      <td className="border p-2">
                        {s.feedback ? (
                          <button onClick={() => setSelectedFeedback(s.feedback)} className="text-blue-600 underline">View</button>
                        ) : <span className="text-gray-400">None</span>}
                      </td>
                    </tr>
                  ))}
                  {sortedMain.length === 0 && (
                    <tr>
                      <td colSpan={9} className="border p-2 text-center text-gray-500">
                        {canSeeAllClient ? "No results match your filters." : "Restricted by rules. Use the quick fix above or patch your rules."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== GENERAL (examResults) ===== */}
          {activeSection === "general" && (
            <div className="bg-white p-4 rounded shadow overflow-x-auto mt-6">
              <div className="flex justify-between items-end mb-3">
                <h3 className="text-lg font-semibold">{selectedGrade} - General Exam Results</h3>
                <div className="flex gap-2">
                  <button onClick={() => exportGeneralResults("excel")} className="bg-green-600 text-white px-3 py-2 rounded">Excel</button>
                  <button onClick={() => exportGeneralResults("csv")} className="bg-yellow-500 text-white px-3 py-2 rounded">CSV</button>
                  <button onClick={() => exportGeneralResults("pdf")} className="bg-red-600 text-white px-3 py-2 rounded">PDF</button>
                </div>
              </div>

              {/* ✅ General filters (now include Grade) */}
              <div className="grid md:grid-cols-6 sm:grid-cols-2 grid-cols-1 gap-3 mb-3">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Grade</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="border rounded px-3 py-2"
                  >
                    {["All Grades", "11", "Grade 12", "12A", "12B"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Date from</label>
                  <input type="date" value={generalDateFrom} onChange={(e) => setGeneralDateFrom(e.target.value)} className="border rounded px-3 py-2" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Date to</label>
                  <input type="date" value={generalDateTo} onChange={(e) => setGeneralDateTo(e.target.value)} className="border rounded px-3 py-2" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Exam</label>
                  <input value={generalExam} onChange={(e) => setGeneralExam(e.target.value)} placeholder="e.g. Theory Exam" className="border rounded px-3 py-2" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Student name</label>
                  <input value={generalName} onChange={(e) => setGeneralName(e.target.value)} placeholder="e.g. Zola" className="border rounded px-3 py-2" />
                </div>
                <div className="flex items-end">
                  <button onClick={resetGeneralFilters} className="w-full border rounded px-3 py-2 hover:bg-gray-100">
                    Reset filters
                  </button>
                </div>
              </div>

              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Name</th>
                    <th className="border p-2">Exam</th>

                    {/* Sortable headers (general) */}
                    <th className="border p-2">
                      <div className="flex items-center justify-center gap-1">
                        <span>Score</span>
                        <div className="flex flex-col">
                          <button
                            title="Sort ascending"
                            className={`leading-none text-xs ${gSortField === "score" && gSortDir === "asc" ? "text-indigo-600" : "text-gray-500"}`}
                            onClick={() => { setGSortField("score"); setGSortDir("asc"); }}
                          >▲</button>
                          <button
                            title="Sort descending"
                            className={`leading-none text-xs ${gSortField === "score" && gSortDir === "desc" ? "text-indigo-600" : "text-gray-500"}`}
                            onClick={() => { setGSortField("score"); setGSortDir("desc"); }}
                          >▼</button>
                        </div>
                      </div>
                    </th>

                    <th className="border p-2">
                      <div className="flex items-center justify-center gap-1">
                        <span>Percentage</span>
                        <div className="flex flex-col">
                          <button
                            title="Sort ascending"
                            className={`leading-none text-xs ${gSortField === "percentage" && gSortDir === "asc" ? "text-indigo-600" : "text-gray-500"}`}
                            onClick={() => { setGSortField("percentage"); setGSortDir("asc"); }}
                          >▲</button>
                          <button
                            title="Sort descending"
                            className={`leading-none text-xs ${gSortField === "percentage" && gSortDir === "desc" ? "text-indigo-600" : "text-gray-500"}`}
                            onClick={() => { setGSortField("percentage"); setGSortDir("desc"); }}
                          >▼</button>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGeneral.map((r) => (
                    <tr key={r.id} className="text-center hover:bg-gray-50">
                      <td className="border p-2">{toDateString(r.completedDate || r.examDate || r.completedTime || r.completedAt || r.date) || "-"}</td>
                      <td className="border p-2">{r.name || "-"}</td>
                      <td className="border p-2">{r.exam || r.examTitle || "-"}</td>
                      <td className="border p-2">{r.score ?? "-"}</td>
                      <td className={`border p-2 font-bold ${(Number(r.percentage) || 0) < 50 ? "text-red-600" : "text-green-700"}`}>
                        {(Number(r.percentage) || 0).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {sortedGeneral.length === 0 && (
                    <tr>
                      <td className="border p-2 text-center text-gray-500" colSpan={5}>
                        No general attempts match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== ANALYSIS ===== */}
          {activeSection === "analysis" && (
            <div className="mt-6">
              <AnalysisComponent />
            </div>
          )}
        </>
      )}

      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded p-4 max-w-md w-full">
            <h4 className="text-lg font-semibold mb-2">Student Feedback</h4>
            <p className="text-sm whitespace-pre-wrap">{selectedFeedback}</p>
            <button onClick={() => setSelectedFeedback(null)} className="mt-4 bg-blue-600 text-white px-3 py-1 rounded">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Floating hub */}
      <ResultsAnalysisHub position="bottom-right" passThreshold={50} />
    </div>
  );
}
