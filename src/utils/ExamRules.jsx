import React from "react";
import logo from '../img/edu_logo.jpg';

export default function ExamRules() {
  const rules = [
    { emoji: "🔑", text: "Enter your unique one-time password to begin the exam." },
    { emoji: "⏱️", text: "The countdown timer starts as soon as the exam begins." },
    { emoji: "🚫", text: "Do not refresh, close the tab, or leave the page after starting." },
    { emoji: "🧠", text: "Switching tabs or windows will auto-submit the exam." },
    { emoji: "📩", text: "Finish before the timer ends – the form will auto-close." },
    { emoji: "🔒", text: "You can only access the exam once. No password reuse." },
    { emoji: "📝", text: "Be honest. No copying, chatting, or online searching." },
    { emoji: "📷", text: "Your activity is monitored for suspicious behavior." },
    { emoji: "", text: "Wish you the best!" },
  ];

  return (
    <div className="flex flex-col items-center px-4 py-8 sm:px-6 lg:px-8 bg-blue-50 min-h-screen">
      
      <div className="flex items-center justify-between w-full max-w-4xl mb-6">
        <img src={logo} alt="Eduplanet Logo" className="h-16 w-auto rounded-md shadow-md" />
        <h1 className="text-xl sm:text-2xl font-bold text-blue-700 ml-3">Eduplanet CAT Exam Centre</h1>
      </div>

      <h2 className="text-3xl font-extrabold text-red-600 mb-8 text-center">
        📚 Exam Instructions – Read Carefully
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl">
        {rules.map((rule, index) => (
          <div key={index} className="bg-white border-2 border-yellow-400 rounded-lg p-6 shadow-md hover:shadow-xl transition duration-300">
            <h3 className="text-xl font-semibold mb-2 text-blue-800">{rule.emoji}</h3>
            <p className="text-gray-700 text-base">{rule.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}