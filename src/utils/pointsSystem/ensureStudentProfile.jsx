// utils/ensureStudentProfile.js
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

function normalizeNameKey(name) {
  return (name || "").toLowerCase().replace(/[,\s]+/g, " ").trim();
}
function splitGrade(grade) {
  const g = String(grade || "").trim();
  const m = g.match(/^(\d{1,2})\s*([A-Za-z])?$/);
  return {
    gradeYear: m ? Number(m[1]) : null,
    gradeSection: m && m[2] ? m[2].toUpperCase() : null,
  };
}

export async function ensureStudentProfile({ uid, name, grade }) {
  const ref = doc(db, "students", uid);
  const snap = await getDoc(ref);

  const nameKey = normalizeNameKey(name);
  const { gradeYear, gradeSection } = splitGrade(grade);

  const base = {
    name: name ?? "Unknown",
    nameKey,
    grade: grade ?? "",
    gradeYear,
    gradeSection,
    totalPoints: 0,
    examPoints: 0,
    behaviorPoints: 0,
    bonusPoints: 0,
    rewardClaimed: false,
    createdAt: new Date().toISOString(),
  };

  if (!snap.exists()) {
    await setDoc(ref, base);
    console.log("✅ Created student profile", uid);
  } else {
    const cur = snap.data() || {};
    const updates = {};
    if (name && cur.name !== name) updates.name = name;
    if (nameKey && cur.nameKey !== nameKey) updates.nameKey = nameKey;
    if (grade && cur.grade !== grade) updates.grade = grade;
    if (gradeYear !== cur.gradeYear) updates.gradeYear = gradeYear;
    if (gradeSection !== cur.gradeSection) updates.gradeSection = gradeSection;
    if (Object.keys(updates).length) {
      await updateDoc(ref, updates);
      console.log("✅ Updated student profile fields", updates);
    }
  }
}
