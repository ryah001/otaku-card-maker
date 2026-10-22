import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import logo from "./assets/logo.png";
import "./index.css";
import App from "./App.jsx";

const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.type = "image/png";
favicon.href = logo;
document.head.append(favicon);

// Enregistre le service worker uniquement en production et sous le chemin GitHub Pages.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/otaku-card-maker/sw.js", { scope: "/otaku-card-maker/" })
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch((error) => {
        console.error("Impossible d'enregistrer Carte Otaku PWA :", error);
      });
  });

  let refreshedAfterUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshedAfterUpdate) return;
    refreshedAfterUpdate = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
