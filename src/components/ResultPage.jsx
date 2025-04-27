import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ResultsPage() {
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedResult = localStorage.getItem('examResult');
    if (savedResult) {
      setResult(JSON.parse(savedResult));
    }
  }, []);

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

  if (!result) {
    return (
      <div className="text-center mt-10 text-xl">
        No result found. Please complete the exam first.
      </div>
    );
  }

  const percentage = parseFloat(result.percentage);
  const resultColor = percentage >= 50 ? 'bg-green-100' : 'bg-red-100';

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
        {/* Review Answers Button */}
        <Link
          to="/review"
          className="bg-yellow-500 text-white py-2 px-4 rounded-full text-center hover:bg-yellow-600 transition"
        >
          Review Your Answers
        </Link>

        {/* View All Results Button (Optional) */}
        <button
          onClick={() => navigate('/results')}
          className="bg-blue-500 text-white py-2 px-4 rounded-full hover:bg-blue-600 transition"
        >
          View All Results
        </button>
      </div>
    </div>
  );
}
