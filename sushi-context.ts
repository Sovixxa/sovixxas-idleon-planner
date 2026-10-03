import {getArcadeBonus} from './vendor/idleon-toolbox/parsers/world-2/arcade';
import {getResearchGridBonus} from './vendor/idleon-toolbox/parsers/world-7/research';
import {getMineheadBonusQTY} from './vendor/idleon-toolbox/parsers/world-7/minehead';
import {getButtonBonus} from './vendor/idleon-toolbox/parsers/world-7/button';
import {getAtomBonus} from './vendor/idleon-toolbox/parsers/world-3/atomCollider';
import {isSuperbitUnlocked} from './vendor/idleon-toolbox/parsers/world-5/gaming';
import {getEventShopBonus} from './vendor/idleon-toolbox/parsers/misc';
import {superbitsUpgrades} from './vendor/idleon-toolbox/data/website-data';

export function getSushiContext(account: any) {
  const factor=(name: string, value: number, page: string)=>({name, value, page});
  return {
    superbit: isSuperbitUnlocked(account, (superbitsUpgrades as any)[67]?.name)?100:0,
    factors: [
      factor('Arcade',1+(getArcadeBonus(account?.arcade?.shop,'Sushi_Bucks')?.bonus??0)/100,'arcade'),
      factor('Event shop',1+getEventShopBonus(account,45),'eventShop'),
      factor('Research',1+(getResearchGridBonus(account,189,0)??0)/100,'research'),
      factor('Minehead',Math.max(1,Math.min(1.25,1+(getMineheadBonusQTY(account,11)??0)/100)),'minehead'),
      factor('Atom Collider',1+(getAtomBonus(account,'Phosphorus_-_Sushi_Bucks_Generator')??0)/100,'atomCollider'),
      factor('The Button',1+(getButtonBonus(account,2)??0)/100,'button'),
      factor('Sailing artifact',1+(Number(account?.sailing?.artifacts?.[39]?.acquired)||0),'sailing')
    ]
  };
}
