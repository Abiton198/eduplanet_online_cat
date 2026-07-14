import { initializeApp } from 'firebase/app';
import {
    getAuth, setPersistence,
    browserSessionPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
    initializeAppCheck,
    ReCaptchaV3Provider
} from 'firebase/app-check';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ── App Check with reCAPTCHA v3 ───────────────────────────────────────────
// Must be initialised BEFORE getFirestore(), getAuth(), getStorage().
// In development (localhost) a debug token is used instead of reCAPTCHA
// so you can test without the app being deployed — see Step 5.
if (import.meta.env.DEV) {
    // This tells App Check to use the debug token in development.
    // The debug token is printed to the browser console — copy it to
    // Firebase App Check console (Step 5).
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(
        import.meta.env.VITE_RECAPTCHA_SITE_KEY
    ),
    // Automatically refreshes the App Check token in the background.
    // When false the token is fetched once and never refreshed —
    // users who stay on the page for hours would get rejected.
    isTokenAutoRefreshEnabled: true,
});

export default app;