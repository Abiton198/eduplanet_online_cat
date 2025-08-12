import {
    collection,
    doc,
    getDocs,
    query,
    where,
    updateDoc,
  } from "firebase/firestore";
  import { db } from "../utils/firebase"; // <-- correct path (pointsSystem -> utils/firebase)
  
  /**
   * Recalculate aggregate points for a single student from pointLogs.
   * Sums points by source and writes: examPoints, behaviorPoints, bonusPoints, totalPoints
   */
  export async function recalculateStudentTotals(uid) {
    if (!uid) throw new Error("recalcStudentTotals: uid is required");
  
    const studentRef = doc(db, "students", uid);
    const logsRef = collection(studentRef, "pointLogs");
  
    const snap = await getDocs(logsRef);
  
    let examPoints = 0;
    let behaviorPoints = 0;
    let bonusPoints = 0;
  
    snap.forEach((d) => {
      const { source, points } = d.data() || {};
      const p = Number(points || 0);
      if (!Number.isFinite(p)) return;
  
      if (source === "exam") examPoints += p;
      else if (source === "behavior") behaviorPoints += p;
      else if (source === "reward") bonusPoints += p;
    });
  
    const totalPoints = examPoints + behaviorPoints + bonusPoints;
  
    await updateDoc(studentRef, {
      examPoints,
      behaviorPoints,
      bonusPoints,
      totalPoints,
    });
  
    return { examPoints, behaviorPoints, bonusPoints, totalPoints };
  }
  
  /**
   * Optional: recalc an entire grade or all students
   */
  export async function recalcAllStudents({ gradeYear = null } = {}) {
    const studentsCol = collection(db, "students");
    const q = gradeYear != null
      ? query(studentsCol, where("gradeYear", "==", Number(gradeYear)))
      : studentsCol;
  
    const list = await getDocs(q);
    const results = [];
    for (const d of list.docs) {
      const r = await recalculateStudentTotals(d.id);
      results.push({ uid: d.id, ...r });
    }
    return results;
  }
  