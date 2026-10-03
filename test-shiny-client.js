'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('../audit/N.js','utf8');
const shared=JSON.parse(fs.readFileSync('vendor/idleon-toolbox/data/website-data/shared-data.json','utf8'));
function extract(name,next){const start=source.indexOf(name+'=function');assert(start>=0);const end=source.indexOf(next,start);assert(end>start);return source.slice(start+name.length+1,end);}
const gen=[];gen[25]=0;gen[33]=6;gen[78]=-1;
const attrs={DNSM:{h:{AlchBubbles:{h:{CritShiny:1}},AlchVials:{h:{Shiny1:0,Shiny2:0}}}},CurrentMap:16,Lv0:[0,0,0,0,0,0,0,100],Tasks:[[],[[],[],[0,0,0,0,0,0]]],OptionsListAccount:Array(500).fill(0),PrayersActive:[3],PrayersUnlocked:[0,0,0,50],CustomLists:{h:{TrappingInfo:[[16,1,'Critter1',35,2,0,5]],RANDOlist:{59:[5,5,15,5,1,15,5,1,1]},PrayerInfo:{3:['Shiny_Snitch','','',20,15]},TrapBoxInfo:vm.runInNewContext('('+extract('db.TrapBoxInfo',',db.RefineryInfo')+')()')}},PixelHelperActor:Array(8).fill({behaviors:{getBehavior:()=>({_GenINFO:gen})}})};
let talent=2,food=0,cards=0,arcade=0,merit=0,passive=0;
const p={},context={p,a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},n:{__cast:v=>v},la:null,k:{_customBlock_GetTalentNumber:()=>talent,_customBlock_StampBonusOfTypeX:()=>0},q:{_customBlock_TotalFoodBonuses:()=>food},w:{_customBlock_CardBonusREAL:()=>cards},m:{_customBlock_Summoning2:()=>merit,_customBlock_GamingStatType:(_,id)=>id===9?passive:0}};
vm.createContext(context);
p._customBlock_TrappingStuffs=vm.runInContext('('+extract('p._customBlock_TrappingStuffs',',p._customBlock_Refinery')+')',context);
p._customBlock_prayersReal=vm.runInContext('('+extract('p._customBlock_prayersReal','},p.')+'})',context);
p._customBlock_ArcadeBonus=()=>arcade;
const trap=(name)=>p._customBlock_TrappingStuffs(name,0);
const royal=trap('TotalRareChance');assert.equal(royal,5*4*2**11);
attrs.Lv0[7]=120;assert.equal(trap('TotalRareChance')/royal,4,'Two level milestones multiply the snapshot by talent squared');
gen[33]=1;assert.equal(trap('TrapRareBonus'),2);gen[33]=6;assert.equal(trap('TrapRareBonus'),4);
attrs.PrayersActive=[3];assert.equal(p._customBlock_prayersReal(3,0),118);assert.equal(p._customBlock_prayersReal(3,1),89);
const saved=trap('TotalRareChance');attrs.PrayersActive=[];assert.equal(trap('TotalRareChance'),saved,'Prayer is not baked into the snapshot');
attrs.DNSM.h.PrayNonEq=1;passive=1;assert.equal(p._customBlock_prayersReal(3,0),24);assert.equal(p._customBlock_prayersReal(3,1),0);
food=25;cards=60;arcade=10;attrs.OptionsListAccount[99]=150;assert.equal(trap('RareBonusOnOpen'),125);
merit=400;assert.equal(trap('RareBonusOnOpenMULTI'),5);
const bundle=Math.round((1+118)*trap('RareBonusOnOpenMULTI'));assert.equal(bundle,595);
assert.equal(shared.ninjaExtraInfo[41][13],'400');
console.log('Local client: placement snapshots, exponential talent scaling, Royal/Silkskin multipliers, prayer/passive values, collection bonuses and Meritocracy bundle pass.');

