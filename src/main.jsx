import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { UserProvider } from './contexts/UserContext';
import { initAppCheck } from './utils/firebase';

// ── Mount React FIRST ──────────────────────────────────────────────────
// Nothing runs before this. UserContext, firebase.js, App Check — all
// lazy. React's dispatcher is fully ready before any of them execute.
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <UserProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UserProvider>
  </React.StrictMode>
);

// ── Initialise App Check AFTER React mounts ────────────────────────────
// Deferred so initializeAppCheck() does not run during module evaluation.
// The import() is dynamic — firebase/app-check is not even loaded until
// React has fully rendered the first frame.
initAppCheck();

// ── Register PWA AFTER React mounts ───────────────────────────────────
import('virtual:pwa-register').then(({ registerSW }) => {
  registerSW({
    immediate: false,
    onNeedRefresh() {
      setTimeout(() => window.location.reload(), 1000);
    },
    onOfflineReady() {
      console.log('App ready offline');
    },
  });
});