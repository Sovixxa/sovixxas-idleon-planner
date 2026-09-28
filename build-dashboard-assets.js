'use strict';
const fs=require('node:fs'),path=require('node:path');
const assets=Object.fromEntries(fs.readdirSync(path.join(__dirname,'assets')).filter(f=>/\.png$/i.test(f)).map(f=>[f.replace(/\.png$/i,''),'assets/'+f]));
fs.writeFileSync(path.join(__dirname,'dashboard-assets.js'),'window.DashboardAssets='+JSON.stringify(assets)+';\n');
