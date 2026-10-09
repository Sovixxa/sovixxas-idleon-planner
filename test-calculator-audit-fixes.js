const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),esbuild=require('esbuild');
const source=fs.readFileSync('../audit/N.js','utf8');
function extract(s,mark){const start=s.indexOf(mark)+mark.length;assert(start>=mark.length);let d=0,q='',e=false;for(let i=s.indexOf('{',start);i<s.length;i++){const x=s[i];if(q){if(e)e=false;else if(x==='\\')e=true;else if(x===q)q='';continue;}if(x==='"'||x==="'"){q=x;continue;}if(x==='{')d++;else if(x==='}'&&!--d)return s.slice(start,i+1);}throw Error(mark);}
const zero=new Proxy({},{get:()=>()=>0}),nums=()=>new Proxy({},{get:(o,k)=>o[k]||0});
const attrs={DNSM:{h:{FamBonusQTYs:{h:nums()},BoxRewards:{h:nums()},StarSigns:{h:nums()},AlchBubbles:{h:nums()},AlchVials:{h:nums()}}},Tasks:[[],[],[[],[0,0,0]]],GetPlayersUsernames:['A'],UserInfo:['A'],BundlesReceived:{h:{}},CurrentMap:0,Holes:[[0]]};
let gear=0;
const native=vm.runInNewContext('('+extract(source,'_customBlock_AFKgainrates=')+')',{a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:v=>Number(v)||0},m:new Proxy({},{get:(_,k)=>k==='_customBlock_Holes2'?n=>n==='Cglunko_AFKgains'?.7:0:()=>0}),p:zero,q:zero,w:new Proxy({},{get:(_,k)=>k==='_customBlock_EtcBonuses'?i=>+i===59?gear:0:()=>0}),k:zero,x:zero});
const body=extract(fs.readFileSync('vendor/idleon-toolbox/parsers/character.ts','utf8'),'export const getAfkGain = ');
const env={CLASSES:{},classFamilyBonuses:[],cardBonuses:[],bonuses:{etcBonuses:[]},mainStatMap:{}};
for(const m of body.matchAll(/((?:get|is|check)\w+)\(/g))env[m[1]]=()=>0;
env.getCharacterStatAccount=a=>a;env.getStatsFromGear=(_,i,a)=>{assert(a,'AFK gear requires account context');return {value:i===59?gear:0,breakdown:[]};};env.getPrayerBonusAndCurse=()=>({bonus:0,curse:0});env.getArcadeBonus=()=>({bonus:0});env.getCglunkoBonus=(_,i)=>i===8?60:0;
vm.createContext(env);vm.runInContext(esbuild.transformSync('var calc = '+body,{loader:'ts'}).code,env);
const ch={playerId:0,flatTalents:[],flatStarTalents:[],cards:{}},account={guild:{},bribes:[],shrines:[],charactersLevels:[],tasks:[[],[],[[],[],[]]],hole:{holesObject:{charactersCavernLocation:[0]}}};
const near=(a,b)=>assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
for(gear of [0,100])for(const [type,n] of [['FIGHTING','Fighting'],['MINING','Mining'],['CHOPPIN','Choppin'],['FISHING','Fishing'],['CATCHING','Catching'],['COOKING','Cooking'],['LABORATORY','Laboratory'],['DIVINITY','Divinity'],['SPELUNKING','Spelunking']]){ch.afkType=type;near(env.calc(ch,[ch],account).afkGains,native(n));}
ch.afkType='FIGHTING';for(const map of [306,216]){ch.mapIndex=attrs.CurrentMap=map;account.hole.holesObject.charactersCavernLocation[0]=attrs.Holes[0][0]=17;near(env.calc(ch,[ch],account).afkGains,native('Fighting'));}
const c={console:{log(){},warn(){},error(){},debug(){}},structuredClone};c.self=c;vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));c.postMessage=()=>{};c.importScripts('review-target-worker.js');c.ConnectedTrace.disabled=true;
const M=c.PrayerMath,raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),clone=x=>JSON.parse(JSON.stringify(x));
const p=c.ReviewTargetModel.session(raw).parse(raw.data),stale=clone(raw);
for(const ch of p.characters){const key='PVStatList_'+ch.playerId;let v=stale.data[key],str=typeof v==='string';if(str)v=JSON.parse(v);for(let i=0;i<4;i++)v[i]=1;stale.data[key]=str?JSON.stringify(v):v;}
const p2=c.ReviewTargetModel.session(stale).parse(stale.data);
for(let i=0;i<p.characters.length;i++){assert.deepEqual(p.characters[i].stats,p2.characters[i].stats);near(M.getMaxDamage(p.characters[i],p.characters,p.account).maxDamage,M.getMaxDamage(p2.characters[i],p2.characters,p2.account).maxDamage);}
const tables=require('./inspect-bonus-freshness').catalogs(source).values;
const ja={Research:Array.from({length:8},()=>[]),CustomLists:{h:{Research:tables.get('Research')}}};
const jelly=vm.runInNewContext('('+extract(source,'_customBlock_JellyOperation=')+')',{a:{engine:{getGameAttribute:n=>ja[n]}},c:{asNumber:Number}});
for(let i=0;i<64;i++)for(const progress of [i,i+1]){ja.Research[7][9]=progress;assert.equal(M.getJellyReward({research:{jellyObstruction:progress}},i),Number(jelly('RoG_BonusQTY',i,0)));}
console.log('PASS native AFK modes/maps, gear context, 128 native Jelly boundaries, and stale-stat damage invariance across all characters');

const coralBody=extract(fs.readFileSync('vendor/idleon-toolbox/parsers/world-7/coralReef.ts','utf8'),'export const getReefDayGains = '),coralEnv={};
for(const m of coralBody.matchAll(/((?:get|is|notate)\w+)\(/g))coralEnv[m[1]]=()=>0;
coralEnv.getArcadeBonus=()=>({bonus:0});vm.createContext(coralEnv);vm.runInContext(esbuild.transformSync('var coral = '+coralBody,{loader:'ts'}).code,coralEnv);
for(const [level,expected] of [[0,10],[1,10.2],[7,11.4],[10,11.5]]){coralEnv.getCardLevel=()=>level;near(coralEnv.coral({}).value,expected);}
console.log('PASS native coral base, card levels and cap');
