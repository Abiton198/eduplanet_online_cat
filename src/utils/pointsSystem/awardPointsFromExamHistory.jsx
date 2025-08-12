// utils/pointsSystem/awardPointsFromExamHistory.jsx
import {
  collection, doc, getDocs, getDoc, query, where, addDoc, setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { recalculateStudentTotals } from "../recalculateStudentTotals";

export const awardPointsFromExamHistory = async (studentId, studentName) => {
  try {
    if (!studentId || !studentName) throw new Error("studentId and studentName are both required.");

    const studentRef = doc(db, "students", studentId);
    const studentSnap = await getDoc(studentRef);
    if (!studentSnap.exists()) {
      await setDoc(studentRef, {
        name: studentName,
        totalPoints: 0, examPoints: 0, behaviorPoints: 0, bonusPoints: 0,
        rewardClaimed: false,
      });
    }
    const student = (await getDoc(studentRef)).data() || {};

    // 1) Load examResults (prefer studentId; fallback to name)
    const examResultsRef = collection(db, "examResults");
    let examsSnap = await getDocs(query(examResultsRef, where("studentId", "==", studentId)));
    if (examsSnap.empty) {
      examsSnap = await getDocs(query(examResultsRef, where("name", "==", studentName)));
    }

    // 2) Read existing exam logs to avoid duplicates
    const logsRef = collection(studentRef, "pointLogs");
    const logsSnap = await getDocs(logsRef);
    const loggedExamIds = new Set(
      logsSnap.docs
        .filter(d => d.data()?.source === "exam")
        .map(d => d.data()?.examId)
        .filter(Boolean)
    );

    // 3) Build new exam logs (no totals math here)
    let newPoints = 0;
    const newLogs = [];
    for (const examDoc of examsSnap.docs) {
      const examId = examDoc.id;
      if (loggedExamIds.has(examId)) continue;

      const data = examDoc.data() || {};
      const score = Number(data.score || 0);   // score out of 30
      const examName = data.exam || "Exam";

      let points = 0;
      if (score >= 10 && score <= 15) points = 5;
      else if (score >= 16 && score <= 20) points = 10;
      else if (score >= 21 && score <= 25) points = 15;
      else if (score >= 26 && score <= 30) points = 20;

      if (points > 0) {
        newPoints += points;
        newLogs.push({
          examId,
          source: "exam",
          reason: `Score ${score} in ${examName}`,
          points,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 4) Write new exam logs
    for (const log of newLogs) {
      await addDoc(logsRef, log);
    }

    // 5) Reward: add ONE reward log if crossing 100 and not already rewarded
    // recompute quickly using existing + newPoints to see if we cross 100
    const currentTotals = await (async () => {
      let examPts = 0, behaviorPts = 0, bonusPts = 0;
      logsSnap.forEach(d => {
        const s = d.data();
        const p = Number(s.points || 0);
        if (s.source === "exam") examPts += p;
        else if (s.source === "behavior") behaviorPts += p;
        else if (s.source === "reward") bonusPts += p;
      });
      // add new exam points that we’re about to insert
      examPts += newPoints;
      return { examPts, behaviorPts, bonusPts, total: examPts + behaviorPts + bonusPts };
    })();

    const alreadyRewarded = logsSnap.docs.some(d => d.data()?.source === "reward");
    if (!alreadyRewarded && currentTotals.total >= 100) {
      await addDoc(logsRef, {
        source: "reward",
        reason: "🎉 Reached 100 points milestone",
        points: 20,
        timestamp: new Date().toISOString(),
      });
    }

    // 6) Now recompute aggregates from logs and write to student doc
    const totals = await recalculateStudentTotals(studentId);

    return {
      message: `${newPoints} new points awarded. Totals synced.`,
      awarded: newPoints,
      totals,
    };
  } catch (error) {
    console.error("Error awarding exam points:", error);
    return { error: true, message: error.message || "An error occurred" };
  }
};
