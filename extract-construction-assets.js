'use strict';

// Extract the 27 Construction building sprites directly from the installed
// IdleOn asset pack. This keeps the planner's art aligned with the game.
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

  for (let id = 0; id < 27; id += 1) {
    const match = client.match(new RegExp(`R0i(\\d+)R1zR2R3R4y\\d+:assets%2Fdata%2FConTower${id}\\.pngR6i(\\d+)`));
    if (!match) throw new Error(`ConTower${id}.png not found in client index`);
    const packed = Buffer.alloc(Number(match[2]));
    fs.readSync(fd, packed, 0, packed.length, packOffset + Number(match[1]));
    const png = zlib.gunzipSync(packed);
    if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`ConTower${id}.png is not a PNG`);
    fs.writeFileSync(path.resolve(ROOT, `assets/ConTower${id}.png`), png);
  }
  console.log('Extracted 27 Construction building sprites.');
} finally {
  fs.closeSync(fd);
}
