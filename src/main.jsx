import { createRoot } from "react-dom/client";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@fontsource/geist-mono/600.css";
import "./styles/tokens.css";
import "./styles/ui.css";
import { installDemoBridge } from "./platform/demoBridge.js";
import { applyStoredMotionPref } from "./shell/motion.js";

// Demo mode only: in the desktop app the real preload has already set window.studyHub.
installDemoBridge();
applyStoredMotionPref();

// The app is imported after the bridge exists, because courseStore reads window.studyHub when it loads.
void import("./app/App.jsx").then(({ App }) => {
  createRoot(document.getElementById("root")).render(<App />);
});
