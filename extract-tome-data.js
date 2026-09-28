'use strict';
const fs=require('node:fs'),{catalogs}=require('./inspect-bonus-freshness');
const {values}=catalogs(fs.readFileSync(process.argv[2]||'../audit/N.js','utf8'));
const data={Tome:values.get('Tome'),order:values.get('NinjaInfo')?.[32].map(Number)};
if(!data.Tome||data.order.length!==data.Tome.length)throw Error('Incomplete Tome catalog/order');
fs.writeFileSync('tome-current-data.js','// Extracted from the audited game client; regenerate with extract-tome-data.js.\nwindow.TOME_CURRENT_DATA='+JSON.stringify(data)+';\n');
