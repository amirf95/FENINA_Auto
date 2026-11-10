// This file now just re-exports the app from src/ — the actual component
// was split into src/App.jsx, src/components/*, src/hooks/*, and src/lib/*
// for readability. Kept here so existing imports of "../FeninaAdmin.jsx"
// (and this file's own history) keep working.
export { default } from "./src/App.jsx";
