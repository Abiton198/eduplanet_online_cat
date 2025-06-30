import React, { useState, useEffect } from "react";
import { db } from "../utils/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function StudentFeedbackCard({ studentName, onClose }) {
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "", q4: "", q5: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const feedbackRef = doc(db, "studentResults", studentName);

  useEffect(() => {
    const fetchFeedback = async () => {
      const snap = await getDoc(feedbackRef);
      if (snap.exists() && snap.data().feedback) {
        setAnswers(snap.data().feedback);
        setSubmitted(true);
      }
    };
    fetchFeedback();
  }, [studentName]);

  const autoSave = async (field, value) => {
    const updatedAnswers = { ...answers, [field]: value, timestamp: serverTimestamp() };
    setAnswers(updatedAnswers);
    await setDoc(feedbackRef, { feedback: updatedAnswers }, { merge: true });
  };

  const handleClose = () => {
    // Validation:
    if (!answers.q1 || !answers.q2 || !answers.q3 || !answers.q4 || !answers.q5) {
      setError("⚠️ Please answer all questions before closing.");
      return;
    }
    if (
      answers.q2.trim().length < 20 ||
      answers.q3.trim().length < 20 ||
      answers.q4.trim().length < 20 ||
      answers.q5.trim().length < 20
    ) {
      setError("⚠️ Questions 2-5 must have at least 20 characters.");
      return;
    }
    setSubmitted(true);
    onClose();
  };

  if (submitted) {
    return (
      <div className="bg-green-100 p-4 rounded text-center">
        <p className="text-green-700 font-semibold">✅ Feedback already submitted. Thank you!</p>
        <button onClick={onClose} className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Close</button>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded shadow space-y-4">
      <h3 className="text-xl font-bold text-center">📝 Student Feedback</h3>

      {[
        "Is this a fair result for you?",
        "If NO, why?",
        "What do you think you could have done better to improve your results?",
        "What do you think you will do in term 3 to improve the result upwards?",
        "What do you recommend the teacher should do to help you achieve the best?"
      ].map((q, idx) => (
        <div key={idx}>
          <label className="font-medium">{idx + 1}. {q}</label>
          <textarea
            className="w-full border rounded p-2 mt-1"
            rows={2}
            value={answers[`q${idx + 1}`]}
            onChange={e => autoSave(`q${idx + 1}`, e.target.value)}
          />
          {(idx >= 1 && answers[`q${idx + 1}`].trim().length > 0 && answers[`q${idx + 1}`].trim().length < 20) && (
            <p className="text-xs text-red-600">Must be at least 20 characters.</p>
          )}
        </div>
      ))}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={handleClose}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Done
      </button>
    </div>
  );
}
