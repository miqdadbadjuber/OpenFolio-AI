const fs = require('fs');
const file = 'src/pages/SettingsPage.tsx';
let data = fs.readFileSync(file, 'utf8');

// Replacements
data = data.replace(/var\(--accent\)/g, '#8b85a1');
data = data.replace(/var\(--accent-subtle\)/g, '#8b85a11a');
data = data.replace(/var\(--accent-hover\)/g, '#9e99b3');

fs.writeFileSync(file, data);
