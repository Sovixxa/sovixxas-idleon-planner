'use strict';
const fs=require('node:fs');
const save=JSON.parse(fs.readFileSync('C:/Users/Sofia/.codex/attachments/2421dc44-490e-4138-a1b9-f6f2a83a490a/Pasted text.txt','utf8'));
const data=save.data||save;
for(const [k,v] of Object.entries(data))if(/royal|armor|armour|guardian/i.test(k))console.log('SAVE',k,typeof v==='string'?v.slice(0,1000):JSON.stringify(v).slice(0,1000));
const src=fs.readFileSync('beanstalk-engine.js','utf8');
for(const term of ['Royal Armory','Royal_Armory','RoyalG','RoyalMaps','Armory','Royal Resource','Royal Statue']){let at=-1,n=0;while((at=src.indexOf(term,at+1))>=0&&n++<8)console.log('\nTERM',term,'AT',at,'\n',src.slice(Math.max(0,at-600),at+1000));}
