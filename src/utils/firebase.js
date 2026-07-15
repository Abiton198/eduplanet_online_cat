import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ── Core services — safe to initialise at module load time ─────────────
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

// ── App Check — call this AFTER React mounts, not here ─────────────────
// initializeAppCheck() was running synchronously at import time,
// which corrupts React's internal dispatcher before useState is ready.
export async function initAppCheck() {
    try {
        const { initializeAppCheck, ReCaptchaV3Provider } =
            await import('firebase/app-check');

        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-restricted-globals
            self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(
                import.meta.env.VITE_RECAPTCHA_SITE_KEY
            ),
            isTokenAutoRefreshEnabled: true,
        });

        console.log('[AppCheck] Initialised');
    } catch (err) {
        console.warn('[AppCheck] Failed to initialise:', err.message);
        // Non-fatal — app continues without App Check in dev/test
    }
}