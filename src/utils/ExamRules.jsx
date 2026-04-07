import React from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";


export default function ExamRules() {
  const rules = [
    { emoji: "🔑", text: "Each exam is protected with a one-time password. You must enter it correctly to begin." },
    { emoji: "⏱️", text: "You have 30 minutes to complete the exam. The timer starts once you enter." },
    { emoji: "⚠️", text: "You will receive a 5-minute warning before the exam ends." },
    { emoji: "🚫", text: "Do NOT refresh, close the tab, or press any keys like Ctrl+C/V/R or F5 during the exam." },
    { emoji: "🧠", text: "Switching tabs or minimizing will result in an alert and may affect your submission." },
    { emoji: "🔒", text: "You can only take each exam once. Reusing passwords or retaking is not allowed." },
    { emoji: "📋", text: "All questions must be answered before submission. Incomplete exams will not be accepted." },
    { emoji: "📤", text: "If time runs out, your exam will be auto-submitted with your current answers." },
    { emoji: "👀", text: "Your behavior is being monitored for any suspicious actions or rule violations." },
    { emoji: "✅", text: "Stay focused, do your best, and good luck!" },
  ];
  const navigate = useNavigate();

 const handleExit = () => {
  Swal.fire({
    title: "Exit Exam?",
    text: "Are you sure you want to leave this page? Your progress may not be saved.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Exit",
    cancelButtonText: "Stay",
    confirmButtonColor: "#ef4444", // High visibility Red
    cancelButtonColor: "#22c55e",  // High visibility Green

  }).then((result) => {
    if (result.isConfirmed) {
      // 1. Clear any exam-specific session data if needed
      localStorage.removeItem("examStartTime");
      
      // 2. Simply navigate back to the main dashboard/home
      // This keeps the user logged in but "closes" the current page
      navigate("/exam"); 
    }
  });
};


  return (
    <div className="flex flex-col items-center px-4 py-8 sm:px-6 lg:px-8 bg-blue-50 min-h-screen">
      <div className="flex items-center justify-between w-full max-w-4xl mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-blue-700 ml-3 text-center">Technology Study Centre</h1>
      </div>

      <h2 className="text-3xl font-extrabold text-red-600 mb-8 text-center">
        📚 Exam Instructions – Read Carefully
      </h2>

                   <button
                      onClick={handleExit}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 hover:bg-red-600 text-red-600 hover:text-white transition-all duration-300 font-bold border border-red-200"
                    >
                      <LogOut size={18} />
                      <span className="hidden sm:inline">Exit</span>
                    </button> 

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
