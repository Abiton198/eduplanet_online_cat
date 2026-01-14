import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

/**
 * 🔄 PWA Auto Update Registration
 * - Checks for new versions automatically
 * - Reloads app when update is available
 */
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onNeedRefresh() {
    // 🔥 Automatically reload when a new version is available
    window.location.reload();
  },
  onOfflineReady() {
    console.log("App is ready to work offline");
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
