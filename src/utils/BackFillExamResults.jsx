// utils/maintenance/backfillExamResults.js
import {
    collection, getDocs, updateDoc, doc, query, where, limit
  } from "firebase/firestore";
  import { db } from "../utils/firebase";
  
  function normalizeNameKey(name) {
    return (name || "").toLowerCase().replace(/[,\s]+/g, " ").trim();
  }
  function parseGradeYear(grade) {
    const m = String(grade || "").match(/\d{1,2}/);
    return m ? Number(m[0]) : null;
  }
  
  export async function backfillExamResults() {
    const resultsSnap = await getDocs(collection(db, "examResults"));
    let updated = 0;
  
    for (const r of resultsSnap.docs) {
      const d = r.data() || {};
      const updates = {};
  
      // nameKey
      const nk = normalizeNameKey(d.name);
      if (nk && d.nameKey !== nk) updates.nameKey = nk;
  
      // gradeYear
      const gy = parseGradeYear(d.grade);
      if (gy != null && d.gradeYear !== gy) updates.gradeYear = gy;
  
      // studentId (best effort: match unique student by nameKey)
      if (!d.studentId && nk) {
        const qStu = query(
          collection(db, "students"),
          where("nameKey", "==", nk),
          limit(2)
        );
        const s = await getDocs(qStu);
        if (s.size === 1) {
          updates.studentId = s.docs[0].id;
        }
      }
  
      if (Object.keys(updates).length) {
        await updateDoc(doc(db, "examResults", r.id), updates);
        updated++;
      }
    }
  
    console.log(`Backfill complete. Updated ${updated} examResults docs.`);
  }
  