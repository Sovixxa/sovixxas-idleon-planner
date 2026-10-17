const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
vm.runInThisContext(fs.readFileSync('prayer-math-engine.js','utf8'));
const S=require('./afk-save-model'),raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),before=JSON.stringify(raw);
const M={...PrayerMath,mapNames:{323:PrayerMath.mapNames[323]}};
const run=save=>S.calculate(save,M),copy=()=>structuredClone(raw),decode=x=>typeof x==='string'?JSON.parse(x):x;
const base=run(raw),node=r=>r[1][0].nodes.find(n=>n.map===323),b=node(base);
assert(b.rate>0);assert(base[1][0].loadout.cards.length>0);assert(base[1][0].loadout.equipment.length>0);assert(base[1][0].loadout.buffs.includes('FIRMLY GRASP IT'));
assert.equal(b.rate,b.combat.kills*b.combat.afk*b.combat.survival/100*b.combat.expMultiplier*b.combat.monsterExp);
const stale=copy();for(const k of Object.keys(stale.data).filter(k=>/^PVStatList_/.test(k))){const stats=decode(stale.data[k]);for(let i=0;i<4;i++)stats[i]=1;stale.data[k]=stats;}
assert.equal(node(run(stale)).rate,b.rate,'Stale cached primary totals must not change a rebuilt loadout estimate');
const noCards=copy();noCards.data.CardEquip_1=[];const cardResult=run(noCards);assert.equal(cardResult[1][0].loadout.cards.length,0);assert.notEqual(node(cardResult).combat.expMultiplier,b.combat.expMultiplier,'Equipped EXP cards affect the class EXP multiplier');
const noGear=copy();const eq=decode(noGear.data.EquipOrder_1);for(const k of Object.keys(eq[0]))if(k!=='length')eq[0][k]='Blank';noGear.data.EquipOrder_1=eq;const gearResult=run(noGear);assert.notEqual(node(gearResult).combat.damage,b.combat.damage,'Equipment affects damage after primary-stat reconstruction');assert.notEqual(node(gearResult).combat.expMultiplier,b.combat.expMultiplier,'Equipment EXP bonuses affect the multiplier');
const noBuff=copy();noBuff.data.BuffsActive_1=[];const buffResult=run(noBuff);assert.equal(buffResult[1][0].loadout.buffs.length,0);assert.notEqual(node(buffResult).combat.damage,b.combat.damage,'Saved active Firmly Grasp It changes STR and damage');
assert.equal(JSON.stringify(raw),before,'Imported save is immutable');
console.log('AFK combat bonuses: equipped cards, equipment, active buffs, stale-stat reconstruction, formula and immutability passed.');


const starSave=copy();starSave.data.BuffsActive_1=[{0:626,1:30,2:60,length:3}];
const parsed=M.parseData(starSave.data,starSave.charNames,starSave.companion,starSave.guildData,starSave.serverVars||{},starSave.accountCreateTime,starSave.tournament);
assert(parsed.characters[1].activeBuffs.some(t=>t.skillIndex===626),'Saved star-talent buffs survive talent-level refresh');
console.log('Saved star-talent buff preservation passed.');


const c=parsed.characters[1],without={...c,cards:{...c.cards,equippedCards:[]}},withCard={...c,cards:{...c.cards,equippedCards:[{...Object.values(parsed.account.cards).find(card=>card.rawName==='w7a3'),chipBoost:2,legendBonus:1.2}]}};
const baseMulti=M.getClassExpMulti(without,parsed.account,parsed.characters).value,withMulti=M.getClassExpMulti(withCard,parsed.account,parsed.characters).value;
const cardBonus=M.getCardBonusByEffect(withCard.cards.equippedCards,'Class_EXP_Multi');
assert(cardBonus>0);assert(Math.abs(withMulti/baseMulti/(1+cardBonus/100)-1)<1e-12,'Equipped World 7 multiplicative EXP cards retain chip and legend boosts');
console.log('World 7 EXP-multiplier card integration passed.');

const endgame={...M,mapNames:{324:PrayerMath.mapNames[324]}},endgameNode=S.combatMaps(parsed.characters[3],parsed.characters,parsed.account,endgame)[0];
assert.equal(endgameNode.combat.monsterExp,35e12,'Magni Pufferfin must never fall back to placeholder 1 EXP');
assert(endgameNode.rate>0);assert.equal(PrayerMath.monsters.w7b10.MonsterHPTotal,2e36);
console.log('Highest-map regression: Magni Pufferfin uses 35 trillion EXP and current HP.');
