'use strict';
// Optional audit against the user's locally extracted client. Never load the full game.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const E=require('./engine');
const sourcePath=path.resolve(__dirname,process.env.IDLEON_CLIENT_PATH||'../audit/N.js');
if(!fs.existsSync(sourcePath)){if(process.env.IDLEON_CLIENT_PATH)throw Error('Requested client is unavailable: '+sourcePath);console.log('SKIP client audit: extract local N.js first');process.exit(0);}
const source=fs.readFileSync(sourcePath,'utf8');
function handler(name){
 const match=new RegExp('(?:\\.|\\b)'+name+'\\s*[:=]\\s*(function\\s*\\()').exec(source);assert(match,'Missing '+name);
 const start=match.index+match[0].length-match[1].length;let depth=0,quote='',escape=false;
 for(let i=source.indexOf('{',start);i<source.length;i++){
  const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}
  if(ch==='"'||ch==="'")quote=ch;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return source.slice(start,i+1);
 }
 throw Error('Unclosed '+name);
}
const rows=vm.runInNewContext('('+handler('JellyUPG')+')()',{}, {timeout:1000});
for(let i=0;i<40;i++){const m=E.UPGRADE_META[i];assert.deepEqual([m.max,m.growth,m.perLevel,m.baseCost],Array.from(rows[i].slice(1,5),Number),'Upgrade '+i);}
const research=Array.from({length:19},()=>[]);research[7]=Array(20).fill(0);research[14]=Array(180).fill(-1);research[15]=Array(9).fill(0);research[16]=Array(9).fill(25);research[17]=Array(100).fill(0);research[18]=[];
const state=E.makeState(research);state.upgrades.fill(1,0,8);state.upgrades[14]=1;state.upgrades[16]=6;state.upgrades[17]=3;state.upgrades[18]=114;state.upgrades[19]=57;state.upgrades[32]=3;
state.research[16]=state.cellLevels;state.research[17]=state.upgrades;
// Give the model the same explicit external inputs as the mocked client hooks.
state.research[0][185]=2;state.research[1][185]=2;state.rawRoot={companion:{l:[]}};
state.rawData={WeeklyBoss:{},Spelunk:Array.from({length:19},()=>[])};state.rawData.Spelunk[9][1]=25;
const arr=[{type:0,anchor:19,cells:[19]},{type:1,anchor:20,cells:[20,21]},{type:3,anchor:38,cells:E.footprint(3,38)},{type:4,anchor:72,cells:E.footprint(4,72)},{type:6,anchor:108,cells:E.footprint(6,108)}];
const info=[];info[233]=E.effectiveCounts(state,E.rawCounts(arr));info[234]=Array.from(E.organelleBoosted(arr));info[235]=Array.from(E.infectedSlots(arr));info[240]=0;info[241]=0;
const attrs={Research:state.research,DNSM:{h:{}},CustomLists:{h:{JellyUPG:rows}},PixelHelperActor:Array(28)};
attrs.PixelHelperActor[27]={behaviors:{getBehavior:()=>({_GenINFO:info})}};
const context={a:{engine:{getGameAttribute:k=>attrs[k]}},c:{asNumber:Number},n:{__cast:x=>x},md:{},D:{contains:(a,x)=>a.includes(x)},q:{},m:{
 _customBlock_GamingStatType:()=>E.paletteCellDamageBonus(state),
 _customBlock_ResearchStuff:()=>E.gridCellDamageBonus(state).value,
 _customBlock_SushiStuff:()=>E.sushiRogBonus(state,63)
}};
context.q._customBlock_JellyOperation=vm.runInNewContext('('+handler('_customBlock_JellyOperation')+')',context,{timeout:1000});
const game=context.q._customBlock_JellyOperation;
function close(a,b,label){assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a)),label+': '+a+' / '+b);}
for(let n=0;n<72;n++){close(game('BossHP',n,0),E.bossHP(n),'HP '+n);close(game('BossTime',n,0),E.bossTime(n),'time '+n);close(game('BossAtkCD',n,0),E.bossAtkCD(n),'CD '+n);}
for(const fever of [0,1,2,3,4,5]){
 state.fever=fever;state.research[7][13]=fever;const model=E.combatModel(state,arr);
 for(const u of model.units){close(game('MainAtkCD',u.type,0),u.cd,'cell CD');close(game('MainAtkDMG',u.type,0),u.baseDamage/u.prox*E.jellyDamageMultiplier(state,0),'cell damage, fever '+fever);}
 close(game('EXPMulti',0,0),E.cellExpMultiplier(state),'EXP');
}
console.log('Client audit OK: 40 upgrade records, 72 bosses, damage/cooldowns across all six Fevers');


// Compare every playable cell against the executable client formula with nonzero
// mixed passive counts (external hooks remain mocked; see BONUS-AUDIT.md).
info[233]=[3,4,2,3,1,2,2,2];info[234]=[];info[235]=[];
for(let t=0;t<8;t++){
 const one=[{type:t,anchor:90,cells:E.footprint(t,90)||[90]}];
 info[233]=E.effectiveCounts(state,E.rawCounts(one));info[234]=Array.from(E.organelleBoosted(one));info[235]=Array.from(E.infectedSlots(one));
 const u=E.combatModel(state,one).units[0];
 close(game('MainAtkCD',t,0),u.cd,'all-cell cooldown '+t);
 close(game('MainAtkDMG',t,0),u.baseDamage/u.prox*E.jellyDamageMultiplier(state,0),'all-cell damage '+t);
}
for(const counts of [[3,4,2,3,1,2,2,2],[1,0,4,0,0,0,3,5]]){
 info[233]=counts;
 close(game('UnitSumAtk',0,0),(1+2*counts[7])*(1+.5*counts[2]+.1*counts[0]),'mixed damage stacking');
 close(game('UnitSumAtkCD',0,0),1/((1+.5*counts[6])*(1+.25*counts[3]+.15*counts[1])),'mixed speed stacking');
}
console.log('Client audit OK: all eight cell formulas and mixed passive stacking');

