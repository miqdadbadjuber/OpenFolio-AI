// Logika penggabungan delta hasil revisi AI ke data portofolio yang sudah ada.
// Dipisah dari route /api/gemini/edit agar bisa diuji unit secara langsung.
//
// Konsep DELTA: Gemini hanya mengembalikan field yang berubah (bukan seluruh
// portofolio), sehingga latensi turun drastis. Fungsi ini menggabungkan delta
// ke currentData tanpa menghilangkan data yang tidak disentuh AI.

const isObject = (item: any) => (item && typeof item === "object" && !Array.isArray(item));

export function applyEditDelta(currentData: any, editData: any): any {
  const finalData = { ...currentData };

  // --- Top-level scalar & object merge ---
  for (const key in editData) {
    if (key === "career" || key === "projects" || key === "skills" || key === "stats") continue; // Handled below
    if (key === "socials" && editData[key] === null) {
      // Jangan timpa socials jadi null (memecah render); kosongkan saja.
      finalData.socials = {};
      continue;
    }
    if (isObject(editData[key]) && isObject(finalData[key])) {
      finalData[key] = { ...finalData[key], ...editData[key] };
    } else {
      finalData[key] = editData[key];
    }
  }

  // --- PROJECT SMART MERGE ---
  if (editData.projects !== undefined) {
    if (!Array.isArray(editData.projects) && isObject(editData.projects)) {
      // Object tunggal = tambah/ubah satu proyek
      const inc = editData.projects;
      const mergedProjects = Array.isArray(currentData.projects) ? [...currentData.projects] : [];
      const titleMatch = inc?.title || inc?.name;
      if (titleMatch) {
        const exists = mergedProjects.find((p: any) =>
          (p.title && p.title.toLowerCase() === titleMatch.toLowerCase()) ||
          (p.name && p.name.toLowerCase() === titleMatch.toLowerCase())
        );
        if (exists) Object.assign(exists, inc);
        else mergedProjects.push({ ...inc, title: titleMatch });
      }
      finalData.projects = mergedProjects;
    } else if (Array.isArray(editData.projects)) {
      // Array penuh = operasi hapus/ganti total
      finalData.projects = editData.projects;
    }
  }

  // --- SKILLS SMART MERGE (mendukung delta object tunggal) ---
  if (editData.skills !== undefined) {
    if (!Array.isArray(editData.skills) && isObject(editData.skills)) {
      const inc = editData.skills;
      const mergedSkills = Array.isArray(currentData.skills) ? [...currentData.skills] : [];
      const titleMatch = inc?.title;
      if (titleMatch) {
        const exists = mergedSkills.find((s: any) => s.title && s.title.toLowerCase() === titleMatch.toLowerCase());
        if (exists) Object.assign(exists, inc);
        else mergedSkills.push(inc);
      }
      finalData.skills = mergedSkills;
    } else if (Array.isArray(editData.skills)) {
      // Array penuh = operasi hapus/ganti total
      finalData.skills = editData.skills;
    }
  }

  // --- STATS SMART MERGE (mendukung delta object tunggal) ---
  if (editData.stats !== undefined) {
    if (!Array.isArray(editData.stats) && isObject(editData.stats)) {
      const inc = editData.stats;
      const mergedStats = Array.isArray(currentData.stats) ? [...currentData.stats] : [];
      const labelMatch = inc?.label;
      if (labelMatch) {
        const exists = mergedStats.find((s: any) => s.label && s.label === labelMatch);
        if (exists) Object.assign(exists, inc);
        else mergedStats.push(inc);
      }
      finalData.stats = mergedStats;
    } else if (Array.isArray(editData.stats)) {
      finalData.stats = editData.stats;
    }
  }

  // --- CAREER MERGE ---
  if (editData.career !== undefined) {
    let incomingCareer = editData.career;
    if (isObject(incomingCareer)) incomingCareer = [incomingCareer];

    if (Array.isArray(incomingCareer)) {
      const mergedCareer = Array.isArray(currentData.career) ? [...currentData.career] : [];
      for (const inc of incomingCareer) {
        if (!inc || (!inc.role && !inc.company)) continue;

        const exists = mergedCareer.find((c: any) =>
          (c.role && c.role === inc.role) || (c.company && c.company === inc.company)
        );

        if (!exists) mergedCareer.push(inc);
        else Object.assign(exists, inc);
      }
      finalData.career = mergedCareer;
    }
  }

  return finalData;
}
