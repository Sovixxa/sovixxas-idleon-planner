import {getBribeBonus} from './vendor/idleon-toolbox/parsers/world-1/bribes';
import {getVoteBonus} from './vendor/idleon-toolbox/parsers/world-2/voteBallot';
import {getLegendTalentBonus} from './vendor/idleon-toolbox/parsers/world-7/legendTalents';

const parse=(v:any)=>typeof v==='string'?JSON.parse(v):v;
const fmt=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:3});
export const shovelFactor=(level:number)=>Math.floor(10*(1+(60*level/(250+level))**1.7))/10;
export const nuggetChance=(best:number,base:number)=>Math.max(0,Math.min(1,((base/best)**(1/.64)-1e-5)/(1-1e-5)));
export function addNuggetBreakdown(model:any,a:any,raw:any){
 const g=parse(raw.Gaming),s=parse(raw.GamingSprout),dream=parse(raw.Dream)||[],options=a.accountOptions||[];
 const level=Number(s[26]?.[0]||0),elapsed=Math.max(0,Number(s[26]?.[1]||0)),best=Number(g[8]||0),detector=Number(dream[9]||0),counter=Number(options[192]||0);
 const shovel=shovelFactor(level),pity=1+detector*counter/100,base=shovel*pity,ceiling=base/(1e-5**.64);
 const preserve=getLegendTalentBonus(a,35)>=1,fractal=Number(options[184]||0)>=10000?25:0,bribe=getBribeBonus(a.bribes,'Nugget_Fabrication')||0;
 const arcade=a.arcade?.shop?.[30]?.bonus||0,vote=getVoteBonus(a,22)||0,pool=1+(fractal+bribe+arcade)/100,voteFactor=1+vote/100;
 const baseRolls=Math.floor((elapsed/3600)**.44),rolls=Math.round(baseRolls*pool*voteFactor),ready=level>0?rolls:0;
 const nextSeconds=3600*(baseRolls+1)**(1/.44),remaining=Math.max(0,nextSeconds-elapsed);
 const median=base/((1+1e-5)/2)**.64,mean=base*(1-1e-5**.36)/(.36*(1-1e-5));
 // Flooring to tenths creates a reachable final plateau below the unrounded asymptote.
 const shovelCap=(Math.ceil(10*(1+60**1.7))-1)/10,t=(shovelCap-1)**(1/1.7);
 let capLevel=Math.ceil(250*t/(60-t));while(shovelFactor(capLevel)<shovelCap)capLevel++;while(capLevel>0&&shovelFactor(capLevel-1)>=shovelCap)capLevel--;
 const gainNeeded=best/shovel*1e-5**.64,failures=detector>0?Math.max(0,Math.floor((gainNeeded-1)*100/detector-counter)+1):null;
 const row=(name:string,value:number,unit:string,detail:string,extra:any={})=>({name,value,unit,detail,icon:'assets/GamingItem1.png',limitType:'No fixed cap',limitLabel:'No fixed cap',breakpoints:[],maxed:false,...extra});
 const point=(label:string,value:string,reached:boolean)=>({label,value,reached});
 const rows=[
  row('Best Nugget',best,'×','Highest nugget recorded in your save. New rolls replace it only when they are larger.',{limitLabel:best>0?'Highest found · no permanent cap':'No nugget recorded yet',limitNote:'Bit gains use at least 1× even before a nugget is found. The next-roll ceiling is separate from your saved record.'}),
  row('Metal Detector counter',counter,' nuggets','Saved nuggets counted by Metal Detector. It increments after a generated roll while Metal Detector is unlocked.',{icon:'assets/Dream_Cloud.png',limitType:'Saved counter',limitLabel:preserve?'Preserved through new records':'Resets on a new record',limitNote:preserve?'This is not a count since your last highest nugget.':detector>0?'Tracks counted nuggets between resets. Nuggets before Metal Detector was unlocked are not included.':'Metal Detector is not unlocked; this counter does not track your nugget history.'}),
  row('Shovel timer',elapsed/3600,' hours','Accumulated shovel timer from your save. It resets when collected. Timer-granting rewards can add time.',{limitType:'Saved timer',limitLabel:'Accumulated timer; not a real-world timestamp'}),
  row('Dirty Shovel',shovel,'×','The shovel scales every nugget roll. Its bonus is rounded down to one decimal place.',{limitType:'Formula ceiling',limitLabel:`Rounded ceiling: ${fmt(shovelCap)}×`,cap:shovelCap,currentLevel:level,maxed:shovel>=shovelCap,next:`Lv ${fmt(level+1)}: ${fmt(shovelFactor(level+1))}×`,limitNote:`The rounded formula plateaus at shovel Lv ${fmt(capLevel)}. This is far beyond practical upgrade costs.`,breakpoints:[250,2250,24750,capLevel].map(n=>point(`Shovel Lv ${fmt(n)}`,`${fmt(shovelFactor(n))}×`,level>=n))}),
  row('Metal Detector',pity,'×',`Equinox · +${fmt(detector)}% per counted nugget. Current counter: ${fmt(counter)}.`,{icon:'assets/Dream_Cloud.png',currentLevel:detector,limitLabel:detector>0?'Counter keeps increasing between resets':'Unlock Metal Detector to build the counter',limitNote:preserve?'Your Legend Talent preserves the counter when you find a better nugget.':'Finding a better nugget resets the counter. The counter increments after a roll when Metal Detector is unlocked.'}),
  row('Next-roll minimum',base,'×','Shovel factor × current Metal Detector factor.',{limitType:'Roll range',limitLabel:'Lower endpoint for the next roll'}),
  row('Next-roll ceiling',ceiling,'×','Shovel factor × Metal Detector factor × 1,584.893. The random roll is bounded; this ceiling applies only at the current counter.',{limitType:'Roll range',limitLabel:'Current counter only; not a permanent cap',next:failures===null?(ceiling<=best?'Shovel upgrades or Metal Detector are needed to beat your best.':'A larger nugget is possible now.'):failures===0?'A larger nugget is possible now.':`${fmt(failures)} more counted rolls before the ceiling can exceed your best.`,limitNote:'Metal Detector can raise this ceiling. Individual rolls remain random.'}),
  row('Chance to improve',best>0?nuggetChance(best,base)*100:100,'%','Chance that the next single roll exceeds your saved best nugget, at the current Metal Detector counter.',{limitType:'Probability',cap:100,limitLabel:'0–100% per roll',limitNote:'Later rolls have different odds as the counter changes. This is not the chance for the whole collection.'}),
  row('Median next nugget',median,'×','Half of next-roll results are below this value and half are above it, at the current counter.',{limitType:'Roll distribution',limitLabel:'50th percentile; not a guaranteed result'}),
  row('Average next nugget',mean,'×','Mathematical average of the bounded random roll at your current counter. Rare large rolls pull this above the median.',{limitType:'Roll distribution',limitLabel:'Mean of one roll; not the average best nugget',breakpoints:[.5,.9,.99,.999].map(q=>point(`${fmt(q*100)}th percentile`,`${fmt(base/(1-q*(1-1e-5))**.64)}×`,false))}),
  row('Next base nugget',remaining/3600,' hours','Additional accumulated shovel time until the base nugget count increases by one.',{limitType:'Collection breakpoint',limitLabel:'Uses your saved timer',next:`Next collection count: ${fmt(Math.round((baseRolls+1)*pool*voteFactor))} nuggets`,limitNote:'Collection bonuses apply after the base count is rounded down. This is a timer threshold, not a forecast of an improved nugget.'}),
  row('Nuggets ready',ready,' nuggets','Floor((saved shovel hours)^0.44), then multiply collection bonuses and round once. The saved timer resets when collected.',{limitType:'Collection breakpoint',limitLabel:level>0?`${fmt(baseRolls)} base rolls before bonuses`:'Shovel not unlocked',next:level>0?`Next base-roll threshold in ${fmt(remaining/3600)} saved timer hours`:'Unlock Dirty Shovel first.',breakpoints:[1,2,3,4,5,6].map(n=>point(`${n} base nuggets`,`${fmt(n**(1/.44))} timer hours`,baseRolls>=n)),limitNote:'Uses the timer in your save; it does not advance while this page is open.'}),
  row('Fractal Island',fractal,'%', 'Adds to the nugget-count percentage pool.',{icon:'assets/nav-Sailing.png',limitType:'Hard cap',cap:25,maxed:fractal===25,limitLabel:'+25% at 10,000 Fractal Island hours'}),
  row('Nugget Fabrication',bribe,'%', 'The W5 bribe adds to the nugget-count percentage pool.',{limitType:'Hard cap',cap:20,maxed:bribe>=20,limitLabel:'+20% when purchased'}),
  row('Arcade nugget bonus',arcade,'%', 'Adds to Fractal Island and Nugget Fabrication before multiplying the base roll count.',{limitType:'Account-dependent',limitLabel:'Arcade level and upgrade boosts'}),
  row('Collection percentage pool',pool,'×','1 + (Fractal Island + Nugget Fabrication + Arcade) / 100.',{limitType:'Additive pool',limitLabel:'Three percentages add together'}),
  row('Nugget ballot',voteFactor,'×','The nugget ballot multiplies the collection percentage pool separately.',{icon:'assets/nav-Meritocracy.png',limitType:'Conditional',limitLabel:'Active ballot only'}),
  row('Counter preservation',preserve?1:0,' unlocked','Legend Talent · prevents Metal Detector progress from resetting on a new best nugget.',{icon:'assets/LegendTalentIcon35.png',limitType:'Unlock',cap:1,maxed:preserve,limitLabel:preserve?'Counter survives a new best':'Counter resets on a new best'})
 ];
 const stat=(label:string,value:number|null,unit:string,note:string,source?:string,empty='Not saved')=>({label,value,unit,note,source,empty});
 const overview=[
  stat('Highest nugget found',best,'×',best>0?'Your saved record':'No nugget recorded yet','Best Nugget'),
  stat('Lowest possible next nugget',base,'×','Current shovel + Metal Detector','Next-roll minimum'),
  stat('Highest possible next nugget',ceiling,'×','Current roll ceiling; not your record','Next-roll ceiling'),
  stat('Nuggets since last highest',null,'',preserve?'Counter preservation is active; this count is not saved separately.':detector>0?'Use the tracked counter below. Earlier untracked rolls and preservation history are not stored.':'Metal Detector is locked; the game does not track this count.',undefined,'Not separately saved'),
  stat('Metal Detector counter',counter,' nuggets',preserve?'Keeps counting through new records':detector>0?'Tracked nuggets since its last reset':'Counter inactive until unlocked','Metal Detector counter'),
  stat('Lowest nugget ever found',null,'','The save keeps the highest result, not a lowest-result history.'),
  stat('Nuggets ready',ready,' nuggets',level>0?'After all collection bonuses':'Shovel not unlocked','Nuggets ready'),
  stat('Next-roll improvement chance',best>0?nuggetChance(best,base)*100:100,'%',level>0?'One roll at the current counter':'After unlocking the shovel','Chance to improve'),
  stat('Saved shovel timer',elapsed/3600,' hours','Accumulated timer; can include reward time','Shovel timer'),
  stat('Next base nugget in',remaining/3600,' hours',level>0?'Additional timer needed':'After unlocking the shovel','Next base nugget')
 ];
 const collectionSteps=level>0?[1,2,3].map(step=>{const count=baseRolls+step,hours=(count**(1/.44));return{base:count,total:Math.round(count*pool*voteFactor),timerHours:hours,additionalHours:Math.max(0,hours-elapsed/3600)};}):[];
 model.groups.push({id:'nuggets',name:'Gold nuggets',value:best,unit:'× best',icon:'assets/GamingItem1.png',limit:'Record, roll range and saved counters',note:'Highest found is your saved record. Lowest/highest possible describe the next roll at your current counter.',overview,collectionSteps,rows});
 const bitRow=model.groups.find((g:any)=>g.id==='bits').rows.find((r:any)=>r.name==='Best Nugget');
 Object.assign(bitRow,{targetGroup:'nuggets',limitLabel:'Open Gold nuggets for roll limits',limitNote:`Next-roll ceiling: ${fmt(ceiling)}×. Next-roll improve chance: ${fmt(best>0?nuggetChance(best,base)*100:100)}%.`,breakpoints:[point('Shovel bonus',`${fmt(shovel)}×`,false),point('Metal Detector',`${fmt(pity)}×`,false),point('Ready to collect',`${fmt(ready)} nuggets`,false)]});
 const goldLevel=a.gemShopPurchases?.[131]||0,gold=[0,30,43,53,60][goldLevel]||0,paletteSave=a.gaming.palette?.[16]?.bonus||0,save=Math.min(82,gold+paletteSave);
 const squirrelLevel=s[27]?.[0]||0,squirrelRate=1+Math.round(5*squirrelLevel)/100;
 const acorns=squirrelLevel>0?Math.floor((Math.max(0,s[27]?.[1]||0)*squirrelRate/3600)**.85):0;
 const megaChance=Math.max(0,Math.min(1,(a.gaming.palette?.[31]?.bonus||0)/100)),megaEligible=Math.min(100,acorns);
 const sprinklerLevel=s[25]?.[0]||0,drops=sprinklerLevel>0?Math.floor((Math.max(0,s[25]?.[1]||0)*(1+sprinklerLevel/100)/3600)**.75):0;
 const importRows=[
  row('Sprinkler water',drops,' drops','Saved timer hours × (1 + sprinkler level / 100), raised to 0.75 and rounded down.',{limitType:'Collection breakpoint',limitLabel:'Use is limited by empty garden slots',icon:'assets/GamingItem0.png'}),
  row('Golden Sprinkler',gold,'%','Gem-shop chance to retain the sprinkler timer after use; adds to the palette bonus.',{icon:'assets/GamingItem0.png',limitType:'Hard cap',cap:60,maxed:gold>=60,limitLabel:'60% at purchase level 4',breakpoints:[30,43,53,60].map((v,i)=>point(`Purchase ${i+1}`,`${v}%`,goldLevel>=i+1))}),
  row('Sprinkler palette',paletteSave,'%','Adds to Golden Sprinkler before the combined 82% cap.',{icon:'assets/nav-Gaming.png',limitType:'Shared cap',limitLabel:`Only ${Math.max(0,82-gold)}% needed with your Golden Sprinkler`}),
  row('Sprinkler save chance',save,'%','Chance that using the sprinkler keeps its accumulated water timer.',{icon:'assets/GamingItem0.png',limitType:'Hard cap',cap:82,maxed:save>=82,limitLabel:'82% combined cap'}),
  row('Squirrel collection speed',squirrelRate,'×','Squirrel import level gives +5% per level to the timer before the 0.85 power.',{icon:'assets/GamingItem2.png',currentLevel:squirrelLevel}),
  row('Base acorns ready',acorns,' acorns','Floor((saved squirrel hours × collection speed)^0.85). The timer resets on collection.',{icon:'assets/GamingItem2.png',limitType:'Collection breakpoint',limitLabel:'No collection-count cap',breakpoints:[1,10,100].map(n=>point(`${n} base acorns`,`${fmt(n**(1/.85)/squirrelRate)} timer hours`,acorns>=n))}),
  row('Mega Nut chance',megaChance*100,'%','Palette · each eligible acorn has this chance to give 50 acorns instead of 1.',{icon:'assets/GamingItem2.png',limitType:'Probability',cap:100,limitLabel:'100% effective chance'}),
  row('Mega Nut eligible rolls',megaEligible,' rolls','Only the first 100 base acorns per collection can roll Mega Nut. The rest give one acorn each.',{icon:'assets/GamingItem2.png',limitType:'Hard cap',cap:100,maxed:megaEligible>=100,limitLabel:'100 rolls per collection'}),
  row('Expected acorn collection',acorns+49*megaEligible*megaChance,' acorns','Base acorns + 49 × eligible rolls × Mega Nut chance. This is an average, not a guaranteed yield.',{icon:'assets/GamingItem2.png',limitType:'Expected value',limitLabel:'Extra acorns: at most 4,900 per collection'})
 ];
 model.groups.push({id:'imports',name:'Import rewards',value:save,unit:'% sprinkler save',icon:'assets/GamingItem0.png',limit:'82% save · 100 Mega Nut rolls',note:'Sprinkler retention, saved water and squirrel collections. Timers use the imported save.',rows:importRows});
 return model;
}
