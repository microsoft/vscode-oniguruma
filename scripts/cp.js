const fs = require('fs');
const path = require('path');

const src = path.join(path.join(__dirname, '../'), process.argv[2]);
const dst = path.join(path.join(__dirname, '../'), process.argv[3]);

console.log(`Copying ${src} to ${dst}`);
fs.writeFileSync(dst, fs.readFileSync(src));