// Run the actual board-setup event. Earlier tests fed our effective counts and
// adjacency into the client formula, which could not detect a shared setup bug.
const researchRows=vm.runInNewContext('('+handler('Research')+')()',{}, {timeout:1000});
attrs.CustomLists.h.Research=researchRows;
assert.deepEqual(Array.from(researchRows[49],x=>String(x).split(',').map(Number)),E.SHAPE_OFFSETS);
assert.deepEqual(Array.from(researchRows[50],String),E.PLOTS);
Object.assign(context.c,{attachImageToActor(){},removeImage(){},fadeImageTo(){},moveImageBy(){},spinImageTo(){}});
context.h={string:String};context.t={expoIn:0,backOut:0,backInOut:0};
context.k={_customBlock_addImgInst:()=>({set_rotation(){}}),_customBlock_GrowImgInstREAL(){},_customBlock_AdjustImgInst(){}};
const setup=vm.runInNewContext('('+handler('_customEvent_JellyStuff')+')',context,{timeout:1000});
const actor={_TRIGGEREDtext:'i',_GenINFO:info,_UIinventory17:[],_UIinventory17On:[],actor:{}};
actor._UIinventory17[98]=[];actor._UIinventory17On[98]=Array(180).fill(0);
state.board=Array(180).fill(-1);state.research[14]=state.board;
for(const enabled of [0,1])for(let type=0;type<8;type++)for(let count=0;count<=12;count++){
 state.upgrades[14]=enabled;state.board.fill(-1);
 for(let i=0;i<count;i++)state.board[i]=type;
 setup.call(actor);
 const raw=Array(9).fill(0);raw[type]=count;
 assert.deepEqual(Array.from(info[233]),E.effectiveCounts(state,raw),'client count cache '+type+'/'+count+'/'+enabled);
 assert.equal(info[233][type],count+(enabled&&type!==5?Math.floor(count/3):0));
}
state.plots=Array.from({length:E.PLOTS.length},(_,i)=>i);
const placementIndex=E.buildPlacementIndex(state),random=E.seededRng(51439);
let boardChecks=0;
for(const triples of [0,1])for(const proximity of [0,10])for(let fever=0;fever<6;fever++)for(let trial=0;trial<4;trial++){
 state.upgrades[14]=triples;state.upgrades[13]=proximity;state.fever=fever;state.research[7][13]=fever;
 const layout=E.fillEmptySlots(state,E.generateRoleAwareLayout(state,placementIndex,random));
 assert(E.isLegalLayout(state,layout));state.board.fill(-1);for(const p of layout)state.board[p.anchor]=p.type;
 setup.call(actor);const model=E.combatModel(state,layout);
 assert.deepEqual(Array.from(info[233]),model.effectiveCounts);
 assert.deepEqual(Array.from(info[235]).sort((a,b)=>a-b),[...model.infected].sort((a,b)=>a-b));
 for(const u of model.units){
  close(game('MainAtkCD',u.type,0),u.cd,'setup cooldown');
  close(game('MainAtkDMG',u.type,0)*game('ObstAdj',u.anchor,0),u.baseDamage*E.jellyDamageMultiplier(state,0),'setup damage');
  close(.65*game('OrganelleSPD',u.anchor,0)*game('ObstAdj',u.anchor,1),u.progressPerFrame,'setup progress');
 }
 boardChecks++;
}
console.log('Client setup audit OK: 208 count/breakpoint cases, '+boardChecks+' legal boards across all Fevers, adjacency, infection and proximity');

// Execute the shipped level-up block with the operation panel position. The
// operation-start handler moves this panel to -135; only idle x > -5 can level.
const levelStart=source.indexOf('if(this._GenINFO[242]=c.asNumber(this._GenINFO[242])-1');
const levelEnd=source.indexOf('if(1==this._GenINFO[221])',levelStart);
assert(levelStart>=0&&levelEnd>levelStart);
const levelStep=vm.runInNewContext('(function(){var e,n;'+source.slice(levelStart,levelEnd)+'})',context);
assert(source.includes('c.moveImageTo(this._UIinventory17[88],-135,0,.5,t.quadOut)'));
context.a.SCALE=1;
actor._UIinventory17[99]=[];actor._UIinventory17On[99]=[];
actor._UIinventory17[88]={get_x:()=>-135};info[242]=0;
state.cellLevels.fill(0);state.research[15]=Array(9).fill(1000);
for(let frame=0;frame<600;frame++)levelStep.call(actor);
assert(state.cellLevels.every(n=>n===0),'operation panel blocks banked EXP level-ups');
actor._UIinventory17[88]={get_x:()=>0};levelStep.call(actor);
assert.equal(state.cellLevels[0],1,'same client block levels cells when idle');
console.log('Client level-up audit OK: banked EXP waits until the idle panel is visible');
