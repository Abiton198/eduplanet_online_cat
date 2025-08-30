// AllResults.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
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

export default function AllResults() {
  const navigate = useNavigate();

  // Data
  const [mainExamRows, setMainExamRows] = useState([]);       // studentResults (main)
  const [generalExamData, setGeneralExamData] = useState([]); // examResults (attempts)

  // Auth / roles
  const [user, setUser] = useState(null);
  const [adminDocExists, setAdminDocExists] = useState(false);
  const [signInProvider, setSignInProvider] = useState(""); // "password", "google.com", etc.
  const [isTeacher, setIsTeacher] = useState(false);

  // Access / UI
  const [accessChecked, setAccessChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [activeSection, setActiveSection] = useState("main");

  // Filters
  const [selectedGrade, setSelectedGrade] = useState("All Grades");
  const [mainName, setMainName] = useState("");
  const [generalDateFrom, setGeneralDateFrom] = useState("");
  const [generalDateTo, setGeneralDateTo] = useState("");
  const [generalExam, setGeneralExam] = useState("");
  const [generalName, setGeneralName] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Admin quick-fix (link password & sign in)
  const [adminPwd1, setAdminPwd1] = useState("");
  const [adminPwd2, setAdminPwd2] = useState("");
  const [adminFixBusy, setAdminFixBusy] = useState(false);
  const [adminFixMsg, setAdminFixMsg] = useState("");

  const unsubsRef = useRef([]);

  // ---------- Auth + role detection ----------
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

  // Optional helper: link password to a Google account
  async function addPasswordProvider(password) {
    const auth = getAuth();
    const cu = auth.currentUser;
    if (!cu?.email) throw new Error("No signed-in user/email");

    // Reauth with Google (since your current session is google.com)
    await reauthenticateWithPopup(cu, new GoogleAuthProvider());

    const cred = EmailAuthProvider.credential(cu.email, password);
    await linkWithCredential(cu, cred); // links password to the SAME account
    await cu.getIdToken(true); // refresh token
  }

  // One-click admin fix: link password, sign out, sign back in with password
  const enableAdminViaPassword = async () => {
    setAdminFixMsg("");
    if (!user?.email) {
      setAdminFixMsg("No signed-in user/email detected.");
      return;
    }
    if (adminPwd1.length < 8) {
      setAdminFixMsg("Password must be at least 8 characters.");
      return;
    }
    if (adminPwd1 !== adminPwd2) {
      setAdminFixMsg("Passwords do not match.");
      return;
    }

    setAdminFixBusy(true);
    try {
      // 1) Link password to your Google account (no-op if already linked)
      await addPasswordProvider(adminPwd1).catch((e) => {
        // If it's already linked, Firebase may throw "credential-already-in-use" or similar; ignore and continue
        if (e?.code && !String(e.code).includes("already")) throw e;
      });

      const auth = getAuth();
      // 2) Sign out current google.com session
      await signOut(auth);

      // 3) Sign back in with Email/Password so token.sign_in_provider == "password"
      await signInWithEmailAndPassword(auth, user.email, adminPwd1);

      // 4) Refresh local role state
      await refreshAdminStatus(auth.currentUser);
      setAdminFixMsg("Re-signed with Email/Password. If your rules require provider=='password', you should now have admin access. If not, publish the rule patch below.");
    } catch (e) {
      console.error("enableAdminViaPassword failed:", e);
      const msg =
        e?.code === "auth/operation-not-allowed"
          ? "Email/Password sign-in is disabled in Firebase Auth. Enable it in the Firebase Console."
          : e?.message || "Failed to enable admin via password.";
      setAdminFixMsg(msg);
    } finally {
      setAdminFixBusy(false);
    }
  };

  // ---------- Live subscriptions ----------
  useEffect(() => {
    // cleanup existing listeners
    unsubsRef.current.forEach((fn) => fn && fn());
    unsubsRef.current = [];
    setErrorMsg("");
    setInfoMsg("");

    const u = user;
    if (!u?.uid) return;

    // Client-side "staff" (admin doc or teacher claim)
    const canSeeAllClient = adminDocExists || isTeacher;
    const unsubs = [];

    // MAIN (studentResults) — server rules may still block if they require provider=="password"
    if (canSeeAllClient) {
      try {
        const unsubMain = onSnapshot(
          collection(db, "studentResults"),
          (snap) => {
            const rows = snap.docs.map((d) => {
              const data = d.data() || {};
              const displayName = d.id || data.name || "Unknown";
              const grade =
                data.grade ||
                data.theory?.grade ||
                data.practical?.grade ||
                "Unknown";

              const prac = (data.practical?.results || []).reduce(
                (s, r) => s + Number(r.score || 0),
                0
              );
              const theo = (data.theory?.results || []).reduce(
                (s, r) => s + Number(r.score || 0),
                0
              );

              const isGr12 =
                ["Grade 12", "12A", "12B", "12"].includes(String(grade));
              const pracMax = isGr12 ? 150 : 100;
              const theoMax = isGr12 ? 150 : 120;

              const practicalPercent = ((prac / pracMax) * 100).toFixed(2);
              const theoryPercent = ((theo / theoMax) * 100).toFixed(2);
              const grand = Math.round(
                (parseFloat(practicalPercent) + parseFloat(theoryPercent)) / 2
              );

              const feedback =
                data?.theory?.comment || data?.practical?.comment || "";

              return {
                id: d.id,
                name: displayName,
                grade,
                theoryPercent,
                practicalPercent,
                grand,
                feedback,
              };
            });
            setMainExamRows(rows);
          },
          (e) => {
            console.error("studentResults listen failed:", e);
            setErrorMsg(
              "Permission denied reading studentResults. This is due to Firestore security rules. See quick fixes below."
            );
          }
        );
        unsubs.push(unsubMain);
      } catch (e) {
        console.warn("Attach studentResults failed:", e);
      }
    } else {
      setInfoMsg(
        "You don’t have staff privileges for main results. Ask an owner to add /admins/{yourEmail} or set role=teacher."
      );
      setMainExamRows([]);
    }

    // GENERAL (examResults) — allowed for any signed-in user per your rules
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

  // ---------- Filters / derived ----------
  const normalize = (s = "") => String(s).replace(/\s+/g, "").toLowerCase();

  const filteredMain = useMemo(() => {
    return mainExamRows.filter((s) => {
      const gradeMatch =
        selectedGrade === "All Grades" ||
        normalize(String(s.grade)) === normalize(selectedGrade);
      const nameMatch =
        !mainName || s.name?.toLowerCase().includes(mainName.toLowerCase());
      return gradeMatch && nameMatch;
    });
  }, [mainExamRows, selectedGrade, mainName]);

  const filteredGeneral = useMemo(() => {
    return generalExamData.filter((r) => {
      const g = r.grade ? normalize(String(r.grade)) : "";
      const sel = normalize(selectedGrade);
      const gradeMatch = selectedGrade === "All Grades" || g === sel;

      const date = r.completedDate || ""; // "YYYY-MM-DD"
      const fromOk = !generalDateFrom || (date && date >= generalDateFrom);
      const toOk = !generalDateTo || (date && date <= generalDateTo);

      const examMatch =
        !generalExam ||
        (r.exam || "").toLowerCase().includes(generalExam.toLowerCase());
      const nameMatch =
        !generalName ||
        (r.name || "").toLowerCase().includes(generalName.toLowerCase());

      return gradeMatch && fromOk && toOk && examMatch && nameMatch;
    });
  }, [
    generalExamData,
    selectedGrade,
    generalDateFrom,
    generalDateTo,
    generalExam,
    generalName,
  ]);

  // ---------- Export helpers ----------
  const exportResults = (fileName, format, headers, bodyData) => {
    if (format === "excel" || format === "csv") {
      const ws = XLSX.utils.json_to_sheet(bodyData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, fileName);
      XLSX.writeFile(wb, `${fileName}.${format === "csv" ? "csv" : "xlsx"}`);
    } else if (format === "pdf") {
      const docx = new jsPDF();
      docx.text(fileName, 14, 20);
      autoTable(docx, {
        head: [headers],
        body: bodyData.map((row) => headers.map((h) => row[h] ?? "-")),
        startY: 30,
      });
      docx.save(`${fileName}.pdf`);
    }
  };

  const exportMainResults = (format) => {
    exportResults(
      `MainResults_${selectedGrade.replace(/\s+/g, "")}`,
      format,
      ["Name", "Theory %", "Practical %", "Grand %"],
      filteredMain.map((s) => ({
        Name: s.name,
        "Theory %": s.theoryPercent + "%",
        "Practical %": s.practicalPercent + "%",
        "Grand %": s.grand + "%",
      }))
    );
  };

  const exportGeneralResults = (format) => {
    exportResults(
      `GeneralResults_${selectedGrade.replace(/\s+/g, "")}`,
      format,
      ["Date", "Name", "Exam", "Score", "Percentage"],
      filteredGeneral.map((r) => ({
        Date: r.completedDate || "-",
        Name: r.name || "-",
        Exam: r.exam || "-",
        Score: r.score || "-",
        Percentage: (Number(r.percentage) || 0).toFixed(1) + "%",
      }))
    );
  };

  const resetFilters = () => {
    setSelectedGrade("All Grades");
    setMainName("");
    setGeneralDateFrom("");
    setGeneralDateTo("");
    setGeneralExam("");
    setGeneralName("");
  };

  // ---------- Banners ----------
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

  const showAdminQuickFix =
    // You have admin doc but provider is NOT password, and you're not a teacher
    adminDocExists && !isTeacher && signInProvider !== "password";

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-4">📊 All Results Dashboard</h2>

      {errorMsg && (
        <div className="mb-3 p-3 rounded bg-red-100 text-red-800 text-sm">
          {errorMsg}
        </div>
      )}
      {infoMsg && !errorMsg && (
        <div className="mb-3 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
          {infoMsg}
        </div>
      )}

      <div className="mb-4 p-3 rounded bg-gray-50 border text-xs space-y-1">
        {statusLines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        <div className="pt-2">
          <button
            onClick={() =>
              user?.getIdTokenResult(true).then(() => refreshAdminStatus(user))
            }
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
            Link a password to <b>{user?.email}</b> and we’ll sign you back in with Email/Password.
            (Make sure Email/Password sign-in is enabled in Firebase Auth.)
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <input
              type="password"
              placeholder="New password (min 8 chars)"
              className="border rounded px-3 py-2 flex-1"
              value={adminPwd1}
              onChange={(e) => setAdminPwd1(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm password"
              className="border rounded px-3 py-2 flex-1"
              value={adminPwd2}
              onChange={(e) => setAdminPwd2(e.target.value)}
            />
          </div>
          <button
            onClick={enableAdminViaPassword}
            disabled={adminFixBusy}
            className={`px-4 py-2 rounded text-white ${
              adminFixBusy ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {adminFixBusy ? "Working…" : "Enable Admin via Password"}
          </button>
          {adminFixMsg && (
            <div className="mt-2 text-sm">
              {adminFixMsg}
            </div>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-blue-700 underline">
              Or patch your Firestore rules to allow Google admins
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 overflow-auto text-xs rounded">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isTeacher() { return isSignedIn() && request.auth.token.role == "teacher"; }
    function isAdmin() {
      return isSignedIn()
        && request.auth.token.email != null
        && request.auth.token.email_verified == true
        && exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
        // If you prefer, keep a provider check:
        // && request.auth.token.firebase.sign_in_provider in ["password","google.com"]
    }

    // Admin bypass
    match /{document=**} {
      allow read, write: if isAdmin();
    }

    // ...the rest of your rules unchanged...
  }
}`}
            </pre>
          </details>
        </div>
      )}

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => { setActiveSection("main"); setSelectedGrade("All Grades"); }}
          className={`px-4 py-2 rounded text-white ${activeSection === "main" ? "bg-purple-700" : "bg-purple-600"}`}
        >
          🏆 Main Exams
        </button>
        <button
          onClick={() => { setActiveSection("general"); setSelectedGrade("All Grades"); }}
          className={`px-4 py-2 rounded text-white ${activeSection === "general" ? "bg-green-700" : "bg-green-600"}`}
        >
          📝 General Exams
        </button>
        <button onClick={() => navigate("/analysis-component")} className="bg-blue-600 text-white px-4 py-2 rounded">
          📈 Analysis
        </button>
      </div>

      {activeSection && (
        <>
          {/* MAIN (studentResults) */}
          {activeSection === "main" && (
            <div className="bg-white p-4 rounded shadow overflow-x-auto">
              <div className="flex justify-between items-end mb-3">
                <h3 className="text-lg font-semibold">{selectedGrade} - Main Exam Results</h3>
                <div className="flex gap-2">
                  <button onClick={() => exportMainResults("excel")} className="bg-green-600 text-white px-3 py-2 rounded">Excel</button>
                  <button onClick={() => exportMainResults("csv")} className="bg-yellow-500 text-white px-3 py-2 rounded">CSV</button>
                  <button onClick={() => exportMainResults("pdf")} className="bg-red-600 text-white px-3 py-2 rounded">PDF</button>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 mb-3">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Student (doc ID)</label>
                  <input
                    value={mainName}
                    onChange={(e) => setMainName(e.target.value)}
                    placeholder="e.g. ZAKA, Zola"
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["All Grades", "11", "Grade 12", "12A", "12B"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGrade(g)}
                      className={`px-3 py-1 rounded ${selectedGrade === g ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                    >
                      {g}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSelectedGrade("All Grades");
                      setMainName("");
                    }}
                    className="px-3 py-1 rounded bg-gray-100 border hover:bg-gray-200"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <table className="min-w-full border text-sm">
                <thead>
                  <tr>
                    <th className="border p-2">Name (doc id)</th>
                    <th className="border p-2">Grade</th>
                    <th className="border p-2">Theory %</th>
                    <th className="border p-2">Practical %</th>
                    <th className="border p-2">Grand %</th>
                    <th className="border p-2">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMain.map((s) => (
                    <tr key={s.id} className="text-center hover:bg-gray-50">
                      <td className="border p-2">{s.name}</td>
                      <td className="border p-2">{String(s.grade)}</td>
                      <td className={`border p-2 ${Number(s.theoryPercent) >= 30 ? "text-green-600" : "text-red-600"}`}>{s.theoryPercent}%</td>
                      <td className={`border p-2 ${Number(s.practicalPercent) >= 30 ? "text-green-600" : "text-red-600"}`}>{s.practicalPercent}%</td>
                      <td className={`border p-2 font-bold ${Number(s.grand) >= 30 ? "text-green-700" : "text-red-700"}`}>{s.grand}%</td>
                      <td className="border p-2">
                        {s.feedback ? (
                          <button onClick={() => setSelectedFeedback(s.feedback)} className="text-blue-600 underline">View</button>
                        ) : <span className="text-gray-400">None</span>}
                      </td>
                    </tr>
                  ))}
                  {filteredMain.length === 0 && (
                    <tr>
                      <td colSpan={6} className="border p-2 text-center text-gray-500">
                        {canSeeAllClient
                          ? "No studentResults match your filters."
                          : "Restricted by rules. Use the quick fix above or patch your rules."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* GENERAL (examResults) */}
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

              <div className="grid md:grid-cols-5 sm:grid-cols-2 grid-cols-1 gap-3 mb-3">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Date from</label>
                  <input
                    type="date"
                    value={generalDateFrom}
                    onChange={(e) => setGeneralDateFrom(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Date to</label>
                  <input
                    type="date"
                    value={generalDateTo}
                    onChange={(e) => setGeneralDateTo(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Exam</label>
                  <input
                    value={generalExam}
                    onChange={(e) => setGeneralExam(e.target.value)}
                    placeholder="e.g. Algebra Quiz"
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600">Student name</label>
                  <input
                    value={generalName}
                    onChange={(e) => setGeneralName(e.target.value)}
                    placeholder="e.g. Zola"
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={resetFilters} className="w-full border rounded px-3 py-2 hover:bg-gray-100">
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
                    <th className="border p-2">Score</th>
                    <th className="border p-2">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGeneral.map((r) => (
                    <tr key={r.id} className="text-center hover:bg-gray-50">
                      <td className="border p-2">{r.completedDate || "-"}</td>
                      <td className="border p-2">{r.name || "-"}</td>
                      <td className="border p-2">{r.exam || "-"}</td>
                      <td className="border p-2">{r.score || "-"}</td>
                      <td className={`border p-2 font-bold ${(Number(r.percentage) || 0) < 30 ? "text-red-600" : "text-green-700"}`}>
                        {(Number(r.percentage) || 0).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {filteredGeneral.length === 0 && (
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
    </div>
  );
}


