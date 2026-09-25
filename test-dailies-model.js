'use strict';
const assert=require('node:assert/strict'),D=require('./dailies-model');
const raw={charNames:['Account'],data:{OptLacc:Array(616).fill(null)}};
const row=id=>D.model(raw).find(row=>row.id===id);
for(const value of [null,undefined,'',false,{},'not a number']){raw.data.OptLacc[96]=value;assert.equal(row('slush').count,null);}
for(const [id,slot,cap,days] of [['slush',96,10,[4,7,11,16,22,29,38,47,58,69]],['mush',98,8,[4,7,12,19,28,39,52,67]],['magmus',225,6,[4,7,12,19,28,39]],['spiritlord',226,6,[4,7,12,19,28,39]]]){
 days.forEach((day,i)=>{raw.data.OptLacc[slot]=day-1;assert.equal(row(id).count,i);raw.data.OptLacc[slot]=day;assert.equal(row(id).count,i+1);assert.equal(row(id).ready,i+1>=2);});
 raw.data.OptLacc[slot]=999;assert.equal(row(id).count,cap);
}
raw.data.CauldronInfo=[[],[],[],[],Array(Math.max(...D.catalog.vialIds)+1).fill(1)];
assert.equal(row('vials').autoHidden,'All vials unlocked');
raw.data.CauldronInfo[4][0]=0;assert(!row('vials').autoHidden);
raw.data.CauldronInfo[4][0]=null;assert(!row('vials').autoHidden);
raw.data.CauldronInfo[4]=[13];assert(!row('vials').autoHidden);
raw.data.CauldronInfo=JSON.stringify([[],[],[],[],Array(86).fill(13)]);assert(row('vials').autoHidden);
assert(D.hiddenReason(row('vials'),{}));assert(!D.hiddenReason(row('vials'),{autoHide:false}));
assert.equal(D.hiddenReason(row('vials'),{autoHide:false,hidden:{vials:true}}),'Hidden by you');
const wed=Date.UTC(2026,8,23,23,59),thu=Date.UTC(2026,8,24,0,0);
assert(D.isDone(wed,wed,0,'weekly',4,0));assert(!D.isDone(wed,thu,0,'weekly',4,0));assert(D.isDone(thu,thu+6*86400000,0,'weekly',4,0));
const state={hour:0,weekday:4,weeklyHour:0,checks:{slush:wed},cycles:{slush:7}};
raw.data.OptLacc[96]=7;assert(D.done(row('slush'),state,thu));raw.data.OptLacc[96]=0;assert(!D.done(row('slush'),state,thu));
raw.data.OptLacc[113]=21;raw.data.OptLacc[227]=0;assert.equal(row('killroyWeekly').status,'2 rooms used');
raw.data.OptLacc[227]=1;assert.equal(row('killroyWeekly').count,1);raw.data.OptLacc[113]=321;assert.equal(row('killroyWeekly').count,0);
assert.equal(new Set(D.model(raw).map(row=>row.id)).size,D.model(raw).length);
console.log('Dailies model: 4 miniboss boundary tables/caps, 2+ readiness, partial and complete vials, weekly resets, hidden overrides, Killroy rooms and refreshed miniboss checks passed.');

