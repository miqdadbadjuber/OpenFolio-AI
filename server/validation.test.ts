import { describe, it, expect } from "vitest";
import { publishSchema } from "./validation";

describe("publishSchema", () => {
  it("menolak slug dengan karakter aneh", () => {
    expect(publishSchema.safeParse({ data: {}, slug: "x y!" }).success).toBe(false);
  });
});
