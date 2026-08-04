import http from "http";

function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(data);
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    };
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
         const d = JSON.parse(body);
         if (d.error) console.error("HTTP ERROR:", d.error);
         resolve(d);
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

async function run() {
  console.log("SIMULATING WORKFLOW...");
  let currentData = { name: "User", projects: [] };

  // A. Tambahkan
  console.log("\\n--- A. Tambah OpenFolio Mobile ---");
  const resA = await postRequest("/api/gemini/edit", {
    currentData,
    userMessage: "Tambahkan project baru bernama OpenFolio Mobile",
    history: []
  });
  console.log("AI says:", resA.explanation);
  currentData = resA.data || currentData;
  console.log("Projects:", JSON.stringify(currentData.projects, null, 2));

  // B. Ubah Deskripsi
  console.log("\\n--- B. Ubah Deskripsi ---");
  const resB = await postRequest("/api/gemini/edit", {
    currentData,
    userMessage: "Ubah deskripsi project OpenFolio Mobile menjadi: 'Aplikasi mobile untuk membangun portofolio profesional berbasis AI.'",
    history: []
  });
  console.log("AI says:", resB.explanation);
  currentData = resB.data || currentData;
  console.log("Projects:", JSON.stringify(currentData.projects, null, 2));

  // C. Rename
  console.log("\\n--- C. Rename ---");
  const resC = await postRequest("/api/gemini/edit", {
    currentData,
    userMessage: "Ganti nama project OpenFolio Mobile menjadi OpenFolio App",
    history: []
  });
  console.log("AI says:", resC.explanation);
  currentData = resC.data || currentData;
  console.log("Projects:", JSON.stringify(currentData.projects, null, 2));

  // D. Hapus
  console.log("\\n--- D. Hapus ---");
  const resD = await postRequest("/api/gemini/edit", {
    currentData,
    userMessage: "Hapus project OpenFolio App",
    history: []
  });
  console.log("AI says:", resD.explanation);
  currentData = resD.data || currentData;
  console.log("Projects:", JSON.stringify(currentData.projects, null, 2));

  // E. Image Update
  console.log("\\n--- E. Image Update (Re-add & Add Image) ---");
  // Re-add a project with image
  currentData.projects.push({ title: "OpenFolio App", image_url: "https://example.com/old_image.jpg" });
  const resE = await postRequest("/api/gemini/edit", {
    currentData,
    userMessage: "Tambahkan gambar project OpenFolio App dengan URL: https://example.com/new_image.jpg",
    history: []
  });
  console.log("AI says:", resE.explanation);
  currentData = resE.data || currentData;
  console.log("Projects:", JSON.stringify(currentData.projects, null, 2));
}

run().catch(console.error);
