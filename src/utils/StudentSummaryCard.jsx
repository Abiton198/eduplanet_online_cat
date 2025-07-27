import React from 'react';

export default function StudentSummaryCard({ examResult }) {
  if (!examResult) return null;

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mt-10 w-full max-w-4xl mx-auto border border-gray-200">
      <h2 className="text-2xl font-semibold text-blue-600 mb-4">
        📝 Exam Summary: {examResult.exam || "Untitled Exam"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700 text-md mb-6">
        <div><strong>👤 Student:</strong> {examResult.name || "N/A"}</div>
        <div><strong>🎓 Grade:</strong> {examResult.grade || "N/A"}</div>
        <div><strong>🗓 Date:</strong> {examResult.completedDate || "N/A"}</div>
        <div><strong>⏰ Finished:</strong> {examResult.completedTimeOnly || "N/A"}</div>
        <div><strong>🔢 Score:</strong> {examResult.score ?? 0}</div>
        <div><strong>📈 Percentage:</strong> {examResult.percentage ?? 0}%</div>
        <div><strong>🕒 Time Spent:</strong> {examResult.timeSpent || "N/A"}</div>
        <div><strong>❌ Unanswered:</strong> {examResult.unanswered ?? 0}</div>
        <div><strong>🔁 Attempts:</strong> {examResult.attempts ?? 1}</div>
      </div>
    </div>
  );
}
