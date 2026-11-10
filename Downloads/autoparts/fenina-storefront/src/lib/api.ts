// Base URL of the Django backend. Override with VITE_API_BASE_URL for
// staging/production builds; defaults to the local dev server.
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
