'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const ROOT=__dirname,archive=path.resolve(ROOT,'../Idleon resources/app.asar'),client=fs.readFileSync(path.resolve(ROOT,'../audit/N.js'),'utf8'),fd=fs.openSync(archive,'r');
try{
 const pre=Buffer.alloc(16);fs.readSync(fd,pre,0,16,0);
 const head=Buffer.alloc(pre.readUInt32LE(12));fs.readSync(fd,head,0,head.length,16);
 let entry=JSON.parse(head.toString('utf8'));for(const part of 'distBuild/static/game/lib/default.pak'.split('/'))entry=entry.files[part];
 const offset=8+pre.readUInt32LE(4)+Number(entry.offset),wanted=/^(?:EquipmentStatues\d+|Prayer\d+|Obol[A-Za-z0-9_]+|DungPassive\d+|Refinery\d+|FoodG\d+|PeanutG|ButterBar)\.png$/;
 const names=[...new Set([...client.matchAll(/assets%2Fdata%2F([A-Za-z0-9_]+\.png)/g)].map(x=>x[1]).filter(x=>wanted.test(x)))];
 for(const name of names){const base=name.slice(0,-4).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),m=client.match(new RegExp(`R0i(\\d+)R1zR2R3R4y\\d+:assets%2Fdata%2F${base}\\.pngR6i(\\d+)`));if(!m)continue;const packed=Buffer.alloc(Number(m[2]));fs.readSync(fd,packed,0,packed.length,offset+Number(m[1]));const png=zlib.gunzipSync(packed);if(png.subarray(0,8).toString('hex')==='89504e470d0a1a0a')fs.writeFileSync(path.resolve(ROOT,'assets',name),png);}
 console.log('Extracted',names.length,'remaining sprites.');
}finally{fs.closeSync(fd);}
