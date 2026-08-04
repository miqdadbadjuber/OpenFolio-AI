const fs = require('fs');

let canvas = fs.readFileSync('src/pages/CanvasPage.tsx', 'utf8');
canvas = canvas.replace(/Bangun Portofolio/g, 'Buat Portofolio');
canvas = canvas.replace(/>{lang === 'id' \? 'Bangun Portofolio' : 'Build Portfolio'}</g, ">{lang === 'id' ? 'Buat Portofolio' : 'Build Portfolio'} <");

fs.writeFileSync('src/pages/CanvasPage.tsx', canvas);

let settings = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
settings = settings.replace(/Anda sedang menggunakan Guest Mode/, 'Anda sedang menggunakan Mode Tamu');
settings = settings.replace(/menyimpan portfolio/, 'menyimpan portofolio');
settings = settings.replace(/Statistik Guest Mode/, 'Statistik Mode Tamu');
settings = settings.replace(/Simpan Portfolio tanpa batas/, 'Simpan Portofolio tanpa batas');
settings = settings.replace(/Riwayat Portfolio/g, 'Riwayat Portofolio');
settings = settings.replace(/Portfolio Profesional Klasik/g, 'Portofolio Profesional Klasik');
settings = settings.replace(/AI Portfolio Builder/g, 'AI Portofolio Builder');
settings = settings.replace(/Publish Portfolio Online/g, 'Publish Portofolio Online');
settings = settings.replace(/Portfolio Premium Generasi Berikutnya/g, 'Portofolio Premium Generasi Berikutnya');
settings = settings.replace(/Portfolio 3D Interaktif/g, 'Portofolio 3D Interaktif');
settings = settings.replace(/'Hapus Semua Portfolio'/g, "'Hapus Semua Portofolio'");
settings = settings.replace(/'Platform Ideasi Portfolio Berbasis AI Terarah'/g, "'Platform Ideasi Portofolio Berbasis AI Terarah'");

fs.writeFileSync('src/pages/SettingsPage.tsx', settings);
console.log('Done replacements');
