'use strict';

// Extract official cog sprites from the installed game pack.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = __dirname;
const archive = path.resolve(ROOT, '../Idleon resources/app.asar');
const client = fs.readFileSync(path.resolve(ROOT, '../audit/N.js'), 'utf8');
const fd = fs.openSync(archive, 'r');

try {
  const headerPrefix = Buffer.alloc(16);
  fs.readSync(fd, headerPrefix, 0, headerPrefix.length, 0);
  const header = Buffer.alloc(headerPrefix.readUInt32LE(12));
  fs.readSync(fd, header, 0, header.length, 16);
  let entry = JSON.parse(header.toString('utf8'));
  for (const part of 'distBuild/static/game/lib/default.pak'.split('/')) entry = entry.files[part];
  const packOffset = 8 + headerPrefix.readUInt32LE(4) + Number(entry.offset);

  const names=[...new Set([...client.matchAll(/assets%2Fdata%2F((?:Cog[A-Za-z0-9_]*|ClassIcons[0-9]+|headBIG)\.png)/g)].map(m=>m[1]))];
  for (const name of names) {
    const match = client.match(new RegExp(`R0i(\\d+)R1zR2R3R4y\\d+:assets%2Fdata%2F${name.slice(0,-4)}\\.pngR6i(\\d+)`));
    if (!match) throw new Error(`${name.slice(0,-4)}.png not found in client index`);
    const packed = Buffer.alloc(Number(match[2]));
    fs.readSync(fd, packed, 0, packed.length, packOffset + Number(match[1]));
    const png = zlib.gunzipSync(packed);
    if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${name.slice(0,-4)}.png is not a PNG`);
    fs.writeFileSync(path.resolve(ROOT, `assets/${name.slice(0,-4)}.png`), png);
  }
  fs.writeFileSync(path.resolve(ROOT,'cog-assets.js'),'window.COG_ASSETS='+JSON.stringify(names)+';\n');
  console.log(`Extracted ${names.length} cog sprites.`);
} finally {
  fs.closeSync(fd);
}
