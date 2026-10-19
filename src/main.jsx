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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
