'use strict';
// Execute the locally installed game's handlers as an independent formula oracle.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.IDLEON_CLIENT_PATH||'../audit/N.js','utf8');
function extract(marker){
 const at=source.indexOf(marker);assert(at>=0,marker);
 const start=at+marker.length;let depth=0,quote='',escape=false;
 for(let i=start;i<source.length;i++){
  const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}
  if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);
 }throw Error('Unclosed handler '+marker);
}
const M=require('./breeding-exp'),context={console,Date,structuredClone};vm.createContext(context);
for(const f of ['dashboard-math.js','breeding-exp-bonuses-model.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
const raw=JSON.parse(fs.readFileSync('../example json.txt')),model=context.BreedingExpBonusesModel.calculate(raw),v=model.values;
const breeding=[Array(12).fill(0),[20,15,10,5],Array(13).fill(0)];breeding[2][0]=v[3]/2;
const attrs={Breeding:breeding,DNSM:{h:{AlchVials:{h:{BreedXP:v[6]}}}},DummyNumbersStatManager:{h:{}},GemItemsPurchased:Array(120).fill(0),Tasks:[[],[],[[],[],[],[0,0,0]]]};
const env={Math,c:{asNumber:Number},a:{engine:{getGameAttribute:key=>attrs[key]}},x:{},p:{},q:{},k:{},m:{}};
env.p._customBlock_getbonus2=()=>v[0];env.p._customBlock_MainframeBonus=()=>v[1];env.q._customBlock_MealBonus=()=>v[2];
env.x._customBlock_RunCodeOfTypeXforThingY=()=>v[4]/5;env.k._customBlock_StampBonusOfTypeX=()=>v[5];env.x._customBlock_ArbitraryCode=()=>v[7];
env.m._customBlock_RiftStuff=()=>v[8]/25;env.m._customBlock_Summoning=(name)=>name==='VotingBonusz'?v[9]:v[10];
env.m._customBlock_Summoning2=()=>(v[11]-1)*100;env.m._customBlock_Thingies=()=>(v[12]-1)*100;env.m._customBlock_Companions=()=>v[13]-1;
env.x._customBlock_SkillStats=vm.runInNewContext('('+extract('x._customBlock_SkillStats=')+')',env);
env.x._customBlock_skillstats2=vm.runInNewContext('('+extract('x._customBlock_skillstats2=')+')',env);
const near=(a,b)=>assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
near(env.x._customBlock_SkillStats('BreedingEXPmulti'),model.total);
const breedHandler=vm.runInNewContext('('+extract('p._customBlock_Breeding=')+')',env);
env.p._customBlock_AchieveStatus=()=>1;
env.p._customBlock_Breeding=(name,...args)=>name==='TotPetsFound'?50:breedHandler(name,...args);
const action=vm.runInNewContext('('+extract('p._customBlock_ActionBlock=')+')',env);let awarded;
env.w={_customBlock_giveEXP:(skill,exp)=>{assert.equal(skill,11.5);awarded=exp;}};
for(let tier=1;tier<=11;tier++){breeding[0][0]=tier;action('GiveBreedEXP','0',0,0);near(awarded,M.exp(tier,50,model.total));}
for(let level=0;level<=10;level++){
 breeding[2][11]=level;near(breedHandler('PetUpgBONUS','0',11,0),Math.ceil(12*level**.698));
 breeding[2][5]=level;near(breedHandler('PetUpgBONUS','0',5,0),(1+.25*level)*1.1);
}
for(let capacity=0;capacity<=5;capacity++){
 breeding[2][2]=capacity;attrs.GemItemsPurchased[119]=2;attrs.Tasks[2][3][2]=1;
 assert.equal(M.fromSave(attrs).capacity,breedHandler('TotalEggCapacity','0',0,0));
}
// Normalize the actual exported task representation before asking the game oracle.
const saved=typeof raw.data==='string'?JSON.parse(raw.data):(raw.data||raw);
const parseSaved=value=>typeof value==='string'?JSON.parse(value):value;
attrs.Breeding=parseSaved(saved.Breeding);
attrs.GemItemsPurchased=parseSaved(saved.GemItemsPurchased);
attrs.Tasks=Array.from({length:6},(_,i)=>parseSaved(saved['TaskZZ'+i]));
assert.equal(M.fromSave(raw).capacity,15);
assert.equal(M.fromSave(raw).capacity,breedHandler('TotalEggCapacity','0',0,0),'Real exported save matches native egg capacity');
// The client timer has no occupancy term; item use adds one timer interval per item consumed.
const timer=source.slice(source.indexOf('"TotalTimeForEgg"==e'),source.indexOf('if("SpecialPassives"==e'));
assert(!timer.includes('Breeding"'));assert(timer.includes('7200/'));
assert(source.includes('"TotalTimeForEgg","0",0,0)*Math.min(c.asNumber(a.engine.getGameAttribute("ItemQuantity")'));
const options={capacity:10,rarity:10,pets:50,multi:1,shatter:0};
assert(M.simulate({...options,mode:'natural',legend:900},4,20000).perEgg>M.simulate({...options,mode:'natural',legend:0},4,20000).perEgg);
assert.deepEqual(M.simulate({...options,mode:'catchup',legend:900},4,20000),M.simulate({...options,mode:'catchup',legend:0},4,20000));
console.log('Breeding client audit: EXP pool, all 11 hatch tiers, capacity, rarity, Shattershell, timer and item consumption passed.');
