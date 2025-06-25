// pages/AdminGoogleLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, provider, db } from "../utils/firebase";
import { getDoc, doc } from "firebase/firestore";

export default function AdminGoogleLogin({ setAdminInfo }) {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      // Check Firestore for this email
      const adminDoc = await getDoc(doc(db, "admins", email));
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        setAdminInfo({ email, name: adminData.name, role: "admin" });
        navigate("/admin-dashboard");
      } else {
        setError("This Google account is not registered as an admin.");
      }
    } catch (err) {
      console.error(err);
      setError("Google sign-in failed.");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-2xl font-bold text-center mb-4">Admin Login</h2>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <button
        onClick={handleGoogleLogin}
        className="w-full bg-green-600 text-white p-3 rounded"
      >
        Sign in with Google (Admin)
      </button>
    </div>
  );
}
