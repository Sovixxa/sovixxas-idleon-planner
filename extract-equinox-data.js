'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm');
const root=__dirname,client=fs.readFileSync(path.resolve(root,'../audit/N.js'),'utf8');
function list(name){const token='.'+name+'=function(){return',start=client.indexOf(token)+token.length,end=client.indexOf('},na.',start);if(start<token.length)throw Error(name+' missing');return vm.runInNewContext(client.slice(start,end));}
const data={DreamChallenge:list('DreamChallenge'),DreamUpg:list('DreamUpg'),CloudsMap:list('CloudsMap')};
fs.writeFileSync(path.resolve(root,'equinox-data.js'),'window.EQUINOX_CATALOG='+JSON.stringify(data)+';\n');
const names=['Dream_Bar','Dream_Cloud','Dream_Cloud2','Dream_Desc','Dream_Dot0','Dream_Dot1','Dream_Dot2','Dream_Fill','Dream_Upg0','Dream_Upg1','FishEquinox','FishEquinox_x1'];
const matches=names.map(name=>{const m=client.match(new RegExp(`R0i(\\d+)R1zR2R3R4y\\d+:assets%2Fdata%2F${name}\\.pngR6i(\\d+)`));return m&&[m[0],m[1],name,m[2]];}).filter(Boolean);
const archive=path.resolve(root,'../Idleon resources/app.asar'),fd=fs.openSync(archive,'r');let count=0;
try{const prefix=Buffer.alloc(16);fs.readSync(fd,prefix,0,16,0);const header=Buffer.alloc(prefix.readUInt32LE(12));fs.readSync(fd,header,0,header.length,16);let entry=JSON.parse(header.toString('utf8'));for(const part of 'distBuild/static/game/lib/default.pak'.split('/'))entry=entry.files[part];const offset=8+prefix.readUInt32LE(4)+Number(entry.offset);for(const match of matches){const name=decodeURIComponent(match[2]);if(!/^[\w.-]+$/.test(name))continue;const out=path.resolve(root,'assets',name+'.png');if(fs.existsSync(out))continue;const packed=Buffer.alloc(Number(match[3]));fs.readSync(fd,packed,0,packed.length,offset+Number(match[1]));try{fs.writeFileSync(out,zlib.gunzipSync(packed));count++;}catch{}}
}finally{fs.closeSync(fd);}console.log(`Extracted ${count} Equinox sprites from ${matches.length} candidates.`);
