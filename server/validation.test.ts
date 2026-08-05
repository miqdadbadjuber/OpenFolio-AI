import { describe, it, expect } from "vitest";
import { chatSchema, publishSchema } from "./validation";

describe("chatSchema", () => {
  it("menerima messages valid", () => {
    const r = chatSchema.safeParse({ messages: [{ role: "user", content: "hai" }] });
    expect(r.success).toBe(true);
  });
  it("menolak saat messages bukan array", () => {
    expect(chatSchema.safeParse({ messages: "x" }).success).toBe(false);
  });
  it("menolak content terlalu panjang", () => {
    expect(chatSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(5000) }] }).success).toBe(false);
  });
});
describe("publishSchema", () => {
  it("menolak slug dengan karakter aneh", () => {
    expect(publishSchema.safeParse({ data: {}, slug: "x y!" }).success).toBe(false);
  });
});
