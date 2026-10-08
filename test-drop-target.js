const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={console};vm.createContext(c);
// Keep JSON-save arrays in the engine realm so its Array helpers survive clones.
vm.runInContext('structuredClone=value=>JSON.parse(JSON.stringify(value))',c);
for(const f of ['prayer-math-engine.js','stat-todo-model.js','drop-rate-model.js','drop-source-info.js','drop-target-sources.js','drop-target-model.js','drop-rate.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const app=fs.readFileSync('app.js','utf8');for(const match of fs.readFileSync('drop-target-sources.js','utf8').matchAll(/page:'([^']+)'/g))assert(match[1]==='jelly'||app.includes(match[1]+':')||app.includes('SKILL_PAGES.'+match[1]+'='),'Valid upgrade navigation: '+match[1]);
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
assert(plan.options.some(s=>s.group==='nametags'&&/Gallery grade/.test(s.name)));
assert(!plan.steps.some(s=>s.group==='nametags'),'Main route must not rely on time-gated nametag upgrades');
assert(plan.coverage.length===c.DropRateModel.ledger(M.getDropRate(parsed.characters[0],parsed.account,parsed.characters)).length);
assert(plan.coverage.some(s=>s.name.toLowerCase()==='golden food'&&/Compared/.test(s.status)));
assert(plan.coverage.some(s=>s.name==='Obols'&&/no verified/.test(s.status)));
const save=structuredClone(raw.data);
for(const step of plan.steps){c.DropTargetModel.apply(save,step);assert.equal(rate(parse(save)),step.after,'Every cumulative projection must replay from its raw-save changes');}
for(const step of plan.options){
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
const html=c.DropRate.targetResultHtml({...plan,reached:false,target:1e12});assert(html.includes('not your maximum'));assert(html.includes('Full source audit'));assert(html.includes('Golden Apple'));assert(html.includes('Optional nametag upgrades'));assert(html.includes('Kept separate from the main route'));assert(html.includes('no verified next-step simulation'));
// Audit new mechanics against the real export and native parser, not flat DR estimates.
for(const name of ['Faux Jewels','PLUMP DATABASE','Golden Hardhat','Orion: next Drop Rate bonus'])assert(plan.options.some(s=>s.name===name&&s.gain>0),name);
assert(plan.options.some(s=>s.name.includes('Royal Guardian family level')&&s.gain>0));
for(const name of ['Glimbo: next 100-trade DR milestone','Endless Summoning: next winner-bonus amplification reward','Emperor: next drop-rate or winner-bonus reward','Superior Crop Research','Hole: Drop Rate measurement'])assert(plan.options.some(s=>s.name===name&&s.gain>0),name);
assert(plan.steps.filter(s=>s.conflict==='endless').length<=1,'Alternative Endless milestones must not double count the same wins');
const glimboStep=plan.options.find(s=>s.name.startsWith('Glimbo:'));
const traded=structuredClone(raw.data);c.DropTargetModel.apply(traded,glimboStep);const tradeTotal=parse(traded).account.minehead.glimboTotalTrades;
assert.equal(tradeTotal,(Math.floor(parsed.account.minehead.glimboTotalTrades/100)+1)*100,'Glimbo multi-resource patches hit exactly the next threshold');
const cappedGrimoireSave=structuredClone(raw.data),grim=parsed.account.grimoire.upgrades.find(s=>s.index===22);
S.set(cappedGrimoireSave,['Grimoire',22],grim.x4);
const cappedGrimoire={...parsed,account:{...parsed.account,grimoire:{...parsed.account.grimoire,upgrades:parsed.account.grimoire.upgrades.map(s=>s.index===22?{...s,level:s.x4}:s)}}};
assert(!S.build(cappedGrimoire,cappedGrimoireSave,0,M).candidates.some(s=>s.path[0]==='Grimoire'&&s.path[1]===22),'Grimoire cap is x4, not a nonexistent maxLevel');
assert(plan.coverage.every(row=>row.effect!=='Contributes to the saved character\u2019s drop-rate calculation.'),'Every native ledger row needs an explicit explanation');
assert(!plan.options.some(s=>/Knowledge|Perfecto/.test(s.name)),'Sushi fixed reward must not invent scaling');
assert.equal(fill.foodAfter.bank,fill.foodBefore.bank-(fill.foodAfter.amount-fill.foodBefore.amount),'Reserve cakes used from bank');
const afterFill=structuredClone(raw.data);c.DropTargetModel.apply(afterFill,fill);const fillState=S.foodState(parse(afterFill),0,afterFill,M);assert.equal(fillState.bank,fill.foodAfter.bank);
const noFoodHtml=c.DropRate.targetResultHtml({...plan,food:{missing:true}});assert(noFoodHtml.includes('golden-food inputs')&&noFoodHtml.includes('Beanstalk'),'Do not hide amplification audit when food is unequipped');
const changed=structuredClone(raw.data),eqIndex=parsed.account.equinox.upgrades.findIndex(s=>s.name==='Faux_Jewels');
S.set(changed,['Dream',eqIndex+2],parsed.account.equinox.upgrades[eqIndex].maxLvl);
S.set(changed,['Spelunk',5,50],parsed.account.spelunking.upgrades[50].x3);
S.set(changed,['Ribbon',28+64],0);
S.set(changed,['Sushi',5,48],-1);
const lowCard=Object.values(parsed.account.cards).find(card=>card.rawName==='luckEvent1');
S.set(changed,['Cards0',lowCard.rawName],1);
const changedParsed=parse(changed),changedCandidates=S.build(changedParsed,changed,0,M).candidates;
assert(!changedCandidates.some(s=>s.name==='Faux Jewels'||s.name==='Golden Hardhat'),'Respect native upgrade caps');
assert(changedCandidates.some(s=>/ribbon/.test(s.name)&&s.from===0&&s.to===5),'First ribbon is a progression path');
const sushiUnlock=changedCandidates.find(s=>s.name==='Discover Unagi Nigiri');assert(sushiUnlock);
const unlocked=structuredClone(changed);S.set(unlocked,sushiUnlock.path,sushiUnlock.to);assert(rate(parse(unlocked))>rate(changedParsed),'Sushi discovery supplies fixed reward');
const cardStep=changedCandidates.find(s=>s.path.at(-1)==='luckEvent1');assert(cardStep);const leveled=structuredClone(changed);S.set(leveled,cardStep.path,cardStep.to);assert.equal(parse(leveled).account.cards[lowCard.displayName].stars,changedParsed.account.cards[lowCard.displayName].stars+1,'Card threshold crosses exactly one natural star');
const locked=structuredClone(changed);S.set(locked,['Sushi',5,47],-1);assert(!S.build(parse(locked),locked,0,M).candidates.some(s=>s.name==='Discover Unagi Nigiri'),'Cannot skip an undiscovered prerequisite sushi');
const escaped=c.DropRate.targetResultHtml({...plan,notes:['<script>bad()</script>']});assert(!escaped.includes('<script>bad'));
// Exercise paths absent in the mature fixture (already maxed bags/artifacts/bribes).
function compareOnly(data,candidate){
 const build=S.build;S.build=(...args)=>({...build(...args),candidates:[candidate]});
 try{const result=c.DropTargetModel.plan({...raw,data},0,1);assert.equal(result.issues.length,0);return result.options[0];}finally{S.build=build;}
}
const smallerBag=structuredClone(raw.data);S.set(smallerBag,['MaxCarryCap_0','Foods'],2000);S.set(smallerBag,fill.path,1);
const bagParsed=parse(smallerBag),bagCandidate=S.build(bagParsed,smallerBag,0,M).candidates.find(s=>s.path[0]==='MaxCarryCap_0');
assert(bagCandidate&&bagCandidate.to===5000,'Choose the next real food pouch from the catalog');
const bagResult=compareOnly(smallerBag,bagCandidate);assert(bagResult.foodAfter.capacity>bagResult.foodBefore.capacity&&bagResult.gain>0);
assert(!S.build(parsed,raw.data,0,M).candidates.some(s=>s.path[0]==='MaxCarryCap_0'),'Do not invent a pouch after the largest catalog bag');
const yarnIndex=parsed.account.sailing.artifacts.findIndex(s=>s.name==='Chilled_Yarn'),yarn=structuredClone(raw.data);
S.set(yarn,['Sailing',3,yarnIndex],2);S.set(yarn,['Rift',0],1);
assert(!S.build(parse(yarn),yarn,0,M).candidates.some(s=>s.path[0]==='Sailing'&&s.path[2]===yarnIndex),'Eldritch tier requires its Rift unlock');
S.set(yarn,['Rift',0],S.get(raw.data,['Rift',0]));
const yarnCandidate=S.build(parse(yarn),yarn,0,M).candidates.find(s=>s.path[0]==='Sailing'&&s.path[2]===yarnIndex);assert(yarnCandidate&&compareOnly(yarn,yarnCandidate).gain>0);
const caustiIndex=parsed.account.sailing.artifacts.findIndex(s=>s.name==='Causticolumn'),causti=structuredClone(raw.data);
S.set(causti,['Sailing',3,caustiIndex],5);S.set(causti,['Meals',0,64],parse(causti).account.cooking.mealMaxLevel);
const caustiParsed=parse(causti),caustiCandidate=S.build(caustiParsed,causti,0,M).candidates.find(s=>s.mealIndex===64);assert(caustiCandidate);
const capOnly=structuredClone(causti);S.set(capOnly,caustiCandidate.path,caustiCandidate.to);assert.equal(rate(parse(capOnly)),rate(caustiParsed),'A meal cap alone must not claim DR');
const mealResult=compareOnly(causti,caustiCandidate),mealReplay=structuredClone(causti);c.DropTargetModel.apply(mealReplay,mealResult);
assert(mealResult.gain>0);assert.equal(rate(parse(mealReplay)),mealResult.after);assert(S.get(mealReplay,['Meals',0,64])<=parse(mealReplay).account.cooking.mealMaxLevel);
const masteryIndex=Object.values(M.dropVialCatalog).findIndex(v=>v.name&&v.stat!=='GFood'&&v.stat!=='7drMulto'),masterySave=structuredClone(raw.data);
S.set(masterySave,['CauldronInfo',4,masteryIndex],12);const masteryParsed=parse(masterySave),masteryCandidate=S.build(masteryParsed,masterySave,0,M).candidates.find(s=>s.path[0]==='CauldronInfo'&&s.path[1]===4&&s.path[2]===masteryIndex);
assert(masteryCandidate&&masteryCandidate.to===13&&compareOnly(masterySave,masteryCandidate).gain>0,'An unrelated level-13 vial boosts DR through Vial Mastery');
const noMastery={...masteryParsed,account:{...masteryParsed.account,rift:{...masteryParsed.account.rift,currentRift:0}}};
assert(!S.build(noMastery,masterySave,0,M).candidates.some(s=>s.path[0]==='CauldronInfo'&&s.path[1]===4&&s.path[2]===masteryIndex),'Do not assume Vial Mastery is unlocked');
fs.writeFileSync('../audit/drop-target-deep-result.json',JSON.stringify(plan,null,2));
console.log('Drop target deep audit: food capacity chain, real target route, independent/cumulative replay, caps, full coverage, source exclusions, nested saves, duplicate foods, special maps, immutability and escaped UI passed.');
