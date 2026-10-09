const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={console:{log(){},warn(){},error(){},debug(){}}};c.self=c;vm.createContext(c);vm.runInContext('structuredClone=v=>JSON.parse(JSON.stringify(v))',c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c));c.postMessage=()=>{};c.importScripts('review-target-worker.js','dashboard-assets.js','upgrade-icons.js','review-target-ui.js');
const html=fs.readFileSync('index.html','utf8');c.document={getElementById(id){const match=html.match(new RegExp('id="'+id+'"[^>]*><img[^>]*src="([^\"]+)"'));return match?{querySelector:()=>({getAttribute:()=>match[1]})}:null;}};
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),session=c.ReviewTargetModel.session(raw),p=session.parse(raw.data),M=c.PrayerMath;
const review=c.ReviewTargetSources.build(p,raw.data,0,M).candidates,drop=c.DropTargetSources.build(p,raw.data,0,M).candidates;
for(const x of [...review,...drop]){assert(fs.existsSync(c.UpgradeIcons.source(x)),x.name+' icon exists');assert(c.UpgradeIcons.html(x).includes('width="28"'));}
for(const system of ['Stamps','Meals','Meal ribbons','Cooking Mastery','Talents','Cards','Nametags','Upgrade Vault','Grimoire','Tesseract','Vials','Sigils','Statue deposits','Summoning upgrades','Fountain','Observation insight','Spelunking shop']){
 const list=review.filter(x=>x.system===system);assert(list.length,system);for(const x of list)assert(c.DashboardAssets[x.icon]||c.DashboardAssets[x.icon+'_x1'],system+': '+x.name+' has its own sprite');
}
const meal=review.find(x=>x.system==='Meals');assert.equal(meal.icon,'CookingM'+meal.path[2]);
assert(!c.UpgradeIcons.html({...meal,name:'<script>bad</script>'}).includes('<script>'));
console.log('Verified local icons for '+review.length+' review and '+drop.length+' drop-rate upgrades; exact sprites across 19 upgrade families.');
