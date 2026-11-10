import { useCallback, useState } from "react";
import { apiFetch, apiFetchForm } from "../lib/api.js";

// Owns the JWT pair (access/refresh) in localStorage and exposes authenticated
// fetch helpers that silently refresh the access token on a 401 and retry
// once before giving up and logging the user out.
export function useApiClient() {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fenina_auth")); } catch { return null; }
  });

  const logout = useCallback(() => {
    localStorage.removeItem("fenina_auth");
    setAuth(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch(null, "/auth/login/", {
      method: "POST",
      body: { email, password },
    });
    localStorage.setItem("fenina_auth", JSON.stringify(data));
    setAuth(data);
  }, []);

  // Exchange the stored refresh token for a new access token.
  // Returns the new access token, or null if the refresh token itself is invalid/expired.
  const refreshAccessToken = useCallback(async () => {
    let stored;
    try { stored = JSON.parse(localStorage.getItem("fenina_auth")); } catch { stored = null; }
    if (!stored?.refresh) return null;
    try {
      const data = await apiFetch(null, "/auth/refresh/", {
        method: "POST",
        body: { refresh: stored.refresh },
      });
      // ROTATE_REFRESH_TOKENS is on server-side, so a new refresh token comes back too.
      const next = { ...stored, ...data, refresh: data.refresh ?? stored.refresh };
      localStorage.setItem("fenina_auth", JSON.stringify(next));
      setAuth(next);
      return next.access;
    } catch {
      return null;
    }
  }, []);

  const call = useCallback(async (path, opts) => {
    try {
      return await apiFetch(auth?.access, path, opts);
    } catch (e) {
      if (e.status !== 401) throw e;
      const newAccess = await refreshAccessToken();
      if (!newAccess) { logout(); throw e; }
      try {
        return await apiFetch(newAccess, path, opts);
      } catch (e2) {
        if (e2.status === 401) logout();
        throw e2;
      }
    }
  }, [auth, refreshAccessToken, logout]);

  // Same retry-on-401 behavior as `call`, for multipart/form-data requests.
  const callForm = useCallback(async (path, formData, method = "POST") => {
    try {
      return await apiFetchForm(auth?.access, path, formData, method);
    } catch (e) {
      if (e.status !== 401) throw e;
      const newAccess = await refreshAccessToken();
      if (!newAccess) { logout(); throw e; }
      try {
        return await apiFetchForm(newAccess, path, formData, method);
      } catch (e2) {
        if (e2.status === 401) logout();
        throw e2;
      }
    }
  }, [auth, refreshAccessToken, logout]);

  return { auth, call, callForm, login, logout };
}
