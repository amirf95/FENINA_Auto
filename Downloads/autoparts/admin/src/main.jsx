import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import FeninaAdmin from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <FeninaAdmin />
  </StrictMode>
);
