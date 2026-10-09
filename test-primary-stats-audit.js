'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={console:{log(){},warn(){},error(){},debug(){}},structuredClone};c.self=c;
vm.createContext(c);c.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f}));
c.postMessage=()=>{};c.importScripts('review-target-worker.js');
c.ConnectedTrace={disabled:true,enter(){},leave(){},value:(_a,_b,v)=>v};
const M=c.PrayerMath,raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw);
const clone=x=>JSON.parse(JSON.stringify(x));
const parse=r=>M.parseData(structuredClone(r.data),r.charNames,r.companion,r.guildData,r.serverVars,r.accountCreateTime,r.tournament);
const p=parse(raw),calc=(ch=p.characters[0],a=p.account,characters=p.characters,math=M)=>c.ConnectedPrimaryStats.calculate(ch,a,characters,math,false);
const row=(r,name)=>r.rows.find(x=>x.name===name).value;
const near=(x,y,label)=>assert(Math.abs(x-y)<=1e-9*Math.max(1,Math.abs(y)),`${label}: ${x} != ${y}`);
const setRaw=(r,key,edit)=>{const text=typeof r.data[key]==='string',value=text?JSON.parse(r.data[key]):r.data[key];edit(value);r.data[key]=text?JSON.stringify(value):value;};

// 1. Tome percentages: 150% Grey Tome Book + 25% Troll set = 2.75x, for all three bubbles.
const tomeAccount=clone(p.account);tomeAccount.grimoire.upgrades[17].bonus=0;
const troll=tomeAccount.armorSmithy.sets.find(x=>x.setName==='TROLL_SET');troll.unlocked=false;
const noTomeBoost=calc(undefined,tomeAccount);
tomeAccount.grimoire.upgrades[17].bonus=150;troll.unlocked=true;troll.bonusValue=25;
const withTomeBoost=calc(undefined,tomeAccount);
for(let i=0;i<3;i++){
 const b=p.account.alchemy.bubblesFlat.find(x=>x.stat===['W8','A9','M9'][i]);
 const name='Alchemy · '+b.bubbleName.replace(/_/g,' ');
 assert(row(noTomeBoost[i],name)>0);near(row(withTomeBoost[i],name),row(noTomeBoost[i],name)*2.75,'Tome '+i);
}

// 2. Misc obol stats participate exactly once, alongside amplified base obol stats.
const obolChar=clone(p.characters[0]);obolChar.obols.stats['%_ALL_STATS']={personalBonus:0,familyBonus:0};
const noObolPct=calc(obolChar);obolChar.obols.stats['%_ALL_STATS']={personalBonus:2,familyBonus:4};
const withObolPct=calc(obolChar);
for(let i=0;i<4;i++){
 assert.equal(row(withObolPct[i],'Obols · All Stat %'),6);
 near(withObolPct[i].multiplier-noObolPct[i].multiplier,.06,'Obol multiplier');
 assert.equal(withObolPct[i].baseTotal,noObolPct[i].baseTotal);
 assert(withObolPct[i].computed>noObolPct[i].computed);
}

// 3. Collection switches replace slots only after unlock, without losing worn items before it.
const gearAccount=clone(p.account),gearChar=clone(p.characters[0]);
gearChar.equipment=Array.from({length:16},()=>({}));gearChar.tools=[];
gearChar.gallery={trophyBonuses:[{name:'STR',value:20}],nametagBonuses:[{name:'STR',value:10}]};
gearAccount.hatRack={hatBonuses:[{name:'STR',value:50}]};
for(const [slot,Type,STR]of [[10,'TROPHY',100],[14,'NAMETAG',20],[8,'PREMIUM_HELMET',40]])gearChar.equipment[slot]={Type,STR};
gearChar.galleryUnlocked=false;gearChar.hatRackUnlocked=false;
assert.equal(M.getStatsFromGear(gearChar,'STR',gearAccount).value,160);
gearChar.galleryUnlocked=true;assert.equal(M.getStatsFromGear(gearChar,'STR',gearAccount).value,70);
gearChar.hatRackUnlocked=true;assert.equal(M.getStatsFromGear(gearChar,'STR',gearAccount).value,80);

// 4. Well Dressed must preserve base attire stats while still amplifying MISC.
gearChar.galleryUnlocked=false;gearChar.hatRackUnlocked=false;
gearChar.equipment=Array.from({length:16},()=>({}));
gearChar.equipment[15]={Type:'CLOTHING',STR:100,UQ1txt:M.primaryEtcBonuses[46],UQ1val:10};
assert.equal(M.getStatsFromGear(gearChar,'STR',gearAccount).value,100);
assert(M.getStatsFromGear(gearChar,46,gearAccount).value>10,'MISC attire amplification remains active');

