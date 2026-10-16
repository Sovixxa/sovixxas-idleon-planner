import { research, randomList } from '@website-data';

// MenagerieStuff("BoostQTY") and ("UnlockOwned"), supplied v1.23 client.
export const getMenagerieBonus = (account: any, index: number): number =>
  (Number(account?.menagerie?.[3]?.[index]) || 0) * (Number(research?.[58]?.[index]) || 0);
export const hasMenagerieUnlock = (account: any, index: number): boolean =>
  Number(account?.menagerie?.[2]?.[index]) >= 1;

export const getNightmarinerBonus = (account:any,index:number):number => {
 const levels=(account?.rawBoats||[]).slice(0,20).reduce((sum:number,b:any)=>sum+Math.max(0,(Number(b?.[3])||0)+(Number(b?.[5])||0)-600),0);
 return 1+levels/(levels+10000)*(index===0?1999:499);
};

// Native PetArenaCrucBonus: rewards require the unlock and the matching wave.
export const getCrucibleBonus = (account:any,index:number):number =>
 hasMenagerieUnlock(account,8) && Number(account?.accountOptions?.[628] || 0) >= Number(randomList[115]?.[index] ?? Infinity) ? 1 : 0;
