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

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
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

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = "Terjadi kesalahan.";
    try { const body = await res.json(); message = body.error || message; } catch {}
    if (res.status === 429) showToast(message);
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}