// 5. Native family cache compares raw values against the previously amplified result.
const familyChar=clone(p.characters[1]);familyChar.level=100;
const other={...familyChar,playerId:999,level:110};
const familyTalent=familyChar.flatTalents.find(t=>t.skillIndex===144);
Object.assign(familyTalent,{level:1,funcX:'add',x1:50,x2:0});
const ownRaw=M.getFamilyBonusBonus(M.classFamilyBonuses,'TOTAL_STR',100);
const otherRaw=M.getFamilyBonusBonus(M.classFamilyBonuses,'TOTAL_STR',110);
assert(ownRaw*1.5>otherRaw && otherRaw>ownRaw);
assert.equal(row(calc(familyChar,p.account,[familyChar,other])[0],'Family · STR'),ownRaw*1.5);
assert.equal(row(calc(familyChar,p.account,[other,familyChar])[0],'Family · STR'),otherRaw);

// 6. Exercise zero talents through the raw-save parser, not just a hand-built talent object.
// Also verify that the portal switches survive parsing.
const zeroRaw=clone(raw);
for(const [player,id]of [[0,367],[1,142],[2,532]])setRaw(zeroRaw,'SL_'+player,x=>{x[id]=0;});
setRaw(zeroRaw,'KLA_0',x=>{x[250][0]=1;x[50][0]=1;});
const zero=parse(zeroRaw);
assert.equal(zero.characters[0].galleryUnlocked,false);assert.equal(zero.characters[0].hatRackUnlocked,false);
for(const [player,id,stat]of [[0,367,1],[1,142,0],[2,532,2]]){
 const ch=zero.characters[player],t=ch.flatTalents.find(x=>x.skillIndex===id);
 assert.equal(t.level,0);
 assert.equal(row(calc(ch,zero.account,zero.characters)[stat],t.name.replace(/_/g,' ')+' (second effect)'),0);
}

// 7. Doot requires Divinity level 2 on this character, even on an advanced account.
const dootChar=clone(p.characters[0]);
for(const level of [0,1,2]){
 dootChar.skillsInfo.divinity.level=level;
 const bonus=row(calc(dootChar)[0],'Companion · King Doot × Cosmo');
 if(level<2)assert.equal(bonus,0);else assert(bonus>0);
}

// 8. Token override does not erase owned/upgraded inventory metadata.
const tokenRaw=clone(raw);setRaw(tokenRaw,'OptLacc',x=>{x[606]='8';});const token=parse(tokenRaw);
assert.equal(token.account.companions.list[8].bonus,15);
assert.equal(token.account.companions.list[8].upgraded,true);
for(const result of calc(token.characters[0],token.account,token.characters))assert.equal(row(result,'Companion · Sandy Pot'),15);
assert.equal(p.account.companions.list[8].bonus,20);

// 9. Native log approximation crosses the 0.1% floor at this exact boundary.
const dummyChar=clone(p.characters[0]),dummyAccount=clone(p.account);
dummyChar.flatStarTalents.find(x=>x.skillIndex===653).level=100;dummyAccount.accountOptions[172]=1000;
const dummy=row(calc(dummyChar,dummyAccount)[0],'Star talent · Dummy Thicc Stats');
near(dummy,Math.log(1000)/2.30259*(.35*100/150),'Native Dummy Thicc log');
near(.1*Math.floor(10*dummy),.6,'Native percentage rounding');
assert.equal(Math.floor(10*(Math.log10(1000)*(.35*100/150)))/10,.7,'Old formula fails this boundary');

// When the supplied client is available, execute its functions as an independent oracle.
const clientPath=process.env.IDLEON_CLIENT_PATH||'../audit/N.js';
if(fs.existsSync(clientPath)){
 const source=fs.readFileSync(clientPath,'utf8');
 const extract=(name,next)=>{const start=source.indexOf(name+'=')+name.length+1,end=source.indexOf(next,start);assert(start>name.length&&end>start);return source.slice(start,end);};
 const attrs={SkillLevels:[],Lv0:[],DNSM:{h:{CompanionBon:{h:{0:1}}}}};
 const env={a:{engine:{getGameAttribute:n=>attrs[n]}},c:{asNumber:x=>Number(x)||0}};
 const nativeTalent=vm.runInNewContext('('+extract('_customBlock_GetTalentNumber',',k._customBlock_TalentCalc=')+')',env);
 for(const id of [142,367,532])assert.equal(nativeTalent(2,id),0);
 const nativeDoot=vm.runInNewContext('('+extract('_customBlock_Companions',',m._customBlock_CompLV2=')+')',env);
 for(const level of [0,1,2]){attrs.Lv0[14]=level;assert.equal(nativeDoot(0),level<2?0:1);}
 const nativeLog=vm.runInNewContext('('+extract('_customBlock_getLOG',',k._customBlock_Log2=')+')');
 for(const value of [0,1,1000,1e30])assert.equal(M.lavaLog(value),nativeLog(value));
 console.log('Native client zero-talent, Doot and logarithm oracles passed.');
}
assert.equal(JSON.stringify(raw),before,'The input save remains unchanged');
for(const ch of p.characters)for(const r of calc(ch)){assert.equal(r.unknown.length,0);assert(Number.isFinite(r.computed));}
console.log('All nine primary-stat audit regressions and all 44 roster totals passed.');
