import React, { useEffect, useState } from 'react';

export default function ReviewPage() {
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    const savedAnswers = localStorage.getItem('examAnswers');
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
  }, []);

  if (!answers.length) {
    return (
      <div className="text-center mt-10 text-xl">
        No answers to review. Please complete the exam first.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 rounded shadow bg-white">
      <h2 className="text-2xl font-bold text-center mb-6 text-purple-700">Review Your Answers</h2>

      <div className="space-y-6">
        {answers.map((item, index) => (
          <div key={index} className="border-b pb-4">
            <p><b>Q{index + 1}:</b> {item.question}</p>
            <p><b>Your Answer:</b> <span className={item.isCorrect ? 'text-green-500' : 'text-red-500'}>{item.selectedAnswer || 'Unanswered'}</span></p>
            {!item.isCorrect && (
              <p><b>Correct Answer:</b> <span className="text-green-700">{item.correctAnswer}</span></p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
