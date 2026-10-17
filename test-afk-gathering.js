const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('../audit/N.js','utf8');
function extract(marker){const at=source.indexOf(marker);assert(at>=0);const start=at+marker.length;let depth=0,q='',esc=false;for(let i=start;i<source.length;i++){const c=source[i];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q='';continue;}if(c==='"'||c==="'")q=c;else if(c==='{')depth++;else if(c==='}'&&!--depth)return source.slice(start,i+1);}throw Error('unclosed');}
const ctx={console,structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('prayer-math-engine.js','utf8'),ctx);const M=ctx.PrayerMath;
const attrs={DNSM:{h:{TotStatSkMAP:{h:{}},AlchBubbles:{h:{ToolW:0,ToolM:0,ToolA:0}}}},DummyNumbersStatManager:{h:{}},EquipmentOrder:[[],['tool','tool','tool','tool']],EquipmentMap:[[],[{h:{}},{h:{}},{h:{}},{h:{}}]],ItemDefinitionsGET:{h:{tool:{h:{Speed:3,Weapon_Power:1}}}},Lv0:Array(21).fill(1),FamilyValuesMap:{h:{MinigameHiscores:[0,0]}},CurrentMap:0};
let speedBonus=0,eff=100;
const env={Math,a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},h:{string:String},k:{_customBlock_GetTalentNumber:()=>0},p:{_customBlock_MainframeBonus:()=>0,_customBlock_Dungon:()=>-1,_customBlock_AchieveStatus:()=>0},v:{_customBlock_CardBonusREAL:()=>0,_customBlock_EtcBonuses:()=>0},q:{_customBlock_TotalFoodBonuses:()=>speedBonus,_customBlock_FishingToolkit:()=>0},x:{_customBlock_TotalStats:()=>0},m:{}};
const skillStats=vm.runInNewContext('('+extract('x._customBlock_SkillStats=')+')',env);env.x._customBlock_SkillStats=k=>k==='FishingEfficiency'?eff:skillStats(k);
let checks=0;
for(const [id,prefix]of [[1,'Mining'],[3,'Choppin'],[4,'Fishing'],[6,'Catching']])for(const level of [1,50,500])for(const tool of [0,3,8])for(const bonus of [0,25,1000]){
 attrs.Lv0[id]=level;attrs.ItemDefinitionsGET.h.tool.h.Speed=tool;attrs.DNSM.h.TotStatSkMAP.h={};speedBonus=bonus;eff=level*23;
 const expected=skillStats(prefix+'Speed'),actual=M.gatheringSpeed(id,level,tool,bonus,eff);assert(Math.abs(actual-expected)<1e-10,`${prefix} ${level} ${tool} ${bonus}: ${actual} != ${expected}`);checks++;
}
const pools=JSON.parse(fs.readFileSync('afk-fish-pools.json','utf8'));attrs.CustomMaps={h:{FishPools:{h:pools}}};attrs.AFKtarget='FishSmall';attrs.PersonalValuesMap={h:{FishingToolkit:[0,0],FishingSpotIndex:0}};attrs.CustomLists={h:{FishToolkitInfo:[[['test',0,0,0,0,0,0,0]],[['test',0,0,0,0,0,0,0]]]}};
const toolkit=vm.runInNewContext('('+extract('q._customBlock_FishingToolkit=')+')',env);env.q._customBlock_FishingToolkit=toolkit;
for(const pool of Object.keys(pools))for(const efficiency of [1,50,1000,1e8])for(const depth of [[0,0,0,0],[25,15,30,70]]){
 attrs.AFKtarget=pool;attrs.CustomLists.h.FishToolkitInfo[0][0]=['test',...depth,0,0,0];eff=efficiency;
 const actual=M.fishingPercentages(efficiency,pools[pool][3].map(Number),depth),expected=[1,2,3,4].map(i=>toolkit('Pct'+i));
 actual.forEach((v,i)=>assert(Math.abs(v-expected[i])<1e-9,`${pool} ${efficiency}: ${actual} != ${expected}`));checks++;
}
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),result=require('./afk-save-model').calculate(raw,M),A=require('./afk-tester');
for(const id of [1,3,4,6]){assert(result[0][id].nodes.length>=7);for(const n of result[0][id].nodes)assert(Number.isFinite(n.rate)&&n.rate>=0);const plan={rows:[{id:0,level:10,progress:0,savedLevel:10,savedRequirement:100}]};A.applyAuto(plan,id,{auto:result});assert(Number(plan.rows[0].rate)>0);for(const candy of A.candyTypes)assert(!A.calculate(plan.rows[0],11,{skill:id,mode:'candy',candy:candy.id}).error);}
console.log(`Gathering: ${checks} speed and fishing cases match actual client; real-save rates populate all four gathering skills and every candy type.`);