attrs.QuestComplete={h:Object.fromEntries(Array.from({length:11},(_,i)=>['Lord_of_the_Hunt'+(i+1),-1]))};
attrs.TowerInfo=Array(7).fill(0);attrs.DNSM.h.AlchVials.h.CritterBASED=0;
attrs.DNSM.h.StarSigns={h:{pctCritter:0}};attrs.DNSM.h.BoxRewards={h:{'16c':0}};
for(const name of ['Bubbastuff','FarmingStuffs','Windwalker'])context.m['_customBlock_'+name]=()=>0;
p._customBlock_Breeding=()=>0;attrs.OptionsListAccount[99]=0;
assert.equal(trap('BaseQTY'),10);
attrs.QuestComplete.h.Lord_of_the_Hunt1=1;assert.equal(trap('BaseQTY'),10);
attrs.QuestComplete.h.Lord_of_the_Hunt2=1;assert.equal(trap('BaseQTY'),11);
attrs.QuestComplete.h.Lord_of_the_Hunt3=1;assert.equal(trap('BaseQTY'),12);
attrs.PlayerDATABASE=[{QuestComplete:{h:{Lord_of_the_Hunt2:1}}}];assert.equal(trap('BaseQTY'),12);
attrs.QuestComplete.h.Lord_of_the_Hunt11=1;assert.equal(trap('BaseQTY'),13);
attrs.TowerInfo[6]=90;assert.equal(trap('BaseQTY'),103);
attrs.OptionsListAccount[99]=125;assert.equal(trap('BaseQTY'),104);
attrs.OptionsListAccount[99]=200;assert.equal(trap('BaseQTY'),105);
assert.equal(trap('TotalRareChance'),saved);
console.log('Local client: additive quest base quantity, character-local input, initial quest exclusion and Pen Pals milestones pass.');

const wideStart=source.indexOf('Ia.AccountWideQuests=function');
const wideEnd=source.indexOf('},Ia.',wideStart);
const wide=source.slice(wideStart,wideEnd);
const dialogueStart=source.indexOf('xb.addDialogueFor("Lord_of_the_Hunt",e)');
const dialogue=source.slice(dialogueStart,source.indexOf('xb.addDialogueFor',dialogueStart+10)).split('.addLine_').slice(1);
for(let quest=1;quest<=11;quest++){
 const index=dialogue.findIndex(line=>new RegExp('Lord_of_the_Hunt'+quest+'"').test(line));
 assert(index>=0);
 assert.equal(wide.includes('e.h.Lord_of_the_Hunt'+index+'='),quest<=10,'Shared quest registration for Hunt '+quest);
}
console.log('Local client: Hunt quests 1-10 shared; trophy quest 11 not shared.');

const mathContext={console:{log(){},warn(){},error(){}}};vm.createContext(mathContext);
vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),mathContext);
const bitNames={9:'No_more_Praying',39:'Prayers_Begone',53:'Prayers_Aint_Meta'};
for(let level=1;level<=50;level++)for(const bits of [[],[9],[39],[53],[9,39],[9,39,53]])for(const equipped of [[-1,-1],[3],[3,3],[0]]){
 const prayer={name:'Shiny_Snitch',prayerIndex:3,x1:20,x2:15,level};
 const account={prayers:[prayer],gaming:{superbitsUpgrades:bits.map(i=>({name:bitNames[i],unlocked:true}))}};
 attrs.PrayersActive=equipped;attrs.PrayersUnlocked[3]=level;delete attrs.DNSM.h.PrayNonEq;
 context.m._customBlock_GamingStatType=(_,i)=>bits.includes(i)?1:0;
 const active=equipped.filter(i=>i!==-1).map(i=>i===3?prayer:{name:'Other'});
 const actual=mathContext.PrayerMath.getPrayerBonusAndCurse(active,'Shiny_Snitch',account);
 assert.equal(actual.bonus,p._customBlock_prayersReal(3,0),'Bonus parity Lv '+level);
 assert.equal(actual.curse,p._customBlock_prayersReal(3,1),'Curse parity Lv '+level);
 const curse=p._customBlock_prayersReal(3,1),bonus=p._customBlock_prayersReal(3,0);
 attrs.PlayerDATABASE=Array.from({length:20},()=>({PrayersActive:[3],Prayers:[3]}));
 assert.equal(p._customBlock_prayersReal(3,1),curse);assert.equal(p._customBlock_prayersReal(3,0),bonus);
 assert.equal(trap('TotalRareChance'),saved,'Prayer cannot alter placement snapshots');
}
assert(source.includes('Math.round(4+c.asNumber(a.engine.getGameAttribute("GemItemsPurchased")[63]))'));
console.log('Shiny Snitch: 1,200 native parity cases, duplicate prayers, cross-character independence and placement isolation pass.');
