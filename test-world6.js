const assert=require('assert'),vm=require('vm'),fs=require('fs');const box={window:{}};vm.runInNewContext(fs.readFileSync('world6-data.js','utf8'),box);vm.runInNewContext(fs.readFileSync('world4-data.js','utf8'),box);global.WORLD6_CATALOG=box.window.WORLD6_CATALOG;global.WORLD4_CATALOG=box.window.WORLD4_CATALOG;const W=require('./world6.js');
const f=W.farm({FarmCrop:{0:12,22:7},FarmUpg:[0,55,3],FarmPlot:[[1]]});assert.equal(f.crops.length,332);assert.equal(f.found,2);assert.equal(f.beans,55);assert.equal(f.market[0].level,3);assert.equal(f.seeds.length,7);
const n=Array(108).fill(null).map(()=>[]);n[0]=[2,0,50];n[102]=[1,12345,0,0,0,0,0,0,0,'a'];n[103]=[4];n[104]=[1,0];n[106]=['NjItem0'];const s=W.sneak({Ninja:n});assert.equal(s.jade,12345);assert.equal(s.twins[0].floor,3);assert.equal(s.upgrades[0].level,4);assert.equal(s.discoveredItems,1);
const sum=W.summon({Summon:[[2],['mushG'],[100,20],[3],[2]]});assert.equal(sum.wins,1);assert.equal(sum.upgrades.length,82);assert.equal(sum.upgrades[0].level,2);assert.equal(sum.essences[0].value,100);assert(sum.enemies[0].won);assert.equal(sum.enemies[0].name,'Green Mushroom');assert.equal(sum.enemies[0].reward,'<x Total DMG');assert.equal(sum.enemies[0].rewardValue,15);assert.equal(sum.enemies[6].rewardId,null);assert.equal(sum.victoryBonuses[0].value,15);console.log('world6 tests passed');

const B=require("./summoning-battles.js"),battles=B.battles(sum);assert(battles.length<sum.enemies.length);assert(battles.every(x=>x.battleName));assert(!battles.some(x=>x.code==="Copper"));assert.equal(battles[0].battleName,"Jonesy and his Lil Mushies");assert.equal(B.reward(battles[0]),"+15% Total damage");assert(!("hp" in battles[0]));assert.equal(B.reward({rewardId:19,rewardValue:2}),"+2 Library maximum level");

assert(!battles.some(x=>/^rift/.test(x.code)||x.id>=100&&x.id<=114));
const progress=B.progress({KRbest:JSON.stringify({SummzTrz0:6}),OptionsListAccount:JSON.stringify(Array.from({length:320},(_,i)=>i===319?43:0))},global.WORLD6_CATALOG);assert.equal(progress.stones.length,7);assert.equal(progress.stones[0].kills,6);assert.equal(progress.stones[1].kills,null);assert.equal(progress.endless,43);assert.equal(B.progress({},global.WORLD6_CATALOG).endless,null);
const endless=B.endlessRows(43,global.WORLD6_CATALOG);assert.equal(endless[0].number,44);assert.equal(endless.length,40);assert.equal(endless[0].rewardText,B.endlessRows(83,global.WORLD6_CATALOG)[0].rewardText);assert(endless.every(x=>x.rule&&x.modifier));

// Jade Emporium uses its own catalog, display order, and original-ID unlock codes.
const jadeSave={Ninja:Array.from({length:108},()=>[])};jadeSave.Ninja[102][9]='_alAZ';
const jadeBefore=JSON.stringify(jadeSave),jade=W.sneak(jadeSave).emporium;
assert.equal(jade[0].name,'Quick Ref Access');assert.equal(jade[0].cost,300);assert(jade[0].owned);
assert.equal(jade[1].id,12);assert(jade[1].owned);assert.equal(jade[1].cost,801*2.52);
assert(jade.find(x=>x.id===1).owned);assert(jade.find(x=>x.id===27).owned);
assert(!jade.find(x=>x.id===2).owned);
assert(!jade.some(x=>/Golden Tome|Stamp Stack|Bubble Broth|UNDER CONSTRUCTION/.test(x.name)));
assert.equal(jade.length,global.WORLD6_CATALOG.JadeUpg.filter(r=>r[0]!=='UNDER_CONSTRUCTION').length);
assert(W.sneak({}).emporium.every(x=>!x.owned));
assert.deepEqual(W.sneak({Ninja:JSON.stringify(jadeSave.Ninja)}).emporium,jade);
assert.equal(JSON.stringify(jadeSave),jadeBefore);
const high=jade.find(x=>global.WORLD6_CATALOG.NinjaInfo[24].indexOf(String(x.id))===45);
assert(high);assert.equal(high.cost,(300+500*45+45**3)*2.52**45*3.07**17*160**7*300);
const tabs=[];const host={innerHTML:'',querySelector:()=>null,querySelectorAll(selector){if(selector==='[data-w6-tab]'){tabs.length=0;for(const id of ['twins','knowledge','emporium'])tabs.push({dataset:{w6Tab:id}});return tabs;}return [];}};
W.render(host,'sneaking',jadeSave);tabs.find(x=>x.dataset.w6Tab==='emporium').onclick();
assert(host.innerHTML.includes('Quick Ref Access'));assert(!host.innerHTML.includes('Golden Tome'));
console.log('Jade Emporium: catalog, ordering, ownership, prices, and rendered cards pass.');
