const fs = require('fs');
const path = require('path');

const projectFile    = path.join(__dirname, '..', 'JS-Wallpaper', 'project.json');
const versionPattern = /("version"\s*:\s*)(\d+)/;

// Se edita el texto y no se reserializa: Wallpaper Engine usa su propio formato en project.json.
const source = fs.readFileSync(projectFile, 'utf8');
const match  = source.match(versionPattern);
if (!match) {
    console.error('No se encontró "version" en project.json');
    process.exit(1);
}

const previous = Number(match[2]);
const next     = previous + 1;
fs.writeFileSync(projectFile, source.replace(versionPattern, (_, prefix) => `${prefix}${next}`));
console.log(`version ${previous} -> ${next}`);
