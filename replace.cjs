const fs = require('fs');
const file = 'src/pages/SettingsPage.tsx';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/rounded-\[var\(--radius-lg\)]/g, 'rounded-2xl');
data = data.replace(/rounded-\[var\(--radius-md\)]/g, 'rounded-[var(--radius-sm)]');
data = data.replace(/rounded-xl/g, 'rounded-lg');
fs.writeFileSync(file, data);
