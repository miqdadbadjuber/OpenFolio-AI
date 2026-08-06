import { describe, it, expect } from "vitest";
import { escapeHTML, safeParseJSON, slugify, sanitizePortfolioData } from "./portfolio-render";

describe("escapeHTML", () => {
  it("meng-escape karakter berbahaya", () => {
    expect(escapeHTML("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("safeParseJSON", () => {
  it("mengekstrak JSON dari teks campur", () => {
    const out = safeParseJSON('Teks { "a": 1, } trailing', {});
    expect(out.a).toBe(1);
  });
  it("return fallback bila gagal", () => {
    expect(safeParseJSON("bukan json", "fb")).toBe("fb");
  });
});

describe("slugify", () => {
  it("mengubah nama jadi slug aman", () => {
    expect(slugify("Nama Saya! Ke-2")).toBe("nama-saya-ke-2");
  });
  it("fallback bila kosong", () => {
    expect(slugify("")).toBe("portfolio");
  });
});

describe("sanitizePortfolioData", () => {
  it("memblokir data: URL pada link proyek", () => {
    const out = sanitizePortfolioData({ projects: [{ title: "p", link: "data:text/html,<script>1</script>" }] });
    expect(out.projects[0].link).toBe("#");
  });
  it("mengizinkan https URL", () => {
    const out = sanitizePortfolioData({ projects: [{ title: "p", link: "https://example.com" }] });
    expect(out.projects[0].link).toBe("https://example.com");
  });
  it("meng-escape nama", () => {
    const out = sanitizePortfolioData({ name: "<b>x</b>" });
    expect(out.name).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
  it("menetralkan payload XSS injeksi atribut", () => {
    const out = sanitizePortfolioData({
      projects: [{ title: "p", link: 'https://x/" onmouseover="alert(1)' }],
      hero_image_url: 'https://x/" onerror="alert(1)',
    });
    expect(out.projects[0].link).toBe("#");
    expect(out.hero_image_url).toBeNull();
  });
  it("tidak melempar pada nilai link non-string (z.record(z.any()))", () => {
    const out = sanitizePortfolioData({
      projects: [{ title: "p", link: 123 as any, image_url: { bad: true } as any }],
      socials: { github: ["x"] as any },
    });
    expect(out.projects[0].link).toBe("#");
    expect(out.projects[0].image_url).toBe("#");
    expect(out.socials.github).toBe("#");
  });
  it("menambahkan https:// untuk URL social tanpa protokol (point review #4)", () => {
    const out = sanitizePortfolioData({
      socials: { github: "github.com/ilham", linkedin: "https://linkedin.com/in/ilham" },
    });
    expect(out.socials.github).toBe("https://github.com/ilham");
    expect(out.socials.linkedin).toBe("https://linkedin.com/in/ilham");
  });
  it("menjaga protokol berbahaya tetap ditolak meski tanpa protokol", () => {
    const out = sanitizePortfolioData({ socials: { website: "javascript:alert(1)" } });
    expect(out.socials.website).toBe("#");
  });
  it("navbar di-escape dan name_text disimpan (point review #1)", () => {
    const out = sanitizePortfolioData({
      name: "Nama Asli",
      navbar: { enabled: true, items: ["Tentang"], name_text: "<b>Brand</b>" },
    });
    expect(out.navbar.name_text).toBe("&lt;b&gt;Brand&lt;/b&gt;");
    expect(out.navbar.enabled).toBe(true);
    expect(out.navbar.items).toEqual(["Tentang"]);
  });
});
