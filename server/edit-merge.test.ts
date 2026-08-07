import { describe, expect, it } from "vitest";
import { applyEditDelta } from "./edit-merge";

function basePortfolio() {
  return {
    name: "Nama Pengguna",
    role: "Software Engineer",
    hero_description: "Deskripsi hero.",
    hero_image_url: null,
    visual_behavior: { identity_tone: "technical", layout_density: "balanced", asymmetry_level: 0.05, typography_scale: "balanced", motion_intensity: "subtle", content_pacing: "deliberate" },
    layout_config: { section_ordering: ["hero", "about", "career", "projects", "skills", "contact"], show_navbar: true },
    socials: { linkedin: "linkedin.com/in/u", github: null, website: null, twitter: null, instagram: null },
    about_paragraph_1: "Tentang saya.",
    about_paragraph_2: null,
    contact_email: "user@example.com",
    contact_location: "Jakarta",
    stats: [{ value: "10", label: "Proyek" }],
    skills: [
      { title: "Frontend", items: ["React", "TypeScript"], category: "tech", visual_weight: 5 },
      { title: "Backend", items: ["Node.js"], category: "tech", visual_weight: 4 },
    ],
    projects: [
      { title: "Proyek A", description: "Deskripsi A", image_url: null, link: null, tags: ["web"], visual_priority: "high" },
      { title: "Proyek B", description: "Deskripsi B", image_url: null, link: null, tags: ["mobile"], visual_priority: "medium" },
    ],
    career: [
      { period: "2020 - Sekarang", role: "Engineer", company: "PT Contoh", description: "Deskripsi karir." },
    ],
    color_accent: "#4F46E5",
    color_accent_hover: "#4338CA",
    footer_year: "2026",
    templateName: "studio",
  };
}

describe("applyEditDelta", () => {
  it("menggabungkan delta scalar dan mempertahankan data yang tidak disentuh", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, { name: "Nama Pengguna", color_accent: "#1E3A8A" });
    expect(result.color_accent).toBe("#1E3A8A");
    expect(result.name).toBe("Nama Pengguna");
    expect(result.role).toBe("Software Engineer"); // tidak disentuh, tetap ada
    expect(result.projects).toHaveLength(2);
    expect(result.skills).toHaveLength(2);
    expect(result.career).toHaveLength(1);
  });

  it("menambah proyek baru lewat delta object tunggal", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, {
      name: "Nama Pengguna",
      projects: { title: "Dashboard Analitik", description: "Proyek baru.", tags: ["data"], visual_priority: "high" },
    });
    expect(result.projects).toHaveLength(3);
    expect(result.projects[2]).toMatchObject({ title: "Dashboard Analitik", description: "Proyek baru." });
    // Proyek lama tetap utuh
    expect(result.projects[0].title).toBe("Proyek A");
  });

  it("mengubah proyek yang sudah ada berdasarkan judul", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, {
      name: "Nama Pengguna",
      projects: { title: "Proyek A", description: "Deskripsi A diperbarui." },
    });
    expect(result.projects).toHaveLength(2);
    expect(result.projects[0].description).toBe("Deskripsi A diperbarui.");
    expect(result.projects[1].title).toBe("Proyek B");
  });

  it("menghapus proyek lewat array penuh", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, {
      name: "Nama Pengguna",
      projects: [current.projects[0]],
    });
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].title).toBe("Proyek A");
  });

  it("menambah skill baru lewat delta object tunggal", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, {
      name: "Nama Pengguna",
      skills: { title: "DevOps", items: ["Docker"], category: "tech", visual_weight: 3 },
    });
    expect(result.skills).toHaveLength(3);
    expect(result.skills[2]).toMatchObject({ title: "DevOps", items: ["Docker"] });
  });

  it("mengubah skill yang sudah ada berdasarkan judul", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, {
      name: "Nama Pengguna",
      skills: { title: "Frontend", items: ["React", "TypeScript", "Vite"], visual_weight: 6 },
    });
    expect(result.skills).toHaveLength(2);
    expect(result.skills[0].items).toEqual(["React", "TypeScript", "Vite"]);
    expect(result.skills[0].visual_weight).toBe(6);
  });

  it("mengganti skills seluruhnya lewat array penuh", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, {
      name: "Nama Pengguna",
      skills: [{ title: "Satu", items: ["A"], category: "tech", visual_weight: 1 }],
    });
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].title).toBe("Satu");
  });

  it("menambah karir baru dan menghindari duplikat", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, {
      name: "Nama Pengguna",
      career: { period: "2018 - 2020", role: "Junior", company: "PT Lain", description: "Karir lama." },
    });
    expect(result.career).toHaveLength(2);
    // Yang sudah ada dengan role/company sama tidak diduplikasi
    const dup = applyEditDelta(result, { name: "Nama Pengguna", career: { role: "Engineer", company: "PT Contoh", description: "Diupdate." } });
    expect(dup.career).toHaveLength(2);
    expect(dup.career[0].description).toBe("Diupdate.");
  });

  it("tidak menimpa socials jadi null", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, { name: "Nama Pengguna", socials: null });
    expect(result.socials).toEqual({});
  });

  it("delta kosong mengembalikan currentData apa adanya", () => {
    const current = basePortfolio();
    const result = applyEditDelta(current, { name: "Nama Pengguna" });
    expect(result).toEqual(current);
  });
});
