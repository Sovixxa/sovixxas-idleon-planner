'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname,client=fs.readFileSync(path.resolve(root,'../audit/N.js'),'utf8'),box={window:{}};
vm.runInNewContext(fs.readFileSync(path.resolve(root,'cards-data.js'),'utf8'),box);
const wanted=new Set(box.window.CARDS_CATALOG.groups.flat().map(row=>row[0]).filter(id=>id!=='Blank')),names={};
for(const match of client.matchAll(/addNewMonster\("([^"]+)",\{Name:"([^"]*)"/g))if(wanted.has(match[1]))names[match[1]]=match[2].replaceAll('_',' ');
const missing=[...wanted].filter(id=>!names[id]);if(missing.length)throw new Error(`Missing card names: ${missing.join(', ')}`);
fs.writeFileSync(path.resolve(root,'card-names-data.js'),`window.CARD_NAMES=${JSON.stringify(names)};\n`);
console.log(`Extracted ${Object.keys(names).length} card names.`);