const fixture={charNames:['One'],extraData:{currentWorld:3},data:{OptLacc:Array(616).fill(null),NPCdialogue_0:{Picnic_Stowaway:20},QuestComplete_0:Object.fromEntries(Array.from({length:9},(_,i)=>['Picnic_Stowaway'+(i+4),-1])),PldTraps_0:[[1,0,3599,'Critter1',1,0,3600]],TaskZZ1:Array.from({length:3},()=>Array(9).fill(1))}};
const get=id=>D.model(fixture).find(r=>r.id===id),opts=fixture.data.OptLacc;
assert.equal(get('picnic').ready,true);fixture.data.QuestComplete_0.Picnic_Stowaway4=1;assert.equal(get('picnic').ready,false);
delete fixture.data.NPCdialogue_0.Picnic_Stowaway;assert.equal(get('picnic').ready,undefined,'Missing unlock data is not a completed picnic');
assert.equal(get('trapping').ready,false);fixture.data.PldTraps_0[0][2]=3600;assert.equal(get('trapping').ready,true);
fixture.charNames.push('Missing');assert.equal(get('trapping').ready,undefined,'Missing character traps must not be treated as empty');fixture.charNames.pop();
fixture.data.PldTraps_0=[null];assert.equal(get('trapping').ready,undefined,'Malformed traps must not be completed');
assert.equal(get('merits').ready,false);fixture.data.TaskZZ1[2][8]=0;assert.equal(get('merits').ready,true);fixture.data.TaskZZ1[2][8]=null;assert.equal(get('merits').ready,undefined);
for(const slot of [15,16,31,35,56,80])opts[slot]=0;assert.equal(get('keys').ready,false);
opts[16]=1;fixture.data.NPCdialogue_0.Dog_Bone=5;assert.notEqual(get('keys').ready,true);fixture.data.NPCdialogue_0.Dog_Bone=6;assert.equal(get('keys').ready,true);
fixture.data.Guild=[[],[0,0,299],[1,0,1],[2,0,1],[7,0,300],[11,0,4],[3,0,20],[4,0,35],[5,0,250],[21,0,25]];opts[37]='Guild';
assert.equal(get('guilds').ready,true);assert.equal(get('guildWeekly').ready,false);fixture.data.Guild[1][2]=300;assert.equal(get('guilds').ready,false);
fixture.data.Guild[1][0]=999;assert.equal(get('guilds').ready,undefined,'Unknown catalog index must not count complete');
fixture.extraData.currentWorld=7;fixture.data.SailChests=[];assert.equal(get('sailing').ready,false);fixture.data.SailChests=[[0,0,0,1]];assert.equal(get('sailing').ready,true);
fixture.extraData.currentWorld=2;assert.equal(get('sailing').ready,false,'World locks win over populated counters');fixture.extraData.currentWorld=7;
opts[55]=0;assert.equal(get('library').ready,false);opts[55]=20;assert.equal(get('library').ready,true);
fixture.data.Divinity=Array(39).fill(0);assert.equal(get('divinityWeekly').ready,false);fixture.data.Divinity[38]=2;assert.equal(get('divinityWeekly').ready,true);
fixture.data.Summon=[[0,0,25]];assert.match(get('familiars').autoHidden,/maxed/);fixture.data.Summon[0][2]=24;assert(!get('familiars').autoHidden);
opts[169]='abc';opts[160]=opts[170]=opts[171]=0;assert.equal(get('islandsDaily').ready,false);opts[171]=1;assert.equal(get('islandsDaily').ready,true);
opts[402]=1;assert.match(get('sneakingRolls').autoHidden,/Automatic loot/);
assert(D.model({}).filter(r=>r.ready==null).every(r=>r.detail),'Every unverified reminder explains its limitation');
console.log('Save rules: guild/board completion, picnic, trap boundaries, NPC unlocks, world gates, storage, unlinks, maxed familiars, automatic drops and malformed/partial exports passed.');

const fs=require('node:fs'),path=require('node:path');
const researchSave={charNames:['One'],data:{Lv0_0:Array(21).fill(1),Research:[[],[],Array(80).fill(0),[],[],[],[],[0,0,12]]}};
researchSave.data.Lv0_0[20]=85;researchSave.data.Research[2].fill(1,0,38);
let researchRow=D.model(researchSave).find(x=>x.id==='research');assert.match(researchRow.autoHidden,/All 38 observations/);assert.equal(researchRow.ready,false);
researchSave.data.Lv0_0[20]=90;researchRow=D.model(researchSave).find(x=>x.id==='research');assert(!researchRow.autoHidden);assert.equal(researchRow.ready,true);
researchSave.data.Research[7][2]=0;assert.match(D.model(researchSave).find(x=>x.id==='research').autoHidden,/No attempts/);
researchSave.data.Research[7][2]=12;researchSave.charNames.push('Missing');assert(!D.model(researchSave).find(x=>x.id==='research').autoHidden,'Partial roster must not claim all unlocked observations found');
const low={extraData:{currentWorld:2},data:{Research:[[],[],[],[],[],[],[],[0,0,12]]}};assert.match(D.model(low).find(x=>x.id==='research').autoHidden,/World 7/);
const examplePath=path.join(__dirname,'../example json.txt');
if(fs.existsSync(examplePath)){
 const example=JSON.parse(fs.readFileSync(examplePath,'utf8').replace(/^\uFEFF/,'')),rows=D.model(example),find=id=>rows.find(x=>x.id===id);
 assert.match(find('research').autoHidden,/All 38/);for(const id of ['vials','lore','jewelCogs','killroyWeekly','weeklyBattle','weeklyBattleDaily','tournament','petGems','raid','slush','mush','magmus','spiritlord'])assert(find(id).autoHidden,id);
 for(const id of ['keys','trapping','sailing','familiars','tinyCog','sneakingRolls'])assert(find(id).autoHidden,id);
 assert.match(find('guilds').status,/3 unfinished/);assert.match(find('guildWeekly').status,/3 unfinished/);assert.match(find('picnic').status,/10 characters/);assert.match(find('library').status,/624 books/);
 console.log('Workspace save regression: research eligibility and 13 other redundant tasks correctly filtered.');
}
