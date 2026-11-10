export const API = "http://localhost:8000/api";
export const API_BASE = API.replace(/\/api$/, "");

// DRF returns absolute "next"/"previous" page URLs — strip the API origin so
// they can be re-fed into apiFetch/call as a normal relative path.
export function apiPath(url) {
  return url ? url.replace(API, "") : null;
}

// Resolve a potentially-relative media URL to an absolute Django URL
export function absUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function apiFetch(token, path, opts = {}) {
  const { body, ...rest } = opts;
  return fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...rest,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }).then(async (res) => {
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.detail || JSON.stringify(data));
      err.status = res.status;
      throw err;
    }
    return data;
  });
}

export function apiFetchForm(token, path, formData, method = "POST") {
  return fetch(`${API}${path}`, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: formData,
  }).then(async (res) => {
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.detail || JSON.stringify(data));
      err.status = res.status;
      throw err;
    }
    return data;
  });
}
