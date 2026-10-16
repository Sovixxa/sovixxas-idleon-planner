import { research } from '@website-data';

// MenagerieStuff("BoostQTY") and ("UnlockOwned"), supplied v1.23 client.
export const getMenagerieBonus = (account: any, index: number): number =>
  (Number(account?.menagerie?.[3]?.[index]) || 0) * (Number(research?.[58]?.[index]) || 0);
export const hasMenagerieUnlock = (account: any, index: number): boolean =>
  Number(account?.menagerie?.[2]?.[index]) >= 1;
