'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const archive=path.resolve(process.argv[2]||path.join(__dirname,'../Idleon resources/app.asar'));
const fd=fs.openSync(archive,'r');
try{
  const head=Buffer.alloc(16);fs.readSync(fd,head,0,16,0);
  const header=Buffer.alloc(head.readUInt32LE(12));fs.readSync(fd,header,0,header.length,16);
  let entry=JSON.parse(header.toString('utf8'));
  for(const part of 'distBuild/static/game/N.js'.split('/'))entry=entry.files?.[part];
  if(!entry||entry.unpacked)throw new Error('Packed N.js entry not found');
  const size=Number(entry.size),offset=8+head.readUInt32LE(4)+Number(entry.offset);
  if(!Number.isSafeInteger(size)||!Number.isSafeInteger(offset)||size<1||offset<16||offset+size>fs.fstatSync(fd).size)throw new Error('Invalid archive entry');
  const source=Buffer.alloc(size);fs.readSync(fd,source,0,size,offset);
  const output=path.resolve(__dirname,'../audit/N.js');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,source);
  console.log('Extracted local client for audit:',size,'bytes, SHA256',crypto.createHash('sha256').update(source).digest('hex'));
}finally{fs.closeSync(fd);}
