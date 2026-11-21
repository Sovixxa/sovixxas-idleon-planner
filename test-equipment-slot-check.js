const assert=require('node:assert/strict');
const {infer,search,options,KEYS}=require('./equipment-slot-check');
const zero=Object.fromEntries(KEYS.map(k=>[k,0]));
const ring={id:'Ring',typeGen:'aRing',Upgrade_Slots_Left:1,UQ1val:5};
const upgraded={...zero,Weapon_Power:4,Defence:40,AGI:39,UQ1val:2,Upgrade_Slots_Left:-1};
assert.equal(infer(ring,upgraded).status,'Present');assert.equal(infer(ring,upgraded).used,2);
assert.equal(infer(ring,{...zero,Defence:2,STR:1,Upgrade_Slots_Left:-1}).status,'Uncertain','A consumed failure can hide the extra slot');
assert.equal(infer(ring,{...zero,Upgrade_Slots_Left:0}).status,'Uncertain');
const tool={id:'Tool',typeGen:'aTrap',Upgrade_Slots_Left:1,UQ1val:0};
assert.equal(infer(tool,{...zero,Upgrade_Slots_Left:0}).status,'Missing');
assert.equal(infer(tool,{...zero,Weapon_Power:18,STR:24,Upgrade_Slots_Left:-1}).status,'Present');
assert.equal(infer(tool,{...zero,Weapon_Power:18,STR:24,Upgrade_Slots_Left:-1},{limit:0}).status,'Uncertain');
assert.equal(infer(tool,{Upgrade_Slots_Left:0}).status,'Uncertain');
assert.equal(infer({...tool,typeGen:'unknown'},{...zero,Upgrade_Slots_Left:0}).status,'Uncertain');
assert.equal(infer(tool,{...zero,Premiumified:1,Upgrade_Slots_Left:0}).status,'Uncertain');
assert.equal(infer(tool,{...zero,Weapon_Power:10000,Upgrade_Slots_Left:-1}).status,'Uncertain','Impossible totals are not evidence');
assert.equal(search(Array(8).fill(0),31,options(tool)).possible,null);
// Exhaustive short real histories must remain feasible, including mixed class stones and failures.
for(const base of [ring,tool,{...tool,typeGen:'aWeapon'}]){
 const opts=options(base).filter(o=>!o.relaxed);
 for(let a=0;a<opts.length;a+=3)for(let b=0;b<opts.length;b+=5){
  const target=opts[a].v.map((v,i)=>v+opts[b].v[i]);target[3]+=9;
  const result=search(target,2,options(base),100000);assert.notEqual(result.possible,false);
 }
}
const mystery=options(ring).find(o=>o.relaxed&&o.v[0]===20);assert(mystery);
assert.equal(search(mystery.v,1,options(ring),100000).possible,true);
// The old divide-by-current-stone shortcut would fail this mixed-upgrade witness.
const mixed={...zero,Weapon_Power:15,STR:18,Upgrade_Slots_Left:-2};assert.notEqual(infer({...tool,Upgrade_Slots_Left:2},mixed).without,false);
console.log('Equipment reverse checks passed.');

const helmet={id:'hat',typeGen:'aHelmet',Upgrade_Slots_Left:12,UQ1val:1};
const armor={...zero,Weapon_Power:12,Defence:180,AGI:120,Upgrade_Slots_Left:-12};
assert.equal(infer(helmet,armor,{successfulOnly:true,singleType:true}).status,'Missing');
assert.equal(infer(helmet,armor,{successfulOnly:true}).status,'Uncertain');
assert.equal(infer({...helmet,Upgrade_Slots_Left:11},armor,{successfulOnly:true,singleType:true}).status,'Uncertain','Invalid remaining slots cannot be classified');
const boots={...helmet,Upgrade_Slots_Left:10};
assert.equal(infer(boots,{...zero,Weapon_Power:11,Defence:165,AGI:119,Upgrade_Slots_Left:-10},{successfulOnly:true,singleType:true}).status,'Present');
const bow={typeGen:'aWeapon',Upgrade_Slots_Left:7,UQ1val:1};
assert.equal(infer(bow,{...zero,Weapon_Power:56,AGI:49,Upgrade_Slots_Left:-7},{successfulOnly:true,singleType:true}).status,'Uncertain','7 VI stones and 8 SK stones plus 1 Godly stat are indistinguishable');

const ambiguous=infer(bow,{...zero,Weapon_Power:56,AGI:49,Upgrade_Slots_Left:-7},{successfulOnly:true,singleType:true});assert.equal(ambiguous.matches.length,2);assert.equal(ambiguous.matches[0].used,7);assert.equal(ambiguous.matches[1].used,8);assert.equal(ambiguous.matches[1].craft[3],1);

const modernBow={...zero,Weapon_Power:56,AGI:49,Upgrade_Slots_Left:-7};
assert.equal(infer(bow,modernBow,{modernOnly:true,successfulOnly:true}).status,'Missing');
assert.equal(infer(bow,{...zero,Weapon_Power:64,AGI:57,Upgrade_Slots_Left:-7},{modernOnly:true,successfulOnly:true}).status,'Present');
assert.equal(infer(bow,{...zero,Weapon_Power:8,AGI:7,Upgrade_Slots_Left:-1},{modernOnly:true,successfulOnly:true}).status,'Missing');
assert.equal(infer(bow,{...zero,Weapon_Power:7,AGI:6,Upgrade_Slots_Left:-1},{modernOnly:true,successfulOnly:true}).status,'Uncertain','Older stones must not be misclassified in modern mode');
const mixedModern={...zero,Weapon_Power:90,WIS:114,UQ1val:12,Upgrade_Slots_Left:-8};
assert.equal(infer({typeGen:'aFishingRod',Upgrade_Slots_Left:8,UQ1val:1},mixedModern,{modernOnly:true,successfulOnly:true}).status,'Missing');
