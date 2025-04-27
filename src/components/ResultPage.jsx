import React from 'react';

export default function ResultPage({ results }) {
  if (results.length === 0) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-4">No Exam Results Yet</h1>
      </div>
    );
  }

  const latest = results[results.length - 1];

  return (
    <div className="min-h-screen p-8 bg-gray-100 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Exam Results</h1>
        <h2 className={`text-3xl font-bold ${latest.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
          {latest.percentage}% - {latest.percentage >= 50 ? "Well Done! Keep it up! 🎉" : "Keep Studying! You will get there! 💪"}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="py-2 px-4">Student Name</th>
              <th className="py-2 px-4">Score</th>
              <th className="py-2 px-4">Percentage</th>
              <th className="py-2 px-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {results.map((res, index) => (
              <tr key={index} className="text-center">
                <td className="py-2 px-4">{res.name}</td>
                <td className="py-2 px-4">{res.score}</td>
                <td className="py-2 px-4">{res.percentage}%</td>
                <td className="py-2 px-4">{res.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
