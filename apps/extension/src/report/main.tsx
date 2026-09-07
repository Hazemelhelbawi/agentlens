import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyTheme, readTheme } from "../lib/theme.js";
import { ReportApp } from "./ReportApp.js";

applyTheme(readTheme());
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReportApp />
  </StrictMode>,
);
