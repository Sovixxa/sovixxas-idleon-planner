'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);
for(const file of ['royal-armory-data.js','royal-armory.js','remaining-data.js','remaining-worlds.js','arcade-data.js','arcade-model.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
const R=c.RoyalArmory,S=c.RemainingWorlds,A=c.ArcadeModel,catalog=c.ROYAL_ARMORY_CATALOG;
const royal=Array.from({length:24},()=>[]);royal[2]=Array(catalog.upgrades.length).fill(0);royal[0]=Array(8).fill(0);royal[23]=Array(10).fill(0);
const raw={data:{RoyalG:royal}},before=JSON.stringify(raw);
let m=R.model(raw);
assert.equal(m.statues[0].bonus,0,'Unpurchased royal statue has no bonus');
assert.equal(m.statues[0].description,'Inactive — no bonus');
assert.equal(JSON.stringify(raw),before);
royal[0][0]=1;royal[2][45]=10;m=R.model(raw);
const multi=1+10*catalog.upgrades[45].bonusPerLevel/100;
assert.equal(m.statues[0].bonus,multi*catalog.royalStatueBase[0]);
assert(m.statues[0].description.includes((1+m.statues[0].bonus/100).toLocaleString(undefined,{maximumFractionDigits:2})+'x'));
royal[0][0]=3;m=R.model(raw);assert.equal(m.statues[0].bonus,multi*(Number(catalog.royalStatueBase[0])+2*Number(catalog.royalStatuePerLevel[0])));
const amountEntry=catalog.upgrades.find(x=>x.description.includes('{'));
royal[2][amountEntry.index]=3;m=R.model(raw);
assert(m.upgrades[amountEntry.index].description.includes(String(3*amountEntry.bonusPerLevel)));
assert(m.upgrades[0].description.includes('+25% Collection Rate'));
assert(m.upgrades[1].description.includes('3x bonus'));
const contextual=m.upgrades.find(x=>x.contextMissing);assert(contextual.description.includes('Context-dependent value unavailable.'));assert(!contextual.description.includes('$'));
// Shelf thresholds depend on the count of qualifying entries, not the ID on that shelf.
for(const total of [0,1,4,25,50,100,500,1000]){
 royal[2].fill(0);royal[2][0]=total;m=R.model(raw);
 const unlocked=Math.min(catalog.upgrades.filter(x=>Number(x.unlockTotalLevels)<=total).length,catalog.slotToId.length);
 for(const upgrade of m.upgrades)assert.equal(upgrade.unlocked,upgrade.slot>=0&&upgrade.slot<unlocked);
}
for(const partial of [{},{RoyalG:[]},{RoyalG:[null,null,[0]]},{data:JSON.stringify({RoyalG:[null,null,[0]]})}]){
 const model=R.model(partial);assert.equal(model.total,null);assert.equal(model.statues[0].bonus,null);assert.equal(model.orblets[0].level,null);
 assert(R.bonusRows(partial).some(x=>x.status==='unknown'));assert(!R.bonusRows(partial).some(x=>x.status==='active'));
}
const host={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
royal[2].fill(0);R.render(host,raw);assert(host.innerHTML.includes('Locked · needs'));assert(host.innerHTML.includes('total levels (0 saved)'));assert(!host.innerHTML.includes('needs undefined'));
R.render(host,{RoyalG:[[],[],[0]]});assert(host.innerHTML.includes('Total Armory levels unknown'));
const data={StatueLevels_0:[[2,15],[0,0]],StatueLevels_1:[[8,5]],StuG:[2,0]};
let statues=S.statues(data,{charNames:['First','Second']});assert.equal(statues.rows[0].bonus,6);assert.equal(statues.rows[1].bonus,0);assert.equal(statues.rows[2].bonus,null);assert.equal(statues.rows[0].tier,'Onyx');
assert.equal(statues.boostStatus['Onyx statues'].state,'owned');assert.equal(statues.boostStatus['Zenith statue tier'].state,'unknown');
statues=S.statues(data,{charNames:['First','Second']},c.REMAINING_CATALOG,1);assert.equal(statues.rows[0].bonus,24);assert.equal(statues.characterName,'Second');
assert.equal(S.statues({}).rows[0].level,null);assert.equal(S.statues({StatueLevels_0:'bad json'}).available,false);
S.render(host,'statues',data,{charNames:['First','Second']});assert(host.innerHTML.includes('Base contribution: +6'));assert(host.innerHTML.includes('not final character bonuses'));assert(host.innerHTML.includes('Saved level unknown'));assert(host.innerHTML.includes('statueCharacter'));
S.render(host,'statues',{});assert(!host.innerHTML.includes('has not been reached'));assert(!host.innerHTML.includes('Lv 0'));
function pet(rows,borrowed=''){const options=[];options[606]=borrowed;return{companion:{l:rows},data:{OptLacc:options}};}
assert.equal(A.companion({}).multiplier,null);
assert.equal(A.companion(pet([])).multiplier,1);
assert.equal(A.companion(pet(['27,0,0,0,0'])).multiplier,2);
assert.equal(A.companion(pet(['27,0,0,0,1'])).multiplier,1);
assert(A.companion(pet(['27,0,0,0,1'])).discrepancy);
assert.equal(A.companion(pet(['27,0,0,0,1'],'27')).multiplier,2);
assert.equal(A.companion(pet([],'27')).multiplier,2);
assert.equal(A.companion({companion:{l:['27,0,0,0,1']}}).multiplier,null);
assert.equal(A.companion(pet(['27,0,0,0,'])).multiplier,null);
assert.equal(A.bonus(c.ARCADE_CATALOG[0],null,{multiplier:2}).base,null);
assert.equal(A.bonus(c.ARCADE_CATALOG[0],10,{multiplier:null}).total,null);
// Compare all formula families with the actual client ArcadeBonus function.
if(fs.existsSync('../audit/N.js')){
 const client=fs.readFileSync('../audit/N.js','utf8'),token='p._customBlock_ArcadeBonus=',start=client.indexOf(token)+token.length,end=client.indexOf(',p._customBlock_ArcadeRewardGive',start);
 const attrs={DNSM:{h:{}},CustomLists:{h:{ArcadeShopInfo:[]}},ArcadeUpg:[]};let petValue=0;
 const ctx={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},h:{string:String},m:{_customBlock_Companions:()=>petValue},x:{_customBlock_ArbitraryCode5Inputs:(type,base,scale,level)=>type==='add'?base*level:type==='decay'?base*level/(level+scale):base+Math.floor(level/scale)}};
 const oracle=vm.runInNewContext('('+client.slice(start,end)+')',ctx);
 for(const formula of ['add','decay','intervalAdd'])for(const level of [0,1,100,101,102])for(const value of [0,1,1.5]){
  const item={formula,base:5,scale:100};petValue=value;attrs.CustomLists.h.ArcadeShopInfo[0]=['',5,100,formula];attrs.ArcadeUpg[0]=level;
  assert.equal(A.bonus(item,level,{multiplier:value===1?2:1}).total,oracle(0));
 }
 // Royal statue formula from the same client, including its level-zero branch.
 const prefix='if("StatueBon"==e)return ',p=client.indexOf(prefix)+prefix.length,expression=client.slice(p,client.indexOf(';if(',p));
 const royalOracle=vm.runInNewContext('(t)=>('+expression+')',{a:{engine:{getGameAttribute:key=>key==='RoyalG'?royal:{h:{Research:{41:catalog.royalStatueBase,42:catalog.royalStatuePerLevel}}}}},c:{asNumber:Number},m:{_customBlock_RoyalG:(_,id)=>royal[2][id]*catalog.upgrades[id].bonusPerLevel}});
 for(const level of [0,1,2,20])for(const reverence of [0,1,100]){royal[0][0]=level;royal[2][45]=reverence;assert.equal(R.model(raw).statues[0].bonus,royalOracle(0));}
}
// Exercise the actual Arcade page renderer, including unknown exports.
const app=fs.readFileSync('app.js','utf8'),body=app.slice(app.indexOf('  function renderArcade(){'),app.indexOf('  let selectedStamp='));
const nodes={worldContent:{innerHTML:'',querySelectorAll:()=>[]},arcadeDetail:{innerHTML:''}};
const page={window:c,state:{rawData:{ArcadeUpg:[10]}},loadedExport:pet(['27,0,0,0,0']),selectedArcade:0,esc:String,$:id=>nodes[id]};vm.createContext(page);vm.runInContext(body,page);page.renderArcade();assert(nodes.worldContent.innerHTML.includes('Spirit Reindeer: 2×'));assert(!nodes.worldContent.innerHTML.includes('companion doubling is not included'));
page.loadedExport={};page.renderArcade();assert(nodes.worldContent.innerHTML.includes('Base only:'));assert(nodes.arcadeDetail.innerHTML.includes('cannot be calculated'));
// The compiled character-stat engine must use the same companion rule as the page.
if(fs.existsSync('../example json.txt')){
 const calc={console:{log(){},warn(){},error(){}},structuredClone};vm.createContext(calc);vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),calc);
 const original=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 for(const [upgrade,token,multiplier] of [[0,'',2],[1,'',1],[1,'27',2]]){
  const save=structuredClone(original),data=typeof save.data==='string'?JSON.parse(save.data):save.data||save;
  save.companion={l:[`27,0,0,0,${upgrade}`]};
  const options=Array(800).fill(0);options[606]=token;data.OptionsListAccount=options;data.OptLacc=options;
  const decoded=calc.PrayerMath.parseData(data,save.charNames,save.companion,save.guildData,save.serverVars||{},save.accountCreateTime,save.tournament);
  const result=decoded.account.arcade.shop[0],expected=A.bonus(c.ARCADE_CATALOG[0],result.level,{multiplier}).total;
  assert.equal(result.bonus,expected,'Compiled Arcade calculation disagrees with client/page');
 }
}
console.log('Misleading values: shelf gates, Royal Statue client parity, descriptions, partial saves, statue base labels/characters, and Arcade companion/client parity pass.');
