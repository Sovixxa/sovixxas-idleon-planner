import { research } from '@website-data';

// Native JellyOperation("RoG_BonusQTY"): rewards activate after passing their index.
// Values are raw formula inputs; descriptions sometimes display different units.
export const getJellyReward = (account: any, index: number): number =>
  Number(account?.research?.jellyObstruction) > index ? Number(research[47]?.[index]) || 0 : 0;
