import { describe, expect, it } from "vitest";
import { detectCasualMessage } from "./casual-detect";

describe("detectCasualMessage", () => {
  it("mendeteksi sapaan biasa", () => {
    expect(detectCasualMessage("halo")).not.toBeNull();
    expect(detectCasualMessage("Halo!")).not.toBeNull();
    expect(detectCasualMessage("hai")).not.toBeNull();
    expect(detectCasualMessage("hello")).not.toBeNull();
    expect(detectCasualMessage("pagi")).not.toBeNull();
    expect(detectCasualMessage("selamat malam")).not.toBeNull();
    expect(detectCasualMessage("assalamualaikum")).not.toBeNull();
    expect(detectCasualMessage("tes")).not.toBeNull();
    expect(detectCasualMessage("test")).not.toBeNull();
  });

  it("mendeteksi ucapan terima kasih & konfirmasi", () => {
    expect(detectCasualMessage("makasih")).not.toBeNull();
    expect(detectCasualMessage("terima kasih")).not.toBeNull();
    expect(detectCasualMessage("thanks")).not.toBeNull();
    expect(detectCasualMessage("oke")).not.toBeNull();
    expect(detectCasualMessage("siap")).not.toBeNull();
  });

  it("mendeteksi obrolan ringan", () => {
    expect(detectCasualMessage("apa kabar")).not.toBeNull();
    expect(detectCasualMessage("kamu bisa apa")).not.toBeNull();
    expect(detectCasualMessage("kamu siapa")).not.toBeNull();
    expect(detectCasualMessage("bantuan")).not.toBeNull();
  });

  it("TIDAK mendeteksi pesan yang berisi instruksi nyata", () => {
    expect(detectCasualMessage("ganti warna jadi biru")).toBeNull();
    expect(detectCasualMessage("halo, ganti nama jadi Budi")).toBeNull();
    expect(detectCasualMessage("tambah proyek baru")).toBeNull();
    expect(detectCasualMessage("coba ganti aksen")).toBeNull();
    expect(detectCasualMessage("ubah deskripsi di hero")).toBeNull();
  });

  it("pesan kosong tidak terdeteksi", () => {
    expect(detectCasualMessage("")).toBeNull();
    expect(detectCasualMessage("   ")).toBeNull();
    expect(detectCasualMessage("halo halo")).toBeNull(); // konservatif
  });
});
