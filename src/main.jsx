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

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .then((registration) => registration.update())
      .catch((error) => console.error("PWA service worker registration failed:", error));
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
