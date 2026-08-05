import { describe, it, expect } from "vitest";
import { makeRequireAuth } from "./auth";
import type { Request, Response } from "express";

function makeReq(header?: string): Partial<Request> {
  return { headers: { authorization: header } } as Partial<Request>;
}
function makeRes() {
  const res: any = { statusCode: 0, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res as Response;
}

describe("requireAuth", () => {
  it("menolak tanpa token", async () => {
    const mw = makeRequireAuth(async () => { throw new Error("x"); });
    const req = makeReq(undefined) as Request;
    const res = makeRes();
    await mw(req, res, () => { throw new Error("harusnya tidak dipanggil"); });
    expect(res.statusCode).toBe(401);
  });
  it("menolak token salah format", async () => {
    const mw = makeRequireAuth(async () => { throw new Error("bad"); });
    const req = makeReq("Basic abc") as Request;
    const res = makeRes();
    await mw(req, res, () => { throw new Error("harusnya tidak dipanggil"); });
    expect(res.statusCode).toBe(401);
  });
  it("menerima Bearer valid dan set req.user", async () => {
    const mw = makeRequireAuth(async () => ({ uid: "u1" }));
    const req = makeReq("Bearer tok") as Request;
    const res = makeRes();
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect((req as any).user.uid).toBe("u1");
  });
});
