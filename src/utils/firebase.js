// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // ✅ Import Firestore
import { getAuth, signInAnonymously } from "firebase/auth"; // ✅ Import Auth
import { getAnalytics } from "firebase/analytics";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDbyj2wfkXKxLZyFDaBzgFwBJASOQ9tlvw",
    authDomain: "eduplanet-exam-results.firebaseapp.com",
    projectId: "eduplanet-exam-results",
    storageBucket: "eduplanet-exam-results.firebasestorage.app",
    messagingSenderId: "364922806641",
    appId: "1:364922806641:web:fe9271a8c8fa20dd9b96d0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // ✅ Correctly initialize Firestore
const auth = getAuth(app); // ✅ Correctly initialize Auth
const analytics = getAnalytics(app);

// Export Firestore & Auth
export { db, auth , signInAnonymously};
