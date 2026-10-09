'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),esbuild=require('esbuild');
(async()=>{
 let job;const extra={
  'world-7/research.ts':['getResearchEXPmulti','getObservationInsightExpRate','getKaleiMultiBase'],
  'world-7/spelunking.ts':['getPower','getSpelunking','getSpelunkingCostDiscount'],
  'world-5/gaming.ts':['calcRatKing'],
  'family.ts':['getCharacterFamilyBonus','getFamilyBonusBonus'],
  'world-7/coralReef.ts':['getReefDayGains'],
  'world-5/divinity.ts':['isMajorDivinityActive','getDivinity'],
  'world-5/sailing.ts':['getBoatArtifactChance']
 };
 new Function('require','__dirname',fs.readFileSync('build-prayer-math.js','utf8'))(n=>n==='esbuild'?{build:o=>{
  o.write=false;o.plugins.unshift({name:'audit-instrumentation',setup(b){b.onLoad({filter:/\.ts$/,namespace:'calculation'},a=>{
   let s=fs.readFileSync(a.path,'utf8'),path=a.path.replaceAll('\\','/');
   if(path.endsWith('/parsers/index.ts'))s=s.replace('pass < 3','pass < ((globalThis as any).__auditPasses || 3)');
   for(const [f,names] of Object.entries(extra))if(path.endsWith('/parsers/'+f))for(const name of names)s=s.replace(new RegExp('(?<!export )function '+name+'\\('),'export function '+name+'(').replace(new RegExp('(?<!export )const '+name+' ='),'export const '+name+' =');
   if(path.endsWith('/prayer-math-entry.ts'))for(const [f,names] of Object.entries(extra))s+='\nexport {'+names.join(',')+"} from './vendor/idleon-toolbox/parsers/"+f+"';";
   return {contents:s,loader:'ts'};
  });}});return job=esbuild.build(o);
 }}:require(n),__dirname);
 const out=await job,instant=1791500000000;
 class FixedDate extends Date{constructor(...a){super(...(a.length?a:[instant]));}static now(){return instant;}}
 const c={console,Date:FixedDate,structuredClone};vm.createContext(c);vm.runInContext(out.outputFiles[0].text,c);
 const M=c.PrayerMath,raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),clone=x=>JSON.parse(JSON.stringify(x));
 const parse=(r,passes)=>{c.__auditPasses=passes;return M.parseData(structuredClone(r.data),r.charNames,r.companion,r.guildData,r.serverVars,r.accountCreateTime,r.tournament);};
 const near=(a,b)=>assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
 for(const progress of [0,64]){const r=clone(raw),v=JSON.parse(r.data.Research);v[7][9]=progress;r.data.Research=JSON.stringify(v);const a=parse(r,3),b=parse(r,6);
  assert.deepEqual(clone(a.account.hole.villagers),clone(b.account.hole.villagers),'Villager dependency closure');
  assert.deepEqual(clone(a.account.equinox),clone(b.account.equinox),'Equinox dependency closure');
 }
 const p=parse(raw,3),a=clone(p.account),ch=clone(p.characters[0]);
 for(const [id,expected,fn] of [
  ...[0,23,46,54].map((id,i)=>[id,[1.5,1.4,1.3,1.6][i],()=>M.getResearchEXPmulti(a,a.research).value]),
  [21,1.3,()=>M.getPower(a).value],[38,1.35,()=>M.getPower(a).value],
  [19,1.2,()=>M.getBoatArtifactChance(a.sailing.artifacts,{},a,p.characters).breakdown.totalValue],
  [30,1.2,()=>M.getClassExpMulti(ch,a,p.characters).value],[62,1.25,()=>M.getClassExpMulti(ch,a,p.characters).value]
 ]){
  a.research.jellyObstruction=id;const before=fn();a.research.jellyObstruction=id+1;const after=fn();
  if(id===19)assert(Math.abs(after/before-expected)<1e-5);else near(after/before,expected);
 }
 a.research.jellyObstruction=37;const damageBefore=M.getMaxDamage(ch,p.characters,a);a.research.jellyObstruction=38;const damageAfter=M.getMaxDamage(ch,p.characters,a);
 assert(damageAfter.maxDamage>damageBefore.maxDamage);assert(JSON.stringify(damageAfter.damageBreakdown).includes('Jelly damage'));
 a.divinity.linkedDeities[ch.playerId]=-1;a.accountOptions[425]=0;a.hole.holesObject.idleonMajiks[0]=0;a.research.gridSquares[173].bonuses[0]=0;a.gemShopPurchases[9]=0;a.companions.list[0].acquired=true;
 ch.skillsInfo.divinity.level=1;assert.equal(M.isMajorDivinityActive(ch,a,7),false);ch.skillsInfo.divinity.level=2;assert.equal(M.isMajorDivinityActive(ch,a,7),true);
 a.companions.list[0].acquired=false;a.accountOptions[425]=1;assert.equal(M.isMajorDivinityActive(ch,a,0),true);
 a.research.jellyObstruction=22;const discount=M.getSpelunkingCostDiscount(a,p.characters);a.research.jellyObstruction=23;near(M.getSpelunkingCostDiscount(a,p.characters)/discount,.9);
 const ratAccount={research:{jellyObstruction:42}};const crowns=M.calcRatKing([],[],ratAccount,[]).ratCrownOdds;near(crowns,.05);ratAccount.research.jellyObstruction=43;near(M.calcRatKing([],[],ratAccount,[]).ratCrownOdds,Math.min(1,crowns*1.25));
 const manyCrowns=[];manyCrowns[11]=Array(100).fill(1);assert.equal(M.calcRatKing([],manyCrowns,ratAccount,[]).ratCrownOdds,1);
 const research=clone(a.research);research.shapePlacements=[0,0,0,1];research.researchKalMap={};
 research.jellyObstruction=7;const insight=M.getObservationInsightExpRate(a,research,0);research.jellyObstruction=8;near(M.getObservationInsightExpRate(a,research,0)/insight,1.4);
 research.jellyObstruction=25;const kalei=M.getKaleiMultiBase(a,research);research.jellyObstruction=26;near(M.getKaleiMultiBase(a,research)-kalei,.01);
 // THE_FAMILY_GUY must change the played Wind Walker's efficiency, not only primary stats.
 const wind=clone(p.characters.find(c=>c.class==='Wind_Walker') || p.characters[0]);wind.class='Wind_Walker';
 const familyTalent=clone(p.characters.flatMap(c=>c.flatTalents).find(t=>t.name==='THE_FAMILY_GUY' && t.level>0));
 assert(familyTalent);wind.flatTalents=wind.flatTalents.filter(t=>t.name!=='THE_FAMILY_GUY');
 const roster=[wind],without=M.getAllEff(wind,roster,p.account);
 wind.flatTalents.push(familyTalent);assert(M.getAllEff(wind,roster,p.account)>without);
 const providers=[{...wind,playerId:0,level:500},{...wind,playerId:1,level:501}],played={...providers[0]};
 const amplified=M.getCharacterFamilyBonus(played,[providers[0]],'EFFICIENCY_FOR_ALL_SKILLS','Wind_Walker');
 near(M.getCharacterFamilyBonus(played,providers,'EFFICIENCY_FOR_ALL_SKILLS','Wind_Walker'),amplified);
 // Keep the character fixed: gallery ownership also changes equipment bonuses.
 const meritLocked={...ch,galleryUnlocked:false},meritAccount=clone(M.getCharacterStatAccount(p.account,meritLocked));
 meritAccount.voteBallot.meritocracyBonuses[27]={selected:true,bonus:0};
 const noMerit=M.getClassExpMulti(meritLocked,meritAccount,p.characters).value;
 meritAccount.voteBallot.meritocracyBonuses[27].bonus=100;
 near(M.getClassExpMulti(meritLocked,meritAccount,p.characters).value/noMerit,2);
 meritAccount.meritocracyAccessible=true;
 near(M.getClassExpMulti(meritLocked,meritAccount,p.characters).value,noMerit);
 const locked=clone(ch);locked.galleryUnlocked=false;const context=M.getCharacterStatAccount(p.account,locked);
 assert.equal(context.meritocracyAccessible,false);assert(context.statues.every(s=>s.meritocracyMulti===1));
 near(M.getClassExpMulti(locked,p.account,p.characters).value,M.getClassExpMulti(locked,context,p.characters).value);
 for(const [index,read,expected,ratio] of [
  [12,p=>p.account.research.maxRoll,1,false],
  [34,p=>p.account.farming.exoticMarkeMaxPurchases,1,false],
  [49,p=>p.account.divinity.deities[0].maxLevel,25,false],
  [63,p=>p.account.divinity.deities[0].maxLevel,25,false],
  [31,p=>p.account.spelunking.grandDiscoveriesChance,1.25,true]
 ]){
  const r=clone(raw),v=JSON.parse(r.data.Research);v[7][9]=index;r.data.Research=JSON.stringify(v);const before=read(parse(r,3));
  v[7][9]=index+1;r.data.Research=JSON.stringify(v);const after=read(parse(r,3));near(ratio?after/before:after-before,expected);
 }
 console.log('PASS dependency closure versus six passes, Jelly multiplier consumers, Doot gate, W7 god activation');
})().catch(e=>{console.error(e);process.exitCode=1;});
