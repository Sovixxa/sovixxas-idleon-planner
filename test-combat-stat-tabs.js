'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={console,structuredClone,setTimeout};vm.createContext(context);
for(const file of ['prayer-math-engine.js','combat-stat-model.js','combat-source-info.js','combat-stat-tabs.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const M=context.PrayerMath,C=context.CombatStatModel,raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),original=JSON.stringify(raw);
const close=(a,b)=>assert(Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-9,`${a} != ${b}`);
for(const kind of ['classExp','damage']){
 const model=C.calculate(raw,kind);
 assert.equal(model.characters.length,raw.charNames.length);
 for(const ch of model.characters){
  assert(!ch.error,ch.error);assert(ch.total>0);assert(ch.rows.length>75);
  for(const row of ch.rows){const info=context.CombatSourceInfo.get(row,kind);assert(info.effect&&info.max);if(info.page)assert(fs.readFileSync('app.js','utf8').includes(info.page+':')||fs.readFileSync('app.js','utf8').includes('SKILL_PAGES.'+info.page+'='),info.page);}
  if(kind==='classExp')close(ch.rows.at(-1).running,ch.total);
  else{
   close(ch.stages.baseDamage*ch.stages.perDamage*ch.stages.percentDamage,ch.total);
   // Base damage must not double-count food, clicker or Vault terms inside weapon-power effect.
   const base=ch.rows.filter(r=>r.stage==='Base Damage'&&r.operation!=='rule'&&r.name!=='Cosmo');
   const food=base.find(r=>r.name==='Food (post-softcap)').value;
   let value=base.reduce((s,r)=>s+r.value,0)-food;
   if(value>4000)value=4000+Math.pow(value-4000,.91);
   if(value>15000)value=15000+Math.pow(value-15000,.84);
   close(value+food,ch.stages.baseDamage);
   const hp=1+ch.rows.filter(r=>r.stage==='HP/MP Damage').reduce((s,r)=>s+r.value,0)/100;
   close(hp,ch.stages.hpMpDamage);
   const per=ch.rows.filter(r=>r.stage==='Per-X Bonuses'&&r.operation!=='rule');
   let perValue=hp*(1+per.filter(r=>r.group==='additive').reduce((s,r)=>s+r.value,0)/100)*per.filter(r=>r.group==='multi').reduce((s,r)=>s*r.value,1);
   if(perValue>100)perValue=100+Math.pow(perValue-100,.86);
   if(perValue>2e6)perValue=2e6*Math.pow(perValue/2e6,.5);
   if(perValue>1e8)perValue=1e8*Math.pow(perValue/1e8,.3);
   close(perValue,ch.stages.perDamage);
  }
 }
 const html=context.CombatStatTabs.characterHtml(model.characters[3],kind,{selected:'3',filter:'all',query:''});
 assert.equal((html.match(/class="drop-group"/g)||[]).length,3);
 assert(html.includes('aria-haspopup="dialog"'));
 assert(context.CombatStatTabs.missingHtml(model.characters,kind,{query:''}).includes('data-stat-source='));
 assert.equal(C.calculate({},kind).characters.length,0);
}
assert.equal(JSON.stringify(raw),original,'The stat pages must not mutate imported saves');
// EXP conditional sources must reconcile even for a low-level character and lowest-level bonuses.
const p=M.parseData(raw.data,raw.charNames,raw.companion,raw.guildData,raw.serverVars,raw.accountCreateTime,raw.tournament);
for(const level of [1,29,49,119,120,1000]){
 const ch={...p.characters[0],level};const exp=M.getClassExpMulti(ch,p.account,[ch]);
 assert.doesNotThrow(()=>C.expRows(exp));
}
const corrupt=M.getClassExpMulti(p.characters[0],p.account,p.characters);corrupt.value*=2;
assert.throws(()=>C.expRows(corrupt),/reconcile/);
console.log('Damage / Class EXP: roster totals, source reconciliation, soft caps, conditional levels, immutability, groups, missing links and destinations pass.');
