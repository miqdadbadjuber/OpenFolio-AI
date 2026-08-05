import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Regression guard for C1: every authenticated API call MUST attach the Firebase ID
// token as `Authorization: Bearer <token>`. The server's `requireAuth` middleware
// returns 401 otherwise, which is what made upload/inject/generate/edit broken.
const { mockIdToken } = vi.hoisted(() => ({ mockIdToken: vi.fn() }));
vi.mock("./firebase", () => ({
  auth: { currentUser: { getIdToken: () => mockIdToken() } },
}));
vi.mock("./notify", () => ({ showToast: vi.fn() }));

import { apiFetch, authFetch } from "./api";

describe("api token attachment", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockIdToken.mockReset();
    mockIdToken.mockResolvedValue("tok-123");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("apiFetch menempelkan Authorization Bearer + Content-Type JSON", async () => {
    let captured: RequestInit | undefined;
    global.fetch = vi.fn(async (_url, opts) => {
      captured = opts;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const out = await apiFetch("/api/gemini/generate", { method: "POST" });
    expect(out).toEqual({ ok: true });
    const headers = captured!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-123");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("authFetch menempelkan Bearer dan TIDAK override Content-Type untuk FormData", async () => {
    let captured: RequestInit | undefined;
    global.fetch = vi.fn(async (_url, opts) => {
      captured = opts;
      return new Response("html", { status: 200, headers: { "Content-Type": "text/html" } });
    }) as unknown as typeof fetch;

    const fd = new FormData();
    fd.append("file", new Blob(["x"]), "x.jpg");
    const res = await authFetch("/api/upload", { method: "POST", body: fd });

    const headers = captured!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-123");
    expect(headers["Content-Type"]).toBeUndefined();
    expect(await res.text()).toBe("html");
  });

  it("authFetch bisa membaca respons HTML (untuk /api/portfolio/inject)", async () => {
    global.fetch = vi.fn(async () =>
      new Response("<html>ok</html>", { status: 200, headers: { "Content-Type": "text/html" } })
    ) as unknown as typeof fetch;

    const res = await authFetch("/api/portfolio/inject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: {} }),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<html>ok</html>");
  });

  it("apiFetch melempar ApiError 401 saat tidak ada sesi (tanpa memanggil server)", async () => {
    const { auth } = await import("./firebase");
    const orig = (auth as any).currentUser;
    (auth as any).currentUser = null;
    let fetchCalled = false;
    global.fetch = vi.fn(async () => { fetchCalled = true; return new Response("{}", { status: 200 }); }) as unknown as typeof fetch;

    await expect(apiFetch("/api/x")).rejects.toMatchObject({ status: 401 });
    expect(fetchCalled).toBe(false); // jangan memanggil server tanpa token
    (auth as any).currentUser = orig;
  });
});
