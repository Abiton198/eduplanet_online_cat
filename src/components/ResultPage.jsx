import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ResultsPage() {
  const [result, setResult] = useState(null);
  const [timePassed, setTimePassed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedResult = localStorage.getItem('examResult');
    if (savedResult) {
      const parsedResult = JSON.parse(savedResult); // Correct
      setResult(parsedResult);

      const completedTime = new Date(parsedResult.time); // Correct
      const currentTime = new Date();

      const timeDiff = currentTime - completedTime;

      if (timeDiff >= 48 * 60 * 60 * 1000) {
        setTimePassed(true);
      }
    }
  }, []);

  if (!result) {
    return (
      <div className="text-center mt-10 text-xl">
        No result found. Please complete the exam first.
      </div>
    );
  }

  const percentage = parseFloat(result.percentage);
  const resultColor = percentage >= 50 ? 'bg-green-100' : 'bg-red-100';

  const renderComments = (percentage) => {
    if (percentage < 50) {
      return (
        <div className="text-red-500 mt-4">
          <p>Oh no, it looks like you're struggling 😞. Don't worry, keep going and you'll improve! 💪</p>
          <p>Remember: "Success is the sum of small efforts, repeated day in and day out." 🌟</p>
        </div>
      );
    }
    return (
      <div className="text-green-500 mt-4">
        <p>Great job! 🎉 You've done well! Keep up the hard work. 😊</p>
        <p>You're on the right track! 🚀</p>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 rounded shadow bg-white">
      <h2 className="text-2xl font-bold text-center mb-6">Exam Results</h2>

      <div className={`p-4 rounded ${resultColor}`}>
        <p><b>Name:</b> {result.name}</p>
        <p><b>Score:</b> {result.score}</p>
        <p><b>Percentage:</b> {result.percentage}%</p>
        <p><b>Unanswered Questions:</b> {result.unanswered}</p>
        <p><b>Completed On:</b> {result.time}</p>
      </div>

      {renderComments(percentage)}

      <div className="flex flex-col space-y-4 mt-8">
        {timePassed ? (
          <button
            onClick={() => {
              localStorage.removeItem('examResult');
              localStorage.removeItem('examAnswers');
              navigate('/');
            }}
            className="bg-blue-500 text-white py-2 px-4 rounded-full hover:bg-blue-600 transition"
          >
            Retake Exam
          </button>
        ) : (
          <p className="text-center text-gray-500">You can retake the exam after 48 hours ⏳</p>
        )}
      </div>
    </div>
  );
}
