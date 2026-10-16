'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const source=fs.readFileSync('../audit/N.js','utf8'),archive=process.argv[2];
if(!archive)throw Error('Provide the updated app.asar path');
const fd=fs.openSync(archive,'r');let count=0;
try{
 const pre=Buffer.alloc(16);fs.readSync(fd,pre,0,16,0);const head=Buffer.alloc(pre.readUInt32LE(12));fs.readSync(fd,head,0,head.length,16);
 let entry=JSON.parse(head.toString());for(const key of 'distBuild/static/game/lib/default.pak'.split('/'))entry=entry.files[key];
 const offset=8+pre.readUInt32LE(4)+Number(entry.offset);
 for(const m of source.matchAll(/R0i(\d+)R1zR2R3R4y\d+:assets%2Fdata%2F([A-Za-z0-9_]+)\.pngR6i(\d+)/g)){
  const target=path.join(__dirname,'assets',m[2]+'.png');
  if(!/^(Coins|CKsing|EquipmentNametagReplica43|EquipmentGown9|Crystal6|Mena|Menagerie|PachiShopICON|CoralKid|LabBonus|Spelunking6|Atom|Nj|ResMagni|LegendTalentIcon|Card|w7b10)/.test(m[2]))continue;
  const bytes=Buffer.alloc(Number(m[3]));fs.readSync(fd,bytes,0,bytes.length,offset+Number(m[1]));const png=zlib.gunzipSync(bytes);
  if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG '+m[2]);
  if(!fs.existsSync(target)||!fs.readFileSync(target).equals(png)){fs.writeFileSync(target,png);count++;}
 }
}finally{fs.closeSync(fd);}
console.log('Updated '+count+' game sprites.');
