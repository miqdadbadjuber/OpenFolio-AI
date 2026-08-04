const fs = require('fs');
const file = 'src/pages/CanvasPage.tsx';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/rounded-3xl/g, 'rounded-2xl');
fs.writeFileSync(file, data);
