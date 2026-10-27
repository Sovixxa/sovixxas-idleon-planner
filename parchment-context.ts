import {getResearchGridBonus} from './vendor/idleon-toolbox/parsers/world-7/research';
import {getMaxDamage} from './vendor/idleon-toolbox/parsers/damage';
import {isCompanionBonusActive} from './vendor/idleon-toolbox/parsers/misc';
// Local client: castle map 43 has 15 fm_rat spawns on a 1,835px platform.
// ParchmentDrop uses companion 172 and Research[47][40] (15%).
export function getParchmentContext(account:any,characters:any[]){
 const companion=isCompanionBonusActive(account,172)?Number(account.companions?.list?.[172]?.bonus):0;
 const jelly=Number.isFinite(account.research?.jellyObstruction)?(account.research.jellyObstruction>40?15:0):null;
 return {companion:Number.isFinite(companion)?companion:null,jelly,characters:characters.map((c,index)=>({c,index})).filter(({c})=>c.class==='Royal_Guardian').map(({c,index})=>{
  const p=getMaxDamage({...c,mapIndex:43,targetMonster:'fm_rat'},characters,account);
  return {index,name:c.name||`Royal Guardian ${index+1}`,attackSeconds:p.actionWaitTime,movementSpeed:p.movementSpeed,orbMaxWeight:c.talentsLoadout?.some((t:any)=>['GUARDIAN_DISCIPLE','REGAL_INTERVENTION'].includes(t.name)&&t.level>0)?2+Math.min(1,Math.max(0,getResearchGridBonus(account,191,0)/100)):1};
 })};
}
