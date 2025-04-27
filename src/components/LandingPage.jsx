import { useState } from "react";
import { useNavigate } from "react-router-dom";
import React from 'react';


export default function LandingPage() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const validPasswords = ["abc123", "xyz456"]; // Replace with your real list

  const handleLogin = () => {
    if (validPasswords.includes(password)) {
      // remove password from list (simulate one-time use)
      navigate("/exam");
    } else {
      alert("Invalid or used password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">

      <div className="bg-white p-8 rounded shadow-lg">
        <h2 className="text-xl mb-4">Enter Exam Password</h2>
        <input
          className="border p-2 w-full mb-4"
          type="text"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Start Exam
        </button>
      </div>
    </div>
  );
}