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

// ── Tab isolation ────────────────────────────────────────────────────────
// browserSessionPersistence stores the auth token in sessionStorage
// instead of localStorage. sessionStorage is NEVER shared between tabs.
//
// Result:
//   ✓ Tab A signed in → Tab B opens fresh (not signed in)
//   ✓ Sign out on Tab A → Tab B stays signed in
//   ✓ Refresh Tab A → still signed in (sessionStorage survives refresh)
//   ✗ Duplicate tab (Ctrl+Shift+T) → starts fresh (acceptable trade-off)
//
// Set this BEFORE any sign-in call — it controls where the token is stored.
setPersistence(auth, browserSessionPersistence).catch(console.error);

// ── App Check ────────────────────────────────────────────────────────────
// if (import.meta.env.DEV) {
//   self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
// }

initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
});

export default app;