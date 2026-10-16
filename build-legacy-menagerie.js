'use strict';
const fs=require('node:fs'),{catalogs}=require('./inspect-bonus-freshness'),install=require('./legacy-menagerie-adapter');
const quantities=catalogs(fs.readFileSync('../audit/N.js','utf8')).values.get('Research')[58];
const start='/* MENAGERIE_ADAPTER_START */',end='/* MENAGERIE_ADAPTER_END */';
let source=fs.readFileSync('beanstalk-engine.js','utf8');
if(source.includes(start)){const a=source.indexOf(start),b=source.indexOf(end,a)+end.length;source=source.slice(0,a)+source.slice(b);}
source=source.replace('var XMD=',start+'var installLegacyMenagerie='+install.toString()+';var menagerieQuantities='+JSON.stringify(quantities)+';'+end+'var XMD=');
const old='y.parse(g)}),Object.entries(YM)',patched='y.parse(g)}),installLegacyMenagerie(l,t.toJSON(),menagerieQuantities),Object.entries(YM)';
if(!source.includes(patched)){if(!source.includes(old))throw Error('Decoder pre-pass hook changed');source=source.replace(old,patched);}
fs.writeFileSync('beanstalk-engine.js',source);
console.log('Installed Menagerie hooks before legacy dependency passes.');
