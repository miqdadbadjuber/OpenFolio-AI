import { auth } from "./firebase";
import { showToast } from "./notify";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function getToken(): Promise<string> {
  const user = auth?.currentUser ?? null;
  if (!user) throw new ApiError(401, "Sesi tidak tersedia.");
  return user.getIdToken();
}

// Single primitive for every authenticated call: attaches the Firebase ID token as
// a `Bearer` header and returns the raw Response (so HTML/streaming call sites can
// still read `.text()`). FormData must be set by the browser — never override
// Content-Type for it.
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let token: string;
  try { token = await getToken(); }
  catch (e) { throw new ApiError(401, "Sesi tidak tersedia."); }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };
  // FormData harus di-set boundary oleh browser; jangan override Content-Type.
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(path, {
    ...options,
    headers,
  });
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, options);

  if (!res.ok) {
    let message = "Terjadi kesalahan.";
    try { const body = await res.json(); message = body.error || message; } catch {}
    if (res.status === 429) showToast(message);
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}
