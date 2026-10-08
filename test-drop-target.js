const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={console};vm.createContext(c);
// Keep JSON-save arrays in the engine realm so its Array helpers survive clones.
vm.runInContext('structuredClone=value=>JSON.parse(JSON.stringify(value))',c);
for(const f of ['prayer-math-engine.js','stat-todo-model.js','drop-rate-model.js','drop-source-info.js','drop-target-sources.js','drop-target-model.js','drop-rate.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const app=fs.readFileSync('app.js','utf8');for(const match of fs.readFileSync('drop-target-sources.js','utf8').matchAll(/page:'([^']+)'/g))assert(app.includes(match[1]+':')||app.includes('SKILL_PAGES.'+match[1]+'='),'Valid upgrade navigation: '+match[1]);
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(raw),M=c.PrayerMath,S=c.DropTargetSources;
const parse=data=>M.parseData(c.structuredClone(data),raw.charNames,raw.companion,raw.guildData,raw.serverVars||{},raw.accountCreateTime,raw.tournament);
const rate=p=>M.getDropRate(p.characters[0],p.account,p.characters).dropRate;
const parsed=parse(raw.data),current=rate(parsed),updates=[];
const plan=c.DropTargetModel.plan(raw,0,143761,M,p=>updates.push(p));
assert(plan.reached,'The real endgame fixture must find a path beyond the saturated DR bubble');
assert(plan.after>current);assert.equal(plan.before,current);assert.equal(plan.issues.length,0);
assert(updates.some(p=>p.phase==='compare')&&updates.some(p=>p.phase==='combine'));
assert.equal(JSON.stringify(raw),original,'Never mutate the imported export');
assert.equal(new Set(plan.steps.map(s=>s.id)).size,plan.steps.length);
assert(!plan.options.some(s=>s.name==='DROPPIN LOADS'));
assert(plan.options.some(s=>s.name==='Golden Apple Stamp'&&s.gain>0));
assert(!plan.options.some(s=>/Grey Coral/.test(s.name)),'Grey Coral level 10 is capped; do not invent level 11');
const fill=plan.options.find(s=>s.id==='food-fill'),mason=plan.options.find(s=>/Mason Jar/.test(s.name));
assert(fill&&mason);assert.equal(plan.steps[0].id,'food-fill','Fill existing capacity before spending on more capacity');
assert(mason.foodAfter.amount>fill.foodAfter.amount);assert(mason.foodAfter.capacity>fill.foodAfter.capacity);
assert(mason.requirements.some(s=>/Glass Shard/.test(s)));assert(mason.requirements.some(s=>/Capacity alone/.test(s)));
assert(plan.options.some(s=>/ribbon/.test(s.name)&&s.to===25));
assert(plan.options.some(s=>/Endless Summoning/.test(s.name)&&s.path[0]==='OptLacc'));
assert(plan.options.some(s=>/Gallery grade/.test(s.name)));
assert(plan.coverage.length===c.DropRateModel.ledger(M.getDropRate(parsed.characters[0],parsed.account,parsed.characters)).length);
assert(plan.coverage.some(s=>s.name.toLowerCase()==='golden food'&&/Compared/.test(s.status)));
assert(plan.coverage.some(s=>s.name==='Obols'&&/no verified/.test(s.status)));
const save=structuredClone(raw.data);
for(const step of plan.steps){c.DropTargetModel.apply(save,step);assert.equal(rate(parse(save)),step.after,'Every cumulative projection must replay from its raw-save changes');}
for(const step of [fill,mason,plan.options.find(s=>/Endless Summoning/.test(s.name))]){
 const one=structuredClone(raw.data);c.DropTargetModel.apply(one,step);assert.equal(rate(parse(one)),step.after,'Independent alternatives must be reproducible');
}
const stampOnly=structuredClone(raw.data);S.set(stampOnly,mason.path,mason.to);S.set(stampOnly,mason.capPath,mason.capTo);
assert.equal(rate(parse(stampOnly)),current,'Mason Jar alone must not pretend to add DR');
assert.equal(S.get(raw.data,['Meals',0,64]),145,'Decode nested JSON-string save containers');
const missingQty=structuredClone(raw);delete missingQty.data.EquipQTY_0;assert.throws(()=>c.DropTargetModel.plan(missingQty,0,143761),/incomplete|full export/);
assert.throws(()=>c.DropTargetModel.plan(raw,0,NaN),/target/);
const cove=structuredClone(raw);cove.data.CurrentMap_0=216;S.set(cove.data,['Holes',0,0],17);assert.throws(()=>c.DropTargetModel.plan(cove,0,143761),/Cove/);
const dup=structuredClone(raw.data);S.set(dup,['EquipOrder_0',2,4],'FoodG13');S.set(dup,['EquipQTY_0',2,4],1);const dupState=S.foodState(parse(dup),0,dup,M);assert.equal(dupState.path[2],5,'Only the last matching golden-food slot counts');assert.equal(dupState.duplicates,2);
const candidateNames=S.build(parsed,raw.data,0,M).candidates.map(c=>c.name);assert(candidateNames.includes('Mason Jar Stamp + refill Golden Cake'));
const capped=parse(raw.data);capped.account.cooking.meals.find(m=>m.index===64).level=capped.account.cooking.mealMaxLevel;
const fullMealSave=structuredClone(raw.data);S.set(fullMealSave,['Meals',0,64],capped.account.cooking.mealMaxLevel);
assert(!S.build(capped,fullMealSave,0,M).candidates.some(c=>c.path[0]==='Meals'),'Respect meal-level cap');
// Rank upgrades use the native Beanstalk order, not a guessed cake index.
const stalkIndex=M.dropBeanstalkOrder[29].filter(v=>isNaN(v)).findIndex(raw=>M.stampItemCatalog[raw]?.Effect==='DropRatez');
const stalk=structuredClone(raw.data);S.set(stalk,['Ninja',104,stalkIndex],2);const stalkParsed=parse(stalk),stalkCandidate=S.build(stalkParsed,stalk,0,M).candidates.find(c=>c.name==='Golden Cake Beanstalk');assert(stalkCandidate&&stalkCandidate.to===3);const lowStalkRate=rate(stalkParsed);S.set(stalk,stalkCandidate.path,stalkCandidate.to);assert(rate(parse(stalk))>lowStalkRate);
// A shiny goal is an absolute progress threshold and the native test uses >.
let shinyIndex;
for(const [w,pets] of parsed.account.breeding.pets.entries())for(const [i,pet] of pets.entries())if(pet.unlocked&&/Bonuses_from_All_Meals/.test(pet.rawPassive))shinyIndex=[w,i];
assert(shinyIndex);const [world,index]=shinyIndex,shiny=structuredClone(raw.data);S.set(shiny,['Breeding',22+world,index],1);const shinyParsed=parse(shiny),shinyCandidate=S.build(shinyParsed,shiny,0,M).candidates.find(c=>c.path[0]==='Breeding'&&c.path[1]===22+world&&c.path[2]===index);assert(shinyCandidate);S.set(shiny,shinyCandidate.path,shinyCandidate.to);assert.equal(parse(shiny).account.breeding.pets[world][index].shinyLevel,shinyParsed.account.breeding.pets[world][index].shinyLevel+1);
const html=c.DropRate.targetResultHtml({...plan,reached:false,target:1e12});assert(html.includes('not your maximum'));assert(html.includes('Full source audit'));assert(html.includes('Golden Apple'));assert(html.includes('no verified next-step simulation'));
const escaped=c.DropRate.targetResultHtml({...plan,notes:['<script>bad()</script>']});assert(!escaped.includes('<script>bad'));
fs.writeFileSync('../audit/drop-target-deep-result.json',JSON.stringify(plan,null,2));
console.log('Drop target deep audit: food capacity chain, real target route, independent/cumulative replay, caps, full coverage, source exclusions, nested saves, duplicate foods, special maps, immutability and escaped UI passed.');
