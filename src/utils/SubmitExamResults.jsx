// utils/submitExamResult.js
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase"; // adjust the path as needed

export const submitExamResult = async ({ score, scorePercentage, studentId, exam, grade, name, timespent, answers }) => {
  try {
    await addDoc(collection(db, "examResults"), {
      score,
      scorePercentage,
      studentId,
      exam,
      grade,
      name,
      timespent,
      submittedBy: "student",
      answers: answers || [],
      date: Timestamp.now(),
      action: ""
    });
    console.log("✅ Exam result submitted to Firestore");
  } catch (error) {
    console.error("❌ Error saving result:", error);
  }
};
