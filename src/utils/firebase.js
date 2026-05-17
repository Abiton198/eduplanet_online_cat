// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Firestore
import { getAuth, signInAnonymously, GoogleAuthProvider } from "firebase/auth"; // Auth
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBqpQWCNBtL_DK6wNl6LSyCw63JvNMCEAc",
    authDomain: "eduket.firebaseapp.com",
    projectId: "eduket",
    storageBucket: "eduket.firebasestorage.app",
    messagingSenderId: "754323738367",
    appId: "1:754323738367:web:b1b09aaf820fb1a3ab86ca",
    measurementId: "G-698QRCW2RJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);
const provider = new GoogleAuthProvider();

// Export Firestore & Auth
export { db, auth, signInAnonymously, provider, storage };
