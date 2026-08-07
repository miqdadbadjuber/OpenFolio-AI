import { describe, expect, it } from "vitest";
import { classifyReply } from "./reply-classify";

describe("classifyReply", () => {
  it("mengenali jawaban CHAT: explanation tanpa data", () => {
    expect(classifyReply({ explanation: "Tentu, begini caranya..." })).toEqual({
      kind: "chat",
      explanation: "Tentu, begini caranya...",
    });
  });

  it("mengenali jawaban CHAT: explanation dengan data null", () => {
    expect(classifyReply({ explanation: "Maaf, di luar topik.", data: null })).toEqual({
      kind: "chat",
      explanation: "Maaf, di luar topik.",
    });
  });

  it("mengenali jawaban EDIT: explanation + data delta", () => {
    const result = classifyReply({
      explanation: "Sudah kuubah.",
      data: { name: "Budi", title: "Fullstack Dev" },
    });
    expect(result?.kind).toBe("edit");
    expect((result as any)?.data).toEqual({ name: "Budi", title: "Fullstack Dev" });
  });

  it("mengenali jawaban EDIT: portofolio polos ber-name tanpa wrapper", () => {
    const result = classifyReply({ name: "Budi", title: "SE", projects: [] });
    expect(result?.kind).toBe("edit");
    expect((result as any)?.data.name).toBe("Budi");
  });

  it("menolak respons yang tidak valid (null, string, array, data array)", () => {
    expect(classifyReply(null)).toBeNull();
    expect(classifyReply("halo")).toBeNull();
    expect(classifyReply([])).toBeNull();
    expect(classifyReply({ explanation: "x", data: [] })).toBeNull();
  });
});
