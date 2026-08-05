import { describe, it, expect } from "vitest";
import { evaluateUsage, resetIfNeeded, QUOTA_LIMITS, type UsageDoc } from "./quota";

const base: UsageDoc = { generates: 0, edits: 0, lastResetDate: new Date().toISOString().split("T")[0] ?? "" };

describe("evaluateUsage", () => {
  it("mengizinkan saat belum penuh", () => {
    const r = evaluateUsage(base, "generate");
    expect(r.allowed).toBe(true);
    expect(r.next.generates).toBe(1);
  });
  it("menolak saat limit generate tercapai", () => {
    const doc = { ...base, generates: QUOTA_LIMITS.generate };
    expect(evaluateUsage(doc, "generate").allowed).toBe(false);
  });
  it("menolak saat limit edit tercapai", () => {
    const doc = { ...base, edits: QUOTA_LIMITS.edit };
    expect(evaluateUsage(doc, "edit").allowed).toBe(false);
  });
});

describe("resetIfNeeded", () => {
  it("mereset counter bila tanggal berbeda", () => {
    const old = { generates: 5, edits: 7, lastResetDate: "2000-01-01" };
    const r = resetIfNeeded(old);
    expect(r.generates).toBe(0);
  });
  it("tidak mereset bila tanggal sama", () => {
    const r = resetIfNeeded({ ...base, generates: 2 });
    expect(r.generates).toBe(2);
  });
});
