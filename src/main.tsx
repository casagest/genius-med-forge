import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "./lib/web-vitals.ts";
import { config } from "./lib/env.ts";

// Initialize Web Vitals monitoring
if (config.features.analytics || config.app.isDev) {
  initWebVitals();
}

// Register service worker for PWA
if (config.features.pwa && "serviceWorker" in navigator && config.app.isProd) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}

// Performance monitoring
if (config.app.isDev) {
  console.log(`[${config.app.name}] v${config.app.version} - ${config.app.env} mode`);
  console.log("[Features]", config.features);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Ensure there is a div with id='root' in your HTML.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
