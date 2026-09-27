'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {decode,optimize}=require('./cog-board'),{evaluate}=require('./cog-optimizer-engine');
const ref=require('./test-fixtures/cog-client-reference.json');
// Execute the extracted game arithmetic, not a second copy of the planner formulas.
function game(order,maps,gem=0,tiny=0,flags=[]){
 const attrs={CogOrder:order,CogMap:maps.map(h=>({h:{...h}})),FlagsPlaced:flags,GemItemsPurchased:Array(119).fill(0),CustomLists:{h:{CogMatrices:ref.matrices}}};attrs.GemItemsPurchased[118]=gem;
 const a={engine:{getGameAttribute:key=>attrs[key]}},c={asNumber:v=>Number(v??0)},D={contains:(a,b)=>a.includes(b)},u={deepCopyMap:x=>structuredClone(x)};
 const context={_GenINFO:[],_TRIGGEREDtext:'m'},p={_customBlock_WorkbenchStuff:()=>context._GenINFO[12][2]},m={_customBlock_ResearchStuff:()=>tiny};
 context._customEvent_anotherThing=new Function('c',`return function(){${ref.boostBody}}`)(c);
 new Function('a','c','D','u','p','m','h',`return function(){var e,t2,s,i,n2;${ref.boardBody}}`)(a,c,D,u,p,m,{string:String}).call(context);
 return {attrs,totals:{build:context._GenINFO[12][0],bonus:context._GenINFO[12][1],flag:context._GenINFO[12][2],exp:order.slice(0,96).reduce((v,name,i)=>v+(name.startsWith('Player_')?attrs.CogMap[i].h.b:0),0)},rates:context._GenINFO[8]};
}
const near=(a,b,label)=>assert(Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-11,`${label}: ${a} != ${b}`);
function fixture(){const order=Array(252).fill('Blank'),maps=Array.from({length:252},()=>({}));for(let i=0;i<96;i++){order[i]=i%11===0?'Player_T'+i:'Cog3A0';maps[i]={a:100+i,c:10+i,d:i%7,...(i%11===0?{b:2e6+i*100}: {})};}return {order,maps};}
function check(order,maps,gem=0,tiny=0,flags=[]){const expected=game(order,maps,gem,tiny,flags),model=decode({CogO:order,CogM:expected.attrs.CogMap,FlagU:Array(120).fill(-11),FlagP:flags,GemItemsPurchased:expected.attrs.GemItemsPurchased});const actual=evaluate(model);for(const key of ['build','flag','exp','bonus'])near(actual.totals[key],expected.totals[key],key);for(let i=0;i<96;i++){near(actual.rates[i].build,Number(expected.rates[i].h.a)||0,'tile build '+i);near(actual.rates[i].flag,(Number(expected.rates[i].h.c)||0)*(1+gem/2),'tile flag '+i);if(order[i].startsWith('Player_'))near(actual.rates[i].exp,expected.rates[i].h.b,'tile EXP '+i);}for(const flag of actual.flags)if(flag.index<96)near(flag.rate,expected.rates[flag.index].h.i,'flag speed');return model;}
const shapes=['adjacent','diagonal','left','right','up','down','corners','around','row','column','everything'];
for(const shape of shapes)for(let position=0;position<96;position++){const {order,maps}=fixture();order[position]='Cog3up';maps[position]={h:shape,e:31,f:43,g:17,j:29,a:20,c:10,d:23};check(order,maps,2,0,[95]);}
const special=fixture();for(const [i,name] of [[0,'CogZA00'],[1,'CogZA01'],[12,'CogZA02'],[13,'CogZA03'],[50,'CogZA00']]){special.order[i]=name;special.maps[i]={d:188,h:'everything',e:999,f:999};}special.order[228]='CogSmb2';special.order[229]='CogSma2';special.order[230]='CogSm_2';check(special.order,special.maps,6,175);
const overlap=fixture();for(let i=1;i<=11;i++)overlap.maps[i]={...overlap.maps[i],h:'everything',e:i*3,f:i*5,g:i*7,j:i*11,k:1e9};check(overlap.order,overlap.maps,1,0,[90,91]);
const missing=decode({CogO:['Player_Unknown']});assert(evaluate(missing).warnings.some(s=>s.includes('incomplete')));assert(evaluate(missing).warnings.some(s=>s.includes('Gem-shop')));
const round=fixture();round.maps[0].b=7.33;round.maps[11].b=99999.9;check(round.order,round.maps,0,0);
const smallBonus=new Function('e','t2','i',ref.smallCogBody);
for(let type=0;type<3;type++)for(let tier=0;tier<10;tier++){
 const order=Array(252).fill('Blank');order[228]='CogSm'+'_ab'[type]+tier;
 const m=decode({CogO:order});near(m.left[0].stats[['tinyFlag','tinyBuild','tinyExp'][type]],smallBonus('SmallCogBonus',type,tier),'tiny cog formula');
}
// Compare searched layouts against the original game code using known unboosted
// player rates. This checks scoring independently of the adapter's replay path.
const search=fixture();search.order[108]='CogCry1';search.maps[108]={a:1234,c:111,d:500,h:'row',e:80,f:70,g:60,j:90};
const searchModel=check(search.order,search.maps,3);
for(const mode of ['exp','flag','build']){
 const plan=optimize(searchModel,mode,100),order=search.order.slice(),maps=structuredClone(search.maps);
 for(const m of plan.moves){[order[m.from],order[m.to]]=[order[m.to],order[m.from]];[maps[m.from],maps[m.to]]=[maps[m.to],maps[m.from]];}
 const expected=game(order,maps,3);for(const key of ['build','flag','exp','bonus'])near(plan.totalsAfter[key],expected.totals[key],'searched client '+mode+' '+key);
}
// Loose pieces must be assembled by search, then agree with the actual client.
const yinSearch=fixture();
for(const group of [[3,20,38,70],[108,109,110,111]])group.forEach((index,piece)=>{yinSearch.order[index]='CogZA0'+piece;yinSearch.maps[index]={a:1,c:1,d:188};});
const yinModel=check(yinSearch.order,yinSearch.maps,3);
for(const mode of ['exp','build']){
 const plan=optimize(yinModel,mode,100),order=yinSearch.order.slice(),maps=structuredClone(yinSearch.maps);
 assert.equal(plan.excogiaAfter.sets.length,2);
 for(const move of plan.moves){[order[move.from],order[move.to]]=[order[move.to],order[move.from]];[maps[move.from],maps[move.to]]=[maps[move.to],maps[move.from]];}
 const expected=game(order,maps,3);for(const key of ['build','flag','exp','bonus'])near(plan.totalsAfter[key],expected.totals[key],'assembled client '+mode+' '+key);
}
const singleOrder=Array(252).fill('Blank'),singleUnlock=Array(120).fill(0);singleUnlock[0]=-11;singleOrder[108]='Cog3A0';
const single=decode({CogO:singleOrder,CogM:{108:{a:100,c:100,d:100}},FlagU:singleUnlock});
assert.equal(optimize(single,'build',60).board[0].index,108,'One unlocked tile can receive a shelf cog');
const spare=fixture();spare.order[108]='CogSmb9';spare.maps[108]={a:1e50,c:1e50,d:1e50};const tinyModel=check(spare.order,spare.maps);for(const mode of ['exp','flag','build'])assert(!optimize(tinyModel,mode,60).board.some(s=>s.item.startsWith('CogSm')),'Tiny cogs must not enter main board');
const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),model=decode(raw.data,raw),snapshot=JSON.stringify(model),baseline=evaluate(model);
near(baseline.totals.exp,model.board.filter(s=>s.isPlayer).reduce((n,s)=>n+Number(s.stats.b||0),0),'saved EXP identity');
for(const mode of ['exp','flag','build']){const plan=optimize(model,mode,150),slots=model.slots.slice();for(const move of plan.moves)[slots[move.from],slots[move.to]]=[slots[move.to],slots[move.from]];const actual=evaluate(model,slots);for(const key of ['build','flag','exp','bonus'])near(plan.totalsAfter[key],actual.totals[key],'replayed '+mode+' '+key);assert(plan.after>=plan.before);assert.equal(JSON.stringify(model),snapshot);}
console.log('Cog math audit: 1,056 client shape/edge fixtures, additive buffs, EXP deboost, floor, Excogia, gem flags, tiny cogs and replay totals OK');
